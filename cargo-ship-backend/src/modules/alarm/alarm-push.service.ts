import { Injectable, Logger } from '@nestjs/common';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';

/**
 * 实时告警推送服务
 *
 * 当新告警生成时，通过WebSocket实时推送给相关用户
 * 推送策略：
 * - 严重告警：推送给所有管理员和运维人员
 * - 高级告警：推送给管理员和运维人员
 * - 中低级告警：推送给订阅该设备的用户
 */
@Injectable()
export class AlarmPushService {
  private readonly logger = new Logger(AlarmPushService.name);

  constructor(private readonly websocketGateway: WebsocketGateway) {}

  /**
   * 推送新告警
   *
   * @param alarm 告警记录
   */
  async pushNewAlarm(alarm: AlarmRecord): Promise<void> {
    this.logger.log(
      `推送新告警: 设备=${alarm.equipmentId}, 严重程度=${alarm.severity}`,
    );

    // 构建告警消息
    const alarmMessage = {
      id: alarm.id,
      equipmentId: alarm.equipmentId,
      severity: alarm.severity,
      severityText: this.getSeverityText(alarm.severity),
      metricType: alarm.abnormalMetricType,
      abnormalValue: alarm.abnormalValue,
      thresholdRange: alarm.thresholdRange,
      triggeredAt: alarm.triggeredAt,
      status: alarm.status,
      timestamp: new Date().toISOString(),
    };

    // 根据告警严重程度决定推送范围
    if (
      alarm.severity === AlarmSeverity.CRITICAL ||
      alarm.severity === AlarmSeverity.HIGH
    ) {
      // 严重和高级告警：推送给管理员和运维人员
      this.websocketGateway.sendToRole(
        'administrator',
        'alarm:new',
        alarmMessage,
      );
      this.websocketGateway.sendToRole('operator', 'alarm:new', alarmMessage);

      this.logger.log(`严重告警已推送给管理员和运维人员: ${alarm.id}`);
    }

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      alarm.equipmentId,
      'alarm:new',
      alarmMessage,
    );

    // 同时广播告警计数更新（用于刷新告警徽章）
    this.broadcastAlarmCount();
  }

  /**
   * 推送告警状态更新
   *
   * @param alarm 更新后的告警记录
   */
  async pushAlarmStatusUpdate(alarm: AlarmRecord): Promise<void> {
    this.logger.log(`推送告警状态更新: ID=${alarm.id}, 新状态=${alarm.status}`);

    const updateMessage = {
      id: alarm.id,
      equipmentId: alarm.equipmentId,
      status: alarm.status,
      statusText: this.getStatusText(alarm.status),
      handler: alarm.handler,
      handledAt: alarm.handledAt,
      handleNote: alarm.handleNote,
      timestamp: new Date().toISOString(),
    };

    // 推送给订阅该设备的用户
    this.websocketGateway.sendToEquipment(
      alarm.equipmentId,
      'alarm:update',
      updateMessage,
    );

    // 推送给管理员和运维人员
    this.websocketGateway.sendToRole(
      'administrator',
      'alarm:update',
      updateMessage,
    );
    this.websocketGateway.sendToRole('operator', 'alarm:update', updateMessage);

    // 更新告警计数
    this.broadcastAlarmCount();
  }

  /**
   * 推送批量告警
   *
   * @param alarms 告警记录数组
   */
  async pushBatchAlarms(alarms: AlarmRecord[]): Promise<void> {
    this.logger.log(`批量推送 ${alarms.length} 条告警`);

    const alarmMessages = alarms.map((alarm) => ({
      id: alarm.id,
      equipmentId: alarm.equipmentId,
      severity: alarm.severity,
      severityText: this.getSeverityText(alarm.severity),
      metricType: alarm.abnormalMetricType,
      abnormalValue: alarm.abnormalValue,
      thresholdRange: alarm.thresholdRange,
      triggeredAt: alarm.triggeredAt,
      status: alarm.status,
    }));

    // 推送给管理员和运维人员
    this.websocketGateway.sendToRole('administrator', 'alarm:batch', {
      alarms: alarmMessages,
      count: alarms.length,
    });
    this.websocketGateway.sendToRole('operator', 'alarm:batch', {
      alarms: alarmMessages,
      count: alarms.length,
    });

    // 更新告警计数
    this.broadcastAlarmCount();
  }

  /**
   * 广播告警统计信息
   *
   * 通知所有用户更新告警计数徽章
   */
  private broadcastAlarmCount(): void {
    // 这里可以查询数据库获取实时统计，为了性能考虑，可以使用缓存
    // 暂时发送一个通知，让客户端自己刷新
    this.websocketGateway.broadcast('alarm:count:update', {
      timestamp: new Date().toISOString(),
      message: '告警数据已更新，请刷新',
    });
  }

  /**
   * 推送告警趋势数据
   *
   * @param equipmentId 设备ID
   * @param trendData 趋势数据
   */
  async pushAlarmTrend(equipmentId: string, trendData: any): Promise<void> {
    this.logger.debug(`推送设备 ${equipmentId} 的告警趋势数据`);

    this.websocketGateway.sendToEquipment(
      equipmentId,
      'alarm:trend',
      trendData,
    );
  }

  // ========== 辅助方法 ==========

  /**
   * 获取严重程度中文文本
   */
  private getSeverityText(severity: AlarmSeverity): string {
    const severityMap = {
      [AlarmSeverity.LOW]: '低',
      [AlarmSeverity.MEDIUM]: '中',
      [AlarmSeverity.HIGH]: '高',
      [AlarmSeverity.CRITICAL]: '严重',
    };
    return severityMap[severity] || severity;
  }

  /**
   * 获取状态中文文本
   */
  private getStatusText(status: string): string {
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决',
      ignored: '已忽略',
    };
    return statusMap[status] || status;
  }
}
