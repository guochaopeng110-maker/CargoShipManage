/**
 * 图标映射系统 (重构版 - 对齐中文数据契约)
 *
 * 功能说明：
 * - 将监测点ID映射到对应的SVG图标组件
 * - 使用标准中文名称作为映射键，确保全链路契约一致
 * - 为未实现的图标提供占位符
 *
 * 使用方式：
 * ```tsx
 * import { getIconForMonitoringPoint } from './icon-mapping';
 * const IconComponent = getIconForMonitoringPoint('SYS-BAT-001:总电压');
 * <IconComponent className="w-6 h-6" />
 * ```
 */

import React from 'react';

// ============================================================================
// SVG 图标导入
// ============================================================================

// 电池系统图标
import BatTotalVoltageIcon from './svg/bat-total-voltage.svg?react';
import BatSocIcon from './svg/bat-soc.svg?react';
import BatTemperatureIcon from './svg/bat-temperature.svg?react';
import BatCurrentIcon from './svg/bat-current.svg?react';
import BatCellVoltageIcon from './svg/bat-cell-voltage.svg?react';
import BatInsulationIcon from './svg/bat-insulation.svg?react';
import BatSohIcon from './svg/bat-soh.svg?react';

// lucide-react 图标（用于故障状态和特殊监测点）
import {
  Thermometer,           // 温度计
  Shield,                // 盾牌（保护）
  AlertTriangle,         // 警告三角形
  Zap,                   // 闪电（充电）
  Battery,               // 电池
  Plug2,                 // 插头（接触器）
  Radio,                 // 无线电（通信）
  ArrowRightLeft,        // 双向箭头（能量流动）
  Power,                 // 电源
} from 'lucide-react';

// 推进系统图标
import MotorSpeedIcon from './svg/motor-speed.svg?react';
import MotorPowerIcon from './svg/motor-power.svg?react';
import MotorVoltageIcon from './svg/motor-voltage.svg?react';
import MotorCurrentIcon from './svg/motor-current.svg?react';
import MotorBearingTempIcon from './svg/motor-bearing-temp.svg?react';
import MotorStatorTempIcon from './svg/motor-stator-temp.svg?react';

// 逆变器系统图标
import InverterVoltageIcon from './svg/inverter-voltage.svg?react';
import InverterCurrentIcon from './svg/inverter-current.svg?react';
import InverterOutputVoltageIcon from './svg/inverter-output-voltage.svg?react';
import InverterPowerIcon from './svg/inverter-power.svg?react';
import InverterTempIcon from './svg/inverter-temp.svg?react';
import ReactorTempIcon from './svg/reactor-temp.svg?react';

// 配电系统图标
import BusbarVoltageIcon from './svg/busbar-voltage.svg?react';
import BusbarCurrentIcon from './svg/busbar-current.svg?react';
import BusbarPowerIcon from './svg/busbar-power.svg?react';

// 辅助系统图标
import FuseStatusIcon from './svg/fuse-status.svg?react';
import WaterLevelIcon from './svg/water-level.svg?react';
import PumpIcon from './svg/pump.svg?react';
import PressureIcon from './svg/pressure.svg?react';
import FlowRateIcon from './svg/flow-rate.svg?react';

// 占位符图标
import DefaultMetricIcon from './svg/default-metric.svg?react';
import DefaultStatusIcon from './svg/default-status.svg?react';

// ============================================================================
// 类型定义
// ============================================================================

export type MonitoringPointId = string;
export type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;
export type IconMap = Record<MonitoringPointId, IconComponent>;

// ============================================================================
// 图标映射表 (使用标准中文名称作为键)
// ============================================================================

