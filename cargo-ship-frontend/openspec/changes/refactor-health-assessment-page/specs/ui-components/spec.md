# UI 组件能力规范增量

## ADDED Requirements

### Requirement: SystemHealthCard 可复用组件

系统必须(SHALL)提供一个可复用的 SystemHealthCard 组件，用于展示单个系统或设备的健康状况概览。

#### Scenario: 组件基本展示

- **WHEN** 渲染 SystemHealthCard 组件并传入完整的 props
- **THEN** 组件必须(SHALL)显示以下内容：
  - 系统名称和图标（位于卡片顶部）
  - 健康评分数值（大号字体，居中显示）
  - 健康等级 Badge（颜色根据评分动态变化）
  - 趋势指示图标（上升/平稳/下降箭头）
  - 迷你趋势图（Sparkline）展示近期健康分变化
  - 活跃告警数量徽章（右上角，数量 > 0 时显示）

#### Scenario: 组件 Props 接口

- **WHEN** 使用 SystemHealthCard 组件
- **THEN** 组件必须(SHALL)接受以下 Props：
  ```typescript
  interface SystemHealthCardProps {
    systemId: string;                     // 系统唯一标识符
    systemName: string;                   // 系统名称（如"电池系统"）
    icon: React.ComponentType<{ className?: string }>; // 图标组件
    healthScore: number;                  // 健康评分（0-100）
    grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'; // 健康等级
    trend: 'improving' | 'stable' | 'declining';  // 趋势
    trendData: Array<{                    // 趋势数据点数组
      timestamp: number;
      score: number;
    }>;
    activeAlarmsCount: number;            // 活跃告警数量
    onNavigate: () => void;               // 点击导航回调函数
  }
  ```

---

### Requirement: 健康评分展示

SystemHealthCard 必须(SHALL)清晰展示健康评分，并根据评分区间使用不同的视觉样式。

#### Scenario: 评分数值显示

- **WHEN** healthScore prop 为有效数值（0-100）
- **THEN** 组件必须(SHALL)：
  - 以大号字体（text-3xl 或更大）显示评分数值
  - 评分后添加百分号（%）
  - 评分颜色根据健康等级动态变化（绿色/黄色/橙色/红色）

#### Scenario: 健康等级 Badge 显示

- **WHEN** grade prop 为有效等级值
- **THEN** 组件必须(SHALL)：
  - 显示对应的等级文字（如"良好"、"一般"、"较差"）
  - 使用 Badge 组件，背景色和文字色根据等级动态变化：
    - Excellent: 绿色（bg-emerald-500/20, text-emerald-400）
    - Good: 浅绿色（bg-green-500/20, text-green-400）
    - Fair: 黄色（bg-amber-500/20, text-amber-400）
    - Poor: 橙色（bg-orange-500/20, text-orange-400）
    - Critical: 红色（bg-red-500/20, text-red-400）

#### Scenario: 评分数据缺失

- **WHEN** healthScore prop 为 undefined 或 null
- **THEN** 组件必须(SHALL)：
  - 显示"暂无数据"或"未评估"占位文字
  - 使用灰色或半透明样式表示数据不可用
  - 不显示健康等级 Badge

---

### Requirement: 趋势可视化

SystemHealthCard 必须(SHALL)使用 Sparkline 迷你图表展示健康评分的近期变化趋势。

#### Scenario: 趋势图渲染

- **WHEN** trendData prop 包含 >= 2 个数据点
- **THEN** 组件必须(SHALL)：
  - 使用 recharts LineChart 组件渲染 Sparkline
  - 配置为 mini 模式（无坐标轴、无图例、最小高度）
  - 图表高度约 40-60px
  - 线条颜色根据 trend 动态变化：
    - improving: 绿色（#22c55e）
    - stable: 蓝色（#3b82f6）
    - declining: 红色（#ef4444）
  - 图表区域内允许鼠标悬停显示 Tooltip（可选）

#### Scenario: 趋势数据不足

