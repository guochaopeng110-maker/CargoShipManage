# 设计文档：动画驱动的可视化组件系统

## 架构概览

本设计文档详细说明可视化组件系统的架构设计、技术选型和实现策略。

## 系统架构

```
src/components/visualization/
├── icons/                          # 图标系统
│   ├── MetricIcon.tsx             # 图标组件
│   ├── icon-mapping.ts            # 监测点ID → SVG映射
│   └── svg/                       # SVG图标资源
│       ├── battery/               # 电池系统图标
│       ├── propulsion/            # 推进系统图标
│       ├── inverter/              # 逆变器图标
│       ├── power/                 # 配电系统图标
│       └── auxiliary/             # 辅助系统图标
├── charts/                        # 图表组件
│   ├── GaugeChart.tsx            # 仪表盘（增强版）
│   ├── DonutChart.tsx            # 环形图
│   ├── MetricCard.tsx            # 指标卡片
│   └── StatusIndicator.tsx       # 状态指示器
├── animations/                    # 动画系统
│   ├── variants.ts               # 动画变体定义
│   ├── transitions.ts            # 过渡配置
│   └── hooks.ts                  # 动画相关hooks
├── demo/                         # 演示和测试
│   ├── VisualizationDemo.tsx    # 组件演示页面
│   └── mock-data.ts             # 模拟数据生成器
└── README.md                     # 组件库文档
```

## 核心设计决策

### 1. 图标系统设计

#### 设计目标

- **业务语义明确**：每个监测点都有独特的图标，用户一眼能识别
- **视觉一致性**：所有图标遵循统一的设计风格
- **易于维护**：新增监测点时容易添加图标
- **性能优化**：SVG图标按需加载，支持tree-shaking

#### 实现方案

**方案A：静态导入（采用）**
```typescript
// icon-mapping.ts
import BatteryTotalVoltageIcon from './svg/battery/total-voltage.svg?react';
import BatteryCellVoltageIcon from './svg/battery/cell-voltage.svg?react';

export const iconMap: Record<string, React.FC<SVGProps<SVGSVGElement>>> = {
  'SYS-BAT-001:total_voltage': BatteryTotalVoltageIcon,
  'SYS-BAT-001:cell_voltage': BatteryCellVoltageIcon,
  // ...
};
```

**优点**：
- 编译时类型检查
- Vite自动优化SVG
- 支持tree-shaking
- 无运行时开销

**缺点**：
- 需要手动维护映射
- 初始包体积稍大

**方案B：动态导入（未采用）**
```typescript
const icon = await import(`./svg/${category}/${name}.svg?react`);
```

**缺点**：
- 运行时异步加载，影响体验
- 无法进行静态分析
- 容易出错

#### 图标命名规范

```
设备ID:监测点名称
例如：
- SYS-BAT-001:total_voltage        # 电池系统-总电压
- SYS-PROP-L-001:motor_speed       # 左推进-电机转速
- SYS-INV-1-001:output_voltage     # 1#逆变器-输出电压
```

#### 图标设计原则

1. **简洁明了**：图标应简单清晰，避免过度细节
2. **尺寸适应**：图标在16px-64px范围内都清晰可辨
3. **颜色语义**：
   - 正常状态：使用主题色（蓝色/绿色）
   - 警告状态：黄色
   - 严重状态：红色
4. **SVG优化**：移除不必要的元素，减小文件体积

### 2. 动画系统设计

#### 设计目标

- **流畅性**：所有动画保持60fps
- **语义化**：动画传达明确的状态信息
- **可控性**：用户可以禁用动画（可访问性）
- **一致性**：整个系统使用统一的动画语言

#### 技术选型：framer-motion

**为什么选择 framer-motion？**

1. **声明式API**：易于理解和维护
2. **性能优越**：基于Web Animations API和requestAnimationFrame
3. **手势支持**：内置拖拽、悬停、点击等手势识别
4. **变体系统**：支持复杂的动画编排
5. **React集成**：专为React设计，生态成熟

**对比其他方案**：

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| framer-motion | API优雅、功能强大、性能好 | 包体积较大(~60KB) | ✅ 采用 |
| react-spring | 物理动画自然 | API复杂、学习曲线陡 | ❌ 不采用 |
| CSS动画 | 包体积0、性能最佳 | 复杂动画难实现 | ❌ 不采用 |
| GSAP | 功能最强大 | 商业许可、包体积大 | ❌ 不采用 |

#### 动画变体定义

