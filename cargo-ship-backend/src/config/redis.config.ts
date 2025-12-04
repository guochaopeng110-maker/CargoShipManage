/**
 * Redis配置文件
 *
 * 描述：定义Redis缓存服务器的连接配置
 *
 * 用途：
 * - 会话存储
 * - 缓存数据
 * - 消息队列
 * - 实时通信
 *
 * 环境变量：
 * - REDIS_HOST: Redis服务器地址
 * - REDIS_PORT: Redis服务器端口
 * - REDIS_PASSWORD: Redis密码（可选）
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { registerAs } from '@nestjs/config';

/**
 * Redis配置命名空间
 *
 * 使用方式：
 * - 注入：this.configService.get<string>('redis.host')
 * - 或：this.configService.get('redis') 获取整个配置对象
 *
 * @returns Redis配置对象
 */
export default registerAs('redis', () => ({
  /**
   * Redis服务器地址
   *
   * 默认值：localhost
   * 环境变量：REDIS_HOST
   *
   * @example
   * // 本地开发
   * REDIS_HOST=localhost
   *
   * // 生产环境
   * REDIS_HOST=redis.example.com
   *
   * // Docker环境
   * REDIS_HOST=redis_container
   *
   * // 云服务
   * REDIS_HOST=redis-12345.cloud.example.com
   */
  host: process.env.REDIS_HOST || 'localhost',

  /**
   * Redis服务器端口
   *
   * 默认值：6379（Redis默认端口）
   * 环境变量：REDIS_PORT
   *
   * @example
   * // 默认端口
   * REDIS_PORT=6379
   *
   * // 自定义端口
   * REDIS_PORT=6380
   */
  port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,

  /**
   * Redis访问密码
   *
   * 默认值：undefined（无密码）
   * 环境变量：REDIS_PASSWORD
   *
   * 安全建议：
   * - 生产环境必须设置密码
   * - 使用强密码
   * - 定期更换密码
   *
   * @example
   * // 无密码（开发环境）
   * # REDIS_PASSWORD未设置
   *
   * // 有密码（生产环境）
   * REDIS_PASSWORD=your_strong_password_here
   */
  password: process.env.REDIS_PASSWORD || undefined,
}));
