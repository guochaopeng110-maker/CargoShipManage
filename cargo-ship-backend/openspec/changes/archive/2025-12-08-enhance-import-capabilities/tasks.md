# 实施任务清单

## 1. 模块依赖配置

- [x] 1.1 修改 `src/modules/import/import.module.ts`
  - 在 `imports` 数组中添加 `AlarmModule`
  - 在 `imports` 数组中添加 `WebsocketModule`（如果尚未添加）
  - 验证依赖注入无循环依赖

## 2. 历史告警回溯功能实现

- [x] 2.1 修改 `ImportService` 构造函数
  - 注入 `AlarmService` 依赖
  - 添加 `Logger` 实例用于日志记录

- [x] 2.2 实现告警评估逻辑
  - 在 `batchImportTimeSeriesData` 方法中,事务提交后遍历成功保存的 `TimeSeriesData`
  - 为每条数据调用 `AlarmService.evaluateThresholds(data)`
  - 使用 try-catch 捕获单条数据的评估异常
  - 记录评估失败的详细错误日志（设备ID、监测点、错误消息）

- [x] 2.3 添加告警评估统计日志
  - 记录评估的总数据条数
  - 记录触发告警的数据条数
  - 记录评估失败的数据条数
  - 使用 `Logger.log` 记录汇总统计信息

- [x] 2.4 确保告警评估不影响导入状态
  - 验证评估失败不抛出异常到上层
  - 验证导入返回结果不包含告警评估信息
  - 验证导入状态仅基于数据保存结果

## 3. 最新数据推送功能实现

- [x] 3.1 修改 `ImportService` 构造函数
  - 注入 `WebsocketGateway` 依赖（如果 2.1 未完成）

- [x] 3.2 实现按设备分组的最新数据识别逻辑
  - 在 `executeImport` 方法的导入成功后（状态更新前）
  - 创建 `Map<string, TimeSeriesData>` 存储每个设备的最新数据
  - 遍历本次导入的成功数据,按 `equipmentId` 分组
  - 对每个设备,保留 `timestamp` 最晚的记录
  - 处理无成功数据的边界情况（跳过推送）

- [x] 3.3 实现按设备推送的 WebSocket 逻辑
  - 遍历设备最新数据的 Map
  - 为每个设备构建推送消息体,包含所有必需字段（id, equipmentId, timestamp, metricType, monitoringPoint, value, unit, quality, source, importRecordId）
  - 调用 `websocketGateway.sendToEquipment(equipmentId, 'import:latest-data', messageData)`
  - 每次推送使用 try-catch 捕获异常
  - 记录推送失败的详细错误日志

- [x] 3.4 添加推送成功日志
  - 记录导入记录ID、推送的设备数量
  - 记录每个设备的ID和最新数据时间戳
  - 使用 `Logger.log` 级别

## 4. 文件解析扩展 - 监测点支持（新增）

- [x] 4.1 修改 `ParsedTimeSeriesData` 接口
  - 在 `src/modules/import/file-parser.service.ts` 中添加 `monitoringPoint?: string` 字段
  - 更新接口注释,说明该字段为可选

- [x] 4.2 更新列映射配置 `COLUMN_MAPPING`
  - 添加 `监测点: 'monitoringPoint'`
  - 添加 `监控点: 'monitoringPoint'`
  - 添加 `测点: 'monitoringPoint'`
  - 添加 `'Monitoring Point': 'monitoringPoint'`
  - 添加 `'MonitoringPoint': 'monitoringPoint'`

- [x] 4.3 更新 `convertDataTypes` 方法
  - 添加监测点字段的处理逻辑
  - 如果 `row.monitoringPoint` 存在,进行 trim 去除空白
  - 验证长度不超过 100 字符,否则抛出错误
  - 将处理后的值赋给 `result.monitoringPoint`
  - 如果监测点为空或空白字符串,设置为 undefined

