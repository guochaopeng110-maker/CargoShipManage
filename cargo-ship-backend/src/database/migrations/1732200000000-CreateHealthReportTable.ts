import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * 创建健康报告表的数据库迁移
 * 包含报告基本信息、健康评分、运行统计、趋势分析等字段
 */
export class CreateHealthReportTable1732200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建health_reports表
    await queryRunner.createTable(
      new Table({
        name: 'health_reports',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            comment: '主键ID (UUID)',
          },
          {
            name: 'equipment_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: '关联的设备ID，汇总报告时为null',
          },
          {
            name: 'report_type',
            type: 'enum',
            enum: ['single', 'aggregate'],
            isNullable: false,
            comment: '报告类型：single=单设备报告，aggregate=汇总报告',
          },
          {
            name: 'data_start_time',
            type: 'bigint',
            isNullable: false,
            comment: '数据开始时间（时间戳，毫秒）',
          },
          {
            name: 'data_end_time',
            type: 'bigint',
            isNullable: false,
            comment: '数据结束时间（时间戳，毫秒）',
          },
          {
            name: 'health_score',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
            comment: '健康评分（0-100）',
          },
          {
            name: 'health_level',
            type: 'enum',
            enum: ['excellent', 'good', 'fair', 'poor'],
            isNullable: true,
            comment: '健康等级',
          },
          {
            name: 'uptime_stats',
            type: 'json',
            isNullable: true,
            comment: '运行时间统计（JSON格式）',
          },
          {
            name: 'abnormal_count',
            type: 'int',
            default: 0,
            comment: '异常次数',
          },
          {
            name: 'trend_analysis',
            type: 'json',
            isNullable: true,
            comment: '趋势分析（JSON格式）',
          },
          {
            name: 'generated_at',
            type: 'bigint',
            isNullable: false,
            comment: '报告生成时间（时间戳，毫秒）',
          },
          {
            name: 'generated_by',
            type: 'varchar',
            length: '36',
            isNullable: false,
            comment: '生成人ID',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
        ],
      }),
      true,
    );

    // 创建索引：按设备ID查询
    await queryRunner.createIndex(
      'health_reports',
      new TableIndex({
        name: 'idx_equipment_id',
        columnNames: ['equipment_id'],
      }),
    );

    // 创建索引：按报告类型查询
    await queryRunner.createIndex(
      'health_reports',
      new TableIndex({
        name: 'idx_report_type',
        columnNames: ['report_type'],
      }),
    );

    // 创建索引：按生成时间查询
    await queryRunner.createIndex(
      'health_reports',
      new TableIndex({
        name: 'idx_generated_at',
        columnNames: ['generated_at'],
      }),
    );

    // 创建索引：按数据时间范围查询
    await queryRunner.createIndex(
      'health_reports',
      new TableIndex({
        name: 'idx_data_time_range',
        columnNames: ['data_start_time', 'data_end_time'],
      }),
    );

    // 创建索引：按健康等级查询
    await queryRunner.createIndex(
      'health_reports',
      new TableIndex({
        name: 'idx_health_level',
        columnNames: ['health_level'],
      }),
    );

    // 创建外键约束：关联到equipment表
    await queryRunner.createForeignKey(
      'health_reports',
      new TableForeignKey({
        name: 'fk_health_reports_equipment',
        columnNames: ['equipment_id'],
        referencedTableName: 'equipment',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // 设备删除时，级联删除健康报告
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.dropForeignKey(
      'health_reports',
      'fk_health_reports_equipment',
    );

    // 删除索引
    await queryRunner.dropIndex('health_reports', 'idx_health_level');
    await queryRunner.dropIndex('health_reports', 'idx_data_time_range');
    await queryRunner.dropIndex('health_reports', 'idx_generated_at');
    await queryRunner.dropIndex('health_reports', 'idx_report_type');
    await queryRunner.dropIndex('health_reports', 'idx_equipment_id');

    // 删除表
    await queryRunner.dropTable('health_reports');
  }
}
