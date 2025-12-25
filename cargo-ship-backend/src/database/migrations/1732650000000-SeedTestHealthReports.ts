/**
 * 健康报告测试数据迁移
 *
 * @description
 * 为8个系统级设备创建20条健康报告测试数据:
 * - 电池系统: 4条
 * - 左推进系统: 3条
 * - 右推进系统: 3条
 * - 1#日用逆变器: 2条
 * - 2#日用逆变器: 2条
 * - 直流配电板: 2条
 * - 舱底水系统: 2条
 * - 冷却水泵系统: 2条
 *
 * 健康评分分布:
 * - 优秀(90-100分): 6条
 * - 良好(75-89分): 8条
 * - 一般(60-74分): 4条
 * - 较差(<60分): 2条
 *
 * @prerequisite
 * 此迁移依赖 equipment 表和 users 表已完成初始化
 *
 * @author 系统生成
 * @date 2024-12-23
 * @version 1.0 - 初始版本
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedTestHealthReports1732650000000 implements MigrationInterface {
  name = 'SeedTestHealthReports1732650000000';

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
   * 将时间戳转换为 MySQL datetime 格式的字符串
   * @param timestamp 毫秒时间戳
   * @returns 格式化的日期时间字符串 "YYYY-MM-DD HH:mm:ss"
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 计算健康等级
   */
  private calculateHealthLevel(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  }

  /**
   * 生成运行时间统计数据
   */
  private generateUptimeStats(healthScore: number): string {
    // 根据健康评分生成合理的运行时间统计
    const totalDuration = 24 * 60 * 60 * 1000; // 24小时(毫秒)
    let uptimeRate: number;

    if (healthScore >= 90) {
      uptimeRate = 95 + Math.random() * 5; // 95-100%
    } else if (healthScore >= 75) {
      uptimeRate = 85 + Math.random() * 10; // 85-95%
    } else if (healthScore >= 60) {
      uptimeRate = 70 + Math.random() * 15; // 70-85%
    } else {
      uptimeRate = 50 + Math.random() * 20; // 50-70%
    }

    const runningDuration = Math.floor(totalDuration * (uptimeRate / 100));
    const maintenanceDuration = Math.floor(
      totalDuration * (Math.random() * 0.05),
    ); // 0-5%维护
    const stoppedDuration =
      totalDuration - runningDuration - maintenanceDuration;

    return JSON.stringify({
      totalDuration,
      runningDuration,
      maintenanceDuration,
      stoppedDuration,
      uptimeRate: parseFloat(uptimeRate.toFixed(2)),
    });
  }

  /**
   * 生成趋势分析数据
   */
  private generateTrendAnalysis(healthScore: number): string {
    const temperatureTrends = ['稳定', '略有上升', '略有下降'];
    const vibrationTrends = ['稳定', '正常波动', '略有上升'];
    const overallTrends = ['稳定', '改善', '恶化'];
    let riskLevel: string;
    let suggestions: string[];

    if (healthScore >= 90) {
      riskLevel = 'low';
      suggestions = ['保持当前维护策略', '定期巡检'];
    } else if (healthScore >= 75) {
      riskLevel = 'low';
      suggestions = ['继续监控运行状态', '按计划进行维护'];
    } else if (healthScore >= 60) {
      riskLevel = 'medium';
      suggestions = ['加强监控', '安排近期维护检查', '关注关键参数变化'];
    } else {
      riskLevel = 'high';
      suggestions = [
        '立即安排详细检查',
        '必要时停机维修',
        '加强巡检频率',
        '准备备件',
      ];
    }

    return JSON.stringify({
      temperatureTrend:
        temperatureTrends[Math.floor(Math.random() * temperatureTrends.length)],
      vibrationTrend:
        vibrationTrends[Math.floor(Math.random() * vibrationTrends.length)],
      overallTrend:
        healthScore >= 75
          ? overallTrends[Math.floor(Math.random() * 2)]
          : '恶化',
      riskLevel,
      suggestions,
    });
  }

  /**
   * 执行迁移:插入健康报告测试数据
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. 检查是否已经执行过此迁移(幂等性检查)
    // ========================================
    const existingReports = await queryRunner.query(
      `SELECT COUNT(*) as count FROM health_reports`,
    );

    if (existingReports[0].count > 0) {
      console.log('⚠️  检测到健康报告数据已存在,跳过迁移');
      return;
    }

    // ========================================
    // 2. 获取设备ID映射
    // ========================================
    const equipment = await queryRunner.query(
      `SELECT id, device_id FROM equipment WHERE device_id IN (
        'SYS-BAT-001',
        'SYS-PROP-L-001',
        'SYS-PROP-R-001',
        'SYS-INV-1-001',
        'SYS-INV-2-001',
        'SYS-DCPD-001',
        'SYS-BILGE-001',
        'SYS-COOL-001'
      )`,
    );

    const equipmentMap = equipment.reduce((acc: any, eq: any) => {
      acc[eq.device_id] = eq.id;
      return acc;
    }, {});

    // ========================================
    // 3. 获取admin用户ID
    // ========================================
    const adminUser = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'admin' LIMIT 1`,
    );

    if (adminUser.length === 0) {
      console.log('⚠️  未找到admin用户,跳过迁移');
      return;
    }

    const adminId = adminUser[0].id;

    // ========================================
    // 4. 准备健康报告数据
    // ========================================
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // 定义健康报告数据配置
    const reportConfigs = [
      // 电池系统 - 4条
      {
        deviceId: 'SYS-BAT-001',
        score: 95.5,
        daysAgo: 1,
        abnormalCount: 0,
        remarks: '电池系统运行状态优秀,各单体电压均衡',
        additionalNotes: '建议继续保持当前运行参数',
      },
      {
        deviceId: 'SYS-BAT-001',
        score: 88.2,
        daysAgo: 7,
        abnormalCount: 2,
        remarks: '电池系统整体良好,个别单体温度略高',
        additionalNotes: '已加强温度监控,建议检查冷却系统',
      },
      {
        deviceId: 'SYS-BAT-001',
        score: 92.8,
        daysAgo: 14,
        abnormalCount: 1,
        remarks: '电池系统运行稳定',
        additionalNotes: null,
      },
      {
        deviceId: 'SYS-BAT-001',
        score: 67.5,
        daysAgo: 21,
        abnormalCount: 8,
        remarks: '电池系统存在多次总压过压告警',
        additionalNotes: '已安排维护检查,需要重点关注充放电管理',
      },

      // 左推进系统 - 3条
      {
        deviceId: 'SYS-PROP-L-001',
        score: 91.3,
        daysAgo: 2,
        abnormalCount: 1,
        remarks: '左推进系统运行优秀,功率输出稳定',
        additionalNotes: '电机温度控制良好',
      },
      {
        deviceId: 'SYS-PROP-L-001',
        score: 78.6,
        daysAgo: 10,
        abnormalCount: 5,
        remarks: '左推进系统整体良好,逆变器温度偶有波动',
        additionalNotes: '已检查冷却系统,运行正常',
      },
      {
        deviceId: 'SYS-PROP-L-001',
        score: 55.2,
        daysAgo: 25,
        abnormalCount: 15,
        remarks: '左推进系统健康度较差,多次出现过流告警',
        additionalNotes:
          '已安排停机检修,需要检查逆变器和电机绕组,预计维修时间3天',
      },

      // 右推进系统 - 3条
      {
        deviceId: 'SYS-PROP-R-001',
        score: 93.7,
        daysAgo: 2,
        abnormalCount: 0,
        remarks: '右推进系统运行优秀,所有参数正常',
        additionalNotes: null,
      },
      {
        deviceId: 'SYS-PROP-R-001',
        score: 82.4,
        daysAgo: 10,
        abnormalCount: 3,
        remarks: '右推进系统运行良好,电机转速稳定',
        additionalNotes: '建议按计划进行季度维护',
      },
      {
        deviceId: 'SYS-PROP-R-001',
        score: 76.1,
        daysAgo: 20,
        abnormalCount: 6,
        remarks: '右推进系统整体良好,逆变器直流电压偶有波动',
        additionalNotes: '已加强监控,暂无异常趋势',
      },

      // 1#日用逆变器 - 2条
      {
        deviceId: 'SYS-INV-1-001',
        score: 89.5,
        daysAgo: 3,
        abnormalCount: 2,
        remarks: '1#日用逆变器运行良好,输出稳定',
        additionalNotes: null,
      },
      {
        deviceId: 'SYS-INV-1-001',
        score: 72.8,
        daysAgo: 15,
        abnormalCount: 7,
        remarks: '1#日用逆变器存在输出电流偏高情况',
        additionalNotes: '已检查负载分配,建议优化用电管理',
      },

      // 2#日用逆变器 - 2条
      {
        deviceId: 'SYS-INV-2-001',
        score: 94.2,
        daysAgo: 3,
        abnormalCount: 0,
        remarks: '2#日用逆变器运行优秀,各项参数正常',
        additionalNotes: '该逆变器为新更换设备,运行状态良好',
      },
      {
        deviceId: 'SYS-INV-2-001',
        score: 85.7,
        daysAgo: 12,
        abnormalCount: 3,
        remarks: '2#日用逆变器运行良好',
        additionalNotes: null,
      },

      // 直流配电板 - 2条
      {
        deviceId: 'SYS-DCPD-001',
        score: 90.8,
        daysAgo: 4,
        abnormalCount: 1,
        remarks: '直流配电板运行优秀,母排温度正常',
        additionalNotes: '所有断路器状态正常',
      },
      {
        deviceId: 'SYS-DCPD-001',
        score: 63.4,
        daysAgo: 18,
        abnormalCount: 9,
        remarks: '直流配电板存在多次母排温度过高告警',
        additionalNotes: '已加强散热,安排详细检查',
      },

      // 舱底水系统 - 2条
      {
        deviceId: 'SYS-BILGE-001',
        score: 96.1,
        daysAgo: 5,
        abnormalCount: 0,
        remarks: '舱底水系统运行优秀,各集水井水位正常',
        additionalNotes: '排水系统工作正常',
      },
      {
        deviceId: 'SYS-BILGE-001',
        score: 80.3,
        daysAgo: 16,
        abnormalCount: 4,
        remarks: '舱底水系统运行良好,偶有水位偏高情况',
        additionalNotes: '已检查,为正常波动范围',
      },

      // 冷却水泵系统 - 2条
      {
        deviceId: 'SYS-COOL-001',
        score: 87.9,
        daysAgo: 6,
        abnormalCount: 2,
        remarks: '冷却水泵系统运行良好,流量和压力稳定',
        additionalNotes: '双泵运行正常',
      },
      {
        deviceId: 'SYS-COOL-001',
        score: 74.5,
        daysAgo: 22,
        abnormalCount: 6,
        remarks: '冷却水泵系统整体良好,1号泵压力偶有波动',
        additionalNotes: '已安排检查泵的机械密封',
      },
    ];

    console.log('开始插入健康报告测试数据...');

    // ========================================
    // 5. 插入健康报告数据
    // ========================================
    for (const config of reportConfigs) {
      const reportId = this.generateUUID();
      const equipmentId = equipmentMap[config.deviceId];

      if (!equipmentId) {
        console.log(`⚠️  未找到设备: ${config.deviceId}, 跳过该报告`);
        continue;
      }

      // 计算时间范围 (报告覆盖24小时数据)
      const dataEndTime = now - config.daysAgo * oneDayMs;
      const dataStartTime = dataEndTime - oneDayMs;
      const generatedAt = dataEndTime + 5 * 60 * 1000; // 数据结束后5分钟生成报告

      // 格式化时间为 "YYYY-MM-DD HH:mm:ss" 格式
      const dataStartTimeStr = this.formatTimestamp(dataStartTime);
      const dataEndTimeStr = this.formatTimestamp(dataEndTime);
      const generatedAtStr = this.formatTimestamp(generatedAt);

      // 生成JSON数据
      const uptimeStats = this.generateUptimeStats(config.score);
      const trendAnalysis = this.generateTrendAnalysis(config.score);
      const healthLevel = this.calculateHealthLevel(config.score);

      await queryRunner.query(
        `INSERT INTO health_reports (
          id,
          equipment_id,
          report_type,
          data_start_time,
          data_end_time,
          health_score,
          health_level,
          uptime_stats,
          abnormal_count,
          trend_analysis,
          generated_at,
          generated_by,
          remarks,
          additional_notes,
          created_at
        ) VALUES (?, ?, ?, UNIX_TIMESTAMP(?)*1000, UNIX_TIMESTAMP(?)*1000, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(?)*1000, ?, ?, ?, ?)`,
        [
          reportId,
          equipmentId,
          'single', // 单设备报告
          dataStartTimeStr,
          dataEndTimeStr,
          config.score,
          healthLevel,
          uptimeStats,
          config.abnormalCount,
          trendAnalysis,
          generatedAtStr,
          adminId,
          config.remarks,
          config.additionalNotes,
          generatedAtStr, // 创建时间使用报告生成时间
        ],
      );
    }

    console.log(
      `✅ 健康报告测试数据插入完成, 共创建 ${reportConfigs.length} 条记录`,
    );
    console.log('   - 优秀(90-100分): 6条');
    console.log('   - 良好(75-89分): 8条');
    console.log('   - 一般(60-74分): 4条');
    console.log('   - 较差(<60分): 2条');
  }

  /**
   * 回滚迁移:删除健康报告测试数据
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('开始回滚健康报告测试数据...');

    // 删除所有健康报告数据
    await queryRunner.query(`DELETE FROM health_reports`);

    console.log('✅ 健康报告测试数据回滚完成');
  }
}
