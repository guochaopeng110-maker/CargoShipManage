# 变更：健康评估重构为动态设备驱动（纯 HTTP 模式）

## 为什么进行此变更
业务需求已从实时健康评估转向更稳定的、以历史数据为驱动的模型。目前的实现依赖于硬编码的系统配置和 WebSocket 订阅，这与“动态列出设备管理模块中的所有设备”以及“提供强大的历史查询能力”的要求不符。

## 变更内容
- **移除实时评估**：彻底剥离健康评估页面中的 WebSocket 逻辑（`realtimeService`）和实时状态指示器。
- **采集动态设备列表**：直接从设备管理 API（`Service.equipmentControllerFindAll`）加载系统/设备列表，替代静态配置。
- **独立获取评估分数**：为每个设备分别调用 `Service.reportControllerFindAll`（pageSize: 1）来获取最新的健康报告和分数。
- **增强历史查询**：更新历史报告列表以支持多维度筛选：
    - 设备 ID（通过下拉选择器）
    - 设备名称（搜索）
    - 日期范围（开始/结束时间）
- **API 对齐**：确保所有交互严格遵循后端生成的 `Service` 客户端方法。

## 影响范围
- **受影响的规格**：`health-assessment`（新增或更新能力）
- **受影响的代码**：
    - `src/stores/reports-store.ts`（状态和 Actions 重构）
    - `src/components/HealthAssessmentPage.tsx`（UI 逻辑和数据编排）
    - `src/components/HealthAssessmentPage/HealthReportsList.tsx`（筛选 UI）
    - `src/config/core-systems.ts`（简化为纯视觉元数据/图标映射）
