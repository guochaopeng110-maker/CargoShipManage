/**
 * 货船智能机舱管理系统 - 告警状态管理
 * 
 * 职责：
 * 1. 管理告警列表、统计、规则和模板的全局状态。
 * 2. 处理实时告警推送 (WebSocket)。
 * 3. 封装告警相关的 API 操作 (CRUD, 批量处理, 智能分析)。
 * 
 * 架构：
 * - State: 纯数据状态 (items, statistics, realtimeConnected...)
 * - Actions: 业务逻辑 (fetchAlarms, subscribeToRealTimeAlarms...)
 * 
 * @module stores/alarms-store
 */

import { create } from 'zustand';
// 从 API 客户端导入告警相关类型和服务（完全对齐后端接口）
import { AlarmRecord, Service, UpdateAlarmStatusDto } from '@/services/api';
// 前端专用的业务类型（非后端 API 类型）
import { AlarmPushPayload, AlarmBatchPayload, AlarmTrendPayload } from '../types/websocket';
import { realtimeService, ConnectionStatusPayload } from '../services/realtime-service';

// ==========================================
// 类型别名（使用后端类型）
// ==========================================

/** 告警严重程度枚举 - 导出供外部使用 */
export const AlertSeverity = AlarmRecord.severity;
export type AlertSeverity = AlarmRecord.severity;

/** 告警状态枚举 - 导出供外部使用 */
export const AlarmStatus = AlarmRecord.status;
export type AlarmStatus = AlarmRecord.status;

/**
 * 告警记录 - 扩展后端 AlarmRecord 类型，添加前端展示所需字段
 * 前端扩展字段说明：
 * - equipmentName: 设备名称（用于展示，通过 equipmentId 关联查询）
 * - metricType: 指标类型别名（映射自 abnormalMetricType）
 * - message: 告警消息（映射自 faultName）
 */
export interface Alarm extends AlarmRecord {
  equipmentName?: string; // 设备名称（前端扩展字段，用于展示）
  metricType?: string;    // 指标类型别名（映射自 abnormalMetricType）
  message?: string;       // 告警消息（映射自 faultName 或 recommendedAction）
  recommendedAction?: string; // 建议处理措施
}

// ==========================================
// 前端业务类型（非后端 API 定义）
// ==========================================

/** 告警筛选条件 */
interface AlarmFilters {
  deviceId?: string;
  deviceType?: string;
  startTime?: number;
  endTime?: number;
  severity?: AlertSeverity[];
  status?: AlarmStatus[];
  metricType?: string[];
  searchTerm?: string;
}

/** 告警统计 */
interface AlarmStatistics {
  totalCount: number;
  pendingCount: number;
  processingCount: number;
  resolvedCount: number;
  ignoredCount: number;
  groupBySeverity: Array<{
    severity: AlertSeverity;
    count: number;
  }>;
  groupByStatus: Array<{
    status: AlarmStatus;
    count: number;
  }>;
}

/** 告警趋势分析 */
interface AlarmTrendAnalysis {
  period: {
    start: number;
    end: number;
  };
  totalAlarms: number;
  averageResolutionTime: number;
  topAlertSources: Array<{
    equipmentId: string;
    equipmentName: string;
    count: number;
  }>;
  severityDistribution: {
    [severity in AlertSeverity]: number;
  };
  trendData: Array<{
    date: string;
    count: number;
    resolved: number;
    pending: number;
  }>;
}

/** 告警操作类型（已废弃，直接使用 UpdateAlarmStatusDto） */
// enum AlarmAction {
//   ACKNOWLEDGE = 'acknowledge',
//   RESOLVE = 'resolve',
//   ASSIGN = 'assign',
//   IGNORE = 'ignore'
// }

// ==========================================
// Helper Utility
// ==========================================
function mapPayloadToAlarm(payload: AlarmPushPayload): Alarm {
  return {
    id: payload.id,
    equipmentId: payload.equipmentId,
    abnormalMetricType: payload.metricType as AlarmRecord.abnormalMetricType,
    monitoringPoint: payload.monitoringPoint || 'Unknown Equipment',
    faultName: payload.faultName || 'New Alarm',
    abnormalValue: payload.abnormalValue || 0,
    thresholdRange: payload.thresholdRange || '',
    triggeredAt: payload.triggeredAt, // 保持 ISO 字符串格式
    severity: payload.severity as AlertSeverity,
    status: payload.status as AlarmStatus,
    handler: payload.handler || undefined,
    handleNote: payload.handleNote || undefined,
    createdAt: payload.timestamp,
    // 前端展示字段映射
    equipmentName: (payload as any).equipmentName || payload.equipmentId || '未知设备',
    metricType: payload.metricType,
    message: payload.faultName || '新告警', // 优先使用 faultName 作为消息
    recommendedAction: payload.recommendedAction // 映射建议措施
  };
}

