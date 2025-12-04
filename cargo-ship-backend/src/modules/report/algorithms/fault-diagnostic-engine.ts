/**
 * 故障诊断算法
 *
 * 基于监测数据的异常模式分析，提供设备故障预测和诊断
 * 主要功能：
 * - 异常模式识别
 * - 故障类型判断
 * - 故障原因分析
 * - 故障预测评分
 * - 处理建议生成
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * 监测数据异常点接口
 */
export interface AnomalyPoint {
  timestamp: Date;
  metricType: string;
  value: number;
  expectedValue: number; // 期望值（基于历史数据）
  deviationPercent: number; // 偏差百分比
  severity: 'low' | 'medium' | 'high' | 'critical'; // 异常严重程度
}

/**
 * 告警历史记录接口
 */
export interface AlarmHistory {
  id: string;
  timestamp: Date;
  alarmType: string;
  severity: 'info' | 'warning' | 'critical';
  metricType: string;
  metricValue: number;
  thresholdValue: number;
  description: string;
}

/**
 * 故障模式接口
 */
export interface FaultPattern {
  patternType: string; // 故障模式类型
  confidence: number; // 置信度 (0-1)
  affectedMetrics: string[]; // 受影响的指标
  description: string; // 模式描述
}

/**
 * 故障诊断结果接口
 */
export interface FaultDiagnosisResult {
  faultProbability: number; // 故障概率 (0-100)
  faultRiskLevel: 'low' | 'medium' | 'high' | 'critical'; // 风险等级
  detectedPatterns: FaultPattern[]; // 检测到的故障模式
  suspectedFaults: {
    faultType: string; // 故障类型
    probability: number; // 概率
    rootCauses: string[]; // 可能的根本原因
    evidences: string[]; // 证据
  }[];
  recommendations: {
    priority: 'immediate' | 'urgent' | 'normal' | 'low'; // 优先级
    action: string; // 建议措施
    reason: string; // 原因说明
  }[];
  predictedFailureTime?: Date; // 预测故障时间（如果可预测）
  diagnosedAt: Date;
}

/**
 * 故障诊断器服务
 */
@Injectable()
export class FaultDiagnosticEngine {
  private readonly logger = new Logger(FaultDiagnosticEngine.name);

  // 故障模式知识库
  private readonly faultPatterns = {
    // 轴承故障模式
    bearingFault: {
      name: '轴承故障',
      indicators: ['vibration', 'temperature'],
      thresholds: { vibration: 7.0, temperature: 90 },
      symptoms: ['振动异常增加', '温度持续升高', '异常噪音'],
    },
    // 润滑不足模式
    lubricationFailure: {
      name: '润滑不足',
      indicators: ['temperature', 'vibration', 'pressure'],
      thresholds: { temperature: 95, vibration: 5.0, pressure: 0.3 },
      symptoms: ['温度异常升高', '压力下降', '振动增加'],
    },
    // 不平衡模式
    imbalance: {
      name: '转子不平衡',
      indicators: ['vibration', 'speed'],
      thresholds: { vibration: 6.0 },
      symptoms: ['周期性振动', '特定频率振动增强'],
    },
    // 电气故障模式
    electricalFault: {
      name: '电气系统故障',
      indicators: ['current', 'voltage', 'power'],
      thresholds: { current: 120, voltage: 420 },
      symptoms: ['电流波动', '电压不稳', '功率异常'],
    },
    // 过载模式
    overload: {
      name: '设备过载',
      indicators: ['current', 'temperature', 'speed'],
      thresholds: { current: 130, temperature: 100, speed: 1800 },
      symptoms: ['电流过高', '温度升高', '转速异常'],
    },
    // 磨损退化模式
    wearDegradation: {
      name: '磨损退化',
      indicators: ['vibration', 'temperature'],
      thresholds: { vibration: 5.5, temperature: 85 },
      symptoms: ['逐渐增加的振动', '效率下降', '噪音增加'],
    },
  };

