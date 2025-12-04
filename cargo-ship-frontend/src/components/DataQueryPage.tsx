/**
 * 设备数据查询页面组件
 *
 * 功能特性：
 * - 灵活的设备数据查询界面
 * - 多维度数据筛选和查询
 * - 实时查询状态监控
 * - 查询结果缓存和复用
 * - 多格式数据导出支持
 * - 查询记录管理
 * - 数据统计和分析
 *
 * 核心功能：
 * - 设备选择和筛选
 * - 时间范围设定
 * - 传感器参数选择
 * - 聚合类型设置
 * - 查询执行和结果展示
 * - 数据导出和下载
 *
 * 用户交互：
 * - 直观的查询表单设计
 * - 响应式布局适配
 * - 实时加载状态反馈
 * - 错误处理和提示
 * - 快捷预设选项
 *
 * 数据可视化：
 * - 动态图表渲染
 * - 多指标对比显示
 * - 交互式数据表格
 * - 状态标识和分类
 * - 实时数据更新
 *
 * @version 2.0.0
 * @author 货船智能机舱管理系统开发团队
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Download,
  FileDown,
  History,
  Trash2,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ImportStatusIndicator } from './ImportStatusIndicator';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useMonitoringStore } from '../stores/monitoring-store';
import {
  MonitoringQueryParams,
  MonitoringDataResponse,
  MetricType,
  UnifiedMonitoringData
} from '../types/monitoring';

// 设备配置映射
const DEVICE_CONFIG = {
  all: { label: '全部设备', color: '#6366f1', icon: '🛠️' },
  battery: { label: '电池系统', color: '#06b6d4', icon: '🔋' },
  propulsion: { label: '推进系统', color: '#8b5cf6', icon: '⚡' },
  inverter: { label: '逆变器系统', color: '#f59e0b', icon: '🔌' },
  auxiliary: { label: '辅助设备', color: '#22c55e', icon: '⚙️' },
  motor: { label: '电机系统', color: '#ec4899', icon: '🔩' },
  pump: { label: '泵系统', color: '#ef4444', icon: '💧' },
};

// 传感器参数配置
const PARAMETER_CONFIG = {
  voltage: { label: '电压', unit: 'V', color: '#06b6d4', range: [600, 800] },
  current: { label: '电流', unit: 'A', color: '#8b5cf6', range: [0, 200] },
  temperature: { label: '温度', unit: '°C', color: '#f59e0b', range: [0, 100] },
  rpm: { label: '转速', unit: 'rpm', color: '#22c55e', range: [1000, 2000] },
  soc: { label: 'SOC', unit: '%', color: '#ec4899', range: [0, 100] },
  pressure: { label: '压力', unit: 'bar', color: '#ef4444', range: [0, 20] },
  flow_rate: { label: '流量', unit: 'L/min', color: '#14b8a6', range: [0, 500] },
  power: { label: '功率', unit: 'kW', color: '#f97316', range: [0, 1000] },
  efficiency: { label: '效率', unit: '%', color: '#84cc16', range: [0, 100] },
  vibration: { label: '振动', unit: 'mm/s', color: '#a855f7', range: [0, 50] },
};

// 状态类型配置
const STATUS_CONFIG = {
  normal: { label: '正常', color: '#22c55e', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
  warning: { label: '警告', color: '#f59e0b', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400' },
  critical: { label: '严重', color: '#ef4444', bgColor: 'bg-red-500/10', textColor: 'text-red-400' },
  offline: { label: '离线', color: '#6b7280', bgColor: 'bg-gray-500/10', textColor: 'text-gray-400' },
};

// 主组件
export function DataQueryPage() {
  // 使用统一监测数据状态管理Hook
  const {
    // 基础状态
    data,
    loading,
    error,
    exporting,

    // 查询历史相关
    queryHistory,
    queries,
    activeQuery,
    results,

    // 统计数据
    statistics,
    timeSeriesData,
    aggregatedData,

    // 操作方法
    fetchMonitoringData,
    createQuery,
    executeQuery,
    exportData,
    deleteQuery,
    clearError,
    fetchStatistics,
    fetchTimeSeriesData,
    fetchAggregatedData,
    getTimeRangeFromPreset,
    hasActiveResults,
    cachedQueriesCount,
  } = useMonitoringStore();

  // UI状态管理
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedParameters, setSelectedParameters] = useState<string[]>(['voltage', 'temperature']);
  const [activeTab, setActiveTab] = useState<string>('chart');
  const [timeRangePreset, setTimeRangePreset] = useState<string>('last_24_hours');
  const [customStartTime, setCustomStartTime] = useState<string>('');
  const [customEndTime, setCustomEndTime] = useState<string>('');
  const [granularity, setGranularity] = useState<string>('hour');
  const [aggregation, setAggregation] = useState<string>('avg');
  const [pageSize, setPageSize] = useState<number>(20);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // 获取当前时间范围
  const currentTimeRange = useMemo(() => {
    if (customStartTime && customEndTime) {
      return {
        start: new Date(customStartTime).getTime(),
        end: new Date(customEndTime).getTime(),
      };
    }

    // 简化的时间范围计算
    const now = Date.now();
    const end = now;
    let start: number;

    switch (timeRangePreset) {
      case 'last_hour':
        start = now - 60 * 60 * 1000;
        break;
      case 'last_6_hours':
        start = now - 6 * 60 * 60 * 1000;
        break;
      case 'last_24_hours':
        start = now - 24 * 60 * 60 * 1000;
        break;
      case 'last_7_days':
        start = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'last_30_days':
        start = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        start = now - 24 * 60 * 60 * 1000; // 默认24小时
    }

    return { start, end };
  }, [timeRangePreset, customStartTime, customEndTime]);

  /**
   * 传感器参数选择切换
   */
  const toggleParameter = useCallback((paramKey: string) => {
    setSelectedParameters(prev =>
      prev.includes(paramKey)
        ? prev.filter(p => p !== paramKey)
        : [...prev, paramKey]
    );
  }, []);

  /**
   * 获取状态样式
   */
  const getStatusStyles = useCallback((status: keyof typeof STATUS_CONFIG) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
    return {
      bgColor: config.bgColor,
      textColor: config.textColor,
    };
  }, []);

  /**
   * 获取设备标签
   */
  const getDeviceLabel = useCallback((deviceId: string) => {
    return DEVICE_CONFIG[deviceId as keyof typeof DEVICE_CONFIG]?.label || deviceId;
  }, []);

  /**
   * 获取传感器参数标签和单位
   */
  const getParameterInfo = useCallback((paramKey: string) => {
    return PARAMETER_CONFIG[paramKey as keyof typeof PARAMETER_CONFIG] || {
      label: paramKey,
      unit: '',
      color: '#94a3b8',
    };
  }, []);

  /**
   * 创建和执行查询
   */
  const handleExecuteQuery = useCallback(async () => {
    try {
      clearError();
      
      // 创建设备ID列表
      const deviceIds = selectedDevice === 'all'
        ? Object.keys(DEVICE_CONFIG).filter(key => key !== 'all')
        : [selectedDevice];
      
      // 创建查询对象
      const queryData = {
        deviceId: selectedDevice === 'all' ? deviceIds.join(',') : selectedDevice,
        metricTypes: selectedParameters,
        startTime: currentTimeRange.start,
        endTime: currentTimeRange.end,
        granularity,
        aggregation,
        page: 1,
        pageSize,
        sortBy: 'timestamp',
        sortOrder: 'asc' as const,
      };

      // 创建查询
      const query = await createQuery(queryData);
      
      // 执行查询
      await executeQuery(query);
      
      // 获取统计数据
      if (deviceIds.length > 0) {
        await fetchStatistics(deviceIds, selectedParameters, currentTimeRange);
      }
      
      // 获取时间序列数据
      if (deviceIds.length === 1) {
        await fetchTimeSeriesData(
          deviceIds[0],
          selectedParameters,
          currentTimeRange
        );
      }
      
    } catch (error) {
      console.error('查询执行失败:', error);
    }
  }, [
    selectedDevice,
    selectedParameters,
    currentTimeRange,
    granularity,
    aggregation,
    pageSize,
    createQuery,
    executeQuery,
    fetchStatistics,
    fetchTimeSeriesData,
    clearError,
  ]);

  /**
   * 执行数据导出
   */
  const handleExport = useCallback(async (format: 'csv' | 'excel' | 'json') => {
    if (!activeQuery) return;
    
    try {
      await exportData(activeQuery, format);
    } catch (error) {
      console.error('数据导出失败:', error);
    }
  }, [activeQuery, exportData]);

  /**
   * 删除查询记录
   */
  const handleDeleteQuery = useCallback(async (queryId: string) => {
    try {
      await deleteQuery(queryId);
    } catch (error) {
      console.error('删除查询失败:', error);
    }
  }, [deleteQuery]);

  /**
   * 转换图表数据格式
   */
  const chartData = useMemo(() => {
    if (!activeQuery || !results[activeQuery.id]) return [];
    
    const queryResult = results[activeQuery.id];
    if (!queryResult.data || queryResult.data.length === 0) return [];
    
    // 按时间戳分组数据
    const groupedData = new Map<number, any>();

    queryResult.data.forEach((dataPoint: UnifiedMonitoringData) => {
      const timestamp = dataPoint.timestamp;
      const timeKey = new Date(timestamp).toLocaleString('zh-CN');

      if (!groupedData.has(timestamp)) {
        groupedData.set(timestamp, {
          timestamp: timeKey,
          timestampRaw: timestamp,
        });
      }

      const dataEntry = groupedData.get(timestamp);
      dataEntry[dataPoint.metricType] = dataPoint.value;
      dataEntry[`${dataPoint.metricType}_unit`] = dataPoint.unit;
      dataEntry[`${dataPoint.metricType}_quality`] = dataPoint.quality;
    });
    
    return Array.from(groupedData.values()).sort((a, b) => a.timestampRaw - b.timestampRaw);
  }, [activeQuery, results]);

  /**
   * 转换表格数据格式
   */
  const tableData = useMemo(() => {
    if (!activeQuery || !results[activeQuery.id]) return [];
    
    const queryResult = results[activeQuery.id];
    if (!queryResult.data || queryResult.data.length === 0) return [];
    
    return queryResult.data.map((dataPoint: UnifiedMonitoringData) => {
      const paramInfo = getParameterInfo(dataPoint.metricType);
      const deviceLabel = getDeviceLabel(dataPoint.equipmentId);

      // 根据数值范围判断状态
      let status: keyof typeof STATUS_CONFIG = 'normal';
      if (paramInfo.range) {
        const [min, max] = paramInfo.range;
        if (dataPoint.value < min * 0.8 || dataPoint.value > max * 1.2) {
          status = 'critical';
        } else if (dataPoint.value < min || dataPoint.value > max) {
          status = 'warning';
        }
      }

      return {
        time: new Date(dataPoint.timestamp).toLocaleString('zh-CN'),
        device: deviceLabel,
        parameter: paramInfo.label,
        value: `${dataPoint.value}${paramInfo.unit}`,
        status,
        quality: dataPoint.quality,
        rawValue: dataPoint.value,
      };
    });
  }, [activeQuery, results, getParameterInfo, getDeviceLabel]);

  /**
   * 获取统计数据
   */
  const statisticsData = useMemo(() => {
    if (!statistics.stats || !statistics.stats.valueStats) return null;
    
    return Object.entries(statistics.stats.valueStats).map(([metricType, stats]) => {
      const paramInfo = getParameterInfo(metricType);
      const typedStats = stats as {
        min: number;
        max: number;
        avg: number;
        stdDev: number;
        count: number;
      };
      
      return {
        name: paramInfo.label,
        min: typedStats.min.toFixed(2),
        max: typedStats.max.toFixed(2),
        avg: typedStats.avg.toFixed(2),
        stdDev: typedStats.stdDev.toFixed(2),
        count: typedStats.count,
        color: paramInfo.color,
      };
    });
  }, [statistics.stats, getParameterInfo]);

  /**
    * 组件挂载时初始化
    * 查询历史现在通过monitoring-store的queryHistory状态获取
    */
   useEffect(() => {
     // 查询历史数据现在通过store状态自动获取
   }, []);

  /**
    * 预设时间范围按钮配置
    */
   const timeRangeButtons = [
     { key: 'last_hour', label: '最近1小时' },
     { key: 'last_6_hours', label: '最近6小时' },
     { key: 'last_24_hours', label: '最近24小时' },
     { key: 'last_7_days', label: '最近7天' },
     { key: 'last_30_days', label: '最近30天' },
   ];

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和统计信息 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">设备数据查询</h1>
            <p className="text-slate-400">
              查询和分析设备运行数据，支持多维度筛选和数据导出
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              缓存查询: {cachedQueriesCount}
            </Badge>
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              查询历史: {queryHistory.length}
            </Badge>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error}
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-2 h-6 border-red-500/20 text-red-300 hover:bg-red-500/10"
              >
                清除错误
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 筛选条件区域 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-slate-100 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              查询条件
            </h2>
            <div className="flex items-center gap-4">
              <ImportStatusIndicator
                showDetails={false}
                compactMode={true}
                onNavigate={() => {}}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* 设备选择 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">设备选择</label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(DEVICE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-slate-300">
                      <span className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 时间范围预设 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">时间范围</label>
              <div className="flex flex-wrap gap-1">
                {timeRangeButtons.map(({ key, label }) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={timeRangePreset === key ? "default" : "outline"}
                    onClick={() => {
                      setTimeRangePreset(key);
                      setCustomStartTime('');
                      setCustomEndTime('');
                    }}
                    className={timeRangePreset === key
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                      : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* 自定义时间范围 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">开始时间</label>
              <Input
                type="datetime-local"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
                placeholder="选择开始时间"
              />
            </div>

            <div>
              <label className="text-slate-300 text-sm mb-2 block">结束时间</label>
              <Input
                type="datetime-local"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
                placeholder="选择结束时间"
              />
            </div>
          </div>

          {/* 高级选项 */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-slate-900/30 rounded-lg">
              {/* 粒度选择 */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">时间粒度</label>
                <Select value={granularity} onValueChange={setGranularity}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="second" className="text-slate-300">秒级</SelectItem>
                    <SelectItem value="minute" className="text-slate-300">分钟级</SelectItem>
                    <SelectItem value="hour" className="text-slate-300">小时级</SelectItem>
                    <SelectItem value="day" className="text-slate-300">天级</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 聚合类型 */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">聚合类型</label>
                <Select value={aggregation} onValueChange={setAggregation}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none" className="text-slate-300">无聚合</SelectItem>
                    <SelectItem value="avg" className="text-slate-300">平均值</SelectItem>
                    <SelectItem value="min" className="text-slate-300">最小值</SelectItem>
                    <SelectItem value="max" className="text-slate-300">最大值</SelectItem>
                    <SelectItem value="sum" className="text-slate-300">求和</SelectItem>
                    <SelectItem value="count" className="text-slate-300">计数</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 分页大小 */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">每页数量</label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="10" className="text-slate-300">10条</SelectItem>
                    <SelectItem value="20" className="text-slate-300">20条</SelectItem>
                    <SelectItem value="50" className="text-slate-300">50条</SelectItem>
                    <SelectItem value="100" className="text-slate-300">100条</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 传感器参数选择 */}
          <div className="mb-4">
            <label className="text-slate-300 text-sm mb-2 block">监控参数</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PARAMETER_CONFIG).map(([key, config]) => (
                <Button
                  key={key}
                  onClick={() => toggleParameter(key)}
                  size="sm"
                  variant={selectedParameters.includes(key) ? "default" : "outline"}
                  className={selectedParameters.includes(key)
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 hover:bg-cyan-500/30'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-400 hover:bg-slate-700'
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: config.color }}
                  ></span>
                  {config.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 执行查询按钮 */}
          <Button
            onClick={handleExecuteQuery}
            disabled={loading || selectedParameters.length === 0}
            className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {loading ? '查询中...' : '执行查询'}
          </Button>
        </Card>

        {/* 主内容区域 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-slate-900/50">
                <TabsTrigger
                  value="chart"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  图表
                </TabsTrigger>
                <TabsTrigger
                  value="table"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
                >
                  表格
                </TabsTrigger>
                <TabsTrigger
                  value="statistics"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
                >
                  统计
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-slate-300"
                >
                  <History className="w-4 h-4 mr-2" />
                  历史
                </TabsTrigger>
              </TabsList>

              {/* 导出按钮组 */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleExport('excel')}
                  disabled={!hasActiveResults || !!exporting}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
                  size="sm"
                >
                  {exporting?.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Excel导出
                </Button>
                <Button
                  onClick={() => handleExport('csv')}
                  disabled={!hasActiveResults || !!exporting}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
                  size="sm"
                >
                  {exporting?.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  CSV导出
                </Button>
                <Button
                  onClick={() => handleExport('json')}
                  disabled={!hasActiveResults || !!exporting}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
                  size="sm"
                >
                  {exporting?.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  JSON导出
                </Button>
              </div>
            </div>

            {/* 图表标签页 */}
            <TabsContent value="chart">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-2 text-slate-300">加载图表数据中...</span>
                </div>
              ) : chartData.length > 0 ? (
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={500}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis
                        dataKey="timestamp"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #475569',
                          borderRadius: '0.5rem',
                          color: '#e2e8f0',
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Legend />
                      {selectedParameters.map((paramKey) => {
                        const paramInfo = getParameterInfo(paramKey);
                        return (
                          <Line
                            key={paramKey}
                            type="monotone"
                            dataKey={paramKey}
                            stroke={paramInfo.color}
                            strokeWidth={2}
                            name={`${paramInfo.label} (${paramInfo.unit})`}
                            dot={{ fill: paramInfo.color, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                  <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">暂无图表数据</p>
                  <p className="text-sm">请先执行查询获取数据</p>
                </div>
              )}
            </TabsContent>

            {/* 表格标签页 */}
            <TabsContent value="table">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  <span className="ml-2 text-slate-300">加载表格数据中...</span>
                </div>
              ) : tableData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-3 text-slate-300 text-sm font-medium">
                          <Clock className="w-4 h-4 inline mr-1" />
                          时间
                        </th>
                        <th className="text-left py-3 px-3 text-slate-300 text-sm font-medium">设备</th>
                        <th className="text-left py-3 px-3 text-slate-300 text-sm font-medium">参数</th>
                        <th className="text-left py-3 px-3 text-slate-300 text-sm font-medium">数值</th>
                        <th className="text-left py-3 px-3 text-slate-300 text-sm font-medium">状态</th>
                        <th className="text-left py-3 px-3 text-slate-300 text-sm font-medium">质量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, index) => {
                        const statusStyles = getStatusStyles(row.status);
                        return (
                          <tr
                            key={index}
                            className={`border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors ${statusStyles.bgColor}`}
                          >
                            <td className="py-3 px-3 text-slate-400 text-sm">{row.time}</td>
                            <td className="py-3 px-3 text-slate-300 text-sm">{row.device}</td>
                            <td className="py-3 px-3 text-slate-300 text-sm">{row.parameter}</td>
                            <td className="py-3 px-3 text-slate-300 text-sm font-mono">{row.value}</td>
                            <td className={`py-3 px-3 text-sm ${statusStyles.textColor}`}>
                              {STATUS_CONFIG[row.status]?.label || '未知'}
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-sm">{row.quality}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                  <Calendar className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">暂无表格数据</p>
                  <p className="text-sm">请先执行查询获取数据</p>
                </div>
              )}
            </TabsContent>

            {/* 统计标签页 */}
            <TabsContent value="statistics">
              {statisticsData && statisticsData.length > 0 ? (
                <div className="space-y-6">
                  {/* 统计概览 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statisticsData.map((stat, index) => (
                      <Card key={index} className="bg-slate-900/50 border-slate-700 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-slate-300 font-medium">{stat.name}</h4>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stat.color }}
                          ></div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-slate-400">
                            <span>最小值:</span>
                            <span className="text-slate-300 font-mono">{stat.min}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>最大值:</span>
                            <span className="text-slate-300 font-mono">{stat.max}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>平均值:</span>
                            <span className="text-slate-300 font-mono">{stat.avg}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>标准差:</span>
                            <span className="text-slate-300 font-mono">{stat.stdDev}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>数据点:</span>
                            <span className="text-slate-300 font-mono">{stat.count}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* 统计图表 */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <h3 className="text-slate-300 mb-4">数值分布统计</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statisticsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="name" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #475569',
                            borderRadius: '0.5rem',
                            color: '#e2e8f0',
                          }}
                        />
                        <Bar dataKey="avg" fill="#06b6d4" name="平均值" />
                        <Bar dataKey="min" fill="#22c55e" name="最小值" />
                        <Bar dataKey="max" fill="#ef4444" name="最大值" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                  <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">暂无统计数据</p>
                  <p className="text-sm">请先执行查询获取统计数据</p>
                </div>
              )}
            </TabsContent>

            {/* 查询历史标签页 */}
            <TabsContent value="history">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-slate-300">查询记录</h3>
                  <Badge variant="outline" className="text-slate-300 border-slate-600">
                    {queryHistory.length} 条记录
                  </Badge>
                </div>

                {queryHistory.length > 0 ? (
                  <div className="space-y-2">
                    {queryHistory.slice(0, 10).map((query, index) => (
                      <Card key={index} className="bg-slate-900/50 border-slate-700 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {getDeviceLabel(query.equipmentId)}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {query.metricType || '未指定'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {new Date(query.startTime).toLocaleString('zh-CN')}
                              </Badge>
                            </div>
                            <p className="text-slate-300 text-sm">
                              时间范围: {new Date(query.startTime).toLocaleString('zh-CN')} - {new Date(query.endTime).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => {
                                setSelectedDevice(query.equipmentId);
                                setSelectedParameters([query.metricType || 'voltage']);
                                setCustomStartTime(new Date(query.startTime).toISOString().slice(0, 16));
                                setCustomEndTime(new Date(query.endTime).toISOString().slice(0, 16));
                                setTimeRangePreset('custom');
                              }}
                              variant="outline"
                              size="sm"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              复用
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <History className="w-12 h-12 mb-2 opacity-50" />
                    <p>暂无查询记录</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* 导出状态提示 */}
        {exporting && (
          <Card className="bg-slate-800/80 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {exporting.status === 'processing' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                ) : exporting.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="text-slate-300">
                  {exporting.status === 'processing' && '正在导出数据...'}
                  {exporting.status === 'completed' && '数据导出完成'}
                  {exporting.status === 'failed' && '数据导出失败'}
                  {exporting.status === 'expired' && '导出链接已过期'}
                </span>
              </div>
              {exporting.status === 'completed' && exporting.downloadUrl && (
                <Button
                  onClick={() => window.open(exporting.downloadUrl, '_blank')}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载文件
                </Button>
              )}
            </div>
            {exporting.progress !== undefined && (
              <div className="mt-2">
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exporting.progress}%` }}
                  ></div>
                </div>
                <p className="text-slate-400 text-sm mt-1">{exporting.progress}% 完成</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}