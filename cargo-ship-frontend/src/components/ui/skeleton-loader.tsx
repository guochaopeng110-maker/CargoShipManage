/**
 * 货船智能机舱管理系统 - 骨架屏加载组件
 * 
 * 功能说明：
 * 1. 提供各种类型的骨架屏加载效果
 * 2. 支持自定义样式和动画
 * 3. 提供预设的常用骨架屏模板
 * 4. 支持响应式布局
 * 5. 提供加载状态指示器
 * 
 * @version 1.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-01
 */

import React from 'react';
import { Skeleton } from './skeleton';
import { Card } from './card';
import { cn } from './utils';

/**
 * 基础骨架屏组件
 */
export const BaseSkeleton: React.FC<{
  className?: string;
  children?: React.ReactNode;
}> = ({ className, children }) => {
  return (
    <div className={cn('animate-pulse', className)}>
      {children}
    </div>
  );
};

/**
 * 文本骨架屏组件
 */
export const TextSkeleton: React.FC<{
  lines?: number;
  className?: string;
  lineClassName?: string;
}> = ({ lines = 3, className, lineClassName }) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            'h-4 w-full',
            index === lines - 1 && 'w-4/5',
            lineClassName
          )}
        />
      ))}
    </div>
  );
};

/**
 * 标题骨架屏组件
 */
export const TitleSkeleton: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <Skeleton className={cn('h-8 w-48 mb-4', className)} />
  );
};

/**
 * 卡片骨架屏组件
 */
export const CardSkeleton: React.FC<{
  className?: string;
  header?: boolean;
  content?: boolean;
  footer?: boolean;
}> = ({ className, header = true, content = true, footer = false }) => {
  return (
    <Card className={cn('p-6', className)}>
      {header && (
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      )}
      
      {content && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          <TextSkeleton lines={2} />
        </div>
      )}
      
      {footer && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      )}
    </Card>
  );
};

/**
 * 表格骨架屏组件
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* 表头 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} className="h-8" />
        ))}
      </div>
      
      {/* 表格行 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * 列表骨架屏组件
 */
export const ListSkeleton: React.FC<{
  items?: number;
  className?: string;
}> = ({ items = 5, className }) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
};

/**
 * 统计卡片骨架屏组件
 */
export const StatsCardSkeleton: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="mt-4">
        <Skeleton className="h-2 w-full" />
      </div>
    </Card>
  );
};

/**
 * 图表骨架屏组件
 */
export const ChartSkeleton: React.FC<{
  className?: string;
  type?: 'line' | 'bar' | 'pie';
}> = ({ className, type = 'line' }) => {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="h-64 flex items-center justify-center">
        {type === 'line' && (
          <div className="w-full h-full space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" style={{ height: `${Math.random() * 60 + 20}px` }} />
            ))}
          </div>
        )}
        
        {type === 'bar' && (
          <div className="flex items-end justify-center space-x-2 w-full h-full">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="w-8" style={{ height: `${Math.random() * 80 + 20}%` }} />
            ))}
          </div>
        )}
        
        {type === 'pie' && (
          <Skeleton className="h-48 w-48 rounded-full" />
        )}
      </div>
    </Card>
  );
};

/**
 * 表单骨架屏组件
 */
export const FormSkeleton: React.FC<{
  fields?: number;
  className?: string;
}> = ({ fields = 4, className }) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

/**
 * 侧边栏骨架屏组件
 */
export const SidebarSkeleton: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn('space-y-6 p-4', className)}>
      {/* Logo区域 */}
      <div className="flex items-center space-x-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-24" />
      </div>
      
      {/* 导航菜单 */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3 p-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      
      {/* 底部用户信息 */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center space-x-3 p-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 页面骨架屏组件
 */
export const PageSkeleton: React.FC<{
  className?: string;
  showHeader?: boolean;
  showSidebar?: boolean;
  children?: React.ReactNode;
}> = ({ className, showHeader = true, showSidebar = false, children }) => {
  return (
    <div className={cn('min-h-screen bg-slate-900', className)}>
      {showHeader && (
        <div className="border-b border-slate-700">
          <div className="flex items-center justify-between p-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex">
        {showSidebar && (
          <div className="w-64 border-r border-slate-700">
            <SidebarSkeleton />
          </div>
        )}
        
        <div className="flex-1 p-6">
          {children || (
            <div className="space-y-6">
              <TitleSkeleton />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </div>
              <CardSkeleton />
              <TableSkeleton />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 加载指示器组件
 */
export const LoadingIndicator: React.FC<{
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ text = '加载中...', size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      <div className={cn('animate-spin rounded-full border-2 border-slate-600 border-t-cyan-500', sizeClasses[size])} />
      {text && <span className="text-slate-400">{text}</span>}
    </div>
  );
};

/**
 * 全屏加载组件
 */
export const FullScreenLoader: React.FC<{
  text?: string;
}> = ({ text = '系统加载中...' }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto animate-spin rounded-full border-4 border-slate-600 border-t-cyan-500" />
        <p className="text-slate-300 text-lg">{text}</p>
      </div>
    </div>
  );
};

export default {
  BaseSkeleton,
  TextSkeleton,
  TitleSkeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  StatsCardSkeleton,
  ChartSkeleton,
  FormSkeleton,
  SidebarSkeleton,
  PageSkeleton,
  LoadingIndicator,
  FullScreenLoader,
};