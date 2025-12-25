/**
 * 高级分页组件
 *
 * 功能特性：
 * - 显示当前页码、总页数和数据总数
 * - 支持上一页/下一页按钮
 * - 支持页码直接跳转
 * - 自动计算页码省略显示
 * - 响应式设计
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from './pagination';
import { cn } from './utils';

/**
 * 高级分页组件属性接口
 */
export interface AdvancedPaginationProps {
  /** 当前页码（从1开始） */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 数据总数 */
  totalItems: number;
  /** 每页显示数量 */
  pageSize: number;
  /** 页码变化时的回调函数 */
  onPageChange: (page: number) => void;
  /** 自定义类名 */
  className?: string;
  /** 页码显示范围（当前页前后显示多少页） */
  siblingCount?: number;
  /** 是否显示首尾页码 */
  showFirstLast?: boolean;
  /** 是否显示数据统计信息 */
  showStats?: boolean;
}

/**
 * 生成页码数组
 * 自动计算哪些页码需要显示，哪些需要用省略号表示
 */
function generatePagination(
  currentPage: number,
  totalPages: number,
  siblingCount: number = 1
): (number | 'ellipsis')[] {
  // 如果总页数小于等于7，显示所有页码
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // 计算左右边界
  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  // 是否显示左侧省略号
  const shouldShowLeftEllipsis = leftSiblingIndex > 2;
  // 是否显示右侧省略号
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

  // 构建页码数组
  const items: (number | 'ellipsis')[] = [];

  // 始终显示第一页
  items.push(1);

  if (shouldShowLeftEllipsis) {
    // 添加左侧省略号
    items.push('ellipsis');

    // 添加当前页附近的页码
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== 1 && i !== totalPages) {
        items.push(i);
      }
    }
  } else {
    // 不需要左侧省略号，显示从第2页到右边界的所有页码
    for (let i = 2; i <= rightSiblingIndex; i++) {
      items.push(i);
    }
  }

  if (shouldShowRightEllipsis) {
    // 添加右侧省略号
    items.push('ellipsis');
  } else if (rightSiblingIndex < totalPages - 1) {
    // 不需要右侧省略号，显示剩余的页码
    for (let i = rightSiblingIndex + 1; i < totalPages; i++) {
      items.push(i);
    }
  }

  // 始终显示最后一页
  if (totalPages > 1) {
    items.push(totalPages);
  }

  return items;
}

/**
 * 高级分页组件
 *
 * 使用示例：
 * ```tsx
 * <AdvancedPagination
 *   currentPage={1}
 *   totalPages={10}
 *   totalItems={200}
 *   pageSize={20}
 *   onPageChange={(page) => console.log('跳转到第', page, '页')}
 *   showStats
 * />
 * ```
 */
export function AdvancedPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
  siblingCount = 1,
  showFirstLast = true,
  showStats = true,
}: AdvancedPaginationProps) {
  // 生成页码数组
  const pages = React.useMemo(
    () => generatePagination(currentPage, totalPages, siblingCount),
    [currentPage, totalPages, siblingCount]
  );

  // 计算当前页的数据范围
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // 处理页码点击
  const handlePageClick = React.useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages || page === currentPage) {
        return;
      }
      onPageChange(page);
    },
    [currentPage, totalPages, onPageChange]
  );

  // 上一页
  const handlePrevious = React.useCallback(() => {
    handlePageClick(currentPage - 1);
  }, [currentPage, handlePageClick]);

  // 下一页
  const handleNext = React.useCallback(() => {
    handlePageClick(currentPage + 1);
  }, [currentPage, handlePageClick]);

  // 如果没有数据或只有一页，不显示分页
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Pagination>
        <PaginationContent>
          {/* 上一页按钮 */}
          <PaginationItem>
            <PaginationPrevious
              onClick={handlePrevious}
              className={cn(
                'cursor-pointer',
                currentPage === 1 && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>

          {/* 页码列表 */}
          {pages.map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => handlePageClick(page)}
                  isActive={page === currentPage}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* 下一页按钮 */}
          <PaginationItem>
            <PaginationNext
              onClick={handleNext}
              className={cn(
                'cursor-pointer',
                currentPage === totalPages && 'pointer-events-none opacity-50'
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* 数据统计信息 */}
      {showStats && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <span>
            显示第 {startItem} - {endItem} 条
          </span>
          <span>·</span>
          <span>共 {totalItems} 条数据</span>
          <span>·</span>
          <span>
            第 {currentPage} / {totalPages} 页
          </span>
        </div>
      )}
    </div>
  );
}
