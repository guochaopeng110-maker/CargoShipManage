// 常量定义（应用程序常量集合）
// 基于货船智能机舱管理系统常量架构

// 应用程序常量
export const APP_CONSTANTS = {
  NAME: '货船智能机舱管理系统',
  VERSION: '1.0.0',
  DESCRIPTION: '基于货船智能机舱管理系统的Web应用',
  AUTHOR: 'Cargo Ship Management Team',
  COPYRIGHT: '© 2024 Cargo Ship Management System',
  SUPPORT_EMAIL: 'support@cargoship-system.com',
  SUPPORT_PHONE: '+86-400-123-4567',
  WEBSITE: 'https://www.cargoship-system.com',
  DOCUMENTATION: 'https://docs.cargoship-system.com',
  API_DOCS: 'https://api-docs.cargoship-system.com',
} as const;

// 日期和时间常量
export const DATE_CONSTANTS = {
  // 毫秒转换
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
  
  // 时间格式
  FORMAT: {
    DATE: 'YYYY-MM-DD',
    TIME: 'HH:mm:ss',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
    TIMESTAMP: 'X',
    RELATIVE: 'relative',
  },
  
  // 本地化
  LOCALE: 'zh-CN',
  TIMEZONE: 'Asia/Shanghai',
} as const;

// 认证常量
export const AUTH_CONSTANTS = {
  // 令牌相关
  TOKEN: {
    ACCESS_TOKEN_KEY: 'access_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    TOKEN_TYPE: 'Bearer',
    EXPIRY_BUFFER: 5 * 60 * 1000, // 5分钟
  },
  
  // 会话相关
  SESSION: {
    IDLE_TIMEOUT: 30 * 60 * 1000, // 30分钟
    ABSOLUTE_TIMEOUT: 8 * 60 * 60 * 1000, // 8小时
    HEARTBEAT_INTERVAL: 60 * 1000, // 1分钟
  },
  
  // 密码策略
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    COMMON_PASSWORDS_BLOCKLIST: [
      '123456', 'password', '123456789', '12345', '12345678', 'qwerty', 
      '1234567', '111111', '123123', 'abc123', 'password1', 'admin'
    ],
  },
  
  // 登录尝试限制
  LOGIN_ATTEMPTS: {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15分钟
    WINDOW_DURATION: 10 * 60 * 1000, // 10分钟
  },
} as const;

// 角色和权限常量
export const ROLE_CONSTANTS = {
  // 系统角色
  ROLES: {
    ADMINISTRATOR: 'Administrator',
    OPERATOR: 'Operator', 
    VIEWER: 'Viewer',
  },
  
  // 角色级别
  ROLE_LEVEL: {
    VIEWER: 1,
    OPERATOR: 2,
    ADMINISTRATOR: 3,
  },
  
  // 权限类型
  PERMISSIONS: {
    // 系统权限
    SYSTEM_READ: 'system:read',
    SYSTEM_WRITE: 'system:write',
    SYSTEM_DELETE: 'system:delete',
    SYSTEM_EXECUTE: 'system:execute',
    
    // 用户权限
    USER_READ: 'user:read',
    USER_WRITE: 'user:write',
    USER_DELETE: 'user:delete',
    USER_EXECUTE: 'user:execute',
    
    // 设备权限（更新为标准格式）
    DEVICE_READ: 'device:read',
    DEVICE_WRITE: 'device:write',
    DEVICE_UPDATE: 'device:update',
    DEVICE_DELETE: 'device:delete',
    DEVICE_CREATE: 'device:create',
    
    // 告警权限
    ALARM_READ: 'alarm:read',
    ALARM_WRITE: 'alarm:write',
    ALARM_DELETE: 'alarm:delete',
    ALARM_EXECUTE: 'alarm:execute',
    
    // 报告权限
    REPORT_READ: 'report:read',
    REPORT_WRITE: 'report:write',
    REPORT_DELETE: 'report:delete',
    REPORT_EXECUTE: 'report:execute',
    
    // 维护权限
    MAINTENANCE_READ: 'maintenance:read',
    MAINTENANCE_WRITE: 'maintenance:write',
    MAINTENANCE_DELETE: 'maintenance:delete',
    MAINTENANCE_EXECUTE: 'maintenance:execute',
    
    // 数据导入权限
    IMPORT_READ: 'import:read',
    IMPORT_WRITE: 'import:write',
    IMPORT_DELETE: 'import:delete',
    IMPORT_EXECUTE: 'import:execute',
    
    // 阈值权限
    THRESHOLD_READ: 'threshold:read',
    THRESHOLD_WRITE: 'threshold:write',
    THRESHOLD_DELETE: 'threshold:delete',
    THRESHOLD_EXECUTE: 'threshold:execute',
    
    // 监控权限
    MONITORING_READ: 'monitoring:read',
    MONITORING_WRITE: 'monitoring:write',
    MONITORING_DELETE: 'monitoring:delete',
    MONITORING_EXECUTE: 'monitoring:execute',
    
    // 健康检查权限
    HEALTH_READ: 'health:read',
    HEALTH_WRITE: 'health:write',
    HEALTH_DELETE: 'health:delete',
    HEALTH_EXECUTE: 'health:execute',
    
    // 历史数据权限
    HISTORY_READ: 'history:read',
    HISTORY_WRITE: 'history:write',
    HISTORY_DELETE: 'history:delete',
    HISTORY_EXECUTE: 'history:execute',
  },
} as const;

