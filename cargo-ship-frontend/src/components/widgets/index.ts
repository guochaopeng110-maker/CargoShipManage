/**
 * 仪表板小组件导出文件
 *
 * 功能说明：
 * - 统一导出所有仪表板小组件
 * - 方便其他页面导入和使用
 * - 提供清晰的公共 API
 *
 * 使用示例：
 * ```typescript
 * import { CriticalMetricsWall, AlarmSummaryWidget, HealthQuickViewWidget } from '@/components/widgets';
 * ```
 *
 * @module components/widgets
 */

// ============================================================================
// 小组件导出
// ============================================================================

// 关键指标墙组件
export { CriticalMetricsWall } from './CriticalMetricsWall';
export type { CriticalMetricsWallProps } from './CriticalMetricsWall';

// 告警摘要小组件
export { AlarmSummaryWidget } from './AlarmSummaryWidget';
export type { AlarmSummaryWidgetProps } from './AlarmSummaryWidget';

// 健康速览小组件
export { HealthQuickViewWidget } from './HealthQuickViewWidget';
export type { HealthQuickViewWidgetProps } from './HealthQuickViewWidget';
