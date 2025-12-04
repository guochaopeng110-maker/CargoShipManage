// 数据验证工具（统一数据验证和管理）
// 基于货船智能机舱管理系统数据验证架构

import { ErrorType } from '../types/global';
import { handleApiError } from './error-handler';

/**
 * 验证规则接口
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'email' | 'url' | 'phone';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
  trim?: boolean;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
}

/**
 * 验证规则集合
 */
export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

/**
 * 字段验证错误接口
 */
export interface FieldValidationError {
  field: string;
  message: string;
  value?: any;
  rule: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: FieldValidationError[];
  data?: any;
}

/**
 * 数据转换接口
 */
export interface DataTransform {
  trim?: boolean;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
  toNumber?: boolean;
  toBoolean?: boolean;
  toDate?: boolean;
  custom?: (value: any) => any;
}

/**
 * 验证配置接口
 */
export interface ValidationConfig {
  stopOnFirstError?: boolean;
  validateEmpty?: boolean;
  trimStrings?: boolean;
  throwOnError?: boolean;
  transform?: DataTransform;
}

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  public fieldErrors: FieldValidationError[];

  constructor(message: string, fieldErrors: FieldValidationError[]) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;

    // 记录验证错误
    handleApiError(this, '数据验证', {
      showToast: false,
      logToConsole: true
    });
  }
}

/**
 * 字段验证器类
 */
export class FieldValidator {
  private rules: ValidationRules;
  private config: ValidationConfig;

  constructor(rules: ValidationRules, config: Partial<ValidationConfig> = {}) {
    this.rules = rules;
    this.config = {
      stopOnFirstError: true,
      validateEmpty: true,
      trimStrings: true,
      throwOnError: false,
      ...config
    };
  }

