/**
 * 查询筛选条件组件
 *
 * 功能特性：
 * - 设备选择（单选下拉框）
 * - 监控参数选择（多选按钮组）
 * - 日期范围选择（带快捷选项）
 * - 表单验证
 * - 执行查询按钮
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DateRangePicker } from '../ui/date-range-picker';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { useEquipmentStore } from '../../stores/equipment-store';
import { useThresholdStore } from '../../stores/threshold-store';
import { MetricType } from '../../stores/monitoring-store';

/**
 * 监控参数配置
 */
const PARAMETER_CONFIG = {
  [MetricType.VOLTAGE]: { label: '电压', unit: 'V', color: '#06b6d4' },
  [MetricType.CURRENT]: { label: '电流', unit: 'A', color: '#8b5cf6' },
  [MetricType.TEMPERATURE]: { label: '温度', unit: '°C', color: '#f59e0b' },
  [MetricType.SPEED]: { label: '转速', unit: 'rpm', color: '#22c55e' },
  [MetricType.SOC]: { label: 'SOC', unit: '%', color: '#ec4899' },
  [MetricType.PRESSURE]: { label: '压力', unit: 'bar', color: '#ef4444' },
  [MetricType.POWER]: { label: '功率', unit: 'kW', color: '#f97316' },
  [MetricType.FREQUENCY]: { label: '频率', unit: 'Hz', color: '#a855f7' },
  [MetricType.SWITCH]: { label: '开关', unit: '', color: '#64748b' },
  [MetricType.VIBRATION]: { label: '振动', unit: 'mm/s', color: '#84cc16' },
  [MetricType.HUMIDITY]: { label: '湿度', unit: '%', color: '#0ea5e9' },
  [MetricType.LEVEL]: { label: '液位', unit: 'm', color: '#3b82f6' },
} as const;

/**
 * QueryFilters 组件属性接口
 */
export interface QueryFiltersProps {
  /** 当前选中的设备 ID */
  selectedDevice: string;
  /** 当前选中的监控参数列表 */
  selectedMetrics: string[];
  /** 当前选中的日期范围 */
  dateRange: DateRange | undefined;
  /** 监测点 */
  monitoringPoint: string;
  /** 设备变化回调 */
  onDeviceChange: (deviceId: string) => void;
  /** 监控参数变化回调 */
  onMetricsChange: (metrics: string[]) => void;
  /** 监测点变化回调 */
  onMonitoringPointChange: (point: string) => void;
  /** 日期范围变化回调 */
  onDateRangeChange: (range: DateRange | undefined) => void;
  /** 执行查询回调 */
  onExecuteQuery: () => void;
  /** 是否正在加载 */
  loading?: boolean;
}

/**
 * 查询筛选条件组件
 *
 * 使用示例：
 * ```tsx
 * <QueryFilters
 *   selectedDevice="battery-001"
 *   selectedMetrics={['voltage', 'temperature']}
 *   dateRange={dateRange}
 *   onDeviceChange={setSelectedDevice}
 *   onMetricsChange={setSelectedMetrics}
 *   onDateRangeChange={setDateRange}
 *   onExecuteQuery={handleExecuteQuery}
 *   loading={false}
 * />
 * ```
 */
