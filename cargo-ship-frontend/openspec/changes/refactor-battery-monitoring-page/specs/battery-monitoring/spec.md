## ADDED Requirements

### Requirement: 电池监控页面组件
The system SHALL provide a fully refactored battery monitoring page component (`BatteryMonitoringPage`) as the standard implementation of the device monitoring page template.
系统必须提供一个完全重构的电池监控页面组件 (`BatteryMonitoringPage`)，作为设备监控页模板的标准实现。

#### Scenario: 页面加载时自动订阅设备数据
- **GIVEN** 用户导航到电池监控页面 (`/monitoring/battery`)
- **WHEN** 页面组件挂载（mounted）
- **THEN** 系统必须自动调用 `realtimeService.subscribeToEquipment('SYS-BAT-001')` 订阅电池系统的实时数据
- **AND** 系统必须显示连接状态指示器
- **AND** 系统必须显示加载状态（如骨架屏）

#### Scenario: 页面卸载时自动取消订阅
- **GIVEN** 用户正在查看电池监控页面
- **WHEN** 用户离开页面（导航到其他页面或关闭标签页）
- **THEN** 系统必须自动调用 `realtimeService.unsubscribeFromEquipment('SYS-BAT-001')` 取消订阅
- **AND** 系统必须释放相关资源，避免内存泄漏

#### Scenario: 显示完整的页面布局
- **GIVEN** 用户正在查看电池监控页面
- **AND** WebSocket 连接已建立
- **WHEN** 实时数据到达
- **THEN** 系统必须在页面顶部显示"监控墙"（所有监测点的网格布局）
- **AND** 系统必须在页面底部显示"专属告警区"（仅与电池系统相关的告警列表）
- **AND** 系统必须显示页面标题和面包屑导航

### Requirement: 监控墙组件
The system SHALL provide a monitoring wall component (`MonitoringWall`) that displays all monitoring points of the battery system in a responsive grid layout.
系统必须提供一个监控墙组件 (`MonitoringWall`)，以响应式网格布局展示电池系统的所有监测点。

#### Scenario: 响应式网格布局
- **GIVEN** 监控墙组件已加载
- **WHEN** 用户在不同屏幕尺寸的设备上查看
- **THEN** 系统必须在桌面端（≥1024px）显示 4 列网格
- **AND** 系统必须在平板端（768px - 1023px）显示 2 列网格
- **AND** 系统必须在手机端（<768px）显示 1 列网格

#### Scenario: 从 monitoring-store 获取实时数据
- **GIVEN** 监控墙组件已加载
- **WHEN** `monitoring-store` 接收到新的监测数据
- **THEN** 系统必须自动更新对应的 `MetricCard` 组件
- **AND** 系统必须显示平滑的数值变化动画
- **AND** 系统不得重新渲染未变化的 `MetricCard`（性能优化）

#### Scenario: 渲染所有监测点的 MetricCard
- **GIVEN** 监控墙组件已加载
- **AND** 电池系统有多个监测点（如总电压、SOC、温度、电流等）
- **WHEN** 系统获取到监测点列表
- **THEN** 系统必须为每个监测点渲染一个 `MetricCard` 组件
- **AND** 每个 `MetricCard` 必须显示正确的监测点 ID、标签、数值、单位
- **AND** 每个 `MetricCard` 必须根据数据质量显示对应的状态（normal/warning/critical）

#### Scenario: 处理加载状态
- **GIVEN** 监控墙组件已加载
- **WHEN** 数据尚未到达（loading 状态）
- **THEN** 系统必须显示骨架屏或加载指示器
- **AND** 系统不得显示空白内容

#### Scenario: 处理错误状态
- **GIVEN** 监控墙组件已加载
- **WHEN** `monitoring-store` 的 `error` 状态不为空
- **THEN** 系统必须显示友好的错误提示信息
- **AND** 系统必须提供"重试"或"重新连接"按钮

### Requirement: 专属告警区组件
The system SHALL provide a dedicated alarm zone component (`DedicatedAlarmZone`) that displays only alarms related to the battery system.
系统必须提供一个专属告警区组件 (`DedicatedAlarmZone`)，仅展示与电池系统相关的告警列表。

#### Scenario: 从 alarms-store 获取告警数据
- **GIVEN** 专属告警区组件已加载
- **WHEN** `alarms-store` 接收到新的告警数据
- **THEN** 系统必须自动更新告警列表
- **AND** 系统必须实时响应 `alarm:push` 事件
- **AND** 系统必须显示新告警的动画效果（如淡入）

#### Scenario: 仅显示与电池系统相关的告警
- **GIVEN** 专属告警区组件已加载
- **AND** `alarms-store` 中包含多个设备的告警
- **WHEN** 系统渲染告警列表
- **THEN** 系统必须仅显示 `equipmentId === 'SYS-BAT-001'` 的告警
- **AND** 系统不得显示其他设备的告警

