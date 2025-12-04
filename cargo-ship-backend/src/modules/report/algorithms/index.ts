/**
 * 算法模块导出文件
 *
 * 统一导出所有算法组件，方便其他模块引用
 */

// SOH计算器
export { SOHCalculator } from './soh-calculator';
export type {
  MetricDataPoint,
  SOHResult,
  MetricThreshold,
} from './soh-calculator';

// 健康指数评估器
export { HealthIndexEvaluator } from './health-index-evaluator';
export type {
  HealthIndexResult,
  EquipmentStatistics,
  SOHTrendData,
} from './health-index-evaluator';

// 故障诊断引擎
export { FaultDiagnosticEngine } from './fault-diagnostic-engine';
export type {
  FaultDiagnosisResult,
  AnomalyPoint,
  AlarmHistory,
  FaultPattern,
} from './fault-diagnostic-engine';
