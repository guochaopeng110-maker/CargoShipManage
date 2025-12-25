/**
 * MetricCard 组件 - 指标卡片
 *
 * 功能说明：
 * - 作为"监控墙"的基本单元，展示单个监测点的完整信息
 * - 整合图标、数值、状态、趋势等元素
 * - 提供丰富的动画效果和交互反馈
 * - 响应式设计，适配不同屏幕尺寸
 *
 * 主要特性：
 * 1. 完整的监测点信息展示（图标、标签、数值、单位、趋势）
 * 2. 状态驱动的视觉反馈（颜色、边框、动画）
 * 3. 平滑的数值变化动画
 * 4. 悬停效果和点击交互
 * 5. 响应式布局（桌面/平板/手机）
 *
 * 应用场景：
 * - 驾控台页面的核心指标展示
 * - 监控页面的监测点网格
 * - 告警中心的指标卡片
 */

import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '../ui/card';
import { MetricIcon } from './icons/MetricIcon';
import type { MonitoringPointId } from './icons/icon-mapping';
import {
  pulseVariant,
  blinkVariant,
  fastTransition,
  normalTransition,
} from './animations';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * MetricCard 组件属性接口
 */
export interface MetricCardProps {
  /** 监测点ID */
  monitoringPointId: MonitoringPointId;

  /** 当前数值 */
  value: number;

  /** 数值单位 */
  unit: string;

  /** 显示标签（监测点名称） */
  label: string;

  /** 监测点状态 */
  status?: 'normal' | 'warning' | 'critical';

  /** 趋势方向 */
  trend?: 'up' | 'down' | 'stable';

  /** 趋势数值（如 +2.5V） */
  trendValue?: number;

  /** 数据类型 */
  dataType?: 'number' | 'boolean';

  /** 点击回调 */
  onClick?: () => void;

  /** 是否紧凑模式（用于小屏幕） */
  compact?: boolean;

  /** 自定义CSS类名 */
  className?: string;
}

// ============================================================================
// 颜色配置
// ============================================================================

/**
 * 状态颜色映射
 * 使用深色半透明背景，符合海事工业主题
 */
const STATUS_COLORS = {
  normal: {
    border: '#3b82f6',           // blue-500
    bg: 'rgba(59, 130, 246, 0.15)',  // blue-500/15 - 深色半透明蓝色
    bgGradient: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))', // blue渐变
    text: '#bfdbfe',             // blue-200 - 更亮蓝色文字
  },
  warning: {
    border: '#f59e0b',           // amber-500
    bg: 'rgba(245, 158, 11, 0.15)',  // amber-500/15 - 深色半透明黄色
    bgGradient: 'linear-gradient(to bottom right, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))', // amber渐变
    text: '#fcd34d',             // amber-300 - 亮黄色文字
  },
  critical: {
    border: '#ef4444',           // red-500
    bg: 'rgba(239, 68, 68, 0.15)',   // red-500/15 - 深色半透明红色
    bgGradient: 'linear-gradient(to bottom right, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))', // red渐变
    text: '#fca5a5',             // red-300 - 亮红色文字
  },
} as const;

/**
 * 趋势颜色映射
 */
const TREND_COLORS = {
  up: '#10b981',    // green-500
  down: '#ef4444',  // red-500
  stable: '#6b7280', // gray-500
} as const;

// ============================================================================
// MetricCard 组件
// ============================================================================

/**
 * MetricCard - 指标卡片组件
 *
 * @example
 * ```tsx
 * // 基本用法
 * <MetricCard
 *   monitoringPointId="SYS-BAT-001:total_voltage"
 *   value={650}
 *   unit="V"
 *   label="总电压"
 * />
 *
 * // 带状态和趋势
 * <MetricCard
 *   monitoringPointId="SYS-BAT-001:soc"
 *   value={75}
 *   unit="%"
 *   label="SOC荷电状态"
 *   status="warning"
 *   trend="down"
 *   trendValue={-2}
 * />
 *
 * // 带点击事件
 * <MetricCard
 *   monitoringPointId="SYS-PROP-L-001:motor_speed"
 *   value={1500}
 *   unit="rpm"
 *   label="电机转速"
 *   status="critical"
 *   onClick={() => console.log('Clicked')}
 * />
 * ```
 */
