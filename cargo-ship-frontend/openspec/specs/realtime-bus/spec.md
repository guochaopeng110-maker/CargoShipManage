# realtime-bus Specification

## Purpose
定义实时数据总线的生命周期管理与数据处理流程，包括自动订阅 8 个核心系统、跨页面状态持久化、以及全局数据映射与属性增强。
## Requirements
### Requirement: Real-time Data Subscription Lifecycle
The system MUST initiate real-time subscriptions for all 8 core system equipment items immediately after user authentication is successful. This subscription SHALL remain active throughout the user session regardless of route changes. Data indexing MUST use the device ID combined with the standard monitoring point name to ensure multi-point persistence.

#### Scenario: Continuous Data Flow Across Pages
- **WHEN** the user navigates from the Dashboard to the "Propulsion System" page
- **THEN** the page SHALL immediately display existing real-time data indexed by standard names, and no new subscription or unsubscription requests SHALL be sent.

### Requirement: Global Connection Status Consistency
The connection status indicator on the TopBar SHALL strictly reflect the underlying WebSocket connection quality and SHALL NOT be affected by the unmounting of local components.

#### Scenario: Physical Connection Error Feedback
- **WHEN** a WebSocket connection error or disconnection occurrs due to network issues
- **THEN** the TopBar indicator SHALL synchronously update to the "Disconnected" state.

### Requirement: Pervasive Data Integrity Mapping
All real-time data payloads MUST be transformed using a global mapper that injects standard business names and equipment metadata before reaching the store.

#### Scenario: Real-time Alarm Metadata Enrichment
- **WHEN** an `alarm:push` event is received without common name fields
- **THEN** the system SHALL automatically map the `equipmentId` to its registered `equipmentName` and the `abnormalMetricType` to its UI label before updating the alarms store.

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

