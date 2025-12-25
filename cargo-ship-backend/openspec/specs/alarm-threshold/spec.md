# alarm-threshold Specification

## Purpose
TBD - created by archiving change refactor-monitoring-alarm-model. Update Purpose after archive.
## Requirements
### Requirement: 阈值配置
系统 MUST 允许配置告警阈值,包括设备 ID、监测点、指标类型、上下限、持续时间、严重程度、故障名称和处理措施。

#### Scenario: 创建完整的阈值配置
- **假设** 设备"电池装置系统"的监测点为"总电压"
- **当** 创建阈值,equipmentId、monitoringPoint="总电压"、metricType=voltage、upperLimit=683.1、lowerLimit=584.1、duration=5000ms、severity=medium、faultName="总压异常"、recommendedAction="检查稳压器"
- **那么** 所有字段验证并存储
- **并且** 规则激活用于告警监控

#### Scenario: 验证监测点一致性
- **假设** 正在创建阈值配置
- **当** metricType 与监测点的预期类型不匹配时
- **那么** 验证失败并返回清晰的错误消息
- **并且** 配置被拒绝

#### Scenario: 按监测点查询阈值
- **假设** 设备有多个阈值
- **当** 查询特定监测点的阈值时
- **那么** 仅返回匹配的阈值配置
- **并且** 包含相关设备和监测点详情

### Requirement: 告警记录存储（增强）
系统 MUST 创建告警记录,包括设备 ID、监测点、阈值配置、触发值、故障名称、处理措施、严重程度和时间戳。

#### Scenario: 记录带业务上下文的告警
- **假设** 阈值规则有监测点、故障名称和处理措施
- **当** 触发告警时
- **那么** 告警记录包含所有业务上下文字段
- **并且** 操作员有完整的响应信息

#### Scenario: 将告警链接到阈值配置
- **假设** 告警由阈值规则触发
- **当** 创建告警记录时
- **那么** 它引用阈值配置 ID
- **并且** 故障名称和处理措施复制到告警以保证历史准确性

#### Scenario: 在阈值更改后保留告警上下文
- **假设** 存在历史告警记录及其故障名称和处理措施
- **当** 原始阈值规则被修改或删除时
- **那么** 告警记录保留其原始上下文
- **并且** 历史数据保持准确和完整