  /**
   * 执行故障诊断
   *
   * @param anomalies 检测到的异常点
   * @param alarmHistory 告警历史记录
   * @param currentSOH 当前SOH值
   * @returns 故障诊断结果
   */
  diagnoseFaults(
    anomalies: AnomalyPoint[],
    alarmHistory: AlarmHistory[],
    currentSOH: number,
  ): FaultDiagnosisResult {
    this.logger.log(
      `开始故障诊断: 异常点=${anomalies.length}, 告警历史=${alarmHistory.length}, SOH=${currentSOH}`,
    );

    // 1. 检测故障模式
    const detectedPatterns = this.detectFaultPatterns(anomalies, alarmHistory);

    // 2. 计算故障概率
    const faultProbability = this.calculateFaultProbability(
      anomalies,
      alarmHistory,
      currentSOH,
      detectedPatterns,
    );

    // 3. 确定风险等级
    const faultRiskLevel = this.determineFaultRiskLevel(faultProbability);

    // 4. 识别可能的故障类型
    const suspectedFaults = this.identifySuspectedFaults(
      detectedPatterns,
      anomalies,
      alarmHistory,
    );

    // 5. 生成处理建议
    const recommendations = this.generateRecommendations(
      faultRiskLevel,
      suspectedFaults,
      currentSOH,
    );

    // 6. 预测故障时间（如果适用）
    const predictedFailureTime = this.predictFailureTime(
      faultProbability,
      anomalies,
      currentSOH,
    );

    const result: FaultDiagnosisResult = {
      faultProbability: Math.round(faultProbability * 100) / 100,
      faultRiskLevel,
      detectedPatterns,
      suspectedFaults,
      recommendations,
      predictedFailureTime,
      diagnosedAt: new Date(),
    };

    this.logger.log(
      `故障诊断完成: 概率=${result.faultProbability}%, 风险=${result.faultRiskLevel}, 模式=${detectedPatterns.length}`,
    );

    return result;
  }

  /**
   * 检测故障模式
   *
   * 分析异常和告警，识别已知的故障模式
   */
  private detectFaultPatterns(
    anomalies: AnomalyPoint[],
    alarmHistory: AlarmHistory[],
  ): FaultPattern[] {
    const patterns: FaultPattern[] = [];

    // 按指标类型分组异常
    const anomalyByMetric = this.groupByMetric(anomalies);
    const alarmByMetric = this.groupAlarmsByMetric(alarmHistory);

    // 检查轴承故障模式
    if (
      this.hasHighAnomalies(anomalyByMetric, 'vibration', 2) &&
      this.hasHighAnomalies(anomalyByMetric, 'temperature', 2)
    ) {
      patterns.push({
        patternType: 'bearingFault',
        confidence: this.calculatePatternConfidence(
          anomalyByMetric,
          ['vibration', 'temperature'],
          alarmByMetric,
        ),
        affectedMetrics: ['vibration', 'temperature'],
        description: '检测到轴承故障特征：振动和温度同时异常',
      });
    }

    // 检查润滑不足模式
    if (
      this.hasHighAnomalies(anomalyByMetric, 'temperature', 3) &&
      this.hasLowAnomalies(anomalyByMetric, 'pressure', 2)
    ) {
      patterns.push({
        patternType: 'lubricationFailure',
        confidence: this.calculatePatternConfidence(
          anomalyByMetric,
          ['temperature', 'pressure'],
          alarmByMetric,
        ),
        affectedMetrics: ['temperature', 'pressure', 'vibration'],
        description: '检测到润滑不足特征：温度升高且压力下降',
      });
    }

    // 检查转子不平衡模式
    if (this.hasPeriodicAnomalies(anomalyByMetric, 'vibration')) {
      patterns.push({
        patternType: 'imbalance',
        confidence: 0.7,
        affectedMetrics: ['vibration', 'speed'],
        description: '检测到转子不平衡特征：周期性振动异常',
      });
    }

    // 检查电气故障模式
    if (
      this.hasHighAnomalies(anomalyByMetric, 'current', 2) ||
      this.hasHighAnomalies(anomalyByMetric, 'voltage', 2)
    ) {
      patterns.push({
        patternType: 'electricalFault',
        confidence: this.calculatePatternConfidence(
          anomalyByMetric,
          ['current', 'voltage'],
          alarmByMetric,
        ),
        affectedMetrics: ['current', 'voltage', 'power'],
        description: '检测到电气故障特征：电流或电压异常',
      });
    }

    // 检查过载模式
    if (
      this.hasHighAnomalies(anomalyByMetric, 'current', 3) &&
      this.hasHighAnomalies(anomalyByMetric, 'temperature', 2)
    ) {
      patterns.push({
        patternType: 'overload',
        confidence: this.calculatePatternConfidence(
          anomalyByMetric,
          ['current', 'temperature'],
          alarmByMetric,
        ),
        affectedMetrics: ['current', 'temperature', 'speed'],
        description: '检测到过载特征：电流和温度持续过高',
      });
    }

    // 检查磨损退化模式（基于趋势分析）
    if (this.hasGradualIncrease(anomalyByMetric, 'vibration')) {
      patterns.push({
        patternType: 'wearDegradation',
        confidence: 0.65,
        affectedMetrics: ['vibration', 'temperature'],
        description: '检测到磨损退化特征：振动逐渐增加',
      });
    }

    return patterns;
  }

