/**
 * CRUD页面操作栏组件
 *
 * 提供页面标题、描述和顶部操作按钮的统一布局
 * 用于所有CRUD页面的顶部区域
 *
 * 功能特性：
 * - 显示页面标题和描述
 * - 提供创建按钮（支持权限控制）
 * - 支持自定义顶部操作区域
 * - 响应式设计，适配移动端和桌面端
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { CRUDActionBarProps } from '../../types/crud';

/**
 * CRUDActionBar组件
 *
 * 渲染CRUD页面的顶部操作栏
 * 包含标题、描述和操作按钮
 *
 * @param props 组件属性
 * @returns React组件
 *
 * @example
 * ```tsx
 * <CRUDActionBar
 *   title="设备管理"
 *   description="货船智能机舱设备统一管理平台"
 *   onCreateClick={() => setDialogOpen(true)}
 *   createButtonText="添加设备"
 * />
 * ```
 */
export const CRUDActionBar: React.FC<CRUDActionBarProps> = ({
  title,
  description,
  onCreateClick,
  createButtonText = '添加',
  renderTopActions,
  showCreateButton = true,
}) => {
  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* 标题和描述区域 */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-slate-400">
              {description}
            </p>
          )}
        </div>

        {/* 操作按钮区域 */}
        <div className="flex items-center gap-3">
          {/* 自定义操作区域 */}
          {renderTopActions && (
            <div className="flex items-center gap-2">
              {renderTopActions()}
            </div>
          )}

          {/* 创建按钮 */}
          {showCreateButton && onCreateClick && (
            <Button
              onClick={onCreateClick}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              {createButtonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