export const QueryFilters = React.memo(function QueryFilters({
  selectedDevice,
  selectedMetrics,
  monitoringPoint,
  dateRange,
  onDeviceChange,
  onMetricsChange,
  onMonitoringPointChange,
  onDateRangeChange,
  onExecuteQuery,
  loading = false,
}: QueryFiltersProps) {
  const { items: equipments, fetchEquipmentList, monitoringPoints: storeMonitoringPoints } = useEquipmentStore();
  const { thresholds, fetchThresholds } = useThresholdStore();

  // 数据加载已由父组件 index.tsx 统一管理

  // 从 Store 中获取当前设备的监测点列表
  const monitoringPoints = React.useMemo(() => {
    if (!selectedDevice) return [];
    // 监测点已在父组件中通过 fetchMonitoringPoints 获取，这里直接获取对应的名称即可
    return Array.from(new Set(storeMonitoringPoints.map(p => p.pointName))).sort();
  }, [storeMonitoringPoints, selectedDevice]);
  // 验证错误消息
  const [validationError, setValidationError] = React.useState<string | null>(null);

  /**
   * 切换监控参数选择
   * @param metric 参数键名
   */
  const toggleMetric = React.useCallback(
    (metric: string) => {
      if (selectedMetrics.includes(metric)) {
        // 取消选择
        onMetricsChange(selectedMetrics.filter(m => m !== metric));
      } else {
        // 添加选择
        onMetricsChange([...selectedMetrics, metric]);
      }
    },
    [selectedMetrics, onMetricsChange]
  );

  /**
   * 验证表单
   * @returns 验证是否通过
   */
  const validateForm = React.useCallback((): boolean => {
    // 验证设备选择
    if (!selectedDevice) {
      setValidationError('请选择设备');
      return false;
    }

    // 验证监控参数
    if (selectedMetrics.length === 0) {
      setValidationError('请至少选择一个监控参数');
      return false;
    }

    // 验证日期范围
    if (!dateRange || !dateRange.from || !dateRange.to) {
      setValidationError('请选择完整的日期范围');
      return false;
    }

    // 验证日期范围合法性
    if (dateRange.from > dateRange.to) {
      setValidationError('开始时间不能晚于结束时间');
      return false;
    }

    // 验证通过
    setValidationError(null);
    return true;
  }, [selectedDevice, selectedMetrics, dateRange]);

  /**
   * 处理查询按钮点击
   */
  const handleExecuteClick = React.useCallback(() => {
    if (validateForm()) {
      onExecuteQuery();
    }
  }, [validateForm, onExecuteQuery]);

  /**
   * 检查查询按钮是否应该禁用
   */
  const isQueryDisabled = React.useMemo(() => {
    return (
      loading ||
      !selectedDevice ||
      selectedMetrics.length === 0 ||
      !dateRange ||
      !dateRange.from ||
      !dateRange.to
    );
  }, [loading, selectedDevice, selectedMetrics, dateRange]);

  return (
    <Card className="bg-slate-800/80 border-slate-700 p-6">
      <div className="space-y-6">
        {/* 标题 */}
        <div>
          <h2 className="text-xl text-slate-100 font-semibold mb-2">查询条件</h2>
          <p className="text-sm text-slate-400">选择设备、监控参数和时间范围进行数据查询</p>
        </div>

        {/* 验证错误提示 */}
        {validationError && (
          <Alert className="bg-red-500/10 border-red-500/20">
            <AlertDescription className="text-red-300">{validationError}</AlertDescription>
          </Alert>
        )}

        {/* 设备选择 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-slate-300 text-sm mb-2 block font-medium">
              设备选择 <span className="text-red-400">*</span>
            </label>
            <Select value={selectedDevice} onValueChange={onDeviceChange} disabled={loading}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="请选择设备" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {equipments.map((equipment) => (
                  <SelectItem key={equipment.id} value={equipment.id} className="text-slate-300">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs opacity-50">[{equipment.deviceId}]</span>
                      {equipment.deviceName}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 监测点名称 - 改为下拉方式 */}
          <div>
            <label className="text-slate-300 text-sm mb-2 block font-medium">
              监测点名称
            </label>
            <Select value={monitoringPoint} onValueChange={onMonitoringPointChange} disabled={loading}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="选择监测点" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL_POINTS" className="text-slate-400 italic">所有监测点</SelectItem>
                {monitoringPoints.map((point) => (
                  <SelectItem key={point} value={point} className="text-slate-300">
                    {point}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 监控参数选择 */}
        <div>
          <label className="text-slate-300 text-sm mb-2 block font-medium">
            监控参数 <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PARAMETER_CONFIG).map(([key, config]) => {
              const isSelected = selectedMetrics.includes(key);
              return (
                <Button
                  key={key}
                  onClick={() => toggleMetric(key)}
                  disabled={loading}
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className={
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 hover:bg-cyan-500/30'
                      : 'bg-slate-900/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: config.color }}
                  />
                  {config.label}
                </Button>
              );
            })}
          </div>
          {selectedMetrics.length > 0 && (
            <p className="text-sm text-slate-400 mt-2">
              已选择 {selectedMetrics.length} 个参数
            </p>
          )}
        </div>

        {/* 日期范围选择 */}
        <div>
          <label className="text-slate-300 text-sm mb-2 block font-medium">
            时间范围 <span className="text-red-400">*</span>
          </label>
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            disabled={loading}
            placeholder="选择日期范围"
          />
        </div>

        {/* 执行查询按钮 */}
        <Button
          onClick={handleExecuteClick}
          disabled={isQueryDisabled}
          className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              查询中...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              执行查询
            </>
          )}
        </Button>
      </div>
    </Card>
  );
});
