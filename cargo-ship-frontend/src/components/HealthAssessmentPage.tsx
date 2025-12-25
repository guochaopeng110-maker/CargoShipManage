/**
 * 货船智能机舱管理系统 - 健康评估页面（重构版 v3.0）
 *
 * 本页面采用"分-细"两段式垂直布局，提供全局健康状况概览。
 *
 * 核心特性：
 * 1. "分"：系统健康卡片矩阵，展示各核心系统的健康状况
 * 2. "细"：历史健康报告列表，支持分页查询、生成和导出
 *
 * 数据流架构：
 * - 历史数据：通过 HTTP API 查询历史报告列表
 * - 跨 Store 聚合：组合 reports-store（健康报告+健康评分）+ alarms-store（活跃告警）
 *
 * 页面职责：
 * 1. 数据聚合和状态管理
 * 2. 协调子组件的交互和导航
 * 3. 处理用户操作（刷新、生成报告、导出等）
 * 4. 错误处理和加载状态展示
 *
 * 重构说明（v3.0）：
 * - 移除了对 health-store 的依赖
 * - 使用统一的 reports-store 管理健康评分和报告
 * - 简化了状态管理逻辑
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 3.0.0
 * @since 2025-12-16
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Calendar, History, Activity, AlertCircle, RefreshCw } from 'lucide-react';

// 导入核心组件
import { SystemHealthCard } from './HealthAssessmentPage/SystemHealthCard';
import { HealthReportsList } from './HealthAssessmentPage/HealthReportsList';

// 导入配置和类型
import { coreSystemsConfig } from '../config/core-systems';
import { AlarmRecord } from '@/services/api'; // 直接从 API 客户端导入

// 从 reports-store 导入前端业务类型（已合并 health-store）
import type { HealthStatus, TrendDirection, SystemHealthScore } from '../stores/reports-store';

// 类型别名
type Alarm = AlarmRecord;
const AlertSeverity = AlarmRecord.severity;
const AlarmStatus = AlarmRecord.status;

// 导入状态管理
import { useReportsStore } from '../stores/reports-store';
import { useEquipmentStore } from '../stores/equipment-store'; // 新增设备管理 Store

// 导入工具函数
import { getIconByDeviceType, getRouteByDeviceType } from '../config/core-systems';



/**
 * HealthAssessmentPage 组件
 *
 * 健康评估页面主组件，实现"总-分-细"三段式布局
 *
 * @returns React 组件
 */
