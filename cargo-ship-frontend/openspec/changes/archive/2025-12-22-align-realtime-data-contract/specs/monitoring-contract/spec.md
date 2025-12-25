# monitoring-contract Specification

## Purpose
该规范定义了全船监测点数据的通信契约。为了确保多层级数据的准确映射，系统必须强制遵守标准文档定义的语义化名称，实现“数据即业务”。

## ADDED Requirements
### Requirement: Semantic Identifier Convention
系统 SHALL 使用标准文档定义的中文字符串（如“总电压”、“电机转速”）作为实时监测点的主标识符（MonitoringPoint Name）。

#### Scenario: Data Point Resolution
- **WHEN** 接收到来自后端的 `monitoring:new-data` 消息，其中 `monitoringPoint` 为 "SOC荷电状态"
- **THEN** 系统必须将其存储在对应的以 "SOC荷电状态" 为后缀的键值下，并能通过该中文名在图标映射表中找到电量图标。

### Requirement: Equipment-Specific Collision Prevention
当同一设备拥有多个物理类型相同但业务含义不同的指标时，系统 MUST 通过监测点名称进行唯一区分。

#### Scenario: Distinguishing Temperatures
- **WHEN** 电池设备同时推送 "环境温度" 和 "单体温度"（两者 `metricType` 皆为 `temperature`）
- **THEN** 系统必须将其作为两个独立的指标进行存储和展示，确保数值互不干扰。
