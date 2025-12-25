/**
 * 货船智能机舱管理系统 - 统一监测数据状态管理
 *
 * 职责：
 * 1. 管理实时和历史监测数据状态
 * 2. 处理 WebSocket 实时数据流订阅
 * 3. 管理历史数据查询缓存
 * 4. 维护性能指标和数据质量统计
 *
 * 架构：
 * - State: 纯数据状态 (data, realtimeConnected, cache...)
 * - Actions: 业务逻辑 (fetchMonitoringData, initSubscription...)
 *
 * @module stores/monitoring-store
 */

import { create } from 'zustand';
import { realtimeService, ConnectionStatusPayload } from '../services/realtime-service';
import { MonitoringDataPayload, MonitoringBatchDataMessage, MonitoringDataItem } from '../types/websocket';
import { Service } from '../services/api/services/Service';

// 从后端 API 客户端导入基础类型
import { CreateTimeSeriesDataDto } from '@/services/api';

// ==================== 前端业务逻辑类型定义 ====================

/**
 * 指标类型枚举（前端扩展）
 *
 * 基于后端 CreateTimeSeriesDataDto.metricType，添加前端特有指标
 */
export enum MetricType {
  TEMPERATURE = 'temperature',    // 温度
  VIBRATION = 'vibration',        // 振动
  PRESSURE = 'pressure',          // 压力
  HUMIDITY = 'humidity',          // 湿度
  SPEED = 'speed',                // 转速
  CURRENT = 'current',            // 电流
  VOLTAGE = 'voltage',            // 电压
  POWER = 'power',                // 功率
  FREQUENCY = 'frequency',        // 频率
  LEVEL = 'level',                // 液位
  RESISTANCE = 'resistance',      // 电阻
  SWITCH = 'switch',              // 开关
  SOC = 'soc',                    // 电池荷电状态（前端扩展）
  SOH = 'soh',                    // 电池健康状态（前端扩展）
  ENERGY = 'energy',              // 能量（前端扩展）
  RPM = 'rpm',                    // 转速RPM（前端扩展）
}

/**
 * 数据质量标记枚举（直接使用后端定义）
 *
 * 来源：CreateTimeSeriesDataDto.quality
 */
export enum DataQuality {
  NORMAL = 'normal',        // 正常数据
  ABNORMAL = 'abnormal',    // 异常数据
  SUSPICIOUS = 'suspicious', // 可疑数据
}

/**
 * 数据来源枚举（前端扩展）
 *
 * 基于后端 CreateTimeSeriesDataDto.source
 */
export enum DataSource {
  SENSOR_UPLOAD = 'sensor-upload',        // 传感器上报
  FILE_IMPORT = 'file-import',            // 文件导入
  MANUAL_ENTRY = 'manual-entry',          // 手动输入
  MANUAL_INPUT = 'manual-input',          // 手动输入（别名）
  SYSTEM_GENERATED = 'system-generated',  // 系统生成（前端扩展）
}

/**
 * 连接状态枚举（前端扩展）
 *
 * 用于 WebSocket 连接状态管理
 */
export enum ConnectionStatus {
  CONNECTING = 'connecting',      // 连接中
  CONNECTED = 'connected',        // 已连接
  DISCONNECTED = 'disconnected',  // 未连接
  ERROR = 'error',                // 连接错误
  RECONNECTING = 'reconnecting',  // 重连中
}

/**
 * WebSocket 告警消息（前端特有）
 */
