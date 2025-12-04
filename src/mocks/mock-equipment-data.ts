/**
 * 货船智能机舱管理系统 - 设备管理Mock数据
 * 
 * 基于 docs/refer/data-uniform.md 中的详细设备列表
 * 用于在API请求失败时提供演示数据
 */

import { Equipment, EquipmentStatus, EquipmentOverview } from '../types/equipment';

/**
 * Mock设备概览数据
 */
export const mockEquipmentOverview: EquipmentOverview = {
  // 后端API返回的字段
  total: 15,
  normal: 12,
  warning: 2,
  fault: 1,
  offline: 0,
  
  // 前端兼容性字段
  totalCount: 15,
  runningCount: 12,
  maintenanceCount: 3,
  disabledCount: 0,
  abnormalCount: 3,
};

/**
 * Mock设备列表数据
 * 基于参考文档中的详细设备列表
 */
export const mockEquipmentList: Equipment[] = [
  // 电池系统
  {
    id: "1",
    deviceId: "BATT-001",
    deviceName: "1#电池组",
    deviceType: "电池系统",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前
    deletedAt: null,
    location: "电池舱",
    description: "主储能电池系统",
    manufacturer: "某电池制造商",
    model: "LFP-648V-150Ah",
    installationDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "2",
    deviceId: "BATT-002",
    deviceName: "2#电池组",
    deviceType: "电池系统",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "电池舱",
    description: "备用储能电池系统",
    manufacturer: "某电池制造商",
    model: "LFP-648V-150Ah",
    installationDate: Date.now() - 25 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  
  // 推进系统
  {
    id: "3",
    deviceId: "MOTOR-L-001",
    deviceName: "左推进电机",
    deviceType: "推进电机",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "机舱左侧",
    description: "左舷推进电机",
    manufacturer: "某电机制造商",
    model: "PM-1500-400V",
    installationDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "4",
    deviceId: "MOTOR-R-001",
    deviceName: "右推进电机",
    deviceType: "推进电机",
    status: EquipmentStatus.MAINTENANCE,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "机舱右侧",
    description: "右舷推进电机",
    manufacturer: "某电机制造商",
    model: "PM-1500-400V",
    installationDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "5",
    deviceId: "INV-L-001",
    deviceName: "左推进逆变器",
    deviceType: "推进逆变器",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "机舱左侧",
    description: "左推进电机逆变器",
    manufacturer: "某逆变器制造商",
    model: "INV-600A-750V",
    installationDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "6",
    deviceId: "INV-R-001",
    deviceName: "右推进逆变器",
    deviceType: "推进逆变器",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 28 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "机舱右侧",
    description: "右推进电机逆变器",
    manufacturer: "某逆变器制造商",
    model: "INV-600A-750V",
    installationDate: Date.now() - 20 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  
  // 配电系统
  {
    id: "7",
    deviceId: "DC-BOARD-001",
    deviceName: "主直流配电板",
    deviceType: "直流配电板",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 29 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "主配电室",
    description: "主直流配电系统",
    manufacturer: "某配电设备制造商",
    model: "DCB-750V-1000A",
    installationDate: Date.now() - 22 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "8",
    deviceId: "INV-AC-001",
    deviceName: "1#日用逆变器",
    deviceType: "日用逆变器",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 27 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "配电室",
    description: "1号日用交流逆变器",
    manufacturer: "某逆变器制造商",
    model: "AC-INV-190A",
    installationDate: Date.now() - 18 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "9",
    deviceId: "INV-AC-002",
    deviceName: "2#日用逆变器",
    deviceType: "日用逆变器",
    status: EquipmentStatus.MAINTENANCE,
    createdAt: Date.now() - 27 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "配电室",
    description: "2号日用交流逆变器",
    manufacturer: "某逆变器制造商",
    model: "AC-INV-190A",
    installationDate: Date.now() - 18 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  
  // 辅助系统
  {
    id: "10",
    deviceId: "PUMP-COOL-001",
    deviceName: "1#冷却水泵",
    deviceType: "冷却水泵",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 26 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "机舱",
    description: "1号齿轮箱冷却水泵",
    manufacturer: "某泵制造商",
    model: "CP-100-0.1MPa",
    installationDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "11",
    deviceId: "PUMP-COOL-002",
    deviceName: "2#冷却水泵",
    deviceType: "冷却水泵",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 26 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "机舱",
    description: "2号齿轮箱冷却水泵",
    manufacturer: "某泵制造商",
    model: "CP-100-0.1MPa",
    installationDate: Date.now() - 15 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "12",
    deviceId: "WELL-001",
    deviceName: "1#集水井",
    deviceType: "舱底水井",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "舱底1区",
    description: "1号舱底集水井监测",
    manufacturer: "某传感器制造商",
    model: "BW-Monitor",
    installationDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "13",
    deviceId: "WELL-002",
    deviceName: "2#集水井",
    deviceType: "舱底水井",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "舱底2区",
    description: "2号舱底集水井监测",
    manufacturer: "某传感器制造商",
    model: "BW-Monitor",
    installationDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "14",
    deviceId: "WELL-003",
    deviceName: "3#集水井",
    deviceType: "舱底水井",
    status: EquipmentStatus.RUNNING,
    createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "舱底3区",
    description: "3号舱底集水井监测",
    manufacturer: "某传感器制造商",
    model: "BW-Monitor",
    installationDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
  {
    id: "15",
    deviceId: "WELL-004",
    deviceName: "4#集水井",
    deviceType: "舱底水井",
    status: EquipmentStatus.MAINTENANCE,
    createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
    deletedAt: null,
    location: "舱底4区",
    description: "4号舱底集水井监测",
    manufacturer: "某传感器制造商",
    model: "BW-Monitor",
    installationDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
    latestData: null,
    alarmSummary: null,
  },
];

/**
 * 获取Mock设备列表
 * @param page 页码
 * @param pageSize 每页数量
 * @returns 分页的设备列表
 */
export const getMockEquipmentList = (page: number = 1, pageSize: number = 20) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = mockEquipmentList.slice(startIndex, endIndex);
  
  return {
    items,
    total: mockEquipmentList.length,
    page,
    pageSize,
    totalPages: Math.ceil(mockEquipmentList.length / pageSize),
  };
};

/**
 * 获取Mock设备详情
 * @param deviceId 设备ID
 * @returns 设备详情或null
 */
export const getMockEquipmentDetail = (deviceId: string) => {
  return mockEquipmentList.find(equipment => equipment.deviceId === deviceId) || null;
};

/**
 * 获取Mock设备类型列表
 * @returns 设备类型数组
 */
export const getMockEquipmentTypes = () => {
  const types = new Set(mockEquipmentList.map(equipment => equipment.deviceType));
  return Array.from(types);
};

/**
 * 获取Mock设备位置列表
 * @returns 设备位置数组
 */
export const getMockEquipmentLocations = () => {
  const locations = new Set(mockEquipmentList.map(equipment => equipment.location).filter(Boolean));
  return Array.from(locations) as string[];
};