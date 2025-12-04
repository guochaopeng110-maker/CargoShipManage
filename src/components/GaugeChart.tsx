/**
 * 仪表盘图表组件
 * 
 * 功能说明：
 * - 提供多种类型的仪表盘显示（圆形、半圆、四分之一圆、线性）
 * - 支持动画效果和实时数据更新
 * - 集成趋势指示器和状态监控
 * - 提供阈值线标记和全屏显示功能
 * - 包含统计数据展示（平均值、最大值、最小值等）
 * 
 * 主要特性：
 * 1. 多种仪表盘类型：full（完整圆形）、semicircle（半圆）、quarter（四分之一圆）、linear（线性）
 * 2. 动画效果：数值变化时的平滑过渡动画
 * 3. 实时数据：支持传入实时数据数组，计算趋势
 * 4. 阈值监控：可设置警告和严重阈值，显示阈值线
 * 5. 状态指示：根据数值范围自动判断状态（正常/警告/严重）
 * 6. 趋势指示：显示数据上升、下降或稳定趋势
 * 7. 统计数据：显示平均值、最小值、最大值、数据点数
 * 8. 全屏显示：支持全屏模式查看详细数据
 * 
 * 应用场景：
 * - 电池系统监控（电压、SOC、温度）
 * - 推进系统监控（电机转速、温度）
 * - 辅助系统监控（压力、流量、水位）
 * - 系统健康评分显示
 * - 实时告警状态展示
 */

// React核心钩子导入
import React, { useState, useEffect } from 'react';

// UI组件导入
import { Card } from './ui/card';       // 卡片容器组件
import { Button } from './ui/button';   // 按钮组件
import { Badge } from './ui/badge';     // 徽章组件

// 状态管理钩子导入
import { useMonitoringStore } from '../stores/monitoring-store'; // 统一监测数据状态管理

// 图标组件导入（来自Lucide React图标库）
import {
  TrendingUp,      // 上升趋势图标
  TrendingDown,    // 下降趋势图标
  Minus,           // 稳定状态图标
  Zap,             // 闪电图标 - 表示严重状态
  AlertTriangle,   // 警告三角形图标 - 表示警告状态
  CheckCircle,     // 确认图标 - 表示正常状态
  RefreshCw,       // 刷新图标
  Maximize2        // 全屏图标
} from 'lucide-react';

/**
 * 仪表盘属性接口
 * 
 * 描述：定义仪表盘组件的所有可配置属性
 * 
 * 基础属性：
 * - value: 当前显示的数值
 * - maxValue: 仪表盘最大刻度值
 * - minValue: 仪表盘最小刻度值（可选，默认为0）
 * - label: 仪表盘标题标签
 * - unit: 数值单位
 * 
 * 显示配置：
 * - size: 仪表盘尺寸（small/medium/large）
 * - status: 初始状态（normal/warning/critical）
 * - type: 仪表盘类型（full/semicircle/quarter/linear）
 * - animated: 是否启用动画效果
 * 
 * 数据和功能：
 * - realtimeData: 实时数据数组，用于趋势计算
 * - thresholds: 阈值配置（警告值、严重值、是否显示阈值线）
 * - showTrend: 是否显示趋势指示器
 * - showStatistics: 是否显示统计数据
 * 
 * 回调函数：
 * - onValueChange: 数值变化回调
 * - onStatusChange: 状态变化回调
 */
interface GaugeChartProps {
  value: number;                    // 当前数值
  maxValue: number;                 // 最大值
  minValue?: number;                // 最小值（默认0）
  label: string;                    // 标签文字
  unit: string;                     // 单位
  size?: 'small' | 'medium' | 'large';  // 尺寸
  status?: 'normal' | 'warning' | 'critical'; // 状态
  type?: 'full' | 'semicircle' | 'quarter' | 'linear'; // 类型
  animated?: boolean;               // 是否动画
  realtimeData?: {                  // 实时数据
    timestamp: number;              // 时间戳
    value: number;                  // 数值
    trend: 'up' | 'down' | 'stable'; // 趋势
  }[];
  thresholds?: {                    // 阈值配置
    warning?: number;               // 警告阈值
    critical?: number;              // 严重阈值
    showLines?: boolean;            // 是否显示阈值线
  };
  showTrend?: boolean;              // 显示趋势
  showStatistics?: boolean;         // 显示统计
  onValueChange?: (value: number) => void;     // 数值变化回调
  onStatusChange?: (status: 'normal' | 'warning' | 'critical') => void; // 状态变化回调
}

