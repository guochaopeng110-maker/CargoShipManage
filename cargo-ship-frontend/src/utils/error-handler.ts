/**
 * 货船智能机舱管理系统 - 统一错误处理工具
 * 
 * 功能说明：
 * 1. 提供统一的API错误处理机制
 * 2. 支持不同类型的错误分类和处理
 * 3. 提供用户友好的错误提示
 * 4. 支持错误日志记录和上报
 * 5. 提供错误重试机制
 * 
 * @version 1.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-01
 */

import { toast } from 'sonner';

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

// 错误严重程度枚举
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// 错误信息接口
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: any;
  timestamp: number;
  context?: string;
  userId?: string;
  sessionId?: string;
}

// 错误处理选项接口
export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  reportToServer?: boolean;
  retry?: boolean;
  retryCount?: number;
  retryDelay?: number;
  customMessage?: string;
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 100;

  /**
   * 处理API错误
   * @param error 错误对象
   * @param context 错误上下文
   * @param options 处理选项
   */
  handleApiError(
    error: any, 
    context: string, 
    options: ErrorHandlerOptions = {}
  ): void {
    const {
      showToast = true,
      logToConsole = true,
      reportToServer = false,
      retry = false,
      retryCount = 3,
      retryDelay = 1000,
      customMessage,
    } = options;

    // 解析错误信息
    const errorInfo = this.parseError(error, context);
    
    // 记录错误历史
    this.recordError(errorInfo);
    
    // 控制台日志
    if (logToConsole) {
      this.logError(errorInfo);
    }
    
    // 显示用户提示
    if (showToast) {
      this.showErrorToast(errorInfo, customMessage);
    }
    
    // 上报错误到服务器
    if (reportToServer) {
      this.reportError(errorInfo);
    }
    
    // 重试机制
    if (retry && this.shouldRetry(errorInfo)) {
      this.scheduleRetry(errorInfo, retryCount, retryDelay);
    }
  }

  /**
   * 解析错误信息
   * @param error 错误对象
   * @param context 错误上下文
   * @returns 解析后的错误信息
   */
  private parseError(error: any, context: string): ErrorInfo {
    let type = ErrorType.UNKNOWN;
    let severity = ErrorSeverity.MEDIUM;
    let message = '未知错误';
    let details = null;

    // 网络错误
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
      type = ErrorType.NETWORK;
      severity = ErrorSeverity.HIGH;
      message = '网络连接失败，请检查网络设置';
    }
    // 认证错误
    else if (error?.status === 401 || error?.response?.status === 401) {
      type = ErrorType.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
      message = '身份验证失败，请重新登录';
    }
    // 授权错误
    else if (error?.status === 403 || error?.response?.status === 403) {
      type = ErrorType.AUTHORIZATION;
      severity = ErrorSeverity.MEDIUM;
      message = '权限不足，无法执行此操作';
    }
    // 验证错误
    else if (error?.status === 400 || error?.response?.status === 400) {
      type = ErrorType.VALIDATION;
      severity = ErrorSeverity.LOW;
      message = '请求参数错误，请检查输入内容';
      details = error?.response?.data?.errors || error?.errors;
    }
    // 服务器错误
    else if (error?.status >= 500 || error?.response?.status >= 500) {
      type = ErrorType.SERVER;
      severity = ErrorSeverity.CRITICAL;
      message = '服务器内部错误，请稍后重试';
    }
    // 其他错误
    else if (error?.message) {
      message = error.message;
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      }
    }

    return {
      type,
      severity,
      message,
      details,
      timestamp: Date.now(),
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
    };
  }

  /**
   * 记录错误历史
   * @param errorInfo 错误信息
   */
  private recordError(errorInfo: ErrorInfo): void {
    this.errorHistory.unshift(errorInfo);
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 控制台日志
   * @param errorInfo 错误信息
   */
  private logError(errorInfo: ErrorInfo): void {
    const logMethod = this.getLogMethod(errorInfo.severity);
    logMethod.call(console, `[${errorInfo.type.toUpperCase()}] ${errorInfo.context}:`, errorInfo);
    
    if (errorInfo.details) {
      console.log('错误详情:', errorInfo.details);
    }
  }

  /**
   * 获取日志方法
   * @param severity 错误严重程度
   * @returns 日志方法
   */
  private getLogMethod(severity: ErrorSeverity): Function {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * 显示错误提示
   * @param errorInfo 错误信息
   * @param customMessage 自定义消息
   */
  private showErrorToast(errorInfo: ErrorInfo, customMessage?: string): void {
    const title = customMessage || `${errorInfo.context}失败`;
    const description = errorInfo.message;
    
    toast.error(title, {
      description,
      duration: errorInfo.severity === ErrorSeverity.CRITICAL ? 5000 : 3000,
    });
  }

  /**
   * 上报错误到服务器
   * @param errorInfo 错误信息
   */
  private reportError(errorInfo: ErrorInfo): void {
    try {
      // 这里可以实现错误上报逻辑
      // 例如发送到错误监控服务
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorInfo),
      }).catch(err => {
        console.error('错误上报失败:', err);
      });
    } catch (error) {
      console.error('错误上报异常:', error);
    }
  }

  /**
   * 判断是否应该重试
   * @param errorInfo 错误信息
   * @returns 是否应该重试
   */
  private shouldRetry(errorInfo: ErrorInfo): boolean {
    // 网络错误和服务器错误可以重试
    return errorInfo.type === ErrorType.NETWORK || errorInfo.type === ErrorType.SERVER;
  }

  /**
   * 安排重试
   * @param errorInfo 错误信息
   * @param retryCount 重试次数
   * @param retryDelay 重试延迟
   */
  private scheduleRetry(errorInfo: ErrorInfo, retryCount: number, retryDelay: number): void {
    if (retryCount <= 0) return;
    
    setTimeout(() => {
      console.log(`重试操作 (${retryCount} 次剩余): ${errorInfo.context}`);
      // 这里可以触发重试逻辑
      // 例如重新发起API请求
    }, retryDelay);
  }

  /**
   * 获取当前用户ID
   * @returns 用户ID
   */
  private getCurrentUserId(): string | undefined {
    try {
      // 从localStorage或认证状态获取用户ID
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取当前会话ID
   * @returns 会话ID
   */
  private getCurrentSessionId(): string | undefined {
    try {
      // 从localStorage或会话状态获取会话ID
      return localStorage.getItem('sessionId') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取错误历史
   * @returns 错误历史记录
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * 清空错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 获取错误统计
   * @returns 错误统计信息
   */
  getErrorStats(): Record<string, any> {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byContext: {} as Record<string, number>,
    };

    this.errorHistory.forEach(error => {
      // 按类型统计
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // 按严重程度统计
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // 按上下文统计
      if (error.context) {
        stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
      }
    });

    return stats;
  }
}

// 创建全局错误处理器实例
const globalErrorHandler = new ErrorHandler();

/**
 * 统一错误处理函数
 * @param error 错误对象
 * @param context 错误上下文
 * @param options 处理选项
 */
export const handleApiError = (
  error: any, 
  context: string, 
  options: ErrorHandlerOptions = {}
): void => {
  globalErrorHandler.handleApiError(error, context, options);
};

/**
 * 获取错误历史
 * @returns 错误历史记录
 */
export const getErrorHistory = (): ErrorInfo[] => {
  return globalErrorHandler.getErrorHistory();
};

/**
 * 清空错误历史
 */
export const clearErrorHistory = (): void => {
  globalErrorHandler.clearErrorHistory();
};

/**
 * 获取错误统计
 * @returns 错误统计信息
 */
export const getErrorStats = (): Record<string, any> => {
  return globalErrorHandler.getErrorStats();
};

/**
 * 创建带错误处理的异步函数
 * @param asyncFn 异步函数
 * @param context 错误上下文
 * @param options 处理选项
 * @returns 包装后的异步函数
 */
export const withErrorHandling = <T extends any[], R>(
  asyncFn: (...args: T) => Promise<R>,
  context: string,
  options: ErrorHandlerOptions = {}
) => {
  return async (...args: T): Promise<R | null> => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleApiError(error, context, options);
      return null;
    }
  };
};

export default globalErrorHandler;