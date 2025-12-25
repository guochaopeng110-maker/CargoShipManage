/**
 * 测试阈值配置数据迁移
 *
 * @description
 * 为开发和测试环境准备完整的告警阈值配置，包括：
 * - 8个系统级设备的阈值规则
 * - 基于 docs/data/ 业务文档的完整告警规则
 * - 涵盖电压、电流、温度、开关量等多种指标类型
 * - 支持多级告警（low, medium, high, critical）
 *
 * @prerequisite
 * 此迁移依赖：
 * 1. equipment 表中的8个系统级设备必须已存在
 * 2. SeedTestUsers 迁移文件已执行（虽然不强依赖用户数据）
 * 3. SeedTestTimeSeriesData 迁移文件已执行（虽然不强依赖时序数据）
 *
 * @reference
 * - docs/data/电池装置监测报警表汇总.md
 * - docs/data/左右推进装置监测报警表汇总.md
 * - docs/data/1#+2#逆变器监测报警表汇总.md
 * - docs/data/直流配电板+舱底水系统+冷却水泵系统监测报警表汇总.md
 *
 * @author 系统生成
 * @date 2024-12-07
 * @version 1.0 - 从 SeedTestData 迁移拆分出阈值配置部分
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestThresholds1732630000000 implements MigrationInterface {
  name = 'SeedTestThresholds1732630000000';

  /**
   * 生成UUID (简单实现)
   * 用于生成阈值配置的唯一标识符
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
   * 执行迁移：插入测试阈值配置数据
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. 检查是否已经执行过此迁移（幂等性检查）
    // ========================================
    const existingConfigCount = await queryRunner.query(
      `SELECT COUNT(*) as count FROM threshold_configs`,
    );

    if (existingConfigCount[0].count > 0) {
      console.log('⚠️  检测到阈值配置数据已存在，跳过迁移');
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
    // 4. 准备阈值配置数据
    // ========================================
    console.log('开始生成阈值配置数据...');

    const thresholdConfigs: any[] = [];

    // 获取设备ID
    const batDeviceId = equipmentMap['SYS-BAT-001'];
    const propLDeviceId = equipmentMap['SYS-PROP-L-001'];
    const propRDeviceId = equipmentMap['SYS-PROP-R-001'];
    const inv1DeviceId = equipmentMap['SYS-INV-1-001'];
    const inv2DeviceId = equipmentMap['SYS-INV-2-001'];
    const dcpdDeviceId = equipmentMap['SYS-DCPD-001'];
    const bilgeDeviceId = equipmentMap['SYS-BILGE-001'];
    const coolDeviceId = equipmentMap['SYS-COOL-001'];

    // ========================================
    // 5.1 电池系统告警阈值 (SYS-BAT-001)
    // ========================================
    // 总电压告警（6条：过压3级+欠压3级）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '总电压',
        faultName: '总压过压',
        lowerLimit: 683.1,
        upperLimit: 693.0,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '总电压',
        faultName: '总压过压',
        lowerLimit: 693.0,
        upperLimit: 702.9,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '总电压',
        faultName: '总压过压',
        lowerLimit: 702.9,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '总电压',
        faultName: '总压欠压',
        lowerLimit: 574.2,
        upperLimit: 584.1,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '总电压',
        faultName: '总压欠压',
        lowerLimit: 564.3,
        upperLimit: 574.2,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '总电压',
        faultName: '总压欠压',
        lowerLimit: null,
        upperLimit: 564.3,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );

    // 单体电压告警（6条：过压3级+欠压3级）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体过压',
        lowerLimit: 3.45,
        upperLimit: 3.5,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体过压',
        lowerLimit: 3.5,
        upperLimit: 3.55,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示；报警；开启均衡；降功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体过压',
        lowerLimit: 3.55,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体欠压',
        lowerLimit: 2.9,
        upperLimit: 2.95,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体欠压',
        lowerLimit: 2.85,
        upperLimit: 2.9,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示；报警；降功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体欠压',
        lowerLimit: null,
        upperLimit: 2.85,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );

    // 单体压差告警（3条：3级）- 注意：监测点是"单体电压"，压差是告警规则
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体压差大-一级',
        lowerLimit: 0.15,
        upperLimit: 0.25,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '单体压差大-二级',
        lowerLimit: 0.25,
        upperLimit: 0.3,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示；报警；开启均衡；降功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'voltage',
        monitoringPoint: '单体电压',
        faultName: '电池单元间电压不平衡',
        lowerLimit: 0.3,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );

    // 充电温度告警（6条：高温3级+低温3级）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '充电高温',
        lowerLimit: 50,
        upperLimit: 55,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '充电高温',
        lowerLimit: 55,
        upperLimit: 60,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；通风；降低充电电流',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '充电高温',
        lowerLimit: 60,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '充电低温',
        lowerLimit: 4,
        upperLimit: 6,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '充电低温',
        lowerLimit: 2,
        upperLimit: 4,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；加热（如有）；降功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '充电低温',
        lowerLimit: null,
        upperLimit: 2,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；禁止充电',
      },

      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '温差过大',
        lowerLimit: 8,
        upperLimit: 10,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '温差过大',
        lowerLimit: 10,
        upperLimit: 15,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；降功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '温差过大',
        lowerLimit: 15,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '放电高温',
        lowerLimit: 50,
        upperLimit: 55,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '放电高温',
        lowerLimit: 55,
        upperLimit: 60,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；通风；限功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '放电高温',
        lowerLimit: 60,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '放电低温',
        lowerLimit: -12,
        upperLimit: -10,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '放电低温',
        lowerLimit: -30,
        upperLimit: -12,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '电池温度',
        faultName: '放电低温',
        lowerLimit: null,
        upperLimit: -30,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );
    // 充电电流告警（3条）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'current',
        monitoringPoint: '电池电流',
        faultName: '充电过流',
        lowerLimit: 160,
        upperLimit: 165,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'current',
        monitoringPoint: '电池电流',
        faultName: '充电过流',
        lowerLimit: 165,
        upperLimit: 175,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；降充电电流',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'current',
        monitoringPoint: '电池电流',
        faultName: '充电过流',
        lowerLimit: 175,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'current',
        monitoringPoint: '电池电流',
        faultName: '放电过流',
        lowerLimit: 160,
        upperLimit: 165,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'current',
        monitoringPoint: '电池电流',
        faultName: '放电过流',
        lowerLimit: 165,
        upperLimit: 175,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；限功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'current',
        monitoringPoint: '电池电流',
        faultName: '放电过流',
        lowerLimit: 175,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );

    // SOC告警（2条）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'power',
        monitoringPoint: 'SOC荷电状态',
        faultName: 'SOC低',
        lowerLimit: 10,
        upperLimit: 20,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示；报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'power',
        monitoringPoint: 'SOC荷电状态',
        faultName: 'SOC低',
        lowerLimit: null,
        upperLimit: 10,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示；报警；降功率',
      },
    );

    // 绝缘电阻告警（3条）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'resistance',
        monitoringPoint: '绝缘电阻',
        faultName: '绝缘故障',
        lowerLimit: 1200,
        upperLimit: 1500,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'resistance',
        monitoringPoint: '绝缘电阻',
        faultName: '绝缘故障',
        lowerLimit: 1000,
        upperLimit: 1200,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'resistance',
        monitoringPoint: '绝缘电阻',
        faultName: '绝缘故障',
        lowerLimit: null,
        upperLimit: 1000,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );

    // 环境温度高告警（3条）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '环境温度',
        faultName: '环境温度过高-一级',
        lowerLimit: 45,
        upperLimit: 60,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '环境温度',
        faultName: '环境温度过高-二级',
        lowerLimit: 60,
        upperLimit: 70,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警；通风；降功率',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '环境温度',
        faultName: '环境温度过高-三级',
        lowerLimit: 70,
        upperLimit: null,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '显示；报警；切断输出',
      },
    );

    // 环境温度低告警（3条）
    thresholdConfigs.push(
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '环境温度',
        faultName: '环境温度过低-一级',
        lowerLimit: -30,
        upperLimit: -10,
        duration: 5000,
        severity: 'low',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '环境温度',
        faultName: '环境温度过低-二级',
        lowerLimit: -40,
        upperLimit: -30,
        duration: 5000,
        severity: 'medium',
        recommendedAction: '显示报警',
      },
      {
        equipmentId: batDeviceId,
        metricType: 'temperature',
        monitoringPoint: '环境温度',
        faultName: '环境温度过低-三级',
        lowerLimit: null,
        upperLimit: -40,
        duration: 5000,
        severity: 'critical',
        recommendedAction: '',
      },
    );

    // 独立环境温度告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'temperature',
      monitoringPoint: '独立环境温度',
      faultName: '独立环境过高温',
      lowerLimit: 65,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '切断输出',
    });

    // 单体温度告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'temperature',
      monitoringPoint: '单体温度',
      faultName: '单体过高温',
      lowerLimit: 65,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '切断输出',
    });

    // 保护功能故障告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'switch',
      monitoringPoint: '保护功能故障',
      faultName: '保护功能故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；报警；切断输出',
    });

    // 温度检测故障告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'switch',
      monitoringPoint: '温度检测故障',
      faultName: '温度检测故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；报警；切断输出',
    });

    // 充电故障告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'switch',
      monitoringPoint: '充电故障',
      faultName: '充电故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；报警；停止充电',
    });

    // 电池系统故障告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'switch',
      monitoringPoint: '电池系统故障',
      faultName: '电池系统因故障停止运行',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；报警；切断输出',
    });

    // 接触器故障告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'switch',
      monitoringPoint: '接触器故障',
      faultName: '接触器故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；报警；切断输出',
    });

    // BMS通信故障告警（1条）
    thresholdConfigs.push({
      equipmentId: batDeviceId,
      metricType: 'switch',
      monitoringPoint: 'BMS通信故障',
      faultName: 'BMS与上级系统通信故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；报警；切断输出',
    });

    console.log(
      `✅ 电池系统阈值配置生成完成，共 ${thresholdConfigs.length} 条`,
    );

    // ========================================
    // 5.2 左推进系统告警阈值 (SYS-PROP-L-001)
    // ========================================
    const propLThresholds: any[] = [];

    // 电机电压高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'voltage',
      monitoringPoint: '电机电压',
      faultName: '电压过高',
      lowerLimit: 418,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 电机超速告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'speed',
      monitoringPoint: '电机转速',
      faultName: '电机超速',
      lowerLimit: 1650,
      upperLimit: null,
      duration: 1000,
      severity: 'critical',
      recommendedAction: '显示；警告；自动停机',
    });

    // 电机频率高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'frequency',
      monitoringPoint: '电机频率',
      faultName: '频率过高',
      lowerLimit: 165,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 逆变器电压高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'voltage',
      monitoringPoint: '逆变器电压',
      faultName: '逆变器电压过高',
      lowerLimit: 750,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 逆变器电压低告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'voltage',
      monitoringPoint: '逆变器电压',
      faultName: '逆变器电压过低',
      lowerLimit: null,
      upperLimit: 400,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 逆变器过电流告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'current',
      monitoringPoint: '逆变器电流',
      faultName: '逆变器过电流',
      lowerLimit: 600,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 逆变器故障告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'switch',
      monitoringPoint: '逆变器故障',
      faultName: '逆变器故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 熔断器状态告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'switch',
      monitoringPoint: '熔断器状态',
      faultName: '熔断器状态',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 前轴承温度高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'temperature',
      monitoringPoint: '前轴承温度',
      faultName: '轴承温度过高',
      lowerLimit: 90,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示；警告；自动停机',
    });

    // 后轴承温度高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'temperature',
      monitoringPoint: '后轴承温度',
      faultName: '轴承温度过高',
      lowerLimit: 90,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示；警告；自动停机',
    });

    // 定子绕组温度高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'temperature',
      monitoringPoint: '定子绕组温度',
      faultName: '定子绕组温度过高',
      lowerLimit: 120,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    // 逆变器温度高告警
    propLThresholds.push({
      equipmentId: propLDeviceId,
      metricType: 'temperature',
      monitoringPoint: '逆变器温度',
      faultName: '逆变器温度过高',
      lowerLimit: 85,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '显示；警告',
    });

    thresholdConfigs.push(...propLThresholds);
    console.log(
      `✅ 左推进系统阈值配置生成完成，新增 ${propLThresholds.length} 条`,
    );

    // ========================================
    // 5.3 右推进系统告警阈值 (SYS-PROP-R-001)
    // 与左推进系统相同，复制配置
    // ========================================
    const propRThresholds = propLThresholds.map((cfg) => ({
      ...cfg,
      equipmentId: propRDeviceId,
    }));

    thresholdConfigs.push(...propRThresholds);
    console.log(
      `✅ 右推进系统阈值配置生成完成，新增 ${propRThresholds.length} 条`,
    );

    // ========================================
    // 5.4 1#日用逆变器系统告警阈值 (SYS-INV-1-001)
    // ========================================
    const inv1Thresholds: any[] = [];

    // 直流电压高告警
    inv1Thresholds.push({
      equipmentId: inv1DeviceId,
      metricType: 'voltage',
      monitoringPoint: '输入直流电压',
      faultName: '直流电压高',
      lowerLimit: 750,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示报警',
    });

    // 直流电压低告警
    inv1Thresholds.push({
      equipmentId: inv1DeviceId,
      metricType: 'voltage',
      monitoringPoint: '输入直流电压',
      faultName: '直流电压低',
      lowerLimit: null,
      upperLimit: 400,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示报警；自动停机',
    });

    // 逆变器过电流告警
    inv1Thresholds.push({
      equipmentId: inv1DeviceId,
      metricType: 'current',
      monitoringPoint: '输出交流电流',
      faultName: '逆变器过电流',
      lowerLimit: 190,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示报警',
    });

    // 过载告警
    inv1Thresholds.push({
      equipmentId: inv1DeviceId,
      metricType: 'current',
      monitoringPoint: '过载电流',
      faultName: '过载',
      lowerLimit: 190,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示报警',
    });

    // 电抗器温度高告警
    inv1Thresholds.push({
      equipmentId: inv1DeviceId,
      metricType: 'temperature',
      monitoringPoint: '电抗器温度',
      faultName: '电抗器温度高',
      lowerLimit: 105,
      upperLimit: null,
      duration: 5000,
      severity: 'critical',
      recommendedAction: '显示报警',
    });

    thresholdConfigs.push(...inv1Thresholds);
    console.log(
      `✅ 1#日用逆变器系统阈值配置生成完成，新增 ${inv1Thresholds.length} 条`,
    );

    // ========================================
    // 5.5 2#日用逆变器系统告警阈值 (SYS-INV-2-001)
    // 与1#相同
    // ========================================
    const inv2Thresholds = inv1Thresholds.map((cfg) => ({
      ...cfg,
      equipmentId: inv2DeviceId,
    }));

    thresholdConfigs.push(...inv2Thresholds);
    console.log(
      `✅ 2#日用逆变器系统阈值配置生成完成，新增 ${inv2Thresholds.length} 条`,
    );

    // ========================================
    // 5.6 直流配电板系统告警阈值 (SYS-DCPD-001)
    // ========================================
    const dcpdThresholds: any[] = [];

    // 绝缘电阻低告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'resistance',
      monitoringPoint: '绝缘电阻',
      faultName: '直流母排绝缘电阻低',
      lowerLimit: null,
      upperLimit: 1500,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '驾控台显示警告',
    });

    // 母排电压高告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'voltage',
      monitoringPoint: '直流母排电压',
      faultName: '直流母排电压高',
      lowerLimit: 683.1,
      upperLimit: null,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '驾控台显示警告',
    });

    // 母排电压低告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'voltage',
      monitoringPoint: '直流母排电压',
      faultName: '直流母排电压低',
      lowerLimit: null,
      upperLimit: 584.1,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '驾控台显示警告',
    });

    // 冷却系统故障告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'switch',
      monitoringPoint: '冷却系统故障',
      faultName: '配电板冷却系统故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '驾控台警告',
    });

    // 熔断器跳闸告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'switch',
      monitoringPoint: '熔断器跳闸',
      faultName: '熔断器分断跳闸',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '驾控台警告',
    });

    // EMS综合故障告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'switch',
      monitoringPoint: 'EMS综合故障',
      faultName: 'EMS综合故障',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '驾控台警告；就地警告',
    });

    // 电池电量低告警
    dcpdThresholds.push({
      equipmentId: dcpdDeviceId,
      metricType: 'power',
      monitoringPoint: '电池电量低',
      faultName: '电池电量低',
      lowerLimit: null,
      upperLimit: 20,
      duration: 5000,
      severity: 'medium',
      recommendedAction: '驾控台警告；就地警告',
    });

    thresholdConfigs.push(...dcpdThresholds);
    console.log(
      `✅ 直流配电板系统阈值配置生成完成，新增 ${dcpdThresholds.length} 条`,
    );

    // ========================================
    // 5.7 舱底水系统告警阈值 (SYS-BILGE-001)
    // ========================================
    const bilgeThresholds: any[] = [];

    // 1-4#集水井水位高告警
    for (let i = 1; i <= 4; i++) {
      bilgeThresholds.push({
        equipmentId: bilgeDeviceId,
        metricType: 'level',
        monitoringPoint: `${i}#集水井水位`,
        faultName: `${i}#集水井水位高`,
        lowerLimit: 200,
        upperLimit: null,
        duration: 10000,
        severity: 'high',
        recommendedAction: '驾控台显示提醒',
      });
    }

    thresholdConfigs.push(...bilgeThresholds);
    console.log(
      `✅ 舱底水系统阈值配置生成完成，新增 ${bilgeThresholds.length} 条`,
    );

    // ========================================
    // 5.8 冷却水泵系统告警阈值 (SYS-COOL-001)
    // ========================================
    const coolThresholds: any[] = [];

    // 1#冷却水泵失电告警
    coolThresholds.push({
      equipmentId: coolDeviceId,
      metricType: 'switch',
      monitoringPoint: '1#冷却水泵失电',
      faultName: '1#冷却水泵失电',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '驾控台显示提醒',
    });

    // 1#冷却水温高告警
    coolThresholds.push({
      equipmentId: coolDeviceId,
      metricType: 'temperature',
      monitoringPoint: '1#冷却水温',
      faultName: '1#冷却水温高',
      lowerLimit: 33,
      upperLimit: null,
      duration: 5000,
      severity: 'high',
      recommendedAction: '驾控台显示提醒',
    });

    // 2#冷却水泵失电告警
    coolThresholds.push({
      equipmentId: coolDeviceId,
      metricType: 'switch',
      monitoringPoint: '2#冷却水泵失电',
      faultName: '2#冷却水泵失电',
      lowerLimit: 1,
      upperLimit: 1,
      duration: 1000,
      severity: 'medium',
      recommendedAction: '驾控台显示提醒',
    });

    // 2#冷却水温高告警
    coolThresholds.push({
      equipmentId: coolDeviceId,
      metricType: 'temperature',
      monitoringPoint: '2#冷却水温',
      faultName: '2#冷却水温高',
      lowerLimit: 33,
      upperLimit: null,
      duration: 5000,
      severity: 'high',
      recommendedAction: '驾控台显示提醒',
    });

    // 冷却水压力低告警
    coolThresholds.push({
      equipmentId: coolDeviceId,
      metricType: 'pressure',
      monitoringPoint: '冷却水压力',
      faultName: '冷却水压力低',
      lowerLimit: null,
      upperLimit: 0.1,
      duration: 5000,
      severity: 'high',
      recommendedAction: '驾控台显示提醒',
    });

    thresholdConfigs.push(...coolThresholds);
    console.log(
      `✅ 冷却水泵系统阈值配置生成完成，新增 ${coolThresholds.length} 条`,
    );

    // ========================================
    // 6. 批量插入阈值配置到数据库
    // ========================================
    console.log('\n开始批量插入阈值配置到数据库...');

    for (const config of thresholdConfigs) {
      await queryRunner.query(
        `
        INSERT INTO threshold_configs (
          id, equipment_id, metric_type, monitoring_point, fault_name, recommended_action,
          upper_limit, lower_limit, duration, severity, rule_status, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enabled', NOW(), NOW())
      `,
        [
          this.generateUUID(),
          config.equipmentId,
          config.metricType,
          config.monitoringPoint,
          config.faultName,
          config.recommendedAction,
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
    console.log('🎉 测试阈值配置迁移完成！');
    console.log('========================================');
    console.log(`📊 数据统计:`);
    console.log(`   - 设备数: 8个系统级设备`);
    console.log(`   - 阈值配置总数: ${thresholdConfigs.length}条`);
    console.log(`   - 电池系统: 53条`);
    console.log(`   - 左推进系统: 12条`);
    console.log(`   - 右推进系统: 12条`);
    console.log(`   - 1#逆变器: 5条`);
    console.log(`   - 2#逆变器: 5条`);
    console.log(`   - 直流配电板: 7条`);
    console.log(`   - 舱底水系统: 4条`);
    console.log(`   - 冷却水泵系统: 5条`);
    console.log('========================================\n');
  }

  /**
   * 回滚迁移：删除测试阈值配置数据
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('开始回滚测试阈值配置数据...');

    // 删除8个系统级设备的所有阈值配置
    await queryRunner.query(
      `DELETE FROM threshold_configs WHERE equipment_id IN (
      SELECT id FROM equipment WHERE device_id IN (
        'SYS-BAT-001', 'SYS-PROP-L-001', 'SYS-PROP-R-001',
        'SYS-INV-1-001', 'SYS-INV-2-001', 'SYS-DCPD-001',
        'SYS-BILGE-001', 'SYS-COOL-001'
      )
    )`,
    );

    console.log('✅ 测试阈值配置已删除');
    console.log('✅ 测试阈值配置回滚完成');
  }
}