- [x] 4.4 修改 `ImportService.batchImportTimeSeriesData`
  - 在创建 `TimeSeriesData` 实体时,添加 `monitoringPoint` 字段赋值
  - 从 `ParsedTimeSeriesData` 中获取 `monitoringPoint` 值
  - 确保 null 值正确传递给实体

- [x] 4.5 创建标准导入模板文件
  - 创建 `templates/` 目录（如果不存在）
  - 创建 `import-template.xlsx`,包含表头和示例数据
  - 表头：设备ID, 时间戳, 监测点, 指标类型, 数值, 单位, 数据质量
  - 示例数据：SYS-BAT-001, 2025-01-01 10:00:00, 总电压, 电压, 650.5, V, 正常
  - 创建 `import-template.csv`,包含相同内容
  - 创建 `import-template.json`,包含JSON格式示例

- [x] 4.6 添加模板下载接口
  - 在 `ImportController` 中添加 `@Get('template/:format')` 端点
  - 支持下载 Excel、CSV 和 JSON 格式模板
  - 添加 Swagger 文档注释
  - 包含完整的设备ID清单和监测点说明

- [x] 4.7 更新 API 文档
  - 在 `ImportController` 的 Swagger 注解中说明监测点字段
  - 添加字段说明：可选但强烈推荐、字符串、最大100字符、用于精确匹配阈值规则
  - 更新文件上传接口的示例
  - 说明导入后会自动执行告警回溯和数据推送

## 5. 单元测试

- [x] 5.1 测试告警评估集成
  - 测试导入触发阈值的数据时创建 `AlarmRecord`
  - 测试告警记录的 `triggeredAt` 使用数据的原始时间戳
  - 测试单条评估失败不影响其他数据
  - 测试所有评估失败不影响导入成功状态

- [x] 5.2 测试最新数据识别
  - 测试从单个设备的多条数据中正确识别时间戳最新的记录
  - 测试从多个设备的数据中为每个设备识别最新记录
  - 测试单条数据的情况
  - 测试无成功数据时跳过推送

- [x] 5.3 测试 WebSocket 推送集成
  - Mock `WebsocketGateway.sendToEquipment` 方法
  - 测试多设备导入时,为每个设备调用一次 `sendToEquipment`
  - 测试推送消息格式正确
  - 测试推送失败不影响导入状态
  - 测试推送成功记录日志

- [x] 5.4 测试文件解析 - 监测点字段（新增）
  - 测试解析包含监测点列的 Excel 文件
  - 测试解析包含监测点列的 CSV 文件
  - 测试多种表头名称映射（监测点、监控点、Monitoring Point）
  - 测试监测点为空时设置为 undefined（向后兼容）
  - 测试监测点名称自动 trim 空白
  - 测试监测点名称超过 100 字符时报错

## 6. 集成测试（E2E）

- [ ] 6.1 准备测试数据
  - 创建包含触发告警数据的测试 Excel 文件
  - 创建不触发告警的测试数据
  - 创建包含多个设备、不同时间戳的测试数据
  - **新增**: 创建包含监测点列的测试文件
  - **新增**: 创建不包含监测点列的测试文件（向后兼容测试）

- [ ] 6.2 测试告警回溯完整流程
  - 导入触发阈值的历史数据
  - 验证 `AlarmRecord` 表中创建了对应记录
  - 验证告警记录的字段正确（设备ID、监测点、故障名称、触发时间等）
  - 验证告警记录的时间戳为数据的原始时间,非当前时间
  - **新增**: 验证带监测点的数据触发了正确的阈值规则

- [ ] 6.3 测试最新数据推送完整流程
  - 启动 WebSocket 服务器
  - 创建多个测试客户端,分别订阅不同设备的房间
  - 导入包含 3 个设备的测试数据
  - 验证每个客户端仅收到其订阅设备的 `import:latest-data` 事件
  - 验证推送消息包含正确的最新数据
  - 验证推送消息格式符合规范
  - 验证未订阅的客户端不收到任何推送
  - **新增**: 验证推送消息包含正确的 `monitoringPoint` 字段

