import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Share2,
  Eye,
  Calendar,
  FileDown,
  Loader2,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square,
  Filter,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';

// 导入报表相关服务
import { ReportsService, ReportType } from '../services/reports-service';
import { useReportsStore, useReportsSelector } from '../stores/reports-store';

// 报表类型定义
const reportTypes = [
  {
    id: 'DAILY_OPERATION',
    title: '日常运行报表',
    description: '包含每日设备运行状态、关键参数、告警记录等信息',
    icon: FileText,
  },
  {
    id: 'MONTHLY_OPERATION',
    title: '月度运行报表',
    description: '月度综合运行数据统计分析，包括能效、故障率、维护记录等',
    icon: FileText,
  },
  {
    id: 'EQUIPMENT_HEALTH',
    title: '设备健康评估报表',
    description: '设备健康状态评估、SOH趋势分析、预测性维护建议',
    icon: FileText,
  },
  {
    id: 'FAILURE_STATISTICS',
    title: '故障统计报表',
    description: '故障类型分布、频次统计、根因分析、改进建议',
    icon: FileText,
  },
  {
    id: 'ENERGY_EFFICIENCY',
    title: '能效分析报表',
    description: '能源消耗分析、效率趋势、优化建议、对比分析',
    icon: BarChart3,
  },
];

