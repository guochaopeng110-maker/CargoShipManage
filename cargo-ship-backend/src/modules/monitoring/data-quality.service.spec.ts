import { Test, TestingModule } from '@nestjs/testing';
import { DataQualityService } from './data-quality.service';
import {
  MetricType,
  DataQuality,
} from '../../database/entities/time-series-data.entity';

describe('DataQualityService', () => {
  let service: DataQualityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataQualityService],
    }).compile();

    service = module.get<DataQualityService>(DataQualityService);
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 数据质量验证测试 ====================
  describe('验证监测数据质量 (checkDataQuality)', () => {
    it('应该验证正常的数据', () => {
      // Arrange: 准备正常数据
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.isValid).toBe(true);
      expect(result.quality).toBe(DataQuality.NORMAL);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('应该检测无效数值（NaN）', () => {
      // Arrange: 准备无效数据
      const metricType = MetricType.TEMPERATURE;
      const value = NaN;
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.isValid).toBe(false);
      expect(result.quality).toBe(DataQuality.ABNORMAL);
      expect(result.errors).toContain(`数值无效: ${value}`);
    });

    it('应该检测无效数值（Infinity）', () => {
      // Arrange: 准备无效数据
      const metricType = MetricType.TEMPERATURE;
      const value = Infinity;
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.isValid).toBe(false);
      expect(result.quality).toBe(DataQuality.ABNORMAL);
      expect(result.errors).toContain(`数值无效: ${value}`);
    });

    it('应该检测超出范围的数值（超过最大值）', () => {
      // Arrange: 准备超范围数据
      const metricType = MetricType.TEMPERATURE;
      const value = 250; // 超过最大值200
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.quality).toBe(DataQuality.ABNORMAL);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('数值超出合理范围');
    });

    it('应该检测超出范围的数值（低于最小值）', () => {
      // Arrange: 准备超范围数据
      const metricType = MetricType.TEMPERATURE;
      const value = -100; // 低于最小值-50
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.quality).toBe(DataQuality.ABNORMAL);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('数值超出合理范围');
    });

    it('应该检测接近边界的可疑数值（接近上限）', () => {
      // Arrange: 准备接近边界的数据
      const metricType = MetricType.TEMPERATURE;
      const value = 198; // 接近最大值200（在5%阈值内）
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.quality).toBe(DataQuality.SUSPICIOUS);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('数值接近边界');
    });

    it('应该检测接近边界的可疑数值（接近下限）', () => {
      // Arrange: 准备接近边界的数据
      const metricType = MetricType.TEMPERATURE;
      const value = -48; // 接近最小值-50（在5%阈值内）
      const timestamp = new Date();
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.quality).toBe(DataQuality.SUSPICIOUS);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('数值接近边界');
    });

    it('应该验证不同指标类型的合理范围（振动）', () => {
      // Arrange: 准备振动数据
      const metricType = MetricType.VIBRATION;
      const value = 50; // 在合理范围内（0-100）
      const timestamp = new Date();
      const unit = 'mm/s';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.isValid).toBe(true);
      expect(result.quality).toBe(DataQuality.NORMAL);
    });

    it('应该验证不同指标类型的合理范围（压力）', () => {
      // Arrange: 准备压力数据
      const metricType = MetricType.PRESSURE;
      const value = 25; // 在合理范围内（0-50）
      const timestamp = new Date();
      const unit = 'MPa';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.isValid).toBe(true);
      expect(result.quality).toBe(DataQuality.NORMAL);
    });

    it('应该验证不同指标类型的合理范围（湿度）', () => {
      // Arrange: 准备湿度数据
      const metricType = MetricType.HUMIDITY;
      const value = 65; // 在合理范围内（0-100）
      const timestamp = new Date();
      const unit = '%';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.isValid).toBe(true);
      expect(result.quality).toBe(DataQuality.NORMAL);
    });

    it('应该检测未来的时间戳', () => {
      // Arrange: 准备未来时间戳（超过5分钟）
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.quality).toBe(DataQuality.SUSPICIOUS);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该检测过于陈旧的时间戳', () => {
      // Arrange: 准备陈旧时间戳（超过1年）
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400天前
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.quality).toBe(DataQuality.SUSPICIOUS);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该接受补录数据（时间戳在过去1小时到1年之间）', () => {
      // Arrange: 准备过去的时间戳（2小时前）
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2小时前
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果（补录数据是有效的，质量为NORMAL）
      expect(result.isValid).toBe(true);
      expect(result.quality).toBe(DataQuality.NORMAL);
      expect(result.warnings).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('应该接受最近的时间戳（1小时内）', () => {
      // Arrange: 准备最近的时间戳
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
      const unit = '°C';

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果（没有时间戳警告）
      expect(result.isValid).toBe(true);
      expect(result.quality).toBe(DataQuality.NORMAL);
    });

    it('应该检测单位不匹配', () => {
      // Arrange: 准备错误单位的数据
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date();
      const unit = 'MPa'; // 错误的单位（应该是°C）

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果
      expect(result.warnings.some((w) => w.includes('单位不匹配'))).toBe(true);
    });

    it('应该支持不提供单位参数', () => {
      // Arrange: 准备不带单位的数据
      const metricType = MetricType.TEMPERATURE;
      const value = 75.5;
      const timestamp = new Date();

      // Act: 执行验证（不提供单位）
      const result = service.checkDataQuality(metricType, value, timestamp);

      // Assert: 验证结果（应该正常，不检查单位）
      expect(result.isValid).toBe(true);
    });

    it('应该处理多个错误和警告', () => {
      // Arrange: 准备多个问题的数据
      const metricType = MetricType.TEMPERATURE;
      const value = 250; // 超出范围
      const timestamp = new Date(Date.now() + 10 * 60 * 1000); // 未来时间
      const unit = 'MPa'; // 错误单位

      // Act: 执行验证
      const result = service.checkDataQuality(
        metricType,
        value,
        timestamp,
        unit,
      );

      // Assert: 验证结果（应该有多个错误/警告）
      expect(result.quality).toBe(DataQuality.ABNORMAL);
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(1);
    });
  });

  // ==================== 批量数据质量验证测试 ====================
  describe('批量验证数据质量 (batchCheckDataQuality)', () => {
    it('应该批量验证数据质量', () => {
      // Arrange: 准备批量数据
      const dataList = [
        {
          metricType: MetricType.TEMPERATURE,
          value: 75.5,
          timestamp: new Date(),
          unit: '°C',
        },
        {
          metricType: MetricType.PRESSURE,
          value: 25,
          timestamp: new Date(),
          unit: 'MPa',
        },
        {
          metricType: MetricType.HUMIDITY,
          value: 65,
          timestamp: new Date(),
          unit: '%',
        },
      ];

      // Act: 执行批量验证
      const results = service.batchCheckDataQuality(dataList);

      // Assert: 验证结果
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(results.every((r) => r.quality === DataQuality.NORMAL)).toBe(true);
    });

    it('应该识别批量数据中的异常数据', () => {
      // Arrange: 准备包含异常的批量数据
      const dataList = [
        {
          metricType: MetricType.TEMPERATURE,
          value: 75.5, // 正常
          timestamp: new Date(),
          unit: '°C',
        },
        {
          metricType: MetricType.TEMPERATURE,
          value: NaN, // 无效
          timestamp: new Date(),
          unit: '°C',
        },
        {
          metricType: MetricType.TEMPERATURE,
          value: 250, // 超范围
          timestamp: new Date(),
          unit: '°C',
        },
      ];

      // Act: 执行批量验证
      const results = service.batchCheckDataQuality(dataList);

      // Assert: 验证结果
      expect(results).toHaveLength(3);
      expect(results[0].quality).toBe(DataQuality.NORMAL);
      expect(results[1].quality).toBe(DataQuality.ABNORMAL);
      expect(results[2].quality).toBe(DataQuality.ABNORMAL);
    });

    it('应该处理空数组', () => {
      // Arrange: 准备空数组
      const dataList: any[] = [];

      // Act: 执行批量验证
      const results = service.batchCheckDataQuality(dataList);

      // Assert: 验证结果
      expect(results).toEqual([]);
    });
  });

  // ==================== 获取指标范围测试 ====================
  describe('获取指标类型的合理范围 (getMetricRange)', () => {
    it('应该获取温度指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.TEMPERATURE);

      // Assert: 验证结果
      expect(range).toEqual({
        min: -50,
        max: 200,
        unit: '°C',
      });
    });

    it('应该获取振动指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.VIBRATION);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 100,
        unit: 'mm/s',
      });
    });

    it('应该获取压力指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.PRESSURE);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 50,
        unit: 'MPa',
      });
    });

    it('应该获取湿度指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.HUMIDITY);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 100,
        unit: '%',
      });
    });

    it('应该获取转速指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.SPEED);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 10000,
        unit: 'rpm',
      });
    });

    it('应该获取电流指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.CURRENT);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 1000,
        unit: 'A',
      });
    });

    it('应该获取电压指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.VOLTAGE);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 1000,
        unit: 'V',
      });
    });

    it('应该获取功率指标的合理范围', () => {
      // Act: 获取范围
      const range = service.getMetricRange(MetricType.POWER);

      // Assert: 验证结果
      expect(range).toEqual({
        min: 0,
        max: 10000,
        unit: 'kW',
      });
    });
  });

  // ==================== 更新指标范围测试 ====================
  describe('更新指标类型的合理范围 (updateMetricRange)', () => {
    it('应该成功更新指标范围', () => {
      // Arrange: 准备更新数据
      const metricType = MetricType.TEMPERATURE;
      const newConfig = {
        min: -60,
        max: 250,
      };

      // Act: 更新范围
      service.updateMetricRange(metricType, newConfig);

      // 获取更新后的范围
      const updatedRange = service.getMetricRange(metricType);

      // Assert: 验证结果
      expect(updatedRange.min).toBe(-60);
      expect(updatedRange.max).toBe(250);
      expect(updatedRange.unit).toBe('°C'); // 单位保持不变
    });

    it('应该支持部分更新（只更新最小值）', () => {
      // Arrange: 准备更新数据
      const metricType = MetricType.PRESSURE;
      const originalRange = service.getMetricRange(metricType);
      const newConfig = {
        min: 5,
      };

      // Act: 更新范围
      service.updateMetricRange(metricType, newConfig);

      // 获取更新后的范围
      const updatedRange = service.getMetricRange(metricType);

      // Assert: 验证结果
      expect(updatedRange.min).toBe(5);
      expect(updatedRange.max).toBe(originalRange.max); // 最大值不变
      expect(updatedRange.unit).toBe(originalRange.unit); // 单位不变
    });

    it('应该支持部分更新（只更新最大值）', () => {
      // Arrange: 准备更新数据
      const metricType = MetricType.VIBRATION;
      const originalRange = service.getMetricRange(metricType);
      const newConfig = {
        max: 150,
      };

      // Act: 更新范围
      service.updateMetricRange(metricType, newConfig);

      // 获取更新后的范围
      const updatedRange = service.getMetricRange(metricType);

      // Assert: 验证结果
      expect(updatedRange.min).toBe(originalRange.min); // 最小值不变
      expect(updatedRange.max).toBe(150);
      expect(updatedRange.unit).toBe(originalRange.unit); // 单位不变
    });

    it('应该支持更新单位', () => {
      // Arrange: 准备更新数据
      const metricType = MetricType.TEMPERATURE;
      const newConfig = {
        unit: '°F',
      };

      // Act: 更新范围
      service.updateMetricRange(metricType, newConfig);

      // 获取更新后的范围
      const updatedRange = service.getMetricRange(metricType);

      // Assert: 验证结果
      expect(updatedRange.unit).toBe('°F');
    });

    it('更新范围后验证应该使用新的范围', () => {
      // Arrange: 更新温度范围
      const metricType = MetricType.TEMPERATURE;
      service.updateMetricRange(metricType, {
        min: 0,
        max: 100,
      });

      // Act: 验证超出新范围的数据
      const result = service.checkDataQuality(
        metricType,
        150, // 超过新的最大值100
        new Date(),
        '°C',
      );

      // Assert: 验证结果（应该被标记为异常）
      expect(result.quality).toBe(DataQuality.ABNORMAL);
      expect(result.errors.some((e) => e.includes('超出合理范围'))).toBe(true);
    });
  });
});