/**
 * 趋势指示器组件
 * 
 * 功能说明：
 * - 根据趋势类型显示相应的图标和颜色
 * - 使用Badge组件包装，提供统一的视觉样式
 * - 支持上升、下降、稳定三种趋势状态
 * 
 * 趋势状态映射：
 * - up: 绿色上升趋势图标，显示"上升"
 * - down: 红色下降趋势图标，显示"下降"
 * - stable: 灰色稳定图标，显示"稳定"
 * 
 * @param trend 趋势类型
 */
const TrendIndicator = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  // 趋势状态配置映射
  const config = {
    up: { 
      icon: TrendingUp,           // 上升趋势图标
      color: 'text-green-400',    // 绿色文字
      bg: 'bg-green-500/20'       // 绿色背景
    },
    down: { 
      icon: TrendingDown,         // 下降趋势图标
      color: 'text-red-400',      // 红色文字
      bg: 'bg-red-500/20'         // 红色背景
    },
    stable: { 
      icon: Minus,                // 稳定状态图标
      color: 'text-slate-400',    // 灰色文字
      bg: 'bg-slate-500/20'       // 灰色背景
    },
  };

  // 获取当前趋势的配置
  const { icon: Icon, color, bg } = config[trend];

  return (
    <Badge className={`${bg} ${color} border-0 px-2 py-1`}>
      {/* 趋势图标 */}
      <Icon className="w-3 h-3 mr-1" />
      {/* 趋势文字 */}
      {trend === 'up' ? '上升' : trend === 'down' ? '下降' : '稳定'}
    </Badge>
  );
};

/**
 * 阈值线组件
 * 
 * 功能说明：
 * - 在仪表盘上绘制警告和严重阈值线
 * - 使用虚线样式区分不同级别的阈值
 * - 仅在启用showLines时显示
 * 
 * 阈值线样式：
 * - 警告线：黄色虚线（border-yellow-400/50）
 * - 严重线：红色虚线（border-red-400/50）
 * 
 * 位置计算：
 * - 根据阈值与最大值的比例计算线条位置
 * - 使用bottom定位从底部向上计算
 * 
 * @param thresholds 阈值配置
 * @param maxValue 最大值
 */
const ThresholdLines = ({ 
  thresholds, 
  maxValue 
}: { 
  thresholds?: GaugeChartProps['thresholds']; 
  maxValue: number;
}) => {
  // 如果不显示阈值线，直接返回null
  if (!thresholds?.showLines) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 警告阈值线 */}
      {thresholds.warning && (
        <div
          className="absolute w-full border-t-2 border-dashed border-yellow-400/50"
          style={{ bottom: `${(thresholds.warning / maxValue) * 100}%` }}
        />
      )}
      {/* 严重阈值线 */}
      {thresholds.critical && (
        <div
          className="absolute w-full border-t-2 border-dashed border-red-400/50"
          style={{ bottom: `${(thresholds.critical / maxValue) * 100}%` }}
        />
      )}
    </div>
  );
};

/**
 * 状态指示器组件
 * 
 * 功能说明：
 * - 根据仪表盘状态显示对应的图标和颜色
 * - 使用Badge组件提供统一的状态展示
 * - 支持正常、警告、严重三种状态
 * 
 * 状态映射：
 * - normal: 绿色CheckCircle图标，显示"正常"
 * - warning: 黄色AlertTriangle图标，显示"警告"
 * - critical: 红色Zap图标，显示"严重"
 * 
 * @param status 状态类型
 */
const StatusIndicator = ({ status }: { status: 'normal' | 'warning' | 'critical' }) => {
  // 状态配置映射
  const config = {
    normal: { 
      icon: CheckCircle,           // 正常状态图标
      color: 'text-green-400',    // 绿色文字
      bg: 'bg-green-500/20',      // 绿色背景
      label: '正常'                // 状态标签
    },
    warning: { 
      icon: AlertTriangle,        // 警告状态图标
      color: 'text-yellow-400',   // 黄色文字
      bg: 'bg-yellow-500/20',     // 黄色背景
      label: '警告'                // 状态标签
    },
    critical: { 
      icon: Zap,                  // 严重状态图标
      color: 'text-red-400',      // 红色文字
      bg: 'bg-red-500/20',        // 红色背景
      label: '严重'                // 状态标签
    },
  };

  // 获取当前状态的配置
  const { icon: Icon, color, bg, label } = config[status];

  return (
    <Badge className={`${bg} ${color} border-0 px-2 py-1`}>
      {/* 状态图标 */}
      <Icon className="w-3 h-3 mr-1" />
      {/* 状态标签 */}
      {label}
    </Badge>
  );
};

