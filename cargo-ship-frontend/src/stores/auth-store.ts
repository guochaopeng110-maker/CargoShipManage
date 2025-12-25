/**
 * 货船智能机舱管理系统 - 认证状态管理
 *
 * 职责：
 * 1. 管理用户登录状态、Token 和用户信息
 * 2. 管理用户列表和用户CRUD操作（合并自 user-store）
 * 3. 封装认证相关的 API 调用（直接使用后端 API 客户端）
 * 4. 提供权限检查和角色验证逻辑
 * 5. Token 生命周期管理（存储、刷新、过期检查）
 *
 * 架构：
 * - State: 纯数据状态 (isAuthenticated, user, roles, users...)
 * - Actions: 业务逻辑 (login, logout, fetchUsers, createUser...)
 *
 * 重构说明：
 * - 删除了对 auth-service.ts 的依赖
 * - 直接使用 AuthService from '@/services/api'
 * - 合并了 user-store.ts 的用户管理功能
 *
 * 后端API文档: docs/data/http-api.json
 */

import { create } from 'zustand';

// 从后端 API 客户端导入类型和服务
import {
  User,
  AuthService,
  LoginDto,
  RegisterDto,
  CreateUserDto,
  UpdateUserDto,
  OpenAPI
} from '@/services/api';

// 导入日志工具
import { Logger } from '../utils/logger';
import { ROLES } from '../config/permissions';

// ==========================================
// 辅助函数
// ==========================================

/**
 * 从用户角色中提取所有权限
 * @param user 用户对象
 * @returns 权限名称数组
 */
function extractPermissionsFromUser(user: User): string[] {
  if (!user.roles || user.roles.length === 0) {
    return [];
  }

  // 从所有角色中提取权限并去重
  const permissionsSet = new Set<string>();
  user.roles.forEach(role => {
    if (role.permissions && Array.isArray(role.permissions)) {
      role.permissions.forEach(permission => {
        permissionsSet.add(permission.name);
      });
    }
  });

  // 如果后端没有返回权限列表，从用户权限中提取
  // 若没有收集到任何权限，回退到直接读取 user.permissions
  if (permissionsSet.size === 0 && Array.isArray((user as any).permissions)) {
    (user as any).permissions.forEach((p: string) => permissionsSet.add(p));
  }

  return Array.from(permissionsSet);
}

// ==========================================
// 类型定义
// ==========================================

/** 认证响应接口 */
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Token 刷新响应接口 */
interface TokenRefreshResponse {
  accessToken: string;
}

/** 本地存储键名 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
};

/** Token 过期缓冲时间（5分钟） */
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

// ==========================================
// State 定义 (数据)
// ==========================================
interface AuthStoreState {
  // === 认证状态 ===
  /** 是否已认证 */
  isAuthenticated: boolean;

  /** 当前用户信息 */
  user: User | null;

  /** 用户权限列表 */
  permissions: string[];

  /** 用户角色列表 */
  roles: any[];

  /** 访问令牌 */
  accessToken: string | null;

  /** 刷新令牌 */
  refreshToken: string | null;

  /** 加载状态 */
  loading: boolean;

  /** 错误信息 */
  error: string | null;

  /** 登录重试次数 */
  retryCount: number;

  // === 用户列表管理状态（合并自 user-store） ===
  /** 用户列表 */
  users: User[];

  /** 选中的用户 */
  selectedUser: User | null;

  /** 用户列表加载状态 */
  usersLoading: boolean;

  /** 用户列表错误信息 */
  usersError: string | null;

  /** 总用户数 */
  total: number;

  /** 当前页码 */
  page: number;

  /** 每页数量 */
  pageSize: number;

  /** Token自动刷新定时器 */
  tokenRefreshInterval: NodeJS.Timeout | null;
}

// ==========================================
// Actions 定义 (行为)
// ==========================================
interface AuthStoreActions {
  // === 核心认证方法 ===

  /** 登录 */
  login: (username: string, password: string) => Promise<void>;

  /** 登出 */
  logout: () => Promise<void>;

  /** 刷新访问令牌 */
  refreshAccessToken: () => Promise<void>;

  /** 注册用户 */
  register: (userData: RegisterDto) => Promise<any>;

  // === Token 管理方法 ===

  /** 设置 Token */
  setTokens: (accessToken: string, refreshToken: string | null) => void;

  /** 获取访问令牌 */
  getAccessToken: () => string | null;

  /** 获取刷新令牌 */
  getRefreshToken: () => string | null;

  /** 解析 JWT */
  parseJWT: (token: string) => any;