- **WHEN** trendData prop 包含 < 2 个数据点
- **THEN** 组件必须(SHALL)：
  - 不显示 Sparkline 图表
  - 在图表位置显示"数据不足"提示文字
  - 使用灰色或半透明样式

#### Scenario: 趋势指示图标

- **WHEN** trend prop 为有效值
- **THEN** 组件必须(SHALL)：
  - 显示对应的趋势箭头图标：
    - improving: 向上箭头（TrendingUp 图标），绿色
    - stable: 水平直线（Minus 图标），蓝色
    - declining: 向下箭头（TrendingDown 图标），红色
  - 图标位于评分数值旁边或趋势图上方

---

### Requirement: 活跃告警数量展示

SystemHealthCard 必须(SHALL)在卡片右上角显示活跃告警数量徽章，为用户提供快速的告警提示。

#### Scenario: 告警数量徽章显示

- **WHEN** activeAlarmsCount prop > 0
- **THEN** 组件必须(SHALL)：
  - 在卡片右上角显示圆形或椭圆形徽章
  - 徽章内显示告警数量数值
  - 徽章背景色为红色或橙色（高亮显示）
  - 徽章文字色为白色，清晰可读
  - 徽章大小适中，不遮挡主要内容

#### Scenario: 无活跃告警

- **WHEN** activeAlarmsCount prop = 0
- **THEN** 组件可以(MAY)：
  - 不显示告警数量徽章，或
  - 显示灰色徽章，表示"0 告警"

#### Scenario: 告警数量变化动画

- **WHEN** activeAlarmsCount prop 从旧值变为新值
- **THEN** 组件应该(SHOULD)：
  - 徽章显示轻微的缩放或闪烁动画
  - 提示用户告警数量发生了变化
  - 动画时长约 300-500ms

---

### Requirement: 交互和导航

SystemHealthCard 必须(SHALL)支持点击交互，允许用户导航到对应系统的详细监控页面。

#### Scenario: 点击卡片导航

- **WHEN** 用户点击 SystemHealthCard 的任意区域
- **THEN** 组件必须(SHALL)：
  - 调用 onNavigate 回调函数
  - 不阻止事件冒泡（除非特殊需求）
  - 导航过程流畅，无明显延迟

#### Scenario: 悬停效果

- **WHEN** 用户鼠标悬停在 SystemHealthCard 上
- **THEN** 组件必须(SHALL)：
  - 卡片背景色略微变亮（如从 bg-slate-800/80 变为 bg-slate-800）
  - 或卡片边框高亮（如边框从 border-slate-700 变为 border-cyan-500）
  - 出现轻微阴影效果（shadow-lg）
  - 鼠标指针变为手型（cursor-pointer）
  - 悬停过渡动画平滑（transition-all duration-200）

#### Scenario: 焦点状态（键盘导航）

- **WHEN** 用户使用键盘 Tab 键聚焦到 SystemHealthCard
- **THEN** 组件必须(SHALL)：
  - 显示明显的聚焦边框（focus:ring-2 focus:ring-cyan-500）
  - 支持 Enter 或 Space 键触发点击导航
  - 确保无障碍访问（添加合适的 ARIA 属性）

---

### Requirement: 组件样式和主题

SystemHealthCard 必须(SHALL)遵循项目整体的设计风格和主题配色。

#### Scenario: 卡片基本样式

- **WHEN** 渲染 SystemHealthCard 组件
- **THEN** 组件必须(SHALL)：
  - 使用 Card 组件作为容器
  - 背景色为半透明深色（如 bg-slate-800/80）
  - 边框颜色为浅灰色（如 border-slate-700）
  - 圆角边框（rounded-lg）
  - 内边距适中（p-4 或 p-6）
  - 卡片整体风格与项目其他页面一致

#### Scenario: 暗色主题适配

- **WHEN** 项目使用暗色主题（dark mode）
- **THEN** 组件必须(SHALL)：
  - 自动适配暗色背景和浅色文字
  - 健康等级 Badge 的颜色在暗色背景下清晰可读
  - Sparkline 图表的颜色在暗色背景下有足够对比度

