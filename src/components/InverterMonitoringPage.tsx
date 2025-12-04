// 逆变器系统监控页面
// 本组件负责监控货船智能机舱的双逆变器系统，实时显示电压、电流、温度、负载等关键参数
// 包含双逆变器（1#和2#）的完整监控功能，支持实时告警和历史数据分析
// 主要监控指标：直流电压（高/低）、交流电流、电抗器温度、系统负载、转换效率
import React, { useState, useEffect, useCallback } from 'react';
import { AlertSummary } from './AlertSummary';            // 告警摘要组件
import { UnifiedMonitoringChart, ChartType, MonitoringParameter } from './UnifiedMonitoringChart'; // 统一监测图表组件
import { Checkbox } from './ui/checkbox';                  // 复选框UI组件
import { Button } from './ui/button';                      // 按钮UI组件
import { Card } from './ui/card';                          // 卡片UI组件
import { useMonitoringStore } from '../stores/monitoring-store';   // 统一监测数据状态管理
import { Zap, Thermometer, AlertTriangle, Activity } from 'lucide-react'; // 图标库
import { UnifiedMonitoringData, MetricType, DataQuality, DataSource } from '../types/monitoring'; // 统一数据类型

// 逆变器系统指标类型定义
// 包含双逆变器（1#和2#）的所有关键运行参数
interface InverterMetrics {
  inv1VoltHigh: number;     // 1#逆变器直流高压侧电压 (V)
  inv1VoltLow: number;      // 1#逆变器直流低压侧电压 (V)
  inv1Current: number;      // 1#逆变器输出电流 (A)
  inv1Temp: number;         // 1#逆变器电抗器温度 (°C)
  inv2VoltHigh: number;     // 2#逆变器直流高压侧电压 (V)
  inv2VoltLow: number;      // 2#逆变器直流低压侧电压 (V)
  inv2Current: number;      // 2#逆变器输出电流 (A)
  inv2Temp: number;         // 2#逆变器电抗器温度 (°C)
  inv1Load: number;         // 1#逆变器负载率 (%)
  inv2Load: number;         // 2#逆变器负载率 (%)
  inv1Efficiency: number;   // 1#逆变器转换效率 (%)
  inv2Efficiency: number;   // 2#逆变器转换效率 (%)
  status: 'normal' | 'warning' | 'critical';  // 系统整体运行状态
  lastUpdate: number;       // 最后更新时间戳
}

// 逆变器设备状态类型定义
// 用于描述单个逆变器设备的详细运行参数
interface InverterDevice {
  id: string;                     // 设备唯一标识符
  name: string;                   // 设备名称（如"1#逆变器"）
  voltageHigh: number;            // 直流高压侧电压 (V)
  voltageLow: number;             // 直流低压侧电压 (V)
  current: number;                // 输出电流 (A)
  temperature: number;            // 电抗器温度 (°C)
  load: number;                   // 当前负载率 (%)
  efficiency: number;             // 转换效率 (%)
  status: 'normal' | 'warning' | 'critical';  // 设备运行状态
}

