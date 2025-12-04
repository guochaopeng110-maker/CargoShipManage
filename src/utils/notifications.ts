// 通知系统工具（统一通知管理和显示）
// 基于货船智能机舱管理系统通知架构

import {
  Notification as AppNotification,
  NotificationType,
  NotificationAction,
  UISettings
} from '../types/global';
import { handleApiError } from './error-handler';
import { generateId } from './helpers';

/**
 * 通知配置接口
 */
export interface NotificationConfig {
  // 显示配置
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxVisible?: number;
  spacing?: number;
  autoHide?: boolean;
  defaultDuration?: number;
  
  // 样式配置
  theme?: 'light' | 'dark' | 'auto';
  animation?: boolean;
  soundEnabled?: boolean;
  
  // 权限配置
  requirePermission?: boolean;
  permissionFallback?: 'alert' | 'banner' | 'toast';
  
  // 事件配置
  onNotificationClick?: (notification: AppNotification) => void;
  onNotificationHide?: (notification: AppNotification) => void;
  onPermissionDenied?: () => void;
}

/**
 * 通知队列项接口
 */
export interface QueuedNotification extends Omit<AppNotification, 'id'> {
  id: string;
  queueTime: number;
  displayDelay?: number;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * 通知统计信息
 */
export interface NotificationStatistics {
  totalShown: number;
  totalHidden: number;
  totalClicked: number;
  byType: Record<NotificationType, number>;
  averageDisplayTime: number;
  activeNotifications: number;
  queuedNotifications: number;
}

/**
 * 浏览器通知权限状态
 */
export enum NotificationPermissionStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  DEFAULT = 'default'
}

/**
 * 声音提示配置
 */
export interface SoundConfig {
  volume?: number;
  pitch?: number;
  duration?: number;
  sounds?: {
    info?: string;
    success?: string;
    warning?: string;
    error?: string;
  };
}

/**
 * 默认通知配置
 */
const DEFAULT_CONFIG: Required<NotificationConfig> = {
  position: 'top-right',
  maxVisible: 5,
  spacing: 10,
  autoHide: true,
  defaultDuration: 5000,
  theme: 'auto',
  animation: true,
  soundEnabled: true,
  requirePermission: false,
  permissionFallback: 'toast',
  onNotificationClick: () => {},
  onNotificationHide: () => {},
  onPermissionDenied: () => {}
};

/**
 * 通知管理器核心类
 */
export class NotificationManager {
  private config: Required<NotificationConfig>;
  private notifications: Map<string, AppNotification> = new Map();
  private queue: QueuedNotification[] = [];
  private statistics: NotificationStatistics;
  private subscribers: Set<NotificationSubscriber> = new Set();
  private eventListeners: Map<string, Set<(notification: AppNotification) => void>> = new Map();
  private audioContext?: AudioContext;

  constructor(config?: Partial<NotificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.statistics = this.initializeStatistics();
    this.setupEventListeners();
  }

