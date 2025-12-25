## ADDED Requirements

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
