import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceMonitorService } from '../services/performance-monitor.service';

/**
 * 性能监控拦截器
 *
 * 自动记录API请求的性能指标
 * - 请求响应时间
 * - 请求成功/失败统计
 * - 慢请求检测
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;

          // 记录成功请求
          this.performanceMonitor.recordApiRequest(true, responseTime);

          this.logger.debug(`${method} ${url} - ${responseTime}ms`);
        },
        error: () => {
          const responseTime = Date.now() - startTime;

          // 记录失败请求
          this.performanceMonitor.recordApiRequest(false, responseTime);

          this.logger.debug(`${method} ${url} - ${responseTime}ms (错误)`);
        },
      }),
    );
  }
}