export interface AlertMessage {
  id: string;
  deviceId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

/**
 * WebSocket 设备状态消息（前端特有）
 */
export interface DeviceStatusMessage {
  deviceId: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * WebSocket 订阅确认消息（前端特有）
 */
export interface SubscriptionAckMessage {
  subscriptionId?: string;
  deviceIds: string[];
  status: 'pending' | 'active' | 'inactive' | 'failed';
  startTime: number;
}

/**
 * WebSocket 性能指标（前端特有）
 */
export interface PerformanceMetrics {
  messagesPerSecond: number;
  bytesPerSecond: number;
  averageLatency: number;
  packetLoss: number;
  connectionUptime: number;
  lastUpdate: number;
  connectionLatency: number;
  messageRate: number;
  dataPointsPerSecond: number;
  timestamp: number;
  [key: string]: any; // 允许额外属性
}

/**
 * 指标读数（前端特有）
 */
export interface MetricReading {
  id: string;
  timestamp: number;
  value: number;
  unit: string;
  quality: 'good' | 'bad' | 'uncertain';
  sensorId: string;
  sensorName: string;
  equipmentId: string;
  metadata?: Record<string, any>;
}

/**
 * 统一监测数据接口（前端核心数据结构）
 *
 * 统一实时数据和历史数据的数据结构
 */
export interface UnifiedMonitoringData {
  id: string;                            // 数据唯一ID
  equipmentId: string;                   // 设备ID
  timestamp: number;                     // 时间戳（毫秒）
  metricType: MetricType;                // 指标类型
  value: number;                         // 指标数值
  unit: string;                          // 单位
  quality: DataQuality;                  // 数据质量
  source: DataSource;                    // 数据来源
  createdAt: number;                     // 创建时间
  updatedAt: number;                     // 更新时间
  monitoringPoint?: string;              // 监测点名称（可选）
}

/**
 * 监测数据查询参数（前端特有）
 */
export interface MonitoringQueryParams {
  equipmentId?: string;                  // 设备ID筛选
  metricType?: MetricType;               // 指标类型筛选（单个）
  monitoringPoint?: string;              // 监测点筛选
  startTime?: number;                    // 开始时间（毫秒时间戳）
  endTime?: number;                      // 结束时间（毫秒时间戳）
  quality?: DataQuality[];               // 数据质量筛选
  source?: DataSource[];                 // 数据来源筛选
  limit?: number;                        // 结果数量限制
  offset?: number;                       // 分页偏移量
  page?: number;                         // 当前页码（从1开始）
  pageSize?: number;                     // 每页大小
}

/**
 * 监测数据响应（前端特有）
 */
export interface MonitoringDataResponse {
  items: UnifiedMonitoringData[];        // 数据项列表
  total: number;                         // 总数据量
  page?: number;                         // 当前页码
  pageSize?: number;                     // 每页大小
}

// ==========================================
// 数据转换函数
// ==========================================

/**
 * 将 WebSocket Payload 转换为统一的监测数据类型
 *
 * @param payload MonitoringDataPayload - WebSocket 推送的原始数据
 * @returns UnifiedMonitoringData - 统一的监测数据格式
 */
function transformPayloadToMonitoringData(payload: MonitoringDataPayload): UnifiedMonitoringData {
  if (!payload) {
    throw new Error('Payload is null or undefined');
  }
  try {
    return {
      id: payload.id.toString(), // 将数字 ID 转为字符串
      equipmentId: payload.equipmentId,
      timestamp: new Date(payload.timestamp).getTime(), // ISO 字符串转为 Unix 时间戳（毫秒）
      metricType: payload.metricType as MetricType,
      monitoringPoint: payload.monitoringPoint,
      value: payload.value,
      unit: payload.unit,
      quality: mapQualityString(payload.quality), // 映射质量枚举
      source: mapSourceString(payload.source), // 映射来源枚举
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  } catch (error) {
    console.error('监测数据转换失败:', error, payload);
    // 返回默认值，避免抛出异常
    return {
      id: payload?.id?.toString() || 'unknown',
      equipmentId: payload?.equipmentId || 'unknown',
      timestamp: Date.now(),
      metricType: (payload?.metricType as MetricType) || MetricType.TEMPERATURE,
      value: payload?.value || 0,
      unit: payload?.unit || '',
      quality: DataQuality.NORMAL,
      source: DataSource.SENSOR_UPLOAD,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
}

/**
 * 映射 WebSocket 的 quality 字符串到 DataQuality 枚举
 */
function mapQualityString(quality: string): DataQuality {
  switch (quality) {
    case 'normal':
      return DataQuality.NORMAL;
    case 'abnormal':
      return DataQuality.ABNORMAL;
    case 'suspicious':
      return DataQuality.SUSPICIOUS;
    default:
      return DataQuality.NORMAL;
  }
}

/**
 * 映射 WebSocket 的 source 字符串到 DataSource 枚举
 */
function mapSourceString(source: string): DataSource {
  switch (source) {
    case 'sensor-upload':
      return DataSource.SENSOR_UPLOAD;
    case 'manual-entry':
      return DataSource.MANUAL_INPUT;
    case 'file-import':
      return DataSource.FILE_IMPORT;
    default:
      return DataSource.SENSOR_UPLOAD;
  }
}

/**
 * 映射后端的数字质量码到 DataQuality 枚举
 * 
 * 根据文档，192 为正常
 */
function mapQualityNumber(quality: number): DataQuality {
  return quality === 192 ? DataQuality.NORMAL : DataQuality.ABNORMAL;
}

/**
 * 将批量监控数据项转换为统一监测数据格式
 */
function transformBatchItemToMonitoringData(
  item: MonitoringDataItem,
  equipmentId: string
): UnifiedMonitoringData {
  return {
    id: item.id.toString(),
    equipmentId: equipmentId,
    timestamp: new Date(item.timestamp).getTime(),
    metricType: item.metricType as MetricType,
    monitoringPoint: item.monitoringPoint || undefined,
    value: item.value,
    unit: item.unit,
    quality: mapQualityNumber(item.quality),
    source: mapSourceString(item.source),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

// ==========================================
// 批量更新机制相关
// ==========================================

// 批量更新缓冲区（在 store 外部，所有实例共享）
let pendingUpdates: MonitoringDataPayload[] = [];
let updateTimer: NodeJS.Timeout | null = null;
const UPDATE_INTERVAL = 1000; // 批量更新时间窗口：1秒
const MAX_DATA_POINTS_PER_KEY = 1000; // 每个设备-指标组合的最大数据点数量

// 历史查询接口
interface HistoryQuery {
  id: string;
  deviceId: string;
  metricTypes: string[];
  startTime: number;
  endTime: number;
  granularity?: string;
  aggregation?: string;
  quality?: string[];
  createdAt: number;
}

// 历史查询结果接口
interface HistoryQueryResult {
  query: HistoryQuery;
  data: UnifiedMonitoringData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  executionTime: number;
  cached: boolean;
}

interface ExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number;
  downloadUrl?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt?: number;
}

interface DeviceRealTimeData {
  deviceId: string;
  deviceName: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: number;
  dataPoints: MetricReading[];
  alerts: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * 历史查询参数接口
 * 用于 DataQueryPage 的简化查询模式
 */
export interface HistoricalQueryParams {
  /** 设备 ID */
  deviceId: string;
  /** 监控参数类型列表 */
  metricTypes: string[];
  /** 监测点名称 */
  monitoringPoint?: string;
  /** 查询开始时间（Unix 时间戳，毫秒） */
  startTime: number;
  /** 查询结束时间（Unix 时间戳，毫秒） */
  endTime: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
}

// ==========================================
// State 定义
// ==========================================
interface MonitoringState {
  // ===== 基础数据存储 =====
  /** 统一数据存储 - 按 "equipmentId-metricType" 索引 */
  data: Record<string, UnifiedMonitoringData[]>;

  // 历史查询相关状态
  queries: HistoryQuery[];
  activeQuery: HistoryQuery | null;
  results: Record<string, HistoryQueryResult>;

  // 实时设备数据
  devices: Record<string, DeviceRealTimeData>;

  // ===== 历史数据查询状态（用于 DataQueryPage）=====
  /** 历史数据查询结果 */
  historicalData: {
    /** 数据列表 */
    items: UnifiedMonitoringData[];
    /** 数据总数 */
    total: number;
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    pageSize: number;
    /** 总页数 */
    totalPages: number;
  };

  /** 查询状态 */
  queryStatus: 'idle' | 'loading' | 'success' | 'error';

  /** 查询错误信息 */
  queryError: string | null;

  /** 当前查询参数（用于分页等场景保持查询条件） */
  currentQueryParams: HistoricalQueryParams | null;

  // ===== 状态管理 =====
  loading: boolean;
  queryHistoryLoading: boolean;
  timeSeriesLoading: boolean;
  aggregatedLoading: boolean;

  // 错误信息
  error: string | null;
  queryHistoryError: string | null;
  timeSeriesError: string | null;
  aggregatedError: string | null;

  // 实时错误队列
  errors: Array<{
    code: string;
    message: string;
    timestamp: number;
    deviceId?: string;
  }>;

  // ===== 实时连接状态 (Synced with RealtimeService) =====
  realtimeConnected: boolean;
  connectionStatus: ConnectionStatus;
  reconnectAttempts: number;
  lastUpdate: number;

  // 实时数据订阅列表 (equipmentIds)
  realtimeSubscriptions: string[];

  // ===== 缓存管理 =====
  queryCache: Map<string, HistoryQueryResult>;
  cacheExpiry: Map<string, number>;
  maxCacheSize: number;

  // ===== 性能指标 =====
  performanceMetrics: PerformanceMetrics & {
    messageCount: number;
    lastMessageTime: number;
    dataThroughput: number; // bytes/sec approx
    cacheHitRate: number;
  };

  // ===== 数据质量统计 =====
  dataQualityStats: {
    [key: string]: {
      total: number;
      normal: number;
      estimated: number;
      questionable: number;
      bad: number;
    };
  };

  /** 导入进度追踪 */
  importProgress: Record<string, {
    batchId: string;
    equipmentId: string;
    current: number;
    total: number;
    percentage: number;
    isHistory: boolean;
    lastUpdated: number;
  }>;
}

// ==========================================
// Actions 定义
// ==========================================
interface MonitoringActions {
  /**
   * 初始化/启动操作
   * 建立 WebSocket 连接并设置全局监听
   */
  init: (token: string) => void;

  /** 销毁/清理操作 */
  dispose: () => void;

  /**
   * 订阅指定设备的实时数据
   * 会同时调用 realtimeService.subscribeToEquipment 并更新本地状态
   */
  subscribeToDevice: (equipmentId: string) => Promise<boolean>;

  /** 取消订阅 */
  unsubscribeFromDevice: (equipmentId: string) => Promise<void>;

  /** 查询监测数据 (REST API) */
  fetchMonitoringData: (params: MonitoringQueryParams) => Promise<MonitoringDataResponse>;

  /** 执行历史查询 (带缓存) */
  executeQuery: (query: Omit<HistoryQuery, 'id' | 'createdAt'>) => Promise<HistoryQuery>;

  /** 清除缓存 */
  clearCache: () => void;

  /**
   * 获取历史数据（用于 DataQueryPage）
   * 简化的查询接口，支持分页
   * @param params 查询参数
   */
  fetchHistoricalData: (params: HistoricalQueryParams) => Promise<void>;

  /**
   * 导出历史数据
   * @param format 导出格式
   */
  exportHistoricalData: (format: 'excel' | 'csv' | 'json') => Promise<void>;

  /**
   * 清除历史查询结果
   */
  clearHistoricalData: () => void;

  /**
   * 重置查询状态
   */
  resetQueryStatus: () => void;

  /**
   * 处理接收到的实时数据 (Internal Action)
   * @internal 内部方法，由事件监听器调用
   */
  handleRealtimeData: (data: MonitoringDataPayload) => void;

  /**
   * 处理接收到的批量实时数据 (Internal Action)
   * @internal 内部方法，由事件监听器调用
   */
  handleBatchData: (msg: MonitoringBatchDataMessage) => void;

  /**
   * 处理连接状态变化 (Internal Action)
   * @internal 内部方法，由事件监听器调用
   */
  handleConnectionStatus: (status: ConnectionStatusPayload) => void;

  /**
   * 清理事件监听器
   * 在组件卸载或用户退出时调用
   */
  cleanup: () => void;

  /**
   * 重置 Store 状态 (注销时调用)
   */
  reset: () => void;
}

export type MonitoringStore = MonitoringState & MonitoringActions;

// ==========================================
// Store Implementation
// ==========================================
export const useMonitoringStore = create<MonitoringStore>((set, get) => ({
  // --- 初始 State ---
  data: {},
  queries: [],
  activeQuery: null,
  results: {},
  devices: {},

  // 历史数据查询初始状态
  historicalData: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  },
  queryStatus: 'idle',
  queryError: null,
  currentQueryParams: null,

  loading: false,
  queryHistoryLoading: false,
  timeSeriesLoading: false,
  aggregatedLoading: false,

  error: null,
  queryHistoryError: null,
  timeSeriesError: null,
  aggregatedError: null,
  errors: [],

  realtimeConnected: false,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  reconnectAttempts: 0,
  lastUpdate: 0,
  realtimeSubscriptions: [],

  queryCache: new Map(),
  cacheExpiry: new Map(),
  maxCacheSize: 100,

  performanceMetrics: {
    messagesPerSecond: 0,
    bytesPerSecond: 0,
    averageLatency: 0,
    packetLoss: 0,
    connectionUptime: 0,
    lastUpdate: Date.now(),
    appLoadTime: 0,
    routeChangeTime: 0,
    apiResponseTime: 0,
    websocketConnectionTime: 0,
    dataProcessingTime: 0,
    realTimeLatency: 0,
    renderTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    errorRate: 0,
    crashRate: 0,
    connectionLatency: 0,
    messageRate: 0,
    dataPointsPerSecond: 0,
    timestamp: Date.now(),
    messageCount: 0,
    lastMessageTime: 0,
    dataThroughput: 0,
    fetchTime: 0,
    avgFetchTime: 0,
    processDataTime: 0,
    avgProcessTime: 0,
    cacheHitRate: 0,
  },

  dataQualityStats: {},

  importProgress: {},

  // --- Actions ---

  init: (token: string) => {
    // 1. 建立连接
    realtimeService.connect(token);

    // 2. 注册事件监听器
    realtimeService.on('monitoring:new-data', (data) => {
      get().handleRealtimeData(data);
    });

    // 注册批量数据监听器
    realtimeService.on('monitoring:batch-data', (msg) => {
      get().handleBatchData(msg);
    });

    // 注册连接状态监听（内部事件，需要类型断言）
    (realtimeService.on as any)('connection:status', (status: ConnectionStatusPayload) => {
      get().handleConnectionStatus(status);
    });

    // 3. 更新初始连接状态
    set({
      realtimeConnected: false,
      connectionStatus: ConnectionStatus.CONNECTING
    });
  },

  dispose: () => {
    realtimeService.disconnect();
    set({
      realtimeConnected: false,
      connectionStatus: ConnectionStatus.DISCONNECTED
    });
  },

  subscribeToDevice: async (equipmentId: string) => {
    // 1. 调用 Service
    const success = await realtimeService.subscribeToEquipment(equipmentId);

    // 2. 更新本地状态
    if (success) {
      set(state => ({
        realtimeSubscriptions: Array.from(new Set([...state.realtimeSubscriptions, equipmentId]))
      }));
    }
    return success;
  },

  unsubscribeFromDevice: async (equipmentId: string) => {
    await realtimeService.unsubscribeFromEquipment(equipmentId);
    set(state => ({
      realtimeSubscriptions: state.realtimeSubscriptions.filter(id => id !== equipmentId)
    }));
  },


  fetchMonitoringData: async (params) => {
    set({ loading: true, error: null });
    const startTime = Date.now();

    try {
      // 验证必填参数
      if (!params.equipmentId || !params.startTime || !params.endTime) {
        throw new Error('设备ID、开始时间和结束时间不能为空');
      }

      // 直接调用后端 API
      const response = await Service.monitoringControllerQueryMonitoringData(
        params.equipmentId,
        params.startTime,
        params.endTime,
        params.metricType ? (params.metricType as any) : undefined, // metricType 可选
        undefined, // monitoringPoint 参数（可选）
        params.page || 1,
        params.pageSize || 100
      );

      const fetchTime = Date.now() - startTime;

      // 解析后端响应：兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const items: UnifiedMonitoringData[] = (result.items as UnifiedMonitoringData[]) || [];
      const total: number = result.total || 0;

      // 更新 Performance Metrics
      set(state => ({
        performanceMetrics: {
          ...state.performanceMetrics,
          fetchTime,
          avgFetchTime: state.performanceMetrics.avgFetchTime
            ? (state.performanceMetrics.avgFetchTime + fetchTime) / 2
            : fetchTime
        }
      }));

      // 更新 Data
      const dataKey = `${params.equipmentId}-${params.metricType || 'all'}`;

      set(state => ({
        loading: false,
        data: {
          ...state.data,
          [dataKey]: items
        }
      }));

      // 返回标准响应格式（符合 MonitoringDataResponse 接口）
      return {
        items,
        total,
        page: params.page || 1,
        pageSize: params.pageSize || 100
      };
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '获取监测数据失败'
      });
      throw error;
    }
  },

  executeQuery: async (queryData) => {
    // 生成 ID 和 时间戳
    const queryWithId = {
      ...queryData,
      id: `query_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      createdAt: Date.now(),
    } as HistoryQuery;

    // TODO: 实现缓存检查逻辑 (类似于原文件中的 getCacheKey/getCachedResult)
    // 为保持简洁，这里直接由 executeQuery 触发 fetchMonitoringData

    // 更新查询历史列表
    set(state => ({
      queries: [queryWithId, ...state.queries],
      activeQuery: queryWithId
    }));

    return queryWithId;
  },

  clearCache: () => {
    set(state => {
      state.queryCache.clear();
      state.cacheExpiry.clear();
      return {
        queryCache: new Map(),
        cacheExpiry: new Map()
      };
    });
  },

  /**
   * 获取历史数据（用于 DataQueryPage）
   * 简化的查询接口，支持分页
   */
  fetchHistoricalData: async (params: HistoricalQueryParams) => {
    // 设置加载状态
    set({ queryStatus: 'loading', queryError: null });

    try {
      // 保存当前查询参数
      set({ currentQueryParams: params });

      // 策略逻辑：如果用户想要查询全部，或者指标太多，就不带 metricType 以获得完整的时间线
      const shouldQueryAll = params.metricTypes.length > 3 || !params.monitoringPoint || params.monitoringPoint === 'ALL_POINTS';
      const primaryMetricType = shouldQueryAll ? undefined : params.metricTypes[0];

      // 直接调用后端 API
      const response = await Service.monitoringControllerQueryMonitoringData(
        params.deviceId,
        params.startTime,
        params.endTime,
        primaryMetricType as any,
        params.monitoringPoint === 'ALL_POINTS' ? undefined : params.monitoringPoint,
        params.page,
        params.pageSize
      );

      // 解析后端响应：兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      let allData: UnifiedMonitoringData[] = (result.items as UnifiedMonitoringData[]) || [];
      let totalCount: number = result.total || 0;

      // 如果有多个指标，且之前没有执行“查询全部”逻辑，则需要合并数据
      if (!shouldQueryAll && params.metricTypes.length > 1) {
        // 查询其他指标的数据
        const otherMetrics = params.metricTypes.slice(1);
        const otherQueries = otherMetrics.map(metricType =>
          Service.monitoringControllerQueryMonitoringData(
            params.deviceId,
            params.startTime,
            params.endTime,
            metricType as any,
            params.monitoringPoint,
            params.page,
            params.pageSize
          )
        );

        const otherResults = await Promise.all(otherQueries);

        // 合并所有数据
        otherResults.forEach((res) => {
          const resultData = (res as any).data || res;
          if (resultData.items) {
            allData = [...allData, ...(resultData.items as UnifiedMonitoringData[])];
            totalCount += resultData.total || 0;
          }
        });

        // 按时间戳排序
        allData.sort((a: UnifiedMonitoringData, b: UnifiedMonitoringData) => a.timestamp - b.timestamp);
      }

      // 计算总页数
      const totalPages = Math.ceil(totalCount / params.pageSize);

      // 更新状态
      set({
        historicalData: {
          items: allData,
          total: totalCount,
          page: params.page,
          pageSize: params.pageSize,
          totalPages,
        },
        queryStatus: 'success',
      });

      console.log(`历史数据查询成功: ${allData.length} 条数据`);
    } catch (error) {
      // 处理错误
      const errorMessage = error instanceof Error ? error.message : '查询失败';
      set({
        queryStatus: 'error',
        queryError: errorMessage,
      });

      console.error('历史数据查询失败:', error);
      throw error;
    }
  },

  /**
   * 导出历史数据
   * @param format 导出格式
   */
  exportHistoricalData: async (format: 'excel' | 'csv' | 'json') => {
    const { currentQueryParams, historicalData } = get();

    // 验证是否有可导出的数据
    if (!currentQueryParams || historicalData.items.length === 0) {
      throw new Error('没有可导出的数据，请先执行查询');
    }

    try {
      // 准备导出数据
      const exportData = {
        data: historicalData.items,
        format,
        filename: `monitoring_data_${Date.now()}`,
      };

      // 根据格式处理数据
      if (format === 'json') {
        // JSON 格式：直接下载
        const jsonStr = JSON.stringify(exportData.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportData.filename}.json`;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`数据已导出为 JSON 格式: ${exportData.filename}.json`);
      } else if (format === 'csv') {
        // CSV 格式：转换为 CSV 字符串
        if (exportData.data.length === 0) {
          throw new Error('没有数据可导出');
        }

        // CSV 表头
        const headers = ['时间', '设备ID', '参数类型', '数值', '单位', '质量', '来源'];
        const csvRows = [headers.join(',')];

        // CSV 数据行
        exportData.data.forEach(item => {
          const row = [
            new Date(item.timestamp).toLocaleString('zh-CN'),
            item.equipmentId,
            item.metricType,
            item.value,
            item.unit || '',
            item.quality,
            item.source,
          ];
          csvRows.push(row.join(','));
        });

        // 添加 BOM 头以支持中文
        const csvStr = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportData.filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`数据已导出为 CSV 格式: ${exportData.filename}.csv`);
      } else if (format === 'excel') {
        // Excel 格式：这里简化处理，实际应使用库（如 xlsx）
        // 暂时使用 CSV 格式代替
        console.warn('Excel 导出功能待完善，当前使用 CSV 格式');

        const headers = ['时间', '设备ID', '参数类型', '数值', '单位', '质量', '来源'];
        const csvRows = [headers.join(',')];

        exportData.data.forEach(item => {
          const row = [
            new Date(item.timestamp).toLocaleString('zh-CN'),
            item.equipmentId,
            item.metricType,
            item.value,
            item.unit || '',
            item.quality,
            item.source,
          ];
          csvRows.push(row.join(','));
        });

        const csvStr = '\uFEFF' + csvRows.join('\n');
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exportData.filename}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`数据已导出为 Excel 格式: ${exportData.filename}.xlsx`);
      }
    } catch (error) {
      console.error('数据导出失败:', error);
      throw error;
    }
  },

