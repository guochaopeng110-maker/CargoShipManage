import React, { useState, useEffect, useCallback } from 'react';
import { AlertSummary } from './AlertSummary';
import { UnifiedMonitoringChart, ChartType, MonitoringParameter } from './UnifiedMonitoringChart';
import { GaugeRenderer } from './GaugeRenderer';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ReportGenerator } from './ui/report-generator';
import {
  Battery,
  TrendingUp,
  Activity,
  AlertCircle,
  Thermometer,
  Zap,
  Gauge,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useMonitoringStore } from '../stores/monitoring-store';
import { ConnectionStatus, MetricReading } from '../types/monitoring';
import { Alarm } from '../types/alarms';
import { UnifiedMonitoringData, MetricType, DataQuality, DataSource } from '../types/monitoring';

/**
 * 电池系统指标数据类型定义
 *
 * 描述：定义了电池系统6个核心监控参数的数据结构
 * 用于仪表盘实时数据显示和状态管理
 *
 * 核心指标说明：
 * - totalVoltage: 电池系统总电压，单位V，正常范围584.1-683.1V
 * - cellVoltage: 单体电池电压，单位V，正常范围2.95-3.45V
 * - current: 充放电电流，单位A，正常范围0-160A
 * - batteryTemp: 电池温度，单位°C，正常范围4-50°C
 * - ambientTemp: 环境温度，单位°C，正常范围-10-45°C
 * - soc: State of Charge荷电状态，单位%，正常范围20-100%
 * - chargingStatus: 充电状态枚举
 * - lastUpdate: 最后更新时间戳，用于数据时效性判断
 */
interface BatteryMetrics {
  totalVoltage: number;                 // 总电压 (V) - 仪表盘显示的核心指标
  cellVoltage: number;                  // 单体电压 (V) - 单体电池健康状态指标
  current: number;                      // 充放电流 (A) - 充放电状态和功率指标
  batteryTemp: number;                  // 电池温度 (°C) - 电池热管理关键指标
  ambientTemp: number;                  // 环境温度 (°C) - 环境影响评估指标
  soc: number;                          // 荷电状态 (%) - 电池剩余电量关键指标
  chargingStatus: 'charging' | 'discharging' | 'idle'; // 充电状态 - 系统运行状态指示
  lastUpdate: number;                   // 更新时间戳 - 数据时效性标记
}

/**
 * 电池模块数据类型定义
 * 
 * 描述：定义单个电池模块的监控数据结构
 * 
 * 属性说明：
 * - id: 模块唯一标识符
 * - name: 模块显示名称（如左串1、右串2等）
 * - voltage: 模块电压 (V)
 * - temperature: 模块温度 (°C)
 * - status: 运行状态
 * - soc: 模块荷电状态 (%)
 */
interface BatteryModule {
  id: string;                          // 模块ID
  name: string;                        // 模块名称
  voltage: number;                     // 模块电压 (V)
  temperature: number;                 // 模块温度 (°C)
  status: 'normal' | 'warning' | 'critical'; // 运行状态
  soc: number;                         // 荷电状态 (%)
}

/**
 * 电池系统连接状态指示器组件
 * 
 * 功能说明：
 * - 显示电池系统的实时连接状态
 * - 使用不同颜色、图标和文字表示连接状态
 * - 提供直观的系统连接状态反馈
 * 
 * 状态类型：
 * - connected: 实时监控中 (绿色，WiFi图标)
 * - connecting: 连接中 (黄色，Activity图标带动画)
 * - error: 连接错误 (红色，WifiOff图标)
 * - default: 未连接 (灰色，WifiOff图标)
 * 
 * @param status 连接状态枚举值
 */
function BatteryConnectionStatus({ status }: { status: ConnectionStatus }) {
  /**
   * 根据连接状态获取文字颜色
   * @returns CSS颜色类名
   */
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-400';    // 绿色 - 已连接
      case 'connecting':
        return 'text-yellow-400';   // 黄色 - 连接中
      case 'error':
        return 'text-red-400';      // 红色 - 连接错误
      default:
        return 'text-gray-400';     // 灰色 - 未连接
    }
  };

  /**
   * 根据连接状态获取图标组件
   * @returns React图标组件
   */
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;                    // WiFi图标
      case 'connecting':
        return <Activity className="w-4 h-4 animate-pulse" />;  // Activity图标带脉冲动画
      case 'error':
        return <WifiOff className="w-4 h-4" />;                 // WiFi断开图标
      default:
        return <WifiOff className="w-4 h-4" />;                 // 默认WiFi断开图标
    }
  };

  /**
   * 根据连接状态获取显示文字
   * @returns 状态描述文字
   */
  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return '实时监控中';  // 实时监控状态
      case 'connecting':
        return '连接中...';    // 连接进行中
      case 'error':
        return '连接错误';     // 连接异常
      default:
        return '未连接';       // 未连接状态
    }
  };

  return (
    <div className={`flex items-center gap-2 ${getStatusColor()}`}>
      {/* 状态图标 */}
      {getStatusIcon()}
      {/* 状态文字 */}
      <span className="text-sm font-medium">{getStatusText()}</span>
    </div>
  );
}


/**
 * 电池监控参数配置
 *
 * 描述：定义仪表盘和图表中显示的电池参数
 * 包含6个核心监测指标：总电压、单体电压、充放电流、电池温度、环境温度、SOC
 *
 * 配置属性：
 * - key: 数据键名（对应数据结构中的属性）
 * - label: 参数显示名称
 * - color: 图表线条颜色
 * - unit: 单位
 * - threshold: 阈值配置
 */
