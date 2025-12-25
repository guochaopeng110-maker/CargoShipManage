# 设计文档：告警中心页面重构

## 文档概述

本文档详细说明了告警中心页面重构的技术设计、架构决策、数据流设计和实现细节。

---

## 1. 架构概览

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                  AlarmCenterPage                        │
│  ┌───────────────────────────────────────────────────┐ │
│  │            Tabs Component                         │ │
│  │  ┌──────────────┐    ┌─────────────────────────┐ │ │
│  │  │ 实时告警标签  │    │  历史告警标签           │ │ │
│  │  └──────────────┘    └─────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────┐  ┌──────────────────────┐  │
│  │ RealTimeAlarmsView    │  │ HistoricalAlarmsView │  │
│  │ ┌───────────────────┐ │  │ ┌────────────────┐   │  │
│  │ │ 统计卡片          │ │  │ │ 筛选条件区      │   │  │
│  │ └───────────────────┘ │  │ └────────────────┘   │  │
│  │ ┌───────────────────┐ │  │ ┌────────────────┐   │  │
│  │ │ 实时告警表格      │ │  │ │ 历史告警表格    │   │  │
│  │ │ (AlarmTable)      │ │  │ │ (AlarmTable)    │   │  │
│  │ └───────────────────┘ │  │ └────────────────┘   │  │
│  │ ┌───────────────────┐ │  │ ┌────────────────┐   │  │
│  │ │ 确认按钮          │ │  │ │ 分页组件        │   │  │
│  │ └───────────────────┘ │  │ └────────────────┘   │  │
│  └───────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                     ↓                    ↓
          ┌──────────────────┐   ┌──────────────────┐
          │  alarms-store    │   │ alarms-service   │
          │  (Zustand)       │   │                  │
          └──────────────────┘   └──────────────────┘
                     ↓                    ↓
          ┌──────────────────┐   ┌──────────────────┐
          │ realtime-service │   │   api-client     │
          │  (WebSocket)     │   │  (REST API)      │
          └──────────────────┘   └──────────────────┘
```

### 1.2 分层职责

**表现层（Presentation Layer）**
- `AlarmCenterPage`：主容器组件，管理 Tabs 切换
- `RealTimeAlarmsView`：实时告警视图，自动响应 WebSocket 推送
- `HistoricalAlarmsView`：历史告警视图，用户驱动的查询界面
- `AlarmFilters`：筛选条件组件
- `AlarmTable`：告警数据表格（可复用）

**状态管理层（State Management Layer）**
- `alarms-store.ts`：统一管理实时告警和历史告警状态
- 使用 Zustand 提供响应式状态管理

**服务层（Service Layer）**
- `alarms-service.ts`：封装告警相关的 API 调用
- `realtime-service.ts`：管理 WebSocket 连接和事件分发

**通信层（Communication Layer）**
- `api-client.ts`：REST API 客户端
- WebSocket 连接：实时数据推送

---

## 2. 数据流设计

### 2.1 实时告警数据流（WebSocket 驱动）

```
后端 WebSocket 服务器
        ↓ alarm:push / alarm:batch / alarm:update
realtime-service (接收并分发事件)
        ↓ 触发监听器
alarms-store.handleRealtimeAlarm()
        ↓ 更新状态
  - items (所有告警)
  - activeAlarms (活动告警)
  - pendingAlarms (待处理告警)
  - criticalAlarms (严重告警)
  - emergencyAlarms (紧急告警)
        ↓ 触发重渲染
RealTimeAlarmsView (UI 自动更新)
```

**关键点**：
1. 数据完全由 WebSocket 推送驱动
2. 用户无需手动刷新
3. store 自动分类和统计告警

### 2.2 历史告警查询流程（用户驱动）

```
用户配置筛选条件 (AlarmFilters)
        ↓
点击"执行查询"按钮
        ↓
HistoricalAlarmsView.handleQuery()
        ↓
alarms-store.fetchHistoricalAlarms(filters, page)
        ↓ 设置 queryStatus = 'loading'
alarms-service.fetchHistoricalAlarms(params)
        ↓ 发送请求
api-client.get('/api/alarms/history', params)
        ↓ 接收响应
alarms-store 更新状态:
  - historicalAlarms.items
  - historicalAlarms.total
  - historicalAlarms.page
  - queryStatus = 'success'
        ↓ 触发重渲染
