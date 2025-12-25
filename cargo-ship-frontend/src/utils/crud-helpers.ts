// CRUD通用工具函数
// 为CRUD页面提供常用的辅助功能
//
// 功能说明：
// - 防抖搜索Hook
// - 分页计算函数
// - 数据排序辅助函数
// - 其他通用工具函数

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 防抖搜索Hook
 *
 * 提供防抖功能的搜索输入处理
 * 在用户停止输入一段时间后才触发搜索
 *
 * @param callback 搜索回调函数
 * @param delay 防抖延迟时间（毫秒），默认300ms
 * @returns 包含搜索值、设置函数和加载状态的对象
 *
 * @example
 * ```tsx
 * const { searchTerm, setSearchTerm, isSearching } = useDebouncedSearch(
 *   (term) => fetchItems({ search: term }),
 *   300
 * );
 * ```
 */
export function useDebouncedSearch(
  callback: (value: string) => void,
  delay: number = 300
) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果搜索词为空，立即执行
    if (searchTerm === '') {
      setIsSearching(false);
      callback('');
      return;
    }

    // 设置新的定时器
    setIsSearching(true);
    timeoutRef.current = setTimeout(() => {
      callback(searchTerm);
      setIsSearching(false);
    }, delay);

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchTerm, callback, delay]);

  return { searchTerm, setSearchTerm, isSearching };
}

/**
 * 分页计算函数
 *
 * 根据总条数和每页条数计算分页信息
 *
 * @param total 数据总条数
 * @param page 当前页码（从1开始）
 * @param pageSize 每页条数
 * @returns 分页信息对象
 *
 * @example
 * ```tsx
 * const pagination = calculatePagination(100, 2, 20);
 * // { totalPages: 5, startIndex: 20, endIndex: 39, hasNext: true, hasPrev: true }
 * ```
 */
export function calculatePagination(
  total: number,
  page: number,
  pageSize: number
) {
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, total - 1);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNext,
    hasPrev,
  };
}

/**
 * 数据排序函数
 *
 * 对数据数组进行排序
 * 支持字符串、数字、日期等类型的排序
 *
 * @template T 数据项类型
 * @param data 要排序的数据数组
 * @param sortBy 排序字段
 * @param sortOrder 排序方向
 * @returns 排序后的新数组
 *
 * @example
 * ```tsx
 * const sorted = sortData(items, 'createdAt', 'desc');
 * ```
 */
export function sortData<T>(
  data: T[],
  sortBy: keyof T,
  sortOrder: 'asc' | 'desc'
): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // 处理null和undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // 数字比较
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // 日期比较
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortOrder === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // 字符串比较
    const aString = String(aValue).toLowerCase();
    const bString = String(bValue).toLowerCase();

    if (sortOrder === 'asc') {
      return aString.localeCompare(bString, 'zh-CN');
    } else {
      return bString.localeCompare(aString, 'zh-CN');
    }
  });
}

/**
 * 数据筛选函数
 *
 * 根据筛选条件对数据进行筛选
 * 支持多个筛选条件的组合
 *
 * @template T 数据项类型
 * @param data 要筛选的数据数组
 * @param filters 筛选条件对象
 * @returns 筛选后的新数组
 *
 * @example
 * ```tsx
 * const filtered = filterData(items, { status: 'active', type: 'sensor' });
 * ```
 */
export function filterData<T>(
  data: T[],
  filters: Record<string, any>
): T[] {
  return data.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      // 跳过undefined、null或空字符串的筛选条件
      if (value === undefined || value === null || value === '') {
        return true;
      }

      const itemValue = (item as any)[key];

      // 数组类型的筛选值（用于多选筛选）
      if (Array.isArray(value)) {
        return value.length === 0 || value.includes(itemValue);
      }

      // 字符串模糊匹配
      if (typeof value === 'string' && typeof itemValue === 'string') {
        return itemValue.toLowerCase().includes(value.toLowerCase());
      }

      // 精确匹配
      return itemValue === value;
    });
  });
}

/**
 * 搜索数据函数
 *
 * 在多个字段中搜索关键词
 *
 * @template T 数据项类型
 * @param data 要搜索的数据数组
 * @param searchTerm 搜索关键词
 * @param searchFields 要搜索的字段列表
 * @returns 搜索结果数组
 *
 * @example
 * ```tsx
 * const results = searchData(items, 'pump', ['deviceName', 'deviceType', 'location']);
 * ```
 */
