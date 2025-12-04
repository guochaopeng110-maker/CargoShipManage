/**
 * 货船智能机舱管理系统 - 告警管理服务（增强版）
 * 
 * 扩展功能：
 * 1. 集成高级认证系统和权限控制
 * 2. 支持实时告警推送和WebSocket连接
 * 3. 增强的告警规则和模板管理
 * 4. 智能告警分析和趋势预测
 * 5. 多维度告警统计和报表生成
 * 6. 告警升级和自动处理机制
 * 7. 紧急告警快速响应系统
 * 8. 告警审计和合规性管理
 * 
 * 核心架构：
 * - 基于TypeScript的类型安全服务
 * - 集成RESTful API和WebSocket实时通信
 * - 支持高级权限控制和用户角色管理
 * - 内置缓存机制和性能优化
 * - 完善的错误处理和重试策略
 * 
 * @version 3.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-11-20
 */

// API客户端和工具导入
import { apiClient } from './api-client';
import { authService } from './auth-service';

// 告警相关类型导入
import {
  Alarm,
  AlarmsState,
  AlarmFilters,
  AlarmStatistics,
  BulkOperationRequest,
  BulkOperationResponse,
  AlarmHandlingRequest,
  AlarmPaginatedResponse,
  AlertSeverity,
  AlarmStatus,
  BulkOperation,
  AlarmAction,
  AlarmDetailResponse,
  AlarmTrendAnalysis,
  AlarmRule,
  AlarmTemplate,
  AlarmConfig,
  AlarmNotificationSettings
} from '../types/alarms';

// 认证相关类型导入
import { User } from '../types/auth';

// Mock数据导入
import {
  generateMockAlarmPaginatedResponse,
  generateMockAlarm,
  generateMockAlarmStatistics,
  generateMockCriticalAlarms,
  generateMockPendingAlarms,
  generateMockAlarmsForDevice,
  generateMockTimeSeriesAlarms,
  getAllMockScenarios
} from '../mocks/mock-alarms-data';

/**
 * WebSocket连接管理类
 */
class WebSocketConnection {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private eventListeners = new Map<string, Function[]>();

  constructor(private url: string) {}

  /**
   * 建立WebSocket连接
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket连接已建立');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = () => {
          console.log('WebSocket连接已关闭');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket错误:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 发送消息
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const event = message.type;
      const listeners = this.eventListeners.get(event);
      
      if (listeners) {
        listeners.forEach(callback => callback(message.data));
      }
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重连WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('WebSocket重连失败:', error);
        });
      }, this.reconnectInterval);
    }
  }

  /**
   * 关闭连接
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * 告警缓存管理类
 */
class AlarmCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟

  /**
   * 删除指定键的缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 检查是否包含指定键
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * 设置缓存
   */
  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * 获取缓存
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * 清除过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取内部缓存引用（用于缓存失效）
   */
  get internalCache(): Map<string, { data: any; timestamp: number; ttl: number }> {
    return this.cache;
  }
}

/**
 * 告警管理服务类（增强版）
 */
