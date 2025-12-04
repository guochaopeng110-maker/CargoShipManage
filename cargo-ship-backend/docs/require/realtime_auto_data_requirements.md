# 系统的实时性和自动化处理需求

## 1. 项目概述

本项目是一个基于 NestJS 的船舶设备监测与管理系统后端服务。其核心功能是采集设备的实时和历史监测数据，并基于这些数据提供状态监控、告警、健康评估和数据查询导出等功能。

系统当前已包含认证授权、设备管理、数据监控、告警管理、报告和数据导入等基础模块。

## 2. 现状分析与待解决问题

在对现有代码进行分析后，我们发现系统具备了大部分基础能力，但在数据流转和自动化处理方面存在几个关键的 **“逻辑断点”**。这些断点导致系统的实时性和自动化能力未能完全发挥。

- **已实现功能**:
  - 通过 REST API 接收实时/批量监测数据 (`MonitoringService`)。
  - 通过文件上传方式导入历史监测数据 (`ImportService`)。
  - 提供了 `WebsocketGateway` 用于实时通信，并设计了按设备、角色订阅的房间机制。
  - 提供了 `AlarmService` 和 `HealthAssessmentService` 用于处理告警和评估健康状态。
  - 数据库实体和关系已基本定义完善。

- **核心逻辑断点**:
  1.  **[断点A] 实时告警触发缺失**：`MonitoringService` 在接收到新的监测数据后，仅将其存入数据库，但没有自动化的机制去检查该数据是否违反了阈值规则，从而实时生成告警。
  2.  **[断点B] 实时数据推送缺失**：`MonitoringService` 在接收到新数据后，没有将数据通过 `WebsocketGateway` 推送给已订阅该设备的前端客户端，导致前端无法实时展示最新数据。
  3.  **[断点C] 历史告警生成缺失**：`ImportService` 在导入历史数据后，仅将数据存入数据库，没有对这些历史数据进行回溯分析以生成对应的历史告警记录。

## 3. 功能需求 (Functional Requirements)

为了解决上述问题并完善系统功能，需要实现以下需求：

### FR-1: 实现实时告警生成与推送

- **描述**: 当 `MonitoringService` 接收到新的 `TimeSeriesData` 时，系统必须能自动、实时地检查该数据是否触发了相关设备和指标的告警规则。
- **验收标准**:
  1.  系统能够根据新数据的 `equipmentId` 和 `metricType`，查询到所有匹配的、已启用的 `ThresholdConfig` 规则。
  2.  如果数据值违反了规则（例如，超出 `upperLimit` 或低于 `lowerLimit`），并且满足 `duration`（持续时间）条件，系统必须自动调用 `AlarmService.create()` 方法，在 `alarm_records` 表中创建一条新的告警记录。
  3.  新告警记录创建成功后，必须立即通过 `WebsocketGateway` 将告警信息推送给已订阅该设备或拥有相应权限（如管理员）的客户端。

### FR-2: 实现实时监测数据推送

- **描述**: 当 `MonitoringService` 接收并成功保存一条新的 `TimeSeriesData` 后，系统必须立即将该数据点推送给正在监控对应设备的前端客户端。
- **验收标准**:
  1.  数据成功存入数据库后，`MonitoringService` 需调用 `WebsocketGateway`。
  2.  `WebsocketGateway` 需将该数据点准确地发送到以设备ID命名的特定房间 (Room)，例如 `equipment:<equipmentId>`。
  3.  推送的数据载荷应包含指标类型、数值、单位和时间戳等关键信息。

### FR-3: 实现历史数据告警回溯功能

- **描述**: 为通过文件导入的历史 `TimeSeriesData` 提供一个机制，用于分析并生成相应的历史告警记录。
- **验收标准**:
  1.  该功能应作为一个独立的、可被调用的服务实现，例如 `AlarmService.backfillAlarms(importRecordId)`，而不是在文件导入时同步执行。
  2.  该服务能够遍历指定批次（一次导入）的所有历史数据。
  3.  对于每一条数据，它能根据数据的时间戳，查找当时有效的阈值规则，并判断是否构成历史告警。
  4.  成功识别后，在 `alarm_records` 表中创建告警记录，其 `triggeredAt` 字段必须使用数据的原始时间戳。
  5.  此过程**不应**触发实时的 WebSocket 告警推送。

## 4. 实现指南与技术建议

为了保证代码质量和模块间的低耦合，推荐采用以下方式实现上述功能：

- **核心建议：采用事件驱动架构**
  - 强烈推荐使用 NestJS 的官方事件模块 `@nestjs/event-emitter` 来解耦服务。
  - **流程**:
    1.  **发出事件**: 在 `MonitoringService` 的 `receiveMonitoringData` 方法成功保存数据后，发出一个事件，例如 `timeseries.data.received`，并附带新保存的 `TimeSeriesData` 对象。
    2.  **监听事件**:
        - 在 `AlarmService` (或一个新建的 `AlarmRuleEngineService`) 中，创建一个事件监听器 `@OnEvent('timeseries.data.received')`。此监听器负责执行 **FR-1**（告警检查与生成）。
        - 同样，可以在 `MonitoringService` 自身或一个专门的 `DataPushService` 中创建另一个监听器，负责执行 **FR-2**（实时数据推送）。

- **模块依赖关系调整**
  - `MonitoringModule` 需要在其 `imports` 数组中添加 `WebsocketModule`，以便能够注入 `WebsocketGateway`。
  - 所有需要发射或监听事件的模块，都需要导入 NestJS 的 `EventEmitterModule`。

- **告警持续时间(`duration`)判断逻辑**
  - 这是实现 **FR-1** 的一个难点。在事件监听器中，当检测到单点数据越限时，不能立即生成告警。
  - **建议实现**: 需要反向查询 `TimeSeriesData` 表，获取该设备、该指标在过去 `duration` 毫秒内的所有数据点，并检查它们是否“持续”超出阈值。只有满足条件，才创建 `AlarmRecord`。

- **历史告警回溯实现**
  - 建议在 `AlarmService` 中新增一个 `async backfillAlarmsFromImport(importRecordId: string)` 方法。
  - 该方法会查询与 `importRecordId` 相关的所有 `TimeSeriesData`，然后批量进行规则检查。
  - 可以在 `ImportController` 中新增一个API端点，例如 `POST /api/imports/:id/analyze-alarms`，用于手动触发此回溯过程。
