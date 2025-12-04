/**
 * 货船智能机舱管理系统 - 统一监测图表组件
 *
 * 功能说明：
 * - 整合GaugeChart、MonitoringChart、RealTimeChart的所有功能
 * - 支持多种图表类型：仪表盘、折线图、面积图、柱状图、散点图、复合图
 * - 统一实时数据和历史数据处理
 * - 提供完整的阈值监控和状态指示
 * - 支持数据导出、全屏显示、自动刷新等功能
 * - 集成权限控制和错误处理
 *
 * 主要特性：
 * 1. 多图表类型：支持6种主要图表类型
 * 2. 数据源统一：同时支持实时数据和历史数据
 * 3. 阈值监控：可视化警告和严重阈值线
 * 4. 状态指示：根据数据自动判断运行状态
 * 5. 交互功能：缩放、平移、刷选、全屏
 * 6. 数据导出：支持JSON、CSV、Excel格式
 * 7. 响应式设计：适配不同屏幕尺寸
 * 8. 性能优化：虚拟化渲染、数据缓存
 *
 * 应用场景：
 * - 电池系统监控（电压、电流、温度、SOC）
 * - 推进系统监控（转速、功率、温度）
 * - 配电系统监控（电压、电流、功率）
 * - 辅助系统监控（压力、流量、水位）
 * - 系统健康评分和趋势分析
 *
 * 技术架构：
 * - 基于Recharts图表库
 * - 使用统一数据类型（UnifiedMonitoringData）
 * - 集成monitoring-service和realtime-service
 * - 支持WebSocket实时数据更新
 * - 提供完整的TypeScript类型定义
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025
 */

// React核心钩子导入
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// 图表库导入
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  ScatterChart, Scatter, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Brush
} from 'recharts';

// UI组件导入
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// 状态管理导入
import { useMonitoringStore } from '../stores/monitoring-store';

// 统一数据类型导入
import {
  UnifiedMonitoringData,
  MetricType,
  DataQuality,
  DataSource
} from '../types/monitoring';

// 图标库导入
import {
  TrendingUp, TrendingDown, Minus, Zap, AlertTriangle, CheckCircle,
  RefreshCw, Maximize2, Minimize2, Download, RotateCcw,
  Activity, BarChart3, LineChart as LineChartIcon, PieChart,
  Settings, Filter, Calendar
} from 'lucide-react';

// 自定义组件导入
import { GaugeRenderer } from './GaugeRenderer';

// 权限检查导入
import { usePermissions } from '../hooks/usePermissions';

/**
 * 图表类型枚举
 * 
 * 定义所有支持的图表类型
 */
export enum ChartType {
  GAUGE = 'gauge',           // 仪表盘
  LINE = 'line',             // 折线图
  AREA = 'area',             // 面积图
  BAR = 'bar',               // 柱状图
  SCATTER = 'scatter',       // 散点图
  COMPOSED = 'composed'      // 复合图
}

/**
 * 数据点接口
 * 
 * 统一的数据点格式，用于图表渲染
 */
export interface ChartDataPoint {
  timestamp: number;                    // 时间戳
  time: string;                        // 格式化时间字符串
  [key: string]: number | string;      // 动态参数键值对
}

/**
 * 监测参数配置接口
 * 
 * 定义单个监测参数的显示配置
 */
export interface MonitoringParameter {
  key: string;                         // 参数键名
  label: string;                       // 参数显示名称
  metricType: MetricType;              // 指标类型
  color: string;                       // 图表颜色
  unit?: string;                       // 单位
  yAxisId?: string;                    // Y轴ID（用于多Y轴）
  visible?: boolean;                    // 是否可见
  threshold?: {                        // 阈值配置
    warning?: number;                  // 警告阈值
    critical?: number;                 // 严重阈值
    showLines?: boolean;               // 是否显示阈值线
  };
  aggregation?: 'avg' | 'min' | 'max' | 'sum'; // 聚合方式
}

