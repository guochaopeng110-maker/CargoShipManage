# import-alarm-retrospection Specification

## Purpose
TBD - created by archiving change enhance-import-capabilities. Update Purpose after archive.
## Requirements
### Requirement: 历史数据告警评估

系统 MUST 在成功导入时序数据后，自动对每条历史数据执行告警阈值评估，生成应触发的告警记录。

#### Scenario: 导入触发阈值的历史数据

- **GIVEN** 存在设备 "电池装置系统" 的阈值配置：监测点 "总电压"，上限 683.1V，下限 584.1V，严重程度 medium
- **AND** 用户通过文件导入了该设备的历史数据，包含一条 timestamp=2025-01-01T10:00:00Z, value=700V 的记录（超过上限）
- **WHEN** 导入流程成功将数据保存到 `time_series_data` 表
- **THEN** 系统 MUST 调用 `AlarmService.evaluateThresholds` 对该数据进行评估
- **AND** 系统 MUST 创建一条 `AlarmRecord`，包含以下信息：
  - `equipmentId`: 电池装置系统ID
  - `triggeredAt`: 2025-01-01T10:00:00Z（使用数据的原始时间戳）
  - `abnormalValue`: 700
  - `severity`: medium
  - `monitoringPoint`: "总电压"
  - `faultName`: 阈值配置中的故障名称
  - `recommendedAction`: 阈值配置中的处理措施

#### Scenario: 导入未触发阈值的历史数据

- **GIVEN** 存在设备的阈值配置
- **AND** 用户导入的历史数据值均在阈值范围内
- **WHEN** 导入流程完成
- **THEN** 系统 MUST 执行告警评估
- **AND** 系统 MUST NOT 创建任何 `AlarmRecord`

#### Scenario: 导入多条触发告警的历史数据

- **GIVEN** 用户导入包含 1000 条历史数据的文件
- **AND** 其中 50 条数据触发了不同的阈值规则
- **WHEN** 导入流程完成
- **THEN** 系统 MUST 为每条触发告警的数据创建对应的 `AlarmRecord`
- **AND** 系统 MUST 创建总计 50 条告警记录
- **AND** 每条告警记录的 `triggeredAt` 时间戳 MUST 对应数据的原始 `timestamp`

#### Scenario: 告警评估使用历史时间戳

- **GIVEN** 用户导入 timestamp=2024-06-01T08:00:00Z 的历史数据
- **WHEN** 该数据触发告警
- **THEN** 创建的 `AlarmRecord` 的 `triggeredAt` 字段 MUST 为 2024-06-01T08:00:00Z
- **AND** 告警记录 MUST NOT 使用当前系统时间作为触发时间

### Requirement: 告警评估的容错处理

系统 MUST 确保告警评估失败不影响数据导入的成功，并提供详细的错误日志。

#### Scenario: 单条数据告警评估失败不影响其他数据

- **GIVEN** 用户导入 100 条历史数据
- **AND** 其中第 50 条数据的告警评估因阈值配置错误而失败
- **WHEN** 导入流程执行
- **THEN** 系统 MUST 记录第 50 条数据的评估失败错误日志
- **AND** 系统 MUST 继续评估其余 99 条数据
- **AND** 导入状态 MUST 为 COMPLETED（数据导入成功）
- **AND** 其他数据的告警记录 MUST 正常创建

#### Scenario: 告警评估失败记录详细日志

- **GIVEN** 某条数据的告警评估抛出异常
- **WHEN** 评估失败时
- **THEN** 系统 MUST 使用 `Logger.error` 记录错误日志
- **AND** 日志 MUST 包含以下信息：
  - 数据 ID 或索引
  - 设备 ID
  - 监测点
  - 错误消息
  - 错误堆栈
- **AND** 错误 MUST 被捕获，不向上层抛出

#### Scenario: 所有数据评估失败不影响导入状态

- **GIVEN** `AlarmService` 暂时不可用（如数据库连接问题）
- **AND** 用户导入 100 条历史数据
- **WHEN** 所有数据的告警评估均失败
- **THEN** 数据 MUST 成功保存到 `time_series_data` 表
- **AND** 导入状态 MUST 为 COMPLETED
- **AND** 系统 MUST 记录告警评估失败的汇总日志

### Requirement: 告警评估的性能保障

系统 MUST 确保告警评估不显著降低批量导入的性能。

#### Scenario: 告警评估在事务外执行

- **GIVEN** 批量导入使用事务保证数据一致性
- **WHEN** 执行告警评估时
- **THEN** 告警评估 MUST 在数据库事务提交之后执行
- **AND** 告警评估 MUST NOT 阻塞事务提交
- **AND** 告警评估失败 MUST NOT 导致事务回滚

#### Scenario: 记录告警评估的性能指标

- **GIVEN** 导入流程包含告警评估
- **WHEN** 导入完成时
- **THEN** 系统 MUST 记录告警评估的统计信息：
  - 评估的总数据条数
  - 触发告警的数据条数
  - 评估失败的数据条数
  - 告警评估总耗时（可选）
- **AND** 统计信息 MUST 使用 `Logger.log` 级别记录

### Requirement: 集成到导入服务

系统 MUST 在 `ImportService` 中集成告警评估功能，遵循现有的模块依赖模式。

#### Scenario: ImportService 注入 AlarmService

- **GIVEN** `AlarmService` 已在 `AlarmModule` 中注册
- **WHEN** `ImportModule` 初始化时
- **THEN** `ImportModule` MUST 在 `imports` 中包含 `AlarmModule`
- **AND** `ImportService` MUST 通过构造函数注入 `AlarmService`
- **AND** 依赖注入 MUST 成功，无循环依赖

#### Scenario: 在批量导入方法中调用告警评估

- **GIVEN** `ImportService.batchImportTimeSeriesData` 成功保存一批数据
- **WHEN** 数据库事务提交后
- **THEN** 系统 MUST 遍历成功保存的每条 `TimeSeriesData`
- **AND** 系统 MUST 对每条数据调用 `AlarmService.evaluateThresholds(data)`
- **AND** 调用 MUST 使用 try-catch 捕获异常
- **AND** 调用结果 MUST 被记录到日志

#### Scenario: 告警评估不改变导入返回结果

- **GIVEN** 导入流程包含告警评估
- **WHEN** 告警评估执行完成
- **THEN** 导入方法的返回值 MUST 保持不变（仍返回 successCount, failedCount, skippedCount, errors）
- **AND** 告警评估的结果 MUST 仅通过日志记录
- **AND** 调用方 MUST 无感知告警评估的执行

