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
import { ApiProperty } from '@nestjs/swagger';

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
    description: '用户唯一标识符',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '用户名', example: 'john_doe' })
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @ApiProperty({ description: '邮箱地址', example: 'john.doe@example.com' })
  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiProperty({ description: '用户全名', example: 'John Doe' })
  @Column({ name: 'full_name', type: 'varchar', length: 100 })
  fullName: string;

  @ApiProperty({
    description: '手机号码 (可选)',
    example: '+86 138-1234-5678',
    required: false,
    nullable: true,
  })
  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber: string;

  @ApiProperty({
    description: '用户状态',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({ description: '最后登录时间', required: false, nullable: true })
  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date;

  @ApiProperty({
    description: '最后登录IP地址',
    example: '192.168.1.100',
    required: false,
    nullable: true,
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

  @ApiProperty({
    description: '密码最后修改时间',
    required: false,
    nullable: true,
  })
  @Column({ name: 'password_changed_at', type: 'datetime', nullable: true })
  passwordChangedAt: Date;

  @Exclude()
  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken: string | null;

  @ApiProperty({ description: '用户拥有的角色列表', type: () => [Role] })
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

  @ApiProperty({ description: '记录创建时间' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: '记录最后更新时间' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
