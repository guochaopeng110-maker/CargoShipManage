基于方案 A，我建议在提案的 tasks.md 中添加以下任务：
### 2.6 Service 层清理与重构

#### 2.6.1 删除冗余 Service 文件
- [ ] 2.6.1.1 更新 `alarms-store.ts`，改为直接使用 `AlarmsService` from `@/services/api`
- [ ] 2.6.1.2 删除 `src/services/alarms-service.ts` (1,236 行)
- [ ] 2.6.1.3 更新 `equipment-store.ts`，改为直接使用 `EquipmentService` from `@/services/api`
- [ ] 2.6.1.4 删除 `src/services/equipment-service.ts` (964 行)
- [ ] 2.6.1.5 更新 `threshold-store.ts`，改为直接使用 `ThresholdService` from `@/services/api`
- [ ] 2.6.1.6 删除 `src/services/threshold-service.ts` (348 行)
- [ ] 2.6.1.7 更新 `import-store.ts`，改为直接使用 `ImportService` from `@/services/api`
- [ ] 2.6.1.8 删除 `src/services/import-service.ts` (701 行)
- [ ] 2.6.1.9 确认 `historical-data-service.ts` 的使用情况
- [ ] 2.6.1.10 如未使用，删除 `src/services/historical-data-service.ts` (505 行)
- [ ] 2.6.1.11 删除 `src/services/api-client.ts` (627 行)

#### 2.6.2 重构保留的 Service 文件
- [ ] 2.6.2.1 重构 `auth-service.ts`：移除手动类型，使用 `@/services/api` 类型
- [ ] 2.6.2.2 重构 `health-service.ts`：移除手动类型，使用 `@/services/api` 类型
- [ ] 2.6.2.3 重构 `reports-service.ts`：移除手动类型，使用 `@/services/api` 类型
- [ ] 2.6.2.4 精简这些 service，只保留必要的业务逻辑（不重复 API 功能）

#### 2.6.3 验证
- [ ] 2.6.3.1 验证所有 Stores 正常工作
- [ ] 2.6.3.2 验证认证流程正常
- [ ] 2.6.3.3 验证健康评估功能正常
- [ ] 2.6.3.4 验证报告生成功能正常

数据流对比分析
🔴 当前架构（三层，有冗余）
┌─────────────────────────────────────────────────┐
│         页面组件 (Page Component)                 │
│         例如: AlarmCenterPage.tsx                │
│         - 不直接调用 API                         │
│         - 只订阅 Store                           │
└──────────────────┬──────────────────────────────┘
                   │ 调用 actions
                   ↓
┌─────────────────────────────────────────────────┐
│         Zustand Store (alarms-store.ts)         │
│         - 管理状态 (items, loading, error)       │
│         - 提供 actions (fetchAlarms, etc.)      │
│         - 调用 Service 层                        │
└──────────────────┬──────────────────────────────┘
                   │ 调用 enhancedAlarmsService
                   ↓
┌─────────────────────────────────────────────────┐
│      Service 层 (alarms-service.ts)             │  ← 🔴 冗余层
│      1,236 行代码                                │
│      - 使用手动类型 from '../types/alarms'       │
│      - 包装 apiClient 调用                       │
│      - 添加业务逻辑（大部分是重复的）              │
└──────────────────┬──────────────────────────────┘
                   │ 调用 apiClient
                   ↓
┌─────────────────────────────────────────────────┐
│      API Client 包装器 (api-client.ts)          │  ← 🔴 冗余层
│      627 行代码                                  │
│      - 认证、重试、错误处理                       │
│      - 使用 OpenAPI 配置                         │
└──────────────────┬──────────────────────────────┘
                   │ 调用自动生成的 API
                   ↓
┌─────────────────────────────────────────────────┐
│   Auto-generated API (Service.ts)               │  ← ✅ 真正的 API
│   - alarmControllerFindAllAlarms()              │
│   - alarmControllerUpdateAlarmStatus()          │
│   - 包含所有类型定义                             │
│   - 已经有错误处理                               │
└──────────────────┬──────────────────────────────┘
                   │ HTTP 请求
                   ↓
              [ 后端 API ]
✅ 方案A 架构（两层，精简高效）
┌─────────────────────────────────────────────────┐
│         页面组件 (Page Component)                 │
│         例如: AlarmCenterPage.tsx                │
│         - 不直接调用 API                         │
│         - 只订阅 Store                           │
└──────────────────┬──────────────────────────────┘
                   │ 调用 actions
                   ↓