- [ ] 6.4 测试容错场景
  - 模拟 `AlarmService` 不可用,验证导入仍然成功
  - 模拟 WebSocket 推送失败,验证导入状态为 COMPLETED
  - 验证错误日志正确记录

- [ ] 6.5 测试监测点字段的端到端流程（新增）
  - 导入包含监测点的文件
  - 验证数据库中 `TimeSeriesData` 记录包含正确的 `monitoringPoint` 值
  - 验证基于监测点的告警正确触发
  - 验证推送消息包含监测点字段
  - 导入不包含监测点的旧格式文件
  - 验证数据库中 `monitoringPoint` 为 null
  - 验证旧格式文件仍能正常导入和触发通用告警

## 7. 性能验证

- [ ] 7.1 性能基准测试
  - 测试导入 1000 条数据（无告警评估）的基准耗时
  - 测试导入 1000 条数据（含告警评估）的总耗时
  - 验证耗时增加在可接受范围内（< 20%）

- [ ] 7.2 大批量数据测试
  - 测试导入 10000 条数据的场景
  - 监控内存使用情况
  - 验证无内存泄漏

## 8. 日志和监控验证

- [x] 8.1 验证日志完整性
  - 验证告警评估开始和完成日志
  - 验证推送成功日志
  - 验证错误日志包含足够的调试信息
  - 验证监测点解析相关日志

- [x] 8.2 验证日志级别正确
  - 统计信息使用 `Logger.log`
  - 调试信息使用 `Logger.debug`
  - 错误信息使用 `Logger.error`

## 9. 文档更新

- [x] 9.1 更新 API 文档
  - 在导入接口的响应说明中添加"导入成功后会推送最新数据到 WebSocket"
  - 文档化 `import:latest-data` 事件的消息格式
  - 文档化监测点字段的用途和填写规范
  - 添加模板下载接口的 Swagger 文档

- [x] 9.2 更新 CLAUDE.md
  - 添加告警回溯功能的说明
  - 添加数据导入推送的架构说明
  - 添加监测点字段的重要性说明
  - 添加标准导入模板的使用指南
  - 添加完整的Data Import Module章节

- [x] 9.3 创建用户使用指南
  - 编写数据导入章节（在CLAUDE.md中完成）
  - 说明必填字段和可选字段
  - 强调监测点字段对告警完整性的重要性
  - 提供标准模板下载和使用示例
  - 列举常见错误和解决方法

## 10. 代码审查准备

- [x] 10.1 代码自查
  - 确保所有异常都被正确捕获和处理
  - 确保日志记录完整且级别正确
  - 确保没有引入安全漏洞（如注入风险）
  - 验证监测点字段的长度限制生效

- [x] 10.2 性能优化检查
  - 确保告警评估在事务外执行
  - 确保没有 N+1 查询问题
  - 确保批量操作没有内存泄漏

## 11. 部署前验证

- [ ] 11.1 本地环境完整测试
  - 运行所有单元测试和 E2E 测试
  - 手动测试完整流程
  - 验证 WebSocket 推送在真实环境中正常工作
  - 测试导入包含监测点的真实数据文件

- [ ] 11.2 生产环境检查清单
  - 确认 `AlarmModule` 和 `WebsocketModule` 已在生产环境正常运行
  - 确认数据库阈值配置数据已就绪
  - 确认 WebSocket 服务器配置正确
  - 确认标准导入模板文件已部署到服务器

## 12. 归档准备（实施完成后）

- [ ] 12.1 更新提案状态
  - 标记所有任务为已完成
  - 记录实施过程中的重要决策或调整

- [ ] 12.2 准备归档
  - 运行 `openspec archive enhance-import-capabilities`
  - 验证归档后的规范文件正确更新
  - 提交归档变更的独立 PR