export function searchData<T>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return data;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();

  return data.filter((item) => {
    return searchFields.some((field) => {
      const value = item[field];
      if (value == null) return false;

      return String(value).toLowerCase().includes(lowerSearchTerm);
    });
  });
}

/**
 * 格式化日期时间
 *
 * 将时间戳转换为易读的日期时间字符串
 *
 * @param timestamp 时间戳（毫秒）
 * @param format 格式类型
 * @returns 格式化后的日期时间字符串
 *
 * @example
 * ```tsx
 * formatDateTime(1672531200000, 'datetime') // "2023-01-01 08:00:00"
 * formatDateTime(1672531200000, 'date') // "2023-01-01"
 * formatDateTime(1672531200000, 'time') // "08:00:00"
 * ```
 */
export function formatDateTime(
  timestamp: number,
  format: 'datetime' | 'date' | 'time' | 'relative' = 'datetime'
): string {
  const date = new Date(timestamp);

  if (format === 'relative') {
    return formatRelativeTime(timestamp);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (format) {
    case 'date':
      return `${year}-${month}-${day}`;
    case 'time':
      return `${hours}:${minutes}:${seconds}`;
    case 'datetime':
    default:
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * 格式化相对时间
 *
 * 将时间戳转换为相对时间描述（如"刚刚"、"3分钟前"等）
 *
 * @param timestamp 时间戳（毫秒）
 * @returns 相对时间字符串
 *
 * @example
 * ```tsx
 * formatRelativeTime(Date.now() - 30000) // "刚刚"
 * formatRelativeTime(Date.now() - 180000) // "3分钟前"
 * ```
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return formatDateTime(timestamp, 'date');
  }
}

/**
 * 截断文本
 *
 * 如果文本超过指定长度，则截断并添加省略号
 *
 * @param text 要截断的文本
 * @param maxLength 最大长度
 * @param suffix 后缀（默认为"..."）
 * @returns 截断后的文本
 *
 * @example
 * ```tsx
 * truncateText("这是一段很长的文本", 10) // "这是一段很长的..."
 * ```
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 生成页码数组
 *
 * 生成分页组件使用的页码数组
 * 支持省略号显示
 *
 * @param currentPage 当前页码
 * @param totalPages 总页数
 * @param maxVisible 最多显示的页码按钮数量
 * @returns 页码数组（包含数字和'...'）
 *
 * @example
 * ```tsx
 * generatePageNumbers(5, 10, 7) // [1, '...', 4, 5, 6, '...', 10]
 * ```
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | '...')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const halfVisible = Math.floor((maxVisible - 2) / 2);

  // 始终显示第一页
  pages.push(1);

  if (currentPage <= halfVisible + 1) {
    // 当前页靠近开始
    for (let i = 2; i <= maxVisible - 1; i++) {
      pages.push(i);
    }
    pages.push('...');
  } else if (currentPage >= totalPages - halfVisible) {
    // 当前页靠近结束
    pages.push('...');
    for (let i = totalPages - (maxVisible - 2); i < totalPages; i++) {
      pages.push(i);
    }
  } else {
    // 当前页在中间
    pages.push('...');
    for (let i = currentPage - halfVisible; i <= currentPage + halfVisible; i++) {
      pages.push(i);
    }
    pages.push('...');
  }

  // 始终显示最后一页
  pages.push(totalPages);

  return pages;
}

/**
 * 深度克隆对象
 *
 * 使用JSON方法进行深度克隆
 * 注意：不支持函数、Symbol等特殊类型
 *
 * @template T 对象类型
 * @param obj 要克隆的对象
 * @returns 克隆后的新对象
 *
 * @example
 * ```tsx
 * const cloned = deepClone(originalObject);
 * ```
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 等待指定时间
 *
 * 返回一个Promise，在指定时间后resolve
 * 用于测试或模拟延迟
 *
 * @param ms 等待时间（毫秒）
 * @returns Promise
 *
 * @example
 * ```tsx
 * await sleep(1000); // 等待1秒
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 数组去重
 *
 * 根据指定字段对数组进行去重
 *
 * @template T 数组项类型
 * @param array 要去重的数组
 * @param key 用于比较的字段（可选，不提供则直接比较值）
 * @returns 去重后的新数组
 *
 * @example
 * ```tsx
 * uniqueBy([{id: 1}, {id: 2}, {id: 1}], 'id') // [{id: 1}, {id: 2}]
 * ```
 */
export function uniqueBy<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return Array.from(new Set(array));
  }

  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