  /**
   * 清除历史查询结果
   */
  clearHistoricalData: () => {
    set({
      historicalData: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      queryStatus: 'idle',
      queryError: null,
      currentQueryParams: null,
    });

    console.log('历史查询结果已清除');
  },

  /**
   * 重置查询状态
   */
  resetQueryStatus: () => {
    set({
      queryStatus: 'idle',
      queryError: null,
    });
  },

  /**
   * 处理接收到的实时监测数据
   *
   * 实现批量更新机制：
   * - 将数据收集到缓冲区
   * - 每1秒批量更新一次 store 状态
   * - 限制每个设备-指标组合最多保留1000个数据点
   *
   * @param payload MonitoringDataPayload - WebSocket 推送的数据
   */
  handleRealtimeData: (payload: MonitoringDataPayload) => {
    // 过滤空数据
    if (payload) {
      pendingUpdates.push(payload);
    }

    // 如果定时器未启动，启动批量更新定时器
    if (!updateTimer && pendingUpdates.length > 0) {
      updateTimer = setTimeout(() => {
        // 批量处理缓冲区中的所有数据
        const updates = [...pendingUpdates];
        pendingUpdates = []; // 清空缓冲区
        updateTimer = null;

        // 批量更新 store 状态
        set(state => {
          const newData = { ...state.data };
          const newDevices = { ...state.devices };
          let messageCount = state.performanceMetrics.messageCount;

          // 遍历所有待更新的数据
          updates.forEach(payload => {
            try {
              // 转换数据格式
              const transformed = transformPayloadToMonitoringData(payload);

              // 计算索引键：equipmentId-monitoringPoint (使用中文监测点名称)
              const key = `${transformed.equipmentId}-${transformed.monitoringPoint}`;

              // 获取现有数据（如果有）
              const existingData = newData[key] || [];

              // 追加新数据点
              let updatedData = [...existingData, transformed];

              // 限制数据点数量（FIFO策略）
              if (updatedData.length > MAX_DATA_POINTS_PER_KEY) {
                updatedData = updatedData.slice(-MAX_DATA_POINTS_PER_KEY);
              }

              newData[key] = updatedData;

              // 更新设备状态
              if (!newDevices[transformed.equipmentId]) {
                newDevices[transformed.equipmentId] = {
                  deviceId: transformed.equipmentId,
                  deviceName: payload.monitoringPoint || transformed.equipmentId,
                  status: 'online',
                  lastSeen: transformed.timestamp,
                  dataPoints: [],
                  alerts: 0,
                  connectionQuality: 'excellent'
                };
              } else {
                newDevices[transformed.equipmentId] = {
                  ...newDevices[transformed.equipmentId],
                  lastSeen: transformed.timestamp,
                  status: 'online'
                };
              }

              messageCount++;
            } catch (error) {
              console.error('处理实时监测数据失败:', error, payload);
            }
          });

          return {
            data: newData,
            devices: newDevices,
            lastUpdate: Date.now(),
            performanceMetrics: {
              ...state.performanceMetrics,
              messageCount,
              lastMessageTime: Date.now()
            }
          };
        });
      }, UPDATE_INTERVAL);
    }
  },

