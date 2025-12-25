/**
 * 扩展 metric_type 枚举值
 *
 * @description
 * 本迁移扩展 time_series_data 和相关表的 metric_type 枚举值,
 * 添加缺失的指标类型以支持完整的监测点类型:
 * - frequency: 频率(Hz)
 * - level: 液位/水位(mm)
 * - resistance: 电阻(kΩ)
 * - switch: 开关状态(boolean)
 *
 * @author 系统生成
 * @date 2024-12-11
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendMetricTypeEnum1732550000000 implements MigrationInterface {
  name = 'ExtendMetricTypeEnum1732550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 开始扩展 metric_type 枚举值...');

    // ========================================
    // 1. 扩展 time_series_data 表的 metric_type 枚举
    // ========================================
    console.log('📊 正在扩展 time_series_data.metric_type 枚举值...');

    await queryRunner.query(`
      ALTER TABLE time_series_data
      MODIFY COLUMN metric_type ENUM(
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
        'switch'
      ) NOT NULL COMMENT '指标类型（核心字段，必填）'
    `);

    console.log('✅ time_series_data.metric_type 扩展完成');

    // ========================================
    // 2. 扩展 threshold_configs 表的 metric_type 枚举
    // ========================================
    console.log('⚙️  正在扩展 threshold_configs.metric_type 枚举值...');

    await queryRunner.query(`
      ALTER TABLE threshold_configs
      MODIFY COLUMN metric_type ENUM(
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
        'switch'
      ) NOT NULL COMMENT '指标类型'
    `);

    console.log('✅ threshold_configs.metric_type 扩展完成');

    // ========================================
    // 3. 扩展 alarm_records 表的 metric_type 枚举
    // ========================================
    console.log('🚨 正在扩展 alarm_records.abnormal_metric_type 枚举值...');

    await queryRunner.query(`
      ALTER TABLE alarm_records
      MODIFY COLUMN abnormal_metric_type ENUM(
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
        'switch'
      ) NOT NULL COMMENT '指标类型'
    `);

    console.log('✅ alarm_records.abnormal_metric_type 扩展完成');

    console.log('\n========================================');
    console.log('🎉 abnormal_metric_type 枚举值扩展完成!');
    console.log('========================================');
    console.log('📋 新增枚举值:');
    console.log('  ✓ frequency  - 频率(Hz)');
    console.log('  ✓ level      - 液位/水位(mm)');
    console.log('  ✓ resistance - 电阻(kΩ)');
    console.log('  ✓ switch     - 开关状态(boolean)');
    console.log('========================================\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 开始回滚 abnormal_metric_type 枚举值扩展...');

    // ========================================
    // 回滚 alarm_records 表的 metric_type 枚举
    // ========================================
    console.log('🚨 正在回滚 alarm_records.abnormal_metric_type 枚举值...');

    await queryRunner.query(`
      ALTER TABLE alarm_records
      MODIFY COLUMN abnormal_metric_type ENUM(
        'vibration',
        'temperature',
        'pressure',
        'humidity',
        'speed',
        'current',
        'voltage',
        'power'
      ) NOT NULL COMMENT '指标类型'
    `);

    console.log('✅ alarm_records.abnormal_metric_type 回滚完成');

    // ========================================
    // 回滚 threshold_configs 表的 metric_type 枚举
    // ========================================
    console.log('⚙️  正在回滚 threshold_configs.metric_type 枚举值...');

    await queryRunner.query(`
      ALTER TABLE threshold_configs
      MODIFY COLUMN metric_type ENUM(
        'vibration',
        'temperature',
        'pressure',
        'humidity',
        'speed',
        'current',
        'voltage',
        'power'
      ) NOT NULL COMMENT '指标类型'
    `);

    console.log('✅ threshold_configs.metric_type 回滚完成');

    // ========================================
    // 回滚 time_series_data 表的 metric_type 枚举
    // ========================================
    console.log('📊 正在回滚 time_series_data.metric_type 枚举值...');

    await queryRunner.query(`
      ALTER TABLE time_series_data
      MODIFY COLUMN metric_type ENUM(
        'vibration',
        'temperature',
        'pressure',
        'humidity',
        'speed',
        'current',
        'voltage',
        'power'
      ) NOT NULL COMMENT '指标类型（核心字段，必填）'
    `);

    console.log('✅ time_series_data.metric_type 回滚完成');

    console.log('\n========================================');
    console.log('✅ metric_type 枚举值扩展回滚完成!');
    console.log('========================================\n');
  }
}
