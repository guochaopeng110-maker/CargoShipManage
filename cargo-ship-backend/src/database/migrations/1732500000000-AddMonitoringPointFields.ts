/**
 * 添加监测点字段迁移
 *
 * @description
 * 本迁移为监控告警系统添加监测点相关字段,支持精确的业务监测点标识和告警规则配置:
 *
 * 1. time_series_data 表:
 *    - 添加 monitoring_point 列: 业务监测点名称(如"总电压"、"单体电压")
 *    - 创建复合索引: (equipment_id, monitoring_point, timestamp) 优化查询性能
 *
 * 2. threshold_configs 表:
 *    - 添加 monitoring_point 列: 业务监测点名称
 *    - 添加 fault_name 列: 故障名称(如"总压过压"、"总压欠压")
 *    - 添加 recommended_action 列: 处理措施建议
 *    - 创建索引: (equipment_id, monitoring_point) 优化阈值查询
 *
 * 3. alarm_records 表:
 *    - 添加 monitoring_point 列: 告警关联的监测点
 *    - 添加 fault_name 列: 故障名称(反规范化,保证历史准确性)
 *    - 添加 recommended_action 列: 处理措施(反规范化,保证历史准确性)
 *
 * @rationale
 * - 监测点字段: 区分相同物理类型但业务含义不同的测量值
 * - 故障名称和处理措施: 为操作员提供完整的业务上下文
 * - 反规范化告警记录: 保证历史告警上下文不受阈值修改影响
 * - 所有新列初始为 nullable: 保证向后兼容,未来通过应用层验证强制要求
 *
 * @author 系统生成
 * @date 2024-12-01
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMonitoringPointFields1732500000000
  implements MigrationInterface
{
  name = 'AddMonitoringPointFields1732500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 开始添加监测点相关字段...');

    // ========================================
    // 1. 向 time_series_data 表添加 monitoring_point 列
    // ========================================
    console.log('📊 正在向 time_series_data 表添加 monitoring_point 列...');

    await queryRunner.query(`
      ALTER TABLE time_series_data
      ADD COLUMN monitoring_point VARCHAR(100) NULL
      COMMENT '监测点名称,用于区分相同物理类型但业务含义不同的测量值(如"总电压"vs"单体电压")'
    `);

    // 创建复合索引: (equipment_id, monitoring_point, timestamp)
    // 优化按设备和监测点查询时序数据的性能
    await queryRunner.query(`
      CREATE INDEX idx_equipment_monitoring_time
      ON time_series_data(equipment_id, monitoring_point, timestamp)
    `);

    console.log('✅ time_series_data 表字段添加完成');

    // ========================================
    // 2. 向 threshold_configs 表添加监测点和业务上下文字段
    // ========================================
    console.log(
      '⚙️  正在向 threshold_configs 表添加 monitoring_point, fault_name, recommended_action 列...',
    );

    // 添加监测点列
    await queryRunner.query(`
      ALTER TABLE threshold_configs
      ADD COLUMN monitoring_point VARCHAR(100) NULL
      COMMENT '监测点名称,与 time_series_data 中的 monitoring_point 对应'
    `);

    // 添加故障名称列
    await queryRunner.query(`
      ALTER TABLE threshold_configs
      ADD COLUMN fault_name VARCHAR(200) NULL
      COMMENT '故障名称,描述触发告警时的具体故障类型(如"总压过压"、"电机超速")'
    `);

    // 添加处理措施列
    await queryRunner.query(`
      ALTER TABLE threshold_configs
      ADD COLUMN recommended_action TEXT NULL
      COMMENT '处理措施,建议操作员在告警触发时采取的纠正措施'
    `);

    // 创建索引: (equipment_id, monitoring_point)
    // 优化按设备和监测点查询阈值配置的性能
    await queryRunner.query(`
      CREATE INDEX idx_equipment_monitoring
      ON threshold_configs(equipment_id, monitoring_point)
    `);

    console.log('✅ threshold_configs 表字段添加完成');

    // ========================================
    // 3. 向 alarm_records 表添加监测点和业务上下文字段(反规范化)
    // ========================================
    console.log(
      '🚨 正在向 alarm_records 表添加 monitoring_point, fault_name, recommended_action 列...',
    );

    // 添加监测点列
    await queryRunner.query(`
      ALTER TABLE alarm_records
      ADD COLUMN monitoring_point VARCHAR(100) NULL
      COMMENT '告警关联的监测点名称(反规范化,保证历史准确性)'
    `);

    // 添加故障名称列(反规范化)
    await queryRunner.query(`
      ALTER TABLE alarm_records
      ADD COLUMN fault_name VARCHAR(200) NULL
      COMMENT '故障名称(反规范化,保证即使阈值规则修改,历史告警仍保留原始故障名称)'
    `);

    // 添加处理措施列(反规范化)
    await queryRunner.query(`
      ALTER TABLE alarm_records
      ADD COLUMN recommended_action TEXT NULL
      COMMENT '处理措施(反规范化,保证历史告警仍保留触发时的原始处理建议)'
    `);

    // 创建索引: monitoring_point (用于按监测点统计告警)
    await queryRunner.query(`
      CREATE INDEX idx_alarm_monitoring_point
      ON alarm_records(monitoring_point)
    `);

    console.log('✅ alarm_records 表字段添加完成');

    console.log('\n========================================');
    console.log('🎉 监测点字段迁移完成!');
    console.log('========================================');
    console.log('📋 变更摘要:');
    console.log('  ✓ time_series_data: 添加 monitoring_point 列 + 复合索引');
    console.log(
      '  ✓ threshold_configs: 添加 monitoring_point, fault_name, recommended_action + 索引',
    );
    console.log(
      '  ✓ alarm_records: 添加 monitoring_point, fault_name, recommended_action + 索引',
    );
    console.log('========================================\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 开始回滚监测点字段迁移...');

    // ========================================
    // 回滚 alarm_records 表变更
    // ========================================
    console.log('🚨 正在回滚 alarm_records 表变更...');

    // 删除索引
    await queryRunner.query(`
      DROP INDEX idx_alarm_monitoring_point ON alarm_records
    `);

    // 删除列
    await queryRunner.query(`
      ALTER TABLE alarm_records
      DROP COLUMN recommended_action
    `);

    await queryRunner.query(`
      ALTER TABLE alarm_records
      DROP COLUMN fault_name
    `);

    await queryRunner.query(`
      ALTER TABLE alarm_records
      DROP COLUMN monitoring_point
    `);

    console.log('✅ alarm_records 表回滚完成');

    // ========================================
    // 回滚 threshold_configs 表变更
    // ========================================
    console.log('⚙️  正在回滚 threshold_configs 表变更...');

    // 删除索引
    await queryRunner.query(`
      DROP INDEX idx_equipment_monitoring ON threshold_configs
    `);

    // 删除列
    await queryRunner.query(`
      ALTER TABLE threshold_configs
      DROP COLUMN recommended_action
    `);

    await queryRunner.query(`
      ALTER TABLE threshold_configs
      DROP COLUMN fault_name
    `);

    await queryRunner.query(`
      ALTER TABLE threshold_configs
      DROP COLUMN monitoring_point
    `);

    console.log('✅ threshold_configs 表回滚完成');

    // ========================================
    // 回滚 time_series_data 表变更
    // ========================================
    console.log('📊 正在回滚 time_series_data 表变更...');

    // 删除索引
    await queryRunner.query(`
      DROP INDEX idx_equipment_monitoring_time ON time_series_data
    `);

    // 删除列
    await queryRunner.query(`
      ALTER TABLE time_series_data
      DROP COLUMN monitoring_point
    `);

    console.log('✅ time_series_data 表回滚完成');

    console.log('\n========================================');
    console.log('✅ 监测点字段迁移回滚完成!');
    console.log('========================================\n');
  }
}