  /**
   * 处理接收到的批量实时数据
   * 
   * - 更新导入进度状态
   * - 如果是非历史数据（实时批量），则并入波形缓存
   * - 完成后触发通知并自动清理状态
   *
   * @param msg MonitoringBatchDataMessage - WebSocket 推送的批量数据包
   */
  handleBatchData: (msg: MonitoringBatchDataMessage) => {
    const { batchId, equipmentId, data, chunkIndex, totalChunks, isHistory } = msg;

    // 1. 更新进度状态
    set(state => ({
      importProgress: {
        ...state.importProgress,
        [batchId]: {
          batchId,
          equipmentId,
          current: chunkIndex,
          total: totalChunks,
          percentage: Math.round((chunkIndex / totalChunks) * 100),
          isHistory,
          lastUpdated: Date.now()
        }
      }
    }));

    // 2. 处理实时批量数据 (isHistory: false)
    // 历史导入数据 (isHistory: true) 不参与实时波形展示，仅记录进度
    if (!isHistory) {
      // 将批量项转换并推入单条消息缓冲区，复用现有的定时批量更新逻辑
      const convertedItems = data.map(item => ({
        id: item.id,
        equipmentId: equipmentId,
        timestamp: item.timestamp,
        metricType: item.metricType,
        monitoringPoint: item.monitoringPoint || '',
        value: item.value,
        unit: item.unit,
        quality: mapQualityNumber(item.quality) as any,
        source: item.source as any
      }));

      pendingUpdates.push(...convertedItems);

      // 如果批量更新定时器未启动，执行一次带空参数的调用以激活定时器（handleRealtimeData 现在内部会处理空参数）
      if (!updateTimer && pendingUpdates.length > 0) {
        get().handleRealtimeData(null as any);
      }
    }

    // 3. 完成处理
    if (chunkIndex === totalChunks) {
      console.log(`[MonitoringStore] 批次 ${batchId} 接收完成 (${totalChunks} 分片)`);

      // 5秒后自动清理进度条状态，给 UI 留出展示“完成”状态的时间
      setTimeout(() => {
        set(state => {
          const nextProgress = { ...state.importProgress };
          delete nextProgress[batchId];
          return { importProgress: nextProgress };
        });
      }, 5000);
    }
  },

