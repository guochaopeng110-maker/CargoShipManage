/**
 * 货船智能机舱管理系统 - 认证相关类型定义
 * 
 * 基于后端API文档的标准化类型定义
 * 与后端Auth模块API完全一致
 * 
 * 后端API文档: docs/refer/api/auth-api.md
 * 基础路径: /auth
 */

/**
 * 用户实体接口
 * 与后端 /auth/profile 和 /auth/users 响应格式一致
 */
export interface User {
  id: string;                    // 用户UUID
  username: string;              // 用户名
  email: string;                 // 邮箱地址
  fullName: string;              // 用户全名
  phoneNumber?: string;          // 手机号码（可选）
  status: 'active' | 'inactive' | 'locked'; // 用户状态，与后端UserStatus枚举一致
  isActive: boolean;             // 用户是否激活（用于权限检查）
  roles: Role[];                 // 用户角色列表
  permissions?: Permission[];    // 用户权限列表（仅在登录响应中存在）
  lastLoginAt?: string;          // 最后登录时间（ISO 8601格式）
  lastLoginIp?: string;          // 最后登录IP
  createdAt: string;             // 创建时间（ISO 8601格式）
  updatedAt: string;             // 更新时间（ISO 8601格式）
}

/**
 * 角色实体接口
 * 与后端系统角色定义一致
 */
export interface Role {
  id: string;                              // 角色UUID
  name: 'administrator' | 'operator' | 'viewer'; // 系统角色，与SystemRole枚举一致
  description?: string;                     // 角色描述
}

/**
 * 权限类型
 * 直接使用后端权限格式 "resource:action"
 * 例如: "user:create", "user:read", "user:update", "user:delete"
 */
export type Permission = string;

/**
 * 认证状态接口
 * 简化的认证状态管理
 */
export interface AuthState {
  isAuthenticated: boolean;    // 是否已认证
  user: User | null;           // 当前用户信息
  permissions: Permission[];   // 用户权限列表（字符串数组）
  roles: Role[];               // 用户角色列表
  loading: boolean;            // 是否正在加载
  error: string | null;        // 认证错误信息
  accessToken: string | null;  // JWT访问令牌
  refreshToken: string | null; // 刷新令牌
  retryCount: number;          // 登录重试次数
}

/**
 * 登录请求接口
 * 与后端 /auth/login 请求格式一致
 */
export interface LoginRequest {
  username: string;  // 用户名
  password: string;  // 密码
}

/**
 * 用户注册请求接口
 * 与后端 /auth/register 请求格式一致
 */
export interface RegisterRequest {
  username: string;     // 用户名（3-50字符，字母数字下划线连字符）
  email: string;        // 邮箱地址
  password: string;     // 密码（最小8字符，必须包含大小写字母、数字和特殊字符）
  fullName: string;     // 用户全名（2-100字符）
  phoneNumber?: string; // 手机号码（可选）
}

/**
 * 认证响应接口
 * 与后端 /auth/login 响应格式一致
 */
export interface AuthResponse {
  accessToken: string;  // 访问令牌（JWT）
  refreshToken: string; // 刷新令牌
  user: User;           // 用户信息对象
}

/**
 * 令牌刷新响应接口
 * 与后端 /auth/refresh 响应格式一致
 */
export interface TokenRefreshResponse {
  accessToken: string;  // 新的访问令牌
}

/**
 * 注册响应接口
 * 与后端 /auth/register 响应格式一致
 */
export interface RegisterResponse {
  message: string;  // 响应消息
}

/**
 * 修改密码请求接口
 * 与后端 /auth/change-password 请求格式一致
 */
export interface ChangePasswordRequest {
  oldPassword: string;  // 当前密码
  newPassword: string;  // 新密码（最小8字符，必须包含大小写字母、数字和特殊字符）
}

/**
 * 修改密码响应接口
 */
export interface ChangePasswordResponse {
  message: string;  // 响应消息
}

