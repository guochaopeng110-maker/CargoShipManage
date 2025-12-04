// 设备管理相关类型定义（对应后端Equipment实体）
// 基于货船智能机舱管理系统设备管理架构
//
// 功能说明：
// - 定义设备实体的完整数据结构
// - 提供设备状态管理的类型支持
// - 支持设备筛选、分页和概览统计
// - 包含设备维护和历史记录相关类型

/**
 * 设备实体接口
 *
 * 表示系统中的设备，对应后端Equipment实体
 * 包含设备的基本信息、状态和扩展数据
 */
export interface Equipment {
  id: string;                      // 设备唯一标识符
  deviceId: string;                // 设备编号（业务编号）
  deviceName: string;              // 设备名称
  deviceType: string;              // 设备类型（如发动机、泵、传感器等）
  status: EquipmentStatus;         // 设备当前状态
  createdAt: number;               // 设备创建时间戳
  deletedAt: number | null;        // 设备删除时间戳（null表示未删除）
  
  // === 设备详细信息 ===
  location?: string;               // 设备安装位置（可选）
  description?: string;            // 设备描述（可选）
  manufacturer?: string;           // 制造商（可选）
  model?: string;                  // 型号（可选）
  installationDate?: number;       // 安装日期（可选）
  
  // === 扩展信息（前端显示用） ===
  latestData: LatestEquipmentData | null;      // 最新设备数据
  alarmSummary: EquipmentAlarmSummary | null;  // 告警汇总信息
}

/**
 * 设备状态枚举
 *
 * 定义设备的各种运行状态，反映设备当前的工作情况
 */
export enum EquipmentStatus {
  RUNNING = 'running',         // 运行中：设备正常工作
  MAINTENANCE = 'maintenance', // 维护中：设备正在进行维护保养
  DISABLED = 'disabled',       // 已停用：设备暂时停用，不参与监控
  DELETED = 'deleted'          // 已删除：设备已从系统中移除
}

/**
 * 设备管理状态接口
 *
 * 定义前端设备状态管理的完整数据结构
 * 包含设备列表、分页、筛选、概览等所有相关状态
 */
export interface EquipmentState {
  items: Equipment[];                    // 设备列表数据
  selectedEquipment: Equipment | EquipmentDetailResponse | null;   // 当前选中的设备（支持基础设备信息和完整详情）
  loading: boolean;                      // 加载状态标识
  error: string | null;                  // 错误信息
  total: number;                         // 总设备数量
  page: number;                          // 当前页码
  pageSize: number;                      // 每页显示数量
  totalPages: number;                    // 总页数
  filters: EquipmentFilters;             // 当前应用的筛选条件
  overview: EquipmentOverview | null;    // 设备概览统计信息
}

/**
 * 设备筛选条件接口
 *
 * 定义设备列表筛选的各种条件参数
 * 支持按名称、型号、位置、状态等多个维度进行筛选
 */
export interface EquipmentFilters {
  name?: string;          // 设备名称筛选（模糊匹配）
  model?: string;         // 设备型号筛选（精确或模糊匹配）
  location?: string;      // 设备位置筛选
  status?: EquipmentStatus; // 设备状态筛选
  searchTerm?: string;    // 搜索关键词（模糊匹配设备名称、型号、位置等）
}

/**
 * 设备运行状态概览接口
 *
 * 提供设备整体运行状态的统计信息
 * 用于仪表板和概览页面的数据展示
 *
 * 修复：与后端API响应格式保持一致
 * 后端字段：total, normal, warning, fault, offline
 * 前端兼容字段：totalCount, runningCount, maintenanceCount, disabledCount, deletedCount, abnormalCount
 */
export interface EquipmentOverview {
  // 后端API返回的字段（与API文档一致）
  total: number;           // 设备总数量
  normal: number;          // 正常状态设备数（对应前端running）
  warning: number;         // 告警状态设备数（对应前端maintenance）
  fault: number;          // 故障状态设备数（对应前端maintenance）
  offline: number;         // 离线状态设备数（对应前端disabled）
  
  // 前端兼容性字段（保持现有前端代码兼容）
  totalCount?: number;     // 设备总数量（兼容字段，映射自total）
  runningCount?: number;   // 运行中的设备数量（兼容字段，映射自normal）
  maintenanceCount?: number; // 维护中的设备数量（兼容字段，映射自warning+fault）
  disabledCount?: number;  // 已停用的设备数量（兼容字段，映射自offline）
  deletedCount?: number;   // 已删除的设备数量（兼容字段，需要单独查询）
  abnormalCount?: number;  // 异常状态的设备数量（兼容字段，映射自warning+fault）
}

/**
 * 最新设备数据接口
 *
 * 存储设备各指标的最新读数
 * 以指标类型为键，MetricReading为值的映射结构
 */
export interface LatestEquipmentData {
  [metricType: string]: MetricReading; // 指标类型 -> 最新读数
}

/**
 * 设备告警汇总接口
 *
 * 提供设备相关告警的统计信息
 * 用于设备详情页面的告警概览
 */
export interface EquipmentAlarmSummary {
  totalCount: number;     // 总告警数量
  pendingCount: number;   // 待处理告警数量
  latestAlarm: Alarm | null; // 最新告警（按时间倒序）
}

/**
 * 指标读数接口（对应后端TimeSeriesData核心字段）
 *
 * 表示设备传感器采集的单个数据点
 * 包含数值、单位、时间戳和质量信息
 */
export interface MetricReading {
  value: number;                    // 测量数值
  unit: string;                     // 数值单位
  timestamp: number;                // 采集时间戳
  source: string;                   // 数据来源（如传感器ID）
  quality: DataQuality;             // 数据质量标记
  dataId?: string;                  // 数据库记录ID（可选）
}