---

### Requirement: 组件性能优化

SystemHealthCard 必须(SHALL)进行性能优化，避免不必要的重渲染。

#### Scenario: 使用 React.memo 优化

- **WHEN** 父组件状态更新，但 SystemHealthCard 的 props 未变化
- **THEN** 组件必须(SHALL)：
  - 使用 React.memo 包裹组件，避免重新渲染
  - Props 比较使用浅比较（shallow comparison）
  - 如果需要深比较，提供自定义的 areEqual 函数

#### Scenario: 使用 useMemo 缓存计算结果

- **WHEN** 组件内部需要进行复杂计算（如趋势数据处理）
- **THEN** 组件应该(SHOULD)：
  - 使用 useMemo 缓存计算结果
  - 仅在依赖项（如 trendData）变化时重新计算
  - 避免每次渲染都重复计算

#### Scenario: 使用 useCallback 缓存事件处理函数

- **WHEN** 组件内部定义事件处理函数
- **THEN** 组件应该(SHOULD)：
  - 使用 useCallback 缓存事件处理函数
  - 避免每次渲染都创建新的函数引用
  - 减少子组件的不必要重渲染

---

### Requirement: 组件可访问性（Accessibility）

SystemHealthCard 必须(SHALL)支持无障碍访问，确保所有用户都能使用。

#### Scenario: ARIA 标签

- **WHEN** 渲染 SystemHealthCard 组件
- **THEN** 组件必须(SHALL)：
  - 卡片容器添加 role="button" 和 tabIndex={0} 属性
  - 添加 aria-label 描述卡片内容（如"电池系统健康卡片，评分 92，良好"）
  - 活跃告警徽章添加 aria-label（如"3 个活跃告警"）

#### Scenario: 键盘导航支持

- **WHEN** 用户使用键盘导航
- **THEN** 组件必须(SHALL)：
  - 支持 Tab 键聚焦
  - 支持 Enter 或 Space 键触发点击
  - 聚焦状态清晰可见
  - 焦点顺序符合逻辑

#### Scenario: 颜色对比度

- **WHEN** 显示文字和背景
- **THEN** 组件必须(SHALL)：
  - 确保颜色对比度符合 WCAG AA 标准（至少 4.5:1）
  - 不仅依赖颜色传达信息（如同时使用图标和文字）

---

### Requirement: 组件可复用性和扩展性

SystemHealthCard 必须(SHALL)设计为高度可复用，能够在不同场景和页面中使用。

#### Scenario: 在不同页面复用

- **WHEN** 在其他页面（如 DashboardPage）中使用 SystemHealthCard
- **THEN** 组件必须(SHALL)：
  - 不依赖任何特定的父组件或全局状态
  - 通过 props 接收所有必要数据
  - 支持自定义样式（通过 className prop）
  - 行为一致，不因使用场景而改变

#### Scenario: 支持自定义尺寸

- **WHEN** 需要在不同尺寸下使用 SystemHealthCard
- **THEN** 组件应该(SHOULD)：
  - 支持 size prop（如 'small' | 'medium' | 'large'）
  - 根据 size 调整内部元素的大小和间距
  - 默认使用 'medium' 尺寸

#### Scenario: 支持加载状态

- **WHEN** 健康数据正在加载中
- **THEN** 组件应该(SHOULD)：
  - 支持 loading prop
  - 显示 skeleton 或 spinner 加载状态
  - 保持卡片布局稳定，避免内容闪烁

---

## 总结

本规范增量定义了 SystemHealthCard 可复用组件的功能需求，包括：
- 组件基本展示和 Props 接口
- 健康评分和等级展示
- 趋势可视化（Sparkline 图表）
- 活跃告警数量展示
- 交互和导航功能
- 组件样式和主题适配
- 性能优化要求
- 无障碍访问支持
- 可复用性和扩展性

这些需求确保 SystemHealthCard 是一个功能完善、性能优良、易于复用的 UI 组件，可以在健康评估页面和其他页面中广泛使用。