  /**
   * 计算故障概率
   *
   * 综合考虑异常、告警、SOH和故障模式
   */
  private calculateFaultProbability(
    anomalies: AnomalyPoint[],
    alarmHistory: AlarmHistory[],
    currentSOH: number,
    patterns: FaultPattern[],
  ): number {
    let probability = 0;

    // 基于SOH的基础概率
    if (currentSOH < 40) {
      probability += 50;
    } else if (currentSOH < 60) {
      probability += 30;
    } else if (currentSOH < 80) {
      probability += 10;
    }

    // 基于异常严重程度
    const criticalAnomalies = anomalies.filter(
      (a) => a.severity === 'critical',
    ).length;
    const highAnomalies = anomalies.filter((a) => a.severity === 'high').length;

    probability += criticalAnomalies * 5;
    probability += highAnomalies * 2;

    // 基于最近告警频率
    const recentAlarms = this.getRecentAlarms(alarmHistory, 7); // 最近7天
    const criticalAlarms = recentAlarms.filter(
      (a) => a.severity === 'critical',
    ).length;

    probability += Math.min(criticalAlarms * 3, 20);

    // 基于检测到的故障模式
    if (patterns.length > 0) {
      const maxConfidence = Math.max(...patterns.map((p) => p.confidence));
      probability += maxConfidence * 20;
    }

    return Math.min(100, probability);
  }

  /**
   * 确定故障风险等级
   */
  private determineFaultRiskLevel(
    probability: number,
  ): FaultDiagnosisResult['faultRiskLevel'] {
    if (probability >= 80) return 'critical';
    if (probability >= 60) return 'high';
    if (probability >= 30) return 'medium';
    return 'low';
  }

  /**
   * 识别可能的故障类型
   */
  private identifySuspectedFaults(
    patterns: FaultPattern[],
    anomalies: AnomalyPoint[],
    alarmHistory: AlarmHistory[],
  ): FaultDiagnosisResult['suspectedFaults'] {
    const faults: FaultDiagnosisResult['suspectedFaults'] = [];

    for (const pattern of patterns) {
      const faultInfo = this.faultPatterns[pattern.patternType];
      if (!faultInfo) continue;

      const evidences: string[] = [];
      const rootCauses: string[] = [];

      // 收集证据
      for (const metric of pattern.affectedMetrics) {
        const metricAnomalies = anomalies.filter(
          (a) => a.metricType === metric,
        );
        if (metricAnomalies.length > 0) {
          evidences.push(`${metric}指标出现${metricAnomalies.length}次异常`);
        }
      }

      const recentAlarms = this.getRecentAlarms(alarmHistory, 30);
      const relatedAlarms = recentAlarms.filter((a) =>
        pattern.affectedMetrics.includes(a.metricType),
      );
      if (relatedAlarms.length > 0) {
        evidences.push(`最近30天内触发${relatedAlarms.length}次相关告警`);
      }

      // 根据故障类型推断根本原因
      switch (pattern.patternType) {
        case 'bearingFault':
          rootCauses.push('轴承磨损或损坏', '轴承润滑不良', '轴承安装不当');
          break;
        case 'lubricationFailure':
          rootCauses.push('润滑油不足', '润滑油变质', '润滑系统故障');
          break;
        case 'imbalance':
          rootCauses.push('转子不平衡', '叶片损坏', '安装偏差');
          break;
        case 'electricalFault':
          rootCauses.push('电气连接松动', '绝缘老化', '控制系统故障');
          break;
        case 'overload':
          rootCauses.push('负载过大', '冷却系统不足', '运行参数设置不当');
          break;
        case 'wearDegradation':
          rootCauses.push('正常磨损老化', '运行环境恶劣', '维护不及时');
          break;
      }

      faults.push({
        faultType: faultInfo.name,
        probability: pattern.confidence * 100,
        rootCauses,
        evidences,
      });
    }

    // 按概率排序
    return faults.sort((a, b) => b.probability - a.probability);
  }

