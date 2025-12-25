/**
 * 查询结果展示组件
 * 功能：数据表格展示、分页、导出
 */

'use client';

import * as React from 'react';
import { Download, Loader2, Database, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { AdvancedPagination } from '../ui/advanced-pagination';
import { Alert, AlertDescription } from '../ui/alert';

// 从 monitoring-store 导入前端业务类型
import type { UnifiedMonitoringData } from '../../stores/monitoring-store';

/** 状态配置 */
const STATUS_CONFIG = {
  normal: { label: '正常', color: 'text-green-400', bg: 'bg-green-500/10' },
  warning: { label: '警告', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  critical: { label: '严重', color: 'text-red-400', bg: 'bg-red-500/10' },
  offline: { label: '离线', color: 'text-gray-400', bg: 'bg-gray-500/10' },
};

/** 质量配置 */
const QUALITY_CONFIG = {
  normal: { label: '正常', color: 'text-green-400' },
  abnormal: { label: '异常', color: 'text-red-400' },
  suspicious: { label: '可疑', color: 'text-amber-400' },
};

import { MetricType } from '../../stores/monitoring-store';

/** 参数配置 */
const PARAMETER_CONFIG = {
  [MetricType.VOLTAGE]: { label: '电压', unit: 'V' },
  [MetricType.CURRENT]: { label: '电流', unit: 'A' },
  [MetricType.TEMPERATURE]: { label: '温度', unit: '°C' },
  [MetricType.SPEED]: { label: '转速', unit: 'rpm' },
  [MetricType.SOC]: { label: 'SOC', unit: '%' },
  [MetricType.PRESSURE]: { label: '压力', unit: 'bar' },
  [MetricType.POWER]: { label: '功率', unit: 'kW' },
  [MetricType.FREQUENCY]: { label: '频率', unit: 'Hz' },
  [MetricType.SWITCH]: { label: '开关', unit: '' },
  [MetricType.VIBRATION]: { label: '振动', unit: 'mm/s' },
  [MetricType.HUMIDITY]: { label: '湿度', unit: '%' },
  [MetricType.LEVEL]: { label: '液位', unit: 'm' },
};

export interface QueryResultsProps {
  data: UnifiedMonitoringData[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onExport: (format: 'excel' | 'csv' | 'json') => void;
  error?: string | null;
  equipments: any[];
}

/**
 * 查询结果展示组件
 *
 * 功能特性：
 * - 数据表格展示（桌面端）
 * - 卡片式展示（移动端）
 * - 分页导航
 * - 数据导出功能
 * - 多种状态展示（加载、错误、空数据）
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 */
export const QueryResults = React.memo(function QueryResults({
  data,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onExport,
  error,
  equipments,
}: QueryResultsProps) {
  // 防御性编程：确保data始终是一个数组
  const safeData = Array.isArray(data) ? data : [];

  /** 判断数值状态 */
  const getValueStatus = (metricType: string, value: number): keyof typeof STATUS_CONFIG => {
    // 简化的状态逻辑，以后可以根据具体阈值配置扩展
    return 'normal';
  };

  const tableData = React.useMemo(() => {
    return safeData.map(item => {
      const paramConfig = PARAMETER_CONFIG[item.metricType as keyof typeof PARAMETER_CONFIG];
      const status = getValueStatus(item.metricType, item.value);

      const numericValue = typeof item.value === 'number' ? item.value : parseFloat(String(item.value));
      const formattedValue = isNaN(numericValue)
        ? String(item.value ?? '-')
        : numericValue.toFixed(2);

      const matchedEquip = equipments.find(e => e.id === item.equipmentId);
      const deviceLabel = matchedEquip ? matchedEquip.deviceId : item.equipmentId;

      return {
        time: new Date(item.timestamp).toLocaleString('zh-CN'),
        device: deviceLabel,
        monitoringPoint: item.monitoringPoint || '-',
        parameter: paramConfig?.label || item.metricType,
        value: `${formattedValue}${paramConfig?.unit || item.unit || ''}`,
        status,
        quality: item.quality,
      };
    });
  }, [safeData]);

  const totalPages = Math.ceil(total / pageSize);

  // 加载状态
  if (loading) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 p-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="ml-2 text-slate-300">加载数据中...</span>
        </div>
      </Card>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 p-6">
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      </Card>
    );
  }

  // 空数据状态
  if (safeData.length === 0) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 p-6">
        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
          <Database className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg mb-2">未找到符合条件的数据</p>
          <p className="text-sm">请尝试调整时间范围或选择其他参数</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700 p-6">
      <div className="space-y-6">
        {/* 标题和导出按钮 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl text-slate-100 font-semibold">查询结果</h2>
            <p className="text-sm text-slate-400 mt-1">共 {total} 条数据</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => onExport('excel')}
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={() => onExport('csv')}
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              onClick={() => onExport('json')}
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>

        {/* 数据表格 - 桌面端显示 */}
        <div className="overflow-x-auto hidden md:block rounded-lg border border-slate-700">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  时间
                </th>
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  设备
                </th>
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  监测点
                </th>
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  指标
                </th>
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  数值
                </th>
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  状态
                </th>
                <th className="text-left py-3 px-4 text-slate-300 text-sm font-medium whitespace-nowrap">
                  质量
                </th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, index) => {
                const statusConfig = STATUS_CONFIG[row.status];
                return (
                  <tr
                    key={index}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-slate-400 text-sm whitespace-nowrap">{row.time}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm whitespace-nowrap">{row.device}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm whitespace-nowrap">{row.monitoringPoint}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm whitespace-nowrap">{row.parameter}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm font-mono whitespace-nowrap font-semibold">
                      {row.value}
                    </td>
                    <td className={`py-3 px-4 text-sm whitespace-nowrap ${statusConfig.color}`}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-sm whitespace-nowrap">
                      <span className={QUALITY_CONFIG[row.quality as keyof typeof QUALITY_CONFIG]?.color || 'text-slate-400'}>
                        {QUALITY_CONFIG[row.quality as keyof typeof QUALITY_CONFIG]?.label || row.quality}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 分页 - 始终显示，除非没有数据 */}
        {total > 0 && (
          <div className="mt-6 border-t border-slate-700 pt-6">
            <AdvancedPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={onPageChange}
              showStats
            />
          </div>
        )}
      </div>
    </Card>
  );
});
