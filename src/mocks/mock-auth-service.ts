/**
 * 货船智能机舱管理系统 - 完整Mock认证服务
 * 
 * 模拟后端认证行为，提供完整的11个API接口的Mock实现
 * 包括用户管理、权限控制、数据验证等功能
 * 
 * 功能覆盖：
 * 1. 基础认证：login, logout, refreshToken, register
 * 2. 用户管理：getUsers, getUserById, createUser, updateUser, deleteUser
 * 3. 个人信息：getCurrentUser, changePassword
 * 
 * @version 4.0.0 - 完整版
 */

// 导入认证相关类型定义
import { 
  User, 
  LoginRequest, 
  AuthResponse, 
  TokenRefreshResponse,
  Role,
  Permission,
  AuthError,
  ROLE_PERMISSIONS,
  SystemRole,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CreateUserRequest,
  UpdateUserRequest,
  DeleteUserResponse
} from '../types/auth';

/**
 * 内存数据库 - 完整的模拟用户数据
 * 
 * 包含不同角色（administrator, operator, viewer）和状态（active, inactive, locked）的用户
 * 每个用户都包含完整的角色和权限信息
 */
const MOCK_USERS_DATABASE = {
  // ===== 管理员用户 =====
  'user_admin_001': {
    id: 'user_admin_001',
    username: 'admin',
    email: 'admin@cargoship.com',
    fullName: '系统管理员',
    password: 'admin123',
    phoneNumber: '+86 138-0000-0001',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-28T06:30:00.000Z',
    lastLoginIp: '192.168.1.100',
    createdAt: '2024-12-01T00:00:00.000Z',
    updatedAt: '2024-12-28T06:30:00.000Z'
  },
  
  'user_admin_002': {
    id: 'user_admin_002',
    username: 'sysadmin',
    email: 'sysadmin@cargoship.com',
    fullName: '系统超级管理员',
    password: 'sysadmin123',
    phoneNumber: '+86 138-0000-0002',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-27T18:45:00.000Z',
    lastLoginIp: '10.0.0.50',
    createdAt: '2024-12-01T00:00:00.000Z',
    updatedAt: '2024-12-27T18:45:00.000Z'
  },

  // ===== 操作员用户 =====
  'user_operator_001': {
    id: 'user_operator_001',
    username: 'operator',
    email: 'operator@cargoship.com',
    fullName: '系统操作员',
    password: 'operator123',
    phoneNumber: '+86 139-1234-5678',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-28T05:15:00.000Z',
    lastLoginIp: '192.168.1.101',
    createdAt: '2024-12-01T00:00:00.000Z',
    updatedAt: '2024-12-28T05:15:00.000Z'
  },

  'user_operator_002': {
    id: 'user_operator_002',
    username: 'chief_operator',
    email: 'chief.operator@cargoship.com',
    fullName: '轮机长操作员',
    password: 'chief123',
    phoneNumber: '+86 139-2345-6789',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-28T04:30:00.000Z',
    lastLoginIp: '192.168.1.102',
    createdAt: '2024-12-02T00:00:00.000Z',
    updatedAt: '2024-12-28T04:30:00.000Z'
  },

  'user_operator_003': {
    id: 'user_operator_003',
    username: 'maintenance_op',
    email: 'maintenance@cargoship.com',
    fullName: '维护操作员',
    password: 'maintenance123',
    phoneNumber: '+86 139-3456-7890',
    status: 'inactive' as const,
    isActive: false,
    lastLoginAt: '2024-12-25T12:00:00.000Z',
    lastLoginIp: '192.168.1.103',
    createdAt: '2024-12-03T00:00:00.000Z',
    updatedAt: '2024-12-26T00:00:00.000Z'
  },

  // ===== 查看用户 =====
  'user_viewer_001': {
    id: 'user_viewer_001',
    username: 'viewer',
    email: 'viewer@cargoship.com',
    fullName: '查看用户',
    password: 'viewer123',
    phoneNumber: '+86 139-4567-8901',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-28T03:20:00.000Z',
    lastLoginIp: '192.168.1.104',
    createdAt: '2024-12-01T00:00:00.000Z',
    updatedAt: '2024-12-28T03:20:00.000Z'
  },

  'user_viewer_002': {
    id: 'user_viewer_002',
    username: 'guest',
    email: 'guest@cargoship.com',
    fullName: '访客用户',
    password: 'guest123',
    phoneNumber: '+86 139-5678-9012',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-27T20:10:00.000Z',
    lastLoginIp: '192.168.1.105',
    createdAt: '2024-12-05T00:00:00.000Z',
    updatedAt: '2024-12-27T20:10:00.000Z'
  },

  'user_viewer_003': {
    id: 'user_viewer_003',
    username: 'monitor',
    email: 'monitor@cargoship.com',
    fullName: '监控查看员',
    password: 'monitor123',
    phoneNumber: '+86 139-6789-0123',
    status: 'locked' as const,
    isActive: false,
    lastLoginAt: '2024-12-20T15:30:00.000Z',
    lastLoginIp: '192.168.1.106',
    createdAt: '2024-12-10T00:00:00.000Z',
    updatedAt: '2024-12-26T10:00:00.000Z'
  },

  // ===== 额外测试用户 =====
  'user_test_001': {
    id: 'user_test_001',
    username: 'test_operator',
    email: 'test.operator@cargoship.com',
    fullName: '测试操作员',
    password: 'test123',
    phoneNumber: '+86 139-7890-1234',
    status: 'active' as const,
    isActive: true,
    lastLoginAt: '2024-12-26T14:45:00.000Z',
    lastLoginIp: '192.168.1.107',
    createdAt: '2024-12-15T00:00:00.000Z',
    updatedAt: '2024-12-26T14:45:00.000Z'
  }
};

