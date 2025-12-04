/**
 * 本地认证策略（用户名密码登录）
 *
 * 描述：实现基于用户名和密码的身份验证策略
 *
 * 功能：
 * - 从请求体中提取用户名和密码
 * - 调用AuthService验证凭据
 * - 处理登录失败和账户锁定逻辑
 * - 验证成功后返回用户对象
 *
 * 配置：
 * - usernameField: 用户名字段名（默认'username'）
 * - passwordField: 密码字段名（默认'password'）
 *
 * 工作流程：
 * 1. LocalAuthGuard触发本地认证
 * 2. 从请求体提取username和password
 * 3. 调用validate方法验证凭据
 * 4. AuthService.validateUser执行实际验证
 * 5. 返回用户对象，注入到request.user
 *
 * 使用场景：
 * - 用户登录接口
 * - 任何需要用户名密码验证的场景
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { User } from '../../../database/entities/user.entity';

/**
 * 本地策略类
 *
 * 继承Passport的Local策略，实现用户名密码验证
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  /**
   * 构造函数
   *
   * 配置本地策略选项：
   * - usernameField: 从请求体中提取的用户名字段
   * - passwordField: 从请求体中提取的密码字段
   *
   * 请求体示例：
   * {
   *   "username": "john_doe",
   *   "password": "Password123!"
   * }
   *
   * @param authService - 认证服务，提供用户验证方法
   */
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'username',
      passwordField: 'password',
    });
  }

  /**
   * 验证用户凭据
   *
   * 验证流程：
   * 1. Passport自动从请求体提取username和password
   * 2. 调用AuthService.validateUser验证凭据
   * 3. validateUser内部执行：
   *    - 查询用户
   *    - 检查账户状态（锁定、活跃）
   *    - 验证密码
   *    - 处理登录失败次数
   *    - 必要时锁定账户
   * 4. 返回用户对象或抛出异常
   *
   * 安全特性：
   * - 密码使用bcrypt验证（慢哈希，抗暴力破解）
   * - 登录失败计数器
   * - 达到阈值自动锁定账户
   * - 锁定时间限制（30分钟）
   *
   * @param username - 用户名（从请求体提取）
   * @param password - 密码（从请求体提取）
   * @returns 验证成功的用户对象（将被注入到request.user）
   * @throws UnauthorizedException 如果凭据无效
   *
   * @example
   * // 在控制器中使用
   * @Public()
   * @UseGuards(LocalAuthGuard)
   * @Post('login')
   * async login(@CurrentUser() user: User) {
   *   // user已经通过LocalStrategy验证
   *   // 可以生成JWT令牌并返回
   *   return this.authService.login(user, req.ip, req.headers['user-agent']);
   * }
   */
  async validate(username: string, password: string): Promise<User> {
    // 调用AuthService验证用户凭据
    const user = await this.authService.validateUser(username, password);

    // 如果验证失败（用户不存在或密码错误），抛出异常
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证成功，返回用户对象
    return user;
  }
}
