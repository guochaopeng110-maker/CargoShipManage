import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

/**
 * 设备状态枚举
 */
export enum EquipmentStatus {
  NORMAL = 'normal', // 正常
  WARNING = 'warning', // 告警
  FAULT = 'fault', // 故障
  OFFLINE = 'offline', // 离线
}

/**
 * 设备实体
 * 存储船舶设备的基本信息和状态管理
 */
@Entity('equipment')
export class Equipment {
  /**
   * UUID主键
   */
  @ApiProperty({
    description: '设备唯一ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @PrimaryGeneratedColumn('uuid', { comment: 'UUID主键' })
  id: string;

  /**
   * 设备编号（唯一标识）
   * 格式：大写字母和数字组合，如 "ENG-001"
   */
  @ApiProperty({ description: '设备编号（唯一标识）', example: 'ENG-001' })
  @Column({
    name: 'device_id',
    unique: true,
    length: 50,
    comment: '设备编号（唯一标识）',
  })
  deviceId: string;

  /**
   * 设备名称
   */
  @ApiProperty({ description: '设备名称', example: '左推进电机' })
  @Column({
    name: 'device_name',
    length: 100,
    comment: '设备名称',
  })
  deviceName: string;

  /**
   * 设备类型
   * 例如：主机、辅机、发电机、空压机等
   */
  @ApiProperty({ description: '设备类型', example: '推进电机' })
  @Column({
    name: 'device_type',
    length: 50,
    comment: '设备类型',
  })
  deviceType: string;

  /**
   * 设备型号
   */
  @ApiProperty({
    description: '设备型号',
    example: 'PM-1500-400V',
    required: false,
  })
  @Column({
    length: 100,
    nullable: true,
    comment: '设备型号',
  })
  model: string;

  /**
   * 制造商
   */
  @ApiProperty({
    description: '制造商',
    example: '某电机制造商',
    required: false,
  })
  @Column({
    length: 100,
    nullable: true,
    comment: '制造商',
  })
  manufacturer: string;

  /**
   * 安装位置
   * 例如：机舱、甲板、船尾等
   */
  @ApiProperty({
    description: '安装位置',
    example: '机舱左侧',
    required: false,
  })
  @Column({
    length: 100,
    nullable: true,
    comment: '安装位置',
  })
  location: string;

  /**
   * 设备状态
   */
  @ApiProperty({
    description: '设备状态',
    enum: EquipmentStatus,
    example: EquipmentStatus.NORMAL,
  })
  @Column({
    type: 'enum',
    enum: EquipmentStatus,
    default: EquipmentStatus.NORMAL,
    comment: '设备状态',
  })
  status: EquipmentStatus;

  /**
   * 投产日期
   */
  @ApiProperty({
    description: '投产日期',
    example: '2024-02-01',
    required: false,
  })
  @Column({
    name: 'commission_date',
    type: 'date',
    nullable: true,
    comment: '投产日期',
  })
  commissionDate: Date;

  /**
   * 设备描述
   */
  @ApiProperty({
    description: '设备描述',
    example: '永磁同步电机，额定功率1500kW',
    required: false,
  })
  @Column({
    type: 'text',
    nullable: true,
    comment: '设备描述',
  })
  description: string;

  /**
   * 创建时间
   */
  @ApiProperty({ description: '记录创建时间' })
  @CreateDateColumn({
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  /**
   * 更新时间
   */
  @ApiProperty({ description: '记录更新时间' })
  @UpdateDateColumn({
    name: 'updated_at',
    comment: '更新时间',
  })
  updatedAt: Date;

  /**
   * 软删除时间
   * 非空表示该设备已被删除
   */
  @Exclude() // 在响应中排除此字段
  @DeleteDateColumn({
    name: 'deleted_at',
    comment: '软删除时间',
  })
  deletedAt: Date;

  // ========== 辅助方法 ==========

  /**
   * 判断设备是否正常运行
   */
  isNormal(): boolean {
    return this.status === EquipmentStatus.NORMAL;
  }

  /**
   * 判断设备是否有告警
   */
  hasWarning(): boolean {
    return this.status === EquipmentStatus.WARNING;
  }

  /**
   * 判断设备是否故障
   */
  isFault(): boolean {
    return this.status === EquipmentStatus.FAULT;
  }

  /**
   * 判断设备是否离线
   */
  isOffline(): boolean {
    return this.status === EquipmentStatus.OFFLINE;
  }

  /**
   * 判断设备是否已删除
   */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }
}
