# Design: Modular State Management

## Architectural Principles (架构原则)

### 1. 领域驱动设计 (Domain-Driven Design)
状态管理不仅仅是数据的集合，而是业务逻辑的载体。我们将不再按照页面（Pages）来组织 Store，而是严格按照业务领域（Domains）来划分。
- **原则**: 一个业务领域对应一个 Store 文件。
- **位置**: `src/stores/*.ts`
- **反例**: `home-store.ts` (基于页面), `common-store.ts` (职责不清)

### 2. 单向数据流与关注点分离 (Unidirectional Flow & Separation of Concerns)
在每个 Store 内部，必须强制分离 **State** (数据状态) 和 **Actions** (行为逻辑)。
- **State**: 纯粹的数据结构，只读（通过 Selector 访问）。
- **Actions**: 包含所有副作用（API调用、WebSocket订阅）和状态更新逻辑。
- **约束**: 组件只能通过 Actions 修改 State，不可直接操作 State。

### 3. 服务层作为基础设施 (Service Layer as Infrastructure)
Store 是应用逻辑的核心，Service 层（API Client, WebSocket Service）是提供数据的基础设施。
- Store **调用** API Client 获取数据。
- Store **订阅** Realtime Service 接收实时推送。
- 组件 **仅与** Store 交互，不应直接调用 API 或 WebSocket Service（特殊情况除外）。

### 4. 性能优先 (Performance First)
利用 Zustand 的 Selector 机制，确保组件按需渲染。
- **原则**: 必须为组件提供精细化的 Selector。
- **模式**: `const user = useAuthStore(state => state.user)` 而非 `const { user } = useAuthStore()`。

## Detailed Design (详细设计)

### Store 结构模版
每个 Store 应当遵循以下标准结构：

```typescript
interface State {
  data: Data | null;
  loading: boolean;
  error: string | null;
}

interface Actions {
  fetchData: () => Promise<void>;
  updateData: (payload: any) => void;
  reset: () => void;
}

// 合并类型
type Store = State & Actions;

export const useDomainStore = create<Store>((set, get) => ({
  // --- State ---
  data: null,
  loading: false,
  error: null,

  // --- Actions ---
  fetchData: async () => {
    set({ loading: true });
    try {
      // 1. 调用自动化的API客户端
      const data = await apiClient.domain.get();
      set({ data, loading: false });
    } catch (e) {
      set({ error: e.message, loading: false });
    }
  },
  
  // ... 其他 actions
}));
```

### 实时数据集成模式
对于需要实时更新的 Store (如 `monitoring-store`)，应当在 Action 中管理订阅：

```typescript
// in monitoring-store.ts
initSubscription: () => {
  // 1. 订阅事件
  const unsubscribe = realtimeService.subscribe('monitoring:data', (data) => {
    // 2. 更新 Store 状态
    set(state => ({ 
      realtimeData: [...state.realtimeData, data] 
    }));
  });
  
  // 3. 保存清理函数（可选，视具体实现而定）
  get()._setUnsubscribe(unsubscribe);
}
```