export function ReportsPage() {
  // 基础状态
  const [exportFormat, setExportFormat] = useState<'PDF' | 'EXCEL'>('PDF');
  const [startDate, setStartDate] = useState('2025-11-01');
  const [endDate, setEndDate] = useState('2025-11-20');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('DAILY_OPERATION');
  const [dateRange, setDateRange] = useState<'custom' | '7d' | '30d' | '90d'>('30d');

  // 报表状态管理
  const {
    reports,
    statistics,
    loading,
    generating,
    error,
    pagination,
    queryParams,
    selectedReports,
    generationProgress,
    fetchReports,
    generateReport,
    downloadReport,
    deleteReport,
    deleteSelectedReports,
    refreshStatistics,
    setQueryParams,
    toggleReportSelection,
    selectAllReports,
    clearSelection,
    clearError
  } = useReportsStore();

  // 初始化加载数据
  useEffect(() => {
    fetchReports();
  }, []);

  /**
   * 生成报表处理函数
   */
  const handleGenerateReport = async (reportType?: ReportType) => {
    try {
      const config = {
        reportType: reportType || selectedReportType,
        startDate,
        endDate,
        exportFormat,
        includeCharts: true,
        includeRawData: false,
        language: 'zh-CN' as const
      };

      const report = await generateReport(config);
      
      if (report) {
        // 生成成功提示已在store中处理
        console.info('报表生成成功:', report);
      }
    } catch (error) {
      console.error('报表生成失败:', error);
    }
  };

  /**
   * 下载报表处理函数
   */
  const handleDownload = async (reportId: string) => {
    try {
      await downloadReport(reportId);
    } catch (error) {
      console.error('报表下载失败:', error);
    }
  };

  /**
   * 删除报表处理函数
   */
  const handleDeleteReport = async (reportId: string) => {
    if (window.confirm('确定要删除这个报表吗？')) {
      await deleteReport(reportId);
    }
  };

  /**
   * 批量删除处理函数
   */
  const handleBatchDelete = async () => {
    if (selectedReports.length === 0) {
      alert('请先选择要删除的报表');
      return;
    }
    
    if (window.confirm(`确定要删除选中的 ${selectedReports.length} 个报表吗？`)) {
      await deleteSelectedReports();
    }
  };

  /**
   * 刷新数据处理函数
   */
  const handleRefresh = () => {
    fetchReports();
    refreshStatistics();
  };

  /**
   * 获取报表类型显示名称
   */
  const getReportTypeDisplayName = (type: ReportType): string => {
    const typeMap: Record<ReportType, string> = {
      'DAILY_OPERATION': '日常运行报表',
      'MONTHLY_OPERATION': '月度运行报表',
      'EQUIPMENT_HEALTH': '设备健康评估报表',
      'FAILURE_STATISTICS': '故障统计报表',
      'ENERGY_EFFICIENCY': '能效分析报表',
    };
    return typeMap[type] || type;
  };

  /**
   * 获取报表状态显示信息
   */
  const getReportStatusInfo = (status: string) => {
    const statusMap = {
      'PENDING': { name: '待生成', className: 'bg-gray-500 text-white' },
      'GENERATING': { name: '生成中', className: 'bg-blue-500 text-white' },
      'COMPLETED': { name: '已完成', className: 'bg-green-500 text-white' },
      'FAILED': { name: '生成失败', className: 'bg-red-500 text-white' },
      'EXPIRED': { name: '已过期', className: 'bg-gray-400 text-white' },
    };
    return statusMap[status as keyof typeof statusMap] || { name: status, className: 'bg-gray-500 text-white' };
  };

  /**
   * 格式化日期
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '未知';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  /**
   * 获取进度百分比
   */
  const getProgress = (reportId: string): number => {
    return generationProgress[reportId] || 0;
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 错误提示 */}
        {error && (
          <Alert className="bg-red-900/50 border-red-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-100">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="ml-2 text-red-200 hover:text-red-100"
              >
                关闭
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* 顶部控制区 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-100 text-xl font-semibold">报表生成设置</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 报表类型选择 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">报表类型</label>
              <Select
                value={selectedReportType}
                onValueChange={(value) => setSelectedReportType(value as ReportType)}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {reportTypes.map((type) => (
                    <SelectItem
                      key={type.id}
                      value={type.id}
                      className="text-slate-300 hover:bg-slate-700"
                    >
                      {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 开始日期 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">开始日期</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>

            {/* 结束日期 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">结束日期</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>

            {/* 导出格式 */}
            <div>
              <label className="text-slate-300 text-sm mb-2 block">导出格式</label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as 'PDF' | 'EXCEL')}>
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="PDF" className="text-slate-300">PDF</SelectItem>
                  <SelectItem value="EXCEL" className="text-slate-300">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 生成按钮 */}
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => handleGenerateReport()}
              disabled={generating || loading}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5 mr-2" />
                  生成报表
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* 报表类型展示 */}
        <div>
          <h2 className="text-slate-100 mb-4 text-lg font-semibold">报表类型</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportTypes.map((reportType) => (
              <Card
                key={reportType.id}
                className="bg-slate-800/80 border-slate-700 p-6 hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedReportType(reportType.id as ReportType);
                  handleGenerateReport(reportType.id as ReportType);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <reportType.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-slate-100 mb-2 font-medium">{reportType.title}</h3>
                    <p className="text-slate-400 text-sm mb-4">{reportType.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-slate-300 text-xs"
                      >
                        {exportFormat}
                      </Badge>
                      <div className="flex items-center text-xs text-slate-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {startDate} ~ {endDate}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 报表统计信息 */}
        {statistics && (
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <h3 className="text-slate-100 mb-4 font-semibold">报表统计</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">{statistics.totalReports || 0}</div>
                <div className="text-sm text-slate-400">总报表数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{statistics.completedReports || 0}</div>
                <div className="text-sm text-slate-400">已完成</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{statistics.failedReports || 0}</div>
                <div className="text-sm text-slate-400">生成失败</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{statistics.generatingReports || 0}</div>
                <div className="text-sm text-slate-400">生成中</div>
              </div>
            </div>
          </Card>
        )}

        {/* 报表列表 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-100 text-lg font-semibold">报表列表</h2>
            <div className="flex gap-2">
              {selectedReports.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllReports}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <CheckSquare className="w-4 h-4 mr-1" />
                    全选 ({selectedReports.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    清除
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBatchDelete}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    批量删除
                  </Button>
                </>
              )}
            </div>
          </div>

          {loading && reports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <span className="ml-2 text-slate-400">正在加载报表...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">暂无报表数据</p>
              <Button
                onClick={() => handleGenerateReport()}
                disabled={generating}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <FileDown className="w-4 h-4 mr-2" />
                生成第一个报表
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedReports.length === reports.length && reports.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAllReports();
                          } else {
                            clearSelection();
                          }
                        }}
                        className="rounded border-slate-600"
                      />
                    </th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">报表名称</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">类型</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">状态</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">生成时间</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">格式</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">大小</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const statusInfo = getReportStatusInfo(report.status);
                    const progress = getProgress(report.id);
                    
                    return (
                      <tr key={report.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={selectedReports.includes(report.id)}
                            onChange={() => toggleReportSelection(report.id)}
                            className="rounded border-slate-600"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-300 text-sm font-medium">{report.name}</div>
                          {progress > 0 && progress < 100 && (
                            <div className="mt-1">
                              <div className="w-full bg-slate-700 rounded-full h-1">
                                <div
                                  className="bg-cyan-400 h-1 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <div className="text-xs text-slate-400 mt-1">{progress}%</div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-sm">
                          {getReportTypeDisplayName(report.reportType)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={statusInfo.className}>
                            {statusInfo.name}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-sm">
                          {formatDate(report.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className="bg-slate-700 text-slate-300 border-slate-600">
                            {report.config.exportFormat}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-sm">
                          {formatFileSize(report.fileSize)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            {report.status === 'COMPLETED' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleDownload(report.id)}
                                  className="bg-cyan-500 hover:bg-cyan-600 text-white p-2"
                                  title="下载"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2"
                                  title="分享"
                                >
                                  <Share2 className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-2"
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页控制 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-slate-400">
                显示 {(pagination.page - 1) * pagination.limit + 1} 到{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} 条，
                共 {pagination.total} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQueryParams({ page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page <= 1 || loading}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  上一页
                </Button>
                <span className="text-sm text-slate-400 px-3 py-2">
                  第 {pagination.page} 页，共 {pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQueryParams({ page: Math.min(pagination.totalPages, pagination.page + 1) })}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
