import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  TimeSeriesData,
  MetricType,
} from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import {
  UptimeStats,
  TrendAnalysis,
  RiskLevel,
} from '../../database/entities/health-report.entity';

// 导入新增的算法模块
import {
  SOHCalculator,
  MetricDataPoint,
  SOHResult,
} from './algorithms/soh-calculator';
import {
  HealthIndexEvaluator,
  HealthIndexResult,
  EquipmentStatistics,
  SOHTrendData,
} from './algorithms/health-index-evaluator';
import {
  FaultDiagnosticEngine,
  FaultDiagnosisResult,
  AnomalyPoint,
  AlarmHistory,
} from './algorithms/fault-diagnostic-engine';

/**
 * 健康评估算法服务
 * 基于历史监测数据和告警记录计算设备健康评分
 *
 * 集成三大核心算法：
 * 1. SOH计算器 - 计算设备健康状态
 * 2. 健康指数评估器 - 综合评估设备健康指数
 * 3. 故障诊断引擎 - 故障预测和诊断分析
 */
@Injectable()
export class HealthAssessmentService {
  private readonly logger = new Logger(HealthAssessmentService.name);

  // 算法实例
  private readonly sohCalculator: SOHCalculator;
  private readonly healthIndexEvaluator: HealthIndexEvaluator;
  private readonly faultDiagnosticEngine: FaultDiagnosticEngine;

