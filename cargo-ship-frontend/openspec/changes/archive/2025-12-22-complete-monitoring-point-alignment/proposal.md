# 提案: 补完监测点全对齐 (Complete Monitoring Point Alignment)

## Why
目前系统在 `docs/data/monitoring_point_definition.md` 文档、`scripts/realtime-simulator.js` 模拟器和 `src/components/monitoring/MonitoringWall.tsx` 前端组件三者之间存在严重的监测点数据不一致。这导致监控页面缺失关键指标（如故障布尔量、部分负载参数等），破坏了“单一真理源”原则，影响了系统的监控完整性和安全性。

## What Changes
- **同步模拟器 (scripts/realtime-simulator.js)**: 将 8 个系统的监测点定义补全至文档规定的全部 82 个。
- **同步前端配置 (src/components/monitoring/MonitoringWall.tsx)**: 在各系统的配置数组中增加缺失的监测点。
- **左/右推进系统对齐**: 确保左推进系统和右推进系统的监测点配置完全镜像（各 14 个）。
- **增加布尔量支持**: 确保页面能正确展示新加入的故障状态和开关量指标。

## Impact
- **受影响 Spec**: `monitoring-contract` (修改)
- **受影响代码**:
  - `scripts/realtime-simulator.js` (模拟定义)
  - `src/components/monitoring/MonitoringWall.tsx` (展示列表)
