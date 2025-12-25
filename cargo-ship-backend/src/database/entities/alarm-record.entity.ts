import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Equipment } from './equipment.entity';
import { ThresholdConfig, AlarmSeverity } from './threshold-config.entity';
import { MetricType } from './time-series-data.entity';

/**
 * 告警处理状态枚举
 */
export enum AlarmStatus {
  PENDING = 'pending', // 待处理
  PROCESSING = 'processing', // 处理中
  RESOLVED = 'resolved', // 已解决
  IGNORED = 'ignored', // 已忽略
}

/**
 * 告警记录实体
 *
 * 记录设备监测数据触发阈值时产生的告警信息
 * 包含告警详情、处理状态、处理记录、监测点、故障名称、处理措施等
 *
 * 注意：
 * - monitoringPoint, faultName, recommendedAction 字段是反规范化设计
 * - 这些字段从 threshold_configs 复制到告警记录中,保证历史准确性
 * - 即使阈值配置被修改或删除,历史告警仍保留触发时的原始上下文
 */
@Entity('alarm_records')
@Index('idx_equipment_id', ['equipmentId'])
@Index('idx_threshold_id', ['thresholdId'])
@Index('idx_severity', ['severity'])
@Index('idx_status', ['status'])
@Index('idx_triggered_at', ['triggeredAt'])
@Index('idx_equipment_status', ['equipmentId', 'status'])
@Index('idx_alarm_monitoring_point', ['monitoringPoint'])
export class AlarmRecord {
  /**
   * 主键ID（UUID）
   */
  @ApiProperty({
    description: '告警记录ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid', { comment: '告警记录ID' })
  id: string;

  /**
   * 设备ID（必填）
   */
  @ApiProperty({
    description: '设备ID',
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
   * 触发的阈值配置ID（可选，可能被删除）
   */
  @ApiPropertyOptional({
    description: '触发的阈值配置ID',
    example: 'threshold-uuid-123',
    type: String,
  })
  @Column({
    name: 'threshold_id',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '触发的阈值配置ID',
  })
  thresholdId: string;

  /**
   * 异常指标类型（必填）
   */
  @ApiProperty({
    description: '异常指标类型',
    enum: MetricType,
    example: MetricType.TEMPERATURE,
  })
  @Column({
    name: 'abnormal_metric_type',
    type: 'enum',
    enum: MetricType,
    nullable: false,
    comment: '异常指标类型',
  })
  abnormalMetricType: MetricType;

  /**
   * 监测点名称（可选，反规范化）
   * 从触发的阈值配置中复制,保证历史准确性
   * 即使阈值配置修改或删除,此字段仍保留触发时的原始监测点
   */
  @ApiPropertyOptional({
    description: '告警关联的监测点名称（反规范化，保证历史准确性）',
    example: '单体最高温度',
    type: String,
    maxLength: 100,
  })
  @Column({
    name: 'monitoring_point',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '告警关联的监测点名称(反规范化,保证历史准确性)',
  })
  monitoringPoint: string;

  /**
   * 故障名称（可选，反规范化）
   * 从触发的阈值配置中复制,保证历史准确性
   * 描述触发告警时的具体故障类型
   */
  @ApiPropertyOptional({
    description: '故障名称（反规范化，保证历史准确性）',
    example: '单体温度过高',
    type: String,
    maxLength: 200,
  })
  @Column({
    name: 'fault_name',
    type: 'varchar',
    length: 200,
    nullable: true,
    comment:
      '故障名称(反规范化,保证即使阈值规则修改,历史告警仍保留原始故障名称)',
  })
  faultName: string;

  /**
   * 处理措施建议（可选，反规范化）
   * 从触发的阈值配置中复制,保证历史准确性
   * 建议操作员在此告警触发时应采取的纠正措施
   */
  @ApiPropertyOptional({
    description: '处理措施建议（反规范化，保证历史准确性）',
    example: '立即检查冷却系统，确认冷却泵是否正常运行',
    type: String,
  })
  @Column({
    name: 'recommended_action',
    type: 'text',
    nullable: true,
    comment: '处理措施(反规范化,保证历史告警仍保留触发时的原始处理建议)',
  })
  recommendedAction: string;

  /**
   * 异常值（必填）
   */
  @ApiProperty({
    description: '异常值',
    example: 95.5,
    type: Number,
  })
  @Column({
    name: 'abnormal_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: '异常值',
  })
  abnormalValue: number;

  /**
   * 阈值范围描述（必填）
   * 例如："上限: 85.5°C, 下限: 10.0°C"
   */
  @ApiProperty({
    description: '阈值范围描述',
    example: '上限: 85.0°C',
    type: String,
    maxLength: 200,
  })
  @Column({
    name: 'threshold_range',
    type: 'varchar',
    length: 200,
    nullable: false,
    comment: '阈值范围描述',
  })
  thresholdRange: string;

  /**
   * 触发时间（必填）
   */
  @ApiProperty({
    description: '告警触发时间',
    example: '2025-01-15T14:30:00.000Z',
    type: Date,
  })
  @Column({
    name: 'triggered_at',
    type: 'datetime',
    nullable: false,
    comment: '触发时间',
  })
  triggeredAt: Date;

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
   * 处理状态（默认待处理）
   */
  @ApiProperty({
    description: '处理状态',
    enum: AlarmStatus,
    example: AlarmStatus.PENDING,
    default: AlarmStatus.PENDING,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: AlarmStatus,
    default: AlarmStatus.PENDING,
    nullable: false,
    comment: '处理状态',
  })
  status: AlarmStatus;

  /**
   * 处理人ID
   */
  @ApiPropertyOptional({
    description: '处理人ID',
    example: 'user-uuid-789',
    type: String,
  })
  @Column({
    name: 'handler',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '处理人ID',
  })
  handler: string;

  /**
   * 处理时间
   */
  @ApiPropertyOptional({
    description: '处理时间',
    example: '2025-01-15T15:00:00.000Z',
    type: Date,
  })
  @Column({
    name: 'handled_at',
    type: 'datetime',
    nullable: true,
    comment: '处理时间',
  })
  handledAt: Date;

  /**
   * 处理说明
   */
  @ApiPropertyOptional({
    description: '处理说明',
    example: '已检查冷却系统，发现冷却泵堵塞，已清理',
    type: String,
  })
  @Column({
    name: 'handle_note',
    type: 'text',
    nullable: true,
    comment: '处理说明',
  })
  handleNote: string;

  /**
   * 创建时间
   */
  @ApiProperty({
    description: '创建时间',
    example: '2025-01-15T14:30:00.000Z',
    type: Date,
  })
  @CreateDateColumn({
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  // ========== 关系定义 ==========

  /**
   * 关联设备实体
   */
  @ManyToOne(() => Equipment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * 关联阈值配置实体
   */
  @ManyToOne(() => ThresholdConfig, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'threshold_id' })
  threshold: ThresholdConfig;

  // ========== 辅助方法 ==========

  /**
   * 判断告警是否待处理
   */
  isPending(): boolean {
    return this.status === AlarmStatus.PENDING;
  }

  /**
   * 判断告警是否处理中
   */
  isProcessing(): boolean {
    return this.status === AlarmStatus.PROCESSING;
  }

  /**
   * 判断告警是否已解决
   */
  isResolved(): boolean {
    return this.status === AlarmStatus.RESOLVED;
  }

  /**
   * 判断告警是否已忽略
   */
  isIgnored(): boolean {
    return this.status === AlarmStatus.IGNORED;
  }

  /**
   * 判断告警是否严重
   */
  isCritical(): boolean {
    return (
      this.severity === AlarmSeverity.CRITICAL ||
      this.severity === AlarmSeverity.HIGH
    );
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
   * 获取状态中文描述
   */
  getStatusText(): string {
    const statusMap = {
      [AlarmStatus.PENDING]: '待处理',
      [AlarmStatus.PROCESSING]: '处理中',
      [AlarmStatus.RESOLVED]: '已解决',
      [AlarmStatus.IGNORED]: '已忽略',
    };
    return statusMap[this.status] || this.status;
  }

  /**
   * 计算告警持续时间（毫秒）
   */
  getAlarmDuration(): number {
    if (this.handledAt) {
      return this.handledAt.getTime() - this.triggeredAt.getTime();
    }
    return Date.now() - this.triggeredAt.getTime();
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
   * 判断是否包含处理措施建议
   * @returns 如果已设置处理措施返回 true
   */
  hasRecommendedAction(): boolean {
    return !!this.recommendedAction && this.recommendedAction.trim().length > 0;
  }

  /**
   * 获取完整的告警标识
   * @returns 格式包含设备ID、监测点、指标类型、故障名称等信息
   */
  getFullIdentifier(): string {
    const parts = [this.equipmentId];
    if (this.hasMonitoringPoint()) {
      parts.push(this.monitoringPoint);
    }
    parts.push(this.abnormalMetricType);
    if (this.hasFaultName()) {
      parts.push(this.faultName);
    }
    return parts.join('-');
  }
}
