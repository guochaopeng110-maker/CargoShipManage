import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '../../../database/entities/time-series-data.entity';

/**
 * 创建监测点 DTO
 *
 * 用于管理员手动创建监测点定义（通常通过 Seed 脚本批量创建）
 */
export class CreateMonitoringPointDto {
  /**
   * 关联设备ID（UUID）
   */
  @ApiProperty({
    description: '关联设备ID（UUID）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID('4', { message: '设备ID必须是有效的UUID' })
  equipmentId: string;

  /**
   * 监测点名称（中文标识）
   */
  @ApiProperty({
    description: '监测点名称（中文标识，如"总电压"、"最高单体温度"）',
    example: '总电压',
    maxLength: 100,
  })
  @IsString({ message: '监测点名称必须是字符串' })
  @MaxLength(100, { message: '监测点名称不能超过100个字符' })
  pointName: string;

  /**
   * 指标类型
   */
  @ApiProperty({
    description: '指标类型（物理测量类型）',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType: MetricType;

  /**
   * 数据单位
   */
  @ApiPropertyOptional({
    description: '数据单位（如: V, A, ℃, %, kΩ）',
    example: 'V',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: '数据单位必须是字符串' })
  @MaxLength(20, { message: '数据单位不能超过20个字符' })
  unit?: string;

  /**
   * 监测点说明/描述
   */
  @ApiPropertyOptional({
    description: '监测点说明/描述',
    example: '电池系统总电压监测，用于评估电池组整体电压状态',
  })
  @IsOptional()
  @IsString({ message: '监测点说明必须是字符串' })
  description?: string;
}

/**
 * 更新监测点 DTO
 *
 * 所有字段可选，仅更新提供的字段
 */
export class UpdateMonitoringPointDto {
  /**
   * 监测点名称
   */
  @ApiPropertyOptional({
    description: '监测点名称（中文标识）',
    example: '总电压',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '监测点名称必须是字符串' })
  @MaxLength(100, { message: '监测点名称不能超过100个字符' })
  pointName?: string;

  /**
   * 指标类型
   */
  @ApiPropertyOptional({
    description: '指标类型',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  @IsOptional()
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType?: MetricType;

  /**
   * 数据单位
   */
  @ApiPropertyOptional({
    description: '数据单位',
    example: 'V',
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: '数据单位必须是字符串' })
  @MaxLength(20, { message: '数据单位不能超过20个字符' })
  unit?: string;

  /**
   * 监测点说明
   */
  @ApiPropertyOptional({
    description: '监测点说明/描述',
    example: '电池系统总电压监测',
  })
  @IsOptional()
  @IsString({ message: '监测点说明必须是字符串' })
  description?: string;
}

/**
 * 查询监测点列表 DTO
 *
 * 支持分页和按指标类型筛选
 */
export class QueryMonitoringPointDto {
  /**
   * 页码（从1开始）
   */
  @ApiPropertyOptional({
    description: '页码（从1开始）',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于1' })
  page?: number = 1;

  /**
   * 每页数量
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于等于1' })
  @Max(100, { message: '每页数量不能超过100' })
  pageSize?: number = 20;

  /**
   * 按指标类型筛选
   */
  @ApiPropertyOptional({
    description: '按指标类型筛选',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  @IsOptional()
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType?: MetricType;

  /**
   * 关键词搜索（监测点名称）
   */
  @ApiPropertyOptional({
    description: '关键词搜索（监测点名称）',
    example: '电压',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;
}

/**
 * 监测点响应 DTO
 *
 * 用于API响应，包含完整的监测点信息
 */
export class MonitoringPointResponseDto {
  /**
   * 监测点ID
   */
  @ApiProperty({
    description: '监测点ID（UUID）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  /**
   * 关联设备ID
   */
  @ApiProperty({
    description: '关联设备ID（UUID）',
    example: 'equipment-uuid-here',
  })
  equipmentId: string;

  /**
   * 监测点名称
   */
  @ApiProperty({
    description: '监测点名称（中文标识）',
    example: '总电压',
  })
  pointName: string;

  /**
   * 指标类型
   */
  @ApiProperty({
    description: '指标类型',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  metricType: MetricType;

  /**
   * 数据单位
   */
  @ApiPropertyOptional({
    description: '数据单位',
    example: 'V',
  })
  unit?: string;

  /**
   * 监测点说明
   */
  @ApiPropertyOptional({
    description: '监测点说明/描述',
    example: '电池系统总电压监测',
  })
  description?: string;
}
