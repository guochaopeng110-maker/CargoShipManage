// 路由权限守卫组件（基于ABAC权限系统，支持设备管理API集成）
// 基于货船智能机舱管理系统用户权限控制架构和设备功能

import React, { ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  usePermissions,
  PermissionCheckConfig,
  PermissionValidationResult,
  PermissionContext
} from '../hooks/usePermissions';
import { useAuthStore } from '../stores/auth-store';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  RefreshCw, 
  Lock, 
  AlertTriangle, 
  Shield, 
  Monitor, 
  Settings, 
  Users,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

/**
 * 设备访问被拒绝结果接口
 */
export interface DeviceAccessDeniedResult {
  deviceId: string;
  operation: string;
  reason: string;
}

/**
 * 扩展的权限验证结果接口
 */
export interface ExtendedPermissionValidationResult extends PermissionValidationResult {
  deviceAccessDenied?: DeviceAccessDeniedResult;
}

/**
 * 设备管理权限配置接口
 */
export interface DevicePermissionConfig {
  // 设备操作权限
  deviceId?: string;
  deviceType?: string;
  deviceLocation?: string;
  deviceStatus?: string[];
  
  // 操作类型
  operation?: 'view' | 'edit' | 'delete' | 'control' | 'configure' | 'maintenance';
  
  // 权限条件
  conditions?: {
    timeRange?: { start: string; end: string };
    maintenanceMode?: boolean;
    emergencyMode?: boolean;
    offlineMode?: boolean;
  };
}

/**
 * 增强的权限守卫配置接口
 */
export interface AuthGuardConfig {
  // 基础权限要求配置
  permission?: PermissionCheckConfig;
  
  // 设备管理权限配置
  devicePermission?: DevicePermissionConfig;
  
  // 组件配置
  fallback?: ReactNode;                    // 权限不足时的后备组件
  loadingComponent?: ReactNode;           // 加载中的组件
  unauthorizedComponent?: ReactNode;      // 未授权组件
  redirectTo?: string;                    // 权限不足时重定向路径
  
  // 行为配置
  showUnauthorizedPage?: boolean;         // 是否显示未授权页面
  showLoginPrompt?: boolean;              // 是否显示登录提示
  autoRedirect?: boolean;                 // 是否自动重定向
  showPermissionDetails?: boolean;        // 是否显示权限详情
  
  // 权限检查行为
  recheckOnPropsChange?: boolean;         // 属性变化时重新检查
  recheckOnStoreChange?: boolean;         // store变化时重新检查
  recheckOnDeviceChange?: boolean;        // 设备状态变化时重新检查
  
  // 事件回调
  onPermissionGranted?: () => void;
  onPermissionDenied?: (result: ExtendedPermissionValidationResult) => void;
  onLoginRequired?: () => void;
  onTokenExpired?: () => void;
  onDeviceAccessDenied?: (deviceId: string, reason: string) => void;
  onEmergencyAccess?: () => void;
}

/**
 * 权限守卫组件Props
 */
export interface AuthGuardProps {
  children: ReactNode;
  config?: AuthGuardConfig;
  className?: string;
  deviceContext?: {
    deviceId?: string;
    deviceType?: string;
    location?: string;
  };
}

