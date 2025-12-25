# 可视化组件集成指南

本文档说明如何在驾控台页面和监控页面中集成新的可视化组件。

---

## 快速开始

### 1. 导入组件

```tsx
import { MetricCard, MetricIcon } from './visualization';
import { useMonitoringStore } from '../stores/monitoring-store';
```

### 2. 基本使用

```tsx
<MetricCard
  monitoringPointId="SYS-BAT-001:total_voltage"
  value={650}
  unit="V"
  label="总电压"
  status="normal"
/>
```

---

## 驾控台页面集成 (DashboardPage)

### 建议集成位置

在系统概览统计卡片之后，添加"核心监测点"部分。

### 代码示例

```tsx
export function DashboardPage({ onNavigate }: DashboardPageProps) {
  // ... 现有代码 ...

  // 从 monitoring-store 获取监测点数据
  const batteryData = useMonitoringStore(state => state.getMetricData('SYS-BAT-001'));
  const propulsionLeftData = useMonitoringStore(state => state.getMetricData('SYS-PROP-L-001'));
  const propulsionRightData = useMonitoringStore(state => state.getMetricData('SYS-PROP-R-001'));

  // 获取特定监测点的数值
  const totalVoltage = batteryData?.metrics?.find(m => m.id === 'total_voltage')?.value || 0;
  const soc = batteryData?.metrics?.find(m => m.id === 'soc')?.value || 0;
  const motorSpeedLeft = propulsionLeftData?.metrics?.find(m => m.id === 'motor_speed')?.value || 0;
  const motorSpeedRight = propulsionRightData?.metrics?.find(m => m.id === 'motor_speed')?.value || 0;

  // 判断状态（基于阈值）
  const getVoltageStatus = (voltage: number) => {
    if (voltage < 600) return 'critical';
    if (voltage < 650) return 'warning';
    return 'normal';
  };

  const getSocStatus = (soc: number) => {
    if (soc < 20) return 'critical';
    if (soc < 30) return 'warning';
    return 'normal';
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ... 现有的标题和系统概览卡片 ... */}

        {/* 新增：核心监测点 */}
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">核心监测点</h2>

          {/* 监测点网格 - 响应式布局 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 电池总电压 */}
            <MetricCard
              monitoringPointId="SYS-BAT-001:total_voltage"
              value={totalVoltage}
              unit="V"
              label="总电压"
              status={getVoltageStatus(totalVoltage)}
              onClick={() => onNavigate('battery-monitoring')}
            />

            {/* 电池SOC */}
            <MetricCard
              monitoringPointId="SYS-BAT-001:soc"
              value={soc}
              unit="%"
              label="SOC荷电状态"
              status={getSocStatus(soc)}
              trend={soc > 50 ? 'up' : soc < 50 ? 'down' : 'stable'}
              trendValue={2.5}
              onClick={() => onNavigate('battery-monitoring')}
            />

            {/* 左电机转速 */}
            <MetricCard
              monitoringPointId="SYS-PROP-L-001:motor_speed"
              value={motorSpeedLeft}
              unit="rpm"
              label="左电机转速"
              status="normal"
              onClick={() => onNavigate('propulsion-left-monitoring')}
            />

            {/* 右电机转速 */}
            <MetricCard
              monitoringPointId="SYS-PROP-R-001:motor_speed"
              value={motorSpeedRight}
              unit="rpm"
              label="右电机转速"
              status="normal"
              onClick={() => onNavigate('propulsion-right-monitoring')}
            />
          </div>
        </div>

        {/* ... 现有的其他部分 ... */}
      </div>
    </div>
  );
}
```

### 响应式网格配置

