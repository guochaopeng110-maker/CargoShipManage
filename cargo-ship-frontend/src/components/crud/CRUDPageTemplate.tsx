/**
 * CRUD页面模板组件
 *
 * 顶层CRUD页面模板，组合所有子组件
 * 提供完整的CRUD页面布局和数据流管理
 *
 * 功能特性：
 * - 统一的页面布局
 * - 集成所有CRUD子组件
 * - 数据流协调
 * - 错误处理和显示
 * - 权限控制逻辑
 * - 性能优化（React.memo）
 */

import React, { useMemo } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { CRUDActionBar } from './CRUDActionBar';
import { CRUDSearchBar } from './CRUDSearchBar';
import { CRUDDataTable } from './CRUDDataTable';
import { CRUDPageTemplateProps } from '../../types/crud';

/**
 * CRUDPageTemplate组件
 *
 * 提供完整的CRUD页面模板
 * 组装ActionBar、SearchBar、DataTable等子组件
 *
 * @template T 数据项类型
 * @param props 组件属性
 * @returns React组件
 *
 * @example
 * ```tsx
 * <CRUDPageTemplate
 *   title="设备管理"
 *   description="货船智能机舱设备统一管理平台"
 *   items={items}
 *   total={total}
 *   loading={loading}
 *   error={error}
 *   page={page}
 *   pageSize={pageSize}
 *   columns={columns}
 *   rowKey="id"
 *   searchable
 *   searchPlaceholder="搜索设备ID或设备名称..."
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 *   onCreateClick={handleCreate}
 *   onEditClick={handleEdit}
 *   onDeleteClick={handleDelete}
 *   canCreate={true}
 *   canEdit={true}
 *   canDelete={true}
 * />
 * ```
 */
export function CRUDPageTemplate<T extends Record<string, any>>({
  // 页面配置
  title,
  description,

  // 数据源
  items,
  total,
  loading,
  error,

  // 分页配置
  page,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,

  // 表格配置
  columns,
  rowKey,

  // 搜索和筛选
  searchable = false,
  searchPlaceholder,
  filters,
  onSearchChange,
  onFilterChange,

  // CRUD操作
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onViewClick,

  // 权限控制
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canView = false,

  // 自定义渲染
  renderActionButtons,
  renderTopActions,
  renderEmptyState,
  renderErrorState,
}: CRUDPageTemplateProps<T>) {
  // 渲染操作按钮
  const defaultRenderActionButtons = useMemo(() => {
    if (renderActionButtons) {
      return renderActionButtons;
    }

    return (item: T) => {
      const { Button } = require('../ui/button');
      const { Edit, Trash2, Eye } = require('lucide-react');

      return (
        <>
          {canView && onViewClick && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewClick(item)}
              className="h-8 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          {canEdit && onEditClick && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEditClick(item)}
              className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/20"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && onDeleteClick && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDeleteClick(item)}
              className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </>
      );
    };
  }, [canView, canEdit, canDelete, onViewClick, onEditClick, onDeleteClick, renderActionButtons]);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和操作栏 */}
        <CRUDActionBar
          title={title}
          description={description}
          onCreateClick={canCreate ? onCreateClick : undefined}
          renderTopActions={renderTopActions}
        />

        {/* 错误提示 */}
        {error && !loading && (
          <Alert className="bg-red-900/20 border-red-600/50 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {renderErrorState ? renderErrorState(error) : error}
            </AlertDescription>
          </Alert>
        )}

        {/* 搜索和筛选栏 */}
        {searchable && (
          <CRUDSearchBar
            placeholder={searchPlaceholder}
            filters={filters}
            onSearchChange={onSearchChange}
            onFilterChange={onFilterChange}
            loading={loading}
          />
        )}

        {/* 数据表格 */}
        <CRUDDataTable
          data={items}
          columns={columns}
          rowKey={rowKey}
          loading={loading}
          error={null} // 错误已在上方显示
          page={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          renderActionButtons={defaultRenderActionButtons}
          renderEmptyState={renderEmptyState}
          showActions={canView || canEdit || canDelete}
        />
      </div>
    </div>
  );
}

// 使用React.memo进行性能优化
// 避免父组件重渲染时不必要的子组件重渲染
export default React.memo(CRUDPageTemplate) as typeof CRUDPageTemplate;
