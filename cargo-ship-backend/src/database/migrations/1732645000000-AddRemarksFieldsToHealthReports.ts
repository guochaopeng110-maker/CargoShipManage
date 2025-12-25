/**
 * 为健康报告表添加备注字段
 *
 * @description
 * 添加两个备注字段以支持人工审核和补充说明:
 * 1. remarks - 报告备注 (varchar 1000)
 * 2. additional_notes - 附加说明 (varchar 2000)
 *
 * @author 系统生成
 * @date 2024-12-23
 * @version 1.0 - 初始版本
 */

import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRemarksFieldsToHealthReports1732645000000
  implements MigrationInterface
{
  name = 'AddRemarksFieldsToHealthReports1732645000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('开始为 health_reports 表添加备注字段...');

    // 添加 remarks 字段
    await queryRunner.addColumn(
      'health_reports',
      new TableColumn({
        name: 'remarks',
        type: 'varchar',
        length: '1000',
        isNullable: true,
        comment: '报告备注，用于添加人工审核意见、补充说明等',
      }),
    );

    // 添加 additional_notes 字段
    await queryRunner.addColumn(
      'health_reports',
      new TableColumn({
        name: 'additional_notes',
        type: 'varchar',
        length: '2000',
        isNullable: true,
        comment: '附加说明，用于记录额外的分析结果、处理建议等',
      }),
    );

    console.log('✅ health_reports 表备注字段添加完成');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('开始回滚 health_reports 表备注字段...');

    // 删除 additional_notes 字段
    await queryRunner.dropColumn('health_reports', 'additional_notes');

    // 删除 remarks 字段
    await queryRunner.dropColumn('health_reports', 'remarks');

    console.log('✅ health_reports 表备注字段回滚完成');
  }
}