  /** 检查 Token 是否即将过期 */
  isTokenExpiring: () => boolean;

  /** 设置自动 Token 刷新 */
  setupTokenRefresh: () => void;

  /** 清除认证数据 */
  clearAuthData: () => void;

  // === 用户信息管理 ===

  /** 获取当前用户 */
  getCurrentUser: () => User | null;

  /** 刷新当前用户信息 */
  refreshCurrentUser: () => Promise<void>;

  /** 更新个人资料 */
  updateProfile: (userData: Partial<User>) => Promise<void>;

  /** 修改密码 */
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

  // === 用户列表管理方法（合并自 user-store） ===

  /** 获取用户列表 */
  fetchUsers: (page?: number, pageSize?: number) => Promise<void>;

  /** 根据 ID 获取用户 */
  fetchUserById: (userId: string) => Promise<User>;

  /** 创建用户 */
  createUser: (userData: CreateUserDto) => Promise<User>;

  /** 更新用户 */
  updateUser: (userId: string, userData: UpdateUserDto) => Promise<User>;

  /** 删除用户 */
  deleteUser: (userId: string) => Promise<void>;

  /** 设置选中用户 */
  setSelectedUser: (user: User | null) => void;

  // === 权限验证 ===

  /** 检查权限 */
  hasPermission: (resourceOrPermission: string, action?: string) => boolean;

  /** 检查角色 */
  hasRole: (roleName: string) => boolean;

  /** 检查是否为管理员 */
  canUserManage: () => boolean;

  // === 状态管理 ===

  /** 设置加载状态 */
  setLoading: (loading: boolean) => void;

  /** 设置错误信息 */
  setError: (error: string | null) => void;

  /** 清除错误 */
  clearError: () => void;

  /** 重置所有状态 */
  resetAuthState: () => void;
}

// 合并类型
export type AuthStore = AuthStoreState & AuthStoreActions;

