# Tasks: 实施实时数据总线与告警查询优化

## 阶段 1: 实时数据总线架构实施

- [x] 修订 `monitoring-store.ts` 和 `alarms-store.ts`，防止 `cleanup` 重置全局连接状态
- [x] 在 `AuthenticatedApp` (`App.tsx`) 中实现核心设备 ID 的动态加载与全局订阅逻辑
- [x] 移除 `PropulsionMonitoringPage` 等 5 个页面的本地订阅与清理逻辑
- [x] 验证 Dashboard 在切换页面后数据依然实时更新
- [x] 验证 TopBar 连接指示器在页面切换时保持常亮

## 阶段 2: 告警中心历史查询重构

- [x] 修改 `AlarmFilters.tsx` 布局，对接 `EquipmentStore` 加载真实设备列表
- [x] 移除 `AlarmFilters.tsx` 中的等级与状态筛选 UI 及相关状态变量
- [x] 调整 `HistoricalAlarmsView.tsx`，确保其请求参数仅包含设备、时间及分页信息
- [x] 校验分页组件与表格翻页功能的准确性
- [x] 优化 `AlarmCenterPage` 整体 CSS，对齐“数据查询页面”的玻璃渐变感风格

## 阶段 3: 回归测试与清理

- [x] 全量验证 WebSocket 重连机制下的自动订阅恢复
- [x] 测试多设备告警过滤逻辑的正确性
- [x] 清理 `realtime-service` 中不再使用的旧版逐页订阅接口 (如有)

## 阶段 4: 实时模拟验证工具 (Simulator)

- [x] 创建 `scripts/realtime-simulator.js` 脚本，实现基于 Socket.IO 的数据推送逻辑
- [x] 定义核心设备的模拟数据生成规则（8个系统的 SOC、转速、电压等）
- [x] 验证模拟器对 `subscribe:equipment` 协议的响应准确性
- [x] 配合模拟器，进行全链路的监控页面数据连贯性测试（Dashboard <-> 专页切换）
