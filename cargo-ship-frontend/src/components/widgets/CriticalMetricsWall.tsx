/**
 * CriticalMetricsWall 组件 - 关键指标墙
 *
 * 功能说明：
 * - 作为仪表板的核心组件，展示全船最关键的 8 个监测点指标
 * - 跨系统的"超级仪表盘"，提供整船生命体征的快速概览
 * - 使用 MetricCard 组件矩阵进行模块化展示
 * - 支持响应式布局，适配不同屏幕尺寸
 *
 * 主要特性：
 * 1. 从 monitoring-store 获取实时监测数据
 * 2. 展示 6 大系统的核心指标（共 8 个）
 * 3. 响应式网格布局（小屏1列、中屏2列、大屏4列）
 * 4. 支持点击导航到详细页面
 * 5. 数据有效性检查和降级处理
 *
 * 关键指标选择（覆盖 6 大系统）：
 * - 电池系统（2个）：总电压、SOC
 * - 推进系统（2个）：左电机转速、右电机转速
 * - 逆变器系统（1个）：逆变器温度
 * - 直流配电板（1个）：母线电压
 * - 水泵系统（1个）：主水泵压力
 * - 冷却系统（1个）：冷却液温度
 *
 * @module components/widgets/CriticalMetricsWall
 */

import React, { useMemo } from 'react';
import { MetricCard } from '../visualization/MetricCard';
import { useMonitoringStore } from '../../stores/monitoring-store';
import type { MonitoringPointId } from '../visualization/icons/icon-mapping';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * CriticalMetricsWall 组件属性接口
 */
export interface CriticalMetricsWallProps {
  /**
   * 指标点击回调
   * @param monitoringPointId 监测点ID
   */
  onMetricClick?: (monitoringPointId: string) => void;

  /**
   * 自定义CSS类名
   */
  className?: string;
}

/**
 * 关键指标定义
 */
interface CriticalMetric {
  /** 监测点ID */
  id: MonitoringPointId;
  /** 显示标签 */
  label: string;
  /** 单位 */
  unit: string;
  /** 目标页面（用于导航） */
  targetPage: 'battery' | 'propulsion' | 'inverter' | 'power-distribution' | 'auxiliary';
  /** 警告阈值 */
  warningThreshold?: number;
  /** 严重阈值 */
  criticalThreshold?: number;
  /** 阈值比较方式：'greater' 表示超过阈值告警，'less' 表示低于阈值告警 */
  thresholdMode?: 'greater' | 'less';
}

// ============================================================================
// 关键指标配置
// ============================================================================

/**
 * 全船关键指标配置
 * 精心挑选的 8 个最核心监测点，覆盖 6 大系统
 *
 * 系统分布：
 * - 电池系统：2个（总电压、SOC）
 * - 推进系统：2个（左右电机转速）
 * - 逆变器系统：1个（逆变器温度）
 * - 直流配电板：1个（母线电压）
 * - 水泵系统：1个（主水泵压力）
 * - 冷却系统：1个（冷却液温度）
 */
const CRITICAL_METRICS: CriticalMetric[] = [
  // 电池系统 (2个) - 最核心的电源指标
  {
    id: 'SYS-BAT-001:total_voltage',
    label: '电池总电压',
    unit: 'V',
    targetPage: 'battery',
    warningThreshold: 700,
    criticalThreshold: 720,
    thresholdMode: 'greater',
  },
  {
    id: 'SYS-BAT-001:soc',
    label: 'SOC 荷电状态',
    unit: '%',
    targetPage: 'battery',
    warningThreshold: 20,
    criticalThreshold: 10,
    thresholdMode: 'less',
  },

  // 推进系统 (2个) - 左右电机转速
  {
    id: 'SYS-PROP-L-001:motor_speed',
    label: '左电机转速',
    unit: 'rpm',
    targetPage: 'propulsion',
    warningThreshold: 1800,
    criticalThreshold: 1900,
    thresholdMode: 'greater',
  },
  {
    id: 'SYS-PROP-R-001:motor_speed',
    label: '右电机转速',
    unit: 'rpm',
    targetPage: 'propulsion',
    warningThreshold: 1800,
    criticalThreshold: 1900,
    thresholdMode: 'greater',
  },

  // 逆变器系统 (1个) - 逆变器温度
  {
    id: 'SYS-INV-001:inverter_temperature',
    label: '逆变器温度',
    unit: '°C',
    targetPage: 'inverter',
    warningThreshold: 65,
    criticalThreshold: 75,
    thresholdMode: 'greater',
  },

  // 直流配电板 (1个) - 母线电压
  {
    id: 'SYS-PWR-001:bus_voltage',
    label: '母线电压',
    unit: 'V',
    targetPage: 'power-distribution',
    warningThreshold: 650,
    criticalThreshold: 630,
    thresholdMode: 'less',
  },

  // 水泵系统 (1个) - 主水泵压力
  {
    id: 'SYS-PUMP-001:pump_pressure',
    label: '主水泵压力',
    unit: 'bar',
    targetPage: 'auxiliary',
    warningThreshold: 4.5,
    criticalThreshold: 5.0,
    thresholdMode: 'greater',
  },

  // 冷却系统 (1个) - 冷却液温度
  {
    id: 'SYS-COOL-001:coolant_temperature',
    label: '冷却液温度',
    unit: '°C',
    targetPage: 'auxiliary',
    warningThreshold: 45,
    criticalThreshold: 55,
    thresholdMode: 'greater',
  },
];

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据数值和阈值判断状态
 *
 * @param value 当前数值
 * @param metric 指标配置
 * @returns 状态：'normal' | 'warning' | 'critical'
 */
