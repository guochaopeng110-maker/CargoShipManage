# 设计：动态设备驱动的健康评估

## 上下文
健康评估页面最初结合了实时告警计数和历史报告。新需求将健康评估孤立为纯粹的、由设备注册表驱动的历史分析。

## 目标 / 非目标
- **目标**：
    - 展示系统中注册的所有设备（标称 8 个，需动态处理）。
    - 展示每个设备的最新健康分数。
    - 提供所有健康报告的可搜索/可筛选历史记录。
    - 100% 对齐 `Service.ts` API。
- **非目标**：
    - 在此页面进行实时故障监控（由监控/告警页面处理）。
    - 使用硬编码的系统计数。

## 决策

### 1. 数据编排 (Data Orchestration)
页面现在将使用 `useEquipmentStore` 作为其设备列表的主要来源。
- **效果**：在组件挂载时调用 `fetchEquipmentList`。
- **级联获取**：一旦项加载完毕，调用 `reportsStore.fetchSystemHealthScores(items)` 为每个项填充得分。

### 2. 图标映射策略
不再使用静态的 `deviceId` 到 `icon` 的映射，而是使用 `deviceType` 到 `icon` 的映射。
- `电池装置` -> `Battery`
- `推进系统` -> `Fan`
- `逆变器系统` -> `Zap`
- `配电系统` -> `Power`
- `辅助系统` -> `Activity` (或类似)

### 3. 历史记录筛选实现
`HealthReportsList` 将包含一个筛选栏。
- **设备选择器**：根据之前获取的设备列表填充下拉菜单。
- **日期选择器**：`startDate` 和 `endDate` 字段对应 API 的 `startTime` 和 `endTime`（毫秒时间戳）。

### 4. 移除 WebSocket
将移除 `reports-store` 和 `HealthAssessmentPage` 中所有的 `realtime-service` 订阅。删除“实时连接状态”UI 元素。

## 风险 / 权衡
- **性能**：单独获取多个设备（8个以上）的健康分数可能会涉及多次 HTTP 请求。
- **缓解措施**：使用 `Promise.all` 进行并行获取。确保报告列表的分页是高效的。

## 待办问题
- 是否仍应计算“全船总分”？如果是，它是否是 8 个动态系统的平均值？
- *假设*：是的，它将是 `systemHealthScores` 中可用最新分数的简单平均值。