/**
 * 权限守卫组件
 * 
 * 功能说明：
 * 1. 基于ABAC权限系统实现路由权限守卫
 * 2. 支持设备管理API集成和权限控制
 * 3. 提供多种权限验证模式（角色、权限、设备、操作等）
 * 4. 集成加载状态管理和错误处理
 * 5. 支持自动重定向和自定义后备组件
 * 6. 提供详细的权限验证结果反馈
 * 7. 支持设备级权限控制和安全策略
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  config = {},
  className = '',
  deviceContext
}) => {
  const location = useLocation();
  
  // 调试计数器
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current++;
  });
  
  // 默认配置
  const defaultConfig: AuthGuardConfig = {
    showUnauthorizedPage: true,
    showLoginPrompt: true,
    autoRedirect: true,
    showPermissionDetails: true,
    recheckOnPropsChange: true,
    recheckOnStoreChange: false,
    recheckOnDeviceChange: true
  };
  
  // 合并配置
  const mergedConfig = { ...defaultConfig, ...config };
  
  // 获取认证状态
  const authStore = useAuthStore();
  const {
    isAuthenticated,
    user,
    permissions,
    loading: authLoading
  } = authStore;
  
  // 权限验证Hook配置
  const permissionConfig = {
    cacheResults: true,
    enableAdvancedChecks: true,
    deviceContext: deviceContext,
    onPermissionGranted: mergedConfig.onPermissionGranted,
    onPermissionDenied: mergedConfig.onPermissionDenied,
    ...(mergedConfig.permission || {})
  };
  
  // 使用权限验证Hook
  const {
    validate,
    isAuthenticated: hasPermissionAuth,
    isLoading: permissionLoading,
    isAdmin,
    isOperator,
    isViewer,
    user: permissionUser
  } = usePermissions(permissionConfig);
  
  // 本地状态
  const [validationResult, setValidationResult] = useState<ExtendedPermissionValidationResult | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);
  const [deviceValidationResult, setDeviceValidationResult] = useState<{
    allowed: boolean;
    reason: string;
    restrictions?: string[];
  } | null>(null);
  
  // 设备权限验证函数（优化版本，避免循环依赖）
  const validateDeviceAccess = useCallback((
    deviceId: string,
    operation: string,
    context?: {
      deviceType?: string;
      location?: string;
      conditions?: any;
    }
  ): {
    allowed: boolean;
    reason: string;
    restrictions?: string[];
  } => {
    if (!user) {
      return { allowed: false, reason: '用户未登录' };
    }
    
    // 基础设备访问权限检查
    const devicePermission = `${deviceId}:${operation}`;
    const hasDeviceAccess = permissions.some(permission => 
      permission === devicePermission || permission === `${deviceId}:*` || permission.includes('*')
    );
    
    if (!hasDeviceAccess) {
      return { 
        allowed: false, 
        reason: `用户没有访问设备 ${deviceId} 的${operation}权限` 
      };
    }
    
    // 检查设备状态条件
    if (context?.conditions?.maintenanceMode) {
      if (!permissions.some(permission => permission.includes('maintenance'))) {
        return { 
          allowed: false, 
          reason: '设备处于维护模式，需要维护权限',
          restrictions: ['maintenance_permission_required']
        };
      }
    }
    
    return { 
      allowed: true, 
      reason: '设备访问权限验证通过' 
    };
  }, [user, permissions]);
  
  // 操作权限验证函数
  const validateOperation = useCallback((
    resource: string,
    operation: string,
    context?: any
  ): {
    allowed: boolean;
    reason: string;
    restrictions?: string[];
  } => {
    if (!user) {
      return { allowed: false, reason: '用户未登录' };
    }
    
    const hasOperationPermission = permissions.some(permission => {
      // 检查权限格式是否为 "resource:action"
      const [permResource, permAction] = permission.split(':');
      return permResource === resource && permAction === operation;
    });
    
    if (!hasOperationPermission) {
      return { 
        allowed: false, 
        reason: `用户没有${resource}的${operation}权限` 
      };
    }
    
    return { 
      allowed: true, 
      reason: `${resource}操作权限验证通过` 
    };
  }, [user, permissions]);
  
  // 执行综合权限验证（优化版本）
  const performValidation = useCallback(() => {
    if (!user) {
      const result: ExtendedPermissionValidationResult = {
        granted: false,
        reason: '用户未登录',
        validationTime: Date.now()
      };
      setValidationResult(result);
      return result;
    }
    
    try {
      // 基础权限验证
      const result = validate() as ExtendedPermissionValidationResult;
      
      // 如果配置了设备权限，进行设备级验证
      if (mergedConfig.devicePermission && deviceContext?.deviceId) {
        const deviceValidation = validateDeviceAccess(
          deviceContext.deviceId,
          mergedConfig.devicePermission.operation || 'view',
          {
            deviceType: mergedConfig.devicePermission.deviceType || deviceContext.deviceType,
            location: mergedConfig.devicePermission.deviceLocation || deviceContext.location,
            conditions: mergedConfig.devicePermission.conditions
          }
        );
        
        setDeviceValidationResult(deviceValidation);
        
        // 如果设备权限验证失败，更新基础验证结果
        if (!deviceValidation.allowed) {
          result.granted = false;
          result.reason = `设备访问被拒绝: ${deviceValidation.reason}`;
          result.deviceAccessDenied = {
            deviceId: deviceContext.deviceId,
            operation: mergedConfig.devicePermission.operation || 'view',
            reason: deviceValidation.reason
          };
          
          // 执行设备访问被拒绝的回调
          mergedConfig.onDeviceAccessDenied?.(deviceContext.deviceId, deviceValidation.reason);
        }
      }
      
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('权限验证过程中发生错误:', error);
      const errorResult: ExtendedPermissionValidationResult = {
        granted: false,
        reason: '权限验证失败',
        validationTime: Date.now()
      };
      setValidationResult(errorResult);
      return errorResult;
    }
  }, [
    user, 
    validate, 
    deviceContext, 
    mergedConfig, 
    validateDeviceAccess
  ]);
  
  // 重新检查权限
  const recheckPermissions = useCallback(async () => {
    if (!user) return;
    
    setIsRechecking(true);
    try {
      // 等待权限验证完成
      await new Promise(resolve => setTimeout(resolve, 100));
      performValidation();
    } finally {
      setIsRechecking(false);
    }
  }, [user, performValidation]);
  
  // 处理登录要求（优化版本）
  const handleLoginRequired = useCallback(() => {
    mergedConfig.onLoginRequired?.();
    
    // 自动重定向到登录页
    if (mergedConfig.autoRedirect !== false) {
      const currentPath = location.pathname + location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }
  }, [mergedConfig, location]);
  
  // 处理令牌过期
  const handleTokenExpired = useCallback(() => {
    mergedConfig.onTokenExpired?.();
    
    // 清理认证状态
    authStore.logout();
    
    // 重定向到登录页
    if (mergedConfig.autoRedirect !== false) {
      const currentPath = location.pathname + location.search;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
    }
  }, [mergedConfig, location, authStore]);
  
  // 处理紧急访问权限
  const handleEmergencyAccess = useCallback(() => {
    mergedConfig.onEmergencyAccess?.();
    
    // 记录紧急访问事件
    console.log('Emergency access requested:', {
      location: location.pathname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      userId: user?.id
    });
    
    // 这里可以集成实际的审计日志系统
    // authStore.recordSecurityEvent('emergency_access', { ... });
  }, [mergedConfig, location, user]);
  
  // 主要权限检查Effect（修复无限循环）
  useEffect(() => {
    if (authStore.isAuthenticated && user) {
      // 使用setTimeout避免同步执行导致的循环
      const timeoutId = setTimeout(() => {
        try {
          // 直接调用权限验证，避免通过performValidation的循环依赖
          if (!user) return;
          
          const result = validate() as ExtendedPermissionValidationResult;
          setValidationResult(result);
        } catch (error) {
          console.error('权限验证失败:', error);
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [authStore.isAuthenticated, user, validate]); // 移除performValidation依赖
  
  // 属性变化时重新检查权限（修复版本）
  useEffect(() => {
    if (mergedConfig.recheckOnPropsChange && user) {
      const timer = setTimeout(() => {
        // 直接调用权限验证，避免循环依赖
        try {
          const result = validate() as ExtendedPermissionValidationResult;
          setValidationResult(result);
        } catch (error) {
          console.error('权限重新验证失败:', error);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [mergedConfig.recheckOnPropsChange, user, validate]); // 移除performValidation依赖
  
  // Store变化时重新检查权限（修复版本）
  useEffect(() => {
    if (mergedConfig.recheckOnStoreChange) {
      const timer = setTimeout(() => {
        try {
          const result = validate() as ExtendedPermissionValidationResult;
          setValidationResult(result);
        } catch (error) {
          console.error('Store权限验证失败:', error);
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [mergedConfig.recheckOnStoreChange, validate]); // 移除performValidation依赖
  
  // 设备状态变化时重新检查权限（修复版本）
  useEffect(() => {
    if (mergedConfig.recheckOnDeviceChange && deviceContext?.deviceId) {
      const timer = setTimeout(() => {
        try {
          const result = validate() as ExtendedPermissionValidationResult;
          setValidationResult(result);
        } catch (error) {
          console.error('设备权限验证失败:', error);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [mergedConfig.recheckOnDeviceChange, deviceContext, validate]); // 移除performValidation依赖
  
  // 权限检查结果
  const isLoading = authLoading || permissionLoading;
  
  // 调试日志（仅在开发环境下输出，避免性能影响）
  if (process.env.NODE_ENV === 'development' && renderCountRef.current % 100 === 0) {
    console.log(`AuthGuard render #${renderCountRef.current}`, {
      user: user?.username,
      hasPermissionAuth,
      validationGranted: validationResult?.granted,
      renderCount: renderCountRef.current
    });
  }
  
  // 1. 认证加载中状态
  if (isLoading) {
    return mergedConfig.loadingComponent || (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              权限验证中
            </CardTitle>
            <CardDescription>
              正在验证用户权限和设备访问权限，请稍候...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 2. 未登录状态
  if (!hasPermissionAuth) {
    handleLoginRequired();
    
    // 检查是否已经在登录页，避免循环重定向
    const currentPath = location.pathname;
    const isLoginPage = currentPath === '/login' || currentPath === '/register';
    
    if (isLoginPage) {
      // 已经在登录页，不显示重定向组件，避免循环
      return null;
    }
    
    if (mergedConfig.showLoginPrompt) {
      return mergedConfig.fallback || (
        <div className={`flex items-center justify-center p-8 ${className}`}>
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Lock className="h-5 w-5" />
                需要登录
              </CardTitle>
              <CardDescription>
                请先登录以访问此功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    您的会话已过期或未进行身份验证
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={() => {
                    // 清理sessionStorage标记
                    sessionStorage.removeItem('sessionExpiredShown');
                    window.location.href = '/login';
                  }}
                  className="w-full"
                >
                  前往登录
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // 自动重定向到登录页
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // 3. 权限验证结果处理
  if (validationResult && !validationResult.granted) {
    // 执行权限被拒绝的回调
    mergedConfig.onPermissionDenied?.(validationResult);
    
    // 如果配置了重定向路径
    if (mergedConfig.redirectTo) {
      return <Navigate to={mergedConfig.redirectTo} replace />;
    }
    
    // 如果显示未授权页面
    if (mergedConfig.showUnauthorizedPage) {
      return mergedConfig.unauthorizedComponent || (
        <div className={`flex items-center justify-center p-8 ${className}`}>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                权限不足
              </CardTitle>
              <CardDescription>
                您没有访问此功能的权限
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">权限详情</TabsTrigger>
                  <TabsTrigger value="help">帮助信息</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {validationResult.reason}
                    </AlertDescription>
                  </Alert>
                  
                  {mergedConfig.showPermissionDetails && (
                    <div className="space-y-3">
                      {validationResult.missingPermissions && (
                        <div className="text-sm">
                          <strong className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            缺少权限：
                          </strong>
                          <div className="mt-2 space-y-1">
                            {validationResult.missingPermissions.map((permission, index) => (
                              <Badge key={index} variant="destructive" className="mr-1">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {validationResult.requiredRole && (
                        <div className="text-sm">
                          <strong className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            需要角色：
                          </strong>
                          <Badge variant="secondary" className="ml-2">
                            {validationResult.requiredRole}
                          </Badge>
                        </div>
                      )}
                      
                      {validationResult.deviceAccessDenied && (
                        <div className="text-sm">
                          <strong className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-orange-500" />
                            设备访问被拒绝：
                          </strong>
                          <div className="mt-2 p-3 bg-orange-50 rounded-lg">
                            <div className="text-sm">
                              <strong>设备ID：</strong>{validationResult.deviceAccessDenied.deviceId}
                            </div>
                            <div className="text-sm">
                              <strong>操作：</strong>{validationResult.deviceAccessDenied.operation}
                            </div>
                            <div className="text-sm">
                              <strong>原因：</strong>{validationResult.deviceAccessDenied.reason}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {deviceValidationResult && (
                        <div className="text-sm">
                          <strong className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-orange-500" />
                            设备权限验证：
                          </strong>
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {deviceValidationResult.allowed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className={deviceValidationResult.allowed ? 'text-green-700' : 'text-red-700'}>
                                {deviceValidationResult.reason}
                              </span>
                            </div>
                            {deviceValidationResult.restrictions && deviceValidationResult.restrictions.length > 0 && (
                              <div className="mt-2">
                                <strong>限制条件：</strong>
                                <ul className="mt-1 list-disc list-inside text-xs text-gray-600">
                                  {deviceValidationResult.restrictions.map((restriction, index) => (
                                    <li key={index}>{restriction}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="help" className="space-y-4">
                  <div className="text-sm space-y-3">
                    <div>
                      <strong>如何获得访问权限：</strong>
                      <ul className="mt-1 list-disc list-inside text-muted-foreground space-y-1">
                        <li>联系系统管理员分配所需权限</li>
                        <li>升级用户角色等级</li>
                        <li>如果是设备访问问题，请检查设备状态和维护模式</li>
                        <li>在紧急情况下，可申请临时访问权限</li>
                      </ul>
                    </div>
                    
                    <div>
                      <strong>当前用户信息：</strong>
                      <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                        <div>用户ID：{user?.id || 'N/A'}</div>
                        <div>角色：{user?.roles?.[0]?.name || 'N/A'}</div>
                        <div>用户名：{user?.username || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={recheckPermissions}
                      disabled={isRechecking}
                      className="flex-1"
                    >
                      {isRechecking && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                      重新检查
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.history.back()}
                      className="flex-1"
                    >
                      返回
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleEmergencyAccess}
                      className="flex-1"
                    >
                      紧急访问
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    // 返回自定义后备组件或null
    return mergedConfig.fallback || null;
  }
  
  // 4. 权限验证通过，渲染子组件
  return (
    <div className={className}>
      {children}
    </div>
  );
};

/**
 * 便捷的权限守卫组件
 */

