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
import { AlertSummary } from './AlertSummary';             // 告警摘要组件

// 图标组件导入（来自Lucide React图标库）
import {
  Waves,          // 水波图标 - 用于表示液体流动
  Thermometer,    // 温度计图标 - 用于表示温度
  AlertTriangle,  // 警告三角形图标 - 用于表示告警
  Droplets,       // 水滴图标 - 用于表示水位
  Settings        // 设置图标 - 用于表示系统设置
} from 'lucide-react';

// 统一数据类型导入
import { UnifiedMonitoringData, MetricType, DataQuality, DataSource } from '../types/monitoring'; // 统一数据类型

/**
 * 辅助系统指标数据类型定义
 * 
 * 描述：定义了辅助系统所有关键参数的监控数据结构
 * 
 * 监控参数说明：
 * - bilgeWaterLevel: 舱底水液位 (0-1范围的百分比)
 * - bilgeWaterTemp: 舱底水温度 (摄氏度)
 * - oilSeparatorStatus: 油水分离器运行状态
 * - bilgePumpStatus: 舱底水泵运行状态
 * - coolingWaterPressure: 冷却水系统压力 (kPa)
 * - coolingWaterTemp: 冷却水温度 (摄氏度)
 * - coolingWaterFlow: 冷却水流量 (L/min)
 * - coolingPumpStatus: 冷却水泵运行状态
 * - heatExchangerEfficiency: 热交换器效率 (百分比)
 * - systemStatus: 整体系统状态
 * - lastUpdate: 最后更新时间戳
 */
interface AuxiliaryMetrics {
  bilgeWaterLevel: number;                    // 舱底水液位 (0-1)
  bilgeWaterTemp: number;                     // 舱底水温度 (°C)
  oilSeparatorStatus: 'normal' | 'warning' | 'fault';  // 油水分离器状态
  bilgePumpStatus: 'normal' | 'warning' | 'fault';     // 舱底水泵状态
  coolingWaterPressure: number;               // 冷却水压力 (kPa)
  coolingWaterTemp: number;                   // 冷却水温度 (°C)
  coolingWaterFlow: number;                   // 冷却水流量 (L/min)
  coolingPumpStatus: 'normal' | 'warning' | 'fault';   // 冷却水泵状态
  heatExchangerEfficiency: number;           // 热交换器效率 (%)
  systemStatus: 'normal' | 'warning' | 'critical';     // 系统整体状态
  lastUpdate: number;                        // 最后更新时间戳
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
 * 辅助系统概览组件
 * 
 * 功能说明：
 * - 以卡片网格形式展示辅助系统关键指标
 * - 每个指标卡片包含图标、数值和单位
 * - 根据系统状态动态调整显示样式
 * 
 * 监控指标：
 * 1. 舱底水液位 (百分比)
 * 2. 舱底水温度 (摄氏度)
 * 3. 冷却水压力 (kPa)
 * 4. 冷却水温度 (摄氏度)
 * 5. 冷却水流量 (L/min)
 * 6. 系统整体状态
 * 
 * @param metrics 辅助系统指标数据
 */
const AuxiliaryOverview = ({ metrics }: { metrics: AuxiliaryMetrics }) => {
  /**
   * 根据状态获取对应颜色
   * @param status 系统状态
   * @returns CSS颜色类名
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400';    // 正常 - 绿色
      case 'warning': return 'text-yellow-400';  // 警告 - 黄色
      case 'critical': return 'text-red-400';    // 严重 - 红色
      case 'fault': return 'text-red-500';       // 故障 - 深红色
      default: return 'text-slate-400';          // 默认 - 灰色
    }
  };

  /**
   * 根据状态获取对应背景色
   * @param status 系统状态
   * @returns CSS背景色类名
   */
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500/20';     // 正常 - 绿色背景
      case 'warning': return 'bg-yellow-500/20';   // 警告 - 黄色背景
      case 'critical': return 'bg-red-500/20';     // 严重 - 红色背景
      case 'fault': return 'bg-red-600/20';        // 故障 - 深红色背景
      default: return 'bg-slate-500/20';           // 默认 - 灰色背景
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* 舱底水液位监控卡片 */}
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 text-blue-400" />
          <div>
            <p className="text-slate-400 text-sm">舱底水位</p>
            <p className="text-slate-100 text-xl font-bold">
              {(metrics.bilgeWaterLevel * 100).toFixed(0)}%  {/* 转换为百分比显示 */}
            </p>
          </div>
        </div>
      </Card>