  /**
   * 生成处理建议
   */
  private generateRecommendations(
    riskLevel: FaultDiagnosisResult['faultRiskLevel'],
    suspectedFaults: FaultDiagnosisResult['suspectedFaults'],
    currentSOH: number,
  ): FaultDiagnosisResult['recommendations'] {
    const recommendations: FaultDiagnosisResult['recommendations'] = [];

    // 根据风险等级给出紧急程度建议
    if (riskLevel === 'critical') {
      recommendations.push({
        priority: 'immediate',
        action: '立即停机检查，避免设备进一步损坏',
        reason: '故障风险极高，继续运行可能导致严重后果',
      });

      recommendations.push({
        priority: 'immediate',
        action: '联系专业维修人员进行紧急诊断',
        reason: '需要专业技术人员进行详细检查和维修',
      });
    } else if (riskLevel === 'high') {
      recommendations.push({
        priority: 'urgent',
        action: '尽快安排停机维护窗口期',
        reason: '故障风险较高，建议在72小时内完成检修',
      });
    } else if (riskLevel === 'medium') {
      recommendations.push({
        priority: 'normal',
        action: '计划在下次维护周期进行详细检查',
        reason: '存在潜在故障风险，建议在2周内安排检查',
      });
    }

    // 根据具体故障类型给出针对性建议
    for (const fault of suspectedFaults.slice(0, 3)) {
      // 最多3个
      if (fault.faultType.includes('轴承')) {
        recommendations.push({
          priority: riskLevel === 'critical' ? 'immediate' : 'urgent',
          action: '检查并更换轴承，确保润滑充足',
          reason: `检测到轴承故障特征（概率${fault.probability.toFixed(1)}%）`,
        });
      } else if (fault.faultType.includes('润滑')) {
        recommendations.push({
          priority: 'urgent',
          action: '检查润滑系统，补充或更换润滑油',
          reason: `检测到润滑不足特征（概率${fault.probability.toFixed(1)}%）`,
        });
      } else if (fault.faultType.includes('不平衡')) {
        recommendations.push({
          priority: 'normal',
          action: '进行动平衡校正，检查转子部件',
          reason: `检测到不平衡特征（概率${fault.probability.toFixed(1)}%）`,
        });
      } else if (fault.faultType.includes('电气')) {
        recommendations.push({
          priority: 'urgent',
          action: '检查电气系统，测试绝缘和连接',
          reason: `检测到电气故障特征（概率${fault.probability.toFixed(1)}%）`,
        });
      } else if (fault.faultType.includes('过载')) {
        recommendations.push({
          priority: 'normal',
          action: '检查负载情况，优化运行参数',
          reason: `检测到过载特征（概率${fault.probability.toFixed(1)}%）`,
        });
      }
    }

    // 根据SOH给出维护建议
    if (currentSOH < 50) {
      recommendations.push({
        priority: 'urgent',
        action: '进行全面的健康评估和系统检查',
        reason: `当前健康状态仅为${currentSOH}%，需要全面检修`,
      });
    }

    // 通用建议
    recommendations.push({
      priority: 'low',
      action: '增加监测频率，建立趋势分析',
      reason: '持续监控可以提前发现问题，避免突发故障',
    });

    return recommendations;
  }

  /**
   * 预测故障时间
   *
   * 基于故障概率和当前趋势预测可能的故障时间
   */
  private predictFailureTime(
    faultProbability: number,
    anomalies: AnomalyPoint[],
    currentSOH: number,
  ): Date | undefined {
    if (faultProbability < 30) {
      return undefined; // 概率太低，无法预测
    }

    // 简化的线性预测模型
    // 假设故障概率从当前值线性增长到100%
    const remainingProbability = 100 - faultProbability;

    // 估算恶化速率（基于异常频率）
    let deteriorationRate = 1; // 默认每天1%

    if (anomalies.length > 0) {
      // 计算最近异常的频率
      const recentAnomalies = anomalies.filter((a) => {
        const daysSince =
          (Date.now() - a.timestamp.getTime()) / (24 * 60 * 60 * 1000);
        return daysSince <= 7;
      });

      if (recentAnomalies.length > 5) {
        deteriorationRate = 3; // 快速恶化
      } else if (recentAnomalies.length > 2) {
        deteriorationRate = 2; // 中速恶化
      }
    }

    // 根据SOH调整恶化速率
    if (currentSOH < 40) {
      deteriorationRate *= 1.5;
    } else if (currentSOH < 60) {
      deteriorationRate *= 1.2;
    }

    // 计算预测天数
    const daysToFailure = Math.ceil(remainingProbability / deteriorationRate);

    // 返回预测时间
    const predictedTime = new Date();
    predictedTime.setDate(predictedTime.getDate() + daysToFailure);

    this.logger.log(
      `预测故障时间: ${daysToFailure}天后 (${predictedTime.toLocaleDateString()})`,
    );

    return predictedTime;
  }