export const iconMap: IconMap = {
  // 1. 电池系统 (SYS-BAT-001)
  'SYS-BAT-001:总电压': BatTotalVoltageIcon,
  'SYS-BAT-001:单体电压': BatCellVoltageIcon,
  'SYS-BAT-001:电池温度': BatTemperatureIcon,
  'SYS-BAT-001:电池电流': BatCurrentIcon,
  'SYS-BAT-001:SOC荷电状态': BatSocIcon,
  'SYS-BAT-001:绝缘电阻': BatInsulationIcon,
  'SYS-BAT-001:单体温度': BatTemperatureIcon,
  'SYS-BAT-001:SOH': BatSohIcon,
  'SYS-BAT-001:环境温度': Thermometer as IconComponent,
  'SYS-BAT-001:电池系统故障': Battery as IconComponent,
  'SYS-BAT-001:BMS通信故障': Radio as IconComponent,

  // 2. 左推进系统 (SYS-PROP-L-001)
  'SYS-PROP-L-001:电机转速': MotorSpeedIcon,
  'SYS-PROP-L-001:电机功率': MotorPowerIcon,
  'SYS-PROP-L-001:电机电压': MotorVoltageIcon,
  'SYS-PROP-L-001:电机电流': MotorCurrentIcon,
  'SYS-PROP-L-001:逆变器电压': InverterVoltageIcon,
  'SYS-PROP-L-001:逆变器电流': InverterCurrentIcon,
  'SYS-PROP-L-001:逆变器温度': InverterTempIcon,
  'SYS-PROP-L-001:前轴承温度': MotorBearingTempIcon,
  'SYS-PROP-L-001:后轴承温度': MotorBearingTempIcon,
  'SYS-PROP-L-001:定子绕组温度': MotorStatorTempIcon,
  'SYS-PROP-L-001:逆变器故障': DefaultStatusIcon,
  'SYS-PROP-L-001:熔断器状态': FuseStatusIcon,

  // 3. 右推进系统 (SYS-PROP-R-001)
  'SYS-PROP-R-001:电机转速': MotorSpeedIcon,
  'SYS-PROP-R-001:电机功率': MotorPowerIcon,
  'SYS-PROP-R-001:电机电压': MotorVoltageIcon,
  'SYS-PROP-R-001:电机电流': MotorCurrentIcon,
  'SYS-PROP-R-001:逆变器电压': InverterVoltageIcon,
  'SYS-PROP-R-001:逆变器电流': InverterCurrentIcon,
  'SYS-PROP-R-001:逆变器温度': InverterTempIcon,
  'SYS-PROP-R-001:前轴承温度': MotorBearingTempIcon,
  'SYS-PROP-R-001:后轴承温度': MotorBearingTempIcon,
  'SYS-PROP-R-001:定子绕组温度': MotorStatorTempIcon,

  // 4. 1#日用逆变器 (SYS-INV-1-001)
  'SYS-INV-1-001:输入直流电压': InverterVoltageIcon,
  'SYS-INV-1-001:输出交流电压': InverterOutputVoltageIcon,
  'SYS-INV-1-001:输出交流频率': DefaultMetricIcon,
  'SYS-INV-1-001:输出功率': InverterPowerIcon,
  'SYS-INV-1-001:电抗器温度': ReactorTempIcon,

  // 5. 2#日用逆变器 (SYS-INV-2-001)
  'SYS-INV-2-001:输入直流电压': InverterVoltageIcon,
  'SYS-INV-2-001:输出交流电压': InverterOutputVoltageIcon,
  'SYS-INV-2-001:输出功率': InverterPowerIcon,

  // 6. 直流配电板 (SYS-DCPD-001)
  'SYS-DCPD-001:直流母排电压': BusbarVoltageIcon,
  'SYS-DCPD-001:直流母排电流': BusbarCurrentIcon,
  'SYS-DCPD-001:绝缘电阻': BatInsulationIcon,
  'SYS-DCPD-001:电池电量': BatSocIcon,

  // 7. 舱底水系统 (SYS-BILGE-001)
  'SYS-BILGE-001:1#集水井水位': WaterLevelIcon,
  'SYS-BILGE-001:2#集水井水位': WaterLevelIcon,
  'SYS-BILGE-001:3#集水井水位': WaterLevelIcon,
  'SYS-BILGE-001:4#集水井水位': WaterLevelIcon,

  // 8. 冷却水系统 (SYS-COOL-001)
  'SYS-COOL-001:1#冷却水温': BatTemperatureIcon,
  'SYS-COOL-001:2#冷却水温': BatTemperatureIcon,
  'SYS-COOL-001:冷却水压力': PressureIcon,
};

export function getIconForMonitoringPoint(
  monitoringPointId: MonitoringPointId,
  dataType?: 'number' | 'boolean'
): IconComponent {
  const icon = iconMap[monitoringPointId];
  if (icon) return icon;
  return dataType === 'boolean' ? DefaultStatusIcon : DefaultMetricIcon;
}

/**
 * 检查监测点是否有专属图标（非占位符）
 *
 * @param monitoringPointId - 监测点ID
 * @returns 是否有专属图标
 */
export function hasCustomIcon(monitoringPointId: MonitoringPointId): boolean {
  const icon = iconMap[monitoringPointId];
  return icon !== undefined && icon !== DefaultMetricIcon && icon !== DefaultStatusIcon;
}

/**
 * 获取图标统计信息
 *
 * @returns 统计信息对象
 */
export function getIconStats() {
  const totalMappings = Object.keys(iconMap).length;
  const customIcons = Object.keys(iconMap).filter(id => hasCustomIcon(id)).length;
  const placeholderIcons = totalMappings - customIcons;

  return {
    total: totalMappings,           // 总映射数
    custom: customIcons,            // 专属图标数
    placeholder: placeholderIcons,  // 占位符图标数
  };
}
