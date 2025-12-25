/**
 * MonitoringWall 组件 - 监控墙 (重构版 - 对齐标准中文契约)
 *
 * 功能说明：
 * - 以响应式网格布局展示设备的所有监测点指标
 * - 使用标准中文名称作为 ID 映射键，对齐全链路数据流
 * - 从 monitoring-store 获取实时数据，支持动态刷新
 * - 自动适配 8 个核心系统的不同监测点配置
 *
 * 组件职责：
 * - 定义各系统的监测点标准配置
 * - 管理监测点数据的实时订阅与展示逻辑
 * - 处理加载、错误、空状态的视觉反馈
 *
 * @author 货船智能机舱管理系统开发团队
 */

import React, { useMemo } from 'react';
import { useMonitoringStore } from '../../stores/monitoring-store';
import MetricCard from '../visualization/MetricCard';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { MonitoringPointId } from '../visualization/icons/icon-mapping';

// ============================================================================
// 类型定义
// ============================================================================

interface ColumnCountConfig {
  desktop?: number;
  tablet?: number;
  mobile?: number;
}

export interface MonitoringWallProps {
  equipmentId: string;
  title?: string;
  columnCount?: ColumnCountConfig;
  className?: string;
}

/**
 * 监测点基础配置接口
 * 用于确保所有预定义指标数组具有统一的类型结构
 */
interface MonitoringPointConfig {
  id: string;
  label: string;
  unit: string;
  dataType?: 'number' | 'boolean';
}

// ============================================================================
// 监测点标准配置 (对齐 docs/data/monitoring_point_definition.md)
// ============================================================================

// 1. 电池系统 (SYS-BAT-001) - 18个监测点
const BATTERY_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-BAT-001:总电压', label: '总电压', unit: 'V' },
  { id: 'SYS-BAT-001:单体电压', label: '单体电压', unit: 'V' },
  { id: 'SYS-BAT-001:电池温度', label: '电池温度', unit: '°C' },
  { id: 'SYS-BAT-001:电池电流', label: '电池电流', unit: 'A' },
  { id: 'SYS-BAT-001:SOC荷电状态', label: 'SOC', unit: '%' },
  { id: 'SYS-BAT-001:绝缘电阻', label: '绝缘电阻', unit: 'kΩ' },
  { id: 'SYS-BAT-001:环境温度', label: '环境温度', unit: '°C' },
  { id: 'SYS-BAT-001:独立环境温度', label: '独立环温', unit: '°C' },
  { id: 'SYS-BAT-001:单体温度', label: '单体温度', unit: '°C' },
  { id: 'SYS-BAT-001:保护功能故障', label: '保护故障', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:温度检测故障', label: '温度检测', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:充电故障', label: '充电故障', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:电池系统故障', label: '系统状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:接触器故障', label: '接触器', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:BMS通信故障', label: '通信状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:能量流动状态', label: '能量流', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:BMS控制电源故障', label: '控制电源', unit: '', dataType: 'boolean' },
  { id: 'SYS-BAT-001:SOH', label: 'SOH', unit: '%' },
];

// 2. 左推进系统 (SYS-PROP-L-001) - 14个监测点
const PROPULSION_LEFT_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-PROP-L-001:电机电压', label: '电机电压', unit: 'V' },
  { id: 'SYS-PROP-L-001:电机转速', label: '电机转速', unit: 'rpm' },
  { id: 'SYS-PROP-L-001:电机频率', label: '电机频率', unit: 'Hz' },
  { id: 'SYS-PROP-L-001:电机功率', label: '电机功率', unit: 'kW' },
  { id: 'SYS-PROP-L-001:逆变器电压', label: '逆变器电压', unit: 'V' },
  { id: 'SYS-PROP-L-001:逆变器电流', label: '逆变器电流', unit: 'A' },
  { id: 'SYS-PROP-L-001:逆变器故障', label: '逆变器故障', unit: '', dataType: 'boolean' },
  { id: 'SYS-PROP-L-001:熔断器状态', label: '熔断器状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-PROP-L-001:前轴承温度', label: '前轴承温', unit: '°C' },
  { id: 'SYS-PROP-L-001:后轴承温度', label: '后轴承温', unit: '°C' },
  { id: 'SYS-PROP-L-001:定子绕组温度', label: '绕组温度', unit: '°C' },
  { id: 'SYS-PROP-L-001:逆变器温度', label: '柜内温度', unit: '°C' },
  { id: 'SYS-PROP-L-001:电机运行状态', label: '运行状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-PROP-L-001:电机电流', label: '电机电流', unit: 'A' },
];

