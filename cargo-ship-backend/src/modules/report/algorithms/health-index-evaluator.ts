/**
 * 健康指数评估算法
 *
 * 健康指数是综合评估设备整体健康状况的复合指标
 * 不仅考虑当前状态(SOH)，还综合考虑：
 * - 历史趋势
 * - 告警频率
 * - 运行时长
 * - 维护记录
 *
 * 健康指数取值范围: 0-100
 * - 90-100: 优秀 (Excellent)
 * - 75-89: 良好 (Good)
 * - 60-74: 一般 (Fair)
 * - 40-59: 较差 (Poor)
 * - 0-39: 严重 (Critical)
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 设备运行统计数据接口
 */
export interface EquipmentStatistics {
  totalRunningHours: number; // 总运行时长（小时）
  totalAlarmCount: number; // 总告警次数
  criticalAlarmCount: number; // 严重告警次数
  warningAlarmCount: number; // 警告告警次数
  maintenanceCount: number; // 维护次数
  lastMaintenanceDate?: Date; // 上次维护日期
  installationDate: Date; // 安装日期
}

/**
 * SOH趋势数据接口
 */
export interface SOHTrendData {
  timestamp: Date;
  sohValue: number;
}

/**
 * 健康指数评估结果接口
 */
export interface HealthIndexResult {
  healthIndex: number; // 综合健康指数 (0-100)
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'; // 健康等级
  factors: {
    sohScore: number; // SOH评分贡献 (0-100)
    trendScore: number; // 趋势评分贡献 (0-100)
    alarmScore: number; // 告警评分贡献 (0-100)
    maintenanceScore: number; // 维护评分贡献 (0-100)
  };
  weights: {
    soh: number; // SOH权重
    trend: number; // 趋势权重
    alarm: number; // 告警权重
    maintenance: number; // 维护权重
  };
  recommendations: string[]; // 维护建议
  calculatedAt: Date;
}

/**
 * 健康指数评估器服务
 */
@Injectable()
export class HealthIndexEvaluator {
  private readonly logger = new Logger(HealthIndexEvaluator.name);

  // 默认权重配置
  private readonly defaultWeights = {
    soh: 0.4, // SOH权重 40%
    trend: 0.25, // 趋势权重 25%
    alarm: 0.2, // 告警权重 20%
    maintenance: 0.15, // 维护权重 15%
  };

  /**
   * 评估设备的综合健康指数
   *
   * @param currentSOH 当前SOH值 (0-100)
   * @param sohTrend SOH历史趋势数据
   * @param statistics 设备运行统计数据
   * @param customWeights 自定义权重 (可选)
   * @returns 健康指数评估结果
   */
  evaluateHealthIndex(
    currentSOH: number,
    sohTrend: SOHTrendData[],
    statistics: EquipmentStatistics,
    customWeights?: Partial<typeof this.defaultWeights>,
  ): HealthIndexResult {
    this.logger.log(
      `开始评估健康指数: SOH=${currentSOH}, 趋势数据点=${sohTrend.length}`,
    );

    // 使用自定义权重或默认权重
    const weights = { ...this.defaultWeights, ...customWeights };

    // 1. 计算SOH评分 (直接使用当前SOH值)
    const sohScore = currentSOH;

    // 2. 计算趋势评分
    const trendScore = this.calculateTrendScore(sohTrend);

    // 3. 计算告警评分
    const alarmScore = this.calculateAlarmScore(statistics);

    // 4. 计算维护评分
    const maintenanceScore = this.calculateMaintenanceScore(statistics);

    // 5. 计算综合健康指数
    const healthIndex =
      sohScore * weights.soh +
      trendScore * weights.trend +
      alarmScore * weights.alarm +
      maintenanceScore * weights.maintenance;

    // 6. 确定健康等级
    const grade = this.determineHealthGrade(healthIndex);

    // 7. 生成维护建议
    const recommendations = this.generateRecommendations(
      healthIndex,
      currentSOH,
      trendScore,
      alarmScore,
      maintenanceScore,
      statistics,
    );

    const result: HealthIndexResult = {
      healthIndex: Math.round(healthIndex * 100) / 100,
      grade,
      factors: {
        sohScore: Math.round(sohScore * 100) / 100,
        trendScore: Math.round(trendScore * 100) / 100,
        alarmScore: Math.round(alarmScore * 100) / 100,
        maintenanceScore: Math.round(maintenanceScore * 100) / 100,
      },
      weights,
      recommendations,
      calculatedAt: new Date(),
    };

    this.logger.log(
      `健康指数评估完成: HI=${result.healthIndex}, 等级=${result.grade}`,
    );

    return result;
  }

