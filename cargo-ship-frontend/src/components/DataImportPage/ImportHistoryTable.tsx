/**
 * 导入历史记录表格组件
 *
 * 职责：
 * - 展示历史导入任务列表
 * - 支持筛选、分页和排序
 * - 遵循 DataQueryPage 的"筛选-分页列表"模式
 * - 提供操作按钮（查看详情、重试、下载等）
 *
 * @module components/DataImportPage/ImportHistoryTable
 */

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Eye,
  RotateCcw,
  Download,
  Search,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// 从后端 API 客户端导入基础类型
import { ImportRecord } from '@/services/api';

/**
 * 导入历史表格组件的 Props
 */
export interface ImportHistoryTableProps {
  /** 导入记录列表 */
  records: ImportRecord[];

  /** 是否正在加载 */
  loading?: boolean;

  /** 当前页码 */
  page: number;

  /** 每页大小 */
  pageSize: number;

  /** 总记录数 */
  total: number;

  /** 总页数 */
  totalPages: number;

  /** 页码变化回调 */
  onPageChange: (page: number) => void;

  /** 查看详情回调 */
  onViewDetails: (recordId: string) => void;

  /** 重试导入回调 */
  onRetry: (recordId: string) => void;

  /** 下载结果回调 */
  onDownload?: (recordId: string) => void;

  /** 执行导入回调 */
  onExecute?: (recordId: string) => void;

  /** 取消导入回调 */
  onCancel?: (recordId: string) => void;

  /** 筛选条件变化回调 */
  onFilterChange?: (filters: { fileName?: string; status?: string }) => void;
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: number | string): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取状态徽章
 */
function getStatusBadge(status: string) {
  const colorMap = {
    pending: 'bg-blue-500/20 text-blue-400 border-blue-500',
    processing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
    completed: 'bg-green-500/20 text-green-400 border-green-500',
    partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
    failed: 'bg-red-500/20 text-red-400 border-red-500',
  };

  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    partial: '部分完成',
    failed: '失败',
  };

  return (
    <Badge className={colorMap[status as keyof typeof colorMap] || 'bg-gray-500/20 text-gray-400 border-gray-500'}>
      {statusMap[status as keyof typeof statusMap] || status}
    </Badge>
  );
}

/**
 * ImportHistoryTable 组件
 */
export function ImportHistoryTable({
  records,
  loading = false,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onViewDetails,
  onRetry,
  onDownload,
  onExecute,
  onCancel,
  onFilterChange,
}: ImportHistoryTableProps) {
  // 防御性编程：确保records始终是一个数组
  const safeRecords = Array.isArray(records) ? records : [];

  // ===== 本地状态 =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ===== 事件处理 =====

  /**
   * 处理搜索变化
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  /**
   * 处理状态筛选变化
   */
  const handleStatusChange = useCallback((status: string) => {
    setFilterStatus(status);
  }, []);

  /**
   * 执行搜索
   */
  const handleExecuteSearch = useCallback(() => {
    onFilterChange?.({
      fileName: searchTerm,
      status: filterStatus === 'all' ? undefined : filterStatus
    });
  }, [searchTerm, filterStatus, onFilterChange]);

  /**
   * 处理页码变化
   */
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  }, [totalPages, onPageChange]);

  return (
    <div className="space-y-6">
      {/* 筛选条件区域 */}
      <div className="flex gap-4">
        {/* 文件名搜索 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="搜索文件名..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch()}
            className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* 状态筛选 */}
        <Select value={filterStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600 text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="processing">处理中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="partial">部分完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>

        {/* 查询按钮 */}
        <Button
          onClick={handleExecuteSearch}
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          <Search className="w-4 h-4 mr-2" />
          查询
        </Button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">文件名称</th>
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">格式</th>
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">状态</th>
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">进度</th>
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">成功/总数</th>
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">上传时间</th>
              <th className="text-left py-3 px-4 text-slate-300 text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  加载中...
                </td>
              </tr>
            ) : safeRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  暂无导入记录
                </td>
              </tr>
            ) : (
              safeRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-colors">
                  {/* 文件名称 */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-300 text-sm truncate">{record.fileName}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(record.fileSize)}</p>
                      </div>
                    </div>
                  </td>

                  {/* 格式 */}
                  <td className="py-3 px-4">
                    <Badge className="bg-slate-700 text-slate-300 border-slate-600">
                      {record.fileFormat.toUpperCase()}
                    </Badge>
                  </td>

                  {/* 状态 */}
                  <td className="py-3 px-4">{getStatusBadge(record.status)}</td>

                  {/* 进度 */}
                  <td className="py-3 px-4">
                    <div className="w-32">
                      <Progress
                        value={record.totalRows > 0 ? (record.successRows / record.totalRows) * 100 : 0}
                        className="h-2"
                      />
                      <span className="text-xs text-slate-400 mt-1 block">
                        {record.totalRows > 0 ? Math.round((record.successRows / record.totalRows) * 100) : 0}%
                      </span>
                    </div>
                  </td>

                  {/* 成功/总数 */}
                  <td className="py-3 px-4 text-slate-400 text-sm">
                    <div>
                      {record.successRows}/{record.totalRows}
                      {record.failedRows > 0 && (
                        <span className="text-red-400 block text-xs mt-1">
                          ({record.failedRows} 失败)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 上传时间 */}
                  <td className="py-3 px-4 text-slate-400 text-sm">
                    {formatDateTime(record.createdAt)}
                  </td>

                  {/* 操作 */}
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {/* 查看详情按钮 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewDetails(record.id)}
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                        title="查看详情"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>

                      {/* 执行导入按钮（仅待处理状态） */}
                      {record.status === 'pending' && onExecute && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onExecute(record.id)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          title="开始导入"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}

                      {/* 取消导入按钮（仅处理中状态） */}
                      {record.status === 'processing' && onCancel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancel(record.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="取消导入"
                        >
                          <Pause className="w-3 h-3" />
                        </Button>
                      )}

                      {/* 重试按钮（仅失败状态） */}
                      {record.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onRetry(record.id)}
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          title="重试导入"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      )}

                      {/* 下载按钮（仅完成状态） */}
                      {record.status === 'completed' && onDownload && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDownload(record.id)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="下载结果"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-slate-400 text-sm">
            显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              上一页
            </Button>
            <span className="text-slate-400 text-sm px-3 py-2">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 默认导出
 */
export default ImportHistoryTable;