// 管理员权限守卫
export const AdminGuard: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}> = ({ children, fallback, redirectTo }) => (
  <AuthGuard
    config={{
      permission: { role: 'administrator' }, // 使用小写角色名
      showUnauthorizedPage: true,
      fallback,
      redirectTo,
      autoRedirect: !redirectTo
    }}
  >
    {children}
  </AuthGuard>
);

// 操作员权限守卫
export const OperatorGuard: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}> = ({ children, fallback, redirectTo }) => (
  <AuthGuard
    config={{
      permission: { minRole: 'operator' }, // 使用小写角色名
      showUnauthorizedPage: true,
      fallback,
      redirectTo,
      autoRedirect: !redirectTo
    }}
  >
    {children}
  </AuthGuard>
);

// 查看者权限守卫
export const ViewerGuard: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}> = ({ children, fallback, redirectTo }) => (
  <AuthGuard
    config={{
      permission: { minRole: 'viewer' }, // 使用小写角色名
      showUnauthorizedPage: true,
      fallback,
      redirectTo,
      autoRedirect: !redirectTo
    }}
  >
    {children}
  </AuthGuard>
);

// 指定权限守卫
export const PermissionGuard: React.FC<{ 
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
  redirectTo?: string;
}> = ({ children, permission, fallback, redirectTo }) => (
  <AuthGuard
    config={{
      permission: { any: [permission] },
      showUnauthorizedPage: true,
      fallback,
      redirectTo,
      autoRedirect: !redirectTo
    }}
  >
    {children}
  </AuthGuard>
);

