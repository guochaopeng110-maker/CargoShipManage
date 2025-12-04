import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentStatus } from '../../../database/entities/equipment.entity';

/**
 * 创建设备 DTO
 */
export class CreateEquipmentDto {
  /**
   * 设备编号（唯一标识）
   * 格式：大写字母、数字和连字符，如 "ENG-001"
   */
  @ApiProperty({
    description: '设备编号（唯一标识）',
    example: 'ENG-001',
    pattern: '^[A-Z0-9-]+$',
  })
  @IsNotEmpty({ message: '设备编号不能为空' })
  @IsString({ message: '设备编号必须是字符串' })
  @Length(1, 50, { message: '设备编号长度必须在1-50个字符之间' })
  @Matches(/^[A-Z0-9-]+$/, {
    message: '设备编号只能包含大写字母、数字和连字符',
  })
  deviceId: string;

  /**
   * 设备名称
   */
  @ApiProperty({
    description: '设备名称',
    example: '主发动机',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty({ message: '设备名称不能为空' })
  @IsString({ message: '设备名称必须是字符串' })
  @Length(1, 100, { message: '设备名称长度必须在1-100个字符之间' })
  deviceName: string;

  /**
   * 设备类型
   * 例如：主机、辅机、发电机、空压机等
   */
  @ApiProperty({
    description: '设备类型',
    example: '主机',
    minLength: 1,
    maxLength: 50,
  })
  @IsNotEmpty({ message: '设备类型不能为空' })
  @IsString({ message: '设备类型必须是字符串' })
  @Length(1, 50, { message: '设备类型长度必须在1-50个字符之间' })
  deviceType: string;

  /**
   * 设备型号（可选）
   */
  @ApiPropertyOptional({
    description: '设备型号',
    example: 'MAN B&W 6S50MC',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '设备型号必须是字符串' })
  @MaxLength(100, { message: '设备型号长度不能超过100个字符' })
  model?: string;

  /**
   * 制造商（可选）
   */
  @ApiPropertyOptional({
    description: '制造商',
    example: 'MAN Diesel & Turbo',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '制造商必须是字符串' })
  @MaxLength(100, { message: '制造商长度不能超过100个字符' })
  manufacturer?: string;

  /**
   * 安装位置（可选）
   */
  @ApiPropertyOptional({
    description: '安装位置',
    example: '机舱中部',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '安装位置必须是字符串' })
  @MaxLength(100, { message: '安装位置长度不能超过100个字符' })
  location?: string;

  /**
   * 投产日期（可选）
   * 格式：YYYY-MM-DD
   */
  @ApiPropertyOptional({
    description: '投产日期',
    example: '2023-01-15',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: '投产日期格式无效，应为 YYYY-MM-DD' })
  commissionDate?: string;

  /**
   * 设备描述（可选）
   */
  @ApiPropertyOptional({
    description: '设备描述',
    example: '船舶主推进发动机，额定功率9000kW',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: '设备描述必须是字符串' })
  @MaxLength(500, { message: '设备描述长度不能超过500个字符' })
  description?: string;

  /**
   * 设备状态（可选）
   * 如果不指定，默认为 normal
   */
  @ApiPropertyOptional({
    description: '设备状态',
    enum: EquipmentStatus,
    example: EquipmentStatus.NORMAL,
    default: EquipmentStatus.NORMAL,
  })
  @IsOptional()
  @IsEnum(EquipmentStatus, { message: '设备状态无效' })
  status?: EquipmentStatus;
}
