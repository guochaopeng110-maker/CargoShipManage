// 告警管理相关类型定义（对应后端AlarmRecord实体）
// 基于货船智能机舱管理系统告警处理架构
//
// 功能说明：
// - 定义告警实体的完整数据结构
// - 提供告警状态管理的类型支持
// - 支持告警筛选、统计和批量操作
// - 包含告警规则和模板相关类型

/**
 * 告警实体接口
 *
 * 表示系统中产生的告警记录，对应后端AlarmRecord实体
 * 包含告警的基本信息、状态、处理信息等
 */
export interface Alarm {
  id: string;                    // 告警唯一标识符
  equipmentId: string;           // 关联的设备ID
  equipmentName: string;         // 设备名称（扩展字段，前端显示用）
  configId?: string;             // 关联的告警配置ID（可选）
  metricType: string;            // 指标类型（如温度、压力等）
  value: number;                 // 触发告警的数值
  threshold: string;             // 触发阈值（字符串格式，包含单位信息）
  triggeredAt: number;           // 告警触发时间戳
  severity: AlertSeverity;       // 告警严重程度
  status: AlarmStatus;           // 告警当前状态
  message: string;               // 告警消息描述
  handler?: string;              // 处理人（可选）
  handledAt?: number | null;     // 处理时间戳（可选）
  handlerNote?: string | null;   // 处理备注（可选）
  createdAt: number;             // 告警创建时间戳
  lastModified?: number;         // 最后修改时间戳（可选）
}

/**
 * 告警严重程度枚举（对应后端枚举）
 *
 * 定义告警的严重程度等级，用于区分告警的重要性和处理优先级
 * 严重程度通常与告警的颜色标识、声音提示、通知方式等相关联
 */
export enum AlertSeverity {
  LOW = 'low',        // 低级别：轻微异常，通常为信息性提示
  MEDIUM = 'medium',  // 中等级别：需要关注但不紧急
  HIGH = 'high',      // 高级别：重要告警，需要及时处理
  CRITICAL = 'critical' // 严重级别：紧急告警，可能影响设备安全或运行
}

/**
 * 告警状态枚举（对应后端枚举）
 *
 * 定义告警的生命周期状态，反映告警从产生到处理的完整流程
 */
export enum AlarmStatus {
  PENDING = 'pending',     // 待处理：新产生的告警，等待确认
  PROCESSING = 'processing', // 处理中：已确认，正在处理
  RESOLVED = 'resolved',     // 已解决：问题已处理，告警关闭
  IGNORED = 'ignored'        // 已忽略：确认后决定暂不处理
}

/**
 * 告警状态管理接口
 *
 * 定义前端告警状态管理的完整数据结构
 * 包含告警列表、分页、筛选、统计等所有相关状态
 */
export interface AlarmsState {
  items: Alarm[];                    // 告警列表数据
  selectedAlarms: string[];          // 选中的告警ID列表（用于批量操作）
  total: number;                     // 总告警数量
  page: number;                      // 当前页码
  pageSize: number;                  // 每页显示数量
  totalPages: number;                // 总页数
  loading: boolean;                  // 加载状态标识
  error: string | null;              // 错误信息
  filters: AlarmFilters;             // 当前应用的筛选条件
  bulkOperationStatus: BulkOperationStatus | null; // 批量操作状态
  statistics: AlarmStatistics | null; // 告警统计信息
}

/**
 * 告警筛选条件接口
 *
 * 定义告警列表筛选的各种条件参数
 * 支持按设备、时间、严重程度、状态等多个维度进行筛选
 */
export interface AlarmFilters {
  deviceId?: string;           // 设备ID筛选（精确匹配）
  deviceType?: string;         // 设备类型筛选
  startTime?: number;          // 开始时间筛选（时间戳）
  endTime?: number;            // 结束时间筛选（时间戳）
  severity?: AlertSeverity[];  // 严重程度筛选（数组，支持多选）
  status?: AlarmStatus[];      // 告警状态筛选（数组，支持多选）
  metricType?: string[];       // 指标类型筛选（数组，支持多选）
  searchTerm?: string;         // 搜索关键词（模糊匹配）
}