/**
 * Mock认证服务类
 * 
 * 提供完整的认证服务Mock实现，包括所有11个API接口
 * 包含详细的错误处理、日志记录和权限检查
 */
export class MockAuthService {
  private static readonly STORAGE_KEY = 'mock_users_db';

  /**
   * 详细日志记录方法
   * 
   * @param {string} level - 日志级别 ('info', 'warn', 'error')
   * @param {string} message - 日志消息
   * @param {any} data - 附加数据
   */
  private static log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const prefix = `[MockAuthService ${timestamp}]`;
    
    switch (level) {
      case 'info':
        console.info(`${prefix} INFO: ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${message}`, data || '');
        break;
      case 'error':
        console.error(`${prefix} ERROR: ${message}`, data || '');
        break;
    }
  }

  /**
   * 增强的错误处理
   * 
   * @param {any} error - 原始错误
   * @param {string} operation - 操作名称
   * @param {any} context - 上下文信息
   * @returns {AuthError} 标准化错误
   */
  private static handleError(error: any, operation: string, context?: any): AuthError {
    // 记录错误日志
    this.log('error', `Operation failed: ${operation}`, {
      error,
      context,
      timestamp: new Date().toISOString()
    });

    // 如果已经是标准化的AuthError，直接返回
    if (error.code && error.message) {
      return error;
    }

    // 根据操作类型提供更具体的错误信息
    const errorMap: Record<string, { code: string; message: string }> = {
      'login': { code: 'LOGIN_FAILED', message: '登录失败，请检查用户名和密码' },
      'register': { code: 'REGISTER_FAILED', message: '注册失败，请检查输入信息' },
      'changePassword': { code: 'PASSWORD_CHANGE_FAILED', message: '密码修改失败' },
      'getUsers': { code: 'GET_USERS_FAILED', message: '获取用户列表失败' },
      'getUserById': { code: 'GET_USER_FAILED', message: '获取用户信息失败' },
      'createUser': { code: 'CREATE_USER_FAILED', message: '创建用户失败' },
      'updateUser': { code: 'UPDATE_USER_FAILED', message: '更新用户失败' },
      'deleteUser': { code: 'DELETE_USER_FAILED', message: '删除用户失败' },
      'refreshToken': { code: 'TOKEN_REFRESH_FAILED', message: '令牌刷新失败' },
      'logout': { code: 'LOGOUT_FAILED', message: '登出失败' },
      'getCurrentUser': { code: 'GET_PROFILE_FAILED', message: '获取用户资料失败' }
    };

    const defaultError = errorMap[operation] || { code: 'AUTH_ERROR', message: '认证操作失败' };
    
    return {
      ...defaultError,
      message: error.message || defaultError.message,
      field: error.field
    };
  }

  /**
   * 权限验证辅助方法
   * 
   * @param {string} requiredPermission - 所需权限
   * @param {string} operation - 操作名称
   * @throws {AuthError} 权限不足错误
   */
  private static validatePermission(requiredPermission: string, operation: string): void {
    // 简化版权限验证 - 实际应该从当前用户获取权限
    this.log('info', `Validating permission for operation: ${operation}`, { requiredPermission });
    
    // 这里可以添加更复杂的权限检查逻辑
    // 例如检查当前用户是否有相应的权限
  }

  /**
   * 获取用户角色和权限信息
   * 
   * @param {string} username - 用户名
   * @returns {{ roles: Role[], permissions: string[] }} 角色和权限信息
   */
  private static getUserRolesAndPermissions(username: string): { roles: Role[], permissions: string[] } {
    const roleMap: Record<string, SystemRole> = {
      'admin': SystemRole.ADMINISTRATOR,
      'sysadmin': SystemRole.ADMINISTRATOR,
      'operator': SystemRole.OPERATOR, 
      'chief_operator': SystemRole.OPERATOR,
      'maintenance_op': SystemRole.OPERATOR,
      'test_operator': SystemRole.OPERATOR,
      'viewer': SystemRole.VIEWER,
      'guest': SystemRole.VIEWER,
      'monitor': SystemRole.VIEWER
    };

    const systemRole = roleMap[username] || SystemRole.VIEWER;
    const permissionCodes = ROLE_PERMISSIONS[systemRole] || [];

    // 创建角色对象
    const roles: Role[] = [{
      id: `role_${systemRole.toLowerCase()}`,
      name: systemRole.toLowerCase() as 'administrator' | 'operator' | 'viewer',
      description: systemRole === SystemRole.ADMINISTRATOR ? '系统管理员' :
                   systemRole === SystemRole.OPERATOR ? '系统操作员' : '查看用户'
    }];

    return { roles, permissions: permissionCodes };
  }

  /**
   * 获取内存数据库中的所有用户
   * 
   * @returns {User[]} 用户数组
   */
  private static getAllUsers(): User[] {
    return Object.values(MOCK_USERS_DATABASE).map(userData => {
      const { roles, permissions } = this.getUserRolesAndPermissions(userData.username);
      return {
        ...userData,
        roles,
        permissions: permissions
      };
    });
  }

  /**
   * 根据ID查找用户
   * 
   * @param {string} userId - 用户ID
   * @returns {User | null} 用户对象或null
   */
  private static findUserById(userId: string): User | null {
    const userData = MOCK_USERS_DATABASE[userId as keyof typeof MOCK_USERS_DATABASE];
    if (!userData) return null;

    const { roles, permissions } = this.getUserRolesAndPermissions(userData.username);
    return {
      ...userData,
      roles,
      permissions: permissions
    };
  }

  /**
   * 根据用户名查找用户数据
   * 
   * @param {string} username - 用户名
   * @returns {any | null} 用户数据或null
   */
  private static findUserByUsername(username: string): any | null {
    return Object.values(MOCK_USERS_DATABASE).find(user => user.username === username) || null;
  }

  /**
   * 生成模拟JWT令牌
   */
  private static generateMockToken(payload: any): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({ 
      ...payload, 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    const signature = btoa(body + 'mock_secret');
    
    return `${header}.${body}.${signature}`;
  }

  /**
   * 用户登录
   * 
   * 模拟后端登录验证，支持多个测试用户
   * 包含详细的错误处理和日志记录
   * 
   * @param {LoginRequest} credentials - 登录凭据
   * @returns {Promise<AuthResponse>} 认证响应
   * @throws {AuthError} 用户不存在、密码错误或账户状态异常
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    this.log('info', 'Login attempt', { username: credentials.username });

    try {
      const userData = this.findUserByUsername(credentials.username);
      
      if (!userData) {
        this.log('warn', 'Login failed - user not found', { username: credentials.username });
        throw this.handleError(
          { code: 'USER_NOT_FOUND', message: '用户不存在' },
          'login',
          { username: credentials.username }
        );
      }

      if (userData.password !== credentials.password) {
        this.log('warn', 'Login failed - invalid credentials', { username: credentials.username });
        throw this.handleError(
          { code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' },
          'login',
          { username: credentials.username }
        );
      }

      if (userData.status === 'locked') {
        this.log('warn', 'Login failed - account locked', { username: credentials.username });
        throw this.handleError(
          { code: 'ACCOUNT_LOCKED', message: '账户已被锁定，请联系管理员' },
          'login',
          { username: credentials.username, status: userData.status }
        );
      }

      if (userData.status === 'inactive') {
        this.log('warn', 'Login failed - account inactive', { username: credentials.username });
        throw this.handleError(
          { code: 'ACCOUNT_INACTIVE', message: '账户已被停用，请联系管理员' },
          'login',
          { username: credentials.username, status: userData.status }
        );
      }

      // 获取角色和权限
      const { roles, permissions } = this.getUserRolesAndPermissions(credentials.username);

      // 构建用户对象
      const user: User = {
        ...userData,
        roles,
        permissions
      };

      // 生成令牌
      const accessToken = this.generateMockToken({
        sub: user.id,
        username: user.username,
        email: user.email,
        roles: roles.map(r => r.name)
      });

      const refreshToken = this.generateMockToken({
        sub: user.id,
        type: 'refresh'
      });

      const response = {
        accessToken,
        refreshToken,
        user
      };

      this.log('info', 'Login successful', { 
        username: user.username, 
        userId: user.id,
        roles: roles.map(r => r.name)
      });

      return response;

    } catch (error) {
      // 如果已经是处理过的错误，直接重新抛出
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        throw error;
      }
      
      // 处理未知错误
      throw this.handleError(error, 'login', { username: credentials.username });
    }
  }

  /**
   * 用户登出
   */
  static async logout(): Promise<void> {
    // Mock实现 - 清理本地数据
    localStorage.removeItem('mock_access_token');
    localStorage.removeItem('mock_refresh_token');
  }

  /**
   * 刷新令牌
   */
  static async refreshToken(): Promise<TokenRefreshResponse> {
    const accessToken = this.generateMockToken({
      sub: 'mock_user',
      username: 'mock_user'
    });

    return {
      accessToken
    };
  }

  /**
   * 获取当前用户信息
   *
   * @returns {Promise<User>} 当前用户信息
   */
  static async getCurrentUser(): Promise<User> {
    try {
      // 从localStorage获取当前用户信息
      const userInfoStr = localStorage.getItem('user_info');
      if (!userInfoStr) {
        // 如果没有用户信息，返回默认管理员
        const mockUser = this.findUserById('user_admin_001');
        if (!mockUser) {
          throw {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          };
        }
        return mockUser;
      }

      const currentUser = JSON.parse(userInfoStr);
      if (!currentUser || !currentUser.id) {
        // 如果用户信息不完整，返回默认管理员
        const mockUser = this.findUserById('user_admin_001');
        if (!mockUser) {
          throw {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          };
        }
        return mockUser;
      }

      // 根据当前用户ID查找对应的Mock用户数据
      const mockUser = this.findUserById(currentUser.id);
      if (!mockUser) {
        // 如果找不到对应的Mock用户，返回默认管理员
        const defaultUser = this.findUserById('user_admin_001');
        if (!defaultUser) {
          throw {
            code: 'USER_NOT_FOUND',
            message: '用户不存在'
          };
        }
        return defaultUser;
      }

      return mockUser;
    } catch (error) {
      // 如果解析失败，返回默认管理员
      const mockUser = this.findUserById('user_admin_001');
      if (!mockUser) {
        throw {
          code: 'USER_NOT_FOUND',
          message: '用户不存在'
        };
      }
      return mockUser;
    }
  }

  /**
   * 修改密码
   * 
   * @param {ChangePasswordRequest} request - 修改密码请求
   * @returns {Promise<ChangePasswordResponse>} 修改结果
   * @throws {AuthError} 当前密码错误或新密码不符合要求
   */
  static async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    // 获取当前登录用户
    let currentUser;
    try {
      // 从localStorage获取当前用户信息
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo && userInfo.username) {
          currentUser = this.findUserByUsername(userInfo.username);
        }
      }
    } catch (error) {
      console.error('Failed to get current user from localStorage:', error);
    }

    // 如果无法获取当前用户，使用默认admin用户
    if (!currentUser) {
      currentUser = this.findUserByUsername('admin');
    }

    if (!currentUser) {
      throw {
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      };
    }

    // 验证当前密码
    if (currentUser.password !== request.oldPassword) {
      throw {
        code: 'INVALID_CURRENT_PASSWORD',
        message: '当前密码错误'
      };
    }

    // 验证新密码强度
    if (request.newPassword.length < 8) {
      throw {
        code: 'WEAK_PASSWORD',
        message: '新密码长度不能少于8位'
      };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(request.newPassword)) {
      throw {
        code: 'WEAK_PASSWORD',
        message: '新密码必须包含大小写字母和数字'
      };
    }

    // 模拟密码更新成功
    return {
      message: '密码修改成功'
    };
  }

  /**
   * 获取所有用户列表
   * 
   * @returns {Promise<User[]>} 用户列表
   * @throws {AuthError} 权限不足或获取失败
   */
  static async getUsers(): Promise<User[]> {
    this.log('info', 'Get users list requested');

    try {
      // 验证权限
      this.validatePermission('user:read', 'getUsers');
      
      const users = this.getAllUsers();
      
      this.log('info', 'Users list retrieved successfully', { 
        count: users.length,
        activeCount: users.filter(u => u.status === 'active').length,
        inactiveCount: users.filter(u => u.status === 'inactive').length,
        lockedCount: users.filter(u => u.status === 'locked').length
      });

      return users;

    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        throw error;
      }
      
      throw this.handleError(error, 'getUsers');
    }
  }

  /**
   * 根据ID获取单个用户
   * 
   * @param {string} userId - 用户ID
   * @returns {Promise<User>} 用户信息
   * @throws {AuthError} 用户不存在
   */
  static async getUserById(userId: string): Promise<User> {
    const user = this.findUserById(userId);
    if (!user) {
      throw {
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      };
    }
    return user;
  }

  /**
   * 创建用户
   * 
   * @param {CreateUserRequest} userData - 创建用户请求
   * @returns {Promise<User>} 创建的用户信息
   * @throws {AuthError} 用户已存在或数据验证失败
   */
  static async createUser(userData: CreateUserRequest): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = this.findUserByUsername(userData.username);
    if (existingUser) {
      throw {
        code: 'USERNAME_EXISTS',
        message: '用户名已存在'
      };
    }

    // 验证邮箱是否已存在
    const emailExists = Object.values(MOCK_USERS_DATABASE).some(user => user.email === userData.email);
    if (emailExists) {
      throw {
        code: 'EMAIL_EXISTS',
        message: '邮箱地址已存在'
      };
    }

    // 生成新用户ID
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建用户数据
    const newUserData = {
      id: newUserId,
      username: userData.username,
      email: userData.email,
      fullName: userData.fullName,
      password: userData.password,
      phoneNumber: userData.phoneNumber || '',
      status: userData.status || 'active' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 模拟创建用户（实际应该保存到数据库）
    const { roles, permissions } = this.getUserRolesAndPermissions(userData.username);
    
    const newUser: User = {
      ...newUserData,
      roles,
      permissions
    };

    return newUser;
  }

  /**
   * 更新用户信息
   * 
   * @param {string} userId - 用户ID
   * @param {UpdateUserRequest} userData - 更新用户请求
   * @returns {Promise<User>} 更新后的用户信息
   * @throws {AuthError} 用户不存在或数据验证失败
   */
  static async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    const existingUser = this.findUserById(userId);
    if (!existingUser) {
      throw {
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      };
    }

    // 检查用户名是否与其他用户冲突
    if (userData.username && userData.username !== existingUser.username) {
      const usernameExists = Object.values(MOCK_USERS_DATABASE).some(
        user => user.username === userData.username && user.id !== userId
      );
      if (usernameExists) {
        throw {
          code: 'USERNAME_EXISTS',
          message: '用户名已存在'
        };
      }
    }

    // 检查邮箱是否与其他用户冲突
    if (userData.email && userData.email !== existingUser.email) {
      const emailExists = Object.values(MOCK_USERS_DATABASE).some(
        user => user.email === userData.email && user.id !== userId
      );
      if (emailExists) {
        throw {
          code: 'EMAIL_EXISTS',
          message: '邮箱地址已存在'
        };
      }
    }

    // 更新用户数据
    const updatedUserData = {
      ...existingUser,
      ...userData,
      updatedAt: new Date().toISOString()
    };

    // 获取更新的角色和权限
    const { roles, permissions } = this.getUserRolesAndPermissions(updatedUserData.username);
    
    const updatedUser: User = {
      ...updatedUserData,
      roles,
      permissions
    };

    return updatedUser;
  }

  /**
   * 删除用户
   * 
   * @param {string} userId - 用户ID
   * @returns {Promise<DeleteUserResponse>} 删除结果
   * @throws {AuthError} 用户不存在或不能删除最后一个管理员
   */
  static async deleteUser(userId: string): Promise<DeleteUserResponse> {
    const user = this.findUserById(userId);
    if (!user) {
      throw {
        code: 'USER_NOT_FOUND',
        message: '用户不存在'
      };
    }

    // 检查是否为最后一个管理员
    const adminUsers = this.getAllUsers().filter(u => 
      u.roles.some(role => role.name === 'administrator')
    );
    
    if (user.roles.some(role => role.name === 'administrator') && adminUsers.length <= 1) {
      throw {
        code: 'CANNOT_DELETE_LAST_ADMIN',
        message: '不能删除系统最后一个管理员账户'
      };
    }

    // 模拟删除成功
    return {
      message: '用户已成功删除'
    };
  }

  /**
   * 用户注册
   * 
   * @param {RegisterRequest} userData - 注册用户数据
   * @returns {Promise<RegisterResponse>} 注册结果
   * @throws {AuthError} 用户已存在或数据验证失败
   */
  static async register(userData: RegisterRequest): Promise<RegisterResponse> {
    // 检查用户名是否已存在
    const existingUser = this.findUserByUsername(userData.username);
    if (existingUser) {
      throw {
        code: 'USERNAME_EXISTS',
        message: '用户名已存在'
      };
    }

    // 检查邮箱是否已存在
    const emailExists = Object.values(MOCK_USERS_DATABASE).some(user => user.email === userData.email);
    if (emailExists) {
      throw {
        code: 'EMAIL_EXISTS',
        message: '邮箱地址已存在'
      };
    }

    // 验证密码强度
    if (userData.password.length < 8) {
      throw {
        code: 'WEAK_PASSWORD',
        message: '密码长度不能少于8位'
      };
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
      throw {
        code: 'WEAK_PASSWORD',
        message: '密码必须包含大小写字母和数字'
      };
    }

    // 模拟注册成功
    return {
      message: '用户注册成功'
    };
  }

  /**
   * 标准化错误处理
   * 
   * @param {any} error - 原始错误
   * @returns {AuthError} 标准化错误
   */
  private static normalizeError(error: any): AuthError {
    return {
      code: error.code || 'AUTH_ERROR',
      message: error.message || '认证失败'
    };
  }
}

// 导出便捷方法（全部11个API接口）
export const mockLogin = MockAuthService.login;
export const mockLogout = MockAuthService.logout;
export const mockRefreshToken = MockAuthService.refreshToken;
export const mockGetCurrentUser = MockAuthService.getCurrentUser;
export const mockChangePassword = MockAuthService.changePassword;
export const mockGetUsers = MockAuthService.getUsers;
export const mockGetUserById = MockAuthService.getUserById;
export const mockCreateUser = MockAuthService.createUser;
export const mockUpdateUser = MockAuthService.updateUser;
export const mockDeleteUser = MockAuthService.deleteUser;
export const mockRegister = MockAuthService.register;