/**
 * SOH (State of Health) 计算算法
 *
 * 健康状态 (SOH) 是评估设备当前健康程度的关键指标
 * 取值范围: 0-100%，100%表示设备处于最佳状态
 *
 * 计算方法:
 * 1. 基于多个监测指标的历史数据
 * 2. 计算每个指标的健康度评分
 * 3. 加权综合得出总体SOH值
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 监测指标数据点接口
 */
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  metricType: string;
}

/**
 * SOH计算结果接口
 */
export interface SOHResult {
  soh: number; // 健康状态值 (0-100)
  confidence: number; // 置信度 (0-1)
  contributions: {
    [metricType: string]: {
      score: number; // 该指标的健康评分
      weight: number; // 该指标的权重
      contribution: number; // 该指标对总SOH的贡献
    };
  };
  calculatedAt: Date;
}

/**
 * 指标健康阈值配置接口
 */
export interface MetricThreshold {
  optimal: { min: number; max: number }; // 最佳范围
  normal: { min: number; max: number }; // 正常范围
  warning: { min: number; max: number }; // 警告范围
  critical: { min: number; max: number }; // 严重范围
}

/**
 * SOH计算器服务
 */
@Injectable()
export class SOHCalculator {
  private readonly logger = new Logger(SOHCalculator.name);

  // 默认指标权重配置
  private readonly defaultWeights: Record<string, number> = {
    vibration: 0.25, // 振动 25%
    temperature: 0.2, // 温度 20%
    pressure: 0.15, // 压力 15%
    speed: 0.15, // 转速 15%
    current: 0.1, // 电流 10%
    voltage: 0.1, // 电压 10%
    power: 0.05, // 功率 5%
  };

  // 默认指标健康阈值
  private readonly defaultThresholds: Record<string, MetricThreshold> = {
    vibration: {
      optimal: { min: 0, max: 2.5 },
      normal: { min: 2.5, max: 4.5 },
      warning: { min: 4.5, max: 7.1 },
      critical: { min: 7.1, max: 100 },
    },
    temperature: {
      optimal: { min: 60, max: 75 },
      normal: { min: 55, max: 85 },
      warning: { min: 45, max: 95 },
      critical: { min: 0, max: 110 },
    },
    pressure: {
      optimal: { min: 0.4, max: 0.6 },
      normal: { min: 0.3, max: 0.7 },
      warning: { min: 0.2, max: 0.8 },
      critical: { min: 0, max: 1.0 },
    },
    speed: {
      optimal: { min: 1400, max: 1600 },
      normal: { min: 1300, max: 1700 },
      warning: { min: 1200, max: 1800 },
      critical: { min: 0, max: 2000 },
    },
  };

  /**
   * 计算设备的SOH值
   *
   * @param metricDataMap 按指标类型分组的监测数据
   * @param customWeights 自定义权重 (可选)
   * @returns SOH计算结果
   */
  calculateSOH(
    metricDataMap: Map<string, MetricDataPoint[]>,
    customWeights?: Record<string, number>,
  ): SOHResult {
    this.logger.log(
      `开始计算SOH: 指标数量=${metricDataMap.size}, 自定义权重=${!!customWeights}`,
    );

    // 使用自定义权重或默认权重
    const weights = customWeights || this.defaultWeights;

    // 存储每个指标的健康评分和贡献
    const contributions: SOHResult['contributions'] = {};

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let dataPointsCount = 0;

    // 遍历每个指标类型
    for (const [metricType, dataPoints] of metricDataMap.entries()) {
      if (dataPoints.length === 0) {
        this.logger.warn(`指标${metricType}没有数据点，跳过`);
        continue;
      }

      // 获取该指标的权重
      const weight = weights[metricType] || 0.05; // 默认5%权重

      // 计算该指标的健康评分
      const metricScore = this.calculateMetricHealthScore(
        metricType,
        dataPoints,
      );

      // 计算该指标对总SOH的贡献
      const contribution = metricScore * weight;

      contributions[metricType] = {
        score: metricScore,
        weight,
        contribution,
      };

      totalWeightedScore += contribution;
      totalWeight += weight;
      dataPointsCount += dataPoints.length;

      this.logger.debug(
        `指标${metricType}: 评分=${metricScore.toFixed(2)}, 权重=${weight.toFixed(2)}, 贡献=${contribution.toFixed(2)}`,
      );
    }

    // 归一化SOH值 (确保总权重为1)
    const soh = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0;

    // 计算置信度 (基于数据点数量和指标覆盖度)
    const confidence = this.calculateConfidence(
      metricDataMap.size,
      dataPointsCount,
    );

    const result: SOHResult = {
      soh: Math.round(soh * 100) / 100, // 保留两位小数
      confidence: Math.round(confidence * 100) / 100,
      contributions,
      calculatedAt: new Date(),
    };

    this.logger.log(
      `SOH计算完成: SOH=${result.soh}%, 置信度=${result.confidence}`,
    );

    return result;
  }

  /**
   * 计算单个指标的健康评分
   *
   * @param metricType 指标类型
   * @param dataPoints 监测数据点
   * @returns 健康评分 (0-1)
   */
  private calculateMetricHealthScore(
    metricType: string,
    dataPoints: MetricDataPoint[],
  ): number {
    // 获取指标阈值
    const threshold =
      this.defaultThresholds[metricType] || this.defaultThresholds['vibration'];

    // 计算数据点的统计特征
    const values = dataPoints.map((dp) => dp.value);
    const avgValue = this.average(values);
    const stdDev = this.standardDeviation(values);

    // 根据平均值所在的范围计算基础评分
    let baseScore = 0;

    if (
      avgValue >= threshold.optimal.min &&
      avgValue <= threshold.optimal.max
    ) {
      // 最佳范围: 评分90-100
      baseScore = 0.95;
    } else if (
      avgValue >= threshold.normal.min &&
      avgValue <= threshold.normal.max
    ) {
      // 正常范围: 评分70-90
      baseScore = 0.8;
    } else if (
      avgValue >= threshold.warning.min &&
      avgValue <= threshold.warning.max
    ) {
      // 警告范围: 评分40-70
      baseScore = 0.55;
    } else {
      // 严重范围: 评分0-40
      baseScore = 0.2;
    }

    // 根据标准差调整评分 (稳定性因子)
    // 标准差越小，数据越稳定，评分调整越小
    const stabilityFactor = Math.max(0, 1 - stdDev / avgValue);
    const adjustedScore = baseScore * (0.8 + 0.2 * stabilityFactor);

    return Math.max(0, Math.min(1, adjustedScore));
  }

  /**
   * 计算置信度
   *
   * 置信度基于:
   * 1. 指标覆盖度 (监测了多少种指标)
   * 2. 数据点数量 (数据越多，置信度越高)
   *
   * @param metricCount 指标数量
   * @param dataPointsCount 总数据点数量
   * @returns 置信度 (0-1)
   */
  private calculateConfidence(
    metricCount: number,
    dataPointsCount: number,
  ): number {
    // 指标覆盖度因子 (最多7种核心指标)
    const coverageFactor = Math.min(1, metricCount / 7);

    // 数据量因子 (至少100个数据点认为是充分的)
    const dataFactor = Math.min(1, dataPointsCount / 100);

    // 综合置信度
    return coverageFactor * 0.6 + dataFactor * 0.4;
  }

  /**
   * 计算数组平均值
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 计算标准差
   */
  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = this.average(values);
    const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
    const avgSquareDiff = this.average(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }
}
