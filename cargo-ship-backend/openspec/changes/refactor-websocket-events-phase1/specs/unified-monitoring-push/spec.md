# Spec: 统一监测数据推送

**能力 ID**: `unified-monitoring-push`  
**关联变更**: `refactor-websocket-events-phase1`

## MODIFIED Requirements

### Requirement: 监测数据实时推送统一入口

**需求 ID**: `unified-monitoring-push-001`

The system MUST unify all equipment monitoring data WebSocket pushes to the `monitoring:new-data` event, regardless of data source (real-time sensors, file import, equipment push service).

系统必须将所有设备监测数据的 WebSocket 推送统一到 `monitoring:new-data` 事件,无论数据来源(实时传感器、文件导入、设备推送服务)。

#### Scenario: 实时传感器数据推送

**Given** MonitoringService 接收到新的监测数据  
**When** 数据成功保存到数据库  
**Then** MonitoringPushService 应推送 `monitoring:new-data` 事件  
**And** 事件消息应包含 `source: 'sensor'`  
**And** 消息应推送到 `equipment:{equipmentId}` 房间

#### Scenario: 文件导入数据推送

**Given** ImportService 完成历史数据导入  
**When** 识别到每个设备的最新监测数据  
**Then** MonitoringPushService 应为每个设备推送一次 `monitoring:new-data` 事件  
**And** 事件消息应包含 `source: 'file-import'`  
**And** 消息应推送到对应的 `equipment:{equipmentId}` 房间

#### Scenario: 推送消息格式验证

**Given** 任何监测数据推送场景  
**When** MonitoringPushService 推送 `monitoring:new-data` 事件  
**Then** 消息应包含以下字段:
- `id`: 时序数据记录 ID
- `equipmentId`: 设备 ID
- `timestamp`: ISO 8601 格式时间戳
- `metricType`: 指标类型
- `monitoringPoint`: 监测点名称(可选)
- `value`: 数值
- `unit`: 单位(可选)
- `quality`: 数据质量
- `source`: 数据来源 ('sensor' | 'file-import')

### Requirement: ImportService 使用统一推送服务

**需求 ID**: `unified-monitoring-push-002`

ImportService MUST call MonitoringPushService for data push after import, rather than directly calling WebsocketGateway.

ImportService 在导入数据后必须调用 MonitoringPushService 进行推送,而非直接调用 WebsocketGateway。

#### Scenario: 导入服务推送最新数据

**Given** ImportService 成功导入批量监测数据  
**And** 识别出每个设备的最新监测数据  
**When** 执行最新数据推送  
**Then** 应调用 `MonitoringPushService.pushNewData(latestData)` 方法  
**And** 不应直接调用 `WebsocketGateway.sendToEquipment()`

## REMOVED Requirements

### Requirement: equipment:data:realtime 事件推送

**需求 ID**: `equipment-realtime-data-push` (已移除)

~~EquipmentPushService 推送实时设备数据到 `equipment:data:realtime` 事件~~

**移除理由**: 功能与 `monitoring:new-data` 完全重复,统一使用 MonitoringPushService

### Requirement: import:latest-data 事件推送

**需求 ID**: `import-latest-data-push-001` (已移除)

~~ImportService 在导入完成后推送最新数据到 `import:latest-data` 事件~~

**移除理由**: 功能与 `monitoring:new-data` 完全重复,统一使用 MonitoringPushService

## 影响的现有规范

- `openspec/specs/realtime-monitoring/spec.md` - 需要更新,强调唯一性
- `openspec/specs/import-latest-data-push/spec.md` - 需要标记为废弃或移除

## 实施检查清单

- [ ] MonitoringService 调用 MonitoringPushService.pushNewData()
- [ ] ImportService 移除直接调用 WebsocketGateway 的代码
- [ ] ImportService 改为调用 MonitoringPushService.pushNewData()
- [ ] EquipmentPushService.pushRealtimeData() 标记为 @deprecated 或删除
- [ ] 更新 MonitoringPushService 单元测试
- [ ] 创建 E2E 测试验证统一推送逻辑
- [ ] 更新 WebSocket API 文档
