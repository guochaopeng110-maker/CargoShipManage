import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth-store';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  AlarmPushPayload,
  MonitoringDataPayload,
  EquipmentHealthUpdatePayload
} from '../types/websocket';

/**
 * 连接状态负载接口
 */
export interface ConnectionStatusPayload {
  connected: boolean;      // 是否已连接
  error?: string;          // 展示用的错误信息
  rawError?: string;       // 原始错误消息（用于去重判断）
  reconnecting?: boolean;  // 是否正在重连
}

/**
 * 实时通信服务 (Singleton)
 * 封装 Socket.IO 客户端，提供统一的实时数据入口。
 *
 * 核心功能：
 * 1. WebSocket 连接管理（连接、断开、重连）
 * 2. JWT Token 认证（动态获取、过期重认证）
 * 3. 设备订阅管理（订阅、取消订阅、自动重订阅）
 * 4. 事件总线（注册、分发、移除监听器）
 * 5. 连接状态通知（通知 stores 连接状态变化）
 */
class RealtimeService {
  private static instance: RealtimeService;
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

  // 简单的事件监听器存储 (Event Bus)
  private listeners: Map<string, Array<Function>> = new Map();

  // 已订阅的设备列表（用于自动重订阅）
  private activeSubscriptions: Set<string> = new Set();

  // Token 刷新重试计数器
  private tokenRefreshAttempts: number = 0;
  private readonly MAX_TOKEN_REFRESH_ATTEMPTS = 3;

  // 调试模式（从环境变量读取）
  private debugMode: boolean = false;

  // 连接状态缓存，用于减少重复通知和日志
  private lastStatus: ConnectionStatusPayload = { connected: false };

