/**
 * 货船智能机舱管理系统 - 统一监测数据类型定义
 *
 * 核心功能：
 * 1. 统一实时数据和历史数据类型（解决历史数据和实时数据分离问题）
 * 2. 集成monitoring-api.md的数据模型
 * 3. 提供数据转换和验证功能
 * 4. 支持多种数据源和质量标记
 * 5. 统一设备监测配置和阈值管理
 *
 * 技术架构：
 * - 基于TypeScript接口的类型安全
 * - 支持数据质量标记和来源追踪
 * - 统一的指标类型和单位定义
 * - 灵活的设备配置和告警阈值
 * - 完整的数据验证和转换机制
 *
 * 数据模型统一：
 * - 实时数据和历史数据使用相同基础结构
 * - 支持数据聚合和统计分析
 * - 提供数据导出和导入接口
 * - 统一的错误处理和状态管理
 *
 * 权限控制：
 * - 基于角色的数据访问控制
 * - 细粒度的操作权限管理
 * - 数据安全和隐私保护
 *
 * 重构说明：
 * - 合并原本分离的实时和历史数据类型定义
 * - 提供统一的监测数据接口，解决数据类型不一致问题
 * - 简化类型定义，移除冗余接口
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0  # 更新版本号，反映重构变化
 * @since 2025
 */

// ===== WebSocket相关类型（兼容realtime-service.ts） =====

/**
 * 告警消息
 *
 * WebSocket告警消息结构
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
 * 设备状态消息
 *
 * WebSocket设备状态消息结构
 */
export interface DeviceStatusMessage {
  deviceId: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * 订阅确认消息
 *
 * WebSocket订阅确认消息结构
 */
export interface SubscriptionAckMessage {
  subscriptionId?: string;
  deviceIds: string[];
  status: 'pending' | 'active' | 'inactive' | 'failed';
  startTime: number;
}

/**
 * 心跳消息
 *
 * WebSocket心跳消息结构
 */
export interface HeartbeatMessage {
  clientTimestamp: number;
  serverTimestamp?: number;
  latency?: number;
  clientTime?: number;
}

/**
 * 性能指标
 *
 * WebSocket连接性能指标
 */
export interface PerformanceMetrics {
  messagesPerSecond: number;
  bytesPerSecond: number;
  averageLatency: number;
  packetLoss: number;
  connectionUptime: number;
 lastUpdate: number;
 appLoadTime: number;
 routeChangeTime: number;
 apiResponseTime: number;
 websocketConnectionTime: number;
 dataProcessingTime: number;
 realTimeLatency: number;
 renderTime: number;
 memoryUsage: number;
 cpuUsage: number;
 errorRate: number;
 crashRate: number;
 connectionLatency: number;
 messageRate: number;
 dataPointsPerSecond: number;
 timestamp: number;
 [key: string]: any; // 允许额外属性以适应实时服务需要
}

/**
 * 订阅响应
 *
 * WebSocket订阅响应结构
 */
export interface SubscriptionResponse {
  type: string;
  timestamp: number;
  requestId: string;
  messageId: string;
  success: boolean;
  subscribedDevices: string[];
  subscribedParameters: string[];
  frequency: number;
}

/**
 * 订阅请求
 *
 * WebSocket订阅请求结构
 */
export interface SubscriptionRequest {
  type: string;
  timestamp: number;
  requestId: string;
  messageId: string;
  devices: string[];
  parameters: string[];
  frequency: number;
  qualityFilter: string[];
}

/**
 * 连接握手消息
 *
 * WebSocket连接握手消息结构
 */
export interface ConnectionHandshake {
  type: string;
  timestamp: number;
  requestId: string;
  messageId: string;
  clientId: string;
  version: string;
  capabilities: string[];
}

/**
 * 指标读数
 *
 * 实时指标读数结构
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

// ===== 基础数据类型 =====

/**
 * 监测指标类型枚举
 * 
 * 基于monitoring-api.md中定义的指标类型
 * 包含系统中支持的所有监测指标
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
  SOC = 'soc',                    // 电池荷电状态
 SOH = 'soh',                    // 电池健康状态
  ENERGY = 'energy',              // 能量
  RPM = 'rpm',                    // 转速（每分钟转数）
}

/**
 * 数据质量标记枚举
 * 
 * 基于monitoring-api.md中定义的数据质量
 * 用于标识数据的可靠性和准确性
 */
export enum DataQuality {
  NORMAL = 'normal',              // 正常数据
  ESTIMATED = 'estimated',        // 估算值
  QUESTIONABLE = 'questionable',  // 可疑数据
  BAD = 'bad',                    // 坏值
}

/**
 * 数据来源枚举
 * 
 * 基于monitoring-api.md中定义的数据来源
 * 用于追踪数据的采集方式和来源
 */
export enum DataSource {
  SENSOR_UPLOAD = 'sensor-upload',        // 传感器上报
  MANUAL_INPUT = 'manual-input',          // 手动输入
  FILE_IMPORT = 'file-import',            // 文件导入
  SYSTEM_GENERATED = 'system-generated',  // 系统生成
}

/**
 * 连接状态枚举
 * 
 * 用于WebSocket连接状态管理
 */
export enum ConnectionStatus {
  CONNECTING = 'connecting',      // 连接中
  CONNECTED = 'connected',        // 已连接
  DISCONNECTED = 'disconnected',  // 未连接
  ERROR = 'error',                // 连接错误
 RECONNECTING = 'reconnecting',  // 重连中
}

// ===== 核心数据接口 =====

/**
 * 统一监测数据接口
 * 
 * 整合实时数据和历史数据的通用结构
 * 基于monitoring-api.md的数据模型
 */
export interface UnifiedMonitoringData {
  /** 数据记录ID */
  id: string;
  
