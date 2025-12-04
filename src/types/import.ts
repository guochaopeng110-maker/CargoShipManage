// 数据导入相关类型定义（对应后端ImportRecord实体）
// 基于货船智能机舱管理系统数据导入架构
//
// 功能说明：
// - 定义数据导入记录和状态的完整数据结构
// - 提供文件上传、验证、转换的类型支持
// - 支持批量导入、调度和模板管理
// - 包含导入统计和错误处理相关类型

import { DataQuality } from './equipment';

/**
 * 数据导入记录实体接口（对应后端ImportRecord实体）
 *
 * 表示文件数据导入操作的完整记录
 * 包含文件信息、导入状态、结果统计和错误详情
 */
export interface ImportRecord {
  id: string;                    // 导入记录唯一标识符
  fileName: string;              // 文件名称
  fileFormat: FileFormat;        // 文件格式类型
  fileSize: number;              // 文件大小（字节）
  equipmentId?: string;          // 关联的设备ID（可选）
  status: ImportStatus;          // 导入状态
  totalRows: number;             // 总行数
  successRows: number;           // 成功导入行数
  failedRows: number;            // 失败行数
  skippedRows: number;           // 跳过行数
  errors: ImportError[];         // 错误详情列表
  startedAt: number | null;      // 开始时间戳（null表示未开始）
  completedAt: number | null;    // 完成时间戳（null表示未完成）
  importedBy: string;            // 导入操作者用户名
  createdAt: number;             // 创建时间戳
  // === 计算字段（前端计算得出） ===
  successRate: number;           // 成功率（百分比）
  duration: number;              // 导入耗时（毫秒）
  importer?: User;               // 导入操作者详细信息（可选）
}

/**
 * 用户信息接口（前向引用）
 *
 * 简化版用户信息，用于显示导入操作者
 */
export interface User {
  id: string;        // 用户ID
  username: string;  // 用户名
  email: string;     // 邮箱地址
}

/**
 * 导入状态枚举
 *
 * 定义数据导入操作的生命周期状态
 */
export enum ImportStatus {
  PENDING = 'pending',    // 待处理：文件已上传，等待处理
  PROCESSING = 'processing', // 处理中：正在验证和导入数据
  COMPLETED = 'completed',   // 已完成：导入成功完成
  PARTIAL = 'partial',       // 部分完成：有部分数据导入失败
  FAILED = 'failed'          // 失败：导入过程中出现错误
}

/**
 * 文件格式枚举
 *
 * 定义支持的数据文件格式类型
 */
export enum FileFormat {
  JSON = 'json',    // JSON格式文件
  XML = 'xml',      // XML格式文件
  EXCEL = 'excel',  // Excel格式文件
  CSV = 'csv'       // CSV格式文件
}

/**
 * 导入错误详情接口（对应后端ImportError接口）
 *
 * 记录导入过程中出现的具体错误信息
 */
export interface ImportError {
  rowNumber: number;      // 出错的行号
  batchNumber: number;    // 批次号
  reason: string;         // 错误原因
  originalData: any;      // 原始数据
  errorDetails?: string;  // 详细错误信息（可选）
}

/**
 * 数据导入状态接口
 *
 * 定义前端数据导入状态管理的完整数据结构
 * 包含导入记录列表、分页、筛选、预览等所有相关状态
 */
export interface DataImportState {
  records: ImportRecord[];        // 导入记录列表数据
  activeRecord: ImportRecord | null; // 当前激活的记录
  uploading: boolean;             // 文件上传中状态
  processing: boolean;            // 数据处理中状态
  loading: boolean;               // 列表加载中状态
  error: string | null;           // 错误信息
  total: number;                  // 总记录数量
  page: number;                   // 当前页码
  pageSize: number;               // 每页显示数量
  totalPages: number;             // 总页数
  filters: ImportRecordFilters;   // 当前应用的筛选条件
  previewData: ImportPreviewData | null; // 导入预览数据
}

