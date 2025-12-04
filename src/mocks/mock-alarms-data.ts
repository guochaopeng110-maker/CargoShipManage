/**
 * 货船智能机舱管理系统 - 告警Mock数据
 * 
 * 基于参考文档 data-uniform.md 中的设备列表和告警阈值规格
 * 提供各种类型的告警模拟数据，支持不同严重程度和状态
 * 
 * @version 1.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-04
 */

import { 
  Alarm, 
  AlarmStatistics, 
  AlertSeverity, 
  AlarmStatus,
  AlarmFilters,
  AlarmPaginatedResponse
} from '../types/alarms';

/**
 * 设备列表 - 基于参考文档
 */
const EQUIPMENT_LIST = [
  // 电池系统
  { id: 'BATT-001', name: '1#电池组', type: '电池系统' },
  { id: 'BATT-002', name: '2#电池组', type: '电池系统' },
  
  // 推进系统
  { id: 'MOTOR-L-001', name: '左推进电机', type: '推进电机' },
  { id: 'MOTOR-R-001', name: '右推进电机', type: '推进电机' },
  { id: 'INV-L-001', name: '左推进逆变器', type: '推进逆变器' },
  { id: 'INV-R-001', name: '右推进逆变器', type: '推进逆变器' },
  
  // 配电系统
  { id: 'DC-BOARD-001', name: '主直流配电板', type: '直流配电板' },
  { id: 'INV-AC-001', name: '1#日用逆变器', type: '日用逆变器' },
  { id: 'INV-AC-002', name: '2#日用逆变器', type: '日用逆变器' },
  
  // 辅助系统
  { id: 'PUMP-COOL-001', name: '1#冷却水泵', type: '冷却水泵' },
  { id: 'PUMP-COOL-002', name: '2#冷却水泵', type: '冷却水泵' },
  { id: 'WELL-001', name: '1#集水井', type: '舱底水井' },
  { id: 'WELL-002', name: '2#集水井', type: '舱底水井' },
  { id: 'WELL-003', name: '3#集水井', type: '舱底水井' },
  { id: 'WELL-004', name: '4#集水井', type: '舱底水井' },
];

/**
 * 告警消息模板
 */
const ALARM_MESSAGES = {
  // 电池系统告警
  'battery_voltage_high': '电池组总电压过高',
  'battery_voltage_low': '电池组总电压过低',
  'battery_temp_high': '电池温度过高',
  'battery_temp_low': '电池温度过低',
  'battery_current_high': '充放电电流过大',
  'battery_soc_low': '电池组SOC低电量',
  
  // 推进电机告警
  'motor_speed_high': '推进电机超速',
  'motor_bearing_temp_high': '电机轴承温度过高',
  'motor_stator_temp_high': '电机定子绕组温度过高',
  
  // 推进逆变器告警
  'inverter_voltage_high': '逆变器输入电压过高',
  'inverter_voltage_low': '逆变器输入电压过低',
  'inverter_current_high': '逆变器输出电流过大',
  'inverter_temp_high': '逆变器温度过高',
  
  // 直流配电板告警
  'board_voltage_high': '母排电压过高',
  'board_voltage_low': '母排电压过低',
  'board_current_high': '母排电流过大',
  
  // 日用逆变器告警
  'ac_inverter_dc_voltage_high': '直流输入电压过高',
  'ac_inverter_dc_voltage_low': '直流输入电压过低',
  'ac_inverter_current_high': '输出交流电流过大',
  'ac_inverter_temp_high': '电抗器温度过高',
  
  // 冷却水泵告警
  'pump_temp_high': '冷却水温度过高',
  'pump_pressure_low': '冷却水压力过低',
  
  // 舱底水井告警
  'well_level_high': '水位过高',
};

/**
 * 指标类型映射
 */
const METRIC_TYPES = {
  voltage: '电压',
  temperature: '温度',
  current: '电流',
  speed: '转速',
  power: '功率',
  pressure: '压力',
};

/**
 * 生成随机ID
 */
