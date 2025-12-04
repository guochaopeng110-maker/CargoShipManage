/**
 * 货船智能机舱管理系统 - 缓存管理工具
 * 
 * 功能说明：
 * 1. 提供简单的内存缓存机制
 * 2. 支持过期时间设置
 * 3. 提供缓存清理和统计功能
 * 4. 支持序列化和反序列化
 * 
 * @version 1.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-01
 */

// 缓存项接口
interface CacheItem<T> {
  data: T;           // 缓存的数据
  timestamp: number;   // 缓存时间戳
  ttl: number;        // 生存时间（毫秒）
}

// 缓存统计接口
interface CacheStats {
  size: number;        // 缓存项数量
  hitCount: number;    // 命中次数
  missCount: number;   // 未命中次数
  hitRate: number;     // 命中率
}

/**
 * 简单的内存缓存管理器
 */
class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private stats = {
    hitCount: 0,
    missCount: 0,
  };

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 生存时间（毫秒），默认5分钟
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, item);
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回null
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.missCount++;
      return null;
    }

    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.missCount++;
      return null;
    }

    this.stats.hitCount++;
    return item.data;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查缓存项是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // 检查是否过期
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
  }

  /**
   * 清理过期的缓存项
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hitCount + this.stats.missCount;
    return {
      size: this.cache.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate: total > 0 ? (this.stats.hitCount / total) * 100 : 0,
    };
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小
   * @returns 缓存项数量
   */
  size(): number {
    return this.cache.size;
  }
}

// 创建全局缓存实例
const globalCache = new MemoryCache();

/**
 * 缓存工具函数
 */
export const cacheUtils = {
  /**
   * 设置缓存
   */
  set: <T>(key: string, data: T, ttl?: number): void => {
    globalCache.set(key, data, ttl);
  },

  /**
   * 获取缓存
   */
  get: <T>(key: string): T | null => {
    return globalCache.get<T>(key);
  },

  /**
   * 删除缓存
   */
  delete: (key: string): boolean => {
    return globalCache.delete(key);
  },

  /**
   * 检查缓存是否存在
   */
  has: (key: string): boolean => {
    return globalCache.has(key);
  },

  /**
   * 清空缓存
   */
  clear: (): void => {
    globalCache.clear();
  },

  /**
   * 清理过期缓存
   */
  cleanup: (): number => {
    return globalCache.cleanup();
  },

  /**
   * 获取缓存统计
   */
  getStats: (): CacheStats => {
    return globalCache.getStats();
  },

  /**
   * 获取所有缓存键
   */
  keys: (): string[] => {
    return globalCache.keys();
  },

  /**
   * 获取缓存大小
   */
  size: (): number => {
    return globalCache.size();
  },
};

/**
 * 告警数据专用缓存工具
 */
export const alarmCache = {
  /**
   * 缓存告警列表
   */
  setAlarms: (alarms: any[], ttl: number = 5 * 60 * 1000): void => {
    cacheUtils.set('alarms_list', alarms, ttl);
  },

  /**
   * 获取缓存的告警列表
   */
  getAlarms: (): any[] | null => {
    return cacheUtils.get('alarms_list');
  },

  /**
   * 缓存告警统计
   */
  setStatistics: (stats: any, ttl: number = 10 * 60 * 1000): void => {
    cacheUtils.set('alarms_statistics', stats, ttl);
  },

  /**
   * 获取缓存的告警统计
   */
  getStatistics: (): any | null => {
    return cacheUtils.get('alarms_statistics');
  },

  /**
   * 缓存告警趋势
   */
  setTrends: (trends: any, ttl: number = 15 * 60 * 1000): void => {
    cacheUtils.set('alarms_trends', trends, ttl);
  },

  /**
   * 获取缓存的告警趋势
   */
  getTrends: (): any | null => {
    return cacheUtils.get('alarms_trends');
  },

  /**
   * 清理告警相关缓存
   */
  clear: (): void => {
    cacheUtils.delete('alarms_list');
    cacheUtils.delete('alarms_statistics');
    cacheUtils.delete('alarms_trends');
  },
};

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  const cleaned = cacheUtils.cleanup();
  if (cleaned > 0) {
    console.log(`清理了 ${cleaned} 个过期缓存项`);
  }
}, 5 * 60 * 1000);

export default MemoryCache;