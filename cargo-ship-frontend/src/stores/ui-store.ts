// UI状态管理（主题、语言、布局等）
// 基于货船智能机舱管理系统UI架构

import { ThemeMode, BreakpointConfig, DeviceInfo } from '../types/ui';

// UI状态接口
export interface UIState {
  // 主题和外观
  theme: ThemeMode;
  isDarkMode: boolean;
  colorScheme: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  
  // 语言和本地化
  language: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  
  // 布局状态
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  topBarHeight: number;
  footerHeight: number;
  contentPadding: number;
  
  // 响应式布局
  currentBreakpoint: keyof BreakpointConfig;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // 视图设置
  layout: 'grid' | 'list' | 'cards';
  density: 'comfortable' | 'compact' | 'spacious';
  showAdvancedControls: boolean;
  showTooltips: boolean;
  showBreadcrumbs: boolean;
  
  // 通知和提示
  notifications: NotificationItem[];
  toasts: ToastItem[];
  loadingStates: LoadingState[];
  modalOpen: boolean;
  modalContent: ModalContent | null;
  
  // 数据可视化
  chartTheme: ChartTheme;
  chartAnimations: boolean;
  chartColors: ChartColorScheme[];
  defaultChartType: string;
  
  // 性能和优化
  enableAnimations: boolean;
  enableVirtualScrolling: boolean;
  enableLazyLoading: boolean;
  cacheTimeout: number;
  
  // 状态管理
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastUpdate: number;
}

// UI操作接口
export interface UIActions {
  // 主题操作
  setTheme: (theme: ThemeMode) => void;
  toggleDarkMode: () => void;
  setColorScheme: (scheme: 'light' | 'dark' | 'system') => void;
  setPrimaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  
  // 语言操作
  setLanguage: (language: string) => void;
  setLocale: (locale: string) => void;
  setDateFormat: (format: string) => void;
  setTimeFormat: (format: string) => void;
  setNumberFormat: (format: string) => void;
  
  // 布局操作
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setLayout: (layout: 'grid' | 'list' | 'cards') => void;
  setDensity: (density: 'comfortable' | 'compact' | 'spacious') => void;
  
  // 响应式操作
  setCurrentBreakpoint: (breakpoint: keyof BreakpointConfig) => void;
  updateResponsiveState: () => void;
  
  // 视图操作
  setShowAdvancedControls: (show: boolean) => void;
  setShowTooltips: (show: boolean) => void;
  setShowBreadcrumbs: (show: boolean) => void;
  
  // 通知操作
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 提示操作
  showToast: (toast: Omit<ToastItem, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // 模态框操作
  openModal: (content: ModalContent) => void;
  closeModal: () => void;
  
  // 加载状态操作
  setLoading: (key: string, loading: boolean) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  
  // 数据可视化操作
  setChartTheme: (theme: ChartTheme) => void;
  setChartAnimations: (enabled: boolean) => void;
  addChartColor: (color: ChartColorScheme) => void;
  setDefaultChartType: (type: string) => void;
  
  // 性能优化操作
  setEnableAnimations: (enabled: boolean) => void;
  setEnableVirtualScrolling: (enabled: boolean) => void;
  setEnableLazyLoading: (enabled: boolean) => void;
  setCacheTimeout: (timeout: number) => void;
  
  // 状态管理
  initialize: () => Promise<void>;
  reset: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

// 通知项目
export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  timestamp: number;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  data?: any;
}

// 通知动作
export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

// 提示项目
export interface ToastItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  timestamp: number;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

// 加载状态
export interface LoadingState {
  key: string;
  label?: string;
  progress?: number;
  indeterminate?: boolean;
}

// 模态内容
export interface ModalContent {
  title: string;
  component: string;
  props?: Record<string, any>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  backdrop?: boolean;
}

// 图表主题
export interface ChartTheme {
  name: string;
  colors: string[];
  background: string;
  text: string;
  axis: {
    color: string;
    gridColor: string;
  };
  tooltip: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
}

// 图表颜色方案
export interface ChartColorScheme {
  name: string;
  colors: string[];
  type: 'categorical' | 'sequential' | 'diverging';
}

// 简化的UI Store实现
class UIStore implements UIState, UIActions {
  // 主题和外观
  theme: ThemeMode = ThemeMode.LIGHT;
  isDarkMode = false;
  colorScheme: 'light' | 'dark' | 'system' = 'system';
  primaryColor = '#007bff';
  accentColor = '#6c757d';
  