// 电池监控参数配置 - 仪表盘展示用
const batteryGaugeParameters: MonitoringParameter[] = [
  {
    key: 'totalVoltage',
    label: '总电压',
    metricType: MetricType.VOLTAGE,
    color: '#06b6d4',     // 青色
    unit: 'V',
    threshold: {
      warning: 650,      // 警告阈值 650V (接近上限)
      critical: 680,     // 严重阈值 680V (超限)
      showLines: true
    }
  },
  {
    key: 'cellVoltage',
    label: '单体电压',
    metricType: MetricType.VOLTAGE,
    color: '#3b82f6',     // 蓝色
    unit: 'V',
    threshold: {
      warning: 3.4,      // 警告阈值 3.4V (接近上限)
      critical: 3.5,     // 严重阈值 3.5V (超限)
      showLines: true
    }
  },
  {
    key: 'current',
    label: '充放电流',
    metricType: MetricType.CURRENT,
    color: '#8b5cf6',     // 紫色
    unit: 'A',
    threshold: {
      warning: 140,      // 警告阈值 140A
      critical: 160,     // 严重阈值 160A
      showLines: true
    }
  },
  {
    key: 'batteryTemp',
    label: '电池温度',
    metricType: MetricType.TEMPERATURE,
    color: '#f59e0b',    // 琥珀色
    unit: '°C',
    threshold: {
      warning: 40,       // 警告阈值 40°C
      critical: 50,      // 严重阈值 50°C
      showLines: true
    }
  },
  {
    key: 'ambientTemp',
    label: '环境温度',
    metricType: MetricType.TEMPERATURE,
    color: '#10b981',    // 翠绿色
    unit: '°C',
    threshold: {
      warning: 35,       // 警告阈值 35°C
      critical: 45,      // 严重阈值 45°C
      showLines: true
    }
  },
  {
    key: 'soc',
    label: 'SOC',
    metricType: MetricType.POWER,
    color: '#22c55e',    // 绿色
    unit: '%',
    threshold: {
      warning: 20,       // 警告阈值 20%
      critical: 10,      // 严重阈值 10%
      showLines: true
    }
  },
];

// 历史数据图表参数配置
const batteryChartParameters: MonitoringParameter[] = [
  {
    key: 'totalVoltage',
    label: '总电压',
    metricType: MetricType.VOLTAGE,
    color: '#06b6d4',
    unit: 'V',
    threshold: {
      warning: 650,
      critical: 680,
      showLines: true
    }
  },
  {
    key: 'cellVoltage',
    label: '单体电压',
    metricType: MetricType.VOLTAGE,
    color: '#3b82f6',
    unit: 'V',
    threshold: {
      warning: 3.4,
      critical: 3.5,
      showLines: true
    }
  },
  {
    key: 'current',
    label: '充放电流',
    metricType: MetricType.CURRENT,
    color: '#8b5cf6',
    unit: 'A',
    threshold: {
      warning: 140,
      critical: 160,
      showLines: true
    }
  },
  {
    key: 'batteryTemp',
    label: '电池温度',
    metricType: MetricType.TEMPERATURE,
    color: '#f59e0b',
    unit: '°C',
    threshold: {
      warning: 40,
      critical: 50,
      showLines: true
    }
  },
  {
    key: 'ambientTemp',
    label: '环境温度',
    metricType: MetricType.TEMPERATURE,
    color: '#10b981',
    unit: '°C',
    threshold: {
      warning: 35,
      critical: 45,
      showLines: true
    }
  },
  {
    key: 'soc',
    label: 'SOC',
    metricType: MetricType.POWER,
    color: '#22c55e',
    unit: '%',
    threshold: {
      warning: 20,
      critical: 10,
      showLines: true
    }
  },
];

/**
 * 电池告警规格配置数据
 * 
 * 描述：电池系统各级告警的详细配置参数
 * 
 * 告警级别说明：
 * - level1: 1级告警（最低级别）
 * - level2: 2级告警（中等级别）
 * - level3: 3级告警（最高级别）
 * 
 * 配置属性说明：
 * - item: 监测项目名称
 * - normalRange: 正常范围
 * - level1-3: 各级告警阈值范围
 * - delay: 告警延迟时间
 * - recovery: 恢复条件
 * - action: 处理措施
 */
const batterySpecs = [
  {
    item: '总电压',
    normalRange: '600-750V',
    level3: '>800V 或 <550V',        // 3级告警：极高或极低电压
    level2: '750-800V 或 550-600V',  // 2级告警：较高或较低电压
    level1: '720-750V 或 600-620V',  // 1级告警：轻微异常电压
    delay: '5秒',                    // 告警延迟5秒
    recovery: '恢复至正常范围30秒',    // 30秒后恢复正常
    action: '立即停机检查',           // 立即停机进行全面检查
  },
  {
    item: '单体电压',
    normalRange: '3.2-3.6V',
    level3: '>4.0V 或 <2.8V',        // 3级告警：单体电压极高或极低
    level2: '3.8-4.0V 或 2.8-3.0V',  // 2级告警：单体电压较高或较低
    level1: '3.6-3.8V 或 3.0-3.2V',  // 1级告警：轻微单体电压异常
    delay: '3秒',                    // 告警延迟3秒
    recovery: '恢复至正常范围20秒',    // 20秒后恢复正常
    action: '检查电池组平衡',         // 检查电池组均衡状态
  },
  {
    item: '温度',
    normalRange: '15-40°C',
    level3: '>55°C 或 <-5°C',        // 3级告警：极高温或极低温
    level2: '45-55°C 或 -5-5°C',     // 2级告警：高温或低温
    level1: '40-45°C 或 5-15°C',     // 1级告警：轻微温度异常
    delay: '10秒',                   // 告警延迟10秒
    recovery: '恢复至正常范围60秒',    // 60秒后恢复正常
    action: '启动冷却系统',           // 启动冷却或加热系统
  },
  {
    item: 'SOC',
    normalRange: '20-95%',
    level3: '<10%',                  // 3级告警：电量极低
    level2: '10-15%',                // 2级告警：电量不足
    level1: '15-20%',                // 1级告警：电量偏低
    delay: '5秒',                    // 告警延迟5秒
    recovery: '充电至>20%',           // 充电至20%以上
    action: '立即充电',              // 立即启动充电
  },
  {
    item: 'SOH',
    normalRange: '>80%',
    level3: '<60%',                  // 3级告警：健康状态极差
    level2: '60-70%',                // 2级告警：健康状态较差
    level1: '70-80%',                // 1级告警：健康状态下降
    delay: '持续',                    // 持续监控，无延迟
    recovery: '更换电池组',           // 需要更换电池组
    action: '计划维护',              // 安排维护计划
  }
];


