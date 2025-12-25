import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from './enums/metric-type.enum';

/**
 * 监测点元数据实体
 *
 * 用途：作为系统监测点的标准定义和"单一事实来源"
 *
 * 核心概念：
 * - 监测点 (Monitoring Point): 业务定义的精确监测位置,如"总电压"、"最高单体温度"
 * - 与物理指标类型(metricType)的区别: 多个监测点可能共享相同的物理类型,但业务含义不同
 *
 * 使用场景：
 * 1. 前端动态渲染设备监测点列表,消除硬编码
 * 2. 数据上报和导入时校验监测点名称的合法性
 * 3. 自动补全时序数据的单位字段
 * 4. 告警配置时验证监测点的有效性
 *
 * 约束：
 * - 唯一约束: (equipmentId, pointName) 组合唯一
 * - 级联删除: 设备删除时自动删除关联的监测点
 */
@Entity('monitoring_points')
@Unique(['equipmentId', 'pointName']) // 同一设备下监测点名称唯一
@Index('idx_monitoring_equipment_id', ['equipmentId']) // 设备ID索引
@Index('idx_monitoring_metric_type', ['metricType']) // 指标类型索引
export class MonitoringPoint {
  /**
   * 主键ID（UUID）
   */
  @ApiProperty({
    description: '监测点唯一ID（UUID格式）',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid', { comment: '监测点UUID主键' })
  id: string;

  /**
   * 关联设备ID（UUID）
   * 外键关联到 equipment 表
   */
  @ApiProperty({
    description: '关联设备ID（UUID）',
    example: 'equipment-uuid-here',
    type: String,
  })
  @Column({
    name: 'equipment_id',
    type: 'varchar',
    length: 36,
    comment: '关联设备ID',
  })
  @Index()
  equipmentId: string;

  /**
   * 关联的设备实体
   * 级联删除: 设备删除时自动删除监测点
   *
   * 使用延迟加载避免循环依赖
   */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  @ManyToOne(() => require('./equipment.entity').Equipment, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'equipment_id' })
  equipment: any;

  /**
   * 监测点名称（中文标识）
   *
   * 使用适当大写的自然语言中文,如:
   * - "总电压"
   * - "最高单体温度"
   * - "左主机转速"
   * - "SOC"
   *
   * 命名规范：
   * - 与客户需求文档保持一致
   * - 每个设备类型有预定义的监测点集合
   * - 通过应用层验证服务确保名称一致性
   */
  @ApiProperty({
    description: '监测点名称（中文标识，业务层面的精确监测位置）',
    example: '总电压',
    type: String,
    maxLength: 100,
  })
  @Column({
    name: 'point_name',
    length: 100,
    comment: '监测点名称（中文）',
  })
  pointName: string;

  /**
   * 指标类型
   *
   * 复用 TimeSeriesData 的 MetricType 枚举
   * 表示物理测量类型,如: VOLTAGE, TEMPERATURE, CURRENT 等
   *
   * 注意：
   * - metricType 表示物理含义（如"电压"）
   * - pointName 表示业务含义（如"总电压" vs "单体电压"）
   * - 二者结合可精确定位监测点
   */
  @ApiProperty({
    description: '指标类型（物理测量类型）',
    enum: MetricType,
    example: MetricType.VOLTAGE,
  })
  @Column({
    name: 'metric_type',
    type: 'enum',
    enum: MetricType,
    comment: '指标类型，对应 MetricType 枚举',
  })
  metricType: MetricType;

  /**
   * 数据单位
   *
   * 标准单位示例:
   * - 电压: V (伏特)
   * - 电流: A (安培)
   * - 温度: ℃ (摄氏度)
   * - 百分比: %
   * - 电阻: kΩ (千欧)
   *
   * 用途：
   * - 用于自动补全时序数据的 unit 字段
   * - 前端展示时的单位标识
   */
  @ApiPropertyOptional({
    description: '数据单位（如: V, A, ℃, %, kΩ）',
    example: 'V',
    type: String,
    maxLength: 20,
  })
  @Column({
    length: 20,
    nullable: true,
    comment: '数据单位',
  })
  unit: string;

  /**
   * 监测点说明/描述
   *
   * 用于详细描述该监测点的业务含义、测量方式、注意事项等
   */
  @ApiPropertyOptional({
    description: '监测点说明/描述',
    example: '电池系统总电压监测，用于评估电池组整体电压状态',
    type: String,
  })
  @Column({
    type: 'text',
    nullable: true,
    comment: '监测点说明',
  })
  description: string;

  // ========== 辅助方法 ==========

  /**
   * 判断监测点是否有单位定义
   */
  hasUnit(): boolean {
    return (
      this.unit !== null && this.unit !== undefined && this.unit.trim() !== ''
    );
  }

  /**
   * 获取监测点的完整描述（用于日志和错误消息）
   */
  getFullDescription(): string {
    return `${this.pointName}(${this.metricType})`;
  }
}
