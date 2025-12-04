/**
 * 健康指数评估器单元测试
 *
 * 测试健康指数评估算法的准确性
 */

import {
  HealthIndexEvaluator,
  EquipmentStatistics,
  SOHTrendData,
} from '../health-index-evaluator';

describe('HealthIndexEvaluator', () => {
  let evaluator: HealthIndexEvaluator;

  beforeEach(() => {
    evaluator = new HealthIndexEvaluator();
  });

  describe('evaluateHealthIndex', () => {
    it('应该正确评估优秀状态的设备', () => {
      const currentSOH = 95;

      // 稳定的SOH趋势
      const sohTrend: SOHTrendData[] = [];
      for (let i = 0; i < 10; i++) {
        sohTrend.push({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          sohValue: 95,
        });
      }

      // 优秀的运行统计
      const statistics: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 1, // 极少告警
        criticalAlarmCount: 0,
        warningAlarmCount: 1,
        maintenanceCount: 5, // 定期维护
        lastMaintenanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1年前
      };

      const result = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        statistics,
      );

      expect(result.healthIndex).toBeGreaterThanOrEqual(85);
      expect(result.grade).toBe('Excellent');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('应该正确评估较差状态的设备', () => {
      const currentSOH = 45;

      // 下降趋势
      const sohTrend: SOHTrendData[] = [];
      for (let i = 0; i < 10; i++) {
        sohTrend.push({
          timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          sohValue: 45 + i * 2, // 逐渐下降
        });
      }

      // 较差的运行统计
      const statistics: EquipmentStatistics = {
        totalRunningHours: 2000,
        totalAlarmCount: 50, // 频繁告警
        criticalAlarmCount: 10,
        warningAlarmCount: 40,
        maintenanceCount: 1, // 维护不足
        lastMaintenanceDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000), // 超过1年
        installationDate: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), // 2年前
      };

      const result = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        statistics,
      );

      expect(result.healthIndex).toBeLessThan(60);
      expect(result.grade).toMatch(/Poor|Critical/);
      // 验证建议中包含相关关键词
      const allRecommendations = result.recommendations.join(' ');
      expect(allRecommendations).toMatch(/健康|维护|检修/);
    });

    it('应该正确计算趋势评分', () => {
      const currentSOH = 70;

      // 上升趋势（改善）
      const improvingTrend: SOHTrendData[] = [];
      for (let i = 0; i < 10; i++) {
        improvingTrend.push({
          timestamp: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          sohValue: 60 + i * 1, // 从60上升到70
        });
      }

      const statistics: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 5,
        criticalAlarmCount: 0,
        warningAlarmCount: 5,
        maintenanceCount: 3,
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      const result1 = evaluator.evaluateHealthIndex(
        currentSOH,
        improvingTrend,
        statistics,
      );

      // 下降趋势（恶化）
      const worseningTrend: SOHTrendData[] = [];
      for (let i = 0; i < 10; i++) {
        worseningTrend.push({
          timestamp: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          sohValue: 80 - i * 1, // 从80下降到70
        });
      }

      const result2 = evaluator.evaluateHealthIndex(
        currentSOH,
        worseningTrend,
        statistics,
      );

      // 改善趋势应该有更高的趋势评分
      expect(result1.factors.trendScore).toBeGreaterThan(
        result2.factors.trendScore,
      );
    });

    it('应该根据告警频率调整评分', () => {
      const currentSOH = 75;
      const sohTrend: SOHTrendData[] = [
        { timestamp: new Date(), sohValue: 75 },
      ];

      // 低告警
      const lowAlarmStats: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 2,
        criticalAlarmCount: 0,
        warningAlarmCount: 2,
        maintenanceCount: 3,
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      const result1 = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        lowAlarmStats,
      );

      // 高告警
      const highAlarmStats: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 100,
        criticalAlarmCount: 20,
        warningAlarmCount: 80,
        maintenanceCount: 3,
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      const result2 = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        highAlarmStats,
      );

      // 低告警应该有更高的告警评分
      expect(result1.factors.alarmScore).toBeGreaterThan(
        result2.factors.alarmScore,
      );
    });

    it('应该根据维护情况调整评分', () => {
      const currentSOH = 75;
      const sohTrend: SOHTrendData[] = [
        { timestamp: new Date(), sohValue: 75 },
      ];

      // 良好维护
      const wellMaintainedStats: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 5,
        criticalAlarmCount: 0,
        warningAlarmCount: 5,
        maintenanceCount: 4, // 每年2次
        lastMaintenanceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 3个月前
        installationDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000), // 2年前
      };

      const result1 = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        wellMaintainedStats,
      );

      // 维护不足
      const poorlyMaintainedStats: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 5,
        criticalAlarmCount: 0,
        warningAlarmCount: 5,
        maintenanceCount: 0, // 无维护
        lastMaintenanceDate: undefined,
        installationDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
      };

      const result2 = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        poorlyMaintainedStats,
      );

      // 良好维护应该有更高的维护评分
      expect(result1.factors.maintenanceScore).toBeGreaterThan(
        result2.factors.maintenanceScore,
      );
    });

    it('应该生成适当的维护建议', () => {
      const currentSOH = 35; // 严重状态
      const sohTrend: SOHTrendData[] = [
        { timestamp: new Date(), sohValue: 35 },
      ];

      const statistics: EquipmentStatistics = {
        totalRunningHours: 2000,
        totalAlarmCount: 80,
        criticalAlarmCount: 20,
        warningAlarmCount: 60,
        maintenanceCount: 0,
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      const result = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        statistics,
      );

      // 应该包含紧急建议
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(
        result.recommendations.some(
          (r) => r.includes('立即') || r.includes('严重'),
        ),
      ).toBe(true);
    });

    it('应该正确应用自定义权重', () => {
      const currentSOH = 70;
      const sohTrend: SOHTrendData[] = [
        { timestamp: new Date(), sohValue: 70 },
      ];

      const statistics: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 10,
        criticalAlarmCount: 2,
        warningAlarmCount: 8,
        maintenanceCount: 2,
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      // 自定义权重：SOH 50%，其他各占16.67%
      const customWeights = {
        soh: 0.5,
        trend: 0.17,
        alarm: 0.17,
        maintenance: 0.16,
      };

      const result = evaluator.evaluateHealthIndex(
        currentSOH,
        sohTrend,
        statistics,
        customWeights,
      );

      expect(result.weights.soh).toBe(0.5);
      expect(result.weights.trend).toBe(0.17);
    });

    it('应该正确确定健康等级', () => {
      const sohTrend: SOHTrendData[] = [
        { timestamp: new Date(), sohValue: 50 },
      ];
      const statistics: EquipmentStatistics = {
        totalRunningHours: 1000,
        totalAlarmCount: 10,
        criticalAlarmCount: 0,
        warningAlarmCount: 10,
        maintenanceCount: 2,
        installationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      };

      // 测试不同SOH对应的等级
      const result1 = evaluator.evaluateHealthIndex(95, sohTrend, statistics);
      expect(result1.grade).toMatch(/Excellent|Good/);

      const result2 = evaluator.evaluateHealthIndex(80, sohTrend, statistics);
      expect(result2.grade).toMatch(/Excellent|Good|Fair/);

      const result3 = evaluator.evaluateHealthIndex(65, sohTrend, statistics);
      expect(result3.grade).toMatch(/Good|Fair/);

      const result4 = evaluator.evaluateHealthIndex(50, sohTrend, statistics);
      expect(result4.grade).toMatch(/Fair|Poor/);

      const result5 = evaluator.evaluateHealthIndex(30, sohTrend, statistics);
      expect(result5.grade).toMatch(/Poor|Critical/);
    });
  });
});
