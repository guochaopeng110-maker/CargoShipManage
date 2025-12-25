# 能力：监控页面统一模板 (Monitoring Page Template)

## 概述
本规范定义了货船智能机舱管理系统中所有设备监控页面的统一模板结构、布局模式和数据流架构。

## ADDED Requirements

### Requirement: Monitoring pages MUST adopt the three-tier standard layout (监控页面必须采用三段式标准布局)

所有设备监控页面（包括推进系统、逆变器、配电系统、辅助系统）MUST 遵循统一的三段式布局结构。

#### Scenario: 用户访问推进系统监控页面
**Given** 用户已登录系统并导航到推进系统监控页面
**When** 页面加载完成
**Then** 页面应显示以下三个区域：
- 顶部区域：包含页面标题、面包屑导航、实时连接状态指示器
- 中部区域：监控墙 (MonitoringWall)，以响应式网格展示所有监测点
- 底部区域：专属告警区 (DedicatedAlarmZone)，仅显示推进系统相关告警

#### Scenario: 用户访问逆变器系统监控页面
**Given** 用户已登录系统并导航到逆变器系统监控页面
**When** 页面加载完成
**Then** 页面应显示相同的三段式布局：
- 顶部区域：页面标题、面包屑、连接状态
- 中部区域：双逆变器所有监测点的监控墙
- 底部区域：逆变器系统专属告警区

#### Scenario: 用户在移动设备上访问监控页面
**Given** 用户在移动设备（屏幕宽度 < 768px）上访问任一监控页面
**When** 页面加载完成
**Then** 三段式布局应响应式调整：
- 监控墙采用单列布局
- 所有内容垂直堆叠
- 保持内容的可读性和可操作性

---

### Requirement: Monitoring wall MUST integrate MonitoringWall component to display all metrics (监控墙必须集成 MonitoringWall 组件展示所有监测点)

监控页面的中部区域 MUST 使用 `MonitoringWall` 组件，以响应式网格方式展示设备的所有关键监测点。

#### Scenario: 推进系统监控墙展示双电机监测点
**Given** 用户访问推进系统监控页面
**When** 页面加载并订阅推进系统数据
**Then** 监控墙应展示以下监测点：
- 左推进电机：电压、转速、温度、频率、逆变器电压、效率
- 右推进电机：电压、转速、温度、频率、逆变器电压、效率
- 每个监测点使用 `MetricCard` 组件渲染
- 监测点按系统分组，采用 4 列网格布局（桌面端）

#### Scenario: 逆变器系统监控墙展示双逆变器监测点
**Given** 用户访问逆变器系统监控页面
**When** 页面加载并订阅逆变器数据
**Then** 监控墙应展示以下监测点：
- 1# 逆变器：直流电压高、直流电压低、输出电流、电抗器温度、负载率、转换效率
- 2# 逆变器：直流电压高、直流电压低、输出电流、电抗器温度、负载率、转换效率
- 每个监测点使用 `MetricCard` 组件并集成动态图标

#### Scenario: 配电系统监控墙展示配电监测点
**Given** 用户访问配电系统监控页面
**When** 页面加载并订阅配电系统数据
**Then** 监控墙应展示以下监测点：
- 主配电板：电压、电流、功率、频率
- 发电机组：1# 发电机功率和状态、2# 发电机功率和状态
- 负载分配：推进系统负载、辅助系统负载、岸电接入状态

#### Scenario: 辅助系统监控墙展示辅助设备监测点
**Given** 用户访问辅助系统监控页面
**When** 页面加载并订阅辅助系统数据
**Then** 监控墙应展示以下监测点：
- 舱底水系统：1# 集水井水位、2# 集水井水位、3# 集水井水位、4# 集水井水位
- 冷却水泵系统：1# 冷却水泵电源状态和水温、2# 冷却水泵电源状态和水温、冷却水压力

---

### Requirement: Each metric card MUST integrate dynamic SVG icons and animation effects (每个监测点卡片必须集成动态 SVG 图标和动画效果)

所有监测点使用的 `MetricCard` 组件 MUST 集成与指标类型语义匹配的动态 SVG 图标，并具有流畅的动画效果。

#### Scenario: 电压监测点显示闪电图标和脉冲动画
**Given** 用户查看任一系统的电压监测点
**When** 监测点卡片渲染
**Then** 卡片应显示：
- 闪电形状的 SVG 图标（Zap icon）
- 图标具有脉冲动画效果 (`animate-icon-pulse`)
- 数值以大号字体显示，带单位 "V"
- 根据阈值显示状态徽章（正常/偏高/偏低）

#### Scenario: 温度监测点显示温度计图标和发光动画
**Given** 用户查看任一系统的温度监测点
**When** 监测点卡片渲染
**Then** 卡片应显示：
- 温度计形状的 SVG 图标（Thermometer icon）
- 图标具有发光动画效果 (`animate-icon-glow`)
- 数值以大号字体显示，带单位 "°C"
- 根据阈值显示状态徽章（正常/偏高/过热）