  /**
   * 处理连接状态变化
   *
   * @param status ConnectionStatusPayload - 连接状态信息
   */
  handleConnectionStatus: (status: ConnectionStatusPayload) => {
    set({
      realtimeConnected: status.connected,
      connectionStatus: status.connected
        ? ConnectionStatus.CONNECTED
        : ConnectionStatus.DISCONNECTED,
      error: status.error || null
    });

    // 如果连接断开，可以选择显示用户提示
    if (!status.connected && status.error) {
      console.warn('实时连接状态变化:', status.error);
    }
  },

  /**
   * 清理事件监听器
   *
   * 在组件卸载或用户退出时调用，避免内存泄漏
   */
  cleanup: () => {
    // 移除事件监听器
    // 注意：由于我们使用的是匿名函数，无法精确移除
    // 更好的做法是在 init 时保存监听器引用
    // 这里我们清空 store 状态

    // 清空批量更新缓冲区和定时器
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    pendingUpdates = [];

    // 注意：不再在这里重置 realtimeConnected 和 connectionStatus
    // 因为这会导致页面切换时 TopBar 状态误报为断开。
    // 全局连接状态应由 App.tsx 或退出登录逻辑统一管理。
    // 清空进度追踪状态
    set({ importProgress: {} });

    console.log('[MonitoringStore] 执行部分清理，保留全局连接状态');
  },

