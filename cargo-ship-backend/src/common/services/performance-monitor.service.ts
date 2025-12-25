import { Injectable, Logger } from '@nestjs/common';

/**
 * 性能指标数据接口
 */
export interface PerformanceMetrics {
  // WebSocket连接指标
  websocket: {
    totalConnections: number;
    onlineUsers: number;
    messagesSent: number;
    messagesReceived: number;
    averageLatency: number; // 毫秒
  };

  // API请求指标
  api: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    averageResponseTime: number; // 毫秒
  };

  // 数据库查询指标
  database: {
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number; // 毫秒
    connectionPoolSize: number;
    activeConnections: number;
  };

  // 缓存指标
  cache: {
    hits: number;
    misses: number;
    hitRate: number; // 百分比
    totalKeys: number;
    memoryUsage: number; // MB
  };

  // 系统资源指标
  system: {
    cpuUsage: number; // 百分比
    memoryUsage: number; // MB
    memoryTotal: number; // MB
    uptime: number; // 秒
  };

  // 业务指标
  business: {
    totalEquipment: number;
    onlineEquipment: number;
    activeAlarms: number;
    dataPointsToday: number;
  };

  timestamp: Date;
}

/**
 * 性能监控服务
 *
 * 收集和管理系统性能指标
 * - WebSocket连接统计
 * - API请求统计
 * - 数据库查询统计
 * - 缓存命中率
 * - 系统资源使用
 */
