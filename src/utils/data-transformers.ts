// 数据转换器（前后端数据模型转换）
// 基于货船智能机舱管理系统数据转换架构

import { Equipment, EquipmentStatus, MetricReading, DataQuality } from '../types/equipment';
import { Alarm, AlarmStatus, AlertSeverity } from '../types/alarms';
import { User, Role, Permission } from '../types/auth';
import { TimeRangePreset, AggregationType } from '../types/history';
import { NotificationType } from '../types/global';
import { handleApiError } from './error-handler';

/**
 * 转换方向枚举
 */
export enum TransformDirection {
  BACKEND_TO_FRONTEND = 'backend_to_frontend',
  FRONTEND_TO_BACKEND = 'frontend_to_backend',
  FORMAT_DATA = 'format_data',
  NORMALIZE_DATA = 'normalize_data'
}

/**
 * 转换选项接口
 */
export interface TransformOptions {
  direction: TransformDirection;
  preserveNull?: boolean;
  validateInput?: boolean;
  formatDates?: boolean;
  includeComputed?: boolean;
}

/**
 * 通用数据转换器
 */
class CommonTransformers {
  /**
   * 时间戳转换
   */
  static convertTimestamp(timestamp: string | number | Date): number {
    if (!timestamp) return Date.now();
    
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return date.getTime();
    }
    
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    
    return Date.now();
  }

  /**
   * 数据质量转换
   */
  static convertDataQuality(quality: string | DataQuality): DataQuality {
    if (typeof quality === 'string') {
      switch (quality?.toLowerCase()) {
        case 'normal':
          return DataQuality.NORMAL;
        case 'abnormal':
          return DataQuality.ABNORMAL;
        case 'suspicious':
          return DataQuality.SUSPICIOUS;
        default:
          return DataQuality.NORMAL;
      }
    }
    return quality || DataQuality.NORMAL;
  }

  /**
   * 数字转换（安全转换）
   */
  static convertToNumber(value: any, defaultValue: number = 0): number {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * 布尔值转换（安全转换）
   */
  static convertToBoolean(value: any, defaultValue: boolean = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
        return true;
      }
      if (['false', '0', 'no', 'off'].includes(lowerValue)) {
        return false;
      }
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    return defaultValue;
  }

  /**
   * 字符串转换（安全转换）
   */
  static convertToString(value: any, defaultValue: string = ''): string {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return String(value);
  }
}

/**
 * 设备相关转换器
 */
