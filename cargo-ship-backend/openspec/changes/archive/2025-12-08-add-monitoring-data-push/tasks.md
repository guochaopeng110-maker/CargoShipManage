# Implementation Tasks

## 1. 创建 MonitoringPushService

- [x] 1.1 创建 `src/modules/monitoring/monitoring-push.service.ts` 文件
- [x] 1.2 实现 `MonitoringPushService` 类，注入 `WebsocketGateway` 依赖
- [x] 1.3 实现 `pushNewData(timeSeriesData: TimeSeriesData)` 方法
  - 构建符合规范的消息体（包含 id, equipmentId, timestamp, metricType, monitoringPoint, value, unit, quality, source）
  - 调用 `websocketGateway.sendToEquipment(equipmentId, 'monitoring:new-data', message)`
  - 添加 debug 级别日志记录推送操作
  - 使用 try-catch 捕获异常，记录 error 日志但不向上抛出
- [x] 1.4 添加 JSDoc 注释说明服务用途和推送策略

## 2. 修改 MonitoringModule

- [x] 2.1 在 `src/modules/monitoring/monitoring.module.ts` 中导入 `WebsocketModule`
- [x] 2.2 将 `MonitoringPushService` 添加到 `providers` 数组
- [x] 2.3 将 `MonitoringPushService` 添加到 `exports` 数组（可选，供其他模块使用）

## 3. 修改 MonitoringService

- [x] 3.1 在 `src/modules/monitoring/monitoring.service.ts` 的构造函数中注入 `MonitoringPushService`
- [x] 3.2 在 `receiveMonitoringData` 方法中，数据保存成功后添加推送调用
  - 位置：在 `await this.timeSeriesDataRepository.save(timeSeriesData)` 之后
  - 调用：`void this.monitoringPushService.pushNewData(savedData)`
  - 使用异步方式（不使用 await），确保不阻塞响应
- [x] 3.3 确认推送操作在现有的告警评估逻辑附近（可以在告警评估前后，无严格顺序）

## 4. 编写单元测试

- [x] 4.1 创建 `src/modules/monitoring/monitoring-push.service.spec.ts` 文件
- [x] 4.2 测试场景：成功推送监测数据
  - Mock `WebsocketGateway.sendToEquipment`
  - 调用 `pushNewData` 并验证 WebSocket 方法被正确调用
  - 验证消息格式包含所有必需字段
- [x] 4.3 测试场景：推送失败时捕获异常
  - Mock `WebsocketGateway.sendToEquipment` 抛出错误
  - 调用 `pushNewData` 并验证不抛出异常
  - 验证错误日志被记录
- [x] 4.4 测试场景：监测点字段正确传递
  - 创建包含 `monitoringPoint` 的测试数据
  - 验证推送消息中包含该字段
  - 创建不包含 `monitoringPoint` 的测试数据（null）
  - 验证推送消息中该字段为 null

## 5. 更新现有测试（可选验证）

- [x] 5.1 运行 `src/modules/monitoring/monitoring.service.spec.ts` 单元测试
- [x] 5.2 确认 `receiveMonitoringData` 测试仍然通过（推送是异步的，不影响返回值）
- [x] 5.3 如果需要，添加 Mock `MonitoringPushService` 以隔离测试

## 6. 集成测试与验证

- [ ] 6.1 运行所有单元测试：`npm run test`
- [ ] 6.2 确认测试覆盖率符合项目标准
- [ ] 6.3 （可选）手动测试 WebSocket 推送
  - 启动后端服务：`npm run start:dev`
  - 使用 WebSocket 客户端连接并订阅设备房间
  - 通过 API 上报监测数据，验证前端收到 `monitoring:new-data` 事件

## 7. 代码审查准备

- [ ] 7.1 确认代码符合项目规范（ESLint, Prettier）
- [ ] 7.2 运行 `npm run lint` 并修复所有问题
- [ ] 7.3 运行 `npm run format` 格式化代码
- [ ] 7.4 检查所有 JSDoc 注释完整性
- [ ] 7.5 确认日志级别使用正确（debug 用于成功，error 用于失败）

## 依赖关系

- **任务 2 依赖任务 1**：必须先创建 `MonitoringPushService` 才能在 Module 中注册
- **任务 3 依赖任务 2**：必须先在 Module 中注册服务才能在 `MonitoringService` 中注入
- **任务 4-7 可并行执行**：测试和验证任务可以并行进行

## 关键验收标准

✅ `MonitoringPushService` 正确注入 `WebsocketGateway` 并能成功推送消息  
✅ `MonitoringService.receiveMonitoringData` 在保存数据后调用推送服务  
✅ 推送操作异步执行，不阻塞 HTTP 响应  
✅ 推送消息格式包含所有必需字段（9个字段）  
✅ 推送失败时记录错误日志但不影响数据保存  
✅ 所有单元测试通过，测试覆盖率符合标准  
✅ 代码通过 lint 和 format 检查