// 设备类型常量
export const EQUIPMENT_CONSTANTS = {
  // 设备类型
  TYPES: {
    MAIN_ENGINE: 'main_engine',
    GENERATOR: 'generator',
    PUMP: 'pump',
    COMPRESSOR: 'compressor',
    HEAT_EXCHANGER: 'heat_exchanger',
    TURBINE: 'turbine',
    BOILER: 'boiler',
    COOLING_SYSTEM: 'cooling_system',
    FUEL_SYSTEM: 'fuel_system',
    LUBRICATION_SYSTEM: 'lubrication_system',
    CONTROL_SYSTEM: 'control_system',
    SENSORS: 'sensors',
  },
  
  // 设备状态
  STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    MAINTENANCE: 'maintenance',
    FAULT: 'fault',
    WARNING: 'warning',
    SHUTDOWN: 'shutdown',
  },
  
  // 设备优先级
  PRIORITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
  
  // 设备单位
  UNITS: {
    PRESSURE: 'bar',
    TEMPERATURE: '°C',
    FLOW: 'm³/h',
    SPEED: 'rpm',
    POWER: 'kW',
    VOLTAGE: 'V',
    CURRENT: 'A',
    FREQUENCY: 'Hz',
    LEVEL: 'm',
    VIBRATION: 'mm/s',
  },
} as const;

// 告警常量
export const ALARM_CONSTANTS = {
  // 告警级别
  LEVELS: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info',
  },
  
  // 告警状态
  STATUS: {
    ACTIVE: 'active',
    ACKNOWLEDGED: 'acknowledged',
    CLEARED: 'cleared',
    SUPPRESSED: 'suppressed',
    ESCALATED: 'escalated',
  },
  
  // 告警类型
  TYPES: {
    EQUIPMENT_FAULT: 'equipment_fault',
    SYSTEM_OVERRIDE: 'system_override',
    THRESHOLD_EXCEEDED: 'threshold_exceeded',
    COMMUNICATION_LOST: 'communication_lost',
    MAINTENANCE_REQUIRED: 'maintenance_required',
    SAFETY_INTERLOCK: 'safety_interlock',
    PERFORMANCE_DEGRADATION: 'performance_degradation',
  },
  
  // 通知方式
  NOTIFICATION_TYPES: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    SOUND: 'sound',
    VISUAL: 'visual',
  },
} as const;

// 监控常量
export const MONITORING_CONSTANTS = {
  // 数据类型
  DATA_TYPES: {
    TEMPERATURE: 'temperature',
    PRESSURE: 'pressure',
    FLOW: 'flow',
    LEVEL: 'level',
    VIBRATION: 'vibration',
    CURRENT: 'current',
    VOLTAGE: 'voltage',
    POWER: 'power',
    SPEED: 'speed',
    EFFICIENCY: 'efficiency',
  },
  
  // 采样频率
  SAMPLING_FREQUENCY: {
    REAL_TIME: 1000, // 1秒
    HIGH_FREQUENCY: 5000, // 5秒
    NORMAL: 30000, // 30秒
    LOW_FREQUENCY: 300000, // 5分钟
    BATCH: 3600000, // 1小时
  },
  
  // 数据保留期限
  RETENTION_PERIODS: {
    REAL_TIME: 24 * 60 * 60 * 1000, // 24小时
    HOURLY: 30 * 24 * 60 * 60 * 1000, // 30天
    DAILY: 365 * 24 * 60 * 60 * 1000, // 1年
    MONTHLY: 5 * 365 * 24 * 60 * 60 * 1000, // 5年
  },
} as const;