// 导入记录筛选条件
export interface ImportRecordFilters {
  fileName?: string;
  status?: ImportStatus[];
  importedBy?: string;
  startTime?: number;
  endTime?: number;
}

// 导入预览数据
export interface ImportPreviewData {
  totalRows: number;
  previewRows: Array<{
    deviceId: string;
    timestamp: string;
    metricType: string;
    value: number;
    unit?: string;
    source?: string;
  }>;
  validationErrors: ValidationError[];
  duplicateCount: number;
  estimatedProcessingTime: number;
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
  rowNumber: number;
  severity: 'error' | 'warning';
}

// 数据导入请求
export interface DataImportRequest {
  file: File;
  equipmentId?: string;
  options: ImportOptions;
  mapping: ImportMapping;
}

// 导入选项
export interface ImportOptions {
  skipHeader: boolean;
  treatFirstRowAsHeader: boolean;
  delimiter?: string;
  encoding: string;
  timezone: string;
  dateFormat: string;
  numericFormat: ImportNumericFormat;
  validation: ImportValidationConfig;
  duplicateHandling: DuplicateHandling;
  batchSize: number;
  rollbackOnError: boolean;
}

// 数字格式
export interface ImportNumericFormat {
  decimalSeparator: '.' | ',';
  thousandsSeparator: '.' | ',' | ' ';
  negativeFormat: 'minus' | 'parentheses' | 'space';
  defaultPrecision: number;
}

// 重复数据处理
export enum DuplicateHandling {
  SKIP = 'skip',          // 跳过
  OVERWRITE = 'overwrite', // 覆盖
  UPDATE = 'update',      // 更新
  ERROR = 'error'         // 报错
}

// 导入验证配置
export interface ImportValidationConfig {
  strict: boolean;
  skipInvalidRows: boolean;
  validateEquipment: boolean;
  validateTimestamp: boolean;
  validateValues: boolean;
  validateUnits: boolean;
  maxErrors: number;
}

// 导入映射
export interface ImportMapping {
  sourceColumns: ColumnMapping[];
  transformations: DataTransformation[];
  validations: ValidationRule[];
}

// 列映射
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  defaultValue?: any;
  transformation?: string;
  validation?: ColumnValidation;
}

// 列验证
export interface ColumnValidation {
  type: ValidationType;
  constraints?: ValidationConstraints;
  customValidator?: string;
}

// 验证类型
export enum ValidationType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  EMAIL = 'email',
  UUID = 'uuid',
  ENUM = 'enum',
  ARRAY = 'array',
  OBJECT = 'object'
}

// 验证约束
export interface ValidationConstraints {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean;
}

// 数据转换
export interface DataTransformation {
  sourceField: string;
  targetField: string;
  type: TransformationType;
  parameters?: Record<string, any>;
  condition?: TransformationCondition;
}

// 转换类型
export enum TransformationType {
  PARSE_DATE = 'parse_date',
  FORMAT_NUMBER = 'format_number',
  CONVERT_UNIT = 'convert_unit',
  CALCULATE = 'calculate',
  MAP_VALUES = 'map_values',
  REGEX_REPLACE = 'regex_replace',
  CONCATENATE = 'concatenate',
  SPLIT = 'split',
  TRIM = 'trim',
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase',
  CUSTOM = 'custom'
}

// 转换条件
export interface TransformationCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

// 验证规则
export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  parameters?: Record<string, any>;
}

// 数据导入作业
export interface ImportJob {
  id: string;
  recordId: string;
  type: ImportJobType;
  status: ImportJobStatus;
  progress: number;
  currentRow: number;
  totalRows: number;
  startedAt: number;
  completedAt?: number;
  error?: string;
  result?: ImportJobResult;
}

// 导入作业类型
export enum ImportJobType {
  UPLOAD = 'upload',
  VALIDATE = 'validate',
  TRANSFORM = 'transform',
  IMPORT = 'import',
  POST_PROCESS = 'post_process'
}