  /**
   * 验证单个值
   */
  validateValue(value: any, fieldName: string, rule: ValidationRule): FieldValidationError[] {
    const errors: FieldValidationError[] = [];
    
    // 预处理值
    const processedValue = this.preprocessValue(value, rule);
    
    // 检查必填字段
    if (rule.required && (processedValue === null || processedValue === undefined || processedValue === '')) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName}是必填字段`,
        value,
        rule: 'required'
      });
      return errors;
    }

    // 如果值为空且不需要验证空值，跳过其他验证
    if (!this.config.validateEmpty && (processedValue === null || processedValue === undefined || processedValue === '')) {
      return errors;
    }

    // 验证类型
    if (rule.type && !this.validateType(processedValue, rule.type)) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName}类型不正确，应该是${rule.type}`,
        value: processedValue,
        rule: 'type'
      });
      if (this.config.stopOnFirstError) return errors;
    }

    // 验证字符串长度
    if (rule.type === 'string' && typeof processedValue === 'string') {
      if (rule.minLength && processedValue.length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: rule.message || `${fieldName}长度不能少于${rule.minLength}个字符`,
          value: processedValue,
          rule: 'minLength'
        });
        if (this.config.stopOnFirstError) return errors;
      }

      if (rule.maxLength && processedValue.length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: rule.message || `${fieldName}长度不能超过${rule.maxLength}个字符`,
          value: processedValue,
          rule: 'maxLength'
        });
        if (this.config.stopOnFirstError) return errors;
      }
    }

    // 验证数字范围
    if (rule.type === 'number' && typeof processedValue === 'number') {
      if (rule.min !== undefined && processedValue < rule.min) {
        errors.push({
          field: fieldName,
          message: rule.message || `${fieldName}不能小于${rule.min}`,
          value: processedValue,
          rule: 'min'
        });
        if (this.config.stopOnFirstError) return errors;
      }

      if (rule.max !== undefined && processedValue > rule.max) {
        errors.push({
          field: fieldName,
          message: rule.message || `${fieldName}不能大于${rule.max}`,
          value: processedValue,
          rule: 'max'
        });
        if (this.config.stopOnFirstError) return errors;
      }
    }

    // 验证正则表达式
    if (rule.pattern && !rule.pattern.test(String(processedValue))) {
      errors.push({
        field: fieldName,
        message: rule.message || `${fieldName}格式不正确`,
        value: processedValue,
        rule: 'pattern'
      });
      if (this.config.stopOnFirstError) return errors;
    }

    // 自定义验证
    if (rule.custom) {
      const customResult = rule.custom(processedValue);
      if (customResult !== true) {
        errors.push({
          field: fieldName,
          message: typeof customResult === 'string' ? customResult : (rule.message || `${fieldName}验证失败`),
          value: processedValue,
          rule: 'custom'
        });
        if (this.config.stopOnFirstError) return errors;
      }
    }

    return errors;
  }

  /**
   * 验证单个字段
   */
  validateField(data: Record<string, any>, fieldName: string): FieldValidationError[] {
    const rule = this.rules[fieldName];
    if (!rule) return [];

    const value = data[fieldName];
    return this.validateValue(value, fieldName, rule);
  }

  /**
   * 验证所有字段
   */
  validate(data: Record<string, any>): ValidationResult {
    const errors: FieldValidationError[] = [];
    const transformedData = { ...data };

    // 应用数据转换
    if (this.config.transform) {
      for (const [fieldName, rule] of Object.entries(this.rules)) {
        const value = data[fieldName];
        if (value !== undefined) {
          transformedData[fieldName] = this.transformValue(value, rule);
        }
      }
    }

    // 验证每个字段
    for (const fieldName of Object.keys(this.rules)) {
      const fieldErrors = this.validateField(transformedData, fieldName);
      errors.push(...fieldErrors);

      if (this.config.stopOnFirstError && fieldErrors.length > 0) {
        break;
      }
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      data: transformedData
    };

    if (!result.valid && this.config.throwOnError) {
      throw new ValidationError('数据验证失败', errors);
    }

    return result;
  }

  /**
   * 获取规则
   */
  getRules(): ValidationRules {
    return this.rules;
  }

  /**
   * 预处理值
   */
  private preprocessValue(value: any, rule: ValidationRule): any {
    let processedValue = value;

    // 字符串处理
    if (typeof processedValue === 'string') {
      if (rule.trim || this.config.trimStrings) {
        processedValue = processedValue.trim();
      }
      
      if (rule.toLowerCase) {
        processedValue = processedValue.toLowerCase();
      }
      
      if (rule.toUpperCase) {
        processedValue = processedValue.toUpperCase();
      }
    }

    return processedValue;
  }

  /**
   * 转换值
   */
  private transformValue(value: any, rule: ValidationRule): any {
    let transformedValue = value;

    if (this.config.transform) {
      const transform = this.config.transform;
      
      if (transform.trim && typeof transformedValue === 'string') {
        transformedValue = transformedValue.trim();
      }
      
      if (transform.toLowerCase && typeof transformedValue === 'string') {
        transformedValue = transformedValue.toLowerCase();
      }
      
      if (transform.toUpperCase && typeof transformedValue === 'string') {
        transformedValue = transformedValue.toUpperCase();
      }
      
      if (transform.toNumber && transformedValue !== null && transformedValue !== undefined) {
        const num = Number(transformedValue);
        if (!isNaN(num)) {
          transformedValue = num;
        }
      }
      
      if (transform.toBoolean && transformedValue !== null && transformedValue !== undefined) {
        if (typeof transformedValue === 'string') {
          transformedValue = transformedValue.toLowerCase();
          if (['true', '1', 'yes', 'on'].includes(transformedValue)) {
            transformedValue = true;
          } else if (['false', '0', 'no', 'off'].includes(transformedValue)) {
            transformedValue = false;
          }
        } else if (typeof transformedValue === 'number') {
          transformedValue = transformedValue !== 0;
        }
      }
      
      if (transform.toDate && transformedValue !== null && transformedValue !== undefined) {
        const date = new Date(transformedValue);
        if (!isNaN(date.getTime())) {
          transformedValue = date;
        }
      }
      
      if (transform.custom) {
        transformedValue = transform.custom(transformedValue);
      }
    }

    return transformedValue;
  }

  /**
   * 验证类型
   */
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date && !isNaN(value.getTime());
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value);
      case 'url':
        return typeof value === 'string' && this.isValidURL(value);
      case 'phone':
        return typeof value === 'string' && this.isValidPhone(value);
      default:
        return true;
    }
  }

  /**
   * 验证邮箱格式
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证URL格式
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证手机号格式
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }
}

/**
 * 数据验证器类
 */
