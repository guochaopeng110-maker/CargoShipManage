import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 初始化监测点种子数据
 * 基于 docs/data/monitoring_point_definition.md
 *
 * 覆盖系统：
 * 1. 电池系统 (SYS-BAT-001) - 18个监测点
 * 2. 左推进系统 (SYS-PROP-L-001) - 14个监测点
 * 3. 右推进系统 (SYS-PROP-R-001) - 14个监测点
 * 4. 1#日用逆变器 (SYS-INV-1-001) - 9个监测点
 * 5. 2#日用逆变器 (SYS-INV-2-001) - 9个监测点
 * 6. 直流配电板 (SYS-DCPD-001) - 9个监测点
 * 7. 舱底水系统 (SYS-BILGE-001) - 4个监测点
 * 8. 冷却水泵系统 (SYS-COOL-001) - 5个监测点
 *
 * 总计：82个监测点
 */
export class SeedMonitoringPoints1766543954237 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const monitoringPointsData = [
      // 1. 电池系统 (SYS-BAT-001) - 18个
      {
        deviceId: 'SYS-BAT-001',
        points: [
          {
            name: '总电压',
            type: 'voltage',
            unit: 'V',
            desc: '电池系统总电压，直接影响系统供电能力',
          },
          {
            name: '单体电压',
            type: 'voltage',
            unit: 'V',
            desc: '反映电池单元一致性，影响安全性',
          },
          {
            name: '电池温度',
            type: 'temperature',
            unit: '℃',
            desc: '充放电温度和温差是电池安全的核心指标',
          },
          {
            name: '电池电流',
            type: 'current',
            unit: 'A',
            desc: '充放电电流直接影响电池寿命和安全',
          },
          {
            name: 'SOC荷电状态',
            type: 'level',
            unit: '%',
            desc: '荷电状态，决定续航能力',
          },
          {
            name: '绝缘电阻',
            type: 'resistance',
            unit: 'kΩ',
            desc: '电气安全关键指标',
          },
          {
            name: '环境温度',
            type: 'temperature',
            unit: '℃',
            desc: '电池舱环境温度',
          },
          {
            name: '独立环境温度',
            type: 'temperature',
            unit: '℃',
            desc: '独立环境温度监测',
          },
          {
            name: '单体温度',
            type: 'temperature',
            unit: '℃',
            desc: '单体电池温度',
          },
          {
            name: '保护功能故障',
            type: 'switch',
            unit: null,
            desc: '保护功能状态',
          },
          {
            name: '温度检测故障',
            type: 'switch',
            unit: null,
            desc: '温度传感器故障',
          },
          {
            name: '充电故障',
            type: 'switch',
            unit: null,
            desc: '充电系统故障',
          },
          {
            name: '电池系统故障',
            type: 'switch',
            unit: null,
            desc: '电池系统整体故障',
          },
          {
            name: '接触器故障',
            type: 'switch',
            unit: null,
            desc: '接触器状态故障',
          },
          {
            name: 'BMS通信故障',
            type: 'switch',
            unit: null,
            desc: 'BMS与上级系统通信故障',
          },
          {
            name: '能量流动状态',
            type: 'switch',
            unit: null,
            desc: '充电/放电/静止状态',
          },
          {
            name: 'BMS控制电源故障',
            type: 'switch',
            unit: null,
            desc: 'BMS控制电源故障',
          },
          { name: 'SOH', type: 'switch', unit: null, desc: '电池健康状态' },
        ],
      },
      // 2. 左推进系统 (SYS-PROP-L-001) - 14个
      {
        deviceId: 'SYS-PROP-L-001',
        points: [
          {
            name: '电机电压',
            type: 'voltage',
            unit: 'V',
            desc: '电机工作电压',
          },
          {
            name: '电机转速',
            type: 'speed',
            unit: 'rpm',
            desc: '推进器核心性能指标，直接影响船舶动力',
          },
          {
            name: '电机频率',
            type: 'frequency',
            unit: 'Hz',
            desc: '电机工作频率',
          },
          { name: '电机功率', type: 'power', unit: 'kW', desc: '电机输出功率' },
          {
            name: '逆变器电压',
            type: 'voltage',
            unit: 'V',
            desc: '逆变器输入电压',
          },
          {
            name: '逆变器电流',
            type: 'current',
            unit: 'A',
            desc: '逆变器输出电流',
          },
          {
            name: '逆变器故障',
            type: 'switch',
            unit: null,
            desc: '逆变器故障状态',
          },
          {
            name: '熔断器状态',
            type: 'switch',
            unit: null,
            desc: '熔断器状态',
          },
          {
            name: '前轴承温度',
            type: 'temperature',
            unit: '℃',
            desc: '前轴承温度',
          },
          {
            name: '后轴承温度',
            type: 'temperature',
            unit: '℃',
            desc: '后轴承温度',
          },
          {
            name: '定子绕组温度',
            type: 'temperature',
            unit: '℃',
            desc: '定子绕组温度',
          },
          {
            name: '逆变器温度',
            type: 'temperature',
            unit: '℃',
            desc: '逆变器温度',
          },
          {
            name: '电机运行状态',
            type: 'switch',
            unit: null,
            desc: '电机运行/停止状态',
          },
          {
            name: '电机电流',
            type: 'current',
            unit: 'A',
            desc: '电机工作电流',
          },
        ],
      },
      // 3. 右推进系统 (SYS-PROP-R-001) - 14个
      {
        deviceId: 'SYS-PROP-R-001',
        points: [
          {
            name: '电机电压',
            type: 'voltage',
            unit: 'V',
            desc: '电机工作电压',
          },
          {
            name: '电机转速',
            type: 'speed',
            unit: 'rpm',
            desc: '推进器核心性能指标',
          },
          {
            name: '电机频率',
            type: 'frequency',
            unit: 'Hz',
            desc: '电机工作频率',
          },
          { name: '电机功率', type: 'power', unit: 'kW', desc: '电机输出功率' },
          {
            name: '逆变器电压',
            type: 'voltage',
            unit: 'V',
            desc: '逆变器输入电压',
          },
          {
            name: '逆变器电流',
            type: 'current',
            unit: 'A',
            desc: '逆变器输出电流',
          },
          {
            name: '逆变器故障',
            type: 'switch',
            unit: null,
            desc: '逆变器故障状态',
          },
          {
            name: '熔断器状态',
            type: 'switch',
            unit: null,
            desc: '熔断器状态',
          },
          {
            name: '前轴承温度',
            type: 'temperature',
            unit: '℃',
            desc: '前轴承温度',
          },
          {
            name: '后轴承温度',
            type: 'temperature',
            unit: '℃',
            desc: '后轴承温度',
          },
          {
            name: '定子绕组温度',
            type: 'temperature',
            unit: '℃',
            desc: '定子绕组温度',
          },
          {
            name: '逆变器温度',
            type: 'temperature',
            unit: '℃',
            desc: '逆变器温度',
          },
          {
            name: '电机运行状态',
            type: 'switch',
            unit: null,
            desc: '电机运行/停止状态',
          },
          {
            name: '电机电流',
            type: 'current',
            unit: 'A',
            desc: '电机工作电流',
          },
        ],
      },
      // 4. 1#日用逆变器系统 (SYS-INV-1-001) - 9个
      {
        deviceId: 'SYS-INV-1-001',
        points: [
          {
            name: '输入直流电压',
            type: 'voltage',
            unit: 'V',
            desc: '决定逆变器能否正常工作',
          },
          {
            name: '输出交流电压',
            type: 'voltage',
            unit: 'V',
            desc: '输出电压',
          },
          {
            name: '输出交流电流',
            type: 'current',
            unit: 'A',
            desc: '反映负载情况',
          },
          {
            name: '输出交流频率',
            type: 'frequency',
            unit: 'Hz',
            desc: '输出频率',
          },
          {
            name: '逆变器过电流',
            type: 'current',
            unit: 'A',
            desc: '逆变器过电流检测',
          },
          { name: '过载电流', type: 'current', unit: 'A', desc: '过载保护' },
          {
            name: '电抗器温度',
            type: 'temperature',
            unit: '℃',
            desc: '安全运行关键指标',
          },
          {
            name: '输出功率',
            type: 'power',
            unit: 'kW',
            desc: '日用电力供应核心参数',
          },
          {
            name: '隔离开关',
            type: 'switch',
            unit: null,
            desc: '隔离开关状态',
          },
        ],
      },
      // 5. 2#日用逆变器系统 (SYS-INV-2-001) - 9个
      {
        deviceId: 'SYS-INV-2-001',
        points: [
          {
            name: '输入直流电压',
            type: 'voltage',
            unit: 'V',
            desc: '决定逆变器能否正常工作',
          },
          {
            name: '输出交流电压',
            type: 'voltage',
            unit: 'V',
            desc: '输出电压',
          },
          {
            name: '输出交流电流',
            type: 'current',
            unit: 'A',
            desc: '反映负载情况',
          },
          {
            name: '输出交流频率',
            type: 'frequency',
            unit: 'Hz',
            desc: '输出频率',
          },
          {
            name: '逆变器过电流',
            type: 'current',
            unit: 'A',
            desc: '逆变器过电流检测',
          },
          { name: '过载电流', type: 'current', unit: 'A', desc: '过载保护' },
          {
            name: '电抗器温度',
            type: 'temperature',
            unit: '℃',
            desc: '安全运行关键指标',
          },
          {
            name: '输出功率',
            type: 'power',
            unit: 'kW',
            desc: '日用电力供应核心参数',
          },
          {
            name: '隔离开关',
            type: 'switch',
            unit: null,
            desc: '隔离开关状态',
          },
        ],
      },
      // 6. 直流配电板系统 (SYS-DCPD-001) - 9个
      {
        deviceId: 'SYS-DCPD-001',
        points: [
          {
            name: '绝缘电阻',
            type: 'resistance',
            unit: 'kΩ',
            desc: '电气安全关键指标',
          },
          {
            name: '直流母排电压',
            type: 'voltage',
            unit: 'V',
            desc: '整船电力系统核心参数',
          },
          {
            name: '直流母排电流',
            type: 'current',
            unit: 'A',
            desc: '直流母排总电流',
          },
          {
            name: '直流母排功率',
            type: 'power',
            unit: 'kW',
            desc: '直流母排总功率',
          },
          {
            name: '冷却系统故障',
            type: 'switch',
            unit: null,
            desc: '配电板冷却系统故障',
          },
          {
            name: '熔断器跳闸',
            type: 'switch',
            unit: null,
            desc: '熔断器分断跳闸',
          },
          {
            name: '熔断器状态',
            type: 'switch',
            unit: null,
            desc: '熔断器状态',
          },
          {
            name: 'EMS综合故障',
            type: 'switch',
            unit: null,
            desc: 'EMS综合故障',
          },
          {
            name: '电池电量',
            type: 'level',
            unit: '%',
            desc: '影响船舶续航能力',
          },
        ],
      },
      // 7. 舱底水系统 (SYS-BILGE-001) - 4个
      {
        deviceId: 'SYS-BILGE-001',
        points: [
          {
            name: '1#集水井水位',
            type: 'level',
            unit: 'mm',
            desc: '1#集水井水位，船舶安全关键指标',
          },
          {
            name: '2#集水井水位',
            type: 'level',
            unit: 'mm',
            desc: '2#集水井水位',
          },
          {
            name: '3#集水井水位',
            type: 'level',
            unit: 'mm',
            desc: '3#集水井水位',
          },
          {
            name: '4#集水井水位',
            type: 'level',
            unit: 'mm',
            desc: '4#集水井水位',
          },
        ],
      },
      // 8. 冷却水泵系统 (SYS-COOL-001) - 5个
      {
        deviceId: 'SYS-COOL-001',
        points: [
          {
            name: '1#冷却水泵失电',
            type: 'switch',
            unit: null,
            desc: '1#冷却水泵失电状态',
          },
          {
            name: '1#冷却水温',
            type: 'temperature',
            unit: '℃',
            desc: '1#冷却水温度',
          },
          {
            name: '2#冷却水泵失电',
            type: 'switch',
            unit: null,
            desc: '2#冷却水泵失电状态',
          },
          {
            name: '2#冷却水温',
            type: 'temperature',
            unit: '℃',
            desc: '2#冷却水温度',
          },
          {
            name: '冷却水压力',
            type: 'pressure',
            unit: 'MPa',
            desc: '冷却水系统压力',
          },
        ],
      },
    ];

    console.log('开始初始化监测点种子数据...');

    for (const data of monitoringPointsData) {
      // 1. 获取设备ID
      const equipment = await queryRunner.query(
        `SELECT id FROM equipment WHERE device_id = ?`,
        [data.deviceId],
      );

      if (equipment && equipment.length > 0) {
        const equipmentId = equipment[0].id;
        console.log(
          `正在为设备 ${data.deviceId} (${equipmentId}) 初始化 ${data.points.length} 个监测点...`,
        );

        // 2. 插入监测点数据
        for (const point of data.points) {
          // 检查监测点是否已存在 (幂等操作)
          const existing = await queryRunner.query(
            `SELECT id FROM monitoring_points WHERE equipment_id = ? AND point_name = ?`,
            [equipmentId, point.name],
          );

          if (existing.length === 0) {
            const uuid = this.generateUUID();

            await queryRunner.query(
              `INSERT INTO monitoring_points (id, equipment_id, point_name, metric_type, unit, description)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                uuid,
                equipmentId,
                point.name,
                point.type,
                point.unit,
                point.desc,
              ],
            );
          } else {
            console.log(`  - 监测点 "${point.name}" 已存在，跳过`);
          }
        }
        console.log(`  ✓ 设备 ${data.deviceId} 监测点初始化完成`);
      } else {
        console.warn(
          `⚠ 警告: 未找到设备 ${data.deviceId}，跳过该设备的监测点初始化。`,
        );
      }
    }

    console.log('监测点种子数据初始化完成！');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 简单的清空逻辑，实际生产中可能需要更精细的回滚
    await queryRunner.query('DELETE FROM monitoring_points');
    console.log('已清空所有监测点数据');
  }

  /**
   * 生成UUID (v4)
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
