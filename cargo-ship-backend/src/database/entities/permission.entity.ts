/**
 * 权限实体类
 *
 * 描述：定义系统权限模型，实现细粒度的资源访问控制
 * 数据库表：permissions
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Role } from './role.entity';

/**
 * 权限资源枚举
 *
 * 定义系统中所有可控制访问的资源类型
 *
 * @enum {string}
 *
 * 设备管理相关：
 * @property {string} DEVICE - 设备台账
 *
 * 监控相关：
 * @property {string} SENSOR_DATA - 传感器数据（支持增删改查、导入导出）
 * @property {string} ALERT - 告警信息（支持增删改查）
 *
 * 报表管理：
 * @property {string} REPORT - 报表管理（支持增删改查、导出）
 *
 * 用户与认证相关：
 * @property {string} USER - 用户管理（支持增删改查）
 * @property {string} ROLE - 角色管理（支持增删改查）
 * @property {string} PERMISSION - 权限管理（支持增删改查）
 *
 * 系统管理相关：
 * @property {string} AUDIT_LOG - 审计日志（支持查看、导出）
 * @property {string} SYSTEM_CONFIG - 系统配置（支持查看、更新）
 *
 * @版本更新 2024-11-26
 * - 移除：VESSEL（船舶）、COMPARTMENT（船舱）、CARGO（货物）、LOADING_PLAN（装载计划）、DEVICE_TYPE（设备类型）
 * - 保留：DEVICE、SENSOR_DATA、ALERT、REPORT、USER、ROLE、PERMISSION、AUDIT_LOG、SYSTEM_CONFIG
 * - 总计：9个资源类型
 */
export enum PermissionResource {
  // Device Management
  DEVICE = 'device',

  // Monitoring
  SENSOR_DATA = 'sensor_data',
  ALERT = 'alert',

  // Report Management
  REPORT = 'report',

  // User & Auth
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',

  // System
  AUDIT_LOG = 'audit_log',
  SYSTEM_CONFIG = 'system_config',
}

/**
 * 权限操作枚举
 *
 * 定义可以对资源执行的操作类型
 *
 * @enum {string}
 * @property {string} CREATE - 创建资源
 * @property {string} READ - 读取/查看资源
 * @property {string} UPDATE - 更新/编辑资源
 * @property {string} DELETE - 删除资源
 * @property {string} MANAGE - 管理资源（包含所有操作）
 * @property {string} EXPORT - 导出数据
 * @property {string} IMPORT - 导入数据
 * @property {string} APPROVE - 审批操作
 */
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
}

/**
 * 权限实体
 *
 * 该实体类实现细粒度的权限控制：
 * - 基于资源和操作的权限定义（resource:action）
 * - 例如：device:create 表示创建设备的权限
 * - 与角色多对多关联，通过角色授予用户
 */
@Entity('permissions')
@Index(['resource', 'action'], { unique: true })
export class Permission {
  /**
   * 权限唯一标识符
   * 使用UUID v4格式，自动生成
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 权限名称
   *
   * 规则：
   * - 最大长度100字符
   * - 全局唯一
   * - 格式通常为：resource:action（如：device:create）
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  /**
   * 权限控制的资源类型
   *
   * 说明：
   * - 使用PermissionResource枚举值
   * - 与action组合形成完整权限
   */
  @Column({
    type: 'enum',
    enum: PermissionResource,
  })
  resource: PermissionResource;

  /**
   * 权限允许的操作类型
   *
   * 说明：
   * - 使用PermissionAction枚举值
   * - 与resource组合形成完整权限
   */
  @Column({
    type: 'enum',
    enum: PermissionAction,
  })
  action: PermissionAction;

  /**
   * 权限描述
   *
   * 规则：
   * - 最大长度255字符
   * - 可选字段（nullable）
   * - 用于说明权限的用途和范围
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  /**
   * 是否为系统权限
   *
   * 说明：
   * - true: 系统预定义权限，不可删除
   * - false: 自定义权限，可以修改和删除
   * - 默认值：false
   */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  /**
   * 拥有此权限的角色列表（多对多）
   *
   * 关系配置：
   * - 通过role_permissions中间表关联
   * - 反向关系（由Role实体维护）
   */
  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];

  /**
   * 记录创建时间
   * 自动设置为首次保存时的时间戳
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 记录最后更新时间
   * 每次更新时自动更新为当前时间戳
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