```typescript
// animations/variants.ts
export const variants = {
  // 淡入动画（组件加载）
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },

  // 脉冲动画（警告状态）
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },

  // 闪烁动画（严重告警）
  blink: {
    animate: {
      opacity: [1, 0, 1],
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },

  // 数值变化动画
  valueChange: {
    animate: (value: number) => ({ value }),
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
    },
  },
};
```

#### 动画性能优化策略

1. **GPU加速**：优先使用transform和opacity（触发GPU加速）
2. **避免布局抖动**：不在动画中修改width/height
3. **条件渲染**：只在可视区域的组件上启用动画
4. **节流控制**：高频数据更新时限制动画触发频率
5. **will-change提示**：为动画元素添加will-change属性

### 3. 组件设计

#### MetricIcon 组件

**职责**：根据监测点ID渲染对应的SVG图标，并提供状态驱动的动画

**接口设计**：
```typescript
interface MetricIconProps {
  monitoringPointId: string;      // 监测点ID
  size?: number;                  // 图标尺寸（px）
  className?: string;             // 自定义样式类
  animate?: boolean;              // 是否启用动画
  status?: 'normal' | 'warning' | 'critical';  // 状态
  onClick?: () => void;           // 点击事件
}
```

**状态-颜色映射**：
- `normal`: `text-blue-500`
- `warning`: `text-yellow-500` + pulse动画
- `critical`: `text-red-500` + blink动画

**实现要点**：
1. 从iconMap获取对应的SVG组件
2. 根据status应用不同的颜色和动画
3. 提供默认图标处理未知的monitoringPointId
4. 使用memo优化避免不必要的重渲染

#### GaugeChart 组件（增强版）

**职责**：展示百分比或范围值，支持多种仪表盘类型和动画

**新增能力**：
1. **动画指针**：指针移动使用spring动画
2. **阈值动画**：数值超过阈值时背景颜色渐变
3. **脉冲效果**：告警状态时整个仪表盘脉冲
4. **进度条动画**：加载时有填充动画

**接口扩展**：
```typescript
interface GaugeChartProps {
  // 原有props...
  animationDuration?: number;     // 动画持续时间
  onThresholdExceeded?: (threshold: 'warning' | 'critical') => void;
}
```

#### DonutChart 组件

**职责**：展示数据分布，如电池单体电压分布、系统状态占比

**接口设计**：
```typescript
interface DonutChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  size?: number;                  // 图表尺寸
  innerRadius?: number;           // 内圆半径比例(0-1)
  showLegend?: boolean;           // 显示图例
  showPercentage?: boolean;       // 显示百分比
  animate?: boolean;              // 启用动画
  onSegmentClick?: (segment: { label: string; value: number }) => void;
}
```

**动画效果**：
1. **绘制动画**：从0度开始顺时针绘制
2. **悬停效果**：鼠标悬停时扇区放大
3. **数值变化**：数据更新时平滑过渡

**实现方案**：
- 使用SVG的`<path>`元素绘制扇区
- 使用framer-motion的`pathLength`属性实现绘制动画
- 使用`useSpring`实现悬停交互

#### MetricCard 组件

**职责**：作为"监控墙"的基本单元，展示单个监测点的完整信息

**接口设计**：
```typescript
interface MetricCardProps {
  monitoringPointId: string;      // 监测点ID
  value: number;                  // 当前值
  unit: string;                   // 单位
  label: string;                  // 显示名称
  status?: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';  // 趋势
  trendValue?: number;            // 趋势变化值
  thresholds?: {                  // 阈值配置
    warning: number;
    critical: number;
  };
  onClick?: () => void;
  compact?: boolean;              // 紧凑模式
}
```

**布局结构**：
```
┌─────────────────────────────┐
│  [图标]   指标名称          │
│                             │
│  [大号数值] 单位            │
│                             │
│  [趋势图标] ±变化值  [状态] │
└─────────────────────────────┘
```

**状态动画**：
- **normal → warning**：卡片边框黄色脉冲，图标黄色
- **warning → critical**：卡片边框红色闪烁，图标红色
- **critical 持续**：持续脉冲动画，吸引注意

**交互反馈**：
- 悬停：卡片轻微上浮（translateY: -4px）
- 点击：涟漪效果，跳转到详细页面

#### StatusIndicator 组件

**职责**：显示设备或系统的运行状态

**接口设计**：
```typescript
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  pulse?: boolean;                // 脉冲动画
  showIcon?: boolean;             // 显示状态图标
}
```

**状态映射**：
- `online`: 绿色圆点，无动画
- `offline`: 灰色圆点，无动画
- `warning`: 黄色圆点，脉冲动画
- `error`: 红色圆点，闪烁动画

