/**
 * 数据查询页面 - 重构版
 *
 * 核心设计：
 * 1. 聚焦表格 - 移除图表和复杂 Tabs
 * 2. 用户驱动 - 明确的"执行查询"按钮
 * 3. 简洁高效 - 三个核心控件：设备、参数、日期范围
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { useMonitoringStore, MetricType } from '../../stores/monitoring-store';
import { useEquipmentStore } from '../../stores/equipment-store';
import { QueryFilters } from './QueryFilters';
import { QueryResults } from './QueryResults';
import { toast } from 'sonner';
import { useThresholdStore } from '../../stores/threshold-store';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export function DataQueryPage() {
  // ===== Store 状态 =====
  const {
    historicalData,
    queryStatus,
    queryError,
    currentQueryParams,
    fetchHistoricalData,
    exportHistoricalData,
    resetQueryStatus,
  } = useMonitoringStore();

  const { items: equipments, ensureItemsLoaded, monitoringPoints, fetchMonitoringPoints } = useEquipmentStore();
  const { thresholds, fetchThresholds } = useThresholdStore();

  // ===== 本地 UI 状态 =====
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [monitoringPoint, setMonitoringPoint] = useState<string>('ALL_POINTS');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  });

  // 初始化加载基础数据（智能缓存：确保设备列表已加载）
  useEffect(() => {
    ensureItemsLoaded({ page: 1, pageSize: 100 });
  }, [ensureItemsLoaded]);

  // 监听监测点数据变化，用于自动勾选指标
  useEffect(() => {
    if (selectedDevice && monitoringPoints.length > 0) {
      // 默认勾选该设备下的所有指标类型
      const metrics = Array.from(new Set(monitoringPoints.map(p => p.metricType)));
      setSelectedMetrics(metrics as string[]);
    }
  }, [monitoringPoints, selectedDevice]);

  // ===== 事件处理 =====

  /** 设备变更处理：自动更新监测点列表和监控参数 */
  const handleDeviceChange = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
    setMonitoringPoint('ALL_POINTS');

    if (deviceId) {
      // 🔍 核心优化：直接从后端获取该设备的所有监测点定义
      fetchMonitoringPoints(deviceId);

      // 同时也可以查询阈值配置（用于后续可能的告警线展示，可选）
      fetchThresholds({
        page: 1,
        pageSize: 200,
        filters: { deviceId }
      });
    } else {
      setSelectedMetrics([]);
    }
  }, [fetchMonitoringPoints, fetchThresholds]);

  /** 监测点变更处理：自动选择对应的监控参数 */
  const handleMonitoringPointChange = useCallback((point: string) => {
    setMonitoringPoint(point);

    if (point === 'ALL_POINTS') {
      // 选择该设备下的所有监控指标
      const metrics = Array.from(new Set(monitoringPoints.map(p => p.metricType)));
      setSelectedMetrics(metrics as string[]);
    } else {
      // 选择该监测点关联的监控指标（从监测点定义中获取物理量类型）
      const pointDefinition = monitoringPoints.find(p => p.pointName === point);

      if (pointDefinition && pointDefinition.metricType) {
        setSelectedMetrics([pointDefinition.metricType as string]);
      } else {
        // 如果找不到定义，回退到历史通过预测的逻辑（虽然新接口应该都能找到）
        const detectedMetrics = new Set<string>();
        const pointName = point.toLowerCase();
        if (pointName.includes('电压') || pointName.includes('voltage')) detectedMetrics.add(MetricType.VOLTAGE as any);
        if (pointName.includes('电流') || pointName.includes('current')) detectedMetrics.add(MetricType.CURRENT as any);
        if (pointName.includes('温度') || pointName.includes('temp')) detectedMetrics.add(MetricType.TEMPERATURE as any);
        if (pointName.includes('频率') || pointName.includes('freq')) detectedMetrics.add(MetricType.FREQUENCY as any);
        if (pointName.includes('功率') || pointName.includes('power')) detectedMetrics.add(MetricType.POWER as any);
        if (pointName.includes('开关') || pointName.includes('switch')) detectedMetrics.add(MetricType.SWITCH as any);
        if (pointName.includes('转速') || pointName.includes('speed') || pointName.includes('rpm')) detectedMetrics.add(MetricType.SPEED as any);
        if (pointName.includes('压力') || pointName.includes('press')) detectedMetrics.add(MetricType.PRESSURE as any);

        setSelectedMetrics(Array.from(detectedMetrics));
      }
    }
  }, [monitoringPoints]);

  /**
   * 执行查询
   * 将 UI 状态转换为查询参数并调用 store action
   */
  const handleExecuteQuery = useCallback(async () => {
    // 验证必填字段
    if (!selectedDevice || selectedMetrics.length === 0 || !dateRange?.from || !dateRange?.to) {
      toast.error('请填写完整的查询条件');
      return;
    }

    // 清除之前的错误状态
    resetQueryStatus();

    try {
      // 构建查询参数
      await fetchHistoricalData({
        deviceId: selectedDevice,
        metricTypes: selectedMetrics,
        monitoringPoint: monitoringPoint === 'ALL_POINTS' ? undefined : (monitoringPoint || undefined),
        startTime: dateRange.from.getTime(),
        endTime: dateRange.to.getTime(),
        page: 1,
        pageSize: 20,
      });

      // 查询成功提示
      toast.success('数据查询成功');
    } catch (error) {
      // 错误已在 store 中处理，这里只显示通知
      toast.error('查询失败，请稍后重试');
    }
  }, [selectedDevice, selectedMetrics, monitoringPoint, dateRange, fetchHistoricalData, resetQueryStatus]);

  /**
   * 页码切换
   * 使用当前查询参数，仅更改页码
   */
  const handlePageChange = useCallback(
    async (newPage: number) => {
      if (!currentQueryParams) {
        toast.error('请先执行查询');
        return;
      }

      try {
        await fetchHistoricalData({
          ...currentQueryParams,
          page: newPage,
        });
      } catch (error) {
        toast.error('加载数据失败');
      }
    },
    [currentQueryParams, fetchHistoricalData]
  );

  /**
   * 数据导出
   * 调用 store 的导出方法
   */
  const handleExport = useCallback(
    async (format: 'excel' | 'csv' | 'json') => {
      try {
        await exportHistoricalData(format);
        toast.success(`数据已导出为 ${format.toUpperCase()} 格式`);
      } catch (error) {
        toast.error('导出失败：' + (error instanceof Error ? error.message : '未知错误'));
      }
    },
    [exportHistoricalData]
  );

  // 移除所有键盘快捷键监听

  // ===== 渲染 =====
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 mb-2">设备数据查询</h1>
            <p className="text-slate-400">查询和导出设备历史运行数据</p>
          </div>
        </div>

        {/* 查询条件区 */}
        <QueryFilters
          selectedDevice={selectedDevice}
          selectedMetrics={selectedMetrics}
          monitoringPoint={monitoringPoint}
          dateRange={dateRange}
          onDeviceChange={handleDeviceChange}
          onMetricsChange={setSelectedMetrics}
          onMonitoringPointChange={handleMonitoringPointChange}
          onDateRangeChange={setDateRange}
          onExecuteQuery={handleExecuteQuery}
          loading={queryStatus === 'loading'}
        />

        {/* 查询结果区 */}
        <QueryResults
          data={historicalData.items}
          total={historicalData.total}
          page={historicalData.page}
          pageSize={historicalData.pageSize}
          loading={queryStatus === 'loading'}
          onPageChange={handlePageChange}
          onExport={handleExport}
          error={queryError}
          equipments={equipments}
        />
      </div>
    </div>
  );
}