  reset: () => {
    // 停止任何正在进行的批量更新定时器
    if (updateTimer) {
      clearTimeout(updateTimer);
      updateTimer = null;
    }
    pendingUpdates = [];

    set({
      data: {},
      queries: [],
      activeQuery: null,
      results: {},
      devices: {},
      historicalData: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      queryStatus: 'idle',
      queryError: null,
      currentQueryParams: null,
      loading: false,
      queryHistoryLoading: false,
      timeSeriesLoading: false,
      aggregatedLoading: false,
      error: null,
      queryHistoryError: null,
      timeSeriesError: null,
      aggregatedError: null,
      errors: [],
      realtimeConnected: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0,
      lastUpdate: 0,
      realtimeSubscriptions: [],
      importProgress: {},
      dataQualityStats: {},
    });
    console.log('[MonitoringStore] 状态已重置');
  }
}));

// ==========================================
// Selectors
// ==========================================
export const selectMonitoringData = (state: MonitoringStore) => state.data;
export const selectRealtimeStatus = (state: MonitoringStore) => ({
  connected: state.realtimeConnected,
  status: state.connectionStatus,
  subscriptions: state.realtimeSubscriptions
});
export const selectPerformanceMetrics = (state: MonitoringStore) => state.performanceMetrics;

/**
 * 兼容性 Hook
 * @deprecated 建议直接使用 useMonitoringStore + Selectors
 */
export const useMonitoring = () => {
  const store = useMonitoringStore();

  // 映射一些旧 API 名称以保持兼容
  return {
    ...store,
    // 别名
    createQuery: store.executeQuery,
    connect: store.init
  };
};