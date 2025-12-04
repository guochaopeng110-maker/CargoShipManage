import React, { useState, useEffect, useCallback } from 'react';
import { AlertSummary } from './AlertSummary';
import { UnifiedMonitoringChart, ChartType, MonitoringParameter } from './UnifiedMonitoringChart';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ImportStatusIndicator } from './ImportStatusIndicator';
import { ReportGenerator } from './ui/report-generator';
import { useMonitoringStore } from '../stores/monitoring-store';
import { Shield, Zap, Activity, Gauge } from 'lucide-react';
import { UnifiedMonitoringData, MetricType, DataQuality, DataSource } from '../types/monitoring';

// 推进系统核心指标类型定义
// 包含双推进电机（左右电机）的所有关键运行参数和状态信息
interface PropulsionMetrics {
  leftVoltage: number;           // 左推进电机电压 (V)
  rightVoltage: number;          // 右推进电机电压 (V)
  leftRpm: number;               // 左推进电机转速 (RPM)
  rightRpm: number;              // 右推进电机转速 (RPM)
  leftTemp: number;              // 左推进电机温度 (°C)
  rightTemp: number;             // 右推进电机温度 (°C)
  leftFreq: number;              // 左推进电机工作频率 (Hz)
  rightFreq: number;             // 右推进电机工作频率 (Hz)
  leftInverterVoltage: number;   // 左逆变器输出电压 (V)
  rightInverterVoltage: number;  // 右逆变器输出电压 (V)
  efficiency: number;            // 推进系统整体效率 (%)
  status: 'normal' | 'warning' | 'critical';  // 系统运行状态
  lastUpdate: number;            // 最后更新时间戳
}

// 推进电机设备状态类型定义
// 用于描述单个推进电机的详细运行参数和状态信息
interface PropulsionMotor {
  id: string;                       // 设备唯一标识符
  name: string;                     // 电机名称（如"左推进电机"、"右推进电机"）
  voltage: number;                  // 电机工作电压 (V)
  rpm: number;                      // 电机转速 (RPM)
  temperature: number;              // 电机运行温度 (°C)
  frequency: number;                // 工作频率 (Hz)
  efficiency: number;               // 电机效率 (%)
  status: 'normal' | 'warning' | 'critical';  // 设备运行状态
}

