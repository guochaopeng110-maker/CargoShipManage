import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '../../../database/entities/time-series-data.entity';
import {
  AlarmSeverity,
  RuleStatus,
} from '../../../database/entities/threshold-config.entity';

/**
 * 创建阈值配置 DTO
 */
export class CreateThresholdDto {
  /**
   * 设备ID（必填）
   */
  @ApiProperty({
    description: '设备ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty({ message: '设备ID不能为空' })
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId: string;

  /**
   * 监测指标类型（必填）
   */
  @ApiProperty({
    description: '监测指标类型',
    enum: MetricType,
    example: MetricType.TEMPERATURE,
  })
  @IsNotEmpty({ message: '指标类型不能为空' })
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType: MetricType;

  /**
   * 上限值（可选）
   */
  @ApiPropertyOptional({
    description: '上限值（超过此值触发告警）',
    example: 85.5,
  })
  @IsOptional()
  @IsNumber({}, { message: '上限值必须是数字' })
  upperLimit?: number;

  /**
   * 下限值（可选）
   */
  @ApiPropertyOptional({
    description: '下限值（低于此值触发告警）',
    example: 10.0,
  })
  @IsOptional()
  @IsNumber({}, { message: '下限值必须是数字' })
  lowerLimit?: number;

  /**
   * 持续时间（必填，单位：毫秒）
   */
  @ApiProperty({
    description: '持续时间（毫秒），超过阈值并持续该时间后才触发告警',
    example: 300000,
    minimum: 0,
  })
  @IsNotEmpty({ message: '持续时间不能为空' })
  @IsNumber({}, { message: '持续时间必须是数字' })
  @Min(0, { message: '持续时间不能为负数' })
  duration: number;

  /**
   * 严重程度（必填）
   */
  @ApiProperty({
    description: '严重程度',
    enum: AlarmSeverity,
    example: AlarmSeverity.HIGH,
  })
  @IsNotEmpty({ message: '严重程度不能为空' })
  @IsEnum(AlarmSeverity, { message: '严重程度无效' })
  severity: AlarmSeverity;

  /**
   * 规则状态（可选，默认启用）
   */
  @ApiPropertyOptional({
    description: '规则状态',
    enum: RuleStatus,
    default: RuleStatus.ENABLED,
  })
  @IsOptional()
  @IsEnum(RuleStatus, { message: '规则状态无效' })
  ruleStatus?: RuleStatus;

  /**
   * 验证至少设置了上限或下限之一
   */
  @ValidateIf((o) => !o.upperLimit && !o.lowerLimit)
  @IsNotEmpty({ message: '至少需要设置上限值或下限值之一' })
  _validateLimits?: any;
}
