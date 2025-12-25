/**
 * 货船智能机舱管理系统 - 核心系统配置
 *
 * 本文件定义了用于健康评估页面的核心系统配置。
 * 每个核心系统包含：系统ID、显示名称、图标组件、设备ID、路由路径等信息。
 *
 * 配置用途：
 * 1. SystemHealthCard 组件的批量渲染
 * 2. 健康评分数据的系统映射
 * 3. 系统详情页面的路由导航
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025-12-14
 */

import React from 'react';
import {
  Battery,      // 电池图标
  Fan,          // 推进系统图标（风扇）
  Zap,          // 逆变器图标（闪电）
  Power,        // 配电系统图标
  Settings2,    // 辅助系统图标（设置）
  Activity,     // 通用活动图标
  ShieldCheck,  // 安全检查图标
  Wifi,         // 网络图标
} from 'lucide-react';

/**
 * 核心系统配置接口
 *
 * 定义单个系统的完整配置信息
 */
export interface CoreSystemConfig {
  /**
   * 系统唯一标识符
   * 用于 React key 和内部引用
   */
  systemId: string;

  /**
   * 系统显示名称（中文）
   * 用于 UI 展示
   */
  systemName: string;

  /**
   * 系统图标组件
   * 从 lucide-react 导入
   */
  icon: React.ComponentType<{ className?: string }>;

  /**
   * 对应的设备 ID
   * 用于查询该系统的健康评分和告警数据
   */
  deviceId: string;

  /**
   * 详情页面路由路径
   * 点击系统健康卡片时导航至此路径
   */
  route: string;

  /**
   * 系统描述（可选）
   * 用于 tooltip 或辅助说明
   */
  description?: string;
}

/**
 * 核心系统配置数组
 *
 * 定义了健康评估页面展示的所有核心系统。
 * 系统包括：电池系统、推进系统、逆变器系统、配电系统、辅助系统。
 *
 * 配置说明：
 * - systemId: 前端使用的系统标识符（kebab-case）
 * - systemName: 用户看到的系统名称（中文）
 * - icon: 系统对应的图标组件（来自 lucide-react）
 * - deviceId: 后端 API 使用的设备标识符（与监测点 ID 对应）
 * - route: 系统详情页面的路由路径（与 navigation.ts 保持一致）
 *
 * 注意事项：
 * 1. deviceId 必须与后端返回的设备 ID 完全匹配
 * 2. route 必须与 src/config/navigation.ts 中定义的路由一致
 * 3. 新增系统时，需要同时更新此配置和导航配置
 * 4. 顺序决定了系统健康卡片在页面上的排列顺序
 */
export const coreSystemsConfig: CoreSystemConfig[] = [
  {
    systemId: 'battery',
    systemName: '电池装置',
    icon: Battery,
    deviceId: 'SYS-BAT-001',        // 电池系统设备 ID
    route: '/monitoring/battery',    // 对应电池监控页面
    description: '电池储能系统的健康状态监测，包括 SOC、SOH、温度等关键指标'
  },
  {
    systemId: 'propulsion',
    systemName: '推进系统',
    icon: Fan,
    deviceId: 'SYS-PROP-001',       // 推进系统设备 ID（左右电机统一）
    route: '/propulsion',            // 对应推进系统页面
    description: '推进电机和传动系统的健康状态监测，包括转速、温度、功率等'
  },
  {
    systemId: 'inverter',
    systemName: '逆变器系统',
    icon: Zap,
    deviceId: 'SYS-INV-1-001',      // 1号逆变器设备 ID
    route: '/inverter',              // 对应逆变器页面
    description: '逆变器系统的健康状态监测，包括输出功率、电压、温度等'
  },
  {
    systemId: 'power-distribution',
    systemName: '配电系统',
    icon: Power,
    deviceId: 'SYS-DCPD-001',       // 直流配电系统设备 ID
    route: '/power-distribution',    // 对应配电系统页面
    description: '配电系统的健康状态监测，包括母线电压、电流、功率分配等'
  },
  {
    systemId: 'auxiliary',
    systemName: '辅助系统',
    icon: Settings2,
    deviceId: 'SYS-AUX-001',        // 辅助系统设备 ID
    route: '/auxiliary',             // 对应辅助系统页面
    description: '辅助设备和支持系统的健康状态监测'
  },
];

