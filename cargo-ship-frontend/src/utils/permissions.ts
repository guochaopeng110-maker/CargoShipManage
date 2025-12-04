/**
 * 货船智能机舱管理系统 - 高级权限控制系统
 * 
 * 基于RBAC（基于角色的访问控制）权限系统，支持：
 * 1. 传统RBAC权限控制
 * 2. ABAC（基于属性的访问控制）
 * 3. 动态权限计算
 * 4. 权限缓存和优化
 * 5. 权限审计和监控
 * 6. 权限继承和聚合
 * 7. 条件权限控制
 * 
 * 核心特性：
 * - 角色层次结构和权限继承
 * - 资源级别的细粒度权限控制
 * - 动态权限计算和缓存
 * - 权限变更事件监听
 * - 权限验证结果缓存
 * - 批量权限检查优化
 * - 权限表达式解析
 * 
 * @version 2.0.0
 * @author 货船智能机舱管理系统开发团队
 */

import { User, Role, Permission } from '../types/auth';

// 权限验证结果接口
export interface PermissionValidationResult {
  granted: boolean;
  reason: string;
  missingPermissions?: string[];
  requiredRole?: string;
  userRole?: string;
  validationTime: number;
  confidence?: number; // 权限验证置信度 (0-1)
  conditions?: PermissionCondition[]; // 满足的条件
  dependencies?: string[]; // 依赖的其他权限
}

// 权限条件接口（用于ABAC）
export interface PermissionCondition {
  field: string; // 条件字段
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any; // 条件值
  context?: string; // 上下文标识
}

// 权限上下文接口
export interface PermissionContext {
  user: User;
  resource?: string;
  action?: string;
  time?: Date;
  location?: string;
  device?: string;
  network?: string;
  sessionId?: string;
  custom?: Record<string, any>;
}

// 权限表达式接口
export interface PermissionExpression {
  type: 'permission' | 'role' | 'condition' | 'and' | 'or' | 'not';
  value?: string;
  conditions?: PermissionCondition[];
  children?: PermissionExpression[];
}

// 权限缓存接口
export interface PermissionCacheEntry {
  key: string;
  result: PermissionValidationResult;
  timestamp: number;
  expiry: number;
  hitCount: number;
}

// 权限审计日志接口
export interface PermissionAuditLog {
  id: string;
  userId: string;
  permission: string;
  action: 'check' | 'grant' | 'revoke' | 'expire';
  result: boolean;
  context: PermissionContext;
  timestamp: number;
  reason?: string;
}

// 权限矩阵类型
export interface PermissionMatrix {
  [resource: string]: {
    [action: string]: boolean;
  };
}

// 角色层次结构
export interface RoleHierarchy {
  [roleName: string]: {
    parent?: string;
    level: number;
    inheritedPermissions: string[];
    conditions?: PermissionCondition[];
    priority?: number;
  };
}

// 权限检查配置
export interface PermissionCheckConfig {
  any?: string[];      // 任一权限即可
  all?: string[];      // 需要所有权限
  role?: string;       // 指定角色
  minRole?: string;    // 最小角色级别
  conditions?: PermissionCondition[]; // 附加条件
  context?: PermissionContext; // 权限上下文
  expression?: PermissionExpression; // 权限表达式
  useCache?: boolean;  // 是否使用缓存
  cacheTimeout?: number; // 缓存超时时间
}

