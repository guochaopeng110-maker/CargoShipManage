/**
 * 历史告警视图组件
 *
 * 功能特性：
 * - 提供筛选条件界面
 * - 展示历史告警查询结果
 * - 支持分页浏览
 * - 用户驱动的查询模式
 *
 * 完全复用 DataQueryPage 确立的"筛选-分页列表"模式
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { DateRange } from 'react-day-picker';
// 从 alarms-store 导入状态管理和类型定义
import {
  useAlarmsStore,
  AlertSeverity,
  AlarmStatus,
  AlarmFilters as AlarmFiltersType
} from '../../stores/alarms-store';
import { AlarmFilters } from './AlarmFilters';
import { AlarmTable } from './AlarmTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';

/**
 * 历史告警视图组件
 *
 * 职责：
 * 1. 管理筛选条件的 UI 状态
 * 2. 触发历史告警查询
 * 3. 展示查询结果
 * 4. 处理分页切换
 */
export function HistoricalAlarmsView() {
  // ===== Store 状态订阅 =====
  const {
    historicalAlarms,
    queryStatus,
    error,
    fetchHistoricalAlarms,
    setQueryPage,
  } = useAlarmsStore();

  /**
   * 处理查询操作
   * 将 UI 筛选条件转换为 API 查询参数
   */
  const handleQuery = React.useCallback(
    async (filters: {
      deviceId: string;
      dateRange: DateRange | undefined;
    }) => {
      // 构建查询参数
      const queryFilters: AlarmFiltersType = {
        deviceId: filters.deviceId,
      };

      if (filters.dateRange?.from && filters.dateRange?.to) {
        queryFilters.startTime = filters.dateRange.from.getTime();
        queryFilters.endTime = filters.dateRange.to.getTime();
      }

      // 调用 store action 执行查询（从第一页开始）
      await fetchHistoricalAlarms(queryFilters, 1);
    },
    [fetchHistoricalAlarms]
  );

  /**
   * 处理分页切换
   */
  const handlePageChange = React.useCallback(
    async (page: number) => {
      await setQueryPage(page);
    },
    [setQueryPage]
  );

  /**
   * 生成分页页码数组
   */
  const generatePageNumbers = () => {
    const totalPages = Math.ceil(historicalAlarms.total / historicalAlarms.pageSize);
    const currentPage = historicalAlarms.page;
    const pages: number[] = [];

    // 如果总页数少于等于7页，显示所有页码
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 否则显示部分页码
      if (currentPage <= 4) {
        // 当前页在前面
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // 省略号占位符
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // 当前页在后面
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const totalPages = Math.ceil(historicalAlarms.total / historicalAlarms.pageSize);
  const pageNumbers = generatePageNumbers();

  return (
    <div className="space-y-6">
      {/* 筛选条件区域 */}
      <AlarmFilters
        loading={queryStatus === 'loading'}
        onQuery={handleQuery}
      />

      {/* 错误提示 */}
      {queryStatus === 'error' && error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 查询结果区域 */}
      <Card className="bg-slate-800/80 border-slate-700 text-slate-100">
        <CardHeader>
          <CardTitle>查询结果</CardTitle>
          <CardDescription>
            {queryStatus === 'success' && (
              <>
                共找到 <strong>{historicalAlarms.total}</strong> 条告警记录
              </>
            )}
            {queryStatus === 'idle' && '请配置筛选条件并点击"执行查询"按钮'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 告警列表表格 */}
          <AlarmTable
            alarms={historicalAlarms.items}
            loading={queryStatus === 'loading'}
            showAcknowledgeButton={false}
            emptyText={
              queryStatus === 'idle'
                ? '请先执行查询'
                : '未找到符合条件的告警记录'
            }
          />

          {/* 分页组件 */}
          {queryStatus === 'success' && historicalAlarms.total > 0 && (
            <div className="flex items-center justify-center pt-4">
              <Pagination>
                <PaginationContent>
                  {/* 上一页按钮 */}
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (historicalAlarms.page > 1) {
                          handlePageChange(historicalAlarms.page - 1);
                        }
                      }}
                      className={
                        historicalAlarms.page === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>

                  {/* 页码按钮 */}
                  {pageNumbers.map((pageNum, index) => (
                    <PaginationItem key={index}>
                      {pageNum === -1 ? (
                        <span className="px-4">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(pageNum)}
                          isActive={historicalAlarms.page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  {/* 下一页按钮 */}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (historicalAlarms.page < totalPages) {
                          handlePageChange(historicalAlarms.page + 1);
                        }
                      }}
                      className={
                        historicalAlarms.page === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