      {/* 舱底水温度监控卡片 */}
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Thermometer className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-slate-400 text-sm">舱底水温度</p>
            <p className="text-slate-100 text-xl font-bold">
              {metrics.bilgeWaterTemp.toFixed(1)}°C
            </p>
          </div>
        </div>
      </Card>

      {/* 冷却水压力监控卡片 */}
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-cyan-400" />
          <div>
            <p className="text-slate-400 text-sm">冷却水压力</p>
            <p className="text-slate-100 text-xl font-bold">
              {metrics.coolingWaterPressure.toFixed(0)}kPa
            </p>
          </div>
        </div>
      </Card>

      {/* 冷却水温度监控卡片 */}
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Thermometer className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-slate-400 text-sm">冷却水温度</p>
            <p className="text-slate-100 text-xl font-bold">
              {metrics.coolingWaterTemp.toFixed(1)}°C
            </p>
          </div>
        </div>
      </Card>

      {/* 冷却水流量监控卡片 */}
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Waves className="w-8 h-8 text-green-400" />
          <div>
            <p className="text-slate-400 text-sm">冷却水流量</p>
            <p className="text-slate-100 text-xl font-bold">
              {metrics.coolingWaterFlow.toFixed(0)}L/min
            </p>
          </div>
        </div>
      </Card>

      {/* 系统状态监控卡片 */}
      <Card className={`bg-slate-800/60 border-slate-700 p-4 ${getStatusBg(metrics.systemStatus)}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-8 h-8 ${getStatusColor(metrics.systemStatus)}`} />
          <div>
            <p className="text-slate-400 text-sm">系统状态</p>
            <p className={`text-xl font-bold ${getStatusColor(metrics.systemStatus)}`}>
              {metrics.systemStatus === 'normal' ? '正常' :
               metrics.systemStatus === 'warning' ? '警告' : '严重'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * 设备状态卡片组件
 * 
 * 功能说明：
 * - 以卡片形式展示单个设备的详细信息
 * - 显示设备名称、状态指示器和运行参数
 * - 根据设备状态使用不同的边框颜色和背景
 * 
 * 显示内容：
 * - 设备名称和状态指示灯
 * - 运行参数列表（流量、压力、温度等）
 * 
 * @param device 设备数据
 */
const DeviceStatusCard = ({ device }: { device: AuxiliaryDevice }) => {
  /**
   * 根据状态获取文字颜色
   * @param status 设备状态
   * @returns CSS颜色类名
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400';    // 正常 - 绿色
      case 'warning': return 'text-yellow-400';  // 警告 - 黄色
      case 'fault': return 'text-red-500';       // 故障 - 红色
      default: return 'text-slate-400';          // 默认 - 灰色
    }
  };

  /**
   * 根据状态获取边框和背景样式
   * @param status 设备状态
   * @returns CSS样式类名
   */
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'border-green-500 bg-green-500/10';     // 正常 - 绿色边框背景
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';   // 警告 - 黄色边框背景
      case 'fault': return 'border-red-500 bg-red-500/10';           // 故障 - 红色边框背景
      default: return 'border-slate-500 bg-slate-500/10';           // 默认 - 灰色边框背景
    }
  };

