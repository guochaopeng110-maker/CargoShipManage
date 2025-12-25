# 设计文档: 激活实时数据流

## 架构概览

本设计文档描述了如何将 `realtime-service` 与 Zustand stores 集成，建立端到端的实时数据流管道。

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         React 组件层                             │
│  (MonitoringPage, AlarmsPage, HealthAssessmentPage, etc.)      │
└─────────────────────┬───────────────────────────────────────────┘
                      │ useMonitoringStore()
                      │ useAlarmsStore()
                      │ useHealthStore()
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand Stores 层                           │
│  ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐      │
│  │ monitoring-store│ │ alarms-store │ │  health-store   │      │
│  │                 │ │              │ │                 │      │
│  │ - data          │ │ - items      │ │ - reports       │      │
│  │ - devices       │ │ - statistics │ │ - loading       │      │
│  │ - loading       │ │ - filters    │ │                 │      │
│  └────────┬────────┘ └──────┬───────┘ └────────┬────────┘      │
│           │                  │                  │                │
│           │ 注册监听器        │ 注册监听器        │ 注册监听器    │
│           ▼                  ▼                  ▼                │
└───────────────────────────────────────────────────────────────┬─┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    realtime-service (单例)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 事件总线 (Event Bus)                                      │  │
│  │ - on(event, callback)                                    │  │
│  │ - off(event, callback)                                   │  │
│  │ - emit(event, data)                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Socket.IO 客户端                                          │  │
│  │ - connect(token)                                         │  │
│  │ - disconnect()                                           │  │
│  │ - subscribeToEquipment(id)                               │  │
│  │ - unsubscribeFromEquipment(id)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ WebSocket 连接
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     后端 WebSocket 服务器                        │
│                    (Socket.IO Server @ /ws)                     │
└─────────────────────────────────────────────────────────────────┘
```

## 核心设计决策

### 1. 事件分发机制：事件总线模式

**决策**：使用简化的事件总线（Event Emitter）模式，而非直接暴露 Socket.IO 实例。

**理由**：
- **解耦**：Stores 无需了解 Socket.IO 的实现细节
- **类型安全**：可以为每个事件提供强类型的回调接口
- **测试友好**：可以轻松 mock 事件总线进行单元测试
- **灵活性**：未来可以轻松替换底层 WebSocket 库

**实现**：
```typescript
// realtime-service.ts 中的简化实现
class RealtimeService {
  private listeners: Map<string, Array<Function>> = new Map();

  public on<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off<K extends keyof ServerToClientEvents>(
    event: K,
    callback: ServerToClientEvents[K]
  ): void {
    const list = this.listeners.get(event);
    if (list) {
      this.listeners.set(event, list.filter(cb => cb !== callback));
    }
  }

