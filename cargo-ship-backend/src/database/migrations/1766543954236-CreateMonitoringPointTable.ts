import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * 创建监测点元数据表
 *
 * 用途：存储设备的监测点定义，作为"单一事实来源"
 *
 * 核心字段：
 * - equipment_id: 关联设备ID
 * - point_name: 监测点名称（中文）
 * - metric_type: 指标类型（复用TimeSeriesData的枚举）
 * - unit: 数据单位（可选）
 * - description: 监测点说明（可选）
 */
export class CreateMonitoringPointTable1766543954236
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建 monitoring_points 表
    await queryRunner.createTable(
      new Table({
        name: 'monitoring_points',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            generationStrategy: 'uuid',
            comment: '监测点UUID主键',
          },
          {
            name: 'equipment_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
            comment: '关联设备ID',
          },
          {
            name: 'point_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: '监测点名称（中文）',
          },
          {
            name: 'metric_type',
            type: 'enum',
            enum: [
              'vibration',
              'temperature',
              'pressure',
              'humidity',
              'speed',
              'current',
              'voltage',
              'power',
              'frequency',
              'level',
              'resistance',
              'switch',
            ],
            isNullable: false,
            comment: '指标类型，对应 MetricType 枚举',
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: true,
            comment: '数据单位',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '监测点说明',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'monitoring_points',
      new TableIndex({
        name: 'idx_monitoring_equipment_id',
        columnNames: ['equipment_id'],
      }),
    );

    await queryRunner.createIndex(
      'monitoring_points',
      new TableIndex({
        name: 'idx_monitoring_metric_type',
        columnNames: ['metric_type'],
      }),
    );

    // 创建唯一约束：同一设备下监测点名称唯一
    await queryRunner.createIndex(
      'monitoring_points',
      new TableIndex({
        name: 'uq_monitoring_equipment_point',
        columnNames: ['equipment_id', 'point_name'],
        isUnique: true,
      }),
    );

    // 创建外键约束：级联删除
    await queryRunner.createForeignKey(
      'monitoring_points',
      new TableForeignKey({
        name: 'fk_monitoring_equipment',
        columnNames: ['equipment_id'],
        referencedTableName: 'equipment',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 注意：原始迁移没有成功创建外键，所以这里直接删除表即可
    // 删除表会自动删除所有索引
    await queryRunner.dropTable('monitoring_points');
  }
}
