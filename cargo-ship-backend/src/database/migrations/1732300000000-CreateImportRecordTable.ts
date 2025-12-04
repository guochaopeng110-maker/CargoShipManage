import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * 创建数据导入记录表的数据库迁移
 */
export class CreateImportRecordTable1732300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建import_records表
    await queryRunner.createTable(
      new Table({
        name: 'import_records',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            comment: '主键ID (UUID)',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: '导入文件名',
          },
          {
            name: 'file_format',
            type: 'enum',
            enum: ['excel', 'csv', 'json', 'xml'],
            isNullable: false,
            comment: '文件格式',
          },
          {
            name: 'file_size',
            type: 'int',
            isNullable: false,
            comment: '文件大小（字节）',
          },
          {
            name: 'equipment_id',
            type: 'varchar',
            length: '36',
            isNullable: true,
            comment: '目标设备ID（可选）',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'partial', 'failed'],
            default: "'pending'",
            comment: '导入状态',
          },
          {
            name: 'total_rows',
            type: 'int',
            default: 0,
            comment: '总数据条数',
          },
          {
            name: 'success_rows',
            type: 'int',
            default: 0,
            comment: '成功导入条数',
          },
          {
            name: 'failed_rows',
            type: 'int',
            default: 0,
            comment: '失败条数',
          },
          {
            name: 'skipped_rows',
            type: 'int',
            default: 0,
            comment: '跳过条数',
          },
          {
            name: 'duplicate_strategy',
            type: 'enum',
            enum: ['skip', 'overwrite'],
            default: "'skip'",
            comment: '重复数据处理策略',
          },
          {
            name: 'errors',
            type: 'json',
            isNullable: true,
            comment: '错误详情（JSON格式）',
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
            comment: '开始处理时间',
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
            comment: '完成时间',
          },
          {
            name: 'imported_by',
            type: 'varchar',
            length: '36',
            isNullable: false,
            comment: '导入操作人ID',
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
      'import_records',
      new TableIndex({
        name: 'idx_equipment_id',
        columnNames: ['equipment_id'],
      }),
    );

    // 创建索引：按状态查询
    await queryRunner.createIndex(
      'import_records',
      new TableIndex({
        name: 'idx_status',
        columnNames: ['status'],
      }),
    );

    // 创建索引：按导入人查询
    await queryRunner.createIndex(
      'import_records',
      new TableIndex({
        name: 'idx_imported_by',
        columnNames: ['imported_by'],
      }),
    );

    // 创建索引：按创建时间查询
    await queryRunner.createIndex(
      'import_records',
      new TableIndex({
        name: 'idx_created_at',
        columnNames: ['created_at'],
      }),
    );

    // 创建外键约束：关联到equipment表
    await queryRunner.createForeignKey(
      'import_records',
      new TableForeignKey({
        name: 'fk_import_records_equipment',
        columnNames: ['equipment_id'],
        referencedTableName: 'equipment',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL', // 设备删除时，设置为NULL
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.dropForeignKey(
      'import_records',
      'fk_import_records_equipment',
    );

    // 删除索引
    await queryRunner.dropIndex('import_records', 'idx_created_at');
    await queryRunner.dropIndex('import_records', 'idx_imported_by');
    await queryRunner.dropIndex('import_records', 'idx_status');
    await queryRunner.dropIndex('import_records', 'idx_equipment_id');

    // 删除表
    await queryRunner.dropTable('import_records');
  }
}
