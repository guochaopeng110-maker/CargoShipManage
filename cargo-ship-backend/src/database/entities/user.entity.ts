/**
 * 用户实体类
 *
 * 描述：定义系统用户的数据模型，包含用户基本信息、认证信息、安全信息等
 * 数据库表：users
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
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from './role.entity';
import { AuditLog } from './audit-log.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
  PENDING = 'pending',
}

@Entity('users')
export class User {
  @ApiProperty({
    description: '用户唯一标识符（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: '用户名（全局唯一）',
    example: 'john_doe',
    type: String,
    maxLength: 50,
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @ApiProperty({
    description: '邮箱地址（全局唯一）',
    example: 'john.doe@example.com',
    type: String,
    maxLength: 100,
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({
    description: '用户全名',
    example: 'John Doe',
    type: String,
    maxLength: 100,
  })
  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '+86 138-1234-5678',
    type: String,
    maxLength: 20,
  })
  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @ApiProperty({
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
    default: UserStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiPropertyOptional({
    description: '最后登录时间',
    example: '2025-01-01T10:00:00.000Z',
    type: Date,
  })
  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @ApiPropertyOptional({
    description: '最后登录IP地址',
    example: '192.168.1.100',
    type: String,
    maxLength: 45,
  })
  @Column({
    name: 'last_login_ip',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  lastLoginIp: string;

  @Exclude()
  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Exclude()
  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @ApiPropertyOptional({
    description: '密码最后修改时间',
    example: '2024-12-01T08:00:00.000Z',
    type: Date,
  })
  @Column({ name: 'password_changed_at', type: 'datetime', nullable: true })
  passwordChangedAt: Date;

  @Exclude()
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @ApiProperty({
    description: '用户拥有的角色列表',
    type: () => [Role],
  })
  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Exclude()
  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @ApiProperty({
    description: '记录创建时间',
    example: '2025-01-01T10:00:00.000Z',
    type: Date,
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: '记录最后更新时间',
    example: '2025-01-02T15:30:00.000Z',
    type: Date,
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '软删除时间',
    example: null,
    type: Date,
  })
  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
