# Spec Delta: Threshold Store 重构

## ADDED Requirements

### Requirement: Threshold Store SHALL 使用 Zustand 架构
Threshold Store SHALL 从 Class-based 单例模式迁移到 Zustand 架构，移除冗余的 constructor `bind()` 代码。

#### Scenario: 创建 Threshold Store
- **WHEN** 开发者实现 Threshold Store
- **THEN** 必须使用 `create<ThresholdState & ThresholdActions>()` API
- **AND** 必须定义独立的 `ThresholdState` 和 `ThresholdActions` 接口
- **AND** 不得使用 class-based 单例模式
- **AND** 不得在 constructor 中手动绑定方法的 `this` 上下文

#### Scenario: 组件订阅 Threshold 状态
- **GIVEN** 组件需要显示阈值配置列表
- **WHEN** 调用 `useThresholdStore(state => state.thresholds)`
- **THEN** Store 必须支持 Selector 模式
- **AND** 当无关状态变化时不应触发组件重渲染

### Requirement: Threshold Store SHALL 分离数据状态和业务逻辑
Threshold Store SHALL 清晰地区分数据状态（State）和业务操作（Actions）。

#### Scenario: 定义 Threshold State 接口
- **WHEN** 定义 `ThresholdState` 接口
- **THEN** 接口必须仅包含数据状态字段
- **AND** 字段包括：`thresholds`, `currentThreshold`, `loading`, `error`, `filters`, `page`, `pageSize`, `total`
- **AND** 不得包含方法定义

#### Scenario: 定义 Threshold Actions 接口
- **WHEN** 定义 `ThresholdActions` 接口
- **THEN** 接口必须仅包含方法签名
- **AND** 方法包括：`createThreshold`, `updateThreshold`, `deleteThreshold`, `fetchThresholds`, `testThreshold`
- **AND** 不得包含数据状态字段

### Requirement: Threshold Store SHALL 集成 API 服务层
Threshold Store SHALL 通过 `threshold-service` 调用后端 API。

#### Scenario: 创建阈值配置
- **GIVEN** 用户填写阈值配置表单并提交
- **WHEN** 组件调用 `createThreshold(config)`
- **THEN** Store 必须调用 `thresholdService.createThreshold(config)`
- **AND** 成功后必须将新配置添加到 `thresholds` 列表
- **AND** 必须更新 `total` 计数

#### Scenario: 查询阈值配置列表
- **GIVEN** 用户打开阈值配置页面
- **WHEN** 组件调用 `fetchThresholds({ page: 1, pageSize: 10, filters })`
- **THEN** Store 必须调用 `thresholdService.getThresholdConfigs(params)`
- **AND** 必须更新 `thresholds`, `total`, `page` 状态
- **AND** 必须设置 `loading` 状态指示加载过程

#### Scenario: 测试阈值配置
- **GIVEN** 用户配置了阈值规则并点击测试
- **WHEN** 组件调用 `testThreshold(request)`
- **THEN** Store 必须调用 `thresholdService.testThreshold(request)`
- **AND** 必须返回测试结果（是否触发告警）

### Requirement: Threshold Store SHALL 提供 Selector 导出
Threshold Store SHALL 导出命名的 Selector 对象，支持组件精确订阅状态片段。

#### Scenario: 导出 Selector 对象
- **WHEN** 定义 Threshold Store
- **THEN** 必须导出 `useThresholdSelector` 对象
- **AND** 对象必须包含常用状态的 Selector 函数：`thresholds`, `loading`, `currentThreshold`, `filters`

#### Scenario: 组件使用 Selector
- **GIVEN** 组件仅需要显示阈值列表
- **WHEN** 使用 `useThresholdStore(useThresholdSelector.thresholds)`
- **THEN** 当 `filters` 变化时，该组件不应重渲染
- **AND** 当 `thresholds` 变化时，该组件应重渲染

### Requirement: Threshold Store SHALL 支持筛选和排序
Threshold Store SHALL 维护筛选条件和排序状态，支持阈值配置的查询和展示。

#### Scenario: 设置筛选条件
- **GIVEN** 用户在阈值配置页面选择筛选条件
- **WHEN** 组件调用 `setFilters({ severity: 'HIGH', enabled: true })`
- **THEN** Store 必须更新 `filters` 状态
- **AND** 必须将 `page` 重置为 1
- **AND** 组件应重新调用 `fetchThresholds()` 获取筛选后的数据

#### Scenario: 设置排序规则
- **GIVEN** 用户点击列表表头排序
- **WHEN** 组件调用 `setSorting('severity', 'desc')`
- **THEN** Store 必须更新 `sortBy` 和 `sortOrder` 状态
- **AND** 必须将 `page` 重置为 1

## MODIFIED Requirements

无（这是新增的架构规范）

## REMOVED Requirements

### Requirement: Threshold Store 使用 Class-based 单例模式
**原因**：Class-based 模式与 Zustand 架构不一致，且需要手动绑定20个方法的 `this` 上下文

**迁移指南**：
- 将所有 class 属性迁移为 Zustand State 字段
- 将所有 class 方法迁移为 Zustand Actions
- 移除 constructor 中的所有 `this.method = this.method.bind(this)` 代码

```typescript
// 旧代码（移除）
class ThresholdStore {
  constructor() {
    this.createThreshold = this.createThreshold.bind(this);
    this.updateThreshold = this.updateThreshold.bind(this);
    // ... 18个 bind 调用
  }
}

// 新代码（推荐）
export const useThresholdStore = create<ThresholdState & ThresholdActions>((set, get) => ({
  // State
  thresholds: [],
  loading: false,

  // Actions（自动绑定上下文）
  createThreshold: async (config) => {
    set({ loading: true });
    // ...
  },
}));
```

### Requirement: Threshold Store 手动管理方法的 this 上下文
**原因**：Zustand 自动管理闭包上下文，无需手动绑定

**迁移指南**：
- 在 Zustand Actions 中使用 `set()` 和 `get()` 参数访问状态
- 不再需要 `this.xxx` 访问属性和方法
