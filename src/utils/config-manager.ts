// 配置管理系统（统一配置管理）
// 基于货船智能机舱管理系统配置架构

import { logger } from './logger';

/**
 * 配置类型
 */
export interface ConfigValue {
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  description?: string;
  validation?: (value: any) => boolean;
  transform?: (value: any) => any;
}

/**
 * 配置项
 */
export interface ConfigItem {
  key: string;
  section: string;
  description: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  validation?: (value: any) => boolean;
  transform?: (value: any) => any;
  isReadOnly?: boolean;
  isEncrypted?: boolean;
  environment?: string[];
  minVersion?: string;
  maxVersion?: string;
}

/**
 * 配置变更事件
 */
export interface ConfigChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  source: 'user' | 'api' | 'environment' | 'file';
  userId?: string;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 配置管理器类
 */
export class ConfigManager {
  private static config: Map<string, ConfigItem> = new Map();
  private static changeHandlers: Array<(event: ConfigChangeEvent) => void> = [];
  private static isInitialized = false;
  private static environment = 'development';
  private static version = '1.0.0';

  /**
   * 初始化配置管理器
   */
  static async initialize(configPath?: string): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Config manager already initialized');
      return;
    }

    try {
      // 设置环境和版本
      this.environment = import.meta.env.DEV ? 'development' : 'production';
      this.version = import.meta.env.DEV ? 'development' : '1.0.0';

      // 加载默认配置
      this.loadDefaultConfigs();

      // 加载环境变量
      this.loadEnvironmentVariables();

      // 加载配置文件
      if (configPath) {
        await this.loadConfigFile(configPath);
      }

      // 验证配置
      this.validateAllConfigs();

      this.isInitialized = true;
      logger.info('Configuration manager initialized', { environment: this.environment, version: this.version });

    } catch (error) {
      logger.error('Failed to initialize configuration manager', error);
      throw error;
    }
  }

  /**
   * 获取配置值
   */
  static get<T = any>(key: string, defaultValue?: T): T | null {
    const config = this.config.get(key);
    if (!config) {
      logger.debug(`Configuration key not found: ${key}`, { defaultValue });
      return defaultValue ?? null;
    }

    // 检查环境限制
    if (config.environment && !config.environment.includes(this.environment)) {
      logger.debug(`Configuration key not available in environment: ${key}`, { environment: this.environment });
      return defaultValue ?? null;
    }

    // 检查版本限制
    if (config.minVersion && this.compareVersion(this.version, config.minVersion) < 0) {
      logger.debug(`Configuration key requires minimum version: ${key}`, { version: this.version, minVersion: config.minVersion });
      return defaultValue ?? null;
    }

    if (config.maxVersion && this.compareVersion(this.version, config.maxVersion) > 0) {
      logger.debug(`Configuration key requires maximum version: ${key}`, { version: this.version, maxVersion: config.maxVersion });
      return defaultValue ?? null;
    }

    return config.value as T;
  }

  /**
   * 设置配置值
   */
  static set(key: string, value: any, source: ConfigChangeEvent['source'] = 'user', userId?: string): void {
    const config = this.config.get(key);
    if (!config) {
      throw new Error(`Configuration key not found: ${key}`);
    }

    if (config.isReadOnly) {
      throw new Error(`Configuration key is read-only: ${key}`);
    }

    // 验证值
    if (!this.validateValue(key, value)) {
      throw new Error(`Invalid value for configuration key: ${key}`);
    }

    const oldValue = config.value;
    const newValue = this.transformValue(key, value);

    // 检查值是否实际改变
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      logger.debug(`Configuration value unchanged: ${key}`, { value: newValue });
      return;
    }

    // 更新配置
    config.value = newValue;

    // 触发变更事件
    const event: ConfigChangeEvent = {
      key,
      oldValue,
      newValue,
      timestamp: Date.now(),
      source,
      userId,
    };

    this.notifyChange(event);

    // 记录日志
    logger.info(`Configuration updated: ${key}`, { 
      oldValue, 
      newValue, 
      source, 
      userId,
      environment: this.environment 
    });

    // 保存到存储
    this.saveToStorage();
  }

  /**
   * 获取所有配置
   */
  static getAll(section?: string): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, config] of this.config.entries()) {
      if (!section || config.section === section) {
        // 隐藏加密值
        const value = config.isEncrypted ? '[ENCRYPTED]' : config.value;
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * 获取配置节
   */
  static getSection(section: string): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, config] of this.config.entries()) {
      if (config.section === section) {
        const value = config.isEncrypted ? '[ENCRYPTED]' : config.value;
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * 添加配置项
   */
  static add(configItem: Omit<ConfigItem, 'value'>): void {
    const { key, validation, transform, ...rest } = configItem;
    
    // 检查键是否已存在
    if (this.config.has(key)) {
      throw new Error(`Configuration key already exists: ${key}`);
    }

    // 验证配置项
    if (validation && !validation(configItem.defaultValue)) {
      throw new Error(`Invalid default value for configuration key: ${key}`);
    }

    // 应用转换
    const transformedValue = transform ? transform(configItem.defaultValue) : configItem.defaultValue;

    this.config.set(key, {
      ...rest,
      key,
      value: transformedValue,
      validation,
      transform,
    });

    logger.debug(`Configuration added: ${key}`, { section: configItem.section });
  }

  /**
   * 移除配置项
   */
  static remove(key: string): void {
    const config = this.config.get(key);
    if (!config) {
      throw new Error(`Configuration key not found: ${key}`);
    }

    this.config.delete(key);
    logger.debug(`Configuration removed: ${key}`);
  }

  /**
   * 重置配置
   */
  static reset(key: string): void {
    const config = this.config.get(key);
    if (!config) {
      throw new Error(`Configuration key not found: ${key}`);
    }

    if (!config.defaultValue && config.defaultValue !== null) {
      throw new Error(`No default value for configuration key: ${key}`);
    }

    const oldValue = config.value;
    const newValue = config.defaultValue;

    config.value = newValue;

    const event: ConfigChangeEvent = {
      key,
      oldValue,
      newValue,
      timestamp: Date.now(),
      source: 'user',
    };

    this.notifyChange(event);

    logger.info(`Configuration reset: ${key}`, { value: newValue });
  }

  /**
   * 导出配置
   */
  static export(section?: string): string {
    const configs = section ? this.getSection(section) : this.getAll();
    
    return JSON.stringify({
      version: this.version,
      environment: this.environment,
      timestamp: Date.now(),
      configs,
    }, null, 2);
  }

  /**
   * 导入配置
   */
  static import(configData: string, overwrite: boolean = false): void {
    try {
      const data = JSON.parse(configData);
      
      if (!data.configs || typeof data.configs !== 'object') {
        throw new Error('Invalid configuration data format');
      }

      for (const [key, value] of Object.entries(data.configs)) {
        if (!this.config.has(key)) {
          throw new Error(`Unknown configuration key: ${key}`);
        }

        if (!overwrite) {
          // 检查值是否冲突
          const existingValue = this.get(key);
          if (JSON.stringify(existingValue) !== JSON.stringify(value)) {
            logger.warn(`Configuration conflict during import: ${key}`, { existingValue, importedValue: value });
          }
          continue;
        }

        this.set(key, value, 'api');
      }

      logger.info('Configuration imported successfully', { count: Object.keys(data.configs).length });
    } catch (error) {
      logger.error('Failed to import configuration', error);
      throw error;
    }
  }

  /**
   * 验证配置
   */
  static validate(key: string): ConfigValidationResult {
    const config = this.config.get(key);
    if (!config) {
      return {
        isValid: false,
        errors: [`Configuration key not found: ${key}`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查类型
    if (typeof config.value !== config.type) {
      errors.push(`Type mismatch: expected ${config.type}, got ${typeof config.value}`);
    }

    // 检查验证函数
    if (config.validation && !config.validation(config.value)) {
      errors.push('Value failed validation function');
    }

    // 检查环境限制
    if (config.environment && !config.environment.includes(this.environment)) {
      warnings.push(`Configuration not available in current environment: ${this.environment}`);
    }

    // 检查版本限制
    if (config.minVersion && this.compareVersion(this.version, config.minVersion) < 0) {
      warnings.push(`Configuration requires minimum version: ${config.minVersion}`);
    }

    if (config.maxVersion && this.compareVersion(this.version, config.maxVersion) > 0) {
      warnings.push(`Configuration requires maximum version: ${config.maxVersion}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证所有配置
   */
  static validateAll(): Record<string, ConfigValidationResult> {
    const results: Record<string, ConfigValidationResult> = {};

    for (const key of this.config.keys()) {
      results[key] = this.validate(key);
    }

    return results;
  }

  /**
   * 监听配置变更
   */
  static onChange(handler: (event: ConfigChangeEvent) => void): void {
    this.changeHandlers.push(handler);
  }

  /**
   * 移除变更监听器
   */
  static removeChangeHandler(handler: (event: ConfigChangeEvent) => void): void {
    const index = this.changeHandlers.indexOf(handler);
    if (index !== -1) {
      this.changeHandlers.splice(index, 1);
    }
  }

  /**
   * 获取配置统计
   */
  static getStatistics(): {
    totalConfigs: number;
    bySection: Record<string, number>;
    byType: Record<string, number>;
    encrypted: number;
    readOnly: number;
  } {
    const bySection: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let encrypted = 0;
    let readOnly = 0;

    for (const config of this.config.values()) {
      bySection[config.section] = (bySection[config.section] || 0) + 1;
      byType[config.type] = (byType[config.type] || 0) + 1;
      
      if (config.isEncrypted) encrypted++;
      if (config.isReadOnly) readOnly++;
    }

    return {
      totalConfigs: this.config.size,
      bySection,
      byType,
      encrypted,
      readOnly,
    };
  }

  /**
   * 清除所有配置
   */
  static clear(): void {
    this.config.clear();
    this.saveToStorage();
    logger.info('All configurations cleared');
  }

  /**
   * 获取环境变量
   */
  static getEnvironment(): string {
    return this.environment;
  }

  /**
   * 获取版本
   */
  static getVersion(): string {
    return this.version;
  }

  /**
   * 加载默认配置
   */
  private static loadDefaultConfigs(): void {
    // 应用配置
    this.add({
      key: 'app.name',
      section: 'application',
      description: 'Application name',
      type: 'string',
      defaultValue: 'Cargo Ship Engine Management System',
    });

    this.add({
      key: 'app.version',
      section: 'application',
      description: 'Application version',
      type: 'string',
      defaultValue: this.version,
      isReadOnly: true,
    });

    this.add({
      key: 'app.debug',
      section: 'application',
      description: 'Enable debug mode',
      type: 'boolean',
      defaultValue: this.environment === 'development',
    });

    // API配置
    this.add({
      key: 'api.baseURL',
      section: 'api',
      description: 'API base URL',
      type: 'string',
      defaultValue: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    });

    this.add({
      key: 'api.timeout',
      section: 'api',
      description: 'API request timeout (ms)',
      type: 'number',
      defaultValue: 30000,
      validation: (value) => value > 0 && value <= 300000,
    });

    this.add({
      key: 'api.retryAttempts',
      section: 'api',
      description: 'API retry attempts',
      type: 'number',
      defaultValue: 3,
      validation: (value) => value >= 0 && value <= 10,
    });

    // 认证配置
    this.add({
      key: 'auth.tokenExpiry',
      section: 'authentication',
      description: 'Token expiry time (hours)',
      type: 'number',
      defaultValue: 8,
      validation: (value) => value > 0 && value <= 168, // 最多7天
    });

    this.add({
      key: 'auth.refreshThreshold',
      section: 'authentication',
      description: 'Refresh token threshold (minutes)',
      type: 'number',
      defaultValue: 30,
      validation: (value) => value > 0 && value <= 120,
    });

    // UI配置
    this.add({
      key: 'ui.theme',
      section: 'ui',
      description: 'UI theme',
      type: 'string',
      defaultValue: 'light',
      validation: (value) => ['light', 'dark', 'auto'].includes(value),
    });

    this.add({
      key: 'ui.language',
      section: 'ui',
      description: 'UI language',
      type: 'string',
      defaultValue: 'zh-CN',
      validation: (value) => ['zh-CN', 'en-US'].includes(value),
    });

    this.add({
      key: 'ui.refreshInterval',
      section: 'ui',
      description: 'Data refresh interval (seconds)',
      type: 'number',
      defaultValue: 30,
      validation: (value) => value >= 5 && value <= 3600,
    });

    // 监控配置
    this.add({
      key: 'monitoring.dataRetentionDays',
      section: 'monitoring',
      description: 'Monitoring data retention period (days)',
      type: 'number',
      defaultValue: 90,
      validation: (value) => value >= 1 && value <= 365,
    });

    this.add({
      key: 'monitoring.batchSize',
      section: 'monitoring',
      description: 'Monitoring data batch size',
      type: 'number',
      defaultValue: 1000,
      validation: (value) => value > 0 && value <= 10000,
    });

    // 告警配置
    this.add({
      key: 'alerts.emailNotifications',
      section: 'alerts',
      description: 'Enable email notifications',
      type: 'boolean',
      defaultValue: true,
    });

    this.add({
      key: 'alerts.escalationTimeout',
      section: 'alerts',
      description: 'Alert escalation timeout (hours)',
      type: 'number',
      defaultValue: 2,
      validation: (value) => value >= 0.5 && value <= 24,
    });

    // 维护配置
    this.add({
      key: 'maintenance.autoScheduling',
      section: 'maintenance',
      description: 'Enable automatic maintenance scheduling',
      type: 'boolean',
      defaultValue: true,
    });

    this.add({
      key: 'maintenance.notificationAdvance',
      section: 'maintenance',
      description: 'Maintenance notification advance time (days)',
      type: 'number',
      defaultValue: 7,
      validation: (value) => value >= 1 && value <= 30,
    });

    logger.info('Default configurations loaded', { count: this.config.size });
  }

  /**
   * 加载环境变量
   */
  private static loadEnvironmentVariables(): void {
    const envMappings = {
      'VITE_API_BASE_URL': 'api.baseURL',
      'VITE_APP_NAME': 'app.name',
      'VITE_APP_DEBUG': 'app.debug',
      'VITE_APP_THEME': 'ui.theme',
      'VITE_APP_LANGUAGE': 'ui.language',
      'VITE_MONITORING_RETENTION': 'monitoring.dataRetentionDays',
      'VITE_ALERTS_EMAIL': 'alerts.emailNotifications',
    };

    for (const [envKey, configKey] of Object.entries(envMappings)) {
      const envValue = (import.meta.env as any)[envKey];
      if (envValue !== undefined) {
        const config = this.config.get(configKey);
        if (config) {
          let value: any = envValue;
          
          // 类型转换
          switch (config.type) {
            case 'boolean':
              value = envValue.toLowerCase() === 'true';
              break;
            case 'number':
              value = Number(envValue);
              break;
            case 'object':
            case 'array':
              try {
                value = JSON.parse(envValue);
              } catch {
                logger.warn(`Failed to parse environment variable as JSON: ${envKey}`, { value: envValue });
                continue;
              }
              break;
          }

          config.value = value;
          logger.debug(`Environment variable loaded: ${envKey} -> ${configKey}`, { value });
        }
      }
    }
  }

  /**
   * 加载配置文件
   */
  private static async loadConfigFile(configPath: string): Promise<void> {
    try {
      // 模拟加载配置文件（实际实现中需要根据具体文件格式加载）
      logger.info('Configuration file loading not implemented', { configPath });
    } catch (error) {
      logger.error('Failed to load configuration file', error);
    }
  }

  /**
   * 验证值
   */
  private static validateValue(key: string, value: any): boolean {
    const config = this.config.get(key);
    if (!config) return false;

    // 类型验证
    if (typeof value !== config.type) {
      return false;
    }

    // 自定义验证
    if (config.validation && !config.validation(value)) {
      return false;
    }

    return true;
  }

  /**
   * 转换值
   */
  private static transformValue(key: string, value: any): any {
    const config = this.config.get(key);
    if (!config || !config.transform) {
      return value;
    }

    try {
      return config.transform(value);
    } catch (error) {
      logger.error('Failed to transform configuration value', error, { key, value });
      return value;
    }
  }

  /**
   * 通知变更
   */
  private static notifyChange(event: ConfigChangeEvent): void {
    this.changeHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        logger.error('Error in configuration change handler', error);
      }
    });
  }

  /**
   * 保存到存储
   */
  private static saveToStorage(): void {
    try {
      const configs = this.getAll();
      localStorage.setItem('app_configs', JSON.stringify(configs));
    } catch (error) {
      logger.error('Failed to save configurations to storage', error);
    }
  }

  /**
   * 比较版本
   */
  private static compareVersion(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  /**
   * 验证所有配置
   */
  private static validateAllConfigs(): void {
    const results = this.validateAll();
    const errors = Object.entries(results).filter(([_, result]) => !result.isValid);

    if (errors.length > 0) {
      logger.warn('Configuration validation failed', { errors: errors.length });
      
      errors.forEach(([key, result]) => {
        logger.warn(`Configuration validation failed for key: ${key}`, { errors: result.errors });
      });
    } else {
      logger.info('All configurations validated successfully');
    }
  }
}

// 导出便捷函数
export const config = ConfigManager;

export default ConfigManager;