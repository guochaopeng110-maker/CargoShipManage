import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * WebSocket 客户端认证信息接口
 */
export interface WsClientAuth {
  userId: string;
  username: string;
  roles: string[];
}

/**
 * WebSocket 网关服务
 *
 * 提供实时双向通信能力，支持：
 * - 用户连接管理
 * - 房间（Room）机制（按设备/角色/用户分组）
 * - 实时消息推送
 * - 自动断线重连
 * - 消息缓冲
 */
@WebSocketGateway({
  cors: {
    origin: '*', // 生产环境应该配置具体的域名
    credentials: true,
  },
  namespace: '/ws', // WebSocket命名空间
  transports: ['websocket', 'polling'], // 支持WebSocket和轮询
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  // 存储已连接的客户端信息: socketId -> 认证信息
  private connectedClients = new Map<string, WsClientAuth>();

  // 用户ID到Socket ID的映射: userId -> socketId[]
  private userSockets = new Map<string, Set<string>>();

  // 消息缓冲：userId -> 消息队列
  private messageBuffer = new Map<string, any[]>();

  // 最大缓冲消息数量
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * 网关初始化钩子
   */
  afterInit(server: Server) {
    this.logger.log('WebSocket网关初始化完成');
    this.logger.log(`WebSocket服务器监听命名空间: /ws`);

    // 配置Socket.IO中间件进行身份验证
    server.use((socket, next) => {
      try {
        // 从握手中获取token
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          this.logger.warn(`客户端 ${socket.id} 连接失败: 缺少认证token`);
          return next(new Error('认证失败：缺少token'));
        }

        // 验证JWT token
        const payload = this.jwtService.verify(token);

        // 将认证信息附加到socket对象
        socket.data.auth = {
          userId: payload.sub || payload.userId,
          username: payload.username,
          roles: payload.roles || [],
        } as WsClientAuth;

        next();
      } catch (error) {
        this.logger.error(`客户端 ${socket.id} 认证失败: ${error.message}`);
        next(new Error('认证失败：无效的token'));
      }
    });
  }

  /**
   * 客户端连接钩子
   */
  handleConnection(@ConnectedSocket() client: Socket) {
    const auth: WsClientAuth = client.data.auth;

    if (!auth) {
      this.logger.warn(`未认证的客户端 ${client.id} 尝试连接，已拒绝`);
      client.disconnect(true);
      return;
    }

    // 记录连接信息
    this.connectedClients.set(client.id, auth);

    // 维护用户到Socket的映射（一个用户可能有多个连接）
    if (!this.userSockets.has(auth.userId)) {
      this.userSockets.set(auth.userId, new Set());
    }
    this.userSockets.get(auth.userId)!.add(client.id);

    this.logger.log(
      `用户 ${auth.username}(${auth.userId}) 已连接，Socket ID: ${client.id}`,
    );
    this.logger.debug(
      `当前在线用户数: ${this.userSockets.size}, 总连接数: ${this.connectedClients.size}`,
    );

    // 自动加入用户专属房间
    void client.join(`user:${auth.userId}`);

    // 根据角色加入角色房间
    auth.roles.forEach((role) => {
      void client.join(`role:${role}`);
      this.logger.debug(`用户 ${auth.username} 加入角色房间: role:${role}`);
    });

    // 发送欢迎消息
    client.emit('connected', {
      message: '连接成功',
      userId: auth.userId,
      username: auth.username,
      timestamp: new Date().toISOString(),
    });

    // 发送缓冲消息（如果有）
    this.sendBufferedMessages(auth.userId, client);

    // 广播用户上线事件（仅发送给管理员）
    this.server.to('role:Administrator').emit('user:online', {
      userId: auth.userId,
      username: auth.username,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 客户端断开连接钩子
   */
  handleDisconnect(@ConnectedSocket() client: Socket) {
    const auth = this.connectedClients.get(client.id);

    if (auth) {
      // 从映射中移除
      this.connectedClients.delete(client.id);

      const userSocketSet = this.userSockets.get(auth.userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);

        // 如果用户没有其他连接，从映射中移除
        if (userSocketSet.size === 0) {
          this.userSockets.delete(auth.userId);

          // 广播用户离线事件（仅发送给管理员）
          this.server.to('role:Administrator').emit('user:offline', {
            userId: auth.userId,
            username: auth.username,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger.log(
        `用户 ${auth.username}(${auth.userId}) 已断开连接，Socket ID: ${client.id}`,
      );
      this.logger.debug(
        `当前在线用户数: ${this.userSockets.size}, 总连接数: ${this.connectedClients.size}`,
      );
    } else {
      this.logger.warn(`未知客户端 ${client.id} 断开连接`);
    }
  }

  /**
   * 处理客户端订阅设备房间的请求
   */
  @SubscribeMessage('subscribe:equipment')
  handleSubscribeEquipment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { equipmentId: string },
  ) {
    const auth = this.connectedClients.get(client.id);

    if (!auth) {
      return { success: false, message: '未认证' };
    }

    const roomName = `equipment:${data.equipmentId}`;
    void client.join(roomName);

    this.logger.log(`用户 ${auth.username} 订阅设备房间: ${roomName}`);

    return {
      success: true,
      message: `成功订阅设备 ${data.equipmentId}`,
      room: roomName,
    };
  }

  /**
   * 处理客户端取消订阅设备房间的请求
   */
  @SubscribeMessage('unsubscribe:equipment')
  handleUnsubscribeEquipment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { equipmentId: string },
  ) {
    const auth = this.connectedClients.get(client.id);

    if (!auth) {
      return { success: false, message: '未认证' };
    }

    const roomName = `equipment:${data.equipmentId}`;
    void client.leave(roomName);

    this.logger.log(`用户 ${auth.username} 取消订阅设备房间: ${roomName}`);

    return {
      success: true,
      message: `成功取消订阅设备 ${data.equipmentId}`,
    };
  }

  /**
   * 处理心跳消息
   */
  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  // ========== 公共方法：供其他服务调用 ==========

  /**
   * 向指定用户发送消息
   *
   * @param userId 用户ID
   * @param event 事件名称
   * @param data 消息数据
   */
  sendToUser(userId: string, event: string, data: any) {
    const roomName = `user:${userId}`;
    const socketIds = this.userSockets.get(userId);

    if (socketIds && socketIds.size > 0) {
      // 用户在线，直接发送
      this.server.to(roomName).emit(event, data);
      this.logger.debug(`向用户 ${userId} 发送事件: ${event}`);
    } else {
      // 用户离线，缓冲消息
      this.bufferMessage(userId, { event, data, timestamp: Date.now() });
      this.logger.debug(`用户 ${userId} 离线，消息已缓冲`);
    }
  }

  /**
   * 向指定角色的所有用户发送消息
   *
   * @param role 角色名称
   * @param event 事件名称
   * @param data 消息数据
   */
  sendToRole(role: string, event: string, data: any) {
    const roomName = `role:${role}`;
    this.server.to(roomName).emit(event, data);
    this.logger.debug(`向角色 ${role} 发送事件: ${event}`);
  }

  /**
   * 向指定设备房间发送消息
   *
   * @param equipmentId 设备ID
   * @param event 事件名称
   * @param data 消息数据
   */
  sendToEquipment(equipmentId: string, event: string, data: any) {
    const roomName = `equipment:${equipmentId}`;
    this.server.to(roomName).emit(event, data);
    this.logger.debug(`向设备房间 ${equipmentId} 发送事件: ${event}`);
  }

  /**
   * 广播消息给所有连接的客户端
   *
   * @param event 事件名称
   * @param data 消息数据
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.debug(`广播事件: ${event}`);
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * 获取总连接数
   */
  getTotalConnectionCount(): number {
    return this.connectedClients.size;
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
    );
  }

  /**
   * 获取用户的所有Socket ID
   */
  getUserSockets(userId: string): string[] {
    const socketSet = this.userSockets.get(userId);
    return socketSet ? Array.from(socketSet) : [];
  }

  // ========== 私有方法 ==========

  /**
   * 缓冲消息（用户离线时）
   */
  private bufferMessage(userId: string, message: any) {
    if (!this.messageBuffer.has(userId)) {
      this.messageBuffer.set(userId, []);
    }

    const buffer = this.messageBuffer.get(userId)!;

    // 如果缓冲区已满，移除最旧的消息
    if (buffer.length >= this.MAX_BUFFER_SIZE) {
      buffer.shift();
      this.logger.warn(`用户 ${userId} 的消息缓冲区已满，移除最旧消息`);
    }

    buffer.push(message);
  }

  /**
   * 发送缓冲的消息
   */
  private sendBufferedMessages(userId: string, client: Socket) {
    const buffer = this.messageBuffer.get(userId);

    if (buffer && buffer.length > 0) {
      this.logger.log(`向用户 ${userId} 发送 ${buffer.length} 条缓冲消息`);

      buffer.forEach((msg) => {
        client.emit(msg.event, { ...msg.data, buffered: true });
      });

      // 清空缓冲区
      this.messageBuffer.delete(userId);
    }
  }
}
