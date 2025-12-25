import {
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
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
 *
 * 必填字段：
 * - equipmentId: 设备ID
 * - metricType: 指标类型
 * - duration: 持续时间
 * - severity: 严重程度
 * - upperLimit 或 lowerLimit: 至少一个
 *
 * 推荐字段：
 * - monitoringPoint: 监测点名称（用于精确匹配告警规则）
 * - faultName: 故障名称（便于操作员理解）
 * - recommendedAction: 处理措施（指导操作员响应）
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
   * 监测点名称（推荐填写）
   * 用于精确匹配告警规则到特定的业务监测点
   * 例如：同一设备可能有多个电压监测点("总电压"、"单体电压"),
   * 通过此字段可以为每个监测点配置独立的阈值
   */
  @ApiPropertyOptional({
    description: '监测点名称（推荐填写，用于精确匹配告警规则）',
    example: '总电压',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '监测点名称必须是字符串' })
  @MaxLength(100, { message: '监测点名称长度不能超过100个字符' })
  monitoringPoint?: string;

  /**
   * 故障名称（推荐填写）
   * 描述触发告警时的具体故障类型,便于操作员快速理解问题
   * 例如："总压过压"、"总压欠压"、"电机超速"、"轴承温度过高"
   */
  @ApiPropertyOptional({
    description: '故障名称（推荐填写，描述具体故障类型）',
    example: '总压过压',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: '故障名称必须是字符串' })
  @MaxLength(200, { message: '故障名称长度不能超过200个字符' })
  faultName?: string;

  /**
   * 处理措施（可选）
   * 建议操作员在告警触发时采取的纠正措施
   * 可以是多行文本,包含详细的操作步骤
   */
  @ApiPropertyOptional({
    description: '处理措施（可选，建议操作员采取的纠正措施）',
    example:
      '1. 检查电池单体均衡状态\n2. 检查充电系统是否正常\n3. 必要时停止充电',
  })
  @IsOptional()
  @IsString({ message: '处理措施必须是字符串' })
  recommendedAction?: string;

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