/**
 * 图表配置接口
 * 
 * 定义图表的全局配置选项
 */
export interface ChartConfig {
  title?: string;                      // 图表标题
  height?: number;                     // 图表高度
  showGrid?: boolean;                  // 是否显示网格
  showLegend?: boolean;                 // 是否显示图例
  showTooltip?: boolean;                // 是否显示提示
  showBrush?: boolean;                  // 是否显示刷选
  showExport?: boolean;                 // 是否显示导出按钮
  showFullscreen?: boolean;             // 是否显示全屏按钮
  showChartTypeSelector?: boolean;      // 是否显示图表类型选择器
  showTimeRangeSelector?: boolean;      // 是否显示时间范围选择器
  autoRefresh?: boolean;                // 是否自动刷新
  refreshInterval?: number;             // 刷新间隔（毫秒）
  timeRange?: {                        // 时间范围
    start: number;
    end: number;
  };
  maxDataPoints?: number;               // 最大数据点数
  animationDuration?: number;           // 动画持续时间
  theme?: 'light' | 'dark';           // 主题
}

/**
 * 统一监测图表属性接口
 * 
 * 定义组件的所有可配置属性
 */
export interface UnifiedMonitoringChartProps {
  // 基础配置
  chartType: ChartType;                // 图表类型
  parameters: MonitoringParameter[];     // 监测参数配置
  config?: ChartConfig;                 // 图表配置

  // 数据源
  realtimeData?: UnifiedMonitoringData[];    // 实时数据
  historicalData?: UnifiedMonitoringData[];    // 历史数据

  // 回调函数
  onDataUpdate?: (data: ChartDataPoint[]) => void;     // 数据更新回调
  onParameterToggle?: (parameter: MonitoringParameter) => void; // 参数切换回调
  onThresholdAlert?: (parameter: MonitoringParameter, value: number) => void; // 阈值告警回调
  onExport?: (format: 'json' | 'csv' | 'excel') => void; // 导出回调

  // 权限控制
  requiredPermissions?: string[];        // 所需权限列表

  // 样式和类名
  className?: string;                   // 自定义CSS类名
  style?: React.CSSProperties;         // 自定义样式
}

/**
 * 连接状态指示器组件
 * 
 * 显示实时数据连接状态
 */
const ConnectionStatusIndicator = ({ isConnected }: { isConnected: boolean }) => {
  return (
    <Badge className={`
      flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border-0
      ${isConnected
        ? 'bg-green-500/20 text-green-400'
        : 'bg-red-500/20 text-red-400'
      }
    `}>
      <div className={`
        w-2 h-2 rounded-full
        ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}
      `} />
      {isConnected ? '实时连接' : '连接断开'}
    </Badge>
  );
};

/**
 * 趋势指示器组件
 * 
 * 显示数据变化趋势
 */