  return (
    <Card className={`p-6 border-l-4 ${getStatusBg(device.status)}`}>
      {/* 设备名称和状态指示器 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-slate-300 font-medium text-lg">{device.name}</h4>
        {/* 状态指示灯 */}
        <div className={`
          w-3 h-3 rounded-full
          ${device.status === 'normal' ? 'bg-green-500' : ''}
          ${device.status === 'warning' ? 'bg-yellow-500' : ''}
          ${device.status === 'fault' ? 'bg-red-500' : ''}
        `} />
      </div>
      
      {/* 设备参数网格 */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {Object.entries(device.parameters).map(([key, value]) => (
          <div key={key}>
            <p className="text-slate-400">{key}</p>
            <p className="text-slate-100 font-medium">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </p>
          </div>
        ))}
      </div>
    </Card>
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
    bilgeWaterLevel: 0.35,        // 初始舱底水液位 35%
    bilgeWaterTemp: 28.5,         // 初始舱底水温度 28.5°C
    oilSeparatorStatus: 'normal', // 油水分离器初始状态
    bilgePumpStatus: 'normal',    // 舱底水泵初始状态
    coolingWaterPressure: 185,    // 初始冷却水压力 185kPa
    coolingWaterTemp: 38.2,       // 初始冷却水温度 38.2°C
    coolingWaterFlow: 95,         // 初始冷却水流量 95L/min
    coolingPumpStatus: 'normal',  // 冷却水泵初始状态
    heatExchangerEfficiency: 85.7, // 初始热交换器效率 85.7%
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
       * 生成随机波动的基础指标值
       * 使用数学函数确保值在合理范围内
       */
      const bilgeWaterLevel = Math.max(0, Math.min(1, prev.bilgeWaterLevel + (Math.random() - 0.5) * 0.05));
      const bilgeWaterTemp = Math.max(0, 25 + Math.random() * 10);
      const coolingWaterPressure = Math.max(0, 180 + Math.random() * 20);
      const coolingWaterTemp = Math.max(0, 35 + Math.random() * 10);
      const coolingWaterFlow = Math.max(0, 90 + Math.random() * 20);
      const heatExchangerEfficiency = Math.max(0, Math.min(100, 85 + (Math.random() - 0.5) * 5));

      /**
       * 随机设备状态更新
       * 模拟设备偶尔出现的异常状态
       *
       * 状态概率设置：
       * - normal: 92-98% 正常
       * - warning: 2-5% 警告
       * - fault: 2-3% 故障
       */
      const oilSeparatorStatus: 'normal' | 'warning' | 'fault' =
        Math.random() > 0.95 ? 'warning' :    // 5% 警告
        Math.random() > 0.98 ? 'fault' : 'normal'; // 2% 故障
      const bilgePumpStatus: 'normal' | 'warning' | 'fault' =
        Math.random() > 0.92 ? 'warning' :      // 8% 警告
        Math.random() > 0.97 ? 'fault' : 'normal';   // 3% 故障
      const coolingPumpStatus: 'normal' | 'warning' | 'fault' =
        Math.random() > 0.94 ? 'warning' :    // 6% 警告
        Math.random() > 0.98 ? 'fault' : 'normal'; // 2% 故障

      /**
       * 检查和更新系统整体状态
       * 故障设备数量决定系统状态级别：
       * - critical: 有任何故障设备
       * - warning: 有任何警告设备但无故障
       * - normal: 所有设备正常
       */
      let systemStatus: 'normal' | 'warning' | 'critical' = 'normal';
      if (oilSeparatorStatus === 'fault' || bilgePumpStatus === 'fault' || coolingPumpStatus === 'fault') {
        systemStatus = 'critical';  // 任何故障都导致严重状态
      } else if (oilSeparatorStatus === 'warning' || bilgePumpStatus === 'warning' || coolingPumpStatus === 'warning') {
        systemStatus = 'warning';   // 有警告但无故障
      }

      // 构造新的指标数据对象
      const newMetrics = {
        bilgeWaterLevel,
        bilgeWaterTemp,
        oilSeparatorStatus,
        bilgePumpStatus,
        coolingWaterPressure,
        coolingWaterTemp,
        coolingWaterFlow,
        coolingPumpStatus,
        heatExchangerEfficiency,
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
        id: `bilge_water_level_${timestamp}`,
        equipmentId: 'WELL-001',
        timestamp,
        metricType: MetricType.PRESSURE,
        value: (auxiliaryMetrics.bilgeWaterLevel + (Math.random() - 0.5) * 0.02) * 200, // 转换为mm
        unit: 'mm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `bilge_water_temp_${timestamp}`,
        equipmentId: 'WELL-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: auxiliaryMetrics.bilgeWaterTemp + (Math.random() - 0.5) * 1,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `cooling_water_pressure_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.PRESSURE,
        value: auxiliaryMetrics.coolingWaterPressure + (Math.random() - 0.5) * 5,
        unit: 'kPa',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `cooling_water_temp_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: auxiliaryMetrics.coolingWaterTemp + (Math.random() - 0.5) * 1,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `cooling_water_flow_${timestamp}`,
        equipmentId: 'PUMP-COOL-001',
        timestamp,
        metricType: MetricType.SPEED,
        value: auxiliaryMetrics.coolingWaterFlow + (Math.random() - 0.5) * 3,
        unit: 'L/min',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      }
    ];
    
    setRealtimeChartData(prev => [...prev, ...newPoints].slice(-300)); // 保持最近60个时间点的数据（5个参数×60个时间点）
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

        {/* 辅助系统状态概览 */}
        <AuxiliaryOverview metrics={auxiliaryMetrics} />

        {/* 辅助设备状态区域 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-4">辅助设备状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {auxiliaryDevices.map(device => (
              <div key={device.id}>
                <DeviceStatusCard device={device} />
              </div>
            ))}
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

        {/* 主要内容网格布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 舱底水告警系统配置表格 */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/80 border-slate-700 p-6">
              <h2 className="text-slate-100 mb-6">舱底水告警系统</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* 表头 */}
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-3 text-slate-300 text-sm">监测项目</th>
                      <th className="text-left py-3 px-3 text-slate-300 text-sm">单位</th>
                      <th className="text-left py-3 px-3 text-slate-300 text-sm">告警阈值</th>
                      <th className="text-left py-3 px-3 text-slate-300 text-sm">处理措施</th>
                      <th className="text-center py-3 px-3 text-slate-300 text-sm">驾控台显示</th>
                      <th className="text-center py-3 px-3 text-slate-300 text-sm">驾控台警告</th>
                      <th className="text-center py-3 px-3 text-slate-300 text-sm">就地显示</th>
                      <th className="text-center py-3 px-3 text-slate-300 text-sm">就地警告</th>
                    </tr>
                  </thead>
                  
                  {/* 表体 */}
                  <tbody>
                    {bilgeWaterSpecs.map((spec, index) => {
                      /**
                       * 获取当前实际值用于状态判断
                       * 根据监测项目返回对应的当前值
                       */
                      const getCurrentValue = () => {
                        switch (spec.item) {
                          case '舱底水高位报警': return auxiliaryMetrics.bilgeWaterLevel * 100;
                          case '舱底水超高位报警': return auxiliaryMetrics.bilgeWaterLevel * 100;
                          case '油水分离器故障': return auxiliaryMetrics.oilSeparatorStatus;
                          case '舱底水泵故障': return auxiliaryMetrics.bilgePumpStatus;
                          default: return 0;
                        }
                      };

                      const currentValue = getCurrentValue();
                      let isAlert = false; // 是否触发告警状态
                      
                      /**
                       * 检查当前值是否触发告警条件
                       * 根据不同项目设置不同的判断逻辑
                       */
                      if (spec.item.includes('超高位') && (currentValue as number) > 80) {
                        isAlert = true; // 超高位且超过80%触发告警
                      } else if (spec.item.includes('故障') && (currentValue as string) !== 'normal') {
                        isAlert = true; // 故障项目且状态不为正常时触发告警
                      }

                      return (
                        <tr
                          key={index}
                          className={`border-b border-slate-700/50 ${
                            isAlert ? 'bg-red-500/10' : 'hover:bg-slate-900/30'
                          }`}
                        >
                          {/* 监测项目名称 */}
                          <td className="py-3 px-3 text-slate-300 text-sm">{spec.item}</td>
                          {/* 监测单位 */}
                          <td className="py-3 px-3 text-slate-400 text-sm">{spec.unit}</td>
                          {/* 告警阈值 */}
                          <td className="py-3 px-3 text-amber-400 text-sm">{spec.threshold}</td>
                          {/* 处理措施 */}
                          <td className="py-3 px-3 text-cyan-400 text-sm">{spec.action}</td>
                          {/* 驾控台显示复选框 */}
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.cockpitDisplay} disabled />
                          </td>
                          {/* 驾控台警告复选框 */}
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.cockpitWarning} disabled />
                          </td>
                          {/* 就地显示复选框 */}
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.localDisplay} disabled />
                          </td>
                          {/* 就地警告复选框 */}
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.localWarning} disabled />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* 侧边栏：系统效率和告警历史 */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* 系统效率监控卡片 */}
              <Card className="bg-slate-800/80 border-slate-700 p-6">
                <h3 className="text-slate-100 mb-4">系统效率</h3>
                <div className="space-y-3">
                  {/* 效率显示 */}
                  <div className="flex justify-between">
                    <span className="text-slate-400">热交换器效率</span>
                    <span className="text-slate-100 font-medium">
                      {auxiliaryMetrics.heatExchangerEfficiency.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* 效率进度条 */}
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${auxiliaryMetrics.heatExchangerEfficiency}%` }}
                    />
                  </div>
                </div>
              </Card>

              {/* 告警摘要组件 */}
              <AlertSummary
                title="辅助系统告警"
                equipmentId="auxiliary-system"
                equipmentName="辅助系统"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