#### Scenario: 转速监测点显示旋转图标和旋转动画
**Given** 用户查看推进系统的转速监测点
**When** 监测点卡片渲染
**Then** 卡片应显示：
- 旋转箭头形状的 SVG 图标（RotateCw icon）
- 图标具有缓慢旋转动画效果 (`animate-slow-spin`)
- 数值以大号字体显示，带单位 "RPM"
- 根据阈值显示状态徽章（正常/高速）

---

### Requirement: Monitoring pages MUST properly manage real-time data subscription lifecycle (监控页面必须正确管理实时数据订阅生命周期)

监控页面 MUST 在组件挂载时订阅设备数据，在卸载时取消订阅，确保资源的正确管理。

#### Scenario: 推进系统页面订阅双电机数据
**Given** 用户导航到推进系统监控页面
**When** 页面组件挂载 (`useEffect` 执行)
**Then** 页面应执行以下操作：
- 建立 WebSocket 连接（如果尚未连接）
- 初始化 `monitoring-store` 和 `alarms-store`
- 订阅左推进电机数据 (`MOTOR-L-001`)
- 订阅右推进电机数据 (`MOTOR-R-001`)
- 显示"正在初始化监控系统..."加载状态

**And When** 订阅成功
**Then** 页面应：
- 显示连接状态指示器为"已连接"（绿色）
- 监控墙开始展示实时数据
- 告警区开始接收推进系统告警

**And When** 用户离开页面（组件卸载）
**Then** 页面应执行清理操作：
- 取消订阅左推进电机数据
- 取消订阅右推进电机数据
- 清理事件监听器
- 记录清理完成日志

#### Scenario: 逆变器系统页面订阅双逆变器数据
**Given** 用户导航到逆变器系统监控页面
**When** 页面组件挂载
**Then** 页面应订阅：
- 1# 逆变器数据 (`INV-L-001`)
- 2# 逆变器数据 (`INV-R-001`)

**And When** 用户离开页面
**Then** 页面应取消所有订阅并清理资源

#### Scenario: WebSocket 连接中断时显示断连状态
**Given** 用户正在查看任一监控页面且 WebSocket 已连接
**When** WebSocket 连接中断（网络问题或服务器重启）
**Then** 页面应：
- 将连接状态指示器更新为"连接中断"（红色）
- 保持最后接收的数据显示
- 自动尝试重新连接
- 记录错误日志

---

### Requirement: Dedicated alarm zone MUST display only current system related alarms (专属告警区必须仅展示当前系统相关的告警)

每个监控页面的底部告警区 MUST 使用 `DedicatedAlarmZone` 组件，根据设备 ID 过滤并仅显示当前系统的告警。

#### Scenario: 推进系统页面仅显示推进系统告警
**Given** 用户访问推进系统监控页面
**And** 系统中存在以下告警：
- 推进系统：左电机温度过高 (MOTOR-L-001)
- 电池系统：电池组电压偏低 (SYS-BAT-001)
- 逆变器系统：1# 逆变器过载 (INV-L-001)

**When** 专属告警区加载
**Then** 告警区应：
- 仅显示推进系统告警（左电机温度过高）
- 不显示电池系统和逆变器系统的告警
- 告警按时间倒序排列（最新在前）
- 最多显示 20 条告警

#### Scenario: 配电系统页面仅显示配电系统告警
**Given** 用户访问配电系统监控页面
**And** 系统中存在多个系统的告警
**When** 专属告警区加载
**Then** 告警区应：
- 仅显示配电系统相关告警（根据 `SYS-PWR-001` 设备 ID 过滤）
- 实时更新告警状态（活动/已解决）
- 提供"查看全部告警"链接跳转到告警中心

#### Scenario: 告警实时推送到专属告警区
**Given** 用户正在查看逆变器系统监控页面
**When** WebSocket 推送新的逆变器告警 (alarm:push 事件)
**Then** 专属告警区应：
- 立即在列表顶部插入新告警
- 显示告警动画效果（淡入）
- 根据告警严重程度显示对应颜色（低/中/高/紧急）
- 如果告警列表已满，移除最旧的告警

---

### Requirement: All monitoring pages MUST reuse core visualization components (所有监控页面必须复用核心可视化组件)

为确保一致性和可维护性，所有监控页面 MUST 复用第二、三阶段开发的核心组件，不得重新实现相同功能。

#### Scenario: 页面使用统一的组件库
**Given** 开发人员正在重构推进系统监控页面
**When** 实现监控墙和告警区
**Then** MUST 使用以下组件：
- `MonitoringWall` - 监控墙容器组件
- `MetricCard` - 监测点卡片组件
- `DedicatedAlarmZone` - 专属告警区组件
- `ConnectionStatusIndicator` - 连接状态指示器（可选，或自定义）
- `Breadcrumbs` - 面包屑导航组件