// 高级权限系统类
export class AdvancedPermissionSystem {
  private static readonly ROLE_HIERARCHY: RoleHierarchy = {
    'Administrator': {
      level: 5,
      priority: 100,
      inheritedPermissions: [
        'system:*', // 系统全部权限
        'user:*',   // 用户管理全部权限
        'device:*',  // 设备管理全部权限（更新为标准格式）
        'alarm:*',   // 告警管理全部权限
        'report:*',  // 报告管理全部权限
        'maintenance:*', // 维护管理全部权限
        'import:*',  // 数据导入全部权限
        'threshold:*', // 阈值管理全部权限
        'monitoring:*', // 监控管理全部权限
        'health:*',  // 健康检查全部权限
        'history:*', // 历史数据全部权限
      ],
    },
    'Operator': {
      level: 3,
      parent: 'Administrator',
      priority: 80,
      inheritedPermissions: [
        'device:read', 'device:execute', 'device:write',
        'alert:read', 'alert:write', 'alert:execute',
        'report:read', 'report:execute',
        'maintenance:read', 'maintenance:write', 'maintenance:execute',
        'monitoring:read', 'monitoring:write', 'monitoring:execute',
        'health:read', 'health:write', 'health:execute',
        'history:read', 'history:execute',
      ],
      conditions: [
        {
          field: 'user.isActive',
          operator: 'eq',
          value: true,
          context: 'user_status'
        }
      ]
    },
    'Maintainer': {
      level: 2,
      parent: 'Operator',
      priority: 60,
      inheritedPermissions: [
        'device:read', 'device:execute',
        'maintenance:read', 'maintenance:write', 'maintenance:execute',
        'alarm:read', 'alarm:write',
        'health:read', 'health:execute',
      ],
    },
    'Viewer': {
      level: 1,
      parent: 'Maintainer',
      priority: 40,
      inheritedPermissions: [
        'device:read',
        'alarm:read',
        'report:read',
        'maintenance:read',
        'monitoring:read',
        'health:read',
        'history:read',
      ],
    },
    'Guest': {
      level: 0,
      parent: 'Viewer',
      priority: 20,
      inheritedPermissions: [
        'system:read',
        'monitoring:read',
      ],
      conditions: [
        {
          field: 'session.duration',
          operator: 'lt',
          value: 3600, // 1小时
          context: 'session'
        }
      ]
    },
  };

  private static readonly RESOURCE_ACTION_MAP = {
    // === 设备管理（4个）===
    'device': ['create', 'read', 'update', 'delete'],
    
    // === 传感器数据（6个）===
    'sensor_data': ['create', 'read', 'update', 'delete', 'import', 'export'],
    
    // === 告警信息（4个）===
    'alert': ['create', 'read', 'update', 'delete'],
    
    // === 报表管理（5个）===
    'report': ['create', 'read', 'update', 'delete', 'export'],
    
    // === 用户管理（4个）===
    'user': ['create', 'read', 'update', 'delete'],
    
    // === 角色管理（4个）===
    'role': ['create', 'read', 'update', 'delete'],
    
    // === 权限管理（4个）===
    'permission': ['create', 'read', 'update', 'delete'],
    
    // === 系统管理（4个）===
    'audit_log': ['read', 'export'],
    'system_config': ['read', 'update'],
  };

  // 权限缓存
  private static permissionCache = new Map<string, PermissionCacheEntry>();
  
  // 缓存配置
  private static readonly CACHE_CONFIG = {
    maxSize: 1000,
    defaultTimeout: 5 * 60 * 1000, // 5分钟
    cleanupInterval: 60 * 1000, // 1分钟清理一次
  };

  // 审计日志
  private static auditLogs: PermissionAuditLog[] = [];
  
  // 监听器
  private static listeners: Array<(event: string, data: any) => void> = [];

  // 权限变化监听器
  private static permissionChangeListeners: Array<(userId: string, changes: string[]) => void> = [];

  /**
   * 高级权限验证
   */
  static validateUserPermissions(
    user: User,
    config: PermissionCheckConfig
  ): PermissionValidationResult {
    const startTime = Date.now();
    
    // 检查缓存
    if (config.useCache !== false) {
      const cacheKey = this.generateCacheKey(user, config);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logAudit('check', user.id, 'cached_permission', true, { config });
        return cached.result;
      }
    }

    // 基础验证
    const baseResult = this.validateBasicPermissions(user, config);
    
    // 条件验证
    const conditionResult = this.validateConditions(user, config);
    
    // 表达式验证
    const expressionResult = this.validateExpression(user, config);
    
    // 综合结果
    const finalResult = this.combineValidationResults(
      baseResult,
      conditionResult,
      expressionResult,
      startTime
    );

    // 缓存结果
    if (config.useCache !== false) {
      const cacheKey = this.generateCacheKey(user, config);
      this.addToCache(cacheKey, finalResult, config.cacheTimeout);
    }