/**
 * 创建用户请求接口
 * 与后端 POST /auth/users 请求格式一致
 */
export interface CreateUserRequest {
  username: string;          // 用户名
  email: string;             // 邮箱地址
  password: string;          // 密码
  fullName: string;          // 用户全名
  phoneNumber?: string;      // 手机号码（可选）
  roleIds: string[];         // 角色ID数组
  status?: 'active' | 'inactive' | 'locked'; // 用户状态
}

/**
 * 更新用户请求接口
 * 与后端 PUT /auth/users/:id 请求格式一致
 */
export interface UpdateUserRequest {
  username?: string;                          // 用户名
  email?: string;                             // 邮箱地址
  password?: string;                          // 新密码（管理员重置用户密码）
  fullName?: string;                          // 用户全名
  phoneNumber?: string;                       // 手机号码
  roleIds?: string[];                         // 角色ID数组（完全替换现有角色）
  status?: 'active' | 'inactive' | 'locked';  // 用户状态
}

/**
 * 删除用户响应接口
 * 与后端 DELETE /auth/users/:id 响应格式一致
 */
export interface DeleteUserResponse {
  message: string;  // 响应消息
}

/**
 * 用户状态枚举
 * 与后端UserStatus枚举一致
 */
export enum UserStatus {
  ACTIVE = 'active',      // 激活
  INACTIVE = 'inactive',  // 停用
  LOCKED = 'locked'       // 锁定
}

/**
 * 系统角色枚举
 * 与后端SystemRole枚举一致
 */
export enum SystemRole {
  ADMINISTRATOR = 'administrator',  // 管理员
  OPERATOR = 'operator',            // 操作员
  VIEWER = 'viewer'                 // 查看者
}

/**
 * 权限常量
 * 基于后端统一权限方案的完整权限定义（35个权限）
 * 遵循docs/refer/role-permission-uniform.md规范
 */
export const PERMISSIONS = {
  // === 设备管理权限（4个）===
  DEVICE_CREATE: 'device:create',    // 创建设备
  DEVICE_READ: 'device:read',        // 查看设备
  DEVICE_UPDATE: 'device:update',    // 更新设备
  DEVICE_DELETE: 'device:delete',    // 删除设备

  // === 传感器数据权限（6个）- 新增 ===
  SENSOR_DATA_CREATE: 'sensor_data:create',    // 创建传感器数据
  SENSOR_DATA_READ: 'sensor_data:read',        // 查看传感器数据
  SENSOR_DATA_UPDATE: 'sensor_data:update',    // 更新传感器数据
  SENSOR_DATA_DELETE: 'sensor_data:delete',    // 删除传感器数据
  SENSOR_DATA_IMPORT: 'sensor_data:import',    // 导入传感器数据
  SENSOR_DATA_EXPORT: 'sensor_data:export',    // 导出传感器数据

  // === 告警信息权限（4个）===
  ALERT_CREATE: 'alert:create',      // 创建告警
  ALERT_READ: 'alert:read',          // 查看告警
  ALERT_UPDATE: 'alert:update',      // 更新告警
  ALERT_DELETE: 'alert:delete',      // 删除告警

  // === 报表管理权限（5个）===
  REPORT_CREATE: 'report:create',    // 创建报表
  REPORT_READ: 'report:read',        // 查看报表
  REPORT_UPDATE: 'report:update',    // 更新报表
  REPORT_DELETE: 'report:delete',    // 删除报表
  REPORT_EXPORT: 'report:export',    // 导出报表

  // === 用户管理权限（4个）===
  USER_CREATE: 'user:create',        // 创建用户
  USER_READ: 'user:read',            // 查看用户信息
  USER_UPDATE: 'user:update',        // 更新用户信息
  USER_DELETE: 'user:delete',        // 删除用户

  // === 角色管理权限（4个）- 新增 ===
  ROLE_CREATE: 'role:create',        // 创建角色
  ROLE_READ: 'role:read',            // 查看角色
  ROLE_UPDATE: 'role:update',        // 更新角色
  ROLE_DELETE: 'role:delete',        // 删除角色

  // === 权限管理权限（4个）- 新增 ===
  PERMISSION_CREATE: 'permission:create',  // 创建权限
  PERMISSION_READ: 'permission:read',      // 查看权限
  PERMISSION_UPDATE: 'permission:update',  // 更新权限
  PERMISSION_DELETE: 'permission:delete',  // 删除权限

  // === 系统管理权限（4个）===
  AUDIT_LOG_READ: 'audit_log:read',        // 查看审计日志
  AUDIT_LOG_EXPORT: 'audit_log:export',    // 导出审计日志
  SYSTEM_CONFIG_READ: 'system_config:read',    // 查看系统配置
  SYSTEM_CONFIG_UPDATE: 'system_config:update', // 修改系统配置
} as const;

