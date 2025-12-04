import { IsOptional, IsUUID, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '../../../database/entities/time-series-data.entity';
import { RuleStatus } from '../../../database/entities/threshold-config.entity';

/**
 * 查询阈值配置 DTO
 */
export class QueryThresholdDto {
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
   * 指标类型（可选）
   */
  @ApiPropertyOptional({
    description: '监测指标类型',
    enum: MetricType,
  })
  @IsOptional()
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType?: MetricType;

  /**
   * 规则状态（可选）
   */
  @ApiPropertyOptional({
    description: '规则状态',
    enum: RuleStatus,
  })
  @IsOptional()
  @IsEnum(RuleStatus, { message: '规则状态无效' })
  ruleStatus?: RuleStatus;

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