HistoricalAlarmsView (显示查询结果)
```

**关键点**：
1. 用户主动触发查询
2. 明确的加载状态指示
3. 支持分页和筛选
4. 完全独立于实时告警数据流

### 2.3 告警确认闭环流程

```
用户点击"确认"按钮
        ↓
RealTimeAlarmsView.handleAcknowledge(alarmId)
        ↓
alarms-store.acknowledgeAlarm(alarmId, note)
        ↓ 乐观更新（可选）
alarms-service.acknowledgeAlarm(alarmId, note)
        ↓ 发送请求
api-client.post('/api/alarms/{id}/ack', { note })
        ↓ 后端处理
后端更新数据库，通过 WebSocket 推送 alarm:update 事件
        ↓
realtime-service 接收 alarm:update 事件
        ↓
alarms-store.handleRealtimeAlarm(payload)
        ↓ 更新状态
  - 从 activeAlarms 移除已确认告警
  - 从 pendingAlarms 移除
  - 从 emergencyAlarms 移除（如果存在）
        ↓ 触发重渲染
RealTimeAlarmsView (UI 自动更新，告警消失)
```

**关键点**：
1. 完整的闭环反馈
2. 用户操作立即触发 API 请求
3. WebSocket 推送确保状态一致性
4. UI 自动响应状态变化

---

## 3. 状态管理设计

### 3.1 alarms-store 状态结构

```typescript
interface AlarmsStore {
  // === 实时告警状态（已存在） ===
  items: Alarm[]                    // 所有告警（包括实时和历史）
  activeAlarms: Alarm[]             // 由 WebSocket 推送维护
  pendingAlarms: Alarm[]            // 待处理告警
  criticalAlarms: Alarm[]           // 严重告警
  emergencyAlarms: Alarm[]          // 紧急告警

  // === 历史告警查询状态（新增） ===
  historicalAlarms: {
    items: Alarm[]                  // 查询结果
    total: number                   // 总数
    page: number                    // 当前页
    pageSize: number                // 每页大小
  }
  queryStatus: 'idle' | 'loading' | 'success' | 'error'
  queryFilters: AlarmFilters        // 当前筛选条件

  // === 通用状态 ===
  loading: boolean
  error: string | null
  realtimeConnected: boolean
  realtimeSubscriptionActive: boolean

  // === 操作动作 ===
  // 实时告警相关（已存在）
  initSubscription: () => void
  disposeSubscription: () => void
  handleRealtimeAlarm: (payload) => void
  handleAlarmBatch: (payload) => void
  handleAlarmTrend: (payload) => void
  acknowledgeAlarm: (alarmId, note?) => Promise<void>