#### Scenario: 显示告警的关键信息
- **GIVEN** 专属告警区组件已加载
- **AND** 存在电池系统的告警
- **WHEN** 系统渲染告警列表
- **THEN** 系统必须显示每条告警的：严重程度（severity）、消息（message）、触发时间（triggeredAt）、状态（status）
- **AND** 系统必须根据严重程度显示不同的颜色（如 critical 为红色，warning 为黄色）

#### Scenario: 限制显示的告警数量
- **GIVEN** 专属告警区组件已加载
- **AND** 电池系统有超过 20 条告警
- **WHEN** 系统渲染告警列表
- **THEN** 系统必须仅显示最近 20 条告警
- **AND** 系统必须提供"查看全部"链接，跳转到告警中心页面

#### Scenario: 处理空告警状态
- **GIVEN** 专属告警区组件已加载
- **WHEN** 电池系统没有任何告警
- **THEN** 系统必须显示友好的空状态提示（如"暂无告警"）
- **AND** 系统不得显示空白内容或错误信息

### Requirement: 设备监控页模板复用性
The system SHALL ensure that the component structure of the battery monitoring page is reusable for other device monitoring pages (such as propulsion system, inverter, etc.).
系统必须确保电池监控页面的组件结构可复用到其他设备监控页面（如推进系统、逆变器等）。

#### Scenario: 组件拆分清晰
- **GIVEN** 开发者需要创建新的设备监控页面（如推进系统监控页）
- **WHEN** 开发者参考电池监控页面的实现
- **THEN** 开发者必须能够清晰识别三个独立组件：`BatteryMonitoringPage`（页面容器）、`MonitoringWall`（监控墙）、`DedicatedAlarmZone`（告警区）
- **AND** 开发者必须能够复用 `MonitoringWall` 和 `DedicatedAlarmZone` 组件，仅修改设备 ID

#### Scenario: 文档说明复用步骤
- **GIVEN** 开发者需要复用设备监控页模板
- **WHEN** 开发者查阅项目文档
- **THEN** 文档必须明确说明以下步骤：
  1. 复制 `BatteryMonitoringPage.tsx` 并重命名
  2. 修改设备 ID（如 `SYS-BAT-001` → `SYS-PROP-L-001`）
  3. 修改页面标题和路由
  4. 确认监测点列表
  5. 测试订阅和数据流

### Requirement: 性能优化
The system SHALL ensure that the battery monitoring page maintains smooth performance under high-frequency data update scenarios.
系统必须确保电池监控页面在高频数据更新场景下保持流畅性能。

#### Scenario: 避免不必要的重渲染
- **GIVEN** 监控墙有 20+ 个 `MetricCard` 组件
- **WHEN** 其中一个监测点的数据更新
- **THEN** 系统必须仅重新渲染该 `MetricCard` 组件
- **AND** 系统不得重新渲染其他未变化的 `MetricCard` 组件
- **AND** 系统必须使用 `React.memo` 或 Zustand Selectors 实现优化

#### Scenario: 批量更新机制
- **GIVEN** 监控墙组件已加载
- **WHEN** 短时间内接收到多条监测数据（如 100 条/秒）
- **THEN** 系统必须使用 `monitoring-store` 的批量更新机制（每秒批量处理一次）
- **AND** 系统不得在每条数据到达时立即更新 UI（避免性能问题）

### Requirement: 错误处理与用户反馈
The system SHALL provide friendly error handling and user feedback mechanisms on the battery monitoring page.
系统必须在电池监控页面提供友好的错误处理和用户反馈机制。

#### Scenario: WebSocket 连接失败
- **GIVEN** 用户正在查看电池监控页面
- **WHEN** WebSocket 连接失败或断开
- **THEN** 系统必须显示连接状态指示器（如"连接中断"）
- **AND** 系统必须提供"重新连接"按钮
- **AND** 系统必须在重连成功后自动恢复数据订阅

#### Scenario: 数据获取失败
- **GIVEN** 用户正在查看电池监控页面
- **WHEN** `monitoring-store` 或 `alarms-store` 返回错误
- **THEN** 系统必须显示友好的错误提示（使用 Toast 或内联提示）
- **AND** 系统必须记录错误日志（console.error）
- **AND** 系统不得显示技术性错误信息（如堆栈跟踪）

#### Scenario: 显示连接状态
- **GIVEN** 用户正在查看电池监控页面
- **WHEN** 页面渲染
- **THEN** 系统必须在页面顶部显示连接状态指示器（使用现有的 `ConnectionStatusIndicator` 组件）
- **AND** 系统必须根据 WebSocket 连接状态显示不同颜色（绿色 = 已连接，黄色 = 连接中，红色 = 已断开）
