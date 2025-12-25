import { Injectable, Logger } from '@nestjs/common';
import {
  MetricType,
  DataQuality,
} from '../../database/entities/time-series-data.entity';

/**
 * 数据质量验证结果接口
 */
export interface DataQualityCheckResult {
  isValid: boolean; // 数据是否有效
  quality: DataQuality; // 数据质量等级
  warnings: string[]; // 警告信息
  errors: string[]; // 错误信息
}

/**
 * 指标范围配置接口
 */
interface MetricRangeConfig {
  min: number; // 最小合理值
  max: number; // 最大合理值
  unit: string; // 标准单位
}

/**
 * 数据质量验证服务
 *
 * 提供监测数据的质量检查功能：
 * 1. 数值范围验证（检查是否在合理范围内）
 * 2. 时间戳验证（检查是否在合理时间范围内）
 * 3. 数据完整性验证
 * 4. 异常值检测
 */
@Injectable()
export class DataQualityService {
  private readonly logger = new Logger(DataQualityService.name);

  /**
   * 各指标类型的合理范围配置
   * 根据实际业务场景调整这些范围
   */
  private readonly metricRanges: Record<MetricType, MetricRangeConfig> = {
    [MetricType.VIBRATION]: { min: 0, max: 100, unit: 'mm/s' },
    [MetricType.TEMPERATURE]: { min: -50, max: 200, unit: '°C' },
    [MetricType.PRESSURE]: { min: 0, max: 50, unit: 'MPa' },
    [MetricType.HUMIDITY]: { min: 0, max: 100, unit: '%' },
    [MetricType.SPEED]: { min: 0, max: 10000, unit: 'rpm' },
    [MetricType.CURRENT]: { min: 0, max: 1000, unit: 'A' },
    [MetricType.VOLTAGE]: { min: 0, max: 1000, unit: 'V' },
    [MetricType.POWER]: { min: 0, max: 10000, unit: 'kW' },
    [MetricType.FREQUENCY]: { min: 0, max: 100, unit: 'Hz' },
    [MetricType.LEVEL]: { min: 0, max: 10000, unit: 'mm' },
    [MetricType.RESISTANCE]: { min: 0, max: 10000, unit: 'Ω/V' },
    [MetricType.SWITCH]: { min: 0, max: 1, unit: '' },
  };

  /**
   * 验证监测数据质量
   *
   * @param metricType 指标类型
   * @param value 数值
   * @param timestamp 时间戳
   * @param unit 单位（可选）
   * @returns 数据质量检查结果
   */
  checkDataQuality(
    metricType: MetricType,
    value: number,
    timestamp: Date,
    unit?: string,
  ): DataQualityCheckResult {
    const result: DataQualityCheckResult = {
      isValid: true,
      quality: DataQuality.NORMAL,
      warnings: [],
      errors: [],
    };

    // 1. 验证数值是否为有效数字
    if (!this.isValidNumber(value)) {
      result.isValid = false;
      result.quality = DataQuality.ABNORMAL;
      result.errors.push(`数值无效: ${value}`);
      return result;
    }

    // 2. 验证数值范围
    const rangeCheck = this.checkValueRange(metricType, value);
    if (!rangeCheck.isValid) {
      result.quality = DataQuality.ABNORMAL;
      result.errors.push(rangeCheck.message);
    } else if (rangeCheck.isSuspicious) {
      result.quality = DataQuality.SUSPICIOUS;
      result.warnings.push(rangeCheck.message);
    }

    // 3. 验证时间戳
    const timestampCheck = this.checkTimestamp(timestamp);
    if (!timestampCheck.isValid) {
      result.quality = DataQuality.SUSPICIOUS;
      result.warnings.push(timestampCheck.message);
    }

    // 4. 验证单位（如果提供）
    if (unit) {
      const unitCheck = this.checkUnit(metricType, unit);
      if (!unitCheck.isValid) {
        result.warnings.push(unitCheck.message);
      }
    }

    // 5. 判断整体质量
    if (result.errors.length > 0) {
      result.isValid = false;
      result.quality = DataQuality.ABNORMAL;
    } else if (result.warnings.length > 0) {
      result.quality = DataQuality.SUSPICIOUS;
    }

    // 6. 记录质量检查日志
    if (result.quality !== DataQuality.NORMAL) {
      this.logger.warn(
        `数据质量异常: 指标=${metricType}, 值=${value}, 质量=${result.quality}, 原因=${[...result.errors, ...result.warnings].join('; ')}`,
      );
    }

    return result;
  }