/**
 * 根据系统 ID 查找系统配置
 *
 * @param systemId - 系统唯一标识符
 * @returns 系统配置对象，如果未找到则返回 undefined
 *
 * @example
 * const batteryConfig = getCoreSystemConfig('battery');
 * console.log(batteryConfig?.systemName); // 输出: "电池系统"
 */
export function getCoreSystemConfig(systemId: string): CoreSystemConfig | undefined {
  return coreSystemsConfig.find(config => config.systemId === systemId);
}

/**
 * 根据设备 ID 查找系统配置
 *
 * @param deviceId - 设备唯一标识符
 * @returns 系统配置对象，如果未找到则返回 undefined
 *
 * @example
 * const batteryConfig = getCoreSystemConfigByDeviceId('SYS-BAT-001');
 * console.log(batteryConfig?.systemName); // 输出: "电池系统"
 */
export function getCoreSystemConfigByDeviceId(deviceId: string): CoreSystemConfig | undefined {
  return coreSystemsConfig.find(config => config.deviceId === deviceId);
}

/**
 * 获取所有系统 ID 列表
 *
 * @returns 系统 ID 数组
 *
 * @example
 * const systemIds = getAllSystemIds();
 * // 输出: ['battery', 'propulsion', 'inverter', 'power-distribution', 'auxiliary']
 */
export function getAllSystemIds(): string[] {
  return coreSystemsConfig.map(config => config.systemId);
}

/**
 * 获取所有设备 ID 列表
 *
 * @returns 设备 ID 数组
 *
 * @example
 * const deviceIds = getAllDeviceIds();
 * // 输出: ['SYS-BAT-001', 'SYS-PROP-001', 'SYS-INV-1-001', ...]
 */
export function getAllDeviceIds(): string[] {
  return coreSystemsConfig.map(config => config.deviceId);
}

/**
 * 根据设备类型获取对应的图标组件
 * 
 * @param deviceType - 设备类型字符串 (如 '电池装置', '推进电机')
 * @returns React 图标组件
 */
export function getIconByDeviceType(deviceType?: string): React.ComponentType<{ className?: string }> {
  if (!deviceType) return Activity;

  if (deviceType.includes('电池') || deviceType.includes('BMS') || deviceType.includes('蓄电池')) {
    return Battery;
  }
  if (deviceType.includes('推进') || deviceType.includes('电机') || deviceType.includes('轴')) {
    return Fan;
  }
  if (deviceType.includes('逆变') || deviceType.includes('变频') || deviceType.includes('模块')) {
    return Zap;
  }
  if (deviceType.includes('配电') || deviceType.includes('柜') || deviceType.includes('断路器')) {
    return Power;
  }
  if (deviceType.includes('泵') || deviceType.includes('温控') || deviceType.includes('冷却')) {
    return Settings2;
  }

  return Activity; // 默认返回活动图标
}

/**
 * 根据设备类型获取对应的页面路由
 * 
 * @param deviceType - 设备类型字符串
 * @returns 路由路径
 */
export function getRouteByDeviceType(deviceType?: string): string {
  if (!deviceType) return '/monitoring';

  if (deviceType.includes('电池')) return '/monitoring/battery';
  if (deviceType.includes('推进')) return '/propulsion';
  if (deviceType.includes('逆变')) return '/inverter';
  if (deviceType.includes('配电')) return '/power-distribution';
  if (deviceType.includes('泵') || deviceType.includes('冷却')) return '/auxiliary';

  return '/monitoring'; // 默认返回监控总览
}

