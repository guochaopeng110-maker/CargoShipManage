/**
 * 货船智能机舱管理系统 - 仪表盘图表渲染器
 *
 * 功能说明：
 * - 专门用于渲染仪表盘类型的图表
 * - 支持多个参数的仪表盘显示
 * - 提供阈值指示和状态显示
 * - 支持自定义颜色和样式
 *
 * 主要特性：
 * 1. 多仪表盘布局：支持1-4个仪表盘同时显示
 * 2. 阈值指示：可视化警告和严重阈值
 * 3. 状态指示：根据数值自动判断状态
 * 4. 动画效果：平滑的指针动画
 * 5. 响应式设计：适配不同屏幕尺寸
 *
 * 技术架构：
 * - 基于SVG渲染
 * - 使用统一数据类型
 * - 集成阈值监控
 * - 提供完整的TypeScript类型定义
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025
 */

// React核心钩子导入
import React, { useMemo } from 'react';

// UI组件导入
import { Card } from './ui/card';
import { Badge } from './ui/badge';

// 图标库导入
import { CheckCircle, AlertTriangle, Zap } from 'lucide-react';

// 类型导入
import { MonitoringParameter } from './UnifiedMonitoringChart';

/**
 * 仪表盘配置接口
 */
interface GaugeConfig {
  min: number;           // 最小值
  max: number;           // 最大值
  warning?: number;      // 警告阈值
  critical?: number;     // 严重阈值
  unit?: string;         // 单位
  label: string;         // 标签
  value: number;         // 当前值
  color: string;         // 颜色
}

/**
 * 单个仪表盘组件
 */
const SingleGauge = ({ config }: { config: GaugeConfig }) => {
  // 计算角度（从-90度到90度）
  const angle = useMemo(() => {
    const range = config.max - config.min;
    const normalized = (config.value - config.min) / range;
    return -90 + (normalized * 180);
  }, [config.value, config.min, config.max]);

  // 判断状态
  const status = useMemo(() => {
    if (config.critical && config.value >= config.critical) return 'critical';
    if (config.warning && config.value >= config.warning) return 'warning';
    return 'normal';
  }, [config.value, config.warning, config.critical]);

  // 状态配置
  const statusConfig = {
    normal: { color: 'text-green-400', bg: 'bg-green-500/20', label: '正常' },
    warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: '警告' },
    critical: { color: 'text-red-400', bg: 'bg-red-500/20', label: '严重' },
  };

  const currentStatus = statusConfig[status];

  // 计算指针路径
  const pointerLength = 30;
  const pointerX = 100 + pointerLength * Math.cos((angle * Math.PI) / 180);
  const pointerY = 100 + pointerLength * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* SVG仪表盘 */}
        <svg width="120" height="72" viewBox="0 0 200 120" className="transform -rotate-90">
          {/* 背景弧线 */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            stroke="#475569"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 警告区域 */}
          {config.warning && (
            <path
              d={`
                M ${20 + 80 * Math.cos(((config.warning - config.min) / (config.max - config.min)) * Math.PI)} 100
                A 80 80 0 0 1 180 100
              `}
              stroke="#f59e0b"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              opacity="0.3"
            />
          )}
          
          {/* 严重区域 */}
          {config.critical && (
            <path
              d={`
                M ${20 + 80 * Math.cos(((config.critical - config.min) / (config.max - config.min)) * Math.PI)} 100
                A 80 80 0 0 1 180 100
              `}
              stroke="#ef4444"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              opacity="0.3"
            />
          )}
          
          {/* 当前值弧线 */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            stroke={config.color}
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(angle + 90) * 1.777} 284.4`}
            className="transition-all duration-500 ease-out"
          />
          
          {/* 指针 */}
          <line
            x1="100"
            y1="100"
            x2={pointerX}
            y2={pointerY}
            stroke={config.color}
            strokeWidth="3"
            className="transition-all duration-500 ease-out"
          />
          
          {/* 中心点 */}
          <circle cx="100" cy="100" r="6" fill={config.color} />
        </svg>
        
        {/* 数值显示 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold text-slate-100">
            {config.value.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400">
            {config.unit || ''}
          </div>
        </div>
      </div>
      
      {/* 标签和状态 */}
      <div className="mt-2 text-center">
        <div className="text-xs text-slate-300 mb-1">{config.label}</div>
        <Badge className={`${currentStatus.bg} ${currentStatus.color} border-0 px-1 py-0.5 text-xs`}>
          {status === 'critical' && <Zap className="w-2 h-2 mr-1" />}
          {status === 'warning' && <AlertTriangle className="w-2 h-2 mr-1" />}
          {status === 'normal' && <CheckCircle className="w-2 h-2 mr-1" />}
          {currentStatus.label}
        </Badge>
      </div>
    </div>
  );
};

/**
 * 仪表盘渲染器组件
 */
export const GaugeRenderer = ({
  parameters,
  statistics
}: {
  parameters: MonitoringParameter[];
  statistics?: any[];
}) => {
  // 生成仪表盘配置
  const gaugeConfigs = useMemo(() => {
    return parameters.map((param, index) => {
      const stat = statistics?.find(s => s?.param?.key === param.key);
      const value = stat?.latest || 0;
      
      // 根据参数类型设置默认范围
      let min = 0;
      let max = 100;
      
      switch (param.metricType) {
        case 'temperature':
          min = 0;
          max = 150;
          break;
        case 'voltage':
          min = 0;
          max = 800;
          break;
        case 'current':
          min = 0;
          max = 1000;
          break;
        case 'pressure':
          min = 0;
          max = 1;
          break;
        case 'speed':
          min = 0;
          max = 2000;
          break;
        case 'power':
          min = 0;
          max = 1000;
          break;
        case 'soc':
        case 'soh':
          min = 0;
          max = 100;
          break;
        default:
          min = 0;
          max = 100;
      }
      
      return {
        min,
        max,
        warning: param.threshold?.warning,
        critical: param.threshold?.critical,
        unit: param.unit,
        label: param.label,
        value,
        color: param.color
      } as GaugeConfig;
    });
  }, [parameters, statistics]);

  // 根据仪表盘数量确定布局
  const getLayoutClass = () => {
    const count = gaugeConfigs.length;
    switch (count) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-2 md:grid-cols-4';
      case 5: return 'grid-cols-5';
      case 6: return 'grid-cols-6';
      default: return 'grid-cols-6';
    }
  };

  return (
    <div className="flex flex-row gap-3 overflow-x-auto">
      {gaugeConfigs.map((config, index) => (
        <div key={index} className="flex-shrink-0 w-48">
          <Card className="bg-slate-900/30 border-slate-700 p-3 h-full">
            <SingleGauge config={config} />
          </Card>
        </div>
      ))}
    </div>
  );
};

export default GaugeRenderer;