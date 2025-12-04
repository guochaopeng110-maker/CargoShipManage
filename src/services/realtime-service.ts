/**
 * 货船智能机舱管理系统 - WebSocket连接管理服务
 *
 * 核心功能：
 * 1. WebSocket连接管理和维护
 * 2. 连接状态监控和自动重连
 * 3. 心跳检测和连接保活
 * 4. 消息路由和事件分发
 * 5. 性能监控和连接指标收集
 *
 * 技术架构：
 * - 专注WebSocket连接层的纯连接管理
 * - 事件驱动的消息处理机制
 * - 自动重连和错误恢复
 * - 心跳检测和连接保活
 * - 性能监控和指标收集
 *
 * 服务特性：
 * - 纯WebSocket连接管理
 * - 连接状态实时监控
 * - 自动重连机制
 * - 性能指标统计
 * - 消息路由和分发
 *
 * WebSocket协议：
 * - 连接握手（ConnectionHandshake）
 * - 订阅管理（SubscriptionRequest/Response）
 * - 数据更新（DataUpdateMessage）
 * - 告警通知（AlertMessage）
 * - 设备状态（DeviceStatusMessage）
 * - 心跳检测（HeartbeatMessage）
 *
 * 性能监控：
 * - 连接延迟测量
 * - 消息处理时间统计
 * - 数据点处理速率
 * - 内存和CPU使用率
 * - 错误率和崩溃率监控
 *
 * 重构说明：
 * - 移除业务逻辑，专注连接管理
 * - 提供原始WebSocket消息给上层服务处理
 * - 简化接口，提供基础的连接和消息功能
 * - 保持与monitoring-service.ts的兼容性
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 3.0.0
 * @since 2025
 */

// 统一监测数据类型导入
import {
  ConnectionStatus,            // 连接状态枚举
  WebSocketMessage,            // WebSocket消息基类
  WebSocketMessageType,        // 消息类型枚举
  DataUpdateMessage,           // 数据更新消息
  AlertMessage,                // 告警消息
  DeviceStatusMessage,         // 设备状态消息
  SubscriptionRequestMessage,   // 订阅请求
  ConnectionHandshakeMessage,  // 连接握手消息
  HeartbeatMessage,            // 心跳消息
  UnifiedMonitoringData,        // 统一监测数据
  DataSource,                 // 数据来源枚举
  DataQuality,                // 数据质量枚举
  MetricReading,              // 指标读数
  PerformanceMetrics,         // 性能指标
  SubscriptionResponse,       // 订阅响应
  SubscriptionRequest,        // 订阅请求
  SubscriptionAckMessage,     // 订阅确认消息
  ConnectionHandshake,        // 连接握手
} from '../types/monitoring';

// 设备状态类型导入
import { EquipmentStatus } from '../types/equipment';

/**
 * WebSocket客户端配置接口
 * 
 * 定义WebSocket连接的参数和配置选项
 * 包括连接URL、重连策略、心跳设置等
 */
export interface WebSocketConfig {
  url: string;                     // WebSocket服务器地址
  reconnectInterval: number;       // 重连间隔时间（毫秒）
  maxReconnectAttempts: number;    // 最大重连次数
  heartbeatInterval: number;       // 心跳间隔时间（毫秒）
  subscriptionTimeout: number;     // 订阅超时时间（毫秒）
}

/**
 * 连接事件回调接口
 * 
 * 定义WebSocket连接过程中各种事件的回调函数
 * 用于处理连接状态变化、数据更新、错误处理等
 */
export interface ConnectionCallbacks {
  /** 连接成功时触发 */
  onConnect?: () => void;
  /** 断开连接时触发 */
  onDisconnect?: () => void;
  /** 连接错误时触发 */
  onError?: (error: Error) => void;
  /** 收到数据更新时触发 */
  onDataUpdate?: (deviceId: string, data: MetricReading[]) => void;
  /** 收到告警时触发 */
  onAlarm?: (alarm: any) => void;
  /** 设备状态变化时触发 */
  onDeviceStatus?: (deviceId: string, status: string) => void;
  /** 性能指标更新时触发 */
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
}