export const MetricCard: React.FC<MetricCardProps> = React.memo(({
  monitoringPointId,
  value,
  unit,
  label,
  status = 'normal',
  trend,
  trendValue,
  dataType = 'number',
  onClick,
  compact = false,
  className = '',
}) => {
  // 使用弹簧动画实现平滑的数值变化
  const spring = useSpring(value, {
    stiffness: 100,
    damping: 15,
    mass: 1,
  });

  // 更新弹簧目标值
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  // 将弹簧值转换为显示文本（保留1位小数）
  const displayValue = useTransform(spring, (latest) =>
    latest.toFixed(1)
  );

  // 获取状态对应的颜色
  const colors = STATUS_COLORS[status];

  // 根据状态决定边框动画变体
  const borderVariant = status === 'warning' ? pulseVariant : status === 'critical' ? blinkVariant : undefined;

  // 趋势图标组件
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend ? TREND_COLORS[trend] : undefined;

  // 组合CSS类名
  const combinedClassName = `metric-card ${compact ? 'compact' : ''} ${className}`.trim();

  // 卡片内容
  return (
    <motion.div
      className={combinedClassName}
      // 淡入动画
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={normalTransition}
      // Hover缩放效果
      whileHover={{ scale: 1.05 }}
      // 点击事件
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <Card
        className="relative overflow-hidden"
        style={{
          background: colors.bgGradient,  // 使用渐变背景
          borderColor: colors.border,
          borderWidth: 2,
          borderStyle: 'solid',
        }}
      >
        {/* 边框动画容器 */}
        {borderVariant && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderColor: colors.border,
              borderWidth: 2,
              borderStyle: 'solid',
              borderRadius: 'inherit',
            }}
            variants={borderVariant}
            initial="initial"
            animate="animate"
          />
        )}

        {/* 卡片内容 */}
        <div className={`p-${compact ? '3' : '4'} space-y-${compact ? '2' : '3'}`}>
          {/* 顶部：图标 + 标签 */}
          <div className="flex items-center justify-between">
            {/* 图标 */}
            <MetricIcon
              monitoringPointId={monitoringPointId}
              size={compact ? 24 : 32}
              status={status}
              dataType={dataType}
              animate={true}
            />

            {/* 状态徽章 */}
            {status !== 'normal' && (
              <motion.div
                className="flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={fastTransition}
              >
                <div
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${colors.border}40`, // 使用边框颜色+透明度
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  {status === 'warning' ? '警告' : '严重'}
                </div>
              </motion.div>
            )}
          </div>

          {/* 中部：标签 */}
          <div
            className={`text-${compact ? 'xs' : 'sm'} font-medium truncate`}
            style={{ color: colors.text }}
            title={label}
          >
            {label}
          </div>

          {/* 中下：数值 + 单位 */}
          <div className="flex items-baseline space-x-1">
            <motion.span
              className={`text-${compact ? '2xl' : '3xl'} font-bold tabular-nums`}
              style={{ color: colors.text }}
            >
              {displayValue}
            </motion.span>
            <span
              className={`text-${compact ? 'sm' : 'base'} font-medium`}
              style={{ color: colors.text }}
            >
              {unit}
            </span>
          </div>

          {/* 底部：趋势 */}
          {trend && (
            <motion.div
              className="flex items-center space-x-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={normalTransition}
            >
              <TrendIcon
                size={compact ? 14 : 16}
                style={{ color: trendColor }}
              />
              {trendValue !== undefined && (
                <span
                  className={`text-${compact ? 'xs' : 'sm'} font-medium tabular-nums`}
                  style={{ color: trendColor }}
                >
                  {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}{unit}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
});

// 设置显示名称（用于调试）
MetricCard.displayName = 'MetricCard';

// ============================================================================
// 默认导出
// ============================================================================

export default MetricCard;
