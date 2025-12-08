/**
 * 辅助系统监控页面组件
 * 
 * 功能说明：
 * - 实时监控货船智能机舱的辅助系统运行状态
 * - 包括舱底水系统、冷却水系统、油水分离器等关键设备
 * - 提供实时数据展示、设备状态监控和告警管理
 * - 支持数据导出和历史记录查看
 * 
 * 主要监控设备：
 * 1. 舱底水系统：水位、温度、水泵状态
 * 2. 冷却水系统：压力、温度、流量、泵状态
 * 3. 油水分离器：处理量、效率、故障状态
 * 4. 热交换器：效率监控
 * 
 * 核心特性：
 * - 实时数据更新（3.5秒间隔）
 * - 多维度状态显示
 * - 阈值监控和告警
 * - 设备参数实时跟踪
 * - 告警系统集成
 */

// React核心钩子导入
import React, { useState, useEffect, useCallback } from 'react';

// UI组件导入
import { Card } from './ui/card';       // 卡片容器组件
import { Checkbox } from './ui/checkbox'; // 复选框组件
import { Button } from './ui/button';   // 按钮组件

// 状态管理和功能组件导入
import { useMonitoringStore } from '../stores/monitoring-store';   // 统一监测数据状态管理
import { UnifiedMonitoringChart, ChartType, MonitoringParameter } from './UnifiedMonitoringChart'; // 统一监测图表组件

// 图标组件导入（来自Lucide React图标库）
import {
  Waves,          // 水波图标 - 用于表示液体流动
  Thermometer,    // 温度计图标 - 用于表示温度
  Droplets,       // 水滴图标 - 用于表示水位
  Settings,       // 设置图标 - 用于表示系统设置
  Gauge,          // 仪表盘图标 - 用于表示压力
  Power,          // 电源图标 - 用于表示电源状态
  Anchor          // 锚点图标 - 用于舱底标识
} from 'lucide-react';

// UI组件导入
import { Badge } from './ui/badge';       // 徽章组件

// 统一数据类型导入
import { UnifiedMonitoringData, MetricType, DataQuality, DataSource } from '../types/monitoring'; // 统一数据类型

/**
 * 辅助系统指标数据类型定义
 * 
 * 描述：定义了辅助系统所有关键参数的监控数据结构
 * 包含舱底水系统和冷却水泵系统的监测点
 * 
 * 舱底水系统监测点：
 * - well1WaterLevel: 1#集水井水位 (mm)
 * - well2WaterLevel: 2#集水井水位 (mm)
 * - well3WaterLevel: 3#集水井水位 (mm)
 * - well4WaterLevel: 4#集水井水位 (mm)
 * 
 * 冷却水泵系统监测点：
 * - pump1PowerStatus: 1#冷却水泵电源状态 (0正常/1失电)
 * - pump1WaterTemp: 1#冷却水温 (°C)
 * - pump2PowerStatus: 2#冷却水泵电源状态 (0正常/1失电)
 * - pump2WaterTemp: 2#冷却水温 (°C)
 * - coolingWaterPressure: 冷却水压力 (MPa)
 * 
 * - systemStatus: 整体系统状态
 * - lastUpdate: 最后更新时间戳
 */
interface AuxiliaryMetrics {
  // 舱底水系统监测点
  well1WaterLevel: number;        // 1#集水井水位 (mm)
  well2WaterLevel: number;        // 2#集水井水位 (mm)
  well3WaterLevel: number;        // 3#集水井水位 (mm)
  well4WaterLevel: number;        // 4#集水井水位 (mm)

  // 冷却水泵系统监测点
  pump1PowerStatus: number;       // 1#冷却水泵电源状态 (0正常/1失电)
  pump1WaterTemp: number;         // 1#冷却水温 (°C)
  pump2PowerStatus: number;       // 2#冷却水泵电源状态 (0正常/1失电)
  pump2WaterTemp: number;         // 2#冷却水温 (°C)
  coolingWaterPressure: number;   // 冷却水压力 (MPa)

