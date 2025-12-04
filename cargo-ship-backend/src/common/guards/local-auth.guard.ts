/**
 * 本地认证守卫（用户名密码登录）
 *
 * 描述：使用用户名和密码验证用户身份的守卫
 *
 * 功能：
 * - 从请求体中提取用户名和密码
 * - 调用LocalStrategy进行身份验证
 * - 验证成功后将用户对象注入到request.user
 *
 * 使用场景：
 * - 用户登录接口
 * - 任何需要用户名密码验证的场景
 *
 * 工作流程：
 * 1. 从POST请求体中提取username和password
 * 2. 调用LocalStrategy的validate方法
 * 3. LocalStrategy调用AuthService.validateUser验证
 * 4. 验证成功，返回用户对象
 * 5. 验证失败，抛出UnauthorizedException
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 本地认证守卫类
 *
 * 继承自Passport的AuthGuard('local')
 * 使用local策略进行用户名密码验证
 *
 * @example
 * // 在登录接口使用
 * @Public()
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * async login(@CurrentUser() user: User, @Req() req: Request) {
 *   // 此时user已经通过验证，可以生成JWT令牌
 *   return this.authService.login(user, req.ip, req.headers['user-agent']);
 * }
 */
import { BadRequestException } from '@nestjs/common';
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  /**
   * 处理请求
   * 在调用父类的canActivate之前，先检查必填字段
   */
  canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    const { username, password } = request.body || {};

    // 如果缺少必填字段，抛出BadRequestException
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    return super.canActivate(context);
  }
}
