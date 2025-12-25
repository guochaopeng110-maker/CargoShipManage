import { Injectable, Logger } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';

/**
 * 设备状态推送服务
 *
 * 当设备状态变化时，通过WebSocket实时推送给相关用户
 * 包括：
 * - 设备状态变更（正常/警告/故障/离线）
 * - 设备信息更新
 * - 设备删除
 */
@Injectable()
export class EquipmentPushService {
  private readonly logger = new Logger(EquipmentPushService.name);

  constructor(private readonly websocketGateway: WebsocketGateway) {}

  /**
   * 推送设备状态变化
   *
   * @deprecated 已废弃 - 设备状态变化不再通过 WebSocket 推送
   * 此方法将在下一个主版本中移除
   *
   * @param equipment 设备对象
   * @param oldStatus 旧状态（可选）
   */
  async pushStatusChange(
    equipment: Equipment,
    oldStatus?: EquipmentStatus,
  ): Promise<void> {
    this.logger.warn('警告: pushStatusChange() 已废弃，设备状态变化不再推送');
    this.logger.log(
      `推送设备状态变化: ${equipment.deviceName}(${equipment.id}), ${oldStatus || '未知'} -> ${equipment.status}`,
    );

    const statusMessage = {
      id: equipment.id,
      deviceId: equipment.deviceId,
      deviceName: equipment.deviceName,
      deviceType: equipment.deviceType,
      location: equipment.location,
      oldStatus: oldStatus,
      newStatus: equipment.status,
      statusText: this.getStatusText(equipment.status),
      updatedAt: equipment.updatedAt,
      timestamp: new Date().toISOString(),
    };

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      equipment.id,
      'equipment:status:change',
      statusMessage,
    );