    // 记录审计日志
    this.logAudit('check', user.id, JSON.stringify(config), finalResult.granted, { config, result: finalResult });

    return finalResult;
  }

  /**
   * 基础权限验证
   */
  private static validateBasicPermissions(
    user: User,
    config: PermissionCheckConfig
  ): PermissionValidationResult {
    const startTime = Date.now();
    
    // 检查是否已登录
    if (!user || !user.isActive) {
      return {
        granted: false,
        reason: '用户未登录或账户已被禁用',
        validationTime: Date.now() - startTime,
        confidence: 1.0,
      };
    }

    // 检查角色要求
    if (config.role) {
      const hasRole = user.roles.some(role => role.name === config.role);
      if (!hasRole) {
        return {
          granted: false,
          reason: `用户没有所需角色: ${config.role}`,
          requiredRole: config.role,
          userRole: user.roles.map(role => role.name).join(', '),
          validationTime: Date.now() - startTime,
          confidence: 1.0,
        };
      }
    }

    // 检查最小角色要求
    if (config.minRole) {
      const minRoleLevel = this.ROLE_HIERARCHY[config.minRole]?.level || 0;
      const userMaxRoleLevel = Math.max(
        ...user.roles.map(role => this.ROLE_HIERARCHY[role.name]?.level || 0)
      );

      if (userMaxRoleLevel < minRoleLevel) {
        return {
          granted: false,
          reason: `用户权限级别不足，需要: ${config.minRole}或更高`,
          requiredRole: config.minRole,
          userRole: user.roles.map(role => role.name).join(', '),
          validationTime: Date.now() - startTime,
          confidence: 1.0,
        };
      }
    }

    // 检查权限要求
    const userPermissions = this.getUserAllPermissions(user);
    
    if (config.all) {
      const missingPermissions = config.all.filter(permission => 
        !userPermissions.includes(permission)
      );
      
      if (missingPermissions.length > 0) {
        return {
          granted: false,
          reason: `缺少必要权限: ${missingPermissions.join(', ')}`,
          missingPermissions,
          validationTime: Date.now() - startTime,
          confidence: 1.0,
        };
      }
    }

    if (config.any) {
      const hasAnyPermission = config.any.some(permission => 
        userPermissions.includes(permission)
      );
      
      if (!hasAnyPermission) {
        return {
          granted: false,
          reason: `没有所需权限之一: ${config.any.join(', ')}`,
          missingPermissions: config.any,
          validationTime: Date.now() - startTime,
          confidence: 1.0,
        };
      }
    }

    return {
      granted: true,
      reason: '基础权限验证通过',
      validationTime: Date.now() - startTime,
      confidence: 0.9,
    };
  }

  /**
   * 条件权限验证
   */
  private static validateConditions(
    user: User,
    config: PermissionCheckConfig
  ): PermissionValidationResult | null {
    if (!config.conditions || config.conditions.length === 0) {
      return null;
    }

    const context = config.context || { user };
    const satisfiedConditions: PermissionCondition[] = [];
    const unsatisfiedConditions: PermissionCondition[] = [];

    for (const condition of config.conditions) {
      if (this.evaluateCondition(condition, context)) {
        satisfiedConditions.push(condition);
      } else {
        unsatisfiedConditions.push(condition);
      }
    }

    if (unsatisfiedConditions.length > 0) {
      return {
        granted: false,
        reason: `不满足条件: ${unsatisfiedConditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}`,
        conditions: satisfiedConditions,
        validationTime: 0,
        confidence: 0.8,
      };
    }

    return {
      granted: true,
      reason: '条件权限验证通过',
      conditions: satisfiedConditions,
      validationTime: 0,
      confidence: 0.8,
    };
  }

  /**
   * 权限表达式验证
   */
  private static validateExpression(
    user: User,
    config: PermissionCheckConfig
  ): PermissionValidationResult | null {
    if (!config.expression) {
      return null;
    }

    const result = this.evaluateExpression(config.expression, user, config.context);
    
    return {
      granted: result,
      reason: result ? '权限表达式验证通过' : '权限表达式验证失败',
      validationTime: 0,
      confidence: 0.7,
    };
  }

  /**
   * 组合验证结果
   */
  private static combineValidationResults(
    baseResult: PermissionValidationResult,
    conditionResult: PermissionValidationResult | null,
    expressionResult: PermissionValidationResult | null,
    startTime: number
  ): PermissionValidationResult {
    const results = [baseResult];
    
    if (conditionResult) results.push(conditionResult);
    if (expressionResult) results.push(expressionResult);

    // 所有结果都必须通过
    const allGranted = results.every(result => result.granted);
    
    // 计算综合置信度
    const confidence = results.reduce((sum, result) => 
      sum + (result.confidence || 0), 0
    ) / results.length;

    // 收集所有条件
    const allConditions = results.flatMap(result => result.conditions || []);

    // 收集依赖权限
    const allDependencies = results.flatMap(result => result.dependencies || []);

    return {
      granted: allGranted,
      reason: allGranted 
        ? '所有权限验证通过'
        : results.find(r => !r.granted)?.reason || '权限验证失败',
      validationTime: Date.now() - startTime,
      confidence,
      conditions: allConditions.length > 0 ? allConditions : undefined,
      dependencies: allDependencies.length > 0 ? allDependencies : undefined,
    };
  }

  /**
   * 评估单个条件
   */
  private static evaluateCondition(
    condition: PermissionCondition,
    context: PermissionContext
  ): boolean {
    let fieldValue: any;

    // 获取字段值
    if (condition.field.startsWith('user.')) {
      const userField = condition.field.replace('user.', '');
      fieldValue = (context.user as any)[userField];
    } else if (condition.field.startsWith('context.')) {
      const contextField = condition.field.replace('context.', '');
      fieldValue = (context as any)[contextField];
    } else if (condition.field.includes('.')) {
      // 处理嵌套字段
      const parts = condition.field.split('.');
      fieldValue = parts.reduce((obj, part) => obj?.[part], context as any);
    } else {
      fieldValue = (context as any)[condition.field];
    }

    // 根据操作符进行判断
    switch (condition.operator) {
      case 'eq': return fieldValue === condition.value;
      case 'ne': return fieldValue !== condition.value;
      case 'gt': return fieldValue > condition.value;
      case 'gte': return fieldValue >= condition.value;
      case 'lt': return fieldValue < condition.value;
      case 'lte': return fieldValue <= condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'nin': return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(condition.value));
      case 'regex': return new RegExp(condition.value).test(String(fieldValue));
      default: return false;
    }
  }

  /**
   * 评估权限表达式
   */
  private static evaluateExpression(
    expression: PermissionExpression,
    user: User,
    context?: PermissionContext
  ): boolean {
    switch (expression.type) {
      case 'permission':
        const [resource, action] = expression.value!.split(':');
        return this.hasPermission(user, resource, action, context);
      
      case 'role':
        return this.hasRole(user, expression.value!, context);
      
      case 'condition':
        return expression.conditions?.every(condition => 
          this.evaluateCondition(condition, context || { user })
        ) || false;
      
      case 'and':
        return expression.children?.every(child => 
          this.evaluateExpression(child, user, context)
        ) || false;
      
      case 'or':
        return expression.children?.some(child => 
          this.evaluateExpression(child, user, context)
        ) || false;
      
      case 'not':
        return !expression.children?.some(child => 
          this.evaluateExpression(child, user, context)
        );
      
      default:
        return false;
    }
  }

  /**
   * 检查单个权限（扩展版）
   */
  static hasPermission(
    user: User, 
    resource: string, 
    action: string,
    context?: PermissionContext
  ): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    // 支持通配符权限
    const wildcardPermission = `${resource}:*`;
    const exactPermission = `${resource}:${action}`;
    
    const userPermissions = this.getUserAllPermissions(user);
    
    return userPermissions.includes(exactPermission) || 
           userPermissions.includes(wildcardPermission) ||
           this.hasInheritedPermission(user, exactPermission, context);
  }

  /**
   * 检查角色（扩展版）
   */
  static hasRole(user: User, roleName: string, context?: PermissionContext): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    const hasRole = user.roles.some(role => role.name === roleName);
    
    if (!hasRole && context) {
      // 检查角色的条件权限
      const roleInfo = this.ROLE_HIERARCHY[roleName];
      if (roleInfo?.conditions) {
        return roleInfo.conditions.every(condition => 
          this.evaluateCondition(condition, context)
        );
      }
    }

    return hasRole;
  }

  /**
   * 获取用户所有权限（包括继承权限）
   */
  static getUserAllPermissions(user: User, context?: PermissionContext): string[] {
    const permissions = new Set(user.permissions);
    
    // 添加角色继承权限
    user.roles.forEach(role => {
      const roleInfo = this.ROLE_HIERARCHY[role.name];
      if (roleInfo) {
        roleInfo.inheritedPermissions.forEach(permission => {
          permissions.add(permission);
        });
        
        // 评估角色条件
        if (roleInfo.conditions && context) {
          const conditionsMet = roleInfo.conditions.every(condition => 
            this.evaluateCondition(condition, context)
          );
          if (!conditionsMet) {
            // 条件不满足时，移除相关权限
            roleInfo.inheritedPermissions.forEach(permission => {
              if (permission.startsWith(`${role.name}:`)) {
                permissions.delete(permission);
              }
            });
          }
        }
      }
    });

    return Array.from(permissions);
  }

  /**
   * 检查继承权限
   */
  private static hasInheritedPermission(
    user: User, 
    permissionCode: string, 
    context?: PermissionContext
  ): boolean {
    const roleNames = user.roles.map(role => role.name);
    
    for (const roleName of roleNames) {
      const roleInfo = this.ROLE_HIERARCHY[roleName];
      if (roleInfo && roleInfo.inheritedPermissions.includes(permissionCode)) {
        // 检查角色条件
        if (roleInfo.conditions && context) {
          const conditionsMet = roleInfo.conditions.every(condition => 
            this.evaluateCondition(condition, context)
          );
          if (conditionsMet) {
            return true;
          }
        } else {
          return true;
        }
      }
      
      // 检查父角色权限
      if (roleInfo?.parent) {
        const parentRoleInfo = this.ROLE_HIERARCHY[roleInfo.parent];
        if (parentRoleInfo && parentRoleInfo.inheritedPermissions.includes(permissionCode)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 生成缓存键
   */
  private static generateCacheKey(user: User, config: PermissionCheckConfig): string {
    const keyData = {
      userId: user.id,
      permissions: user.permissions?.sort(),
      roles: user.roles.map(r => r.name).sort(),
      config: JSON.stringify(config, Object.keys(config).sort()),
      timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5分钟粒度
    };
    
    return btoa(JSON.stringify(keyData));
  }

  /**
   * 从缓存获取
   */
  private static getFromCache(key: string): PermissionCacheEntry | null {
    const entry = this.permissionCache.get(key);
    if (entry && Date.now() < entry.expiry) {
      entry.hitCount++;
      return entry;
    }
    
    // 清理过期条目
    if (entry) {
      this.permissionCache.delete(key);
    }
    
    return null;
  }

  /**
   * 添加到缓存
   */
  private static addToCache(
    key: string, 
    result: PermissionValidationResult, 
    timeout?: number
  ): void {
    // 检查缓存大小
    if (this.permissionCache.size >= this.CACHE_CONFIG.maxSize) {
      // 清理最少使用的条目
      const entries = Array.from(this.permissionCache.entries());
      entries.sort((a, b) => a[1].hitCount - b[1].hitCount);
      
      // 删除前25%的条目
      const deleteCount = Math.ceil(entries.length * 0.25);
      for (let i = 0; i < deleteCount; i++) {
        this.permissionCache.delete(entries[i][0]);
      }
    }

    this.permissionCache.set(key, {
      key,
      result,
      timestamp: Date.now(),
      expiry: Date.now() + (timeout || this.CACHE_CONFIG.defaultTimeout),
      hitCount: 0,
    });
  }

  /**
   * 清理过期缓存
   */
  static cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.permissionCache.entries()) {
      if (now >= entry.expiry) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * 记录审计日志
   */
  private static logAudit(
    action: 'check' | 'grant' | 'revoke' | 'expire',
    userId: string,
    permission: string,
    result: boolean,
    metadata: any
  ): void {
    const logEntry: PermissionAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      permission,
      action,
      result,
      context: metadata.context || {},
      timestamp: Date.now(),
      reason: metadata.result?.reason,
    };

    this.auditLogs.push(logEntry);
    
    // 保持日志在合理大小
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }

    // 触发监听器
    this.listeners.forEach(listener => {
      listener('audit', logEntry);
    });
  }

  /**
   * 获取审计日志
   */
  static getAuditLogs(
    userId?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): PermissionAuditLog[] {
    let logs = this.auditLogs;

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    if (startTime) {
      logs = logs.filter(log => log.timestamp >= startTime);
    }

    if (endTime) {
      logs = logs.filter(log => log.timestamp <= endTime);
    }

    if (limit) {
      logs = logs.slice(-limit);
    }

    return logs;
  }

  /**
   * 添加权限变化监听器
   */
  static addPermissionChangeListener(
    listener: (userId: string, changes: string[]) => void
  ): void {
    this.permissionChangeListeners.push(listener);
  }

  /**
   * 移除权限变化监听器
   */
  static removePermissionChangeListener(
    listener: (userId: string, changes: string[]) => void
  ): void {
    const index = this.permissionChangeListeners.indexOf(listener);
    if (index > -1) {
      this.permissionChangeListeners.splice(index, 1);
    }
  }

  /**
   * 触发权限变化事件
   */
  static notifyPermissionChange(userId: string, changes: string[]): void {
    this.permissionChangeListeners.forEach(listener => {
      listener(userId, changes);
    });
  }

  /**
   * 获取权限建议
   */
  static getPermissionSuggestions(
    user: User,
    currentContext?: PermissionContext
  ): {
    missing: string[];
    available: string[];
    recommended: string[];
  } {
    const allPermissions = Object.entries(this.RESOURCE_ACTION_MAP)
      .flatMap(([resource, actions]) => 
        actions.map(action => `${resource}:${action}`)
      );

    const userPermissions = this.getUserAllPermissions(user, currentContext);
    
    const missing = allPermissions.filter(p => !userPermissions.includes(p));
    const available = allPermissions.filter(p => userPermissions.includes(p));

    // 基于用户角色推荐权限
    const recommended = this.getRecommendedPermissions(user, currentContext);

    return {
      missing,
      available,
      recommended,
    };
  }

  /**
   * 获取推荐权限
   */
  private static getRecommendedPermissions(
    user: User,
    context?: PermissionContext
  ): string[] {
    const recommendations: string[] = [];
    
    // 基于当前角色推荐继承权限
    user.roles.forEach(role => {
      const roleInfo = this.ROLE_HIERARCHY[role.name];
      if (roleInfo?.parent) {
        const parentRoleInfo = this.ROLE_HIERARCHY[roleInfo.parent];
        if (parentRoleInfo) {
          recommendations.push(...parentRoleInfo.inheritedPermissions);
        }
      }
    });

    return [...new Set(recommendations)]; // 去重
  }

  // === 静态方法的便捷包装 ===

  /**
   * 简化的权限验证函数
   */
  static validateUserPermissionsSimple(
    user: User,
    config: PermissionCheckConfig
  ): PermissionValidationResult {
    return this.validateUserPermissions(user, {
      ...config,
      useCache: true,
      cacheTimeout: 30000, // 30秒缓存
    });
  }

  /**
   * 简化的权限检查函数
   */
  static hasPermissionSimple(
    user: User,
    resource: string,
    action: string,
    context?: PermissionContext
  ): boolean {
    return this.hasPermission(user, resource, action, context);
  }

  /**
   * 简化的角色检查函数
   */
  static hasRoleSimple(
    user: User,
    roleName: string,
    context?: PermissionContext
  ): boolean {
    return this.hasRole(user, roleName, context);
  }

  /**
   * 获取权限矩阵
   */
  static getUserPermissionMatrix(user: User, context?: PermissionContext): PermissionMatrix {
    const matrix: PermissionMatrix = {};
    const resources = Object.keys(this.RESOURCE_ACTION_MAP) as Array<keyof typeof this.RESOURCE_ACTION_MAP>;
    
    resources.forEach(resource => {
      matrix[resource] = {};
      
      this.RESOURCE_ACTION_MAP[resource].forEach(action => {
        matrix[resource][action] = this.hasPermission(user, resource, action, context);
      });
    });

    return matrix;
  }

  /**
   * 获取用户权限摘要
   */
  static getUserPermissionSummary(user: User, context?: PermissionContext): {
    totalPermissions: number;
    resources: string[];
    actions: string[];
    highestRole: string;
    canAccess: (resource: string) => boolean;
    permissionSuggestions: ReturnType<typeof AdvancedPermissionSystem.getPermissionSuggestions>;
  } {
    const allPermissions = this.getUserAllPermissions(user, context);
    const resources = new Set<string>();
    const actions = new Set<string>();
    
    allPermissions.forEach(permission => {
      const [resource, action] = permission.split(':');
      resources.add(resource);
      actions.add(action);
    });

    // 找到最高级别角色
    const highestRole = user.roles.reduce((highest, current) => {
      const highestLevel = this.ROLE_HIERARCHY[highest.name]?.level || 0;
      const currentLevel = this.ROLE_HIERARCHY[current.name]?.level || 0;
      return currentLevel > highestLevel ? current : highest;
    }, user.roles[0] || { name: 'None', level: 0 }).name;

    return {
      totalPermissions: allPermissions.length,
      resources: Array.from(resources),
      actions: Array.from(actions),
      highestRole,
      canAccess: (resource: string) => resources.has(resource),
      permissionSuggestions: this.getPermissionSuggestions(user, context),
    };
  }
}

// 启动缓存清理定时器
setInterval(() => {
  AdvancedPermissionSystem.cleanupCache();
}, AdvancedPermissionSystem['CACHE_CONFIG'].cleanupInterval);

// === 便捷导出函数 ===

/**
 * 简化的权限验证函数
 */
export const validateUserPermissions = (
  user: User,
  config: PermissionCheckConfig
): PermissionValidationResult => {
  return AdvancedPermissionSystem.validateUserPermissionsSimple(user, config);
};

/**
 * 简化的权限检查函数
 */
export const hasPermission = (
  user: User,
  resource: string,
  action: string,
  context?: PermissionContext
): boolean => {
  return AdvancedPermissionSystem.hasPermissionSimple(user, resource, action, context);
};

/**
 * 简化的角色检查函数
 */
export const hasRole = (
  user: User,
  roleName: string,
  context?: PermissionContext
): boolean => {
  return AdvancedPermissionSystem.hasRoleSimple(user, roleName, context);
};

/**
 * 获取权限矩阵
 */
export const getPermissionMatrix = (
  user: User,
  context?: PermissionContext
): PermissionMatrix => {
  return AdvancedPermissionSystem.getUserPermissionMatrix(user, context);
};

/**
 * 获取用户权限摘要
 */
export const getUserPermissionSummary = (
  user: User,
  context?: PermissionContext
) => {
  return AdvancedPermissionSystem.getUserPermissionSummary(user, context);
};

/**
 * 获取权限建议
 */
export const getPermissionSuggestions = (
  user: User,
  context?: PermissionContext
) => {
  return AdvancedPermissionSystem.getPermissionSuggestions(user, context);
};

/**
 * 获取审计日志
 */
export const getPermissionAuditLogs = (
  userId?: string,
  startTime?: number,
  endTime?: number,
  limit?: number
): PermissionAuditLog[] => {
  return AdvancedPermissionSystem.getAuditLogs(userId, startTime, endTime, limit);
};

/**
 * 添加权限变化监听器
 */
export const addPermissionChangeListener = (
  listener: (userId: string, changes: string[]) => void
): void => {
  AdvancedPermissionSystem.addPermissionChangeListener(listener);
};

export default AdvancedPermissionSystem;