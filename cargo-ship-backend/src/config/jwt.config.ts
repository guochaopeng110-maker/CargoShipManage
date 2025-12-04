/**
 * JWT配置文件
 *
 * 描述：定义JWT令牌的生成和验证配置
 *
 * 功能：
 * - 访问令牌（Access Token）配置
 * - 刷新令牌（Refresh Token）配置
 * - 令牌密钥和有效期设置
 *
 * 环境变量：
 * - JWT_SECRET: 访问令牌签名密钥
 * - JWT_EXPIRATION_TIME: 访问令牌有效期
 * - JWT_REFRESH_SECRET: 刷新令牌签名密钥
 * - JWT_REFRESH_EXPIRATION_TIME: 刷新令牌有效期
 *
 * 安全建议：
 * - 密钥必须足够长且随机（建议32字符以上）
 * - 生产环境必须更改默认密钥
 * - 访问令牌和刷新令牌使用不同的密钥
 * - 定期更换密钥
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { registerAs } from '@nestjs/config';

/**
 * JWT配置命名空间
 *
 * 使用方式：
 * - 注入：this.configService.get<string>('jwt.secret')
 * - 或：this.configService.get('jwt') 获取整个配置对象
 *
 * @returns JWT配置对象
 */
export default registerAs('jwt', () => ({
  /**
   * 访问令牌签名密钥
   *
   * 说明：
   * - 用于签名和验证访问令牌
   * - 必须保密，不能泄露
   * - 一旦更改，所有现有令牌将失效
   *
   * 默认值：default-secret-change-in-production
   * 环境变量：JWT_SECRET
   *
   * 安全要求：
   * - 长度至少32个字符
   * - 包含大小写字母、数字、特殊字符
   * - 使用密码生成器生成
   *
   * @example
   * // 生成强密钥（Linux/Mac）
   * openssl rand -base64 32
   *
   * // .env文件配置
   * JWT_SECRET=K8fN2pQ9xR4tW5vY6zA7bC8dE9fG0hI1jK2lM3nO4pQ5rS6tU7vW8xY9z
   */
  secret: process.env.JWT_SECRET || 'default-secret-change-in-production',

  /**
   * 访问令牌有效期
   *
   * 说明：
   * - 令牌过期后需要使用刷新令牌获取新的访问令牌
   * - 短有效期提高安全性
   * - 需要平衡安全性和用户体验
   *
   * 默认值：24h（24小时）
   * 环境变量：JWT_EXPIRATION_TIME
   *
   * 格式说明：
   * - s: 秒（如：60s = 60秒）
   * - m: 分钟（如：30m = 30分钟）
   * - h: 小时（如：24h = 24小时）
   * - d: 天（如：7d = 7天）
   *
   * 推荐值：
   * - 高安全场景：15m - 1h
   * - 一般场景：1h - 24h
   * - 低安全场景：24h - 7d
   *
   * @example
   * // 15分钟
   * JWT_EXPIRATION_TIME=15m
   *
   * // 1小时
   * JWT_EXPIRATION_TIME=1h
   *
   * // 24小时
   * JWT_EXPIRATION_TIME=24h
   */
  expirationTime: process.env.JWT_EXPIRATION_TIME || '24h',

  /**
   * 刷新令牌签名密钥
   *
   * 说明：
   * - 用于签名和验证刷新令牌
   * - 必须与访问令牌密钥不同
   * - 必须保密，不能泄露
   *
   * 默认值：default-refresh-secret
   * 环境变量：JWT_REFRESH_SECRET
   *
   * 安全要求：
   * - 与JWT_SECRET不同
   * - 长度至少32个字符
   * - 使用密码生成器生成
   *
   * @example
   * // .env文件配置
   * JWT_REFRESH_SECRET=P7qN8rM9sL0kJ1iH2gF3eD4cB5aZ6yX7wV8uT9sR0qP1oN2mL3kJ4i
   */
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',

  /**
   * 刷新令牌有效期
   *
   * 说明：
   * - 刷新令牌有效期通常比访问令牌长
   * - 过期后用户需要重新登录
   * - 在有效期内可以获取新的访问令牌
   *
   * 默认值：7d（7天）
   * 环境变量：JWT_REFRESH_EXPIRATION_TIME
   *
   * 推荐值：
   * - 高安全场景：1d - 7d
   * - 一般场景：7d - 30d
   * - 低安全场景：30d - 90d
   *
   * @example
   * // 7天
   * JWT_REFRESH_EXPIRATION_TIME=7d
   *
   * // 30天
   * JWT_REFRESH_EXPIRATION_TIME=30d
   *
   * // 90天
   * JWT_REFRESH_EXPIRATION_TIME=90d
   */
  refreshExpirationTime: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
}));
