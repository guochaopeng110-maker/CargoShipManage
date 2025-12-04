/**
 * 测试数据迁移
 *
 * @description
 * 为开发和测试环境准备初始测试数据，包括：
 * 1. users - 3个测试用户（管理员、操作员、查看者）
 * 2. time_series_data - 时序监测数据（每个设备20条，总计约300条）
 * 3. threshold_configs - 告警阈值配置（基于data-spec.md第4节）
 *
 * @prerequisite
 * 此迁移依赖 CreateEquipmentTable 迁移文件中的15个设备数据
 * 不会重复插入设备数据，仅使用已存在的设备
 *
 * @reference docs/refer/data-spec.md
 * @author 系统生成
 * @date 2024-11-26
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedTestData1732400000000 implements MigrationInterface {
  name = 'SeedTestData1732400000000';

  /**
   * 生成UUID (简单实现)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * 生成过去N天内的随机时间戳
   */
  private getRandomTimestamp(daysAgo: number): string {
    const now = Date.now();
    const daysInMs = daysAgo * 24 * 60 * 60 * 1000;
    const randomTime = now - Math.random() * daysInMs;
    return new Date(randomTime).toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * 生成指定范围内的随机数
   */
  private randomInRange(
    min: number,
    max: number,
    decimals: number = 2,
  ): number {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(decimals));
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 0. 检查是否已经执行过此迁移
    // ========================================
    const existingUser = await queryRunner.query(
      `SELECT COUNT(*) as count FROM users WHERE username = 'admin'`,
    );

    if (existingUser[0].count > 0) {
      console.log('⚠️  检测到测试用户数据已存在,跳过迁移');
      return;
    }

    // ========================================
    // 1. 验证设备数据是否存在
    // ========================================
    const equipmentCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM equipment WHERE device_id IN (
        'BATT-001', 'BATT-002', 'MOTOR-L-001', 'MOTOR-R-001',
        'INV-L-001', 'INV-R-001', 'DC-BOARD-001', 'INV-AC-001', 'INV-AC-002',
        'PUMP-COOL-001', 'PUMP-COOL-002', 'WELL-001', 'WELL-002', 'WELL-003', 'WELL-004'
      )`,
    );

    if (equipmentCount[0].count != 15) {
      throw new Error(
        `设备数据不完整!期望15个设备,实际找到${equipmentCount[0].count}个。请先执行 CreateEquipmentTable 迁移。`,
      );
    }

    console.log('✅ 设备数据验证通过,共15个设备');

    // ========================================
    // 2. 插入测试用户数据
    // ========================================
    console.log('开始插入测试用户数据...');

    // 生成加密密码
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const operatorPasswordHash = await bcrypt.hash('operator123', 10);
    const viewerPasswordHash = await bcrypt.hash('viewer123', 10);

    const adminId = this.generateUUID();
    const operatorId = this.generateUUID();
    const viewerId = this.generateUUID();

    // 插入3个测试用户
    await queryRunner.query(
      `
      INSERT INTO users (id, username, email, password, full_name, status, created_at, updated_at)
      VALUES
        (?, 'admin', 'admin@cargoship.com', ?, '系统管理员', 'active', NOW(), NOW()),
        (?, 'operator', 'operator@cargoship.com', ?, '设备操作员', 'active', NOW(), NOW()),
        (?, 'viewer', 'viewer@cargoship.com', ?, '数据查看者', 'active', NOW(), NOW())
    `,
      [
        adminId,
        adminPasswordHash,
        operatorId,
        operatorPasswordHash,
        viewerId,
        viewerPasswordHash,
      ],
    );

    // 获取角色ID
    const roles = await queryRunner.query(
      `SELECT id, name FROM roles WHERE name IN ('administrator', 'operator', 'viewer')`,
    );

    const roleMap = roles.reduce((acc: any, role: any) => {
      acc[role.name] = role.id;
      return acc;
    }, {});

    // 关联用户角色
    if (roleMap['administrator']) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [adminId, roleMap['administrator']],
      );
    }
    if (roleMap['operator']) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [operatorId, roleMap['operator']],
      );
    }
    if (roleMap['viewer']) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [viewerId, roleMap['viewer']],
      );
    }

    console.log('✅ 测试用户数据插入完成');

    // ========================================
    // 3. 获取已存在的设备数据
    // ========================================
    console.log('开始获取设备数据映射...');

    const equipmentRecords = await queryRunner.query(
      `SELECT id, device_id FROM equipment WHERE device_id IN (
        'BATT-001', 'BATT-002', 'MOTOR-L-001', 'MOTOR-R-001',
        'INV-L-001', 'INV-R-001', 'DC-BOARD-001', 'INV-AC-001', 'INV-AC-002',
        'PUMP-COOL-001', 'PUMP-COOL-002', 'WELL-001', 'WELL-002', 'WELL-003', 'WELL-004'
      )`,
    );

    // 创建设备ID映射 (deviceId -> UUID)
    const equipmentMap = equipmentRecords.reduce((acc: any, eq: any) => {
      acc[eq.device_id] = eq.id;
      return acc;
    }, {});

    console.log(`✅ 设备数据映射完成，共 ${equipmentRecords.length} 个设备`);

    // ========================================
    // 4. 插入时序监测数据
    // ========================================
    console.log('开始插入时序监测数据...');

    const timeSeriesData: any[] = [];

    // 辅助函数：生成告警数据（超出阈值）
    const generateAlarmValue = (
      normalMin: number,
      normalMax: number,
      severity: 'low' | 'medium' | 'high' | 'critical',
    ): number => {
      const isUpper = Math.random() > 0.5;
      if (isUpper) {
        // 上限告警
        const offsets = { low: 1.05, medium: 1.1, high: 1.15, critical: 1.2 };
        return this.randomInRange(
          normalMax * offsets[severity],
          normalMax * 1.3,
        );
      } else {
        // 下限告警
        const offsets = { low: 0.95, medium: 0.9, high: 0.85, critical: 0.8 };
        return this.randomInRange(
          normalMin * 0.7,
          normalMin * offsets[severity],
        );
      }
    };

    // 电池组数据生成
    for (const deviceId of ['BATT-001', 'BATT-002']) {
      for (let i = 0; i < 20; i++) {
        const isAlarm = i < 4; // 前4条为告警数据
        const timestamp = this.getRandomTimestamp(7);

        // 总电压 (正常: 584.1-683.1V)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'voltage',
          value: isAlarm
            ? generateAlarmValue(
                584.1,
                683.1,
                i === 0 ? 'critical' : i === 1 ? 'medium' : 'low',
              )
            : this.randomInRange(600, 670),
          unit: 'V',
          quality: isAlarm ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 充放电电流 (正常: 0-160A)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'current',
          value:
            isAlarm && i < 2
              ? generateAlarmValue(0, 160, i === 0 ? 'critical' : 'medium')
              : this.randomInRange(20, 150),
          unit: 'A',
          quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 电池温度 (正常: 4-50°C, 充电时)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'temperature',
          value:
            isAlarm && i < 3
              ? generateAlarmValue(
                  4,
                  50,
                  i === 0 ? 'critical' : i === 1 ? 'medium' : 'low',
                )
              : this.randomInRange(15, 40),
          unit: '°C',
          quality: isAlarm && i < 3 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // SOC (正常: 20-100%)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'power',
          value:
            isAlarm && i === 3
              ? this.randomInRange(5, 18)
              : this.randomInRange(30, 95),
          unit: '%',
          quality: isAlarm && i === 3 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    // 推进电机数据生成
    for (const deviceId of ['MOTOR-L-001', 'MOTOR-R-001']) {
      for (let i = 0; i < 20; i++) {
        const isAlarm = i < 4;
        const timestamp = this.getRandomTimestamp(7);

        // 电机电压 (正常: 0-418V)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'voltage',
          value: this.randomInRange(100, 400),
          unit: 'V',
          quality: 'normal',
          source: 'sensor-upload',
        });

        // 电机电流 (正常: 0-600A)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'current',
          value: this.randomInRange(50, 550),
          unit: 'A',
          quality: 'normal',
          source: 'sensor-upload',
        });

        // 电机转速 (正常: 0-1650rpm)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'speed',
          value:
            isAlarm && i === 0
              ? this.randomInRange(1660, 1700) // 超速告警
              : this.randomInRange(500, 1600),
          unit: 'rpm',
          quality: isAlarm && i === 0 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 轴承温度 (正常: 20-90°C)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'temperature',
          value:
            isAlarm && i < 2
              ? this.randomInRange(92, 105) // 高温告警
              : this.randomInRange(30, 80),
          unit: '°C',
          quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    // 推进逆变器数据生成
    for (const deviceId of ['INV-L-001', 'INV-R-001']) {
      for (let i = 0; i < 20; i++) {
        const isAlarm = i < 4;
        const timestamp = this.getRandomTimestamp(7);

        // 输入电压 (正常: 400-750V)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'voltage',
          value:
            isAlarm && i < 2
              ? i === 0
                ? this.randomInRange(760, 800)
                : this.randomInRange(350, 390)
              : this.randomInRange(500, 700),
          unit: 'V',
          quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 输出电流 (正常: 0-600A)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'current',
          value:
            isAlarm && i === 2
              ? this.randomInRange(610, 650)
              : this.randomInRange(50, 580),
          unit: 'A',
          quality: isAlarm && i === 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 逆变器温度 (正常: 20-85°C)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'temperature',
          value:
            isAlarm && i === 3
              ? this.randomInRange(88, 95)
              : this.randomInRange(30, 75),
          unit: '°C',
          quality: isAlarm && i === 3 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    // 直流配电板数据生成
    const deviceId = 'DC-BOARD-001';
    for (let i = 0; i < 20; i++) {
      const isAlarm = i < 4;
      const timestamp = this.getRandomTimestamp(7);

      // 母排电压 (正常: 584.1-683.1V)
      timeSeriesData.push({
        equipmentId: equipmentMap[deviceId],
        timestamp,
        metricType: 'voltage',
        value:
          isAlarm && i < 2
            ? i === 0
              ? this.randomInRange(690, 720)
              : this.randomInRange(550, 580)
            : this.randomInRange(600, 670),
        unit: 'V',
        quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
        source: 'sensor-upload',
      });

      // 母排电流 (正常: 0-1000A)
      timeSeriesData.push({
        equipmentId: equipmentMap[deviceId],
        timestamp,
        metricType: 'current',
        value: this.randomInRange(100, 900),
        unit: 'A',
        quality: 'normal',
        source: 'sensor-upload',
      });

      // 母排功率 (正常: 0-650kW)
      timeSeriesData.push({
        equipmentId: equipmentMap[deviceId],
        timestamp,
        metricType: 'power',
        value: this.randomInRange(50, 600),
        unit: 'kW',
        quality: 'normal',
        source: 'sensor-upload',
      });
    }

    // 日用逆变器数据生成
    for (const deviceId of ['INV-AC-001', 'INV-AC-002']) {
      for (let i = 0; i < 20; i++) {
        const isAlarm = i < 4;
        const timestamp = this.getRandomTimestamp(7);

        // 输入直流电压 (正常: 400-750V)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'voltage',
          value:
            isAlarm && i < 2
              ? i === 0
                ? this.randomInRange(760, 800)
                : this.randomInRange(350, 390)
              : this.randomInRange(500, 700),
          unit: 'V',
          quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 输出交流电流 (正常: 0-190A)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'current',
          value:
            isAlarm && i === 2
              ? this.randomInRange(195, 210)
              : this.randomInRange(20, 180),
          unit: 'A',
          quality: isAlarm && i === 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 电抗器温度 (正常: 20-105°C)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'temperature',
          value:
            isAlarm && i === 3
              ? this.randomInRange(108, 115)
              : this.randomInRange(30, 95),
          unit: '°C',
          quality: isAlarm && i === 3 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    // 冷却水泵数据生成
    for (const deviceId of ['PUMP-COOL-001', 'PUMP-COOL-002']) {
      for (let i = 0; i < 20; i++) {
        const isAlarm = i < 4;
        const timestamp = this.getRandomTimestamp(7);

        // 冷却水温度 (正常: 15-33°C)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'temperature',
          value:
            isAlarm && i < 2
              ? this.randomInRange(35, 42)
              : this.randomInRange(18, 30),
          unit: '°C',
          quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });

        // 冷却水压力 (正常: 0.1-0.5MPa)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'pressure',
          value:
            isAlarm && i >= 2 && i < 4
              ? this.randomInRange(0.05, 0.09)
              : this.randomInRange(0.15, 0.45),
          unit: 'MPa',
          quality: isAlarm && i >= 2 && i < 4 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    // 舱底水井数据生成
    for (const deviceId of ['WELL-001', 'WELL-002', 'WELL-003', 'WELL-004']) {
      for (let i = 0; i < 20; i++) {
        const isAlarm = i < 4;
        const timestamp = this.getRandomTimestamp(7);

        // 水位高度 (正常: 0-200mm)
        timeSeriesData.push({
          equipmentId: equipmentMap[deviceId],
          timestamp,
          metricType: 'pressure',
          value:
            isAlarm && i < 2
              ? this.randomInRange(210, 250)
              : this.randomInRange(20, 180),
          unit: 'mm',
          quality: isAlarm && i < 2 ? 'abnormal' : 'normal',
          source: 'sensor-upload',
        });
      }
    }

    // 批量插入时序数据
    for (const data of timeSeriesData) {
      await queryRunner.query(
        `
        INSERT INTO time_series_data (equipment_id, timestamp, metric_type, value, unit, quality, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `,
        [
          data.equipmentId,
          data.timestamp,
          data.metricType,
          data.value,
          data.unit,
          data.quality,
          data.source,
        ],
      );
    }

    console.log(`✅ 时序监测数据插入完成，共 ${timeSeriesData.length} 条记录`);

    // ========================================
    // 5. 插入告警阈值配置
    // ========================================
    console.log('开始插入告警阈值配置...');

    const thresholdConfigs: any[] = [];

    // 电池组告警阈值
    for (const deviceId of ['BATT-001', 'BATT-002']) {
      // 总电压告警
      thresholdConfigs.push(
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 584.1,
          upperLimit: 594.0,
          duration: 5000,
          severity: 'low',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 574.2,
          upperLimit: 584.1,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: null,
          upperLimit: 564.3,
          duration: 5000,
          severity: 'critical',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 673.2,
          upperLimit: 683.1,
          duration: 5000,
          severity: 'low',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 683.1,
          upperLimit: 693.0,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 693.0,
          upperLimit: null,
          duration: 5000,
          severity: 'critical',
        },
      );

      // 电池温度告警（充电）
      thresholdConfigs.push(
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 45,
          upperLimit: 50,
          duration: 5000,
          severity: 'low',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 50,
          upperLimit: 55,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 55,
          upperLimit: null,
          duration: 5000,
          severity: 'critical',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: null,
          upperLimit: 6,
          duration: 5000,
          severity: 'low',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 4,
          upperLimit: 6,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: null,
          upperLimit: 2,
          duration: 5000,
          severity: 'critical',
        },
      );

      // 充放电电流告警
      thresholdConfigs.push(
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'current',
          lowerLimit: 155,
          upperLimit: 160,
          duration: 5000,
          severity: 'low',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'current',
          lowerLimit: 160,
          upperLimit: 165,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'current',
          lowerLimit: 165,
          upperLimit: null,
          duration: 5000,
          severity: 'critical',
        },
      );
    }

    // 推进电机告警阈值
    for (const deviceId of ['MOTOR-L-001', 'MOTOR-R-001']) {
      // 电机转速告警
      thresholdConfigs.push({
        equipmentId: equipmentMap[deviceId],
        metricType: 'speed',
        lowerLimit: 1650,
        upperLimit: null,
        duration: 1000,
        severity: 'critical',
      });

      // 轴承温度告警
      thresholdConfigs.push({
        equipmentId: equipmentMap[deviceId],
        metricType: 'temperature',
        lowerLimit: 90,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
      });
    }

    // 推进逆变器告警阈值
    for (const deviceId of ['INV-L-001', 'INV-R-001']) {
      thresholdConfigs.push(
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 750,
          upperLimit: null,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: null,
          upperLimit: 400,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'current',
          lowerLimit: 600,
          upperLimit: null,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 85,
          upperLimit: null,
          duration: 5000,
          severity: 'medium',
        },
      );
    }

    // 直流配电板告警阈值
    thresholdConfigs.push(
      {
        equipmentId: equipmentMap['DC-BOARD-001'],
        metricType: 'voltage',
        lowerLimit: 683.1,
        upperLimit: null,
        duration: 5000,
        severity: 'medium',
      },
      {
        equipmentId: equipmentMap['DC-BOARD-001'],
        metricType: 'voltage',
        lowerLimit: null,
        upperLimit: 584.1,
        duration: 5000,
        severity: 'medium',
      },
    );

    // 日用逆变器告警阈值
    for (const deviceId of ['INV-AC-001', 'INV-AC-002']) {
      thresholdConfigs.push(
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: 750,
          upperLimit: null,
          duration: 5000,
          severity: 'high',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'voltage',
          lowerLimit: null,
          upperLimit: 400,
          duration: 5000,
          severity: 'critical',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'current',
          lowerLimit: 190,
          upperLimit: null,
          duration: 5000,
          severity: 'medium',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 105,
          upperLimit: null,
          duration: 5000,
          severity: 'medium',
        },
      );
    }

    // 冷却水泵告警阈值
    for (const deviceId of ['PUMP-COOL-001', 'PUMP-COOL-002']) {
      thresholdConfigs.push(
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'temperature',
          lowerLimit: 33,
          upperLimit: null,
          duration: 5000,
          severity: 'high',
        },
        {
          equipmentId: equipmentMap[deviceId],
          metricType: 'pressure',
          lowerLimit: null,
          upperLimit: 0.1,
          duration: 5000,
          severity: 'high',
        },
      );
    }

    // 舱底水井告警阈值
    for (const deviceId of ['WELL-001', 'WELL-002', 'WELL-003', 'WELL-004']) {
      thresholdConfigs.push({
        equipmentId: equipmentMap[deviceId],
        metricType: 'pressure',
        lowerLimit: 200,
        upperLimit: null,
        duration: 10000,
        severity: 'high',
      });
    }

    // 批量插入阈值配置
    for (const config of thresholdConfigs) {
      await queryRunner.query(
        `
        INSERT INTO threshold_configs (id, equipment_id, metric_type, upper_limit, lower_limit, duration, severity, rule_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'enabled', NOW(), NOW())
      `,
        [
          this.generateUUID(),
          config.equipmentId,
          config.metricType,
          config.upperLimit,
          config.lowerLimit,
          config.duration,
          config.severity,
        ],
      );
    }

    console.log(
      `✅ 告警阈值配置插入完成，共 ${thresholdConfigs.length} 条记录`,
    );
    console.log('\n========================================');
    console.log('🎉 测试数据迁移完成！');
    console.log('========================================');
    console.log(`📊 数据统计:`);
    console.log(`   - 用户: 3个`);
    console.log(`   - 设备: 15个 (使用已存在的设备)`);
    console.log(`   - 时序数据: ${timeSeriesData.length}条`);
    console.log(`   - 阈值配置: ${thresholdConfigs.length}条`);
    console.log('========================================\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('开始回滚测试数据...');

    // 删除阈值配置
    await queryRunner.query(`DELETE FROM threshold_configs WHERE equipment_id IN (
      SELECT id FROM equipment WHERE device_id IN (
        'BATT-001', 'BATT-002', 'MOTOR-L-001', 'MOTOR-R-001',
        'INV-L-001', 'INV-R-001', 'DC-BOARD-001', 'INV-AC-001', 'INV-AC-002',
        'PUMP-COOL-001', 'PUMP-COOL-002', 'WELL-001', 'WELL-002', 'WELL-003', 'WELL-004'
      )
    )`);

    // 删除时序数据
    await queryRunner.query(`DELETE FROM time_series_data WHERE equipment_id IN (
      SELECT id FROM equipment WHERE device_id IN (
        'BATT-001', 'BATT-002', 'MOTOR-L-001', 'MOTOR-R-001',
        'INV-L-001', 'INV-R-001', 'DC-BOARD-001', 'INV-AC-001', 'INV-AC-002',
        'PUMP-COOL-001', 'PUMP-COOL-002', 'WELL-001', 'WELL-002', 'WELL-003', 'WELL-004'
      )
    )`);

    // 删除设备
    await queryRunner.query(`DELETE FROM equipment WHERE device_id IN (
      'BATT-001', 'BATT-002', 'MOTOR-L-001', 'MOTOR-R-001',
      'INV-L-001', 'INV-R-001', 'DC-BOARD-001', 'INV-AC-001', 'INV-AC-002',
      'PUMP-COOL-001', 'PUMP-COOL-002', 'WELL-001', 'WELL-002', 'WELL-003', 'WELL-004'
    )`);

    // 删除用户角色关联
    await queryRunner.query(`DELETE FROM user_roles WHERE user_id IN (
      SELECT id FROM users WHERE username IN ('admin', 'operator', 'viewer')
    )`);

    // 删除用户
    await queryRunner.query(
      `DELETE FROM users WHERE username IN ('admin', 'operator', 'viewer')`,
    );

    console.log('✅ 测试数据回滚完成');
  }
}
