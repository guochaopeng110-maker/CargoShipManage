# import-latest-data-push Specification

## Purpose
TBD - created by archiving change enhance-import-capabilities. Update Purpose after archive.
## Requirements
### Requirement: 导入完成后推送最新数据

系统 MUST 在批量数据导入成功完成后,按设备分组识别每个设备的最新数据记录,并通过 WebSocket 推送到对应设备的订阅客户端。

#### Scenario: 导入成功后推送单个设备的最新数据

- **GIVEN** 用户导入了设备 "电池装置系统" 的 100 条历史数据
- **AND** 数据的时间戳范围为 2025-01-01 00:00:00 至 2025-01-01 23:59:59
- **WHEN** 导入流程成功完成（所有数据保存到数据库）
- **THEN** 系统 MUST 识别时间戳最晚的一条数据（2025-01-01 23:59:59）
- **AND** 系统 MUST 调用 `websocketGateway.sendToEquipment(equipmentId, 'import:latest-data', latestData)`
- **AND** 推送消息 MUST 包含该最新数据的完整信息
- **AND** 推送 MUST 仅发送到订阅了该设备房间的客户端

#### Scenario: 导入多个设备的数据推送每个设备的最新记录

- **GIVEN** 用户导入包含 3 个不同设备的历史数据
- **AND** 设备 A 的最新数据时间戳为 2025-01-01 10:00:00
- **AND** 设备 B 的最新数据时间戳为 2025-01-01 12:00:00
- **AND** 设备 C 的最新数据时间戳为 2025-01-01 09:00:00
- **WHEN** 导入流程完成
- **THEN** 系统 MUST 为每个设备推送其各自的最新数据
- **AND** 系统 MUST 调用 `websocketGateway.sendToEquipment(equipmentIdA, 'import:latest-data', dataA)`
- **AND** 系统 MUST 调用 `websocketGateway.sendToEquipment(equipmentIdB, 'import:latest-data', dataB)`
- **AND** 系统 MUST 调用 `websocketGateway.sendToEquipment(equipmentIdC, 'import:latest-data', dataC)`
- **AND** 总计推送 3 条消息（每个设备一条）

#### Scenario: 导入单条数据推送该数据

- **GIVEN** 用户导入仅包含 1 条数据的文件
- **WHEN** 导入成功
- **THEN** 系统 MUST 推送该唯一的数据记录

#### Scenario: 导入失败不推送数据

- **GIVEN** 用户导入的数据文件格式错误或包含无效数据
- **WHEN** 导入状态为 FAILED（成功行数为 0）
- **THEN** 系统 MUST NOT 推送 `import:latest-data` 事件
- **AND** 系统 MUST 记录导入失败日志

#### Scenario: 部分导入成功推送成功部分的最新数据

- **GIVEN** 用户导入 100 条数据,其中 50 条成功,50 条失败
- **WHEN** 导入状态为 PARTIAL
- **THEN** 系统 MUST 从成功保存的 50 条数据中识别最新数据
- **AND** 系统 MUST 推送该最新数据

### Requirement: WebSocket 推送消息格式

系统 MUST 使用标准化的消息格式推送最新数据,确保前端客户端能够正确解析。

#### Scenario: 推送消息包含完整数据信息

- **GIVEN** 系统准备推送最新数据
- **WHEN** 构建 WebSocket 消息时
- **THEN** 消息 MUST 使用事件名称 `import:latest-data`
- **AND** 消息体 MUST 包含以下字段:
  - `id`: 数据记录的数据库 ID (number)
  - `equipmentId`: 设备 ID (string, UUID 格式)
  - `timestamp`: 数据时间戳 (ISO 8601 格式字符串)
  - `metricType`: 指标类型 (MetricType enum)
  - `monitoringPoint`: 监测点名称 (string, 可为 null)
  - `value`: 数值 (number)
  - `unit`: 单位 (string)
  - `quality`: 数据质量 (DataQuality enum)
  - `source`: 数据来源 (DataSource enum)
  - `importRecordId`: 导入记录 ID (string, UUID 格式, 可选)

#### Scenario: 推送消息格式示例

- **GIVEN** 最新数据为电池装置系统的总电压监测点
- **WHEN** 推送该数据时
- **THEN** WebSocket 消息 MUST 符合以下格式:
  ```json
  {
    "id": 12345,
    "equipmentId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-01-01T23:59:59.000Z",
    "metricType": "voltage",
    "monitoringPoint": "总电压",
    "value": 650.5,
    "unit": "V",
    "quality": "normal",
    "source": "import",
    "importRecordId": "660e8400-e29b-41d4-a716-446655440001"
  }
  ```

### Requirement: WebSocket 推送的容错处理

