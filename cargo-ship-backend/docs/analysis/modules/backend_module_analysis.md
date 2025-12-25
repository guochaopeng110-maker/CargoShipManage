# NestJS 后端项目模块关联分析

## 第一步：整体架构概览

这是一个结构清晰、模块化设计的典型 NestJS 应用。它将不同的业务功能拆分到各个独立的模块中，使得项目易于维护和扩展。`app.module.ts` 文件是我们的入口点，它像一个“目录”，告诉我们项目包含了哪些主要部分。

从 `app.module.ts` 文件中，我们可以看到项目的核心由 **8 个功能模块**和一个**全局公共模块**组成：

1.  **AuthModule**：认证与授权模块
2.  **EquipmentModule**：设备管理模块
3.  **MonitoringModule**：数据监控模块
4.  **AlarmModule**：告警管理模块
5.  **ReportModule**：报告生成模块
6.  **ImportModule**：数据导入模块
7.  **QueryModule**：数据查询与导出模块
8.  **WebsocketModule**：实时通信模块
9.  **CommonModule**：提供全局共享服务的公共模块

同时，项目使用了 `TypeORM` 与 `MySQL` 数据库进行交互，并且通过定义在 `database/entities` 目录下的实体（Entity）来映射数据库表结构。

接下来，我们将逐个分析每个模块，并重点阐述它们之间的业务、数据和技术关联。

---

## 第二步：模块逐一分析与关联

我们将以核心业务流为线索，从 **设备** -> **数据** -> **分析** -> **展现** 的顺序来分析。

### 1. `EquipmentModule` (设备管理模块)

这是系统的核心基础模块，负责管理船舶上所有设备的基础信息（台账）。

-   **业务关联**:
    -   所有其他业务模块（如监控、告警、报告）都建立在“设备”这个概念之上。没有设备，其他模块就没有意义。
    -   它是设备数字化管理的入口，负责设备的增、删、改、查。

-   **数据关联**:
    -   **拥有核心实体**：`Equipment`。这个实体是整个系统的“主数据”之一，其 `id` (设备ID) 是许多其他表的关键外键。
    -   **被依赖**：`TimeSeriesData`、`AlarmRecord`、`ThresholdConfig`、`HealthReport` 等实体都通过 `equipmentId` 与 `Equipment` 实体关联。

-   **技术关联**:
    -   **对外提供服务**：向其他模块（如 `MonitoringService`）提供 `EquipmentService`，用于验证设备是否存在或获取设备信息。
    -   **依赖 `AuthModule`**：其控制器 `EquipmentController` 使用 `@UseGuards` 装饰器，依赖 `AuthModule` 提供的 `JwtAuthGuard` 和 `PermissionsGuard` 进行权限验证。
    -   **依赖 `WebsocketModule`**：通过注入 `EquipmentPushService`，当设备状态发生变化时，调用 `WebsocketGateway` 向前端实时推送更新。

### 2. `MonitoringModule` (数据监控模块)

负责接收和存储来自设备的实时或历史监测数据。

-   **业务关联**:
    -   它是数据驱动决策的基础，为告警、报告和查询提供最原始的数据来源。
    -   负责数据的实时采集（或接收）和存储。

-   **数据关联**:
    -   **拥有核心实体**: `TimeSeriesData`。这是一个时序数据表，记录了哪个设备 (`equipmentId`) 在什么时间 (`timestamp`) 的哪个监测点 (`monitoringPoint`) 的什么指标 (`metricType`) 的值 (`value`)。这是系统中数据量最大的表。
    -   **依赖 `Equipment` 实体**: 在存入数据前，需要验证 `equipmentId` 的有效性，确保数据能关联到具体的设备。

-   **技术关联**:
    -   **触发 `AlarmModule`**: 这是最关键的技术关联。在 `MonitoringService` 的 `receiveMonitoringData` 方法中，当新数据保存成功后，会**异步调用** `alarmService.evaluateThresholds(savedData)`。这个调用启动了告警评估流程。
    -   **依赖 `DataQualityService`**: 在存储数据前，使用 `DataQualityService` 对数据进行清洗和验证，确保数据的有效性。
    -   **触发 `WebsocketModule`**: `receiveMonitoringData` 方法中也调用 `alarmPushService`，意味着新数据可能会触发告警，并通过 WebSocket 推送。

### 3. `AlarmModule` (告警管理模块)

负责定义告警规则（阈值），并根据实时数据生成和管理告警记录。

-   **业务关联**:
    -   实现系统的核心价值之一：实时故障预警和告警管理。
    -   用户可以配置不同设备、不同指标的告警阈值。

