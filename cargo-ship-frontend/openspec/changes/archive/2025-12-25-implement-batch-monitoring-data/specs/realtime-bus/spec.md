## ADDED Requirements

### Requirement: Batch Event Subscription & Routing
实时总线 SHALL 全程监听 `monitoring:batch-data` 事件。系统 MUST 根据消息载荷中的 `isHistory` 布尔值决定数据流向：`false` 定向至实时监控缓存，`true` 仅触发进度状态更新。

#### Scenario: History Import Protection
- **WHEN** 正在接收标记为 `isHistory: true` 的批量数据
- **THEN** 这些数据点 SHALL 禁止进入 `monitoring-store` 的 `data` 属性，以防清空当前的实时动态波形记录。

### Requirement: Asynchronous Batch Progress Tracking
系统 SHALL 实时跟踪所有活跃分片传输的百分比进度（`chunkIndex / totalChunks`）。该进度状态 MUST 在 Zustand Store 中全局共享。

#### Scenario: Real-time UI Progress Feedback
- **WHEN** 收到第 250 个分片且总分片为 500
- **THEN** 界面上的进度条 SHALL 响应式更新为 50%，并展示“正在接收历史数据...”提示。
