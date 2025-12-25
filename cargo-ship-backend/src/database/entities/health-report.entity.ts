import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Equipment } from './equipment.entity';

/**
 * 报告类型枚举
 * single: 单设备报告
 * aggregate: 汇总报告
 */
export enum ReportType {
  SINGLE = 'single',
  AGGREGATE = 'aggregate',
}

/**
 * 健康等级枚举
 * excellent: 优秀（90-100分）
 * good: 良好（75-89分）
 * fair: 一般（60-74分）
 * poor: 较差（<60分）
 */
export enum HealthLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

/**
 * 风险等级枚举
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * 运行时间统计接口
 */
export class UptimeStats {
  @ApiProperty({
    description: '总时长（毫秒）',
    example: 3600000,
    type: Number,
  })
  totalDuration: number; // 总时长（毫秒）

  @ApiProperty({
    description: '运行时长（毫秒）',
    example: 3000000,
    type: Number,
  })
  runningDuration: number; // 运行时长（毫秒）

  @ApiProperty({
    description: '维护时长（毫秒）',
    example: 300000,
    type: Number,
  })
  maintenanceDuration: number; // 维护时长（毫秒）

  @ApiProperty({
    description: '停机时长（毫秒）',
    example: 300000,
    type: Number,
  })
  stoppedDuration: number; // 停机时长（毫秒）

  @ApiProperty({
    description: '运行率（%）',
    example: 83.33,
    type: Number,
  })
  uptimeRate: number; // 运行率（%）
}

/**
 * 趋势分析接口
 */
export class TrendAnalysis {
  @ApiProperty({
    description: '温度趋势（如上升、下降、稳定）',
    example: '上升',
    type: String,
  })
  temperatureTrend: string; // 温度趋势

  @ApiProperty({
    description: '振动趋势（如上升、下降、稳定）',
    example: '稳定',
    type: String,
  })
  vibrationTrend: string; // 振动趋势

  @ApiProperty({
    description: '总体趋势（如改善、恶化、稳定）',
    example: '恶化',
    type: String,
  })
  overallTrend: string; // 总体趋势

  @ApiProperty({
    enum: RiskLevel,
    description: '风险等级',
    example: RiskLevel.MEDIUM,
  })
  riskLevel: RiskLevel; // 风险等级

  @ApiProperty({
    type: [String],
    description: '建议事项',
    example: ['检查冷却系统', '加强巡检'],
  })
  suggestions: string[]; // 建议事项
}

/**
 * 健康报告实体
 * 存储设备健康评估报告信息，包括健康评分、运行统计、趋势分析等
 */
