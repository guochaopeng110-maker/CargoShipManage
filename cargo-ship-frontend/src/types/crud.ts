// CRUD页面模板通用类型定义
// 为标准化CRUD页面提供统一的类型支持
//
// 功能说明：
// - 定义CRUD页面模板组件的通用接口
// - 提供数据表格、表单模态框、搜索栏等组件的类型
// - 支持泛型参数以适应不同的数据模型
// - 确保类型安全和组件间的一致性

import React from 'react';

/**
 * 表格列定义接口
 *
 * 定义数据表格中单个列的显示和行为配置
 * 支持自定义渲染、排序、宽度等特性
 *
 * @template T 数据项类型
 */
export interface ColumnDef<T> {
  /** 列的唯一键，对应数据对象的属性名或自定义键 */
  key: keyof T | string;

  /** 列标题，显示在表头 */
  title: string;

  /** 列宽度，可以是像素值或百分比字符串 */
  width?: string | number;

  /** 是否支持排序 */
  sortable?: boolean;

  /**
   * 自定义单元格渲染函数
   * @param value 当前单元格的值
   * @param record 当前行的完整数据对象
   * @param index 当前行的索引
   * @returns 渲染的React节点
   */
  render?: (value: any, record: T, index: number) => React.ReactNode;

  /** 列对齐方式 */
  align?: 'left' | 'center' | 'right';

  /** 是否在移动端隐藏此列 */
  hideOnMobile?: boolean;
}

/**
 * 表单字段配置接口
 *
 * 定义表单中单个字段的类型、验证规则和显示配置
 * 用于CRUDFormModal组件动态生成表单
 */
export interface FormFieldConfig {
  /** 字段名称，对应数据对象的属性名 */
  name: string;

  /** 字段标签，显示在表单中 */
  label: string;

  /** 字段类型，决定使用哪种输入组件 */
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'number' | 'date' | 'checkbox' | 'radio';

  /** 输入框占位符文本 */
  placeholder?: string;

  /** 是否为必填字段 */
  required?: boolean;

  /** 下拉选择框的选项列表（仅当type为select或radio时使用） */
  options?: Array<{ label: string; value: string | number }>;

  /**
   * 自定义验证函数
   * @param value 字段值
   * @returns 验证错误信息，无错误则返回undefined
   */
  validation?: (value: any) => string | undefined;

  /** 是否禁用此字段 */
  disabled?: boolean;

  /** 默认值 */
  defaultValue?: any;

  /** 数字类型的最小值 */
  min?: number;

  /** 数字类型的最大值 */
  max?: number;

  /** 文本类型的最小长度 */
  minLength?: number;

  /** 文本类型的最大长度 */
  maxLength?: number;

  /** 多行文本框的行数 */
  rows?: number;

  /** 字段提示信息 */
  helperText?: string;
}

/**
 * 筛选器配置接口
 *
 * 定义搜索栏中的筛选器选项
 * 支持多种筛选类型（下拉选择、日期范围等）
 */
export interface FilterConfig {
  /** 筛选器键名 */
  key: string;

  /** 筛选器标签 */
  label: string;

  /** 筛选器类型 */
  type: 'select' | 'multiselect' | 'daterange' | 'text';

  /** 选项列表（用于select和multiselect类型） */
  options?: Array<{ label: string; value: string | number }>;

  /** 占位符文本 */
  placeholder?: string;

  /** 默认值 */
  defaultValue?: any;
}

/**
 * 分页配置接口
 *
 * 定义分页组件的配置选项
 */
export interface PaginationConfig {
  /** 当前页码（从1开始） */
  page: number;

  /** 每页显示的数据条数 */
  pageSize: number;

  /** 数据总条数 */
  total: number;

  /** 总页数 */
  totalPages?: number;

  /** 每页条数选项列表 */
  pageSizeOptions?: number[];

  /**
   * 页码改变回调
   * @param page 新的页码
   */
  onPageChange: (page: number) => void;

  /**
   * 每页条数改变回调
   * @param pageSize 新的每页条数
   */
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * CRUD操作按钮配置接口
 *
 * 定义CRUD操作按钮的显示和权限控制
 */
export interface CRUDActionConfig {
  /** 是否允许创建 */
  canCreate?: boolean;

