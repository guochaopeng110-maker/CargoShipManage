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
import { MetricType } from './enums/metric-type.enum';

/**
 * 数据质量枚举
 */
export enum DataQuality {
  NORMAL = 'normal', // 正常数据
  ABNORMAL = 'abnormal', // 数值无效或超范围
  SUSPICIOUS = 'suspicious', // 疑似故障
}

/**
 * 数据来源枚举
 */
export enum DataSource {
  SENSOR_UPLOAD = 'sensor-upload', // 传感器上报
  FILE_IMPORT = 'file-import', // 文件导入
  MANUAL_ENTRY = 'manual-entry', // 人工录入
}

// 为了向后兼容，重新导出 MetricType
export { MetricType };

/**
 * 时序监测数据实体
 * MySQL分区表，按月分区存储，支持大规模时序数据
 *
 * 核心字段说明：
 * - equipmentId: 设备ID（必填）
 * - timestamp: 数据时间戳（必填）
 * - metricType: 指标类型（必填）
 * - monitoringPoint: 监测点名称（推荐填写，用于精确标识业务监测点）
 * - value: 指标数值（必填）
 * - unit: 数据单位（可选，默认使用指标类型标准单位）
 * - quality: 数据质量标记（可选，默认为normal）
 * - source: 数据来源（可选，默认为sensor-upload）
 */
@Entity('time_series_data')
@Index('idx_equipment_time', ['equipmentId', 'timestamp'])
@Index('idx_equipment_metric_time', ['equipmentId', 'metricType', 'timestamp'])
@Index('idx_equipment_monitoring_time', [
  'equipmentId',
  'monitoringPoint',
  'timestamp',
])
@Index('idx_metric_type', ['metricType'])
@Index('idx_quality', ['quality'])
@Index('idx_source', ['source'])
export class TimeSeriesData {
  /**
   * 自增主键
   * 使用BIGINT类型支持海量数据
   */
  @ApiProperty({
    description: '时序数据ID（自增主键）',
    example: 123456789,
    type: Number,
  })
  @PrimaryGeneratedColumn('increment', { type: 'bigint', comment: '自增主键' })
  id: number;

  /**
   * 设备ID（核心字段，必填）
   * 外键关联Equipment表
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
    comment: '设备ID（核心字段，必填）',
  })
  equipmentId: string;

  /**
   * 数据时间戳（核心字段，必填）
   * 用于时间范围查询和分区键
   */
  @ApiProperty({
    description: '数据时间戳',
    example: '2025-01-15T10:30:00.000Z',
    type: Date,
  })
  @Column({
    type: 'datetime',
    nullable: false,
    comment: '数据时间戳（核心字段，必填）',
  })
  timestamp: Date;

  /**
   * 指标类型（核心字段，必填）
   * 支持：vibration/temperature/pressure/humidity/speed/current/voltage/power
   */
  @ApiProperty({
    description: '指标类型',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  @Column({
    name: 'metric_type',
    type: 'enum',
    enum: MetricType,
    nullable: false,
    comment: '指标类型（核心字段，必填）',
  })
  metricType: MetricType;

  /**
   * 监测点名称（推荐填写）
   * 用于区分相同物理类型但业务含义不同的监测点
   * 例如：metricType=voltage 时，可能有"总电压"、"单体电压"等不同的监测点
   * 通过此字段实现精确的告警规则匹配和数据查询
   */
  @ApiPropertyOptional({
    description:
      '监测点名称，用于区分相同物理类型但业务含义不同的测量值（如"总电压" vs "单体电压"）',
    example: '总电压',
    type: String,
    maxLength: 100,
  })
  @Column({
    name: 'monitoring_point',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment:
      '监测点名称,用于区分相同物理类型但业务含义不同的测量值(如"总电压"vs"单体电压")',
  })
  monitoringPoint: string;

  /**
   * 指标数值（核心字段，必填）
   * 使用DECIMAL(10,2)精度存储
   */
  @ApiProperty({
    description: '指标数值',
    example: 650.5,
    type: Number,
  })
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: '指标数值（核心字段，必填）',
  })
  value: number;

  /**
   * 数据单位（可选）
   * 如果未提供，系统会根据metricType自动填充标准单位
   */
  @ApiPropertyOptional({
    description: '数据单位',
    example: 'V',
    type: String,
    maxLength: 20,
  })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    comment: '数据单位（可选）',
  })
  unit: string;

  /**
   * 数据质量标记（可选，默认为normal）
   * - normal: 数据通过所有验证
   * - abnormal: 数值格式无效或超出合理范围
   * - suspicious: 其他可疑情况（如时间戳异常、设备离线期间数据等）
   */
  @ApiProperty({
    description: '数据质量标记',
    enum: DataQuality,
    example: DataQuality.NORMAL,
    default: DataQuality.NORMAL,
  })
  @Column({
    type: 'enum',
    enum: DataQuality,
    default: DataQuality.NORMAL,
    nullable: false,
    comment: '数据质量标记',
  })
  quality: DataQuality;

  /**
   * 数据来源（可选，默认为sensor-upload）
   * - sensor-upload: 传感器实时上报
   * - file-import: 历史数据文件导入
   * - manual-entry: 人工补录
   */
  @ApiProperty({
    description: '数据来源',
    enum: DataSource,
    example: DataSource.SENSOR_UPLOAD,
    default: DataSource.SENSOR_UPLOAD,
  })
  @Column({
    type: 'enum',
    enum: DataSource,
    default: DataSource.SENSOR_UPLOAD,
    nullable: false,
    comment: '数据来源',
  })
  source: DataSource;

  /**
   * 创建时间
   */
  @ApiProperty({
    description: '创建时间',
    example: '2025-01-15T10:30:00.000Z',
    type: Date,
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
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

  // ========== 辅助方法 ==========

  /**
   * 判断是否为异常数据
   */
  isAbnormal(): boolean {
    return (
      this.quality === DataQuality.ABNORMAL ||
      this.quality === DataQuality.SUSPICIOUS
    );
  }

  /**
   * 判断是否为文件导入数据
   */
  isImportedData(): boolean {
    return this.source === DataSource.FILE_IMPORT;
  }

  /**
   * 获取指标类型的标准单位
   */
  static getStandardUnit(metricType: MetricType): string {
    const unitMap: Record<MetricType, string> = {
      [MetricType.VIBRATION]: 'mm/s',
      [MetricType.TEMPERATURE]: '°C',
      [MetricType.PRESSURE]: 'MPa',
      [MetricType.HUMIDITY]: '%',
      [MetricType.SPEED]: 'rpm',
      [MetricType.CURRENT]: 'A',
      [MetricType.VOLTAGE]: 'V',
      [MetricType.POWER]: 'kW',
      [MetricType.FREQUENCY]: 'Hz',
      [MetricType.LEVEL]: 'mm',
      [MetricType.RESISTANCE]: 'Ω/V',
      [MetricType.SWITCH]: '',
    };
    return unitMap[metricType] || '';
  }

  /**
   * 判断是否包含监测点信息
   * @returns 如果已设置监测点返回 true
   */
  hasMonitoringPoint(): boolean {
    return !!this.monitoringPoint && this.monitoringPoint.trim().length > 0;
  }

  /**
   * 获取完整的监测标识
   * @returns 格式: "设备ID-监测点-指标类型" 或 "设备ID-指标类型"(无监测点时)
   */
  getFullIdentifier(): string {
    if (this.hasMonitoringPoint()) {
      return `${this.equipmentId}-${this.monitoringPoint}-${this.metricType}`;
    }
    return `${this.equipmentId}-${this.metricType}`;
  }
}