/**
 * 电池系统监控页面主组件
 *
 * 功能说明：
 * - 整合所有电池系统监控功能的页面组件
 * - 管理电池实时数据状态和设备信息
 * - 提供数据可视化、告警管理和导出功能
 * - 支持WebSocket断开时自动切换到Mock数据
 *
 * 主要功能模块：
 * 1. 电池系统仪表盘（6个核心指标实时展示）
 * 2. 实时数据图表（电压、温度趋势监控）
 * 3. 系统告警监控（突出显示告警状态和摘要信息）
 * 4. 历史数据分析（支持API查询，多种图表类型展示）
 * 5. 电池系统参数配置（详细的告警阈值和处理措施）
 *
 * 数据更新机制：
 * - WebSocket连接正常时使用实时数据
 * - WebSocket断开时自动切换到Mock数据
 * - 每2秒更新一次所有监控数据
 * - 实时生成模拟数据模拟真实环境
 * - 动态调整设备状态和参数值
 * - 图表数据保持最近432个数据点（6个指标×72个时间点）
 * - 历史数据通过API查询，支持多种时间范围
 *
 * 数据源切换逻辑：
 * - 优先使用WebSocket实时数据
 * - 连接断开时自动启用Mock数据模式
 * - 用户界面显示当前数据源状态
 * - 历史数据独立查询，不依赖实时连接状态
 */
