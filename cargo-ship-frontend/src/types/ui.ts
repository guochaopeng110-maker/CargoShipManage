// UI组件相关类型定义
// 基于货船智能机舱管理系统UI架构

// 主题模式
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

// 通知类型
export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  timestamp: number;
  read?: boolean;
}

// 模态状态
export interface ModalState {
  id?: string;
  isOpen: boolean;
  open?: boolean;
  type?: 'modal' | 'drawer' | 'confirm';
  title?: string;
  content?: any;
  config?: any;
}

// 主题配置
export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// 布局配置
export interface LayoutConfig {
  sidebar: {
    width: number;
    collapsedWidth: number;
    position: 'left' | 'right';
    theme: 'light' | 'dark' | 'auto';
  };
  header: {
    height: number;
    fixed: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  content: {
    maxWidth: number;
    padding: string;
  };
  footer: {
    height: number;
    fixed: boolean;
  };
}

// 导航菜单项
export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  children?: NavItem[];
  permissions?: string[];
  badge?: {
    content: string;
    variant: 'default' | 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  };
  disabled?: boolean;
  hidden?: boolean;
}

// 表格列配置
export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  render?: (value: any, row: any) => any;
  formatter?: (value: any) => string;
}

// 表格配置
export interface TableConfig<T = any> {
  columns: TableColumn[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  rowSelection?: {
    enabled: boolean;
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange?: (page: number, pageSize: number) => void;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
    showTotal?: (total: number, range: [number, number]) => string;
  };
  sorting?: {
    column?: string;
    direction?: 'asc' | 'desc';
    onChange?: (column: string, direction: 'asc' | 'desc') => void;
  };
  filtering?: {
    [key: string]: any;
    onChange?: (filters: Record<string, any>) => void;
  };
}

// 表单字段配置
export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'multiselect' | 'date' | 'datetime' | 'time' | 'checkbox' | 'radio' | 'switch' | 'file' | 'editor';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
  };
  options?: Array<{
    label: string;
    value: any;
    disabled?: boolean;
  }>;
  dependOn?: string;
  dependencies?: Record<string, any>;
  helpText?: string;
  tooltip?: string;
}

// 表单配置
export interface FormConfig {
  title?: string;
  fields: FormField[];
  layout?: 'vertical' | 'horizontal' | 'inline';
  submitText?: string;
  cancelText?: string;
  resetText?: string;
  showReset?: boolean;
  showCancel?: boolean;
  onSubmit?: (values: Record<string, any>) => Promise<void> | void;
  onCancel?: () => void;
  onReset?: () => void;
}

// 模态框配置
export interface ModalConfig {
  title?: string;
  content?: any | string;
  footer?: any | Array<{
    text: string;
    type: 'primary' | 'default' | 'danger';
    onClick?: () => void;
  }>;
  width?: string | number;
  height?: string | number;
  centered?: boolean;
  closable?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  destroyOnClose?: boolean;
  onClose?: () => void;
  onOk?: () => void;
  onCancel?: () => void;
}

// 通知配置
export interface NotificationConfig {
  id?: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  showIcon?: boolean;
  placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  onClose?: () => void;
}

// 加载状态
export interface LoadingState {
  loading: boolean;
  message?: string;
  mask?: boolean;
  tip?: string;
}

// 响应式断点
export interface BreakpointConfig {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

// 设备信息
export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: {
    width: number;
    height: number;
  };
  orientation: 'portrait' | 'landscape';
  browser: {
    name: string;
    version: string;
    engine: string;
  };
  os: {
    name: string;
    version: string;
  };
}

// 国际化配置
export interface I18nConfig {
  locale: string;
  fallbackLocale: string;
  messages: Record<string, Record<string, string>>;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currencyFormat: string;
}

// 快捷键配置
export interface ShortcutConfig {
  key: string;
  description: string;
  action: () => void;
  when?: () => boolean;
}

// 工具栏配置
export interface ToolbarConfig {
  items: Array<{
    key: string;
    label: string;
    icon?: string;
    type?: 'button' | 'menu' | 'separator';
    action?: () => void;
    menu?: Array<{
      key: string;
      label: string;
      icon?: string;
      action?: () => void;
      disabled?: boolean;
      divider?: boolean;
    }>;
    disabled?: boolean;
    hidden?: boolean;
  }>;
}

// 面包屑导航配置
export interface BreadcrumbConfig {
  items: Array<{
    key: string;
    label: string;
    path?: string;
    icon?: string;
    disabled?: boolean;
  }>;
  separator?: string;
  showHome?: boolean;
  homeLabel?: string;
  homePath?: string;
}

// 标签页配置
export interface TabConfig {
  key: string;
  label: string;
  icon?: string;
  content: any;
  closable?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  badge?: string | number;
}

// 状态栏配置
export interface StatusBarConfig {
  items: Array<{
    key: string;
    label: string;
    value: string | number;
    type?: 'text' | 'number' | 'boolean';
    color?: 'default' | 'success' | 'warning' | 'error' | 'info';
    icon?: string;
    tooltip?: string;
    onClick?: () => void;
  }>;
}

// UI组件属性基类
export interface BaseComponentProps {
  className?: string;
  style?: any;
  children?: any;
  'data-testid'?: string;
}

// 可访问性属性
export interface AccessibilityProps {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  role?: string;
  tabIndex?: number;
}