// 3. 右推进系统 (SYS-PROP-R-001) - 14个监测点
const PROPULSION_RIGHT_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-PROP-R-001:电机电压', label: '电机电压', unit: 'V' },
  { id: 'SYS-PROP-R-001:电机转速', label: '电机转速', unit: 'rpm' },
  { id: 'SYS-PROP-R-001:电机频率', label: '电机频率', unit: 'Hz' },
  { id: 'SYS-PROP-R-001:电机功率', label: '电机功率', unit: 'kW' },
  { id: 'SYS-PROP-R-001:逆变器电压', label: '逆变器电压', unit: 'V' },
  { id: 'SYS-PROP-R-001:逆变器电流', label: '逆变器电流', unit: 'A' },
  { id: 'SYS-PROP-R-001:逆变器故障', label: '逆变器故障', unit: '', dataType: 'boolean' },
  { id: 'SYS-PROP-R-001:熔断器状态', label: '熔断器状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-PROP-R-001:前轴承温度', label: '前轴承温', unit: '°C' },
  { id: 'SYS-PROP-R-001:后轴承温度', label: '后轴承温', unit: '°C' },
  { id: 'SYS-PROP-R-001:定子绕组温度', label: '绕组温度', unit: '°C' },
  { id: 'SYS-PROP-R-001:逆变器温度', label: '柜内温度', unit: '°C' },
  { id: 'SYS-PROP-R-001:电机运行状态', label: '运行状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-PROP-R-001:电机电流', label: '电机电流', unit: 'A' },
];

// 4. 1#日用逆变器 (SYS-INV-1-001) - 9个监测点
const INVERTER_1_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-INV-1-001:输入直流电压', label: '直流输入', unit: 'V' },
  { id: 'SYS-INV-1-001:输出交流电压', label: '交流输出', unit: 'V' },
  { id: 'SYS-INV-1-001:输出交流电流', label: '交流电流', unit: 'A' },
  { id: 'SYS-INV-1-001:输出交流频率', label: '输出频率', unit: 'Hz' },
  { id: 'SYS-INV-1-001:逆变器过电流', label: '过流值', unit: 'A' },
  { id: 'SYS-INV-1-001:过载电流', label: '过载值', unit: 'A' },
  { id: 'SYS-INV-1-001:电抗器温度', label: '电抗器温', unit: '°C' },
  { id: 'SYS-INV-1-001:输出功率', label: '输出功率', unit: 'kW' },
  { id: 'SYS-INV-1-001:隔离开关', label: '隔离开关', unit: '', dataType: 'boolean' },
];

// 5. 2#日用逆变器 (SYS-INV-2-001) - 9个监测点
const INVERTER_2_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-INV-2-001:输入直流电压', label: '直流输入', unit: 'V' },
  { id: 'SYS-INV-2-001:输出交流电压', label: '交流输出', unit: 'V' },
  { id: 'SYS-INV-2-001:输出交流电流', label: '交流电流', unit: 'A' },
  { id: 'SYS-INV-2-001:输出交流频率', label: '输出频率', unit: 'Hz' },
  { id: 'SYS-INV-2-001:逆变器过电流', label: '过流值', unit: 'A' },
  { id: 'SYS-INV-2-001:过载电流', label: '过载值', unit: 'A' },
  { id: 'SYS-INV-2-001:电抗器温度', label: '电抗器温', unit: '°C' },
  { id: 'SYS-INV-2-001:输出功率', label: '输出功率', unit: 'kW' },
  { id: 'SYS-INV-2-001:隔离开关', label: '隔离开关', unit: '', dataType: 'boolean' },
];

// 6. 直流配电板 (SYS-DCPD-001) - 9个监测点
const DCPD_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-DCPD-001:绝缘电阻', label: '绝缘电阻', unit: 'kΩ' },
  { id: 'SYS-DCPD-001:直流母排电压', label: '母排电压', unit: 'V' },
  { id: 'SYS-DCPD-001:直流母排电流', label: '母排电流', unit: 'A' },
  { id: 'SYS-DCPD-001:直流母排功率', label: '母排功率', unit: 'kW' },
  { id: 'SYS-DCPD-001:冷却系统故障', label: '冷却故障', unit: '', dataType: 'boolean' },
  { id: 'SYS-DCPD-001:熔断器跳闸', label: '熔断器跳闸', unit: '', dataType: 'boolean' },
  { id: 'SYS-DCPD-001:熔断器状态', label: '熔断器状态', unit: '', dataType: 'boolean' },
  { id: 'SYS-DCPD-001:EMS综合故障', label: 'EMS故障', unit: '', dataType: 'boolean' },
  { id: 'SYS-DCPD-001:电池电量', label: '电池电量', unit: '%' },
];

