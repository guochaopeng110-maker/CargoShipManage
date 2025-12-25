/**
 * CRUD搜索和筛选栏组件
 *
 * 提供搜索输入框和筛选器的统一UI
 * 支持防抖搜索、多筛选器组合、清除筛选等功能
 *
 * 功能特性：
 * - 搜索输入框（带防抖）
 * - 多个筛选器支持
 * - 显示当前筛选条件数量
 * - 清除所有筛选按钮
 * - 加载状态显示
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Filter, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { CRUDSearchBarProps } from '../../types/crud';

/**
 * CRUDSearchBar组件
 *
 * 渲染搜索和筛选栏
 * 包含搜索输入框、筛选器下拉菜单和清除按钮
 *
 * @param props 组件属性
 * @returns React组件
 *
 * @example
 * ```tsx
 * <CRUDSearchBar
 *   placeholder="搜索设备ID或设备名称..."
 *   filters={[
 *     {
 *       key: 'status',
 *       label: '状态',
 *       type: 'select',
 *       options: [
 *         { label: '运行中', value: 'running' },
 *         { label: '维护中', value: 'maintenance' }
 *       ]
 *     }
 *   ]}
 *   onSearchChange={(term) => handleSearch(term)}
 *   onFilterChange={(filters) => handleFilter(filters)}
 * />
 * ```
 */
export const CRUDSearchBar: React.FC<CRUDSearchBarProps> = ({
  placeholder = '搜索...',
  filters = [],
  onSearchChange,
  onFilterChange,
  onClearFilters,
  searchTerm: externalSearchTerm,
  activeFilters = {},
  loading = false,
}) => {
  // 内部搜索关键词状态
  const [internalSearchTerm, setInternalSearchTerm] = useState(externalSearchTerm || '');

  // 内部筛选条件状态
  const [internalFilters, setInternalFilters] = useState<Record<string, any>>(activeFilters);

  // 防抖搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(internalSearchTerm);
      }
    }, 300); // 300ms防抖延迟

    return () => clearTimeout(timeoutId);
  }, [internalSearchTerm]); // 移除onSearchChange，避免无限循环

  // 处理筛选器改变
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = {
      ...internalFilters,
      [key]: value,
    };
    setInternalFilters(newFilters);

    if (onFilterChange) {
      // 将 'ALL_MODELS' 转换回 undefined 给外部使用
      const externalFilters = { ...newFilters };
      if (value === 'ALL_MODELS') {
        delete externalFilters[key];
      }
      onFilterChange(externalFilters);
    }
  };

  // 处理清除所有筛选
  const handleClearAll = () => {
    setInternalSearchTerm('');
    setInternalFilters({});

    if (onSearchChange) {
      onSearchChange('');
    }
    if (onFilterChange) {
      onFilterChange({});
    }
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // 计算活跃筛选器数量
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (internalSearchTerm.trim()) {
      count++;
    }
    count += Object.values(internalFilters).filter(
      (value) => value !== undefined && value !== null && value !== '' && value !== 'ALL_MODELS'
    ).length;
    return count;
  }, [internalSearchTerm, internalFilters]);

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 搜索输入框 */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={internalSearchTerm}
            onChange={(e) => setInternalSearchTerm(e.target.value)}
            className="pl-10 pr-10 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
          />
          {internalSearchTerm && (
            <button
              onClick={() => setInternalSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 animate-spin" />
          )}
        </div>

        {/* 筛选器 */}
        {filters.map((filter) => (
          <div key={filter.key} className="w-full sm:w-[200px]">
            {filter.type === 'select' && (
              <Select
                value={internalFilters[filter.key] || ''}
                onValueChange={(value) => handleFilterChange(filter.key, value)}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                  <SelectValue placeholder={filter.placeholder || filter.label} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="ALL_MODELS">全部{filter.label}</SelectItem>
                  {filter.options?.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={String(option.value)}
                      className="text-white hover:bg-slate-800"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}

        {/* 筛选状态和清除按钮 */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <>
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                <Filter className="h-3 w-3 mr-1" />
                {activeFilterCount}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4 mr-1" />
                清除
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
