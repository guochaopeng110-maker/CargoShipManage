import { Controller, Get, UseGuards } from '@nestjs/common';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { CacheService } from '../services/cache.service';
import { WebsocketGateway } from '../../modules/websocket/websocket.gateway';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';

/**
 * 监控控制器
 *
 * 提供系统监控和性能指标API
 * 仅限管理员访问
 */
@Controller('api/systemmonitoring')
@UseGuards(RolesGuard)
@Roles('administrator')
export class SystemMonitoringController {
  constructor(
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly cacheService: CacheService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * 获取性能指标
   */
  @Get('metrics')
  async getMetrics() {
    const metrics = await this.performanceMonitor.getMetrics();
    const cacheStats = this.cacheService.getStats();

    // 补充WebSocket统计
    metrics.websocket.totalConnections =
      this.websocketGateway.getTotalConnectionCount();
    metrics.websocket.onlineUsers = this.websocketGateway.getOnlineUserCount();

    // 补充缓存统计
    metrics.cache.totalKeys = cacheStats.totalKeys;
    metrics.cache.memoryUsage = cacheStats.memoryUsage;

    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * 获取性能摘要
   */
  @Get('summary')
  async getPerformanceSummary() {
    const summary = await this.performanceMonitor.getPerformanceSummary();

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * 获取WebSocket连接详情
   */
  @Get('websocket')
  getWebSocketStatus() {
    return {
      success: true,
      data: {
        totalConnections: this.websocketGateway.getTotalConnectionCount(),
        onlineUsers: this.websocketGateway.getOnlineUserCount(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * 获取缓存统计
   */
  @Get('cache')
  getCacheStats() {
    const stats = this.cacheService.getStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 清空缓存
   */
  @Get('cache/clear')
  clearCache() {
    this.cacheService.clear();

    return {
      success: true,
      message: '缓存已清空',
    };
  }

  /**
   * 健康检查
   */
  @Get('health')
  async healthCheck() {
    const summary = await this.performanceMonitor.getPerformanceSummary();

    return {
      success: true,
      data: {
        status: summary.status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
