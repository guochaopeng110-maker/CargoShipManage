/**
 * 货船智能机舱管理系统 - 认证状态管理
 * 
 * 基于Zustand的简化认证状态管理
 * 与后端Auth模块API完全一致
 * 
 * 后端API文档: docs/refer/api/auth-api.md
 */

// 导入Zustand状态管理库
import { create } from 'zustand';

// 导入认证相关的类型定义
import { 
  AuthState, 
  User, 
  Role,
  Permission,
  AuthError,
  LoginRequest
} from '../types/auth';

// 导入认证服务
import { authService } from '../services/auth-service';

/**
 * 简化的认证状态管理接口
 * 基于后端API设计，移除过度复杂的功能
 */
interface SimplifiedAuthStore extends Omit<AuthState, 'refreshToken'> {
  // === 核心认证方法 ===
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  register: (userData: any) => Promise<any>;
  
  // === 权限验证 ===
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  canUserManage: () => boolean;     // 简化权限检查
  
  // === 用户管理 ===
  getCurrentUser: () => User | null;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  
  // === 状态管理 ===
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetAuthState: () => void;
  
  // === 工具方法 ===
  isTokenExpiring: () => boolean;   // 简化的令牌检查
}

/**
 * 认证Store实现
 * 简化的认证状态管理，专注于核心功能
 */
export const useAuthStore = create<SimplifiedAuthStore>((set, get) => ({
  // === 初始状态 ===
  isAuthenticated: false,
  user: null,
  permissions: [],
  roles: [],
  loading: false,
  error: null,
  accessToken: null,
  refreshToken: null,
  retryCount: 0,

  /**
   * 用户登录
   * 基于后端 /auth/login API
   */
  login: async (username: string, password: string) => {
    const { retryCount } = get();
    
    // 检查账户锁定（与后端5次失败锁定机制一致）
    if (retryCount >= 5) {
      throw new Error('账户已被锁定，请30分钟后再试');
    }
    
    set({ loading: true, error: null });
    
    try {
      const response = await authService.login({ username, password });
      
      // 设置令牌
      authService.setTokens(response.accessToken, response.refreshToken);
      
      set({
        isAuthenticated: true,
        user: response.user,
        permissions: response.user.permissions || [],
        roles: response.user.roles,
        accessToken: response.accessToken,
        // refreshToken: response.refreshToken, // 移除直接引用，使用authService管理
        loading: false,
        retryCount: 0
      });
      
    } catch (error) {
      const newRetryCount = retryCount + 1;
      set({
        loading: false,
        error: error instanceof Error ? error.message : '登录失败',
        retryCount: newRetryCount
      });
      throw error;
    }
  },

  /**
   * 用户登出
   * 基于后端 /auth/logout API
   */
  logout: async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // 清理本地状态
      authService.clearAuthData();
      get().resetAuthState();
    }
  },

  /**
   * 令牌刷新
   * 基于后端 /auth/refresh API
   */
  refreshAccessToken: async () => {
    const refreshToken = authService.getRefreshToken();
    if (!refreshToken) return;
    
    try {
      const response = await authService.refreshToken();
      set({ accessToken: response.accessToken });
    } catch (error) {
      // 刷新失败，重新登录
      get().logout();
      throw error;
    }
  },

  /**
   * 用户注册
   * 基于后端 /auth/register API
   */
  register: async (userData: any) => {
    set({ loading: true, error: null });
    
    try {
      const response = await authService.register(userData);
      set({ loading: false, error: null });
      return response;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '注册失败'
      });
      throw error;
    }
  },

  /**
   * 权限检查
   * 基于后端权限格式
   * 支持两种调用方式：
   * 1. hasPermission('user:update') - 传入完整权限字符串
   * 2. hasPermission('user', 'update') - 分别传入资源和操作
   */
  hasPermission: (resourceOrPermission: string, action?: string) => {
    const { permissions } = get();
    
    // 如果提供了action参数，则组合成完整权限字符串
    if (action !== undefined) {
      const permission = `${resourceOrPermission}:${action}`;
      return permissions.includes(permission);
    }
    
    // 否则直接检查权限字符串
    return permissions.includes(resourceOrPermission);
  },

  /**
   * 角色检查
   * 基于后端角色枚举
   */
  hasRole: (roleName: string) => {
    const { roles } = get();
    return roles.some(role => role.name === roleName);
  },

  /**
   * 简化的管理员权限检查
   */
  canUserManage: () => {
    return get().hasRole('administrator');
  },

  /**
   * 获取当前用户
   */
  getCurrentUser: () => get().user,

  /**
   * 更新用户资料
   * 基于后端 /auth/users/:id API
   */
  updateProfile: async (userData: Partial<User>) => {
    const { user } = get();
    if (!user) throw new Error('用户未登录');

    set({ loading: true, error: null });

    try {
      const updatedUser = await authService.updateUser(user.id, userData);
      set({
        user: updatedUser,
        loading: false,
        error: null
      });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '更新用户信息失败'
      });
      throw error;
    }
  },

  /**
   * 修改密码
   * 基于后端 /auth/change-password API
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    set({ loading: true, error: null });

    try {
      await authService.changePassword(oldPassword, newPassword);
      set({ loading: false, error: null });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '修改密码失败'
      });
      throw error;
    }
  },

  /**
   * 设置加载状态
   */
  setLoading: (loading: boolean) => {
    set({ loading });
  },

  /**
   * 设置错误信息
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 重置认证状态
   */
  resetAuthState: () => {
    set({
      isAuthenticated: false,
      user: null,
      permissions: [],
      roles: [],
      accessToken: null,
      // refreshToken: null, // 移除直接引用
      loading: false,
      error: null,
      retryCount: 0
    });
  },

  /**
   * 检查令牌是否即将过期
   */
  isTokenExpiring: () => {
    const { accessToken } = get();
    if (!accessToken) return false;
    
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      return Date.now() > expiryTime - (5 * 60 * 1000); // 5分钟前认为需要刷新
    } catch {
      return true;
    }
  },
}));

