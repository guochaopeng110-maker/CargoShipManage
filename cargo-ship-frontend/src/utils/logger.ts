// 简洁实用的调试 Logger
// 基于货船智能机舱管理系统调试需求

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * 简洁的 Logger 类
 */
export class Logger {
  private static componentName: string = 'Application';

  /**
   * 设置组件名称
   */
  static setComponent(componentName: string): void {
    this.componentName = componentName;
  }

  /**
   * 格式化时间戳为 HH:mm:ss.SSS 格式
   */
  private static formatTime(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * 调试日志
   */
  static debug(message: string, ...args: any[]): void {
    this.output(LogLevel.DEBUG, message, args);
  }

  /**
   * 信息日志
   */
  static info(message: string, ...args: any[]): void {
    this.output(LogLevel.INFO, message, args);
  }

  /**
   * 警告日志
   */
  static warn(message: string, ...args: any[]): void {
    this.output(LogLevel.WARN, message, args);
  }

  /**
   * 错误日志
   */
  static error(message: string, ...args: any[]): void {
    this.output(LogLevel.ERROR, message, args);
  }

  /**
   * 输出日志到控制台
   */
  private static output(level: LogLevel, message: string, args: any[]): void {
    const timestamp = this.formatTime();
    
    // 按设计要求格式化: [INFO] 13:54:28.755 [ComponentName]: 应用启动开始
    const formattedMessage = `[${level}] ${timestamp} [${this.componentName}]: ${message}`;
    
    // 整合所有数据到一个字符串中输出
    const fullMessage = `${formattedMessage}${
      args.length > 0 ? `: ${args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')}` : ''
    }`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(fullMessage);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage);
        break;
      case LogLevel.INFO:
        console.info(fullMessage);
        break;
      case LogLevel.DEBUG:
        console.debug(fullMessage);
        break;
      default:
        console.log(fullMessage);
    }
  }
}

// 导出便捷函数
export const logger = Logger;

export default Logger;