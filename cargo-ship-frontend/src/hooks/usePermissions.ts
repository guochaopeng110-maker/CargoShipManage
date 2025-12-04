// 权限验证Hook（基于RBAC权限系统）
// 基于货船智能机舱管理系统用户权限控制架构

import { useState, useEffect, useCallback } from 'react';
import { User, Role, Permission } from '../types/auth';
import { useAuthStore } from '../stores/auth-store';

/**
 * 权限验证Hook配置接口
 */
export interface UsePermissionsConfig {
  // 权限要求配置
  any?: string[];          // 任一权限即可
  all?: string[];          // 需要所有权限
  role?: string;           // 指定角色
  minRole?: string;        // 最小角色级别
  
  // 缓存配置
  cacheResults?: boolean;  // 是否缓存验证结果
  
  // 事件回调
  onPermissionGranted?: () => void;
  onPermissionDenied?: (result?: any) => void; // 修改为可选参数
  onTokenRefresh?: (token: string) => void;
  onTokenExpire?: () => void;
}

/**
 * 权限验证Hook返回值
 */
export interface UsePermissionsReturn {
  // 权限检查结果
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  validate: () => { granted: boolean; reason: string };
  
  // 权限状态
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  
  // 用户信息
  user: User | null;
  roles: Role[];
  permissions: Permission[];
  
  // 操作方法
  refreshPermission: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearCache: () => void;
}

/**
 * 权限检查器类型
 *
 * 提供权限检查功能的接口定义
 */
export type PermissionChecker = {
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  validate: () => { granted: boolean; reason: string };
  refreshPermission: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearCache: () => void;
};

/**
 * 简化的权限验证Hook
 */
export const usePermissions = (config: UsePermissionsConfig = {}): UsePermissionsReturn => {
  // 获取认证状态
  const authStore = useAuthStore();
  
  // 本地状态
  const [isLoading, setIsLoading] = useState(false);

  // 从认证store获取状态
  const {
    isAuthenticated,
    user,
    permissions,
    roles,
    hasPermission: storeHasPermission,
    hasRole: storeHasRole,
  } = authStore;

  /**
   * 单个权限检查
   */
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!user) return false;
    
    // 直接使用完整权限字符串格式
    const permission = `${resource}:${action}`;
    return storeHasPermission(permission);
  }, [user, storeHasPermission]);

  /**
   * 角色检查
   */
  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    
    return storeHasRole(roleName);
  }, [user, storeHasRole]);

  /**
   * 任一权限检查
   */
  const hasAnyPermission = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    
    return permissionList.some(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    });
  }, [user, hasPermission]);

  /**
   * 所有权限检查
   */
  const hasAllPermissions = useCallback((permissionList: string[]): boolean => {
    if (!user) return false;
    
    return permissionList.every(permission => {
      const [resource, action] = permission.split(':');
      return hasPermission(resource, action);
    });
  }, [user, hasPermission]);

  /**
   * 清除缓存（简化版本）
   */
  const clearCache = useCallback(() => {
    // 简化的缓存清除，实际实现可能需要更复杂的缓存管理
  }, []);

  /**
   * 便捷权限检查
   */
  const isAdmin = hasRole('administrator');        // 使用小写角色名
  const isOperator = hasRole('operator');          // 使用小写角色名
  const isViewer = hasRole('viewer');              // 使用小写角色名

  /**
   * 刷新权限验证（简化版本）
   */
  const refreshPermission = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // 简化的权限刷新 - 实际实现可能需要重新获取用户信息
      clearCache();
    } catch (error) {
      console.error('Failed to refresh permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, clearCache]);

  /**
   * 刷新令牌（简化版本）
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      // 简化的令牌刷新
      config.onTokenRefresh?.('refreshed');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      config.onTokenExpire?.();
    }
  }, [config]);

  /**
   * 简化的综合权限验证
   */
  const validate = useCallback(() => {
    if (!user) {
      return {
        granted: false,
        reason: '用户未登录'
      };
    }
    
    return {
      granted: true,
      reason: '权限验证通过'
    };
  }, [user]);

  return {
    // 权限检查
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    validate,
    
    // 状态
    isLoading,
    isAuthenticated,
    isAdmin,
    isOperator,
    isViewer,
    
    // 用户信息
    user,
    roles,
    permissions,
    
    // 操作方法
    refreshPermission,
    refreshToken,
    clearCache,
  };
};

/**
 * 权限检查Hook的便捷版本
 */
export const usePermission = (resource: string, action: string): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(resource, action);
};

/**
 * 角色检查Hook的便捷版本
 */
export const useRole = (roleName: string): boolean => {
  const { hasRole } = usePermissions();
  return hasRole(roleName);
};

/**
 * 管理员权限检查
 */
export const useIsAdmin = (): boolean => {
  const { isAdmin } = usePermissions();
  return isAdmin;
};

/**
 * 操作员权限检查
 */
export const useIsOperator = (): boolean => {
  const { isOperator } = usePermissions();
  return isOperator;
};

/**
 * 组件权限守卫Hook
 */
export const usePermissionGuard = (config: UsePermissionsConfig): boolean => {
  const { hasPermission, hasRole, hasAnyPermission, hasAllPermissions, isAuthenticated } = usePermissions();
  
  if (!isAuthenticated) {
    return false;
  }
  
  // 简化的权限检查
  if (config.any) {
    return hasAnyPermission(config.any);
  }
  
  if (config.all) {
    return hasAllPermissions(config.all);
  }
  
  if (config.role) {
    return hasRole(config.role);
  }
  
  return true;
};

export default usePermissions;