# monitoring-data Specification

## Purpose
TBD - created by archiving change refactor-monitoring-alarm-model. Update Purpose after archive.
## Requirements
### Requirement: 时序数据存储
系统 MUST 存储带时间戳、指标类型、值、质量、来源和监测点信息的时序监控数据。

#### Scenario: 记录完整的监控数据
- **假设** 来自设备的传感器读数
- **当** 数据包括 equipmentId、timestamp、metricType、value、monitoringPoint 以及可选的 unit/quality/source
- **那么** 所有字段存储在 time_series_data 表中
- **并且** 可以检索到包含完整上下文的记录

#### Scenario: 按设备和监测点查询
- **假设** 存在多个设备和监测点的时序数据
- **当** 同时按 equipmentId 和 monitoringPoint 筛选时
- **那么** 仅返回匹配的记录
- **并且** 通过复合索引优化查询性能

#### Scenario: 支持向后兼容
- **假设** 存在没有监测点值的现有时序数据
- **当** 应用模式迁移时
- **那么** 现有记录仍可访问
- **并且** 新记录需要监测点值