  private emitInternal(event: string, ...args: any[]) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => cb(...args));
    }
  }
}
```

### 2. Store 初始化与监听器注册

**决策**：在 store 的初始化逻辑中注册事件监听器，而非在组件的 `useEffect` 中。

**理由**：
- **全局唯一**：Zustand stores 是全局单例，确保监听器只注册一次
- **生命周期明确**：Store 的生命周期与应用一致，无需频繁注册/注销
- **性能优化**：避免每次组件挂载/卸载时重复注册

**实现模式**：
```typescript
// monitoring-store.ts
export const useMonitoringStore = create<MonitoringStore>((set, get) => {
  // 定义事件处理函数
  const handleNewData = (data: MonitoringDataPayload) => {
    set(state => {
      const key = `${data.equipmentId}-${data.metricType}`;
      const existing = state.data[key] || [];
      return {
        data: {
          ...state.data,
          [key]: [...existing, transformPayloadToMonitoringData(data)]
        }
      };
    });
  };

  // 注册监听器（仅在 store 初始化时执行一次）
  realtimeService.on('monitoring:new-data', handleNewData);

  // Store 清理逻辑（如果需要，Zustand 本身不提供 destroy hook）
  // 可以在应用卸载时手动调用
  // realtimeService.off('monitoring:new-data', handleNewData);

  return {
    // ... state and actions
  };
});
```

**替代方案考量**：
- ❌ 在每个组件中注册监听器：会导致重复注册和清理复杂性
- ⚠️ 使用 React Context：增加了层级复杂度，且性能不如 Zustand

### 3. 数据转换与映射

**决策**：在 store 层实现 WebSocket Payload 到业务数据模型的转换。

**理由**：
- **关注点分离**：`realtime-service` 只负责传输原始数据，不关心业务逻辑
- **类型安全**：利用 TypeScript 确保转换过程的类型正确性
- **可维护性**：业务模型变化时，只需修改 store 层的转换逻辑

**示例**：
```typescript
// alarms-store.ts
function mapPayloadToAlarm(payload: AlarmPushPayload): Alarm {
  return {
    id: payload.id,
    equipmentId: payload.equipmentId,
    equipmentName: payload.monitoringPoint || 'Unknown',
    metricType: payload.metricType || 'Unknown',
    value: payload.abnormalValue || 0,
    threshold: payload.thresholdRange || '',
    triggeredAt: new Date(payload.triggeredAt).getTime(),
    severity: payload.severity as AlertSeverity,
    status: payload.status as AlarmStatus,
    message: payload.faultName || 'New Alarm',
    handler: payload.handler || undefined,
    handlerNote: payload.handleNote,
    createdAt: new Date(payload.timestamp).getTime(),
    lastModified: Date.now()
  };
}
```

### 4. 性能优化：数据更新节流

**决策**：对高频事件（如 `monitoring:new-data`）实现批量更新机制。

**理由**：
- **避免过度渲染**：每秒数百个数据点会导致 React 频繁重渲染
- **用户体验**：人眼无法感知毫秒级的变化，适度节流不影响体验

**实现策略**：

**方案 A：时间窗口批量更新（推荐）**
```typescript
// monitoring-store.ts
let pendingUpdates: MonitoringDataPayload[] = [];
let updateTimer: NodeJS.Timeout | null = null;

const handleNewData = (data: MonitoringDataPayload) => {
  pendingUpdates.push(data);

  if (!updateTimer) {
    updateTimer = setTimeout(() => {
      set(state => {
        const newData = { ...state.data };
        pendingUpdates.forEach(payload => {
          const key = `${payload.equipmentId}-${payload.metricType}`;
          const existing = newData[key] || [];
          newData[key] = [...existing, transformPayloadToMonitoringData(payload)];
        });

        pendingUpdates = [];
        updateTimer = null;
        return { data: newData };
      });
    }, 1000); // 每秒批量更新一次
  }
};
```

**方案 B：requestAnimationFrame（适用于图表动画）**
```typescript
let rafId: number | null = null;
let pendingUpdates: MonitoringDataPayload[] = [];

const handleNewData = (data: MonitoringDataPayload) => {
  pendingUpdates.push(data);

  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      // 批量更新逻辑
      rafId = null;
    });
  }
};
```

### 5. 连接生命周期管理

**决策**：在应用层（App.tsx 或顶层 Layout）统一管理 WebSocket 连接生命周期。

**理由**：
- **全局唯一连接**：避免多处重复连接
- **认证集成**：与 `auth-store` 紧密配合
- **错误处理集中**：统一处理连接错误和重连逻辑

**实现位置**：
```typescript
// App.tsx 或 Layout.tsx
useEffect(() => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    realtimeService.connect(token);
  }

  return () => {
    realtimeService.disconnect();
  };
}, []);
```

### 6. 订阅管理策略

**决策**：采用"按需订阅"模式，根据当前页面/组件动态订阅设备。

**理由**：
- **减少服务器负载**：只订阅需要的设备，而非全部设备
- **减少客户端数据处理**：避免接收无用数据
- **灵活性**：不同页面可以订阅不同设备

**实现模式**：
```typescript
// MonitoringPage.tsx
useEffect(() => {
  const equipmentId = 'SYS-BAT-001'; // 从路由或 props 获取

  realtimeService.subscribeToEquipment(equipmentId);

  return () => {
    realtimeService.unsubscribeFromEquipment(equipmentId);
  };
}, [equipmentId]);
```

**自动重订阅机制**：
```typescript
// realtime-service.ts
class RealtimeService {
  private activeSubscriptions = new Set<string>();