  // 系统状态
  systemStatus: 'normal' | 'warning' | 'critical';  // 系统整体状态
  lastUpdate: number;             // 最后更新时间戳
}

/**
 * 辅助设备数据类型定义
 * 
 * 描述：定义单个辅助设备的基本信息结构
 * 
 * 属性说明：
 * - id: 设备唯一标识符
 * - name: 设备显示名称
 * - type: 设备类型分类
 * - status: 当前运行状态
 * - parameters: 设备运行参数键值对
 */
interface AuxiliaryDevice {
  id: string;                               // 设备唯一ID
  name: string;                             // 设备名称
  type: 'bilge' | 'cooling' | 'separator'; // 设备类型：舱底/冷却/分离器
  status: 'normal' | 'warning' | 'fault';  // 设备状态
  parameters: Record<string, number | string>; // 设备参数集合
}

/**
 * 辅助系统连接状态显示组件
 * 
 * 功能说明：
 * - 显示系统当前的连接状态
 * - 使用不同颜色和图标区分连接状态
 * - 提供直观的状态指示
 * 
 * 状态类型：
 * - connected: 已连接 (绿色)
 * - connecting: 连接中 (黄色)
 * - disconnected: 断开连接 (红色)
 * 
 * @param status 连接状态
 */
const AuxiliaryConnectionStatus = ({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) => {
  // 连接状态配置映射
  const statusConfig = {
    connected: {
      color: 'text-green-400',    // 绿色文字
      bg: 'bg-green-500/20',      // 绿色背景
      text: '已连接',             // 显示文本
      icon: '🟢'                  // 绿色圆点图标
    },
    connecting: {
      color: 'text-yellow-400',   // 黄色文字
      bg: 'bg-yellow-500/20',     // 黄色背景
      text: '连接中',             // 显示文本
      icon: '🟡'                  // 黄色圆点图标
    },
    disconnected: {
      color: 'text-red-400',      // 红色文字
      bg: 'bg-red-500/20',        // 红色背景
      text: '断开连接',           // 显示文本
      icon: '🔴'                  // 红色圆点图标
    },
  };

  // 获取当前状态配置
  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
      {/* 状态指示图标 */}
      <span className="text-lg">{config.icon}</span>
      {/* 状态文字 */}
      <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
    </div>
  );
};



/**
 * 舱底水告警系统配置数据
 * 
 * 描述：舱底水系统相关的告警配置和阈值设置
 * 
 * 告警项目：
 * 1. 舱底水高位报警：液位超过设定值时触发
 * 2. 舱底水超高位报警：液位超过二级设定值时触发
 * 3. 油水分离器故障：分离器运行异常时触发
 * 4. 舱底水泵故障：水泵运行故障时触发
 * 
 * 配置属性说明：
 * - item: 告警监测项目名称
 * - unit: 监测参数单位
 * - threshold: 告警触发阈值条件
 * - action: 告警触发时的处理措施
 * - cockpitDisplay: 是否在驾控台显示
 * - cockpitWarning: 是否在驾控台发出警告
 * - localDisplay: 是否在就地显示
 * - localWarning: 是否在就地发出警告
 */
