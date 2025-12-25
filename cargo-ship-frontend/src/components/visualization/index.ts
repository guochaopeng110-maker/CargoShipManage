/**
 * 可视化组件统一导出
 *
 * 功能说明：
 * - 提供所有可视化组件的统一导出
 * - 简化其他页面的导入语句
 *
 * 使用方式：
 * ```tsx
 * import { MetricCard, MetricIcon, GaugeChart } from './visualization';
 * ```
 */

// 核心组件
export { MetricCard } from './MetricCard';
export type { MetricCardProps } from './MetricCard';

export { MetricIcon } from './icons/MetricIcon';
export type { MetricIconProps } from './icons/MetricIcon';

export { GaugeChart } from './GaugeChart';

// 图标映射
export { getIconForMonitoringPoint, hasCustomIcon, getIconStats } from './icons/icon-mapping';
export type { MonitoringPointId, IconComponent, IconMap } from './icons/icon-mapping';

// 动画系统
export * from './animations';