┌─────────────────────────────────────────────────┐
│         Zustand Store (alarms-store.ts)         │
│         - 管理状态 (items, loading, error)       │
│         - 提供 actions (fetchAlarms, etc.)      │
│         - 直接调用 Auto-generated API           │  ← ✅ 直接调用
└──────────────────┬──────────────────────────────┘
                   │ 直接调用 Service.alarmControllerXXX()
                   ↓
┌─────────────────────────────────────────────────┐
│   Auto-generated API (Service.ts)               │  ← ✅ 唯一的 API 层
│   - alarmControllerFindAllAlarms()              │
│   - alarmControllerUpdateAlarmStatus()          │
│   - alarmControllerFindOneAlarm()               │
│   - 包含所有类型定义                             │
│   - 已经有错误处理、取消请求等                    │
└──────────────────┬──────────────────────────────┘
                   │ HTTP 请求
                   ↓
              [ 后端 API ]

💻 具体代码示例对比
示例 1: 告警列表查询
🔴 当前代码（三层）
// 1. Store (alarms-store.ts) - 第一层
import { enhancedAlarmsService } from '../services/alarms-service';
import { Alarm } from '../types/alarms'; // 手动类型

export const useAlarmsStore = create<AlarmsStore>((set, get) => ({
  items: [],
  loading: false,
  
  fetchAlarms: async (filters) => {
    set({ loading: true, error: null });
    try {
      // 调用 Service 层
      const response = await enhancedAlarmsService.getAlarms({
        page: get().page,
        pageSize: get().pageSize,
        ...filters
      });
      set({ items: response.data, total: response.total });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  }
}));

// 2. Service 层 (alarms-service.ts) - 第二层（1,236行）
import { apiClient } from './api-client';
import { Alarm } from '../types/alarms'; // 手动类型，与 API 类型冗余

export const enhancedAlarmsService = {
  async getAlarms(params) {
    // 包装 apiClient 调用
    const response = await apiClient.request<any>({
      method: 'GET',
      url: '/api/alarms',
      params: {
        page: params.page,
        limit: params.pageSize,
        // ... 各种参数转换
      }
    });
    
    // 大量的业务逻辑、数据转换等（大部分是重复的）
    return {
      data: response.data.items,
      total: response.data.total,
      // ...
    };
  }
};

// 3. API Client 包装器 (api-client.ts) - 第三层（627行）
export const apiClient = {
  async request(config) {
    // 认证、重试、错误处理等
    // ...
    return fetch(/* ... */);
  }
};

// 4. 自动生成的 API (最终被调用)
// Service.ts
✅ 方案A 代码（两层）
// 1. Store (alarms-store.ts) - 直接调用 API
import { Service } from '../services/api';  // 自动生成的 API
import { AlarmRecord } from '../services/api';  // 自动生成的类型

export const useAlarmsStore = create<AlarmsStore>((set, get) => ({
  items: [],
  loading: false,
  
  fetchAlarms: async (filters) => {
    set({ loading: true, error: null });
    try {
      // 直接调用自动生成的 API（一步到位！）
      const response = await Service.alarmControllerFindAllAlarms(
        get().page,           // page
        get().pageSize,       // limit
        filters.severity,     // severity
        filters.status,       // status
        filters.equipmentId,  // equipmentId
        filters.startDate,    // startDate
        filters.endDate       // endDate
      );
      
      set({ 
        items: response.items,  // 类型安全，自动提示
        total: response.total 
      });
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  }
}));

// 2. 自动生成的 API (Service.ts) - 直接使用，无需额外层
// 已包含：
// - 类型定义 ✅
// - 错误处理 ✅
// - 请求取消 ✅
// - API 文档注释 ✅
示例 2: 设备管理
✅ 方案A 代码
// equipment-store.ts
import { Service, Equipment, CreateEquipmentDto } from '../services/api';

export const useEquipmentStore = create<EquipmentStore>((set) => ({
  equipments: [],
  
  // 获取列表
  fetchEquipments: async (page, limit, filters) => {
    const response = await Service.equipmentControllerFindAll(
      page,
      limit,
      filters.deviceType,
      filters.status,
      filters.keyword
    );
    set({ equipments: response.items });
  },
  
  // 创建设备
  createEquipment: async (data: CreateEquipmentDto) => {
    const newEquipment = await Service.equipmentControllerCreate(data);
    set((state) => ({ equipments: [...state.equipments, newEquipment] }));
  },
  
  // 更新设备
  updateEquipment: async (id: string, data) => {
    await Service.equipmentControllerUpdate(id, data);
    // 刷新列表
  },
  
  // 删除设备
  deleteEquipment: async (id: string) => {
    await Service.equipmentControllerRemove(id);
    // 刷新列表
  }
}));
