import React, { useEffect, useState } from 'react';
import { GaugeChart } from './GaugeChart';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ImportStatusIndicator } from './ImportStatusIndicator';
import { ReportGenerator } from './ui/report-generator';
import { AlarmStatus, AlertSeverity } from '../types/alarms';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Wifi,
  WifiOff,
  RefreshCw,
  Monitor
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useMonitoringStore } from '../stores/monitoring-store';
import { ConnectionStatus } from '../types/monitoring';
import { Alarm } from '../types/alarms';
import { Equipment } from '../types/equipment';

/**
 * 仪表板页面属性接口
 * 
 * 描述：定义仪表板页面的输入属性
 * 
 * 属性说明：
 * - onNavigate: 导航回调函数，用于跳转到其他页面
 */
interface DashboardPageProps {
  onNavigate: (page: string) => void; // 导航函数，参数为目标页面标识
}

/**
 * 设备指标数据类型定义
 * 
 * 描述：定义监控设备的关键指标数据结构
 * 
 * 监控参数说明：
 * - voltage: 电池电压 (V)
 * - soc: 电池荷电状态 (%)
 * - temperature: 系统温度 (°C)
 * - rpmLeft: 左推进电机转速 (rpm)
 * - rpmRight: 右推进电机转速 (rpm)
 * - motorTemp: 电机温度 (°C)
 * - healthScore: 系统健康评分 (0-100%)
 * - lastUpdate: 最后更新时间戳
 */
interface DeviceMetrics {
  voltage: number;        // 电压 (V)
  soc: number;            // 荷电状态 (%)
  temperature: number;    // 温度 (°C)
  rpmLeft: number;        // 左电机转速 (rpm)
  rpmRight: number;       // 右电机转速 (rpm)
  motorTemp: number;      // 电机温度 (°C)
  healthScore: number;    // 健康评分 (%)
  lastUpdate: number;     // 更新时间戳
}

/**
 * 默认设备指标数据
 * 
 * 描述：用于初始化的默认设备指标值
 * 所有数值初始化为0或默认值
 */
const DEFAULT_DEVICE_METRICS: DeviceMetrics = {
  voltage: 0,         // 默认电压 0V
  soc: 0,             // 默认SOC 0%
  temperature: 25,    // 默认温度 25°C
  rpmLeft: 0,         // 默认左电机转速 0rpm
  rpmRight: 0,        // 默认右电机转速 0rpm
  motorTemp: 25,      // 默认电机温度 25°C
  healthScore: 0,     // 默认健康评分 0%
  lastUpdate: 0,      // 默认更新时间 0
};

/**
 * 实时能量流数据类型定义
 * 
 * 描述：定义能量流图表的数据结构
 * 
 * 属性说明：
 * - time: 时间字符串 (HH:mm格式)
 * - value: 能量流数值 (百分比或功率值)
 */
interface EnergyFlowData {
  time: string;   // 时间字符串
  value: number;  // 能量流数值
}

/**
 * 活动日志条目数据类型定义
 * 
 * 描述：定义系统活动日志的数据结构
 * 
 * 属性说明：
 * - timestamp: 时间戳字符串
 * - user: 执行操作用户/系统名称
 * - action: 操作描述
 */
interface ActivityLogEntry {
  timestamp: string; // 时间戳
  user: string;      // 用户/系统
  action: string;    // 操作描述
}

/**
 * 连接状态指示器组件
 * 
 * 功能说明：
 * - 显示当前系统连接状态
 * - 使用不同颜色和图标表示连接状态
 * - 提供直观的连接状态反馈
 * 
 * 状态类型：
 * - CONNECTED: 已连接 (绿色WiFi图标)
 * - CONNECTING: 连接中 (黄色)
 * - ERROR: 连接错误 (红色)
 * - RECONNECTING: 重连中 (黄色)
 * - default: 未连接 (灰色)
 * 
 * @param status 连接状态枚举值
 */