// 7. 舱底水系统 (SYS-BILGE-001) - 4个监测点
const BILGE_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-BILGE-001:1#集水井水位', label: '1#集水井', unit: 'mm' },
  { id: 'SYS-BILGE-001:2#集水井水位', label: '2#集水井', unit: 'mm' },
  { id: 'SYS-BILGE-001:3#集水井水位', label: '3#集水井', unit: 'mm' },
  { id: 'SYS-BILGE-001:4#集水井水位', label: '4#集水井', unit: 'mm' },
];

// 8. 冷却水系统 (SYS-COOL-001) - 5个监测点
const COOL_POINTS: MonitoringPointConfig[] = [
  { id: 'SYS-COOL-001:1#冷却水泵失电', label: '1#泵失电', unit: '', dataType: 'boolean' },
  { id: 'SYS-COOL-001:1#冷却水温', label: '1#水温', unit: '°C' },
  { id: 'SYS-COOL-001:2#冷却水泵失电', label: '2#泵失电', unit: '', dataType: 'boolean' },
  { id: 'SYS-COOL-001:2#冷却水温', label: '2#水温', unit: '°C' },
  { id: 'SYS-COOL-001:冷却水压力', label: '系统压力', unit: 'MPa' },
];

// ============================================================================
// MonitoringWall 组件实现
// ============================================================================

export const MonitoringWall: React.FC<MonitoringWallProps> = React.memo(({
  equipmentId,
  title,
  columnCount: userColumnCount,
  className = '',
}) => {
  // 合并默认列配置
  const columnCount = {
    desktop: 4,
    tablet: 2,
    mobile: 1,
    ...userColumnCount
  };

  const { data, loading, error } = useMonitoringStore((state) => ({
    data: state.data,
    loading: state.loading,
    error: state.error,
  }));

  // 根据设备ID获取对应的监测点配置
  const points = useMemo<MonitoringPointConfig[]>(() => {
    switch (equipmentId) {
      case 'SYS-BAT-001': return BATTERY_POINTS;
      case 'SYS-PROP-L-001': return PROPULSION_LEFT_POINTS;
      case 'SYS-PROP-R-001': return PROPULSION_RIGHT_POINTS;
      case 'SYS-INV-1-001': return INVERTER_1_POINTS;
      case 'SYS-INV-2-001': return INVERTER_2_POINTS;
      case 'SYS-DCPD-001': return DCPD_POINTS;
      case 'SYS-BILGE-001': return BILGE_POINTS;
      case 'SYS-COOL-001': return COOL_POINTS;
      default: return [];
    }
  }, [equipmentId]);

  /**
   * 获取监测点最新值
   */
  const getLatestValue = (pointId: string): number => {
    const [pageEqId, pointName] = pointId.split(':');
    const key = `${pageEqId}-${pointName}`;
    const dataPoints = data[key];

    if (dataPoints && dataPoints.length > 0) {
      return dataPoints[dataPoints.length - 1].value;
    }
    return 0;
  };

  /**
   * 计算指标状态 (根据数值判断正常/警告/严重)
   * 后续可对接 alarms-store 的阈值逻辑
   */
  const getMetricStatus = (pointId: string, value: number): 'normal' | 'warning' | 'critical' => {
    // 简易逻辑：超过某个值变色
    if (pointId.includes('温度') && value > 85) return 'critical';
    if (pointId.includes('电压') && (value > 780 || value < 600)) return 'warning';
    return 'normal';
  };

  if (loading && points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        <p className="text-slate-300 font-medium">持续订阅实时数据中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-red-500/40 rounded-xl bg-red-500/10">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-red-300 font-bold tracking-wide">数据流连接异常: {error}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-bold text-white border-l-4 border-blue-500 pl-3">
          {title}
        </h3>
      )}

      <div className={`grid grid-cols-${columnCount.mobile} md:grid-cols-${columnCount.tablet} lg:grid-cols-${columnCount.desktop} gap-4`}>
        {points.map((point) => {
          const value = getLatestValue(point.id);
          return (
            <MetricCard
              key={point.id}
              monitoringPointId={point.id}
              label={point.label}
              value={value}
              unit={point.unit}
              dataType={point.dataType}
              status={getMetricStatus(point.id, value)}
            />
          );
        })}
      </div>
    </div>
  );
});

MonitoringWall.displayName = 'MonitoringWall';
export default MonitoringWall;