  /** 设备ID（UUID格式） */
  equipmentId: string;
  
  /** 数据时间戳（ISO 8601格式或Unix时间戳毫秒） */
  timestamp: number;
  
  /** 指标类型 */
  metricType: MetricType;
  
  /** 指标数值（范围-99999.99到99999.99） */
  value: number;
  
  /** 数据单位（最大长度20，未提供时使用默认值） */
  unit: string;
  
  /** 数据质量标记（默认为normal） */
  quality: DataQuality;
  
  /** 数据来源（默认为sensor-upload） */
  source: DataSource;
  
  /** 创建时间（服务器端） */
  createdAt?: number;
  
  /** 更新时间（服务器端） */
  updatedAt?: number;
  
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/**
 * 批量监测数据接口
 * 
 * 用于批量提交监测数据的请求结构
 * 基于monitoring-api.md的批量接口
 */
export interface BatchMonitoringData {
  /** 设备ID（UUID格式），批量数据必须属于同一设备 */
  equipmentId: string;
  
  /** 监测数据数组，最少1条，最多1000条 */
  data: Omit<UnifiedMonitoringData, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>[];
}

/**
 * 监测数据查询参数
 * 
 * 基于monitoring-api.md的查询接口参数
 */
export interface MonitoringQueryParams {
  /** 设备ID（UUID格式） */
  equipmentId: string;
  
  /** 指标类型，不提供则查询所有指标 */
  metricType?: MetricType;
  
  /** 开始时间戳（毫秒） */
  startTime: number;
  
  /** 结束时间戳（毫秒） */
  endTime: number;
  
  /** 页码，从1开始，默认为1 */
  page?: number;
  
  /** 每页条数，默认为100，最大1000 */
  pageSize?: number;
  
  /** 数据质量过滤 */
  quality?: DataQuality[];
  
  /** 数据来源过滤 */
  source?: DataSource[];
}

/**
 * 监测数据统计参数
 * 
 * 基于monitoring-api.md的统计接口参数
 */
export interface MonitoringStatisticsParams {
 /** 设备ID（UUID格式） */
  equipmentId: string;
  
  /** 指标类型 */
  metricType: MetricType;
  
  /** 开始时间戳（毫秒） */
  startTime: number;
  
  /** 结束时间戳（毫秒） */
  endTime: number;
  
