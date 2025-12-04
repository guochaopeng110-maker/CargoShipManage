/**
 * 货船智能机舱管理系统 - 健康评估模块
 * 基于前端状态模型规范 §5.6 和 API 契约 health.yml v2.0.0
 * 
 * 功能说明：
 * - 定义健康报告实体的完整数据结构（对应后端HealthReport实体）
 * - 提供健康状态评估和分析的类型支持
 * - 支持预测性健康分析和健康建议
 * - 包含健康报告模板和配置相关类型
 * - 与 API 契约 health.yml 中的 HealthReport Schema 完全匹配
 * 
 * 数据映射：
 * - 前端 health: HealthState 对应后端 HealthReport
 * - 趋势分析对应 metrics 数组结构
 * - 健康等级映射为 status 枚举值
 * 
 * @version 2.0.0
 * @author 货船智能机舱管理系统开发团队
 */

/**
 * 健康报告实体接口（与后端 API 契约 health.yml 完全对应）
 * 
 * 表示系统生成设备健康评估报告，对应后端HealthReport实体
 * 包含健康评分、趋势分析、告警统计等信息
 * 
 * API 对应：/components/schemas/HealthReport
 */
export interface HealthReport {
  id: string;                     // 报告唯一标识符（对应后端 id）
  equipmentId: string;            // 设备ID（必填，对应 equipmentId）
  equipmentName: string;          // 设备名称（必填，对应 equipmentName）
  reportType: string;             // 报告类型（对应 reportType: DAILY|WEEKLY|MONTHLY|ON_DEMAND）
  score: number;                  // 健康评分 0-100（对应 score，最小值0最大值100）
  status: string;                 // 健康状态（对应 status: EXCELLENT|GOOD|FAIR|POOR|CRITICAL）
  generatedAt: string;            // 生成时间（ISO 8601格式，对应 generatedAt）
  metrics: HealthMetric[];        // 健康指标数组（对应 metrics）
  dataStartTime?: number;         // 数据分析开始时间戳（扩展字段）
  dataEndTime?: number;           // 数据分析结束时间戳（扩展字段）
  runningHours?: number;          // 运行小时数（扩展字段）
  alarmCount?: number;            // 告警数量（扩展字段）
  trendAnalysis?: TrendAnalysis;  // 趋势分析数据（扩展字段）
  generatedBy?: string;           // 报告生成者（扩展字段）
  dataSource?: string;            // 数据来源（可选）
  reportPeriod?: string;          // 报告周期描述（可选）
}

/**
 * 健康指标接口（与 API 契约中的 metrics 数组项对应）
 * 
 * 表示单个健康指标的详细信息，包含当前值、正常范围、评分和趋势
 */
export interface HealthMetric {
  name: string;                   // 指标名称（对应 name）
  currentValue: number;           // 当前值（对应 currentValue）
  normalRange: [number, number];  // 正常范围 [最小值, 最大值]（对应 normalRange，2个元素数组）
  score: number;                  // 指标评分（对应 score）
  trend: string;                  // 趋势方向（对应 trend: IMPROVING|STABLE|DECLINING）
  weight: number;                 // 权重（对应 weight）
  description?: string;           // 指标描述（扩展字段）
  unit?: string;                  // 测量单位（扩展字段）
  threshold?: {                   // 阈值配置（扩展字段）
    warning: [number, number];
    critical: [number, number];
  };
}

/**
 * 报告类型枚举（与 API 契约 health.yml 保持一致）
 * 
 * 定义健康报告的类型：DAILY|WEEKLY|MONTHLY|ON_DEMAND
 * 
 * API 对应：reportType 参数的枚举值
 */
export enum ReportType {
  DAILY = 'DAILY',       // 日报告：每日健康状况评估
  WEEKLY = 'WEEKLY',     // 周报告：每周健康状况汇总
  MONTHLY = 'MONTHLY',   // 月报告：每月健康状况分析
  ON_DEMAND = 'ON_DEMAND' // 按需报告：用户主动触发的健康评估
}

/**
 * 健康状态枚举（与 API 契约 health.yml 保持一致）
 * 
 * 定义设备健康状态的等级分类：EXCELLENT|GOOD|FAIR|POOR|CRITICAL
 * 
 * API 对应：status 参数的枚举值
 */
export enum HealthStatus {
  EXCELLENT = 'EXCELLENT', // 优秀：设备运行状态极佳，健康状况优秀
  GOOD = 'GOOD',           // 良好：设备运行正常，健康状况良好
  FAIR = 'FAIR',           // 一般：设备存在轻微问题，需要关注
  POOR = 'POOR',           // 较差：设备存在严重问题，需要维护
  CRITICAL = 'CRITICAL'    // 严重：设备存在危急问题，需要立即处理
}