  /**
   * 计算趋势评分
   *
   * 分析SOH的历史趋势，判断设备健康状态是改善、稳定还是恶化
   *
   * @param sohTrend SOH历史趋势数据
   * @returns 趋势评分 (0-100)
   */
  private calculateTrendScore(sohTrend: SOHTrendData[]): number {
    if (sohTrend.length < 2) {
      this.logger.warn('趋势数据不足，使用默认评分70');
      return 70; // 数据不足时返回中等评分
    }

    // 按时间排序
    const sortedTrend = [...sohTrend].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // 计算线性回归斜率 (趋势方向)
    const slope = this.calculateLinearRegressionSlope(sortedTrend);

    // 计算变异系数 (稳定性)
    const values = sortedTrend.map((d) => d.sohValue);
    const mean = this.average(values);
    const stdDev = this.standardDeviation(values);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    // 基础评分
    let trendScore = 70;

    // 根据趋势方向调整评分
    if (slope > 0.1) {
      // 明显上升趋势 (改善)
      trendScore += 20;
    } else if (slope < -0.1) {
      // 明显下降趋势 (恶化)
      trendScore -= 20;
    }

    // 根据稳定性调整评分
    // 变异系数越小，越稳定，评分越高
    if (coefficientOfVariation < 0.1) {
      trendScore += 10; // 非常稳定
    } else if (coefficientOfVariation > 0.3) {
      trendScore -= 10; // 不稳定
    }

    // 检查最近的变化率
    const recentChangeRate = this.calculateRecentChangeRate(sortedTrend, 5);
    if (recentChangeRate < -5) {
      // 最近急剧下降
      trendScore -= 15;
      this.logger.warn(`检测到SOH急剧下降: ${recentChangeRate.toFixed(2)}%`);
    }

    return Math.max(0, Math.min(100, trendScore));
  }

  /**
   * 计算告警评分
   *
   * 基于告警频率和严重程度评估设备可靠性
   *
   * @param statistics 设备运行统计数据
   * @returns 告警评分 (0-100)
   */
  private calculateAlarmScore(statistics: EquipmentStatistics): number {
    const { totalRunningHours, totalAlarmCount, criticalAlarmCount } =
      statistics;

    // 计算告警频率 (次/100小时)
    const alarmRate =
      totalRunningHours > 0 ? (totalAlarmCount / totalRunningHours) * 100 : 0;

    // 计算严重告警比例
    const criticalRatio =
      totalAlarmCount > 0 ? criticalAlarmCount / totalAlarmCount : 0;

    // 基础评分
    let alarmScore = 100;

    // 根据告警频率扣分
    if (alarmRate < 0.5) {
      // 优秀: < 0.5次/100小时
      alarmScore = 95;
    } else if (alarmRate < 1) {
      // 良好: 0.5-1次/100小时
      alarmScore = 85;
    } else if (alarmRate < 2) {
      // 一般: 1-2次/100小时
      alarmScore = 70;
    } else if (alarmRate < 5) {
      // 较差: 2-5次/100小时
      alarmScore = 50;
    } else {
      // 严重: > 5次/100小时
      alarmScore = 30;
    }

    // 根据严重告警比例进一步扣分
    alarmScore -= criticalRatio * 20;

    return Math.max(0, Math.min(100, alarmScore));
  }

  /**
   * 计算维护评分
   *
   * 基于维护频率和及时性评估设备管理质量
   *
   * @param statistics 设备运行统计数据
   * @returns 维护评分 (0-100)
   */
  private calculateMaintenanceScore(statistics: EquipmentStatistics): number {
    const { maintenanceCount, lastMaintenanceDate, installationDate } =
      statistics;

    // 计算设备使用年限（年）
    const ageInYears =
      (Date.now() - installationDate.getTime()) / (365 * 24 * 60 * 60 * 1000);

    // 计算维护频率 (次/年)
    const maintenanceRate = ageInYears > 0 ? maintenanceCount / ageInYears : 0;

    // 基础评分
    let maintenanceScore = 70;

    // 根据维护频率评分
    if (maintenanceRate >= 2) {
      // 优秀: 每年至少2次维护
      maintenanceScore = 95;
    } else if (maintenanceRate >= 1) {
      // 良好: 每年至少1次维护
      maintenanceScore = 85;
    } else if (maintenanceRate >= 0.5) {
      // 一般: 每2年至少1次维护
      maintenanceScore = 70;
    } else {
      // 较差: 维护不足
      maintenanceScore = 50;
    }

    // 检查上次维护距今时间
    if (lastMaintenanceDate) {
      const daysSinceLastMaintenance =
        (Date.now() - lastMaintenanceDate.getTime()) / (24 * 60 * 60 * 1000);

      if (daysSinceLastMaintenance > 365) {
        // 超过1年未维护
        maintenanceScore -= 20;
        this.logger.warn(
          `设备已超过${Math.round(daysSinceLastMaintenance)}天未维护`,
        );
      } else if (daysSinceLastMaintenance > 180) {
        // 超过6个月未维护
        maintenanceScore -= 10;
      }
    } else {
      // 无维护记录
      maintenanceScore = 40;
    }

    return Math.max(0, Math.min(100, maintenanceScore));
  }