  /** 数据质量过滤 */
  quality?: DataQuality[];
}

/**
 * 监测数据响应
 * 
 * 基于monitoring-api.md的查询响应结构
 */
export interface MonitoringDataResponse {
  /** 响应数据对象 */
  data: {
    /** 监测数据列表 */
    items: UnifiedMonitoringData[];
    
    /** 总记录数 */
    total: number;
    
    /** 当前页码 */
    page: number;
    
    /** 每页条数 */
    pageSize: number;
    
    /** 总页数 */
    totalPages: number;
  };
  
  /** 响应时间戳（毫秒） */
 timestamp: number;
}

/**
 * 监测数据统计响应
 * 
 * 基于monitoring-api.md的统计响应结构
 */
export interface MonitoringStatisticsResponse {
  /** 响应数据对象 */
  data: {
    /** 指标类型 */
    metricType: MetricType;
    
    /** 数据点数量 */
    count: number;
    
    /** 最大值 */
    maxValue: number;
    
    /** 最小值 */
    minValue: number;
    
    /** 平均值 */
    avgValue: number;
    
    /** 数据单位 */
    unit: string;
  };
  
  /** 响应时间戳（毫秒） */
  timestamp: number;
}

/**
 * 数据提交响应
 * 
 * 基于monitoring-api.md的数据提交响应结构
 */
export interface MonitoringSubmitResponse {
  /** 响应数据对象 */
  data: {
    /** 数据记录ID */
    dataId: number;
    
    /** 是否接收成功 */
    received: boolean;
  };
  
  /** 响应时间戳（毫秒） */
  timestamp: number;
}

/**
 * 批量数据提交响应
 * 
 * 基于monitoring-api.md的批量提交响应结构
 */
export interface MonitoringBatchSubmitResponse {
  /** 响应数据对象 */
  data: {
    /** 总条数 */
    totalCount: number;
    
    /** 成功条数 */
    successCount: number;
    
    /** 失败条数 */
    failedCount: number;
    
    /** 错误列表 */
    errors: Array<{
      /** 错误数据索引 */
      index: number;
      
      /** 失败原因 */
      reason: string;
    }>;
 };
  
  /** 响应时间戳（毫秒） */
  timestamp: number;
}

// ===== 设备配置相关 =====

/**
 * 设备监测配置
 * 
 * 定义单个设备的监测参数和配置
 */
export interface EquipmentMonitoringConfig {
  /** 设备ID */
  equipmentId: string;
  
  /** 设备类型 */
  equipmentType: string;
  
  /** 设备名称 */
  equipmentName: string;
  
  /** 监测指标配置 */
  metrics: MetricConfig[];
  
  /** 正常范围定义 */
  normalRanges: Record<MetricType, [number, number]>;
  
  /** 告警阈值配置 */
  alertThresholds: Record<MetricType, AlertThreshold[]>;
  
  /** 数据采集配置 */
  samplingConfig: {
    /** 采集间隔（毫秒） */
    interval: number;
    
    /** 批量提交大小 */
    batchSize: number;
    
    /** 数据保留天数 */
    retentionDays: number;
  };
  
  /** 是否启用监测 */
  enabled: boolean;
  
  /** 创建时间 */
  createdAt: number;
  
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 指标配置
 * 
 * 定义单个监测指标的配置参数
 */
export interface MetricConfig {
  /** 指标类型 */
  type: MetricType;
  
 /** 指标名称 */
  name: string;
  
  /** 指标单位 */
  unit: string;
  
  /** 是否启用 */
  enabled: boolean;
  
  /** 默认范围 */
  defaultRange: [number, number];
  
  /** 精度（小数位数） */
  precision: number;
  
  /** 采集频率（毫秒） */
 samplingRate: number;
}

/**
 * 告警阈值
 * 
 * 定义指标告警的阈值配置
 */
export interface AlertThreshold {
  /** 告警级别 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** 阈值类型 */
  thresholdType: 'upper' | 'lower' | 'range';
  
  /** 阈值上限 */
  upperLimit?: number;
  
  /** 阈值下限 */
  lowerLimit?: number;
  
