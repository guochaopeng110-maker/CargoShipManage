import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equipment } from './equipment.entity';
import { MetricType } from './time-series-data.entity';

/**
 * 告警严重程度枚举
 */
export enum AlarmSeverity {
  LOW = 'low', // 低
  MEDIUM = 'medium', // 中
  HIGH = 'high', // 高
  CRITICAL = 'critical', // 严重
}

/**
 * 规则状态枚举
 */
export enum RuleStatus {
  ENABLED = 'enabled', // 启用
  DISABLED = 'disabled', // 禁用
}

/**
 * 阈值配置实体
 *
 * 用于定义设备监测指标的告警阈值规则
 * 支持上限、下限、持续时间、严重程度、监测点、故障名称、处理措施等配置
 */
@Entity('threshold_configs')
@Index('idx_equipment_metric', ['equipmentId', 'metricType'])
@Index('idx_equipment_monitoring', ['equipmentId', 'monitoringPoint'])
@Index('idx_status', ['ruleStatus'])
@Index('idx_severity', ['severity'])
export class ThresholdConfig {
  /**
   * 主键ID（UUID）
   */
  @ApiProperty({
    description: '阈值配置ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid', { comment: '阈值配置ID' })
  id: string;

  /**
   * 设备ID（必填）
   */
  @ApiProperty({
    description: '设备ID（UUID格式）',
    example: 'SYS-BAT-001',
    type: String,
  })
  @Column({
    name: 'equipment_id',
    type: 'varchar',
    length: 36,
    nullable: false,
    comment: '设备ID',
  })
  equipmentId: string;

  /**
   * 监测指标类型（必填）
   */
  @ApiProperty({
    description: '监测指标类型',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  @Column({
    name: 'metric_type',
    type: 'enum',
    enum: MetricType,
    nullable: false,
    comment: '监测指标类型',
  })
  metricType: MetricType;

  /**
   * 监测点名称（推荐填写）
   * 用于精确匹配告警规则到特定的业务监测点
   * 例如：同一设备可能有多个电压监测点("总电压"、"单体电压"),
   * 通过此字段可以为每个监测点配置独立的阈值
   */
  @ApiPropertyOptional({
    description:
      '监测点名称，用于精确匹配告警规则（如"总电压"、"单体最高温度"）',
    example: '总电压',
    type: String,
    maxLength: 100,
  })
  @Column({
    name: 'monitoring_point',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '监测点名称,与 time_series_data 中的 monitoring_point 对应',
  })
  monitoringPoint: string;

  /**
   * 故障名称（推荐填写）
   * 描述触发告警时的具体故障类型,便于操作员快速理解问题
   * 例如："总压过压"、"总压欠压"、"电机超速"、"轴承温度过高"
   */
  @ApiPropertyOptional({
    description: '故障名称，描述触发告警时的具体故障类型',
    example: '总压过压',
    type: String,
    maxLength: 200,
  })
  @Column({
    name: 'fault_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: '故障名称,描述触发告警时的具体故障类型(如"总压过压"、"电机超速")',
  })
  faultName: string;

  /**
   * 处理措施（可选）
   * 建议操作员在告警触发时采取的纠正措施
   * 可以是多行文本,包含详细的操作步骤
   */
  @ApiPropertyOptional({
    description: '处理措施，建议操作员在告警触发时采取的纠正措施',
    example: '检查电池组连接，确认充电器输出电压是否正常',
    type: String,
  })
  @Column({
    name: 'recommended_action',
    type: 'text',
    nullable: true,
    comment: '处理措施,建议操作员在告警触发时采取的纠正措施',
  })
  recommendedAction: string;

  /**
   * 上限值（可选）
   * 当监测值超过此值时触发告警
   */
  @ApiPropertyOptional({
    description: '上限值，当监测值超过此值时触发告警',
    example: 750.0,
    type: Number,
  })
  @Column({
    name: 'upper_limit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '上限值',
  })
  upperLimit: number;

  /**
   * 下限值（可选）
   * 当监测值低于此值时触发告警
   */
  @ApiPropertyOptional({
    description: '下限值，当监测值低于此值时触发告警',
    example: 550.0,
    type: Number,
  })
  @Column({
    name: 'lower_limit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: '下限值',
  })
  lowerLimit: number;

  /**
   * 持续时间（必填，单位：毫秒）
   * 超过阈值并持续该时间后才触发告警，避免瞬时波动导致误报
   */
  @ApiProperty({
    description: '持续时间（毫秒），超过阈值并持续该时间后才触发告警',
    example: 5000,
    type: Number,
  })
  @Column({
    name: 'duration',
    type: 'bigint',
    nullable: false,
    comment: '持续时间(毫秒)',
  })
  duration: number;

  /**
   * 严重程度（必填）
   */
  @ApiProperty({
    description: '严重程度',
    enum: AlarmSeverity,
    example: AlarmSeverity.HIGH,
  })
  @Column({
    name: 'severity',
    type: 'enum',
    enum: AlarmSeverity,
    nullable: false,
    comment: '严重程度',
  })
  severity: AlarmSeverity;

  /**
   * 规则状态（默认启用）
   */
  @ApiProperty({
    description: '规则状态',
    enum: RuleStatus,
    example: RuleStatus.ENABLED,
    default: RuleStatus.ENABLED,
  })
  @Column({
    name: 'rule_status',
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ENABLED,
    nullable: false,
    comment: '规则状态',
  })
  ruleStatus: RuleStatus;

  /**
   * 创建人ID
   */
  @ApiPropertyOptional({
    description: '创建人ID',
    example: 'user-uuid-123',
    type: String,
  })
  @Column({
    name: 'creator',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '创建人ID',
  })
  creator: string;

  /**
   * 修改人ID
   */
  @ApiPropertyOptional({
    description: '修改人ID',
    example: 'user-uuid-456',
    type: String,
  })
  @Column({
    name: 'modifier',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '修改人ID',
  })
  modifier: string;

  /**
   * 创建时间
   */
  @ApiProperty({
    description: '创建时间',
    example: '2025-01-01T10:00:00.000Z',
    type: Date,
  })
  @CreateDateColumn({
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  /**
   * 更新时间
   */
  @ApiProperty({
    description: '更新时间',
    example: '2025-01-02T15:30:00.000Z',
    type: Date,
  })
  @UpdateDateColumn({
    name: 'updated_at',
    comment: '更新时间',
  })
  updatedAt: Date;

  /**
   * 软删除时间
   */
  @ApiPropertyOptional({
    description: '软删除时间',
    example: null,
    type: Date,
  })
  @DeleteDateColumn({
    name: 'deleted_at',
    comment: '软删除时间',
  })
  deletedAt: Date;

  // ========== 关系定义 ==========

  /**
   * 关联设备实体
   */
  @ManyToOne(() => Equipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  // ========== 辅助方法 ==========

  /**
   * 判断规则是否启用
   */
  isEnabled(): boolean {
    return this.ruleStatus === RuleStatus.ENABLED;
  }

  /**
   * 检查值是否触发阈值
   * @param value 待检查的值
   * @returns 是否触发阈值
   */
  isTriggered(value: number): boolean {
    // 检查上限
    if (this.upperLimit !== null && this.upperLimit !== undefined) {
      if (value > this.upperLimit) {
        return true;
      }
    }

    // 检查下限
    if (this.lowerLimit !== null && this.lowerLimit !== undefined) {
      if (value < this.lowerLimit) {
        return true;
      }
    }

    return false;
  }

  /**
   * 获取阈值范围描述
   */
  getThresholdDescription(): string {
    const parts: string[] = [];

    if (this.upperLimit !== null && this.upperLimit !== undefined) {
      parts.push(`上限: ${this.upperLimit}`);
    }

    if (this.lowerLimit !== null && this.lowerLimit !== undefined) {
      parts.push(`下限: ${this.lowerLimit}`);
    }

    return parts.join(', ');
  }

  /**
   * 获取严重程度中文描述
   */
  getSeverityText(): string {
    const severityMap = {
      [AlarmSeverity.LOW]: '低',
      [AlarmSeverity.MEDIUM]: '中',
      [AlarmSeverity.HIGH]: '高',
      [AlarmSeverity.CRITICAL]: '严重',
    };
    return severityMap[this.severity] || this.severity;
  }

  /**
   * 判断是否包含监测点信息
   * @returns 如果已设置监测点返回 true
   */
  hasMonitoringPoint(): boolean {
    return !!this.monitoringPoint && this.monitoringPoint.trim().length > 0;
  }

  /**
   * 判断是否包含故障名称
   * @returns 如果已设置故障名称返回 true
   */
  hasFaultName(): boolean {
    return !!this.faultName && this.faultName.trim().length > 0;
  }

  /**
   * 判断是否包含处理措施
   * @returns 如果已设置处理措施返回 true
   */
  hasRecommendedAction(): boolean {
    return !!this.recommendedAction && this.recommendedAction.trim().length > 0;
  }

  /**
   * 获取完整的规则标识
   * @returns 格式: "设备ID-监测点-指标类型-故障名称" 或简化格式(缺少字段时)
   */
  getFullIdentifier(): string {
    const parts = [this.equipmentId];
    if (this.hasMonitoringPoint()) {
      parts.push(this.monitoringPoint);
    }
    parts.push(this.metricType);
    if (this.hasFaultName()) {
      parts.push(this.faultName);
    }
    return parts.join('-');
  }
}
