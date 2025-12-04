/**
 * 审计服务类
 *
 * 描述：提供系统审计日志记录功能，用于安全审计和合规要求
 *
 * 职责：
 * - 记录用户操作和系统事件
 * - 记录认证事件（登录、登出、密码修改）
 * - 记录数据变更（创建、更新、删除）
 * - 记录操作上下文（IP、用户代理、时长）
 *
 * 应用场景：
 * - 安全审计和入侵检测
 * - 合规性要求（如GDPR、等保）
 * - 故障排查和问题追溯
 * - 用户行为分析
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLog,
  AuditAction,
} from '../../database/entities/audit-log.entity';

/**
 * 审计日志数据接口
 *
 * 定义创建审计日志时需要的数据结构
 */
export interface AuditLogData {
  /** 操作用户ID（可选，系统操作时为空） */
  userId?: string;
  /** 操作类型 */
  action: AuditAction;
  /** 操作的资源类型 */
  resource: string;
  /** 操作的资源ID（可选） */
  resourceId?: string;
  /** 操作详细描述（可选） */
  details?: string;
  /** 操作前的数据值（可选） */
  oldValues?: Record<string, any>;
  /** 操作后的数据值（可选） */
  newValues?: Record<string, any>;
  /** 客户端IP地址（可选） */
  ipAddress?: string;
  /** 用户代理字符串（可选） */
  userAgent?: string;
  /** 操作是否成功（可选，默认true） */
  success?: boolean;
  /** 错误信息（可选，失败时使用） */
  errorMessage?: string;
  /** 操作执行时长，单位毫秒（可选） */
  duration?: number;
}

/**
 * 审计服务
 *
 * 提供统一的审计日志记录接口
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * 创建审计日志记录（通用方法）
   *
   * 功能：
   * - 接收审计日志数据并保存到数据库
   * - 自动设置默认值
   * - 支持完整的审计信息记录
   *
   * 用途：
   * - 所有审计日志的底层记录方法
   * - 可用于记录任何类型的操作
   *
   * @param data - 审计日志数据
   * @returns 创建的审计日志对象
   *
   * @example
   * await auditService.log({
   *   userId: 'user-123',
   *   action: AuditAction.UPDATE,
   *   resource: 'device',
   *   resourceId: 'device-456',
   *   oldValues: { name: '旧名称' },
   *   newValues: { name: '新名称' },
   *   ipAddress: '192.168.1.100',
   *   userAgent: 'Mozilla/5.0...'
   * });
   */
  async log(data: AuditLogData): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      details: data.details,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      success: data.success !== undefined ? data.success : true,
      errorMessage: data.errorMessage,
      duration: data.duration,
    });

    return this.auditLogRepository.save(auditLog);
  }

  /**
   * 记录成功的登录事件
   *
   * 功能：
   * - 记录用户成功登录
   * - 包含IP地址和用户代理信息
   * - 用于安全审计和异常检测
   *
   * 应用场景：
   * - 追踪用户登录历史
   * - 检测异常登录（如异地登录）
   * - 统计用户活跃度
   *
   * @param userId - 登录的用户ID
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串（浏览器/客户端信息）
   *
   * @example
   * await auditService.logLogin('user-123', '192.168.1.100', 'Mozilla/5.0...');
   */
  async logLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.LOGIN,
      resource: 'auth',
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * 记录失败的登录尝试
   *
   * 功能：
   * - 记录登录失败事件
   * - 记录失败原因和尝试的用户名
   * - 用于安全监控和暴力破解检测
   *
   * 应用场景：
   * - 检测暴力破解攻击
   * - 追踪恶意登录尝试
   * - 分析登录失败原因
   *
   * @param username - 尝试登录的用户名
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串
   * @param reason - 失败原因（如"密码错误"、"账户锁定"）
   *
   * @example
   * await auditService.logLoginFailed('admin', '192.168.1.100', 'Mozilla/5.0...', 'Invalid password');
   */
  async logLoginFailed(
    username: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ): Promise<void> {
    await this.log({
      action: AuditAction.LOGIN_FAILED,
      resource: 'auth',
      details: `Failed login attempt for username: ${username}`,
      ipAddress,
      userAgent,
      success: false,
      errorMessage: reason,
    });
  }

  /**
   * 记录用户登出事件
   *
   * 功能：
   * - 记录用户主动登出
   * - 包含登出时的上下文信息
   *
   * 应用场景：
   * - 追踪会话生命周期
   * - 计算用户在线时长
   * - 审计访问记录
   *
   * @param userId - 登出的用户ID
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串
   *
   * @example
   * await auditService.logLogout('user-123', '192.168.1.100', 'Mozilla/5.0...');
   */
  async logLogout(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * 记录密码修改事件
   *
   * 功能：
   * - 记录用户修改密码操作
   * - 不记录密码内容（安全考虑）
   * - 包含操作上下文信息
   *
   * 应用场景：
   * - 密码修改审计
   * - 检测异常密码修改（如账户被盗）
   * - 强制密码定期修改策略
   *
   * @param userId - 修改密码的用户ID
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串
   *
   * @example
   * await auditService.logPasswordChange('user-123', '192.168.1.100', 'Mozilla/5.0...');
   */
  async logPasswordChange(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.PASSWORD_CHANGED,
      resource: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      success: true,
    });
  }
}