export class DataValidator {
  private validators: Map<string, FieldValidator> = new Map();

  /**
   * 添加字段验证器
   */
  addValidator(fieldName: string, rules: ValidationRules, config?: Partial<ValidationConfig>): void {
    this.validators.set(fieldName, new FieldValidator(rules, config));
  }

  /**
   * 移除字段验证器
   */
  removeValidator(fieldName: string): void {
    this.validators.delete(fieldName);
  }

  /**
   * 验证数据
   */
  validate(data: Record<string, any>, fieldName?: string): ValidationResult {
    if (fieldName) {
      const validator = this.validators.get(fieldName);
      if (!validator) {
        return {
          valid: true,
          errors: [],
          data
        };
      }

      const fieldErrors = validator.validateField(data, fieldName);
      return {
        valid: fieldErrors.length === 0,
        errors: fieldErrors,
        data
      };
    }

    // 验证所有字段
    const allErrors: FieldValidationError[] = [];
    const transformedData = { ...data };

    for (const [name, validator] of this.validators.entries()) {
      const result = validator.validateField(data, name);
      allErrors.push(...result);

      // 应用数据转换
      if (result.length === 0 && data[name] !== undefined) {
        const rule = validator.getRules()[name];
        if (rule) {
          transformedData[name] = validator['preprocessValue'](data[name], rule);
        }
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      data: transformedData
    };
  }

  /**
   * 获取验证器
   */
  getValidator(fieldName: string): FieldValidator | undefined {
    return this.validators.get(fieldName);
  }

  /**
   * 获取所有字段名
   */
  getFieldNames(): string[] {
    return Array.from(this.validators.keys());
  }
}

/**
 * 预定义的验证规则
 */
export const PREDEFINED_RULES = {
  // 用户相关
  username: {
    required: true,
    type: 'string' as const,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: '用户名只能包含字母、数字和下划线'
  },
  
  email: {
    required: true,
    type: 'email' as const,
    message: '请输入有效的邮箱地址'
  },
  
  password: {
    required: true,
    type: 'string' as const,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: '密码至少包含一个大写字母、一个小写字母、一个数字和一个特殊字符'
  },

  // 设备相关
  deviceId: {
    required: true,
    type: 'string' as const,
    pattern: /^[A-Z0-9\-]+$/,
    message: '设备ID只能包含大写字母、数字和连字符'
  },
  
  deviceName: {
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100,
    message: '设备名称长度为1-100个字符'
  },

  // 监控数据相关
  metricValue: {
    required: true,
    type: 'number' as const,
    custom: (value: number) => {
      if (isNaN(value) || !isFinite(value)) {
        return '数值必须是有效的数字';
      }
      return true;
    }
  },
  
  timestamp: {
    required: true,
    type: 'date' as const,
    custom: (value: Date) => {
      if (value.getTime() > Date.now() + 60000) { // 允许1分钟误差
        return '时间戳不能是未来时间';
      }
      return true;
    }
  },

  // 联系信息
  phone: {
    type: 'phone' as const,
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号码'
  },

  // URL
  url: {
    type: 'url' as const,
    message: '请输入有效的URL地址'
  }
};

/**
 * 便捷验证函数
 */

// 验证单个值
export const validateValue = (value: any, rule: ValidationRule): FieldValidationError[] => {
  const validator = new FieldValidator({ field: rule });
  return validator.validateValue(value, 'field', rule);
};

// 验证邮箱
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证手机号
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// 验证URL
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// 创建验证器实例
export const createValidator = (rules: ValidationRules, config?: Partial<ValidationConfig>): FieldValidator => {
  return new FieldValidator(rules, config);
};

export default DataValidator;