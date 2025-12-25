/**
 * 货船智能机舱管理系统 - 历史健康报告列表组件
 *
 * 本组件用于展示历史健康报告的分页列表，是"总-分-细"布局中的"细"部分。
 * 提供查看、导出、生成新报告等功能。
 *
 * 核心功能：
 * 1. 分页展示历史健康报告列表
 * 2. 显示报告基本信息（ID、日期、设备、评分、等级）
 * 3. 支持查看报告详情和导出功能
 * 4. 提供"生成新报告"操作按钮
 * 5. 处理加载状态和空状态
 *
 * 数据来源：
 * - 通过 Props 接收历史报告列表数据
 * - 由父组件（HealthAssessmentPage）管理数据获取和状态
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025-12-14
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AdvancedPagination } from '../ui/advanced-pagination';
import {
  FileText,      // 报告图标
  Download,      // 下载图标
  Eye,           // 查看图标
  Plus,          // 新增图标
  RefreshCw,     // 刷新图标
  Search,        // 搜索图标
  Filter         // 过滤图标
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Input } from '../ui/input';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { HealthReportDetailModal } from './HealthReportDetailModal';

// 从 reports-store 导入前端业务类型（已合并自 health-store）
// 注意：使用 Report 类型替代 FrontendHealthReport
import type { HealthStatus, Report as FrontendHealthReport } from '../../stores/reports-store';

/**
 * HealthReportsList 组件 Props 接口
 */
export interface HealthReportsListProps {
  reports: FrontendHealthReport[];          // 历史报告列表数据
  total: number;                            // 总报告数量
  currentPage: number;                      // 当前页码（从 1 开始）
  pageSize: number;                         // 每页显示数量
  loading: boolean;                         // 加载状态
  equipmentItems?: any[];                   // 设备列表（用于筛选）
  onPageChange: (page: number) => void;     // 页码变化回调函数
  onFilterChange?: (filters: any) => void;  // 筛选变化回调函数
  onViewReport: (reportId: string) => void; // 查看报告回调函数
  onExportReport: (reportId: string) => void; // 导出报告回调函数
}

/**
 * 健康等级中文名称映射
 *
 * 将健康等级枚举值转换为用户友好的中文显示文字
 */
const gradeNameMap: Record<HealthStatus, string> = {
  EXCELLENT: '优秀',
  GOOD: '良好',
  FAIR: '一般',
  POOR: '较差',
  CRITICAL: '严重'
};

/**
 * 健康等级 Badge 样式配置
 *
 * 根据健康等级返回对应的 Badge 样式类名
 */
const gradeBadgeConfig: Record<HealthStatus, {
  bgClass: string;      // 背景色类名
  textClass: string;    // 文字颜色类名
  borderClass: string;  // 边框颜色类名
}> = {
  EXCELLENT: {
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500'
  },
  GOOD: {
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500'
  },
  FAIR: {
    bgClass: 'bg-amber-500/20',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500'
  },
  POOR: {
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500'
  },
  CRITICAL: {
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500'
  }
};

/**
 * 格式化时间戳为日期字符串
 *
 * 将毫秒时间戳转换为中文友好格式
 *
 * @param timestamp - 毫秒时间戳
 * @returns 格式化后的日期字符串（如：'2025年12月14日 10:30'）
 */
function formatDate(timestamp: number | string): string {
  // 核心修复逻辑：
  // 如果 timestamp 是 "1766120226289" 这样的数字字符串，new Date() 会返回 Invalid Date。
  const dateValue = typeof timestamp === 'string' && !isNaN(Number(timestamp)) ? Number(timestamp) : timestamp;
  const date = new Date(dateValue);

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return '日期无效';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
}

/**
 * 健康等级映射函数
 *
 * 将后端 healthLevel (excellent/good/fair/poor) 映射到前端 HealthStatus 枚举
 *
 * @param healthLevel - 后端健康等级
 * @returns 前端 HealthStatus 枚举值
 */
function mapHealthLevelToStatus(healthLevel: string): HealthStatus {
  const levelMap: Record<string, HealthStatus> = {
    'excellent': 'EXCELLENT' as HealthStatus,
    'good': 'GOOD' as HealthStatus,
    'fair': 'FAIR' as HealthStatus,
    'poor': 'POOR' as HealthStatus
  };
  return levelMap[healthLevel.toLowerCase()] || 'GOOD' as HealthStatus;
}

/**
 * HealthReportsList 组件
 *
 * 历史健康报告列表组件，展示分页的历史报告并提供操作功能
 *
 * @param props - 组件属性
 * @returns React 组件
 */
