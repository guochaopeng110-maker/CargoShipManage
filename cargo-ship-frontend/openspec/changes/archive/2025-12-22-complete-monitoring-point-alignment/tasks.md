# 任务清单: 补完监测点全对齐

## 1. 模拟器补全
- [x] 1.1 更新 `realtime-simulator.js` 中的电池系统定义（补足至 18 个点）。
- [x] 1.2 更新 `realtime-simulator.js` 中的左/右推进系统定义（各 14 个点，确保镜像）。
- [x] 1.3 更新 `realtime-simulator.js` 中的 1#/2# 逆变器定义（各 9 个点）。
- [x] 1.4 更新 `realtime-simulator.js` 中的直流配电板定义（补足至 9 个点）。
- [x] 1.5 更新 `realtime-simulator.js` 中的冷却水系统定义（补足至 5 个点）。

## 2. 前端配置补全
- [x] 2.1 更新 `MonitoringWall.tsx` 中的 `BATTERY_POINTS`（电池 18 个点）。
- [x] 2.2 更新 `MonitoringWall.tsx` 中的 `PROPULSION_LEFT_POINTS` / `PROPULSION_RIGHT_POINTS`（各 14 个点）。
- [x] 2.3 更新 `MonitoringWall.tsx` 中的 `INVERTER_1_POINTS` / `INVERTER_2_POINTS`（各 9 个点）。
- [x] 2.4 更新 `MonitoringWall.tsx` 中的 `DCPD_POINTS`（配电板 9 个点）。
- [x] 2.5 更新 `MonitoringWall.tsx` 中的 `COOL_POINTS`（冷却水 5 个点）。

## 3. 验证
- [x] 3.1 启动模拟器并访问各监控子页面，确认所有 82 个监测点均有数据展示。
- [x] 3.2 验证布尔量指标在 `MetricCard` 中的显示状态是否正常。
