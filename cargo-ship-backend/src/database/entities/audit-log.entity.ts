/**
 * 审计日志实体类
 *
 * 描述：记录系统中所有用户操作和重要事件，用于安全审计和合规要求
 * 数据库表：audit_logs
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

/**
 * 审计操作类型枚举
 *
 * 定义系统中需要记录的所有操作类型
 *
 * @enum {string}
 *
 * 认证相关：
 * @property {string} LOGIN - 用户登录
 * @property {string} LOGOUT - 用户登出
 * @property {string} LOGIN_FAILED - 登录失败
 * @property {string} PASSWORD_CHANGED - 密码修改
 * @property {string} PASSWORD_RESET - 密码重置
 *
 * CRUD操作：
 * @property {string} CREATE - 创建记录
 * @property {string} READ - 读取记录
 * @property {string} UPDATE - 更新记录
 * @property {string} DELETE - 删除记录
 * @property {string} RESTORE - 恢复已删除记录
 *
 * 特殊操作：
 * @property {string} EXPORT - 导出数据
 * @property {string} IMPORT - 导入数据
 * @property {string} APPROVE - 审批通过
 * @property {string} REJECT - 审批拒绝
 * @property {string} SUBMIT - 提交申请
 *
 * 系统操作：
 * @property {string} CONFIG_CHANGE - 配置变更
 * @property {string} PERMISSION_CHANGE - 权限变更
 */
export enum AuditAction {
  // Authentication
  LOGIN = 'login',
  LOGOUT = 'logout',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',

  // CRUD Operations
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  RESTORE = 'restore',

  // Specific Operations
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',

  // System
  CONFIG_CHANGE = 'config_change',
  PERMISSION_CHANGE = 'permission_change',
}

/**
 * 审计日志实体
 *
 * 该实体类记录系统中所有重要操作，包括：
 * - 用户认证事件（登录、登出、密码变更）
 * - 数据操作（增删改查）
 * - 敏感操作（权限变更、配置修改）
 * - 操作上下文（IP地址、用户代理、执行时长）
 *
 * 索引优化：
 * - (userId, createdAt): 按用户查询操作历史
 * - (resource, createdAt): 按资源查询操作历史
 * - (action, createdAt): 按操作类型查询
 */
@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['resource', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  /**
   * 审计日志唯一标识符
   * 使用UUID v4格式，自动生成
   */
  @ApiProperty({
    description: '审计日志唯一标识符（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 执行操作的用户ID
   *
   * 说明：
   * - 关联到User实体
   * - 可为null（系统自动操作或匿名访问）
   */
  @ApiPropertyOptional({
    description: '执行操作的用户ID（UUID格式），系统操作时为null',
    example: 'f1g2h3i4-j5k6-7890-lmno-pq1234567890',
    type: String,
  })
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string;

  /**
   * 操作类型
   *
   * 说明：
   * - 使用AuditAction枚举值
   * - 记录具体执行了什么操作
   */
  @ApiProperty({
    description: '操作类型',
    enum: AuditAction,
    example: AuditAction.CREATE,
  })
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  /**
   * 操作的资源类型
   *
   * 规则：
   * - 最大长度100字符
   * - 例如：user, device, vessel等
   */
  @ApiProperty({
    description: '操作的资源类型（如user、device、equipment等）',
    example: 'equipment',
    type: String,
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  /**
   * 操作的资源ID
   *
   * 规则：
   * - 最大长度100字符
   * - 可选字段（nullable）
   * - 用于定位具体操作的记录
   */
  @ApiPropertyOptional({
    description: '操作的资源ID，用于定位具体操作的记录',
    example: 'SYS-BAT-001',
    type: String,
    maxLength: 100,
  })
  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
  resourceId: string;

  /**
   * 操作详细描述
   *
   * 规则：
   * - 文本类型，无长度限制
   * - 可选字段（nullable）
   * - 记录操作的详细信息
   */
  @ApiPropertyOptional({
    description: '操作详细描述',
    example: '创建设备：左推进电机',
    type: String,
  })
  @Column({ type: 'text', nullable: true })
  details: string;

  /**
   * 操作前的数据值
   *
   * 说明：
   * - JSON格式存储
   * - 可选字段（nullable）
   * - 用于数据变更的审计追溯
   */
  @ApiPropertyOptional({
    description: '操作前的数据值（JSON格式）',
    example: { status: 'normal', deviceName: '旧名称' },
  })
  @Column({ name: 'old_values', type: 'json', nullable: true })
  oldValues: Record<string, any>;

  /**
   * 操作后的新数据值
   *
   * 说明：
   * - JSON格式存储
   * - 可选字段（nullable）
   * - 用于数据变更的审计追溯
   */
  @ApiPropertyOptional({
    description: '操作后的新数据值（JSON格式）',
    example: { status: 'warning', deviceName: '新名称' },
  })
  @Column({ name: 'new_values', type: 'json', nullable: true })
  newValues: Record<string, any>;

  /**
   * 操作来源IP地址
   *
   * 规则：
   * - 最大长度45字符（支持IPv6）
   * - 可选字段（nullable）
   * - 用于安全审计和异常检测
   */
  @ApiPropertyOptional({
    description: '操作来源IP地址（支持IPv4和IPv6）',
    example: '192.168.1.100',
    type: String,
    maxLength: 45,
  })
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  /**
   * 用户代理字符串
   *
   * 规则：
   * - 最大长度255字符
   * - 可选字段（nullable）
   * - 记录浏览器/客户端信息
   */
  @ApiPropertyOptional({
    description: '用户代理字符串，记录浏览器/客户端信息',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    type: String,
    maxLength: 255,
  })
  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string;

  /**
   * 操作是否成功
   *
   * 说明：
   * - true: 操作成功执行
   * - false: 操作失败
   * - 默认值：true
   */
  @ApiProperty({
    description: '操作是否成功',
    example: true,
    type: Boolean,
    default: true,
  })
  @Column({ type: 'boolean', default: true })
  success: boolean;

  /**
   * 错误信息
   *
   * 规则：
   * - 文本类型，无长度限制
   * - 可选字段（nullable）
   * - 当success为false时记录失败原因
   */
  @ApiPropertyOptional({
    description: '错误信息，当操作失败时记录失败原因',
    example: '设备ID不存在',
    type: String,
  })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  /**
   * 操作执行时长
   *
   * 说明：
   * - 单位：毫秒
   * - 可选字段（nullable）
   * - 用于性能监控和分析
   */
  @ApiPropertyOptional({
    description: '操作执行时长（毫秒）',
    example: 125,
    type: Number,
  })
  @Column({ type: 'int', nullable: true })
  duration: number;

  /**
   * 执行操作的用户（多对一关联）
   *
   * 关系配置：
   * - 外键关联到users表
   * - 可为null（系统操作）
   */
  @ApiPropertyOptional({
    description: '执行操作的用户',
    type: () => User,
  })
  @ManyToOne(() => User, (user) => user.auditLogs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * 日志创建时间
   *
   * 说明：
   * - 自动设置为记录创建时的时间戳
   * - 用于审计追溯和时间排序
   */
  @ApiProperty({
    description: '日志创建时间',
    example: '2025-01-01T10:00:00.000Z',
    type: Date,
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