  constructor(
    @InjectRepository(TimeSeriesData)
    private readonly timeSeriesDataRepository: Repository<TimeSeriesData>,
    @InjectRepository(AlarmRecord)
    private readonly alarmRecordRepository: Repository<AlarmRecord>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {
    // 初始化算法实例
    this.sohCalculator = new SOHCalculator();
    this.healthIndexEvaluator = new HealthIndexEvaluator();
    this.faultDiagnosticEngine = new FaultDiagnosticEngine();
  }

  /**
   * 计算单个设备的健康评分
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns 健康评分（0-100）
   */
  async calculateHealthScore(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    this.logger.debug(
      `开始计算设备 ${equipmentId} 的健康评分，时间范围：${startTime} - ${endTime}`,
    );

    // 1. 获取告警次数和严重程度
    const alarmScore = await this.calculateAlarmScore(
      equipmentId,
      startTime,
      endTime,
    );

    // 2. 计算数据稳定性评分
    const stabilityScore = await this.calculateStabilityScore(
      equipmentId,
      startTime,
      endTime,
    );

    // 3. 计算运行时间评分
    const uptimeScore = await this.calculateUptimeScore(
      equipmentId,
      startTime,
      endTime,
    );

    // 加权计算总评分
    // 告警评分权重40%，稳定性评分权重35%，运行时间评分权重25%
    const totalScore =
      alarmScore * 0.4 + stabilityScore * 0.35 + uptimeScore * 0.25;

    this.logger.debug(
      `设备 ${equipmentId} 健康评分计算完成：总分=${totalScore.toFixed(2)}, 告警=${alarmScore.toFixed(2)}, 稳定性=${stabilityScore.toFixed(2)}, 运行时间=${uptimeScore.toFixed(2)}`,
    );

    return Math.round(totalScore * 100) / 100; // 保留两位小数
  }

  /**
   * 计算告警评分（基于告警次数和严重程度）
   * @param equipmentId 设备ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 告警评分（0-100）
   */
  private async calculateAlarmScore(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 查询时间范围内的告警记录
    const alarms = await this.alarmRecordRepository.find({
      where: {
        equipmentId,
        triggeredAt: Between(startDate, endDate),
      },
    });

    if (alarms.length === 0) {
      return 100; // 无告警，满分
    }

    // 根据告警严重程度计算扣分
    let deduction = 0;
    alarms.forEach((alarm) => {
      switch (alarm.severity) {
        case AlarmSeverity.CRITICAL:
          deduction += 10; // 严重告警扣10分
          break;
        case AlarmSeverity.HIGH:
          deduction += 5; // 高级告警扣5分
          break;
        case AlarmSeverity.MEDIUM:
          deduction += 2; // 中级告警扣2分
          break;
        case AlarmSeverity.LOW:
          deduction += 1; // 低级告警扣1分
          break;
      }
    });

    // 最低0分
    return Math.max(0, 100 - deduction);
  }

  /**
   * 计算数据稳定性评分（基于指标波动情况）
   * @param equipmentId 设备ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 稳定性评分（0-100）
   */
  private async calculateStabilityScore(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 查询关键指标数据（温度、振动、压力等）
    const data = await this.timeSeriesDataRepository.find({
      where: {
        equipmentId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    if (data.length === 0) {
      return 50; // 无数据，给予中等评分
    }

    // 按指标类型分组
    const metricGroups = new Map<string, number[]>();
    data.forEach((item) => {
      const values = metricGroups.get(item.metricType) || [];
      values.push(Number(item.value));
      metricGroups.set(item.metricType, values);
    });

    // 计算每个指标的变异系数（CV = 标准差/均值）
    let totalCV = 0;
    let metricCount = 0;

    metricGroups.forEach((values) => {
      if (values.length < 2) return; // 数据点太少，跳过

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

      totalCV += cv;
      metricCount++;
    });

    if (metricCount === 0) {
      return 50;
    }

    const avgCV = totalCV / metricCount;

    // 变异系数越小，稳定性越高
    // CV < 5%: 100分，CV > 50%: 0分，线性映射
    let score = 100 - avgCV * 2;
    score = Math.max(0, Math.min(100, score));

    return Math.round(score * 100) / 100;
  }

  /**
   * 计算运行时间评分（基于设备运行状态）
   * @param equipmentId 设备ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 运行时间评分（0-100）
   */
  private async calculateUptimeScore(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    const stats = await this.calculateUptimeStats(
      equipmentId,
      startTime,
      endTime,
    );

    // 运行率越高，评分越高
    return Math.round(stats.uptimeRate * 100) / 100;
  }

  /**
   * 计算设备运行时间统计
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns 运行时间统计
   */
  async calculateUptimeStats(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<UptimeStats> {
    const totalDuration = endTime - startTime;

    // 简化实现：基于设备当前状态估算
    // 实际应用中应该从状态变更历史表中计算
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });

    let runningDuration = 0;
    let maintenanceDuration = 0;
    let stoppedDuration = 0;

    if (equipment) {
      // 简化假设：根据当前状态估算整个时间段
      switch (equipment.status) {
        case EquipmentStatus.NORMAL:
          runningDuration = totalDuration * 0.9; // 假设90%时间在运行
          maintenanceDuration = totalDuration * 0.05;
          stoppedDuration = totalDuration * 0.05;
          break;
        case EquipmentStatus.WARNING:
          runningDuration = totalDuration * 0.7;
          maintenanceDuration = totalDuration * 0.2;
          stoppedDuration = totalDuration * 0.1;
          break;
        case EquipmentStatus.FAULT:
          runningDuration = totalDuration * 0.1;
          maintenanceDuration = totalDuration * 0.1;
          stoppedDuration = totalDuration * 0.8;
          break;
        case EquipmentStatus.OFFLINE:
          runningDuration = totalDuration * 0.05;
          maintenanceDuration = totalDuration * 0.05;
          stoppedDuration = totalDuration * 0.9;
          break;
        default:
          runningDuration = totalDuration * 0.5;
          maintenanceDuration = totalDuration * 0.25;
          stoppedDuration = totalDuration * 0.25;
      }
    }

    const uptimeRate =
      totalDuration > 0 ? (runningDuration / totalDuration) * 100 : 0;

    return {
      totalDuration,
      runningDuration: Math.round(runningDuration),
      maintenanceDuration: Math.round(maintenanceDuration),
      stoppedDuration: Math.round(stoppedDuration),
      uptimeRate: Math.round(uptimeRate * 100) / 100,
    };
  }

  /**
   * 统计异常次数
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns 异常次数
   */
  async countAbnormalEvents(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<number> {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    const count = await this.alarmRecordRepository.count({
      where: {
        equipmentId,
        triggeredAt: Between(startDate, endDate),
      },
    });

    return count;
  }

  /**
   * 生成趋势分析
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns 趋势分析
   */
  async generateTrendAnalysis(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<TrendAnalysis> {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 查询温度和振动数据
    const temperatureData = await this.timeSeriesDataRepository.find({
      where: {
        equipmentId,
        metricType: MetricType.TEMPERATURE,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    const vibrationData = await this.timeSeriesDataRepository.find({
      where: {
        equipmentId,
        metricType: MetricType.VIBRATION,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // 分析温度趋势
    const temperatureTrend = this.analyzeTrend(
      temperatureData.map((d) => Number(d.value)),
    );

    // 分析振动趋势
    const vibrationTrend = this.analyzeTrend(
      vibrationData.map((d) => Number(d.value)),
    );

    // 计算总体趋势
    const healthScore = await this.calculateHealthScore(
      equipmentId,
      startTime,
      endTime,
    );
    const overallTrend =
      healthScore >= 75 ? '良好' : healthScore >= 60 ? '一般' : '需要关注';

    // 评估风险等级
    const abnormalCount = await this.countAbnormalEvents(
      equipmentId,
      startTime,
      endTime,
    );
    const riskLevel =
      abnormalCount === 0
        ? RiskLevel.LOW
        : abnormalCount <= 5
          ? RiskLevel.MEDIUM
          : RiskLevel.HIGH;

    // 生成建议
    const suggestions: string[] = [];
    if (temperatureTrend === '上升') {
      suggestions.push('建议检查散热系统是否正常');
    }
    if (vibrationTrend === '上升') {
      suggestions.push('建议检查设备固定装置和轴承状态');
    }
    if (abnormalCount > 5) {
      suggestions.push('近期异常频繁，建议安排全面检修');
    }
    if (healthScore < 60) {
      suggestions.push('设备健康状况不佳，建议尽快进行维护');
    }
    if (suggestions.length === 0) {
      suggestions.push('设备运行正常，继续保持常规维护');
    }

    return {
      temperatureTrend,
      vibrationTrend,
      overallTrend,
      riskLevel,
      suggestions,
    };
  }

  /**
   * 分析数据趋势
   * @param values 数值数组
   * @returns 趋势描述
   */
  private analyzeTrend(values: number[]): string {
    if (values.length < 2) {
      return '数据不足';
    }

    // 简单线性回归计算趋势
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const xMean = xValues.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (values[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // 根据斜率判断趋势
    if (Math.abs(slope) < 0.01) {
      return '稳定';
    } else if (slope > 0.05) {
      return '明显上升';
    } else if (slope > 0) {
      return '略有上升';
    } else if (slope < -0.05) {
      return '明显下降';
    } else {
      return '略有下降';
    }
  }

  // ========== 新增：集成算法模块的方法 ==========

  /**
   * 使用SOH算法计算设备健康状态
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns SOH计算结果
   */
  async calculateSOH(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<SOHResult> {
    this.logger.log(
      `使用SOH算法计算设备 ${equipmentId} 的健康状态，时间范围：${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`,
    );

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 查询时间范围内的监测数据
    const timeSeriesData = await this.timeSeriesDataRepository.find({
      where: {
        equipmentId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // 按指标类型分组数据
    const metricDataMap = new Map<string, MetricDataPoint[]>();

    timeSeriesData.forEach((data) => {
      if (!metricDataMap.has(data.metricType)) {
        metricDataMap.set(data.metricType, []);
      }

      metricDataMap.get(data.metricType)!.push({
        timestamp: data.timestamp,
        value: Number(data.value),
        metricType: data.metricType,
      });
    });

    // 调用SOH计算器
    const sohResult = this.sohCalculator.calculateSOH(metricDataMap);

    this.logger.log(
      `设备 ${equipmentId} SOH计算完成: SOH=${sohResult.soh}%, 置信度=${sohResult.confidence}`,
    );

    return sohResult;
  }

  /**
   * 使用健康指数评估器进行综合健康评估
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns 健康指数评估结果
   */
  async evaluateHealthIndex(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<HealthIndexResult> {
    this.logger.log(`使用健康指数评估器评估设备 ${equipmentId} 的综合健康指数`);

    // 1. 获取当前SOH
    const sohResult = await this.calculateSOH(equipmentId, startTime, endTime);
    const currentSOH = sohResult.soh;

    // 2. 获取SOH历史趋势（最近30天）
    const trendStartTime = endTime - 30 * 24 * 60 * 60 * 1000; // 30天前
    const sohTrend = await this.getSOHTrend(
      equipmentId,
      trendStartTime,
      endTime,
    );

    // 3. 获取设备运行统计数据
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new Error(`设备 ${equipmentId} 不存在`);
    }

    // 计算总运行时长（小时）
    const installationDate = equipment.createdAt;
    const totalRunningHours =
      (Date.now() - installationDate.getTime()) / (1000 * 60 * 60);

    // 获取告警统计
    const allAlarms = await this.alarmRecordRepository.find({
      where: { equipmentId },
    });

    const criticalAlarmCount = allAlarms.filter(
      (a) => a.severity === AlarmSeverity.CRITICAL,
    ).length;
    const warningAlarmCount = allAlarms.filter(
      (a) =>
        a.severity === AlarmSeverity.HIGH ||
        a.severity === AlarmSeverity.MEDIUM,
    ).length;

    const statistics: EquipmentStatistics = {
      totalRunningHours,
      totalAlarmCount: allAlarms.length,
      criticalAlarmCount,
      warningAlarmCount,
      maintenanceCount: 0, // TODO: 从维护记录表获取
      lastMaintenanceDate: undefined, // TODO: 从维护记录表获取
      installationDate,
    };

    // 4. 调用健康指数评估器
    const healthIndexResult = this.healthIndexEvaluator.evaluateHealthIndex(
      currentSOH,
      sohTrend,
      statistics,
    );

    this.logger.log(
      `设备 ${equipmentId} 健康指数评估完成: HI=${healthIndexResult.healthIndex}, 等级=${healthIndexResult.grade}`,
    );

    return healthIndexResult;
  }

  /**
   * 使用故障诊断引擎进行故障预测和诊断
   * @param equipmentId 设备ID
   * @param startTime 开始时间（时间戳，毫秒）
   * @param endTime 结束时间（时间戳，毫秒）
   * @returns 故障诊断结果
   */
  async diagnoseFaults(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<FaultDiagnosisResult> {
    this.logger.log(`使用故障诊断引擎诊断设备 ${equipmentId} 的潜在故障`);

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 1. 检测异常点
    const anomalies = await this.detectAnomalies(
      equipmentId,
      startTime,
      endTime,
    );

    // 2. 获取告警历史
    const alarms = await this.alarmRecordRepository.find({
      where: {
        equipmentId,
        triggeredAt: Between(startDate, endDate),
      },
      order: { triggeredAt: 'DESC' },
    });

    const alarmHistory: AlarmHistory[] = alarms.map((alarm) => ({
      id: alarm.id,
      timestamp: alarm.triggeredAt,
      alarmType: 'THRESHOLD_EXCEEDED', // 基于实体结构推断
      severity:
        alarm.severity === AlarmSeverity.CRITICAL
          ? 'critical'
          : alarm.severity === AlarmSeverity.HIGH ||
              alarm.severity === AlarmSeverity.MEDIUM
            ? 'warning'
            : 'info',
      metricType: alarm.abnormalMetricType || 'UNKNOWN',
      metricValue: Number(alarm.abnormalValue) || 0,
      thresholdValue: 0, // 阈值信息需要从thresholdRange解析
      description: alarm.thresholdRange || '',
    }));

    // 3. 获取当前SOH
    const sohResult = await this.calculateSOH(equipmentId, startTime, endTime);

    // 4. 调用故障诊断引擎
    const faultDiagnosisResult = this.faultDiagnosticEngine.diagnoseFaults(
      anomalies,
      alarmHistory,
      sohResult.soh,
    );

    this.logger.log(
      `设备 ${equipmentId} 故障诊断完成: 概率=${faultDiagnosisResult.faultProbability}%, 风险=${faultDiagnosisResult.faultRiskLevel}`,
    );

    return faultDiagnosisResult;
  }

  /**
   * 获取SOH历史趋势数据
   * @param equipmentId 设备ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns SOH趋势数据
   */
  private async getSOHTrend(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<SOHTrendData[]> {
    // 将时间段分成多个小段，计算每段的SOH
    const dayMs = 24 * 60 * 60 * 1000;
    const segments = Math.floor((endTime - startTime) / dayMs);
    const sohTrend: SOHTrendData[] = [];

    // 最多采样30个点
    const sampleInterval = Math.max(1, Math.floor(segments / 30));

    for (let i = 0; i < segments; i += sampleInterval) {
      const segmentStart = startTime + i * dayMs;
      const segmentEnd = Math.min(segmentStart + dayMs, endTime);

      try {
        const sohResult = await this.calculateSOH(
          equipmentId,
          segmentStart,
          segmentEnd,
        );

        sohTrend.push({
          timestamp: new Date(segmentStart),
          sohValue: sohResult.soh,
        });
      } catch {
        // 跳过计算失败的数据点
        this.logger.warn(
          `计算SOH趋势失败，时间段：${new Date(segmentStart).toISOString()}`,
        );
      }
    }

    return sohTrend;
  }

  /**
   * 检测异常数据点
   * @param equipmentId 设备ID
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @returns 异常点列表
   */
  private async detectAnomalies(
    equipmentId: string,
    startTime: number,
    endTime: number,
  ): Promise<AnomalyPoint[]> {
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    // 查询监测数据
    const timeSeriesData = await this.timeSeriesDataRepository.find({
      where: {
        equipmentId,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });

    // 按指标类型分组
    const dataByMetric = new Map<string, TimeSeriesData[]>();
    timeSeriesData.forEach((data) => {
      if (!dataByMetric.has(data.metricType)) {
        dataByMetric.set(data.metricType, []);
      }
      dataByMetric.get(data.metricType)!.push(data);
    });

    const anomalies: AnomalyPoint[] = [];

    // 对每个指标进行异常检测
    for (const [, dataPoints] of dataByMetric.entries()) {
      if (dataPoints.length < 3) continue; // 数据点太少，跳过

      // 计算平均值和标准差
      const values = dataPoints.map((d) => Number(d.value));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length;
      const stdDev = Math.sqrt(variance);

      // 使用3-sigma规则检测异常
      dataPoints.forEach((data) => {
        const value = Number(data.value);
        const deviation = Math.abs(value - mean);
        const deviationPercent = (deviation / mean) * 100;

        let severity: AnomalyPoint['severity'] = 'low';

        if (deviation > 3 * stdDev) {
          severity = 'critical';
        } else if (deviation > 2 * stdDev) {
          severity = 'high';
        } else if (deviation > 1.5 * stdDev) {
          severity = 'medium';
        }

        // 只记录中等及以上的异常
        if (severity !== 'low') {
          anomalies.push({
            timestamp: data.timestamp,
            metricType: data.metricType,
            value,
            expectedValue: mean,
            deviationPercent,
            severity,
          });
        }
      });
    }

    this.logger.debug(
      `设备 ${equipmentId} 检测到 ${anomalies.length} 个异常数据点`,
    );

    return anomalies;
  }
}
