/**
 * 角色实体类
 *
 * 描述：定义系统角色模型，实现基于角色的访问控制（RBAC）
 * 数据库表：roles
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
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Permission } from './permission.entity';

/**
 * 系统预定义角色枚举
 *
 * @enum {string}
 * @property {string} ADMINISTRATOR - 系统管理员，拥有全部权限
 * @property {string} OPERATOR - 操作员，拥有大部分业务操作权限
 * @property {string} VIEWER - 查看者，仅拥有只读权限
 */
export enum SystemRole {
  ADMINISTRATOR = 'administrator',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

/**
 * 角色实体
 *
 * 该实体类实现RBAC权限控制的核心，管理系统中所有角色：
 * - 系统角色：预定义的角色（如管理员、操作员、查看者）
 * - 自定义角色：用户根据业务需求创建的角色
 * - 角色与用户、权限的多对多关联
 */
@Entity('roles')
export class Role {
  /**
   * 角色唯一标识符
   * 使用UUID v4格式，自动生成
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 角色名称
   *
   * 规则：
   * - 最大长度50字符
   * - 全局唯一
   * - 系统角色使用SystemRole枚举值
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  /**
   * 角色描述
   *
   * 规则：
   * - 最大长度255字符
   * - 可选字段（nullable）
   * - 用于说明角色的职责和权限范围
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  /**
   * 是否为系统角色
   *
   * 说明：
   * - true: 系统预定义角色，不可删除或重命名
   * - false: 自定义角色，可以修改和删除
   * - 默认值：false
   */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  /**
   * 角色是否激活
   *
   * 说明：
   * - true: 角色可用，用户可以被分配此角色
   * - false: 角色已停用，不能分配给新用户
   * - 默认值：true
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /**
   * 拥有此角色的用户列表（多对多）
   *
   * 关系配置：
   * - 通过user_roles中间表关联
   * - 反向关系（由User实体维护）
   */
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  /**
   * 角色拥有的权限列表（多对多）
   *
   * 关系配置：
   * - 通过role_permissions中间表关联
   * - 急加载（eager: true）
   * - 一个角色可以有多个权限
   */
  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: true,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

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

  /**
   * 软删除时间
   *
   * 说明：
   * - null表示未删除
   * - 有值表示已软删除，记录删除时间
   * - 系统角色不允许删除
   */
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