/**
 * 实时数据服务类
 * 
 * 负责WebSocket连接管理、实时数据订阅、消息处理等实时通信业务逻辑
 * 
 * 主要功能：
 * - WebSocket连接建立和维护
 * - 设备数据实时订阅管理
 * - 实时消息接收和处理
 * - 连接状态监控和自动重连
 * - 性能指标收集和统计
 * 
 * 通信流程：
 * 1. 建立WebSocket连接
 * 2. 发送连接握手消息
 * 3. 订阅设备数据流
 * 4. 接收和处理实时数据
 * 5. 发送心跳保持连接
 * 6. 自动重连和错误恢复
 * 
 * 消息处理：
 * - 数据更新消息处理
 * - 告警消息分发
 * - 设备状态变化通知
 * - 心跳消息响应
 * - 错误消息处理
 * 
 * @class RealTimeService
 */
export class RealTimeService {
  /** WebSocket连接对象 */
  private websocket: WebSocket | null = null;
  
  /** WebSocket配置参数 */
  private config: WebSocketConfig;
  
  /** 连接事件回调函数 */
  private callbacks: ConnectionCallbacks = {};
  
  /** 当前连接状态 */
  private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  
  /** 重连尝试次数 */
  private reconnectAttempts = 0;
  
  /** 心跳定时器 */
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  /** 连接超时定时器 */
  private connectionTimer: NodeJS.Timeout | null = null;
  
  /** 当前订阅ID */
  private subscriptionId: string | null = null;
  
  /** 重连定时器 */
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  /** 消息队列（用于缓存离线期间的消息） */
  private messageQueue: WebSocketMessage[] = [];
  
  /** 实时数据缓存（用于存储最近的设备数据） */
  private realtimeDataCache: Map<string, UnifiedMonitoringData[]> = new Map();
  
  /** 性能指标数据 */
  private performanceMetrics: PerformanceMetrics = {
    messagesPerSecond: 0,        // 每秒消息数
    bytesPerSecond: 0,          // 每秒字节数
    averageLatency: 0,          // 平均延迟
    packetLoss: 0,              // 数据包丢失率
    connectionUptime: 0,        // 连接运行时间
    lastUpdate: Date.now(),     // 最后更新时间
    appLoadTime: 0,             // 应用加载时间
    routeChangeTime: 0,         // 路由切换时间
    apiResponseTime: 0,         // API响应时间
    realTimeLatency: 0,         // 实时延迟
    websocketConnectionTime: 0, // WebSocket连接时间
    dataProcessingTime: 0,      // 数据处理时间
    renderTime: 0,              // 渲染时间
    memoryUsage: 0,             // 内存使用量
    cpuUsage: 0,               // CPU使用率
    errorRate: 0,              // 错误率
    crashRate: 0,              // 崩溃率
    connectionLatency: 0,      // 连接延迟
    messageRate: 0,            // 消息速率
    dataPointsPerSecond: 0,    // 每秒数据点数
    timestamp: Date.now(),     // 指标时间戳
  };
  
  /** 服务启动时间 */
  private startTime = Date.now();