function generateId(): string {
  return `alarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成随机时间戳（最近7天内）
 */
function generateRandomTimestamp(daysBack: number = 7): number {
  const now = Date.now();
  const daysAgo = now - (daysBack * 24 * 60 * 60 * 1000);
  return Math.floor(Math.random() * (now - daysAgo) + daysAgo);
}

/**
 * 生成随机严重程度
 */
function generateRandomSeverity(): AlertSeverity {
  const severities = [AlertSeverity.LOW, AlertSeverity.MEDIUM, AlertSeverity.HIGH, AlertSeverity.CRITICAL];
  // 加权随机，使低级别告警更多
  const weights = [0.4, 0.3, 0.2, 0.1];
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < severities.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return severities[i];
    }
  }
  
  return AlertSeverity.LOW;
}

/**
 * 生成随机状态
 */
function generateRandomStatus(): AlarmStatus {
  const statuses = [AlarmStatus.PENDING, AlarmStatus.PROCESSING, AlarmStatus.RESOLVED, AlarmStatus.IGNORED];
  // 加权随机，使待处理告警更多
  const weights = [0.5, 0.2, 0.2, 0.1];
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return statuses[i];
    }
  }
  
  return AlarmStatus.PENDING;
}

/**
 * 根据设备类型生成告警消息
 */
function generateAlarmMessage(equipmentType: string, metricType: string, severity: AlertSeverity): string {
  const key = `${equipmentType}_${metricType}_${severity === AlertSeverity.LOW || severity === AlertSeverity.MEDIUM ? 'high' : 'high'}`;
  
  // 查找匹配的消息模板
  for (const [templateKey, message] of Object.entries(ALARM_MESSAGES)) {
    if (templateKey.includes(equipmentType.toLowerCase()) && templateKey.includes(metricType)) {
      return message;
    }
  }
  
  // 默认消息
  return `${equipmentType}${(METRIC_TYPES as any)[metricType] || metricType}异常`;
}

/**
 * 生成单个告警
 */
export function generateMockAlarm(overrides?: Partial<Alarm>): Alarm {
  const equipment = EQUIPMENT_LIST[Math.floor(Math.random() * EQUIPMENT_LIST.length)];
  const metricType = Object.keys(METRIC_TYPES)[Math.floor(Math.random() * Object.keys(METRIC_TYPES).length)];
  const severity = overrides?.severity || generateRandomSeverity();
  const status = overrides?.status || generateRandomStatus();
  const triggeredAt = overrides?.triggeredAt || generateRandomTimestamp();
  const createdAt = overrides?.createdAt || triggeredAt;
  
  // 生成阈值和值
  let threshold: string;
  let value: number;
  
  switch (metricType) {
    case 'voltage':
      threshold = '600-700V';
      value = Math.floor(Math.random() * 200) + 600;
      break;
    case 'temperature':
      threshold = '20-80°C';
      value = Math.floor(Math.random() * 60) + 20;
      break;
    case 'current':
      threshold = '0-500A';
      value = Math.floor(Math.random() * 500);
      break;
    case 'speed':
      threshold = '0-1650rpm';
      value = Math.floor(Math.random() * 1650);
      break;
    case 'power':
      threshold = '0-650kW';
      value = Math.floor(Math.random() * 650);
      break;
    case 'pressure':
      threshold = '0.1-0.5MPa';
      value = Number((Math.random() * 0.4 + 0.1).toFixed(2));
      break;
    default:
      threshold = 'N/A';
      value = 0;
  }
  
  const alarm: Alarm = {
    id: generateId(),
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    metricType,
    value,
    threshold,
    triggeredAt,
    severity,
    status,
    message: overrides?.message || generateAlarmMessage(equipment.type, metricType, severity),
    handler: status !== AlarmStatus.PENDING ? '系统操作员' : undefined,
    handledAt: status !== AlarmStatus.PENDING ? triggeredAt + Math.random() * 3600000 : undefined,
    handlerNote: status !== AlarmStatus.PENDING ? '已处理告警' : undefined,
    createdAt,
    lastModified: overrides?.lastModified || (status !== AlarmStatus.PENDING ? triggeredAt + Math.random() * 3600000 : createdAt),
    ...overrides
  };
  
  return alarm;
}

/**
 * 生成告警列表
 */
export function generateMockAlarms(count: number, filters?: AlarmFilters): Alarm[] {
  const alarms: Alarm[] = [];
  
  for (let i = 0; i < count; i++) {
    let alarm = generateMockAlarm();
    
    // 应用筛选条件
    if (filters) {
      if (filters.deviceId && !alarm.equipmentId.includes(filters.deviceId)) {
        continue;
      }
      
      if (filters.severity && filters.severity.length > 0 && !filters.severity.includes(alarm.severity)) {
        continue;
      }
      
      if (filters.status && filters.status.length > 0 && !filters.status.includes(alarm.status)) {
        continue;
      }
      
      if (filters.startTime && alarm.triggeredAt < filters.startTime) {
        continue;
      }
      
      if (filters.endTime && alarm.triggeredAt > filters.endTime) {
        continue;
      }
    }
    
    alarms.push(alarm);
  }
  
  // 按触发时间降序排序
  return alarms.sort((a, b) => b.triggeredAt - a.triggeredAt);
}

/**
 * 生成特定设备的告警
 */
export function generateMockAlarmsForDevice(equipmentId: string, count: number): Alarm[] {
  const equipment = EQUIPMENT_LIST.find(eq => eq.id === equipmentId);
  if (!equipment) {
    return [];
  }
  
  const alarms: Alarm[] = [];
  for (let i = 0; i < count; i++) {
    alarms.push(generateMockAlarm({
      equipmentId,
      equipmentName: equipment.name
    }));
  }
  
  return alarms.sort((a, b) => b.triggeredAt - a.triggeredAt);
}

/**
 * 生成特定严重程度的告警
 */
export function generateMockAlarmsBySeverity(severity: AlertSeverity, count: number): Alarm[] {
  const alarms: Alarm[] = [];
  for (let i = 0; i < count; i++) {
    alarms.push(generateMockAlarm({ severity }));
  }
  
  return alarms.sort((a, b) => b.triggeredAt - a.triggeredAt);
}

/**
 * 生成时间序列告警（模拟告警演变过程）
 */
export function generateMockTimeSeriesAlarms(
  equipmentId: string,
  metricType: string,
  startTime: number,
  endTime: number
): Alarm[] {
  const equipment = EQUIPMENT_LIST.find(eq => eq.id === equipmentId);
  if (!equipment) {
    return [];
  }
  
  const alarms: Alarm[] = [];
  const duration = endTime - startTime;
  const stepCount = 5; // 生成5个时间点的告警
  const stepDuration = duration / stepCount;
  
  for (let i = 0; i < stepCount; i++) {
    const timestamp = startTime + (i * stepDuration);
    const severity = i < 2 ? AlertSeverity.LOW : i < 4 ? AlertSeverity.MEDIUM : AlertSeverity.CRITICAL;
    const status = i < stepCount - 1 ? AlarmStatus.RESOLVED : AlarmStatus.PENDING;
    
    alarms.push(generateMockAlarm({
      equipmentId,
      equipmentName: equipment.name,
      metricType,
      severity,
      status,
      triggeredAt: timestamp,
      createdAt: timestamp,
      message: `${equipment.name}${(METRIC_TYPES as any)[metricType] || metricType}异常 - 第${i + 1}阶段`
    }));
  }
  
  return alarms;
}

/**
 * 生成告警统计信息
 */
export function generateMockAlarmStatistics(): AlarmStatistics {
  const totalCount = Math.floor(Math.random() * 50) + 20;
  const pendingCount = Math.floor(totalCount * 0.5);
  const processingCount = Math.floor(totalCount * 0.2);
  const resolvedCount = Math.floor(totalCount * 0.2);
  const ignoredCount = totalCount - pendingCount - processingCount - resolvedCount;
  
  return {
    totalCount,
    pendingCount,
    processingCount,
    resolvedCount,
    ignoredCount,
    groupBySeverity: [
      { severity: AlertSeverity.LOW, count: Math.floor(totalCount * 0.4) },
      { severity: AlertSeverity.MEDIUM, count: Math.floor(totalCount * 0.3) },
      { severity: AlertSeverity.HIGH, count: Math.floor(totalCount * 0.2) },
      { severity: AlertSeverity.CRITICAL, count: Math.floor(totalCount * 0.1) },
    ],
    groupByStatus: [
      { status: AlarmStatus.PENDING, count: pendingCount },
      { status: AlarmStatus.PROCESSING, count: processingCount },
      { status: AlarmStatus.RESOLVED, count: resolvedCount },
      { status: AlarmStatus.IGNORED, count: ignoredCount },
    ],
  };
}

/**
 * 生成分页告警响应
 */
export function generateMockAlarmPaginatedResponse(
  page: number = 1,
  pageSize: number = 20,
  filters?: AlarmFilters
): AlarmPaginatedResponse {
  const allAlarms = generateMockAlarms(100, filters);
  const total = allAlarms.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = allAlarms.slice(startIndex, endIndex);
  
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 生成关键告警列表
 */
export function generateMockCriticalAlarms(limit: number = 10): Alarm[] {
  return generateMockAlarmsBySeverity(AlertSeverity.CRITICAL, limit);
}

/**
 * 生成待处理告警列表
 */
export function generateMockPendingAlarms(limit: number = 10): Alarm[] {
  const alarms: Alarm[] = [];
  for (let i = 0; i < limit; i++) {
    alarms.push(generateMockAlarm({ status: AlarmStatus.PENDING }));
  }
  
  return alarms.sort((a, b) => b.triggeredAt - a.triggeredAt);
}

/**
 * 预定义测试场景告警集合
 */

/**
 * 场景1：电池组过压场景
 */
export function generateBatteryOverVoltageScenario(): Alarm[] {
  const equipmentId = 'BATT-001';
  const equipmentName = '1#电池组';
  const baseTime = Date.now() - 4 * 60 * 60 * 1000; // 4小时前
  
  return [
    generateMockAlarm({
      equipmentId,
      equipmentName,
      metricType: 'voltage',
      value: 673,
      threshold: '600-700V',
      severity: AlertSeverity.LOW,
      status: AlarmStatus.RESOLVED,
      triggeredAt: baseTime + 1 * 60 * 60 * 1000,
      message: '电池组总电压过高 - 3级告警'
    }),
    generateMockAlarm({
      equipmentId,
      equipmentName,
      metricType: 'voltage',
      value: 684,
      threshold: '600-700V',
      severity: AlertSeverity.MEDIUM,
      status: AlarmStatus.RESOLVED,
      triggeredAt: baseTime + 2 * 60 * 60 * 1000,
      message: '电池组总电压过高 - 2级告警'
    }),
    generateMockAlarm({
      equipmentId,
      equipmentName,
      metricType: 'voltage',
      value: 695,
      threshold: '600-700V',
      severity: AlertSeverity.CRITICAL,
      status: AlarmStatus.PENDING,
      triggeredAt: baseTime + 3 * 60 * 60 * 1000,
      message: '电池组总电压过高 - 1级告警，应切断输出'
    }),
  ];
}

/**
 * 场景2：推进电机温度异常场景
 */
export function generateMotorTemperatureScenario(): Alarm[] {
  const equipmentId = 'MOTOR-L-001';
  const equipmentName = '左推进电机';
  const baseTime = Date.now() - 2 * 60 * 60 * 1000; // 2小时前
  
  return [
    generateMockAlarm({
      equipmentId,
      equipmentName,
      metricType: 'temperature',
      value: 92,
      threshold: '20-90°C',
      severity: AlertSeverity.CRITICAL,
      status: AlarmStatus.PENDING,
      triggeredAt: baseTime + 1 * 60 * 60 * 1000,
      message: '电机轴承温度过高 - 应自动停机'
    }),
  ];
}

/**
 * 场景3：多设备同时异常场景
 */
export function generateMultiDeviceScenario(): Alarm[] {
  const baseTime = Date.now() - 1 * 60 * 60 * 1000; // 1小时前
  
  return [
    generateMockAlarm({
      equipmentId: 'BATT-002',
      equipmentName: '2#电池组',
      metricType: 'current',
      value: 168,
      threshold: '0-160A',
      severity: AlertSeverity.MEDIUM,
      status: AlarmStatus.PENDING,
      triggeredAt: baseTime,
      message: '充放电电流过大 - 2级告警'
    }),
    generateMockAlarm({
      equipmentId: 'MOTOR-R-001',
      equipmentName: '右推进电机',
      metricType: 'temperature',
      value: 125,
      threshold: '20-120°C',
      severity: AlertSeverity.HIGH,
      status: AlarmStatus.PENDING,
      triggeredAt: baseTime + 10 * 60 * 1000,
      message: '电机定子绕组温度过高 - 高级告警'
    }),
    generateMockAlarm({
      equipmentId: 'INV-AC-001',
      equipmentName: '1#日用逆变器',
      metricType: 'temperature',
      value: 108,
      threshold: '20-105°C',
      severity: AlertSeverity.MEDIUM,
      status: AlarmStatus.PENDING,
      triggeredAt: baseTime + 20 * 60 * 1000,
      message: '电抗器温度过高 - 中等级别'
    }),
    generateMockAlarm({
      equipmentId: 'WELL-002',
      equipmentName: '2#集水井',
      metricType: 'pressure',
      value: 215,
      threshold: '0-200mm',
      severity: AlertSeverity.HIGH,
      status: AlarmStatus.PENDING,
      triggeredAt: baseTime + 30 * 60 * 1000,
      message: '水位过高 - 高级告警'
    }),
  ];
}

/**
 * 获取所有预定义场景
 */
export function getAllMockScenarios(): Alarm[] {
  return [
    ...generateBatteryOverVoltageScenario(),
    ...generateMotorTemperatureScenario(),
    ...generateMultiDeviceScenario(),
  ];
}