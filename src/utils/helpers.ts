// 工具函数库（通用工具函数集合）
// 基于货船智能机舱管理系统工具函数架构

import { logger } from './logger';

/**
 * 通用工具函数集合
 */
export class Helpers {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * 深度合并对象
   */
  static deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key] as any, source[key] as any);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * 检查是否为对象
   */
  static isObject(item: any): item is object {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 检查是否为空值
   */
  static isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    immediate = false
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      const later = () => {
        timeoutId = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeoutId;
      
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(later, delay);
      
      if (callNow) func(...args);
    };
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, delay);
      }
    };
  }

  /**
   * 生成唯一ID
   */
  static generateId(prefix = ''): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * 格式化相对时间
   */
  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    if (seconds > 0) return `${seconds}秒前`;
    
    return '刚刚';
  }

  /**
   * 验证邮箱格式
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证手机号格式
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证密码强度
   */
  static validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isValid: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('密码长度至少8位');
    } else {
      score += 20;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('需要包含小写字母');
    } else {
      score += 20;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('需要包含大写字母');
    } else {
      score += 20;
    }

    if (!/\d/.test(password)) {
      feedback.push('需要包含数字');
    } else {
      score += 20;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('需要包含特殊字符');
    } else {
      score += 20;
    }

    return {
      score,
      feedback,
      isValid: score >= 80 && feedback.length === 0,
    };
  }

  /**
   * 数组去重
   */
  static unique<T>(array: T[], key?: keyof T): T[] {
    if (!key) {
      return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  /**
   * 数组分组
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 数组扁平化
   */
  static flatten<T>(array: T[]): T[] {
    return array.reduce((acc, val) => {
      return Array.isArray(val) ? [...acc, ...this.flatten(val)] : [...acc, val];
    }, [] as T[]);
  }

  /**
   * 数组洗牌
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 对象数组排序
   */
  static sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * 对象数组过滤
   */
  static filterBy<T>(array: T[], filters: Partial<Record<keyof T, any>>): T[] {
    return array.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key as keyof T] === value;
      });
    });
  }

  /**
   * 查找数组中的项目
   */
  static findBy<T>(array: T[], filters: Partial<Record<keyof T, any>>): T | null {
    return array.find(item => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key as keyof T] === value;
      }) || null;
    }) || null;
  }

  /**
   * 计算数组中数值的总和
   */
  static sumBy<T>(array: T[], key: keyof T): number {
    return array.reduce((sum, item) => {
      const value = item[key];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
  }

  /**
   * 计算数组中数值的平均值
   */
  static averageBy<T>(array: T[], key: keyof T): number {
    if (array.length === 0) return 0;
    return this.sumBy(array, key) / array.length;
  }

  /**
   * 日期格式化
   */
  static formatDate(date: Date | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
    const d = typeof date === 'number' ? new Date(date) : date;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 日期解析
   */
  static parseDate(dateString: string): Date | null {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * 获取日期范围
   */
  static getDateRange(days: number): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    return { start, end };
  }

  /**
   * 数字格式化
   */
  static formatNumber(num: number, decimals = 2): string {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * 百分比格式化
   */
  static formatPercentage(value: number, total: number, decimals = 1): string {
    if (total === 0) return '0%';
    const percentage = (value / total) * 100;
    return `${percentage.toFixed(decimals)}%`;
  }

  /**
   * 字节转换
   */
  static bytesToKB(bytes: number): number {
    return bytes / 1024;
  }

  static bytesToMB(bytes: number): number {
    return bytes / (1024 * 1024);
  }

  static bytesToGB(bytes: number): number {
    return bytes / (1024 * 1024 * 1024);
  }

  /**
   * 颜色工具
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  }

  /**
   * URL工具
   */
  static buildQueryString(params: Record<string, any>): string {
    const query = Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    return query ? `?${query}` : '';
  }

  static parseQueryString(queryString: string): Record<string, string> {
    const params: Record<string, string> = {};
    const urlParams = new URLSearchParams(queryString);
    
    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }
    
    return params;
  }

  /**
   * 本地存储工具
   */
  static setLocalStorage(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Failed to set localStorage item', error, { key });
    }
  }

  static getLocalStorage<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      logger.error('Failed to get localStorage item', error, { key });
      return defaultValue ?? null;
    }
  }

  static removeLocalStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to remove localStorage item', error, { key });
    }
  }

  /**
   * 会话存储工具
   */
  static setSessionStorage(key: string, value: any): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Failed to set sessionStorage item', error, { key });
    }
  }

  static getSessionStorage<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue ?? null;
    } catch (error) {
      logger.error('Failed to get sessionStorage item', error, { key });
      return defaultValue ?? null;
    }
  }

  static removeSessionStorage(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      logger.error('Failed to remove sessionStorage item', error, { key });
    }
  }

  /**
   * 复制到剪贴板
   */
  static async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // 备用方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        return true;
      }
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      return false;
    }
  }

  /**
   * 下载文件
   */
  static downloadFile(content: string, filename: string, contentType = 'text/plain'): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * 检查设备类型
   */
  static getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
    const userAgent = navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  /**
   * 检查浏览器支持
   */
  static checkBrowserSupport(features: string[]): { supported: string[]; unsupported: string[] } {
    const supported: string[] = [];
    const unsupported: string[] = [];

    features.forEach(feature => {
      try {
        switch (feature) {
          case 'localStorage':
            typeof Storage !== 'undefined' ? supported.push(feature) : unsupported.push(feature);
            break;
          case 'sessionStorage':
            typeof Storage !== 'undefined' ? supported.push(feature) : unsupported.push(feature);
            break;
          case 'webWorkers':
            typeof Worker !== 'undefined' ? supported.push(feature) : unsupported.push(feature);
            break;
          case 'geolocation':
            'geolocation' in navigator ? supported.push(feature) : unsupported.push(feature);
            break;
          case 'notifications':
            'Notification' in window ? supported.push(feature) : unsupported.push(feature);
            break;
          case 'serviceWorker':
            'serviceWorker' in navigator ? supported.push(feature) : unsupported.push(feature);
            break;
          default:
            unsupported.push(feature);
        }
      } catch (error) {
        unsupported.push(feature);
      }
    });

    return { supported, unsupported };
  }

  /**
   * 性能监控
   */
  static measurePerformance<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    logger.performance(name, endTime - startTime, 0);
    return result;
  }

  static async measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    logger.performance(name, endTime - startTime, 0);
    return result;
  }

  /**
   * 重试函数
   */
  static async retry<T>(
    fn: () => Promise<T>,
    attempts = 3,
    delay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i === attempts - 1) {
          throw lastError;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError!;
  }

  /**
   * 延迟函数
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 限制并发数
   */
  static async limitConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    // 分批执行任务
    for (let i = 0; i < tasks.length; i += limit) {
      const batch = tasks.slice(i, i + limit);
      const batchResults = await Promise.all(batch.map(task => task()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * 分批处理
   */
  static async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize = 10
  ): Promise<R[]> {
    const results: R[] = [];
    const batches = this.chunk(items, batchSize);

    for (const batch of batches) {
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 创建观察者
   */
  static createObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    return new IntersectionObserver(callback, options);
  }

  /**
   * 防抖输入
   */
  static debouncedInput(
    callback: (value: string) => void,
    delay = 300
  ): (event: Event) => void {
    return this.debounce((event: Event) => {
      const target = event.target as HTMLInputElement;
      callback(target.value);
    }, delay);
  }
}

// 导出便捷函数
export const {
  deepClone,
  deepMerge,
  isObject,
  isEmpty,
  debounce,
  throttle,
  generateId,
  formatFileSize,
  formatDuration,
  formatRelativeTime,
  isValidEmail,
  isValidPhone,
  validatePasswordStrength,
  unique,
  chunk,
  flatten,
  shuffle,
  sortBy,
  filterBy,
  findBy,
  sumBy,
  averageBy,
  formatDate,
  parseDate,
  getDateRange,
  formatNumber,
  formatPercentage,
  bytesToKB,
  bytesToMB,
  bytesToGB,
  hexToRgb,
  rgbToHex,
  buildQueryString,
  parseQueryString,
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  setSessionStorage,
  getSessionStorage,
  removeSessionStorage,
  copyToClipboard,
  downloadFile,
  getDeviceType,
  checkBrowserSupport,
  measurePerformance,
  measureAsyncPerformance,
  retry,
  delay,
  limitConcurrency,
  batchProcess,
  createObserver,
  debouncedInput,
} = Helpers;

export default Helpers;