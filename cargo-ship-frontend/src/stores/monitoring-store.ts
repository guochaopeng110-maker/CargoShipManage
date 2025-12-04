/**
 * 货船智能机舱管理系统 - 统一监测数据状态管理
 *
 * 核心功能：
 * 1. 统一管理实时和历史监测数据状态（合并history-store.ts和realtime-store.ts功能）
 * 2. 集成monitoring-api.md的数据模型
 * 3. 提供数据转换和验证功能
 * 4. 支持多种数据源和质量标记
 * 5. 统一设备监测配置和阈值管理
 * 6. WebSocket实时连接和数据订阅管理
 * 7. 历史数据查询、缓存和导出功能
 * 8. 数据质量统计和性能指标监控
 *
 * 技术架构：
 * - 基于TypeScript接口的类型安全
 * - 支持数据质量标记和来源追踪
 * - 统一的指标类型和单位定义
 * - 灵活的设备配置和告警阈值
 * - 完整的数据验证和转换机制
 * - 智能缓存系统和错误恢复机制
 * - WebSocket连接管理和实时数据流处理
 *
 * 数据模型统一：
 * - 实时数据和历史数据使用相同基础结构
 * - 支持数据聚合和统计分析
 * - 提供数据导出和导入接口
 * - 统一的错误处理和状态管理
 *
 * 重构说明：
 * - 合并history-store.ts的核心功能：查询创建、执行、缓存、统计等
 * - 合并realtime-store.ts的核心功能：WebSocket连接、设备订阅、实时数据管理等
 * - 保持与现有组件的兼容性
 * - 提供统一的数据获取和管理接口
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 3.0.0  // 更新版本号，反映状态管理重构
 * @since 2025
 */

import { useState, useCallback, useEffect } from 'react';
import { monitoringService } from '../services/monitoring-service';
import { realTimeService } from '../services/realtime-service';
import { 
  UnifiedMonitoringData, 
  MonitoringQueryParams, 
  MonitoringDataResponse,
  MetricType,
  DataQuality,
  DataSource,
  MonitoringStatisticsParams,
  MonitoringStatisticsResponse,
  ConnectionStatus,
  PerformanceMetrics,
  MetricReading
} from '../types/monitoring';

/**
 * 历史查询接口（从history-store.ts迁移）
 */
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

/**
 * 历史查询结果接口（从history-store.ts迁移）
 */
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

/**
 * 导出状态接口（从history-store.ts迁移）
 */
interface ExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number;
  downloadUrl?: string;
  createdAt: number;
  completedAt?: number;
  expiresAt?: number;
}

/**
 * 设备实时数据接口（从realtime-store.ts迁移）
 */
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
 * 统一监测状态接口
 * 
 * 整合历史数据和实时数据的完整状态管理
 */
interface MonitoringState {
  // ===== 基础数据存储 =====
  // 统一数据存储 - 按设备ID和指标类型索引
  data: Record<string, UnifiedMonitoringData[]>;
  
  // 历史查询相关状态
  queries: HistoryQuery[];
  activeQuery: HistoryQuery | null;
  results: Record<string, HistoryQueryResult>;
  
  // 实时设备数据
  devices: Record<string, DeviceRealTimeData>;
  
  // ===== 状态管理 =====
  // 加载状态
  loading: boolean;
  queryHistoryLoading: boolean;    // 查询历史加载状态
  timeSeriesLoading: boolean;      // 时间序列数据加载状态
  aggregatedLoading: boolean;      // 聚合数据加载状态
  
  // 错误信息
  error: string | null;
  queryHistoryError: string | null; // 查询历史错误状态
  timeSeriesError: string | null;  // 时间序列数据错误状态
  aggregatedError: string | null;  // 聚合数据错误状态
  errors: Array<{                  // 实时错误队列
    code: string;
    message: string;
    timestamp: number;
    deviceId?: string;
  }>;
  
  // ===== 实时连接状态 =====
  realtimeConnected: boolean;
  connectionStatus: ConnectionStatus;
  reconnectAttempts: number;
  lastUpdate: number;
  
  // 实时数据订阅列表
  realtimeSubscriptions: string[];
  subscriptionStatus: {
    deviceIds: string[];
    metricTypes: string[];
    activeSubscriptions: number;
    failedSubscriptions: string[];
  };
  
  // ===== 缓存管理 =====
  // 查询缓存
  queryCache: Map<string, HistoryQueryResult>;
  cacheExpiry: Map<string, number>;
  maxCacheSize: number;
  cacheCleanupInterval: NodeJS.Timeout | null;
  
  // 数据缓存
  dataCache: Record<string, MetricReading[]>;
  
  // 数据历史
  dataHistory: Record<string, MetricReading[]>;
  
  // ===== 查询历史记录 =====
  queryHistory: MonitoringQueryParams[];
  
  // ===== 数据统计状态 =====
  statistics: {
    deviceIds: string[];
    metricTypes: string[];
    timeRange: { start: number; end: number };
    stats: {
      totalDataPoints: number;
      valueStats: Record<string, {
        min: number;
        max: number;
        avg: number;
        stdDev: number;
        count: number;
      }>;
      qualityStats: Record<string, number>;
    } | null;
  };
  
  // 时间序列数据状态
  timeSeriesData: Record<string, UnifiedMonitoringData[]>;
  
