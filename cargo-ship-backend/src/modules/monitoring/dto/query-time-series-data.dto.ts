import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsInt,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '../../../database/entities/time-series-data.entity';

/**
 * 查询时序监测数据 DTO
 *
 * 支持按设备、指标类型、监测点、时间范围进行查询
 * 支持分页查询
 */
export class QueryTimeSeriesDataDto {
  /**
   * 设备ID（必填）
   */
  @ApiProperty({
    description: '设备唯一标识（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: '设备ID不能为空' })
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId: string;

  /**
   * 指标类型（可选）
   * 如果不提供，则查询所有指标类型
   */
  @ApiPropertyOptional({
    description: '指标类型（可选）',
    enum: MetricType,
    example: MetricType.VIBRATION,
  })
  @IsOptional()
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType?: MetricType;

  /**
   * 监测点名称（可选）
   * 用于筛选特定的业务监测点
   * 如果提供，则仅返回该监测点的数据
   */
  @ApiPropertyOptional({
    description: '监测点名称（可选，用于筛选特定监测点）',
    example: '总电压',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '监测点名称必须是字符串' })
  @MaxLength(100, { message: '监测点名称长度不能超过100个字符' })
  monitoringPoint?: string;

  /**
   * 开始时间（必填）
   * Unix时间戳（毫秒）
   */
  @ApiProperty({
    description: '开始时间戳（毫秒）',
    example: 1700000000000,
    type: Number,
  })
  @IsNotEmpty({ message: '开始时间不能为空' })
  @Type(() => Number)
  @IsInt({ message: '开始时间必须是整数' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime: number;

  /**
   * 结束时间（必填）
   * Unix时间戳（毫秒）
   */
  @ApiProperty({
    description: '结束时间戳（毫秒）',
    example: 1700086400000,
    type: Number,
  })
  @IsNotEmpty({ message: '结束时间不能为空' })
  @Type(() => Number)
  @IsInt({ message: '结束时间必须是整数' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime: number;

  /**
   * 页码（可选，默认为1）
   */
  @ApiPropertyOptional({
    description: '页码（从1开始）',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于1' })
  page?: number = 1;

  /**
   * 每页条数（可选，默认为100）
   * 最小1条，最大1000条
   */
  @ApiPropertyOptional({
    description: '每页条数',
    example: 100,
    default: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数至少为1' })
  @Max(1000, { message: '每页条数最多为1000' })
  pageSize?: number = 100;
}
