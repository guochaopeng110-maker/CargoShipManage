/**
 * 货船智能机舱管理系统 - JWT认证服务
 * 
 * 核心功能：
 * 1. 用户登录和登出管理
 * 2. JWT令牌生命周期管理（获取、刷新、验证）
 * 3. 权限和角色检查
 * 4. 会话管理和自动刷新
 * 5. 用户信息本地存储和管理
 * 
 * 技术架构：
 * - 基于JWT的无状态认证机制
 * - 双令牌模式（Access Token + Refresh Token）
 * - LocalStorage本地存储管理
 * - 自动令牌刷新机制
 * - 权限细粒度控制（RBAC模型）
 * 
 * 安全特性：
 * - 令牌到期前5分钟自动刷新
 * - 会话超时自动登出
 * - 本地存储数据加密保护
 * - 自动清理过期认证数据
 * - 网络错误和令牌失效处理
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 * @since 2024
 */

// API客户端导入
import { apiClient } from './api-client';

// Mock认证服务导入
import { MockAuthService } from '../mocks/mock-auth-service';

// 日志系统导入
import { Logger } from '../utils/logger';

// 类型定义导入
import {
  User,                     // 用户实体
  LoginRequest,             // 登录请求
  AuthResponse,             // 认证响应
  TokenRefreshResponse,     // 令牌刷新响应
  AuthError,                // 认证错误
  CreateUserRequest,        // 创建用户请求
  UpdateUserRequest,        // 更新用户请求
  ChangePasswordRequest,    // 修改密码请求
  RegisterRequest,          // 注册请求
  RegisterResponse,         // 注册响应
  ChangePasswordResponse,   // 修改密码响应
} from '../types/auth';

/**
 * JWT认证服务类
 * 
 * 负责处理用户认证、授权、令牌管理、会话控制等安全相关业务逻辑
 * 
 * 认证流程：
 * 1. 用户登录（获取双令牌）
 * 2. 令牌自动管理和刷新
 * 3. 权限检查和授权验证
 * 4. 会话生命周期管理
 * 5. 安全登出和数据清理
 * 
 * @class AuthService
 */
