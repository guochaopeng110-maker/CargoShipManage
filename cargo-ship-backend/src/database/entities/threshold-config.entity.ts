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
 * 支持上限、下限、持续时间、严重程度等配置
 */
@Entity('threshold_configs')
@Index('idx_equipment_metric', ['equipmentId', 'metricType'])
@Index('idx_status', ['ruleStatus'])
@Index('idx_severity', ['severity'])
export class ThresholdConfig {
  /**
   * 主键ID（UUID）
   */
  @PrimaryGeneratedColumn('uuid', { comment: '阈值配置ID' })
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
   * 监测指标类型（必填）
   */
  @Column({
    name: 'metric_type',
    type: 'enum',
    enum: MetricType,
    nullable: false,
    comment: '监测指标类型',
  })
  metricType: MetricType;

  /**
   * 上限值（可选）
   * 当监测值超过此值时触发告警
   */
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
  @CreateDateColumn({
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  /**
   * 更新时间
   */
  @UpdateDateColumn({
    name: 'updated_at',
    comment: '更新时间',
  })
  updatedAt: Date;

  /**
   * 软删除时间
   */
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
}