/**
 * 便捷的认证Hook
 * 提供常用操作的快捷方法
 */
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    // === 基础状态 ===
    ...store,
    
    // === 便捷的角色检查方法 ===
    isAdmin: store.hasRole('administrator'),
    isOperator: store.hasRole('operator'),
    isViewer: store.hasRole('viewer'),
    
    // === 便捷的权限检查方法 ===
    canReadUsers: store.hasPermission('user:read'),
    canCreateUsers: store.hasPermission('user:create'),
    canUpdateUsers: store.hasPermission('user:update'),
    canDeleteUsers: store.hasPermission('user:delete'),
    
    // === 会话状态 ===
    isSessionExpiringSoon: store.isTokenExpiring,
  };
};

/**
 * 权限验证Hook
 * 用于组件级别的权限控制
 */
export const usePermissions = () => {
  const { hasPermission, hasRole, canUserManage } = useAuthStore();
  
  return {
    hasPermission,
    hasRole,
    canUserManage,
    
    // 便捷方法
    canReadUsers: hasPermission('user:read'),
    canCreateUsers: hasPermission('user:create'),
    canUpdateUsers: hasPermission('user:update'),
    canDeleteUsers: hasPermission('user:delete'),
    
    // 角色检查
    isAdmin: hasRole('administrator'),
    isOperator: hasRole('operator'),
    isViewer: hasRole('viewer'),
  };
};

/**
 * 自动设置令牌刷新机制
 */
authService.setupTokenRefresh();

/**
 * 网络状态监听
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // 网络恢复时尝试初始化
    useAuthStore.getState().refreshAccessToken();
  });
  
  window.addEventListener('offline', () => {
    // 网络断开时的处理
    useAuthStore.getState().setError('网络连接已断开');
  });
}