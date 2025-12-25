# 规范：可视化组件能力

## ADDED Requirements

### Requirement: 系统 MUST 提供增强的GaugeChart组件

The system MUST provide an enhanced GaugeChart component supporting animated pointers, threshold visualization, multiple gauge types, and clear display of percentage or range values.

系统必须提供一个增强版的GaugeChart仪表盘组件，支持动画指针、阈值可视化、多种仪表盘类型，能够清晰展示百分比或范围值。

#### Scenario: 渲染半圆仪表盘显示SOC

**Given** 用户查看电池监控页面
**When** 渲染电池SOC的GaugeChart，值为75%
**Then** 显示半圆形仪表盘
**And** 指针指向75%位置
**And** 使用绿色显示正常状态
**And** 显示当前数值"75%"

#### Scenario: 指针平滑动画到新数值

**Given** GaugeChart当前显示SOC为75%
**When** SOC更新为80%
**Then** 指针使用弹簧动画平滑移动到80%位置
**And** 动画持续约800ms
**And** 数值文字同步更新，使用数字滚动效果

#### Scenario: 阈值线标记和颜色变化

**Given** GaugeChart配置了warning阈值20%和critical阈值10%
**When** SOC为15%（在warning和critical之间）
**Then** 仪表盘背景在阈值位置显示标记线
**And** 15%区域使用黄色显示
**And** 10%以下区域使用红色显示
**And** 指针颜色为黄色

---

### Requirement: 系统 MUST 提供DonutChart环形图组件

The system MUST provide a DonutChart component for displaying data distribution, supporting multi-segment data, legends, percentage display, and interactive effects.

系统必须提供DonutChart组件用于展示数据分布，支持多段数据、图例、百分比显示和交互效果。

#### Scenario: 渲染电池单体电压分布

**Given** 电池系统有100个单体，电压分为"正常"、"偏高"、"偏低"三类
**When** 渲染DonutChart显示分布
**Then** 环形图显示三个扇区
**And** 每个扇区颜色不同（绿色/黄色/红色）
**And** 扇区大小与数量成比例
**And** 显示图例标明"正常: 85个"等信息

#### Scenario: 绘制动画效果

**Given** 用户首次加载DonutChart
**When** 组件开始渲染
**Then** 环形图从0度开始顺时针绘制
**And** 绘制动画持续1.2秒
**And** 使用ease-out缓动函数
**And** 所有扇区依次出现

#### Scenario: 悬停交互效果

**Given** DonutChart已完全渲染
**When** 用户鼠标悬停在"正常"扇区上
**Then** 该扇区向外扩展放大
**And** 显示详细tooltip："正常: 85个 (85%)"
**And** 其他扇区稍微变暗
**When** 鼠标移开
**Then** 所有扇区恢复原状

---

### Requirement: 系统 MUST 提供MetricCard指标卡片组件

The system MUST provide a MetricCard component as the basic unit of the "monitoring wall", integrating icons, values, trends, status and other information with rich animation effects.

系统必须提供MetricCard组件作为"监控墙"的基本单元，整合图标、数值、趋势、状态等信息，并具有丰富的动画效果。

#### Scenario: 渲染完整的指标卡片

**Given** 电池总电压监测点数据为650V，状态normal，趋势上升2V
**When** 渲染MetricCard
**Then** 卡片顶部显示"总电压"专属图标
**And** 中央显示大号数值"650"和单位"V"
**And** 底部显示向上箭头和"+2V"
**And** 卡片边框为蓝色（正常状态）

#### Scenario: 状态变化时的动画效果

**Given** MetricCard显示总电压，状态为normal
**When** 电压超过warning阈值，状态变为warning
**Then** 卡片边框颜色平滑过渡到黄色
**And** 图标颜色变为黄色
**And** 卡片开始脉冲动画
**And** 显示警告徽章"⚠"

#### Scenario: 点击卡片查看详情

**Given** MetricCard显示在监控墙上
**When** 用户点击该卡片
**Then** 卡片产生涟漪点击效果
**And** 触发 `onClick` 回调
**And** 页面导航到该监测点的详细图表页面

#### Scenario: 紧凑模式渲染

**Given** 移动端屏幕宽度小于640px
**When** 渲染MetricCard组件
**Then** 自动切换到紧凑模式
**And** 图标尺寸减小
**And** 边距和内边距减小
**And** 趋势信息简化显示

---

### Requirement: 系统 MUST 提供StatusIndicator状态指示器组件

The system MUST provide a StatusIndicator component for displaying device or system operating status, supporting multiple status types and pulse animations.

系统必须提供StatusIndicator组件用于显示设备或系统的运行状态，支持多种状态类型和脉冲动画。

#### Scenario: 显示设备在线状态

