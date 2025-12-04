/**
 * WebSocket配置模块
 *
 * @description
 * 配置WebSocket服务器的各项参数，包括：
 * - WebSocket服务端口
 * - CORS跨域访问控制
 *
 * @author 系统生成
 * @date 2024-01-15
 */

import { registerAs } from '@nestjs/config';

/**
 * 导出WebSocket配置对象
 *
 * 使用NestJS的registerAs注册为命名配置，可通过@Inject('websocket')或ConfigService注入
 *
 * @returns {Object} WebSocket配置对象
 * @property {number} port - WebSocket服务端口，默认3001
 * @property {string} corsOrigin - CORS允许的源地址，默认'http://localhost:3000'
 *
 * @环境变量
 * - WS_PORT: WebSocket服务端口，如: 3001
 * - WS_CORS_ORIGIN: CORS允许的源地址，如: 'http://localhost:3000' 或 'https://example.com'
 *
 * @使用场景
 * 1. 实时通知推送（系统通知、设备告警等）
 * 2. 实时数据更新（设备状态、监控数据等）
 * 3. 在线用户状态管理
 * 4. 即时通讯功能
 *
 * @安全建议
 * 1. 生产环境必须配置正确的CORS源地址，避免使用'*'
 * 2. 建议对WebSocket连接进行身份验证（JWT token）
 * 3. 限制单个用户的并发连接数
 * 4. 实施消息频率限制，防止滥用
 *
 * @示例
 * ```typescript
 * // 在Gateway中使用
 * &#64;WebSocketGateway({
 *   port: this.wsConfig.port,
 *   cors: {
 *     origin: this.wsConfig.corsOrigin,
 *   },
 * })
 * export class NotificationGateway {
 *   constructor(
 *     &#64;Inject('websocket') private wsConfig: ConfigType<typeof websocketConfig>,
 *   ) {}
 * }
 *
 * // 客户端连接示例
 * const socket = io('ws://localhost:3001', {
 *   transports: ['websocket'],
 *   auth: {
 *     token: 'your-jwt-token',
 *   },
 * });
 * ```
 *
 * @注意事项
 * - WebSocket端口通常与HTTP服务端口不同
 * - 确保防火墙允许WebSocket端口的访问
 * - 开发环境和生产环境应使用不同的CORS配置
 */
export default registerAs('websocket', () => ({
  /**
   * WebSocket服务监听端口
   * 默认: 3001
   *
   * 端口选择建议:
   * - 开发环境: 3001
   * - 测试环境: 3001
   * - 生产环境: 根据实际部署架构配置（可能需要使用Nginx反向代理）
   */
  port: parseInt(process.env.WS_PORT || '3001', 10) || 3001,

  /**
   * CORS允许的源地址
   * 默认: 'http://localhost:3000' (前端开发服务器)
   *
   * 配置示例:
   * - 开发环境: 'http://localhost:3000'
   * - 生产环境: 'https://your-domain.com'
   * - 多个源: 使用数组 ['https://domain1.com', 'https://domain2.com']
   * - 允许所有源(不推荐): '*'
   *
   * 安全提示: 生产环境必须指定具体的域名，禁止使用通配符'*'
   */
  corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
}));
