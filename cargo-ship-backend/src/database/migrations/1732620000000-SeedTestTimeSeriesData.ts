/**
 * 测试时序监测数据迁移
 *
 * @description
 * 为开发和测试环境准备时序监测数据，包括：
 * - 8个系统级设备的监测数据
 * - 94个监测点，每个监测点3条数据（2条正常 + 1条告警）
 * - 总计 282 条时序数据
 *
 * @prerequisite
 * 此迁移依赖：
 * 1. equipment 表中的8个系统级设备必须已存在
 * 2. SeedTestUsers 迁移文件已执行（虽然不强依赖用户数据）
 *
 * @author 系统生成
 * @date 2024-12-07
 * @version 1.0 - 从 SeedTestData 迁移拆分出时序数据部分
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestTimeSeriesData1732620000000 implements MigrationInterface {
  name = 'SeedTestTimeSeriesData1732620000000';

  /**
   * 生成过去N天内的随机时间戳
   * @param daysAgo - 过去多少天
   * @returns ISO格式的时间戳字符串 (MySQL datetime 格式)
   */
  private getRandomTimestamp(daysAgo: number): string {
    const now = Date.now();
    const daysInMs = daysAgo * 24 * 60 * 60 * 1000;
    const randomTime = now - Math.random() * daysInMs;
    return new Date(randomTime).toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * 生成指定范围内的随机数
   * @param min - 最小值
   * @param max - 最大值
   * @param decimals - 小数位数，默认2位
   * @returns 随机数值
   */
  private randomInRange(
    min: number,
    max: number,
    decimals: number = 2,
  ): number {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
  }

  /**
   * 生成开关值（0或1）
   * @returns 0 或 1
   */
  private randomSwitch(): number {
    return Math.random() > 0.5 ? 1 : 0;
  }

  /**
   * 执行迁移：插入测试时序数据
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. 检查是否已经执行过此迁移（幂等性检查）
    // ========================================
    const existingDataCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM time_series_data`,
    );

    if (existingDataCount[0].count > 0) {
      console.log('⚠️  检测到时序监测数据已存在，跳过迁移');
      return;
    }

    // ========================================
    // 2. 验证设备数据是否存在（8个系统级设备）
    // ========================================
    const equipmentCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM equipment WHERE device_id IN (
        'SYS-BAT-001', 'SYS-PROP-L-001', 'SYS-PROP-R-001',
        'SYS-INV-1-001', 'SYS-INV-2-001', 'SYS-DCPD-001',
        'SYS-BILGE-001', 'SYS-COOL-001'
      )`,
    );

    if (equipmentCount[0].count != 8) {
      throw new Error(
        `设备数据不完整！期望8个系统级设备，实际找到${equipmentCount[0].count}个。请先执行 CreateEquipmentTable 迁移。`,
      );
    }

    console.log('✅ 设备数据验证通过，共8个系统级设备');

    // ========================================
    // 3. 获取已存在的设备数据
    // ========================================
    console.log('开始获取设备数据映射...');

    const equipmentRecords = await queryRunner.query(
      `SELECT id, device_id FROM equipment WHERE device_id IN (
        'SYS-BAT-001', 'SYS-PROP-L-001', 'SYS-PROP-R-001',
        'SYS-INV-1-001', 'SYS-INV-2-001', 'SYS-DCPD-001',
        'SYS-BILGE-001', 'SYS-COOL-001'
      )`,
    );

    // 创建设备ID映射 (deviceId -> UUID)
    const equipmentMap = equipmentRecords.reduce((acc: any, eq: any) => {
      acc[eq.device_id] = eq.id;
      return acc;
    }, {});

    console.log(`✅ 设备数据映射完成，共 ${equipmentRecords.length} 个设备`);

    // ========================================
    // 4. 插入时序监测数据（282条 = 94个监测点 × 3条）
    // ========================================
    console.log('开始生成时序监测数据...');

    const timeSeriesData: any[] = [];

    // ========================================
    // 4.1 电池系统数据生成 (SYS-BAT-001) - 24个监测点 × 3 = 72条
    // ========================================
    const batDeviceId = equipmentMap['SYS-BAT-001'];
    const batMonitoringPoints = [
      // 电压类监测点
      {
        point: '总电压',
        type: 'voltage',
        unit: 'V',
        normal: [600, 670],
        alarm: 705,
      },
      {
        point: '单体电压',
        type: 'voltage',
        unit: 'V',
        normal: [3.0, 3.4],
        alarm: 3.6,
      },
      // 电池温度监测点
      {
        point: '电池温度',
        type: 'temperature',
        unit: '°C',
        normal: [15, 45],
        alarm: 62,
      },
      {
        point: '环境温度',
        type: 'temperature',
        unit: '°C',
        normal: [18, 35],
        alarm: 72,
      },
      {
        point: '独立环境温度',
        type: 'temperature',
        unit: '°C',
        normal: [20, 50],
        alarm: 68,
      },
      {
        point: '单体温度',
        type: 'temperature',
        unit: '°C',
        normal: [20, 50],
        alarm: 68,
      },
      // 电池电流监测点
      {
        point: '电池电流',
        type: 'current',
        unit: 'A',
        normal: [20, 150],
        alarm: 180,
      },
      // 其他模拟量监测点
      {
        point: 'SOC荷电状态',
        type: 'power',
        unit: '%',
        normal: [30, 95],
        alarm: 8,
      },
      {
        point: '绝缘电阻',
        type: 'resistance',
        unit: 'kΩ',
        normal: [2000, 5000],
        alarm: 950,
      },
      // 开关量监测点
      {
        point: '能量流动状态',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: 'SOH健康状态',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 0,
      },
      {
        point: '保护功能故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '温度检测故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      { point: '充电故障', type: 'switch', unit: '', normal: [0, 0], alarm: 1 },
      {
        point: '电池系统故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '接触器故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: 'BMS通信故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: 'BMS控制电源故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
    ];

    // 为电池系统的每个监测点生成3条数据
    for (const mp of batMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2; // 第3条数据为告警数据
        timeSeriesData.push({
          equipmentId: batDeviceId,
          timestamp: this.getRandomTimestamp(7), // 过去7天内的随机时间
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 电池系统数据生成完成：${batMonitoringPoints.length} 个监测点 × 3 = ${batMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.2 左推进系统数据生成 (SYS-PROP-L-001) - 14个监测点 × 3 = 42条
    // ========================================
    const propLDeviceId = equipmentMap['SYS-PROP-L-001'];
    const propLMonitoringPoints = [
      {
        point: '电机电压',
        type: 'voltage',
        unit: 'V',
        normal: [350, 410],
        alarm: 425,
      },
      {
        point: '电机转速',
        type: 'speed',
        unit: 'rpm',
        normal: [500, 1600],
        alarm: 1680,
      },
      {
        point: '电机频率',
        type: 'frequency',
        unit: 'Hz',
        normal: [40, 155],
        alarm: 170,
      },
      {
        point: '电机功率',
        type: 'power',
        unit: 'kW',
        normal: [50, 500],
        alarm: 550,
      },
      {
        point: '逆变器电压',
        type: 'voltage',
        unit: 'V',
        normal: [500, 700],
        alarm: 770,
      },
      {
        point: '逆变器电流',
        type: 'current',
        unit: 'A',
        normal: [50, 580],
        alarm: 620,
      },
      {
        point: '逆变器故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '熔断器状态',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '前轴承温度',
        type: 'temperature',
        unit: '°C',
        normal: [30, 80],
        alarm: 95,
      },
      {
        point: '后轴承温度',
        type: 'temperature',
        unit: '°C',
        normal: [30, 80],
        alarm: 95,
      },
      {
        point: '定子绕组温度',
        type: 'temperature',
        unit: '°C',
        normal: [40, 100],
        alarm: 125,
      },
      {
        point: '逆变器温度',
        type: 'temperature',
        unit: '°C',
        normal: [30, 75],
        alarm: 90,
      },
      {
        point: '电机运行状态',
        type: 'switch',
        unit: '',
        normal: [0, 1],
        alarm: 1,
      },
      {
        point: '电机电流',
        type: 'current',
        unit: 'A',
        normal: [50, 550],
        alarm: 580,
      },
    ];

    for (const mp of propLMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: propLDeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 左推进系统数据生成完成：${propLMonitoringPoints.length} 个监测点 × 3 = ${propLMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.3 右推进系统数据生成 (SYS-PROP-R-001) - 14个监测点 × 3 = 42条
    // 右推进系统监测点与左推进系统相同
    // ========================================
    const propRDeviceId = equipmentMap['SYS-PROP-R-001'];

    for (const mp of propLMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: propRDeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 右推进系统数据生成完成：${propLMonitoringPoints.length} 个监测点 × 3 = ${propLMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.4 1#日用逆变器系统数据生成 (SYS-INV-1-001) - 7个监测点 × 3 = 21条
    // ========================================
    const inv1DeviceId = equipmentMap['SYS-INV-1-001'];
    const invMonitoringPoints = [
      {
        point: '输入直流电压',
        type: 'voltage',
        unit: 'V',
        normal: [500, 700],
        alarm: 500,
      },
      {
        point: '输出交流电压',
        type: 'voltage',
        unit: 'V',
        normal: [215, 225],
        alarm: 225,
      },
      {
        point: '输出交流电流',
        type: 'current',
        unit: 'A',
        normal: [20, 180],
        alarm: 200,
      },
      {
        point: '输出交流频率',
        type: 'frequency',
        unit: 'Hz',
        normal: [49.5, 50.5],
        alarm: 50.2,
      },
      {
        point: '逆变器过电流',
        type: 'current',
        unit: 'A',
        normal: [20, 180],
        alarm: 200,
      },
      {
        point: '过载电流',
        type: 'current',
        unit: 'A',
        normal: [20, 180],
        alarm: 200,
      },
      {
        point: '电抗器温度',
        type: 'temperature',
        unit: '°C',
        normal: [30, 95],
        alarm: 110,
      },
      {
        point: '输出功率',
        type: 'power',
        unit: 'kW',
        normal: [10, 90],
        alarm: 100,
      },
      {
        point: '隔离开关',
        type: 'switch',
        unit: '',
        normal: [0, 1],
        alarm: 0,
      },
    ];

    for (const mp of invMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: inv1DeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 1#日用逆变器系统数据生成完成：${invMonitoringPoints.length} 个监测点 × 3 = ${invMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.5 2#日用逆变器系统数据生成 (SYS-INV-2-001) - 7个监测点 × 3 = 21条
    // 2#逆变器监测点与1#相同
    // ========================================
    const inv2DeviceId = equipmentMap['SYS-INV-2-001'];

    for (const mp of invMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: inv2DeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 2#日用逆变器系统数据生成完成：${invMonitoringPoints.length} 个监测点 × 3 = ${invMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.6 直流配电板系统数据生成 (SYS-DCPD-001) - 9个监测点 × 3 = 27条
    // ========================================
    const dcpdDeviceId = equipmentMap['SYS-DCPD-001'];
    const dcpdMonitoringPoints = [
      {
        point: '绝缘电阻',
        type: 'resistance',
        unit: 'kΩ',
        normal: [2000, 5000],
        alarm: 1400,
      },
      {
        point: '直流母排电压',
        type: 'voltage',
        unit: 'V',
        normal: [600, 670],
        alarm: 690,
      },
      {
        point: '直流母排电流',
        type: 'current',
        unit: 'A',
        normal: [100, 900],
        alarm: 950,
      },
      {
        point: '直流母排功率',
        type: 'power',
        unit: 'kW',
        normal: [50, 600],
        alarm: 620,
      },
      {
        point: '冷却系统故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '熔断器跳闸',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '熔断器状态',
        type: 'switch',
        unit: '',
        normal: [0, 1],
        alarm: 0,
      },
      {
        point: 'EMS综合故障',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '电池电量',
        type: 'power',
        unit: '%',
        normal: [30, 95],
        alarm: 15,
      },
    ];

    for (const mp of dcpdMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: dcpdDeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 直流配电板系统数据生成完成：${dcpdMonitoringPoints.length} 个监测点 × 3 = ${dcpdMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.7 舱底水系统数据生成 (SYS-BILGE-001) - 4个监测点 × 3 = 12条
    // ========================================
    const bilgeDeviceId = equipmentMap['SYS-BILGE-001'];
    const bilgeMonitoringPoints = [
      {
        point: '1#集水井水位',
        type: 'level',
        unit: 'mm',
        normal: [20, 180],
        alarm: 220,
      },
      {
        point: '2#集水井水位',
        type: 'level',
        unit: 'mm',
        normal: [20, 180],
        alarm: 220,
      },
      {
        point: '3#集水井水位',
        type: 'level',
        unit: 'mm',
        normal: [20, 180],
        alarm: 220,
      },
      {
        point: '4#集水井水位',
        type: 'level',
        unit: 'mm',
        normal: [20, 180],
        alarm: 220,
      },
    ];

    for (const mp of bilgeMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: bilgeDeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 舱底水系统数据生成完成：${bilgeMonitoringPoints.length} 个监测点 × 3 = ${bilgeMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 4.8 冷却水泵系统数据生成 (SYS-COOL-001) - 5个监测点 × 3 = 15条
    // ========================================
    const coolDeviceId = equipmentMap['SYS-COOL-001'];
    const coolMonitoringPoints = [
      {
        point: '1#冷却水泵失电',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '1#冷却水温',
        type: 'temperature',
        unit: '°C',
        normal: [18, 30],
        alarm: 36,
      },
      {
        point: '2#冷却水泵失电',
        type: 'switch',
        unit: '',
        normal: [0, 0],
        alarm: 1,
      },
      {
        point: '2#冷却水温',
        type: 'temperature',
        unit: '°C',
        normal: [18, 30],
        alarm: 36,
      },
      {
        point: '冷却水压力',
        type: 'pressure',
        unit: 'MPa',
        normal: [0.15, 0.45],
        alarm: 0.08,
      },
    ];

    for (const mp of coolMonitoringPoints) {
      for (let i = 0; i < 3; i++) {
        const isAlarm = i === 2;
        timeSeriesData.push({
          equipmentId: coolDeviceId,
          timestamp: this.getRandomTimestamp(7),
          metricType: mp.type,
          monitoringPoint: mp.point,
          value: isAlarm
            ? mp.alarm
            : mp.type === 'switch'
              ? this.randomSwitch()
              : this.randomInRange(mp.normal[0], mp.normal[1]),
          unit: mp.unit,
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    console.log(
      `✅ 冷却水泵系统数据生成完成：${coolMonitoringPoints.length} 个监测点 × 3 = ${coolMonitoringPoints.length * 3} 条`,
    );

    // ========================================
    // 5. 批量插入时序数据到数据库
    // ========================================
    console.log('\n开始批量插入时序监测数据到数据库...');

    for (const data of timeSeriesData) {
      await queryRunner.query(
        `
        INSERT INTO time_series_data (equipment_id, timestamp, metric_type, monitoring_point, value, unit, quality, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [
          data.equipmentId,
          data.timestamp,
          data.metricType,
          data.monitoringPoint,
          data.value,
          data.unit,
          data.quality,
          data.source,
        ],
      );
    }

    console.log(`✅ 时序监测数据插入完成，共 ${timeSeriesData.length} 条记录`);
    console.log('\n========================================');
    console.log('🎉 测试时序数据迁移完成！');
    console.log('========================================');
    console.log(`📊 数据统计:`);
    console.log(`   - 设备数: 8个系统级设备`);
    console.log(`   - 监测点总数: 94个`);
    console.log(`   - 时序数据总数: ${timeSeriesData.length}条`);
    console.log(`   - 数据时间范围: 过去7天内随机分布`);
    console.log('========================================\n');
  }

  /**
   * 回滚迁移：删除测试时序数据
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('开始回滚测试时序数据...');

    // 删除8个系统级设备的所有时序数据
    await queryRunner.query(`DELETE FROM time_series_data WHERE equipment_id IN (
      SELECT id FROM equipment WHERE device_id IN (
        'SYS-BAT-001', 'SYS-PROP-L-001', 'SYS-PROP-R-001',
        'SYS-INV-1-001', 'SYS-INV-2-001', 'SYS-DCPD-001',
        'SYS-BILGE-001', 'SYS-COOL-001'
      )
    )`);

    console.log('✅ 测试时序数据已删除');
    console.log('✅ 测试时序数据回滚完成');
  }
}
