/**
 * SOH计算器单元测试
 *
 * 测试SOH算法的准确性和边界情况
 */

import { SOHCalculator, MetricDataPoint } from '../soh-calculator';

describe('SOHCalculator', () => {
  let calculator: SOHCalculator;

  beforeEach(() => {
    calculator = new SOHCalculator();
  });

  describe('calculateSOH', () => {
    it('应该正确计算优秀健康状态的SOH值', () => {
      // 准备测试数据：所有指标都在最佳范围内
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      // 振动数据（最佳范围：0-2.5）
      metricDataMap.set('vibration', [
        { timestamp: new Date(), value: 1.5, metricType: 'vibration' },
        { timestamp: new Date(), value: 1.6, metricType: 'vibration' },
        { timestamp: new Date(), value: 1.4, metricType: 'vibration' },
      ]);

      // 温度数据（最佳范围：60-75）
      metricDataMap.set('temperature', [
        { timestamp: new Date(), value: 68, metricType: 'temperature' },
        { timestamp: new Date(), value: 70, metricType: 'temperature' },
        { timestamp: new Date(), value: 69, metricType: 'temperature' },
      ]);

      const result = calculator.calculateSOH(metricDataMap);

      // SOH应该在85-100之间
      expect(result.soh).toBeGreaterThanOrEqual(85);
      expect(result.soh).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.contributions).toHaveProperty('vibration');
      expect(result.contributions).toHaveProperty('temperature');
    });

    it('应该正确计算较差健康状态的SOH值', () => {
      // 准备测试数据：指标在警告范围内
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      // 振动数据（警告范围：4.5-7.1）
      metricDataMap.set('vibration', [
        { timestamp: new Date(), value: 5.5, metricType: 'vibration' },
        { timestamp: new Date(), value: 5.8, metricType: 'vibration' },
        { timestamp: new Date(), value: 5.3, metricType: 'vibration' },
      ]);

      // 温度数据（警告范围：45-95）
      metricDataMap.set('temperature', [
        { timestamp: new Date(), value: 90, metricType: 'temperature' },
        { timestamp: new Date(), value: 92, metricType: 'temperature' },
        { timestamp: new Date(), value: 89, metricType: 'temperature' },
      ]);

      const result = calculator.calculateSOH(metricDataMap);

      // SOH应该在40-70之间
      expect(result.soh).toBeGreaterThanOrEqual(40);
      expect(result.soh).toBeLessThanOrEqual(70);
    });

    it('应该处理空数据情况', () => {
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      const result = calculator.calculateSOH(metricDataMap);

      expect(result.soh).toBe(0);
      expect(result.confidence).toBe(0);
      expect(Object.keys(result.contributions)).toHaveLength(0);
    });

    it('应该正确应用自定义权重', () => {
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      metricDataMap.set('vibration', [
        { timestamp: new Date(), value: 1.5, metricType: 'vibration' },
      ]);

      metricDataMap.set('temperature', [
        { timestamp: new Date(), value: 70, metricType: 'temperature' },
      ]);

      // 自定义权重：振动50%，温度50%
      const customWeights = {
        vibration: 0.5,
        temperature: 0.5,
      };

      const result = calculator.calculateSOH(metricDataMap, customWeights);

      expect(result.contributions.vibration.weight).toBe(0.5);
      expect(result.contributions.temperature.weight).toBe(0.5);
    });

    it('应该根据数据量计算置信度', () => {
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      // 少量数据
      metricDataMap.set('vibration', [
        { timestamp: new Date(), value: 1.5, metricType: 'vibration' },
      ]);

      const result1 = calculator.calculateSOH(metricDataMap);
      const confidence1 = result1.confidence;

      // 更多数据
      const moreData: MetricDataPoint[] = [];
      for (let i = 0; i < 50; i++) {
        moreData.push({
          timestamp: new Date(),
          value: 1.5 + Math.random() * 0.5,
          metricType: 'vibration',
        });
      }
      metricDataMap.set('vibration', moreData);

      const result2 = calculator.calculateSOH(metricDataMap);
      const confidence2 = result2.confidence;

      // 更多数据应该有更高的置信度
      expect(confidence2).toBeGreaterThan(confidence1);
    });

    it('应该正确处理多种指标类型', () => {
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      // 添加7种核心指标
      const metrics = [
        'vibration',
        'temperature',
        'pressure',
        'speed',
        'current',
        'voltage',
        'power',
      ];

      metrics.forEach((metric) => {
        metricDataMap.set(metric, [
          { timestamp: new Date(), value: 50, metricType: metric },
        ]);
      });

      const result = calculator.calculateSOH(metricDataMap);

      // 应该包含所有7种指标的贡献
      expect(Object.keys(result.contributions)).toHaveLength(7);
      // 置信度应该较高（指标覆盖完整）
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('应该处理数据稳定性差异', () => {
      const metricDataMap = new Map<string, MetricDataPoint[]>();

      // 稳定数据
      const stableData: MetricDataPoint[] = [];
      for (let i = 0; i < 10; i++) {
        stableData.push({
          timestamp: new Date(),
          value: 1.5, // 完全稳定
          metricType: 'vibration',
        });
      }

      metricDataMap.set('vibration', stableData);
      const result1 = calculator.calculateSOH(metricDataMap);
      const score1 = result1.contributions.vibration.score;

      // 波动数据
      const volatileData: MetricDataPoint[] = [];
      for (let i = 0; i < 10; i++) {
        volatileData.push({
          timestamp: new Date(),
          value: 1.5 + (Math.random() - 0.5) * 2, // 高波动
          metricType: 'vibration',
        });
      }

      metricDataMap.set('vibration', volatileData);
      const result2 = calculator.calculateSOH(metricDataMap);
      const score2 = result2.contributions.vibration.score;

      // 稳定数据应该有更高的评分
      expect(score1).toBeGreaterThanOrEqual(score2);
    });
  });
});
