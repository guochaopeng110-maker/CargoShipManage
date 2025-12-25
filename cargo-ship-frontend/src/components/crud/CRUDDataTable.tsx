/**
 * CRUD数据表格组件
 *
 * 提供功能完整的数据表格，支持分页、排序、加载状态等
 * 这是CRUD页面的核心组件之一
 *
 * 功能特性：
 * - 数据表格显示（支持自定义列渲染）
 * - 分页控件
 * - 列排序功能
 * - 固定操作列
 * - 加载状态（骨架屏）
 * - 空状态显示
 * - 错误状态显示
 * - 响应式设计
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  FileX,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CRUDDataTableProps } from '../../types/crud';
import { calculatePagination } from '../../utils/crud-helpers';

/**
 * CRUDDataTable组件
 *
 * 渲染完整的CRUD数据表格
 * 包含表头、表体、分页控件和各种状态显示
 *
 * @template T 数据项类型
 * @param props 组件属性
 * @returns React组件
 *
 * @example
 * ```tsx
 * <CRUDDataTable
 *   data={items}
 *   columns={columns}
 *   rowKey="id"
 *   page={1}
 *   pageSize={20}
 *   total={100}
 *   onPageChange={(page) => setPage(page)}
 *   onPageSizeChange={(size) => setPageSize(size)}
 *   renderActionButtons={(item) => (
 *     <>
 *       <Button size="sm" onClick={() => handleEdit(item)}>编辑</Button>
 *       <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>删除</Button>
 *     </>
 *   )}
 * />
 * ```
 */
export function CRUDDataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  loading = false,
  error = null,
  page,
  pageSize,
  total,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onSortChange,
  renderActionButtons,
  renderEmptyState,
  showActions = true,
  actionsTitle = '操作',
  actionsWidth = '180px',
}: CRUDDataTableProps<T>) {
  // 防御性编程：确保data始终是一个数组
  const safeData = Array.isArray(data) ? data : [];

  // 计算分页信息
  const pagination = calculatePagination(total, page, pageSize);

  // 处理排序点击
  const handleSortClick = (columnKey: string) => {
    if (!onSortChange) return;

    if (sortBy === columnKey) {
      // 如果已经是当前排序列，切换排序方向
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      onSortChange(columnKey, newOrder);
    } else {
      // 如果是新的排序列，默认升序
      onSortChange(columnKey, 'asc');
    }
  };

  // 渲染排序图标
  const renderSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // 渲染加载状态（骨架屏）
  const renderLoadingState = () => (
    <div className="space-y-3">
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={index} className="flex gap-4">
          <Skeleton className="h-12 flex-1 bg-slate-700/50" />
        </div>
      ))}
    </div>
  );

  // 渲染错误状态
  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">加载失败</h3>
      <p className="text-sm text-slate-400 mb-4">{error}</p>
      <Button
        onClick={() => onPageChange(page)}
        variant="outline"
        className="border-slate-700"
      >
        重试
      </Button>
    </div>
  );

  // 渲染默认空状态
  const renderDefaultEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileX className="h-12 w-12 text-slate-500 mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">暂无数据</h3>
      <p className="text-sm text-slate-400">当前没有任何记录</p>
    </div>
  );

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* 表格区域 */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-6">{renderLoadingState()}</div>
        ) : error ? (
          renderErrorState()
        ) : safeData.length === 0 ? (
          renderEmptyState ? renderEmptyState() : renderDefaultEmptyState()
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    style={{ width: column.width }}
                    className={`text-slate-300 font-semibold ${column.align === 'center'
                      ? 'text-center'
                      : column.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                      }`}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        onClick={() => handleSortClick(String(column.key))}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        {column.title}
                        {renderSortIcon(String(column.key))}
                      </button>
                    ) : (
                      column.title
                    )}
                  </TableHead>
                ))}
                {showActions && renderActionButtons && (
                  <TableHead
                    style={{ width: actionsWidth }}
                    className="text-slate-300 font-semibold text-right"
                  >
                    {actionsTitle}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeData.map((row, rowIndex) => (
                <TableRow
                  key={String(row[rowKey])}
                  className="border-slate-700 hover:bg-slate-700/30"
                >
                  {columns.map((column) => {
                    const value = row[column.key as keyof T];
                    return (
                      <TableCell
                        key={String(column.key)}
                        className={`text-slate-200 ${column.align === 'center'
                          ? 'text-center'
                          : column.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                          }`}
                      >
                        {column.render ? column.render(value, row, rowIndex) : String(value || '')}
                      </TableCell>
                    );
                  })}
                  {showActions && renderActionButtons && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {renderActionButtons(row)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 分页控件 */}
      {!loading && !error && safeData.length > 0 && (
        <div className="border-t border-slate-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* 每页条数选择 */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>每页显示</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => onPageSizeChange(Number(value))}
              >
                <SelectTrigger className="w-[80px] bg-slate-900/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {pageSizeOptions.map((size) => (
                    <SelectItem
                      key={size}
                      value={String(size)}
                      className="text-white hover:bg-slate-800"
                    >
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>条</span>
            </div>

            {/* 分页信息 */}
            <div className="text-sm text-slate-400">
              共 {total} 条，第 {page} / {pagination.totalPages} 页
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={!pagination.hasPrev}
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Number(page) - 1)}
                disabled={!pagination.hasPrev}
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Number(page) + 1)}
                disabled={!pagination.hasNext}
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.totalPages)}
                disabled={!pagination.hasNext}
                className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