/**
 * 角色权限映射
 * 基于后端统一权限方案的完整角色权限分配（35个权限）
 * 严格按照docs/refer/role-permission-uniform.md规范
 */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.ADMINISTRATOR]: [
    // === 设备管理（4个）===
    PERMISSIONS.DEVICE_CREATE,
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.DEVICE_UPDATE,
    PERMISSIONS.DEVICE_DELETE,

    // === 传感器数据（6个）===
    PERMISSIONS.SENSOR_DATA_CREATE,
    PERMISSIONS.SENSOR_DATA_READ,
    PERMISSIONS.SENSOR_DATA_UPDATE,
    PERMISSIONS.SENSOR_DATA_DELETE,
    PERMISSIONS.SENSOR_DATA_IMPORT,
    PERMISSIONS.SENSOR_DATA_EXPORT,

    // === 告警信息（4个）===
    PERMISSIONS.ALERT_CREATE,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.ALERT_UPDATE,
    PERMISSIONS.ALERT_DELETE,

    // === 报表管理（5个）===
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.REPORT_DELETE,
    PERMISSIONS.REPORT_EXPORT,

    // === 用户管理（4个）===
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,

    // === 角色管理（4个）===
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_DELETE,

    // === 权限管理（4个）===
    PERMISSIONS.PERMISSION_CREATE,
    PERMISSIONS.PERMISSION_READ,
    PERMISSIONS.PERMISSION_UPDATE,
    PERMISSIONS.PERMISSION_DELETE,

    // === 系统管理（4个）===
    PERMISSIONS.AUDIT_LOG_READ,
    PERMISSIONS.AUDIT_LOG_EXPORT,
    PERMISSIONS.SYSTEM_CONFIG_READ,
    PERMISSIONS.SYSTEM_CONFIG_UPDATE,
  ],

  [SystemRole.OPERATOR]: [
    // === 基础查看权限（4个）===
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.SENSOR_DATA_READ,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.REPORT_READ,

    // === 操作员增强权限（12个）===
    // 传感器数据增强权限
    PERMISSIONS.SENSOR_DATA_CREATE,
    PERMISSIONS.SENSOR_DATA_UPDATE,
    PERMISSIONS.SENSOR_DATA_IMPORT,
    PERMISSIONS.SENSOR_DATA_EXPORT,

    // 告警增强权限
    PERMISSIONS.ALERT_CREATE,
    PERMISSIONS.ALERT_UPDATE,
    PERMISSIONS.ALERT_DELETE,

    // 报表增强权限
    PERMISSIONS.REPORT_CREATE,
    PERMISSIONS.REPORT_UPDATE,
    PERMISSIONS.REPORT_EXPORT,
  ],

  [SystemRole.VIEWER]: [
    // === 仅查看权限（4个）===
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.SENSOR_DATA_READ,
    PERMISSIONS.ALERT_READ,
    PERMISSIONS.REPORT_READ,
  ],
};

/**
 * 认证错误类型
 */
export interface AuthError {
  message: string;  // 错误消息
  code?: string;    // 错误代码
  field?: string;   // 错误字段（适用于表单验证）
}