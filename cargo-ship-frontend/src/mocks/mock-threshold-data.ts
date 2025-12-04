/**
 * 货船智能机舱管理系统 - 告警阈值Mock数据
 * 
 * 基于 docs/refer/data-uniform.md 中的告警阈值规格
 * 用于在API请求失败时提供演示数据
 */

import { ThresholdConfig } from '../types/thresholds';
import { AlertSeverity } from '../types/alarms';

/**
 * Mock阈值配置数据
 * 基于参考文档中的告警阈值规格
 */
export const mockThresholdConfigs: ThresholdConfig[] = [
  // 电池组告警阈值
  {
    id: "1",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "total_voltage",
    upperLimit: 683.1,
    lowerLimit: 584.1,
    duration: 5000,
    severity: AlertSeverity.LOW,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组总电压告警阈值"
  },
  {
    id: "2",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "total_voltage",
    upperLimit: 693.0,
    lowerLimit: 574.2,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组总电压中等告警阈值"
  },
  {
    id: "3",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "total_voltage",
    upperLimit: undefined,
    lowerLimit: 564.3,
    duration: 5000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组总电压严重告警阈值"
  },
  {
    id: "4",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "temperature",
    upperLimit: 50,
    lowerLimit: 4,
    duration: 5000,
    severity: AlertSeverity.LOW,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组温度告警阈值"
  },
  {
    id: "5",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "temperature",
    upperLimit: 55,
    lowerLimit: 2,
    duration: 5000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组温度严重告警阈值"
  },
  {
    id: "6",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "current",
    upperLimit: 160,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.LOW,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组充放电电流告警阈值"
  },
  {
    id: "7",
    equipmentId: "BATT-001",
    equipmentName: "1#电池组",
    metricType: "current",
    upperLimit: 165,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "电池组充放电电流严重告警阈值"
  },
  
  // 推进电机告警阈值
  {
    id: "8",
    equipmentId: "MOTOR-L-001",
    equipmentName: "左推进电机",
    metricType: "speed",
    upperLimit: 1650,
    lowerLimit: undefined,
    duration: 1000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "推进电机转速超速告警阈值"
  },
  {
    id: "9",
    equipmentId: "MOTOR-L-001",
    equipmentName: "左推进电机",
    metricType: "temperature",
    upperLimit: 90,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "推进电机轴承温度告警阈值"
  },
  {
    id: "10",
    equipmentId: "MOTOR-L-001",
    equipmentName: "左推进电机",
    metricType: "temperature",
    upperLimit: 120,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.HIGH,
    enabled: true,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "推进电机定子绕组温度告警阈值"
  },
  
  // 推进逆变器告警阈值
  {
    id: "11",
    equipmentId: "INV-L-001",
    equipmentName: "左推进逆变器",
    metricType: "voltage",
    upperLimit: 750,
    lowerLimit: 400,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "推进逆变器电压告警阈值"
  },
  {
    id: "12",
    equipmentId: "INV-L-001",
    equipmentName: "左推进逆变器",
    metricType: "current",
    upperLimit: 600,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "推进逆变器过电流告警阈值"
  },
  {
    id: "13",
    equipmentId: "INV-L-001",
    equipmentName: "左推进逆变器",
    metricType: "temperature",
    upperLimit: 85,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "推进逆变器温度告警阈值"
  },
  
  // 直流配电板告警阈值
  {
    id: "14",
    equipmentId: "DC-BOARD-001",
    equipmentName: "主直流配电板",
    metricType: "voltage",
    upperLimit: 683.1,
    lowerLimit: 584.1,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 29 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "直流配电板母排电压告警阈值"
  },
  
  // 日用逆变器告警阈值
  {
    id: "15",
    equipmentId: "INV-AC-001",
    equipmentName: "1#日用逆变器",
    metricType: "voltage",
    upperLimit: 750,
    lowerLimit: 400,
    duration: 5000,
    severity: AlertSeverity.HIGH,
    enabled: true,
    createdAt: Date.now() - 27 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "日用逆变器直流电压告警阈值"
  },
  {
    id: "16",
    equipmentId: "INV-AC-001",
    equipmentName: "1#日用逆变器",
    metricType: "current",
    upperLimit: 190,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 27 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "日用逆变器过电流告警阈值"
  },
  {
    id: "17",
    equipmentId: "INV-AC-001",
    equipmentName: "1#日用逆变器",
    metricType: "temperature",
    upperLimit: 105,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    createdAt: Date.now() - 27 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "日用逆变器电抗器温度告警阈值"
  },
  
  // 冷却水泵告警阈值
  {
    id: "18",
    equipmentId: "PUMP-COOL-001",
    equipmentName: "1#冷却水泵",
    metricType: "temperature",
    upperLimit: 33,
    lowerLimit: undefined,
    duration: 5000,
    severity: AlertSeverity.HIGH,
    enabled: true,
    createdAt: Date.now() - 26 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "冷却水温度高告警阈值"
  },
  {
    id: "19",
    equipmentId: "PUMP-COOL-001",
    equipmentName: "1#冷却水泵",
    metricType: "pressure",
    upperLimit: undefined,
    lowerLimit: 0.1,
    duration: 5000,
    severity: AlertSeverity.HIGH,
    enabled: true,
    createdAt: Date.now() - 26 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "冷却水压力低告警阈值"
  },
  
  // 舱底水井告警阈值
  {
    id: "20",
    equipmentId: "WELL-001",
    equipmentName: "1#集水井",
    metricType: "pressure",
    upperLimit: 200,
    lowerLimit: undefined,
    duration: 10000,
    severity: AlertSeverity.HIGH,
    enabled: true,
    createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    updatedAt: null,
    deletedAt: null,
    description: "舱底水井水位高告警阈值"
  }
];

/**
 * 获取Mock阈值配置列表
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 分页的阈值配置列表
 */
export const getMockThresholdConfigs = (page: number = 1, pageSize: number = 20) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = mockThresholdConfigs.slice(startIndex, endIndex);
  
  return {
    items,
    total: mockThresholdConfigs.length,
    page,
    pageSize,
    totalPages: Math.ceil(mockThresholdConfigs.length / pageSize),
  };
};

/**
 * 获取Mock阈值配置详情
 * @param id 阈值配置ID
 * @returns 阈值配置详情或null
 */
export const getMockThresholdConfig = (id: string) => {
  return mockThresholdConfigs.find(threshold => threshold.id === id) || null;
};

/**
 * 根据设备ID和指标类型获取Mock阈值配置
 * @param equipmentId 设备ID
 * @param metricType 指标类型
 * @returns 匹配的阈值配置或null
 */
export const getMockThresholdByEquipmentAndMetric = (equipmentId: string, metricType: string) => {
  return mockThresholdConfigs.find(threshold => 
    threshold.equipmentId === equipmentId && threshold.metricType === metricType
  ) || null;
};

/**
 * 获取Mock设备类型列表
 * @returns 设备类型数组
 */
export const getMockEquipmentTypes = () => {
  const types = new Set(mockThresholdConfigs.map(threshold => threshold.equipmentId));
  return Array.from(types);
};

/**
 * 获取Mock指标类型列表
 * @returns 指标类型数组
 */
export const getMockMetricTypes = () => {
  const types = new Set(mockThresholdConfigs.map(threshold => threshold.metricType));
  return Array.from(types);
};