-   **数据关联**:
    -   **拥有核心实体**: `ThresholdConfig` (阈值配置) 和 `AlarmRecord` (告警记录)。
    -   **依赖 `TimeSeriesData`**: `AlarmService` 接收来自 `MonitoringModule` 的 `TimeSeriesData` 对象。
    -   **依赖 `ThresholdConfig`**: `AlarmService` 会查询 `ThresholdConfig` 表，判断 `TimeSeriesData` 的值是否触发了某个规则。
    -   **创建 `AlarmRecord`**: 如果触发规则，`AlarmService` 会创建一条新的 `AlarmRecord` 记录，并关联到对应的 `Equipment` 和 `ThresholdConfig`。

-   **技术关联**:
    -   **被 `MonitoringModule` 调用**: `AlarmService` 的 `evaluateThresholds` 方法被 `MonitoringService` 调用，形成业务流。
    -   **依赖 `WebsocketModule`**: `AlarmModule` 包含 `AlarmPushService`。当 `AlarmService` 创建或更新告警记录后，会调用 `AlarmPushService`，后者再通过 `WebsocketGateway` 将实时告警推送给前端订阅了相关设备或角色的用户。

### 4. `ReportModule` (报告生成模块)

负责对设备的历史数据进行深度分析，生成健康评估报告。

-   **业务关联**:
    -   提供设备的健康状态评估（SOH - State of Health），实现从“监测”到“诊断”和“预测”的跨越。
    -   支持生成单个设备的详细报告或多个设备的汇总报告。

-   **数据关联**:
    -   **拥有核心实体**: `HealthReport`。
    -   **重度依赖多个数据源**:
        -   读取 `TimeSeriesData` 进行趋势分析和稳定性计算。
        -   读取 `AlarmRecord` 统计告警频率和严重程度。
        -   读取 `Equipment` 获取设备基础信息和运行总时长。
    -   它是一个数据的**消费者**和**分析者**，最终产出高度浓缩的分析结果。

-   **技术关联**:
    -   **包含复杂算法**: `algorithms` 目录下的 `SOHCalculator`, `HealthIndexEvaluator`, `FaultDiagnosticEngine` 是该模块的核心技术实现，封装了复杂的业务分析逻辑。
    -   **依赖 `ExportService`**: 提供了将报告导出为 Excel 或 PDF 的功能。

### 5. `ImportModule` (数据导入模块)

负责从外部文件（如 Excel, CSV）批量导入历史监测数据。

-   **业务关联**:
    -   解决历史数据或离线数据录入系统的问题，为报告和分析提供更完整的数据集。
    -   通常用于系统初始化或数据迁移。

-   **数据关联**:
    -   **拥有核心实体**: `ImportRecord`，用于追踪每次导入任务的状态和结果。
    -   **主要写入目标**: `TimeSeriesData` 表。该模块的核心功能是将解析后的文件数据批量写入时序数据表。

-   **技术关联**:
    -   **包含文件解析逻辑**: `FileParserService` 是其核心组件，负责解析不同格式的文件，并将行列数据转换为结构化的 `ParsedTimeSeriesData` 对象。
    -   **数据库事务处理**: 在 `ImportService` 的 `executeImport` 方法中，使用了 `DataSource` 和 `QueryRunner` 来执行批量插入，并包含事务（Transaction）处理，确保大批量数据导入的原子性（要么全部成功，要么全部回滚）。

### 6. `QueryModule` (查询与导出模块)

提供统一的数据查询、统计和导出接口。

-   **业务关联**:
    -   为前端提供复杂的、跨模块的数据聚合查询接口，例如获取设备档案（包含设备信息、最新数据、告警统计等）。
    -   提供数据导出功能，满足用户离线分析的需求。

-   **数据关联**:
    -   **纯粹的数据消费者**: 该模块不拥有自己的核心实体。它的服务会跨表查询 `Equipment`, `TimeSeriesData`, `AlarmRecord` 等多个实体，并将结果聚合后返回。

-   **技术关联**:
    -   **API 聚合层**: `QueryController` 充当了一个数据查询的 API 网关角色，将多个服务的调用封装成一个接口。
    -   **依赖 `ExportService`**: 实现了将查询结果导出为 Excel, CSV, 或 PDF 的功能。

### 7. `AuthModule` (认证与授权模块)

作为系统的安全基石，负责用户身份验证和权限控制。

-   **业务关联**:
    -   管理用户、角色和权限的对应关系，实现“谁可以做什么”的控制。
    -   提供登录、注册、登出、改密等标准身份管理功能。

-   **数据关联**:
    -   **拥有核心实体**: `User`, `Role`, `Permission`, `AuditLog`。
    -   `User` 与 `Role` 是多对多关系。
    -   `Role` 与 `Permission` 是多对多关系。
    -   `AuditLog` 记录了所有重要操作，并关联到执行操作的 `User`。