  /**
   * 初始化统计信息
   */
  private initializeStatistics(): NotificationStatistics {
    return {
      totalShown: 0,
      totalHidden: 0,
      totalClicked: 0,
      byType: {
        [NotificationType.INFO]: 0,
        [NotificationType.SUCCESS]: 0,
        [NotificationType.WARNING]: 0,
        [NotificationType.ERROR]: 0
      },
      averageDisplayTime: 0,
      activeNotifications: 0,
      queuedNotifications: 0
    };
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if ('Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === NotificationPermissionStatus.DENIED && this.config.requirePermission) {
          this.config.onPermissionDenied();
        }
      });
    }

    // 设置键盘事件监听
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideAll();
      }
    });

    // 设置页面可见性变化监听
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.processQueue();
      }
    });

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * 创建通知
   */
  create(options: {
    type: NotificationType;
    title: string;
    message: string;
    duration?: number;
    persistent?: boolean;
    autoHide?: boolean;
    action?: NotificationAction;
    metadata?: Record<string, any>;
  }): AppNotification {
    const notification: AppNotification = {
      id: generateId(),
      type: options.type,
      title: options.title,
      message: options.message,
      timestamp: Date.now(),
      read: false,
      persistent: options.persistent ?? false,
      autoHide: options.autoHide ?? this.config.autoHide,
      duration: options.duration ?? this.config.defaultDuration,
      action: options.action,
      metadata: options.metadata
    };

    this.addToQueue(notification);
    return notification;
  }

  /**
   * 添加通知到队列
   */
  private addToQueue(notification: AppNotification): void {
    // 检查是否超过最大可见数量
    if (this.notifications.size >= this.config.maxVisible) {
      const oldestId = this.notifications.keys().next().value;
      if (oldestId) {
        this.hide(oldestId);
      }
    }

    // 添加到活动通知
    this.notifications.set(notification.id, notification);
    this.updateStatistics('show', notification);

    // 触发通知创建事件
    this.emitEvent('show', notification);

    // 设置自动隐藏
    if (notification.autoHide && notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.hide(notification.id);
      }, notification.duration);
    }

    // 播放声音
    if (this.config.soundEnabled) {
      this.playSound(notification.type);
    }

    // 发送浏览器通知
    if ('Notification' in window && Notification.permission === NotificationPermissionStatus.GRANTED) {
      this.sendBrowserNotification(notification);
    }

    // 触发订阅者
    this.subscribers.forEach(subscriber => {
      subscriber.onNotificationShow?.(notification);
    });

    // 处理动作
    if (notification.action && notification.action.onClick) {
      notification.action.onClick();
    }

    // 触发点击事件
    notification.action?.onClick?.();
  }

  /**
   * 发送浏览器通知
   */
  private sendBrowserNotification(notification: AppNotification): void {
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: this.getIconForType(notification.type),
        tag: notification.id,
        requireInteraction: notification.persistent,
        silent: !this.config.soundEnabled
      });

      browserNotification.onclick = () => {
        this.handleNotificationClick(notification);
        browserNotification.close();
      };

      // 如果不是持久通知，自动关闭
      if (!notification.persistent) {
        setTimeout(() => {
          browserNotification.close();
        }, notification.duration || 5000);
      }
    } catch (error) {
      handleApiError(error, '发送浏览器通知', {
        showToast: false,
        logToConsole: true
      });
    }
  }

  /**
   * 获取通知类型对应的图标
   */
  private getIconForType(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.INFO]: '/icons/info.png',
      [NotificationType.SUCCESS]: '/icons/success.png',
      [NotificationType.WARNING]: '/icons/warning.png',
      [NotificationType.ERROR]: '/icons/error.png'
    };
    return iconMap[type] || '/icons/info.png';
  }

  /**
   * 播放声音提示
   */
  private playSound(type: NotificationType): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // 创建音频上下文
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // 根据通知类型设置不同声音
      const frequencyMap: Record<NotificationType, number> = {
        [NotificationType.INFO]: 800,
        [NotificationType.SUCCESS]: 1000,
        [NotificationType.WARNING]: 600,
        [NotificationType.ERROR]: 400
      };

      oscillator.frequency.setValueAtTime(frequencyMap[type] || 800, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      // 静默处理音频播放错误
      console.warn('音频播放失败:', error);
    }
  }

  /**
   * 处理通知点击
   */
  private handleNotificationClick(notification: AppNotification): void {
    this.updateStatistics('click', notification);
    this.config.onNotificationClick(notification);

    // 触发点击事件
    this.emitEvent('click', notification);

    // 触发订阅者
    this.subscribers.forEach(subscriber => {
      subscriber.onNotificationClick?.(notification);
    });

    // 移除持久性标记
    notification.persistent = false;
    notification.read = true;
  }

  /**
   * 隐藏通知
   */
  hide(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    this.notifications.delete(id);
    this.updateStatistics('hide', notification);
    
    // 触发隐藏事件
    this.emitEvent('hide', notification);

    // 触发订阅者
    this.subscribers.forEach(subscriber => {
      subscriber.onNotificationHide?.(notification);
    });

    this.config.onNotificationHide(notification);
    return true;
  }

  /**
   * 隐藏所有通知
   */
  hideAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.hide(id));
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.notifications.size < this.config.maxVisible) {
      const queuedNotification = this.queue.shift();
      if (queuedNotification) {
        this.addToQueue(queuedNotification);
      }
    }
    this.updateStatistics('processQueue');
  }

  /**
   * 更新统计信息
   */
  private updateStatistics(action: 'show' | 'hide' | 'click' | 'processQueue', notification?: AppNotification): void {
    if (action === 'show') {
      this.statistics.totalShown++;
      if (notification) {
        this.statistics.byType[notification.type]++;
      }
      this.statistics.activeNotifications = this.notifications.size;
    } else if (action === 'hide') {
      this.statistics.totalHidden++;
      this.statistics.activeNotifications = this.notifications.size;
    } else if (action === 'click') {
      this.statistics.totalClicked++;
    } else if (action === 'processQueue') {
      this.statistics.queuedNotifications = this.queue.length;
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: string, notification: AppNotification): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(notification));
    }
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: (notification: AppNotification) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.add(callback);

    // 返回取消监听的函数
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * 订阅通知管理器
   */
  subscribe(subscriber: NotificationSubscriber): () => void {
    this.subscribers.add(subscriber);
    
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * 获取所有通知
   */
  getAll(): AppNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * 获取未读通知数量
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  /**
   * 标记所有通知为已读
   */
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
  }

  /**
   * 获取统计信息
   */
  getStatistics(): NotificationStatistics {
    return { ...this.statistics };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.hideAll();
    this.queue = [];
    this.subscribers.clear();
    this.eventListeners.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = undefined;
    }
  }

  /**
   * 获取浏览器通知权限状态
   */
  getPermissionStatus(): NotificationPermissionStatus {
    if (!('Notification' in window)) {
      return NotificationPermissionStatus.DENIED;
    }
    
    return Notification.permission as NotificationPermissionStatus;
  }

  /**
   * 请求通知权限
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!('Notification' in window)) {
      return NotificationPermissionStatus.DENIED;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === NotificationPermissionStatus.DENIED && this.config.requirePermission) {
        this.config.onPermissionDenied();
      }
      return permission as NotificationPermissionStatus;
    } catch (error) {
      handleApiError(error, '请求通知权限', {
        showToast: false,
        logToConsole: true
      });
      return NotificationPermissionStatus.DENIED;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<NotificationConfig> {
    return { ...this.config };
  }
}

/**
 * 通知订阅者接口
 */
