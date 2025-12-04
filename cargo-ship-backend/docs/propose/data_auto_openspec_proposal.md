## 1. 变更目标 (Objective)

本次变更的目标是根据项目需求文档 `docs/require/system_enhancement_requirements.md` 中的定义，补全系统中缺失的自动化数据处理逻辑。

核心任务是打通数据从接收到处理、再到实时推送的全链路，构建一个完整的、由事件驱动的自动化工作流。

## 2. 关键任务分解 (Key Tasks)

根据需求文档，本次变更主要包含以下三个核心功能：

#### 任务1：实现实时告警生成 (对应需求 FR-1)
- **需求**: 当系统接收到新的监测数据 (`TimeSeriesData`) 时，必须自动检查该数据是否违反了相关阈值规则 (`ThresholdConfig`)。
- **实现**: 如果规则被触发（需考虑 `duration` 持续时间），则自动创建一条 `AlarmRecord` 记录，并通过 WebSocket 推送此告警。
- **指导**: 推荐使用 `@nestjs/event-emitter` 事件机制。由 `MonitoringService` 在保存数据后发出事件，由 `AlarmService` 监听事件并处理规则检查。

#### 任务2：实现实时监测数据推送 (对应需求 FR-2)
- **需求**: 当新的监测数据被成功保存后，系统应立即将该数据点推送给正在监控该设备的前端客户端。
- **实现**: 数据成功保存后，通过 `WebsocketGateway` 将数据推送到以设备ID命名的特定“房间”（Room）。
- **指导**: 此功能可由监听同一事件的另一个服务或监听器处理。`WebsocketGateway` 中已包含 `sendToEquipment` 的能力，可以直接利用。

#### 任务3：实现历史数据告警回溯 (对应需求 FR-3)
- **需求**: 为通过文件导入的历史数据提供一个独立的分析功能，用以生成历史告警记录。
- **实现**: 创建一个新的服务方法（例如 `AlarmService.backfillAlarms(importId)`) 和一个对应的API端点来手动触发此过程。此过程不应触发实时的WebSocket告警。

## 3. 实现要求 (Implementation Notes)

- **遵循现有规范**: 请严格遵守项目已有的编码风格、架构模式（如模块、服务、依赖注入）和命名约定。
- **模块依赖**: 请负责更新相关的模块依赖，例如，`MonitoringModule` 可能需要导入 `WebsocketModule` 和 `EventEmitterModule`。
- **测试**: 请为所有新增的自动化逻辑和服务添加相应的单元测试，以确保功能的稳定性和正确性。

---