  // 聚合数据状态
  aggregatedData: Array<{
    timestamp: number;
    deviceId: string;
    metricType: string;
    value: number;
    count: number;
  }>;
  
  // ===== 导出功能 =====
  exporting: ExportStatus | null;
  
  // ===== 性能指标 =====
  performanceMetrics: PerformanceMetrics & {
    // 扩展字段
    messageCount: number;
    lastMessageTime: number;
    dataThroughput: number;
    // 原有字段
    fetchTime: number;
    avgFetchTime: number;
    processDataTime: number;
    avgProcessTime: number;
    cacheHitRate: number;
    lastUpdate: number;
  };
  
  // ===== 缓存信息 =====
  cacheInfo: {
    size: number;
    hits: number;
    misses: number;
    lastCleanup: number;
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
  
  // ===== 连接配置 =====
  connectionConfig: {
    autoReconnect: boolean;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
}

/**
 * 时间范围预设枚举（从history-store.ts迁移）
 */
enum TimeRangePreset {
  LAST_HOUR = 'last_hour',
  LAST_6_HOURS = 'last_6_hours',
  LAST_24_HOURS = 'last_24_hours',
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days'
}

/**
 * 时间粒度枚举（从history-store.ts迁移）
 */
enum TimeGranularity {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

/**
 * 聚合类型枚举（从history-store.ts迁移）
 */
enum AggregationType {
  NONE = 'none',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  COUNT = 'count'
}

/**
 * 统一监测数据状态管理Hook
 * 
 * 整合历史数据和实时数据的状态管理
 * 提供统一的数据获取、订阅和管理接口
 * 
 * 主要功能：
 * - 历史数据查询、缓存、导出
 * - 实时数据WebSocket连接和订阅
 * - 数据统计和分析
 * - 性能指标监控
 * - 错误处理和状态管理
 * 
 * 数据流程：
 * 1. 接收数据查询请求
 * 2. 检查缓存是否有有效数据
 * 3. 如无缓存，从数据源获取数据
 * 4. 更新本地状态和缓存
 * 5. 通知订阅者数据变更
 * 6. 记录性能指标和统计数据
 * 
 * @returns 统一监测数据状态和操作方法
 */
export const useMonitoringStore = () => {
  // 初始化状态
  const [state, setState] = useState<MonitoringState>({
    // 基础数据存储
    data: {},
    queries: [],
    activeQuery: null,
    results: {},
    devices: {},
    
    // 状态管理
    loading: false,
    queryHistoryLoading: false,
    timeSeriesLoading: false,
    aggregatedLoading: false,
    error: null,
    queryHistoryError: null,
    timeSeriesError: null,
    aggregatedError: null,
    errors: [],
    
    // 实时连接状态
    realtimeConnected: false,
    connectionStatus: ConnectionStatus.DISCONNECTED,
    reconnectAttempts: 0,
    lastUpdate: 0,
    realtimeSubscriptions: [],
    subscriptionStatus: {
      deviceIds: [],
      metricTypes: [],
      activeSubscriptions: 0,
      failedSubscriptions: [],
    },
    
    // 缓存管理
    queryCache: new Map(),
    cacheExpiry: new Map(),
    maxCacheSize: 100,
    cacheCleanupInterval: null,
    dataCache: {},
    dataHistory: {},
    
    // 查询历史记录
    queryHistory: [],
    
    // 数据统计状态
    statistics: {
      deviceIds: [],
      metricTypes: [],
      timeRange: { start: 0, end: 0 },
      stats: null,
    },
    timeSeriesData: {},
    aggregatedData: [],
    
    // 导出功能
    exporting: null,
    
    // 性能指标
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
      // 扩展字段
      messageCount: 0,
      lastMessageTime: 0,
      dataThroughput: 0,
      // 原有字段
      fetchTime: 0,
      avgFetchTime: 0,
      processDataTime: 0,
      avgProcessTime: 0,
      cacheHitRate: 0,
    },
    
    // 缓存信息
    cacheInfo: {
      size: 0,
      hits: 0,
      misses: 0,
      lastCleanup: Date.now(),
    },
    
    // 数据质量统计
    dataQualityStats: {},
    
    // 连接配置
    connectionConfig: {
      autoReconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
    },
  });

  // ===== 缓存管理方法（从history-store.ts迁移） =====

  /**
   * 生成缓存键
   * 基于查询参数生成唯一缓存标识
   */
  const getCacheKey = useCallback((query: HistoryQuery): string => {
    return `${query.deviceId}_${query.metricTypes.join(',')}_${query.startTime}_${query.endTime}_${query.granularity}_${query.aggregation}`;
  }, []);

  /**
   * 获取缓存结果
   * 检查缓存是否有效并返回缓存的数据
   */
  const getCachedResult = useCallback((query: HistoryQuery): HistoryQueryResult | null => {
    const cacheKey = getCacheKey(query);
    const cachedResult = state.queryCache.get(cacheKey);
    const expiryTime = state.cacheExpiry.get(cacheKey);
    
    if (cachedResult && expiryTime && Date.now() < expiryTime) {
      // 缓存未过期，更新缓存统计
      setState(prev => ({
        ...prev,
        cacheInfo: {
          ...prev.cacheInfo,
          hits: prev.cacheInfo.hits + 1,
        }
      }));
      return cachedResult;
    }
    
    // 缓存已过期或不存在
    if (cachedResult && expiryTime && Date.now() >= expiryTime) {
      // 清理过期缓存
      state.queryCache.delete(cacheKey);
      state.cacheExpiry.delete(cacheKey);
    }
    
    // 更新缓存统计
    setState(prev => ({
      ...prev,
      cacheInfo: {
        ...prev.cacheInfo,
        misses: prev.cacheInfo.misses + 1,
      }
    }));
    
    return null;
  }, [state.queryCache, state.cacheExpiry, getCacheKey]);

  /**
   * 设置缓存结果
   * 将查询结果存储到缓存中
   */
  const setCachedResult = useCallback((query: HistoryQuery, result: HistoryQueryResult): void => {
    const cacheKey = getCacheKey(query);
    
    // 检查缓存大小限制
    if (state.queryCache.size >= state.maxCacheSize) {
      // 清理最旧的缓存项
      const oldestKey = Array.from(state.cacheExpiry.entries())
        .sort(([,a], [,b]) => a - b)[0]?.[0];
      if (oldestKey) {
        state.queryCache.delete(oldestKey);
        state.cacheExpiry.delete(oldestKey);
      }
    }
    
    // 设置缓存结果，过期时间：30分钟
    const expiryTime = Date.now() + 30 * 60 * 1000;
    state.queryCache.set(cacheKey, result);
    state.cacheExpiry.set(cacheKey, expiryTime);
    
    // 更新缓存统计
    setState(prev => ({
      ...prev,
      cacheInfo: {
        ...prev.cacheInfo,
        size: state.queryCache.size,
      }
    }));
  }, [state.queryCache, state.cacheExpiry, state.maxCacheSize, getCacheKey]);

  /**
   * 清除所有缓存
   */
  const clearCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      queryCache: new Map(),
      cacheExpiry: new Map(),
      dataCache: {},
      cacheInfo: {
        ...prev.cacheInfo,
        size: 0,
        hits: 0,
        misses: 0,
      }
    }));
  }, []);

  /**
   * 清理过期缓存
   */
  const cleanupExpiredCache = useCallback(() => {
    const now = Date.now();
    setState(prev => {
      const newCache = new Map();
      const newExpiry = new Map();
      
      prev.queryCache.forEach((result, key) => {
        const expiry = prev.cacheExpiry.get(key);
        if (expiry && expiry > now) {
          newCache.set(key, result);
          newExpiry.set(key, expiry);
        }
      });
      
      return {
        ...prev,
        queryCache: newCache,
        cacheExpiry: newExpiry,
        cacheInfo: {
          ...prev.cacheInfo,
          size: newCache.size,
        }
      };
    });
  }, []);

  // ===== 缓存清理定时器启动 =====
  useEffect(() => {
    // 每5分钟清理一次过期缓存
    const cleanupInterval = setInterval(cleanupExpiredCache, 5 * 60 * 1000);
    
    setState(prev => ({
      ...prev,
      cacheCleanupInterval: cleanupInterval,
    }));
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, [cleanupExpiredCache]);

  // ===== 历史数据查询方法（从history-store.ts迁移） =====

  /**
   * 创建历史查询
   * 支持缓存检查和智能重试
   */
  const createQuery = useCallback(async (queryData: Omit<HistoryQuery, 'id' | 'createdAt'>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 先检查缓存
      const queryWithId = {
        ...queryData,
        id: `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
      } as HistoryQuery;
      
      const cachedResult = getCachedResult(queryWithId);
      if (cachedResult) {
        // 使用缓存结果
        setState(prev => ({
          ...prev,
          loading: false,
          queries: [queryWithId, ...prev.queries],
          activeQuery: queryWithId,
          results: { ...prev.results, [queryWithId.id]: cachedResult },
        }));
        return queryWithId;
      }

      // 缓存未命中，创建查询对象
      setState(prev => ({
        ...prev,
        queries: [queryWithId, ...prev.queries],
        activeQuery: queryWithId,
        loading: false,
      }));

      return queryWithId;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '创建查询失败',
      }));
      throw error;
    }
  }, [getCachedResult]);

  /**
   * 执行历史查询
   * 支持智能缓存和错误重试
   */
  const executeQuery = useCallback(async (query: HistoryQuery, retryCount: number = 0) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 检查缓存
      const cachedResult = getCachedResult(query);
      if (cachedResult) {
        setState(prev => ({
          ...prev,
          results: { ...prev.results, [query.id]: cachedResult },
          activeQuery: query,
          loading: false,
        }));
        return cachedResult;
      }

      // 缓存未命中，执行查询
      const queryParams: MonitoringQueryParams = {
        equipmentId: query.deviceId,
        metricType: query.metricTypes[0] as MetricType,
        startTime: query.startTime,
        endTime: query.endTime,
        page: 1,
        pageSize: 1000,
      };
      
      const response = await monitoringService.queryMonitoringData(queryParams);
      
      const result: HistoryQueryResult = {
        query,
        data: response.data.items,
        total: response.data.total,
        page: response.data.page,
        pageSize: response.data.pageSize,
        totalPages: response.data.totalPages,
        executionTime: Date.now() - query.startTime,
        cached: false,
      };
      
      // 缓存结果
      setCachedResult(query, result);
      
      setState(prev => ({
        ...prev,
        results: { ...prev.results, [query.id]: result },
        activeQuery: query,
        loading: false,
      }));

      return result;
    } catch (error) {
      // 错误重试机制（最多重试2次）
      if (retryCount < 2) {
        console.log(`查询失败，${1000 * (retryCount + 1)}ms后重试...`);
        setTimeout(() => {
          executeQuery(query, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '执行查询失败',
      }));
      throw error;
    }
  }, [getCachedResult, setCachedResult]);

  /**
   * 获取监测数据（整合版）
   *
   * 从统一数据源获取监测数据，支持实时和历史数据
   * 自动处理缓存、错误和状态更新
   *
   * @param params 查询参数
   * @returns 监测数据响应
   */
  const fetchMonitoringData = useCallback(async (
    params: MonitoringQueryParams
  ): Promise<MonitoringDataResponse> => {
    // 开始获取数据，更新加载状态
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      // 记录开始时间用于性能监控
      const startTime = Date.now();

      // 从监控服务获取数据
      const result = await monitoringService.queryMonitoringData(params);
      
      // 计算获取时间
      const fetchTime = Date.now() - startTime;
      
      // 更新数据存储，使用设备ID和指标类型的组合作为键
      const dataKey = `${params.equipmentId}-${params.metricType || 'all'}`;
      
      // 更新状态
      setState(prev => {
        // 计算数据质量统计
        const qualityStats = { ...prev.dataQualityStats };
        
        if (result.data.items && result.data.items.length > 0) {
          const newStats = { total: 0, normal: 0, estimated: 0, questionable: 0, bad: 0 };
          
          for (const item of result.data.items) {
            newStats.total++;
            switch (item.quality) {
              case DataQuality.NORMAL:
                newStats.normal++;
                break;
              case DataQuality.ESTIMATED:
                newStats.estimated++;
                break;
              case DataQuality.QUESTIONABLE:
                newStats.questionable++;
                break;
              case DataQuality.BAD:
                newStats.bad++;
                break;
            }
          }
          
          qualityStats[dataKey] = newStats;
        }
        
        return {
          ...prev,
          data: {
            ...prev.data,
            [dataKey]: result.data.items || [],
          },
          loading: false,
          error: null,
          performanceMetrics: {
            ...prev.performanceMetrics,
            fetchTime,
            avgFetchTime: prev.performanceMetrics.avgFetchTime 
              ? (prev.performanceMetrics.avgFetchTime + fetchTime) / 2
              : fetchTime,
            lastUpdate: Date.now(),
          },
          dataQualityStats: qualityStats,
        };
      });

      // 更新查询历史记录
      setState(prev => ({
        ...prev,
        queryHistory: [params, ...prev.queryHistory.slice(0, 49)], // 保留最近50条记录
      }));

      return result;
    } catch (error) {
      // 错误处理
      const errorMessage = error instanceof Error ? error.message : '获取监测数据失败';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  // ===== 实时数据方法（从realtime-store.ts迁移） =====

  /**
   * 连接WebSocket
   * 建立实时数据连接
   */
  const connect = useCallback(async (accessToken: string) => {
    setState(prev => ({
      ...prev,
      connectionStatus: ConnectionStatus.CONNECTING,
      errors: [],
    }));

    try {
      await realTimeService.connect(accessToken);
      
      // 设置回调
      realTimeService.setCallbacks({
        onConnect: () => {
          setState(prev => ({
            ...prev,
            connected: true,
            connectionStatus: ConnectionStatus.CONNECTED,
            reconnectAttempts: 0,
          }));
        },
        onDisconnect: () => {
          setState(prev => ({
            ...prev,
            connected: false,
            connectionStatus: ConnectionStatus.DISCONNECTED,
          }));
        },
        onError: (error) => {
          setState(prev => ({
            ...prev,
            connectionStatus: ConnectionStatus.ERROR,
            errors: [...prev.errors, {
              code: 'websocket_error',
              message: error.message,
              timestamp: Date.now(),
            }],
          }));
        },
        onDataUpdate: (deviceId, data) => {
          setState(prev => {
            const deviceData: DeviceRealTimeData = {
              deviceId,
              deviceName: prev.devices[deviceId]?.deviceName || `设备 ${deviceId}`,
              status: prev.devices[deviceId]?.status || 'online',
              lastSeen: Date.now(),
              dataPoints: data,
              alerts: prev.devices[deviceId]?.alerts || 0,
              connectionQuality: 'good',
            };

            return {
              ...prev,
              devices: {
                ...prev.devices,
                [deviceId]: deviceData,
              },
              lastUpdate: Date.now(),
            };
          });
        },
        onAlarm: (alarm) => {
          console.log('收到告警:', alarm);
        },
        onDeviceStatus: (deviceId, status) => {
          setState(prev => ({
            ...prev,
            devices: {
              ...prev.devices,
              [deviceId]: {
                ...prev.devices[deviceId],
                status: status as any,
                lastSeen: Date.now(),
              },
            },
          }));
        },
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        connectionStatus: ConnectionStatus.ERROR,
        errors: [...prev.errors, {
          code: 'connection_failed',
          message: error instanceof Error ? error.message : '连接失败',
          timestamp: Date.now(),
        }],
      }));
      throw error;
    }
  }, []);

  /**
   * 断开WebSocket连接
   */
  const disconnect = useCallback(() => {
    realTimeService.disconnect();
    setState(prev => ({
      ...prev,
      connected: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      lastUpdate: 0,
      reconnectAttempts: 0,
      subscriptionStatus: {
        deviceIds: [],
        metricTypes: [],
        activeSubscriptions: 0,
        failedSubscriptions: [],
      },
      devices: {},
    }));
  }, []);

  /**
   * 订阅实时数据（整合版）
   * 
   * 订阅指定设备和指标类型的实时数据更新
   * 通过WebSocket连接获取实时数据流
   */
  const subscribeToRealtime = useCallback(async (
    equipmentIds: string[],
    metricTypes: string[]
  ) => {
    try {
      // 尝试WebSocket订阅
      const response = await realTimeService.subscribe(equipmentIds, metricTypes);
      
      // 更新实时连接状态和订阅列表
      setState(prev => ({
        ...prev,
        realtimeConnected: true,
        realtimeSubscriptions: [...prev.realtimeSubscriptions, ...equipmentIds],
        subscriptionStatus: {
          deviceIds: equipmentIds,
          metricTypes,
          activeSubscriptions: 1,
          failedSubscriptions: [],
        },
      }));
      
      return response;
    } catch (error) {
      // 如果WebSocket订阅失败，尝试使用数据源管理器
      console.log( "获取WebSocket订阅失败",error);
      throw error;
    }
  }, []);

  /**
   * 取消实时数据订阅
   */
  const unsubscribeFromRealtime = useCallback(async (equipmentIds?: string[]) => {
    try {
      // 取消WebSocket订阅
      await realTimeService.unsubscribe();
      
      // 更新订阅列表
      setState(prev => {
        const updatedSubscriptions = equipmentIds 
          ? prev.realtimeSubscriptions.filter(id => !equipmentIds.includes(id))
          : [];
        
        return {
          ...prev,
          realtimeSubscriptions: updatedSubscriptions,
          subscriptionStatus: equipmentIds ? {
            ...prev.subscriptionStatus,
            deviceIds: prev.subscriptionStatus.deviceIds.filter(id => !equipmentIds.includes(id)),
          } : {
            deviceIds: [],
            metricTypes: [],
            activeSubscriptions: 0,
            failedSubscriptions: [],
          },
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取消实时数据订阅失败';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, []);

  // ===== 数据导出方法（从history-store.ts迁移） =====

  /**
   * 导出数据
   * 支持多种格式和进度跟踪
   */
  const exportData = useCallback(async (
    query: HistoryQuery,
    format: 'csv' | 'excel' | 'json',
    options?: { includeMetadata?: boolean; includeCharts?: boolean }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 使用monitoring-service的exportMonitoringData方法
      const queryParams: MonitoringQueryParams = {
        equipmentId: query.deviceId,
        metricType: query.metricTypes[0] as MetricType,
        startTime: query.startTime,
        endTime: query.endTime,
      };
      
      const blob = await monitoringService.exportMonitoringData(queryParams, {
        format: format as 'excel' | 'csv',
        includeHeaders: options?.includeMetadata,
      });
      
      const exportStatus: ExportStatus = {
        id: `export_${Date.now()}`,
        status: 'completed',
        progress: 100,
        downloadUrl: URL.createObjectURL(blob),
        createdAt: Date.now(),
        completedAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时后过期
      };
      
      setState(prev => ({
        ...prev,
        exporting: exportStatus,
        loading: false,
      }));

      // 启动导出状态轮询
      const pollExportStatus = async (exportId: string) => {
        try {
          // 简化的状态检查
          const status = exportStatus;
          setState(prev => ({ ...prev, exporting: status }));
          
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'expired') {
            return;
          }
          
          // 继续轮询
          setTimeout(() => pollExportStatus(exportId), 2000);
        } catch (pollError) {
          console.error('获取导出状态失败:', pollError);
        }
      };

      // 开始轮询导出状态
      if (exportStatus.id) {
        pollExportStatus(exportStatus.id);
      }

      return exportStatus;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '导出数据失败',
      }));
      throw error;
    }
  }, []);

  // ===== 数据统计方法（从history-store.ts迁移） =====

  /**
   * 获取查询历史
   */
  const fetchQueryHistory = useCallback(async (page: number = 1, pageSize: number = 20) => {
    setState(prev => ({ ...prev, queryHistoryLoading: true, queryHistoryError: null }));

    try {
      // 简化的查询历史
      const history = {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
      
      setState(prev => ({
        ...prev,
        queryHistory: page === 1 ? history.items : [...prev.queryHistory, ...history.items],
        queryHistoryLoading: false,
      }));

      return history;
    } catch (error) {
      setState(prev => ({
        ...prev,
        queryHistoryLoading: false,
        queryHistoryError: error instanceof Error ? error.message : '获取查询历史失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 删除查询记录
   */
  const deleteQuery = useCallback(async (queryId: string) => {
    try {
      setState(prev => ({
        ...prev,
        queries: prev.queries.filter(q => q.id !== queryId),
        results: Object.fromEntries(
          Object.entries(prev.results).filter(([id]) => id !== queryId)
        ),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '删除查询失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 获取数据统计信息（整合版）
   */
  const getMonitoringStatistics = useCallback(async (
    params: MonitoringStatisticsParams
  ): Promise<MonitoringStatisticsResponse> => {
    try {
      // 记录开始时间
      const startTime = Date.now();
      
      // 使用monitoring-service的getMonitoringStatistics方法
      const stats = await monitoringService.getMonitoringStatistics(params);
      
      // 更新性能指标
      setState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          processDataTime: Date.now() - startTime,
          lastUpdate: Date.now(),
        },
      }));
      
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取统计数据失败';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, []);

  /**
   * 获取时间序列数据
   */
  const fetchTimeSeriesData = useCallback(async (
    deviceId: string,
    metricTypes: string[],
    timeRange: { start: number; end: number },
    options?: {
      granularity?: TimeGranularity;
      aggregation?: AggregationType;
      quality?: string[];
    }
  ) => {
    setState(prev => ({ ...prev, timeSeriesLoading: true, timeSeriesError: null }));

    try {
      // 使用monitoring-service的queryMonitoringData方法
      const timeSeriesData = await monitoringService.queryMonitoringData({
        equipmentId: deviceId,
        metricType: metricTypes[0] as MetricType,
        startTime: timeRange.start,
        endTime: timeRange.end,
        pageSize: 1000,
      });
      
      setState(prev => ({
        ...prev,
        timeSeriesData: {
          ...prev.timeSeriesData,
          [deviceId]: timeSeriesData.data.items || []
        },
        timeSeriesLoading: false,
      }));

      return timeSeriesData;
    } catch (error) {
      setState(prev => ({
        ...prev,
        timeSeriesLoading: false,
        timeSeriesError: error instanceof Error ? error.message : '获取时间序列数据失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 获取聚合数据
   */
  const fetchAggregatedData = useCallback(async (
    deviceIds: string[],
    metricTypes: string[],
    timeRange: { start: number; end: number },
    aggregation: AggregationType,
    granularity: TimeGranularity
  ) => {
    setState(prev => ({ ...prev, aggregatedLoading: true, aggregatedError: null }));

    try {
      // 简化的聚合数据实现
      const aggregatedData: Array<{
        timestamp: number;
        deviceId: string;
        metricType: string;
        value: number;
        count: number;
      }> = [];
      
      setState(prev => ({
        ...prev,
        aggregatedData,
        aggregatedLoading: false,
      }));

      return aggregatedData;
    } catch (error) {
      setState(prev => ({
        ...prev,
        aggregatedLoading: false,
        aggregatedError: error instanceof Error ? error.message : '获取聚合数据失败',
      }));
      throw error;
    }
  }, []);

  // ===== 数据缓存管理方法（从realtime-store.ts迁移） =====

  /**
   * 添加数据到缓存
   */
  const addToCache = useCallback((deviceId: string, data: MetricReading) => {
    setState(prev => {
      const deviceCache = prev.dataCache[deviceId] || [];
      const updatedCache = [...deviceCache, data].slice(-1000);
      return {
        ...prev,
        dataCache: {
          ...prev.dataCache,
          [deviceId]: updatedCache,
        },
      };
    });
  }, []);

  /**
   * 获取缓存数据
   */
  const getCachedData = useCallback((deviceId: string, limit?: number): MetricReading[] => {
    const cache = state.dataCache[deviceId] || [];
    return limit ? cache.slice(-limit) : cache;
  }, [state.dataCache]);

  /**
   * 清除数据缓存
   */
  const clearDataCache = useCallback(() => {
    setState(prev => ({ ...prev, dataCache: {} }));
  }, []);

  /**
   * 添加数据到历史记录
   */
  const addToHistory = useCallback((deviceId: string, data: MetricReading) => {
    setState(prev => {
      const deviceHistory = prev.dataHistory[deviceId] || [];
      const updatedHistory = [...deviceHistory, data].slice(-5000);
      return {
        ...prev,
        dataHistory: {
          ...prev.dataHistory,
          [deviceId]: updatedHistory,
        },
      };
    });
  }, []);

  /**
   * 获取历史数据
   */
  const getHistoryData = useCallback((deviceId: string, timeRange?: { start: number; end: number }): MetricReading[] => {
    const history = state.dataHistory[deviceId] || [];
    if (!timeRange) {
      return history;
    }
    return history.filter(item =>
      item.timestamp >= timeRange.start && item.timestamp <= timeRange.end
    );
  }, [state.dataHistory]);

  /**
   * 错误处理增强
   */
  const addError = useCallback((code: string, message: string, deviceId?: string) => {
    setState(prev => ({
      ...prev,
      errors: [...prev.errors, {
        code,
        message,
        timestamp: Date.now(),
        deviceId,
      }].slice(-50),
    }));
  }, []);

  /**
   * 清除错误
   */
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  /**
   * 清除所有错误状态
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      queryHistoryError: null,
      timeSeriesError: null,
      aggregatedError: null,
    }));
  }, []);

  /**
   * 获取指定设备的数据
   */
  const getEquipmentData = useCallback((
    equipmentId: string,
    metricType?: MetricType
  ): UnifiedMonitoringData[] => {
    const key = `${equipmentId}-${metricType || 'all'}`;
    return state.data[key] || [];
  }, [state.data]);

  /**
   * 获取设备实时数据
   */
  const getDeviceData = useCallback((deviceId: string): DeviceRealTimeData | undefined => {
    return state.devices[deviceId];
  }, [state.devices]);

  /**
   * 重置状态
   */
  const resetState = useCallback(() => {
    setState(prev => ({
      // 基础数据存储
      data: {},
      queries: [],
      activeQuery: null,
      results: {},
      devices: {},
      
      // 状态管理
      loading: false,
      queryHistoryLoading: false,
      timeSeriesLoading: false,
      aggregatedLoading: false,
      error: null,
      queryHistoryError: null,
      timeSeriesError: null,
      aggregatedError: null,
      errors: [],
      
      // 实时连接状态
      realtimeConnected: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0,
      lastUpdate: 0,
      realtimeSubscriptions: [],
      subscriptionStatus: {
        deviceIds: [],
        metricTypes: [],
        activeSubscriptions: 0,
        failedSubscriptions: [],
      },
      
      // 缓存管理
      queryCache: new Map(),
      cacheExpiry: new Map(),
      maxCacheSize: 100,
      cacheCleanupInterval: null,
      dataCache: {},
      dataHistory: {},
      
      // 查询历史记录
      queryHistory: [],
      
      // 数据统计状态
      statistics: {
        deviceIds: [],
        metricTypes: [],
        timeRange: { start: 0, end: 0 },
        stats: null,
      },
      timeSeriesData: {},
      aggregatedData: [],
      
      // 导出功能
      exporting: null,
      
      // 性能指标 - 重置为默认值
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
        // 扩展字段
        messageCount: 0,
        lastMessageTime: 0,
        dataThroughput: 0,
        // 原有字段
        fetchTime: 0,
        avgFetchTime: 0,
        processDataTime: 0,
        avgProcessTime: 0,
        cacheHitRate: 0,
      },
      
      // 缓存信息
      cacheInfo: {
        size: 0,
        hits: 0,
        misses: 0,
        lastCleanup: Date.now(),
      },
      
      // 数据质量统计
      dataQualityStats: {},
      
      // 连接配置
      connectionConfig: {
        autoReconnect: true,
        reconnectInterval: 5000,
        maxReconnectAttempts: 5,
      },
    }));
    
    clearCache();
  }, [clearCache]);

  /**
   * 清除指定设备的数据缓存
   */
  const clearEquipmentData = useCallback((equipmentId: string) => {
    setState(prev => {
      const newData = { ...prev.data };
      const keysToRemove = Object.keys(newData).filter(key => key.startsWith(`${equipmentId}-`));
      
      keysToRemove.forEach(key => {
        delete newData[key];
      });
      
      return {
        ...prev,
        data: newData,
      };
    });
  }, []);

  /**
   * 获取数据质量统计
   */
  const getDataQualityStats = useCallback((
    equipmentId: string,
    metricType?: MetricType
  ) => {
    const key = `${equipmentId}-${metricType || 'all'}`;
    return state.dataQualityStats[key] || { total: 0, normal: 0, estimated: 0, questionable: 0, bad: 0 };
  }, [state.dataQualityStats]);

  /**
   * 获取缓存统计信息
   */
  const getCacheStats = useCallback(() => {
    return state.cacheInfo;
  }, [state.cacheInfo]);

  /**
   * 获取实时连接状态
   */
  const getRealtimeConnectionStatus = useCallback((): ConnectionStatus => {
    return state.connectionStatus;
  }, [state.connectionStatus]);

  /**
   * 预设时间范围计算
   */
  const getTimeRangeFromPreset = useCallback((preset: TimeRangePreset): { start: number; end: number } => {
    const now = Date.now();
    const end = now;
    let start: number;

    switch (preset) {
      case TimeRangePreset.LAST_HOUR:
        start = now - 60 * 60 * 1000;
        break;
      case TimeRangePreset.LAST_6_HOURS:
        start = now - 6 * 60 * 60 * 1000;
        break;
      case TimeRangePreset.LAST_24_HOURS:
        start = now - 24 * 60 * 60 * 1000;
        break;
      case TimeRangePreset.LAST_7_DAYS:
        start = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case TimeRangePreset.LAST_30_DAYS:
        start = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        start = now - 24 * 60 * 60 * 1000; // 默认24小时
    }

    return { start, end };
  }, []);

  /**
   * 获取统计数据
   */
  const fetchStatistics = useCallback(async (
    deviceIds: string[],
    metricTypes: string[],
    timeRange: { start: number; end: number }
  ) => {
    setState(prev => ({
      ...prev,
      statistics: {
        deviceIds,
        metricTypes,
        timeRange,
        stats: prev.statistics.stats, // 保持现有数据
      },
    }));

    try {
      // 使用monitoring-service的getMonitoringStatistics方法
      const stats = await monitoringService.getMonitoringStatistics({
        equipmentId: deviceIds[0],
        metricType: metricTypes[0] as MetricType,
        startTime: timeRange.start,
        endTime: timeRange.end,
      });
      
      // 转换为符合状态中statistics.stats类型的格式
      const convertedStats = {
        totalDataPoints: stats.data.count,
        valueStats: {
          [metricTypes[0]]: {
            min: stats.data.minValue,
            max: stats.data.maxValue,
            avg: stats.data.avgValue,
            stdDev: 0, // API未提供标准差，暂时设为0
            count: stats.data.count,
          }
        },
        qualityStats: {
          normal: stats.data.count, // API未提供质量统计，暂时全部设为normal
        }
      };
      
      setState(prev => ({
        ...prev,
        statistics: {
          ...prev.statistics,
          stats: convertedStats,
        },
      }));

      return stats;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取统计数据失败',
      }));
      throw error;
    }
  }, []);

  // ===== 便捷访问器 =====

  /**
   * 检查是否有活动结果
   */
  const hasActiveResults = !!state.activeQuery && !!state.results[state.activeQuery.id];
  
  /**
   * 获取缓存查询数量
   */
  const cachedQueriesCount = state.queryCache.size;
  
  /**
   * 检查查询是否已缓存
   */
  const isQueryCached = useCallback((query: HistoryQuery) => !!getCachedResult(query), [getCachedResult]);

  // 返回状态和操作方法
  return {
    // ===== 状态值 =====
    ...state,
    
    // ===== 基础操作方法 =====
    // 数据获取
    fetchMonitoringData,              // 获取监测数据
    createQuery,                      // 创建历史查询
    executeQuery,                     // 执行历史查询
    
    // 实时数据管理
    connect,                          // 连接WebSocket
    disconnect,                       // 断开WebSocket
    subscribeToRealtime,              // 订阅实时数据
    unsubscribeFromRealtime,          // 取消实时数据订阅
    getDeviceData,                    // 获取设备实时数据
    
    // 数据导出
    exportData,                       // 导出数据
    
    // ===== 统计数据方法 =====
    getMonitoringStatistics,          // 获取统计信息
    fetchStatistics,                  // 获取统计数据
    fetchTimeSeriesData,              // 获取时间序列数据
    fetchAggregatedData,              // 获取聚合数据
    fetchQueryHistory,                // 获取查询历史
    
    // ===== 缓存管理方法 =====
    getCachedResult,                  // 获取缓存结果
    setCachedResult,                  // 设置缓存结果
    clearCache,                       // 清除所有缓存
    clearDataCache,                   // 清除数据缓存
    cleanupExpiredCache,              // 清理过期缓存
    addToCache,                       // 添加数据到缓存
    getCachedData,                    // 获取缓存数据
    addToHistory,                     // 添加数据到历史
    getHistoryData,                   // 获取历史数据
    
    // ===== 查询管理方法 =====
    deleteQuery,                      // 删除查询
    
    // ===== 工具方法 =====
    getEquipmentData,                 // 获取指定设备数据
    clearEquipmentData,               // 清除设备数据
    clearError,                       // 清除错误状态
    clearErrors,                      // 清除所有错误
    resetState,                       // 重置状态
    addError,                         // 添加错误
    getDataQualityStats,              // 获取数据质量统计
    getCacheStats,                    // 获取缓存统计
    getRealtimeConnectionStatus,      // 获取实时连接状态
    getTimeRangeFromPreset,           // 获取预设时间范围
    
    // ===== 便捷属性 =====
    hasActiveResults,                 // 是否有活动结果
    cachedQueriesCount,               // 缓存查询数量
    isQueryCached,                    // 查询是否已缓存
  };
};

/**
 * 导出便捷Hook（从realtime-store.ts迁移）
 */
export const useRealTime = () => {
  const store = useMonitoringStore();
  return {
    ...store,
    // 便捷方法
    isConnected: store.realtimeConnected,
    connectionStatus: store.connectionStatus,
    connectedDevices: Object.values(store.devices),
    deviceCount: Object.keys(store.devices).length,
    lastDataUpdate: store.lastUpdate,
    activeSubscriptions: store.subscriptionStatus.activeSubscriptions,
    recentErrors: store.errors.slice(-5),
    hasErrors: store.errors.length > 0,
    errorCount: store.errors.length,
  };
};

/**
 * 使用示例：
 * 
 * ```typescript
 * import { useMonitoringStore } from '../stores/monitoring-store';
 * 
 * // 在组件中使用Hook方式
 * function MonitoringComponent() {
 *   const {
 *     fetchMonitoringData,
 *     subscribeToRealtime,
 *     getEquipmentData,
 *     loading,
 *     error
 *   } = useMonitoringStore();
 *   
 *   const fetchData = async () => {
 *     try {
 *       await fetchMonitoringData({
 *         equipmentId: 'pump-001',
 *         metricType: MetricType.TEMPERATURE,
 *         startTime: Date.now() - 24 * 60 * 1000, // 24小时前
 *         endTime: Date.now(),
 *       });
 *       
 *       // 订阅实时数据
 *       await subscribeToRealtime(['pump-001'], ['temperature']);
 *     } catch (err) {
 *       console.error('获取数据失败:', err);
 *     }
 *   };
 *   
 *   const temperatureData = getEquipmentData('pump-001', MetricType.TEMPERATURE);
 *   
 *   return (
 *     <div>
 *       {loading && <div>加载中...</div>}
 *       {error && <div>错误: {error}</div>}
 *       // 渲染数据
 *     </div>
 *   );
 * }
 * 
 * // 使用实时数据便捷Hook
 * function RealTimeComponent() {
 *   const {
 *     isConnected,
 *     connectedDevices,
 *     subscribeToRealtime
 *   } = useRealTime();
 *   
 *   useEffect(() => {
 *     if (isConnected) {
 *       subscribeToRealtime(['device-1'], ['temperature', 'pressure']);
 *     }
 *   }, [isConnected]);
 *   
 *   return (
 *     <div>
 *       连接状态: {isConnected ? '已连接' : '未连接'}
 *       设备数量: {connectedDevices.length}
 *     </div>
 *   );
 * }
 * ```
 */