    // 如果状态变为故障或离线，推送给管理员和运维人员
    if (
      equipment.status === EquipmentStatus.FAULT ||
      equipment.status === EquipmentStatus.OFFLINE
    ) {
      this.websocketGateway.sendToRole(
        'administrator',
        'equipment:status:critical',
        statusMessage,
      );
      this.websocketGateway.sendToRole(
        'operator',
        'equipment:status:critical',
        statusMessage,
      );

      this.logger.warn(
        `设备 ${equipment.deviceName} 进入异常状态: ${equipment.status}`,
      );
    }
  }

  /**
   * 推送设备信息更新
   *
   * @deprecated 已废弃 - 设备信息更新不再通过 WebSocket 推送
   * 此方法将在下一个主版本中移除
   *
   * @param equipment 更新后的设备对象
   */
  async pushEquipmentUpdate(equipment: Equipment): Promise<void> {
    this.logger.warn(
      '警告: pushEquipmentUpdate() 已废弃，设备信息更新不再推送',
    );
    this.logger.log(
      `推送设备信息更新: ${equipment.deviceName}(${equipment.id})`,
    );

    const updateMessage = {
      id: equipment.id,
      deviceId: equipment.deviceId,
      deviceName: equipment.deviceName,
      deviceType: equipment.deviceType,
      model: equipment.model,
      manufacturer: equipment.manufacturer,
      location: equipment.location,
      status: equipment.status,
      statusText: this.getStatusText(equipment.status),
      commissionDate: equipment.commissionDate,
      description: equipment.description,
      updatedAt: equipment.updatedAt,
      timestamp: new Date().toISOString(),
    };

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      equipment.id,
      'equipment:update',
      updateMessage,
    );

    // 推送给管理员
    this.websocketGateway.sendToRole(
      'administrator',
      'equipment:update',
      updateMessage,
    );
  }

  /**
   * 推送设备创建事件
   *
   * @deprecated 已废弃 - 设备创建事件不再通过 WebSocket 推送
   * 此方法将在下一个主版本中移除
   *
   * @param equipment 新创建的设备对象
   */
  async pushEquipmentCreated(equipment: Equipment): Promise<void> {
    this.logger.warn(
      '警告: pushEquipmentCreated() 已废弃，设备创建事件不再推送',
    );
    this.logger.log(
      `推送设备创建事件: ${equipment.deviceName}(${equipment.id})`,
    );

    const createMessage = {
      id: equipment.id,
      deviceId: equipment.deviceId,
      deviceName: equipment.deviceName,
      deviceType: equipment.deviceType,
      model: equipment.model,
      location: equipment.location,
      status: equipment.status,
      statusText: this.getStatusText(equipment.status),
      createdAt: equipment.createdAt,
      timestamp: new Date().toISOString(),
    };

    // 广播给所有管理员和运维人员
    this.websocketGateway.sendToRole(
      'administrator',
      'equipment:created',
      createMessage,
    );
    this.websocketGateway.sendToRole(
      'operator',
      'equipment:created',
      createMessage,
    );
  }

  /**
   * 推送设备删除事件
   *
   * @deprecated 已废弃 - 设备删除事件不再通过 WebSocket 推送
   * 此方法将在下一个主版本中移除
   *
   * @param equipmentId 设备ID
   * @param equipmentName 设备名称
   */
  async pushEquipmentDeleted(
    equipmentId: string,
    equipmentName: string,
  ): Promise<void> {
    this.logger.warn(
      '警告: pushEquipmentDeleted() 已废弃，设备删除事件不再推送',
    );
    this.logger.log(`推送设备删除事件: ${equipmentName}(${equipmentId})`);

    const deleteMessage = {
      id: equipmentId,
      name: equipmentName,
      timestamp: new Date().toISOString(),
    };

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      equipmentId,
      'equipment:deleted',
      deleteMessage,
    );

    // 广播给所有管理员和运维人员
    this.websocketGateway.sendToRole(
      'administrator',
      'equipment:deleted',
      deleteMessage,
    );
    this.websocketGateway.sendToRole(
      'operator',
      'equipment:deleted',
      deleteMessage,
    );
  }

  /**
   * 推送设备实时数据
   *
   * @deprecated 已废弃 - 请使用 MonitoringPushService.pushNewData()
   * 此方法将在下一个主版本中移除
   *
   * @param equipmentId 设备ID
   * @param dataPoint 数据点
   */
  async pushRealtimeData(
    equipmentId: string,
    dataPoint: {
      metricType: string;
      value: number;
      unit: string;
      timestamp: Date;
    },
  ): Promise<void> {
    this.logger.warn(
      '警告: pushRealtimeData() 已废弃,请使用 MonitoringPushService.pushNewData()',
    );

    const dataMessage = {
      equipmentId,
      metricType: dataPoint.metricType,
      value: dataPoint.value,
      unit: dataPoint.unit,
      timestamp: dataPoint.timestamp.toISOString(),
    };

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      equipmentId,
      'equipment:data:realtime',
      dataMessage,
    );
  }

  /**
   * 推送设备健康评分更新
   *
   * @param equipmentId 设备ID
   * @param healthScore 健康评分数据
   */
  async pushHealthScoreUpdate(
    equipmentId: string,
    healthScore: {
      score: number;
      grade: string;
      soh: number;
      trend: string;
      calculatedAt: Date;
    },
  ): Promise<void> {
    this.logger.log(
      `推送设备 ${equipmentId} 健康评分更新: ${healthScore.score}`,
    );

    const healthMessage = {
      equipmentId,
      score: healthScore.score,
      grade: healthScore.grade,
      gradeText: this.getGradeText(healthScore.grade),
      soh: healthScore.soh,
      trend: healthScore.trend,
      calculatedAt: healthScore.calculatedAt.toISOString(),
      timestamp: new Date().toISOString(),
    };

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      equipmentId,
      'equipment:health:update',
      healthMessage,
    );

    // 如果健康评分低于60，推送给管理员
    if (healthScore.score < 60) {
      this.websocketGateway.sendToRole(
        'administrator',
        'equipment:health:warning',
        healthMessage,
      );
    }
  }

  /**
   * 广播设备概览更新
   *
   * @deprecated 已废弃 - 设备概览更新不再通过 WebSocket 推送
   * 此方法将在下一个主版本中移除
   *
   * 通知所有用户刷新设备统计数据
   */
  private broadcastEquipmentOverview(): void {
    this.logger.warn(
      '警告: broadcastEquipmentOverview() 已废弃，设备概览不再推送',
    );
    this.websocketGateway.broadcast('equipment:overview:update', {
      timestamp: new Date().toISOString(),
      message: '设备数据已更新，请刷新',
    });
  }

  // ========== 辅助方法 ==========

  /**
   * 获取状态中文文本
   */
  private getStatusText(status: EquipmentStatus): string {
    const statusMap = {
      [EquipmentStatus.NORMAL]: '正常',
      [EquipmentStatus.WARNING]: '警告',
      [EquipmentStatus.FAULT]: '故障',
      [EquipmentStatus.OFFLINE]: '离线',
    };
    return statusMap[status] || status;
  }

  /**
   * 获取健康等级中文文本
   */
  private getGradeText(grade: string): string {
    const gradeMap = {
      Excellent: '优秀',
      Good: '良好',
      Fair: '一般',
      Poor: '较差',
      Critical: '严重',
    };
    return gradeMap[grade] || grade;
  }
}
