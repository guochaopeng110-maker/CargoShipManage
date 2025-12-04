import {
  IsNotEmpty,
  IsUUID,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  MetricType,
  DataQuality,
  DataSource,
} from '../../../database/entities/time-series-data.entity';

/**
 * 创建时序监测数据 DTO
 *
 * 核心4字段必填：
 * - equipmentId: 设备ID
 * - timestamp: 数据时间戳
 * - metricType: 指标类型
 * - value: 指标数值
 */
export class CreateTimeSeriesDataDto {
  /**
   * 设备ID（必填）
   * 必须是有效的UUID格式
   */
  @ApiProperty({
    description: '设备唯一标识（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: '设备ID不能为空' })
  @IsUUID('4', { message: '设备ID格式无效，必须是UUID v4格式' })
  equipmentId: string;

  /**
   * 数据时间戳（必填）
   * 使用Date类型，自动转换
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
   * 支持：vibration/temperature/pressure/humidity/speed/current/voltage/power
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
   * 范围：-999999.99 到 999999.99
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
   * 如果未提供，系统会根据metricType自动填充标准单位
   */
  @ApiPropertyOptional({
    description: '数据单位（可选，未提供时使用默认值）',
    example: 'mm/s',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: '单位长度不能超过20个字符' })
  unit?: string;

  /**
   * 数据质量标记（可选，默认为normal）
   */
  @ApiPropertyOptional({
    description: '数据质量标记（可选，默认为normal）',
    enum: DataQuality,
    default: DataQuality.NORMAL,
  })
  @IsOptional()
  @IsEnum(DataQuality, { message: '数据质量标记无效' })
  quality?: DataQuality;

  /**
   * 数据来源（可选，默认为sensor-upload）
   */
  @ApiPropertyOptional({
    description: '数据来源（可选，默认为sensor-upload）',
    enum: DataSource,
    default: DataSource.SENSOR_UPLOAD,
  })
  @IsOptional()
  @IsEnum(DataSource, { message: '数据来源无效' })
  source?: DataSource;
}