// 数据质量枚举
export enum DataQuality {
  NORMAL = 'normal',        // 正常
  ABNORMAL = 'abnormal',    // 异常
  SUSPICIOUS = 'suspicious' // 疑似故障
}

// 告警信息
export interface AlarmInfo {
  id: string;
  equipmentId: string;
  severity: AlertSeverity;
  message: string;
  timestamp: number;
}

// 前向引用 - 将在alarms.ts中定义完整类型
export interface Alarm {
  id: string;
  equipmentId: string;
  equipmentName: string;
  severity: AlertSeverity;
  status: AlarmStatus;
  message: string;
  timestamp: number;
}

// 前向引用 - 将在alarms.ts中定义完整类型
export enum AlarmStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RESOLVED = 'resolved',
  IGNORED = 'ignored'
}

// 告警严重程度（对应后端枚举）
export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 创建设备请求
export interface CreateEquipmentRequest {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  location?: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  installationDate?: number;
}

// 更新设备请求
export interface UpdateEquipmentRequest {
  deviceName?: string;
  deviceType?: string;
  status?: EquipmentStatus;
  location?: string;
  description?: string;
  manufacturer?: string;
  model?: string;
}

// 设备列表参数
export interface EquipmentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: EquipmentStatus;
  deviceType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 设备分页响应
export interface EquipmentPaginatedResponse {
  items: Equipment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 设备详情响应
export interface EquipmentDetailResponse extends Omit<Equipment, 'location'> {
  manufacturer?: string;
  model?: string;
  installationDate?: number;
  lastMaintenanceDate?: number;
  nextMaintenanceDate?: number;
  warrantyExpiryDate?: number;
  specifications: EquipmentSpecification[];
  location: EquipmentLocation;  // 覆盖 Equipment.location 为详细的 EquipmentLocation 类型
}

// 设备规格
export interface EquipmentSpecification {
  name: string;
  value: string | number;
  unit?: string;
  category: string;
}

// 设备位置
export interface EquipmentLocation {
  zone: string;
  floor?: string;
  room?: string;
  coordinates?: {
    x: number;
    y: number;
    z?: number;
  };
}

// 设备维护信息
export interface EquipmentMaintenanceInfo {
  lastMaintenanceDate: number;
  nextMaintenanceDate: number;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  description?: string;
}

// 维护类型
export enum MaintenanceType {
  PREVENTIVE = 'preventive',  // 预防性维护
  CORRECTIVE = 'corrective',  // 纠正性维护
  PREDICTIVE = 'predictive',  // 预测性维护
  EMERGENCY = 'emergency'     // 紧急维护
}

// 维护状态
export enum MaintenanceStatus {
  SCHEDULED = 'scheduled',     // 已安排
  IN_PROGRESS = 'in_progress', // 进行中
  COMPLETED = 'completed',     // 已完成
  CANCELLED = 'cancelled',     // 已取消
  OVERDUE = 'overdue'          // 已逾期
}

// 设备历史记录
export interface EquipmentHistoryRecord {
  id: string;
  equipmentId: string;
  eventType: EquipmentEventType;
  description: string;
  timestamp: number;
  performedBy?: string;
  metadata?: Record<string, any>;
}

// 设备事件类型
export enum EquipmentEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  MAINTENANCE_SCHEDULED = 'maintenance_scheduled',
  MAINTENANCE_COMPLETED = 'maintenance_completed',
  ALERT_TRIGGERED = 'alert_triggered',
  DATA_CONNECTED = 'data_connected',
  DATA_DISCONNECTED = 'data_disconnected',
  DELETED = 'deleted'
}

/**
 * 后端API状态到前端状态的映射函数
 *
 * 解决前后端设备状态枚举不一致问题
 * 后端状态：normal, warning, fault, offline
 * 前端状态：running, maintenance, disabled, deleted
 *
 * @param apiStatus 后端API返回的状态值
 * @returns 前端EquipmentStatus枚举值
 */
export const mapApiStatusToFrontend = (apiStatus: string): EquipmentStatus => {
  switch (apiStatus) {
    case 'normal':
      return EquipmentStatus.RUNNING;      // 正常 -> 运行中
    case 'warning':
      return EquipmentStatus.MAINTENANCE;  // 告警 -> 维护中
    case 'fault':
      return EquipmentStatus.MAINTENANCE;  // 故障 -> 维护中
    case 'offline':
      return EquipmentStatus.DISABLED;     // 离线 -> 已停用
    default:
      return EquipmentStatus.RUNNING;      // 默认为运行中
  }
};

/**
 * 前端状态到后端API状态的映射函数
 *
 * 解决前后端设备状态枚举不一致问题
 * 前端状态：running, maintenance, disabled, deleted
 * 后端状态：normal, warning, fault, offline
 *
 * @param frontendStatus 前端EquipmentStatus枚举值
 * @returns 后端API状态值
 */
export const mapFrontendStatusToApi = (frontendStatus: EquipmentStatus): string => {
  switch (frontendStatus) {
    case EquipmentStatus.RUNNING:
      return 'normal';      // 运行中 -> 正常
    case EquipmentStatus.MAINTENANCE:
      return 'maintenance';  // 维护中 -> 维护中（保持一致）
    case EquipmentStatus.DISABLED:
      return 'offline';      // 已停用 -> 离线
    case EquipmentStatus.DELETED:
      return 'deleted';      // 已删除 -> 已删除（保持一致）
    default:
      return 'normal';      // 默认为正常
  }
};