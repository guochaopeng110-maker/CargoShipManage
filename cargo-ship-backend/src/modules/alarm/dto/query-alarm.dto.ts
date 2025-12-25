import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AlarmSeverity, AlarmStatus } from '../../../database/entities';

/**
 * 查询告警记录 DTO
 *
 * 支持按设备、严重程度、处理状态、监测点、时间范围筛选
 * 支持分页查询
 */
export class QueryAlarmDto {
  /**
   * 设备ID（可选）
   */
  @ApiPropertyOptional({
    description: '设备ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId?: string;

  /**
   * 监测点名称（可选）
   * 用于筛选特定监测点的告警记录
   */
  @ApiPropertyOptional({
    description: '监测点名称（可选，用于筛选特定监测点的告警）',
    example: '总电压',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '监测点名称必须是字符串' })
  @MaxLength(100, { message: '监测点名称长度不能超过100个字符' })
  monitoringPoint?: string;

  /**
   * 严重程度（可选）
   */
  @ApiPropertyOptional({
    description: '严重程度',
    enum: AlarmSeverity,
  })
  @IsOptional()
  @IsEnum(AlarmSeverity, { message: '严重程度无效' })
  severity?: AlarmSeverity;

  /**
   * 处理状态（可选）
   */
  @ApiPropertyOptional({
    description: '处理状态',
    enum: AlarmStatus,
  })
  @IsOptional()
  @IsEnum(AlarmStatus, { message: '处理状态无效' })
  status?: AlarmStatus;

  /**
   * 开始时间（可选，Unix时间戳毫秒）
   */
  @ApiPropertyOptional({
    description: '开始时间（Unix时间戳毫秒）',
    example: 1700000000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '开始时间必须是整数' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime?: number;

  /**
   * 结束时间（可选，Unix时间戳毫秒）
   */
  @ApiPropertyOptional({
    description: '结束时间（Unix时间戳毫秒）',
    example: 1700086400000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '结束时间必须是整数' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime?: number;

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
   * 每页条数（可选，默认为20）
   */
  @ApiPropertyOptional({
    description: '每页条数',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页条数必须是整数' })
  @Min(1, { message: '每页条数至少为1' })
  @Max(100, { message: '每页条数最多为100' })
  pageSize?: number = 20;
}
