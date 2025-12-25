# Change: 将监控墙模板应用到核心监控页面

## Why

根据前端重构方案第四阶段计划，`BatteryMonitoringPage` 作为第三阶段试点已成功验证"监控墙"架构的有效性。为保持用户体验一致性并提高开发效率，需要将这一成熟模式推广到推进系统、逆变器、配电系统和辅助系统四个核心监控页面。

## What Changes

- 重构 `PropulsionMonitoringPage`（推进系统）为监控墙模式
  - 替换旧的手工卡片布局为 `MonitoringWall` 组件
  - 集成 `DedicatedAlarmZone` 专属告警区
  - 为双推进电机所有监测点配置动态图标和动画
  - 与 realtime-service 集成实现实时数据流

- 重构 `InverterMonitoringPage`（逆变器系统）为监控墙模式
  - 替换旧的手工卡片布局为 `MonitoringWall` 组件
  - 集成 `DedicatedAlarmZone` 专属告警区
  - 为双逆变器所有监测点配置动态图标和动画
  - 与 realtime-service 集成实现实时数据流

- 重构 `PowerDistributionPage`（配电系统）为监控墙模式
  - 替换旧的表格和卡片布局为 `MonitoringWall` 组件
  - 集成 `DedicatedAlarmZone` 专属告警区
  - 为配电系统所有监测点配置动态图标和动画
  - 与 realtime-service 集成实现实时数据流

- 重构 `AuxiliaryMonitoringPage`（辅助系统）为监控墙模式
  - 替换旧的手工卡片布局为 `MonitoringWall` 组件
  - 集成 `DedicatedAlarmZone` 专属告警区
  - 为辅助系统所有监测点配置动态图标和动画
  - 与 realtime-service 集成实现实时数据流

- 为各系统定义监测点配置
  - 推进系统：左右电机电压、转速、温度、频率、逆变器电压、效率
  - 逆变器系统：双逆变器直流电压、输出电流、电抗器温度、负载率、转换效率
  - 配电系统：主配电板参数、发电机状态、负载分配、岸电状态
  - 辅助系统：舱底水井水位、冷却水泵状态和温度、冷却水压力

- 完善图标系统
  - 审查现有图标映射
  - 为新监测点类型创建图标映射
  - 确保所有图标具有动画效果

## Impact

### 受影响的规范
- **新增**: `monitoring-page-template` - 定义监控页面统一模板标准

### 受影响的代码
- **修改**: `src/components/PropulsionMonitoringPage.tsx` - 完全重构
- **修改**: `src/components/InverterMonitoringPage.tsx` - 完全重构
- **修改**: `src/components/PowerDistributionPage.tsx` - 完全重构
- **修改**: `src/components/AuxiliaryMonitoringPage.tsx` - 完全重构
- **可能修改**: `src/components/monitoring/MonitoringWall.tsx` - 添加新系统的监测点配置
- **可能修改**: `src/components/visualization/icons/icon-mapping.ts` - 添加新的图标映射

### 前置依赖
- `build-animated-visualization-components` (已完成)
- `refactor-battery-monitoring-page` (部分完成，21/29 任务)

### 用户影响
- 所有监控页面将具有统一的视觉语言和交互模式
- 用户可以在不同系统间获得一致的使用体验
- 实时数据更新更加流畅和可靠

### 开发者影响
- 建立明确的监控页面模板，未来添加新页面更简单
- 最大化组件复用，减少代码重复
- 更易于维护和扩展
