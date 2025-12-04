// 全局状态类型定义（整合所有业务域状态）
// 基于货船智能机舱管理系统全局状态管理架构

// 导入所有业务域状态类型
import { AuthState } from './auth';
import { EquipmentState } from './equipment';
import { RealTimeDataState } from './monitoring';
import { 
  HistoryDataState,
  HistoryQuery,
  HistoryQueryResult,
  HistoricalDataPoint,
  TimeGranularity,
  AggregationType,
  ExportStatus,
  ExportStatusType,
  TimeRangePreset
} from './history';
import { AlarmsState } from './alarms';
import { HealthState } from './health';
import { ThresholdConfigState } from './thresholds';
import { DataImportState } from './import';

// 全局应用状态（对应data-model.md中的GlobalState）
export interface GlobalState {
  // 用户认证域（对应后端User/Role/Permission）
  auth: AuthState;
  
  // 设备管理域（对应后端Equipment）
  equipment: EquipmentState;
  
  // 实时数据域（对应后端TimeSeriesData）
  realTimeData: RealTimeDataState;
  
  // 历史数据域（对应后端TimeSeriesData查询）
  historyData: HistoryDataState;
  
  // 告警管理域（对应后端AlarmRecord）
  alarms: AlarmsState;
  
  // 健康评估域（对应后端HealthReport）
  health: HealthState;
  
  // 阈值配置域（对应后端ThresholdConfig）
  thresholdConfig: ThresholdConfigState;
  
  // 数据导入域（对应后端ImportRecord）
  dataImport: DataImportState;
  
  // UI状态域
  ui: UIState;
}

// 历史数据相关类型已从 './history' 导入
// 数据质量（从equipment.ts导入）
export enum DataQuality {
  NORMAL = 'normal',
  ABNORMAL = 'abnormal',
  SUSPICIOUS = 'suspicious'
}

// UI状态（界面状态管理）
export interface UIState {
  // 主题相关
  theme: ThemeMode;
  
  // 导航相关
  sidebar: SidebarState;
  breadcrumbs: BreadcrumbItem[];
  
  // 通知系统
  notifications: Notification[];
  
  // 加载状态
  loading: LoadingStates;
  
  // 模态框
  modals: ModalState[];
  
  // 图表配置
  charts: ChartConfigurations;
  
  // 表单状态
  forms: FormStates;
  
  // 错误状态
  errors: ErrorState[];
  
  // 全局设置
  settings: UISettings;
}

// 主题模式
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

// 侧边栏状态
export interface SidebarState {
  expanded: boolean;
  currentPage: string;
  menuItems: MenuItem[];
}

// 菜单项
export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  permissions: string[];
  children?: MenuItem[];
  badge?: number;
  isActive: boolean;
  isEnabled: boolean;
}

// 面包屑
export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive: boolean;
  onClick?: () => void;
}

// 通知
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  persistent: boolean;
  autoHide: boolean;
  duration?: number;
  action?: NotificationAction;
  metadata?: Record<string, any>;
}

// 通知类型
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

// 通知操作
export interface NotificationAction {
  label: string;
  action: string;
  primary: boolean;
  onClick: () => void;
}

// 加载状态
export interface LoadingStates {
  global: boolean;
  dataFetch: boolean;
  realTimeConnection: boolean;
  exportProcessing: boolean;
  reportGenerating: boolean;
  [key: string]: boolean | LoadingStates;
}

// 模态框状态
export interface ModalState {
  id: string;
  component: string;
  props: Record<string, any>;
  open: boolean;
  size?: ModalSize;
  closable: boolean;
  backdropClosable: boolean;
}

// 模态框大小
export enum ModalSize {
  SMALL = 'sm',
  MEDIUM = 'md',
  LARGE = 'lg',
  XLARGE = 'xl',
  FULLSCREEN = 'fullscreen'
}

// 图表配置
export interface ChartConfigurations {
  [chartId: string]: ChartConfig;
}

// 图表配置
export interface ChartConfig {
  type: ChartType;
  title: string;
  description?: string;
  dimensions: ChartDimensions;
  timeRange: TimeRange;
  dataSource: DataSourceConfig;
  display: DisplayOptions;
  interactions: InteractionOptions;
  refresh: RefreshOptions;
}