  // ========== 辅助方法 ==========

  /**
   * 按指标类型分组异常
   */
  private groupByMetric(
    anomalies: AnomalyPoint[],
  ): Map<string, AnomalyPoint[]> {
    const grouped = new Map<string, AnomalyPoint[]>();
    for (const anomaly of anomalies) {
      if (!grouped.has(anomaly.metricType)) {
        grouped.set(anomaly.metricType, []);
      }
      grouped.get(anomaly.metricType)!.push(anomaly);
    }
    return grouped;
  }

  /**
   * 按指标类型分组告警
   */
  private groupAlarmsByMetric(
    alarms: AlarmHistory[],
  ): Map<string, AlarmHistory[]> {
    const grouped = new Map<string, AlarmHistory[]>();
    for (const alarm of alarms) {
      if (!grouped.has(alarm.metricType)) {
        grouped.set(alarm.metricType, []);
      }
      grouped.get(alarm.metricType)!.push(alarm);
    }
    return grouped;
  }

  /**
   * 检查是否有高值异常
   */
  private hasHighAnomalies(
    anomalyMap: Map<string, AnomalyPoint[]>,
    metric: string,
    minCount: number,
  ): boolean {
    const anomalies = anomalyMap.get(metric) || [];
    const highAnomalies = anomalies.filter(
      (a) => a.severity === 'high' || a.severity === 'critical',
    );
    return highAnomalies.length >= minCount;
  }

  /**
   * 检查是否有低值异常
   */
  private hasLowAnomalies(
    anomalyMap: Map<string, AnomalyPoint[]>,
    metric: string,
    minCount: number,
  ): boolean {
    const anomalies = anomalyMap.get(metric) || [];
    const lowAnomalies = anomalies.filter((a) => a.value < a.expectedValue);
    return lowAnomalies.length >= minCount;
  }

  /**
   * 检查是否有周期性异常
   */
  private hasPeriodicAnomalies(
    anomalyMap: Map<string, AnomalyPoint[]>,
    metric: string,
  ): boolean {
    const anomalies = anomalyMap.get(metric) || [];
    if (anomalies.length < 3) return false;

    // 简化的周期性检测：检查时间间隔是否相对均匀
    const sorted = [...anomalies].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const interval =
        sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
      intervals.push(interval);
    }

    if (intervals.length < 2) return false;

    // 计算间隔的变异系数
    const avgInterval =
      intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) /
      intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avgInterval;

    // 如果变异系数小于0.3，认为是周期性的
    return cv < 0.3;
  }

  /**
   * 检查是否有渐进式增加趋势
   */
  private hasGradualIncrease(
    anomalyMap: Map<string, AnomalyPoint[]>,
    metric: string,
  ): boolean {
    const anomalies = anomalyMap.get(metric) || [];
    if (anomalies.length < 3) return false;

    const sorted = [...anomalies].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    // 检查是否大部分数据点呈递增趋势
    let increaseCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value > sorted[i - 1].value) {
        increaseCount++;
      }
    }

    return increaseCount / (sorted.length - 1) > 0.7; // 70%以上递增
  }

  /**
   * 计算模式置信度
   */
  private calculatePatternConfidence(
    anomalyMap: Map<string, AnomalyPoint[]>,
    metrics: string[],
    alarmMap: Map<string, AlarmHistory[]>,
  ): number {
    let confidence = 0.5; // 基础置信度

    // 根据异常数量增加置信度
    for (const metric of metrics) {
      const anomalies = anomalyMap.get(metric) || [];
      if (anomalies.length > 0) {
        confidence += 0.1;
      }
      if (anomalies.length > 3) {
        confidence += 0.1;
      }
    }

    // 根据告警历史增加置信度
    for (const metric of metrics) {
      const alarms = alarmMap.get(metric) || [];
      const criticalAlarms = alarms.filter((a) => a.severity === 'critical');
      if (criticalAlarms.length > 0) {
        confidence += 0.15;
      }
    }

    return Math.min(1.0, confidence);
  }

  /**
   * 获取最近N天的告警
   */
  private getRecentAlarms(
    alarms: AlarmHistory[],
    days: number,
  ): AlarmHistory[] {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    return alarms.filter((a) => a.timestamp.getTime() >= cutoffTime);
  }
}