/**
 * 将 API 返回的告警对象映射为前端展示用的 Alarm 对象
 * 主要处理字段别名和扁平化嵌套对象
 */
function mapToDisplayAlarm(item: any): Alarm {
  return {
    ...item,
    // 映射设备名称：优先取 nested equipment.deviceName
    equipmentName: item.equipment?.deviceName || item.equipmentName || '未知设备',
    // 映射指标类型
    metricType: item.abnormalMetricType || item.metricType,
    // 映射告警消息：优先取 faultName，其次 recommendedAction
    message: item.faultName || item.message || item.recommendedAction,
    recommendedAction: item.recommendedAction // 映射建议措施
  };
}

// ==========================================
// State 定义
// ==========================================
interface AlarmsState {
  // 基础数据
  items: Alarm[];
  selectedAlarms: string[]; // IDs
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: AlarmFilters;

  // 高级数据
  statistics: AlarmStatistics | null;
  trendAnalysis: AlarmTrendAnalysis | null;

  // 特殊告警列表
  pendingAlarms: Alarm[];
  criticalAlarms: Alarm[];
  emergencyAlarms: Alarm[];

  // 历史告警查询相关状态（新增）
  historicalAlarms: {
    items: Alarm[];      // 查询结果列表
    total: number;       // 总数
    page: number;        // 当前页
    pageSize: number;    // 每页大小
  };
  queryStatus: 'idle' | 'loading' | 'success' | 'error'; // 查询状态
  queryFilters: AlarmFilters;  // 当前查询的筛选条件

  // 规则与配置
  alarmRules: any[];
  alarmTemplates: any[];
  alarmConfig: any | null;

  // 状态标识
  loading: boolean;
  error: string | null;
  realtimeConnected: boolean; // WebSocket 连接状态
  realtimeSubscriptionActive: boolean; // 订阅激活状态
  smartProcessing: boolean; // 智能处理中

  // 批量操作状态
  bulkOperationStatus: {
    operation: 'acknowledge' | 'resolve' | 'ignore';
    totalItems: number;
    processedItems: number;
    failedItems: string[];
    status: 'in_progress' | 'completed' | 'failed';
    startedAt: number;
    completedAt?: number;
  } | null;
}

// ==========================================
// Actions 定义
// ==========================================
interface AlarmsActions {
  // === 初始化/实时 ===
  initSubscription: () => void;
  /**
   * 清理订阅相关资源
   */
  disposeSubscription: () => void;

  /**
   * 清理事件监听器
   */
  cleanup: () => void;

  /**
   * 重置 Store 状态 (注销时调用)
   */
  reset: () => void;

  // === 基础 CRUD ===
  fetchAlarms: (params?: {
    page?: number;
    pageSize?: number;
    filters?: AlarmFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeRelated?: boolean;
    realTime?: boolean;
  }) => Promise<any>;

  getAlarm: (alarmId: string, includeRelated?: boolean) => Promise<Alarm>;

  // === 告警处理 ===
  acknowledgeAlarm: (alarmId: string, note?: string) => Promise<void>;
  resolveAlarm: (alarmId: string, note?: string) => Promise<void>;
  ignoreAlarm: (alarmId: string, reason: string) => Promise<void>;
  assignAlarm: (alarmId: string, assignee: string, note?: string) => Promise<void>;

  // === 批量操作 ===
  bulkAcknowledge: (alarmIds: string[], note?: string) => Promise<any>;
  bulkResolve: (alarmIds: string[], note?: string) => Promise<any>;
  bulkIgnore: (alarmIds: string[], reason: string) => Promise<any>;

  // === 智能/高级功能 ===
  smartBulkProcess: (params: {
    alarmIds: string[];
    strategy: 'auto' | 'by_severity' | 'by_type' | 'by_equipment';
    maxConfidence?: number;
    includeManualReview?: boolean;
  }) => Promise<any>;

  getAlarmTrendAnalysis: (params: any) => Promise<AlarmTrendAnalysis>;
  getAlarmStatistics: (params?: any) => Promise<AlarmStatistics>;
  getPendingAlarms: (limit?: number) => Promise<any>;
  getCriticalAlarms: (params?: any) => Promise<Alarm[]>;

  handleEmergencyAlarm: (alarmId: string, action: 'acknowledge' | 'escalate' | 'auto_resolve') => Promise<void>;

  // === 规则管理 ===
  getAlarmRules: () => Promise<any[]>;

  // === 本地状态操作 ===
  setPage: (page: number) => void;
  setFilters: (filters: AlarmFilters) => void;
  setSelectedAlarms: (ids: string[]) => void;
  clearError: () => void;

  // === 历史告警查询（新增）===
  fetchHistoricalAlarms: (filters: AlarmFilters, page?: number) => Promise<void>;
  setQueryFilters: (filters: AlarmFilters) => void;
  setQueryPage: (page: number) => void;