/**
 * 认证 Store
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // --- 初始 State ---
  isAuthenticated: false,
  user: null,
  permissions: [],
  roles: [],
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  retryCount: 0,

  // 用户列表管理状态
  users: [],
  selectedUser: null,
  usersLoading: false,
  usersError: null,
  total: 0,
  page: 1,
  pageSize: 20,

  // Token自动刷新定时器
  tokenRefreshInterval: null,

  // --- Token 管理方法实现 ---

  /**
   * 设置访问令牌和刷新令牌
   * 将令牌存储到 localStorage 和 OpenAPI 配置中
   */
  setTokens: (accessToken: string, refreshToken: string | null) => {
    // 存储到 localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    // 更新 OpenAPI 配置
    OpenAPI.TOKEN = accessToken;

    // 更新 Store 状态
    set({ accessToken, refreshToken: refreshToken || get().refreshToken });

    Logger.info('Token 已设置并存储');
  },

  /**
   * 获取访问令牌
   */
  getAccessToken: () => {
    const token = get().accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return token;
  },

  /**
   * 获取刷新令牌
   */
  getRefreshToken: () => {
    const token = get().refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    return token;
  },

  /**
   * 解析 JWT 令牌
   */
  parseJWT: (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      const payload = parts[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (error) {
      Logger.error('JWT 解析失败:', error);
      return null;
    }
  },

  /**
   * 检查 Token 是否即将过期
   */
  isTokenExpiring: () => {
    const token = get().getAccessToken();
    if (!token) return true;

    try {
      const payload = get().parseJWT(token);
      if (!payload || !payload.exp) return true;

      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();

      return (expiryTime - currentTime) <= TOKEN_EXPIRY_BUFFER;
    } catch {
      return true;
    }
  },

  /**
   * 设置自动 Token 刷新机制
   * 每分钟检查一次，Token 即将过期时自动刷新
   */
  setupTokenRefresh: () => {
    if (!get().isAuthenticated) return;

    // 清理现有的定时器
    const existingInterval = get().tokenRefreshInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const refreshInterval = setInterval(async () => {
      try {
        if (get().isTokenExpiring()) {
          Logger.info('Token 即将过期，开始自动刷新');
          await get().refreshAccessToken();
          Logger.info('Token 自动刷新成功');
        }
      } catch (error) {
        Logger.error('Token 自动刷新失败:', error);
        // 刷新失败时，强制登出
        get().logout();
      }
    }, 60 * 1000); // 每分钟执行一次

    // 存储定时器到state中
    set({ tokenRefreshInterval: refreshInterval });

    Logger.info('Token 自动刷新定时器已设置');
  },

  /**
   * 清除所有认证数据
   */
  clearAuthData: () => {
    // 清除 localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // 清除 OpenAPI 配置
    OpenAPI.TOKEN = undefined;

    Logger.info('认证数据已清除');
  },

  // --- 核心认证方法实现 ---

  /**
   * 用户登录
   * 调用后端 API 获取 Token 和用户信息
   */
  login: async (username: string, password: string) => {
    const { retryCount } = get();

    // 检查账户锁定（与后端5次失败锁定机制一致）
    if (retryCount >= 5) {
      throw new Error('账户已被锁定，请30分钟后再试');
    }

    set({ loading: true, error: null });

    try {
      Logger.info('用户登录开始');

      // 调用后端 API
      const response = await AuthService.authControllerLogin({
        username,
        password,
      } as LoginDto);

      const authResponse = response as unknown as AuthResponse;

      // 存储 Token
      get().setTokens(authResponse.accessToken, authResponse.refreshToken);

      // 存储用户信息
      console.log('用户登录成功，用户信息:', authResponse.user);
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(authResponse.user));

      // 更新 Store State
      set({
        isAuthenticated: true,
        user: authResponse.user,
        permissions: extractPermissionsFromUser(authResponse.user),
        roles: authResponse.user.roles,
        loading: false,
        retryCount: 0,
        error: null,
      });

      // 设置自动刷新
      get().setupTokenRefresh();

      Logger.info('用户登录成功');
    } catch (error) {
      const newRetryCount = retryCount + 1;
      const errorMessage = error instanceof Error ? error.message : '登录失败';

      set({
        loading: false,
        error: errorMessage,
        retryCount: newRetryCount,
      });

      Logger.error('登录失败:', error);
      throw error;
    }
  },

  /**
   * 用户登出
   * 清除本地存储并通知后端
   */
  logout: async () => {
    try {
      Logger.info('用户登出开始');

      // 尝试调用后端 API
      await AuthService.authControllerLogout();

      Logger.info('后端登出成功');
    } catch (error) {
      Logger.warn('后端登出失败，继续清理本地数据:', error);
    } finally {
      // 清理Token刷新定时器
      const refreshInterval = get().tokenRefreshInterval;
      if (refreshInterval) {
        clearInterval(refreshInterval);
        set({ tokenRefreshInterval: null });
        Logger.info('Token 自动刷新定时器已清理');
      }

      // 清理本地数据
      get().clearAuthData();
      get().resetAuthState();

      Logger.info('用户登出完成');
    }
  },

  /**
   * 刷新访问令牌
   */
  refreshAccessToken: async () => {
    const refreshToken = get().getRefreshToken();
    if (!refreshToken) {
      throw new Error('没有刷新令牌');
    }

    try {
      Logger.info('开始刷新访问令牌');

      // 调用后端 API
      const response = await AuthService.authControllerRefresh({
        refreshToken,
      });

      const tokenResponse = response as unknown as TokenRefreshResponse;

      // 更新访问令牌
      get().setTokens(tokenResponse.accessToken, null);

      Logger.info('访问令牌刷新成功');
    } catch (error) {
      Logger.error('令牌刷新失败:', error);

      // 刷新失败，强制登出
      get().clearAuthData();
      get().resetAuthState();

      throw error;
    }
  },

  /**
   * 注册新用户
   */
  register: async (userData: RegisterDto) => {
    set({ loading: true, error: null });

    try {
      Logger.info('用户注册开始');

      const response = await AuthService.authControllerRegister(userData);

      set({ loading: false, error: null });

      Logger.info('用户注册成功');
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败';

      set({
        loading: false,
        error: errorMessage,
      });

      Logger.error('注册失败:', error);
      throw error;
    }
  },

  // --- 用户信息管理实现 ---

  /**
   * 获取当前用户
   */
  getCurrentUser: () => get().user,

  /**
   * 刷新当前用户信息
   * 从后端获取最新的用户数据
   */
  refreshCurrentUser: async () => {
    try {
      Logger.info('刷新当前用户信息');

      const user = await AuthService.authControllerGetProfile();

      // 更新本地存储
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));

      // 更新 Store 状态
      set({
        user,
        permissions: extractPermissionsFromUser(user),
        roles: user.roles,
      });

      Logger.info('用户信息刷新成功');
    } catch (error) {
      Logger.error('刷新用户信息失败:', error);
      throw error;
    }
  },

  /**
   * 更新个人资料
   */
  updateProfile: async (userData: Partial<User>) => {
    const { user } = get();
    if (!user) throw new Error('用户未登录');

    set({ loading: true, error: null });

    try {
      Logger.info('更新个人资料');

      const updatedUser = await AuthService.authControllerUpdateUser(
        user.id,
        userData as UpdateUserDto
      );

      // 更新本地存储
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(updatedUser));

      set({
        user: updatedUser,
        permissions: extractPermissionsFromUser(updatedUser),
        roles: updatedUser.roles,
        loading: false,
        error: null,
      });

      Logger.info('个人资料更新成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新用户信息失败';

      set({
        loading: false,
        error: errorMessage,
      });

      Logger.error('更新个人资料失败:', error);
      throw error;
    }
  },

  /**
   * 修改密码
   */
  changePassword: async (oldPassword: string, newPassword: string) => {
    set({ loading: true, error: null });

    try {
      Logger.info('修改密码');

      await AuthService.authControllerChangePassword({
        oldPassword,
        newPassword,
      });

      set({ loading: false, error: null });

      Logger.info('密码修改成功');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '修改密码失败';

      set({
        loading: false,
        error: errorMessage,
      });

      Logger.error('修改密码失败:', error);
      throw error;
    }
  },

  // --- 用户列表管理方法实现（合并自 user-store） ---

  /**
   * 获取用户列表
   * 管理员功能
   */
  fetchUsers: async (page = 1, pageSize = 20) => {
    set({ usersLoading: true, usersError: null });

    try {
      Logger.info(`获取用户列表: page=${page}, pageSize=${pageSize}`);

      // 调用后端 API，显式传递分页参数
      const response = await AuthService.authControllerFindAllUsers(page, pageSize);

      // 调试详情：检查响应结构
      Logger.debug('用户列表响应原始数据:', response);

      // 兼容处理：检查是否存在 .data 包装
      const result = (response as any).data || response;
      const items = (result.items as User[]) || [];
      const total = result.total || 0;

      set({
        users: items,
        total: total,
        page: result.page || page,
        pageSize: result.pageSize || pageSize,
        usersLoading: false,
        usersError: null,
      });

      Logger.info(`用户列表获取成功, 共有 ${total} 条数据, 当前页显示 ${items.length} 条`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取用户列表失败';

      set({
        usersLoading: false,
        usersError: errorMessage,
      });

      Logger.error('获取用户列表失败:', error);
      throw error;
    }
  },

  /**
   * 根据 ID 获取用户
   */
  fetchUserById: async (userId: string) => {
    set({ usersLoading: true, usersError: null });

    try {
      Logger.info('获取用户详情:', userId);

      const user = await AuthService.authControllerFindUserById(userId);

      set({
        selectedUser: user,
        usersLoading: false,
        usersError: null,
      });

      Logger.info('用户详情获取成功');
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取用户详情失败';

      set({
        usersLoading: false,
        usersError: errorMessage,
      });

      Logger.error('获取用户详情失败:', error);
      throw error;
    }
  },

  /**
   * 创建用户
   * 管理员功能
   */
  createUser: async (userData: CreateUserDto) => {
    set({ usersLoading: true, usersError: null });

    try {
      Logger.info('创建用户');

      const user = await AuthService.authControllerCreateUser(userData);

      const state = get();
      set({
        users: [user, ...state.users],
        usersLoading: false,
        usersError: null,
      });

      Logger.info('用户创建成功');
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建用户失败';

      set({
        usersLoading: false,
        usersError: errorMessage,
      });

      Logger.error('创建用户失败:', error);
      throw error;
    }
  },

  /**
   * 更新用户
   * 管理员功能
   */
  updateUser: async (userId: string, userData: UpdateUserDto) => {
    set({ usersLoading: true, usersError: null });

    try {
      Logger.info('更新用户:', userId);

      const user = await AuthService.authControllerUpdateUser(userId, userData);

      const state = get();
      set({
        users: state.users.map((u) => (u.id === userId ? user : u)),
        selectedUser: state.selectedUser?.id === userId ? user : state.selectedUser,
        usersLoading: false,
        usersError: null,
      });

      // 如果更新的是当前用户，同步更新当前用户信息
      if (state.user?.id === userId) {
        set({
          user,
          permissions: extractPermissionsFromUser(user),
          roles: user.roles,
        });
        localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
      }

      Logger.info('用户更新成功');
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新用户失败';

      set({
        usersLoading: false,
        usersError: errorMessage,
      });

      Logger.error('更新用户失败:', error);
      throw error;
    }
  },

  /**
   * 删除用户
   * 管理员功能，使用乐观更新
   */
  deleteUser: async (userId: string) => {
    // 乐观更新：先更新 UI
    const state = get();
    const originalUsers = [...state.users];

    set({
      users: state.users.filter((u) => u.id !== userId),
      selectedUser: state.selectedUser?.id === userId ? null : state.selectedUser,
    });

    try {
      Logger.info('删除用户:', userId);

      await AuthService.authControllerDeleteUser(userId);

      set({ usersError: null });

      Logger.info('用户删除成功');
    } catch (error) {
      // 失败时回滚
      const errorMessage = error instanceof Error ? error.message : '删除用户失败';

      set({
        users: originalUsers,
        usersError: errorMessage,
      });

      Logger.error('删除用户失败:', error);
      throw error;
    }
  },

  /**
   * 设置选中用户
   */
  setSelectedUser: (user: User | null) => {
    set({ selectedUser: user });
  },

  // --- 权限验证实现 ---

  /**
   * 检查权限
   */
  hasPermission: (resourceOrPermission: string, action?: string) => {
    const { permissions } = get();
    if (action !== undefined) {
      const permission = `${resourceOrPermission}:${action}`;
      return permissions.includes(permission);
    }
    return permissions.includes(resourceOrPermission);
  },

  /**
   * 检查角色
   */
  hasRole: (roleName: string) => {
    const { roles } = get();

    // 支持两种角色数据格式：
    // 1. 登录时的简化格式：["Administrator"]
    // 2. 获取用户详情的完整格式：[{ name: "Administrator" }]
    if (Array.isArray(roles)) {
      // 检查是否为字符串数组（登录时的格式）
      if (roles.length > 0 && typeof roles[0] === 'string') {
        return (roles as string[]).includes(roleName);
      }
      // 检查是否为对象数组（完整格式）
      return (roles as Array<{ name: string }>).some(role => role.name === roleName);
    }

    return false;
  },

  /**
   * 检查是否为管理员
   */
  canUserManage: () => {
    return get().hasRole(ROLES.ADMIN);
  },

  // --- 状态管理实现 ---

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
   * 清除错误
   */
  clearError: () => {
    set({ error: null, usersError: null });
  },

  /**
   * 重置所有状态
   */
  resetAuthState: () => {
    // 清理Token刷新定时器
    const refreshInterval = get().tokenRefreshInterval;
    if (refreshInterval) {
      clearInterval(refreshInterval);
      Logger.info('Token 自动刷新定时器已清理');
    }

    set({
      isAuthenticated: false,
      user: null,
      permissions: [],
      roles: [],
      accessToken: null,
      refreshToken: null,
      loading: false,
      error: null,
      retryCount: 0,
      users: [],
      selectedUser: null,
      usersLoading: false,
      usersError: null,
      tokenRefreshInterval: null,
    });
  },
}));

