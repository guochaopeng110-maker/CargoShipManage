# Change: 增强数据导入模块的告警回溯和实时推送能力

## Why

当前数据导入模块仅将历史监测数据存储到数据库，缺少两项关键能力：

1. **告警历史完整性缺失**：导入的历史数据不会触发告警评估，导致告警记录缺失历史应触发的告警，影响报告准确性和趋势分析
2. **缺乏准实时反馈**：数据导入完成后前端需要手动刷新才能看到最新状态，用户体验不佳

这两个能力对于在无实时数据源的初期阶段提供完整的分析能力和准实时体验至关重要。

## What Changes

### 1. 历史告警回溯分析
- 在 `ImportService.batchImportTimeSeriesData` 方法中，成功保存时序数据后，遍历每条记录并调用 `AlarmService.evaluateThresholds` 进行告警评估
- 对于触发阈值的历史数据，系统自动创建对应的 `AlarmRecord`，并记录正确的历史触发时间
- 确保告警评估逻辑能正确处理历史时间戳（使用数据的 `timestamp` 字段，而非当前时间）

### 2. 导入后最新数据实时推送
- 在 `ImportService.executeImport` 方法的导入流程末尾，按设备分组识别每个设备的最新数据
- 通过 `WebsocketGateway.sendToEquipment` 为每个设备推送 WebSocket 事件 `import:latest-data`
- 推送逻辑异步执行，不阻塞导入流程的完成
- 仅推送到订阅了该设备房间的客户端，避免无关消息

### 3. 文件解析支持监测点字段（新增）
- 扩展 `FileParserService` 以解析导入文件中的"监测点"列
- 更新 `ParsedTimeSeriesData` 接口，添加 `monitoringPoint?: string` 字段
- 更新 `COLUMN_MAPPING` 配置，支持"监测点"、"监控点"、"Monitoring Point"等多种表头名称
- 提供监测点值的基本验证（长度限制、空白处理）
- 向后兼容：如果文件不包含监测点列，字段值为 null，仍可正常导入

### 4. 标准导入模板（新增）
- 提供包含监测点列的标准 Excel/CSV 导入模板
- 模板包含示例数据，指导用户正确填写
- 更新 API 文档和用户指南，说明监测点字段的用途和重要性

## Impact

### 影响的规范（Specs）
- **新增能力**: `import-alarm-retrospection` - 历史数据告警回溯
- **新增能力**: `import-latest-data-push` - 导入后最新数据推送
- **新增能力**: `import-monitoring-point` - 文件导入支持监测点字段

### 影响的代码文件
- `src/modules/import/import.service.ts` - 主要修改点，添加告警评估和数据推送逻辑
- `src/modules/import/import.module.ts` - 需要导入 `AlarmModule` 和 `WebsocketModule`
- `src/modules/import/file-parser.service.ts` - **新增修改**：扩展监测点列解析、更新接口和列映射
- `src/modules/alarm/alarm.service.ts` - 可能需要确保 `evaluateThresholds` 方法可被外部调用
- `src/modules/websocket/websocket.gateway.ts` - 无需修改，已有 `sendToEquipment` 方法

### 风险与权衡
- **性能影响**：批量导入大量历史数据时，告警评估可能增加处理时间。建议采用批量评估或异步处理策略
- **事务边界**：告警评估失败不应回滚数据导入事务，需要独立的错误处理和日志记录
- **WebSocket 推送失败**：推送失败不应影响导入成功状态，需要容错处理

### 依赖关系
- 依赖现有的 `AlarmService.evaluateThresholds` 方法
- 依赖现有的 `WebsocketGateway` 推送能力
- 依赖现有的 `ThresholdConfig` 阈值配置数据