// 维护常量
export const MAINTENANCE_CONSTANTS = {
  // 维护类型
  TYPES: {
    PREVENTIVE: 'preventive',
    CORRECTIVE: 'corrective',
    PREDICTIVE: 'predictive',
    EMERGENCY: 'emergency',
    INSPECTION: 'inspection',
    CALIBRATION: 'calibration',
  },
  
  // 维护状态
  STATUS: {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    OVERDUE: 'overdue',
  },
  
  // 优先级
  PRIORITY: {
    URGENT: 'urgent',
    HIGH: 'high',
    NORMAL: 'normal',
    LOW: 'low',
  },
  
  // 维护周期
  CYCLES: {
    DAILY: 24 * 60 * 60 * 1000,
    WEEKLY: 7 * 24 * 60 * 60 * 1000,
    MONTHLY: 30 * 24 * 60 * 60 * 1000,
    QUARTERLY: 90 * 24 * 60 * 60 * 1000,
    SEMI_ANNUALLY: 180 * 24 * 60 * 60 * 1000,
    ANNUALLY: 365 * 24 * 60 * 60 * 1000,
  },
} as const;

// 报告常量
export const REPORT_CONSTANTS = {
  // 报告类型
  TYPES: {
    EQUIPMENT_STATUS: 'equipment_status',
    ALARM_SUMMARY: 'alarm_summary',
    MAINTENANCE_SUMMARY: 'maintenance_summary',
    PERFORMANCE_ANALYSIS: 'performance_analysis',
    ENERGY_CONSUMPTION: 'energy_consumption',
    COMPLIANCE_REPORT: 'compliance_report',
    TREND_ANALYSIS: 'trend_analysis',
  },
  
  // 报告格式
  FORMATS: {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv',
    JSON: 'json',
  },
  
  // 报告周期
  PERIODS: {
    HOURLY: 'hourly',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    ANNUALLY: 'annually',
    CUSTOM: 'custom',
  },
} as const;

// UI 常量
export const UI_CONSTANTS = {
  // 主题
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
  },
  
  // 语言
  LANGUAGES: {
    ZH_CN: 'zh-CN',
    EN_US: 'en-US',
  },
  
  // 布局
  LAYOUT: {
    SIDEBAR_WIDTH: 280,
    HEADER_HEIGHT: 64,
    FOOTER_HEIGHT: 48,
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
  },
  
  // 动画
  ANIMATIONS: {
    DURATION: {
      FAST: 150,
      NORMAL: 300,
      SLOW: 500,
    },
    EASING: {
      EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
      EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
  
  // 颜色
  COLORS: {
    PRIMARY: '#2563eb',
    SECONDARY: '#64748b',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
} as const;

// API 常量
export const API_CONSTANTS = {
  // HTTP 状态码
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
  },
  
  // 请求限制
  RATE_LIMITS: {
    DEFAULT: 100, // 每分钟100次请求
    AUTH: 10, // 认证相关每分钟10次请求
    UPLOAD: 5, // 上传每分钟5次请求
  },
  
  // 超时设置
  TIMEOUTS: {
    DEFAULT: 30000, // 30秒
    UPLOAD: 300000, // 5分钟
    LONG_POLLING: 60000, // 1分钟
  },
  
  // 分页
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MIN_PAGE_SIZE: 1,
  },
} as const;

// 存储常量
export const STORAGE_CONSTANTS = {
  // localStorage 键名
  LOCAL_STORAGE_KEYS: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_INFO: 'user_info',
    USER_PREFERENCES: 'user_preferences',
    THEME: 'theme',
    LANGUAGE: 'language',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    LAST_VISITED_PAGE: 'last_visited_page',
  },
  
  // sessionStorage 键名
  SESSION_STORAGE_KEYS: {
    TEMPORARY_DATA: 'temporary_data',
    FORM_DRAFT: 'form_draft',
    SEARCH_FILTERS: 'search_filters',
  },
  
  // 缓存设置
  CACHE: {
    TTL: {
      SHORT: 5 * 60 * 1000, // 5分钟
      MEDIUM: 30 * 60 * 1000, // 30分钟
      LONG: 24 * 60 * 60 * 1000, // 24小时
    },
    MAX_SIZE: 1000, // 最大缓存条目数
  },
} as const;

// 验证常量
export const VALIDATION_CONSTANTS = {
  // 文件上传
  FILE_UPLOAD: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'],
  },
  
  // 字符串长度
  STRING_LIMITS: {
    USERNAME: { MIN: 3, MAX: 50 },
    PASSWORD: { MIN: 8, MAX: 128 },
    EMAIL: { MAX: 255 },
    PHONE: { MAX: 20 },
    NAME: { MAX: 100 },
    DESCRIPTION: { MAX: 1000 },
    COMMENT: { MAX: 500 },
  },
  
  // 数值范围
  NUMBER_RANGES: {
    PORT: { MIN: 1, MAX: 65535 },
    PERCENTAGE: { MIN: 0, MAX: 100 },
    TIMEOUT: { MIN: 1000, MAX: 300000 },
  },
} as const;

