# 提案: 统一实时数据契约与驾控台功能重构 (Align Real-time Data Contract & Dashboard Refactor)

## Why
目前系统在实时数据流向、存储索引和 UI 呈现上存在三方契约不一致的问题。模拟器发送的 ID、文档定义的标准中文名、以及前端组件使用的 Key 互不对应，导致数据无法正确显示且存在同类型指标覆盖的风险。同时，驾控台（Dashboard）目前过于关注细碎指标，缺乏对全船系统整体运行状态的宏观监控。

## What Changes
- **统一数据契约**: 移除所有自定义 ID 映射，全链路（模拟器 -> Store -> UI）改用 `docs/data` 定义的标准中文监测点名称作为唯一标识符。
- **重构模拟器 (realtime-simulator.js)**: 
  - 对齐 8 个核心系统的监测点中文名称。
  - 实现基于标准的动态数据生成与实时告警触发。
- **更新监控 Store (monitoring-store.ts)**: 
  - 数据索引 Key 由 `${equipmentId}-${metricType}` 变更为 **`${equipmentId}-${monitoringPoint}`**，支持中文键名。
- **重构驾控台 (DashboardPage)**:
  - 移除 `CriticalMetricsWall` (具体指标展示)。
  - 新增 **系统状态矩阵 (SystemsStatusGrid)**，展示 8 个系统的连接、告警、开关状态。
  - 增强实时告警摘要置顶显示。
- **UI 配置同步与修正**: 
  - 更新 `MonitoringWall.tsx` 的监测点配置数组及查找逻辑。
  - 更新 `icon-mapping.ts` 的映射 Key 为标准中文。

## Impact
- **受影响 Spec**: `realtime-bus` (修改), `monitoring-contract` (新增), `dashboard-restyle` (新增)
- **受影响代码**:
  - `scripts/realtime-simulator.js` (模拟逻辑)
  - `src/stores/monitoring-store.ts` (核心数据结构)
  - `src/components/monitoring/MonitoringWall.tsx` (子页面展示)
  - `src/components/widgets/CriticalMetricsWall.tsx` (弃用或深度重构)
  - `src/components/visualization/icons/icon-mapping.ts` (配置)
  - `src/components/DashboardPage.tsx` (及相关 Widget)
