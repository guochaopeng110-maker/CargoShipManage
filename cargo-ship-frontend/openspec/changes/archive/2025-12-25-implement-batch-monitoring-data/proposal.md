# 提案: 实现批量监测数据推送 (Implement Batch Monitoring Data Push)

## Why
目前系统仅支持单条实时监测数据的推送（`monitoring:new-data`），在处理批量传感器数据上报或大规模历史文件导入时，频繁的单条 WebSocket 消息会导致：
1. **性能瓶颈**：高频的单条推送会触发大量重复的 React 重绘和 Store 更新。
2. **缺乏反馈**：用户导入数万条记录时，由于缺乏进度反馈，无法感知导入状态。
3. **协议低效**：每条消息都携带完整的头部信息，数据传输效率低。

后端已实施基于分片的批量推送方案，前端需要配套实现，以提升大规模数据处理能力和用户体验。

## What Changes
- **新增 WebSocket 事件支持**：实现对 `monitoring:batch-data` 事件的监听和处理。
- **分片数据处理逻辑**：
  - 实现基于 `batchId` 的数据流整合。
  - 对于**实时批量数据** (`isHistory: false`)，并入现有实时缓冲区进行节流更新。
  - 对于**历史导入数据** (`isHistory: true`)，跳过实时波形缓存，防止历史数据刷掉实时波形。
- **进度追踪系统**：在 `MonitoringStore` 中新增进度管理逻辑，记录各批次的 `chunkIndex` 和 `totalChunks`。
- **UI 增强**：
  - 在文件导入页面增加上传前的记录数校验（上限 50,000 条）。
  - 新增进度条组件，实时展示分片接收进度。
- **数据转换优化**：实现后端 `quality: 192` 等状态码到前端 `DataQuality` 枚举的精确转换。

## Impact
- **Affected specs**: `monitoring-contract`, `realtime-bus`
- **Affected code**: 
    - `src/types/websocket.ts` (类型定义)
    - `src/services/realtime-service.ts` (事件监听)
    - `src/stores/monitoring-store.ts` (状态管理逻辑)
    - `src/components/DataImportPage.tsx` (UI 校验与反馈)