  // 语言和本地化
  language = 'zh-CN';
  locale = 'zh-CN';
  dateFormat = 'YYYY-MM-DD';
  timeFormat = 'HH:mm:ss';
  numberFormat = '#,###.##';
  
  // 布局状态
  sidebarCollapsed = false;
  sidebarWidth = 240;
  topBarHeight = 60;
  footerHeight = 40;
  contentPadding = 16;
  
  // 响应式布局
  currentBreakpoint: keyof BreakpointConfig = 'lg';
  isMobile = false;
  isTablet = false;
  isDesktop = true;
  
  // 视图设置
  layout: 'grid' | 'list' | 'cards' = 'grid';
  density: 'comfortable' | 'compact' | 'spacious' = 'comfortable';
  showAdvancedControls = false;
  showTooltips = true;
  showBreadcrumbs = true;
  
  // 通知和提示
  notifications: NotificationItem[] = [];
  toasts: ToastItem[] = [];
  loadingStates: LoadingState[] = [];
  modalOpen = false;
  modalContent: ModalContent | null = null;
  
  // 数据可视化
  chartTheme: ChartTheme = {
    name: 'default',
    colors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'],
    background: '#ffffff',
    text: '#333333',
    axis: {
      color: '#666666',
      gridColor: '#e9ecef'
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#333333',
      textColor: '#ffffff'
    }
  };
  chartAnimations = true;
  chartColors: ChartColorScheme[] = [
    { name: 'default', colors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'], type: 'categorical' }
  ];
  defaultChartType = 'line';
  
  // 性能和优化
  enableAnimations = true;
  enableVirtualScrolling = true;
  enableLazyLoading = true;
  cacheTimeout = 300000; // 5分钟
  
  // 状态管理
  isLoading = false;
  isInitialized = false;
  error: string | null = null;
  lastUpdate = 0;

  // 主题操作
  setTheme(theme: ThemeMode): void {
    this.theme = theme;
    this.isDarkMode = theme === ThemeMode.DARK;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    this.theme = this.isDarkMode ? ThemeMode.DARK : ThemeMode.LIGHT;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setColorScheme(scheme: 'light' | 'dark' | 'system'): void {
    this.colorScheme = scheme;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setPrimaryColor(color: string): void {
    this.primaryColor = color;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setAccentColor(color: string): void {
    this.accentColor = color;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  // 语言操作
  setLanguage(language: string): void {
    this.language = language;
    this.locale = language;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setLocale(locale: string): void {
    this.locale = locale;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setDateFormat(format: string): void {
    this.dateFormat = format;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setTimeFormat(format: string): void {
    this.timeFormat = format;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setNumberFormat(format: string): void {
    this.numberFormat = format;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  // 布局操作
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setSidebarWidth(width: number): void {
    this.sidebarWidth = Math.max(200, Math.min(400, width));
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setLayout(layout: 'grid' | 'list' | 'cards'): void {
    this.layout = layout;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setDensity(density: 'comfortable' | 'compact' | 'spacious'): void {
    this.density = density;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  // 响应式操作
  setCurrentBreakpoint(breakpoint: keyof BreakpointConfig): void {
    this.currentBreakpoint = breakpoint;
    this.updateResponsiveState();
    this.lastUpdate = Date.now();
  }

  updateResponsiveState(): void {
    const width = window.innerWidth;
    
    this.isMobile = width < 768;
    this.isTablet = width >= 768 && width < 1024;
    this.isDesktop = width >= 1024;
    
    if (width < 576) {
      this.currentBreakpoint = 'xs';
    } else if (width < 768) {
      this.currentBreakpoint = 'sm';
    } else if (width < 1024) {
      this.currentBreakpoint = 'md';
    } else if (width < 1200) {
      this.currentBreakpoint = 'lg';
    } else {
      this.currentBreakpoint = 'xl';
    }
  }

  // 视图操作
  setShowAdvancedControls(show: boolean): void {
    this.showAdvancedControls = show;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setShowTooltips(show: boolean): void {
    this.showTooltips = show;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setShowBreadcrumbs(show: boolean): void {
    this.showBreadcrumbs = show;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  // 通知操作
  addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp'>): void {
    const newNotification: NotificationItem = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    this.notifications = [newNotification, ...this.notifications];
    this.lastUpdate = Date.now();
    
    // 自动移除非持久通知
    if (!notification.persistent) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, duration);
    }
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.lastUpdate = Date.now();
  }

  clearNotifications(): void {
    this.notifications = [];
    this.lastUpdate = Date.now();
  }

  // 提示操作
  showToast(toast: Omit<ToastItem, 'id' | 'timestamp'>): void {
    const newToast: ToastItem = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    this.toasts = [newToast, ...this.toasts];
    this.lastUpdate = Date.now();
    
    // 自动移除提示
    const duration = toast.duration || 3000;
    setTimeout(() => {
      this.removeToast(newToast.id);
    }, duration);
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.lastUpdate = Date.now();
  }

  clearToasts(): void {
    this.toasts = [];
    this.lastUpdate = Date.now();
  }

  // 模态框操作
  openModal(content: ModalContent): void {
    this.modalContent = content;
    this.modalOpen = true;
    this.lastUpdate = Date.now();
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalContent = null;
    this.lastUpdate = Date.now();
  }

  // 加载状态操作
  setLoading(key: string, loading: boolean, label?: string, progress?: number): void {
    if (loading) {
      const existingIndex = this.loadingStates.findIndex(ls => ls.key === key);
      const newLoadingState: LoadingState = {
        key,
        label,
        progress,
        indeterminate: progress === undefined,
      };
      
      if (existingIndex >= 0) {
        this.loadingStates[existingIndex] = newLoadingState;
      } else {
        this.loadingStates.push(newLoadingState);
      }
    } else {
      this.loadingStates = this.loadingStates.filter(ls => ls.key !== key);
    }
    
    this.isLoading = this.loadingStates.length > 0;
    this.lastUpdate = Date.now();
  }

  clearLoading(key: string): void {
    this.loadingStates = this.loadingStates.filter(ls => ls.key !== key);
    this.isLoading = this.loadingStates.length > 0;
    this.lastUpdate = Date.now();
  }

  clearAllLoading(): void {
    this.loadingStates = [];
    this.isLoading = false;
    this.lastUpdate = Date.now();
  }

  // 数据可视化操作
  setChartTheme(theme: ChartTheme): void {
    this.chartTheme = theme;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setChartAnimations(enabled: boolean): void {
    this.chartAnimations = enabled;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  addChartColor(color: ChartColorScheme): void {
    this.chartColors.push(color);
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setDefaultChartType(type: string): void {
    this.defaultChartType = type;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  // 性能优化操作
  setEnableAnimations(enabled: boolean): void {
    this.enableAnimations = enabled;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setEnableVirtualScrolling(enabled: boolean): void {
    this.enableVirtualScrolling = enabled;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setEnableLazyLoading(enabled: boolean): void {
    this.enableLazyLoading = enabled;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
    this.lastUpdate = Date.now();
    this.saveToStorage();
  }

  // 状态管理
  async initialize(): Promise<void> {
    try {
      this.loadFromStorage();
      this.updateResponsiveState();
      
      // 监听窗口大小变化
      window.addEventListener('resize', this.updateResponsiveState.bind(this));
      
      this.isInitialized = true;
      this.lastUpdate = Date.now();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to initialize UI store';
      throw error;
    }
  }

  reset(): void {
    this.theme = ThemeMode.LIGHT;
    this.isDarkMode = false;
    this.colorScheme = 'system';
    this.primaryColor = '#007bff';
    this.accentColor = '#6c757d';
    
    this.language = 'zh-CN';
    this.locale = 'zh-CN';
    this.dateFormat = 'YYYY-MM-DD';
    this.timeFormat = 'HH:mm:ss';
    this.numberFormat = '#,###.##';
    
    this.sidebarCollapsed = false;
    this.sidebarWidth = 240;
    this.topBarHeight = 60;
    this.footerHeight = 40;
    this.contentPadding = 16;
    
    this.currentBreakpoint = 'lg';
    this.isMobile = false;
    this.isTablet = false;
    this.isDesktop = true;
    
    this.layout = 'grid';
    this.density = 'comfortable';
    this.showAdvancedControls = false;
    this.showTooltips = true;
    this.showBreadcrumbs = true;
    
    this.notifications = [];
    this.toasts = [];
    this.loadingStates = [];
    this.modalOpen = false;
    this.modalContent = null;
    
    this.chartTheme = {
      name: 'default',
      colors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'],
      background: '#ffffff',
      text: '#333333',
      axis: {
        color: '#666666',
        gridColor: '#e9ecef'
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333333',
        textColor: '#ffffff'
      }
    };
    this.chartAnimations = true;
    this.chartColors = [
      { name: 'default', colors: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14'], type: 'categorical' }
    ];
    this.defaultChartType = 'line';
    
    this.enableAnimations = true;
    this.enableVirtualScrolling = true;
    this.enableLazyLoading = true;
    this.cacheTimeout = 300000;
    
    this.isLoading = false;
    this.isInitialized = false;
    this.error = null;
    this.lastUpdate = 0;
    
    this.updateResponsiveState();
    this.saveToStorage();
  }

  saveToStorage(): void {
    try {
      const data = {
        theme: this.theme,
        isDarkMode: this.isDarkMode,
        colorScheme: this.colorScheme,
        primaryColor: this.primaryColor,
        accentColor: this.accentColor,
        language: this.language,
        locale: this.locale,
        dateFormat: this.dateFormat,
        timeFormat: this.timeFormat,
        numberFormat: this.numberFormat,
        sidebarCollapsed: this.sidebarCollapsed,
        sidebarWidth: this.sidebarWidth,
        topBarHeight: this.topBarHeight,
        footerHeight: this.footerHeight,
        contentPadding: this.contentPadding,
        layout: this.layout,
        density: this.density,
        showAdvancedControls: this.showAdvancedControls,
        showTooltips: this.showTooltips,
        showBreadcrumbs: this.showBreadcrumbs,
        chartTheme: this.chartTheme,
        chartAnimations: this.chartAnimations,
        chartColors: this.chartColors,
        defaultChartType: this.defaultChartType,
        enableAnimations: this.enableAnimations,
        enableVirtualScrolling: this.enableVirtualScrolling,
        enableLazyLoading: this.enableLazyLoading,
        cacheTimeout: this.cacheTimeout,
      };
      
      localStorage.setItem('ui-store', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save UI state to storage:', error);
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('ui-store');
      if (stored) {
        const data = JSON.parse(stored);
        
        Object.assign(this, data);
      }
    } catch (error) {
      console.warn('Failed to load UI state from storage:', error);
    }
  }
}

// 创建单例实例
const uiStore = new UIStore();

// 导出Hook样式接口
export const useUIStore = () => uiStore;

// 导出便捷Hook
export const useUI = () => {
  const store = useUIStore();
  return {
    // 状态
    ...store,
    // 计算属性
    totalNotifications: store.notifications.length,
    unreadNotifications: store.notifications.filter(n => !n.persistent).length,
    activeToasts: store.toasts.length,
    loadingStatesMap: store.loadingStates.reduce((acc, state) => {
      acc[state.key] = state;
      return acc;
    }, {} as Record<string, LoadingState>),
    isLoadingAny: store.isLoading,
    breakpoints: {
      isXS: store.currentBreakpoint === 'xs',
      isSM: store.currentBreakpoint === 'sm',
      isMD: store.currentBreakpoint === 'md',
      isLG: store.currentBreakpoint === 'lg',
      isXL: store.currentBreakpoint === 'xl',
    },
    // 便捷方法
    showInfo: (title: string, message?: string) => {
      store.showToast({ type: 'info', title, message });
    },
    showSuccess: (title: string, message?: string) => {
      store.showToast({ type: 'success', title, message });
    },
    showWarning: (title: string, message?: string) => {
      store.showToast({ type: 'warning', title, message });
    },
    showError: (title: string, message?: string) => {
      store.showToast({ type: 'error', title, message });
    },
    showNotification: (type: 'info' | 'warning' | 'error' | 'success', title: string, message?: string) => {
      store.addNotification({ type, title, message: message || '' });
    },
  };
};

export default useUIStore;