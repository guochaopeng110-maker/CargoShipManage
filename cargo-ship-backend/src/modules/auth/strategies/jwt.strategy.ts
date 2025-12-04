/**
 * JWT认证策略
 *
 * 描述：实现基于JWT令牌的身份验证策略
 *
 * 功能：
 * - 从HTTP请求头中提取JWT令牌
 * - 验证令牌的有效性和签名
 * - 解析令牌载荷并验证用户状态
 * - 将验证后的用户对象注入到request.user
 *
 * 配置：
 * - 令牌提取方式：Bearer Token（从Authorization头）
 * - 令牌验证：使用配置的密钥验证签名
 * - 过期检查：自动检查令牌是否过期
 *
 * 工作流程：
 * 1. JwtAuthGuard触发JWT验证
 * 2. 从请求头提取Bearer Token
 * 3. 验证令牌签名和过期时间
 * 4. 调用validate方法验证用户状态
 * 5. 返回用户对象，注入到request.user
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../../database/entities/user.entity';

/**
 * JWT载荷接口
 *
 * 定义JWT令牌中包含的数据结构
 */
export interface JwtPayload {
  /** 用户ID（subject标准字段） */
  sub: string;
  /** 用户名 */
  username: string;
  /** 邮箱地址 */
  email: string;
  /** 用户角色列表 */
  roles: string[];
  /** 用户权限列表 */
  permissions: string[];
  /** 令牌签发时间（issued at，可选） */
  iat?: number;
  /** 令牌过期时间（expiration，可选） */
  exp?: number;
}

/**
 * JWT策略类
 *
 * 继承Passport的JWT策略，实现令牌验证逻辑
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * 构造函数
   *
   * 配置JWT验证选项：
   * - jwtFromRequest: 从Authorization头提取Bearer Token
   * - ignoreExpiration: false（不忽略过期时间）
   * - secretOrKey: 用于验证签名的密钥
   *
   * @param configService - 配置服务，读取JWT密钥
   * @param userRepository - 用户仓库，查询用户信息
   */
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 自定义提取器，严格验证 Bearer token 格式
        (request) => {
          const authHeader = request.headers?.authorization;
          if (!authHeader) {
            return null;
          }
          // 严格验证格式：必须是 "Bearer <token>"，中间只能有一个空格
          const bearerMatch = /^Bearer\s([^\s]+)$/.exec(authHeader);
          if (!bearerMatch) {
            return null;
          }
          return bearerMatch[1];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.secret') || 'default-secret-key',
    });
  }

  /**
   * 验证JWT载荷并返回用户对象
   *
   * 验证流程：
   * 1. JWT签名和过期时间已由Passport自动验证
   * 2. 从数据库查询用户（包含角色和权限）
   * 3. 检查用户是否存在
   * 4. 检查用户账户状态（锁定、激活等）
   * 5. 如果锁定已过期，自动解锁
   * 6. 返回用户对象
   *
   * 安全检查：
   * - 用户是否存在
   * - 账户是否被锁定
   * - 锁定是否已过期
   * - 账户是否处于活跃状态
   *
   * @param payload - JWT载荷，已由Passport解析和验证
   * @returns 用户对象（将被注入到request.user）
   * @throws UnauthorizedException 如果用户不存在或状态异常
   *
   * @example
   * // JWT载荷示例
   * {
   *   sub: "user-uuid-123",
   *   username: "john_doe",
   *   email: "john@example.com",
   *   roles: ["operator", "viewer"],
   *   permissions: ["device:create", "device:read"],
   *   iat: 1234567890,
   *   exp: 1234571490
   * }
   */
  async validate(payload: JwtPayload): Promise<User> {
    // 从数据库查询用户，包含角色和权限关联
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    // 用户不存在，令牌无效
    if (!user) {
      throw new UnauthorizedException('令牌无效');
    }

    // 检查用户是否被锁定
    if (user.status === UserStatus.LOCKED) {
      // 检查锁定是否已过期
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new UnauthorizedException('账户已被锁定');
      }
      // 锁定已过期，自动解锁用户
      user.status = UserStatus.ACTIVE;
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
      await this.userRepository.save(user);
    }

    // 检查用户账户是否处于活跃状态
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('账户未激活');
    }

    // 返回用户对象，将被注入到request.user
    return user;
  }
}
