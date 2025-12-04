import {
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MetricType,
  DataQuality,
} from '../../../database/entities/time-series-data.entity';

/**
 * 批量数据项 DTO
 * 用于批量上报时的单条数据项
 */
export class BatchDataItemDto {
  /**
   * 数据时间戳（必填）
   */
  @ApiProperty({
    description: '数据时间戳',
    example: '2025-11-19T10:30:00.000Z',
    type: Date,
  })
  @IsNotEmpty({ message: '时间戳不能为空' })
  @IsDate({ message: '时间戳格式无效' })
  @Type(() => Date)
  timestamp: Date;

  /**
   * 指标类型（必填）
   */
  @ApiProperty({
    description: '指标类型',
    enum: MetricType,
    example: MetricType.VIBRATION,
  })
  @IsNotEmpty({ message: '指标类型不能为空' })
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType: MetricType;

  /**
   * 指标数值（必填）
   */
  @ApiProperty({
    description: '指标数值',
    example: 12.5,
    minimum: -999999.99,
    maximum: 999999.99,
  })
  @IsNotEmpty({ message: '数值不能为空' })
  @IsNumber({}, { message: '数值必须是数字' })
  @Min(-999999.99, { message: '数值超出最小范围' })
  @Max(999999.99, { message: '数值超出最大范围' })
  value: number;

  /**
   * 数据单位（可选）
   */
  @ApiPropertyOptional({
    description: '数据单位（可选）',
    example: 'mm/s',
  })
  @IsOptional()
  unit?: string;

  /**
   * 数据质量标记（可选）
   */
  @ApiPropertyOptional({
    description: '数据质量标记（可选）',
    enum: DataQuality,
  })
  @IsOptional()
  @IsEnum(DataQuality, { message: '数据质量标记无效' })
  quality?: DataQuality;
}

/**
 * 批量接收监测数据 DTO
 *
 * 支持一次性上报同一设备的多条监测数据
 * 最大支持1000条数据/次
 */
export class CreateBatchTimeSeriesDataDto {
  /**
   * 设备ID（必填）
   * 批量数据必须属于同一设备
   */
  @ApiProperty({
    description: '设备唯一标识（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: '设备ID不能为空' })
  @IsUUID('4', { message: '设备ID格式无效，必须是UUID v4格式' })
  equipmentId: string;

  /**
   * 监测数据数组（必填）
   * 最少1条，最多1000条
   */
  @ApiProperty({
    description: '监测数据数组（1-1000条）',
    type: [BatchDataItemDto],
    minItems: 1,
    maxItems: 1000,
  })
  @IsArray({ message: '数据必须是数组格式' })
  @ArrayMinSize(1, { message: '至少需要1条数据' })
  @ArrayMaxSize(1000, { message: '最多支持1000条数据' })
  @ValidateNested({ each: true })
  @Type(() => BatchDataItemDto)
  data: BatchDataItemDto[];
}
