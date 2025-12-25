# 驾控台页面 MetricCard 集成示例

这是在 DashboardPage 中集成 MetricCard 组件的完整示例。

## 步骤 1：导入新组件

在文件顶部添加导入：

```typescript
import { MetricCard } from './visualization';
// 或者
import { MetricCard } from './visualization/MetricCard';
```

## 步骤 2：在系统概览统计之后添加核心监测点section

在return语句中的系统概览统计卡片(大约 line 520 之后)添加：

```tsx
{/* 核心监测点展示 - 使用新的 MetricCard 组件 */}
<div className="space-y-4">
  <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
    <Monitor className="w-5 h-5" />
    核心监测点
  </h2>

  {/* MetricCard 网格布局 */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {/* 电池系统核心指标 */}
    <MetricCard
      monitoringPointId="SYS-BAT-001:total_voltage"
      value={deviceMetrics.voltage}
      unit="V"
      label="总电压"
      status={getStatus(deviceMetrics.voltage, 700, 720)}
      trend={deviceMetrics.voltage > 680 ? 'stable' : 'down'}
    />

    <MetricCard
      monitoringPointId="SYS-BAT-001:soc"
      value={deviceMetrics.soc}
      unit="%"
      label="SOC 荷电状态"
      status={getStatus(100 - deviceMetrics.soc, 20, 10)}
      trend={deviceMetrics.soc > 85 ? 'up' : 'stable'}
    />

    <MetricCard
      monitoringPointId="SYS-BAT-001:battery_temperature"
      value={deviceMetrics.temperature}
      unit="°C"
      label="电池温度"
      status={getStatus(deviceMetrics.temperature, 45, 55)}
      trend={deviceMetrics.temperature > 40 ? 'up' : 'stable'}
    />

    <MetricCard
      monitoringPointId="SYS-BAT-001:battery_current"
      value={120.5}
      unit="A"
      label="电池电流"
      status="normal"
      trend="stable"
    />

    {/* 推进系统核心指标 */}
    <MetricCard
      monitoringPointId="SYS-PROP-L-001:motor_speed"
      value={deviceMetrics.rpmLeft}
      unit="rpm"
      label="左电机转速"
      status={getStatus(deviceMetrics.rpmLeft, 2000, 2500)}
      trend="stable"
    />

    <MetricCard
      monitoringPointId="SYS-PROP-R-001:motor_speed"
      value={deviceMetrics.rpmRight}
      unit="rpm"
      label="右电机转速"
      status={getStatus(deviceMetrics.rpmRight, 2000, 2500)}
      trend="stable"
    />

    <MetricCard
      monitoringPointId="SYS-PROP-L-001:motor_power"
      value={85.3}
      unit="kW"
      label="左电机功率"
      status="normal"
      trend="up"
      trendValue={2.1}
    />

    <MetricCard
      monitoringPointId="SYS-PROP-R-001:motor_power"
      value={82.8}
      unit="kW"
      label="右电机功率"
      status="normal"
      trend="up"
      trendValue={1.8}
    />
  </div>
</div>
```

## 步骤 3：添加点击交互（可选）

可以为 MetricCard 添加点击事件，跳转到对应的详细页面：

```tsx
<MetricCard
  monitoringPointId="SYS-BAT-001:total_voltage"
  value={deviceMetrics.voltage}
  unit="V"
  label="总电压"
  status={getStatus(deviceMetrics.voltage, 700, 720)}
  onClick={() => onNavigate('battery-monitoring')}
/>
```

## 完整位置示例

```tsx
export function DashboardPage({ onNavigate }: DashboardPageProps) {
  // ... existing code ...

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="flex justify-between items-center">
          {/* ... existing title code ... */}
        </div>

        {/* 系统概览统计 - 现有的4个卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* ... existing stats cards ... */}
        </div>

        {/* 🆕 核心监测点 - 在这里插入 MetricCard 组件 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            核心监测点
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MetricCard components here */}
          </div>
        </div>

        {/* 电池系统概览 - 现有的 GaugeChart */}
        <div className="space-y-4">
          {/* ... existing battery charts ... */}
        </div>

        {/* ... rest of the page ... */}
      </div>
    </div>
  );
}
```

## 预期效果

添加后，驾控台页面将显示：
1. 8 个 MetricCard 组件，展示核心监测点
2. 每个卡片都有专属图标
3. 根据状态显示不同颜色和动画
4. 数值变化时平滑过渡
5. 响应式布局，适配不同屏幕尺寸

## 状态判断辅助函数

现有的 `getStatus` 函数已经可以使用：

```typescript
const getStatus = (value: number, warningThreshold: number, criticalThreshold?: number) => {
  if (criticalThreshold && value >= criticalThreshold) return 'critical';
  if (value >= warningThreshold) return 'warning';
  return 'normal';
};
```

## 注意事项

1. 确保 `deviceMetrics` 数据源正确
2. 根据实际业务调整阈值
3. 可以从 `monitoring-store` 获取实时数据
4. 建议逐步替换现有的 GaugeChart，先保留兼容
