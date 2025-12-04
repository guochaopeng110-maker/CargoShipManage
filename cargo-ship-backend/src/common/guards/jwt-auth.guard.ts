/**
 * JWT认证守卫
 *
 * 描述：基于JWT令牌验证用户身份的守卫
 *
 * 功能：
 * - 验证请求中的JWT令牌
 * - 支持@Public()装饰器标记的公开接口
 * - 自动将用户信息注入到request对象
 * - 处理认证失败情况
 *
 * 使用方式：
 * - 全局守卫：在AppModule中配置APP_GUARD
 * - 路由守卫：@UseGuards(JwtAuthGuard)
 * - 跳过认证：@Public()
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT认证守卫类
 *
 * 继承自Passport的AuthGuard('jwt')
 * 扩展了对公开路由的支持
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 判断请求是否可以通过
   *
   * 执行流程：
   * 1. 检查是否为公开路由（@Public()装饰器）
   * 2. 如果是公开路由，直接放行
   * 3. 如果不是公开路由，调用JWT验证逻辑
   *
   * @param context - 执行上下文，包含请求、响应等信息
   * @returns true表示通过，false或抛出异常表示拒绝
   *
   * @example
   * // 在控制器方法上使用
   * @UseGuards(JwtAuthGuard)
   * @Get('profile')
   * getProfile(@CurrentUser() user: User) {
   *   return user;
   * }
   *
   * // 标记为公开接口，跳过JWT验证
   * @Public()
   * @Post('login')
   * login(@Body() loginDto: LoginDto) {
   *   return this.authService.login(loginDto);
   * }
   */
  canActivate(context: ExecutionContext) {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 方法级装饰器
      context.getClass(), // 类级装饰器
    ]);

    // 公开接口直接放行
    if (isPublic) {
      return true;
    }

    // 非公开接口，执行JWT验证
    return super.canActivate(context);
  }

  /**
   * 处理认证结果
   *
   * 功能：
   * - 在Passport验证完成后调用
   * - 处理验证成功或失败的情况
   * - 返回用户对象或抛出异常
   *
   * @param err - 验证过程中的错误
   * @param user - 验证成功后的用户对象
   * @returns 用户对象（将被注入到request.user）
   * @throws UnauthorizedException 如果认证失败
   */
  handleRequest(err: any, user: any) {
    // 如果有错误或用户对象不存在，抛出认证异常
    if (err || !user) {
      throw err || new UnauthorizedException('未授权访问');
    }
    return user;
  }
}