// 逆变器系统连接状态指示器组件
// 显示逆变器与监控系统的连接状态，包含视觉图标和状态文字
const InverterConnectionStatus = ({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) => {
  const statusConfig = {
    connected: {
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      text: '已连接',
      icon: '🟢'
    },
    connecting: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      text: '连接中',
      icon: '🟡'
    },
    disconnected: {
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      text: '断开连接',
      icon: '🔴'
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
      <span className="text-lg">{config.icon}</span>
      <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
    </div>
  );
};

// 逆变器系统概览组件
// 显示双逆变器的关键运行参数，包括电压、电流、温度、系统状态等核心指标
const InverterOverview = ({ metrics }: { metrics: InverterMetrics }) => {
  // 根据运行状态获取对应的文字颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400';    // 正常状态：绿色
      case 'warning': return 'text-yellow-400';  // 警告状态：黄色
      case 'critical': return 'text-red-400';    // 严重状态：红色
      default: return 'text-slate-400';          // 默认状态：灰色
    }
  };

  // 根据运行状态获取对应的背景颜色
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-500/20';   // 正常背景：浅绿色
      case 'warning': return 'bg-yellow-500/20'; // 警告背景：浅黄色
      case 'critical': return 'bg-red-500/20';   // 严重背景：浅红色
      default: return 'bg-slate-500/20';         // 默认背景：浅灰色
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-cyan-400" />
          <div>
            <p className="text-slate-400 text-sm">1#直流电压高</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.inv1VoltHigh.toFixed(0)}V</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-cyan-400" />
          <div>
            <p className="text-slate-400 text-sm">1#直流电压低</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.inv1VoltLow.toFixed(0)}V</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-400" />
          <div>
            <p className="text-slate-400 text-sm">1#逆变器电流</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.inv1Current.toFixed(0)}A</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Thermometer className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-slate-400 text-sm">1#电抗器温度</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.inv1Temp.toFixed(1)}°C</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-green-400" />
          <div>
            <p className="text-slate-400 text-sm">2#直流电压高</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.inv2VoltHigh.toFixed(0)}V</p>
          </div>
        </div>
      </Card>

      <Card className={`bg-slate-800/60 border-slate-700 p-4 ${getStatusBg(metrics.status)}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-8 h-8 ${getStatusColor(metrics.status)}`} />
          <div>
            <p className="text-slate-400 text-sm">系统状态</p>
            <p className={`text-xl font-bold ${getStatusColor(metrics.status)}`}>
              {metrics.status === 'normal' ? '正常' : metrics.status === 'warning' ? '警告' : '严重'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// 逆变器监控模拟数据
// 用于演示的24小时历史数据，包含双逆变器的关键参数变化趋势
const inverterData = [
  { time: '00:00', inv1VoltHigh: 750, inv1VoltLow: 600, inv1Current: 180, inv1Temp: 55, inv2VoltHigh: 748, inv2VoltLow: 602 },
  { time: '04:00', inv1VoltHigh: 745, inv1VoltLow: 598, inv1Current: 175, inv1Temp: 52, inv2VoltHigh: 746, inv2VoltLow: 600 },
  { time: '08:00', inv1VoltHigh: 755, inv1VoltLow: 605, inv1Current: 185, inv1Temp: 58, inv2VoltHigh: 752, inv2VoltLow: 606 },
  { time: '12:00', inv1VoltHigh: 760, inv1VoltLow: 608, inv1Current: 190, inv1Temp: 62, inv2VoltHigh: 758, inv2VoltLow: 610 },
  { time: '16:00', inv1VoltHigh: 752, inv1VoltLow: 603, inv1Current: 182, inv1Temp: 57, inv2VoltHigh: 750, inv2VoltLow: 605 },
  { time: '20:00', inv1VoltHigh: 748, inv1VoltLow: 601, inv1Current: 178, inv1Temp: 54, inv2VoltHigh: 747, inv2VoltLow: 603 },
  { time: '24:00', inv1VoltHigh: 750, inv1VoltLow: 600, inv1Current: 180, inv1Temp: 55, inv2VoltHigh: 748, inv2VoltLow: 602 },
];

// 逆变器图表参数配置
// 定义图表中显示的参数项，包含键名、显示标签和颜色配置
const inverterParameters: MonitoringParameter[] = [
  {
    key: 'inv1VoltHigh',
    label: '1#直流电压高',
    metricType: MetricType.VOLTAGE,
    color: '#06b6d4',
    unit: 'V',
    threshold: {
      warning: 760,
      critical: 780,
      showLines: true
    }
  },
  {
    key: 'inv1VoltLow',
    label: '1#直流电压低',
    metricType: MetricType.VOLTAGE,
    color: '#0ea5e9',
    unit: 'V',
    threshold: {
      warning: 590,
      critical: 580,
      showLines: true
    }
  },
  {
    key: 'inv1Current',
    label: '1#逆变器电流',
    metricType: MetricType.CURRENT,
    color: '#8b5cf6',
    unit: 'A',
    threshold: {
      warning: 190,
      critical: 200,
      showLines: true
    }
  },
  {
    key: 'inv1Temp',
    label: '1#电抗器温度',
    metricType: MetricType.TEMPERATURE,
    color: '#f59e0b',
    unit: '°C',
    threshold: {
      warning: 65,
      critical: 70,
      showLines: true
    }
  },
  {
    key: 'inv2VoltHigh',
    label: '2#直流电压高',
    metricType: MetricType.VOLTAGE,
    color: '#22c55e',
    unit: 'V',
    threshold: {
      warning: 760,
      critical: 780,
      showLines: true
    }
  },
  {
    key: 'inv2VoltLow',
    label: '2#直流电压低',
    metricType: MetricType.VOLTAGE,
    color: '#10b981',
    unit: 'V',
    threshold: {
      warning: 590,
      critical: 580,
      showLines: true
    }
  },
];

// Mock inverter specification table data
const inverterSpecs = [
  {
    item: '1#直流电压高',
    unit: 'V',
    threshold: '>780V',
    action: '降低负载',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '1#直流电压低',
    unit: 'V',
    threshold: '<580V',
    action: '检查电源',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '1#逆变器过电流',
    unit: 'A',
    threshold: '>200A',
    action: '立即降载',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '1#过载',
    unit: '%',
    threshold: '>120%',
    action: '减少功率输出',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '1#电抗器温度高',
    unit: '°C',
    threshold: '>70°C',
    action: '启动强制冷却',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '2#直流电压高',
    unit: 'V',
    threshold: '>780V',
    action: '降低负载',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '2#直流电压低',
    unit: 'V',
    threshold: '<580V',
    action: '检查电源',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '2#逆变器过电流',
    unit: 'A',
    threshold: '>200A',
    action: '立即降载',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '2#过载',
    unit: '%',
    threshold: '>120%',
    action: '减少功率输出',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '2#电抗器温度高',
    unit: '°C',
    threshold: '>70°C',
    action: '启动强制冷却',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
];

// Mock alert history
const inverterAlerts = [
  {
    id: 1,
    timestamp: '2025-11-11 11:30:45',
    item: '1#直流电压',
    level: 'warning' as const,
    description: '1#直流电压波动超过±5V',
    status: 'active' as const,
    operator: '监控中',
  },
  {
    id: 2,
    timestamp: '2025-11-11 09:15:30',
    item: '1#电抗器温度',
    level: 'warning' as const,
    description: '1#电抗器温度达到68°C',
    status: 'resolved' as const,
    operator: '冷却系统已响应',
  },
  {
    id: 3,
    timestamp: '2025-11-11 07:00:00',
    item: '2#逆变器',
    level: 'info' as const,
    description: '2#逆变器启动成功',
    status: 'resolved' as const,
  },
  {
    id: 4,
    timestamp: '2025-11-11 05:45:20',
    item: '逆变器效率',
    level: 'info' as const,
    description: '双逆变器效率平衡正常',
    status: 'resolved' as const,
  },
  {
    id: 5,
    timestamp: '2025-11-11 03:30:10',
    item: '1#过载保护',
    level: 'critical' as const,
    description: '1#逆变器过载130%，已触发保护',
    status: 'resolved' as const,
    operator: '负载已调整',
  },
];

// 逆变器系统监控页面主组件
// 提供完整的双逆变器监控功能，包括实时数据显示、设备状态监控、图表可视化和告警管理
export function InverterMonitoringPage() {
  // 统一监测数据状态管理 - 从统一数据存储中获取系统连接状态和设备信息
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

  // 逆变器系统核心指标状态管理
  // 存储双逆变器的所有关键运行参数，初始化为正常运行的典型值
  const [inverterMetrics, setInverterMetrics] = useState<InverterMetrics>({
    inv1VoltHigh: 752,      // 1#逆变器高压侧电压 752V
    inv1VoltLow: 603,       // 1#逆变器低压侧电压 603V
    inv1Current: 182,       // 1#逆变器输出电流 182A
    inv1Temp: 56.8,         // 1#电抗器温度 56.8°C
    inv2VoltHigh: 749,      // 2#逆变器高压侧电压 749V
    inv2VoltLow: 601,       // 2#逆变器低压侧电压 601V
    inv2Current: 178,       // 2#逆变器输出电流 178A
    inv2Temp: 54.2,         // 2#电抗器温度 54.2°C
    inv1Load: 85.3,         // 1#逆变器负载率 85.3%
    inv2Load: 82.7,         // 2#逆变器负载率 82.7%
    inv1Efficiency: 96.8,   // 1#逆变器效率 96.8%
    inv2Efficiency: 97.2,   // 2#逆变器效率 97.2%
    status: 'normal',       // 初始系统状态为正常
    lastUpdate: Date.now(), // 最后更新时间
  });

  // 逆变器设备状态数组
  // 存储每个逆变器设备的详细信息，动态更新
  const [inverterDevices, setInverterDevices] = useState<InverterDevice[]>([]);

  // 实时图表数据存储
  // 用于显示历史趋势图的原始数据点数组
  const [realtimeChartData, setRealtimeChartData] = useState<UnifiedMonitoringData[]>([]);

  // 组件初始化和数据更新管理
  // 设置定期数据更新和清理定时器，确保实时监控数据的连续性
  useEffect(() => {
    initializeInverterDevices();    // 初始化逆变器设备数据
    generateInitialChartData();     // 生成初始图表数据

    // 设置定期数据更新定时器 - 每3秒更新一次逆变器指标和图表数据
    const updateInterval = setInterval(() => {
      updateInverterMetrics();      // 更新逆变器系统指标
      updateChartData();            // 更新实时图表数据
    }, 3000); // 每3秒更新

    // 组件卸载时清理定时器，防止内存泄漏
    return () => {
      clearInterval(updateInterval);
    };
  }, [subscribeToRealtime, fetchMonitoringData]);

  // 初始化逆变器设备
  const initializeInverterDevices = () => {
    const devices: InverterDevice[] = [
      {
        id: 'inverter-1',
        name: '1#逆变器',
        voltageHigh: 752,
        voltageLow: 603,
        current: 182,
        temperature: 56.8,
        load: 85.3,
        efficiency: 96.8,
        status: 'normal'
      },
      {
        id: 'inverter-2',
        name: '2#逆变器',
        voltageHigh: 749,
        voltageLow: 601,
        current: 178,
        temperature: 54.2,
        load: 82.7,
        efficiency: 97.2,
        status: 'normal'
      },
    ];
    setInverterDevices(devices);
  };

  // 生成初始图表数据
  const generateInitialChartData = () => {
    const now = Date.now();
    const data: UnifiedMonitoringData[] = [];
    
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - i * 3000;
      
      // 1#逆变器数据
      data.push({
        id: `inv1_volt_high_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: 745 + Math.random() * 20,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `inv1_volt_low_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: 595 + Math.random() * 15,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `inv1_current_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.CURRENT,
        value: 175 + Math.random() * 30,
        unit: 'A',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `inv1_temp_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: 52 + Math.random() * 15,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      // 2#逆变器数据
      data.push({
        id: `inv2_volt_high_${timestamp}`,
        equipmentId: 'INV-R-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: 742 + Math.random() * 18,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `inv2_volt_low_${timestamp}`,
        equipmentId: 'INV-R-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: 593 + Math.random() * 12,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
    }
    setRealtimeChartData(data);
  };

  // 更新逆变器指标
  const updateInverterMetrics = useCallback(() => {
    setInverterMetrics(prev => {
      const inv1VoltHigh = 745 + Math.random() * 20;
      const inv1VoltLow = 595 + Math.random() * 15;
      const inv1Current = 175 + Math.random() * 30;
      const inv1Temp = Math.max(0, 52 + Math.random() * 15);
      const inv2VoltHigh = 742 + Math.random() * 18;
      const inv2VoltLow = 593 + Math.random() * 12;
      const inv2Current = 170 + Math.random() * 28;
      const inv2Temp = Math.max(0, 50 + Math.random() * 12);
      const inv1Load = Math.max(0, Math.min(100, 80 + Math.random() * 20));
      const inv2Load = Math.max(0, Math.min(100, 78 + Math.random() * 18));
      const inv1Efficiency = Math.max(90, Math.min(99, 96 + (Math.random() - 0.5) * 2));
      const inv2Efficiency = Math.max(90, Math.min(99, 96.5 + (Math.random() - 0.5) * 2));

      // 检查告警条件
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (inv1Temp > 70 || inv2Temp > 70 || inv1Load > 120 || inv2Load > 120) {
        status = 'critical';
      } else if (inv1Temp > 65 || inv2Temp > 65 || inv1Load > 110 || inv2Load > 110) {
        status = 'warning';
      }

      const newMetrics = {
        inv1VoltHigh,
        inv1VoltLow,
        inv1Current,
        inv1Temp,
        inv2VoltHigh,
        inv2VoltLow,
        inv2Current,
        inv2Temp,
        inv1Load,
        inv2Load,
        inv1Efficiency,
        inv2Efficiency,
        status,
        lastUpdate: Date.now(),
      };

      return newMetrics;
    });

    // 更新设备状态
    setInverterDevices(prev => prev.map(device => ({
      ...device,
      voltageHigh: device.voltageHigh + (Math.random() - 0.5) * 5,
      voltageLow: device.voltageLow + (Math.random() - 0.5) * 3,
      current: device.current + (Math.random() - 0.5) * 10,
      temperature: Math.max(0, device.temperature + (Math.random() - 0.5) * 3),
      load: Math.max(0, Math.min(100, device.load + (Math.random() - 0.5) * 5)),
      efficiency: Math.max(90, Math.min(99, device.efficiency + (Math.random() - 0.5) * 1)),
      status: Math.random() > 0.92 ? 'critical' : Math.random() > 0.88 ? 'warning' : 'normal',
    })));
  }, []);

  // 更新图表数据
  const updateChartData = useCallback(() => {
    const timestamp = Date.now();
    const newPoints: UnifiedMonitoringData[] = [
      {
        id: `inv1_volt_high_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: inverterMetrics.inv1VoltHigh + (Math.random() - 0.5) * 5,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `inv1_volt_low_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: inverterMetrics.inv1VoltLow + (Math.random() - 0.5) * 3,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `inv1_current_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.CURRENT,
        value: inverterMetrics.inv1Current + (Math.random() - 0.5) * 10,
        unit: 'A',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `inv1_temp_${timestamp}`,
        equipmentId: 'INV-L-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: inverterMetrics.inv1Temp + (Math.random() - 0.5) * 3,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `inv2_volt_high_${timestamp}`,
        equipmentId: 'INV-R-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: inverterMetrics.inv2VoltHigh + (Math.random() - 0.5) * 5,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `inv2_volt_low_${timestamp}`,
        equipmentId: 'INV-R-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: inverterMetrics.inv2VoltLow + (Math.random() - 0.5) * 3,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      }
    ];
    
    setRealtimeChartData(prev => [...prev, ...newPoints].slice(-360)); // 保持最近60个时间点的数据（6个参数×60个时间点）
  }, [inverterMetrics]);

  // 数据导出功能
  // 将当前的逆变器监控数据导出为JSON格式文件，包含完整的系统状态和历史数据
  const exportData = () => {
    // 准备导出数据结构，包含时间戳、系统指标、设备状态、图表数据和连接状态
    const exportData = {
      timestamp: Date.now(),          // 导出时间戳
      inverterMetrics,               // 逆变器系统核心指标
      inverterDevices,               // 逆变器设备详细状态
      chartData: realtimeChartData,  // 实时图表数据点
      connectionStatus,              // 系统连接状态
    };
    
    // 创建Blob对象并生成下载链接
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',      // 指定MIME类型为JSON
    });
    
    const url = URL.createObjectURL(blob); // 创建对象URL
    const link = document.createElement('a'); // 创建下载链接
    link.href = url;
    link.download = `inverter-data-${new Date().toISOString().split('T')[0]}.json`; // 设置文件名
    link.click(); // 触发下载
    
    // 清理：释放对象URL资源
    URL.revokeObjectURL(url);
  };

  // 组件主渲染区域 - 逆变器系统监控界面
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        {/* 显示页面标题、连接状态指示器和数据导出功能 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Zap className="w-8 h-8 text-cyan-400" />
              逆变器系统监控
            </h1>
            <p className="text-slate-400 mt-1">货船智能机舱逆变器系统实时监控与管理</p>
          </div>
          <div className="flex items-center gap-4">
            <InverterConnectionStatus status={
              connectionStatus === 'error' || connectionStatus === 'reconnecting'
                ? 'disconnected'
                : connectionStatus as 'connected' | 'disconnected' | 'connecting'
            } /> {/* 系统连接状态显示 */}
            <Button
              onClick={exportData}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              导出数据
            </Button>
          </div>
        </div>

        {/* 逆变器系统状态概览 */}
        <InverterOverview metrics={inverterMetrics} />

        {/* 逆变器设备状态 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-4">逆变器设备状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inverterDevices.map(device => (
              <Card key={device.id} className={`
                p-6 border-l-4
                ${device.status === 'normal' ? 'border-green-500 bg-green-500/10' : ''}
                ${device.status === 'warning' ? 'border-yellow-500 bg-yellow-500/10' : ''}
                ${device.status === 'critical' ? 'border-red-500 bg-red-500/10' : ''}
              `}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-slate-300 font-medium text-lg">{device.name}</h4>
                  <div className={`
                    w-3 h-3 rounded-full
                    ${device.status === 'normal' ? 'bg-green-500' : ''}
                    ${device.status === 'warning' ? 'bg-yellow-500' : ''}
                    ${device.status === 'critical' ? 'bg-red-500' : ''}
                  `} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">直流电压高</p>
                    <p className="text-slate-100 text-lg font-semibold">{device.voltageHigh.toFixed(0)}V</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">直流电压低</p>
                    <p className="text-slate-100 text-lg font-semibold">{device.voltageLow.toFixed(0)}V</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">电流</p>
                    <p className="text-slate-100 text-lg font-semibold">{device.current.toFixed(0)}A</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">温度</p>
                    <p className="text-slate-100 text-lg font-semibold">{device.temperature.toFixed(1)}°C</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">负载</p>
                    <p className="text-slate-100 text-lg font-semibold">{device.load.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">效率</p>
                    <p className="text-slate-100 text-lg font-semibold">{device.efficiency.toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* 实时图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UnifiedMonitoringChart
            realtimeData={realtimeChartData.filter(item =>
              item.equipmentId === 'INV-L-001' && item.metricType === MetricType.VOLTAGE
            )}
            parameters={[inverterParameters[0]]}
            chartType={ChartType.LINE}
            config={{
              title: "1#逆变器直流电压高监控",
              height: 300,
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showExport: true,
              showFullscreen: true,
              autoRefresh: true,
              refreshInterval: 3000,
              maxDataPoints: 60
            }}
          />

          <UnifiedMonitoringChart
            realtimeData={realtimeChartData.filter(item =>
              item.equipmentId === 'INV-L-001' && item.metricType === MetricType.TEMPERATURE
            )}
            parameters={[inverterParameters[3]]}
            chartType={ChartType.LINE}
            config={{
              title: "1#电抗器温度监控",
              height: 300,
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showExport: true,
              showFullscreen: true,
              autoRefresh: true,
              refreshInterval: 3000,
              maxDataPoints: 60
            }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Specifications Table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6">
              <h3 className="text-slate-100 mb-4">实时详细逆变器参数</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
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
                  <tbody>
                    {inverterSpecs.map((spec, index) => {
                      // 检查当前值是否在告警范围
                      const getCurrentValue = () => {
                        switch (spec.item) {
                          case '1#直流电压高': return inverterMetrics.inv1VoltHigh;
                          case '1#直流电压低': return inverterMetrics.inv1VoltLow;
                          case '1#逆变器过电流': return inverterMetrics.inv1Current;
                          case '1#过载': return inverterMetrics.inv1Load;
                          case '1#电抗器温度高': return inverterMetrics.inv1Temp;
                          case '2#直流电压高': return inverterMetrics.inv2VoltHigh;
                          case '2#直流电压低': return inverterMetrics.inv2VoltLow;
                          case '2#逆变器过电流': return inverterMetrics.inv2Current;
                          case '2#过载': return inverterMetrics.inv2Load;
                          case '2#电抗器温度高': return inverterMetrics.inv2Temp;
                          default: return 0;
                        }
                      };

                      const currentValue = getCurrentValue();
                      let isAlert = false;
                      
                      if ((spec.item.includes('1#电抗器温度高') && currentValue > 68) ||
                          (spec.item.includes('2#电抗器温度高') && currentValue > 68)) {
                        isAlert = true;
                      }

                      return (
                        <tr
                          key={index}
                          className={`border-b border-slate-700/50 ${
                            isAlert ? 'bg-amber-500/10' : 'hover:bg-slate-900/30'
                          }`}
                        >
                          <td className="py-3 px-3 text-slate-300 text-sm">{spec.item}</td>
                          <td className="py-3 px-3 text-slate-400 text-sm">{spec.unit}</td>
                          <td className="py-3 px-3 text-amber-400 text-sm">{spec.threshold}</td>
                          <td className="py-3 px-3 text-cyan-400 text-sm">{spec.action}</td>
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.cockpitDisplay} disabled />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.cockpitWarning} disabled />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.localDisplay} disabled />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Checkbox checked={spec.localWarning} disabled />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Alert Summary Sidebar */}
          <div className="lg:col-span-1">
            <AlertSummary
              title="逆变器系统告警"
              equipmentId="inverter-system"
              equipmentName="逆变器系统"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