// 批量操作状态
export interface BulkOperationStatus {
  operation: BulkOperation;
  totalItems: number;
  processedItems: number;
  failedItems: string[];
  status: OperationStatus;
  startedAt: number;
  completedAt?: number;
}

// 批量操作类型
export enum BulkOperation {
  ACKNOWLEDGE = 'acknowledge',
  RESOLVE = 'resolve',
  ASSIGN = 'assign',
  IGNORE = 'ignore'
}

// 操作状态
export enum OperationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 告警统计
export interface AlarmStatistics {
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

// 告警处理请求
export interface AlarmHandlingRequest {
  alarmId: string;
  action: AlarmAction;
  note?: string;
  assignee?: string;
}

// 告警操作类型
export enum AlarmAction {
  ACKNOWLEDGE = 'acknowledge',
  RESOLVE = 'resolve',
  ASSIGN = 'assign',
  IGNORE = 'ignore'
}

// 告警详情响应
export interface AlarmDetailResponse extends Alarm {
  equipment: {
    id: string;
    name: string;
    type: string;
    location: string;
  };
  thresholdConfig?: {
    id: string;
    upperLimit?: number;
    lowerLimit?: number;
    duration: number;
  };
  relatedAlarms: string[];
  escalationHistory: EscalationRecord[];
  resolutionTime?: number;
  totalDowntime?: number;
}

// 升级记录
export interface EscalationRecord {
  id: string;
  level: number;
  triggeredAt: number;
  action: string;
  performer: string;
  reason: string;
}

// 告警列表参数
export interface AlarmListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  deviceId?: string;
  severity?: AlertSeverity[];
  status?: AlarmStatus[];
  startTime?: number;
  endTime?: number;
  searchTerm?: string;
}

// 告警分页响应
export interface AlarmPaginatedResponse {
  items: Alarm[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 批量操作请求
export interface BulkOperationRequest {
  operation: BulkOperation;
  alarmIds: string[];
  note?: string;
  assignee?: string;
  executionOptions?: {
    timeout: number;
    parallelExecution: boolean;
    failFast: boolean;
  };
}

// 批量操作响应
export interface BulkOperationResponse {
  operationId: string;
  status: OperationStatus;
  totalItems: number;
  successfulItems: number;
  failedItems: Array<{
    id: string;
    reason: string;
    errorCode: string;
  }>;
  processingTime: number;
  startedAt: number;
  completedAt?: number;
}

// 告警配置
export interface AlarmConfig {
  enableSound: boolean;
  enableNotification: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  maxDisplayCount: number;
  severityColors: {
    [severity in AlertSeverity]: string;
  };
  severityIcons: {
    [severity in AlertSeverity]: string;
  };
}

// 告警通知设置
export interface AlarmNotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  escalationEnabled: boolean;
  escalationLevels: number;
  escalationInterval: number; // 分钟
  recipients: {
    email: string[];
    sms: string[];
    push: string[];
  };
}

// 告警趋势分析
export interface AlarmTrendAnalysis {
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

// 告警规则
export interface AlarmRule {
  id: string;
  name: string;
  description: string;
  conditions: AlarmCondition[];
  actions: AlarmRuleAction[];
  enabled: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number | null;
}

// 告警条件
export interface AlarmCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

// 告警规则动作
export interface AlarmRuleAction {
  type: 'notify' | 'escalate' | 'execute' | 'log';
  config: Record<string, any>;
}

// 告警模板
export interface AlarmTemplate {
  id: string;
  name: string;
  type: AlarmTemplateType;
  severity: AlertSeverity;
  message: string;
  actions: AlarmAction[];
  variables: TemplateVariable[];
  createdAt: number;
}

// 告警模板类型
export enum AlarmTemplateType {
  THRESHOLD = 'threshold',
  TREND = 'trend',
  CONDITION = 'condition',
  MANUAL = 'manual'
}

// 模板变量
export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: any;
  required: boolean;
}