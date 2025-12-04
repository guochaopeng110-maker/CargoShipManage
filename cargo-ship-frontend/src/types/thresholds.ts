// 阈值配置相关类型定义（对应后端ThresholdConfig实体）
// 基于货船智能机舱管理系统阈值管理架构
//
// 功能说明：
// - 定义阈值配置实体的完整数据结构
// - 提供阈值规则和条件判断的类型支持
// - 支持阈值测试、冲突检测和自动调整
// - 包含阈值模板和调度相关类型

import { AlertSeverity } from './alarms';

/**
 * 阈值配置实体接口（对应后端ThresholdConfig实体）
 *
 * 表示设备监控的阈值配置，定义告警触发的条件和参数
 */
export interface ThresholdConfig {
  id: string;                    // 阈值配置唯一标识符
  equipmentId: string;           // 关联的设备ID
  equipmentName: string;         // 设备名称（扩展字段，前端显示用）
  metricType: string;            // 指标类型（如温度、压力等）
  upperLimit?: number;           // 上限阈值（可选）
  lowerLimit?: number;           // 下限阈值（可选）
  duration: number;              // 持续时间（毫秒）：超过阈值持续多长时间触发告警
  severity: AlertSeverity;       // 告警严重程度
  enabled: boolean;              // 是否启用
  createdAt: number;             // 创建时间戳
  updatedAt: number | null;      // 更新时间戳（null表示未更新）
  deletedAt: number | null;      // 删除时间戳（null表示未删除）
  // === 扩展字段 ===
  description?: string;          // 阈值配置描述（可选）
  ruleType?: ThresholdRuleType;  // 规则类型（可选）
}

/**
 * 阈值规则类型枚举
 *
 * 定义阈值规则的类型，区分不同类型的阈值判断逻辑
 */
export enum ThresholdRuleType {
  UPPER = 'upper',      // 上限阈值：数值超过上限时触发
  LOWER = 'lower',      // 下限阈值：数值低于下限时触发
  RANGE = 'range',      // 范围阈值：数值超出正常范围时触发
  DURATION = 'duration' // 持续时间阈值：超过阈值持续指定时间后触发
}

/**
 * 阈值配置状态接口
 *
 * 定义前端阈值配置管理的完整数据结构
 */
export interface ThresholdConfigState {
  items: ThresholdConfig[];       // 阈值配置列表数据
  selectedConfig: ThresholdConfig | null; // 当前选中的配置
  loading: boolean;               // 加载状态标识
  error: string | null;           // 错误信息
  total: number;                  // 总配置数量
  page: number;                   // 当前页码
  pageSize: number;               // 每页显示数量
  totalPages: number;             // 总页数
  filters: ThresholdConfigFilters; // 当前应用的筛选条件
}

/**
 * 阈值配置筛选条件接口
 *
 * 定义阈值配置列表筛选的各种条件参数
 */
export interface ThresholdConfigFilters {
  deviceId?: string;           // 设备ID筛选
  metricType?: string;         // 指标类型筛选
  enabled?: boolean;           // 启用状态筛选
  severity?: AlertSeverity[];  // 严重程度筛选（数组，支持多选）
}

// 阈值验证结果
export interface ThresholdValidationResult {
  valid: boolean;
  errors: ThresholdValidationError[];
  warnings: ThresholdValidationWarning[];
}

// 阈值验证错误
export interface ThresholdValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

// 阈值验证警告
export interface ThresholdValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// 创建阈值配置请求
export interface CreateThresholdConfigRequest {
  equipmentId: string;
  metricType: string;
  upperLimit?: number;
  lowerLimit?: number;
  duration: number;
  severity: AlertSeverity;
  description?: string;
  ruleType?: ThresholdRuleType;
  enabled?: boolean;
}

// 更新阈值配置请求
export interface UpdateThresholdConfigRequest {
  upperLimit?: number;
  lowerLimit?: number;
  duration?: number;
  severity?: AlertSeverity;
  description?: string;
  ruleType?: ThresholdRuleType;
  enabled?: boolean;
}