// 推进系统连接状态指示器组件
// 显示推进系统与监控网络的连接状态，包含颜色编码和状态图标
const PropulsionConnectionStatus = ({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) => {
  const statusConfig = {
    connected: {
      color: 'text-green-400',    // 已连接：绿色文字
      bg: 'bg-green-500/20',      // 已连接：浅绿色背景
      text: '已连接',
      icon: '🟢'
    },
    connecting: {
      color: 'text-yellow-400',   // 连接中：黄色文字
      bg: 'bg-yellow-500/20',     // 连接中：浅黄色背景
      text: '连接中',
      icon: '🟡'
    },
    disconnected: {
      color: 'text-red-400',      // 断开连接：红色文字
      bg: 'bg-red-500/20',        // 断开连接：浅红色背景
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

// 推进系统概览组件
// 以卡片网格形式展示双推进电机的关键运行参数，提供系统状态的快速概览
const PropulsionOverview = ({ metrics }: { metrics: PropulsionMetrics }) => {
  // 根据运行状态获取对应的文字颜色样式
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-400';    // 正常状态：绿色文字
      case 'warning': return 'text-yellow-400';  // 警告状态：黄色文字
      case 'critical': return 'text-red-400';    // 严重状态：红色文字
      default: return 'text-slate-400';          // 默认状态：灰色文字
    }
  };

  // 根据运行状态获取对应的背景颜色样式
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
            <p className="text-slate-400 text-sm">左电机电压</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.leftVoltage.toFixed(1)}V</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 text-cyan-400" />
          <div>
            <p className="text-slate-400 text-sm">右电机电压</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.rightVoltage.toFixed(1)}V</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-400" />
          <div>
            <p className="text-slate-400 text-sm">左电机转速</p>
            <p className="text-slate-100 text-xl font-bold">{Math.round(metrics.leftRpm)}RPM</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-purple-400" />
          <div>
            <p className="text-slate-400 text-sm">右电机转速</p>
            <p className="text-slate-100 text-xl font-bold">{Math.round(metrics.rightRpm)}RPM</p>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/60 border-slate-700 p-4">
        <div className="flex items-center gap-3">
          <Gauge className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-slate-400 text-sm">左电机温度</p>
            <p className="text-slate-100 text-xl font-bold">{metrics.leftTemp.toFixed(1)}°C</p>
          </div>
        </div>
      </Card>

      <Card className={`bg-slate-800/60 border-slate-700 p-4 ${getStatusBg(metrics.status)}`}>
        <div className="flex items-center gap-3">
          <Shield className={`w-8 h-8 ${getStatusColor(metrics.status)}`} />
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

// 推进系统监控模拟数据
// 包含24小时历史数据，展示双推进电机在不同时间点的运行参数变化
const propulsionData = [
  { time: '00:00', leftVoltage: 380, rightVoltage: 378, leftRpm: 1550, rightRpm: 1480, leftTemp: 62, rightTemp: 60 },
  { time: '04:00', leftVoltage: 375, rightVoltage: 376, leftRpm: 1520, rightRpm: 1500, leftTemp: 58, rightTemp: 57 },
  { time: '08:00', leftVoltage: 385, rightVoltage: 382, leftRpm: 1580, rightRpm: 1520, leftTemp: 65, rightTemp: 63 },
  { time: '12:00', leftVoltage: 390, rightVoltage: 388, leftRpm: 1600, rightRpm: 1550, leftTemp: 68, rightTemp: 66 },
  { time: '16:00', leftVoltage: 382, rightVoltage: 380, leftRpm: 1560, rightRpm: 1510, leftTemp: 64, rightTemp: 62 },
  { time: '20:00', leftVoltage: 378, rightVoltage: 379, leftRpm: 1540, rightRpm: 1490, leftTemp: 61, rightTemp: 59 },
  { time: '24:00', leftVoltage: 380, rightVoltage: 378, leftRpm: 1550, rightRpm: 1480, leftTemp: 62, rightTemp: 60 },
];

// 推进系统图表参数配置
// 定义图表中显示的参数项，包含数据键名、显示标签和线条颜色配置
const propulsionParameters: MonitoringParameter[] = [
  {
    key: 'leftVoltage',
    label: '左电机电压',
    metricType: MetricType.VOLTAGE,
    color: '#06b6d4',
    unit: 'V',
    threshold: {
      warning: 400,
      critical: 300,
      showLines: true
    }
  },
  {
    key: 'rightVoltage',
    label: '右电机电压',
    metricType: MetricType.VOLTAGE,
    color: '#0ea5e9',
    unit: 'V',
    threshold: {
      warning: 400,
      critical: 300,
      showLines: true
    }
  },
  {
    key: 'leftRpm',
    label: '左电机转速',
    metricType: MetricType.SPEED,
    color: '#8b5cf6',
    unit: 'rpm',
    threshold: {
      warning: 1600,
      critical: 1800,
      showLines: true
    }
  },
  {
    key: 'rightRpm',
    label: '右电机转速',
    metricType: MetricType.SPEED,
    color: '#a78bfa',
    unit: 'rpm',
    threshold: {
      warning: 1600,
      critical: 1800,
      showLines: true
    }
  },
  {
    key: 'leftTemp',
    label: '左电机温度',
    metricType: MetricType.TEMPERATURE,
    color: '#f59e0b',
    unit: '°C',
    threshold: {
      warning: 75,
      critical: 80,
      showLines: true
    }
  },
  {
    key: 'rightTemp',
    label: '右电机温度',
    metricType: MetricType.TEMPERATURE,
    color: '#fb923c',
    unit: '°C',
    threshold: {
      warning: 75,
      critical: 80,
      showLines: true
    }
  },
];

// Mock propulsion specification table data
const propulsionSpecs = [
  {
    item: '左电机电压',
    unit: 'V',
    threshold: '300-420V',
    action: '检查电源',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: false,
  },
  {
    item: '右电机电压',
    unit: 'V',
    threshold: '300-420V',
    action: '检查电源',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: false,
  },
  {
    item: '左电机转速',
    unit: 'rpm',
    threshold: '0-2000',
    action: '降低负载',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '右电机转速',
    unit: 'rpm',
    threshold: '0-2000',
    action: '降低负载',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '左电机温度',
    unit: '°C',
    threshold: '<80°C',
    action: '启动冷却',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '右电机温度',
    unit: '°C',
    threshold: '<80°C',
    action: '启动冷却',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '左电机频率',
    unit: 'Hz',
    threshold: '0-100Hz',
    action: '检查变频器',
    cockpitDisplay: false,
    cockpitWarning: false,
    localDisplay: true,
    localWarning: false,
  },
  {
    item: '右电机频率',
    unit: 'Hz',
    threshold: '0-100Hz',
    action: '检查变频器',
    cockpitDisplay: false,
    cockpitWarning: false,
    localDisplay: true,
    localWarning: false,
  },
  {
    item: '左逆变器电压',
    unit: 'V',
    threshold: '600-750V',
    action: '检查逆变器',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
  {
    item: '右逆变器电压',
    unit: 'V',
    threshold: '600-750V',
    action: '检查逆变器',
    cockpitDisplay: true,
    cockpitWarning: true,
    localDisplay: true,
    localWarning: true,
  },
];

// Mock alert history
const propulsionAlerts = [
  {
    id: 1,
    timestamp: '2025-11-11 13:45:22',
    item: '推进效率',
    level: 'warning' as const,
    description: '推进系统效率下降15%',
    status: 'active' as const,
    operator: '技术员B检查中',
  },
  {
    id: 2,
    timestamp: '2025-11-11 11:20:15',
    item: '左电机温度',
    level: 'warning' as const,
    description: '左电机温度达到75°C',
    status: 'resolved' as const,
    operator: '冷却系统已启动',
  },
  {
    id: 3,
    timestamp: '2025-11-11 09:30:00',
    item: '右电机转速',
    level: 'info' as const,
    description: '右电机转速波动±50rpm',
    status: 'resolved' as const,
  },
  {
    id: 4,
    timestamp: '2025-11-11 07:15:45',
    item: '电机电压',
    level: 'info' as const,
    description: '双电机电压平衡正常',
    status: 'resolved' as const,
  },
];

// 推进系统监控页面主组件
// 提供完整的双推进电机监控功能，包括实时数据显示、设备状态监控、图表可视化和告警管理
export function PropulsionMonitoringPage() {
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

  // 推进系统核心指标状态管理
  // 存储双推进电机的所有关键运行参数，初始化为正常运行时的典型值
  const [propulsionMetrics, setPropulsionMetrics] = useState<PropulsionMetrics>({
    leftVoltage: 382.5,           // 左电机电压 382.5V
    rightVoltage: 379.8,          // 右电机电压 379.8V
    leftRpm: 1560,                // 左电机转速 1560 RPM
    rightRpm: 1490,               // 右电机转速 1490 RPM
    leftTemp: 63.5,               // 左电机温度 63.5°C
    rightTemp: 61.2,              // 右电机温度 61.2°C
    leftFreq: 52.3,               // 左电机频率 52.3Hz
    rightFreq: 49.7,              // 右电机频率 49.7Hz
    leftInverterVoltage: 682.4,   // 左逆变器电压 682.4V
    rightInverterVoltage: 678.9,  // 右逆变器电压 678.9V
    efficiency: 94.2,             // 系统效率 94.2%
    status: 'normal',             // 初始系统状态为正常
    lastUpdate: Date.now(),       // 最后更新时间
  });

  // 推进电机状态数组
  // 存储每个推进电机的详细信息，动态更新运行参数和状态
  const [propulsionMotors, setPropulsionMotors] = useState<PropulsionMotor[]>([]);

  // 实时图表数据存储
  // 用于显示历史趋势图的原始数据点数组，支持多参数趋势分析
  const [realtimeChartData, setRealtimeChartData] = useState<UnifiedMonitoringData[]>([]);

  // 组件初始化和数据连接
  useEffect(() => {
    initializePropulsionMotors();
    generateInitialChartData();

    // 连接实时数据服务
    const initializeDataConnection = async () => {
      try {
        // 订阅推进系统的实时数据
        await subscribeToRealtime(['MOTOR-L-001', 'MOTOR-R-001'], ['voltage', 'speed', 'temperature', 'frequency']);
        
        // 获取历史数据
        await fetchMonitoringData({
          equipmentId: 'MOTOR-L-001',
          metricType: MetricType.VOLTAGE,
          startTime: Date.now() - 24 * 60 * 60 * 1000, // 24小时前
          endTime: Date.now(),
          page: 1,
          pageSize: 1000
        });
      } catch (error) {
        console.warn('无法连接到实时数据服务，使用模拟数据:', error);
      }
    };

    // 初始化数据连接
    initializeDataConnection();

    // 定期更新推进数据（备用数据）
    const updateInterval = setInterval(() => {
      updatePropulsionMetrics();
      updateChartData();
    }, 2500); // 每2.5秒更新

    return () => {
      clearInterval(updateInterval);
    };
  }, []); // 空依赖数组，使用模拟数据作为备用

  // 初始化推进电机
  const initializePropulsionMotors = () => {
    const motors: PropulsionMotor[] = [
      { id: 'motor-left', name: '左推进电机', voltage: 382.5, rpm: 1560, temperature: 63.5, frequency: 52.3, efficiency: 94.2, status: 'normal' },
      { id: 'motor-right', name: '右推进电机', voltage: 379.8, rpm: 1490, temperature: 61.2, frequency: 49.7, efficiency: 93.8, status: 'normal' },
    ];
    setPropulsionMotors(motors);
  };

  // 生成初始图表数据
  const generateInitialChartData = () => {
    const now = Date.now();
    const data: UnifiedMonitoringData[] = [];
    
    for (let i = 59; i >= 0; i--) {
      const timestamp = now - i * 2500;
      
      // 左电机数据
      data.push({
        id: `left_voltage_${timestamp}`,
        equipmentId: 'MOTOR-L-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: 380 + Math.random() * 20,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `right_voltage_${timestamp}`,
        equipmentId: 'MOTOR-R-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: 375 + Math.random() * 15,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `left_rpm_${timestamp}`,
        equipmentId: 'MOTOR-L-001',
        timestamp,
        metricType: MetricType.SPEED,
        value: 1500 + Math.random() * 200,
        unit: 'rpm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `right_rpm_${timestamp}`,
        equipmentId: 'MOTOR-R-001',
        timestamp,
        metricType: MetricType.SPEED,
        value: 1450 + Math.random() * 150,
        unit: 'rpm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `left_temp_${timestamp}`,
        equipmentId: 'MOTOR-L-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: 60 + Math.random() * 10,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
      
      data.push({
        id: `right_temp_${timestamp}`,
        equipmentId: 'MOTOR-R-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: 58 + Math.random() * 8,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      });
    }
    setRealtimeChartData(data);
  };

  // 更新推进指标
  const updatePropulsionMetrics = useCallback(() => {
    setPropulsionMetrics(prev => {
      const leftVoltage = prev.leftVoltage + (Math.random() - 0.5) * 3;
      const rightVoltage = prev.rightVoltage + (Math.random() - 0.5) * 3;
      const leftRpm = Math.max(0, Math.min(2000, prev.leftRpm + (Math.random() - 0.5) * 50));
      const rightRpm = Math.max(0, Math.min(2000, prev.rightRpm + (Math.random() - 0.5) * 50));
      const leftTemp = Math.max(0, prev.leftTemp + (Math.random() - 0.5) * 2);
      const rightTemp = Math.max(0, prev.rightTemp + (Math.random() - 0.5) * 2);
      const leftFreq = Math.max(0, prev.leftFreq + (Math.random() - 0.5) * 2);
      const rightFreq = Math.max(0, prev.rightFreq + (Math.random() - 0.5) * 2);
      const leftInverterVoltage = 680 + Math.random() * 10;
      const rightInverterVoltage = 675 + Math.random() * 10;
      const efficiency = Math.max(80, Math.min(100, 94 + (Math.random() - 0.5) * 4));

      // 检查告警条件
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (leftTemp > 80 || rightTemp > 80) {
        status = 'critical';
      } else if (leftTemp > 75 || rightTemp > 75) {
        status = 'warning';
      }

      const newMetrics = {
        leftVoltage,
        rightVoltage,
        leftRpm,
        rightRpm,
        leftTemp,
        rightTemp,
        leftFreq,
        rightFreq,
        leftInverterVoltage,
        rightInverterVoltage,
        efficiency,
        status,
        lastUpdate: Date.now(),
      };

      return newMetrics;
    });

    // 更新电机状态
    setPropulsionMotors(prev => prev.map(motor => ({
      ...motor,
      voltage: motor.voltage + (Math.random() - 0.5) * 3,
      rpm: Math.max(0, Math.min(2000, motor.rpm + (Math.random() - 0.5) * 50)),
      temperature: Math.max(0, motor.temperature + (Math.random() - 0.5) * 2),
      frequency: Math.max(0, motor.frequency + (Math.random() - 0.5) * 2),
      efficiency: Math.max(80, Math.min(100, motor.efficiency + (Math.random() - 0.5) * 2)),
      status: Math.random() > 0.9 ? 'critical' : Math.random() > 0.85 ? 'warning' : 'normal',
    })));
  }, []);

  // 更新图表数据
  const updateChartData = useCallback(() => {
    const timestamp = Date.now();
    const newPoints: UnifiedMonitoringData[] = [
      {
        id: `left_voltage_${timestamp}`,
        equipmentId: 'MOTOR-L-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: propulsionMetrics.leftVoltage + (Math.random() - 0.5) * 3,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `right_voltage_${timestamp}`,
        equipmentId: 'MOTOR-R-001',
        timestamp,
        metricType: MetricType.VOLTAGE,
        value: propulsionMetrics.rightVoltage + (Math.random() - 0.5) * 3,
        unit: 'V',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `left_rpm_${timestamp}`,
        equipmentId: 'MOTOR-L-001',
        timestamp,
        metricType: MetricType.SPEED,
        value: propulsionMetrics.leftRpm + (Math.random() - 0.5) * 50,
        unit: 'rpm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `right_rpm_${timestamp}`,
        equipmentId: 'MOTOR-R-001',
        timestamp,
        metricType: MetricType.SPEED,
        value: propulsionMetrics.rightRpm + (Math.random() - 0.5) * 50,
        unit: 'rpm',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `left_temp_${timestamp}`,
        equipmentId: 'MOTOR-L-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: propulsionMetrics.leftTemp + (Math.random() - 0.5) * 2,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      },
      {
        id: `right_temp_${timestamp}`,
        equipmentId: 'MOTOR-R-001',
        timestamp,
        metricType: MetricType.TEMPERATURE,
        value: propulsionMetrics.rightTemp + (Math.random() - 0.5) * 2,
        unit: '°C',
        quality: DataQuality.NORMAL,
        source: DataSource.SENSOR_UPLOAD
      }
    ];
    
    setRealtimeChartData(prev => [...prev, ...newPoints].slice(-288)); // 保持最近48个时间点的数据（6个参数×48个时间点）
  }, [propulsionMetrics]);

  // 数据导出功能
  // 将当前的推进系统监控数据导出为JSON格式文件，包含完整的系统状态和历史数据
  const exportData = () => {
    // 准备导出数据结构，包含时间戳、系统指标、设备状态、图表数据和连接状态
    const exportData = {
      timestamp: Date.now(),          // 导出时间戳
      propulsionMetrics,             // 推进系统核心指标数据
      propulsionMotors,              // 推进电机详细状态信息
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
    link.download = `propulsion-data-${new Date().toISOString().split('T')[0]}.json`; // 设置文件名
    link.click(); // 触发下载
    
    // 清理：释放对象URL资源
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 标题和控制栏 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Activity className="w-8 h-8 text-cyan-400" />
              推进系统监控
            </h1>
            <p className="text-slate-400 mt-1">货船智能机舱推进系统实时监控与管理</p>
          </div>
          <div className="flex items-center gap-4">
            {/* 报表生成器 */}
            <ReportGenerator
              context={{ type: 'propulsion', defaultDateRange: 7 }}
              variant="outline"
              size="sm"
              compact={true}
              buttonText="生成推进报表"
              onReportGenerated={(report) => {
                console.info('推进系统报表生成成功:', report);
              }}
              onError={(error) => {
                console.error('推进系统报表生成失败:', error);
              }}
            />
            <PropulsionConnectionStatus status={
              connectionStatus === 'error' || connectionStatus === 'reconnecting'
                ? 'disconnected'
                : connectionStatus as 'connected' | 'disconnected' | 'connecting'
            } />
            <Button
              onClick={exportData}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              导出数据
            </Button>
          </div>
        </div>

        {/* 推进系统状态概览 */}
        <PropulsionOverview metrics={propulsionMetrics} />

        {/* 推进电机状态 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-4">推进电机状态</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {propulsionMotors.map(motor => (
              <Card key={motor.id} className={`
                p-6 border-l-4
                ${motor.status === 'normal' ? 'border-green-500 bg-green-500/10' : ''}
                ${motor.status === 'warning' ? 'border-yellow-500 bg-yellow-500/10' : ''}
                ${motor.status === 'critical' ? 'border-red-500 bg-red-500/10' : ''}
              `}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-slate-300 font-medium text-lg">{motor.name}</h4>
                  <div className={`
                    w-3 h-3 rounded-full
                    ${motor.status === 'normal' ? 'bg-green-500' : ''}
                    ${motor.status === 'warning' ? 'bg-yellow-500' : ''}
                    ${motor.status === 'critical' ? 'bg-red-500' : ''}
                  `} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">电压</p>
                    <p className="text-slate-100 text-lg font-semibold">{motor.voltage.toFixed(1)}V</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">转速</p>
                    <p className="text-slate-100 text-lg font-semibold">{Math.round(motor.rpm)}RPM</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">温度</p>
                    <p className="text-slate-100 text-lg font-semibold">{motor.temperature.toFixed(1)}°C</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">频率</p>
                    <p className="text-slate-100 text-lg font-semibold">{motor.frequency.toFixed(1)}Hz</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 text-sm">效率</p>
                    <p className="text-slate-100 text-lg font-semibold">{motor.efficiency.toFixed(1)}%</p>
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
              item.equipmentId === 'MOTOR-L-001' && item.metricType === MetricType.VOLTAGE
            )}
            parameters={[propulsionParameters[0]]}
            chartType={ChartType.LINE}
            config={{
              title: "左电机电压监控",
              height: 300,
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showExport: true,
              showFullscreen: true,
              autoRefresh: true,
              refreshInterval: 2500,
              maxDataPoints: 48
            }}
          />

          <UnifiedMonitoringChart
            realtimeData={realtimeChartData.filter(item =>
              item.equipmentId === 'MOTOR-L-001' && item.metricType === MetricType.SPEED
            )}
            parameters={[propulsionParameters[2]]}
            chartType={ChartType.LINE}
            config={{
              title: "左电机转速监控",
              height: 300,
              showGrid: true,
              showLegend: true,
              showTooltip: true,
              showExport: true,
              showFullscreen: true,
              autoRefresh: true,
              refreshInterval: 2500,
              maxDataPoints: 48
            }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Specifications Table */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-6">
              <h3 className="text-slate-100 mb-4">实时详细推进参数</h3>
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
                    {propulsionSpecs.map((spec, index) => {
                      // 检查当前值是否在告警范围
                      const getCurrentValue = () => {
                        switch (spec.item) {
                          case '左电机电压': return propulsionMetrics.leftVoltage;
                          case '右电机电压': return propulsionMetrics.rightVoltage;
                          case '左电机转速': return propulsionMetrics.leftRpm;
                          case '右电机转速': return propulsionMetrics.rightRpm;
                          case '左电机温度': return propulsionMetrics.leftTemp;
                          case '右电机温度': return propulsionMetrics.rightTemp;
                          default: return 0;
                        }
                      };

                      const currentValue = getCurrentValue();
                      let isAlert = false;
                      
                      if ((spec.item.includes('左电机温度') && currentValue > 75) ||
                          (spec.item.includes('右电机温度') && currentValue > 75)) {
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
              title="推进系统告警"
              equipmentId="propulsion-system"
              equipmentName="推进系统"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
