# monitoring-contract Specification

## Purpose
定义全船监测点数据的通信契约，强制使用标准文档定义的语义化中文名称作为监测点主标识符，确保数据在模拟器、状态存储和 UI 展示之间的一致性。
## Requirements
### Requirement: Semantic Identifier Convention
系统 SHALL 使用标准文档定义的中文字符串作为实时监测点的主标识符（MonitoringPoint Name）。系统 MUST 确保涵盖文档 `docs/data/monitoring_point_definition.md` 中定义的全部 82 个监测点，实现 100% 的数据契约对齐。

#### Scenario: Full Data Set Availability
- **WHEN** 进入任何一个核心子系统页面
- **THEN** 页面上展示的监测点数量和名称必须与 `docs/data/monitoring_point_definition.md` 中的定义完全一致。

### Requirement: Equipment-Specific Collision Prevention
当同一设备拥有多个物理类型相同但业务含义不同的指标时，系统 MUST 通过监测点名称进行唯一区分。

#### Scenario: Distinguishing Temperatures
- **WHEN** 电池设备同时推送 "环境温度" 和 "单体温度"（两者 `metricType` 皆为 `temperature`）
- **THEN** 系统必须将其作为两个独立的指标进行存储和展示，确保数值互不干扰。

### Requirement: Batch Data Transmission Structure
系统 MUST 支持后端通过 WebSocket 以分片形式推送批量监测数据（`monitoring:batch-data`）。每个分片 SHALL 包含 `batchId`（批次唯一标识）、`chunkIndex`（当前分片序号）及 `totalChunks`（总分片数），以确保前端可完整重建导入进度。

#### Scenario: Multi-device Batch Processing
- **WHEN** 后端交替推送设备 A 和设备 B 的数据分片
- **THEN** 前端 SHALL 根据 `batchId` 分别追踪进度，确保多设备并行导入时数据流不混淆。

### Requirement: Batch Data Volume Validation
在文件上传阶段，系统 MUST 在发送网络请求前对数据规模进行预校验。单次导入的监测点记录数上限 SHALL 为 50,000 条。

#### Scenario: Overflow Prevention
- **WHEN** 用户尝试导入包含 60,000 条记录的 Excel 文件
- **THEN** 系统 SHALL 拦截请求，弹出错误提示，并建议用户按月或按设备拆分文件。