  private constructor() {
    // Private constructor for Singleton
    // 初始化调试模式
    this.debugMode = import.meta.env.VITE_WS_DEBUG === 'true';
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * 从 auth-store 或参数获取 Token
   * @param providedToken 可选的显式提供的 Token
   * @returns Token 字符串，如果无法获取则返回 null
   * @private
   */
  private getTokenFromStore(providedToken?: string): string | null {
    if (providedToken) {
      return providedToken;
    }

    // 尝试从 auth-store 获取
    try {
      const authState = useAuthStore.getState();
      return authState.accessToken || null;
    } catch (error) {
      console.error('RealtimeService: 无法从 auth-store 获取 Token:', error);
      return null;
    }
  }

  /**
   * 建立 WebSocket 连接
   *
   * 支持以下两种方式提供 Token：
   * 1. 显式传入 token 参数
   * 2. 从 auth-store 自动获取（如果 token 参数为空）
   *
   * @param token 可选的 JWT Token 用于认证
   */
  public connect(token?: string): void {
    if (this.socket) {
      if (this.debugMode) {
        console.log(`RealtimeService: Socket 已存在 (State: ${this.socket.connected ? 'Connected' : 'Disconnected/Connecting'}), 跳过重复连接尝试`);
      }
      return;
    }

    // 获取 Token（优先使用传入的 token，否则从 store 获取）
    const authToken = this.getTokenFromStore(token);
    if (!authToken) {
      console.error('RealtimeService: 无法建立连接 - 未提供有效的 Token');
      // 触发连接失败事件
      this.emitInternal('connection:status', {
        connected: false,
        error: '认证失败：未提供有效的 Token'
      } as ConnectionStatusPayload);
      return;
    }

    // 从环境变量获取 WebSocket URL（支持配置化）
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001/ws';

    if (this.debugMode) {
      console.log('RealtimeService: 正在连接到:', wsUrl);
    }

    // 初始化 Socket.IO 客户端
    this.socket = io(wsUrl, {
      auth: {
        token: authToken
      },
      transports: ['websocket', 'polling'], // 优先使用 websocket
      reconnection: true,                   // 启用自动重连
      reconnectionAttempts: Infinity,       // 无限重试
      reconnectionDelay: 2000,              // 初始延迟增加到 2s
      reconnectionDelayMax: 10000,          // 最大延迟增加到 10s
      forceNew: true,                       // 强制创建新连接，不复用 Manager
      multiplex: false                      // 禁用多路复用，确保连接隔离
    });

    this.setupInternalListeners();
  }

  /**
   * 断开 WebSocket 连接
   * 
   * 彻底切断连接、销毁 Socket 实例并清空所有内部状态（包括订阅和监听器）。
   */
  public disconnect(): void {
    if (this.socket) {
      if (this.debugMode) {
        console.log('RealtimeService: 正在彻底切断连接并清理资源...');
      }

      // 1. 移除底层 Socket 的所有监听器
      this.socket.removeAllListeners();

      // 2. 切断物理连接并关闭管理器
      this.socket.disconnect();
      this.socket.close();

      this.socket = null;
    }

    // 3. 清空事件总线监听器，防止在重新登录后产生重复监听
    this.listeners.clear();

    // 4. 清空活跃订阅记录，防止状态污染
    this.activeSubscriptions.clear();

    // 5. 重置所有内部管理状态
    this.lastStatus = { connected: false };
    this.tokenRefreshAttempts = 0;

    console.log('RealtimeService: WebSocket 连接已彻底断开，所有状态已重置。');
  }

  /**
   * 设置内部的基础事件监听
   *
   * 监听以下 Socket.IO 生命周期事件：
   * - connect: 连接成功
   * - disconnect: 断开连接
   * - connect_error: 连接错误（包括认证失败）
   *
   * 监听以下业务事件并代理到事件总线：
   * - alarm:push, alarm:batch, alarm:trend
   * - monitoring:new-data
   * - equipment:health:update, equipment:health:warning
   * - connected（服务端确认连接成功）
   *
   * @private
   */
  private setupInternalListeners() {
    if (!this.socket) return;

    // ========================================
    // 生命周期事件监听
    // ========================================

    /**
     * 连接成功事件
     */
    this.socket.on('connect', () => {
      if (this.debugMode) {
        console.log('RealtimeService: WebSocket 连接成功, Socket ID:', this.socket?.id);
      }

      // 重置 Token 刷新重试计数器
      this.tokenRefreshAttempts = 0;

      // 触发连接成功事件，通知所有监听的 stores
      this.emitInternal('connection:status', {
        connected: true,
        reconnecting: false
      } as ConnectionStatusPayload);

      // 自动重订阅所有之前订阅的设备
      this.resubscribeAll();
    });

    /**
     * 断开连接事件
     */
    this.socket.on('disconnect', (reason) => {
      console.warn('RealtimeService: WebSocket 断开连接，原因:', reason);

      // 触发断开连接事件
      this.emitInternal('connection:status', {
        connected: false,
        error: `连接已断开: ${reason}`,
        reconnecting: reason !== 'io client disconnect' && reason !== 'io server disconnect'
      } as ConnectionStatusPayload);

      // 如果是服务器主动断开（可能是认证失败），尝试重新认证
      if (reason === 'io server disconnect') {
        if (this.debugMode) {
          console.log('RealtimeService: 服务器主动断开连接，可能是认证失败');
        }
        // Socket.IO 默认不会自动重连此情况，需要手动处理
        this.handleAuthenticationFailure();
      }
    });

    /**
     * 连接错误事件
     */
    this.socket.on('connect_error', (err) => {
      // 关键：只有在之前是连接状态，或者错误消息内容发生变化时才记录/触发事件
      // 使用 rawError 进行对比，避免因为翻译前缀导致对比失效
      const isNewError = this.lastStatus.connected || this.lastStatus.rawError !== err.message;

      if (isNewError) {
        console.warn('RealtimeService: 连接异常 (重连中...):', err.message);

        // 触发连接错误事件
        this.emitInternal('connection:status', {
          connected: false,
          error: `连接错误: ${err.message}`,
          rawError: err.message,
          reconnecting: true
        } as ConnectionStatusPayload);
      }

      // 如果错误消息包含"认证"相关关键词，尝试刷新 Token
      if (err.message.includes('认证') || err.message.includes('token') || err.message.includes('unauthorized')) {
        this.handleAuthenticationFailure();
      }
    });

    // ========================================
    // 业务事件代理到事件总线
    // ========================================

    /**
     * 告警推送事件（单个告警）
     */
    this.socket.on('alarm:push', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [alarm:push]:', data);
        }
        this.emitInternal('alarm:push', data);
      } catch (error) {
        console.error('RealtimeService: 处理 alarm:push 事件失败:', error);
      }
    });

    /**
     * 批量告警推送事件
     */
    this.socket.on('alarm:batch', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [alarm:batch]:', data);
        }
        this.emitInternal('alarm:batch', data);
      } catch (error) {
        console.error('RealtimeService: 处理 alarm:batch 事件失败:', error);
      }
    });

    /**
     * 告警趋势事件
     */
    this.socket.on('alarm:trend', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [alarm:trend]:', data);
        }
        this.emitInternal('alarm:trend', data);
      } catch (error) {
        console.error('RealtimeService: 处理 alarm:trend 事件失败:', error);
      }
    });

    /**
     * 新监测数据事件
     */
    this.socket.on('monitoring:new-data', (data) => {
      try {
        // 高频事件，仅在调试模式下打印
        if (this.debugMode) {
          console.log('RealtimeService 收到 [monitoring:new-data]:', data);
        }
        this.emitInternal('monitoring:new-data', data);
      } catch (error) {
        console.error('RealtimeService: 处理 monitoring:new-data 事件失败:', error);
      }
    });

    /**
     * 批量监测数据事件
     */
    this.socket.on('monitoring:batch-data', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [monitoring:batch-data]:', {
            batchId: data.batchId,
            chunk: `${data.chunkIndex}/${data.totalChunks}`,
            count: data.data.length
          });
        }
        this.emitInternal('monitoring:batch-data', data);
      } catch (error) {
        console.error('RealtimeService: 处理 monitoring:batch-data 事件失败:', error);
      }
    });

    /**
     * 设备健康评分更新事件
     */
    this.socket.on('equipment:health:update', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [equipment:health:update]:', data);
        }
        this.emitInternal('equipment:health:update', data);
      } catch (error) {
        console.error('RealtimeService: 处理 equipment:health:update 事件失败:', error);
      }
    });

    /**
     * 设备健康预警事件
     */
    this.socket.on('equipment:health:warning', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [equipment:health:warning]:', data);
        }
        this.emitInternal('equipment:health:warning', data);
      } catch (error) {
        console.error('RealtimeService: 处理 equipment:health:warning 事件失败:', error);
      }
    });

    /**
     * 服务端确认连接成功事件
     */
    this.socket.on('connected', (data) => {
      try {
        if (this.debugMode) {
          console.log('RealtimeService 收到 [connected]:', data);
        }
        this.emitInternal('connected', data);
      } catch (error) {
        console.error('RealtimeService: 处理 connected 事件失败:', error);
      }
    });
  }

  /**
   * 处理认证失败情况
   *
   * 尝试以下步骤：
   * 1. 从 auth-store 刷新 Token
   * 2. 使用新 Token 重新连接
   * 3. 如果多次失败，跳转到登录页
   *
   * @private
   */
  private handleAuthenticationFailure() {
    // 检查重试次数
    if (this.tokenRefreshAttempts >= this.MAX_TOKEN_REFRESH_ATTEMPTS) {
      console.error('RealtimeService: Token 刷新失败次数过多，跳转到登录页');
      // 触发错误事件
      this.emitInternal('connection:status', {
        connected: false,
        error: '认证失败，请重新登录'
      } as ConnectionStatusPayload);

      // 跳转到登录页（延迟执行，避免在事件处理中直接跳转）
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return;
    }

    this.tokenRefreshAttempts++;

    if (this.debugMode) {
      console.log(`RealtimeService: 尝试刷新 Token（第 ${this.tokenRefreshAttempts} 次）`);
    }

    try {
      // 尝试从 auth-store 获取新 Token
      // 注意：这里假设 auth-store 有自动刷新 Token 的机制
      // 如果没有，可能需要调用 refreshAccessToken() 等方法
      const authState = useAuthStore.getState();
      const newToken = authState.accessToken;

      if (newToken && this.socket) {
        // 更新 Socket.IO 的认证信息
        this.socket.auth = { token: newToken };

        // 手动重连
        this.socket.connect();

        if (this.debugMode) {
          console.log('RealtimeService: 已使用新 Token 重新连接');
        }
      } else {
        console.error('RealtimeService: 无法获取新的 Token');
        // 如果无法获取新 Token，直接跳转登录页
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    } catch (error) {
      console.error('RealtimeService: Token 刷新失败:', error);
    }
  }

  /**
   * 自动重订阅所有之前订阅的设备
   *
   * 在重连成功后调用，恢复断线前的订阅状态
   *
   * @private
   */
  private resubscribeAll() {
    if (this.activeSubscriptions.size === 0) {
      return;
    }

    if (this.debugMode) {
      console.log(`RealtimeService: 正在自动重订阅 ${this.activeSubscriptions.size} 个设备`);
    }

    // 遍历所有已订阅的设备，重新发送订阅请求
    this.activeSubscriptions.forEach(equipmentId => {
      if (this.socket?.connected) {
        this.socket.emit('subscribe:equipment', { equipmentId }, (response) => {
          if (response?.success) {
            if (this.debugMode) {
              console.log(`RealtimeService: 自动重订阅成功 - ${equipmentId}`);
            }
          } else {
            console.error(`RealtimeService: 自动重订阅失败 - ${equipmentId}`, response?.message);
          }
        });
      }
    });
  }

  /**
   * 订阅特定设备的实时数据
   *
   * 订阅后会自动添加到 activeSubscriptions 集合中
   * 在重连后会自动重新订阅
   *
   * @param equipmentId 设备ID
   * @returns Promise<boolean> 订阅是否成功
   */
  public subscribeToEquipment(equipmentId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        console.warn('RealtimeService: 无法订阅，Socket 未连接');
        return resolve(false);
      }

      if (this.debugMode) {
        console.log(`RealtimeService: 正在订阅设备 ${equipmentId}`);
      }

      this.socket.emit('subscribe:equipment', { equipmentId }, (response) => {
        if (response && response.success) {
          // 订阅成功，添加到活跃订阅列表
          this.activeSubscriptions.add(equipmentId);

          if (this.debugMode) {
            console.log(`RealtimeService: 订阅成功 - ${equipmentId}`);
          }
          resolve(true);
        } else {
          console.error(`RealtimeService: 订阅失败 - ${equipmentId}`, response?.message);
          resolve(false);
        }
      });
    });
  }

  /**
   * 取消订阅特定设备的实时数据
   *
   * 取消订阅后会从 activeSubscriptions 集合中移除
   * 在重连后不会自动重新订阅此设备
   *
   * @param equipmentId 设备ID
   * @returns Promise<void>
   */
  public unsubscribeFromEquipment(equipmentId: string): Promise<void> {
    return new Promise((resolve) => {
      // 从活跃订阅列表中移除（无论 socket 是否连接）
      this.activeSubscriptions.delete(equipmentId);

      if (!this.socket?.connected) {
        return resolve();
      }

      if (this.debugMode) {
        console.log(`RealtimeService: 正在取消订阅设备 ${equipmentId}`);
      }

      this.socket.emit('unsubscribe:equipment', { equipmentId }, (response) => {
        if (this.debugMode) {
          console.log(`RealtimeService: 已取消订阅 - ${equipmentId}`);
        }
        resolve();
      });
    });
  }

  // =========================================================================
  // Internal Event Bus Implementation (Simplified for now)
  // =========================================================================

  /**
   * 注册事件监听器
   * @param event 事件名称
   * @param callback 回调函数
   */
  public on<K extends keyof ServerToClientEvents>(event: K, callback: ServerToClientEvents[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param callback 回调函数
   */
  public off<K extends keyof ServerToClientEvents>(event: K, callback: ServerToClientEvents[K]): void {
    const list = this.listeners.get(event);
    if (!list) return;

    this.listeners.set(event, list.filter(cb => cb !== callback));
  }

  /**
   * 触发内部事件
   */
  private emitInternal(event: string, data: any) {
    // 关键安全检查：如果 socket 已置空且不是状态变化事件，则拒绝触发 business 事件
    // 这能防止“僵尸连接”产生的残留数据污染 Store
    if (!this.socket && event !== 'connection:status' && event !== 'disconnect') {
      return;
    }

    // 记录状态，用于幂等判断
    if (event === 'connection:status') {
      this.lastStatus = data as ConnectionStatusPayload;
    }

    const list = this.listeners.get(event);
    if (list) {
      list.forEach(cb => cb(data));
    }
  }
}

// 导出单例
export const realtimeService = RealtimeService.getInstance();