/**
 * 趋势方向枚举（与 API 契约 health.yml 保持一致）
 * 
 * 定义指标变化趋势的方向性：IMPROVING|STABLE|DECLINING
 * 
 * API 对应：metrics[].trend 参数的枚举值
 */
export enum TrendDirection {
  IMPROVING = 'IMPROVING', // 改善趋势：指标值向好的方向发展
  STABLE = 'STABLE',       // 稳定趋势：指标值相对稳定
  DECLINING = 'DECLINING'  // 下降趋势：指标值向坏的方向发展
}

/**
 * 设备健康状态枚举（前端扩展，用于设备列表显示）
 * 
 * 用于设备列表和仪表板显示的健康状态
 */
export enum EquipmentHealthStatus {
  HEALTHY = 'healthy',   // 健康：设备运行正常
  WARNING = 'warning',   // 警告：设备存在轻微问题
  CRITICAL = 'critical', // 严重：设备存在严重问题
  UNKNOWN = 'unknown'    // 未知：状态无法确定
}

/**
 * 趋势分析接口（前端扩展）
 *
 * 提供各指标的趋势分析数据
 * 以指标类型为键，包含统计信息和趋势方向
 */
export interface TrendAnalysis {
  [metricType: string]: {       // 指标类型 -> 分析数据
    avgValue: number;            // 平均值
    maxValue: number;            // 最大值
    minValue: number;            // 最小值
    trend: TrendDirection;       // 趋势方向
    dataPoints: number;          // 数据点数量
  };
}

/**
 * 健康评估状态接口
 *
 * 定义前端健康报告状态管理的完整数据结构
 * 包含报告列表、分页、筛选、生成状态等
 */
export interface HealthState {
  reports: HealthReport[];         // 健康报告列表数据
  activeReport: HealthReport | null; // 当前激活的报告
  loading: boolean;                // 加载状态标识
  error: string | null;            // 错误信息
  total: number;                   // 总报告数量
  page: number;                    // 当前页码
  pageSize: number;                // 每页显示数量
  totalPages: number;              // 总页数
  filters: HealthReportFilters;    // 当前应用的筛选条件
  generating: boolean;             // 报告生成中状态
}

// 健康报告筛选条件
export interface HealthReportFilters {
  deviceId?: string;
  reportType?: ReportType;
  startTime?: number;
  endTime?: number;
  healthLevel?: string[]; // 使用字符串数组以匹配后端枚举
}

// 健康报告生成请求
export interface HealthReportGenerationRequest {
  equipmentId?: string;
  reportType: ReportType;
  dataStartTime: number;
  dataEndTime: number;
  includeTrends?: boolean;
  includeAlarms?: boolean;
  includeComparisons?: boolean;
  customMetrics?: string[];
  generationOptions?: {
    template?: string;
    format?: ReportFormat;
    includeCharts?: boolean;
    includeRecommendations?: boolean;
  };
}

// 报告格式
export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  JSON = 'json',
  HTML = 'html'
}

// 健康评分计算结果
export interface HealthScoreCalculation {
  overallScore: number;
  componentScores: {
    [componentName: string]: number;
  };
  weightedScore: number;
  confidence: number;
  factors: ScoreFactor[];
  recommendations: HealthRecommendation[];
}

// 评分因子
export interface ScoreFactor {
  name: string;
  weight: number;
  score: number;
  impact: 'positive' | 'negative';
  description: string;
}

// 健康建议
export interface HealthRecommendation {
  id: string;
  priority: RecommendationPriority;
  category: RecommendationCategory;
  title: string;
  description: string;
  actions: RecommendationAction[];
  estimatedImprovement: number;
  urgency: number;
  createdAt: number;
}

// 建议优先级
export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 建议类别
export enum RecommendationCategory {
  MAINTENANCE = 'maintenance',
  OPERATION = 'operation',
  UPGRADE = 'upgrade',
  REPLACEMENT = 'replacement',
  TRAINING = 'training',
  MONITORING = 'monitoring'
}

// 建议动作
export interface RecommendationAction {
  type: ActionType;
  description: string;
  estimatedCost?: number;
  estimatedTime?: number;
  requiredSkills?: string[];
  dependencies?: string[];
}

// 动作类型
export enum ActionType {
  INSPECT = 'inspect',
  REPAIR = 'repair',
  REPLACE = 'replace',
  ADJUST = 'adjust',
  CLEAN = 'clean',
  CALIBRATE = 'calibrate',
  UPGRADE = 'upgrade',
  TRAIN = 'train'
}

