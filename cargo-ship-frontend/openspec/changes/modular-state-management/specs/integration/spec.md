# Spec: Service Integration

## Rationale
收敛数据获取和事件订阅的逻辑，避免业务逻辑散落在组件中，确保数据流向的可预测性。

## ADDED Requirements

#### 1. 所有的 API 调用必须封装在 Store Actions 中
> 组件不再直接调用 `api-client` 或 `fetch`，必须调用 Store 提供的 Action。

- **Scenario: 用户登录**
  - GIVEN 用户点击登录按钮
  - WHEN 组件处理点击事件
  - THEN 应当调用 `authStore.login(credentials)`
  - AND 不应直接调用 `authService.login(credentials)`

#### 2. WebSocket 订阅必须由 Store 管理
> `MonitoringStore` 或 `AlarmsStore` 等需要实时数据的 Store，必须自行管理对 `realtime-service` 的订阅。

- **Scenario: 初始化监控数据流**
  - GIVEN 应用启动或进入监控页面
  - WHEN 调用 `monitoringStore.subscribeToRealtimeData()`
  - THEN Store 内部调用 `realtimeService.subscribe()`
  - AND 在收到数据回调时，调用 Store 内部的 `set()` 方法更新状态

#### 3. Store 必须能够响应 WebSocket 连接状态变化
> Store 应当暴露连接状态（如 `connected`, `reconnecting`），以便 UI 显示状态指示器。

- **Scenario: 网络断开**
  - GIVEN WebSocket 连接断开
  - WHEN `realtime-service` 触发断开事件
  - THEN Store 应当捕获该事件
  - AND 将 `state.connectionStatus` 更新为 `disconnected`