// 图表类型
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  GAUGE = 'gauge',
  HEATMAP = 'heatmap',
  SCATTER = 'scatter',
  AREA = 'area'
}

// 图表尺寸
export interface ChartDimensions {
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

// 时间范围
export interface TimeRange {
  preset: TimeRangePreset;
  customStart?: number;
  customEnd?: number;
  live: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

// TimeRangePreset 已从 './history' 导入

// 数据源配置
export interface DataSourceConfig {
  deviceIds: string[];
  metricTypes: string[];
  aggregation?: AggregationType;
  qualityFilter?: DataQuality[];
}

// 显示选项
export interface DisplayOptions {
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  showDataLabels: boolean;
  colorScheme: ColorScheme;
  animations: boolean;
}

// 交互选项
export interface InteractionOptions {
  zoomEnabled: boolean;
  panEnabled: boolean;
  clickablePoints: boolean;
  crosshair: boolean;
}

// 刷新选项
export interface RefreshOptions {
  enabled: boolean;
  interval: number;
  autoStart: boolean;
}

// 颜色方案
export enum ColorScheme {
  DEFAULT = 'default',
  VIBRANT = 'vibrant',
  CALM = 'calm',
  HIGH_CONTRAST = 'high_contrast',
  MONOCHROME = 'monochrome'
}

// 表单状态
export interface FormStates {
  [formId: string]: FormState;
}

// 表单状态
export interface FormState {
  data: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  valid: boolean;
  submitting: boolean;
  submitted: boolean;
  lastSubmitted?: number;
  dirty: boolean;
}

// 错误状态
export interface ErrorState {
  id: string;
  type: ErrorType;
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  userMessage: string;
  retryable: boolean;
  context?: Record<string, any>;
  resolved: boolean;
}

// 错误类型
export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system',
  USER_INPUT = 'user_input'
}

// UI设置
export interface UISettings {
  language: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  timezone: string;
  autoRefresh: boolean;
  refreshInterval: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

// 性能监控相关
export interface PerformanceMetrics {
  // 应用性能
  appLoadTime: number;
  routeChangeTime: number;
  apiResponseTime: number;
  
  // 实时数据性能
  realTimeLatency: number;
  websocketConnectionTime: number;
  dataProcessingTime: number;
  
  // UI性能
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  
  // 错误统计
  errorRate: number;
  crashRate: number;
  
  timestamp: number;
}

// 应用程序配置
export interface AppConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  api: {
    baseURL: string;
    timeout: number;
    retryAttempts: number;
  };
  websocket: {
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  features: {
    [featureName: string]: boolean;
  };
  limits: {
    maxDataPoints: number;
    maxConcurrentConnections: number;
    maxExportSize: number;
  };
}

// 系统信息
export interface SystemInfo {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution: {
    width: number;
    height: number;
  };
  connectionType?: string;
  isOnline: boolean;
  batteryLevel?: number;
}

// 全局事件类型
export enum GlobalEventType {
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  TOKEN_EXPIRED = 'token_expired',
  CONNECTION_LOST = 'connection_lost',
  CONNECTION_RESTORED = 'connection_restored',
  DATA_SYNC_START = 'data_sync_start',
  DATA_SYNC_COMPLETE = 'data_sync_complete',
  ERROR_OCCURRED = 'error_occurred',
  THEME_CHANGED = 'theme_changed',
  LANGUAGE_CHANGED = 'language_changed'
}

// 全局事件
export interface GlobalEvent {
  type: GlobalEventType;
  payload: Record<string, any>;
  timestamp: number;
  source: string;
}

// 全局存储配置
export interface StorageConfig {
  keys: {
    auth: string;
    user: string;
    preferences: string;
    cache: string;
    [key: string]: string;
  };
  ttl: {
    short: number;    // 5分钟
    medium: number;   // 1小时
    long: number;     // 24小时
    permanent: number; // 永久
  };
  encryption: boolean;
  compression: boolean;
}