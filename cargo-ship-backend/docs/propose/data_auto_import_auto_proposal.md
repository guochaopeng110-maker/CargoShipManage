### **需求提案：增强数据导入与监控模块功能**

#### **1. 整体目标**

为了满足在无实时数据源的初期阶段，系统仍能提供完整的分析和准实时体验，并完善实时数据监控能力，需要对数据导入模块 (`ImportModule`) 和数据监控模块 (`MonitoringModule`) 进行功能增强。本次重构旨在实现：**历史告警回溯分析**、**导入后最新数据实时推送**以及**所有实时监测数据的 WebSocket 推送**。

#### **2. 具体需求与功能点**

**功能点一：实现历史数据的告警回溯分析**

*   **需求背景 (Why):** 用户通过文件导入的是历史监测数据。系统必须能够分析这些历史数据，生成当时本应触发的告警记录。这对于保证告警历史的完整性、支持准确的历史分析和报告至关重要。
*   **实现目标 (What):** 在 `ImportService` 成功将一批历史时序数据 (`TimeSeriesData`) 存入数据库后，系统需要自动对这批数据进行告警评估。
*   **实现路径 (How):**
    1.  修改 `ImportService` 中的 `executeImport` 或 `batchImportTimeSeriesData` 方法。
    2.  在数据成功存入数据库后，遍历新存入的每一条 `TimeSeriesData` 记录。
    3.  为每一条数据记录，调用 `AlarmService` 中现有的 `evaluateThresholds` 方法。
    4.  如果数据触发了任何阈值规则，`AlarmService` 将自动创建一条对应的 `AlarmRecord`，并记录正确的历史触发时间。

**功能点二：实现导入后最新数据的实时推送**

*   **需求背景 (Why):** 当用户完成一次数据导入后，前端界面应该能立即响应，并展示数据集中“最新”的状态，模拟实时数据更新的体验，而不是让用户手动刷新或重新查询。
*   **实现目标 (What):** 在一次导入任务成功完成后，系统需要识别出该批数据中时间戳最新的那条记录，并通过 WebSocket 将其推送给前端客户端。
*   **实现路径 (How):**
    1.  修改 `ImportService` 中的 `executeImport` 方法。
    2.  在整个导入流程的末尾（所有数据都已存入数据库后），从本次导入的数据集中找出时间戳 (`timestamp`) 最晚的一条或多条数据。
    3.  注入 `WebsocketGateway` 服务到 `ImportService` 中。
    4.  定义一个新的 WebSocket 事件，例如 `import:latest-data`。
    5.  调用 `websocketGateway.broadcast()` 或更精确的推送方法，将这条最新的数据记录发送出去。

**功能点三：实现所有实时监测数据的 WebSocket 推送**

*   **需求背景 (Why):** 前端需要实时展示所有进入系统的监测数据，而不仅仅是触发告警的数据。这将提供一个更全面、动态的设备运行视图。
*   **实现目标 (What):** `MonitoringService` 在成功接收并存储每一条实时监测数据 (`TimeSeriesData`) 后，应立即通过 WebSocket 将该数据推送到前端。
*   **实现路径 (How):**
    1.  修改 `MonitoringService` 中的 `receiveMonitoringData` 方法。
    2.  在 `timeSeriesData` 成功保存后，利用注入的 `WebsocketGateway` (或通过一个新的 `MonitoringPushService`) 进行数据推送。
    3.  定义一个新的 WebSocket 事件，例如 `monitoring:new-data`。
    4.  将 `savedData` 推送给订阅了相关设备房间的客户端 (`sendToEquipment`)。

#### **3. 涉及的核心模块与服务**

*   **主要修改**:
    *   `ImportModule`: 主要是 `ImportService`。
    *   `MonitoringModule`: 主要是 `MonitoringService`。
*   **主要依赖**:
    *   `AlarmModule`: 需要调用 `AlarmService` 来执行告警评估。
    *   `WebsocketModule`: 需要调用 `WebsocketGateway` 来执行实时推送。
