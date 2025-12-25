/**
 * 实时告警视图组件
 *
 * 功能特性：
 * - 展示实时推送的活动告警
 * - 顶部统计卡片（待处理、严重、紧急告警数）
 * - 自动响应 WebSocket 推送，无需手动刷新
 * - 支持告警确认操作
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useAlarmsStore } from '../../stores/alarms-store';
import { AlarmTable } from './AlarmTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';

/**
 * 统计卡片组件
 * 展示告警统计数据
 */
function StatisticsCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="bg-slate-800/80 border-slate-700 text-slate-100">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

/**
 * 实时告警视图组件
 *
 * 职责：
 * 1. 订阅 alarms-store 的实时告警状态
 * 2. 展示统计卡片和告警列表
 * 3. 处理告警确认操作
 * 4. 实现前端分页逻辑
 */
export function RealTimeAlarmsView() {
  // ===== Store 状态订阅 =====
  const {
    items,
    pendingAlarms,
    criticalAlarms,
    emergencyAlarms,
    loading,
    realtimeConnected,
    acknowledgeAlarm,
  } = useAlarmsStore();

  // ===== 分页状态与逻辑 =====
  const [currentPage, setCurrentPage] = React.useState(1);
  const PAGE_SIZE = 20;

  // 计算分页后的数据
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const currentAlarms = React.useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return items.slice(startIndex, startIndex + PAGE_SIZE);
  }, [items, currentPage]);

  // 当告警列表长度变化导致总页数减少且当前页超出时，重置页码
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [items.length, totalPages, currentPage]);

  /**
   * 处理告警确认
   * 调用 store 的 acknowledgeAlarm 方法
   */
  const handleAcknowledge = React.useCallback(
    async (alarmId: string) => {
      try {
        await acknowledgeAlarm(alarmId);
        toast.success('告警确认成功');
      } catch (error) {
        console.error('确认告警失败:', error);
        toast.error('告警确认失败，请稍后重试');
      }
    },
    [acknowledgeAlarm]
  );

  /**
   * 生成分页页码数组（复用历史告警的分页码生成逻辑）
   */
  const generatePageNumbers = () => {
    const pages: number[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  return (
    <div className="space-y-6">
      {/* WebSocket 连接状态提示 */}
      {!realtimeConnected && (
        <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-600">
              实时连接已断开，正在尝试重连...
            </p>
          </div>
        </div>
      )}

      {/* 统计卡片区域 */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatisticsCard
          title="待处理告警"
          value={pendingAlarms.length}
          icon={AlertTriangle}
          colorClass="text-orange-600"
        />
        <StatisticsCard
          title="严重告警"
          value={criticalAlarms.length}
          icon={XCircle}
          colorClass="text-red-600"
        />
        <StatisticsCard
          title="紧急告警"
          value={emergencyAlarms.length}
          icon={XCircle}
          colorClass="text-red-700"
        />
      </div>

      {/* 实时告警列表 */}
      <Card className="bg-slate-800/80 border-slate-700 text-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>实时告警列表</CardTitle>
            <CardDescription>
              自动接收并展示 WebSocket 推送的告警，无需手动刷新（共 {items.length} 条）
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <AlarmTable
            alarms={currentAlarms}
            loading={loading}
            showAcknowledgeButton={true}
            onAcknowledge={handleAcknowledge}
            emptyText="当前没有活动告警"
          />

          {/* 分页组件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    >
                      上一页
                    </PaginationPrevious>
                  </PaginationItem>

                  {pageNumbers.map((pageNum, index) => (
                    <PaginationItem key={index}>
                      {pageNum === -1 ? (
                        <span className="px-3 text-slate-500">...</span>
                      ) : (
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    >
                      下一页
                    </PaginationNext>
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
