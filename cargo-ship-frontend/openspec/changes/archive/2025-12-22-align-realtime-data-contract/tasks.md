# 任务清单: 统一实时数据契约与驾控台重构

## 1. 数据契约与模拟器对齐
- [x] 1.1 系统化配置模拟器 (realtime-simulator.js)，基于标准文档定义 8 个系统的监测点。
- [x] 1.2 在模拟器中实现标准的中文名输出字段。
- [x] 1.3 为模拟器添加基于阈值的自动告警逻辑（针对核心指标）。

## 2. 状态管理层适配
- [x] 2.1 修改 `monitoring-store.ts`，将数据存储的索引键对齐为 `${equipmentId}-${monitoringPoint}`。
- [x] 2.2 增强 `alarms-store.ts` 的 `mapPayloadToAlarm`，确保推送的告警自动解析出标准中文字段。

## 3. UI 映射与子页面修复
- [x] 3.1 更新 `icon-mapping.ts`，将所有映射键替换为标准中文。
- [x] 3.2 批量更新所有监控子页面的 `MonitoringWall` 配置（电池、推进、逆变器、配电、辅助）。
- [x] 3.3 验证子页面能够从新格式的 Store 索引中正确提取数值。

## 4. 驾控台 (Dashboard) 深度重构
- [x] 4.1 开发 `SystemStatusCard` 组件，展示状态、告警等级和核心开关量。
- [x] 4.2 开发 `SystemsStatusGrid` 容器，整合 8 个核心系统的状态显示。
- [x] 4.3 在 `DashboardPage` 中替换 `CriticalMetricsWall`，调整页面布局。
- [x] 4.4 提升 `AlarmSummaryWidget` 位置，实现实时告警置顶。

## 5. 验证与回归
- [x] 5.1 启动模拟器并观察全船 8 个系统在首页的健康矩阵表现。
- [x] 5.2 触发模拟故障，验证首页、告警中心、详情页的三级联动变色。