  /** 是否允许编辑 */
  canEdit?: boolean;

  /** 是否允许删除 */
  canDelete?: boolean;

  /** 是否允许查看详情 */
  canView?: boolean;

  /** 创建按钮文本 */
  createButtonText?: string;

  /** 编辑按钮文本 */
  editButtonText?: string;

  /** 删除按钮文本 */
  deleteButtonText?: string;

  /** 查看按钮文本 */
  viewButtonText?: string;
}

/**
 * CRUDPageTemplate组件属性接口
 *
 * 定义CRUD页面模板的完整配置
 * 这是核心模板组件的属性接口
 *
 * @template T 数据项类型
 */
export interface CRUDPageTemplateProps<T> {
  // === 页面配置 ===
  /** 页面标题 */
  title: string;

  /** 页面描述（可选） */
  description?: string;

  // === 数据源（来自Store） ===
  /** 数据项列表 */
  items: T[];

  /** 数据总条数 */
  total: number;

  /** 加载状态 */
  loading: boolean;

  /** 错误信息 */
  error: string | null;

  // === 分页配置 ===
  /** 当前页码 */
  page: number;

  /** 每页条数 */
  pageSize: number;

  /** 页码改变回调 */
  onPageChange: (page: number) => void;

  /** 每页条数改变回调 */
  onPageSizeChange: (pageSize: number) => void;

  /** 每页条数选项 */
  pageSizeOptions?: number[];

  // === 表格配置 ===
  /** 表格列定义 */
  columns: ColumnDef<T>[];

  /** 数据项的唯一标识字段名 */
  rowKey: keyof T;

  // === 搜索和筛选 ===
  /** 是否显示搜索栏 */
  searchable?: boolean;

  /** 搜索框占位符 */
  searchPlaceholder?: string;

  /** 筛选器配置列表 */
  filters?: FilterConfig[];

  /**
   * 搜索内容改变回调
   * @param searchTerm 搜索关键词
   */
  onSearchChange?: (searchTerm: string) => void;

  /**
   * 筛选条件改变回调
   * @param filters 筛选条件对象
   */
  onFilterChange?: (filters: Record<string, any>) => void;

  // === CRUD操作 ===
  /** 点击创建按钮回调 */
  onCreateClick?: () => void;

  /**
   * 点击编辑按钮回调
   * @param item 要编辑的数据项
   */
  onEditClick?: (item: T) => void;

  /**
   * 点击删除按钮回调
   * @param item 要删除的数据项
   */
  onDeleteClick?: (item: T) => void;

  /**
   * 点击查看按钮回调
   * @param item 要查看的数据项
   */
  onViewClick?: (item: T) => void;

  // === 权限控制 ===
  /** 是否允许创建 */
  canCreate?: boolean;

  /** 是否允许编辑 */
  canEdit?: boolean;

  /** 是否允许删除 */
  canDelete?: boolean;

  /** 是否允许查看详情 */
  canView?: boolean;

  // === 自定义渲染 ===
  /**
   * 自定义操作按钮渲染
   * @param item 当前行数据项
   * @returns 渲染的React节点
   */
  renderActionButtons?: (item: T) => React.ReactNode;

  /**
   * 自定义顶部操作区域渲染
   * @returns 渲染的React节点
   */
  renderTopActions?: () => React.ReactNode;

  /**
   * 自定义空状态渲染
   * @returns 渲染的React节点
   */
  renderEmptyState?: () => React.ReactNode;

  /**
   * 自定义错误状态渲染
   * @param error 错误信息
   * @returns 渲染的React节点
   */
  renderErrorState?: (error: string) => React.ReactNode;
}

/**
 * CRUDDataTable组件属性接口
 *
 * 定义数据表格组件的配置
 *
 * @template T 数据项类型
 */
export interface CRUDDataTableProps<T> {
  /** 数据列表 */
  data: T[];

  /** 表格列定义 */
  columns: ColumnDef<T>[];

  /** 数据项的唯一标识字段名 */
  rowKey: keyof T;

  /** 加载状态 */
  loading?: boolean;