export class EquipmentTransformers {
  /**
   * 设备数据转换（后端到前端）
   */
  static equipmentToFrontend(backendEquipment: any): Equipment {
    try {
      return {
        id: backendEquipment.id,
        deviceId: backendEquipment.deviceId || backendEquipment.device_id,
        deviceName: backendEquipment.deviceName || backendEquipment.device_name,
        deviceType: backendEquipment.deviceType || backendEquipment.device_type,
        status: this.convertEquipmentStatus(backendEquipment.status),
        createdAt: CommonTransformers.convertTimestamp(backendEquipment.createdAt || backendEquipment.created_at),
        deletedAt: CommonTransformers.convertTimestamp(backendEquipment.deletedAt || backendEquipment.deleted_at),
        latestData: backendEquipment.latestData ? this.metricReadingsToFrontend(backendEquipment.latestData) : null,
        alarmSummary: backendEquipment.alarmSummary ? this.alarmSummaryToFrontend(backendEquipment.alarmSummary) : null
      };
    } catch (error) {
      handleApiError(error, '设备数据转换', {
        showToast: false,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 设备数据转换（前端到后端）
   */
  static equipmentToBackend(frontendEquipment: Partial<Equipment>): any {
    const transformed: any = {};

    if (frontendEquipment.deviceId !== undefined) {
      transformed.deviceId = frontendEquipment.deviceId;
    }
    if (frontendEquipment.deviceName !== undefined) {
      transformed.deviceName = frontendEquipment.deviceName;
    }
    if (frontendEquipment.deviceType !== undefined) {
      transformed.deviceType = frontendEquipment.deviceType;
    }
    if (frontendEquipment.status !== undefined) {
      transformed.status = this.convertEquipmentStatus(frontendEquipment.status, TransformDirection.FRONTEND_TO_BACKEND);
    }

    return transformed;
  }

  /**
   * 设备状态转换
   */
  static convertEquipmentStatus(status: string | EquipmentStatus, direction: TransformDirection = TransformDirection.BACKEND_TO_FRONTEND): EquipmentStatus {
    if (direction === TransformDirection.BACKEND_TO_FRONTEND) {
      switch (status) {
        case 'running':
        case 'RUNNING':
          return EquipmentStatus.RUNNING;
        case 'maintenance':
        case 'MAINTENANCE':
          return EquipmentStatus.MAINTENANCE;
        case 'disabled':
        case 'DISABLED':
          return EquipmentStatus.DISABLED;
        case 'deleted':
        case 'DELETED':
          return EquipmentStatus.DELETED;
        default:
          return EquipmentStatus.DISABLED;
      }
    } else {
      // 从前端枚举转换为后端字符串
      switch (status) {
        case EquipmentStatus.RUNNING:
          return 'running' as any;
        case EquipmentStatus.MAINTENANCE:
          return 'maintenance' as any;
        case EquipmentStatus.DISABLED:
          return 'disabled' as any;
        case EquipmentStatus.DELETED:
          return 'deleted' as any;
        default:
          return 'disabled' as any;
      }
    }
  }

  /**
   * 指标读数转换（后端到前端）
   */
  static metricReadingsToFrontend(backendData: any): { [metricType: string]: MetricReading } {
    const result: { [metricType: string]: MetricReading } = {};
    
    if (Array.isArray(backendData)) {
      backendData.forEach((item, index) => {
        result[`metric_${index}`] = this.metricReadingToFrontend(item);
      });
    } else if (typeof backendData === 'object') {
      Object.entries(backendData).forEach(([metricType, data]) => {
        result[metricType] = this.metricReadingToFrontend(data);
      });
    }
    
    return result;
  }

  /**
   * 单个指标读数转换
   */
  static metricReadingToFrontend(backendData: any): MetricReading {
    return {
      value: CommonTransformers.convertToNumber(backendData.value, 0),
      unit: CommonTransformers.convertToString(backendData.unit || this.getDefaultUnit(backendData.metricType)),
      timestamp: CommonTransformers.convertTimestamp(backendData.timestamp || backendData.created_at),
      source: CommonTransformers.convertToString(backendData.source || 'sensor-upload'),
      quality: CommonTransformers.convertDataQuality(backendData.dataQuality || backendData.quality),
      dataId: backendData.id
    };
  }

  /**
   * 告警摘要转换
   */
  static alarmSummaryToFrontend(backendData: any): any {
    return {
      totalCount: CommonTransformers.convertToNumber(backendData.totalCount || backendData.total_count, 0),
      pendingCount: CommonTransformers.convertToNumber(backendData.pendingCount || backendData.pending_count, 0),
      latestAlarm: backendData.latestAlarm ? AlarmTransformers.alarmToFrontend(backendData.latestAlarm) : null
    };
  }

  /**
   * 获取默认单位
   */
  private static getDefaultUnit(metricType?: string): string {
    const unitMap: Record<string, string> = {
      'temperature': '°C',
      'pressure': 'kPa',
      'vibration': 'mm/s',
      'voltage': 'V',
      'current': 'A',
      'power': 'kW',
      'frequency': 'Hz',
      'speed': 'rpm',
      'flow': 'L/min',
      'level': 'm'
    };
    return unitMap[metricType || ''] || '';
  }
}

/**
 * 告警相关转换器
 */
export class AlarmTransformers {
  /**
   * 告警数据转换（后端到前端）
   */
  static alarmToFrontend(backendAlarm: any): Alarm {
    try {
      return {
        id: backendAlarm.id,
        equipmentId: backendAlarm.equipmentId || backendAlarm.equipment_id,
        equipmentName: CommonTransformers.convertToString(backendAlarm.equipmentName || backendAlarm.equipment_name || '未知设备'),
        configId: backendAlarm.configId || backendAlarm.config_id,
        metricType: CommonTransformers.convertToString(backendAlarm.metricType || backendAlarm.metric_type),
        value: CommonTransformers.convertToNumber(backendAlarm.value),
        threshold: CommonTransformers.convertToString(backendAlarm.threshold),
        triggeredAt: CommonTransformers.convertTimestamp(backendAlarm.triggeredAt || backendAlarm.created_at),
        severity: this.convertAlertSeverity(backendAlarm.severity),
        status: this.convertAlarmStatus(backendAlarm.status),
        message: CommonTransformers.convertToString(backendAlarm.message || backendAlarm.description || '未知告警'),
        handler: backendAlarm.handler,
        handledAt: backendAlarm.handledAt ? CommonTransformers.convertTimestamp(backendAlarm.handledAt) : null,
        handlerNote: CommonTransformers.convertToString(backendAlarm.handlerNote || backendAlarm.handler_note || ''),
        createdAt: CommonTransformers.convertTimestamp(backendAlarm.createdAt || backendAlarm.created_at)
      };
    } catch (error) {
      handleApiError(error, '告警数据转换', {
        showToast: false,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 告警数据转换（前端到后端）
   */
  static alarmToBackend(frontendAlarm: Partial<Alarm>): any {
    const transformed: any = {};

    if (frontendAlarm.equipmentId !== undefined) {
      transformed.equipmentId = frontendAlarm.equipmentId;
    }
    if (frontendAlarm.severity !== undefined) {
      transformed.severity = this.convertAlertSeverity(frontendAlarm.severity, TransformDirection.FRONTEND_TO_BACKEND);
    }
    if (frontendAlarm.status !== undefined) {
      transformed.status = this.convertAlarmStatus(frontendAlarm.status, TransformDirection.FRONTEND_TO_BACKEND);
    }
    if (frontendAlarm.message !== undefined) {
      transformed.message = frontendAlarm.message;
    }

    return transformed;
  }

  /**
   * 告警严重程度转换
   */
  static convertAlertSeverity(severity: string | AlertSeverity, direction: TransformDirection = TransformDirection.BACKEND_TO_FRONTEND): AlertSeverity {
    if (direction === TransformDirection.BACKEND_TO_FRONTEND) {
      switch (severity?.toLowerCase()) {
        case 'low':
        case 'info':
          return AlertSeverity.LOW;
        case 'medium':
        case 'warning':
          return AlertSeverity.MEDIUM;
        case 'high':
        case 'error':
          return AlertSeverity.HIGH;
        case 'critical':
        case 'fatal':
          return AlertSeverity.CRITICAL;
        default:
          return AlertSeverity.LOW;
      }
    } else {
      // 从前端枚举转换为后端字符串
      switch (severity) {
        case AlertSeverity.LOW:
          return 'low' as any;
        case AlertSeverity.MEDIUM:
          return 'medium' as any;
        case AlertSeverity.HIGH:
          return 'high' as any;
        case AlertSeverity.CRITICAL:
          return 'critical' as any;
        default:
          return 'low' as any;
      }
    }
  }

  /**
   * 告警状态转换
   */
  static convertAlarmStatus(status: string | AlarmStatus, direction: TransformDirection = TransformDirection.BACKEND_TO_FRONTEND): AlarmStatus {
    if (direction === TransformDirection.BACKEND_TO_FRONTEND) {
      switch (status?.toLowerCase()) {
        case 'pending':
        case 'new':
          return AlarmStatus.PENDING;
        case 'processing':
        case 'handling':
          return AlarmStatus.PROCESSING;
        case 'resolved':
        case 'closed':
          return AlarmStatus.RESOLVED;
        case 'ignored':
        case 'dismissed':
          return AlarmStatus.IGNORED;
        default:
          return AlarmStatus.PENDING;
      }
    } else {
      // 从前端枚举转换为后端字符串
      switch (status) {
        case AlarmStatus.PENDING:
          return 'pending' as any;
        case AlarmStatus.PROCESSING:
          return 'processing' as any;
        case AlarmStatus.RESOLVED:
          return 'resolved' as any;
        case AlarmStatus.IGNORED:
          return 'ignored' as any;
        default:
          return 'pending' as any;
      }
    }
  }
}

/**
 * 用户认证相关转换器
 */
export class AuthTransformers {
  /**
   * 用户数据转换（后端到前端）
   */
  static userToFrontend(backendUser: any): User {
    try {
      return {
        id: backendUser.id,
        username: backendUser.username || backendUser.user_name,
        email: CommonTransformers.convertToString(backendUser.email),
        fullName: CommonTransformers.convertToString(backendUser.fullName || backendUser.full_name || backendUser.username),
        status: backendUser.status || 'active',
        isActive: CommonTransformers.convertToBoolean(backendUser.isActive, true),
        lastLoginAt: backendUser.lastLoginAt || backendUser.last_login_at ? new Date(CommonTransformers.convertTimestamp(backendUser.lastLoginAt || backendUser.last_login_at)).toISOString() : undefined,
        lastLoginIp: CommonTransformers.convertToString(backendUser.lastLoginIp || backendUser.last_login_ip || ''),
        createdAt: new Date(CommonTransformers.convertTimestamp(backendUser.createdAt || backendUser.created_at)).toISOString(),
        updatedAt: new Date(CommonTransformers.convertTimestamp(backendUser.updatedAt || backendUser.updated_at)).toISOString(),
        roles: this.rolesToFrontend(backendUser.roles || []),
        permissions: backendUser.permissions || []
      };
    } catch (error) {
      handleApiError(error, '用户数据转换', {
        showToast: false,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 用户数据转换（前端到后端）
   */
  static userToBackend(frontendUser: Partial<User>): any {
    const transformed: any = {};

    if (frontendUser.username !== undefined) {
      transformed.username = frontendUser.username;
    }
    if (frontendUser.email !== undefined) {
      transformed.email = frontendUser.email;
    }
    if (frontendUser.isActive !== undefined) {
      transformed.isActive = frontendUser.isActive;
    }

    return transformed;
  }

  /**
   * 角色转换
   */
  static rolesToFrontend(backendRoles: any[]): Role[] {
    return backendRoles.map(role => ({
      id: role.id,
      name: CommonTransformers.convertToString(role.name) as 'administrator' | 'operator' | 'viewer',
      description: CommonTransformers.convertToString(role.description || '')
    }));
  }

  /**
   * 权限转换
   */
  static permissionsToFrontend(backendPermissions: any[]): Permission[] {
    return backendPermissions.map(permission =>
      CommonTransformers.convertToString(permission.code || permission.name)
    );
  }

  /**
   * 获取主要角色
   */
  private static getPrimaryRole(roles: any[]): string {
    if (!roles || roles.length === 0) return 'Viewer';
    
    // 优先返回 Administrator，然后是 Operator，最后是 Viewer
    const rolePriority = ['Administrator', 'Operator', 'Viewer'];
    for (const priorityRole of rolePriority) {
      const role = roles.find(r => r.name === priorityRole);
      if (role) {
        return priorityRole;
      }
    }
    
    return roles[0].name || 'Viewer';
  }
}

/**
 * 实时数据转换器
 */
export class RealTimeDataTransformers {
  /**
   * 实时数据批量转换
   */
  static batchMetricReadingsToFrontend(backendData: any[]): MetricReading[] {
    return backendData.map(item => EquipmentTransformers.metricReadingToFrontend(item));
  }

  /**
   * WebSocket消息转换
   */
  static websocketMessageToFrontend(message: any): any {
    try {
      switch (message.type) {
        case 'data_update':
          return {
            type: 'data_update',
            deviceId: message.deviceId,
            data: this.batchMetricReadingsToFrontend(message.data),
            timestamp: CommonTransformers.convertTimestamp(message.timestamp)
          };
        case 'alarm_new':
        case 'alarm_update':
          return {
            type: message.type,
            alarm: AlarmTransformers.alarmToFrontend(message.alarm),
            timestamp: CommonTransformers.convertTimestamp(message.timestamp)
          };
        default:
          return message;
      }
    } catch (error) {
      handleApiError(error, 'WebSocket消息转换', {
        showToast: false,
        logToConsole: true
      });
      throw error;
    }
  }
}

/**
 * 历史数据转换器
 */
export class HistoryDataTransformers {
  /**
   * 时间范围预设转换
   */
  static timeRangePresetToBackend(preset: TimeRangePreset): string {
    switch (preset) {
      case TimeRangePreset.LAST_HOUR:
        return '1h';
      case TimeRangePreset.LAST_6_HOURS:
        return '6h';
      case TimeRangePreset.LAST_24_HOURS:
        return '24h';
      case TimeRangePreset.LAST_7_DAYS:
        return '7d';
      case TimeRangePreset.LAST_30_DAYS:
        return '30d';
      default:
        return '24h';
    }
  }

  /**
   * 聚合类型转换
   */
  static aggregationTypeToBackend(type: AggregationType): string {
    switch (type) {
      case AggregationType.AVERAGE:
        return 'avg';
      case AggregationType.MAX:
        return 'max';
      case AggregationType.MIN:
        return 'min';
      case AggregationType.SUM:
        return 'sum';
      case AggregationType.COUNT:
        return 'count';
      default:
        return 'avg';
    }
  }

  /**
   * 历史数据点转换
   */
  static historyDataPointToFrontend(backendPoint: any): any {
    return {
      timestamp: CommonTransformers.convertTimestamp(backendPoint.timestamp),
      value: CommonTransformers.convertToNumber(backendPoint.value),
      unit: CommonTransformers.convertToString(backendPoint.unit),
      quality: CommonTransformers.convertDataQuality(backendPoint.dataQuality),
      aggregationType: backendPoint.aggregationType
    };
  }
}

/**
 * 通知相关转换器
 */
export class NotificationTransformers {
  /**
   * 通知类型转换
   */
  static notificationTypeToFrontend(type: string): NotificationType {
    switch (type?.toLowerCase()) {
      case 'info':
      case 'information':
        return NotificationType.INFO;
      case 'success':
      case 'successfully':
        return NotificationType.SUCCESS;
      case 'warning':
      case 'warn':
        return NotificationType.WARNING;
      case 'error':
      case 'failed':
        return NotificationType.ERROR;
      default:
        return NotificationType.INFO;
    }
  }
}

/**
 * 数据转换器主类
 */
export class DataTransformer {
  private static transformers = {
    equipment: EquipmentTransformers,
    alarm: AlarmTransformers,
    auth: AuthTransformers,
    realtime: RealTimeDataTransformers,
    history: HistoryDataTransformers,
    notification: NotificationTransformers,
    common: CommonTransformers
  };

  /**
   * 转换数据
   */
  static transform<T>(
    data: any,
    transformer: keyof typeof DataTransformer.transformers,
    method: string,
    ...args: any[]
  ): T {
    try {
      const transformerClass = this.transformers[transformer];
      if (!transformerClass || typeof (transformerClass as any)[method] !== 'function') {
        throw new Error(`Transformer ${transformer}.${method} not found`);
      }
      
      return (transformerClass as any)[method](data, ...args);
    } catch (error) {
      handleApiError(error, '数据转换', {
        showToast: false,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 获取转换器
   */
  static getTransformer(name: keyof typeof DataTransformer.transformers) {
    return this.transformers[name];
  }
}

// 导出便捷函数
export const transformEquipment = (data: any) => DataTransformer.transform(data, 'equipment', 'equipmentToFrontend');
export const transformAlarm = (data: any) => DataTransformer.transform(data, 'alarm', 'alarmToFrontend');
export const transformUser = (data: any) => DataTransformer.transform(data, 'auth', 'userToFrontend');
export const convertTimestamp = (timestamp: any) => DataTransformer.transform(timestamp, 'common', 'convertTimestamp');
export const convertDataQuality = (quality: any) => DataTransformer.transform(quality, 'common', 'convertDataQuality');

// 导出通用转换器
export { CommonTransformers };

export default DataTransformer;