// 多个权限守卫（所有权限）
export const PermissionsGuard: React.FC<{ 
  children: ReactNode;
  permissions: string[];
  fallback?: ReactNode;
  redirectTo?: string;
}> = ({ children, permissions, fallback, redirectTo }) => (
  <AuthGuard
    config={{
      permission: { all: permissions },
      showUnauthorizedPage: true,
      fallback,
      redirectTo,
      autoRedirect: !redirectTo
    }}
  >
    {children}
  </AuthGuard>
);

// 多个权限守卫（任一权限）
export const AnyPermissionGuard: React.FC<{ 
  children: ReactNode;
  permissions: string[];
  fallback?: ReactNode;
  redirectTo?: string;
}> = ({ children, permissions, fallback, redirectTo }) => (
  <AuthGuard
    config={{
      permission: { any: permissions },
      showUnauthorizedPage: true,
      fallback,
      redirectTo,
      autoRedirect: !redirectTo
    }}
  >
    {children}
  </AuthGuard>
);

/**
 * 设备管理专用权限守卫组件
 */

// 设备访问守卫（更新版本）
export const DeviceAccessGuard: React.FC<{
  children: ReactNode;
  deviceId: string;
  operation?: 'view' | 'edit' | 'delete' | 'control' | 'configure' | 'maintenance';
  deviceType?: string;
  location?: string;
  fallback?: ReactNode;
}> = ({ 
  children, 
  deviceId, 
  operation = 'view', 
  deviceType, 
  location,
  fallback 
}) => (
  <AuthGuard
    deviceContext={{ deviceId, deviceType, location }}
    config={{
      devicePermission: {
        deviceId,
        operation,
        deviceType,
        deviceLocation: location
      },
      showUnauthorizedPage: true,
      fallback,
      recheckOnDeviceChange: true
    }}
  >
    {children}
  </AuthGuard>
);

