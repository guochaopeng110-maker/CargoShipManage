import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * 创建阈值配置和告警记录表的数据库迁移
 *
 * 功能：
 * 1. 创建threshold_configs表（阈值配置）
 * 2. 创建alarm_records表（告警记录）
 * 3. 创建外键约束
 * 4. 创建优化索引
 */
export class CreateAlarmTables1732100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建threshold_configs表
    await queryRunner.createTable(
      new Table({
        name: 'threshold_configs',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            comment: '阈值配置ID',
          },
          {
            name: 'equipment_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
            comment: '设备ID',
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
            ],
            isNullable: false,
            comment: '监测指标类型',
          },
          {
            name: 'upper_limit',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: '上限值',
          },
          {
            name: 'lower_limit',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
            comment: '下限值',
          },
          {
            name: 'duration',
            type: 'bigint',
            isNullable: false,
            comment: '持续时间(毫秒)',
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            isNullable: false,
            comment: '严重程度',
          },
          {
            name: 'rule_status',
            type: 'enum',
            enum: ['enabled', 'disabled'],
            default: "'enabled'",
            isNullable: false,
            comment: '规则状态',
          },
          {
            name: 'creator',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: '创建人ID',
          },
          {
            name: 'modifier',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: '修改人ID',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
            comment: '软删除时间',
          },
        ],
      }),
      true,
    );

    // 2. 创建alarm_records表
    await queryRunner.createTable(
      new Table({
        name: 'alarm_records',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            comment: '告警记录ID',
          },
          {
            name: 'equipment_id',
            type: 'varchar',
            length: '36',
            isNullable: false,
            comment: '设备ID',
          },
          {
            name: 'threshold_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: '触发的阈值配置ID',
          },
          {
            name: 'abnormal_metric_type',
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
            ],
            isNullable: false,
            comment: '异常指标类型',
          },
          {
            name: 'abnormal_value',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
            comment: '异常值',
          },
          {
            name: 'threshold_range',
            type: 'varchar',
            length: '200',
            isNullable: false,
            comment: '阈值范围描述',
          },
          {
            name: 'triggered_at',
            type: 'datetime',
            isNullable: false,
            comment: '触发时间',
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            isNullable: false,
            comment: '严重程度',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'resolved', 'ignored'],
            default: "'pending'",
            isNullable: false,
            comment: '处理状态',
          },
          {
            name: 'handler',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: '处理人ID',
          },
          {
            name: 'handled_at',
            type: 'datetime',
            isNullable: true,
            comment: '处理时间',
          },
          {
            name: 'handle_note',
            type: 'text',
            isNullable: true,
            comment: '处理说明',
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

    // 3. 创建threshold_configs的外键和索引
    await queryRunner.createForeignKey(
      'threshold_configs',
      new TableForeignKey({
        name: 'fk_threshold_equipment',
        columnNames: ['equipment_id'],
        referencedTableName: 'equipment',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'threshold_configs',
      new TableIndex({
        name: 'idx_equipment_metric',
        columnNames: ['equipment_id', 'metric_type'],
      }),
    );

    await queryRunner.createIndex(
      'threshold_configs',
      new TableIndex({
        name: 'idx_status',
        columnNames: ['rule_status'],
      }),
    );

    await queryRunner.createIndex(
      'threshold_configs',
      new TableIndex({
        name: 'idx_severity',
        columnNames: ['severity'],
      }),
    );

    // 4. 创建alarm_records的外键和索引
    await queryRunner.createForeignKey(
      'alarm_records',
      new TableForeignKey({
        name: 'fk_alarm_equipment',
        columnNames: ['equipment_id'],
        referencedTableName: 'equipment',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'alarm_records',
      new TableForeignKey({
        name: 'fk_alarm_threshold',
        columnNames: ['threshold_id'],
        referencedTableName: 'threshold_configs',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'alarm_records',
      new TableIndex({
        name: 'idx_equipment_id',
        columnNames: ['equipment_id'],
      }),
    );

    await queryRunner.createIndex(
      'alarm_records',
      new TableIndex({
        name: 'idx_threshold_id',
        columnNames: ['threshold_id'],
      }),
    );

    await queryRunner.createIndex(
      'alarm_records',
      new TableIndex({
        name: 'idx_alarm_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'alarm_records',
      new TableIndex({
        name: 'idx_alarm_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'alarm_records',
      new TableIndex({
        name: 'idx_triggered_at',
        columnNames: ['triggered_at'],
      }),
    );

    await queryRunner.createIndex(
      'alarm_records',
      new TableIndex({
        name: 'idx_equipment_status',
        columnNames: ['equipment_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除alarm_records的索引和外键
    await queryRunner.dropIndex('alarm_records', 'idx_equipment_status');
    await queryRunner.dropIndex('alarm_records', 'idx_triggered_at');
    await queryRunner.dropIndex('alarm_records', 'idx_alarm_status');
    await queryRunner.dropIndex('alarm_records', 'idx_alarm_severity');
    await queryRunner.dropIndex('alarm_records', 'idx_threshold_id');
    await queryRunner.dropIndex('alarm_records', 'idx_equipment_id');
    await queryRunner.dropForeignKey('alarm_records', 'fk_alarm_threshold');
    await queryRunner.dropForeignKey('alarm_records', 'fk_alarm_equipment');

    // 删除threshold_configs的索引和外键
    await queryRunner.dropIndex('threshold_configs', 'idx_severity');
    await queryRunner.dropIndex('threshold_configs', 'idx_status');
    await queryRunner.dropIndex('threshold_configs', 'idx_equipment_metric');
    await queryRunner.dropForeignKey(
      'threshold_configs',
      'fk_threshold_equipment',
    );

    // 删除表
    await queryRunner.dropTable('alarm_records');
    await queryRunner.dropTable('threshold_configs');
  }
}