  // === Internal Handlers ===
  handleRealtimeAlarm: (payload: AlarmPushPayload) => void;
  handleAlarmBatch: (payload: AlarmBatchPayload) => void;
  handleAlarmTrend: (payload: AlarmTrendPayload) => void;
  handleConnectionStatus: (status: ConnectionStatusPayload) => void;
}

export type AlarmsStore = AlarmsState & AlarmsActions;

// ==========================================
// Store Implementation
// ==========================================
export const useAlarmsStore = create<AlarmsStore>((set, get) => ({
  // --- Initial State ---
  items: [],
  selectedAlarms: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  filters: {},
  statistics: null,
  trendAnalysis: null,
  pendingAlarms: [],
  criticalAlarms: [],
  emergencyAlarms: [],

  // 历史告警查询相关初始状态
  historicalAlarms: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  },
  queryStatus: 'idle',
  queryFilters: {},

  alarmRules: [],
  alarmTemplates: [],
  alarmConfig: null,
  loading: false,
  error: null,
  realtimeConnected: false,
  realtimeSubscriptionActive: false,
  smartProcessing: false,
  bulkOperationStatus: null,

  // --- Actions ---

  initSubscription: () => {
    /**
     * 监听实时告警推送（单个告警）
     */
    realtimeService.on('alarm:push', (payload: AlarmPushPayload) => {
      get().handleRealtimeAlarm(payload);
    });

    /**
     * 监听批量告警推送
     */
    realtimeService.on('alarm:batch', (payload: AlarmBatchPayload) => {
      get().handleAlarmBatch(payload);
    });

    /**
     * 监听告警趋势更新
     */
    realtimeService.on('alarm:trend', (payload: AlarmTrendPayload) => {
      get().handleAlarmTrend(payload);
    });

    /**
     * 监听连接状态变化（内部事件，需要类型断言）
     */
    (realtimeService.on as any)('connection:status', (status: ConnectionStatusPayload) => {
      get().handleConnectionStatus(status);
    });

    set({
      realtimeSubscriptionActive: true,
      realtimeConnected: false
    });
  },

  disposeSubscription: () => {
    // Note: To properly remove listener we need reference, skipping for singleton simplicity for now
    // or we could add `off` to `realtimeService` if strictly needed.
    set({ realtimeSubscriptionActive: false });
  },

  /**
   * 处理实时告警推送（单个告警）
   *
   * 功能：
   * 1. 转换 WebSocket Payload 为 Alarm 对象
   * 2. 根据告警状态判断是新建还是更新
   * 3. 自动分类告警（pending、critical、emergency）
   * 4. 更新统计数据
   *
   * @param payload AlarmPushPayload - WebSocket 推送的告警数据
   */
  handleRealtimeAlarm: (payload: AlarmPushPayload) => {
    try {
      const alarm = mapPayloadToAlarm(payload);
      const state = get();

      // 检查是否已存在该告警（根据 ID）
      const existingIndex = state.items.findIndex(item => item.id === alarm.id);
      const isNewAlarm = existingIndex === -1;

      // 1. 更新告警列表
      let newItems: Alarm[];
      if (isNewAlarm) {
        // 新告警：添加到列表顶部
        newItems = [alarm, ...state.items];
      } else {
        // 已存在：更新该告警（保持位置）
        newItems = [...state.items];
        newItems[existingIndex] = alarm;
      }

      // 2. 更新 pending 告警列表（状态为 pending 的告警）
      const newPendingAlarms = newItems.filter(a => a.status === AlarmStatus.PENDING);

      // 3. 更新 critical 告警列表（严重程度为 high 或 critical）
      const newCriticalAlarms = newItems.filter(
        a => a.severity === AlertSeverity.HIGH || a.severity === AlertSeverity.CRITICAL
      );

      // 4. 更新 emergency 告警列表（严重程度为 critical 且状态为 pending）
      let newEmergencyAlarms = state.emergencyAlarms;
      if (alarm.severity === AlertSeverity.CRITICAL && alarm.status === AlarmStatus.PENDING) {
        // 添加到紧急告警列表
        if (!newEmergencyAlarms.find(item => item.id === alarm.id)) {
          newEmergencyAlarms = [alarm, ...newEmergencyAlarms];
        } else {
          // 更新已存在的紧急告警
          newEmergencyAlarms = newEmergencyAlarms.map(item =>
            item.id === alarm.id ? alarm : item
          );
        }
      } else if (alarm.status !== AlarmStatus.PENDING) {
        // 如果告警已被处理，从紧急列表中移除
        newEmergencyAlarms = newEmergencyAlarms.filter(a => a.id !== alarm.id);
      }

      // 5. 更新状态
      set({
        items: newItems,
        total: isNewAlarm ? state.total + 1 : state.total, // 仅新告警时增加总数
        pendingAlarms: newPendingAlarms,
        criticalAlarms: newCriticalAlarms,
        emergencyAlarms: newEmergencyAlarms
      });
    } catch (error) {
      console.error('处理实时告警失败:', error, payload);
      set({ error: '处理实时告警失败' });
    }
  },

  fetchAlarms: async (params) => {
    const state = get();
    const requestPage = params?.page ?? state.page;
    const requestPageSize = params?.pageSize ?? state.pageSize;
    const requestFilters = params?.filters ?? state.filters;

    set({ loading: true, error: null });

    try {
      // 调用后端 API：alarmControllerFindAllAlarms
      const response = await Service.alarmControllerFindAllAlarms(
        requestFilters.deviceId, // equipmentId
        undefined, // monitoringPoint
        requestFilters.severity?.[0], // severity (只取第一个)
        requestFilters.status?.[0], // status (只取第一个)
        requestFilters.startTime, // startTime
        requestFilters.endTime, // endTime
        requestPage, // page
        requestPageSize // pageSize
      );

      // 解析响应结构：兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const rawItems = (result.items || []) as any[];
      const items = rawItems.map(mapToDisplayAlarm);
      const totalPages = Math.ceil((result.total || 0) / requestPageSize);

      set({
        items,
        total: result.total || 0,
        page: result.page || requestPage,
        pageSize: result.pageSize || requestPageSize,
        totalPages,
        filters: requestFilters,
        loading: false,
        error: null
      });

      return {
        items,
        total: result.total || 0,
        page: result.page || requestPage,
        pageSize: result.pageSize || requestPageSize,
        totalPages
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取告警列表失败';
      console.error('获取告警列表失败:', error);

      // 返回空结果（不再使用Mock数据回退）
      const emptyResponse = {
        items: [],
        total: 0,
        page: requestPage,
        pageSize: requestPageSize,
        totalPages: 0
      };

      set({
        items: [],
        total: 0,
        page: requestPage,
        pageSize: requestPageSize,
        totalPages: 0,
        filters: requestFilters,
        loading: false,
        error: errorMessage // 设置错误信息供UI展示
      });

      return emptyResponse;
    }
  },

  getAlarm: async (alarmId) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：alarmControllerFindOneAlarm
      const alarm = await Service.alarmControllerFindOneAlarm(alarmId);
      set({ loading: false });
      return alarm as Alarm;
    } catch (error) {
      set({ loading: false, error: '获取告警详情失败' });
      throw error;
    }
  },

  acknowledgeAlarm: async (alarmId, note) => {
    try {
      // 调用后端 API：alarmControllerUpdateAlarmStatus
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.PROCESSING as UpdateAlarmStatusDto.status, // 确认告警 -> 处理中
        handleNote: note
      };
      await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);

      // 更新本地状态
      set(state => ({
        items: state.items.map(a => a.id === alarmId ? { ...a, status: AlarmStatus.PROCESSING, handleNote: note } : a),
        emergencyAlarms: state.emergencyAlarms.filter(a => a.id !== alarmId)
      }));
    } catch (error) {
      set({ error: '确认告警失败' });
      throw error;
    }
  },

  resolveAlarm: async (alarmId, note) => {
    try {
      // 调用后端 API：alarmControllerUpdateAlarmStatus
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.RESOLVED as UpdateAlarmStatusDto.status, // 解决告警
        handleNote: note
      };
      await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);

      // 更新本地状态
      set(state => ({
        items: state.items.map(a => a.id === alarmId ? { ...a, status: AlarmStatus.RESOLVED, handleNote: note } : a),
        emergencyAlarms: state.emergencyAlarms.filter(a => a.id !== alarmId)
      }));
    } catch (error) {
      set({ error: '解决告警失败' });
    }
  },

  ignoreAlarm: async (alarmId, reason) => {
    try {
      // 调用后端 API：alarmControllerUpdateAlarmStatus
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.IGNORED as UpdateAlarmStatusDto.status, // 忽略告警
        handleNote: reason
      };
      await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);

      // 刷新列表
      get().fetchAlarms();
    } catch (error) {
      set({ error: '忽略告警失败' });
    }
  },

  assignAlarm: async (alarmId, assignee, note) => {
    try {
      // 调用后端 API：alarmControllerUpdateAlarmStatus
      // 注意：后端 UpdateAlarmStatusDto 不支持 handler 字段，仅更新状态和备注
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.PROCESSING as UpdateAlarmStatusDto.status, // 分配告警 -> 处理中
        handleNote: note ? `分配给: ${assignee}. ${note}` : `分配给: ${assignee}`
      };
      await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);

      // 刷新列表
      get().fetchAlarms();
    } catch (e) {
      set({ error: '分配告警失败' });
    }
  },

  bulkAcknowledge: async (alarmIds, note) => {
    set({ bulkOperationStatus: { operation: 'acknowledge', totalItems: alarmIds.length, processedItems: 0, failedItems: [], status: 'in_progress', startedAt: Date.now() } });

    try {
      // 后端不支持批量操作，循环调用单个更新接口
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.PROCESSING as UpdateAlarmStatusDto.status,
        handleNote: note
      };

      let successCount = 0;
      const failedIds: string[] = [];

      for (const alarmId of alarmIds) {
        try {
          await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);
          successCount++;
        } catch (error) {
          console.error(`确认告警 ${alarmId} 失败:`, error);
          failedIds.push(alarmId);
        }
      }

      set({
        bulkOperationStatus: {
          operation: 'acknowledge',
          totalItems: alarmIds.length,
          processedItems: successCount,
          failedItems: failedIds,
          status: 'completed',
          startedAt: Date.now(),
          completedAt: Date.now()
        }
      });

      get().fetchAlarms();

      return {
        success: successCount,
        failed: failedIds.length,
        errors: failedIds.map(id => ({ alarmId: id, error: '更新失败' }))
      };
    } catch (e) {
      set({ bulkOperationStatus: { ...get().bulkOperationStatus!, status: 'failed' }, error: '批量确认失败' });
      throw e;
    }
  },

  bulkResolve: async (alarmIds, note) => {
    try {
      // 后端不支持批量操作，循环调用单个更新接口
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.RESOLVED as UpdateAlarmStatusDto.status,
        handleNote: note
      };

      let successCount = 0;
      const failedIds: string[] = [];

      for (const alarmId of alarmIds) {
        try {
          await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);
          successCount++;
        } catch (error) {
          console.error(`解决告警 ${alarmId} 失败:`, error);
          failedIds.push(alarmId);
        }
      }

      get().fetchAlarms();

      return {
        success: successCount,
        failed: failedIds.length,
        errors: failedIds.map(id => ({ alarmId: id, error: '更新失败' }))
      };
    } catch (e) {
      throw e;
    }
  },

  bulkIgnore: async (alarmIds, reason) => {
    try {
      // 后端不支持批量操作，循环调用单个更新接口
      const updateDto: UpdateAlarmStatusDto = {
        status: AlarmStatus.IGNORED as UpdateAlarmStatusDto.status,
        handleNote: reason
      };

      let successCount = 0;
      const failedIds: string[] = [];

      for (const alarmId of alarmIds) {
        try {
          await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);
          successCount++;
        } catch (error) {
          console.error(`忽略告警 ${alarmId} 失败:`, error);
          failedIds.push(alarmId);
        }
      }

      get().fetchAlarms();

      return {
        success: successCount,
        failed: failedIds.length,
        errors: failedIds.map(id => ({ alarmId: id, error: '更新失败' }))
      };
    } catch (e) {
      throw e;
    }
  },

  smartBulkProcess: async (params) => {
    // 后端不支持智能批量处理，使用简化版本
    set({ smartProcessing: true });
    try {
      console.warn('智能批量处理功能暂未实现，使用普通批量操作');

      // 根据策略选择批量操作
      let result;
      if (params.strategy === 'auto') {
        // 自动策略：确认所有告警
        result = await get().bulkAcknowledge(params.alarmIds, '自动批量确认');
      } else {
        // 其他策略：确认所有告警
        result = await get().bulkAcknowledge(params.alarmIds, `批量处理 (${params.strategy})`);
      }

      set({ smartProcessing: false });
      return result;
    } catch (e) {
      set({ smartProcessing: false, error: '智能处理失败' });
      throw e;
    }
  },

  getAlarmTrendAnalysis: async (params) => {
    // 后端不支持告警趋势分析，返回空数据
    console.warn('告警趋势分析功能暂未实现');

    const trendAnalysis: AlarmTrendAnalysis = {
      period: {
        start: params?.startTime || Date.now() - 7 * 24 * 60 * 60 * 1000,
        end: params?.endTime || Date.now()
      },
      totalAlarms: 0,
      averageResolutionTime: 0,
      topAlertSources: [],
      severityDistribution: {
        [AlertSeverity.LOW]: 0,
        [AlertSeverity.MEDIUM]: 0,
        [AlertSeverity.HIGH]: 0,
        [AlertSeverity.CRITICAL]: 0
      },
      trendData: []
    };

    set({ trendAnalysis });
    return trendAnalysis;
  },

  getAlarmStatistics: async (params) => {
    try {
      // 调用后端 API：queryControllerGetAlarmStatistics
      const response = await Service.queryControllerGetAlarmStatistics(
        params?.startTime,
        params?.endTime
      );

      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;

      // 转换后端响应为前端格式
      // 后端返回: { totalCount, groupBySeverity: {}, groupByStatus: {} }
      const statistics: AlarmStatistics = {
        totalCount: result.totalCount || 0,
        pendingCount: (result.groupByStatus?.['pending'] as number) || 0,
        processingCount: (result.groupByStatus?.['processing'] as number) || 0,
        resolvedCount: (result.groupByStatus?.['resolved'] as number) || 0,
        ignoredCount: (result.groupByStatus?.['ignored'] as number) || 0,
        groupBySeverity: [
          { severity: AlertSeverity.LOW, count: (result.groupBySeverity?.['low'] as number) || 0 },
          { severity: AlertSeverity.MEDIUM, count: (result.groupBySeverity?.['medium'] as number) || 0 },
          { severity: AlertSeverity.HIGH, count: (result.groupBySeverity?.['high'] as number) || 0 },
          { severity: AlertSeverity.CRITICAL, count: (result.groupBySeverity?.['critical'] as number) || 0 }
        ],
        groupByStatus: [
          { status: AlarmStatus.PENDING, count: (result.groupByStatus?.['pending'] as number) || 0 },
          { status: AlarmStatus.PROCESSING, count: (result.groupByStatus?.['processing'] as number) || 0 },
          { status: AlarmStatus.RESOLVED, count: (result.groupByStatus?.['resolved'] as number) || 0 },
          { status: AlarmStatus.IGNORED, count: (result.groupByStatus?.['ignored'] as number) || 0 }
        ]
      };

      set({ statistics });
      return statistics;
    } catch (error) {
      console.error('获取告警统计失败:', error);

      // 返回空统计数据
      const emptyStats: AlarmStatistics = {
        totalCount: 0,
        pendingCount: 0,
        processingCount: 0,
        resolvedCount: 0,
        ignoredCount: 0,
        groupBySeverity: [
          { severity: AlertSeverity.LOW, count: 0 },
          { severity: AlertSeverity.MEDIUM, count: 0 },
          { severity: AlertSeverity.HIGH, count: 0 },
          { severity: AlertSeverity.CRITICAL, count: 0 }
        ],
        groupByStatus: [
          { status: AlarmStatus.PENDING, count: 0 },
          { status: AlarmStatus.PROCESSING, count: 0 },
          { status: AlarmStatus.RESOLVED, count: 0 },
          { status: AlarmStatus.IGNORED, count: 0 }
        ]
      };

      set({ statistics: emptyStats });
      return emptyStats;
    }
  },

  getPendingAlarms: async (limit) => {
    try {
      // 通过 fetchAlarms 筛选待处理告警
      const response = await Service.alarmControllerFindAllAlarms(
        undefined, // equipmentId
        undefined, // monitoringPoint
        undefined, // severity
        AlarmStatus.PENDING as 'pending', // status: 仅查询待处理
        undefined, // startTime
        undefined, // endTime
        1, // page
        limit || 10 // pageSize
      );

      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const rawItems = (result.items || []) as any[];
      const alarms = rawItems.map(mapToDisplayAlarm);

      set({ pendingAlarms: alarms });

      return {
        alarms,
        total: result.total || 0
      };
    } catch (error) {
      console.error('获取待处理告警失败:', error);
      return { alarms: [], total: 0 };
    }
  },

  getCriticalAlarms: async (params) => {
    try {
      // 通过 fetchAlarms 筛选严重告警 (high 和 critical)
      // 注意：API 只支持单个 severity，先查询 critical
      const criticalResponse = await Service.alarmControllerFindAllAlarms(
        params?.equipmentId,
        undefined,
        AlertSeverity.CRITICAL as 'critical',
        undefined,
        params?.startTime,
        params?.endTime,
        1,
        50 // 限制50条
      );

      // 兼容处理可能的 .data 包装
      const criticalResult = (criticalResponse as any).data || criticalResponse;
      const rawCriticalItems = (criticalResult.items || []) as any[];
      const criticalAlarms = rawCriticalItems.map(mapToDisplayAlarm);

      // 再查询 high 级别
      const highResponse = await Service.alarmControllerFindAllAlarms(
        params?.equipmentId,
        undefined,
        AlertSeverity.HIGH as 'high',
        undefined,
        params?.startTime,
        params?.endTime,
        1,
        50
      );

      const highResult = (highResponse as any).data || highResponse;
      const rawHighItems = (highResult.items || []) as any[];
      const highAlarms = rawHighItems.map(mapToDisplayAlarm);

      // 合并结果
      const allCriticalAlarms = [...criticalAlarms, ...highAlarms];

      set({ criticalAlarms: allCriticalAlarms });
      return allCriticalAlarms;
    } catch (error) {
      console.error('获取严重告警失败:', error);
      return [];
    }
  },

  handleEmergencyAlarm: async (alarmId, action) => {
    // 后端不支持紧急告警专用处理，使用普通告警操作
    set({ smartProcessing: true });
    try {
      if (action === 'acknowledge') {
        await get().acknowledgeAlarm(alarmId, '紧急告警已确认');
      } else if (action === 'auto_resolve') {
        await get().resolveAlarm(alarmId, '紧急告警自动解决');
      } else if (action === 'escalate') {
        // 升级操作：标记为处理中，并添加备注
        const updateDto: UpdateAlarmStatusDto = {
          status: AlarmStatus.PROCESSING as UpdateAlarmStatusDto.status,
          handleNote: '紧急告警已升级'
        };
        await Service.alarmControllerUpdateAlarmStatus(alarmId, updateDto);
        get().fetchAlarms();
      }

      set({ smartProcessing: false });
    } catch (e) {
      set({ smartProcessing: false, error: '紧急处理失败' });
    }
  },

  getAlarmRules: async () => {
    // 后端不支持告警规则管理，返回空数组
    console.warn('告警规则管理功能暂未实现');
    set({ alarmRules: [] });
    return [];
  },

  setPage: (page) => {
    set({ page });
    get().fetchAlarms();
  },

  setFilters: (filters) => {
    set({ filters, page: 1 });
    get().fetchAlarms();
  },

  setSelectedAlarms: (ids) => set({ selectedAlarms: ids }),

  clearError: () => set({ error: null }),

  /**
   * 处理批量告警推送
   *
   * 功能：
   * 1. 接收批量告警数据（通常在重连或离线消息缓冲时触发）
   * 2. 批量转换并更新告警列表
   * 3. 重新计算分类统计
   *
   * @param payload AlarmBatchPayload - 批量告警数据
   */
  handleAlarmBatch: (payload: AlarmBatchPayload) => {
    try {
      const state = get();
      const newAlarms = payload.alarms.map(mapPayloadToAlarm);

      // 合并新告警到现有列表（去重）
      const existingIds = new Set(state.items.map(a => a.id));
      const uniqueNewAlarms = newAlarms.filter(a => !existingIds.has(a.id));

      const mergedItems = [...uniqueNewAlarms, ...state.items];

      // 重新计算分类列表
      const newPendingAlarms = mergedItems.filter(a => a.status === AlarmStatus.PENDING);
      const newCriticalAlarms = mergedItems.filter(
        a => a.severity === AlertSeverity.HIGH || a.severity === AlertSeverity.CRITICAL
      );
      const newEmergencyAlarms = mergedItems.filter(
        a => a.severity === AlertSeverity.CRITICAL && a.status === AlarmStatus.PENDING
      );

      set({
        items: mergedItems,
        total: state.total + uniqueNewAlarms.length,
        pendingAlarms: newPendingAlarms,
        criticalAlarms: newCriticalAlarms,
        emergencyAlarms: newEmergencyAlarms
      });

      console.log(`批量处理 ${payload.count} 条告警，新增 ${uniqueNewAlarms.length} 条`);
    } catch (error) {
      console.error('处理批量告警失败:', error, payload);
      set({ error: '处理批量告警失败' });
    }
  },

  /**
   * 处理告警趋势更新
   *
   * 功能：
   * 1. 接收告警趋势统计数据（来自 WebSocket）
   * 2. 转换为完整的 AlarmTrendAnalysis 格式
   * 3. 更新 trendAnalysis 状态
   *
   * 注意：WebSocket 提供的是简化的趋势数据，
   * 这里将其转换为前端需要的完整分析格式
   *
   * @param payload AlarmTrendPayload - 告警趋势数据
   */
  handleAlarmTrend: (payload: AlarmTrendPayload) => {
    try {
      // 解析 period 字符串为时间范围
      // 例如 "7d" -> 过去7天
      const now = Date.now();
      let startTime = now;

      const periodMatch = payload.period.match(/^(\d+)([hdwm])$/);
      if (periodMatch) {
        const value = parseInt(periodMatch[1]);
        const unit = periodMatch[2];

        switch (unit) {
          case 'h': // 小时
            startTime = now - value * 60 * 60 * 1000;
            break;
          case 'd': // 天
            startTime = now - value * 24 * 60 * 60 * 1000;
            break;
          case 'w': // 周
            startTime = now - value * 7 * 24 * 60 * 60 * 1000;
            break;
          case 'm': // 月
            startTime = now - value * 30 * 24 * 60 * 60 * 1000;
            break;
        }
      }

      // 转换为 AlarmTrendAnalysis 格式
      const trendAnalysis: AlarmTrendAnalysis = {
        period: {
          start: startTime,
          end: now
        },
        totalAlarms: payload.totalAlarms,
        averageResolutionTime: 0, // WebSocket 未提供，默认为0
        topAlertSources: [], // WebSocket 未提供，默认为空
        severityDistribution: {
          [AlertSeverity.LOW]: payload.lowCount,
          [AlertSeverity.MEDIUM]: payload.mediumCount,
          [AlertSeverity.HIGH]: payload.highCount,
          [AlertSeverity.CRITICAL]: payload.criticalCount
        },
        trendData: [] // WebSocket 未提供详细趋势数据，默认为空
      };

      set({ trendAnalysis });

      console.log(
        `收到告警趋势更新 (${payload.period}): 总数 ${payload.totalAlarms}, 趋势 ${payload.trend}`
      );
    } catch (error) {
      console.error('处理告警趋势失败:', error, payload);
    }
  },

  /**
   * 处理连接状态变化
   *
   * 功能：
   * 1. 更新实时连接状态
   * 2. 在断开连接时显示警告
   * 3. 重连成功时恢复订阅状态
   *
   * @param status ConnectionStatusPayload - 连接状态信息
   */
  handleConnectionStatus: (status: ConnectionStatusPayload) => {
    set({
      realtimeConnected: status.connected,
      error: status.error || null
    });

    // 如果连接断开，显示警告
    if (!status.connected && status.error) {
      console.warn('实时告警连接状态变化:', status.error);
    }

    // 如果重连成功，恢复订阅状态
    if (status.connected && !status.reconnecting) {
      console.log('实时告警连接已恢复');
      set({ realtimeSubscriptionActive: true });
    }
  },

  /**
   * 获取历史告警数据（新增）
   *
   * 功能：
   * 1. 根据筛选条件查询历史告警
   * 2. 支持分页加载
   * 3. 完全复用 DataQueryPage 的"筛选-分页列表"模式
   *
   * @param filters 筛选条件（设备、等级、状态、日期范围等）
   * @param page 页码，默认使用当前页
   */
  fetchHistoricalAlarms: async (filters: AlarmFilters, page?: number) => {
    const currentPage = page ?? get().historicalAlarms.page;
    const pageSize = get().historicalAlarms.pageSize;

    // 设置加载状态
    set({ queryStatus: 'loading', queryFilters: filters });

    try {
      // 调用后端 API 获取历史告警数据
      const response = await Service.alarmControllerFindAllAlarms(
        filters.deviceId,
        undefined,
        filters.severity?.[0],
        filters.status?.[0],
        filters.startTime,
        filters.endTime,
        currentPage,
        pageSize
      );

      // 解析响应结构：兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const rawItems = (result.items || []) as any[];
      const items = rawItems.map(mapToDisplayAlarm);

      // 更新历史告警状态
      set({
        historicalAlarms: {
          items,
          total: result.total || 0,
          page: result.page || currentPage,
          pageSize: result.pageSize || pageSize,
        },
        queryStatus: 'success',
      });
    } catch (error) {
      console.error('获取历史告警失败:', error);
      set({
        queryStatus: 'error',
        error: error instanceof Error ? error.message : '查询失败，请稍后重试',
      });
    }
  },

  /**
   * 设置查询筛选条件（新增）
   *
   * @param filters 新的筛选条件
   */
  setQueryFilters: (filters: AlarmFilters) => {
    set({ queryFilters: filters });
  },

  /**
   * 设置查询页码并重新查询（新增）
   *
   * @param page 新的页码
   */
  setQueryPage: async (page: number) => {
    const filters = get().queryFilters;
    await get().fetchHistoricalAlarms(filters, page);
  },

  /**
   * 清理事件监听器
   *
   * 功能：
   * 1. 移除所有事件监听器（避免内存泄漏）
   * 2. 重置连接状态
   * 3. 在组件卸载或用户退出时调用
   *
   * 注意：由于使用匿名函数，无法精确移除监听器
   * 更好的做法是在 initSubscription 时保存监听器引用
   */
  cleanup: () => {
    console.log('[AlarmsStore] 执行部分清理，保留全局连接状态');
  },

  reset: () => {
    set({
      items: [],
      selectedAlarms: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      filters: {},
      statistics: null,
      trendAnalysis: null,
      pendingAlarms: [],
      criticalAlarms: [],
      emergencyAlarms: [],
      historicalAlarms: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      },
      queryStatus: 'idle',
      queryFilters: {},
      alarmRules: [],
      alarmTemplates: [],
      alarmConfig: null,
      loading: false,
      error: null,
      realtimeConnected: false,
      realtimeSubscriptionActive: false,
      smartProcessing: false,
      bulkOperationStatus: null,
    });
    console.log('[AlarmsStore] 状态已重置');
  }

}));

// ==========================================
// Selectors
// ==========================================
export const selectAlarmsList = (state: AlarmsStore) => state.items;
export const selectAlarmStats = (state: AlarmsStore) => state.statistics;
export const selectRealtimeAlarmStatus = (state: AlarmsStore) => ({
  connected: state.realtimeConnected,
  active: state.realtimeSubscriptionActive
});

/**
 * 兼容性 Hook
 * @deprecated 建议直接使用 useAlarmsStore + Selectors
 */
export const useAlarms = () => {
  const store = useAlarmsStore();
  return {
    ...store,
    // Aliases
  };
};

// ==========================================
// 导出筛选条件和统计类型供外部使用
// ==========================================
export type { AlarmFilters, AlarmStatistics };
// Alarm, AlertSeverity, AlarmStatus 已在文件顶部导出