// 导入作业状态
export enum ImportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 导入作业结果
export interface ImportJobResult {
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  errors: ImportError[];
  statistics: ImportStatistics;
}

// 导入统计
export interface ImportStatistics {
  dataQualityDistribution: {
    [quality in DataQuality]: number;
  };
  equipmentDistribution: {
    [equipmentId: string]: number;
  };
  metricTypeDistribution: {
    [metricType: string]: number;
  };
  timeRange: {
    earliest: number;
    latest: number;
  };
  valueRange: {
    min: number;
    max: number;
    mean: number;
  };
}

// 导入模板
export interface ImportTemplate {
  id: string;
  name: string;
  description: string;
  fileFormat: FileFormat;
  mapping: ImportMapping;
  options: ImportOptions;
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number | null;
}

// 导入历史统计
export interface ImportHistoryStatistics {
  period: {
    start: number;
    end: number;
  };
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  totalRows: number;
  totalErrors: number;
  averageProcessingTime: number;
  importRate: number; // rows per second
  statusDistribution: {
    [status in ImportStatus]: number;
  };
  formatDistribution: {
    [format in FileFormat]: number;
  };
  topErrors: Array<{
    errorType: string;
    count: number;
    percentage: number;
  }>;
  equipmentDistribution: Array<{
    equipmentId: string;
    equipmentName: string;
    importCount: number;
    rowCount: number;
  }>;
}

// 批量导入作业
export interface BatchImportJob {
  id: string;
  name: string;
  description: string;
  files: ImportFile[];
  targetEquipment?: string;
  options: BatchImportOptions;
  schedule?: ImportSchedule;
  status: BatchImportJobStatus;
  createdBy: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: BatchImportResult;
}

// 导入文件
export interface ImportFile {
  fileName: string;
  fileSize: number;
  templateId?: string;
  mapping: ImportMapping;
  options: ImportOptions;
}

// 批量导入选项
export interface BatchImportOptions {
  failFast: boolean;
  stopOnError: boolean;
  parallelProcessing: boolean;
  maxConcurrency: number;
  cleanupAfterCompletion: boolean;
}

// 导入调度
export interface ImportSchedule {
  enabled: boolean;
  frequency: ScheduleFrequency;
  time?: string;
  daysOfWeek?: number[];
  timezone: string;
  nextRun?: number;
  lastRun?: number;
}

// 调度频率
export enum ScheduleFrequency {
  ONCE = 'once',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly'
}

// 批量导入作业状态
export enum BatchImportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial'
}

// 批量导入结果
export interface BatchImportResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  totalErrors: number;
  duration: number;
  files: Array<{
    fileName: string;
    status: ImportStatus;
    rowsProcessed: number;
    errors: ImportError[];
    duration?: number;
  }>;
}

// 导入权限配置
export interface ImportPermissions {
  maxFileSize: number; // bytes
  allowedFormats: FileFormat[];
  maxRowsPerFile: number;
  requireTemplate: boolean;
  requireApproval: boolean;
  allowedRoles: string[];
  restrictedDevices?: string[];
}

// 导入配置
export interface ImportConfiguration {
  defaults: {
    options: ImportOptions;
    validation: ImportValidationConfig;
  };
  limits: {
    maxConcurrentImports: number;
    maxFileSize: number;
    maxRowsPerFile: number;
    maxDailyImports: number;
  };
  permissions: ImportPermissions;
  notifications: {
    enableEmailNotifications: boolean;
    emailRecipients: string[];
    events: NotificationEvent[];
  };
}

// 通知事件
export enum NotificationEvent {
  IMPORT_STARTED = 'import_started',
  IMPORT_COMPLETED = 'import_completed',
  IMPORT_FAILED = 'import_failed',
  VALIDATION_ERRORS = 'validation_errors',
  LARGE_IMPORT = 'large_import'
}