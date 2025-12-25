import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 告警记录种子数据迁移
 *
 * 根据 1732620000000-SeedTestTimeSeriesData 中的监测数据
 * 和 1732630000000-SeedTestThresholds 中的阈值配置
 * 自动生成符合告警条件的告警记录
 *
 * 生成策略:
 * 1. 读取所有时序数据和阈值配置
 * 2. 使用三元组 (equipmentId, metricType, monitoringPoint) 匹配规则
 * 3. 评估数值是否超出阈值范围
 * 4. 生成告警记录,包含反规范化字段 (monitoringPoint, faultName, recommendedAction)
 * 5. 使用原始数据的 timestamp 作为 triggeredAt
 *
 * 注意:
 * - 此迁移是幂等的,重复运行会先清空现有告警记录
 * - 告警状态默认为 pending (待处理)
 * - 部分告警会设置为其他状态(processing, resolved)以模拟真实场景
 */
export class SeedTestAlarmRecords1732640000000 implements MigrationInterface {
  name = 'SeedTestAlarmRecords1732640000000';

  /**
   * 生成 UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * 格式化阈值范围描述
   */
  private formatThresholdRange(
    lowerLimit: number | null,
    upperLimit: number | null,
    unit: string,
  ): string {
    const parts: string[] = [];
    if (upperLimit !== null) {
      parts.push(`上限: ${upperLimit}${unit}`);
    }
    if (lowerLimit !== null) {
      parts.push(`下限: ${lowerLimit}${unit}`);
    }
    return parts.join(', ');
  }

  /**
   * 检查数值是否触发告警
   */
  private isAlarmTriggered(
    value: number,
    lowerLimit: number | null,
    upperLimit: number | null,
  ): boolean {
    if (upperLimit !== null && value > upperLimit) {
      return true;
    }
    if (lowerLimit !== null && value < lowerLimit) {
      return true;
    }
    return false;
  }