@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);

  // 性能指标计数器
  private metrics = {
    websocket: {
      messagesSent: 0,
      messagesReceived: 0,
      latencies: [] as number[],
    },
    api: {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[],
    },
    database: {
      totalQueries: 0,
      slowQueries: 0,
      queryTimes: [] as number[],
    },
    cache: {
      hits: 0,
      misses: 0,
    },
  };

  // 慢查询阈值（毫秒）
  private readonly SLOW_QUERY_THRESHOLD = 1000;

  // 慢请求阈值（毫秒）
  private readonly SLOW_REQUEST_THRESHOLD = 500;

  // 批量推送指标
  private batchPushMetrics = {
    totalBatches: 0,
    totalRecords: 0,
    totalChunks: 0,
    durations: [] as number[],
  };

  constructor() {
    // 定期重置统计数据（每小时）
    setInterval(
      () => {
        this.resetMetrics();
      },
      60 * 60 * 1000,
    );

    this.logger.log('性能监控服务已启动');
  }

  /**
   * 记录WebSocket消息发送
   */
  recordWebSocketMessageSent() {
    this.metrics.websocket.messagesSent++;
  }

  /**
   * 记录WebSocket消息接收
   */
  recordWebSocketMessageReceived() {
    this.metrics.websocket.messagesReceived++;
  }

  /**
   * 记录WebSocket延迟
   */
  recordWebSocketLatency(latency: number) {
    this.metrics.websocket.latencies.push(latency);

    // 只保留最近1000条记录
    if (this.metrics.websocket.latencies.length > 1000) {
      this.metrics.websocket.latencies.shift();
    }
  }

  /**
   * 记录API请求
   */
  recordApiRequest(success: boolean, responseTime: number) {
    this.metrics.api.totalRequests++;

    if (success) {
      this.metrics.api.successRequests++;
    } else {
      this.metrics.api.failedRequests++;
    }

    this.metrics.api.responseTimes.push(responseTime);

    // 只保留最近1000条记录
    if (this.metrics.api.responseTimes.length > 1000) {
      this.metrics.api.responseTimes.shift();
    }

    // 记录慢请求
    if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
      this.logger.warn(`检测到慢请求: ${responseTime.toFixed(2)}ms`);
    }
  }

  /**
   * 记录数据库查询
   */
  recordDatabaseQuery(queryTime: number) {
    this.metrics.database.totalQueries++;

    this.metrics.database.queryTimes.push(queryTime);

    // 只保留最近1000条记录
    if (this.metrics.database.queryTimes.length > 1000) {
      this.metrics.database.queryTimes.shift();
    }

    // 记录慢查询
    if (queryTime > this.SLOW_QUERY_THRESHOLD) {
      this.metrics.database.slowQueries++;
      this.logger.warn(`检测到慢查询: ${queryTime.toFixed(2)}ms`);
    }
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  /**
   * 记录批量推送操作
   * @param recordCount 数据记录数
   * @param chunkCount 分片数量
   * @param duration 推送耗时 (ms)
   */
  recordBatchPush(recordCount: number, chunkCount: number, duration: number) {
    this.batchPushMetrics.totalBatches++;
    this.batchPushMetrics.totalRecords += recordCount;
    this.batchPushMetrics.totalChunks += chunkCount;
    this.batchPushMetrics.durations.push(duration);

    // 只保留最近 1000 条记录
    if (this.batchPushMetrics.durations.length > 1000) {
      this.batchPushMetrics.durations.shift();
    }

    // 记录慢推送 (超过 1 秒)
    if (duration > 1000) {
      this.logger.warn(
        `检测到慢推送: 数据量=${recordCount}, 分片数=${chunkCount}, 耗时=${duration}ms`,
      );
    }
  }

  /**
   * 获取批量推送指标
   */
  getBatchPushMetrics() {
    const avgDuration = this.calculateAverage(this.batchPushMetrics.durations);
    const slowPushCount = this.batchPushMetrics.durations.filter(
      (d) => d > 1000,
    ).length;

    return {
      totalBatches: this.batchPushMetrics.totalBatches,
      totalRecords: this.batchPushMetrics.totalRecords,
      totalChunks: this.batchPushMetrics.totalChunks,
      averageDuration: avgDuration,
      slowPushCount,
      slowPushRate:
        this.batchPushMetrics.durations.length > 0
          ? (slowPushCount / this.batchPushMetrics.durations.length) * 100
          : 0,
    };
  }

  /**
   * 获取当前性能指标
   */
  async getMetrics(): Promise<PerformanceMetrics> {
    const memUsage = process.memoryUsage();

    return {
      websocket: {
        totalConnections: 0, // 需要从WebSocket网关获取
        onlineUsers: 0, // 需要从WebSocket网关获取
        messagesSent: this.metrics.websocket.messagesSent,
        messagesReceived: this.metrics.websocket.messagesReceived,
        averageLatency: this.calculateAverage(this.metrics.websocket.latencies),
      },
      api: {
        totalRequests: this.metrics.api.totalRequests,
        successRequests: this.metrics.api.successRequests,
        failedRequests: this.metrics.api.failedRequests,
        averageResponseTime: this.calculateAverage(
          this.metrics.api.responseTimes,
        ),
      },
      database: {
        totalQueries: this.metrics.database.totalQueries,
        slowQueries: this.metrics.database.slowQueries,
        averageQueryTime: this.calculateAverage(
          this.metrics.database.queryTimes,
        ),
        connectionPoolSize: 10, // 需要从TypeORM配置获取
        activeConnections: 0, // 需要从TypeORM获取
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        hitRate: this.calculateHitRate(),
        totalKeys: 0, // 需要从Redis获取
        memoryUsage: 0, // 需要从Redis获取
      },
      system: {
        cpuUsage: 0, // 需要使用os模块获取
        memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        uptime: Math.round(process.uptime()),
      },
      business: {
        totalEquipment: 0, // 需要从数据库查询
        onlineEquipment: 0, // 需要从数据库查询
        activeAlarms: 0, // 需要从数据库查询
        dataPointsToday: 0, // 需要从数据库查询
      },
      timestamp: new Date(),
    };
  }

  /**
   * 获取性能摘要
   */
  async getPerformanceSummary(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查API性能
    if (metrics.api.averageResponseTime > this.SLOW_REQUEST_THRESHOLD) {
      issues.push(
        `API平均响应时间过高: ${metrics.api.averageResponseTime.toFixed(2)}ms`,
      );
      recommendations.push('考虑优化数据库查询或添加缓存');
    }

    // 检查数据库性能
    const slowQueryRate =
      metrics.database.totalQueries > 0
        ? (metrics.database.slowQueries / metrics.database.totalQueries) * 100
        : 0;

    if (slowQueryRate > 5) {
      issues.push(`慢查询比例过高: ${slowQueryRate.toFixed(2)}%`);
      recommendations.push('优化慢查询SQL，添加索引');
    }

    // 检查缓存命中率
    if (
      metrics.cache.hitRate < 80 &&
      metrics.cache.hits + metrics.cache.misses > 100
    ) {
      issues.push(`缓存命中率偏低: ${metrics.cache.hitRate.toFixed(2)}%`);
      recommendations.push('调整缓存策略，增加缓存时间');
    }

    // 检查内存使用
    const memoryUsagePercent =
      (metrics.system.memoryUsage / metrics.system.memoryTotal) * 100;

    if (memoryUsagePercent > 80) {
      issues.push(`内存使用率过高: ${memoryUsagePercent.toFixed(2)}%`);
      recommendations.push('检查内存泄漏，优化内存使用');
    }

    // 确定整体状态
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (issues.length > 0) {
      status = 'warning';
    }

    if (issues.length > 3 || memoryUsagePercent > 90) {
      status = 'critical';
    }

    return {
      status,
      issues,
      recommendations,
    };
  }

  /**
   * 重置指标
   */
  private resetMetrics() {
    this.logger.log('重置性能指标');

    this.metrics = {
      websocket: {
        messagesSent: 0,
        messagesReceived: 0,
        latencies: [],
      },
      api: {
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        responseTimes: [],
      },
      database: {
        totalQueries: 0,
        slowQueries: 0,
        queryTimes: [],
      },
      cache: {
        hits: 0,
        misses: 0,
      },
    };

    // 重置批量推送指标
    this.batchPushMetrics = {
      totalBatches: 0,
      totalRecords: 0,
      totalChunks: 0,
      durations: [],
    };
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  /**
   * 计算缓存命中率
   */
  private calculateHitRate(): number {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    if (total === 0) return 0;
    return Math.round((this.metrics.cache.hits / total) * 10000) / 100;
  }
}