  /** 持续时间（毫秒） */
  duration: number;
  
  /** 是否启用 */
  enabled: boolean;
  
  /** 告警消息模板 */
  messageTemplate?: string;
}

// ===== WebSocket相关 =====

/**
 * WebSocket消息类型枚举
 * 
 * 定义WebSocket通信的消息类型
 */
export enum WebSocketMessageType {
  /** 连接握手 */
  CONNECTION_HANDSHAKE = 'connection_handshake',
  
  /** 连接响应 */
  CONNECTION_RESPONSE = 'connection_response',
  
  /** 订阅请求 */
  SUBSCRIPTION_REQUEST = 'subscription_request',
  
  /** 订阅响应 */
  SUBSCRIPTION_RESPONSE = 'subscription_response',
  
 /** 订阅确认 */
  SUBSCRIPTION_ACK = 'subscription_ack',
  
  /** 心跳消息 */
  HEARTBEAT = 'heartbeat',
  
  /** 数据更新 */
  DATA_UPDATE = 'data_update',
  
  /** 告警消息 */
  ALERT = 'alert',
  
 /** 设备状态 */
  DEVICE_STATUS = 'device_status',
  
  /** 错误消息 */
  ERROR = 'error',
}

/**
 * WebSocket消息基类
 * 
 * 所有WebSocket消息的基础接口
 */
export interface WebSocketMessage {
  /** 消息类型 */
  type: WebSocketMessageType;
  
  /** 消息时间戳 */
  timestamp: number;
  
  /** 请求ID */
  requestId: string;
  
  /** 消息ID */
  messageId: string;
}

/**
 * 连接握手消息
 */
export interface ConnectionHandshakeMessage extends WebSocketMessage {
  type: WebSocketMessageType.CONNECTION_HANDSHAKE;
  
  /** 客户端ID */
  clientId: string;
  
  /** 协议版本 */
  version: string;
  
  /** 支持的能力 */
  capabilities: string[];
}

/**
 * 订阅请求消息
 */
export interface SubscriptionRequestMessage extends WebSocketMessage {
  type: WebSocketMessageType.SUBSCRIPTION_REQUEST;
  
  /** 设备ID列表 */
  devices: string[];
  
  /** 指标类型列表 */
  parameters: string[];
  
  /** 更新频率（毫秒） */
 frequency: number;
  
  /** 质量过滤 */
  qualityFilter: string[];
}

/**
 * 数据更新消息
 */
export interface DataUpdateMessage extends WebSocketMessage {
  type: WebSocketMessageType.DATA_UPDATE;
  
  /** 设备ID */
  deviceId: string;
  