-   **技术关联**:
    -   **全局守卫 (Global Guards)**: `JwtAuthGuard` 被注册为全局守卫，保护了所有默认接口。`@Public()` 装饰器用于豁免特定接口（如登录、注册）。
    -   **提供装饰器和守卫**: 提供了 `@Roles`、`@Permissions` 装饰器和 `RolesGuard`、`PermissionsGuard`，被所有其他模块的 `Controller` 用于实现细粒度的访问控制。
    -   **提供 `AuditService`**: 其他模块可以注入 `AuditService` 来记录关键业务操作的审计日志。

### 8. `WebsocketModule` (实时推送模块)

负责服务器与客户端之间的实时双向通信。

-   **业务关联**:
    -   将服务器端的事件（如新告警、设备状态变化）实时推送给前端，避免前端不断轮询。
    -   提升用户体验，提供实时动态的监控界面。

-   **数据关联**:
    -   **无核心数据实体**: 它是一个纯粹的技术通道，不拥有业务数据。

-   **技术关联**:
    -   **被其他模块依赖**: `AlarmModule` 和 `EquipmentModule` 等业务模块会注入 `WebsocketGateway` 服务，并调用其方法（如 `sendToRole`, `sendToEquipment`）来推送消息。
    -   **连接管理**: 管理客户端连接，并通过 JWT 对连接进行身份验证。
    -   **房间 (Room) 机制**: 通过 `client.join()` 实现消息的定向推送。例如，将用户加入 `user:${userId}`、`role:${roleName}` 房间，或根据用户订阅加入 `equipment:${equipmentId}` 房间，从而实现精准推送。

---

## 第三步：总结与数据流图

综上所述，这些模块构成了一个完整的数据驱动型监控系统的闭环。我们可以用一个简化的数据流来描述它们的关系：

```
                                                                                 +------------------+
                                                                                 |  WebsocketModule |  (实时推送)
                                                                                 +------------------+
                                                                                       ^      ^
                                                                                       |      |  (推送告警/状态)
                                                                (调用推送服务)        |      |
+----------------+      +--------------------+      +--------------------+      +-------------+
|  ImportModule  |----->|  MonitoringModule  |----->|    AlarmModule     |----->| QueryModule |
|  (数据导入)    |      |  (数据监控)        |      |   (告警管理)       |      | (查询/统计)   |
+----------------+      +--------------------+      +--------------------+      +-------------+
        |  (写入)            |      |      |                   |                       |
        |                    |      | (触发告警评估)           | (创建)                 | (读取)
        v                    v      |                        v                       v
+------------------------------------------------------------------------------------------------+
|                                        Database (MySQL)                                        |
| +------------------+  +------------------+  +------------------+  +------------------+  +------+ |
| | Equipment        |->| TimeSeriesData   |->| AlarmRecord      |<-| ThresholdConfig  |  | ...  | |
| +------------------+  +------------------+  +------------------+  +------------------+  +------+ |
+------------------------------------------------------------------------------------------------+
        ^                    ^                     ^                       ^        ^
        | (CRUD)             | (读取分析)            | (读取分析)            | (读取)   | (读取)
+----------------+     +--------------------+      +--------------------+      +----------+
| EquipmentModule|     |    ReportModule    |----->|   ExportService    |      | AuthModule | (全局)
|   (设备管理)   |     |   (报告生成)       |      |     (导出PDF)      |      | (认证/授权) |
+----------------+     +--------------------+      +--------------------+      +----------+
                                                                                     |
                                                                                     v (保护所有API)
                                                                                [Guards]

```

**核心流程解读**:

1.  **基础设定**: `AuthModule` 负责权限，`EquipmentModule` 负责定义监控对象（设备）。
2.  **数据注入**:
    -   `MonitoringModule` 接收实时数据。
    -   `ImportModule` 批量导入历史数据。
    -   这两种方式都将数据写入核心的 `TimeSeriesData` 表。
3.  **实时分析与响应**:
    -   每当 `MonitoringModule` 接收到新数据，它会立即通知 `AlarmModule`。
    -   `AlarmModule` 根据 `ThresholdConfig` 判断是否生成 `AlarmRecord`。
    -   如果生成告警，`AlarmModule` 会通过 `WebsocketModule` 将告警实时推送给前端。
4.  **深度分析与查询**:
    -   `ReportModule` 定期或按需读取 `TimeSeriesData` 和 `AlarmRecord`，利用其内部算法生成 `HealthReport`。
    -   `QueryModule` 为前端提供各种复杂的查询和统计接口，并能将结果导出为文件。

这个架构实现了典型的业务功能分离，职责清晰，并通过服务注入和事件驱动（尽管这里是服务直接调用，但思想类似）的方式解耦，是一个非常健壮和可扩展的后端设计。
