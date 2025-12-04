import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetricType } from '../../../database/entities/time-series-data.entity';
import { AlarmSeverity } from '../../../database/entities/threshold-config.entity';

/**
 * 监测数据统计查询DTO
 * 用于查询监测数据的统计信息（最大值、最小值、平均值等）
 */
export class MonitoringStatisticsDto {
  @ApiProperty({
    description: '设备ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: true,
  })
  @IsNotEmpty({ message: '设备ID不能为空' })
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId: string;

  @ApiProperty({
    description: '监测指标类型',
    enum: MetricType,
    example: MetricType.TEMPERATURE,
    required: true,
  })
  @IsNotEmpty({ message: '指标类型不能为空' })
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType: MetricType;

  @ApiProperty({
    description: '开始时间（Unix时间戳，毫秒）',
    example: 1700000000000,
    required: true,
  })
  @IsNotEmpty({ message: '开始时间不能为空' })
  @Type(() => Number)
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime: number;

  @ApiProperty({
    description: '结束时间（Unix时间戳，毫秒）',
    example: 1700086400000,
    required: true,
  })
  @IsNotEmpty({ message: '结束时间不能为空' })
  @Type(() => Number)
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime: number;
}

/**
 * 告警统计查询DTO
 * 用于查询告警的统计信息，按严重程度和处理状态分组
 */
export class AlarmStatisticsDto {
  @ApiProperty({
    description: '设备ID（可选，不填则统计所有设备）',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId?: string;

  @ApiProperty({
    description: '开始时间（Unix时间戳，毫秒）',
    example: 1700000000000,
    required: true,
  })
  @IsNotEmpty({ message: '开始时间不能为空' })
  @Type(() => Number)
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime: number;

  @ApiProperty({
    description: '结束时间（Unix时间戳，毫秒）',
    example: 1700086400000,
    required: true,
  })
  @IsNotEmpty({ message: '结束时间不能为空' })
  @Type(() => Number)
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime: number;

  @ApiProperty({
    description: '严重程度筛选（可选）',
    enum: AlarmSeverity,
    example: AlarmSeverity.HIGH,
    required: false,
  })
  @IsOptional()
  @IsEnum(AlarmSeverity, { message: '严重程度无效' })
  severity?: AlarmSeverity;
}

/**
 * 设备状态概览响应DTO
 * 返回设备状态的统计概览
 */
export class EquipmentOverviewDto {
  @ApiProperty({
    description: '设备总数',
    example: 50,
  })
  totalCount: number;

  @ApiProperty({
    description: '在线设备数（状态为normal或warning）',
    example: 45,
  })
  onlineCount: number;

  @ApiProperty({
    description: '离线设备数（状态为offline）',
    example: 3,
  })
  offlineCount: number;

  @ApiProperty({
    description: '异常设备数（有未处理告警）',
    example: 2,
  })
  abnormalCount: number;
}

/**
 * 监测数据统计响应DTO
 */
export class MonitoringStatsResponseDto {
  @ApiProperty({
    description: '最大值',
    example: 95.5,
  })
  max: number;

  @ApiProperty({
    description: '最小值',
    example: 65.2,
  })
  min: number;

  @ApiProperty({
    description: '平均值',
    example: 78.6,
  })
  average: number;

  @ApiProperty({
    description: '标准差',
    example: 8.3,
  })
  stdDev: number;

  @ApiProperty({
    description: '数据点数量',
    example: 1440,
  })
  dataPoints: number;
}

/**
 * 告警统计响应DTO
 */
export class AlarmStatsResponseDto {
  @ApiProperty({
    description: '告警总数',
    example: 45,
  })
  totalCount: number;

  @ApiProperty({
    description: '按严重程度分组统计',
    example: {
      low: 10,
      medium: 20,
      high: 12,
      critical: 3,
    },
  })
  groupBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  @ApiProperty({
    description: '按处理状态分组统计',
    example: {
      pending: 5,
      processing: 8,
      resolved: 30,
      ignored: 2,
    },
  })
  groupByStatus: {
    pending: number;
    processing: number;
    resolved: number;
    ignored: number;
  };
}