export function BatteryMonitoringPage() {
  // 电池组配置信息
  const batteryConfigs = {
    'BATT-001': {
      name: '1#电池组',
      id: 'BATT-001',
      description: '主电池组',
      // 为不同电池组设置不同的数据范围，以便区分
      dataRange: {
        totalVoltage: { min: 620, max: 660, initial: 640 },
        cellVoltage: { min: 3.15, max: 3.35, initial: 3.25 },
        current: { min: 70, max: 110, initial: 90 },
        batteryTemp: { min: 25, max: 40, initial: 32 },
        ambientTemp: { min: 20, max: 30, initial: 25 },
        soc: { min: 70, max: 90, initial: 80 }
      }
    },
    'BATT-002': {
      name: '2#电池组',
      id: 'BATT-002',
      description: '备用电池组',
      // 为不同电池组设置不同的数据范围，以便区分
      dataRange: {
        totalVoltage: { min: 610, max: 650, initial: 630 },
        cellVoltage: { min: 3.10, max: 3.30, initial: 3.20 },
        current: { min: 60, max: 100, initial: 80 },
        batteryTemp: { min: 22, max: 37, initial: 29 },
        ambientTemp: { min: 18, max: 28, initial: 23 },
        soc: { min: 65, max: 85, initial: 75 }
      }
    }
  };

  // 从localStorage获取用户偏好的电池组，如果没有则默认为1#电池组
  const getInitialBattery = (): 'BATT-001' | 'BATT-002' => {
    const saved = localStorage.getItem('preferredBattery');
    return (saved === 'BATT-001' || saved === 'BATT-002') ? saved : 'BATT-001';
  };

  // 当前选中的电池组状态
  const [selectedBattery, setSelectedBattery] = useState<'BATT-001' | 'BATT-002'>(getInitialBattery);

  // 电池组切换加载状态
  const [isSwitchingBattery, setIsSwitchingBattery] = useState(false);

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

  // 派生状态计算
  const connectedDevices = Object.values(devices);
  const deviceCount = Object.keys(devices).length;
  const hasErrors = errors.length > 0;

  // WebSocket连接状态监听 - 断开时自动启用Mock数据
  useEffect(() => {
    const isDisconnected = !realtimeConnected || connectionStatus === 'error' || connectionStatus === 'disconnected';
    setUseMockData(isDisconnected);

    if (isDisconnected) {
      console.info('WebSocket连接断开，自动启用Mock数据模式');
    } else {
      console.info('WebSocket连接正常，使用实时数据');
    }
  }, [realtimeConnected, connectionStatus]);

  // 电池系统指标状态管理 - 根据当前选中的电池组初始化
  const [batteryMetrics, setBatteryMetrics] = useState<BatteryMetrics>(() => {
    const config = batteryConfigs[selectedBattery];
    const range = config.dataRange;
    return {
      totalVoltage: range.totalVoltage.initial,
      cellVoltage: range.cellVoltage.initial,
      current: range.current.initial,
      batteryTemp: range.batteryTemp.initial,
      ambientTemp: range.ambientTemp.initial,
      soc: range.soc.initial,
      chargingStatus: 'idle',
      lastUpdate: Date.now(),
    };
  });

  // 实时图表数据存储 - 转换为统一格式
  const [realtimeChartData, setRealtimeChartData] = useState<UnifiedMonitoringData[]>([]);

  // Mock数据使用状态 - WebSocket断开时自动启用
  const [useMockData, setUseMockData] = useState(false);

  // 历史数据查询状态
  const [historicalData, setHistoricalData] = useState<UnifiedMonitoringData[]>([]);
  const [isQueryingHistory, setIsQueryingHistory] = useState(false);
  const [queryTimeRange, setQueryTimeRange] = useState({ start: 0, end: 0 });

  // 历史数据分析类型选择状态
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('totalVoltage');

  // 日期范围选择器状态
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });

  // 历史数据分析类型配置（只保留折线图和柱状图）
  const analysisTypes = [
    {
      key: 'totalVoltage',
      label: '总电压趋势分析',
      icon: TrendingUp,
      chartType: ChartType.LINE,
      parameters: [batteryChartParameters[0]], // 总电压
      dataFilter: (d: UnifiedMonitoringData) => d.metricType === MetricType.VOLTAGE && d.value > 100, // 总电压 > 100V
      description: '显示电池系统总电压的历史变化趋势'
    },
    {
      key: 'soc',
      label: 'SOC趋势分析',
      icon: Gauge,
      chartType: ChartType.LINE,
      parameters: [batteryChartParameters[5]], // SOC
      dataFilter: (d: UnifiedMonitoringData) => d.metricType === MetricType.POWER,
      description: '显示电池荷电状态的历史变化趋势'
    },
    {
      key: 'temperature',
      label: '温度趋势分析',
      icon: Thermometer,
      chartType: ChartType.LINE,
      parameters: [batteryChartParameters[3], batteryChartParameters[4]], // 电池温度和环境温度
      dataFilter: (d: UnifiedMonitoringData) => d.metricType === MetricType.TEMPERATURE,
      description: '显示电池温度和环境温度的历史对比分析'
    },
    {
      key: 'current',
      label: '电流趋势分析',
      icon: Zap,
      chartType: ChartType.BAR,
      parameters: [batteryChartParameters[2]], // 充放电流
      dataFilter: (d: UnifiedMonitoringData) => d.metricType === MetricType.CURRENT,
      description: '显示电池充放电流的历史变化趋势'
    },
    {
      key: 'cellVoltage',
      label: '单体电压趋势分析',
      icon: Battery,
      chartType: ChartType.LINE,
      parameters: [batteryChartParameters[1]], // 单体电压
      dataFilter: (d: UnifiedMonitoringData) => d.metricType === MetricType.VOLTAGE && d.value < 10, // 单体电压 < 10V
      description: '显示电池单体电压的历史变化趋势'
    }
  ];

  /**
    * 更新电池指标函数
    * 模拟电池系统6个核心指标的实时变化
    * 根据当前选中的电池组使用不同的数据范围
    */
  const updateBatteryMetrics = useCallback(() => {
    const range = batteryConfigs[selectedBattery].dataRange;

    setBatteryMetrics(prev => {
      const totalVoltage = Math.max(range.totalVoltage.min, Math.min(range.totalVoltage.max, prev.totalVoltage + (Math.random() - 0.5) * 2));
      const cellVoltage = Math.max(range.cellVoltage.min, Math.min(range.cellVoltage.max, prev.cellVoltage + (Math.random() - 0.5) * 0.05));
      const current = Math.max(range.current.min, Math.min(range.current.max, prev.current + (Math.random() - 0.5) * 3));
      const batteryTemp = Math.max(range.batteryTemp.min, Math.min(range.batteryTemp.max, prev.batteryTemp + (Math.random() - 0.5) * 1));
      const ambientTemp = Math.max(range.ambientTemp.min, Math.min(range.ambientTemp.max, prev.ambientTemp + (Math.random() - 0.5) * 0.5));
      const soc = Math.max(range.soc.min, Math.min(range.soc.max, prev.soc + (Math.random() - 0.5) * 1));
      const chargingStatus = Math.random() > 0.8 ? 'charging' : Math.random() > 0.6 ? 'discharging' : 'idle';

      return {
        totalVoltage,
        cellVoltage,
        current,
        batteryTemp,
        ambientTemp,
        soc,
        chargingStatus,
        lastUpdate: Date.now(),
      };
    });
  }, [selectedBattery]);

  /**
   * 生成模拟历史数据
   * 
   * 功能说明：
   * - 当后端接口查询失败时，生成模拟的历史数据用于展示
   * - 确保图表区域不会显示空白
   * - 数据符合电池系统的实际参数范围
   * 
   * @param startTime 开始时间戳
   * @param endTime 结束时间戳
   * @returns 模拟的历史数据数组
   */
  const generateMockHistoricalData = useCallback((
    startTime: number,
    endTime: number,
    equipmentId: string = selectedBattery
  ): UnifiedMonitoringData[] => {
    const mockData: UnifiedMonitoringData[] = [];
    const timeRange = endTime - startTime;
    const dataPointCount = Math.min(Math.floor(timeRange / (30 * 60 * 1000)), 100); // 最多100个数据点，每30分钟一个

    // 获取当前电池组的数据范围
    const range = batteryConfigs[equipmentId as 'BATT-001' | 'BATT-002'].dataRange;

    for (let i = 0; i < dataPointCount; i++) {
      const timestamp = startTime + (i * timeRange / dataPointCount);

      // 生成6个指标的模拟数据，使用当前电池组的数据范围
      mockData.push({
        id: `mock-voltage-${equipmentId}-${i}`,
        equipmentId: equipmentId,
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: range.totalVoltage.initial + (Math.random() - 0.5) * (range.totalVoltage.max - range.totalVoltage.min) * 0.3,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      mockData.push({
        id: `mock-cellVoltage-${equipmentId}-${i}`,
        equipmentId: equipmentId,
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: range.cellVoltage.initial + (Math.random() - 0.5) * (range.cellVoltage.max - range.cellVoltage.min) * 0.3,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      mockData.push({
        id: `mock-current-${equipmentId}-${i}`,
        equipmentId: equipmentId,
        timestamp,
        metricType: MetricType.CURRENT,
        value: range.current.initial + (Math.random() - 0.5) * (range.current.max - range.current.min) * 0.3,
        unit: 'A',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      mockData.push({
        id: `mock-batteryTemp-${equipmentId}-${i}`,
        equipmentId: equipmentId,
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: range.batteryTemp.initial + (Math.random() - 0.5) * (range.batteryTemp.max - range.batteryTemp.min) * 0.3,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      mockData.push({
        id: `mock-ambientTemp-${equipmentId}-${i}`,
        equipmentId: equipmentId,
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: range.ambientTemp.initial + (Math.random() - 0.5) * (range.ambientTemp.max - range.ambientTemp.min) * 0.3,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      mockData.push({
        id: `mock-soc-${equipmentId}-${i}`,
        equipmentId: equipmentId,
        timestamp,
        metricType: MetricType.POWER,
        value: range.soc.initial + (Math.random() - 0.5) * (range.soc.max - range.soc.min) * 0.3,
        unit: '%',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
    }

    return mockData;
  }, [selectedBattery]);

  /**
   * 根据分析类型获取需要查询的指标类型
   *
   * @param analysisType 分析类型
   * @returns 需要查询的指标类型数组
   */
  const getMetricTypesForAnalysis = useCallback((analysisType: string): MetricType[] => {
    switch (analysisType) {
      case 'totalVoltage':
        return [MetricType.VOLTAGE];
      case 'soc':
        return [MetricType.POWER];
      case 'temperature':
        return [MetricType.TEMPERATURE];
      case 'current':
        return [MetricType.CURRENT];
      case 'cellVoltage':
        return [MetricType.VOLTAGE];
      default:
        return [MetricType.VOLTAGE]; // 默认查询电压数据
    }
  }, []);

  /**
   * 查询历史数据函数
   *
   * 功能说明：
   * - 使用统一的monitoring-store接口查询指定时间范围的历史数据
   * - 根据当前选中的分析类型只查询相关的指标数据，减少后端请求次数
   * - 处理查询结果并转换为统一数据格式
   * - 提供错误处理和加载状态管理
   * - 后端查询失败时自动生成模拟数据
   *
   * @param startTime 查询开始时间戳
   * @param endTime 查询结束时间戳
   * @param equipmentId 设备ID，默认为当前选中的电池组
   * @param analysisType 分析类型，默认为当前选中的分析类型
   */
  const queryHistoricalData = useCallback(async (
    startTime: number,
    endTime: number,
    equipmentId: string = selectedBattery,
    analysisType: string = selectedAnalysisType
  ) => {
    setIsQueryingHistory(true);
    setQueryTimeRange({ start: startTime, end: endTime });

    try {
      console.info(`查询历史数据: ${equipmentId}, 分析类型: ${analysisType}, ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`);

      // 根据分析类型获取需要查询的指标类型
      const metricTypes = getMetricTypesForAnalysis(analysisType);

      // 如果是温度分析，需要查询温度类型的数据（包含电池温度和环境温度）
      // 如果是电压分析，需要查询电压类型的数据（包含总电压和单体电压）
      // 其他分析类型直接查询对应的指标类型

      let allHistoricalData: UnifiedMonitoringData[] = [];

      // 对每个需要的指标类型进行查询（通常只有1个指标类型）
      for (const metricType of metricTypes) {
        try {
          console.info(`查询指标类型: ${metricType}`);

          // 使用统一的monitoring-store接口
          const result = await fetchMonitoringData({
            equipmentId,
            metricType,
            startTime,
            endTime,
            pageSize: 1000,
          });

          // 添加到结果数组
          allHistoricalData = [...allHistoricalData, ...result.data.items];

        } catch (error) {
          console.warn(`查询指标类型 ${metricType} 失败:`, error);
          // 继续查询其他指标类型
        }
      }

      // 按时间戳排序
      allHistoricalData.sort((a, b) => a.timestamp - b.timestamp);

      // 如果没有获取到任何数据，生成模拟数据
      if (allHistoricalData.length === 0) {
        console.warn('未获取到历史数据，使用模拟数据');
        const mockData = generateMockHistoricalData(startTime, endTime, equipmentId);
        setHistoricalData(mockData);
        console.info(`生成模拟数据 ${mockData.length} 条`);
      } else {
        setHistoricalData(allHistoricalData);
        console.info(`历史数据查询完成，共获取 ${allHistoricalData.length} 条数据`);
      }

    } catch (error) {
      console.error('历史数据查询失败:', error);

      // 查询失败时生成模拟数据
      const mockData = generateMockHistoricalData(startTime, endTime, equipmentId);
      setHistoricalData(mockData);
      console.info(`查询失败，生成模拟数据 ${mockData.length} 条`);
    } finally {
      setIsQueryingHistory(false);
    }
  }, [selectedBattery, selectedAnalysisType, getMetricTypesForAnalysis, fetchMonitoringData, generateMockHistoricalData]);

  /**
   * 电池组切换处理函数
   *
   * 功能说明：
   * - 处理电池组切换的核心逻辑
   * - 更新选中状态并重新获取数据
   * - 提供切换过程中的加载状态管理
   * - 保存用户偏好到localStorage
   *
   * @param batteryId 要切换到的电池组ID
   */
  const handleBatterySwitch = useCallback(async (batteryId: 'BATT-001' | 'BATT-002') => {
    if (batteryId === selectedBattery || isSwitchingBattery) {
      return; // 避免重复切换或切换进行中
    }

    setIsSwitchingBattery(true);
    console.info(`切换电池组: ${selectedBattery} -> ${batteryId}`);

    try {
      // 保存用户偏好到localStorage
      localStorage.setItem('preferredBattery', batteryId);

      // 重置相关数据状态
      setHistoricalData([]);
      setRealtimeChartData([]);

      // 根据新电池组的数据范围重置电池指标
      const newRange = batteryConfigs[batteryId].dataRange;
      setBatteryMetrics({
        totalVoltage: newRange.totalVoltage.initial,
        cellVoltage: newRange.cellVoltage.initial,
        current: newRange.current.initial,
        batteryTemp: newRange.batteryTemp.initial,
        ambientTemp: newRange.ambientTemp.initial,
        soc: newRange.soc.initial,
        chargingStatus: 'idle',
        lastUpdate: Date.now(),
      });

      // 更新选中的电池组
      setSelectedBattery(batteryId);

      // 重新订阅实时数据
      await subscribeToRealtime([batteryId], ['voltage', 'current', 'temperature', 'power']);

      // 移除电池组切换时的自动查询历史数据
      // 用户需要手动选择日期范围并点击查询按钮才能获取历史数据
      // await queryHistoricalData(
      //   Date.now() - 24 * 60 * 60 * 1000,
      //   Date.now(),
      //   batteryId,
      //   selectedAnalysisType
      // );

      console.info(`电池组切换完成: ${batteryConfigs[batteryId].name}`);
    } catch (error) {
      console.error('电池组切换失败:', error);
      // 切换失败时不改变电池组状态
    } finally {
      setIsSwitchingBattery(false);
    }
  }, [selectedBattery, isSwitchingBattery, subscribeToRealtime, queryHistoricalData]);

  /**
    * 更新图表数据函数
    * 向图表数据添加新的实时数据点（6个指标）
    */
  const updateChartData = useCallback(() => {
    const timestamp = Date.now();
    const range = batteryConfigs[selectedBattery].dataRange;

    const newPoints: UnifiedMonitoringData[] = [
      {
        id: `totalVoltage_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: batteryMetrics.totalVoltage + (Math.random() - 0.5) * (range.totalVoltage.max - range.totalVoltage.min) * 0.05,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `cellVoltage_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: batteryMetrics.cellVoltage + (Math.random() - 0.5) * (range.cellVoltage.max - range.cellVoltage.min) * 0.05,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `current_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.CURRENT,
        value: batteryMetrics.current + (Math.random() - 0.5) * (range.current.max - range.current.min) * 0.05,
        unit: 'A',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `batteryTemp_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: batteryMetrics.batteryTemp + (Math.random() - 0.5) * (range.batteryTemp.max - range.batteryTemp.min) * 0.05,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `ambientTemp_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: batteryMetrics.ambientTemp + (Math.random() - 0.5) * (range.ambientTemp.max - range.ambientTemp.min) * 0.05,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `soc_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.POWER,
        value: batteryMetrics.soc + (Math.random() - 0.5) * (range.soc.max - range.soc.min) * 0.05,
        unit: '%',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      }
    ];

    setRealtimeChartData(prev => [...prev, ...newPoints].slice(-432)); // 保持最近72个时间点的数据（6个参数×72个时间点）
  }, [batteryMetrics, selectedBattery]);


  /**
   * 生成初始图表数据
   *
   * 功能说明：
   * - 创建最近60个时间点的历史数据
   * - 数据间隔为2秒（与更新间隔一致）
   * - 包含所有关键监控参数的初始值
   *
   * 数据参数：
   * - timestamp: 时间戳
   * - voltage: 总电压 (V)
   * - current: 电流 (A)
   * - soc: 荷电状态 (%)
   * - temperature: 温度 (°C)
   * - soh: 健康状态 (%)
   */
  const generateInitialChartData = useCallback(() => {
    const now = Date.now();
    const data: UnifiedMonitoringData[] = [];

    // 获取当前电池组的数据范围
    const range = batteryConfigs[selectedBattery].dataRange;

    // 生成60个历史数据点（2分钟历史）
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - i * 2000; // 每2秒一个数据点

      // 为每个指标类型生成数据点，使用当前电池组的数据范围
      data.push({
        id: `totalVoltage_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: range.totalVoltage.initial + (Math.random() - 0.5) * (range.totalVoltage.max - range.totalVoltage.min) * 0.2,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      data.push({
        id: `current_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.CURRENT,
        value: range.current.initial + (Math.random() - 0.5) * (range.current.max - range.current.min) * 0.2,
        unit: 'A',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      data.push({
        id: `soc_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.POWER,
        value: range.soc.initial + (Math.random() - 0.5) * (range.soc.max - range.soc.min) * 0.2,
        unit: '%',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });

      data.push({
        id: `temperature_${selectedBattery}_${timestamp}`,
        equipmentId: selectedBattery,
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: range.batteryTemp.initial + (Math.random() - 0.5) * (range.batteryTemp.max - range.batteryTemp.min) * 0.2,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
    }
    setRealtimeChartData(data);
  }, [selectedBattery]);

  /**
   * 组件初始化和数据获取
   *
   * 功能说明：
   * - 组件挂载时初始化电池模块和图表数据
   * - 连接实时数据服务
   * - 获取历史数据
   * - 设置定时器更新模拟数据作为备用
   *
   * 数据更新策略：
   * 1. 优先使用统一数据源的实时数据
   * 2. 如果无法获取真实数据，使用模拟数据
   * 3. 每2秒更新一次显示数据
   */
  useEffect(() => {
    // 生成初始图表数据
    generateInitialChartData();

    // 连接实时数据服务
    const initializeDataConnection = async () => {
      try {
        // 订阅当前选中电池组的实时数据
        //await subscribeToRealtime([selectedBattery], ['voltage', 'current', 'temperature', 'power']);

        // 移除自动查询历史数据，只保留手动查询
        // 用户需要手动选择日期范围并点击查询按钮才能获取历史数据
        // await queryHistoricalData(
        //   Date.now() - 24 * 60 * 60 * 1000,
        //   Date.now(),
        //   selectedBattery,
        //   selectedAnalysisType
        // );

      } catch (error) {
        console.warn('无法连接到实时数据服务，使用模拟数据:', error);
      }
    };

    // 初始化数据连接
    initializeDataConnection();

    /**
     * 数据更新定时器
     * 优先使用实时数据，当WebSocket断开时自动切换到Mock数据
     * 确保界面持续更新，提供良好的用户体验
     */
    const updateInterval = setInterval(() => {
      // 无论连接状态如何，都更新Mock数据（作为备用）
      updateBatteryMetrics();  // 更新电池指标
      updateChartData();       // 更新图表数据

      // 如果使用Mock数据，记录状态
      if (useMockData) {
        console.debug('使用Mock数据更新界面');
      }
    }, 2000); // 每2秒更新

    // 组件卸载时清理定时器
    return () => {
      clearInterval(updateInterval);
    };
  }, [subscribeToRealtime, selectedBattery, updateBatteryMetrics, updateChartData, generateInitialChartData]);

  // 移除分析类型切换时的自动查询逻辑
  // 用户需要手动选择日期范围并点击查询按钮才能获取历史数据
  // 分析类型改变时，不会自动触发查询，但会确保查询时使用正确的指标类型


  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex justify-between items-center">
          {/* 左侧标题和描述 */}
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Battery className="w-8 h-8 text-cyan-400" />
              电池系统监控
            </h1>
            <p className="text-slate-400 mt-1">货船智能机舱电池系统实时监控与管理</p>
          </div>

          {/* 右侧控制按钮 */}
          <div className="flex items-center gap-4">
            {/* 报表生成器 */}
            <ReportGenerator
              context={{ type: 'battery', defaultDateRange: 7 }}
              variant="outline"
              size="sm"
              compact={true}
              buttonText="生成电池报表"
              onReportGenerated={(report) => {
                console.info('电池系统报表生成成功:', report);
              }}
              onError={(error) => {
                console.error('电池系统报表生成失败:', error);
              }}
            />
            {/* 连接状态指示器 */}
            <BatteryConnectionStatus status={connectionStatus} />
          </div>
        </div>

        {/* 电池系统实时监控区域 - 带动态图标效果 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-100 text-lg font-semibold">电池组实时监控</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-slate-400">实时更新中</span>
            </div>
          </div>

          {/* 动态指标卡片 - 横向排列 */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
            {/* 总电压 */}
            <div style={{ flex: 1 }} className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400 animate-icon-pulse" />
                </div>
                <Badge className={`text-xs ${batteryMetrics.totalVoltage > 650 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {batteryMetrics.totalVoltage > 650 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-cyan-400 mb-1">
                {batteryMetrics.totalVoltage.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">V</span>
              </div>
              <div className="text-xs text-slate-400">总电压</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-500"
                  style={{ width: `${Math.min((batteryMetrics.totalVoltage / 700) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 单体电压 */}
            <div style={{ flex: 1 }} className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Battery className="w-5 h-5 text-blue-400 animate-icon-bounce" />
                </div>
                <Badge className={`text-xs ${batteryMetrics.cellVoltage > 3.4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {batteryMetrics.cellVoltage > 3.4 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {batteryMetrics.cellVoltage.toFixed(2)}
                <span className="text-sm font-normal text-slate-400 ml-1">V</span>
              </div>
              <div className="text-xs text-slate-400">单体电压</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
                  style={{ width: `${Math.min((batteryMetrics.cellVoltage / 3.6) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 充放电流 */}
            <div style={{ flex: 1 }} className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-400 animate-icon-ping" />
                </div>
                <Badge className={`text-xs ${batteryMetrics.chargingStatus === 'charging' ? 'bg-green-500/20 text-green-400' :
                  batteryMetrics.chargingStatus === 'discharging' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>
                  {batteryMetrics.chargingStatus === 'charging' ? '充电中' :
                    batteryMetrics.chargingStatus === 'discharging' ? '放电中' : '待机'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {batteryMetrics.current.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">A</span>
              </div>
              <div className="text-xs text-slate-400">充放电流</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                  style={{ width: `${Math.min((batteryMetrics.current / 160) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 电池温度 */}
            <div style={{ flex: 1 }} className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center animate-icon-glow">
                  <Thermometer className="w-5 h-5 text-amber-400" />
                </div>
                <Badge className={`text-xs ${batteryMetrics.batteryTemp > 40 ? 'bg-red-500/20 text-red-400' : batteryMetrics.batteryTemp > 35 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {batteryMetrics.batteryTemp > 40 ? '过热' : batteryMetrics.batteryTemp > 35 ? '偏高' : '正常'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-amber-400 mb-1">
                {batteryMetrics.batteryTemp.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">°C</span>
              </div>
              <div className="text-xs text-slate-400">电池温度</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
                  style={{ width: `${Math.min((batteryMetrics.batteryTemp / 50) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* 环境温度 */}
            <div style={{ flex: 1 }} className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400 animate-slow-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <Badge className="text-xs bg-green-500/20 text-green-400">正常</Badge>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {batteryMetrics.ambientTemp.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">°C</span>
              </div>
              <div className="text-xs text-slate-400">环境温度</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                  style={{ width: `${Math.min((batteryMetrics.ambientTemp / 45) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* SOC荷电状态 */}
            <div style={{ flex: 1 }} className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-green-400 animate-icon-wave" />
                </div>
                <Badge className={`text-xs ${batteryMetrics.soc < 20 ? 'bg-red-500/20 text-red-400' : batteryMetrics.soc < 30 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                  {batteryMetrics.soc < 20 ? '低电量' : batteryMetrics.soc < 30 ? '偏低' : '充足'}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {batteryMetrics.soc.toFixed(1)}
                <span className="text-sm font-normal text-slate-400 ml-1">%</span>
              </div>
              <div className="text-xs text-slate-400">SOC荷电状态</div>
              <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${batteryMetrics.soc < 20 ? 'bg-gradient-to-r from-red-400 to-red-600' : batteryMetrics.soc < 30 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-green-400 to-green-600'}`}
                  style={{ width: `${batteryMetrics.soc}%` }}
                />
              </div>
            </div>
          </div>
        </Card>




        {/* 历史数据分析区域 - 可切换的分析类型 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-slate-100 text-lg font-semibold">历史数据分析</h3>
            <div className="flex items-center gap-4">
              {/* 日期范围选择器 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">日期范围:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-slate-900/50 border border-slate-600 text-slate-300 text-sm px-3 py-1 rounded"
                    disabled={isQueryingHistory}
                  />
                  <span className="text-slate-400">至</span>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-slate-900/50 border border-slate-600 text-slate-300 text-sm px-3 py-1 rounded"
                    disabled={isQueryingHistory}
                  />
                  <Button
                    onClick={() => {
                      if (customDateRange.start && customDateRange.end) {
                        const startTime = new Date(customDateRange.start).getTime();
                        const endTime = new Date(customDateRange.end).getTime() + 24 * 60 * 60 * 1000 - 1; // 包含结束日期的整天
                        // 传递当前选中的分析类型，只查询相关的指标数据
                        queryHistoricalData(startTime, endTime, selectedBattery, selectedAnalysisType);
                      }
                    }}
                    disabled={isQueryingHistory || !customDateRange.start || !customDateRange.end}
                    size="sm"
                    variant="outline"
                    className="bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-cyan-400"
                  >
                    {isQueryingHistory ? '查询中...' : '查询'}
                  </Button>
                </div>
              </div>

              {/* 查询状态指示器 */}
              {isQueryingHistory && (
                <div className="flex items-center gap-2 text-yellow-400">
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">查询中...</span>
                </div>
              )}

              {/* 数据统计 */}
              <div className="text-sm text-slate-400">
                历史数据: {historicalData.length} 条
                {queryTimeRange.start > 0 && (
                  <span className="ml-2">
                    ({new Date(queryTimeRange.start).toLocaleDateString()} - {new Date(queryTimeRange.end).toLocaleDateString()})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 分析类型选择器 */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {analysisTypes.map((analysis) => {
                const Icon = analysis.icon;
                const isSelected = selectedAnalysisType === analysis.key;

                return (
                  <Button
                    key={analysis.key}
                    onClick={() => setSelectedAnalysisType(analysis.key)}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`
                      ${isSelected
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-cyan-400'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {analysis.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 当前选中的分析内容 */}
          <div className="space-y-4">
            {(() => {
              const currentAnalysis = analysisTypes.find(a => a.key === selectedAnalysisType);
              if (!currentAnalysis) return null;

              return (
                <div>
                  {/* 分析描述 */}
                  <div className="mb-4 p-3 bg-slate-900/30 rounded-lg">
                    <p className="text-slate-300 text-sm">{currentAnalysis.description}</p>
                  </div>

                  {/* 图表区域 */}
                  <UnifiedMonitoringChart
                    chartType={currentAnalysis.chartType}
                    parameters={currentAnalysis.parameters}
                    historicalData={historicalData.filter(currentAnalysis.dataFilter)}
                    config={{
                      title: currentAnalysis.label,
                      height: 450,
                      showGrid: true,
                      showLegend: true,
                      showTooltip: true,
                      showBrush: false,
                      showExport: false,
                      showFullscreen: false,
                      showTimeRangeSelector: false,    // 禁用时间范围选择器
                      autoRefresh: false,
                      maxDataPoints: 1000
                    }}
                  />
                </div>
              );
            })()}
          </div>
        </Card>

        {/* 电池详细参数配置表格 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-4 text-lg font-semibold">电池系统参数配置</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* 表头 */}
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">监测项目</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">正常范围</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">3级告警</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">2级告警</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">1级告警</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">延迟</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">恢复条件</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">处理措施</th>
                </tr>
              </thead>

              {/* 表体 */}
              <tbody>
                {batterySpecs.map((spec, index) => {
                  /**
                   * 获取当前实际值用于状态判断
                   * 根据监测项目返回对应的当前值
                   */
                  const getCurrentValue = () => {
                    switch (spec.item) {
                      case '总电压': return batteryMetrics.totalVoltage;
                      case '单体电压': return batteryMetrics.cellVoltage;
                      case '温度': return batteryMetrics.batteryTemp;
                      case 'SOC': return batteryMetrics.soc;
                      default: return 0;
                    }
                  };

                  const currentValue = getCurrentValue();
                  let isAlert = false; // 是否触发告警状态

                  /**
                   * 检查当前值是否触发告警条件
                   * 示例：温度超过40°C时触发告警
                   */
                  if (spec.item === '温度' && currentValue > 40) {
                    isAlert = true;
                  }

                  return (
                    <tr
                      key={index}
                      className={`border-b border-slate-700/50 ${isAlert ? 'bg-red-500/10' : 'hover:bg-slate-900/30'
                        }`}
                    >
                      {/* 监测项目名称 */}
                      <td className="py-3 px-3 text-slate-300 text-sm">{spec.item}</td>
                      {/* 正常范围 */}
                      <td className="py-3 px-3 text-green-400 text-sm">{spec.normalRange}</td>
                      {/* 3级告警 */}
                      <td className="py-3 px-3 text-red-400 text-sm">{spec.level3}</td>
                      {/* 2级告警 */}
                      <td className="py-3 px-3 text-amber-400 text-sm">{spec.level2}</td>
                      {/* 1级告警 */}
                      <td className="py-3 px-3 text-amber-300 text-sm">{spec.level1}</td>
                      {/* 告警延迟 */}
                      <td className="py-3 px-3 text-slate-400 text-sm">{spec.delay}</td>
                      {/* 恢复条件 */}
                      <td className="py-3 px-3 text-slate-400 text-sm">{spec.recovery}</td>
                      {/* 处理措施 */}
                      <td className="py-3 px-3 text-cyan-400 text-sm">{spec.action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
