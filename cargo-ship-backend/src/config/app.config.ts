/**
 * 应用配置文件
 *
 * 描述：定义应用程序的全局配置选项
 *
 * 配置项：
 * - 运行环境（开发/生产）
 * - 服务端口
 * - 应用名称
 * - CORS跨域配置
 *
 * 环境变量：
 * - NODE_ENV: 运行环境
 * - PORT: 服务端口
 * - APP_NAME: 应用名称
 * - CORS_ORIGIN: 允许的跨域来源
 * - CORS_CREDENTIALS: 是否允许携带凭证
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { registerAs } from '@nestjs/config';

/**
 * 应用配置命名空间
 *
 * 使用方式：
 * - 注入：this.configService.get<string>('app.nodeEnv')
 * - 或：this.configService.get('app') 获取整个配置对象
 *
 * @returns 应用配置对象
 */
export default registerAs('app', () => ({
  /**
   * Node.js运行环境
   *
   * 可选值：
   * - development: 开发环境
   * - production: 生产环境
   * - test: 测试环境
   *
   * 默认值：development
   * 环境变量：NODE_ENV
   */
  nodeEnv: process.env.NODE_ENV || 'development',

  /**
   * 应用服务监听端口
   *
   * 说明：
   * - HTTP服务器监听的端口号
   * - 需要确保端口未被占用
   *
   * 默认值：3000
   * 环境变量：PORT
   *
   * @example
   * // 开发环境
   * PORT=3000
   *
   * // 生产环境
   * PORT=80 或 PORT=443（配合反向代理）
   */
  port: parseInt(process.env.PORT || '3000', 10) || 3000,

  /**
   * 应用名称
   *
   * 用途：
   * - 日志标识
   * - API响应头
   * - 文档展示
   *
   * 默认值：Cargo Ships Management System
   * 环境变量：APP_NAME
   */
  name: process.env.APP_NAME || 'Cargo Ships Management System',

  /**
   * CORS允许的跨域来源
   *
   * 说明：
   * - 允许访问API的前端域名列表
   * - 支持多个域名，用逗号分隔
   * - 生产环境必须配置为实际的前端域名
   *
   * 默认值：['http://localhost:3000']
   * 环境变量：CORS_ORIGIN（逗号分隔）
   *
   * @example
   * // 单个域名
   * CORS_ORIGIN=https://app.example.com
   *
   * // 多个域名
   * CORS_ORIGIN=https://app.example.com,https://admin.example.com
   *
   * // 开发环境
   * CORS_ORIGIN=http://localhost:3000,http://localhost:3001
   */
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],

  /**
   * CORS是否允许携带凭证
   *
   * 说明：
   * - true: 允许前端携带Cookie、认证头等凭证
   * - false: 不允许携带凭证
   * - 当设置为true时，corsOrigin不能为'*'
   *
   * 默认值：true
   * 环境变量：CORS_CREDENTIALS
   *
   * 应用场景：
   * - Cookie-based认证
   * - 需要发送Authorization头
   */
  corsCredentials: process.env.CORS_CREDENTIALS === 'true' || true,

  /**
   * 第三方健康评估API的URL
   *
   * 说明：
   * - 用于获取设备健康评分的外部API接口地址。
   * - 这是系统进行健康评估时依赖的关键服务。
   *
   * 默认值：''
   * 环境变量：THIRD_PARTY_HP_API_URL
   *
   * @example
   * THIRD_PARTY_HP_API_URL=https://api.example.com/health-score
   */
  thirdPartyHpApiUrl: process.env.THIRD_PARTY_HP_API_URL || '',
}));
