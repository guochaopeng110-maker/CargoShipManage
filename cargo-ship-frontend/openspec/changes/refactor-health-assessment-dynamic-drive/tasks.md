# 任务清单：重构健康评估

## 1. 领域模型与 Store 重构
- [x] 1.1 更新 `reports-store.ts`，移除 `initSubscription` 和 `handleRealtimeHealthUpdate`（如有）。
- [x] 1.2 修改 `reports-store.ts` 中的 `fetchSystemHealthScores`：
    - 接收 `Equipment` 对象数组。
    - 循环并获取每个设备的最新报告。
    - 正确从设备对象中映射 `deviceName`。
- [x] 1.3 更新 `reports-store.ts` 中的 `fetchReports` 以支持增强的过滤器：`equipmentId`、`startDate`、`endDate`。
- [x] 1.4 确保从 `PaginatedResponseDto` 到前端数据的映射健壮且与后端一致。

## 2. 组件重构（基础架构）
- [x] 2.1 更新 `src/config/core-systems.ts` 以提供从 `deviceType` 到 `LucideIcon` 的映射函数。
- [x] 2.2 清理 `core-systems.ts` 中不再使用的任何硬编码 `deviceId` 引用。

## 3. UI 重构 (HealthAssessmentPage)
- [x] 3.1 移除 `HealthAssessmentPage.tsx` 中的 `useAlarmsStore` 和 `realtimeConnected` 逻辑。
- [x] 3.2 更新 `useEffect`，先调用 `fetchEquipmentList`，然后触发健康分数获取。
- [x] 3.3 将 5 个系统的静态映射替换为对 `equipmentStore.items` 的动态 `.map()`。
- [x] 3.4 移除“实时连接断开”警告卡片。

## 4. 报告列表与筛选
- [x] 4.1 在 `HealthReportsList.tsx` 中实现 `FilterBar`（筛选栏）。
- [x] 4.2 添加由 `equipmentStore.items` 驱动的 `DeviceSelector`（设备选择器）下拉菜单。
- [x] 4.3 添加日期范围输入控件。
- [x] 4.4 将“搜索/筛选”按钮与带有新参数的 `fetchReports` 方法关联。

## 5. 验证
- [x] 5.1 验证是否根据数据库正确显示 8 个以上的系统卡片。
- [x] 5.2 验证点击“筛选”是否通过 HTTP API 正确更新历史表格。
- [x] 5.3 验证此页面上不再出现 WebSocket 错误或连接警告。