export interface NotificationSubscriber {
  onNotificationShow?: (notification: AppNotification) => void;
  onNotificationHide?: (notification: AppNotification) => void;
  onNotificationClick?: (notification: AppNotification) => void;
}

/**
 * 全局通知管理器实例
 */
let globalNotificationManager: NotificationManager | null = null;

/**
 * 获取全局通知管理器
 */
export function getNotificationManager(config?: Partial<NotificationConfig>): NotificationManager {
  if (!globalNotificationManager) {
    globalNotificationManager = new NotificationManager(config);
  }
  return globalNotificationManager;
}

/**
 * 便捷方法：创建信息通知
 */
export function createInfo(title: string, message: string, options?: Partial<NotificationConfig>): AppNotification {
  return getNotificationManager(options).create({
    type: NotificationType.INFO,
    title,
    message
  });
}

/**
 * 便捷方法：创建成功通知
 */
export function createSuccess(title: string, message: string, options?: Partial<NotificationConfig>): AppNotification {
  return getNotificationManager(options).create({
    type: NotificationType.SUCCESS,
    title,
    message
  });
}

/**
 * 便捷方法：创建警告通知
 */
export function createWarning(title: string, message: string, options?: Partial<NotificationConfig>): AppNotification {
  return getNotificationManager(options).create({
    type: NotificationType.WARNING,
    title,
    message
  });
}

/**
 * 便捷方法：创建错误通知
 */
export function createError(title: string, message: string, options?: Partial<NotificationConfig>): AppNotification {
  return getNotificationManager(options).create({
    type: NotificationType.ERROR,
    title,
    message
  });
}

/**
 * 便捷方法：隐藏所有通知
 */
export function hideAllNotifications(): void {
  getNotificationManager().hideAll();
}

/**
 * 便捷方法：获取通知统计信息
 */
export function getNotificationStatistics(): NotificationStatistics {
  return getNotificationManager().getStatistics();
}

/**
 * 默认配置导出
 */
export { DEFAULT_CONFIG };