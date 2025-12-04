// 未授权访问处理组件（基于RBAC权限系统）
// 基于货船智能机舱管理系统用户权限控制架构

import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionValidationResult } from '../utils/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  Lock, 
  Home, 
  LogIn, 
  RefreshCw, 
  User, 
  Shield, 
  Eye,
  Clock,
  ChevronRight,
  ArrowLeft,
  HelpCircle,
  Phone
} from 'lucide-react';

/**
 * 未授权访问处理组件配置接口
 */
export interface UnauthorizedPageConfig {
  // 显示配置
  showUserInfo?: boolean;                // 显示当前用户信息
  showRequiredPermissions?: boolean;     // 显示所需权限详情
  showContactSupport?: boolean;          // 显示联系支持选项
  showReturnHome?: boolean;              // 显示返回首页选项
  
  // 操作配置
  showLoginButton?: boolean;             // 显示登录按钮
  showRequestAccess?: boolean;           // 显示申请访问按钮
  showTryAgain?: boolean;                // 显示重试按钮
  
  // 内容配置
  customTitle?: string;                  // 自定义标题
  customDescription?: string;            // 自定义描述
  customMessage?: ReactNode;             // 自定义消息内容
  
  // 事件回调
  onRequestAccess?: () => void;          // 申请访问回调
  onContactSupport?: () => void;         // 联系支持回调
  onBackToPrevious?: () => void;         // 返回上一页回调
}

/**
 * 建议操作项接口
 */
export interface SuggestedAction {
  label: string;
  description: string;
  action: () => void;
  icon: any;
  variant: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  primary: boolean;
}

/**
 * 未授权访问处理组件Props
 */
export interface UnauthorizedPageProps {
  // 权限验证结果
  validationResult: PermissionValidationResult;
  
  // 配置选项
  config?: UnauthorizedPageConfig;
  
  // 样式
  className?: string;
  
  // 其他属性
  [key: string]: any;
}

/**
 * 未授权访问处理组件
 * 
 * 功能说明：
 * 1. 提供统一的未授权访问页面体验
 * 2. 显示详细的权限不足信息和用户指导
 * 3. 提供多种操作选项（登录、申请访问、联系支持等）
 * 4. 展示当前用户权限状态和所需权限对比
 * 5. 支持自定义内容和行为
 * 6. 集成导航和用户反馈功能
 * 
 * 使用示例：
 * ```tsx
 * <UnauthorizedPage
 *   validationResult={validationResult}
 *   config={{
 *     showUserInfo: true,
 *     showRequiredPermissions: true,
 *     customTitle: "访问受限",
 *     onContactSupport: () => console.log('联系支持')
 *   }}
 * />
 * ```
 */