**Given** 电池系统BMS通信正常
**When** 渲染StatusIndicator组件，status="online"
**Then** 显示绿色圆点
**And** 显示文字"在线"
**And** 无动画效果

#### Scenario: 显示设备离线状态

**Given** 推进系统逆变器通信断开
**When** 渲染StatusIndicator组件，status="offline"
**Then** 显示灰色圆点
**And** 显示文字"离线"
**And** 无动画效果

#### Scenario: 显示警告状态并脉冲

**Given** 冷却水温度接近上限
**When** 渲染StatusIndicator组件，status="warning"，pulse=true
**Then** 显示黄色圆点
**And** 显示文字"警告"
**And** 圆点产生脉冲动画
**And** 脉冲周期2秒

#### Scenario: 显示错误状态并闪烁

**Given** 熔断器跳闸故障
**When** 渲染StatusIndicator组件，status="error"，pulse=true
**Then** 显示红色圆点
**And** 显示文字"故障"
**And** 圆点产生闪烁动画
**And** 闪烁周期1秒

---

### Requirement: 所有可视化组件 MUST 支持响应式设计

All visualization components MUST display and interact correctly at different screen sizes, automatically adjusting layout and dimensions to adapt to devices.

所有可视化组件必须在不同屏幕尺寸下正确显示和交互，自动调整布局和尺寸以适配设备。

#### Scenario: MetricCard在不同断点的布局

**Given** 监控页面包含12个MetricCard
**When** 在桌面端（>1024px）查看
**Then** 卡片以4列网格布局排列
**When** 在平板端（768px-1024px）查看
**Then** 卡片自动调整为3列网格布局
**When** 在手机端（<768px）查看
**Then** 卡片自动调整为单列布局

#### Scenario: GaugeChart的尺寸自适应

**Given** GaugeChart放置在不同宽度的容器中
**When** 容器宽度为200px
**Then** GaugeChart渲染为200x100px（半圆）
**When** 容器宽度为400px
**Then** GaugeChart渲染为400x200px
**And** 文字大小相应放大
**And** 指针粗细保持比例

---

### Requirement: 所有可视化组件 MUST 与Zustand Store集成

All visualization components MUST easily receive real-time data streams from Zustand stores and efficiently trigger re-rendering and animations when data changes.

所有可视化组件必须能够轻松接收来自Zustand stores的实时数据流，并在数据变化时高效触发重渲染和动画。

#### Scenario: MetricCard订阅Store数据

**Given** monitoring-store中存储电池总电压数据
**When** 页面渲染MetricCard组件
**Then** MetricCard通过props接收store中的数据
**When** WebSocket推送新的电压值
**And** store更新数据
**Then** MetricCard自动重渲染
**And** 数值变化动画自动触发

#### Scenario: 避免不必要的重渲染

**Given** monitoring-store中有100个监测点数据
**When** 其中一个监测点数据更新
**Then** 只有订阅该监测点的MetricCard重渲染
**And** 其他99个MetricCard不重渲染
**And** 使用React.memo优化性能

---

### Requirement: 系统 MUST 提供组件演示和测试页面

The system MUST provide a demo page showcasing all visualization components in various states and animation effects for development and testing purposes.

系统必须提供一个演示页面，展示所有可视化组件的各种状态和动画效果，便于开发和测试。

#### Scenario: 访问组件演示页面

**Given** 开发者在开发环境中
**When** 访问 `/visualization-demo` 路由
**Then** 显示组件演示页面
**And** 页面包含所有组件的展示区域
**And** 每个组件有多个示例和状态

#### Scenario: 测试组件动画效果

**Given** 演示页面显示MetricCard组件
**When** 点击"切换到Warning状态"按钮
**Then** MetricCard立即切换到warning状态
**And** 执行对应的动画效果
**When** 点击"切换到Critical状态"按钮
**Then** 动画平滑切换到critical效果

#### Scenario: 模拟实时数据流

**Given** 演示页面有"启动实时模拟"按钮
**When** 点击该按钮
**Then** 所有组件的数值开始随机变化
**And** 模拟真实的WebSocket数据推送
**And** 组件动画正常触发
**When** 点击"停止模拟"按钮
**Then** 数据变化停止

## MODIFIED Requirements

### Requirement: 现有GaugeChart组件 MUST 迁移和增强

The existing `src/components/GaugeChart.tsx` component MUST be migrated to the new component structure and functionally enhanced.

现有的 `src/components/GaugeChart.tsx` 组件需要迁移到新的组件结构中，并进行功能增强。

#### Scenario: 保持向后兼容

**Given** 现有页面使用了旧版GaugeChart组件
**When** 迁移到新的可视化组件系统
**Then** 现有功能继续正常工作
**And** 导入路径自动更新为新路径
**And** 不需要修改组件的使用方式

## REMOVED Requirements

无
