# monitoring-contract Specification Delta

## MODIFIED Requirements
### Requirement: Semantic Identifier Convention
系统 SHALL 使用标准文档定义的中文字符串作为实时监测点的主标识符（MonitoringPoint Name）。系统 MUST 确保涵盖文档 `docs/data/monitoring_point_definition.md` 中定义的全部 82 个监测点，实现 100% 的数据契约对齐。

#### Scenario: Full Data Set Availability
- **WHEN** 进入任何一个核心子系统页面
- **THEN** 页面上展示的监测点数量和名称必须与 `docs/data/monitoring_point_definition.md` 中的定义完全一致。