// 错误代码常量
export const ERROR_CONSTANTS = {
  // 通用错误
  COMMON: {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    CONFLICT: 'CONFLICT',
  },
  
  // 认证错误
  AUTH: {
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  },
  
  // 设备错误
  EQUIPMENT: {
    EQUIPMENT_OFFLINE: 'EQUIPMENT_OFFLINE',
    EQUIPMENT_FAULT: 'EQUIPMENT_FAULT',
    COMMUNICATION_LOST: 'COMMUNICATION_LOST',
    SENSOR_FAILURE: 'SENSOR_FAILURE',
    CALIBRATION_REQUIRED: 'CALIBRATION_REQUIRED',
  },
  
  // 业务逻辑错误
  BUSINESS: {
    MAINTENANCE_SCHEDULED: 'MAINTENANCE_SCHEDULED',
    EQUIPMENT_IN_USE: 'EQUIPMENT_IN_USE',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    SCHEDULING_CONFLICT: 'SCHEDULING_CONFLICT',
    INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  },
} as const;

// 事件常量
export const EVENT_CONSTANTS = {
  // 系统事件
  SYSTEM: {
    APP_STARTED: 'app_started',
    APP_CLOSED: 'app_closed',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    SESSION_EXPIRED: 'session_expired',
    THEME_CHANGED: 'theme_changed',
    LANGUAGE_CHANGED: 'language_changed',
  },
  
  // 设备事件
  EQUIPMENT: {
    STATUS_CHANGED: 'equipment_status_changed',
    ALARM_TRIGGERED: 'alarm_triggered',
    ALARM_CLEARED: 'alarm_cleared',
    THRESHOLD_EXCEEDED: 'threshold_exceeded',
    MAINTENANCE_DUE: 'maintenance_due',
  },
  
  // 用户事件
  USER: {
    ACTION_PERFORMED: 'user_action_performed',
    PERMISSION_DENIED: 'permission_denied',
    FORM_SUBMITTED: 'form_submitted',
    REPORT_GENERATED: 'report_generated',
  },
} as const;

// 路由常量
export const ROUTE_CONSTANTS = {
  // 页面路径
  PATHS: {
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    EQUIPMENT: '/equipment',
    MONITORING: '/monitoring',
    ALARMS: '/alarms',
    MAINTENANCE: '/maintenance',
    REPORTS: '/reports',
    SETTINGS: '/settings',
    PROFILE: '/profile',
    USER_MANAGEMENT: '/users',
    SYSTEM_LOGS: '/logs',
  },
  
  // 路由名称
  NAMES: {
    LOGIN: 'login',
    REGISTER: 'register',
    DASHBOARD: 'dashboard',
    EQUIPMENT: 'equipment',
    MONITORING: 'monitoring',
    ALARMS: 'alarms',
    MAINTENANCE: 'maintenance',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    PROFILE: 'profile',
    USER_MANAGEMENT: 'userManagement',
    SYSTEM_LOGS: 'systemLogs',
  },
} as const;

// 正则表达式常量
export const REGEX_CONSTANTS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  URL: /^https?:\/\/[^\s$.?#].[^\s]*$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,50}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  FILE_NAME: /^[^<>:"/\\|?*]+$/,
} as const;

// 导出所有常量
export const CONSTANTS = {
  APP: APP_CONSTANTS,
  DATE: DATE_CONSTANTS,
  AUTH: AUTH_CONSTANTS,
  ROLE: ROLE_CONSTANTS,
  EQUIPMENT: EQUIPMENT_CONSTANTS,
  ALARM: ALARM_CONSTANTS,
  MONITORING: MONITORING_CONSTANTS,
  MAINTENANCE: MAINTENANCE_CONSTANTS,
  REPORT: REPORT_CONSTANTS,
  UI: UI_CONSTANTS,
  API: API_CONSTANTS,
  STORAGE: STORAGE_CONSTANTS,
  VALIDATION: VALIDATION_CONSTANTS,
  ERROR: ERROR_CONSTANTS,
  EVENT: EVENT_CONSTANTS,
  ROUTE: ROUTE_CONSTANTS,
  REGEX: REGEX_CONSTANTS,
} as const;

export default CONSTANTS;