  /**
   * 验证数值是否为有效数字
   */
  private isValidNumber(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * 验证数值范围
   */
  private checkValueRange(
    metricType: MetricType,
    value: number,
  ): { isValid: boolean; isSuspicious: boolean; message: string } {
    const config = this.metricRanges[metricType];

    // 检查是否超出合理范围
    if (value < config.min || value > config.max) {
      return {
        isValid: false,
        isSuspicious: false,
        message: `数值超出合理范围: ${value} (合理范围: ${config.min} ~ ${config.max} ${config.unit})`,
      };
    }

    // 检查是否接近边界（可能是异常值）
    const rangeSize = config.max - config.min;
    const threshold = rangeSize * 0.05; // 5%的边界阈值

    if (value < config.min + threshold || value > config.max - threshold) {
      return {
        isValid: true,
        isSuspicious: true,
        message: `数值接近边界，可能存在异常: ${value} ${config.unit}`,
      };
    }

    return {
      isValid: true,
      isSuspicious: false,
      message: '',
    };
  }

  /**
   * 验证时间戳
   */
  private checkTimestamp(timestamp: Date | string): {
    isValid: boolean;
    message: string;
  } {
    const now = new Date();
    // 兼容处理：如果是字符串，先转换为Date对象
    const dateObj =
      typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const timestampMs = dateObj.getTime();
    const nowMs = now.getTime();

    // 1. 检查时间戳是否为有效日期
    if (isNaN(timestampMs)) {
      return {
        isValid: false,
        message: '时间戳格式无效',
      };
    }

    // 2. 检查时间戳是否在未来（超过5分钟）
    const fiveMinutes = 5 * 60 * 1000;
    if (timestampMs > nowMs + fiveMinutes) {
      return {
        isValid: false,
        message: `时间戳在未来: ${dateObj.toISOString()}`,
      };
    }

    // 3. 检查时间戳是否过于陈旧（超过1年）
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (timestampMs < nowMs - oneYear) {
      return {
        isValid: false,
        message: `时间戳过于陈旧: ${dateObj.toISOString()} (超过1年)`,
      };
    }

    // 4. 检查时间戳是否在过去（超过1小时但小于1年）
    const oneHour = 60 * 60 * 1000;
    if (timestampMs < nowMs - oneHour) {
      return {
        isValid: true,
        message: `时间戳在过去: ${dateObj.toISOString()} (可能是补录数据)`,
      };
    }

    return {
      isValid: true,
      message: '',
    };
  }

  /**
   * 验证单位
   */
  private checkUnit(
    metricType: MetricType,
    unit: string,
  ): { isValid: boolean; message: string } {
    const standardUnit = this.metricRanges[metricType].unit;

    if (unit !== standardUnit) {
      return {
        isValid: false,
        message: `单位不匹配: 期望${standardUnit}, 实际${unit}`,
      };
    }

    return {
      isValid: true,
      message: '',
    };
  }

  /**
   * 批量验证数据质量
   *
   * @param dataList 数据列表
   * @returns 验证结果列表
   */
  batchCheckDataQuality(
    dataList: Array<{
      metricType: MetricType;
      value: number;
      timestamp: Date;
      unit?: string;
    }>,
  ): DataQualityCheckResult[] {
    return dataList.map((data) =>
      this.checkDataQuality(
        data.metricType,
        data.value,
        data.timestamp,
        data.unit,
      ),
    );
  }

  /**
   * 获取指标类型的合理范围
   */
  getMetricRange(metricType: MetricType): MetricRangeConfig {
    return this.metricRanges[metricType];
  }

  /**
   * 更新指标类型的合理范围（用于动态调整）
   */
  updateMetricRange(
    metricType: MetricType,
    config: Partial<MetricRangeConfig>,
  ): void {
    this.metricRanges[metricType] = {
      ...this.metricRanges[metricType],
      ...config,
    };
    this.logger.log(
      `更新指标范围: ${metricType} -> ${JSON.stringify(this.metricRanges[metricType])}`,
    );
  }
}
