# Spec: 实时监测数据推送

## ADDED Requirements

### Requirement: 实时监测数据 WebSocket 推送

系统 SHALL 在成功接收并保存每一条监测数据后，通过 WebSocket 实时推送给订阅了该设备的前端客户端。

#### Scenario: 单条监测数据推送成功

- **GIVEN** 用户已通过 WebSocket 连接并订阅了设备房间（`equipment:{equipmentId}`）
- **WHEN** 系统成功接收并保存一条该设备的监测数据（通过 `POST /api/monitoring/data`）
- **THEN** 系统 SHALL 通过 WebSocket 向该设备房间推送 `monitoring:new-data` 事件
- **AND** 推送消息 SHALL 包含完整的监测数据信息（id, equipmentId, timestamp, metricType, monitoringPoint, value, unit, quality, source）
- **AND** 推送操作 SHALL 异步执行，不阻塞数据保存的 HTTP 响应

#### Scenario: 未订阅设备的用户不接收推送

- **GIVEN** 用户 A 订阅了设备 X（`equipment:X`）
- **AND** 用户 B 未订阅设备 X
- **WHEN** 设备 X 上报一条新的监测数据
- **THEN** 系统 SHALL 仅向用户 A 推送 `monitoring:new-data` 事件
- **AND** 用户 B SHALL NOT 接收到该推送

#### Scenario: 批量数据上报不推送

- **GIVEN** 用户通过批量接口上报数据（`POST /api/monitoring/data/batch`）
- **WHEN** 系统成功保存 100 条监测数据
- **THEN** 系统 SHALL NOT 为每条数据单独推送 WebSocket 消息
- **AND** 批量数据推送功能可作为未来优化（不在本次变更范围内）

#### Scenario: 推送失败不影响数据保存

- **GIVEN** WebSocket 网关服务暂时不可用或推送过程中发生错误
- **WHEN** 系统接收到一条监测数据
- **THEN** 数据 SHALL 成功保存到数据库
- **AND** HTTP 响应 SHALL 返回成功（200 OK）
- **AND** 推送错误 SHALL 记录到日志，但不抛出异常

### Requirement: 监测数据推送服务架构

系统 SHALL 提供独立的 `MonitoringPushService` 来封装监测数据推送逻辑，遵循现有的推送服务架构模式。

#### Scenario: MonitoringPushService 提供推送方法

- **GIVEN** `MonitoringPushService` 已注册为 NestJS 提供者
- **WHEN** 其他服务需要推送监测数据
- **THEN** 系统 SHALL 提供 `pushNewData(timeSeriesData: TimeSeriesData)` 方法
- **AND** 该方法 SHALL 接受 `TimeSeriesData` 实体作为参数
- **AND** 该方法 SHALL 调用 `WebsocketGateway.sendToEquipment()` 发送消息

#### Scenario: 推送服务依赖 WebSocket 网关

- **GIVEN** `MonitoringPushService` 需要发送 WebSocket 消息
- **WHEN** 服务初始化时
- **THEN** 系统 SHALL 注入 `WebsocketGateway` 依赖
- **AND** `MonitoringModule` SHALL 导入 `WebsocketModule` 以获得网关访问权限

#### Scenario: 推送消息格式规范

- **GIVEN** 系统准备推送监测数据
- **WHEN** 构建 WebSocket 消息体时
- **THEN** 消息 SHALL 包含以下字段：
  - `id`: 数据记录ID（number）
  - `equipmentId`: 设备ID（string, UUID）
  - `timestamp`: 数据时间戳（ISO 8601 格式）
  - `metricType`: 指标类型（MetricType enum）
  - `monitoringPoint`: 监测点名称（string, 可为 null）
  - `value`: 指标数值（number）
  - `unit`: 数据单位（string）
  - `quality`: 数据质量（DataQuality enum）
  - `source`: 数据来源（DataSource enum）

### Requirement: 集成到监测服务

系统 SHALL 在 `MonitoringService.receiveMonitoringData` 方法中集成数据推送功能。

#### Scenario: 数据保存后触发推送

- **GIVEN** `MonitoringService` 已注入 `MonitoringPushService`
- **WHEN** `receiveMonitoringData` 成功保存 `TimeSeriesData` 后
- **THEN** 系统 SHALL 调用 `monitoringPushService.pushNewData(savedData)`
- **AND** 推送调用 SHALL 在数据保存后立即执行
- **AND** 推送调用 SHALL 在告警评估之前或之后执行均可（无严格顺序要求）

#### Scenario: 推送与告警评估独立执行

- **GIVEN** 系统已实现告警评估（`AlarmService.evaluateThresholds`）和监测数据推送
- **WHEN** 一条监测数据同时触发告警和数据推送
- **THEN** 系统 SHALL 独立执行两个推送操作：
  - `monitoring:new-data` 事件（监测数据推送）
  - `alarm:new` 事件（告警推送，如果触发）
- **AND** 两个推送操作 SHALL 互不影响，一个失败不影响另一个

### Requirement: 日志与可观测性

系统 SHALL 记录监测数据推送的关键日志，便于运维和调试。

#### Scenario: 记录推送成功日志

- **GIVEN** 监测数据推送成功
- **WHEN** `MonitoringPushService.pushNewData` 执行完成
- **THEN** 系统 SHALL 使用 `Logger.debug` 级别记录日志
- **AND** 日志 SHALL 包含：设备ID、监测点、指标类型、数值

#### Scenario: 记录推送失败日志

- **GIVEN** WebSocket 推送过程中发生异常
- **WHEN** `WebsocketGateway.sendToEquipment` 抛出错误
- **THEN** 系统 SHALL 使用 `Logger.error` 级别记录日志
- **AND** 日志 SHALL 包含完整的错误堆栈信息
- **AND** 错误 SHALL 被捕获，不向上层抛出

## MODIFIED Requirements

_（本次变更不涉及修改现有需求）_

## REMOVED Requirements

_（本次变更不涉及删除现有需求）_
