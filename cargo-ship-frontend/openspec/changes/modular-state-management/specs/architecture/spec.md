# Spec: Store Architecture

## Rationale
规范化所有 Store 的内部结构，确保代码的一致性和可维护性。

## ADDED Requirements

#### 1. Store 必须按业务领域划分
> 所有的 Store 文件必须位于 `src/stores/` 目录下，并以业务领域命名。

- **Scenario: 创建新的 Store**
  - GIVEN 开发者需要为"设备管理"功能添加状态
  - WHEN 创建文件
  - THEN 文件名应当为 `equipment-store.ts`
  - AND 文件位置应当在 `src/stores/`

#### 2. Store 必须分离 State 和 Actions
> 在 TypeScript 接口定义和 Zustand 实现中，必须在逻辑上区分数据字段和方法字段。

- **Scenario: 定义 Store 接口**
  - GIVEN 定义 `MonitoringStore` 接口
  - WHEN 编写代码
  - THEN 接口应当包含数据属性（如 `metrics`, `status`）
  - AND 接口应当包含方法属性（如 `fetchMetrics`, `subscribeToAlerts`）
  - AND 不应将它们混杂在一起，建议使用注释分隔

#### 3. Store 必须支持 Selector 模式
> Store 的设计应当鼓励使用者通过 Selector 获取局部状态。

- **Scenario: 组件使用 Store**
  - GIVEN 一个只需显示"用户名"的组件
  - WHEN 使用 `useAuthStore`
  - THEN 应当支持 `useAuthStore(state => state.user.name)` 的形式
  - AND 当 Store 中其他无关数据（如 `token`）变化时，该组件不应重渲染