### 4. 与Zustand Store的集成

#### 数据流设计

```
WebSocket推送
    ↓
Zustand Store更新
    ↓
组件订阅变化
    ↓
触发动画和重渲染
```

#### 使用示例

```typescript
// 在页面组件中
function BatteryMonitoringPage() {
  const { equipmentData } = useMonitoringStore();
  const batteryData = equipmentData['SYS-BAT-001'];

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        monitoringPointId="SYS-BAT-001:total_voltage"
        value={batteryData?.total_voltage?.value}
        unit="V"
        label="总电压"
        status={getStatus(batteryData?.total_voltage)}
      />
      {/* 更多MetricCard... */}
    </div>
  );
}
```

#### 性能优化

1. **选择性订阅**：只订阅需要的数据切片
2. **浅比较优化**：使用shallow比较避免不必要的重渲染
3. **批量更新**：Store更新时批量处理多个监测点

### 5. 响应式设计策略

#### 断点定义（使用Tailwind默认断点）

- `sm`: 640px - 小屏手机横屏/大屏手机竖屏
- `md`: 768px - 平板竖屏
- `lg`: 1024px - 平板横屏/小笔记本
- `xl`: 1280px - 桌面显示器
- `2xl`: 1536px - 大屏显示器

#### 组件响应式策略

**MetricCard**：
- `< 640px`: 单列布局，紧凑模式
- `640px - 1024px`: 双列布局
- `> 1024px`: 3-4列网格布局

**GaugeChart**：
- 使用百分比宽度，最大宽度限制
- 文字大小根据容器宽度调整

**DonutChart**：
- 自动计算合适的尺寸
- 移动端隐藏图例或改为底部显示

### 6. 可访问性设计

#### ARIA属性

```typescript
<MetricCard
  role="article"
  aria-label={`${label}: ${value} ${unit}, 状态: ${status}`}
  aria-live="polite"  // 数值变化时通知屏幕阅读器
/>
```

#### 键盘导航

- 所有可点击组件支持Tab导航
- 支持Enter/Space激活

#### 动画控制

```typescript
// 尊重用户的动画偏好
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

const shouldAnimate = !prefersReducedMotion && animate;
```

### 7. 错误处理

#### 图标加载失败

```typescript
const DefaultIcon = () => (
  <div className="flex items-center justify-center bg-gray-200 rounded">
    <HelpCircle className="text-gray-400" />
  </div>
);

// 在MetricIcon中
const IconComponent = iconMap[monitoringPointId] || DefaultIcon;
```

#### 数据异常处理

```typescript
// MetricCard中
if (value === null || value === undefined) {
  return <MetricCard.Skeleton />;
}

if (isNaN(value)) {
  return <MetricCard.Error message="数据异常" />;
}
```

## 技术栈

- **React 18**：核心框架
- **TypeScript**：类型安全
- **framer-motion**：动画库
- **Tailwind CSS**：样式框架
- **Zustand**：状态管理
- **Vite**：构建工具
- **Lucide React**：补充图标库

## 性能目标

- **首次渲染**：< 100ms
- **动画帧率**：60fps
- **包体积增加**：< 100KB (gzip)
- **内存占用**：单个组件 < 1MB

## 测试策略

1. **单元测试**：每个组件的基本功能
2. **视觉回归测试**：确保样式一致性
3. **性能测试**：动画帧率、内存占用
4. **可访问性测试**：ARIA属性、键盘导航
5. **跨浏览器测试**：Chrome、Firefox、Safari、Edge

## 风险缓解

### 风险1：图标设计工作量大

**缓解措施**：
1. 阶段性交付，优先实现关键系统图标
2. 部分通用图标使用Lucide React的组合和定制
3. 建立图标设计模板，提高制作效率

### 风险2：动画性能问题

**缓解措施**：
1. 使用React DevTools Profiler持续监控
2. 实施虚拟化，只渲染可视区域组件
3. 提供"低性能模式"，简化或禁用动画
4. 使用Web Workers处理数据计算

### 风险3：浏览器兼容性

**缓解措施**：
1. 使用Browserslist明确支持范围
2. Vite自动添加必要的polyfill
3. 降级策略：不支持的浏览器使用静态版本

## 未来扩展

1. **3D可视化**：使用Three.js实现3D设备模型
2. **WebGL图表**：超大数据量时使用WebGL渲染
3. **主题系统**：支持亮色/暗色主题切换
4. **自定义图表编辑器**：允许用户自定义仪表盘布局
