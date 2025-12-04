import { Module, Global } from '@nestjs/common';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { CacheService } from './services/cache.service';
import { SystemMonitoringController } from './controllers/systemmonitoring.controller';
import { WebsocketModule } from '../modules/websocket/websocket.module';

/**
 * 公共模块
 *
 * 提供全局可用的服务和工具
 * - 性能监控服务
 * - 缓存服务
 * - 监控控制器
 */
@Global() // 设置为全局模块，其他模块无需导入即可使用
@Module({
  imports: [WebsocketModule],
  controllers: [SystemMonitoringController],
  providers: [PerformanceMonitorService, CacheService],
  exports: [PerformanceMonitorService, CacheService], // 导出供其他模块使用
})
export class CommonModule {}
