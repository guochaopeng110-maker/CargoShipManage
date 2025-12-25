# Change: 优化实时数据总线架构与告警中心历史查询

## Why
当前系统存在页面卸载时错误重置全局连接状态导致 TopBar 误报，以及驾控台订阅机制缺失导致数据冻结的问题。同时，告警查历史筛选维度过于复杂且设备列表为硬编码。

## What Changes
- **全局订阅管理**：重构 `monitoring-store` 和 `alarms-store`，实现多页面共享的长连接订阅逻辑。
- **动态设备加载**：从后端 API 动态获取 8 个核心系统设备 ID。
- **告警查询精简化**：移除告警等级和状态的 UI 筛选，改为纯粹的设备+时间回溯。
- **分页查询支持**：实现全链路的 HTTP 分页告警查询。
- **实时数据模拟器**：开发一个基于 Socket.IO 的模拟程序，用于验证前端数据流与 UI 响应的正确性。

## Impact
- Affected specs: `realtime-bus`, `historical-alarm-query`
- Affected code: `App.tsx`, `monitoring-store.ts`, `alarms-store.ts`, `AlarmFilters.tsx`, `DashboardPage.tsx`, `scripts/realtime-simulator.js`