  /**
   * 确定健康等级
   *
   * @param healthIndex 健康指数
   * @returns 健康等级
   */
  private determineHealthGrade(
    healthIndex: number,
  ): HealthIndexResult['grade'] {
    if (healthIndex >= 90) return 'Excellent';
    if (healthIndex >= 75) return 'Good';
    if (healthIndex >= 60) return 'Fair';
    if (healthIndex >= 40) return 'Poor';
    return 'Critical';
  }

  /**
   * 生成维护建议
   *
   * @param healthIndex 综合健康指数
   * @param currentSOH 当前SOH
   * @param trendScore 趋势评分
   * @param alarmScore 告警评分
   * @param maintenanceScore 维护评分
   * @param statistics 设备统计数据
   * @returns 维护建议列表
   */
  private generateRecommendations(
    healthIndex: number,
    currentSOH: number,
    trendScore: number,
    alarmScore: number,
    maintenanceScore: number,
    statistics: EquipmentStatistics,
  ): string[] {
    const recommendations: string[] = [];

    // 根据综合健康指数给出总体建议
    if (healthIndex < 40) {
      recommendations.push('设备健康状态严重，建议立即停机检修');
      recommendations.push('联系专业维修人员进行全面诊断');
    } else if (healthIndex < 60) {
      recommendations.push('设备健康状态较差，建议尽快安排维护');
    } else if (healthIndex < 75) {
      recommendations.push('设备健康状态一般，建议定期监控并计划维护');
    }

    // 根据SOH给出具体建议
    if (currentSOH < 50) {
      recommendations.push('当前健康状态低，检查关键部件是否需要更换');
    } else if (currentSOH < 70) {
      recommendations.push('建议进行预防性维护，避免进一步恶化');
    }

    // 根据趋势评分给出建议
    if (trendScore < 60) {
      recommendations.push('检测到健康状态下降趋势，需密切关注设备运行状况');
      recommendations.push('建议增加巡检频率，及时发现潜在问题');
    }

    // 根据告警评分给出建议
    if (alarmScore < 60) {
      recommendations.push('告警频率较高，建议检查设备运行参数配置');
      recommendations.push('优先处理严重告警，排查根本原因');
    }

    // 根据维护评分给出建议
    if (maintenanceScore < 60) {
      recommendations.push('维护不足，建议制定完善的维护计划');

      if (statistics.lastMaintenanceDate) {
        const daysSinceLastMaintenance =
          (Date.now() - statistics.lastMaintenanceDate.getTime()) /
          (24 * 60 * 60 * 1000);
        if (daysSinceLastMaintenance > 365) {
          recommendations.push(
            `设备已超过${Math.round(daysSinceLastMaintenance / 30)}个月未维护，需尽快安排维护`,
          );
        }
      } else {
        recommendations.push('无维护记录，建议建立设备维护档案');
      }
    }

    // 如果健康状况良好，给出鼓励性建议
    if (healthIndex >= 90) {
      recommendations.push('设备运行状态优秀，继续保持良好的维护习惯');
    } else if (healthIndex >= 75) {
      recommendations.push('设备运行状态良好，按照现有维护计划继续执行');
    }

    return recommendations;
  }

  /**
   * 计算线性回归斜率
   *
   * 用于判断趋势方向
   */
  private calculateLinearRegressionSlope(data: SOHTrendData[]): number {
    const n = data.length;
    if (n < 2) return 0;

    // 将时间转换为数值 (相对于第一个时间点的天数)
    const firstTime = data[0].timestamp.getTime();
    const x = data.map(
      (d) => (d.timestamp.getTime() - firstTime) / (24 * 60 * 60 * 1000),
    );
    const y = data.map((d) => d.sohValue);

    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return isNaN(slope) ? 0 : slope;
  }

  /**
   * 计算最近N个数据点的变化率
   *
   * @param data SOH趋势数据
   * @param count 数据点数量
   * @returns 变化率 (%)
   */
  private calculateRecentChangeRate(
    data: SOHTrendData[],
    count: number,
  ): number {
    if (data.length < 2) return 0;

    const recentData = data.slice(-Math.min(count, data.length));
    if (recentData.length < 2) return 0;

    const firstValue = recentData[0].sohValue;
    const lastValue = recentData[recentData.length - 1].sohValue;

    return ((lastValue - firstValue) / firstValue) * 100;
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
