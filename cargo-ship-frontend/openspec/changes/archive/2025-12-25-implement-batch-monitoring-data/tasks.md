## 1. 类型定义 (Type Definitions)
- [x] 1.1 在 `src/types/websocket.ts` 中新增 `MonitoringBatchDataMessage` 和 `MonitoringDataItem` 接口
- [x] 1.2 在 `ServerToClientEvents` 中添加 `monitoring:batch-data` 事件定义

## 2. 实时服务增强 (Realtime Service Enhancement)
- [x] 2.1 修改 `src/services/realtime-service.ts` 的 `setupInternalListeners`，注册 `monitoring:batch-data` 的监听器
- [x] 2.2 实现事件转发，将批量数据代理到 `MonitoringStore` 处理

## 3. Store 状态管理 (Store State Management)
- [x] 3.1 在 `MonitoringStore` 中新增 `importProgress` 状态，用于追踪多个批次的进度
- [x] 3.2 实现 `handleBatchData` Actions：
    - [x] 3.2.1 批量映射 `quality: 192` 等状态码
    - [x] 3.2.2 处理 `isHistory: false`：并入实时缓冲区 `pendingUpdates`
    - [x] 3.2.3 处理 `isHistory: true`：更新进度状态，不进入 `data` 缓存
- [x] 3.3 实现最后一个分片（`chunkIndex === totalChunks`）的完成通知触发

## 4. UI 验证与反馈 (UI Validation & Feedback)
- [x] 4.1 在 `src/components/DataImportPage.tsx` 中添加 `validateFileBeforeUpload` 函数，校验 50,000 条限制
- [x] 4.2 集成进度反馈 UI，利用 Store 中的 `importProgress` 展示实时进度条

## 5. 验证 (Validation)
- [x] 5.1 模拟批量推送，验证实时波形不受历史导入干扰
- [x] 5.2 验证大文件上传拦截逻辑