export const HealthReportsList: React.FC<HealthReportsListProps> = ({
  reports,
  total,
  currentPage,
  pageSize,
  loading,
  equipmentItems = [],
  onPageChange,
  onFilterChange,
  onViewReport,
  onExportReport
}) => {
  // 本地搜索/筛选状态
  const [filterId, setFilterId] = React.useState<string>("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

  // 详情弹窗状态
  const [selectedReport, setSelectedReport] = React.useState<FrontendHealthReport | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  /**
   * 触发筛选更新
   */
  const handleApplyFilter = () => {
    onFilterChange?.({
      equipmentId: filterId === "all" ? undefined : filterId,
      startDate: dateRange?.from?.getTime(), // 转换为时间戳
      endDate: dateRange?.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)).getTime() : undefined, // 包含结束当天全天
      page: 1 // 筛选时回到第一页
    });
  };

  /**
   * 重置筛选
   */
  const handleResetFilter = () => {
    setFilterId("all");
    setDateRange(undefined);
    onFilterChange?.({
      equipmentId: undefined,
      startDate: undefined,
      endDate: undefined,
      page: 1
    });
  };

  /**
   * 计算总页数
   */
  const totalPages = Math.ceil(total / pageSize);

  /**
   * 处理翻页事件
   *
   * @param page - 目标页码（从 1 开始）
   */
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <Card className="bg-slate-800/80 border-slate-700">
      {/* 卡片头部 */}
      <CardHeader className="border-b border-slate-700">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-100 text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-400" />
            历史健康报告
          </CardTitle>
        </div>
      </CardHeader>

      {/* 卡片内容 */}
      <CardContent className="p-0">
        {/* 筛选工具栏 (Filter Bar) */}
        <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-300">筛选设备:</span>
            <Select value={filterId} onValueChange={setFilterId}>
              <SelectTrigger className="w-[220px] bg-slate-900/50 border-slate-700 text-slate-200">
                <SelectValue placeholder="选择设备" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
                <SelectItem value="all">所有设备系统</SelectItem>
                {equipmentItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">日期范围:</span>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              className="w-[280px]"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <Button
              size="default"
              variant="default"
              onClick={handleApplyFilter}
              className="bg-blue-600 hover:bg-blue-700 font-medium px-6 shadow-md"
            >
              查询历史
            </Button>
            <Button
              size="default"
              variant="outline"
              onClick={handleResetFilter}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white px-6"
            >
              重置
            </Button>
          </div>
        </div>

        <div className="p-6 pt-2">
          {/* 加载状态 */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw className="w-16 h-16 text-slate-400 animate-spin" />
              <p className="text-slate-400 text-sm">正在加载历史报告...</p>
            </div>
          ) : reports.length === 0 ? (
            /* 空状态 */
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <FileText className="w-16 h-16 text-slate-500" />
              <p className="text-slate-400 text-base">暂无历史报告</p>
              <p className="text-slate-500 text-sm">
                点击上方的“开始健康评估”进行设备评估
              </p>
            </div>
          ) : (
            /* 报告列表表格 */
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  {/* 表头 */}
                  <thead className="border-b border-slate-700">
                    <tr>
                      <th className="pb-3 px-4 text-slate-300 font-semibold text-sm">
                        报告 ID
                      </th>
                      <th className="pb-3 px-4 text-slate-300 font-semibold text-sm">
                        生成日期
                      </th>
                      <th className="pb-3 px-4 text-slate-300 font-semibold text-sm">
                        涉及设备
                      </th>
                      <th className="pb-3 px-4 text-slate-300 font-semibold text-sm text-center">
                        健康评分
                      </th>
                      <th className="pb-3 px-4 text-slate-300 font-semibold text-sm text-center">
                        健康等级
                      </th>
                      <th className="pb-3 px-4 text-slate-300 font-semibold text-sm text-center">
                        操作
                      </th>
                    </tr>
                  </thead>

                  {/* 表体 */}
                  <tbody>
                    {reports.map((report) => {
                      // 后端字段映射：healthLevel -> HealthStatus, healthScore -> 评分
                      const healthStatus = mapHealthLevelToStatus(report.healthLevel || 'good');
                      const badgeConfig = gradeBadgeConfig[healthStatus] || gradeBadgeConfig.GOOD;
                      const gradeName = gradeNameMap[healthStatus] || '未知';

                      return (
                        <tr
                          key={report.id}
                          className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                        >
                          {/* 报告 ID 列 */}
                          <td className="py-4 px-4 text-slate-100 font-mono text-sm">
                            {report.id}
                          </td>

                          {/* 生成日期列 */}
                          <td className="py-4 px-4 text-slate-300 text-sm">
                            {formatDate(report.generatedAt)}
                          </td>

                          {/* 涉及设备列 */}
                          <td className="py-4 px-4 text-slate-300 text-sm">
                            {report.equipmentId || '全船汇总报告'}
                          </td>

                          {/* 健康评分列 */}
                          <td className="py-4 px-4 text-center">
                            <span className={`text-2xl font-bold ${badgeConfig.textClass}`}>
                              {report.healthScore}
                            </span>
                          </td>

                          {/* 健康等级列 */}
                          <td className="py-4 px-4 text-center">
                            <Badge
                              className={`${badgeConfig.bgClass} ${badgeConfig.textClass} ${badgeConfig.borderClass} border`}
                            >
                              {gradeName}
                            </Badge>
                          </td>

                          {/* 操作列 */}
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* 查看详情按钮 */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsModalOpen(true);
                                  // 如果外部仍需感知，可保留回调，但当前主要逻辑已改为弹窗
                                  onViewReport(report.id);
                                }}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                                aria-label={`查看报告 ${report.id} 详情`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                查看
                              </Button>

                              {/* 导出按钮 */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onExportReport(report.id)}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                                aria-label={`导出报告 ${report.id}`}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                导出
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <AdvancedPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    siblingCount={1}
                    showStats={false}
                    className="text-slate-300"
                  />
                </div>
              )}

              {/* 分页信息提示 */}
              <div className="mt-4 text-center text-slate-500 text-sm">
                共 {total} 条报告，当前显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} 条
              </div>
            </>
          )}
        </div>
      </CardContent>

      {/* 报表详情展示弹窗 */}
      <HealthReportDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onExport={onExportReport}
      />
    </Card >
  );
};

// 设置组件显示名称（便于调试）
HealthReportsList.displayName = 'HealthReportsList';