export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  validationResult,
  config = {},
  className = '',
  ...props
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  const { user, roles, isAdmin, isOperator, isViewer } = usePermissions();
  
  // 默认配置
  const defaultConfig: UnauthorizedPageConfig = {
    showUserInfo: true,
    showRequiredPermissions: true,
    showContactSupport: false,
    showReturnHome: true,
    showLoginButton: !authStore.isAuthenticated,
    showRequestAccess: false,
    showTryAgain: true
  };
  
  // 合并配置
  const mergedConfig = { ...defaultConfig, ...config };
  
  /**
   * 获取当前用户角色显示信息
   */
  const getUserRoleInfo = () => {
    if (!user) return null;
    
    const roleMap = {
      'Administrator': { label: '管理员', color: 'bg-red-100 text-red-800', icon: Shield },
      'Operator': { label: '操作员', color: 'bg-blue-100 text-blue-800', icon: User },
      'Viewer': { label: '查看者', color: 'bg-green-100 text-green-800', icon: Eye }
    };
    
    const highestRole = user.roles.find(role => role.name in roleMap);
    if (!highestRole) return null;
    
    const roleInfo = roleMap[highestRole.name as keyof typeof roleMap];
    if (!roleInfo) return null;
    
    const IconComponent = roleInfo.icon;
    return {
      label: roleInfo.label,
      color: roleInfo.color,
      icon: IconComponent
    };
  };
  
  /**
   * 获取所需权限描述
   */
  const getRequiredPermissionsDescription = (): string => {
    if (!validationResult.missingPermissions && !validationResult.requiredRole) {
      return '没有明确说明所需的权限';
    }
    
    const descriptions: string[] = [];
    
    if (validationResult.requiredRole) {
      descriptions.push(`需要角色：${validationResult.requiredRole}`);
    }
    
    if (validationResult.missingPermissions) {
      const permissionDescriptions = validationResult.missingPermissions.map(permission => {
        const [resource, action] = permission.split(':');
        const resourceMap: Record<string, string> = {
          'system': '系统管理',
          'user': '用户管理',
          'equipment': '设备管理',
          'alarm': '告警管理',
          'report': '报告管理',
          'maintenance': '维护管理',
          'import': '数据导入',
          'threshold': '阈值配置',
          'monitoring': '监控管理',
          'health': '健康检查',
          'history': '历史数据'
        };
        
        const actionMap: Record<string, string> = {
          'read': '查看',
          'write': '编辑',
          'delete': '删除',
          'execute': '执行'
        };
        
        const resourceName = resourceMap[resource] || resource;
        const actionName = actionMap[action] || action;
        
        return `${resourceName}的${actionName}权限`;
      });
      
      descriptions.push(`缺少权限：${permissionDescriptions.join('、')}`);
    }
    
    return descriptions.join('；');
  };
  
  /**
   * 获取建议操作
   */
  const getSuggestedActions = (): SuggestedAction[] => {
    const actions: SuggestedAction[] = [];
    
    if (!authStore.isAuthenticated) {
      actions.push({
        label: '登录系统',
        description: '使用您的账户登录以获取相应权限',
        action: () => {
          const currentPath = location.pathname + location.search;
          sessionStorage.setItem('redirectAfterLogin', currentPath);
          navigate('/login');
        },
        icon: LogIn,
        variant: 'default',
        primary: true
      });
    }
    
    if (mergedConfig.showRequestAccess) {
      actions.push({
        label: '申请访问权限',
        description: '向管理员申请相应的访问权限',
        action: mergedConfig.onRequestAccess || (() => {}),
        icon: Shield,
        variant: 'outline',
        primary: false
      });
    }
    
    if (mergedConfig.showTryAgain) {
      actions.push({
        label: '重新检查权限',
        description: '可能您的权限已经更新，请重新尝试',
        action: () => window.location.reload(),
        icon: RefreshCw,
        variant: 'outline',
        primary: false
      });
    }
    
    actions.push({
      label: '返回上一页',
      description: '返回您之前访问的页面',
      action: mergedConfig.onBackToPrevious || (() => window.history.back()),
      icon: ArrowLeft,
      variant: 'ghost',
      primary: false
    });
    
    if (mergedConfig.showReturnHome) {
      actions.push({
        label: '返回首页',
        description: '回到系统主页面',
        action: () => navigate('/'),
        icon: Home,
        variant: 'ghost',
        primary: false
      });
    }
    
    return actions;
  };
  
  /**
   * 处理联系支持
   */
  const handleContactSupport = () => {
    if (mergedConfig.onContactSupport) {
      mergedConfig.onContactSupport();
    } else {
      // 默认行为：显示联系方式信息
      alert('请联系系统管理员获取帮助：\n邮箱：admin@cargoship.com\n电话：400-123-4567');
    }
  };
  
  // 获取用户角色信息
  const userRoleInfo = getUserRoleInfo();
  const userRoleIcon = userRoleInfo?.icon;
  const UserRoleIconComponent = userRoleIcon;
  
  // 获取建议操作
  const suggestedActions = getSuggestedActions();
  
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 ${className}`} {...props}>
      <Card className="w-full max-w-2xl shadow-lg border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          {/* 图标和状态 */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          
          {/* 标题和描述 */}
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold text-slate-900">
              {mergedConfig.customTitle || '访问被拒绝'}
            </CardTitle>
            <CardDescription className="text-base text-slate-600 max-w-md mx-auto">
              {mergedConfig.customDescription || 
                (validationResult.reason || '您没有权限访问此资源')}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 自定义消息 */}
          {mergedConfig.customMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {mergedConfig.customMessage}
            </div>
          )}
          
          {/* 错误信息详情 */}
          <Alert className="border-orange-200 bg-orange-50">
            <Lock className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>权限验证结果：</strong>
              <br />
              {validationResult.reason}
              {validationResult.validationTime && (
                <span className="text-sm text-orange-600 mt-1 block">
                  验证耗时：{validationResult.validationTime}ms
                </span>
              )}
            </AlertDescription>
          </Alert>
          
          {/* 用户信息部分 */}
          {mergedConfig.showUserInfo && user && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                当前用户信息
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">用户名</span>
                  <span className="text-sm font-medium text-slate-900">{user.username}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">用户角色</span>
                  <div className="flex items-center gap-2">
                    {userRoleInfo && UserRoleIconComponent && (
                      <Badge variant="secondary" className={userRoleInfo.color}>
                        <UserRoleIconComponent className="h-3 w-3 mr-1" />
                        {userRoleInfo.label}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {roles.length} 个角色
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">权限级别</span>
                  <div className="flex gap-1">
                    {isAdmin && <Badge className="bg-red-100 text-red-800">管理员</Badge>}
                    {isOperator && <Badge className="bg-blue-100 text-blue-800">操作员</Badge>}
                    {isViewer && <Badge className="bg-green-100 text-green-800">查看者</Badge>}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">最后登录</span>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '未知'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* 所需权限详情 */}
          {mergedConfig.showRequiredPermissions && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                权限要求详情
              </h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  {getRequiredPermissionsDescription()}
                </p>
                
                {validationResult.missingPermissions && (
                  <div className="mt-3">
                    <div className="text-xs text-amber-700 mb-2">缺少的具体权限：</div>
                    <div className="flex flex-wrap gap-1">
                      {validationResult.missingPermissions.map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-white">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 建议操作 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-700">
              建议操作
            </h3>
            <div className="grid gap-3">
              {suggestedActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant}
                  className={`justify-start h-auto p-4 ${
                    action.primary ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={action.action}
                >
                  <div className="flex items-start gap-3 text-left">
                    <action.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs opacity-75">{action.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
                  </div>
                </Button>
              ))}
            </div>
          </div>
          
          {/* 联系支持 */}
          {mergedConfig.showContactSupport && (
            <>
              <Separator />
              <div className="text-center space-y-3">
                <p className="text-sm text-slate-600">
                  需要进一步帮助？
                </p>
                <Button
                  variant="outline"
                  onClick={handleContactSupport}
                  className="inline-flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  联系技术支持
                </Button>
              </div>
            </>
          )}
          
          {/* 帮助信息 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>帮助信息：</strong></p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>权限变更可能需要几分钟才能生效</li>
                  <li>如果问题持续存在，请联系系统管理员</li>
                  <li>确保您的账户已激活且未被禁用</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * 便捷的未授权访问页面组件
 */

// 简化的未授权页面
export const SimpleUnauthorizedPage: React.FC<{
  message?: string;
  onBack?: () => void;
  showHome?: boolean;
}> = ({ message = '访问被拒绝', onBack, showHome = true }) => (
  <UnauthorizedPage
    validationResult={{
      granted: false,
      reason: message,
      validationTime: 0
    }}
    config={{
      showUserInfo: false,
      showRequiredPermissions: false,
      showContactSupport: false,
      showReturnHome: showHome,
      showRequestAccess: false,
      onBackToPrevious: onBack
    }}
  />
);

// 权限不足页面
export const PermissionDeniedPage: React.FC<{
  validationResult: PermissionValidationResult;
  onRequestAccess?: () => void;
}> = ({ validationResult, onRequestAccess }) => (
  <UnauthorizedPage
    validationResult={validationResult}
    config={{
      showUserInfo: true,
      showRequiredPermissions: true,
      showRequestAccess: !!onRequestAccess,
      onRequestAccess
    }}
  />
);

// 需要登录页面
export const LoginRequiredPage: React.FC<{
  message?: string;
  returnUrl?: string;
}> = ({ message = '请先登录以访问此功能', returnUrl }) => (
  <UnauthorizedPage
    validationResult={{
      granted: false,
      reason: message,
      validationTime: 0
    }}
    config={{
      showUserInfo: false,
      showRequiredPermissions: false,
      showLoginButton: true,
      customTitle: '需要登录',
      customDescription: message
    }}
  />
);

export default UnauthorizedPage;