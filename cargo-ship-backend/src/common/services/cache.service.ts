import { Injectable, Logger } from '@nestjs/common';

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  value: T;
  expireAt: number; // 过期时间戳
}

/**
 * 内存缓存服务
 *
 * 提供简单的内存缓存功能
 * - 键值对存储
 * - TTL过期机制
 * - 自动清理过期数据
 *
 * 注意：这是一个简单的内存缓存实现
 * 生产环境建议使用Redis等专业缓存系统
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  // 缓存存储
  private cache = new Map<string, CacheEntry<any>>();

  // 默认TTL（秒）
  private readonly DEFAULT_TTL = 300; // 5分钟

  // 最大缓存条目数
  private readonly MAX_ENTRIES = 1000;

  constructor() {
    // 定期清理过期缓存（每分钟）
    setInterval(() => {
      this.cleanExpiredEntries();
    }, 60 * 1000);

    this.logger.log('缓存服务已启动');
  }

  /**
   * 设置缓存
   *
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认5分钟
   */
  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    // 检查缓存大小限制
    if (this.cache.size >= this.MAX_ENTRIES && !this.cache.has(key)) {
      this.logger.warn('缓存已满，移除最旧的条目');
      this.removeOldestEntry();
    }

    const expireAt = Date.now() + ttl * 1000;

    this.cache.set(key, {
      value,
      expireAt,
    });

    this.logger.debug(`缓存已设置: ${key}, TTL=${ttl}秒`);
  }

  /**
   * 获取缓存
   *
   * @param key 缓存键
   * @returns 缓存值，如果不存在或已过期返回null
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.logger.debug(`缓存未命中: ${key}`);
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.logger.debug(`缓存已过期: ${key}`);
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`缓存命中: ${key}`);
    return entry.value as T;
  }

  /**
   * 删除缓存
   *
   * @param key 缓存键
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.logger.debug(`缓存已删除: ${key}`);
    }

    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.logger.log('所有缓存已清空');
  }

  /**
   * 检查缓存是否存在
   *
   * @param key 缓存键
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    totalKeys: number;
    memoryUsage: number;
  } {
    return {
      totalKeys: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * 使用缓存包装函数
   *
   * 如果缓存存在则返回缓存值，否则执行函数并缓存结果
   *
   * @param key 缓存键
   * @param fn 获取数据的函数
   * @param ttl 过期时间（秒）
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL,
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    // 执行函数获取数据
    const result = await fn();

    // 缓存结果
    this.set(key, result, ttl);

    return result;
  }

  /**
   * 批量删除缓存（通过前缀）
   *
   * @param prefix 键前缀
   */
  deleteByPrefix(prefix: string): number {
    let count = 0;

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.logger.log(`批量删除缓存: ${prefix}*, 共${count}条`);
    }

    return count;
  }

  /**
   * 清理过期的缓存条目
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireAt) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.logger.debug(`清理过期缓存: ${count}条`);
    }
  }

  /**
   * 移除最旧的缓存条目
   */
  private removeOldestEntry(): void {
    const firstKey = this.cache.keys().next().value;

    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }

  /**
   * 估算内存使用量（MB）
   */
  private estimateMemoryUsage(): number {
    // 简化估算：假设每个条目平均1KB
    return Math.round((this.cache.size * 1024) / 1024 / 1024);
  }
}
