# Change: 重构电池监控页面 - 架构练兵场

## Why

作为新架构的第一个"练兵场"，需要将第一阶段（数据层）和第二阶段（可视化组件）的成果集成到一个完全重构的、功能完备的监控页面中。此页面的成功实现将为所有其他设备监控页面（如推进系统、逆变器等）确立一个明确的、可复制的模板，验证新架构的有效性。

当前问题：
- 旧的监控页面布局复杂（统一监控图表区、详细参数列表区），焦点不突出
- 数据层和可视化组件已就绪，但缺少完整的页面级集成案例
- 需要一个标准的、可复制的设备监控页模板供其他页面参考

## What Changes

### 1. 布局重定义
- **顶部区域 - "监控墙" (Monitoring Wall)**:
  - 响应式网格布局，完整展示电池系统 (`SYS-BAT-001`) 的所有监测点指标
  - 每个监测点使用 `MetricCard` 组件渲染
  - 集成动画图标、实时数值和单位

- **移除中部区域**:
  - 移除旧设计中的"统一监控图表区"和"详细参数列表区"
  - 使页面布局更简洁、焦点更突出

- **底部区域 - "专属告警区" (Dedicated Alarm Zone)**:
  - 仅展示与电池系统相关的告警列表
  - 告警数据来自 `alarms-store`
  - 实时响应 `alarm:push` 事件

### 2. 数据流与交互
- **订阅生命周期管理**:
  - 组件挂载时调用 `realtimeService.subscribeToEquipment('SYS-BAT-001')`
  - 组件卸载时调用 `realtimeService.unsubscribeFromEquipment('SYS-BAT-001')`

- **状态消费**:
  - 监控墙的 `MetricCard` 从 `monitoring-store` 获取数据
  - 专属告警区从 `alarms-store` 获取数据

- **单一真理源原则**:
  - 页面组件是"哑"组件，完全通过 Zustand stores 驱动渲染
  - 不包含数据获取或订阅管理的复杂逻辑

### 3. 文件变更
- 新增文件：
  - `src/components/BatteryMonitoringPage.tsx` - 电池监控页面组件
  - `src/components/monitoring/MonitoringWall.tsx` - 监控墙组件（网格布局）
  - `src/components/monitoring/DedicatedAlarmZone.tsx` - 专属告警区组件

## Impact

### 受影响的能力（Specs）
- 新增能力：`battery-monitoring`（电池监控页面）
- 相关现有能力（不修改）：
  - `monitoring-store`（监测数据状态管理）
  - `alarms-store`（告警状态管理）
  - `realtime-service`（实时数据服务）
  - 可视化组件（`MetricCard`）

### 受影响的代码
- 新增：`src/components/BatteryMonitoringPage.tsx`
- 新增：`src/components/monitoring/MonitoringWall.tsx`
- 新增：`src/components/monitoring/DedicatedAlarmZone.tsx`
- 可能修改：路由配置（添加新页面路由）

### 预期成果
- 一个完全重构并可实际运行的 `BatteryMonitoringPage.tsx`
- "监控墙"概念被成功实现，展示实时数据流驱动的动画可视化组件
- React 组件中的订阅/取消订阅生命周期管理模式得到验证
- 一个清晰的、可复用的"设备监控页模板"被确立，为第四阶段全面推广铺平道路
