# WebSocket API 事件设计分析与优化建议

## 1. 概述

本文档基于 `websocket_api_spec.md` 文件，对现有 WebSocket 事件的设计进行分析，并提出优化建议。总体而言，API 规范定义清晰，但在事件的 **精简性 (精简)** 和 **联动性 (联动)** 方面有提升空间。

---

## 2. 事件功能重叠分析 (精简性)

当前设计中存在部分功能高度相似的事件，建议进行合并以降低系统复杂度。

### 2.1 监测数据推送事件 (强烈建议合并)

- **存在问题**: `monitoring:new-data`, `equipment:data:realtime`, `import:latest-data` 三个事件功能完全重叠，都用于推送设备监测值。
- **优化建议**:
    - **统一使用** `monitoring:new-data` 作为唯一的监测数据推送事件。
    - 通过该事件中的 `source` 字段 (如 `'sensor'`, `'file-import'`) 来区分数据来源。
    - **废弃** `equipment:data:realtime` 和 `import:latest-data` 事件。
- **收益**: 简化后端 API，降低前端客户端的事件监听复杂度。

### 2.2 批量告警推送事件 (可选优化)

- **存在问题**: `alarm:batch` (通用批量告警) 和 `alarm:historical-batch` (历史导入告警) 功能相似，主要区别在于推送目标不同。
- **优化建议**: 可考虑合并为一个通用的 `alarm:batch` 事件，并增加一个参数来指定推送范围（例如，`"target": "roles"` 或 `"target": "equipment"`）。目前的独立事件设计虽然不够精简，但逻辑尚清晰，可作为未来优化的方向。

---

## 3. 事件关联性分析 (联动性)

部分事件在逻辑上紧密相关，但规范未能明确其联动关系，可能导致前端数据不一致。

### 3.1 “通知刷新”类事件的触发机制

- **存在问题**:
    - **告警计数**: 当 `alarm:new`, `alarm:update` 等事件发生后，告警总数会变化，但规范未保证 `alarm:count:update` 事件会随之触发。
    - **设备概览**: 当 `equipment:created`, `equipment:deleted` 等事件发生后，设备统计会变化，但规范未保证 `equipment:overview:update` 事件会随之触发。
- **潜在风险**: 前端 UI（如告警徽章、设备在线数量）可能无法实时更新，数据变得陈旧。
- **优化建议**:
    1.  **明确联动**: 在规范中明确，任何导致统计数据变化的后端操作，都 **必须** 广播一次对应的“通知刷新”事件（`alarm:count:update` 或 `equipment:overview:update`）。
    2.  **推送数据 (更佳)**: 将这两类事件从简单的“通知”升级为“数据推送”，直接在事件负载中携带最新的统计数值。例如：
        ```json
        // alarm:count:update
        {
          "counts": { "pending": 25, "critical": 3 }
        }

        // equipment:overview:update
        {
          "stats": { "total": 50, "online": 48, "offline": 2 }
        }
        ```
- **收益**: 极大提升 UI 的实时性和准确性，并减少客户端为获取最新数据而发起的额外 API 请求。

---

## 4. 总结

| 类别 | 核心问题 | 优化建议 | 优先级 |
| :--- | :--- | :--- | :--- |
| **精简性** | 多个监测数据推送事件功能重叠 | 统一使用 `monitoring:new-data` 事件 | **高** |
| **联动性** | 统计刷新事件 (`...:count:update`, `...:overview:update`) 触发时机不明确 | 明确事件联动，并在事件中直接携带最新统计数据 | **高** |
| **精简性** | 两种批量告警推送事件 (`alarm:batch`, `alarm:historical-batch`) | （可选）未来可合并为一个通用批量事件 | 低 |