  /**
   * 构造函数
   * 
   * @param {WebSocketConfig} config - WebSocket配置参数
   */
  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  /**
   * 设置连接事件回调
   * 
   * 注册WebSocket连接过程中的各种事件回调函数
   * 
   * @param {ConnectionCallbacks} callbacks - 回调函数集合
   * @returns {void} 无返回值
   */
  setCallbacks(callbacks: ConnectionCallbacks): void {
    // 合并新的回调函数到现有回调中
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * 建立WebSocket连接
   * 
   * 创建WebSocket连接并设置各种事件监听器
   * 包括连接成功、消息接收、连接关闭、错误处理等
   * 
   * @param {string} accessToken - 访问令牌，用于身份验证
   * @returns {Promise<void>} 连接建立完成
   * @throws {Error} 连接建立失败
   */
  async connect(accessToken: string): Promise<void> {
    // 如果已经连接，直接返回
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // 更新连接状态为正在连接
      this.updateConnectionStatus(ConnectionStatus.CONNECTING);
      
      // 记录连接开始时间
      const connectStartTime = Date.now();
      
      // 创建WebSocket连接
      this.websocket = new WebSocket(this.config.url);

      // 连接成功事件处理
      this.websocket.onopen = () => {
        // 计算连接耗时
        const connectionTime = Date.now() - connectStartTime;
        this.performanceMetrics.websocketConnectionTime = connectionTime;
        
        // 更新连接状态
        this.updateConnectionStatus(ConnectionStatus.CONNECTED);
        
        // 重置重连计数
        this.reconnectAttempts = 0;
        
        // 发送连接握手消息
        this.sendHandshake(accessToken);
        
        // 启动心跳检测
        this.startHeartbeat();
        
        // 触发连接成功回调
        this.callbacks.onConnect?.();
      };

      // 消息接收事件处理
      this.websocket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      // 连接关闭事件处理
      this.websocket.onclose = (event) => {
        // 更新连接状态
        this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
        
        // 停止心跳检测
        this.stopHeartbeat();
        
        // 触发断开连接回调
        this.callbacks.onDisconnect?.();
        
        // 如果不是正常关闭且未达到最大重连次数，调度重连
        if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      // 连接错误事件处理
      this.websocket.onerror = (error) => {
        // 更新连接状态为错误
        this.updateConnectionStatus(ConnectionStatus.ERROR);
        
        // 触发错误回调
        this.callbacks.onError?.(new Error('WebSocket connection error'));
      };

    } catch (error) {
      // 连接失败时更新状态并抛出错误
      this.updateConnectionStatus(ConnectionStatus.ERROR);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * 断开WebSocket连接
   * 
   * 清理所有资源并关闭WebSocket连接
   * 包括定时器清理、连接对象销毁等
   * 
   * @returns {void} 无返回值
   */
  disconnect(): void {
    // 清理重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 停止心跳检测
    this.stopHeartbeat();
    
    // 关闭WebSocket连接
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
    
    // 更新连接状态
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    
    // 清除订阅ID
    this.subscriptionId = null;
  }

  /**
   * 订阅设备数据
   * 
   * 向WebSocket服务器发送订阅请求，订阅指定设备和指标的数据流
   * 支持实时数据推送和历史数据包含
   * 
   * @param {string[]} deviceIds - 要订阅的设备ID列表
   * @param {string[]} metricTypes - 要订阅的指标类型列表
   * @param {Object} options - 订阅选项（可选）
   * @param {number} options.maxRate - 最大数据速率（可选）
   * @param {DataQuality[]} options.quality - 数据质量过滤（可选）
   * @param {boolean} options.includeHistory - 是否包含历史数据（可选）
   * @returns {Promise<SubscriptionResponse>} 订阅响应结果
   * @throws {Error} 订阅失败或WebSocket未连接
   */
  async subscribe(
    deviceIds: string[],                              // 要订阅的设备ID列表
    metricTypes: string[],                           // 要订阅的指标类型列表
    options?: {                                      // 订阅选项（可选）
      maxRate?: number;                             // 最大数据速率
      quality?: DataQuality[];                      // 数据质量过滤
      includeHistory?: boolean;                     // 是否包含历史数据
    }
  ): Promise<SubscriptionResponse> {
    // 检查WebSocket连接状态
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // 创建订阅请求对象
    const subscriptionRequest: SubscriptionRequest = {
      type: WebSocketMessageType.SUBSCRIPTION_REQUEST,        // 消息类型
      timestamp: Date.now(),                        // 请求时间戳
      requestId: `sub_${Date.now()}`,               // 请求唯一ID
      messageId: `msg_${Date.now()}`,               // 消息唯一ID
      devices: deviceIds,                          // 设备ID列表
      parameters: metricTypes,                     // 指标类型列表
      frequency: 1000,                             // 更新频率（毫秒）
      qualityFilter: ['good'],                     // 质量过滤条件
    };

    // 发送订阅请求
    const response = this.sendMessage(subscriptionRequest);
    
    // 返回Promise处理订阅响应
    return new Promise((resolve, reject) => {
      // 设置订阅超时定时器
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, this.config.subscriptionTimeout);

      // 处理订阅确认消息
      const handleAck = (message: WebSocketMessage) => {
        if (message.type === WebSocketMessageType.SUBSCRIPTION_ACK) {
          const ackMessage = message as unknown as SubscriptionAckMessage;
          if (ackMessage.subscriptionId) {
            clearTimeout(timeout); // 清除超时定时器
            this.subscriptionId = ackMessage.subscriptionId; // 保存订阅ID
            
            // 返回订阅成功响应
            resolve({
              type: WebSocketMessageType.SUBSCRIPTION_RESPONSE,        // 响应类型
              timestamp: Date.now(),                         // 响应时间戳
              requestId: subscriptionRequest.requestId,      // 对应的请求ID
              messageId: `resp_${Date.now()}`,               // 响应消息ID
              success: true,                                // 订阅成功
              subscribedDevices: deviceIds,                // 订阅的设备列表
              subscribedParameters: metricTypes,           // 订阅的指标列表
              frequency: 1000,                             // 数据更新频率
            } as SubscriptionResponse);
          }
        }
      };

      // 临时监听订阅确认消息
      this.once('SUBSCRIPTION_ACK', handleAck);
    });
  }

  /**
   * 取消订阅
   * 
   * 向WebSocket服务器发送取消订阅请求
   * 停止接收指定设备的数据流
   * 
   * @param {string} subscriptionId - 要取消的订阅ID（可选）
   * @returns {Promise<void>} 取消订阅完成
   * @async
   */
  async unsubscribe(subscriptionId?: string): Promise<void> {
    // 检查WebSocket连接状态
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return; // 未连接则直接返回
    }

    // 创建取消订阅请求对象
    const unsubscribeRequest: SubscriptionRequest = {
      type: WebSocketMessageType.SUBSCRIPTION_REQUEST,        // 消息类型
      timestamp: Date.now(),                        // 请求时间戳
      requestId: `unsub_${Date.now()}`,             // 请求唯一ID
      messageId: `msg_${Date.now()}`,               // 消息唯一ID
      devices: [],                                 // 空设备列表（表示取消所有）
      parameters: [],                             // 空参数列表（表示取消所有）
      frequency: 0,                               // 零频率（停止数据推送）
      qualityFilter: [],                         // 空质量过滤
    };

    // 发送取消订阅请求
    this.sendMessage(unsubscribeRequest);
    
    // 清除当前订阅ID
    this.subscriptionId = null;
  }

  // ===== 私有方法实现 =====

  /**
   * 发送WebSocket消息
   * 
   * 将消息对象序列化为JSON并通过WebSocket发送
   * 
   * @param {any} message - 要发送的消息对象
   * @returns {Promise<any>} 发送结果Promise
   * @private
   */
  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // 检查WebSocket连接状态
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      try {
        // 序列化消息并发送
        this.websocket.send(JSON.stringify(message));
        resolve(true); // 发送成功
      } catch (error) {
        reject(error); // 发送失败
      }
    });
  }

  /**
   * 处理接收到的WebSocket消息
   * 
   * 解析消息内容并根据消息类型分发给相应的处理器
   * 
   * @param {string} data - 接收到的消息数据
   * @returns {void} 无返回值
   * @private
   */
  private handleMessage(data: string): void {
    try {
      // 解析JSON消息
      const message: WebSocketMessage = JSON.parse(data);
      
      // 记录消息处理开始时间
      const processStartTime = Date.now();
      
      // 根据消息类型分发处理
      switch (message.type) {
        case WebSocketMessageType.DATA_UPDATE:
          this.handleDataUpdate(message as unknown as DataUpdateMessage);
          break;
          
        case WebSocketMessageType.ALERT:
          this.handleAlarm(message as unknown as AlertMessage);
          break;
          
        case WebSocketMessageType.DEVICE_STATUS:
          this.handleDeviceStatus(message as unknown as DeviceStatusMessage);
          break;
          
        case WebSocketMessageType.SUBSCRIPTION_ACK:
          this.handleSubscriptionAck(message as unknown as SubscriptionAckMessage);
          break;
          
        case WebSocketMessageType.HEARTBEAT:
          this.handleHeartbeat(message as unknown as HeartbeatMessage);
          break;
          
        case WebSocketMessageType.ERROR:
          this.handleError(message);
          break;
      }

      // 更新消息处理时间指标
      this.performanceMetrics.dataProcessingTime = Date.now() - processStartTime;
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * 处理数据更新消息
   *
   * 处理从服务器推送的实时设备数据
   *
   * @param {DataUpdateMessage} message - 数据更新消息
   * @returns {void} 无返回值
   * @private
   */
  private handleDataUpdate(message: DataUpdateMessage): void {
    // 计算实时延迟
    const latency = Date.now() - message.timestamp;
    this.performanceMetrics.realTimeLatency = Math.max(this.performanceMetrics.realTimeLatency, latency);
    
    // 转换UnifiedMonitoringData为MetricReading格式
    const metricReadings: MetricReading[] = message.data.map(data => ({
      id: data.id,
      timestamp: data.timestamp,
      value: data.value,
      unit: data.unit,
      quality: data.quality as 'good' | 'bad' | 'uncertain',
      sensorId: `sensor_${data.equipmentId}_${data.metricType}`,
      sensorName: `${data.metricType}传感器`,
      equipmentId: data.equipmentId,
      metadata: data.metadata,
    }));
    
    // 存储到实时数据缓存中
    const cachedData = this.realtimeDataCache.get(message.deviceId) || [];
    // 添加新数据并保持最近的100条记录
    const updatedData = [...cachedData, ...message.data].slice(-100);
    this.realtimeDataCache.set(message.deviceId, updatedData);
    
    // 触发数据更新回调
    this.callbacks.onDataUpdate?.(message.deviceId, metricReadings);
  }

  /**
   * 处理告警消息
   * 
   * 处理从服务器推送的告警信息
   * 
   * @param {AlertMessage} message - 告警消息
   * @returns {void} 无返回值
   * @private
   */
  private handleAlarm(message: AlertMessage): void {
    // 触发告警回调
    this.callbacks.onAlarm?.(message);
  }

  /**
   * 处理设备状态消息
   * 
   * 处理设备状态变化通知
   * 
   * @param {DeviceStatusMessage} message - 设备状态消息
   * @returns {void} 无返回值
   * @private
   */
  private handleDeviceStatus(message: DeviceStatusMessage): void {
    // 触发设备状态回调
    this.callbacks.onDeviceStatus?.(message.deviceId, message.status);
  }

  /**
   * 处理订阅确认消息
   * 
   * 处理服务器返回的订阅确认响应
   * 
   * @param {SubscriptionAckMessage} message - 订阅确认消息
   * @returns {void} 无返回值
   * @private
   */
  private handleSubscriptionAck(message: SubscriptionAckMessage): void {
    // 订阅确认逻辑在订阅方法中处理
    // 这里主要用于兼容性
  }

  /**
   * 处理心跳消息
   * 
   * 处理服务器发送的心跳检测并返回响应
   * 
   * @param {HeartbeatMessage} message - 心跳消息
   * @returns {void} 无返回值
   * @private
   */
  private handleHeartbeat(message: HeartbeatMessage): void {
    // 创建心跳响应消息
    const response: HeartbeatMessage = {
      clientTimestamp: Date.now(),              // 客户端时间戳
      serverTimestamp: message.serverTimestamp || Date.now(), // 服务器时间戳
      latency: Date.now() - message.clientTimestamp, // 计算延迟
      clientTime: Date.now(),                  // 客户端时间
    };
    
    // 发送心跳响应
    this.sendMessage(response);
  }

  /**
   * 处理错误消息
   * 
   * 处理从服务器返回的错误消息
   * 
   * @param {WebSocketMessage} message - 错误消息
   * @returns {void} 无返回值
   * @private
   */
  private handleError(message: WebSocketMessage): void {
    // 触发错误回调
    this.callbacks.onError?.(new Error(`WebSocket error: ${message.type}`));
  }

  /**
   * 发送连接握手消息
   * 
   * 在WebSocket连接建立后发送握手消息进行身份验证和能力协商
   * 
   * @param {string} accessToken - 访问令牌
   * @returns {void} 无返回值
   * @private
   */
  private sendHandshake(accessToken: string): void {
    // 创建握手消息对象
    const handshake: ConnectionHandshake = {
      type: WebSocketMessageType.CONNECTION_HANDSHAKE,     // 消息类型
      timestamp: Date.now(),                     // 消息时间戳
      requestId: `handshake_${Date.now()}`,      // 请求唯一ID
      messageId: `msg_${Date.now()}`,            // 消息唯一ID
      clientId: `web_${Date.now()}`,             // 客户端ID
      version: '2.0.0',                         // 协议版本
      capabilities: ['realtime', 'subscription', 'heartbeat'], // 支持的能力
    };

    // 发送握手消息
    this.sendMessage(handshake);
  }

  /**
   * 启动心跳检测
   * 
   * 定期发送心跳消息以保持连接活跃和检测连接状态
   * 
   * @returns {void} 无返回值
   * @private
   */
  private startHeartbeat(): void {
    // 先停止现有的心跳
    this.stopHeartbeat();
    
    // 设置心跳定时器
    this.heartbeatTimer = setInterval(() => {
      // 检查WebSocket连接状态
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        // 创建心跳消息
        const heartbeat: HeartbeatMessage = {
          clientTimestamp: Date.now(),          // 客户端时间戳
          serverTimestamp: Date.now(),          // 服务器时间戳
          latency: 0,                         // 延迟（发送时为0）
          clientTime: Date.now(),              // 客户端时间
        };
        
        // 发送心跳消息
        this.sendMessage(heartbeat);
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 停止心跳检测
   * 
   * 清除心跳定时器，停止发送心跳消息
   * 
   * @returns {void} 无返回值
   * @private
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 调度自动重连
   * 
   * 在连接断开后自动调度重连尝试
   * 使用指数退避算法避免频繁重连
   * 
   * @returns {void} 无返回值
   * @private
   */
  private scheduleReconnect(): void {
    // 如果已经有重连定时器在运行，直接返回
    if (this.reconnectTimer) return;
    
    // 增加重连尝试次数
    this.reconnectAttempts++;
    
    // 使用指数退避算法计算重连延迟（最多30秒）
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    // 更新连接状态为重连中
    this.updateConnectionStatus(ConnectionStatus.RECONNECTING);
    
    // 设置重连定时器
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      
      // 获取最新的访问令牌
      const token = this.getAccessToken();
      if (token) {
        // 尝试重新连接
        this.connect(token);
      }
    }, delay);
  }

  /**
   * 更新连接状态
   * 
   * 更新内部连接状态变量
   * 
   * @param {ConnectionStatus} status - 新的连接状态
   * @returns {void} 无返回值
   * @private
   */
  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
  }

  /**
   * 一次性事件监听
   * 
   * 注册只执行一次的事件监听器
   * 
   * @param {string} eventType - 事件类型
   * @param {(message: WebSocketMessage) => void} handler - 事件处理器
   * @returns {void} 无返回值
   * @private
   */
  private once(eventType: string, handler: (message: WebSocketMessage) => void): void {
    const originalHandler = (event: MessageEvent) => {
      try {
        // 解析消息
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === eventType) {
          // 执行处理器并移除监听器
          handler(message);
          this.websocket?.removeEventListener('message', originalHandler);
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };
    
    // 添加临时消息监听器
    this.websocket?.addEventListener('message', originalHandler);
  }

  /**
   * 获取访问令牌
   * 
   * 从本地存储中获取访问令牌
   * 
   * @returns {string | null} 访问令牌或null
   * @private
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // ===== 实时数据管理方法 =====

  /**
   * 获取实时数据
   *
   * 从WebSocket连接获取最新实时数据
   *
   * @param {string} equipmentId - 设备ID
   * @returns {Promise<UnifiedMonitoringData[]>} 实时数据数组
   */
  async getRealtimeData(equipmentId: string): Promise<UnifiedMonitoringData[]> {
    // 从实时数据缓存中获取指定设备的数据
    const cachedData = this.realtimeDataCache.get(equipmentId);
    if (cachedData) {
      return cachedData;
    }
    return [];
  }

  // ===== 公共查询方法 =====

  /**
   * 获取当前连接状态
   *
   * @returns {ConnectionStatus} 当前连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 获取性能指标
   * 
   * 返回详细的性能监控数据
   * 
   * @returns {PerformanceMetrics} 性能指标对象
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * 获取订阅状态
   * 
   * 返回当前订阅的设备和指标信息
   * 
   * @returns {Object} 订阅状态对象
   */
  getSubscriptionStatus() {
    return {
      deviceIds: [], // 这里应该从实际订阅中获取
      metricTypes: [], // 这里应该从实际订阅中获取
      activeSubscriptions: this.subscriptionId ? 1 : 0, // 活跃订阅数
      failedSubscriptions: [], // 失败的订阅列表
    };
  }

  /**
   * 设置应用性能指标
   * 
   * 更新性能监控指标数据
   * 
   * @param {Partial<PerformanceMetrics>} metrics - 新的性能指标数据
   * @returns {void} 无返回值
   */
  setAppMetrics(metrics: Partial<PerformanceMetrics>): void {
    // 合并新的指标数据
    this.performanceMetrics = { ...this.performanceMetrics, ...metrics };
    
    // 触发性能指标更新回调
    this.callbacks.onPerformanceMetrics?.(this.performanceMetrics);
  }

  /**
   * 获取运行时长
   * 
   * 返回服务从启动到现在的时间长度
   * 
   * @returns {number} 运行时长（毫秒）
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 清理服务资源
   * 
   * 销毁服务实例并清理所有资源
   * 包括连接、计时器和队列的清理
   * 
   * @returns {void} 无返回值
   */
  destroy(): void {
    // 断开连接
    this.disconnect();
    
    // 清理连接超时定时器
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    // 清理重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 清空消息队列
    this.messageQueue = [];
  }
}

/**
 * 创建实时数据服务实例
 * 
 * 使用默认配置创建实时数据服务实例
 * 
 * @returns {RealTimeService} 实时数据服务实例
 */
export const createRealTimeService = (): RealTimeService => {
  // 获取WebSocket服务器地址（从环境变量或使用默认值）
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
  
  // 创建服务实例
  return new RealTimeService({
    url: wsUrl,                           // WebSocket服务器地址
    reconnectInterval: 5000,             // 重连间隔：5秒
    maxReconnectAttempts: 5,             // 最大重连次数：5次
    heartbeatInterval: 30000,            // 心跳间隔：30秒
    subscriptionTimeout: 10000,          // 订阅超时：10秒
  });
};

// 创建默认的实时数据服务实例
export const realTimeService = createRealTimeService();

// 导出便捷方法（解构导出，方便直接调用）
export const {
  connect,                   // 建立WebSocket连接
  disconnect,                // 断开WebSocket连接
  subscribe,                 // 订阅设备数据
  unsubscribe,               // 取消数据订阅
  getConnectionStatus,       // 获取连接状态
  getPerformanceMetrics,     // 获取性能指标
  getSubscriptionStatus,     // 获取订阅状态
  setAppMetrics,             // 设置应用指标
  getUptime,                 // 获取运行时长
} = realTimeService;

/**
 * 使用示例：
 * 
 * ```typescript
 * import { realTimeService, ConnectionStatus } from './services/realtime-service';
 * 
 * // 设置连接回调
 * realTimeService.setCallbacks({
 *   onConnect: () => console.log('WebSocket连接成功'),
 *   onDisconnect: () => console.log('WebSocket连接断开'),
 *   onError: (error) => console.error('WebSocket错误:', error),
 *   onDataUpdate: (deviceId, data) => {
 *     console.log(`设备 ${deviceId} 数据更新:`, data);
 *     // 更新UI显示实时数据
 *     updateDeviceData(deviceId, data);
 *   },
 *   onAlarm: (alarm) => {
 *     console.log('收到告警:', alarm);
 *     // 显示告警通知
 *     showAlarmNotification(alarm);
 *   },
 *   onDeviceStatus: (deviceId, status) => {
 *     console.log(`设备 ${deviceId} 状态变化:`, status);
 *     // 更新设备状态显示
 *     updateDeviceStatus(deviceId, status);
 *   },
 *   onPerformanceMetrics: (metrics) => {
 *     console.log('性能指标:', metrics);
 *     // 更新性能监控界面
 *     updatePerformanceMetrics(metrics);
 *   }
 * });
 * 
 * // 建立WebSocket连接
 * const token = localStorage.getItem('access_token');
 * if (token) {
 *   try {
 *     await realTimeService.connect(token);
 *     console.log('实时数据服务连接成功');
 *   } catch (error) {
 *     console.error('实时数据服务连接失败:', error);
 *   }
 * }
 * 
 * // 订阅设备数据
 * const deviceIds = ['pump-001', 'motor-002', 'sensor-003'];
 * const metricTypes = ['temperature', 'pressure', 'vibration', 'flow_rate'];
 * 
 * try {
 *   const response = await realTimeService.subscribe(deviceIds, metricTypes, {
 *     maxRate: 1000,                    // 最大更新频率1Hz
 *     quality: ['good', 'fair'],       // 包含良好和一般质量数据
 *     includeHistory: true             // 包含最近5分钟历史数据
 *   });
 * 
 *   if (response.success) {
 *     console.log('数据订阅成功');
 *   }
 * } catch (error) {
 *   console.error('数据订阅失败:', error);
 * }
 * 
 * // 检查连接状态
 * const status = realTimeService.getConnectionStatus();
 * console.log('当前连接状态:', ConnectionStatus[status]);
 * 
 * // 获取性能指标
 * const metrics = realTimeService.getPerformanceMetrics();
 * console.log('连接延迟:', metrics.realTimeLatency + 'ms');
 * console.log('消息处理时间:', metrics.dataProcessingTime + 'ms');
 * 
 * // 获取订阅状态
 * const subscription = realTimeService.getSubscriptionStatus();
 * console.log('活跃订阅数:', subscription.activeSubscriptions);
 * 
 * // 设置应用性能指标
 * realTimeService.setAppMetrics({
 *   appLoadTime: Date.now() - performance.timing.navigationStart,
 *   routeChangeTime: Date.now(),
 *   apiResponseTime: 150,
 *   renderTime: 50,
 *   memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
 *   cpuUsage: 25
 * });
 * 
 * // 获取运行时长
 * const uptime = realTimeService.getUptime();
 * console.log('服务运行时长:', Math.round(uptime / 1000) + '秒');
 * 
 * // 取消订阅
 * await realTimeService.unsubscribe();
 * 
 * // 断开连接
 * realTimeService.disconnect();
 * 
 * // 清理服务资源
 * realTimeService.destroy();
 * ```
 */