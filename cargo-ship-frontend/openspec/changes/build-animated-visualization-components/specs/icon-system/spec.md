# 规范：图标系统能力

## ADDED Requirements

### Requirement: 系统 MUST 为每个监测点提供专属图标

The system MUST establish a complete icon system, providing unique and semantically meaningful SVG icons for each monitoring point ID defined in `monitoring_and_alarm_definitions.md`. Icons MUST clearly convey the meaning of monitoring points and avoid using generic type-based icons.

系统必须建立一个完整的图标体系，为 `monitoring_and_alarm_definitions.md` 中定义的每个监测点ID提供独特的、具有业务语义的SVG图标。图标必须能够清晰传达监测点的含义，避免使用通用的类型化图标。

#### Scenario: 渲染电池系统监测点图标

**Given** 用户访问电池监控页面
**When** 页面渲染"总电压"监测点
**Then** 系统显示专门为"总电压"设计的SVG图标，而非通用的"电压"图标
**And** 图标具有明确的视觉特征，用户可以区分"总电压"和"单体电压"图标

#### Scenario: 渲染推进系统监测点图标

**Given** 用户访问推进系统监控页面
**When** 页面同时显示"电机转速"和"电机功率"监测点
**Then** 两个监测点显示不同的专属图标
**And** 图标清晰传达各自的业务含义（转速vs功率）

#### Scenario: 处理未知监测点ID

**Given** 系统遇到未定义的监测点ID
**When** 尝试渲染该监测点的图标
**Then** 系统显示默认的占位符图标
**And** 不抛出错误或导致页面崩溃

---

### Requirement: 系统 MUST 提供MetricIcon组件用于渲染监测点图标

The system MUST provide a `MetricIcon` React component that accepts monitoring point ID as props and renders corresponding SVG icons. The component MUST support size adjustment, status-driven color changes, and animation effects.

系统必须提供一个 `MetricIcon` React组件，该组件接收监测点ID作为属性，并渲染对应的SVG图标。组件必须支持尺寸调整、状态驱动的颜色变化和动画效果。

#### Scenario: 基本图标渲染

**Given** 开发者在组件中使用 `<MetricIcon monitoringPointId="SYS-BAT-001:total_voltage" />`
**When** 组件渲染
**Then** 显示总电压的专属SVG图标
**And** 图标使用默认尺寸（24px）
**And** 图标使用默认颜色（蓝色）

#### Scenario: 自定义图标尺寸

**Given** 开发者设置 `<MetricIcon monitoringPointId="SYS-BAT-001:soc" size={48} />`
**When** 组件渲染
**Then** 图标尺寸为 48x48 像素
**And** 图标保持清晰，无模糊或失真

#### Scenario: 基于状态的颜色变化

**Given** 监测点状态为"warning"
**When** 渲染 `<MetricIcon monitoringPointId="SYS-BAT-001:temperature" status="warning" />`
**Then** 图标颜色变为黄色
**And** 图标开始脉冲动画

#### Scenario: 基于状态的动画效果

**Given** 监测点状态为"critical"
**When** 渲染 `<MetricIcon monitoringPointId="SYS-BAT-001:voltage" status="critical" animate={true} />`
**Then** 图标颜色变为红色
**And** 图标开始闪烁动画以吸引注意

---

### Requirement: 图标映射系统 MUST 支持所有已定义的监测点

The system MUST maintain a complete icon mapping table covering all monitoring points (approximately 70) across all 8 device systems. The mapping table MUST use monitoring point IDs as keys and SVG components as values.

系统必须维护一个完整的图标映射表，覆盖所有8个设备系统的全部监测点（约70个）。映射表必须使用监测点ID作为键，SVG组件作为值。

#### Scenario: 电池系统图标完整性

**Given** 电池系统有18个监测点
**When** 查询图标映射表
**Then** 所有18个监测点都有对应的图标映射
**And** 每个图标都是独特的SVG组件

#### Scenario: 推进系统图标完整性

**Given** 左右推进系统共有28个监测点
**When** 查询图标映射表
**Then** 所有28个监测点都有对应的图标映射
**And** 左右推进系统的同名监测点使用相同的图标设计

#### Scenario: 图标映射的类型安全

**Given** 开发者使用TypeScript
**When** 访问图标映射表
**Then** TypeScript能够推断出正确的监测点ID类型
**And** 无效的监测点ID会产生编译时错误

---

### Requirement: 图标 MUST 优化性能和包体积

All SVG icons MUST be optimized to remove unnecessary elements and attributes. Icons MUST support on-demand loading and tree-shaking to avoid bundling unused icons into the final build.

所有SVG图标必须经过优化，移除不必要的元素和属性。图标必须支持按需加载和tree-shaking，避免将未使用的图标打包到最终产物中。

#### Scenario: SVG文件优化

**Given** 一个新的SVG图标文件
**When** 该文件被添加到项目中
**Then** SVG代码经过SVGO等工具优化
**And** 移除了注释、metadata和不必要的属性
**And** 文件大小减小至少30%

#### Scenario: 按需加载图标

**Given** 页面只使用了5个监测点图标
**When** 构建生产版本
**Then** 最终bundle只包含这5个图标的SVG代码
**And** 未使用的65个图标被tree-shake移除

---

### Requirement: 图标 MUST 保持视觉一致性

All icons MUST follow unified design specifications, including line thickness, border radius, padding ratio, etc. Icons SHALL maintain clarity and recognizability at different sizes.

所有图标必须遵循统一的设计规范，包括线条粗细、圆角半径、留白比例等。图标在不同尺寸下都应保持清晰和识别度。

#### Scenario: 多尺寸渲染测试

**Given** 同一个图标在16px、24px、32px、48px、64px五种尺寸下渲染
**When** 视觉检查所有尺寸
**Then** 图标在所有尺寸下都清晰可辨
**And** 关键特征在小尺寸下仍可识别
**And** 大尺寸下没有出现锯齿或失真

#### Scenario: 图标风格一致性

**Given** 从不同设备系统选择10个随机图标
**When** 并排显示这些图标
**Then** 所有图标具有相似的线条粗细
**And** 所有图标具有相似的视觉重量
**And** 用户能感受到统一的设计语言