export function HealthAssessmentPage() {
  // ==================== 路由导航 ====================
  const navigate = useNavigate();

  // ==================== 本地状态管理 ====================
  const [error, setError] = useState<string | null>(null); // 错误信息
  const [selectedId, setSelectedId] = useState<string | null>(null); // 用户当前选中的设备技术 ID (UUID)

  // 评估时间范围状态（默认最近24小时）
  const [assessmentDateRange, setAssessmentDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 1),
    to: new Date()
  });

  // ==================== Store 状态读取 ====================

  /**
   * 从 reports-store 读取健康评估数据（已合并 health-store 功能）
   */
  const {
    systemHealthScores,
    reports: historicalReports,
    pagination,
    scoresLoading,
    loading: reportsLoading,
    generating,
    error: reportsStoreError,
    fetchSystemHealthScores,
    fetchReports,
    generateReport,
    downloadReport,
  } = useReportsStore();

  /**
   * 从设备管理 Store 读取设备列表
   */
  const {
    items: equipmentList,
    loading: equipmentLoading,
    ensureItemsLoaded
  } = useEquipmentStore();

  // ==================== 计算衍生状态 ====================

  /**
   * 获取所有设备的 ID 列表，用于批量获取评分
   */
  const equipmentIds = useMemo(() =>
    equipmentList.map(item => item.deviceId),
    [equipmentList]);

  // 解构分页信息（用于列表组件）
  const { page: currentPage, limit: pageSize, total: totalReports } = pagination;

  // ==================== 事件处理函数 ====================

  /**
   * 系统健康卡片点击选择
   *
   * 功能：
   * 用户点击系统健康卡片时，标记为选中状态（使用技术 ID）
   *
   * @param id - 设备技术 ID (UUID)
   */
  const handleSelectDevice = useCallback(
    (id: string) => {
      setSelectedId(id);
      console.log('用户选中了设备 ID:', id);
    },
    []
  );

  /**
   * 格式化日期为自定义字符串 (YYYY-MM-DD HH:mm:ss.SSS)
   * 
   * @param date - 日期对象
   * @returns 格式化后的字符串
   */
  const formatDateToCustomString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  /**
   * 翻页事件处理
   *
   * 功能：
   * 用户翻页时，重新查询历史报告列表
   *
   * @param page - 目标页码（从 1 开始）
   */
  const handlePageChange = useCallback(async (page: number) => {
    try {
      await fetchReports({ page });
      console.log(`切换到第 ${page} 页`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载历史报告失败';
      setError(errorMessage);
      console.error('加载历史报告失败:', err);
    }
  }, [fetchReports]);

  /**
   * 筛选条件变化处理
   * 
   * @param filters - 新的筛选参数
   */
  const handleFilterChange = useCallback(async (filters: any) => {
    try {
      await fetchReports(filters);
      console.log('筛选条件已更新:', filters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行筛选失败';
      setError(errorMessage);
    }
  }, [fetchReports]);

  /**
   * 生成新健康报告
   *
   * 功能：
   * 1. 弹出对话框让用户选择报告参数（设备、时间范围）
   * 2. 调用 reports-store 生成报告
   * 3. 刷新历史报告列表
   *
   * 注意：当前为简化实现，后续需要添加报告生成对话框
   */
  const handleGenerateReport = useCallback(async () => {
    if (!selectedId) {
      setError("请先从上方选择一个设备进行健康评估");
      return;
    }

    if (!assessmentDateRange?.from || !assessmentDateRange?.to) {
      setError("请先选择健康评估的时间范围");
      return;
    }

    setError(null);

    try {
      // 评估请求参数
      const startTime = assessmentDateRange.from;
      const endTime = assessmentDateRange.to;

      // 调用 reports-store 的 generateReportAction
      // 使用自定义格式 YYYY-MM-DD HH:mm:ss.SSS
      await generateReport({
        reportType: 'EQUIPMENT_HEALTH',
        startDate: formatDateToCustomString(startTime),
        endDate: formatDateToCustomString(endTime),
        equipmentIds: [selectedId],
        exportFormat: 'PDF',
      });

      console.log(`已成功触发设备评估请求，设备 ID: ${selectedId}`);

      // 评估完成后不再手动触发 fetchReports，遵循“手动查询”原则，且 generateReport 内部已同步本地状态
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发起评估请求失败';
      setError(errorMessage);
      console.error('发起评估失败:', err);
    }
  }, [generateReport, selectedId, assessmentDateRange, formatDateToCustomString]);

  /**
   * 查看报告详情
   *
   * 功能：
   * 导航至报告详情页面
   *
   * @param reportId - 报告 ID
   */
  const handleViewReport = useCallback(
    (reportId: string) => {
      // 详情现已改为在 HealthReportsList 内部通过弹窗展示，此处仅保留日志或执行其他非导航逻辑
      console.log(`已点击查看历史报告详情: ${reportId}`);
    },
    []
  );

  /**
   * 导出报告
   *
   * 功能：
   * 调用 reports-store 下载报告文件
   *
   * @param reportId - 报告 ID
   */
  const handleExportReport = useCallback(async (reportId: string) => {
    setError(null);

    try {
      await downloadReport(reportId);
      console.log(`报告导出成功: ${reportId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '导出报告失败';
      setError(errorMessage);
      console.error('导出报告失败:', err);
    }
  }, [downloadReport]);

  // ==================== 生命周期和副作用 ====================

  /**
   * 组件挂载时初始化数据（动态驱动模式）
   * 
   * 步骤：
   * 1. 异步获取设备列表（Equipment List）
   * 2. 获取设备列表成功后，基于设备 ID 批量获取最新健康评分
   * 3. 同时初始化历史报告查询
   */
  useEffect(() => {
    const initPageData = async () => {
      try {
        // 1. 异步获取设备列表
        const response = await ensureItemsLoaded({ page: 1, pageSize: 20 });

        // 2. 获取设备列表成功后，基于设备 ID 批量获取最新健康评分
        if (response && response.items && response.items.length > 0) {
          await fetchSystemHealthScores(response.items);
        }

        console.log('健康评估页面框架初始化成功');
      } catch (err) {
        console.error('健康评估页面初始化失败:', err);
      }
    };

    initPageData();
  }, [ensureItemsLoaded, fetchSystemHealthScores]);

  /**
   * 同步 reports-store 的错误到本地状态
   */
  useEffect(() => {
    if (reportsStoreError) {
      setError(reportsStoreError);
    }
  }, [reportsStoreError]);

  // ==================== 渲染 ====================

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-slate-100">健康评估概览</h1>
          <p className="text-slate-400 text-sm mt-2">
            各核心系统的健康状况评估，健康报告和查询
          </p>
        </div>

        {/* 错误提示区域 */}
        {error && (
          <Card className="bg-red-900/20 border-red-700 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <h4 className="text-red-400 font-medium">操作失败</h4>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
                className="text-red-400 border-red-600 hover:bg-red-800"
              >
                关闭
              </Button>
            </div>
          </Card>
        )}


        <Tabs defaultValue="assessment" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 p-1 mb-6">
            <TabsTrigger value="assessment" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              系统健康评估
            </TabsTrigger>
            <TabsTrigger value="query" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              健康报告查询
            </TabsTrigger>
          </TabsList>

          {/* 标签页 1：系统健康评估 */}
          <TabsContent value="assessment" className="space-y-6 outline-none">
            <Card className="bg-slate-800/40 border-slate-700 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span className="text-slate-200 font-medium">评估时间范围:</span>
                  <DateRangePicker
                    value={assessmentDateRange}
                    onChange={setAssessmentDateRange}
                    className="w-[300px]"
                  />
                  <p className="text-slate-500 text-xs italic ml-2">
                    * 系统将分析选定时间段内的运行指标
                  </p>
                </div>

                <Button
                  onClick={handleGenerateReport}
                  disabled={generating || equipmentLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-900/20 px-8"
                >
                  {generating ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4 mr-2" />
                  )}
                  开始健康评估
                </Button>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                  <div className="w-1 h-6 bg-cyan-500 rounded-full" />
                  请选择评估对象
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(equipmentLoading || scoresLoading) && equipmentList.length === 0 ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-800/50 animate-pulse rounded-xl" />
                  ))
                ) : (
                  equipmentList.map((item) => {
                    const healthScore = systemHealthScores[item.id]; // 🔴 统一使用 UUID (id) 进行匹配查找
                    const IconComponent = getIconByDeviceType(item.deviceType);

                    return (
                      <SystemHealthCard
                        key={item.id}
                        systemId={item.id} // 修改为 UUID
                        systemName={item.deviceName}
                        icon={IconComponent}
                        healthScore={healthScore?.score}
                        grade={healthScore?.grade}
                        activeAlarmsCount={0}
                        isSelected={selectedId === item.id}
                        onSelect={() => handleSelectDevice(item.id)}
                        loading={scoresLoading}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          {/* 标签页 2：健康报告查询 */}
          <TabsContent value="query" className="outline-none">
            <HealthReportsList
              reports={historicalReports}
              total={totalReports}
              currentPage={currentPage}
              pageSize={pageSize}
              loading={reportsLoading || generating}
              equipmentItems={equipmentList}
              onPageChange={handlePageChange}
              onFilterChange={handleFilterChange}
              onViewReport={handleViewReport}
              onExportReport={handleExportReport}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