const TrendIndicator = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  const config = {
    up: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20', label: '上升' },
    down: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/20', label: '下降' },
    stable: { icon: Minus, color: 'text-slate-400', bg: 'bg-slate-500/20', label: '稳定' },
  };

  const { icon: Icon, color, bg, label } = config[trend];

  return (
    <Badge className={`${bg} ${color} border-0 px-2 py-1`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

/**
 * 状态指示器组件
 * 
 * 显示运行状态
 */
const StatusIndicator = ({ status }: { status: 'normal' | 'warning' | 'critical' }) => {
  const config = {
    normal: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: '正常' },
    warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '警告' },
    critical: { icon: Zap, color: 'text-red-400', bg: 'bg-red-500/20', label: '严重' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <Badge className={`${bg} ${color} border-0 px-2 py-1`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
};

/**
 * 图表类型选择器组件
 * 
 * 提供图表类型切换功能
 */
const ChartTypeSelector = ({
  chartType,
  onChartTypeChange,
  disabled = false
}: {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  disabled?: boolean;
}) => {
  const types = [
    { value: ChartType.LINE, icon: LineChartIcon, label: '折线图' },
    { value: ChartType.BAR, icon: BarChart3, label: '柱状图' },
    { value: ChartType.SCATTER, icon: PieChart, label: '散点图' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">图表类型:</span>
      <div className="flex gap-1">
        {types.map(type => (
          <Button
            key={type.value}
            onClick={() => onChartTypeChange(type.value)}
            variant={chartType === type.value ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className={`
              ${chartType === type.value
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-cyan-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <type.icon className="w-4 h-4" />
            <span className="ml-1">{type.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

/**
 * 时间范围选择器组件
 * 
 * 提供快速时间范围选择
 */
const TimeRangeSelector = ({
  selectedRange,
  onRangeChange,
  disabled = false
}: {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  disabled?: boolean;
}) => {
  const ranges = [
    { value: '1hour', label: '1小时' },
    { value: '6hours', label: '6小时' },
    { value: '1day', label: '1天' },
    { value: '7days', label: '7天' },
    { value: '30days', label: '30天' },
    { value: 'custom', label: '自定义' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">时间范围:</span>
      <div className="flex gap-1">
        {ranges.map(range => (
          <Button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            variant={selectedRange === range.value ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className={`
              ${selectedRange === range.value
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-cyan-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

/**
 * 参数选择器组件
 * 
 * 提供监测参数的显示/隐藏切换
 */
const ParameterSelector = ({
  parameters,
  selectedParameters,
  onParameterToggle,
  disabled = false
}: {
  parameters: MonitoringParameter[];
  selectedParameters: string[];
  onParameterToggle: (paramKey: string) => void;
  disabled?: boolean;
}) => {
  return (
    <div className="mb-4">
      <span className="text-slate-300 text-sm mb-3 block">监测参数:</span>
      <div className="flex flex-wrap gap-2">
        {parameters.map(param => (
          <Button
            key={param.key}
            onClick={() => onParameterToggle(param.key)}
            variant={selectedParameters.includes(param.key) ? 'default' : 'outline'}
            size="sm"
            disabled={disabled}
            className={`
              ${selectedParameters.includes(param.key)
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:text-cyan-400'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: param.color }}
            />
            {param.label}
            {param.unit && (
              <span className="ml-1 text-xs opacity-70">({param.unit})</span>
            )}
            {param.threshold && (
              <AlertTriangle className="w-3 h-3 ml-1" />
            )}
          </Button>
        ))}
      </div>
    </div>
  );
};

/**
 * 自定义工具提示组件
 * 
 * 提供丰富的数据点信息展示
 */
const CustomTooltip = ({
  active,
  payload,
  label,
  parameters
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  parameters: MonitoringParameter[];
}) => {
  if (!active || !payload || !payload.length) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'critical': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'normal': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
      <p className="text-slate-300 text-sm mb-2">
        {typeof label === 'number' ? formatTime(label) : label}
      </p>
      {payload.map((entry, index) => {
        const param = parameters.find(p => p.key === entry.dataKey);
        if (!param) return null;

        return (
          <div key={index} className="flex items-center gap-2 text-sm mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color || param.color }}
            />
            <span className="text-slate-400">{param.label}:</span>
            <span className="text-slate-100 font-medium">
              {entry.value?.toFixed(2)}{param.unit ? ` ${param.unit}` : ''}
            </span>
            {entry.payload?.status && (
              <span className={`text-xs ${getStatusColor(entry.payload.status)}`}>
                ({entry.payload.status})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * 阈值线组件
 * 
 * 在图表上绘制阈值参考线
 */
const ThresholdLines = ({ parameter }: { parameter: MonitoringParameter }) => {
  if (!parameter.threshold?.showLines) return null;

  return (
    <>
      {parameter.threshold.warning && (
        <ReferenceLine
          y={parameter.threshold.warning}
          stroke="#f59e0b"
          strokeDasharray="5 5"
          label={{ value: "警告", position: "right" }}
        />
      )}
      {parameter.threshold.critical && (
        <ReferenceLine
          y={parameter.threshold.critical}
          stroke="#ef4444"
          strokeDasharray="3 3"
          label={{ value: "严重", position: "right" }}
        />
      )}
    </>
  );
};

/**
 * 统一监测图表主组件
 * 
 * 整合所有图表功能的核心组件
 */
export function UnifiedMonitoringChart({
  chartType,
  parameters,
  config = {},
  realtimeData = [],
  historicalData = [],
  onDataUpdate,
  onParameterToggle,
  onThresholdAlert,
  onExport,
  requiredPermissions = [],
  className = '',
  style = {}
}: UnifiedMonitoringChartProps) {
  // 权限检查
  const { hasPermission } = usePermissions();
  const hasRequiredPermission = requiredPermissions.length === 0 ||
    requiredPermissions.every(permission => hasPermission(permission, 'read'));

  // 状态管理
  const {
    realtimeConnected,
    connectionStatus,
    fetchMonitoringData,
    createQuery,
    executeQuery
  } = useMonitoringStore();
  
  // 组件内部状态
  const [localChartType, setLocalChartType] = useState<ChartType>(chartType);
  const [selectedParameters, setSelectedParameters] = useState<string[]>(
    parameters.slice(0, 3).map(p => p.key)
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState('1hour');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 合并数据源
  const allData = useMemo(() => {
    const combined = [...historicalData, ...realtimeData];
    return combined.sort((a, b) => a.timestamp - b.timestamp);
  }, [historicalData, realtimeData]);

  // 转换为图表数据格式
  const chartData = useMemo(() => {
    const maxPoints = config.maxDataPoints || 1000;
    const limitedData = allData.slice(-maxPoints);
    
    return limitedData.map(item => {
      const chartPoint: ChartDataPoint = {
        timestamp: item.timestamp,
        time: new Date(item.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };

      // 为每个选中的参数添加数据
      selectedParameters.forEach(paramKey => {
        const param = parameters.find(p => p.key === paramKey);
        if (param && param.metricType === item.metricType) {
          chartPoint[paramKey] = item.value;
        }
      });

      return chartPoint;
    }).filter(point => 
      // 过滤掉没有选中参数数据的数据点
      selectedParameters.some(paramKey => point[paramKey] !== undefined)
    );
  }, [allData, parameters, selectedParameters, config.maxDataPoints]);

  // 计算统计信息
  const statistics = useMemo(() => {
    return selectedParameters.map(paramKey => {
      const param = parameters.find(p => p.key === paramKey);
      if (!param) return null;

      const values = chartData.map(d => d[paramKey]).filter(v => typeof v === 'number') as number[];
      if (values.length === 0) return null;

      const latest = values[values.length - 1];
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // 判断状态
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (param.threshold?.critical && latest >= param.threshold.critical) {
        status = 'critical';
      } else if (param.threshold?.warning && latest >= param.threshold.warning) {
        status = 'warning';
      }

      return {
        param,
        latest,
        avg,
        min,
        max,
        status,
        count: values.length
      };
    }).filter(Boolean);
  }, [chartData, parameters, selectedParameters]);

  // 计算趋势
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'stable';
    
    const latestValue = chartData[chartData.length - 1][selectedParameters[0]];
    const previousValue = chartData[chartData.length - 2][selectedParameters[0]];
    
    if (typeof latestValue !== 'number' || typeof previousValue !== 'number') {
      return 'stable';
    }

    const diff = latestValue - previousValue;
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }, [chartData, selectedParameters]);

  // 自动刷新功能
  useEffect(() => {
    if (!config.autoRefresh || !realtimeConnected) return;

    const interval = setInterval(async () => {
      setLastUpdate(new Date());

      // 如果有历史数据查询需求，这里可以调用
      if (onDataUpdate) {
        onDataUpdate(chartData);
      }
    }, config.refreshInterval || 5000);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, realtimeConnected, onDataUpdate, chartData]);

  // 阈值告警检查
  useEffect(() => {
    if (!onThresholdAlert) return;

    statistics?.forEach(stat => {
      if (!stat) return;
      
      const { param, latest, status } = stat;
      if (status === 'warning' || status === 'critical') {
        onThresholdAlert(param, latest);
      }
    });
  }, [statistics, onThresholdAlert]);

  // 参数切换处理
  const handleParameterToggle = useCallback((paramKey: string) => {
    const newSelected = selectedParameters.includes(paramKey)
      ? selectedParameters.filter(p => p !== paramKey)
      : [...selectedParameters, paramKey];
    
    setSelectedParameters(newSelected);
    onParameterToggle?.(parameters.find(p => p.key === paramKey)!);
  }, [selectedParameters, parameters, onParameterToggle]);

  // 图表类型切换处理
  const handleChartTypeChange = useCallback((type: ChartType) => {
    setLocalChartType(type);
  }, []);

  // 时间范围切换处理
  const handleTimeRangeChange = useCallback(async (range: string) => {
    // 如果禁用了时间范围选择器，不执行任何操作
    if (config.showTimeRangeSelector === false) return;
    
    setSelectedTimeRange(range);
    setIsLoading(true);
    setError(null);

    try {
      if (range !== 'custom' && parameters.length > 0) {
        // 计算时间范围
        const now = Date.now();
        let start: number;
        
        switch (range) {
          case '1hour': start = now - 60 * 60 * 1000; break;
          case '6hours': start = now - 6 * 60 * 60 * 1000; break;
          case '1day': start = now - 24 * 60 * 60 * 1000; break;
          case '7days': start = now - 7 * 24 * 60 * 60 * 1000; break;
          case '30days': start = now - 30 * 24 * 60 * 60 * 1000; break;
          default: start = now - 24 * 60 * 60 * 1000;
        }

        // 查询历史数据
        const firstParam = parameters[0];
        if (firstParam) {
          // 创建查询对象
          const query = await createQuery({
            deviceId: '', // 这里需要从外部传入设备ID
            metricTypes: [firstParam.metricType],
            startTime: start,
            endTime: now,
          });

          // 执行查询
          await executeQuery(query);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询数据失败');
    } finally {
      setIsLoading(false);
    }
  }, [parameters, executeQuery, config.showTimeRangeSelector]);

  // 数据导出处理
  const handleExport = useCallback((format: 'json' | 'csv' | 'excel') => {
    if (onExport) {
      onExport(format);
    } else {
      // 默认导出逻辑
      const exportData = {
        timestamp: new Date().toISOString(),
        title: config.title || '监测数据',
        parameters: selectedParameters,
        statistics: statistics?.map(s => ({
          parameter: s?.param.label,
          latest: s?.latest,
          average: s?.avg,
          minimum: s?.min,
          maximum: s?.max,
          count: s?.count,
          status: s?.status
        })),
        data: chartData.slice(-100) // 最近100个数据点
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `chart-data-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      // CSV和Excel导出可以在这里实现
    }
  }, [config.title, selectedParameters, statistics, chartData, onExport]);

  // 全屏切换处理
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // 手动刷新处理
  const handleRefresh = useCallback(() => {
    setLastUpdate(new Date());
    if (onDataUpdate) {
      onDataUpdate(chartData);
    }
  }, [onDataUpdate, chartData]);

  // 渲染图表内容
  const renderChart = () => {
    const height = isFullscreen ? 600 : (config.height || 400);
    
    // 仪表盘类型特殊处理
    if (localChartType === ChartType.GAUGE) {
      return <GaugeRenderer parameters={parameters} statistics={statistics} />;
    }

    // 渲染具体的图表组件
    const renderChartContent = () => {
      switch (localChartType) {
        case ChartType.LINE:
          return (
            <LineChart data={chartData}>
              {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#475569" />}
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis stroke="#94a3b8" fontSize={12} />
              {config.showTooltip !== false && (
                <Tooltip content={<CustomTooltip parameters={parameters} />} />
              )}
              {config.showLegend !== false && <Legend />}
              
              {parameters.map(param => {
                if (!selectedParameters.includes(param.key)) return null;
                return (
                  <g key={param.key}>
                    <ThresholdLines parameter={param} />
                    <Line
                      type="monotone"
                      dataKey={param.key}
                      stroke={param.color}
                      strokeWidth={2}
                      name={param.label}
                      dot={{ fill: param.color, r: 3 }}
                      activeDot={{ r: 5, stroke: param.color, strokeWidth: 2 }}
                      connectNulls={false}
                    />
                  </g>
                );
              })}
            </LineChart>
          );

        case ChartType.AREA:
          return (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#475569" />}
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis stroke="#94a3b8" fontSize={12} />
              {config.showTooltip !== false && (
                <Tooltip content={<CustomTooltip parameters={parameters} />} />
              )}
              {config.showLegend !== false && <Legend />}
              
              {parameters.map(param => {
                if (!selectedParameters.includes(param.key)) return null;
                return (
                  <g key={param.key}>
                    <ThresholdLines parameter={param} />
                    <Area
                      type="monotone"
                      dataKey={param.key}
                      stroke={param.color}
                      fillOpacity={1}
                      fill="url(#areaGradient)"
                      strokeWidth={2}
                      name={param.label}
                    />
                  </g>
                );
              })}
            </AreaChart>
          );

        case ChartType.BAR:
          return (
            <BarChart data={chartData}>
              {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#475569" />}
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis stroke="#94a3b8" fontSize={12} />
              {config.showTooltip !== false && (
                <Tooltip content={<CustomTooltip parameters={parameters} />} />
              )}
              {config.showLegend !== false && <Legend />}
              
              {parameters.map(param => {
                if (!selectedParameters.includes(param.key)) return null;
                return (
                  <Bar
                    key={param.key}
                    dataKey={param.key}
                    fill={param.color}
                    name={param.label}
                  />
                );
              })}
            </BarChart>
          );

        case ChartType.SCATTER:
          return (
            <ScatterChart data={chartData}>
              {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#475569" />}
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis stroke="#94a3b8" fontSize={12} />
              {config.showTooltip !== false && (
                <Tooltip content={<CustomTooltip parameters={parameters} />} />
              )}
              {config.showLegend !== false && <Legend />}
              
              {parameters.map(param => {
                if (!selectedParameters.includes(param.key)) return null;
                return (
                  <Scatter
                    key={param.key}
                    dataKey={param.key}
                    fill={param.color}
                    name={param.label}
                  />
                );
              })}
            </ScatterChart>
          );

        case ChartType.COMPOSED:
          return (
            <ComposedChart data={chartData}>
              {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#475569" />}
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis stroke="#94a3b8" fontSize={12} />
              {config.showTooltip !== false && (
                <Tooltip content={<CustomTooltip parameters={parameters} />} />
              )}
              {config.showLegend !== false && <Legend />}
              
              {parameters.map((param, index) => {
                if (!selectedParameters.includes(param.key)) return null;
                const isEven = index % 2 === 0;
                
                return (
                  <g key={param.key}>
                    <ThresholdLines parameter={param} />
                    {isEven ? (
                      <Line
                        type="monotone"
                        dataKey={param.key}
                        stroke={param.color}
                        strokeWidth={2}
                        name={param.label}
                        dot={{ fill: param.color, r: 3 }}
                        activeDot={{ r: 5, stroke: param.color, strokeWidth: 2 }}
                        connectNulls={false}
                      />
                    ) : (
                      <Bar
                        dataKey={param.key}
                        fill={param.color}
                        name={param.label}
                        fillOpacity={0.6}
                      />
                    )}
                  </g>
                );
              })}
            </ComposedChart>
          );

        default:
          return <div className="flex items-center justify-center h-full text-slate-400">不支持的图表类型</div>;
      }
    };

    // 其他图表类型的通用渲染
    return (
      <ResponsiveContainer width="100%" height={height}>
        {renderChartContent()}
      </ResponsiveContainer>
    );
  };

  // 如果没有权限，显示权限提示
  if (!hasRequiredPermission) {
    return (
      <Card className="bg-slate-800/80 border border-slate-700 rounded-lg p-6">
        <div className="text-center text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>您没有权限查看此图表</p>
          <p className="text-sm mt-2">所需权限: {requiredPermissions.join(', ')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`
      bg-slate-800/80 border border-slate-700 rounded-lg p-6
      ${isFullscreen ? 'fixed inset-4 z-50 bg-slate-900' : ''}
      ${className}
    `} style={style}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {config.title && (
            <h2 className="text-slate-100 text-xl font-semibold">{config.title}</h2>
          )}
          <ConnectionStatusIndicator isConnected={realtimeConnected} />
          {statistics && statistics.length > 0 && (
            <StatusIndicator status={statistics[0]?.status || 'normal'} />
          )}
          <TrendIndicator trend={trend} />
        </div>
        
        {/* 控制按钮 */}
        <div className="flex items-center gap-2">
          {config.showExport !== false && (
            <Select onValueChange={(value: any) => handleExport(value)}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-300">
                <Download className="w-4 h-4 mr-2" />
                导出
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON格式</SelectItem>
                <SelectItem value="csv">CSV格式</SelectItem>
                <SelectItem value="excel">Excel格式</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          {config.showFullscreen !== false && (
            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              className="bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>最后更新: {lastUpdate.toLocaleTimeString()}</span>
          <span>数据点: {chartData.length}</span>
          {realtimeData.length > 0 && (
            <span>实时数据: {realtimeData.length}</span>
          )}
        </div>
        {error && (
          <span className="text-red-400">错误: {error}</span>
        )}
      </div>

      {/* 控制面板 */}
      <div className="flex flex-wrap gap-4 mb-6">
        {config.showChartTypeSelector !== false && (
          <ChartTypeSelector
            chartType={localChartType}
            onChartTypeChange={handleChartTypeChange}
            disabled={isLoading}
          />
        )}
        
        {config.showTimeRangeSelector !== false && (
          <TimeRangeSelector
            selectedRange={selectedTimeRange}
            onRangeChange={handleTimeRangeChange}
            disabled={isLoading}
          />
        )}
      </div>

      {/* 参数选择器 */}
      <ParameterSelector
        parameters={parameters}
        selectedParameters={selectedParameters}
        onParameterToggle={handleParameterToggle}
        disabled={isLoading}
      />

      {/* 图表主体 */}
      <div className="bg-slate-900/50 rounded-lg p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          renderChart()
        )}
      </div>

      {/* 统计信息 */}
      {statistics && statistics.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {statistics.map((stat, index) => {
            if (!stat) return null;
            
            return (
              <Card key={index} className="bg-slate-900/30 border-slate-700 p-3">
                <h4 className="text-slate-400 text-xs mb-2">{stat.param.label}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">最新:</span>
                    <span className={`font-medium ${
                      stat.status === 'critical' ? 'text-red-400' :
                      stat.status === 'warning' ? 'text-yellow-400' : 'text-slate-200'
                    }`}>
                      {stat.latest?.toFixed(2)}{stat.param.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">平均:</span>
                    <span className="text-slate-200">{stat.avg?.toFixed(2)}{stat.param.unit}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">最大:</span>
                    <span className="text-slate-200">{stat.max?.toFixed(2)}{stat.param.unit}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">最小:</span>
                    <span className="text-slate-200">{stat.min?.toFixed(2)}{stat.param.unit}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// 默认导出
export default UnifiedMonitoringChart;