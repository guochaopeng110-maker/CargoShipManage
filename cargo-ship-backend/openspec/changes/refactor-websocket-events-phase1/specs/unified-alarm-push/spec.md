# Spec: 统一告警推送

**能力 ID**: `unified-alarm-push`  
**关联变更**: `refactor-websocket-events-phase1`

## MODIFIED Requirements

### Requirement: 告警 Upsert 推送事件

**需求 ID**: `unified-alarm-push-001`

The system MUST merge alarm creation and status updates into a unified `alarm:push` event using Upsert semantics.

系统必须将告警的创建和状态更新合并为统一的 `alarm:push` 事件,使用 Upsert 语义。

#### Scenario: 新告警推送

**Given** AlarmService 创建了一条新告警记录  
**When** 告警保存成功  
**Then** AlarmPushService 应推送 `alarm:push` 事件  
**And** 事件应包含告警的完整最新状态  
**And** 如果告警严重程度为 CRITICAL 或 HIGH,应推送给管理员和运维人员角色  
**And** 应推送到对应的 `equipment:{equipmentId}` 房间

#### Scenario: 告警状态更新推送

**Given** AlarmService 更新了告警状态(如从 pending 改为 resolved)  
**When** 更新操作成功  
**Then** AlarmPushService 应推送 `alarm:push` 事件  
**And** 事件消息应包含完整的告警数据,包括更新后的状态  
**And** 事件消息应包含处理信息字段: `handler`, `handledAt`, `handleNote`  
**And** 应推送到 `equipment:{equipmentId}` 房间  
**And** 应推送给管理员和运维人员角色

#### Scenario: alarm:push 消息格式

**Given** 任何告警推送场景  
**When** AlarmPushService 推送 `alarm:push` 事件  
**Then** 消息应包含以下必需字段:
- `id`: 告警记录 ID
- `equipmentId`: 设备 ID
- `severity`: 严重程度枚举值
- `severityText`: 严重程度中文文本
- `metricType`: 异常指标类型
- `abnormalValue`: 异常值
- `thresholdRange`: 阈值范围描述
- `triggeredAt`: 触发时间
- `status`: 告警状态
- `statusText`: 状态中文文本
- `timestamp`: 推送时间戳

**And** 消息应包含业务上下文字段:
- `monitoringPoint`: 监测点名称(可选)
- `faultName`: 故障名称(可选)
- `recommendedAction`: 处理措施建议(可选)

**And** 当告警已被处理时,消息应包含:
- `handler`: 处理人用户 ID(可选)
- `handledAt`: 处理时间(可选)
- `handleNote`: 处理备注(可选)

### Requirement: 批量告警推送统一

**需求 ID**: `unified-alarm-push-002`

The system MUST unify batch alarm pushes (including historical alarm retrospection) to use the `alarm:batch` event.

系统必须将批量告警推送(包括历史告警回溯)统一使用 `alarm:batch` 事件。

#### Scenario: 历史告警批量推送

**Given** ImportService 完成历史数据导入并触发了多条告警  
**When** 执行告警批量推送  
**Then** AlarmPushService 应调用 `pushBatchAlarms()` 方法  
**And** 应推送 `alarm:batch` 事件(而非 `alarm:historical-batch`)  
**And** 事件应推送给管理员和运维人员角色  
**And** 消息格式应为: `{ alarms: AlarmRecord[], count: number }`

#### Scenario: 实时批量告警推送

**Given** 系统在短时间内触发了多条告警  
**When** 需要批量推送这些告警  
**Then** AlarmPushService 应使用相同的 `pushBatchAlarms()` 方法  
**And** 应推送 `alarm:batch` 事件  
**And** 推送逻辑应与历史告警推送完全一致

### Requirement: AlarmPushService 方法重构

**需求 ID**: `unified-alarm-push-003`

AlarmPushService MUST provide a new `pushUpsertAlarm()` method to replace the existing `pushNewAlarm()` and `pushAlarmStatusUpdate()` methods.

AlarmPushService 必须提供新的 `pushUpsertAlarm()` 方法,取代原有的 `pushNewAlarm()` 和 `pushAlarmStatusUpdate()`。

#### Scenario: 统一推送方法

**Given** AlarmPushService 实现了 `pushUpsertAlarm(alarm: AlarmRecord)` 方法  
**When** AlarmService 创建新告警  
**Then** 应调用 `AlarmPushService.pushUpsertAlarm(alarm)`

**When** AlarmService 更新告警状态  
**Then** 应调用 `AlarmPushService.pushUpsertAlarm(alarm)` (相同方法)

**When** `pushUpsertAlarm()` 执行  
**Then** 应推送 `alarm:push` 事件  
**And** 应根据告警严重程度决定推送范围

## REMOVED Requirements

### Requirement: alarm:new 事件推送

**需求 ID**: `alarm-new-push` (已移除)

~~AlarmPushService 在新告警创建时推送 `alarm:new` 事件~~

**移除理由**: 与 `alarm:update` 合并为 `alarm:push`,简化客户端逻辑

### Requirement: alarm:update 事件推送

**需求 ID**: `alarm-update-push` (已移除)

~~AlarmPushService 在告警状态更新时推送 `alarm:update` 事件~~

**移除理由**: 与 `alarm:new` 合并为 `alarm:push`,统一 Upsert 语义

### Requirement: alarm:historical-batch 事件推送

**需求 ID**: `import-alarm-retrospection-push` (已移除)

~~ImportService 在历史告警回溯后推送 `alarm:historical-batch` 事件~~

**移除理由**: 与 `alarm:batch` 功能重复,统一使用 `alarm:batch`

### Requirement: alarm:count:update 事件广播

**需求 ID**: `alarm-count-update-broadcast` (已移除)

~~AlarmPushService 在告警数量变化时广播 `alarm:count:update` 事件~~

**移除理由**: 客户端可基于 `alarm:push` 和 `alarm:batch` 事件自行维护计数,无需服务端额外推送

## 影响的现有规范

- `openspec/specs/import-alarm-retrospection/spec.md` - 需要更新推送事件名称

## 实施检查清单

- [ ] 创建 `AlarmPushService.pushUpsertAlarm()` 方法
- [ ] 修改 `AlarmPushService.pushBatchAlarms()` 使用 `alarm:batch` 事件
- [ ] 删除 `AlarmPushService.pushNewAlarm()` 方法
- [ ] 删除 `AlarmPushService.pushAlarmStatusUpdate()` 方法
- [ ] 删除 `AlarmPushService.broadcastAlarmCount()` 方法
- [ ] AlarmService.createAlarm() 调用 `pushUpsertAlarm()`
- [ ] AlarmService.updateAlarmStatus() 调用 `pushUpsertAlarm()`
- [ ] ImportService 调用 `pushBatchAlarms()` 而非直接推送
- [ ] 更新 AlarmPushService 单元测试
- [ ] 创建 E2E 测试验证统一推送逻辑
- [ ] 更新 WebSocket API 文档
