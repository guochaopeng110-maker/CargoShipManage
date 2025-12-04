import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
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
 * 包含告警详情、处理状态、处理记录等
 */
@Entity('alarm_records')
@Index('idx_equipment_id', ['equipmentId'])
@Index('idx_threshold_id', ['thresholdId'])
@Index('idx_severity', ['severity'])
@Index('idx_status', ['status'])
@Index('idx_triggered_at', ['triggeredAt'])
@Index('idx_equipment_status', ['equipmentId', 'status'])
export class AlarmRecord {
  /**
   * 主键ID（UUID）
   */
  @PrimaryGeneratedColumn('uuid', { comment: '告警记录ID' })
  id: string;

  /**
   * 设备ID（必填）
   */
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
  @Column({
    name: 'abnormal_metric_type',
    type: 'enum',
    enum: MetricType,
    nullable: false,
    comment: '异常指标类型',
  })
  abnormalMetricType: MetricType;

  /**
   * 异常值（必填）
   */
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
}