function getMetricStatus(
  value: number,
  metric: CriticalMetric
): 'normal' | 'warning' | 'critical' {
  const { warningThreshold, criticalThreshold, thresholdMode = 'greater' } = metric;

  if (!warningThreshold || !criticalThreshold) {
    return 'normal';
  }

  if (thresholdMode === 'greater') {
    // 超过阈值告警（如：温度、转速）
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
  } else {
    // 低于阈值告警（如：SOC）
    if (value <= criticalThreshold) return 'critical';
    if (value <= warningThreshold) return 'warning';
  }

  return 'normal';
}

/**
 * 计算趋势方向
 *
 * @param current 当前值
 * @param previous 前一个值（如果有）
 * @returns 趋势：'up' | 'down' | 'stable'
 */
function getTrend(current: number, previous?: number): 'up' | 'down' | 'stable' {
  if (!previous) return 'stable';

  const change = current - previous;
  const threshold = Math.abs(current) * 0.01; // 1% 变化阈值

  if (Math.abs(change) < threshold) return 'stable';
  return change > 0 ? 'up' : 'down';
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * CriticalMetricsWall 组件
 *
 * 展示全船最关键的监测点指标，提供实时状态概览
 */
export const CriticalMetricsWall: React.FC<CriticalMetricsWallProps> = React.memo(({
  onMetricClick,
  className = '',
}) => {
  // 从 monitoring-store 获取设备数据
  const devices = useMonitoringStore(state => state.devices);
  const lastUpdate = useMonitoringStore(state => state.lastUpdate);

  // 渲染指标卡片
  const renderMetricCards = useMemo(() => {
    return CRITICAL_METRICS.map((metric) => {
      // 从监测点ID提取设备ID（格式：SYS-BAT-001:total_voltage）
      const [deviceId] = metric.id.split(':');
      const device = devices[deviceId];

      // 从 dataPoints 数组中查找特定监测点的数据
      const metricData = device?.dataPoints?.find(dp => dp.id === metric.id);

      // 如果没有数据，显示默认值
      const value = metricData?.value ?? 0;
      // 注意：MetricReading 没有 previousValue 字段，这里设为 undefined
      const previousValue = undefined;

      // 计算状态和趋势
      const status = getMetricStatus(value, metric);
      const trend = getTrend(value, previousValue);
      const trendValue = previousValue ? value - previousValue : undefined;

      // 处理点击事件
      const handleClick = () => {
        if (onMetricClick) {
          onMetricClick(metric.id);
        }
      };

      return (
        <MetricCard
          key={metric.id}
          monitoringPointId={metric.id}
          value={value}
          unit={metric.unit}
          label={metric.label}
          status={status}
          trend={trend}
          trendValue={trendValue}
          onClick={handleClick}
        />
      );
    });
  }, [devices, onMetricClick]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">
          核心监测点
        </h2>
        {lastUpdate && (
          <span className="text-xs text-slate-400">
            更新时间：{new Date(lastUpdate).toLocaleTimeString('zh-CN')}
          </span>
        )}
      </div>

      {/* MetricCard 网格布局 */}
      {/* 响应式：小屏1列、中屏2列、大屏4列 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderMetricCards}
      </div>
    </div>
  );
});

// 设置显示名称（用于React DevTools调试）
CriticalMetricsWall.displayName = 'CriticalMetricsWall';