@ApiExtraModels(UptimeStats, TrendAnalysis)
@Entity('health_reports')
export class HealthReport {
  /**
   * 主键ID (UUID)
   */
  @ApiProperty({
    description: '健康报告ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 关联的设备ID
   * 对于汇总报告，此字段为null
   */
  @ApiPropertyOptional({
    description: '关联的设备ID（UUID格式），对于汇总报告为null',
    example: 'e1f2g3h4-i5j6-7890-klmn-op1234567890',
    type: String,
  })
  @Column({ name: 'equipment_id', type: 'varchar', length: 36, nullable: true })
  equipmentId: string;

  /**
   * 关联的设备实体
   */
  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  /**
   * 报告类型
   */
  @ApiProperty({
    enum: ReportType,
    description: '报告类型',
    example: ReportType.SINGLE,
  })
  @Column({
    name: 'report_type',
    type: 'enum',
    enum: ReportType,
    nullable: false,
  })
  reportType: ReportType;

  /**
   * 数据开始时间（时间戳，毫秒）
   */
  @ApiProperty({
    description: '数据开始时间（时间戳，毫秒）',
    example: 1700000000000,
    type: Number,
  })
  @Column({ name: 'data_start_time', type: 'bigint', nullable: false })
  dataStartTime: number;

  /**
   * 数据结束时间（时间戳，毫秒）
   */
  @ApiProperty({
    description: '数据结束时间（时间戳，毫秒）',
    example: 1700086399999,
    type: Number,
  })
  @Column({ name: 'data_end_time', type: 'bigint', nullable: false })
  dataEndTime: number;

  /**
   * 健康评分（0-100）
   */
  @ApiProperty({
    description: '健康评分（0-100分）',
    example: 85.75,
    type: Number,
    minimum: 0,
    maximum: 100,
  })
  @Column({
    name: 'health_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: false,
  })
  healthScore: number;

  /**
   * 健康等级
   */
  @ApiProperty({
    enum: HealthLevel,
    description: '健康等级（根据评分自动计算）',
    example: HealthLevel.GOOD,
  })
  @Column({
    name: 'health_level',
    type: 'enum',
    enum: HealthLevel,
    nullable: true,
  })
  healthLevel: HealthLevel;

  /**
   * 运行时间统计（JSON格式）
   */
  @ApiPropertyOptional({
    type: UptimeStats,
    description: '运行时间统计（JSON格式）',
  })
  @Column({ name: 'uptime_stats', type: 'json', nullable: true })
  uptimeStats: UptimeStats;

  /**
   * 异常次数
   */
  @ApiProperty({
    description: '异常次数',
    example: 5,
    type: Number,
    default: 0,
  })
  @Column({ name: 'abnormal_count', type: 'int', default: 0 })
  abnormalCount: number;

  /**
   * 趋势分析（JSON格式）
   */
  @ApiPropertyOptional({
    type: TrendAnalysis,
    description: '趋势分析（JSON格式）',
  })
  @Column({ name: 'trend_analysis', type: 'json', nullable: true })
  trendAnalysis: TrendAnalysis;

  /**
   * 报告生成时间（时间戳，毫秒）
   */
  @ApiProperty({
    description: '报告生成时间（时间戳，毫秒）',
    example: 1700086400000,
    type: Number,
  })
  @Column({ name: 'generated_at', type: 'bigint', nullable: false })
  generatedAt: number;

  /**
   * 生成人ID
   */
  @ApiProperty({
    description: '生成人ID（UUID格式）',
    example: 'f1g2h3i4-j5k6-7890-lmno-pq1234567890',
    type: String,
  })
  @Column({
    name: 'generated_by',
    type: 'varchar',
    length: 36,
    nullable: false,
  })
  generatedBy: string;

  /**
   * 报告备注
   * 用于添加人工审核意见、补充说明等
   */
  @ApiPropertyOptional({
    description: '报告备注，用于添加人工审核意见、补充说明等',
    example: '该报告数据经过人工审核，确认无误。',
    type: String,
    maxLength: 1000,
  })
  @Column({
    name: 'remarks',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  remarks: string;

  /**
   * 附加说明
   * 用于记录额外的分析结果、处理建议等
   */
  @ApiPropertyOptional({
    description: '附加说明，用于记录额外的分析结果、处理建议等',
    example: '已安排维护计划，预计在2025-01-01进行设备检修。',
    type: String,
    maxLength: 2000,
  })
  @Column({
    name: 'additional_notes',
    type: 'varchar',
    length: 2000,
    nullable: true,
  })
  additionalNotes: string;

  /**
   * 创建时间
   */
  @ApiProperty({
    description: '记录创建时间',
    example: '2025-01-01T10:00:00.000Z',
    type: Date,
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 根据健康评分计算健康等级
   */
  calculateHealthLevel(): HealthLevel {
    const score = Number(this.healthScore);
    if (score >= 90) return HealthLevel.EXCELLENT;
    if (score >= 75) return HealthLevel.GOOD;
    if (score >= 60) return HealthLevel.FAIR;
    return HealthLevel.POOR;
  }

  /**
   * 判断是否为单设备报告
   */
  isSingleReport(): boolean {
    return this.reportType === ReportType.SINGLE;
  }

  /**
   * 判断是否为汇总报告
   */
  isAggregateReport(): boolean {
    return this.reportType === ReportType.AGGREGATE;
  }

  /**
   * 判断健康状态是否为优秀
   */
  isExcellent(): boolean {
    return this.healthLevel === HealthLevel.EXCELLENT;
  }

  /**
   * 判断健康状态是否为较差
   */
  isPoor(): boolean {
    return this.healthLevel === HealthLevel.POOR;
  }
}