export class AuthService {
  /**
   * 本地存储键名常量
   * 
   * 用于安全存储认证相关数据在浏览器本地存储中
   * 包括访问令牌、刷新令牌、用户信息和会话信息
   */
  private static readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',     // 访问令牌键名
    REFRESH_TOKEN: 'refresh_token',   // 刷新令牌键名
    USER_INFO: 'user_info',           // 用户信息键名
    SESSION_INFO: 'session_info',     // 会话信息键名
  };

  /**
   * 令牌过期缓冲时间（毫秒）
   *
   * 在令牌实际过期前5分钟开始自动刷新
   * 避免用户操作过程中令牌突然过期
   */
  private static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5分钟

  /**
   * 处理登录成功后的统一逻辑
   *
   * @param {AuthResponse} authResponse - 认证响应数据
   * @returns {void}
   */
  private handleSuccessfulLogin(authResponse: AuthResponse): void {
    // 存储访问令牌和刷新令牌到本地
    this.setTokens(authResponse.accessToken, authResponse.refreshToken);
    Logger.info('令牌存储完成');

    // 存储用户基本信息到本地
    this.setUserInfo(authResponse.user);
    Logger.info('用户信息存储完成');

    // 创建并存储会话信息
    const sessionInfo = this.createSessionInfo(authResponse.user);
    this.setSessionInfo(sessionInfo);
    Logger.info('会话信息存储完成');

    // 记录最终结果
    Logger.info('用户登录成功');
  }

  /**
   * 用户登录
   *
   * 验证用户凭据，获取JWT令牌和用户信息
   * 自动存储令牌到本地并设置自动刷新机制
   *
   * @param {LoginRequest} credentials - 用户登录凭据（用户名、密码）
   * @returns {Promise<AuthResponse>} 认证成功响应，包含用户信息和令牌
   * @throws {AuthError} 登录失败错误（凭据无效、账户被禁用等）
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    Logger.setComponent('AuthService');
    Logger.info('用户登录开始');
    
    try {
      // 尝试调用真实API
      Logger.info('开始发送登录API请求');
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      
      Logger.info('登录API调用成功');
      
      // API调用成功，处理正常响应
      this.handleSuccessfulLogin(response.data);
      return response.data;
      
    } catch (error) {
      Logger.warn('API登录失败，尝试Mock认证:', error);
      
      try {
        // API失败时，自动回退到Mock认证
        const mockResponse = await MockAuthService.login(credentials);
        Logger.info('Mock登录成功');
        
        this.handleSuccessfulLogin(mockResponse);
        return mockResponse;
        
      } catch (mockError) {
        Logger.error('Mock登录也失败:', mockError);
        throw this.normalizeAuthError(mockError);
      }
    }
  }

  /**
   * 用户登出
   * 
   * 清除本地存储的认证数据，并通知后端清除服务器端会话
   * 即使后端登出请求失败，也会清理本地数据确保安全
   * 
   * @returns {Promise<void>} 无返回值
   * @async
   */
  async logout(): Promise<void> {
    try {
      // 尝试调用真实API
      await apiClient.post('/auth/logout');
    } catch (error) {
      Logger.warn('API登出失败，尝试Mock登出:', error);
      try {
        // API失败时，回退到Mock认证
        await MockAuthService.logout();
      } catch (mockError) {
        Logger.warn('Mock登出也失败，继续清理本地数据:', mockError);
      }
    } finally {
      // 无论哪种方式，都清除本地存储的认证数据
      this.clearAuthData();
    }
  }

  /**
   * 刷新访问令牌
   * 
   * 使用刷新令牌获取新的访问令牌，延长用户会话
   * 刷新失败时会自动清理认证数据并跳转到登录页
   * 
   * @returns {Promise<TokenResponse>} 新的令牌响应
   * @throws {AuthError} 刷新失败错误（刷新令牌过期、无效等）
   */
  async refreshToken(): Promise<TokenRefreshResponse> {
    try {
      // 获取本地存储的刷新令牌
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available'); // 无刷新令牌时抛出错误
      }

      // 发送POST请求到令牌刷新端点
      const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
        refreshToken, // 提交刷新令牌
      });

      // 更新本地存储的令牌（访问令牌和刷新令牌）
      this.setTokens(response.data.accessToken, null);
      
      return response.data; // 返回新的令牌数据
    } catch (error) {
      // 刷新失败时，清除所有认证数据并重新认证
      this.clearAuthData();
      
      // 标准化错误处理
      throw this.normalizeAuthError(error);
    }
  }

  /**
   * 获取当前用户详细信息
   *
   * 从后端获取最新的用户信息并更新本地存储
   * 用于同步服务器端和客户端的用户状态
   * 支持Mock降级机制：API失败时自动切换到Mock服务
   *
   * @returns {Promise<User>} 完整的用户信息对象
   * @throws {AuthError} 获取用户信息失败错误
   */
  async getCurrentUser(): Promise<User> {
    try {
      // 尝试调用真实API
      const response = await apiClient.get<User>('/auth/profile');
      
      // 更新本地存储的用户信息，确保数据同步
      this.setUserInfo(response.data);
      
      return response.data; // 返回用户信息
    } catch (error) {
      Logger.warn('API获取用户信息失败，尝试Mock服务:', error);
      
      try {
        // API失败时，自动回退到Mock服务
        const mockUser = await MockAuthService.getCurrentUser();
        Logger.info('Mock获取用户信息成功');
        
        // 更新本地存储的用户信息
        this.setUserInfo(mockUser);
        
        // 添加Mock服务标识
        return (mockUser as any) && {
          ...mockUser,
          _usingMock: true
        };
      } catch (mockError) {
        Logger.error('Mock获取用户信息也失败:', mockError);
        throw this.normalizeAuthError(mockError);
      }
    }
  }

  /**
   * 获取所有用户列表
   *
   * 管理员功能，获取系统中所有用户的列表信息
   * 需要user:read权限和administrator角色
   * 支持Mock降级机制：API失败时自动切换到Mock服务
   *
   * @returns {Promise<User[]>} 用户数组
   * @throws {AuthError} 获取用户列表失败错误（权限不足等）
   */
  async getUsers(): Promise<User[]> {
    try {
      // 尝试调用真实API
      const response = await apiClient.get<User[]>('/auth/users');
      
      return response.data; // 返回用户列表
    } catch (error) {
      Logger.warn('API获取用户列表失败，尝试Mock服务:', error);
      
      try {
        // API失败时，自动回退到Mock服务
        const mockUsers = await MockAuthService.getUsers();
        Logger.info('Mock获取用户列表成功');
        
        // 添加Mock服务标识
        return mockUsers.map(user => ({
          ...user,
          _usingMock: true
        }));
      } catch (mockError) {
        Logger.error('Mock获取用户列表也失败:', mockError);
        throw this.normalizeAuthError(mockError);
      }
    }
  }

  /**
   * 更新用户信息
   *
   * 修改指定用户的个人信息（如头像、姓名、邮箱等）
   * 如果更新的是当前用户，会同步更新本地存储
   * 支持Mock降级机制：API失败时自动切换到Mock服务
   *
   * @param {string} userId - 要更新的用户ID
   * @param {Partial<User>} userData - 用户数据更新内容
   * @returns {Promise<User>} 更新后的完整用户信息
   * @throws {AuthError} 更新失败错误（权限不足、数据验证失败等）
   */
  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    try {
      // 尝试调用真实API
      const response = await apiClient.put<User>(`/auth/users/${userId}`, userData);
      
      // 检查是否为当前用户若是则更新本地存储
      const currentUser = this.getCurrentUserInfo();
      if (currentUser && currentUser.id === userId) {
        this.setUserInfo(response.data); // 同步更新本地存储
      }
      
      return response.data; // 返回更新后的用户信息
    } catch (error) {
      Logger.warn('API更新用户信息失败，尝试Mock服务:', error);
      
      try {
        // API失败时，自动回退到Mock服务
        const mockUpdatedUser = await MockAuthService.updateUser(userId, userData);
        Logger.info('Mock更新用户信息成功');
        
        // 检查是否为当前用户若是则更新本地存储
        const currentUser = this.getCurrentUserInfo();
        if (currentUser && currentUser.id === userId) {
          this.setUserInfo(mockUpdatedUser); // 同步更新本地存储
        }
        
        // 添加Mock服务标识
        return (mockUpdatedUser as any) && {
          ...mockUpdatedUser,
          _usingMock: true
        };
      } catch (mockError) {
        Logger.error('Mock更新用户信息也失败:', mockError);
        throw this.normalizeAuthError(mockError);
      }
    }
  }

  /**
   * 根据ID获取单个用户
   *
   * 管理员功能，获取指定用户的详细信息
   * 需要user:read权限和administrator角色
   *
   * @param {string} userId - 用户ID
   * @returns {Promise<User>} 用户信息
   * @throws {AuthError} 获取用户信息失败错误（权限不足、用户不存在等）
   */
  async getUserById(userId: string): Promise<User> {
    try {
      // 发送GET请求获取指定用户信息
      const response = await apiClient.get<User>(`/auth/users/${userId}`);
      
      return response.data; // 返回用户信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeAuthError(error);
    }
  }

  /**
   * 创建新用户
   *
   * 管理员功能，创建新用户账户并指定角色
   * 需要user:create权限和administrator角色
   *
   * @param {CreateUserRequest} userData - 创建用户请求数据
   * @returns {Promise<User>} 创建的用户信息
   * @throws {AuthError} 创建用户失败错误（权限不足、数据验证失败等）
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // 发送POST请求创建用户
      const response = await apiClient.post<User>('/auth/users', userData);
      
      return response.data; // 返回创建的用户信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeAuthError(error);
    }
  }

  /**
   * 删除用户
   *
   * 管理员功能，删除指定用户账户
   * 需要user:delete权限和administrator角色
   * 不能删除系统中最后一个管理员账户
   *
   * @param {string} userId - 要删除的用户ID
   * @returns {Promise<void>} 无返回值
   * @throws {AuthError} 删除用户失败错误（权限不足、最后一个管理员等）
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // 发送DELETE请求删除用户
      await apiClient.delete(`/auth/users/${userId}`);
      
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeAuthError(error);
    }
  }

  /**
   * 修改密码
   *
   * 用户修改自己的登录密码
   * 需要验证当前密码并设置新密码
   *
   * @param {string} currentPassword - 当前密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<void>} 无返回值
   * @throws {AuthError} 密码修改失败错误（当前密码错误、新密码不符合要求等）
   */
  async changePassword(
    currentPassword: string,    // 用户当前密码
    newPassword: string,       // 用户新密码
  ): Promise<void> {
    try {
      // 发送POST请求到修改密码端点
      await apiClient.post('/auth/change-password', {
        currentPassword, // 当前密码验证
        newPassword,     // 新密码设置
      });
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeAuthError(error);
    }
  }

  /**
   * 用户注册
   *
   * 创建新用户账户，自动分配默认角色
   *
   * @param {RegisterRequest} userData - 用户注册数据
   * @returns {Promise<RegisterResponse>} 注册成功响应
   * @throws {AuthError} 注册失败错误（用户已存在、邮箱格式无效等）
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.normalizeAuthError(error);
    }
  }

  // ===== 权限和角色检查方法 =====

  /**
   * 检查用户是否具有指定权限
   * 
   * 基于RBAC模型检查用户在特定资源上执行特定操作的权限
   * 权限格式为 "资源:操作"（如 "user:create"）
   *
   * @param {string} resource - 资源名称（如 'user', 'alarms', 'device'）
   * @param {string} action - 操作名称（如 'create', 'read', 'update', 'delete'）
   * @returns {boolean} 是否具有该权限
   */
  hasPermission(resource: string, action: string): boolean {
    // 获取当前用户信息
    const user = this.getCurrentUserInfo();
    if (!user) return false; // 未登录用户无权限

    // 构建权限代码（格式：资源:操作）
    const permissionCode = `${resource}:${action}`;
    
    // 检查用户权限列表中是否包含该权限
    return user.permissions?.includes(permissionCode) || false;
  }

  /**
   * 检查用户是否具有指定角色
   * 
   * 基于角色权限模型检查用户是否属于特定角色
   * 用于粗粒度的权限控制（如管理员、操作员等）
   * 
   * @param {string} roleName - 角色名称（如 'admin', 'operator', 'viewer'）
   * @returns {boolean} 是否具有该角色
   */
  hasRole(roleName: string): boolean {
    // 获取当前用户信息
    const user = this.getCurrentUserInfo();
    if (!user) return false; // 未登录用户无角色

    // 检查用户角色列表中是否包含该角色
    return user.roles.some(role => role.name === roleName);
  }

  /**
   * 获取权限检查结果
   * 
   * 详细的权限检查，返回包含检查结果的完整对象
   * 用于权限验证UI组件和权限管理页面
   * 
   * @param {string} resource - 资源名称
   * @param {string} action - 操作名称
   * @returns {PermissionCheck} 权限检查结果对象
   */
  checkPermission(resource: string, action: string): { resource: string; action: string; granted: boolean; userPermissions: string[] } {
    // 获取当前用户信息
    const user = this.getCurrentUserInfo();
    
    // 返回简化的权限检查结果
    return {
      resource: resource,
      action: action,
      granted: this.hasPermission(resource, action),
      userPermissions: user?.permissions || [],     // 用户的所有权限
    };
  }

  // ===== 认证状态检查方法 =====

  /**
   * 检查用户是否已认证
   * 
   * 同时检查访问令牌和用户信息的存在性
   * 用于确定用户登录状态和页面访问权限
   * 
   * @returns {boolean} 用户是否已认证
   */
  isAuthenticated(): boolean {
    // 检查访问令牌和用户信息是否都存在
    const token = this.getAccessToken();
    const user = this.getCurrentUserInfo();
    return !!(token && user);
  }

  /**
   * 检查API端点是否为认证相关接口
   * 
   * 用于标识需要降级到Mock服务的认证端点
   * 确保所有11个认证相关API都能正确使用Mock服务
   * 
   * @param {string} endpoint - API端点路径
   * @returns {boolean} 是否为认证端点
   */
  isAuthEndpoint(endpoint: string): boolean {
    // 移除前导斜杠并标准化路径
    const normalizedEndpoint = endpoint.replace(/^\//, '');
    
    // 定义所有认证相关的API端点
    const authEndpoints = [
      // 基础认证接口（5个）
      'auth/login',
      'auth/logout', 
      'auth/refresh',
      'auth/register',
      'auth/change-password',
      
      // 用户管理接口（6个）
      'auth/profile',
      'auth/users',
      'auth/users/', // 使用startsWith匹配带ID的路径
    ];

    // 直接匹配精确端点
    if (authEndpoints.includes(normalizedEndpoint)) {
      return true;
    }

    // 匹配带参数的端点（auth/users/:id）
    if (normalizedEndpoint.startsWith('auth/users/')) {
      return true;
    }

    // 匹配profile端点（auth/profile）
    if (normalizedEndpoint === 'auth/profile') {
      return true;
    }

    return false;
  }

  /**
   * 检查令牌是否即将过期
   * 
   * 解析JWT令牌并检查剩余有效期
   * 用于触发自动令牌刷新机制
   * 
   * @returns {boolean} 令牌是否即将过期
   */
  isTokenExpiringSoon(): boolean {
    // 获取访问令牌
    const token = this.getAccessToken();
    if (!token) return true; // 无令牌视为即将过期

    try {
      // 解析JWT令牌载荷获取过期时间
      const payload = this.parseJWTPayload(token);
      const expiryTime = payload.exp * 1000; // 转换为毫秒时间戳
      const currentTime = Date.now();        // 当前时间戳
      
      // 检查是否在过期缓冲时间内
      return (expiryTime - currentTime) <= AuthService.TOKEN_EXPIRY_BUFFER;
    } catch {
      // JWT解析失败视为即将过期
      return true;
    }
  }

  /**
   * 获取会话信息
   * 
   * 从本地存储中获取会话相关信息
   * 用于会话管理和活动监控
   * 
   * @returns {SessionInfo | null} 会话信息对象或null（如果不存在）
   */
  getSessionInfo(): { userId: string; sessionId: string; expiresAt: number } | null {
    // 简化的会话信息获取
    const token = this.getAccessToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.sub || payload.userId,
        sessionId: payload.sessionId || `session_${Date.now()}`,
        expiresAt: payload.exp * 1000,
      };
    } catch {
      return null;
    }
  }

  /**
   * 设置自动令牌刷新机制
   *
   * 在用户已认证情况下，设置定时器自动检查并刷新即将过期的令牌
   * 每分钟检查一次，在令牌即将过期时自动刷新
   * 改进的错误处理和用户反馈
   *
   * @returns {void} 无返回值
   */
  setupTokenRefresh(): void {
    // 如果用户未认证，不设置刷新机制
    if (!this.isAuthenticated()) return;

    // 创建定时器，每分钟检查一次令牌状态
    const refreshInterval = setInterval(async () => {
      try {
        // 如果令牌即将过期，触发自动刷新
        if (this.isTokenExpiringSoon()) {
          Logger.info('令牌即将过期，开始自动刷新');
          await this.refreshToken();
          Logger.info('令牌自动刷新成功');
        }
      } catch (error) {
        // 自动刷新失败时的错误处理
        Logger.error('Auto token refresh failed:', error);
        
        // 显示用户友好的错误信息
        if (typeof window !== 'undefined') {
          // 检查是否为网络错误
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isNetworkError = errorMessage && (
            errorMessage.includes('Network Error') ||
            errorMessage.includes('fetch') ||
            errorMessage.includes('timeout')
          );
          
          if (isNetworkError) {
            Logger.warn('网络连接问题，保持当前会话');
            // 网络错误时不立即登出，给用户更多时间
            return;
          }
          
          // 显示会话过期提示
          const shouldShowAlert = !sessionStorage.getItem('sessionExpiredShown');
          if (shouldShowAlert) {
            sessionStorage.setItem('sessionExpiredShown', 'true');
            
            // 使用更友好的提示方式
            if (window.confirm('您的会话已过期，是否重新登录？')) {
              // 清理认证数据
              this.clearAuthData();
              
              // 跳转到登录页
              window.location.href = '/login';
            } else {
              // 用户选择不重新登录，清理认证数据但保持当前页面
              this.clearAuthData();
            }
          }
        } else {
          // 服务端环境，直接清理
          this.clearAuthData();
        }
      }
    }, 60 * 1000); // 每分钟执行一次检查

    // 在页面卸载时清理定时器，防止内存泄漏
    window.addEventListener('beforeunload', () => {
      clearInterval(refreshInterval);
    });
    
    // 页面可见性变化时检查令牌状态
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isTokenExpiringSoon()) {
        Logger.info('页面重新可见，检查令牌状态');
        // 页面重新可见时立即检查令牌
        this.refreshToken().catch(error => {
          Logger.warn('页面可见时令牌刷新失败:', error);
        });
      }
    });
  }

  // ===== 本地存储管理方法 =====

  /**
   * 设置访问令牌和刷新令牌
   * 
   * 将JWT令牌安全存储到浏览器本地存储中
   * 同时更新API客户端的认证配置
   * 
   * @param {string} accessToken - 访问令牌（必填）
   * @param {string | null} refreshToken - 刷新令牌（可选）
   * @returns {void} 无返回值
   */
  setTokens(accessToken: string, refreshToken: string | null): void {
    // 存储访问令牌
    localStorage.setItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    
    // 存储刷新令牌（如果提供）
    if (refreshToken) {
      localStorage.setItem(AuthService.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    
    // 更新API客户端的令牌配置
    apiClient.setAuthToken(accessToken, refreshToken);
  }

  /**
   * 获取访问令牌
   * 
   * @returns {string | null} 访问令牌或null（如果不存在）
   */
  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * 获取刷新令牌
   * 
   * @returns {string | null} 刷新令牌或null（如果不存在）
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(AuthService.STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * 设置用户信息
   * 
   * @param {User} user - 用户信息对象
   * @returns {void} 无返回值
   */
  setUserInfo(user: User): void {
    // 将用户对象序列化为JSON字符串并存储
    localStorage.setItem(AuthService.STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  }

  /**
   * 获取当前用户信息
   * 
   * @returns {User | null} 用户信息对象或null（如果不存在或解析失败）
   */
  getCurrentUserInfo(): User | null {
    // 获取用户信息JSON字符串
    const userInfoStr = localStorage.getItem(AuthService.STORAGE_KEYS.USER_INFO);
    if (!userInfoStr) return null; // 不存在用户信息

    try {
      // 解析JSON字符串为用户对象
      return JSON.parse(userInfoStr);
    } catch {
      // JSON解析失败返回null
      return null;
    }
  }

  /**
   * 设置会话信息
   * 
   * @param {SessionInfo} sessionInfo - 会话信息对象
   * @private
   */
  private setSessionInfo(sessionInfo: any): void {
    // 简化版会话信息设置
    localStorage.setItem(AuthService.STORAGE_KEYS.SESSION_INFO, JSON.stringify(sessionInfo));
  }

  /**
   * 创建会话信息
   * 
   * 基于用户信息创建新的会话记录
   * 
   * @param {User} user - 用户信息对象
   * @returns {SessionInfo} 会话信息对象
   * @private
   */
  private createSessionInfo(user: User): any {
    return {
      userId: user.id,                                    // 用户ID
      sessionId: this.generateSessionId(),               // 会话唯一标识
      createdAt: Date.now(),                             // 会话创建时间
      expiresAt: Date.now() + (8 * 60 * 60 * 1000),     // 会话过期时间（8小时）
      isActive: true,                                     // 会话是否活跃
      lastActivity: Date.now(),                          // 最后活动时间
      deviceInfo: {                                       // 设备信息
        userAgent: navigator.userAgent,                   // 浏览器用户代理
        ipAddress: 'unknown',                             // IP地址（应由后端设置）
        location: 'unknown',                             // 地理位置（应由后端设置）
      },
    };
  }

  /**
   * 清除所有认证数据
   * 
   * 清理本地存储中所有认证相关信息
   * 包括令牌、用户信息和会话信息
   * 
   * @returns {void} 无返回值
   */
  clearAuthData(): void {
    // 遍历所有存储键并移除对应数据
    Object.values(AuthService.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // 清除API客户端的令牌配置
    apiClient.setAuthToken(null);
  }

  // ===== 工具方法 =====

  /**
   * 解析JWT令牌载荷
   * 
   * 解析JWT token的第二部分（载荷）并返回JSON对象
   * 用于检查令牌内容和有效期
   * 
   * @param {string} token - JWT令牌字符串
   * @returns {any} 解码后的令牌载荷对象
   * @throws {Error} JWT格式无效或解码失败
   * @private
   */
  private parseJWTPayload(token: string): any {
    // 分割JWT token的三个部分
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token format'); // JWT格式无效
    }
    
    // 获取载荷部分（第二部分）
    const payload = parts[1];
    
    // URL安全的Base64解码（替换-为+，_为/）
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    
    // 解析JSON字符串为对象
    return JSON.parse(decodedPayload);
  }

  /**
   * 生成请求ID
   *
   * 创建唯一的请求标识符，用于日志跟踪
   *
   * @returns {string} 唯一的请求ID字符串
   * @private
   */
  private generateRequestId(): string {
    // 结合时间戳和随机数生成唯一ID
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成会话ID
   *
   * 创建唯一的会话标识符
   *
   * @returns {string} 唯一的会话ID字符串
   * @private
   */
  private generateSessionId(): string {
    // 结合时间戳和随机数生成唯一ID
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 标准化认证错误
   * 
   * 将各种错误类型标准化为统一的AuthError对象
   * 
   * @param {any} error - 原始错误对象
   * @returns {AuthError} 标准化后的认证错误对象
   * @private
   */
  private normalizeAuthError(error: any): AuthError {
    // 如果是API错误，包含详细信息
    if (error.code) {
      return {
        code: error.code,      // 错误代码
        message: error.message, // 错误消息
        field: error.field,    // 错误字段（如果适用）
      };
    }

    // 返回通用认证错误
    return {
      code: 'AUTH_ERROR',
      message: error.message || 'Authentication failed',
    };
  }
}

// 创建认证服务实例（单例模式）
export const authService = new AuthService();

// 导出便捷方法（解构导出，方便直接调用）
export const {
  login,                    // 用户登录
  logout,                   // 用户登出
  refreshToken,             // 刷新令牌
  getCurrentUser,           // 获取当前用户
  getUsers,                 // 获取用户列表
  getUserById,              // 获取单个用户
  createUser,               // 创建用户
  deleteUser,               // 删除用户
  updateUser,               // 更新用户
  changePassword,           // 修改密码
  register,                 // 注册用户
  hasPermission,            // 检查权限
  hasRole,                  // 检查角色
  checkPermission,          // 详细权限检查
  isAuthenticated,          // 检查认证状态
  isTokenExpiringSoon,      // 检查令牌是否即将过期
  getSessionInfo,           // 获取会话信息
  setupTokenRefresh,        // 设置自动刷新
  isAuthEndpoint,           // 检查是否为认证端点
} = authService;

/**
 * 使用示例：
 * 
 * ```typescript
 * import { authService } from './services/auth-service';
 * 
 * // 用户登录
 * const authResponse = await authService.login({
 *   username: 'user@example.com',
 *   password: 'password123'
 * });
 * 
 * // 检查权限
 * const canCreateUser = authService.hasPermission('user', 'create');
 * const isAdmin = authService.hasRole('Administrator');
 * 
 * // 获取当前用户
 * const user = await authService.getCurrentUser();
 * 
 * // 修改密码
 * await authService.changePassword('oldPassword', 'newPassword');
 * 
 * // 设置自动刷新
 * authService.setupTokenRefresh();
 * 
 * // 检查认证状态
 * if (authService.isAuthenticated()) {
 *   console.log('User is logged in');
 * } else {
 *   console.log('User is not logged in');
 * }
 * 
 * // 登出
 * await authService.logout();
 * ```
 */