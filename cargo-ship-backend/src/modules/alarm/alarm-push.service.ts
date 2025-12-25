import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { CacheService } from '../../common/services/cache.service';

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
  private readonly EQUIPMENT_CACHE_TTL = 3600; // 缓存1小时

  constructor(
    private readonly websocketGateway: WebsocketGateway,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 推送告警 (创建或更新)
   *
   * 统一处理告警的创建和更新推送,使用 alarm:push 事件
   * 这是推荐的推送方法,取代了 pushNewAlarm() 和 pushAlarmStatusUpdate()
   *
   * @param alarm 告警记录
   */
  async pushUpsertAlarm(alarm: AlarmRecord): Promise<void> {
    // 获取设备编号(deviceId)
    const deviceId = await this.getDeviceId(alarm.equipmentId);

    // 构建日志消息,包含监测点和故障名称
    const logMsg = alarm.monitoringPoint
      ? `推送告警: 设备=${deviceId}, 监测点=${alarm.monitoringPoint}, 故障=${alarm.faultName || '未指定'}, 状态=${alarm.status}`
      : `推送告警: 设备=${deviceId}, 状态=${alarm.status}`;

    this.logger.log(logMsg);

    // 构建告警消息 - 包含完整的业务上下文
    const alarmMessage = {
      id: alarm.id,
      equipmentId: deviceId, // 使用设备编号
      severity: alarm.severity,
      severityText: this.getSeverityText(alarm.severity),
      metricType: alarm.abnormalMetricType,
      abnormalValue: alarm.abnormalValue,
      thresholdRange: alarm.thresholdRange,
      triggeredAt: alarm.triggeredAt,
      status: alarm.status,
      statusText: this.getStatusText(alarm.status),
      timestamp: new Date().toISOString(),

      // 业务上下文信息
      monitoringPoint: alarm.monitoringPoint, // 监测点名称(如"总电压")
      faultName: alarm.faultName, // 故障名称(如"总压过压")
      recommendedAction: alarm.recommendedAction, // 处理措施建议

      // 处理信息(仅在已处理时存在)
      handler: alarm.handler,
      handledAt: alarm.handledAt,
      handleNote: alarm.handleNote,
    };

    // 推送给订阅该设备的用户
    // 使用设备编号作为房间名
    this.websocketGateway.sendToEquipment(deviceId, 'alarm:push', alarmMessage);

    // 严重告警推送给管理角色
    if (
      alarm.severity === AlarmSeverity.CRITICAL ||
      alarm.severity === AlarmSeverity.HIGH
    ) {
      this.websocketGateway.sendToRole(
        'administrator',
        'alarm:push',
        alarmMessage,
      );
      this.websocketGateway.sendToRole('operator', 'alarm:push', alarmMessage);

      this.logger.log(`严重告警已推送给管理员和运维人员: ${alarm.id}`);
    }
  }

  /**
   * 获取设备编号(deviceId)
   * 优先从缓存获取，否则查询数据库
   */
  private async getDeviceId(equipmentUuid: string): Promise<string> {
    const cacheKey = `equipment:uuid:${equipmentUuid}`;
    const cachedDeviceId = this.cacheService.get<string>(cacheKey);

    if (cachedDeviceId) {
      return cachedDeviceId;
    }

    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentUuid },
      select: ['deviceId'],
    });

    if (equipment) {
      this.cacheService.set(
        cacheKey,
        equipment.deviceId,
        this.EQUIPMENT_CACHE_TTL,
      );
      return equipment.deviceId;
    }

    // 如果找不到设备，回退使用 UUID (虽然不理想，但保证不报错)
    this.logger.warn(`无法找到设备UUID对应的编号: ${equipmentUuid}`);
    return equipmentUuid;
  }

  /**
   * 推送批量告警
   *
   * 用于历史导入和批量创建场景
   *
   * @param alarms 告警记录数组
   */
  async pushBatchAlarms(alarms: AlarmRecord[]): Promise<void> {
    this.logger.log(`批量推送 ${alarms.length} 条告警`);

    // 1. 批量转换 UUID 为 deviceId
    const uuids = Array.from(new Set(alarms.map((a) => a.equipmentId)));
    const deviceIdMap = await this.convertUuidsToDeviceIds(uuids);

    // 构建告警消息列表 - 包含完整的业务上下文
    const alarmMessages = alarms.map((alarm) => ({
      id: alarm.id,
      equipmentId: deviceIdMap.get(alarm.equipmentId) || alarm.equipmentId, // 使用设备编号
      severity: alarm.severity,
      severityText: this.getSeverityText(alarm.severity),
      metricType: alarm.abnormalMetricType,
      abnormalValue: alarm.abnormalValue,
      thresholdRange: alarm.thresholdRange,
      triggeredAt: alarm.triggeredAt,
      status: alarm.status,

      // 新增字段: 业务上下文信息
      monitoringPoint: alarm.monitoringPoint, // 监测点名称
      faultName: alarm.faultName, // 故障名称
      recommendedAction: alarm.recommendedAction, // 处理措施建议
    }));

    // 推送给管理员和运维人员 - 统一使用 alarm:batch 事件
    this.websocketGateway.sendToRole('administrator', 'alarm:batch', {
      alarms: alarmMessages,
      count: alarms.length,
    });
    this.websocketGateway.sendToRole('operator', 'alarm:batch', {
      alarms: alarmMessages,
      count: alarms.length,
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

  /**
   * 批量转换设备 UUID 为 deviceId (使用缓存)
   */
  private async convertUuidsToDeviceIds(
    uuids: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const missingUuids: string[] = [];

    // 1. 尝试从缓存获取
    for (const uuid of uuids) {
      const cacheKey = `equipment:uuid:${uuid}`;
      const cachedDeviceId = this.cacheService.get<string>(cacheKey);

      if (cachedDeviceId) {
        result.set(uuid, cachedDeviceId);
      } else {
        missingUuids.push(uuid);
      }
    }

    // 2. 批量查询数据库 (使用 IN 查询)
    if (missingUuids.length > 0) {
      const equipments = await this.equipmentRepository.find({
        where: { id: In(missingUuids) },
        select: ['id', 'deviceId'],
      });

      // 3. 回填缓存
      for (const eq of equipments) {
        result.set(eq.id, eq.deviceId);

        // 写入缓存
        const cacheKey = `equipment:uuid:${eq.id}`;
        this.cacheService.set(cacheKey, eq.deviceId, this.EQUIPMENT_CACHE_TTL);
      }
    }

    return result;
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