// 健康基准对比
export interface HealthBenchmarkComparison {
  industry: string;
  equipmentType: string;
  benchmarks: {
    [metricType: string]: {
      average: number;
      best: number;
      worst: number;
      percentile25: number;
      percentile75: number;
    };
  };
  equipmentPosition: {
    overall: number;
    components: {
      [componentName: string]: number;
    };
  };
}

// 预测性健康分析
export interface PredictiveHealthAnalysis {
  equipmentId: string;
  predictionHorizon: number; // 天数
  predictedScore: number;
  confidence: number;
  riskFactors: RiskFactor[];
  maintenanceWindow: {
    recommended: number;
    latestAcceptable: number;
    earliestSafe: number;
  };
  degradationRate: number;
  failureProbability: Array<{
    timeframe: number;
    probability: number;
  }>;
}

// 风险因子
export interface RiskFactor {
  factor: string;
  impact: number;
  likelihood: number;
  description: string;
  mitigation: string;
}

// 健康报告模板
export interface HealthReportTemplate {
  id: string;
  name: string;
  description: string;
  reportType: ReportType;
  sections: ReportSection[];
  customFields: CustomField[];
  chartConfigurations: ChartConfiguration[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number | null;
}

// 报告章节
export interface ReportSection {
  id: string;
  name: string;
  type: SectionType;
  order: number;
  required: boolean;
  config: Record<string, any>;
}

// 章节类型
export enum SectionType {
  EXECUTIVE_SUMMARY = 'executive_summary',
  OVERVIEW = 'overview',
  METRICS = 'metrics',
  TRENDS = 'trends',
  ALARMS = 'alarms',
  RECOMMENDATIONS = 'recommendations',
  APPENDIX = 'appendix'
}

// 自定义字段
export interface CustomField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: FieldValidation;
}

// 字段验证
export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
}

// 图表配置
export interface ChartConfiguration {
  id: string;
  type: ChartType;
  title: string;
  dataSource: ChartDataSource;
  display: ChartDisplayOptions;
  enabled: boolean;
}

// 图表类型
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  GAUGE = 'gauge',
  AREA = 'area',
  SCATTER = 'scatter'
}

// 图表数据源
export interface ChartDataSource {
  metrics: string[];
  timeRange: {
    start: number;
    end: number;
  };
  aggregation?: AggregationType;
}

// 聚合类型
export enum AggregationType {
  NONE = 'none',
  AVERAGE = 'average',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  COUNT = 'count'
}

// 图表显示选项
export interface ChartDisplayOptions {
  showLegend: boolean;
  showGrid: boolean;
  colorScheme: string;
  height?: number;
  width?: number;
}

// 健康指数
export interface HealthIndex {
  name: string;
  value: number;
  trend: TrendDirection;
  benchmark: number;
  weight: number;
  category: string;
  description: string;
}

// 设备健康画像
export interface EquipmentHealthProfile {
  equipmentId: string;
  baselineMetrics: BaselineMetric[];
  currentStatus: HealthStatusInterface;
  historicalTrends: HistoricalTrend[];
  riskProfile: RiskProfile;
  maintenanceHistory: MaintenanceRecord[];
  optimizationOpportunities: OptimizationOpportunity[];
}

// 基线指标
export interface BaselineMetric {
  metricType: string;
  expectedRange: {
    min: number;
    max: number;
  };
  targetValue: number;
  tolerance: number;
  measurementInterval: number;
}

// 健康状态接口（避免与枚举命名冲突）
export interface HealthStatusInterface {
  overallScore: number;
  level: HealthStatus;
  lastAssessment: number;
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

// 历史趋势
export interface HistoricalTrend {
  metricType: string;
  period: string;
  trend: TrendDirection;
  changeRate: number;
  significance: number;
  notes?: string;
}

// 风险画像
export interface RiskProfile {
  overallRisk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
  nextReviewDate: number;
}

// 维护记录
export interface MaintenanceRecord {
  id: string;
  type: MaintenanceType;
  date: number;
  performedBy: string;
  description: string;
  cost?: number;
  duration?: number;
  effectiveness?: number;
  notes?: string;
}

// 维护类型
export enum MaintenanceType {
  PREVENTIVE = 'preventive',
  CORRECTIVE = 'corrective',
  PREDICTIVE = 'predictive',
  EMERGENCY = 'emergency'
}

// 优化机会
export interface OptimizationOpportunity {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialBenefit: {
    type: 'cost' | 'efficiency' | 'reliability' | 'safety';
    value: number;
    timeframe: string;
  };
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    cost: number;
    time: number;
    resources: string[];
  };
  priority: RecommendationPriority;
}