  // 历史告警相关（新增）
  fetchHistoricalAlarms: (filters, page) => Promise<void>
  setQueryFilters: (filters) => void
  setQueryPage: (page) => void
}
```

### 3.2 状态分离原则

**实时状态** (`activeAlarms`, `pendingAlarms` 等)：
- 由 WebSocket 推送自动维护
- 不需要用户操作
- 自动分类和统计

**历史状态** (`historicalAlarms`)：
- 由用户查询驱动
- 完全独立的状态管理
- 支持分页和筛选

**优势**：
1. 职责清晰：实时监控 vs 历史追溯
2. 互不干扰：两种数据流独立运行
3. 易于维护：状态变化路径明确

---

## 4. 组件设计

### 4.1 组件树结构

```
AlarmCenterPage
├── PageHeader (页面标题)
├── Tabs
│   ├── Tab: 实时告警
│   │   └── RealTimeAlarmsView
│   │       ├── StatisticsCards (统计卡片)
│   │       ├── AlarmTable (告警表格)
│   │       └── AcknowledgeButton (确认按钮)
│   └── Tab: 历史告警
│       └── HistoricalAlarmsView
│           ├── AlarmFilters (筛选条件)
│           ├── AlarmTable (告警表格)
│           └── Pagination (分页组件)
└── ErrorBoundary (错误边界)
```

### 4.2 组件职责

**AlarmCenterPage**
- 作用：主容器，管理 Tabs 切换
- 职责：
  - 渲染 Tabs 组件
  - 管理当前激活的标签页
  - 在组件挂载时初始化实时订阅
  - 在组件卸载时清理订阅
- 状态：`activeTab: 'realtime' | 'historical'`

**RealTimeAlarmsView**
- 作用：实时告警视图
- 职责：
  - 订阅 `alarms-store` 的实时状态
  - 展示统计卡片
  - 展示实时告警表格
  - 处理告警确认操作
- 状态：无本地状态（完全由 store 驱动）

**HistoricalAlarmsView**
- 作用：历史告警查询视图
- 职责：
  - 管理筛选条件的本地状态（或使用 store）
  - 触发历史查询
  - 展示查询结果
  - 处理分页切换
- 状态：可能有筛选表单的本地状态

**AlarmFilters**
- 作用：筛选条件组件
- 职责：
  - 收集用户的筛选条件
  - 提供快捷日期选项
  - 验证筛选条件
  - 触发查询回调
- Props：
  - `filters: AlarmFilters`
  - `onFilterChange: (filters) => void`
  - `onQuery: () => void`

**AlarmTable**
- 作用：可复用的告警表格组件
- 职责：
  - 展示告警列表
  - 支持自定义列
  - 支持行操作（确认按钮等）
  - 响应式布局
- Props：
  - `alarms: Alarm[]`
  - `onAcknowledge?: (alarmId) => void`
  - `showAcknowledgeButton?: boolean`
  - `loading?: boolean`

**StatisticsCards**
- 作用：告警统计卡片
- 职责：
  - 展示待处理告警数
  - 展示严重告警数
  - 展示紧急告警数
- Props：
  - `pendingCount: number`
  - `criticalCount: number`
  - `emergencyCount: number`

---

## 5. API 接口设计

### 5.1 历史告警查询接口

**端点**: `GET /api/alarms/history`

**请求参数**:
```typescript
{
  page?: number              // 页码，默认 1
  pageSize?: number          // 每页大小，默认 20
  deviceId?: string          // 设备 ID 筛选
  severity?: string[]        // 告警等级筛选 ['low', 'medium', 'high', 'critical']
  status?: string[]          // 告警状态筛选 ['pending', 'processing', 'resolved', 'ignored']
  startTime?: number         // 开始时间（时间戳）
  endTime?: number           // 结束时间（时间戳）
  sortBy?: string            // 排序字段，默认 'triggeredAt'
  sortOrder?: 'asc' | 'desc' // 排序方向，默认 'desc'
}
```

**响应数据**:
```typescript
{
  items: Alarm[]             // 告警列表
  total: number              // 总数
  page: number               // 当前页
  pageSize: number           // 每页大小
  totalPages: number         // 总页数
}
```

### 5.2 告警确认接口

**端点**: `POST /api/alarms/{alarmId}/ack`

**请求体**:
```typescript
{
  note?: string              // 确认备注（可选）
}
```

**响应数据**:
```typescript
{
  success: boolean
  message: string
  alarm: Alarm               // 更新后的告警对象
}
```

**副作用**:
- 后端更新数据库中的告警状态
- 通过 WebSocket 推送 `alarm:update` 事件给前端

### 5.3 WebSocket 事件

**告警更新事件**: `alarm:update`

**Payload**:
```typescript
{
  id: string                 // 告警 ID
  status: AlarmStatus        // 更新后的状态
  handler?: string           // 处理人
  handledAt?: number         // 处理时间
  handlerNote?: string       // 处理备注
  // ... 其他告警字段
}
```

---

## 6. 技术决策

### 6.1 为什么使用 Tabs 组件？

**决策**：使用 Tabs 组件实现双模视图

**理由**：
1. **清晰的功能分离**：实时监控和历史追溯是两种不同的用户场景
2. **避免界面混乱**：一个页面同时展示两种视图会导致信息过载
3. **符合用户习惯**：Tabs 是常见的多视图切换模式
4. **易于扩展**：未来可以添加更多标签页（如统计分析）

**备选方案**：
- 方案 A：分离的两个页面 → 缺点：用户需要在多个页面间切换
- 方案 B：单一列表 + 切换按钮 → 缺点：无法同时展示筛选条件

### 6.2 为什么历史告警不使用实时推送？

**决策**：历史告警采用用户驱动的查询模式

**理由**：
1. **数据量问题**：历史告警可能有数万条，不适合一次性加载
2. **性能考虑**：实时推送大量历史数据会影响性能
3. **用户需求**：用户查询历史告警时通常有明确的筛选条件
4. **职责分离**：实时监控关注当前，历史追溯关注过去

**实现方式**：
- 提供筛选条件（设备、等级、状态、日期）
- 用户主动点击"执行查询"按钮
- 支持分页浏览

### 6.3 为什么要复用 DataQueryPage 的模式？

**决策**：历史告警查询完全复用 DataQueryPage 的"筛选-分页列表"模式

**理由**：
1. **一致性**：用户在不同页面有相同的操作体验
2. **可维护性**：统一的模式易于维护和扩展
3. **减少开发成本**：复用现有组件和逻辑
4. **验证架构**：证明新架构的模式可以在多个场景下复用

**复用内容**：
- 筛选条件组件结构
- 查询按钮和加载状态处理
- 分页组件和逻辑
- 错误处理和空状态提示

### 6.4 为什么需要验证闭环数据流？

**决策**：必须验证告警确认的完整闭环流程

**理由**：
1. **数据一致性**：确保前端状态与后端数据库一致
2. **用户体验**：用户操作后需要立即看到反馈
3. **架构验证**：验证 WebSocket 实时推送机制的正确性
4. **问题发现**：及早发现实时数据流中的潜在问题

**验证内容**：
- 用户确认告警后，API 请求成功
- 后端通过 WebSocket 推送更新事件
- 前端 store 正确处理更新
- UI 自动刷新，告警从列表中移除

---

## 7. 数据模型

### 7.1 Alarm 类型

```typescript
interface Alarm {
  id: string
  equipmentId: string
  equipmentName: string
  metricType: string
  value: number
  threshold: string
  triggeredAt: number
  severity: AlertSeverity
  status: AlarmStatus
  message: string
  handler?: string
  handledAt?: number | null
  handlerNote?: string | null
  createdAt: number
  lastModified?: number
}
```

### 7.2 AlarmFilters 类型

```typescript
interface AlarmFilters {
  deviceId?: string
  severity?: AlertSeverity[]
  status?: AlarmStatus[]
  startTime?: number
  endTime?: number
  searchTerm?: string
}
```

### 7.3 HistoricalAlarmsState 类型

```typescript
interface HistoricalAlarmsState {
  items: Alarm[]
  total: number
  page: number
  pageSize: number
}
```

---

## 8. 性能优化

### 8.1 实时告警优化

**问题**：高频 WebSocket 推送可能导致频繁重渲染

**优化方案**：
1. 使用 `React.memo` 优化 `AlarmTable` 组件
2. 使用 `useMemo` 缓存计算结果（如统计数据）
3. 使用 `useCallback` 缓存事件处理函数
4. 在 store 层实现防抖（debounce）或节流（throttle）

```typescript
// 示例：防抖更新
const debouncedUpdate = debounce((payload) => {
  set(state => ({
    items: updateItems(state.items, payload)
  }))
}, 100)
```

### 8.2 历史查询优化

**问题**：大量历史数据加载可能影响性能

**优化方案**：
1. 后端分页限制（每页最多 100 条）
2. 前端虚拟滚动（如果单页数据过多）
3. 请求缓存（相同筛选条件不重复请求）
4. 按需加载（只加载当前页）

### 8.3 表格渲染优化

**问题**：大量告警数据渲染可能卡顿

**优化方案**：
1. 使用 `react-window` 或 `react-virtualized` 实现虚拟滚动
2. 按需渲染列（隐藏不重要的列）
3. 使用 `key` 属性优化 React 的 diff 算法
4. 避免在渲染函数中进行复杂计算

---

## 9. 错误处理

### 9.1 API 错误处理

**场景 1**：历史查询 API 请求失败

**处理方式**：
```typescript
try {
  const response = await alarms-service.fetchHistoricalAlarms(params)
  set({
    historicalAlarms: response,
    queryStatus: 'success'
  })
} catch (error) {
  set({
    queryStatus: 'error',
    error: error.message || '查询失败，请稍后重试'
  })
}
```

**UI 表现**：
- 显示错误提示（Toast 或内联错误消息）
- 提供重试按钮

**场景 2**：告警确认 API 请求失败

**处理方式**：
```typescript
try {
  await alarms-service.acknowledgeAlarm(alarmId, note)
  // 成功提示
  toast.success('告警已确认')
} catch (error) {
  // 错误提示
  toast.error('确认失败：' + error.message)
  // 回滚乐观更新（如果有）
}
```

### 9.2 WebSocket 错误处理

**场景**：WebSocket 连接断开

**处理方式**：
1. 在 `alarms-store` 中监听连接状态
2. 显示"实时连接已断开"的警告
3. 自动尝试重连（在 `realtime-service` 中实现）
4. 重连成功后恢复订阅

```typescript
handleConnectionStatus: (status) => {
  set({ realtimeConnected: status.connected })

  if (!status.connected) {
    toast.warning('实时连接已断开，正在尝试重连...')
  } else {
    toast.success('实时连接已恢复')
  }
}
```

### 9.3 用户输入错误处理

**场景**：用户输入无效的筛选条件

**处理方式**：
1. 前端表单验证（日期范围、必填项等）
2. 显示验证错误提示
3. 禁用"执行查询"按钮直到输入有效

```typescript
const validateFilters = (filters: AlarmFilters): string[] => {
  const errors: string[] = []

  if (filters.startTime && filters.endTime) {
    if (filters.startTime > filters.endTime) {
      errors.push('开始时间不能晚于结束时间')
    }
  }

  return errors
}
```

---

## 10. 测试策略

### 10.1 单元测试

**测试对象**：
- `alarms-store` 的状态更新逻辑
- `alarms-service` 的 API 调用
- 组件的渲染和交互

**测试工具**：
- Vitest（单元测试框架）
- React Testing Library（组件测试）

**示例测试用例**：
```typescript
describe('alarms-store', () => {
  it('should update activeAlarms when receiving alarm:push event', () => {
    const store = useAlarmsStore.getState()
    const payload = createMockAlarmPayload()

    store.handleRealtimeAlarm(payload)

    expect(store.items).toHaveLength(1)
    expect(store.activeAlarms).toHaveLength(1)
  })
})
```

### 10.2 集成测试

**测试场景**：
- 实时告警推送 → store 更新 → UI 刷新
- 用户查询历史告警 → API 请求 → 结果展示
- 用户确认告警 → API 请求 → WebSocket 推送 → UI 更新

### 10.3 端到端测试

**测试工具**：Cypress 或 Playwright

**测试用例**：
1. 用户打开告警中心页面，看到实时告警
2. 用户点击"确认"按钮，告警从列表中消失
3. 用户切换到历史告警标签页
4. 用户配置筛选条件并点击"执行查询"
5. 用户看到查询结果并进行分页浏览

---

## 11. 安全考虑

### 11.1 权限控制

**问题**：并非所有用户都有告警确认权限

**解决方案**：
1. 后端 API 进行权限验证
2. 前端根据用户角色显示/隐藏"确认"按钮
3. 在 `alarms-service` 中检查用户权限

```typescript
async acknowledgeAlarm(alarmId: string, note?: string) {
  // 权限检查
  await this.checkPermission('alarm', 'acknowledge')

  // 发送请求
  await apiClient.post(`/api/alarms/${alarmId}/ack`, { note })
}
```

### 11.2 数据验证

**问题**：用户可能输入恶意数据

**解决方案**：
1. 前端验证用户输入（防止 XSS）
2. 后端严格验证所有参数
3. 使用类型安全的 API 调用

### 11.3 WebSocket 安全

**问题**：WebSocket 连接可能被劫持

**解决方案**：
1. 使用 WSS（WebSocket Secure）协议
2. 在连接时进行 JWT Token 认证
3. 定期刷新 Token

---

## 12. 未来扩展

### 12.1 可能的功能扩展

1. **批量操作**
   - 批量确认多个告警
   - 批量导出告警

2. **高级筛选**
   - 保存筛选条件为预设
   - 智能筛选建议

3. **告警详情**
   - 点击告警查看详细信息
   - 展示相关设备信息

4. **告警统计**
   - 在新标签页展示统计图表
   - 告警趋势分析

### 12.2 性能优化方向

1. **虚拟滚动**
   - 处理超大数据量

2. **增量更新**
   - 只更新变化的告警

3. **智能缓存**
   - 缓存查询结果
   - 预加载下一页数据

---

## 13. 总结

本设计文档详细说明了告警中心页面重构的技术实现方案。核心设计原则包括：

1. **双模视图分离**：实时监控和历史追溯清晰分离
2. **闭环数据流**：确保用户操作的即时反馈
3. **模式复用**：复用 DataQueryPage 确立的标准模式
4. **性能优化**：考虑大数据量和高频更新的场景
5. **错误处理**：完善的错误处理和用户反馈机制

通过这次重构，我们将验证新架构下实时数据流与用户驱动请求的协同工作，为后续功能开发提供最佳实践参考。

---

**文档版本**: 1.0
**最后更新**: 2025-12-14
**作者**: AI Assistant