  /** 错误信息 */
  error?: string | null;

  // === 分页 ===
  /** 当前页码 */
  page: number;

  /** 每页条数 */
  pageSize: number;

  /** 数据总条数 */
  total: number;

  /** 每页条数选项 */
  pageSizeOptions?: number[];

  /** 页码改变回调 */
  onPageChange: (page: number) => void;

  /** 每页条数改变回调 */
  onPageSizeChange: (pageSize: number) => void;

  // === 排序 ===
  /** 当前排序字段 */
  sortBy?: string;

  /** 当前排序方向 */
  sortOrder?: 'asc' | 'desc';

  /**
   * 排序改变回调
   * @param sortBy 排序字段
   * @param sortOrder 排序方向
   */
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  // === 自定义渲染 ===
  /**
   * 自定义操作按钮渲染
   * @param item 当前行数据项
   * @returns 渲染的React节点
   */
  renderActionButtons?: (item: T) => React.ReactNode;

  /**
   * 自定义空状态渲染
   * @returns 渲染的React节点
   */
  renderEmptyState?: () => React.ReactNode;

  /** 是否显示操作列 */
  showActions?: boolean;

  /** 操作列标题 */
  actionsTitle?: string;

  /** 操作列宽度 */
  actionsWidth?: string | number;
}

/**
 * CRUDFormModal组件属性接口
 *
 * 定义表单模态框组件的配置
 *
 * @template T 数据项类型
 */
export interface CRUDFormModalProps<T> {
  /** 是否打开模态框 */
  open: boolean;

  /**
   * 模态框打开状态改变回调
   * @param open 新的打开状态
   */
  onOpenChange: (open: boolean) => void;

  /** 模态框标题 */
  title: string;

  /** 表单模式（创建或编辑） */
  mode: 'create' | 'edit';

  /** 加载状态（提交表单时） */
  loading?: boolean;

  // === 表单配置 ===
  /** 表单字段配置列表 */
  fields: FormFieldConfig[];

  /** 表单默认值（编辑模式时） */
  defaultValues?: Partial<T>;

  // === 提交处理 ===
  /**
   * 表单提交回调
   * @param data 表单数据
   * @returns Promise，用于处理异步提交
   */
  onSubmit: (data: T) => Promise<void> | void;

  /**
   * 取消按钮点击回调
   */
  onCancel?: () => void;

  /** 提交按钮文本 */
  submitButtonText?: string;

  /** 取消按钮文本 */
  cancelButtonText?: string;

  /** 模态框宽度 */
  width?: string | number;
}

/**
 * CRUDActionBar组件属性接口
 *
 * 定义页面顶部操作栏的配置
 */
export interface CRUDActionBarProps {
  /** 页面标题 */
  title: string;

  /** 页面描述 */
  description?: string;

  /** 点击创建按钮回调 */
  onCreateClick?: () => void;

  /** 创建按钮文本 */
  createButtonText?: string;

  /**
   * 自定义顶部操作区域渲染
   * @returns 渲染的React节点
   */
  renderTopActions?: () => React.ReactNode;

  /** 是否显示创建按钮 */
  showCreateButton?: boolean;
}

/**
 * CRUDSearchBar组件属性接口
 *
 * 定义搜索和筛选栏的配置
 */
export interface CRUDSearchBarProps {
  /** 搜索框占位符 */
  placeholder?: string;

  /** 筛选器配置列表 */
  filters?: FilterConfig[];

  /**
   * 搜索内容改变回调
   * @param searchTerm 搜索关键词
   */
  onSearchChange?: (searchTerm: string) => void;

  /**
   * 筛选条件改变回调
   * @param filters 筛选条件对象
   */
  onFilterChange?: (filters: Record<string, any>) => void;

  /**
   * 清除所有筛选条件回调
   */
  onClearFilters?: () => void;

  /** 当前搜索关键词 */
  searchTerm?: string;

  /** 当前筛选条件 */
  activeFilters?: Record<string, any>;

  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 排序方向类型
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 排序配置接口
 */
export interface SortConfig {
  /** 排序字段 */
  sortBy: string;

  /** 排序方向 */
  sortOrder: SortOrder;
}