```tsx
// 桌面端：4 列
// 平板端：3 列
// 手机端：2 列
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

### 推荐展示的核心监测点（8-12个）

1. **电池系统** (4个)
   - SYS-BAT-001:total_voltage - 总电压
   - SYS-BAT-001:soc - SOC荷电状态
   - SYS-BAT-001:battery_temperature - 电池温度
   - SYS-BAT-001:battery_current - 电池电流

2. **推进系统** (4个)
   - SYS-PROP-L-001:motor_speed - 左电机转速
   - SYS-PROP-R-001:motor_speed - 右电机转速
   - SYS-PROP-L-001:motor_power - 左电机功率
   - SYS-PROP-R-001:motor_power - 右电机功率

3. **配电系统** (2个)
   - SYS-DCPD-001:dc_busbar_voltage - 直流母排电压
   - SYS-DCPD-001:dc_busbar_current - 直流母排电流

---

## 监控页面集成 (BatteryMonitoringPage 等)

### 建议集成方式

在监控页面使用"监控墙"布局，展示该系统的所有监测点。

### 代码示例 - 电池监控页面

```tsx
export function BatteryMonitoringPage() {
  // 从 store 获取电池系统数据
  const batteryData = useMonitoringStore(state => state.getMetricData('SYS-BAT-001'));

  // 定义要展示的监测点配置
  const monitoringPoints = [
    { id: 'total_voltage', label: '总电压', unit: 'V' },
    { id: 'cell_voltage', label: '单体电压', unit: 'V' },
    { id: 'battery_temperature', label: '电池温度', unit: '°C' },
    { id: 'battery_current', label: '电池电流', unit: 'A' },
    { id: 'soc', label: 'SOC荷电状态', unit: '%' },
    { id: 'insulation_resistance', label: '绝缘电阻', unit: 'kΩ' },
    // ... 更多监测点
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">电池系统监控</h1>

        {/* 监控墙 */}
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-4">实时监测点</h2>

          {/* 监测点网格 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {monitoringPoints.map((point) => {
              // 从数据中获取当前监测点的值
              const metric = batteryData?.metrics?.find(m => m.id === point.id);
              const value = metric?.value || 0;
              const status = metric?.status || 'normal';

              return (
                <MetricCard
                  key={point.id}
                  monitoringPointId={`SYS-BAT-001:${point.id}`}
                  value={value}
                  unit={point.unit}
                  label={point.label}
                  status={status}
                />
              );
            })}
          </div>
        </div>

        {/* 保留现有的 GaugeChart 展示关键指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GaugeChart
            value={batteryData?.metrics?.find(m => m.id === 'soc')?.value || 0}
            maxValue={100}
            label="SOC"
            unit="%"
            type="semicircle"
          />
          {/* ... 更多 GaugeChart */}
        </div>
      </div>
    </div>
  );
}
```

---

## 状态判断逻辑

### 方式一：使用 monitoring-store 中的状态

```tsx
// 如果 store 已经计算好了状态
const metric = batteryData?.metrics?.find(m => m.id === 'total_voltage');
const status = metric?.status || 'normal';
```

### 方式二：手动计算状态

```tsx
// 根据阈值手动判断
const getStatus = (value: number, warning: number, critical: number): 'normal' | 'warning' | 'critical' => {
  if (value >= critical) return 'critical';
  if (value >= warning) return 'warning';
  return 'normal';
};

const voltageStatus = getStatus(totalVoltage, 700, 750);
```

---

## 动画效果测试

### 测试数值变化动画

```tsx
// 使用定时器模拟数值变化
useEffect(() => {
  const interval = setInterval(() => {
    // 更新 store 中的数据，MetricCard 会自动响应
    updateMetricValue('SYS-BAT-001', 'total_voltage', Math.random() * 100 + 600);
  }, 2000);

  return () => clearInterval(interval);
}, []);
```

### 测试状态变化动画

```tsx
// 模拟状态变化
const [status, setStatus] = useState<'normal' | 'warning' | 'critical'>('normal');

useEffect(() => {
  const interval = setInterval(() => {
    setStatus(prev => {
      if (prev === 'normal') return 'warning';
      if (prev === 'warning') return 'critical';
      return 'normal';
    });
  }, 3000);

  return () => clearInterval(interval);
}, []);
```

---

## 响应式布局建议

### 驾控台页面
- **桌面** (≥1024px): 4 列
- **平板** (768-1023px): 3 列
- **手机** (<768px): 2 列

```tsx
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
```

### 监控页面（监控墙）
- **超大屏** (≥1280px): 5 列
- **桌面** (1024-1279px): 4 列
- **平板** (768-1023px): 3 列
- **手机** (<768px): 2 列

```tsx
className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
```

---

## 性能优化建议

### 1. 使用 React.memo

MetricCard 组件已经使用了 `React.memo`，确保只在 props 变化时重新渲染。

### 2. 避免不必要的重渲染

```tsx
// 好的做法：使用 selector 精确订阅
const totalVoltage = useMonitoringStore(
  state => state.getMetricData('SYS-BAT-001')?.metrics?.find(m => m.id === 'total_voltage')?.value || 0
);

// 不好的做法：订阅整个 store
const allData = useMonitoringStore(state => state);
```

### 3. 分批渲染

如果监测点很多（>20个），考虑使用虚拟滚动或分页：

```tsx
// 使用 react-window 或 react-virtualized
import { FixedSizeGrid } from 'react-window';
```

---

## 常见问题

### Q1: 图标显示为占位符图标？

**A**: 这是正常的。只有部分关键监测点实现了专属图标，其他监测点使用占位符图标。可以根据需要在 `src/components/visualization/icons/svg/` 中添加新图标。

### Q2: 动画不流畅？

**A**: 确保：
1. 使用了 GPU 加速的属性（transform, opacity）
2. 同时展示的 MetricCard 数量不超过 30 个
3. 数值更新频率不超过 1Hz

### Q3: 如何自定义颜色？

**A**: 在 MetricCard.tsx 中修改 STATUS_COLORS 常量：

```tsx
const STATUS_COLORS = {
  normal: {
    border: '#3b82f6',   // 修改为你的颜色
    // ...
  },
  // ...
};
```

---

## 下一步

1. 在 DashboardPage 中添加核心监测点展示
2. 在各个监控页面中使用 MetricCard 创建监控墙
3. 根据实际需求调整网格布局和监测点数量
4. 补充更多专属图标（可选）

---

## 相关文档

- [图标设计方案](./icons/ICON_DESIGN_PLAN.md)
- [动画系统文档](./animations.ts)
- [监测点定义](../../../docs/data/monitoring_and_alarm_definitions.md)