// 阈值配置列表参数
export interface ThresholdConfigListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  deviceId?: string;
  metricType?: string;
  enabled?: boolean;
  severity?: AlertSeverity[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 阈值配置分页响应
export interface ThresholdConfigPaginatedResponse {
  items: ThresholdConfig[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 阈值测试请求
export interface ThresholdTestRequest {
  equipmentId: string;
  metricType: string;
  testValues: number[];
  duration: number;
}

// 阈值测试结果
export interface ThresholdTestResult {
  testId: string;
  status: 'passed' | 'failed' | 'warning';
  results: Array<{
    value: number;
    triggered: boolean;
    timeToTrigger?: number;
    severity?: AlertSeverity;
    message: string;
  }>;
  summary: {
    totalTests: number;
    triggers: number;
    averageResponseTime?: number;
  };
  recommendations: string[];
}

// 阈值规则构建器
export interface ThresholdRule {
  id: string;
  name: string;
  description: string;
  ruleType: ThresholdRuleType;
  conditions: ThresholdCondition[];
  actions: ThresholdAction[];
  enabled: boolean;
  priority: number;
  createdAt: number;
  updatedAt: number | null;
}

// 阈值条件
export interface ThresholdCondition {
  metricType: string;
  operator: ThresholdOperator;
  value: number;
  duration?: number;
  aggregation?: ThresholdAggregation;
  logicalOperator?: 'AND' | 'OR';
}

// 阈值操作符
export enum ThresholdOperator {
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  BETWEEN = 'between',
  OUTSIDE = 'outside'
}

// 阈值聚合
export enum ThresholdAggregation {
  NONE = 'none',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  COUNT = 'count'
}

// 阈值动作
export interface ThresholdAction {
  type: ThresholdActionType;
  config: Record<string, any>;
  delay?: number;
}

// 阈值动作类型
export enum ThresholdActionType {
  CREATE_ALARM = 'create_alarm',
  SEND_NOTIFICATION = 'send_notification',
  EXECUTE_SCRIPT = 'execute_script',
  CALL_WEBHOOK = 'call_webhook',
  UPDATE_DEVICE_STATUS = 'update_device_status',
  ESCALATE = 'escalate'
}

// 阈值模板
export interface ThresholdTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  metricType: string;
  ruleType: ThresholdRuleType;
  defaultValues: {
    upperLimit?: number;
    lowerLimit?: number;
    duration: number;
    severity: AlertSeverity;
  };
  validationRules: ThresholdValidationRule[];
  recommended: boolean;
  createdAt: number;
  updatedAt: number | null;
}

// 阈值验证规则
export interface ThresholdValidationRule {
  field: string;
  rule: string;
  message: string;
  parameters?: Record<string, any>;
}

// 阈值历史记录
export interface ThresholdHistoryRecord {
  id: string;
  thresholdId: string;
  action: ThresholdHistoryAction;
  oldValue?: any;
  newValue?: any;
  performedBy: string;
  timestamp: number;
  reason?: string;
  metadata?: Record<string, any>;
}

// 阈值历史动作
export enum ThresholdHistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  TESTED = 'tested'
}

// 阈值冲突检测
export interface ThresholdConflict {
  conflictType: ThresholdConflictType;
  description: string;
  conflictingConfigs: string[];
  severity: 'low' | 'medium' | 'high';
  resolution: string[];
}

// 阈值冲突类型
export enum ThresholdConflictType {
  OVERLAPPING_RANGES = 'overlapping_ranges',
  CONTRADICTORY_RULES = 'contradictory_rules',
  UNREACHABLE_THRESHOLDS = 'unreachable_thresholds',
  INSUFFICIENT_DURATION = 'insufficient_duration'
}

// 阈值性能统计
export interface ThresholdStatistics {
  totalConfigs: number;
  activeConfigs: number;
  disabledConfigs: number;
  configsBySeverity: {
    [severity in AlertSeverity]: number;
  };
  configsByRuleType: {
    [ruleType in ThresholdRuleType]: number;
  };
  mostUsedMetrics: Array<{
    metricType: string;
    count: number;
  }>;
  averageConfigurationTime: number;
  testSuccessRate: number;
}

// 阈值导入配置
export interface ThresholdImportConfig {
  source: 'file' | 'api' | 'template';
  format: 'json' | 'csv' | 'xml';
  mapping: Record<string, string>;
  validation: {
    strict: boolean;
    skipErrors: boolean;
    preview: boolean;
  };
  options: {
    overwrite: boolean;
    createMissingDevices: boolean;
    enabled: boolean;
  };
}

// 阈值导出配置
export interface ThresholdExportConfig {
  format: 'json' | 'csv' | 'excel';
  filters: ThresholdConfigFilters;
  includeHistory: boolean;
  includeTestResults: boolean;
  includeMetadata: boolean;
}

// 阈值建议系统
export interface ThresholdSuggestion {
  id: string;
  equipmentId: string;
  metricType: string;
  suggestedValues: {
    upperLimit?: number;
    lowerLimit?: number;
    duration: number;
    severity: AlertSeverity;
  };
  confidence: number;
  reasoning: string;
  basedOn: {
    dataPeriod: {
      start: number;
      end: number;
    };
    dataPoints: number;
    statisticalAnalysis: StatisticalAnalysis;
  };
  createdAt: number;
}

// 统计分析
export interface StatisticalAnalysis {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  percentiles: {
    p5: number;
    p25: number;
    p75: number;
    p95: number;
  };
  outliers: number;
  distribution: 'normal' | 'skewed' | 'uniform' | 'unknown';
}

// 阈值调度
export interface ThresholdSchedule {
  id: string;
  thresholdId: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  config: {
    autoAdjust: boolean;
    adjustmentRate: number;
    bounds: {
      maxAdjustment: number;
      minAdjustment: number;
    };
  };
}

// 阈值自适应算法
export interface AdaptiveThresholdConfig {
  enabled: boolean;
  learningRate: number;
  windowSize: number;
  minDataPoints: number;
  seasonality: {
    enabled: boolean;
    period: number;
  };
  outlierHandling: 'remove' | 'cap' | 'none';
  bounds: {
    maxUpperLimit?: number;
    minLowerLimit?: number;
  };
}