  /** 数据点列表 */
  data: UnifiedMonitoringData[];
}

// ===== 工具函数和常量 =====

/**
 * 指标类型默认单位映射
 */
export const METRIC_TYPE_UNITS: Record<MetricType, string> = {
  [MetricType.TEMPERATURE]: '°C',
  [MetricType.VIBRATION]: 'mm/s',
  [MetricType.PRESSURE]: 'MPa',
  [MetricType.HUMIDITY]: '%',
  [MetricType.SPEED]: 'km/h',
  [MetricType.CURRENT]: 'A',
  [MetricType.VOLTAGE]: 'V',
  [MetricType.POWER]: 'kW',
  [MetricType.SOC]: '%',
  [MetricType.SOH]: '%',
  [MetricType.ENERGY]: 'kWh',
  [MetricType.RPM]: 'r/min',
};

/**
 * 数据质量显示名称映射
 */
export const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  [DataQuality.NORMAL]: '正常',
  [DataQuality.ESTIMATED]: '估算',
  [DataQuality.QUESTIONABLE]: '可疑',
  [DataQuality.BAD]: '坏值',
};

/**
 * 数据来源显示名称映射
 */
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  [DataSource.SENSOR_UPLOAD]: '传感器上报',
  [DataSource.MANUAL_INPUT]: '手动输入',
  [DataSource.FILE_IMPORT]: '文件导入',
  [DataSource.SYSTEM_GENERATED]: '系统生成',
};

/**
 * 验证监测数据
 * 
 * @param data 监测数据对象
 * @returns 验证结果
 */
export function validateMonitoringData(data: UnifiedMonitoringData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 验证必填字段
  if (!data.equipmentId) {
    errors.push('设备ID不能为空');
  }
  
 if (!data.timestamp) {
    errors.push('时间戳不能为空');
  }
  
  if (!data.metricType) {
    errors.push('指标类型不能为空');
  }
  
  if (typeof data.value !== 'number') {
    errors.push('指标值必须是数字');
  }
  
  // 验证数值范围
  if (data.value < -999999.99 || data.value > 99999.99) {
    errors.push('指标值必须在-999999.99到99999.9范围内');
  }
  
  // 验证时间戳格式
  if (data.timestamp && (data.timestamp < 0 || data.timestamp > Date.now() + 864000)) {
    errors.push('时间戳无效');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 转换WebSocket数据为统一监测数据
 * 
 * @param websocketData WebSocket接收的数据
 * @returns 统一监测数据
 */
export function convertWebSocketToUnifiedData(websocketData: any): UnifiedMonitoringData {
  return {
    id: websocketData.id || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    equipmentId: websocketData.equipmentId,
    timestamp: websocketData.timestamp || Date.now(),
    metricType: websocketData.metricType as MetricType,
    value: websocketData.value,
    unit: websocketData.unit || METRIC_TYPE_UNITS[websocketData.metricType as MetricType] || '',
    quality: websocketData.quality as DataQuality || DataQuality.NORMAL,
    source: DataSource.SENSOR_UPLOAD,
    createdAt: websocketData.createdAt,
    updatedAt: websocketData.updatedAt,
    metadata: websocketData.metadata,
  };
}

/**
 * 转换API响应数据为统一监测数据
 * 
 * @param apiData API响应的数据
 * @returns 统一监测数据
 */
export function convertApiToUnifiedData(apiData: any): UnifiedMonitoringData {
 return {
    id: apiData.id?.toString(),
    equipmentId: apiData.equipmentId,
    timestamp: new Date(apiData.timestamp).getTime(),
    metricType: apiData.metricType as MetricType,
    value: apiData.value,
    unit: apiData.unit || METRIC_TYPE_UNITS[apiData.metricType as MetricType] || '',
    quality: apiData.quality as DataQuality || DataQuality.NORMAL,
    source: apiData.source as DataSource || DataSource.SENSOR_UPLOAD,
    createdAt: apiData.createdAt ? new Date(apiData.createdAt).getTime() : undefined,
    updatedAt: apiData.updatedAt ? new Date(apiData.updatedAt).getTime() : undefined,
    metadata: apiData.metadata,
  };
}

/**
 * 生成唯一数据ID
 * 
 * @returns 唯一ID字符串
 */
export function generateDataId(): string {
  return `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 格式化时间戳为ISO字符串
 * 
 * @param timestamp 时间戳（毫秒）
 * @returns ISO格式时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * 获取数据质量对应的颜色类名
 * 
 * @param quality 数据质量
 * @returns CSS颜色类名
 */
export function getQualityColorClass(quality: DataQuality): string {
  switch (quality) {
    case DataQuality.NORMAL:
      return 'text-green-400';
    case DataQuality.ESTIMATED:
      return 'text-yellow-400';
    case DataQuality.QUESTIONABLE:
      return 'text-orange-400';
    case DataQuality.BAD:
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * 获取数据来源对应的图标类名
 * 
 * @param source 数据来源
 * @returns 图标类名
 */
export function getSourceIconClass(source: DataSource): string {
  switch (source) {
    case DataSource.SENSOR_UPLOAD:
      return 'fas fa-satellite-dish';
    case DataSource.MANUAL_INPUT:
      return 'fas fa-keyboard';
    case DataSource.FILE_IMPORT:
      return 'fas fa-file-import';
    case DataSource.SYSTEM_GENERATED:
      return 'fas fa-cog';
    default:
      return 'fas fa-question';
  }
}