  public async subscribeToEquipment(equipmentId: string) {
    // ... 订阅逻辑
    this.activeSubscriptions.add(equipmentId);
  }

  private setupInternalListeners() {
    this.socket.on('connect', () => {
      // 重连后自动恢复订阅
      this.activeSubscriptions.forEach(id => {
        this.socket?.emit('subscribe:equipment', { equipmentId: id });
      });
    });
  }
}
```

### 7. 类型安全保障

**决策**：严格使用 TypeScript 类型，确保从 WebSocket Payload 到 Store State 的全链路类型安全。

**类型层级**：
```
WebSocket Payload Types (websocket.ts)
         ↓
   转换函数 (mapPayloadToXxx)
         ↓
   Store Data Types (monitoring.ts, alarms.ts, health.ts)
         ↓
   React Component Props
```

**示例**：
```typescript
// 类型链路
AlarmPushPayload (websocket.ts)
    → mapPayloadToAlarm()
    → Alarm (alarms.ts)
    → AlarmListItem component props
```

## 数据流时序图

### 场景：接收新的监测数据

```
┌──────────┐         ┌─────────────┐        ┌──────────────┐       ┌───────────┐
│  后端WS  │         │  realtime-  │        │ monitoring-  │       │ Monitoring│
│  服务器  │         │   service   │        │    store     │       │   Page    │
└────┬─────┘         └──────┬──────┘        └──────┬───────┘       └─────┬─────┘
     │                      │                      │                     │
     │ monitoring:new-data  │                      │                     │
     ├─────────────────────>│                      │                     │
     │                      │                      │                     │
     │                      │ emit('monitoring:   │                     │
     │                      │  new-data', payload) │                     │
     │                      ├─────────────────────>│                     │
     │                      │                      │                     │
     │                      │                      │ set({ data: ... })  │
     │                      │                      ├─────────────────────┤
     │                      │                      │                     │
     │                      │                      │  Zustand 通知订阅者  │
     │                      │                      ├────────────────────>│
     │                      │                      │                     │
     │                      │                      │      re-render      │
     │                      │                      │                     │
```

### 场景：处理离线消息缓冲

```
┌──────────┐         ┌─────────────┐        ┌──────────────┐
│  后端WS  │         │  realtime-  │        │   alarms-    │
│  服务器  │         │   service   │        │    store     │
└────┬─────┘         └──────┬──────┘        └──────┬───────┘
     │                      │                      │
     │ alarm:batch          │                      │
     │ (buffered: true)     │                      │
     ├─────────────────────>│                      │
     │                      │                      │
     │                      │ emit('alarm:batch',  │
     │                      │       payload)       │
     │                      ├─────────────────────>│
     │                      │                      │
     │                      │              批量插入告警
     │                      │              显示"X条离线消息"
     │                      │                      │
```

## 错误处理策略

### 1. 连接错误

```typescript
// realtime-service.ts
this.socket.on('connect_error', (err) => {
  console.error('RealtimeService: Connection error:', err.message);

  if (err.message.includes('认证失败')) {
    // 尝试刷新 Token
    const newToken = useAuthStore.getState().refreshAccessToken();
    if (newToken) {
      this.socket.auth = { token: newToken };
      this.socket.connect();
    } else {
      // 跳转到登录页
      window.location.href = '/login';
    }
  }
});
```

### 2. 数据解析错误

```typescript
// monitoring-store.ts
const handleNewData = (data: MonitoringDataPayload) => {
  try {
    const transformed = transformPayloadToMonitoringData(data);
    set(state => ({
      data: {
        ...state.data,
        [`${data.equipmentId}-${data.metricType}`]: [
          ...(state.data[`${data.equipmentId}-${data.metricType}`] || []),
          transformed
        ]
      }
    }));
  } catch (error) {
    console.error('Failed to process monitoring data:', error);
    // 可选：上报错误到监控系统
  }
};
```

### 3. 断线恢复

```typescript
// realtime-service.ts
this.socket.on('disconnect', (reason) => {
  console.warn('RealtimeService: Disconnected:', reason);

  // 通知 stores 更新连接状态
  this.emitInternal('connection:status', { connected: false });

  if (reason === 'io server disconnect') {
    // 服务器主动断开，可能需要重新认证
    // Socket.IO 不会自动重连，需要手动处理
  }
  // 其他原因会自动重连
});

this.socket.on('connect', () => {
  console.log('RealtimeService: Reconnected');
  this.emitInternal('connection:status', { connected: true });

  // 恢复订阅
  this.activeSubscriptions.forEach(id => {
    this.subscribeToEquipment(id);
  });
});
```

## 测试策略

### 1. 单元测试

**测试目标**：
- `realtimeService` 的事件总线功能
- Store 的数据转换函数（`mapPayloadToXxx`）
- Store 的状态更新逻辑

**工具**：Vitest

**示例**：
```typescript
// monitoring-store.test.ts
describe('monitoring-store', () => {
  it('should transform MonitoringDataPayload correctly', () => {
    const payload: MonitoringDataPayload = {
      id: 1,
      equipmentId: 'SYS-BAT-001',
      timestamp: '2025-12-12T10:00:00Z',
      metricType: 'voltage',
      monitoringPoint: '总电压',
      value: 650.5,
      unit: 'V',
      quality: 'normal',
      source: 'sensor-upload'
    };

    const result = transformPayloadToMonitoringData(payload);

    expect(result.id).toBe(1);
    expect(result.equipmentId).toBe('SYS-BAT-001');
    expect(result.value).toBe(650.5);
  });
});
```

### 2. 集成测试

**测试目标**：
- `realtimeService` 与 stores 的集成
- 模拟 WebSocket 事件，验证 stores 状态更新

**工具**：Vitest + Mock Socket.IO

**示例**：
```typescript
// integration.test.ts
import { realtimeService } from '../services/realtime-service';
import { useMonitoringStore } from '../stores/monitoring-store';

describe('realtime integration', () => {
  it('should update monitoring-store when receiving new data', () => {
    const mockData: MonitoringDataPayload = { /* ... */ };

    // 模拟 WebSocket 事件
    realtimeService['emitInternal']('monitoring:new-data', mockData);

    // 验证 store 状态
    const state = useMonitoringStore.getState();
    expect(state.data['SYS-BAT-001-voltage']).toHaveLength(1);
  });
});
```

### 3. 端到端测试

**测试目标**：
- 真实的 WebSocket 连接和数据推送
- UI 响应式更新

**工具**：Playwright 或 Cypress

**场景**：
1. 用户登录 → WebSocket 自动连接
2. 导航到监控页面 → 自动订阅设备
3. 后端推送数据 → UI 实时更新
4. 离开页面 → 自动取消订阅

## 性能指标

### 目标指标

| 指标 | 目标值 |
|-----|-------|
| WebSocket 连接建立时间 | < 500ms |
| 事件分发延迟 | < 10ms |
| Store 状态更新延迟 | < 20ms |
| UI 重渲染延迟（单个组件） | < 50ms |
| 内存占用增长（1小时运行） | < 50MB |
| 高频数据处理能力 | 500 数据点/秒 |

### 性能监控

```typescript
// 可选：添加性能监控
const handleNewData = (data: MonitoringDataPayload) => {
  const startTime = performance.now();

  // ... 数据处理逻辑

  const endTime = performance.now();
  console.debug(`Data processing time: ${endTime - startTime}ms`);
};
```

## 安全考虑

1. **Token 安全**：
   - Token 仅在连接时发送，不在后续消息中传递
   - Token 过期后自动刷新或重新登录

2. **数据验证**：
   - 对接收到的 Payload 进行基本校验（非空、类型正确）
   - 防止恶意数据注入

3. **XSS 防护**：
   - 对用户生成的内容（如告警备注）进行转义

## 未来扩展

1. **离线模式**：使用 IndexedDB 缓存数据，支持离线查看
2. **数据压缩**：对批量数据进行压缩传输
3. **智能预测**：基于实时数据流进行故障预测
4. **多设备同步**：同一用户在多个设备上同步状态