系统 MUST 确保 WebSocket 推送失败不影响数据导入的成功状态,并提供详细的错误日志。

#### Scenario: 推送失败不影响导入成功状态

- **GIVEN** 数据导入成功保存到数据库
- **AND** WebSocket 网关服务暂时不可用
- **WHEN** 尝试推送最新数据时抛出异常
- **THEN** 系统 MUST 捕获推送异常
- **AND** 导入记录的状态 MUST 保持为 COMPLETED
- **AND** HTTP 响应 MUST 返回导入成功
- **AND** 系统 MUST 使用 `Logger.error` 记录推送失败日志

#### Scenario: 推送失败记录详细错误日志

- **GIVEN** WebSocket 推送过程中发生错误
- **WHEN** 推送失败时
- **THEN** 系统 MUST 记录错误日志,包含:
  - 导入记录 ID
  - 最新数据的设备 ID 和时间戳
  - 错误消息
  - 错误堆栈
- **AND** 日志级别 MUST 为 `Logger.error`

#### Scenario: 无数据导入成功时不推送

- **GIVEN** 导入流程执行完成,但成功保存的数据条数为 0
- **WHEN** 检查是否推送最新数据时
- **THEN** 系统 MUST 跳过推送逻辑
- **AND** 系统 MUST NOT 调用 `WebsocketGateway.broadcast`
- **AND** 系统 MUST 记录 `Logger.debug` 级别日志: "无成功数据,跳过推送"

### Requirement: 推送时机和执行顺序

系统 MUST 在适当的时机推送最新数据,确保与其他操作的正确顺序。

#### Scenario: 推送在导入状态更新前执行

- **GIVEN** 导入流程即将完成
- **WHEN** 执行推送逻辑时
- **THEN** 推送 MUST 在更新导入记录状态之前执行
- **AND** 推送 MUST 在数据保存和告警评估之后执行
- **AND** 推送失败 MUST NOT 阻止状态更新

#### Scenario: 推送与告警评估独立执行

- **GIVEN** 导入的数据同时触发告警和最新数据推送
- **WHEN** 导入流程执行
- **THEN** 系统 MUST 独立推送两个 WebSocket 事件:
  - `alarm:new` 事件(由 `AlarmService` 触发,如果有告警)
  - `import:latest-data` 事件(由 `ImportService` 触发)
- **AND** 两个推送 MUST 互不影响,一个失败不影响另一个

#### Scenario: 推送异步执行不阻塞导入响应

- **GIVEN** 用户通过 API 发起导入操作
- **WHEN** 导入流程完成并准备返回 HTTP 响应
- **THEN** WebSocket 推送 MUST 在返回响应之前同步执行(但使用 try-catch 保证快速失败)
- **AND** 推送耗时 MUST 不显著增加 HTTP 响应时间(< 100ms)
- **AND** 如果推送耗时过长,系统 MUST 记录警告日志

### Requirement: 集成到导入服务

系统 MUST 在 `ImportService` 中集成 WebSocket 推送功能,遵循现有的模块依赖模式。

#### Scenario: ImportService 注入 WebsocketGateway

- **GIVEN** `WebsocketGateway` 已在 `WebsocketModule` 中注册
- **WHEN** `ImportModule` 初始化时
- **THEN** `ImportModule` MUST 在 `imports` 中包含 `WebsocketModule`
- **AND** `ImportService` MUST 通过构造函数注入 `WebsocketGateway`
- **AND** 依赖注入 MUST 成功,无循环依赖

#### Scenario: 在 executeImport 方法中调用推送逻辑

- **GIVEN** `ImportService.executeImport` 成功完成数据导入
- **WHEN** 准备更新导入记录状态时
- **THEN** 系统 MUST 按设备分组识别每个设备的最新记录:
  ```typescript
  const latestDataByEquipment = new Map<string, TimeSeriesData>();
  successfulDataList.forEach(data => {
    const current = latestDataByEquipment.get(data.equipmentId);
    if (!current || data.timestamp > current.timestamp) {
      latestDataByEquipment.set(data.equipmentId, data);
    }
  });
  ```
- **AND** 系统 MUST 遍历每个设备,调用 `websocketGateway.sendToEquipment(equipmentId, 'import:latest-data', latestData)`
- **AND** 每次调用 MUST 使用 try-catch 捕获异常
- **AND** 异常 MUST 被记录但不向上抛出

#### Scenario: 推送成功记录日志

- **GIVEN** WebSocket 推送成功执行
- **WHEN** 推送完成时
- **THEN** 系统 MUST 使用 `Logger.log` 级别记录日志
- **AND** 日志 MUST 包含:
  - 导入记录 ID
  - 推送的设备数量
  - 每个设备的 ID 和最新数据时间戳

