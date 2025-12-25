/**
 * MetricIcon 组件 - 监测点图标
 *
 * 功能说明：
 * - 根据监测点ID渲染对应的SVG图标
 * - 支持基于状态的颜色变化（normal/warning/critical）
 * - 支持基于状态的动画效果（脉冲/闪烁）
 * - 支持自定义尺寸和样式
 *
 * 主要特性：
 * 1. 自动从图标映射表加载图标
 * 2. 状态驱动的颜色：normal（蓝色）、warning（黄色）、critical（红色）
 * 3. 状态驱动的动画：warning（脉冲）、critical（闪烁）
 * 4. 响应式尺寸支持
 * 5. 优雅的错误处理
 *
 * 应用场景：
 * - MetricCard 组件的图标展示
 * - 监控墙的监测点标识
 * - 告警列表的图标指示
 */

import React, { useMemo } from 'react';
import { getIconForMonitoringPoint, type MonitoringPointId } from './icon-mapping';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * MetricIcon 组件属性接口
 */
export interface MetricIconProps {
  /** 监测点ID，格式：{设备ID}:{监测点名称} */
  monitoringPointId: MonitoringPointId;

  /** 图标尺寸（像素），默认24 */
  size?: number;

  /** 自定义CSS类名 */
  className?: string;

  /** 监测点状态，影响颜色和动画 */
  status?: 'normal' | 'warning' | 'critical';

  /** 数据类型，用于选择占位符图标 */
  dataType?: 'number' | 'boolean';

  /** 是否启用动画效果，默认true */
  animate?: boolean;
}

// ============================================================================
// 颜色配置
// ============================================================================

/**
 * 状态颜色映射
 *
 * 使用 Tailwind CSS 的颜色值，确保与整体设计系统一致
 */
const STATUS_COLORS = {
  normal: '#3b82f6',    // blue-500 - 正常状态蓝色
  warning: '#f59e0b',   // amber-500 - 警告状态黄色
  critical: '#ef4444',  // red-500 - 严重状态红色
} as const;

// ============================================================================
// MetricIcon 组件
// ============================================================================

/**
 * MetricIcon - 监测点图标组件
 *
 * @example
 * ```tsx
 * // 基本用法
 * <MetricIcon monitoringPointId="SYS-BAT-001:total_voltage" />
 *
 * // 自定义尺寸和状态
 * <MetricIcon
 *   monitoringPointId="SYS-BAT-001:soc"
 *   size={48}
 *   status="warning"
 * />
 *
 * // 严重状态（会闪烁）
 * <MetricIcon
 *   monitoringPointId="SYS-PROP-L-001:motor_speed"
 *   status="critical"
 *   animate={true}
 * />
 * ```
 */
export const MetricIcon: React.FC<MetricIconProps> = ({
  monitoringPointId,
  size = 24,
  className = '',
  status = 'normal',
  dataType = 'number',
  animate = true,
}) => {
  // 获取对应的图标组件
  const IconComponent = useMemo(
    () => getIconForMonitoringPoint(monitoringPointId, dataType),
    [monitoringPointId, dataType]
  );

  // 根据状态获取颜色
  const color = STATUS_COLORS[status];

  // 根据监测点ID获取默认动画类型
  const getDefaultAnimation = (id: MonitoringPointId): string => {
    const idLower = id.toLowerCase();

    // 根据监测点类型分配不同的动画效果
    if (idLower.includes('voltage') || idLower.includes('电压')) {
      // 电压类：脉冲或弹跳动画
      return idLower.includes('total') || idLower.includes('总')
        ? 'animate-icon-pulse'
        : 'animate-icon-bounce';
    }

    if (idLower.includes('current') || idLower.includes('电流')) {
      // 电流类：ping动画
      return 'animate-icon-ping';
    }

    if (idLower.includes('temp') || idLower.includes('温度')) {
      // 温度类：发光或旋转动画
      return idLower.includes('ambient') || idLower.includes('环境')
        ? 'animate-slow-spin'
        : 'animate-icon-glow';
    }

    if (idLower.includes('soc') || idLower.includes('soh') || idLower.includes('power') || idLower.includes('功率')) {
      // SOC/功率类：波浪动画
      return 'animate-icon-wave';
    }

    if (idLower.includes('speed') || idLower.includes('转速') || idLower.includes('rpm')) {
      // 转速类：旋转动画
      return 'animate-slow-spin';
    }

    // 默认：轻微脉冲动画
    return 'animate-icon-pulse';
  };

  // 根据状态决定使用的Tailwind动画类
  const animationClass = useMemo(() => {
    if (!animate) return '';

    switch (status) {
      case 'warning':
        return 'animate-icon-pulse'; // 警告状态：强脉冲动画
      case 'critical':
        return 'animate-icon-glow'; // 严重状态：发光闪烁动画
      case 'normal':
      default:
        // 正常状态：使用根据监测点类型分配的默认动画
        return getDefaultAnimation(monitoringPointId);
    }
  }, [status, animate, monitoringPointId]);

  // 组合外层容器CSS类名
  const containerClassName = `metric-icon ${className}`.trim();

  // 渲染图标
  return (
    <div
      className={containerClassName}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color, // 使用 currentColor 控制SVG颜色
      }}
    >
      <IconComponent
        width={size}
        height={size}
        className={animationClass}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default MetricIcon;