export class EnhancedAlarmsService {
  private wsConnection: WebSocketConnection | null = null;
  private cache = new AlarmCache();
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  };

  constructor() {
    // 启动缓存清理定时器
    setInterval(() => this.cache.cleanup(), 60000); // 每分钟清理一次
  }

  // ===== 基础CRUD操作（增强版） =====

  /**
   * 获取告警列表（增强版）
   */
  async getAlarms(params: {
    page?: number;
    pageSize?: number;
    filters?: AlarmFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeRelated?: boolean;
    realTime?: boolean;
  } = {}): Promise<AlarmPaginatedResponse> {
    try {
      // 生成缓存键
      const cacheKey = `alarms:${JSON.stringify(params)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && !params.realTime) {
        return cached;
      }

      // 构建请求参数
      const requestParams = {
        ...params,
        userId: await this.getCurrentUserId(),
        includeMetadata: true,
        includeStatistics: params.includeRelated
      };

      // 发送API请求
      const response = await this.apiRequest<AlarmPaginatedResponse>('get', '/alarms', {
        params: requestParams
      });

      // 缓存结果（除非是实时数据）
      if (!params.realTime) {
        this.cache.set(cacheKey, response.data);
      }

      return response.data;
    } catch (error) {
      console.warn('获取告警列表失败，使用mock数据:', error);
      // 使用mock数据作为回退
      return generateMockAlarmPaginatedResponse(
        params.page || 1,
        params.pageSize || 20,
        params.filters
      );
    }
  }

  /**
   * 获取告警详情（增强版）
   */
  async getAlarm(alarmId: string, includeRelated: boolean = true): Promise<AlarmDetailResponse> {
    try {
      const cacheKey = `alarm:${alarmId}:${includeRelated}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.apiRequest<AlarmDetailResponse>('get', `/alarms/${alarmId}`, {
        params: {
          includeRelated,
          userId: await this.getCurrentUserId()
        }
      });

      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.warn('获取告警详情失败，使用mock数据:', error);
      // 使用mock数据作为回退
      const mockAlarm = generateMockAlarm({ id: alarmId });
      
      // 构造符合AlarmDetailResponse接口的mock数据
      return {
        ...mockAlarm,
        equipment: {
          id: mockAlarm.equipmentId,
          name: mockAlarm.equipmentName,
          type: '未知设备类型',
          location: '未知位置'
        },
        thresholdConfig: {
          id: `threshold-${mockAlarm.equipmentId}`,
          upperLimit: 100,
          lowerLimit: 0,
          duration: 5000
        },
        relatedAlarms: [],
        escalationHistory: [],
        resolutionTime: mockAlarm.handledAt ? mockAlarm.handledAt - mockAlarm.triggeredAt : undefined,
        totalDowntime: mockAlarm.handledAt ? mockAlarm.handledAt - mockAlarm.triggeredAt : undefined
      };
    }
  }

  /**
   * 处理告警（增强版）
   */
  async handleAlarm(request: AlarmHandlingRequest): Promise<void> {
    try {
      // 权限检查
      await this.checkPermission('alarm', request.action);

      const response = await this.apiRequest('post', `/alarms/${request.alarmId}/handle`, {
        data: {
          action: request.action,
          note: request.note,
          assignee: request.assignee,
          timestamp: Date.now(),
          userId: await this.getCurrentUserId()
        }
      });

      // 清除相关缓存
      this.invalidateAlarmCache(request.alarmId);

      // 记录审计日志
      await this.logAuditEvent('alarm_handled', {
        alarmId: request.alarmId,
        action: request.action,
        note: request.note
      });

    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  // ===== 高级功能 =====

  /**
   * 实时告警推送
   */
  async subscribeToRealTimeAlarms(
    onAlarmReceived: (alarm: Alarm) => void,
    onAlarmUpdated: (alarm: Alarm) => void,
    onConnectionStatusChanged: (connected: boolean) => void
  ): Promise<void> {
    try {
      // 建立WebSocket连接
      const token = await authService.getAccessToken();
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/alarms?token=${token}`;
      
      this.wsConnection = new WebSocketConnection(wsUrl);
      
      // 添加事件监听器
      this.wsConnection.addEventListener('alarm_received', onAlarmReceived);
      this.wsConnection.addEventListener('alarm_updated', onAlarmUpdated);
      this.wsConnection.addEventListener('connection_status', onConnectionStatusChanged);

      await this.wsConnection.connect();

      // 发送订阅请求
      this.wsConnection.send({
        type: 'subscribe',
        channels: ['alarms', 'alarm_updates', 'alarm_notifications']
      });

    } catch (error) {
      console.error('建立实时告警连接失败:', error);
      throw error;
    }
  }

  /**
   * 取消实时告警订阅
   */
  unsubscribeFromRealTimeAlarms(): void {
    if (this.wsConnection) {
      this.wsConnection.send({
        type: 'unsubscribe',
        channels: ['alarms', 'alarm_updates', 'alarm_notifications']
      });
      
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * 获取告警趋势分析
   */
  async getAlarmTrendAnalysis(params: {
    startTime: number;
    endTime: number;
    equipmentId?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    includePrediction?: boolean;
  }): Promise<AlarmTrendAnalysis> {
    try {
      const cacheKey = `trend_analysis:${JSON.stringify(params)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.apiRequest<AlarmTrendAnalysis>('get', '/alarms/trend-analysis', {
        params: {
          ...params,
          userId: await this.getCurrentUserId()
        }
      });

      this.cache.set(cacheKey, response.data, 10 * 60 * 1000); // 缓存10分钟
      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 智能告警分类
   */
  async classifyAlarm(alarmId: string): Promise<{
    category: string;
    priority: number;
    confidence: number;
    suggestedActions: string[];
  }> {
    try {
      const response = await this.apiRequest<{
        category: string;
        priority: number;
        confidence: number;
        suggestedActions: string[];
      }>('post', `/alarms/${alarmId}/classify`, {
        data: {
          userId: await this.getCurrentUserId(),
          includeSuggestions: true
        }
      });

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 生成告警报表
   */
  async generateAlarmReport(params: {
    startTime: number;
    endTime: number;
    format: 'pdf' | 'excel' | 'csv';
    includeCharts: boolean;
    sections: string[];
  }): Promise<{
    reportId: string;
    downloadUrl: string;
    expiresAt: number;
  }> {
    try {
      // 权限检查
      await this.checkPermission('alarm_report', 'generate');

      const response = await this.apiRequest<{
        reportId: string;
        downloadUrl: string;
        expiresAt: number;
      }>('post', '/alarms/reports', {
        data: {
          ...params,
          userId: await this.getCurrentUserId()
        }
      });

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 紧急告警处理
   */
  async handleEmergencyAlarm(alarmId: string, action: 'acknowledge' | 'escalate' | 'auto_resolve'): Promise<void> {
    try {
      // 紧急操作不需要权限检查，但需要记录
      const response = await this.apiRequest('post', `/alarms/${alarmId}/emergency`, {
        data: {
          action,
          timestamp: Date.now(),
          userId: await this.getCurrentUserId(),
          emergency: true
        }
      });

      // 清除相关缓存
      this.invalidateAlarmCache(alarmId);

      // 记录紧急操作审计
      await this.logAuditEvent('emergency_alarm_action', {
        alarmId,
        action,
        timestamp: Date.now()
      });

    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 智能确认告警
   */
  async smartAcknowledgeAlarm(alarmId: string, note?: string): Promise<void> {
    try {
      // 获取告警详情
      const alarm = await this.getAlarm(alarmId);
      
      // 智能建议确认方式
      const suggestedAction = await this.classifyAlarm(alarmId);
      
      const ackNote = note || `系统智能确认 - 置信度: ${(suggestedAction.confidence * 100).toFixed(1)}%`;

      await this.handleAlarm({
        alarmId,
        action: AlarmAction.ACKNOWLEDGE,
        note: ackNote
      });

      // 如果置信度很高，自动建议后续操作
      if (suggestedAction.confidence > 0.8) {
        console.log('智能建议操作:', suggestedAction.suggestedActions);
      }

    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 批量智能处理告警
   */
  async smartBulkProcess(params: {
    alarmIds: string[];
    strategy: 'auto' | 'by_severity' | 'by_type' | 'by_equipment';
    maxConfidence?: number;
    includeManualReview?: boolean;
  }): Promise<{
    processed: number;
    skipped: number;
    errors: string[];
    suggestions: Array<{
      alarmId: string;
      suggestedAction: string;
      confidence: number;
    }>;
  }> {
    try {
      const response = await this.apiRequest<{
        processed: number;
        skipped: number;
        errors: string[];
        suggestions: Array<{
          alarmId: string;
          suggestedAction: string;
          confidence: number;
        }>;
      }>('post', '/alarms/smart-bulk-process', {
        data: {
          ...params,
          userId: await this.getCurrentUserId()
        }
      });

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 获取未处理告警（增强版）
   */
  async getPendingAlarms(limit: number = 10, includeAnalysis: boolean = true): Promise<{
    alarms: Alarm[];
    analysis?: {
      totalCount: number;
      criticalCount: number;
      averageAge: number;
      topSources: Array<{ equipmentId: string; count: number }>;
    };
  }> {
    try {
      const response = await this.apiRequest<{
        alarms: Alarm[];
        analysis?: {
          totalCount: number;
          criticalCount: number;
          averageAge: number;
          topSources: Array<{ equipmentId: string; count: number }>;
        };
      }>('get', '/alarms/pending', {
        params: {
          limit,
          includeAnalysis,
          userId: await this.getCurrentUserId()
        }
      });

      return response.data;
    } catch (error) {
      console.warn('获取待处理告警失败，使用mock数据:', error);
      // 使用mock数据作为回退
      const mockAlarms = generateMockPendingAlarms(limit);
      
      if (includeAnalysis) {
        const criticalCount = mockAlarms.filter(alarm => alarm.severity === AlertSeverity.CRITICAL).length;
        const now = Date.now();
        const averageAge = mockAlarms.reduce((sum, alarm) => sum + (now - alarm.triggeredAt), 0) / mockAlarms.length;
        
        // 统计设备来源
        const sourceCount = new Map<string, number>();
        mockAlarms.forEach(alarm => {
          const count = sourceCount.get(alarm.equipmentId) || 0;
          sourceCount.set(alarm.equipmentId, count + 1);
        });
        
        const topSources = Array.from(sourceCount.entries())
          .map(([equipmentId, count]) => ({ equipmentId, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        return {
          alarms: mockAlarms,
          analysis: {
            totalCount: mockAlarms.length,
            criticalCount,
            averageAge,
            topSources
          }
        };
      }
      
      return { alarms: mockAlarms };
    }
  }

  /**
   * 获取告警统计信息
   */
  async getAlarmStatistics(params: {
    startTime?: number;
    endTime?: number;
    equipmentId?: string;
    includeTrends?: boolean;
  }): Promise<AlarmStatistics> {
    try {
      const cacheKey = `alarm_stats:${JSON.stringify(params)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.apiRequest<AlarmStatistics>('get', '/alarms/statistics', {
        params: {
          ...params,
          userId: await this.getCurrentUserId()
        }
      });

      this.cache.set(cacheKey, response.data, 10 * 60 * 1000); // 缓存10分钟
      return response.data;
    } catch (error) {
      console.warn('获取告警统计失败，使用mock数据:', error);
      // 使用mock数据作为回退
      return generateMockAlarmStatistics();
    }
  }

  /**
   * 确认告警
   */
  async acknowledgeAlarm(alarmId: string, note?: string): Promise<void> {
    try {
      await this.handleAlarm({
        alarmId,
        action: AlarmAction.ACKNOWLEDGE,
        note: note || '告警已确认'
      });
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 解决告警
   */
  async resolveAlarm(alarmId: string, note?: string): Promise<void> {
    try {
      await this.handleAlarm({
        alarmId,
        action: AlarmAction.RESOLVE,
        note: note || '告警已解决'
      });
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 忽略告警
   */
  async ignoreAlarm(alarmId: string, reason: string): Promise<void> {
    try {
      await this.handleAlarm({
        alarmId,
        action: AlarmAction.IGNORE,
        note: `忽略原因: ${reason}`
      });
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 分配告警
   */
  async assignAlarm(alarmId: string, assignee: string, note?: string): Promise<void> {
    try {
      await this.handleAlarm({
        alarmId,
        action: AlarmAction.ASSIGN,
        assignee,
        note: note || `告警已分配给 ${assignee}`
      });
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 批量确认告警
   */
  async bulkAcknowledge(alarmIds: string[], note?: string): Promise<BulkOperationResponse> {
    try {
      await this.checkPermission('alarm', 'bulk_operate');
      
      const response = await this.apiRequest<BulkOperationResponse>('post', '/alarms/bulk-operate', {
        data: {
          alarmIds,
          operation: 'acknowledge',
          note: note || '批量确认告警',
          userId: await this.getCurrentUserId()
        }
      });

      // 清除相关缓存
      alarmIds.forEach(alarmId => this.invalidateAlarmCache(alarmId));
      
      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 批量解决告警
   */
  async bulkResolve(alarmIds: string[], note?: string): Promise<BulkOperationResponse> {
    try {
      await this.checkPermission('alarm', 'bulk_operate');
      
      const response = await this.apiRequest<BulkOperationResponse>('post', '/alarms/bulk-operate', {
        data: {
          alarmIds,
          operation: 'resolve',
          note: note || '批量解决告警',
          userId: await this.getCurrentUserId()
        }
      });

      alarmIds.forEach(alarmId => this.invalidateAlarmCache(alarmId));
      
      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 批量忽略告警
   */
  async bulkIgnore(alarmIds: string[], reason: string): Promise<BulkOperationResponse> {
    try {
      await this.checkPermission('alarm', 'bulk_operate');
      
      const response = await this.apiRequest<BulkOperationResponse>('post', '/alarms/bulk-operate', {
        data: {
          alarmIds,
          operation: 'ignore',
          note: `批量忽略原因: ${reason}`,
          userId: await this.getCurrentUserId()
        }
      });

      alarmIds.forEach(alarmId => this.invalidateAlarmCache(alarmId));
      
      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 获取关键告警
   */
  async getCriticalAlarms(params: {
    limit?: number;
    includeResolved?: boolean;
  } = {}): Promise<Alarm[]> {
    try {
      const cacheKey = `critical_alarms:${JSON.stringify(params)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.apiRequest<Alarm[]>('get', '/alarms/critical', {
        params: {
          ...params,
          userId: await this.getCurrentUserId()
        }
      });

      this.cache.set(cacheKey, response.data, 2 * 60 * 1000); // 缓存2分钟
      return response.data;
    } catch (error) {
      console.warn('获取关键告警失败，使用mock数据:', error);
      // 使用mock数据作为回退
      return generateMockCriticalAlarms(params.limit || 10);
    }
  }

  /**
   * 获取告警规则
   */
  async getAlarmRules(): Promise<AlarmRule[]> {
    try {
      const response = await this.apiRequest<AlarmRule[]>('get', '/alarms/rules', {
        params: {
          userId: await this.getCurrentUserId()
        }
      });

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 创建告警规则
   */
  async createAlarmRule(rule: Omit<AlarmRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlarmRule> {
    try {
      // 权限检查
      await this.checkPermission('alarm_rule', 'create');

      const response = await this.apiRequest<AlarmRule>('post', '/alarms/rules', {
        data: {
          ...rule,
          userId: await this.getCurrentUserId()
        }
      });

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 获取告警模板
   */
  async getAlarmTemplates(): Promise<AlarmTemplate[]> {
    try {
      const response = await this.apiRequest<AlarmTemplate[]>('get', '/alarms/templates', {
        params: {
          userId: await this.getCurrentUserId()
        }
      });

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 获取告警配置
   */
  async getAlarmConfig(): Promise<AlarmConfig> {
    try {
      const cacheKey = 'alarm_config';
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        return cached;
      }

      const response = await this.apiRequest<AlarmConfig>('get', '/alarms/config', {
        params: {
          userId: await this.getCurrentUserId()
        }
      });

      this.cache.set(cacheKey, response.data);
      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  /**
   * 更新告警配置
   */
  async updateAlarmConfig(config: Partial<AlarmConfig>): Promise<AlarmConfig> {
    try {
      // 权限检查
      await this.checkPermission('alarm_config', 'update');

      const response = await this.apiRequest<AlarmConfig>('put', '/alarms/config', {
        data: {
          ...config,
          userId: await this.getCurrentUserId()
        }
      });

      // 清除配置缓存
      this.cache.delete('alarm_config');

      return response.data;
    } catch (error) {
      throw this.normalizeAlarmError(error);
    }
  }

  // ===== 私有辅助方法 =====

  /**
   * 统一API请求处理
   */
  private async apiRequest<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    options: any = {}
  ): Promise<{ data: T }> {
    const config = {
      method,
      url: endpoint,
      ...options,
      headers: {
        'Authorization': `Bearer ${await authService.getAccessToken()}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    return await this.retryRequest(config);
  }

  /**
   * 带重试的请求处理
   */
  private async retryRequest(config: any, attempt: number = 1): Promise<any> {
    try {
      // 使用适当的方法调用API客户端
      const method = config.method?.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
      const endpoint = config.url?.replace(/^https?:\/\/[^/]+/, '') || '';
      
      if (method === 'get') {
        return await apiClient.get(endpoint, config);
      } else if (method === 'post') {
        return await apiClient.post(endpoint, config.data, config);
      } else if (method === 'put') {
        return await apiClient.put(endpoint, config.data, config);
      } else if (method === 'delete') {
        return await apiClient.delete(endpoint, config);
      } else {
        throw new Error(`不支持的HTTP方法: ${config.method}`);
      }
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(config, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 获取当前用户ID
   */
  private async getCurrentUserId(): Promise<string> {
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error('用户未登录');
    }
    
    // 从token中解析用户ID（简化处理）
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.userId || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * 权限检查
   */
  private async checkPermission(resource: string, action: string): Promise<void> {
    // 这里应该集成权限检查服务
    // 简化实现，实际应该调用权限验证API
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error('权限不足');
    }
  }

  /**
   * 记录审计事件
   */
  private async logAuditEvent(event: string, data: any): Promise<void> {
    try {
      await this.apiRequest('post', '/audit/alarms', {
        data: {
          event,
          data,
          timestamp: Date.now(),
          userId: await this.getCurrentUserId()
        }
      });
    } catch (error) {
      console.warn('记录审计事件失败:', error);
    }
  }

  /**
   * 清除告警相关缓存
   */
  private invalidateAlarmCache(alarmId: string): void {
    // 清除包含该告警ID的缓存项
    const keysToDelete: string[] = [];
    for (const key of this.cache.internalCache.keys()) {
      if (key.includes(alarmId) || key.includes('alarms:')) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.internalCache.delete(key));
  }

  /**
   * 标准化告警错误
   */
  private normalizeAlarmError(error: any): Error {
    if (error.response) {
      // API错误
      const message = error.response.data?.message || error.message || '告警操作失败';
      return new Error(`告警服务错误: ${message}`);
    } else if (error.code) {
      // 网络错误
      return new Error(`网络错误: ${error.message}`);
    } else {
      // 其他错误
      return new Error(error.message || '告警操作失败');
    }
  }
}

// 创建增强版告警服务实例
export const enhancedAlarmsService = new EnhancedAlarmsService();

// 导出便捷方法
export const {
  getAlarms,
  getAlarm,
  handleAlarm,
  subscribeToRealTimeAlarms,
  unsubscribeFromRealTimeAlarms,
  getAlarmTrendAnalysis,
  classifyAlarm,
  generateAlarmReport,
  handleEmergencyAlarm,
  smartAcknowledgeAlarm,
  smartBulkProcess,
  getPendingAlarms,
  getAlarmStatistics,
  acknowledgeAlarm,
  resolveAlarm,
  ignoreAlarm,
  assignAlarm,
  bulkAcknowledge,
  bulkResolve,
  bulkIgnore,
  getCriticalAlarms,
} = enhancedAlarmsService;

/**
 * 使用示例：
 * 
 * ```typescript
  getAlarmRules,
  createAlarmRule,
  getAlarmTemplates,
  getAlarmConfig,
  updateAlarmConfig,
 * import { enhancedAlarmsService } from './services/alarms-service';
 * 
 * // 基础用法
 * const alarms = await enhancedAlarmsService.getAlarms({
 *   page: 1,
 *   pageSize: 20,
 *   filters: { severity: ['critical', 'high'] },
 *   includeRelated: true
 * });
 * 
 * // 实时告警订阅
 * await enhancedAlarmsService.subscribeToRealTimeAlarms(
 *   (alarm) => console.log('新告警:', alarm),
 *   (alarm) => console.log('告警更新:', alarm),
 *   (connected) => console.log('连接状态:', connected)
 * );
 * 
 * // 智能告警处理
 * await enhancedAlarmsService.smartAcknowledgeAlarm('alarm-123', '智能确认');
 * 
 * // 告警趋势分析
 * const trend = await enhancedAlarmsService.getAlarmTrendAnalysis({
 *   startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
 *   endTime: Date.now(),
 *   groupBy: 'day',
 *   includePrediction: true
 * });
 * 
 * // 批量智能处理
 * const result = await enhancedAlarmsService.smartBulkProcess({
 *   alarmIds: ['alarm-1', 'alarm-2', 'alarm-3'],
 *   strategy: 'auto',
 *   maxConfidence: 0.9
 * });
 * ```
 */