function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  /**
   * 根据连接状态获取文字颜色
   * @returns CSS颜色类名
   */
  const getStatusColor = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return 'text-green-400';    // 绿色 - 已连接
      case ConnectionStatus.CONNECTING:
        return 'text-yellow-400';   // 黄色 - 连接中
      case ConnectionStatus.ERROR:
        return 'text-red-400';      // 红色 - 连接错误
      default:
        return 'text-gray-400';     // 灰色 - 未连接
    }
  };

  /**
   * 根据连接状态获取显示文字
   * @returns 状态描述文字
   */
  const getStatusText = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return '已连接';
      case ConnectionStatus.CONNECTING:
        return '连接中...';
      case ConnectionStatus.ERROR:
        return '连接错误';
      case ConnectionStatus.RECONNECTING:
        return '重连中...';
      default:
        return '未连接';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 根据连接状态显示不同图标 */}
      {status === ConnectionStatus.CONNECTED ? (
        <Wifi className="w-4 h-4 text-green-400" />  // 绿色WiFi图标
      ) : (
        <WifiOff className="w-4 h-4 text-red-400" /> // 红色WiFi断开图标
      )}
      {/* 状态文字 */}
      <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
    </div>
  );
}

/**
 * 智能机舱管理面板主组件
 *
 * 功能说明：
 * - 整合所有系统概览功能的仪表板页面
 * - 使用统一监测数据状态管理（monitoring-store）
 * - 提供系统状态总览和快速导航
 *
 * 主要功能模块：
 * 1. 连接状态显示（实时连接状态）
 * 2. 系统概览统计（4个关键指标卡片）
 * 3. 电池系统概览（3个GaugeChart + 能量流图表）
 * 4. 推进系统状态（3个GaugeChart + 推器状态）
 * 5. 整体系统健康（1个大尺寸GaugeChart）
 * 6. 实时告警列表（最近5条）
 * 7. 近期活动日志（最近5条）
 * 8. 设备状态概览（从monitoring-store获取）
 *
 * 数据更新机制：
 * - 初始化时订阅实时监测数据
 * - 每5秒更新一次能量流数据
 * - 组件卸载时清理定时器
 *
 * 重构说明：
 * - 从使用useRealTime和useEquipment改为使用useMonitoringStore
 * - 统一数据源，提高代码一致性
 * - 保持原有UI功能和用户体验
 */