  /**
   * 执行迁移
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('\n========== 开始生成测试告警记录 ==========\n');

    // 检查是否已有告警记录
    const existingAlarmCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM alarm_records`,
    );

    if (existingAlarmCount[0].count > 0) {
      console.log(
        `⚠️  发现现有告警记录 ${existingAlarmCount[0].count} 条，将先清空...`,
      );
      await queryRunner.query(`DELETE FROM alarm_records`);
      console.log('✅ 已清空现有告警记录\n');
    }

    // 1. 获取所有时序数据
    console.log('📊 正在读取时序数据...');
    const timeSeriesData = await queryRunner.query(`
      SELECT
        id,
        equipment_id as equipmentId,
        timestamp,
        metric_type as metricType,
        monitoring_point as monitoringPoint,
        value,
        unit,
        quality,
        source
      FROM time_series_data
      ORDER BY timestamp DESC
    `);
    console.log(`✅ 读取到 ${timeSeriesData.length} 条时序数据\n`);

    // 2. 获取所有阈值配置
    console.log('⚙️  正在读取阈值配置...');
    const thresholdConfigs = await queryRunner.query(`
      SELECT
        id,
        equipment_id as equipmentId,
        metric_type as metricType,
        monitoring_point as monitoringPoint,
        fault_name as faultName,
        lower_limit as lowerLimit,
        upper_limit as upperLimit,
        duration,
        severity,
        recommended_action as recommendedAction
      FROM threshold_configs
      WHERE rule_status = 'enabled'
    `);
    console.log(`✅ 读取到 ${thresholdConfigs.length} 条阈值配置\n`);

    // 3. 构建阈值配置索引 (equipmentId + metricType + monitoringPoint)
    const thresholdMap = new Map<string, any>();
    thresholdConfigs.forEach((config: any) => {
      const key = `${config.equipmentId}|${config.metricType}|${config.monitoringPoint || ''}`;
      if (!thresholdMap.has(key)) {
        thresholdMap.set(key, []);
      }
      thresholdMap.get(key).push(config);
    });

    console.log('🔍 开始评估告警条件...\n');

    // 4. 评估每条时序数据是否触发告警
    const alarmRecords: any[] = [];
    let evaluatedCount = 0;
    let triggeredCount = 0;

    for (const data of timeSeriesData) {
      evaluatedCount++;

      // 匹配阈值配置
      const key = `${data.equipmentId}|${data.metricType}|${data.monitoringPoint || ''}`;
      const matchedConfigs = thresholdMap.get(key);

      if (!matchedConfigs || matchedConfigs.length === 0) {
        continue;
      }

      // 检查每个匹配的阈值配置
      for (const config of matchedConfigs) {
        const triggered = this.isAlarmTriggered(
          parseFloat(data.value),
          config.lowerLimit,
          config.upperLimit,
        );

        if (triggered) {
          triggeredCount++;

          // 决定告警状态 (模拟真实场景)
          let status = 'pending';
          let handler: string | null = null;
          let handledAt: Date | null = null;
          let handleNote: string | null = null;

          // 30% 的告警设置为已处理状态
          const random = Math.random();
          if (random < 0.15) {
            status = 'resolved';
            handler = 'admin-uuid-123'; // 模拟管理员处理
            handledAt = new Date(new Date(data.timestamp).getTime() + 3600000); // 1小时后处理
            handleNote = '已检查设备，问题已解决';
          } else if (random < 0.3) {
            status = 'processing';
            handler = 'operator-uuid-456'; // 模拟操作员处理
            handledAt = new Date(new Date(data.timestamp).getTime() + 1800000); // 30分钟后开始处理
            handleNote = '正在检查设备状态';
          }

          const alarmRecord = {
            id: this.generateUUID(),
            equipment_id: data.equipmentId,
            threshold_id: config.id,
            abnormal_metric_type: data.metricType,
            monitoring_point: config.monitoringPoint || null,
            fault_name: config.faultName || null,
            recommended_action: config.recommendedAction || null,
            abnormal_value: parseFloat(data.value),
            threshold_range: this.formatThresholdRange(
              config.lowerLimit,
              config.upperLimit,
              data.unit || '',
            ),
            triggered_at: data.timestamp,
            severity: config.severity,
            status: status,
            handler: handler,
            handled_at: handledAt,
            handle_note: handleNote,
            created_at: data.timestamp, // 创建时间与触发时间相同
          };

          alarmRecords.push(alarmRecord);
        }
      }
    }

    console.log(`📈 评估统计:`);
    console.log(`   - 总数据量: ${timeSeriesData.length}`);
    console.log(`   - 已评估: ${evaluatedCount}`);
    console.log(`   - 触发告警: ${triggeredCount}`);
    console.log(
      `   - 触发率: ${((triggeredCount / evaluatedCount) * 100).toFixed(2)}%\n`,
    );

    // 5. 批量插入告警记录
    if (alarmRecords.length > 0) {
      console.log(`💾 开始插入 ${alarmRecords.length} 条告警记录...\n`);

      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < alarmRecords.length; i += batchSize) {
        const batch = alarmRecords.slice(i, i + batchSize);

        const values = batch
          .map(
            (record) => `(
            '${record.id}',
            '${record.equipment_id}',
            ${record.threshold_id ? `'${record.threshold_id}'` : 'NULL'},
            '${record.abnormal_metric_type}',
            ${record.monitoring_point ? `'${record.monitoring_point.replace(/'/g, "''")}'` : 'NULL'},
            ${record.fault_name ? `'${record.fault_name.replace(/'/g, "''")}'` : 'NULL'},
            ${record.recommended_action ? `'${record.recommended_action.replace(/'/g, "''")}'` : 'NULL'},
            ${record.abnormal_value},
            '${record.threshold_range.replace(/'/g, "''")}',
            '${record.triggered_at.toISOString().slice(0, 19).replace('T', ' ')}',
            '${record.severity}',
            '${record.status}',
            ${record.handler ? `'${record.handler}'` : 'NULL'},
            ${record.handled_at ? `'${record.handled_at.toISOString().slice(0, 19).replace('T', ' ')}'` : 'NULL'},
            ${record.handle_note ? `'${record.handle_note.replace(/'/g, "''")}'` : 'NULL'},
            '${record.created_at.toISOString().slice(0, 19).replace('T', ' ')}'
          )`,
          )
          .join(',\n          ');

        await queryRunner.query(`
          INSERT INTO alarm_records (
            id,
            equipment_id,
            threshold_id,
            abnormal_metric_type,
            monitoring_point,
            fault_name,
            recommended_action,
            abnormal_value,
            threshold_range,
            triggered_at,
            severity,
            status,
            handler,
            handled_at,
            handle_note,
            created_at
          ) VALUES
          ${values}
        `);

        insertedCount += batch.length;
        console.log(
          `   ✓ 已插入 ${insertedCount}/${alarmRecords.length} 条记录`,
        );
      }

      console.log(`\n✅ 成功插入 ${alarmRecords.length} 条告警记录\n`);

      // 6. 统计各状态的告警数量
      const statusStats = await queryRunner.query(`
        SELECT status, COUNT(*) as count
        FROM alarm_records
        GROUP BY status
      `);

      console.log('📊 告警状态分布:');
      statusStats.forEach((stat: any) => {
        console.log(`   - ${stat.status}: ${stat.count} 条`);
      });

      // 7. 统计各严重程度的告警数量
      const severityStats = await queryRunner.query(`
        SELECT severity, COUNT(*) as count
        FROM alarm_records
        GROUP BY severity
      `);

      console.log('\n📊 告警严重程度分布:');
      severityStats.forEach((stat: any) => {
        console.log(`   - ${stat.severity}: ${stat.count} 条`);
      });

      // 8. 统计各设备的告警数量
      const equipmentStats = await queryRunner.query(`
        SELECT equipment_id, COUNT(*) as count
        FROM alarm_records
        GROUP BY equipment_id
        ORDER BY count DESC
        LIMIT 10
      `);

      console.log('\n📊 设备告警数量 TOP 10:');
      equipmentStats.forEach((stat: any) => {
        console.log(`   - ${stat.equipment_id}: ${stat.count} 条`);
      });
    } else {
      console.log('⚠️  未发现触发告警的数据\n');
    }

    console.log('\n========== 告警记录生成完成 ==========\n');
  }

  /**
   * 回滚迁移
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('\n========== 回滚告警记录种子数据 ==========\n');

    await queryRunner.query(`DELETE FROM alarm_records`);

    console.log('✅ 已删除所有告警记录\n');
    console.log('========== 回滚完成 ==========\n');
  }
}
