# Spec: 移除冗余 WebSocket 事件

**能力 ID**: `remove-redundant-events`  
**关联变更**: `refactor-websocket-events-phase1`

## REMOVED Requirements

### Requirement: 用户上线/下线事件推送

**需求 ID**: `user-online-offline-push` (已移除)

~~WebsocketGateway 在用户连接和断开时推送 `user:online` 和 `user:offline` 事件给管理员~~

**移除理由**: 
- 实时性要求不高,可通过 REST API 查询在线用户列表
- 增加了不必要的 WebSocket 流量
- 管理功能应使用轮询或手动刷新,不应依赖实时推送

#### Scenario: 移除用户上线广播

**Given** WebsocketGateway 处理用户连接  
**When** 用户成功建立 WebSocket 连接  
**Then** 不应广播 `user:online` 事件  
**And** 日志中应记录用户连接信息

#### Scenario: 移除用户下线广播

**Given** WebsocketGateway 处理用户断开连接  
**When** 用户的所有 Socket 连接断开  
**Then** 不应广播 `user:offline` 事件  
**And** 日志中应记录用户离线信息

### Requirement: 设备状态变化事件推送

**需求 ID**: `equipment-status-change-push` (已移除)

~~EquipmentPushService 在设备状态变化时推送 `equipment:status:change` 事件~~

**移除理由**:
- 设备状态可从监测数据和告警事件推断
- 设备状态变更频率不高,REST API 足够
- 减少事件类型,降低系统复杂度

#### Scenario: 不再推送设备状态变化

**Given** 设备状态从 NORMAL 变为 FAULT  
**When** 更新设备状态  
**Then** 不应推送 `equipment:status:change` 事件  
**And** 客户端应通过 `alarm:push` 事件感知设备异常

### Requirement: 设备 CRUD 事件推送

**需求 ID**: `equipment-crud-events-push` (已移除)

~~EquipmentPushService 在设备创建、更新、删除时推送 `equipment:created`, `equipment:update`, `equipment:deleted` 事件~~

**移除理由**:
- 设备 CRUD 操作是低频管理操作,不需要实时推送
- 客户端可在操作完成后刷新设备列表
- 减少不必要的事件噪音

#### Scenario: 不再推送设备创建事件

**Given** 管理员创建新设备  
**When** 设备保存成功  
**Then** 不应推送 `equipment:created` 事件  
**And** 创建操作的 API 响应应包含完整的设备数据

#### Scenario: 不再推送设备更新事件

**Given** 管理员更新设备信息  
**When** 设备更新成功  
**Then** 不应推送 `equipment:update` 事件  
**And** 更新操作的 API 响应应包含更新后的设备数据

#### Scenario: 不再推送设备删除事件

**Given** 管理员删除设备  
**When** 设备删除成功  
**Then** 不应推送 `equipment:deleted` 事件  
**And** 删除操作应返回成功响应

### Requirement: 设备概览更新通知

**需求 ID**: `equipment-overview-update-push` (已移除)

~~EquipmentPushService 在设备统计数据变化时广播 `equipment:overview:update` 事件~~

**移除理由**:
- 这是"通知刷新"类事件,客户端应自行维护统计数据
- 设备数量变化频率极低
- 客户端可基于设备 CRUD 操作自行刷新概览数据

#### Scenario: 不再广播设备概览更新

**Given** 系统设备总数发生变化  
**When** 设备被创建或删除  
**Then** 不应广播 `equipment:overview:update` 事件  
**And** 客户端应在设备列表页面刷新时获取最新统计

### Requirement: EquipmentPushService 废弃

**需求 ID**: `remove-redundant-events-001`

EquipmentPushService 的所有推送方法应被标记为废弃或删除,除了健康评分相关方法。

#### Scenario: 标记废弃方法

**Given** EquipmentPushService 存在  
**When** 检查服务方法  
**Then** 以下方法应标记 `@deprecated`:
- `pushStatusChange()`
- `pushEquipmentUpdate()`
- `pushEquipmentCreated()`
- `pushEquipmentDeleted()`
- `pushRealtimeData()`
- `broadcastEquipmentOverview()`

**And** 以下方法应保留:
- `pushHealthScoreUpdate()` (健康评分更新)

#### Scenario: 废弃方法行为

**Given** 调用被标记为 `@deprecated` 的方法  
**When** 方法执行  
**Then** 应记录警告日志: "该方法已废弃"  
**And** 不应执行任何 WebSocket 推送逻辑

### Requirement: WebsocketGateway 清理

**需求 ID**: `remove-redundant-events-002`

WebsocketGateway 必须移除用户上线/下线事件的广播逻辑。

#### Scenario: 清理连接处理逻辑

**Given** WebsocketGateway.handleConnection() 方法  
**When** 用户建立连接  
**Then** 应维护内部连接状态  
**And** 应发送欢迎消息给连接的客户端  
**And** 不应广播 `user:online` 事件

#### Scenario: 清理断开连接处理逻辑

**Given** WebsocketGateway.handleDisconnect() 方法  
**When** 用户断开连接  
**Then** 应清理内部连接状态  
**And** 应记录断开日志  
**And** 不应广播 `user:offline` 事件

## ADDED Requirements

### Requirement: 客户端迁移文档

**需求 ID**: `remove-redundant-events-003`

The system MUST provide clear frontend migration documentation explaining removed events and their alternatives.

系统必须提供清晰的前端迁移文档,说明已移除的事件及替代方案。

#### Scenario: 迁移文档内容

**Given** 准备发布此重构  
**When** 创建迁移文档  
**Then** 文档应包含以下内容:
- 已移除事件的完整列表
- 每个已移除事件的替代方案 (REST API 或其他事件)
- 代码示例: 重构前后的对比
- 推荐的迁移步骤

#### Scenario: 替代方案说明

**Given** 迁移文档  
**When** 前端开发者查阅文档  
**Then** 应清楚说明:
- `user:online/offline` → 使用 `GET /api/users/online`
- `equipment:status:change` → 从 `monitoring:new-data` 和 `alarm:push` 推断
- `equipment:update/created/deleted` → 操作完成后刷新设备列表
- `equipment:overview:update` → 定期轮询或手动刷新
- `alarm:count:update` → 客户端基于 `alarm:push` 本地计算

## 影响的现有规范

无直接影响,仅移除功能。

## 实施检查清单

- [ ] 删除 `WebsocketGateway.handleConnection()` 中的 `user:online` 广播
- [ ] 删除 `WebsocketGateway.handleDisconnect()` 中的 `user:offline` 广播
- [ ] 标记 `EquipmentPushService.pushStatusChange()` 为 @deprecated
- [ ] 标记 `EquipmentPushService.pushEquipmentUpdate()` 为 @deprecated
- [ ] 标记 `EquipmentPushService.pushEquipmentCreated()` 为 @deprecated
- [ ] 标记 `EquipmentPushService.pushEquipmentDeleted()` 为 @deprecated
- [ ] 标记 `EquipmentPushService.pushRealtimeData()` 为 @deprecated
- [ ] 标记 `EquipmentPushService.broadcastEquipmentOverview()` 为 @deprecated
- [ ] 删除 `AlarmPushService.broadcastAlarmCount()`
- [ ] 移除所有对以上废弃方法的调用
- [ ] 更新相关单元测试
- [ ] 创建 E2E 测试验证事件不再发出
- [ ] 编写前端迁移文档
- [ ] 更新 WebSocket API 文档