/**
 * 仪表盘图表主组件
 * 
 * 功能说明：
 * - 渲染完整的仪表盘图表界面
 * - 集成所有子组件（趋势指示器、状态指示器、阈值线等）
 * - 管理动画效果和状态变化
 * - 提供全屏显示功能
 * 
 * 核心功能：
 * 1. SVG仪表盘渲染：使用SVG路径绘制不同类型的仪表盘
 * 2. 动画效果：数值变化时的平滑过渡动画
 * 3. 状态管理：自动检测和更新仪表盘状态
 * 4. 趋势计算：根据实时数据计算当前趋势
 * 5. 统计数据：计算平均值、最小值、最大值
 * 6. 响应式设计：支持不同尺寸的仪表盘
 * 
 * 布局结构：
 * - Header: 标题、状态指示器、趋势指示器、全屏按钮
 * - Main Gauge: SVG仪表盘主体
 * - Status Bar: 最后更新时间、数据点数量
 * - Statistics: 统计数据展示（可选）
 * 
 * @param props 仪表盘属性配置
 */
export function GaugeChart({ 
  value,                // 当前数值
  maxValue,             // 最大值
  minValue = 0,         // 最小值（默认0）
  label,                // 标签
  unit,                 // 单位
  size = 'medium',      // 尺寸（默认中等）
  status = 'normal',    // 状态（默认正常）
  type = 'semicircle',  // 类型（默认半圆）
  animated = true,      // 动画（默认启用）
  realtimeData = [],    // 实时数据（默认空数组）
  thresholds,           // 阈值配置
  showTrend = true,     // 显示趋势（默认启用）
  showStatistics = false, // 显示统计（默认禁用）
  onValueChange,        // 数值变化回调
  onStatusChange        // 状态变化回调
}: GaugeChartProps) {
  // 使用统一监测数据状态管理
  const { realtimeConnected } = useMonitoringStore();
  
  // 显示数值状态（用于动画效果）
  const [displayValue, setDisplayValue] = useState(value);
  // 前一个数值状态（用于变化检测）
  const [previousValue, setPreviousValue] = useState(value);
  // 全屏显示状态
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 最后更新时间状态
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * 计算百分比和角度
   * 
   * 功能说明：
   * - 计算当前数值在仪表盘范围内的百分比
   * - 根据百分比计算指针角度
   * 
   * 计算逻辑：
   * 1. 计算数值范围（最大值-最小值）
   * 2. 计算百分比：(当前值-最小值) / 范围 * 100
   * 3. 限制百分比在0-100范围内
   * 4. 根据仪表盘类型计算角度
   * - full: 360度圆形，范围-90度到270度
   * - 其他: 180度半圆，范围-90度到90度
   */
  const range = maxValue - minValue;
  const percentage = Math.max(0, Math.min(100, ((displayValue - minValue) / range) * 100));
  const angle = type === 'full' ? (percentage / 100) * 360 - 90 : (percentage / 100) * 180 - 90;

  /**
   * 尺寸样式配置
   * 
 * 描述：不同尺寸仪表盘的CSS类名映射
   * 
   * 尺寸说明：
   * - small: 小尺寸，96x96px，文字较小
   * - medium: 中等尺寸，128x128px，文字中等
   * - large: 大尺寸，160x160px，文字较大
   */
  const sizeClasses = {
    small: { 
      container: 'w-24 h-24',   // 容器尺寸：24x24 (96x96px)
      svg: 'text-sm',           // SVG文字小
      value: 'text-xs'          // 数值文字很小
    },
    medium: { 
      container: 'w-32 h-32',  // 容器尺寸：32x32 (128x128px)
      svg: 'text-base',         // SVG文字中等
      value: 'text-sm'          // 数值文字小
    },
    large: { 
      container: 'w-40 h-40',  // 容器尺寸：40x40 (160x160px)
      svg: 'text-lg',           // SVG文字大
      value: 'text-base'        // 数值文字中等
    }
  };

  /**
   * 状态颜色配置
   * 
   * 描述：不同状态对应的颜色样式
   * 
   * 状态说明：
   * - normal: 正常状态，绿色主题
   * - warning: 警告状态，琥珀色主题
   * - critical: 严重状态，红色主题
   */
  const statusColors = {
    normal: { 
      text: 'text-green-400',    // 文字绿色
      stroke: 'stroke-green-400', // 描边绿色
      bg: 'bg-green-500/20'      // 背景绿色
    },
    warning: { 
      text: 'text-amber-400',    // 文字琥珀色
      stroke: 'stroke-amber-400', // 描边琥珀色
      bg: 'bg-amber-500/20'      // 背景琥珀色
    },
    critical: { 
      text: 'text-red-400',      // 文字红色
      stroke: 'stroke-red-400',   // 描边红色
      bg: 'bg-red-500/20'        // 背景红色
    }
  };

  /**
   * 动画效果和数值更新
   * 
   * 功能说明：
   * - 当数值发生变化时启动动画效果
   * - 使用定时器逐步接近目标值
   * - 动画完成后触发回调函数
   * 
   * 动画逻辑：
   * 1. 检查是否启用动画且数值变化超过0.1
   * 2. 使用定时器每50ms更新一次显示值
   * 3. 每次更新时按10%的比例接近目标值
   * 4. 当差值小于0.1时停止动画并设置最终值
   */
  useEffect(() => {
    if (animated && Math.abs(displayValue - value) > 0.1) {
      const interval = setInterval(() => {
        setDisplayValue(prev => {
          const diff = value - prev;              // 计算差值
          const step = diff * 0.1;               // 每次移动10%
          const newValue = prev + step;          // 新数值
          
          // 如果接近目标值，停止动画
          if (Math.abs(diff) < 0.1) {
            clearInterval(interval);
            onValueChange?.(value);              // 触发数值变化回调
            return value;
          }
          
          return newValue;
        });
      }, 50); // 每50ms更新一次

      // 清理定时器
      return () => clearInterval(interval);
    } else {
      // 不使用动画，直接设置数值
      setDisplayValue(value);
      onValueChange?.(value);
    }
  }, [value, animated, onValueChange]);

  /**
   * 状态变化检测
   * 
   * 功能说明：
   * - 监控数值是否发生变化
   * - 在数值变化时更新最后更新时间
   */
  useEffect(() => {
    if (previousValue !== value) {
      setPreviousValue(value);
      setLastUpdate(new Date());
    }
  }, [value, previousValue]);

  /**
   * 自动状态检测
   * 
   * 功能说明：
   * - 根据阈值设置自动判断当前状态
   * - 优先级：严重阈值 > 警告阈值 > 默认状态
   * 
   * 判断逻辑：
   * 1. 如果设置了严重阈值且数值 >= 严重阈值，返回critical
   * 2. 如果设置了警告阈值且数值 >= 警告阈值，返回warning
   * 3. 否则返回传入的默认状态
   */
  const currentStatus = React.useMemo(() => {
    if (thresholds?.critical && displayValue >= thresholds.critical) return 'critical';
    if (thresholds?.warning && displayValue >= thresholds.warning) return 'warning';
    return status;
  }, [displayValue, thresholds, status]);

  /**
   * 状态变化回调
   * 
   * 功能说明：
   * - 当自动检测的状态与传入状态不同时触发回调
   */
  useEffect(() => {
    if (currentStatus !== status) {
      onStatusChange?.(currentStatus);
    }
  }, [currentStatus, status, onStatusChange]);

  /**
   * SVG路径计算
   * 
   * 功能说明：
   * - 根据仪表盘类型返回对应的SVG路径
   * - 使用SVG路径指令绘制不同形状的仪表盘
   * 
   * 路径类型：
   * - full: 完整圆形路径
   * - quarter: 四分之一圆路径
   * - linear: 线性路径
   * - semicircle: 半圆路径（默认）
   */
  const getPath = () => {
    switch (type) {
      case 'full':
        return 'M 10 50 A 40 40 0 1 1 90 50 A 40 40 0 1 1 10 50';  // 完整圆形
      case 'quarter':
        return 'M 50 10 A 40 40 0 0 1 90 50';                      // 四分之一圆
      case 'linear':
        return 'M 10 50 L 90 50';                                  // 线性
      default: // semicircle
        return 'M 10 50 A 40 40 0 0 1 90 50';                      // 半圆（默认）
    }
  };

  /**
   * 趋势计算
   * 
   * 功能说明：
   * - 根据实时数据计算当前趋势方向
   * - 比较最新两个数据点的数值差异
   * 
   * 计算逻辑：
   * 1. 如果数据点少于2个，返回stable
   * 2. 获取最后两个数据点
   * 3. 计算数值差异
   * 4. 根据差值大小判断趋势：
   *    - 差值绝对值 < 0.1：stable（稳定）
   *    - 差值 > 0：up（上升）
   *    - 差值 < 0：down（下降）
   */
  const currentTrend = React.useMemo(() => {
    if (realtimeData.length < 2) return 'stable';
    
    const latest = realtimeData[realtimeData.length - 1];
    const previous = realtimeData[realtimeData.length - 2];
    const diff = latest.value - previous.value;
    
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }, [realtimeData]);

  /**
   * 统计数据计算
   * 
   * 功能说明：
   * - 根据实时数据计算统计信息
   * - 仅在启用showStatistics且有数据时计算
   * 
   * 统计指标：
   * - avg: 平均值
   * - min: 最小值
   * - max: 最大值
   * - count: 数据点数量
   */
  const statistics = React.useMemo(() => {
    if (!showStatistics || realtimeData.length === 0) return null;
    
    const values = realtimeData.map(d => d.value);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { avg, min, max, count: values.length };
  }, [realtimeData, showStatistics]);

  /**
   * 切换全屏显示
   * 
   * 功能说明：
   * - 切换仪表盘的全屏显示状态
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card className={`bg-slate-800/80 border border-slate-700 rounded-lg p-6 ${
      isFullscreen ? 'fixed inset-4 z-50 bg-slate-900' : ''
    }`}>
      {/* 标题和控制栏 */}
      <div className="flex items-center justify-between mb-4">
        {/* 仪表盘标题 */}
        <h3 className="text-slate-100 text-lg font-semibold">{label}</h3>
        
        {/* 右侧控制组件 */}
        <div className="flex items-center gap-2">
          {/* 状态指示器 */}
          <StatusIndicator status={currentStatus} />
          
          {/* 趋势指示器（可选） */}
          {showTrend && <TrendIndicator trend={currentTrend} />}
          
          {/* 全屏切换按钮 */}
          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="sm"
            className="bg-slate-900/50 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 主要仪表盘区域 */}
      <div className="flex justify-center mb-4">
        <div className={`${sizeClasses[size].container} relative`}>
          {/* SVG仪表盘 */}
          <svg viewBox="0 0 100 100" className={`w-full h-full ${sizeClasses[size].svg}`}>
            {/* 背景弧线 */}
            <path
              d={getPath()}
              fill="none"
              stroke="rgb(71 85 105)"    // 灰色背景
              strokeWidth="8"
              strokeLinecap="round"
            />
            
            {/* 数值弧线 */}
            <path
              d={getPath()}
              fill="none"
              className={statusColors[currentStatus].stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={type === 'linear' ? `${percentage * 0.8} 80` : `${percentage * 1.26} 126`}
              style={{ transition: animated ? 'stroke-dasharray 0.5s ease-in-out' : 'none' }}
            />
            
            {/* 阈值线 */}
            <ThresholdLines thresholds={thresholds} maxValue={maxValue} />
            
            {/* 中心圆形 */}
            <circle
              cx="50"
              cy="50"
              r="32"
              fill="rgb(30 41 59)"
              className="transform rotate-90"
              style={{ transformOrigin: 'center' }}
            />
          </svg>
          
          {/* 数值显示区域 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* 当前数值 */}
            <span className={`${statusColors[currentStatus].text} ${sizeClasses[size].value} font-bold`}>
              {displayValue.toFixed(1)}
            </span>
            {/* 单位 */}
            <span className="text-xs text-slate-400">{unit}</span>
          </div>
        </div>
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
        {/* 最后更新时间 */}
        <span>最后更新: {lastUpdate.toLocaleTimeString()}</span>
        {/* 数据点数量 */}
        <span>数据点: {realtimeData.length}</span>
      </div>

      {/* 统计数据（可选） */}
      {statistics && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          {/* 平均值 */}
          <div className="text-center">
            <p className="text-slate-500">平均</p>
            <p className="text-slate-200 font-medium">{statistics.avg.toFixed(1)}{unit}</p>
          </div>
          {/* 最小值 */}
          <div className="text-center">
            <p className="text-slate-500">最小</p>
            <p className="text-slate-200 font-medium">{statistics.min.toFixed(1)}{unit}</p>
          </div>
          {/* 最大值 */}
          <div className="text-center">
            <p className="text-slate-500">最大</p>
            <p className="text-slate-200 font-medium">{statistics.max.toFixed(1)}{unit}</p>
          </div>
          {/* 计数 */}
          <div className="text-center">
            <p className="text-slate-500">计数</p>
            <p className="text-slate-200 font-medium">{statistics.count}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