// ==========================================
// Selectors (性能优化)
// ==========================================

export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;
export const selectUser = (state: AuthStore) => state.user;
export const selectAuthLoading = (state: AuthStore) => state.loading;
export const selectAuthError = (state: AuthStore) => state.error;
export const selectUserList = (state: AuthStore) => state.users;
export const selectSelectedUser = (state: AuthStore) => state.selectedUser;
export const selectUsersLoading = (state: AuthStore) => state.usersLoading;
export const selectUsersError = (state: AuthStore) => state.usersError;

// ==========================================
// 初始化和事件监听
// ==========================================

// 从 localStorage 恢复认证状态
if (typeof window !== 'undefined') {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);

  if (accessToken && userInfoStr) {
    try {
      const user = JSON.parse(userInfoStr);

      // 恢复认证状态
      useAuthStore.setState({
        isAuthenticated: true,
        user,
        permissions: extractPermissionsFromUser(user),
        roles: user.roles,
        accessToken,
        refreshToken,
      });

      // 设置 OpenAPI Token
      OpenAPI.TOKEN = accessToken;

      // 启动自动刷新
      useAuthStore.getState().setupTokenRefresh();

      Logger.info('认证状态已从 localStorage 恢复');
    } catch (error) {
      Logger.error('恢复认证状态失败:', error);
      // 清理无效数据
      useAuthStore.getState().clearAuthData();
    }
  }

  // 网络状态监听
  window.addEventListener('online', () => {
    Logger.info('网络连接已恢复');
    useAuthStore.getState().refreshAccessToken().catch((error) => {
      Logger.warn('网络恢复后令牌刷新失败:', error);
    });
  });

  window.addEventListener('offline', () => {
    Logger.warn('网络连接已断开');
    useAuthStore.getState().setError('网络连接已断开');
  });
}
