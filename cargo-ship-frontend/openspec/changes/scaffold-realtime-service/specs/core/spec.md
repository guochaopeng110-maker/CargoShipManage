# Spec: Realtime Service Core Capabilities

## ADDED Requirements

### Requirement: Service Connection & Authentication
The service MUST manage the WebSocket connection lifecycle, including automatic authentication using the user's token.

#### Scenario: 连接服务与自动认证
*   GIVEN 用户已登录并持有有效 JWT Token
*   WHEN 调用 `realtimeService.connect(token)`
*   THEN 服务应建立 WebSocket 连接到 `/ws` 命名空间
*   AND 在握手阶段通过 `auth` 字段发送 Token
*   AND 连接成功后，控制台应记录 "Websocket connected"

### Requirement: Disconnection
The service MUST provide a way to cleanly disconnect the WebSocket connection.

#### Scenario: 断开连接
*   GIVEN 已建立 WebSocket 连接
*   WHEN 调用 `realtimeService.disconnect()`
*   THEN 此连接应被关闭
*   AND `socket` 实例应被清理

### Requirement: Automatic Reconnection
The service MUST automatically attempt to reconnect when the connection is lost unexpectedly.

#### Scenario: 自动重连
*   GIVEN WebSocket 连接异常中断
*   WHEN 网络恢复
*   THEN 服务应自动尝试重连
*   AND 重连时应重新发送认证 Token

### Requirement: Typed Event Listening
The service MUST provide a type-safe interface for listening to server-sent events.

#### Scenario: 类型安全的事件监听
*   GIVEN 开发者想要监听 `alarm:push` 事件
*   WHEN 调用 `realtimeService.on('alarm:push', callback)`
*   THEN TypeScript 编译器应能正确推断 callback 的参数类型为 `AlarmPushPayload`
*   AND 当服务端推送该事件时，callback 应被执行