export function DashboardPage({ onNavigate }: DashboardPageProps) {
  // 使用统一监测数据状态管理Hook
  const {
    // 实时连接状态
    realtimeConnected,        // 实时连接状态
    connectionStatus,         // 连接状态详情
    devices,                  // 设备数据映射
    lastUpdate,               // 最后数据更新时间
    errors,                   // 错误列表
    getDeviceData,            // 获取设备数据函数

    // 设备管理相关（从monitoring-store获取）
    fetchMonitoringData,      // 获取监测数据
    subscribeToRealtime,      // 订阅实时数据

    // 性能指标
    performanceMetrics,       // 性能指标数据
  } = useMonitoringStore();

  // 派生状态计算
  const connectedDevices = Object.values(devices);
  const deviceCount = Object.keys(devices).length;
  const hasErrors = errors.length > 0;
  const isConnected = realtimeConnected;
  const lastDataUpdate = lastUpdate;
  const recentErrors = errors.slice(-5);

  // 模拟设备列表和概览数据（暂时保留，后续可从monitoring-store扩展）
  const equipmentList: Equipment[] = [];
  const equipmentLoading = false;
  const equipmentError = null;
  const totalEquipment = deviceCount;
  const equipmentOverview = {
    total: deviceCount,
    normal: connectedDevices.filter(d => d.status === 'online').length,
    warning: connectedDevices.filter(d => d.status === 'maintenance').length,
    fault: connectedDevices.filter(d => d.status === 'error').length,
  };

  // 设备指标状态管理
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetrics>(DEFAULT_DEVICE_METRICS);
  
  // 能量流数据状态管理
  const [energyFlowData, setEnergyFlowData] = useState<EnergyFlowData[]>([]);
  
  // 告警数据状态管理
  const [recentAlerts, setRecentAlerts] = useState<Alarm[]>([]);
  
  // 活动日志状态管理
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);

  /**
    * 组件初始化和数据加载
    *
    * 功能说明：
    * - 组件挂载时初始化所有模拟数据
    * - 设置能量流数据定期更新定时器
    * - 订阅实时监测数据
    * - 组件卸载时清理定时器
    */
   useEffect(() => {
     // 初始化所有模拟数据
     initializeMockData();

     // 订阅实时监测数据（可选，用于获取设备状态）
     const initializeRealtimeData = async () => {
       try {
         // 订阅所有设备的实时数据
         await subscribeToRealtime([], ['voltage', 'current', 'temperature', 'soc']);
       } catch (error) {
         console.warn('无法订阅实时数据，使用模拟数据:', error);
       }
     };

     initializeRealtimeData();

     /**
      * 定期更新能量流数据
      * 每5秒更新一次能量流图表数据
      */
     const energyFlowInterval = setInterval(() => {
       updateEnergyFlowData();
     }, 5000); // 每5秒更新

     // 组件卸载时清理定时器
     return () => {
       clearInterval(energyFlowInterval);
     };
   }, [subscribeToRealtime]);

  /**
   * 初始化模拟数据
   * 
   * 功能说明：
   * - 设置设备指标模拟数据
   * - 生成能量流历史数据
   * - 创建活动日志模拟记录
   * - 设置告警模拟数据
   * 
   * 数据模拟策略：
   * 1. 设备指标：使用接近真实值的模拟数据
   * 2. 能量流：生成24小时内每4小时的7个数据点
   * 3. 活动日志：模拟系统操作和用户行为
   * 4. 告警数据：模拟电池和推进系统的告警
   */
  const initializeMockData = () => {
    // 设置模拟设备指标数据
    setDeviceMetrics({
      voltage: 685.2,        // 电池电压 685.2V
      soc: 88,               // 荷电状态 88%
      temperature: 35,       // 温度 35°C
      rpmLeft: 1550,         // 左电机转速 1550rpm
      rpmRight: 1480,        // 右电机转速 1480rpm
      motorTemp: 62,         // 电机温度 62°C
      healthScore: 92,       // 健康评分 92%
      lastUpdate: Date.now(), // 当前时间戳
    });

    // 生成模拟能量流数据
    const now = new Date();
    const data: EnergyFlowData[] = [];
    
    // 生成24小时内每4小时的能量流数据（共7个数据点）
    for (let i = 23; i >= 0; i -= 4) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000); // 减去i小时
      data.push({
        time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        value: Math.floor(Math.random() * 30) + 60, // 能量流值60-90之间
      });
    }
    setEnergyFlowData(data);

    // 设置模拟活动日志数据
    setActivityLog([
      { timestamp: '2025-11-11 14:30:00', user: '系统', action: '自动健康评估完成' },
      { timestamp: '2025-11-11 14:15:00', user: '管理员', action: '修改电池温度告警阈值' },
      { timestamp: '2025-11-11 13:50:00', user: '操作员A', action: '确认推进系统告警' },
      { timestamp: '2025-11-11 12:00:00', user: '系统', action: '定时数据备份完成' },
      { timestamp: '2025-11-11 10:30:00', user: '操作员B', action: '导入历史数据' },
    ]);

    // 设置模拟告警数据
    setRecentAlerts([
      {
        id: '1',
        equipmentId: 'battery-1',
        equipmentName: '电池系统',
        configId: 'config-1',
        metricType: 'temperature',
        value: 42.5,
        threshold: '40',
        triggeredAt: Date.now() - 3600000,    // 1小时前
        severity: AlertSeverity.CRITICAL,
        status: AlarmStatus.RESOLVED,
        message: '电池温度过高：左串1，模块3。(42.5°C)',
        createdAt: Date.now() - 3600000,
      },
      {
        id: '2',
        equipmentId: 'propulsion-1',
        equipmentName: '推进系统',
        configId: 'config-2',
        metricType: 'efficiency',
        value: 85,
        threshold: '90',
        triggeredAt: Date.now() - 7200000,    // 2小时前
        severity: AlertSeverity.HIGH,
        status: AlarmStatus.RESOLVED,
        message: '推进系统效率下降15%',
        createdAt: Date.now() - 7200000,
      },
    ]);
  };

  /**
   * 更新能量流数据
   * 
   * 功能说明：
   * - 在现有数据基础上添加新的能量流数据点
   * - 模拟能量流的随机波动
   * - 保持数据点在合理范围内（40-100）
   * - 限制数据点数量为最近7个
   */
  const updateEnergyFlowData = () => {
    setEnergyFlowData(prev => {
      const newData = [...prev];
      // 获取最后一个数据点作为基础值
      const lastValue = newData[newData.length - 1]?.value || 65;
      // 生成新的波动值，在±5范围内随机变化，并限制在40-100范围内
      const newValue = Math.max(40, Math.min(100, lastValue + (Math.random() - 0.5) * 10));
      
      // 添加新的数据点
      newData.push({
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        value: Math.floor(newValue),
      });
      
      // 保持最近7个数据点
      return newData.slice(-7);
    });
  };

  /**
   * 根据告警严重程度获取对应图标
   * 
   * 功能说明：
   * - 根据告警严重程度返回对应的图标组件
   * - 用于在告警列表中显示告警级别
   * 
   * 图标映射：
   * - critical: 红色AlertCircle图标
   * - warning: 琥珀色AlertTriangle图标
   * - default: 青色Info图标
   * 
   * @param severity 告警严重程度
   * @returns 图标组件
   */
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />;  // 严重告警图标
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />; // 警告图标
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;          // 信息图标
    }
  };

  /**
   * 根据告警严重程度获取对应文字颜色
   * 
   * 功能说明：
   * - 根据告警严重程度返回对应的文字颜色类名
   * - 用于在告警列表中高亮显示重要告警
   * 
   * 颜色映射：
   * - critical: 红色文字
   * - warning: 琥珀色文字
   * - default: 青色文字
   * 
   * @param severity 告警严重程度
   * @returns CSS颜色类名
   */
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';     // 严重告警 - 红色
      case 'warning':
        return 'text-amber-400';   // 警告 - 琥珀色
      default:
        return 'text-cyan-400';    // 信息 - 青色
    }
  };

  /**
   * 根据数值和阈值判断状态
   * 
   * 功能说明：
   * - 根据数值和阈值范围判断当前状态
   * - 返回normal/warning/critical状态
   * 
   * 判断逻辑：
   * - 如果设置了criticalThreshold且值 >= criticalThreshold，返回critical
   * - 如果值 >= warningThreshold，返回warning
   * - 否则返回normal
   * 
   * @param value 当前数值
   * @param warningThreshold 警告阈值
   * @param criticalThreshold 严重阈值（可选）
   * @returns 状态字符串
   */
  const getStatus = (value: number, warningThreshold: number, criticalThreshold?: number) => {
    if (criticalThreshold && value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'normal';
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和连接状态指示器 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-100">智能机舱管理面板</h1>
            {/* 报表生成器 - 紧凑模式显示 */}
            <ReportGenerator
              context={{ type: 'dashboard', defaultDateRange: 7 }}
              variant="outline"
              size="sm"
              compact={true}
              buttonText="生成报表"
              onReportGenerated={(report) => {
                console.info('仪表板报表生成成功:', report);
              }}
              onError={(error) => {
                console.error('仪表板报表生成失败:', error);
              }}
            />
          </div>
          <ConnectionStatusIndicator status={connectionStatus} />
        </div>

        {/* 系统概览统计卡片网格 - 优化布局 */}
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 连接设备数量卡片 */}
          <Card className="bg-slate-800/80 border-slate-700 p-3">
            <div className="text-slate-300 text-sm">设备总数</div>
            <div className="text-2xl font-bold text-slate-100">
              {equipmentLoading ? '-' : (equipmentOverview?.total || totalEquipment)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {deviceCount} 个在线
            </div>
          </Card>
          
          {/* 正常运行设备数量卡片 */}
          <Card className="bg-slate-800/80 border-slate-700 p-3">
            <div className="text-slate-300 text-sm">正常运行</div>
            <div className="text-2xl font-bold text-green-400">
              {equipmentLoading ? '-' : (equipmentOverview?.normal || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {equipmentOverview ? Math.round((equipmentOverview.normal / equipmentOverview.total) * 100) || 0 : 0}% 占比
            </div>
          </Card>
          
          {/* 告警设备数量卡片 */}
          <Card className="bg-slate-800/80 border-slate-700 p-3">
            <div className="text-slate-300 text-sm">告警设备</div>
            <div className="text-2xl font-bold text-yellow-400">
              {equipmentLoading ? '-' : ((equipmentOverview?.warning || 0) + (equipmentOverview?.fault || 0))}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {equipmentOverview ? Math.round(((equipmentOverview?.warning || 0) + (equipmentOverview?.fault || 0)) / equipmentOverview.total * 100) || 0 : 0}% 占比
            </div>
          </Card>
        </div>

        {/* 顶部系统概览卡片区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
          {/* 卡片1: 电池系统概览 */}
          <Card
            className="bg-slate-800/80 border-slate-700 p-6 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={() => onNavigate('battery')}  // 点击跳转到电池系统页面
          >
            <h3 className="text-slate-100 mb-6">电池系统概览</h3>
            
            {/* 三个小尺寸仪表盘 */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* 电压仪表盘 */}
              <GaugeChart
                value={deviceMetrics.voltage}
                maxValue={800}
                label="电压"
                unit="V"
                size="small"
                status={getStatus(deviceMetrics.voltage, 700, 780)}
              />
              {/* SOC仪表盘 */}
              <GaugeChart
                value={deviceMetrics.soc}
                maxValue={100}
                label="健康SOC"
                unit="%"
                size="small"
                status={getStatus(deviceMetrics.soc, 20, 10)}
              />
              {/* 温度仪表盘 */}
              <GaugeChart
                value={deviceMetrics.temperature}
                maxValue={60}
                label="温度"
                unit="°C"
                size="small"
                status={getStatus(deviceMetrics.temperature, 45, 55)}
              />
            </div>
            
            {/* 能量流图表 */}
            <div className="mt-4">
              <p className="text-slate-400 text-sm mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                近期能量流
              </p>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={energyFlowData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#06b6d4"        // 青色线条
                    strokeWidth={2}
                    dot={false}            // 不显示数据点
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 卡片2: 推进系统状态 */}
          <Card
            className="bg-slate-800/80 border-slate-700 p-6 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={() => onNavigate('propulsion')}  // 点击跳转到推进系统页面
          >
            <h3 className="text-slate-100 mb-6">推进系统状态</h3>
            
            {/* 电机转速仪表盘 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* 左电机转速 */}
              <GaugeChart
                value={deviceMetrics.rpmLeft}
                maxValue={2000}
                label="左电机转速"
                unit="rpm"
                size="small"
                status={getStatus(deviceMetrics.rpmLeft, 1800, 1900)}
              />
              {/* 右电机转速 */}
              <GaugeChart
                value={deviceMetrics.rpmRight}
                maxValue={2000}
                label="右电机转速"
                unit="rpm"
                size="small"
                status={getStatus(deviceMetrics.rpmRight, 1800, 1900)}
              />
            </div>
            
            {/* 电机温度仪表盘 */}
            <div className="mb-4">
              <GaugeChart
                value={deviceMetrics.motorTemp}
                maxValue={100}
                label="电机温度"
                unit="°C"
                size="small"
                status={getStatus(deviceMetrics.motorTemp, 80, 90)}
              />
            </div>
            
            {/* 推器状态指示 */}
            <div className="space-y-2">
              {/* 左推器状态 */}
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                <span className="text-slate-300 text-sm">左推器</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm">活动</span>
                  <div className="w-10 h-5 bg-green-500 rounded-full"></div>
                </div>
              </div>
              {/* 右推器状态 */}
              <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded">
                <span className="text-slate-300 text-sm">右推器</span>
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm">活动</span>
                  <div className="w-10 h-5 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </Card>

          {/* 卡片3: 整体系统健康 */}
          <Card
            className="bg-slate-800/80 border-slate-700 p-6 cursor-pointer hover:bg-slate-800 transition-colors"
            onClick={() => onNavigate('health')}  // 点击跳转到健康评估页面
          >
            <h3 className="text-slate-100 mb-6">整体系统健康</h3>
            <div className="flex justify-center">
              {/* 大尺寸健康评分仪表盘 */}
              <GaugeChart
                value={deviceMetrics.healthScore}
                maxValue={100}
                label="系统健康评分"
                unit="%"
                size="large"
                status={getStatus(deviceMetrics.healthScore, 70, 50)}
              />
            </div>
          </Card>
        </div>

        {/* 底部区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 设备状态概览卡片 */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-4">设备状态概览</h3>
            {connectedDevices.length > 0 ? (
              <div className="space-y-3 mb-4">
                {connectedDevices.slice(0, 4).map((device) => (
                  <div
                    key={device.deviceId}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                    onClick={() => onNavigate('equipment')}  // 点击跳转到设备管理页面
                  >
                    <div className="flex-1">
                      <div className="text-slate-300 text-sm font-medium">{device.deviceName || `设备 ${device.deviceId}`}</div>
                      <div className="text-slate-500 text-xs">监测设备</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        device.status === 'online' ? 'bg-green-500' :
                        device.status === 'maintenance' ? 'bg-yellow-500' :
                        device.status === 'error' ? 'bg-red-500' :
                        'bg-slate-500'
                      }`} />
                      <span className="text-xs text-slate-400">
                        {device.status === 'online' ? '在线' :
                         device.status === 'maintenance' ? '维护中' :
                         device.status === 'error' ? '故障' : '离线'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400">
                <Monitor className="w-8 h-8 mx-auto mb-2" />
                <p>暂无设备数据</p>
                <p className="text-xs">正在连接设备...</p>
              </div>
            )}
            {/* 查看设备管理按钮 */}
            <Button
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => onNavigate('equipment')}  // 跳转到设备管理页面
            >
              管理所有设备
            </Button>
          </Card>

          {/* 实时告警卡片 */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-4">实时告警</h3>
            <div className="space-y-3 mb-4">
              {/* 告警列表 */}
              {recentAlerts.length > 0 ? recentAlerts.slice(0, 4).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                  onClick={() => onNavigate('alarms')}  // 点击跳转到告警页面
                >
                  {/* 告警级别图标 */}
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1">
                    {/* 告警消息 */}
                    <p className={`${getSeverityColor(alert.severity)} text-sm`}>
                      {alert.message}
                    </p>
                    {/* 告警时间 */}
                    <p className="text-slate-500 text-xs mt-1">
                      {new Date(alert.triggeredAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              )) : (
                // 无告警状态
                <div className="text-center py-4 text-slate-400">
                  <Info className="w-8 h-8 mx-auto mb-2" />
                  <p>暂无实时告警</p>
                </div>
              )}
            </div>
            {/* 查看所有告警按钮 */}
            <Button
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => onNavigate('alarms')}  // 跳转到告警管理页面
            >
              查看所有告警
            </Button>
          </Card>
        </div>

        {/* 近期活动日志 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h3 className="text-slate-100 mb-4">近期活动日志</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* 表头 */}
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-300 text-sm">时间戳</th>
                  <th className="text-left py-2 px-3 text-slate-300 text-sm">用户/系统</th>
                  <th className="text-left py-2 px-3 text-slate-300 text-sm">操作</th>
                </tr>
              </thead>
              
              {/* 表体 */}
              <tbody>
                {activityLog.length > 0 ? activityLog.slice(0, 5).map((log, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                    <td className="py-2 px-3 text-slate-400 text-sm">{log.timestamp}</td>
                    <td className="py-2 px-3 text-slate-400 text-sm">{log.user}</td>
                    <td className="py-2 px-3 text-slate-300 text-sm">{log.action}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-400">
                      暂无活动日志
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* 查看更多活动按钮（当活动日志超过5条时显示） */}
          {activityLog.length > 5 && (
            <Button
              variant="outline"
              className="w-full mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => onNavigate('history')}  // 跳转到历史记录页面
            >
              查看更多活动
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