const bilgeWaterSpecs = [
  {
    item: '舱底水高位报警',
    unit: '液位',
    threshold: '高于设定值',
    action: '启动舱底水泵排水',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
  {
    item: '舱底水超高位报警',
    unit: '液位',
    threshold: '高于设定值（二级）',
    action: '立即启动备用泵，检查主泵',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
  {
    item: '油水分离器故障',
    unit: '状态',
    threshold: '故障信号',
    action: '检查油水分离器，必要时旁路',
    cockpitDisplay: false,   // 驾控台不显示
    cockpitWarning: false,   // 驾控台不警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
  {
    item: '舱底水泵故障',
    unit: '状态',
    threshold: '运行故障',
    action: '切换备用泵，检修主泵',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
];

/**
 * 冷却水泵系统配置数据
 * 
 * 描述：冷却水系统相关的告警配置和阈值设置
 * 
 * 告警项目：
 * 1. 冷却水压力低：系统压力低于安全值时触发
 * 2. 冷却水温度高：水温超过安全范围时触发
 * 3. 冷却水流量低：流量不足时触发
 * 4. 冷却泵故障：泵运行异常时触发
 * 5. 热交换器效率低：效率低于标准时触发
 */
const coolingWaterSpecs = [
  {
    item: '冷却水压力低',
    unit: 'kPa',
    threshold: '<150kPa',
    action: '检查泵运行状态和管路',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
  {
    item: '冷却水温度高',
    unit: '°C',
    threshold: '>45°C',
    action: '检查热交换器，增加流量',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
  {
    item: '冷却水流量低',
    unit: 'L/min',
    threshold: '<80L/min',
    action: '检查泵和管路阻塞',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: false,     // 就地不警告
  },
  {
    item: '冷却泵故障',
    unit: '状态',
    threshold: '运行故障',
    action: '切换备用泵，检修故障泵',
    cockpitDisplay: true,    // 驾控台显示
    cockpitWarning: true,    // 驾控台警告
    localDisplay: true,      // 就地显示
    localWarning: true,      // 就地警告
  },
  {
    item: '热交换器效率低',
    unit: '%',
    threshold: '<70%',
    action: '清洁热交换器，检查循环',
    cockpitDisplay: false,   // 驾控台不显示
    cockpitWarning: false,   // 驾控台不警告
    localDisplay: true,      // 就地显示
    localWarning: false,     // 就地不警告
  },
];

/**
 * 辅助系统监控页面主组件
 * 
 * 功能说明：
 * - 整合所有辅助系统监控功能的页面组件
 * - 管理实时数据状态和设备信息
 * - 提供数据可视化、告警管理和导出功能
 * 
 * 主要功能模块：
 * 1. 系统概览仪表板
 * 2. 设备状态监控
 * 3. 实时数据图表
 * 4. 告警系统配置
 * 5. 数据导出功能
 * 
 * 数据更新机制：
 * - 每3.5秒更新一次所有监控数据
 * - 实时生成模拟数据模拟真实环境
 * - 动态调整设备状态和参数值
 */
export function AuxiliaryMonitoringPage() {
  // 使用统一监测数据状态管理Hook
  const {
    realtimeConnected,        // 实时连接状态
    connectionStatus,         // 连接状态详情
    devices,                  // 设备数据映射
    lastUpdate,               // 最后数据更新时间
    errors,                   // 错误列表
    getDeviceData,            // 获取设备数据函数
    subscribeToRealtime,      // 订阅实时数据
    fetchMonitoringData,      // 获取监测数据
    getEquipmentData,         // 获取设备数据
  } = useMonitoringStore();

  // 辅助系统指标状态管理
  const [auxiliaryMetrics, setAuxiliaryMetrics] = useState<AuxiliaryMetrics>({
    // 舱底水系统监测点 (阈值: 200mm)
    well1WaterLevel: 85,          // 1#集水井水位 85mm
    well2WaterLevel: 92,          // 2#集水井水位 92mm
    well3WaterLevel: 78,          // 3#集水井水位 78mm
    well4WaterLevel: 105,         // 4#集水井水位 105mm

    // 冷却水泵系统监测点
    pump1PowerStatus: 0,          // 1#冷却水泵电源状态 (0正常)
    pump1WaterTemp: 28.5,         // 1#冷却水温 28.5°C (阈值: 33°C)
    pump2PowerStatus: 0,          // 2#冷却水泵电源状态 (0正常)
    pump2WaterTemp: 29.2,         // 2#冷却水温 29.2°C (阈值: 33°C)
    coolingWaterPressure: 0.25,   // 冷却水压力 0.25MPa (阈值: <0.1MPa)

    // 系统状态
    systemStatus: 'normal',       // 系统初始状态
    lastUpdate: Date.now(),       // 初始更新时间
  });

  // 辅助设备状态数组
  const [auxiliaryDevices, setAuxiliaryDevices] = useState<AuxiliaryDevice[]>([]);

  // 实时图表数据存储
  const [realtimeChartData, setRealtimeChartData] = useState<UnifiedMonitoringData[]>([]);

  /**
   * 模拟数据更新定时器设置
   * 
   * 功能说明：
   * - 组件挂载时初始化设备和图表数据
   * - 设置定时器每3.5秒更新一次数据
   * - 组件卸载时清理定时器
   */
  useEffect(() => {
    // 初始化辅助设备列表
    initializeAuxiliaryDevices();
    // 生成初始图表数据
    generateInitialChartData();

    /**
     * 定期更新辅助系统数据
     * 每3.5秒更新一次指标和图表数据
     */
    const updateInterval = setInterval(() => {
      updateAuxiliaryMetrics();  // 更新系统指标
      updateChartData();         // 更新图表数据
    }, 3500); // 每3.5秒更新

    // 组件卸载时清理定时器
    return () => {
      clearInterval(updateInterval);
    };
  }, [subscribeToRealtime, fetchMonitoringData]);

  /**
   * 初始化辅助设备列表
   * 
   * 功能说明：
   * - 定义系统中所有辅助设备的初始配置
   * - 包括设备ID、名称、类型、状态和参数
   * - 模拟真实的设备配置信息
   */
  const initializeAuxiliaryDevices = () => {
    const devices: AuxiliaryDevice[] = [
      // 1号舱底水泵
      {
        id: 'bilge-pump-1',
        name: '1#舱底水泵',
        type: 'bilge',
        status: 'normal',
        parameters: {
          '流量': 85,           // L/min
          '压力': 2.1,          // MPa
          '运行时间': '245h',   // 运行小时数
        }
      },
      // 2号舱底水泵
      {
        id: 'bilge-pump-2',
        name: '2#舱底水泵',
        type: 'bilge',
        status: 'normal',
        parameters: {
          '流量': 82,           // L/min
          '压力': 2.0,          // MPa
          '运行时间': '156h',   // 运行小时数
        }
      },
      // 油水分离器
      {
        id: 'oil-separator',
        name: '油水分离器',
        type: 'separator',
        status: 'normal',
        parameters: {
          '处理量': 125,        // L/h
          '效率': 98.5,         // %
          '故障次数': 0,        // 次
        }
      },
      // 1号冷却水泵
      {
        id: 'cooling-pump-1',
        name: '1#冷却水泵',
        type: 'cooling',
        status: 'normal',
        parameters: {
          '流量': 95,           // L/min
          '压力': 185,          // kPa
          '温度': 38.2,         // °C
        }
      },
    ];
    setAuxiliaryDevices(devices);
  };

  /**
   * 生成初始图表数据
   * 
   * 功能说明：
   * - 创建最近60个时间点的历史数据
   * - 数据间隔为3.5秒（与更新间隔一致）
   * - 包含所有关键监控参数的初始值
   * 
   * 数据参数：
   * - timestamp: 时间戳
   * - bilgeWaterLevel: 舱底水液位
   * - bilgeWaterTemp: 舱底水温度
   * - coolingWaterPressure: 冷却水压力
   * - coolingWaterTemp: 冷却水温度
   * - coolingWaterFlow: 冷却水流量
   */
  const generateInitialChartData = () => {
    const now = Date.now();
    const data: UnifiedMonitoringData[] = [];

    // 生成60个历史数据点
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - i * 3500; // 每3.5秒一个数据点

      // 舱底水系统数据
      data.push({
        id: `bilge_water_level_${timestamp}`,
        equipmentId: 'WELL-001',
        timestamp,
        metricType: MetricType.PRESSURE,
        value: (0.3 + Math.random() * 0.2) * 200, // 转换为mm
        unit: 'mm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      data.push({
        id: `bilge_water_temp_${timestamp}`,
        equipmentId: 'WELL-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: 25 + Math.random() * 10,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      // 冷却水系统数据
      data.push({
        id: `cooling_water_pressure_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.PRESSURE,
        value: 180 + Math.random() * 20,
        unit: 'kPa',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      data.push({
        id: `cooling_water_temp_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: 35 + Math.random() * 10,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      data.push({
        id: `cooling_water_flow_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.SPEED,
        value: 90 + Math.random() * 20,
        unit: 'L/min',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
    }
    setRealtimeChartData(data);
  };

  /**
   * 更新辅助系统指标数据
   * 
   * 功能说明：
   * - 模拟真实环境中指标的随机波动
   * - 动态调整各项监控参数的值
   * - 根据设备状态变化更新系统整体状态
   * 
   * 更新策略：
   * 1. 基础参数：在合理范围内随机波动
   * 2. 设备状态：随机出现警告和故障状态
   * 3. 系统状态：根据子设备状态综合判断
   * 
   * 注意：使用useCallback优化，避免不必要的重渲染
   */
  const updateAuxiliaryMetrics = useCallback(() => {
    setAuxiliaryMetrics(prev => {
      /**
       * 生成随机波动的舱底水系统指标值
       * 水位在50-180mm范围内波动（阈值200mm）
       */
      const well1WaterLevel = Math.max(30, Math.min(190, prev.well1WaterLevel + (Math.random() - 0.5) * 15));
      const well2WaterLevel = Math.max(30, Math.min(190, prev.well2WaterLevel + (Math.random() - 0.5) * 15));
      const well3WaterLevel = Math.max(30, Math.min(190, prev.well3WaterLevel + (Math.random() - 0.5) * 15));
      const well4WaterLevel = Math.max(30, Math.min(190, prev.well4WaterLevel + (Math.random() - 0.5) * 15));

      /**
       * 生成随机波动的冷却水泵系统指标值
       */
      // 电源状态：2%概率失电
      const pump1PowerStatus = Math.random() > 0.98 ? 1 : 0;
      const pump2PowerStatus = Math.random() > 0.98 ? 1 : 0;

      // 水温在25-35°C范围内波动（阈值33°C）
      const pump1WaterTemp = Math.max(20, Math.min(36, prev.pump1WaterTemp + (Math.random() - 0.5) * 2));
      const pump2WaterTemp = Math.max(20, Math.min(36, prev.pump2WaterTemp + (Math.random() - 0.5) * 2));

      // 压力在0.15-0.35MPa范围内波动（阈值<0.1MPa为低）
      const coolingWaterPressure = Math.max(0.08, Math.min(0.4, prev.coolingWaterPressure + (Math.random() - 0.5) * 0.05));

      /**
       * 检查和更新系统整体状态
       * 根据各监测点是否超阈值判断系统状态
       */
      let systemStatus: 'normal' | 'warning' | 'critical' = 'normal';

      // 检查水位是否超过阈值
      const waterLevelAlert = well1WaterLevel > 200 || well2WaterLevel > 200 ||
        well3WaterLevel > 200 || well4WaterLevel > 200;
      // 检查水泵是否失电
      const pumpPowerAlert = pump1PowerStatus === 1 || pump2PowerStatus === 1;
      // 检查水温是否过高
      const tempAlert = pump1WaterTemp > 33 || pump2WaterTemp > 33;
      // 检查压力是否过低
      const pressureAlert = coolingWaterPressure < 0.1;

      if (pumpPowerAlert || pressureAlert) {
        systemStatus = 'critical';  // 失电或压力低为严重
      } else if (waterLevelAlert || tempAlert) {
        systemStatus = 'warning';   // 水位高或水温高为警告
      }

      // 构造新的指标数据对象
      const newMetrics: AuxiliaryMetrics = {
        well1WaterLevel,
        well2WaterLevel,
        well3WaterLevel,
        well4WaterLevel,
        pump1PowerStatus,
        pump1WaterTemp,
        pump2PowerStatus,
        pump2WaterTemp,
        coolingWaterPressure,
        systemStatus,
        lastUpdate: Date.now(),
      };

      return newMetrics;
    });

    /**
     * 更新设备状态和参数
     * 
     * 功能说明：
     * - 动态更新每个设备的运行状态
     * - 模拟设备参数的实时变化
     * - 保持参数值的合理范围
     */
    setAuxiliaryDevices(prev => prev.map(device => ({
      ...device,
      // 随机状态变化：故障5%，警告10%，正常85%
      status: Math.random() > 0.95 ? 'fault' : Math.random() > 0.9 ? 'warning' : 'normal',
      parameters: {
        ...device.parameters,
        // 根据设备类型更新相应参数
        '流量': device.parameters['流量'] ?
          (device.parameters['流量'] as number) + (Math.random() - 0.5) * 5 : // ±5范围内波动
          90 + Math.random() * 20,
        '压力': device.parameters['压力'] ?
          (device.parameters['压力'] as number) + (Math.random() - 0.5) * 0.2 : // ±0.2范围内波动
          2.0 + Math.random() * 0.5,
        '温度': device.parameters['温度'] ?
          (device.parameters['温度'] as number) + (Math.random() - 0.5) * 2 : // ±2范围内波动
          35 + Math.random() * 10,
      }
    })));
  }, []);

  /**
   * 更新实时图表数据
   * 
   * 功能说明：
   * - 添加新的数据点到图表
   * - 保持图表数据在合理长度范围内
   * - 模拟连续的数据采集过程
   * 
   * 数据管理：
   * - 添加当前时刻的数据点
   * - 保持最近34个数据点
   * - 超过限制时删除最旧的数据
   * 
   * @param currentMetrics 当前系统指标数据
   */
  const updateChartData = useCallback(() => {
    const timestamp = Date.now();
    const newPoints: UnifiedMonitoringData[] = [
      {
        id: `well1_water_level_${timestamp}`,
        equipmentId: 'WELL-001',
        timestamp,
        metricType: MetricType.PRESSURE,
        value: auxiliaryMetrics.well1WaterLevel + (Math.random() - 0.5) * 5,
        unit: 'mm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `pump1_water_temp_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: auxiliaryMetrics.pump1WaterTemp + (Math.random() - 0.5) * 1,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `cooling_water_pressure_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.PRESSURE,
        value: auxiliaryMetrics.coolingWaterPressure + (Math.random() - 0.5) * 0.02,
        unit: 'MPa',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      }
    ];

    setRealtimeChartData(prev => [...prev, ...newPoints].slice(-180)); // 保持最近60个时间点的数据（3个参数×60个时间点）
  }, [auxiliaryMetrics]);

  /**
   * 导出辅助系统数据
   * 
   * 功能说明：
   * - 将当前所有监控数据导出为JSON文件
   * - 包括系统指标、设备状态、图表数据和连接状态
   * - 文件名包含日期信息，便于管理
   * 
   * 导出数据结构：
   * - timestamp: 导出时间戳
   * - auxiliaryMetrics: 系统指标数据
   * - auxiliaryDevices: 设备状态列表
   * - chartData: 图表历史数据
   * - connectionStatus: 当前连接状态
   */
  const exportData = () => {
    const exportData = {
      timestamp: Date.now(),
      auxiliaryMetrics,
      auxiliaryDevices,
      chartData: realtimeChartData,
      connectionStatus,
    };

    // 创建Blob对象并下载
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auxiliary-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    // 清理URL对象
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex justify-between items-center">
          {/* 左侧标题和描述 */}
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Settings className="w-8 h-8 text-cyan-400" />
              辅助系统监控
            </h1>
            <p className="text-slate-400 mt-1">货船智能机舱辅助系统实时监控与管理</p>
          </div>

          {/* 右侧控制按钮 */}
          <div className="flex items-center gap-4">
            {/* 连接状态指示器 */}
            <AuxiliaryConnectionStatus status={
              connectionStatus === 'error' || connectionStatus === 'reconnecting'
                ? 'disconnected'
                : connectionStatus as 'connected' | 'disconnected' | 'connecting'
            } />
            {/* 数据导出按钮 */}
            <Button
              onClick={exportData}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              导出数据
            </Button>
          </div>
        </div>

        {/* 舱底水系统实时监控区域 - 带动态图标效果 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-100 text-lg font-semibold flex items-center gap-2">
              <Anchor className="w-5 h-5 text-blue-400 animate-pulse" />
              舱底水系统实时监控
            </h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${auxiliaryMetrics.systemStatus === 'normal' ? 'bg-green-400' : auxiliaryMetrics.systemStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm text-slate-400">实时更新中</span>
            </div>
          </div>

          {/* 舱底水系统动态指标卡片 - 横向排列 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1#集水井水位 */}
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-blue-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.well1WaterLevel > 200 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.well1WaterLevel > 150 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.well1WaterLevel > 200 ? '超高' : auxiliaryMetrics.well1WaterLevel > 150 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {auxiliaryMetrics.well1WaterLevel.toFixed(0)}
                <span className="text-sm font-normal text-slate-400 ml-1">mm</span>
              </div>
              <div className="text-xs text-slate-400">1#集水井水位</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.well1WaterLevel > 200 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.well1WaterLevel / 250) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 2#集水井水位 */}
            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-cyan-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.well2WaterLevel > 200 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.well2WaterLevel > 150 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.well2WaterLevel > 200 ? '超高' : auxiliaryMetrics.well2WaterLevel > 150 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {auxiliaryMetrics.well2WaterLevel.toFixed(0)}
                <span className="text-sm font-normal text-slate-400 ml-1">mm</span>
              </div>
              <div className="text-xs text-slate-400">2#集水井水位</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.well2WaterLevel > 200 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-cyan-400 to-cyan-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.well2WaterLevel / 250) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 3#集水井水位 */}
            <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-teal-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.well3WaterLevel > 200 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.well3WaterLevel > 150 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.well3WaterLevel > 200 ? '超高' : auxiliaryMetrics.well3WaterLevel > 150 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-teal-400 mb-1">
                {auxiliaryMetrics.well3WaterLevel.toFixed(0)}
                <span className="text-sm font-normal text-slate-400 ml-1">mm</span>
              </div>
              <div className="text-xs text-slate-400">3#集水井水位</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.well3WaterLevel > 200 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-teal-400 to-teal-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.well3WaterLevel / 250) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 4#集水井水位 */}
            <div className="bg-gradient-to-br from-sky-500/20 to-sky-600/10 border border-sky-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Droplets className="w-5 h-5 text-sky-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.well4WaterLevel > 200 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.well4WaterLevel > 150 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.well4WaterLevel > 200 ? '超高' : auxiliaryMetrics.well4WaterLevel > 150 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-sky-400 mb-1">
                {auxiliaryMetrics.well4WaterLevel.toFixed(0)}
                <span className="text-sm font-normal text-slate-400 ml-1">mm</span>
              </div>
              <div className="text-xs text-slate-400">4#集水井水位</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.well4WaterLevel > 200 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-sky-400 to-sky-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.well4WaterLevel / 250) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 冷却水泵系统实时监控区域 - 带动态图标效果 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-100 text-lg font-semibold flex items-center gap-2">
              <Waves className="w-5 h-5 text-emerald-400 animate-pulse" />
              冷却水泵系统实时监控
            </h3>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${auxiliaryMetrics.systemStatus === 'normal' ? 'bg-green-400' : auxiliaryMetrics.systemStatus === 'warning' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm text-slate-400">实时更新中</span>
            </div>
          </div>

          {/* 冷却水泵系统动态指标卡片 */}
          <div className="flex flex-row gap-4">
            {/* 1#冷却水泵电源 */}
            <div className="flex-1 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Power className="w-5 h-5 text-emerald-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.pump1PowerStatus === 1 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.pump1PowerStatus === 1 ? '失电' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {auxiliaryMetrics.pump1PowerStatus === 0 ? 'ON' : 'OFF'}
              </div>
              <div className="text-xs text-slate-400">1#冷却水泵电源</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.pump1PowerStatus === 1 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}
                  style={{ width: auxiliaryMetrics.pump1PowerStatus === 0 ? '100%' : '20%' }}
                />
              </div>
            </div>

            {/* 1#冷却水温 */}
            <div className="flex-1 bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-amber-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.pump1WaterTemp > 33 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.pump1WaterTemp > 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.pump1WaterTemp > 33 ? '过热' : auxiliaryMetrics.pump1WaterTemp > 30 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-amber-400 mb-1">
                {auxiliaryMetrics.pump1WaterTemp.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">°C</span>
              </div>
              <div className="text-xs text-slate-400">1#冷却水温</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.pump1WaterTemp > 33 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.pump1WaterTemp / 40) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 2#冷却水泵电源 */}
            <div className="flex-1 bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Power className="w-5 h-5 text-green-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.pump2PowerStatus === 1 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.pump2PowerStatus === 1 ? '失电' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {auxiliaryMetrics.pump2PowerStatus === 0 ? 'ON' : 'OFF'}
              </div>
              <div className="text-xs text-slate-400">2#冷却水泵电源</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.pump2PowerStatus === 1 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-green-400 to-green-600'}`}
                  style={{ width: auxiliaryMetrics.pump2PowerStatus === 0 ? '100%' : '20%' }}
                />
              </div>
            </div>

            {/* 2#冷却水温 */}
            <div className="flex-1 bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-orange-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.pump2WaterTemp > 33 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.pump2WaterTemp > 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.pump2WaterTemp > 33 ? '过热' : auxiliaryMetrics.pump2WaterTemp > 30 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-orange-400 mb-1">
                {auxiliaryMetrics.pump2WaterTemp.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">°C</span>
              </div>
              <div className="text-xs text-slate-400">2#冷却水温</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.pump2WaterTemp > 33 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-orange-400 to-orange-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.pump2WaterTemp / 40) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 冷却水压力 */}
            <div className="flex-1 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-purple-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${auxiliaryMetrics.coolingWaterPressure < 0.1 ? 'bg-red-500/20 text-red-400' : auxiliaryMetrics.coolingWaterPressure < 0.15 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {auxiliaryMetrics.coolingWaterPressure < 0.1 ? '过低' : auxiliaryMetrics.coolingWaterPressure < 0.15 ? '偏低' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {auxiliaryMetrics.coolingWaterPressure.toFixed(2)}
                <span className="text-sm font-normal text-slate-400 ml-1">MPa</span>
              </div>
              <div className="text-xs text-slate-400">冷却水压力</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${auxiliaryMetrics.coolingWaterPressure < 0.1 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-purple-400 to-purple-600'}`}
                  style={{ width: `${Math.min((auxiliaryMetrics.coolingWaterPressure / 0.5) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 实时图表展示区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 舱底水位实时监控图表 */}
          <UnifiedMonitoringChart
            realtimeData={realtimeChartData.filter(item =>
              item.equipmentId === 'WELL-001' && item.metricType === MetricType.PRESSURE
            )}
            parameters={[{
              key: 'bilgeWaterLevel',
              label: '舱底水位',
              metricType: MetricType.PRESSURE,
              color: '#3b82f6',
              unit: 'mm',
              threshold: {
                warning: 120, // 60% * 200mm
                critical: 160, // 80% * 200mm
                showLines: true
              }
            }]}
            chartType={ChartType.LINE}
            config={{
              title: "舱底水位监控",
              height: 300,
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showExport: true,
              showFullscreen: true,
              autoRefresh: true,
              refreshInterval: 3500,
              maxDataPoints: 60
            }}
          />

          {/* 冷却水压力实时监控图表 */}
          <UnifiedMonitoringChart
            realtimeData={realtimeChartData.filter(item =>
              item.equipmentId === 'PUMP-COOL-001' && item.metricType === MetricType.PRESSURE
            )}
            parameters={[{
              key: 'coolingWaterPressure',
              label: '冷却水压力',
              metricType: MetricType.PRESSURE,
              color: '#06b6d4',
              unit: 'kPa',
              threshold: {
                warning: 170,
                critical: 150,
                showLines: true
              }
            }]}
            chartType={ChartType.LINE}
            config={{
              title: "冷却水压力监控",
              height: 300,
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showExport: true,
              showFullscreen: true,
              autoRefresh: true,
              refreshInterval: 3500,
              maxDataPoints: 60
            }}
          />
        </div>


      </div>
    </div>
  );
}