// 新增传感器数据访问守卫
export const SensorDataGuard: React.FC<{
  children: ReactNode;
  operation?: 'create' | 'read' | 'update' | 'delete' | 'import' | 'export';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: { 
        any: [`sensor_data:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 新增报表管理守卫
export const ReportGuard: React.FC<{
  children: ReactNode;
  operation?: 'create' | 'read' | 'update' | 'delete' | 'export';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: { 
        any: [`report:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 新增角色管理守卫
export const RoleGuard: React.FC<{
  children: ReactNode;
  operation?: 'create' | 'read' | 'update' | 'delete';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: { 
        any: [`role:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 新增权限管理守卫
export const PermissionGuardComponent: React.FC<{
  children: ReactNode;
  operation?: 'create' | 'read' | 'update' | 'delete';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: { 
        any: [`permission:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 用户管理守卫（更新版本）
export const UserGuard: React.FC<{
  children: ReactNode;
  operation?: 'create' | 'read' | 'update' | 'delete';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: { 
        any: [`user:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 告警管理守卫（更新版本）
export const AlertGuard: React.FC<{
  children: ReactNode;
  operation?: 'create' | 'read' | 'update' | 'delete';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: { 
        any: [`alert:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 设备控制守卫
export const DeviceControlGuard: React.FC<{
  children: ReactNode;
  deviceId: string;
  deviceType?: string;
  location?: string;
  fallback?: ReactNode;
}> = ({ children, deviceId, deviceType, location, fallback }) => (
  <DeviceAccessGuard
    deviceId={deviceId}
    operation="control"
    deviceType={deviceType}
    location={location}
    fallback={fallback}
  >
    {children}
  </DeviceAccessGuard>
);

// 设备维护守卫
export const DeviceMaintenanceGuard: React.FC<{
  children: ReactNode;
  deviceId: string;
  deviceType?: string;
  location?: string;
  fallback?: ReactNode;
}> = ({ children, deviceId, deviceType, location, fallback }) => (
  <DeviceAccessGuard
    deviceId={deviceId}
    operation="maintenance"
    deviceType={deviceType}
    location={location}
    fallback={fallback}
  >
    {children}
  </DeviceAccessGuard>
);

// 设备配置守卫
export const DeviceConfigGuard: React.FC<{
  children: ReactNode;
  deviceId: string;
  deviceType?: string;
  location?: string;
  fallback?: ReactNode;
}> = ({ children, deviceId, deviceType, location, fallback }) => (
  <DeviceAccessGuard
    deviceId={deviceId}
    operation="configure"
    deviceType={deviceType}
    location={location}
    fallback={fallback}
  >
    {children}
  </DeviceAccessGuard>
);

// 导入记录权限守卫 - 新增组件
export const ImportRecordGuard: React.FC<{
  children: ReactNode;
  operation?: 'import' | 'read' | 'delete';
  fallback?: ReactNode;
}> = ({ children, operation = 'read', fallback }) => (
  <AuthGuard
    config={{
      permission: {
        any: [`sensor_data:${operation}`]
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 导入记录管理守卫 - 支持多个操作权限
export const ImportRecordsGuard: React.FC<{
  children: ReactNode;
  operations?: Array<'import' | 'read' | 'delete'>;
  fallback?: ReactNode;
}> = ({ children, operations = ['read'], fallback }) => (
  <AuthGuard
    config={{
      permission: {
        any: operations.map(op => `sensor_data:${op}`)
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 导入操作守卫 - 专门用于导入操作
export const ImportOperationGuard: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <AuthGuard
    config={{
      permission: {
        any: ['sensor_data:import']
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 导入查看守卫 - 专门用于查看导入记录
export const ImportViewGuard: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <AuthGuard
    config={{
      permission: {
        any: ['sensor_data:read']
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

// 导入删除守卫 - 专门用于删除导入记录（仅管理员）
export const ImportDeleteGuard: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <AuthGuard
    config={{
      permission: {
        any: ['sensor_data:delete']
      },
      showUnauthorizedPage: true,
      fallback,
    }}
  >
    {children}
  </AuthGuard>
);

export default AuthGuard;