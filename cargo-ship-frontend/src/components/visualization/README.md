# 可视化组件系统

货船智能机舱管理系统的动画驱动可视化组件库。

## 📖 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [核心组件](#核心组件)
- [文件结构](#文件结构)
- [技术栈](#技术栈)
- [使用指南](#使用指南)
- [开发文档](#开发文档)

---

## 概述

本可视化组件系统为驾控台和监控页面提供统一的、动画驱动的监测点展示方案。

### 核心特性

✅ **专属图标系统** - 每个监测点都有独特的业务语义图标
✅ **流畅动画** - 基于 framer-motion 的 60fps 高性能动画
✅ **状态驱动** - 根据监测点状态自动变化颜色和动画
✅ **响应式设计** - 完美适配桌面、平板、手机
✅ **类型安全** - 完整的 TypeScript 类型支持
✅ **易于扩展** - 模块化设计，方便添加新图标和组件

---

## 快速开始

### 安装依赖

本系统依赖 framer-motion，已包含在 package.json 中：

```bash
npm install
```

### 基本使用

```tsx
import { MetricCard } from './visualization';

function MyPage() {
  return (
    <MetricCard
      monitoringPointId="SYS-BAT-001:total_voltage"
      value={650}
      unit="V"
      label="总电压"
      status="normal"
    />
  );
}
```

---

## 核心组件

### 1. MetricCard

指标卡片组件，"监控墙"的基本单元。

```tsx
<MetricCard
  monitoringPointId="SYS-BAT-001:soc"
  value={75}
  unit="%"
  label="SOC荷电状态"
  status="warning"
  trend="down"
  trendValue={-2}
  onClick={() => console.log('Clicked')}
/>
```

**Props**:
- `monitoringPointId`: 监测点ID
- `value`: 当前数值
- `unit`: 单位
- `label`: 显示标签
- `status`: 状态（normal/warning/critical）
- `trend`: 趋势（up/down/stable）
- `trendValue`: 趋势数值
- `onClick`: 点击回调

**特性**:
- ✅ 自动集成专属图标
- ✅ 平滑数值变化动画（弹簧效果）
- ✅ 状态驱动的边框动画（脉冲/闪烁）
- ✅ 趋势指示器
- ✅ 悬停效果

### 2. MetricIcon

监测点图标组件。

```tsx
<MetricIcon
  monitoringPointId="SYS-BAT-001:total_voltage"
  size={32}
  status="warning"
  animate={true}
/>
```

**Props**:
- `monitoringPointId`: 监测点ID
- `size`: 图标尺寸（像素）
- `status`: 状态（影响颜色和动画）
- `dataType`: 数据类型（number/boolean）
- `animate`: 是否启用动画

**特性**:
- ✅ 自动加载对应的 SVG 图标
- ✅ 状态驱动的颜色变化
- ✅ 警告脉冲/严重闪烁动画
- ✅ 支持占位符图标

### 3. GaugeChart

仪表盘图表组件（已有，位于新目录）。

```tsx
<GaugeChart
  value={75}
  maxValue={100}
  label="SOC"
  unit="%"
  type="semicircle"
/>
```

---

## 文件结构

```
src/components/visualization/
├── index.ts                    # 统一导出文件
├── README.md                   # 本文档
├── INTEGRATION_GUIDE.md        # 集成指南
├── animations.ts               # 核心动画配置
├── MetricCard.tsx              # 指标卡片组件
├── GaugeChart.tsx              # 仪表盘组件（迁移）
├── icons/                      # 图标系统
│   ├── ICON_DESIGN_PLAN.md     # 图标设计方案
│   ├── MetricIcon.tsx          # 图标组件
│   ├── icon-mapping.ts         # 图标映射表
│   └── svg/                    # SVG 图标文件
│       ├── bat-total-voltage.svg
│       ├── bat-soc.svg
│       ├── motor-speed.svg
│       ├── default-metric.svg  # 占位符
│       └── ...
```

---

## 技术栈

- **React** - UI 框架
- **TypeScript** - 类型安全
- **Framer Motion** - 动画库
- **Tailwind CSS** - 样式系统
- **Zustand** - 状态管理（集成）
- **Lucide React** - 辅助图标

---

## 使用指南

### 在驾控台页面使用

```tsx
import { MetricCard } from './visualization';
import { useMonitoringStore } from '../stores/monitoring-store';

export function DashboardPage() {
  const batteryData = useMonitoringStore(state => state.getMetricData('SYS-BAT-001'));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <MetricCard
        monitoringPointId="SYS-BAT-001:total_voltage"
        value={batteryData?.metrics?.find(m => m.id === 'total_voltage')?.value || 0}
        unit="V"
        label="总电压"
        status="normal"
      />
      {/* 更多卡片... */}
    </div>
  );
}
```

### 在监控页面使用（监控墙）

```tsx
export function BatteryMonitoringPage() {
  const monitoringPoints = [
    { id: 'total_voltage', label: '总电压', unit: 'V' },
    { id: 'soc', label: 'SOC荷电状态', unit: '%' },
    // ... 更多监测点
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {monitoringPoints.map(point => (
        <MetricCard
          key={point.id}
          monitoringPointId={`SYS-BAT-001:${point.id}`}
          value={/* 从 store 获取 */}
          unit={point.unit}
          label={point.label}
        />
      ))}
    </div>
  );
}
```

详细集成指南请参阅 [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)。

---

## 开发文档

### 图标系统

#### 已实现的图标（9个）

- `bat-total-voltage.svg` - 电池总电压
- `bat-soc.svg` - 电池SOC
- `bat-temperature.svg` - 电池温度
- `motor-speed.svg` - 电机转速
- `motor-power.svg` - 电机功率
- `inverter-voltage.svg` - 逆变器电压
- `busbar-voltage.svg` - 母排电压
- `default-metric.svg` - 数值类型占位符
- `default-status.svg` - 状态类型占位符

#### 添加新图标

1. 在 `icons/svg/` 中创建 SVG 文件
2. 遵循设计规范（24x24px, 2px 线宽, currentColor）
3. 在 `icons/icon-mapping.ts` 中添加映射：

```tsx
import NewIcon from './svg/new-icon.svg?react';

export const iconMap: IconMap = {
  // ...
  'SYS-XXX-001:new_metric': NewIcon,
};
```

详细设计规范请参阅 [图标设计方案](./icons/ICON_DESIGN_PLAN.md)。

### 动画系统

#### 3种核心动画

1. **pulse** - 脉冲动画
   - 用途：警告状态
   - 效果：黄色，缩放 1.0-1.05，2秒周期

2. **blink** - 闪烁动画
   - 用途：严重状态
   - 效果：红色，透明度 1.0-0.3，1秒周期

3. **valueChange** - 数值变化动画
   - 用途：数值更新
   - 效果：弹簧物理模型，平滑过渡

#### 自定义动画

编辑 `animations.ts` 文件：

```tsx
export const customVariant: Variants = {
  initial: { /* 初始状态 */ },
  animate: { /* 动画状态 */ },
};
```

### 性能优化

#### 已实现的优化

- ✅ 使用 `React.memo` 避免不必要的重渲染
- ✅ 使用 GPU 加速属性（transform, opacity）
- ✅ 弹簧动画使用 `useSpring` 优化
- ✅ 图标按需加载（tree-shaking）

#### 性能建议

1. **限制卡片数量**：同时显示不超过 30 个 MetricCard
2. **精确订阅**：使用 Zustand selector 避免全量订阅
3. **降低更新频率**：数值更新频率控制在 ≤1Hz

---

## 状态说明

### 组件状态

| 状态 | 颜色 | 动画 | 用途 |
|------|------|------|------|
| `normal` | 蓝色 | 无 | 正常运行 |
| `warning` | 黄色 | 脉冲 | 接近阈值 |
| `critical` | 红色 | 闪烁 | 超过阈值 |

### 趋势指示

| 趋势 | 图标 | 颜色 | 含义 |
|------|------|------|------|
| `up` | ↗ | 绿色 | 数值上升 |
| `down` | ↘ | 红色 | 数值下降 |
| `stable` | → | 灰色 | 数值稳定 |

---

## 常见问题

### Q: 为什么有些图标是通用的？

**A**: 第一期实现了 30-40 个核心图标，其他监测点暂时使用占位符图标。可根据需要逐步补充专属图标。

### Q: 如何调整动画速度？

**A**: 修改 `animations.ts` 中的 `ANIMATION_DURATION` 常量。

### Q: 如何禁用动画？

**A**: 为组件设置 `animate={false}` 属性：

```tsx
<MetricCard ... animate={false} />
```

### Q: 响应式布局如何配置？

**A**: 使用 Tailwind CSS 的响应式类：

```tsx
// 手机2列，平板3列，桌面4列
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

---

## 下一步计划

- [ ] 补充更多专属图标（剩余 30 个）
- [ ] 升级 GaugeChart 添加动画效果
- [ ] 添加组件演示页面
- [ ] 添加单元测试
- [ ] 性能监控和优化

---

## 相关文档

- [集成指南](./INTEGRATION_GUIDE.md) - 如何在页面中使用组件
- [图标设计方案](./icons/ICON_DESIGN_PLAN.md) - 图标设计规范和清单
- [监测点定义](../../../docs/data/monitoring_and_alarm_definitions.md) - 所有监测点的定义
- [前端重构方案](../../../docs/plan/frontend_refactoring_plan.md) - 整体重构计划

---

## 许可

本项目为内部项目，版权归公司所有。

---

## 更新日志

### v1.0.0 (2025-12-12)

- ✅ 完成基础设施搭建（framer-motion, 目录结构, 动画系统）
- ✅ 完成图标系统（9个核心图标 + 占位符）
- ✅ 完成 MetricIcon 组件
- ✅ 完成 MetricCard 组件
- ✅ 创建集成指南和文档
- ✅ 迁移 GaugeChart 到新目录结构