**And** 不得创建重复的组件或重新实现相同功能

#### Scenario: 页面通过 stores 和 services 获取数据
**Given** 监控页面需要获取实时数据
**When** 页面组件挂载
**Then** MUST 通过以下方式获取数据：
- 使用 `useMonitoringStore` hook 访问监测数据
- 使用 `useAlarmsStore` hook 访问告警数据
- 通过 `realtimeService` 管理 WebSocket 连接和订阅
- 不得直接访问 WebSocket 或后端 API

---

### Requirement: Monitoring pages MUST support responsive layout (监控页面必须支持响应式布局)

所有监控页面 MUST 在不同屏幕尺寸下提供良好的用户体验，自动调整布局和列数。

#### Scenario: 桌面端显示 4 列网格
**Given** 用户在桌面设备（屏幕宽度 ≥ 1024px）上访问监控页面
**When** 监控墙渲染
**Then** 监测点应以 4 列网格布局展示

#### Scenario: 平板端显示 2 列网格
**Given** 用户在平板设备（屏幕宽度 768px - 1023px）上访问监控页面
**When** 监控墙渲染
**Then** 监测点应以 2 列网格布局展示

#### Scenario: 手机端显示 1 列网格
**Given** 用户在手机设备（屏幕宽度 < 768px）上访问监控页面
**When** 监控墙渲染
**Then** 监测点应以 1 列网格布局展示

---

## MODIFIED Requirements

### Requirement: Existing monitoring pages MUST remove old card layouts and chart components (现有监控页面必须移除旧的卡片布局和图表组件)

PropulsionMonitoringPage、InverterMonitoringPage、PowerDistributionPage 和 AuxiliaryMonitoringPage 的现有实现 MUST 被重构，移除旧的手工实现的卡片布局和图表。

#### Scenario: 推进系统页面移除旧的卡片实现
**Given** PropulsionMonitoringPage 当前包含手工实现的电机指标卡片
**When** 执行重构任务
**Then** 应移除以下内容：
- 手工编写的 `<Card>` 组件和样式
- 手工实现的 `PropulsionOverview` 组件
- 自定义的 `propulsionSpecs` 表格
- 直接在页面中管理的 `propulsionMetrics` 状态

**And** 应替换为：
- `MonitoringWall` 组件（集成所有监测点）
- `DedicatedAlarmZone` 组件（替代告警表格）
- 通过 `monitoring-store` 获取数据

#### Scenario: 逆变器系统页面移除旧的手工实现
**Given** InverterMonitoringPage 当前包含手工实现的逆变器指标卡片
**When** 执行重构任务
**Then** 应移除旧的实现并替换为 `MonitoringWall` 和 `DedicatedAlarmZone`

#### Scenario: 配电系统页面移除旧的表格布局
**Given** PowerDistributionPage 当前使用表格展示配电参数
**When** 执行重构任务
**Then** 应移除表格布局并替换为监控墙的卡片网格布局

#### Scenario: 辅助系统页面移除旧的手工实现
**Given** AuxiliaryMonitoringPage 当前包含手工实现的辅助设备卡片
**When** 执行重构任务
**Then** 应移除旧的实现并替换为统一的监控墙模板

---

## 架构约束

### 数据流约束
- 监控页面组件 MUST 是"哑"组件，不包含数据获取或订阅管理的复杂逻辑
- 所有数据访问 MUST 通过 `monitoring-store` 和 `alarms-store`
- WebSocket 连接和消息处理 MUST 通过 `realtime-service`
- MUST 遵循"单一真理源"原则

### 组件复用约束
- MUST 复用现有的 `MonitoringWall`、`MetricCard`、`DedicatedAlarmZone` 组件
- 不得为单个页面创建专用的组件（除非有明确的特殊需求）
- 图标系统和动画效果 MUST 来自现有的图标库

### 性能约束
- 页面首次加载时间应小于 2 秒
- 实时数据更新不应导致明显的界面卡顿
- 内存使用应保持稳定，避免内存泄漏

---

## 非功能性需求

### 可访问性
- 所有交互元素 MUST 支持键盘导航
- 状态变化应提供视觉和文字反馈
- 颜色编码应附带文字标签（不仅依赖颜色）

### 国际化
- 所有文本内容使用中文
- 数值格式符合中国标准（小数点使用"."）
- 时间格式使用 24 小时制

### 错误处理
- WebSocket 连接失败应显示友好的错误提示
- 数据加载失败应显示重试选项
- 订阅失败应记录日志并尝试自动恢复

---

## 相关能力
- `realtime-data-flow` - 实时数据流
- `monitoring-store` - 监测数据状态管理
- `alarms-store` - 告警数据状态管理
- `animated-visualization-components` - 动画可视化组件
