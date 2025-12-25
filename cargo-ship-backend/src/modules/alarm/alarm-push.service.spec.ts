import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AlarmPushService } from './alarm-push.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  AlarmRecord,
  AlarmStatus,
} from '../../database/entities/alarm-record.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import { MetricType } from '../../database/entities/time-series-data.entity';

describe('AlarmPushService', () => {
  let service: AlarmPushService;
  let mockWebsocketGateway: jest.Mocked<WebsocketGateway>;

  beforeEach(async () => {
    // 创建 WebsocketGateway 的 Mock
    mockWebsocketGateway = {
      sendToEquipment: jest.fn(),
      sendToRole: jest.fn(),
      sendToUser: jest.fn(),
      broadcast: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmPushService,
        {
          provide: WebsocketGateway,
          useValue: mockWebsocketGateway,
        },
      ],
    }).compile();

    service = module.get<AlarmPushService>(AlarmPushService);

    // 禁用日志输出以保持测试输出清洁
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== pushUpsertAlarm 测试 ====================
  describe('推送告警 (pushUpsertAlarm)', () => {
    it('应该成功推送包含完整业务上下文的告警', async () => {
      // Arrange: 准备测试数据
      const alarm = new AlarmRecord();
      alarm.id = 'alarm-123';
      alarm.equipmentId = 'equipment-456';
      alarm.severity = AlarmSeverity.MEDIUM;
      alarm.abnormalMetricType = MetricType.VOLTAGE;
      alarm.abnormalValue = 28.5;
      alarm.thresholdRange = '上限: 27.0V, 下限: 20.0V';
      alarm.triggeredAt = new Date('2025-12-09T10:30:00.000Z');
      alarm.status = AlarmStatus.PENDING;
      alarm.monitoringPoint = '总电压';
      alarm.faultName = '总压过压';
      alarm.recommendedAction = '立即检查电压调节器';

      // Act: 调用推送方法
      await service.pushUpsertAlarm(alarm);

      // Assert: 验证推送到设备房间
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledTimes(1);
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        'equipment-456',
        'alarm:push',
        expect.objectContaining({
          id: 'alarm-123',
          equipmentId: 'equipment-456',
          severity: AlarmSeverity.MEDIUM,
          severityText: '中',
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          faultName: '总压过压',
          recommendedAction: '立即检查电压调节器',
          status: AlarmStatus.PENDING,
          statusText: '待处理',
        }),
      );

      // 中等严重度不应推送给管理员
      expect(mockWebsocketGateway.sendToRole).not.toHaveBeenCalled();
    });

    it('应该推送严重告警到管理员和运维人员', async () => {
      // Arrange: 准备严重告警
      const alarm = new AlarmRecord();
      alarm.id = 'alarm-critical-001';
      alarm.equipmentId = 'equipment-789';
      alarm.severity = AlarmSeverity.CRITICAL;
      alarm.abnormalMetricType = MetricType.TEMPERATURE;
      alarm.abnormalValue = 95.0;
      alarm.thresholdRange = '上限: 85.0°C';
      alarm.triggeredAt = new Date('2025-12-09T11:00:00.000Z');
      alarm.status = AlarmStatus.PENDING;
      alarm.monitoringPoint = '单体最高温度';
      alarm.faultName = '温度过高';
      alarm.recommendedAction = '立即停机检查散热系统';

      // Act: 调用推送方法
      await service.pushUpsertAlarm(alarm);

      // Assert: 验证推送到设备房间
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledTimes(1);

      // 验证推送到管理员和运维人员
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledTimes(2);
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledWith(
        'administrator',
        'alarm:push',
        expect.objectContaining({
          id: 'alarm-critical-001',
          severity: AlarmSeverity.CRITICAL,
          severityText: '严重',
        }),
      );
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledWith(
        'operator',
        'alarm:push',
        expect.objectContaining({
          id: 'alarm-critical-001',
          severity: AlarmSeverity.CRITICAL,
        }),
      );
    });

    it('应该推送高级告警到管理员和运维人员', async () => {
      // Arrange: 准备高级告警
      const alarm = new AlarmRecord();
      alarm.id = 'alarm-high-001';
      alarm.equipmentId = 'equipment-999';
      alarm.severity = AlarmSeverity.HIGH;
      alarm.abnormalMetricType = MetricType.PRESSURE;
      alarm.abnormalValue = 120.0;
      alarm.thresholdRange = '上限: 100.0 kPa';
      alarm.triggeredAt = new Date('2025-12-09T12:00:00.000Z');
      alarm.status = AlarmStatus.PENDING;

      // Act: 调用推送方法
      await service.pushUpsertAlarm(alarm);

      // Assert: 验证推送到管理角色
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledTimes(2);
    });

    it('应该推送已处理的告警（包含处理信息）', async () => {
      // Arrange: 准备已处理的告警
      const alarm = new AlarmRecord();
      alarm.id = 'alarm-resolved-001';
      alarm.equipmentId = 'equipment-111';
      alarm.severity = AlarmSeverity.MEDIUM;
      alarm.abnormalMetricType = MetricType.VOLTAGE;
      alarm.abnormalValue = 28.5;
      alarm.thresholdRange = '上限: 27.0V';
      alarm.triggeredAt = new Date('2025-12-09T10:00:00.000Z');
      alarm.status = AlarmStatus.RESOLVED;
      alarm.monitoringPoint = '总电压';
      alarm.faultName = '总压过压';
      alarm.recommendedAction = '立即检查电压调节器';
      alarm.handler = 'user-123';
      alarm.handledAt = new Date('2025-12-09T10:30:00.000Z');
      alarm.handleNote = '已调整电压调节器';

      // Act: 调用推送方法
      await service.pushUpsertAlarm(alarm);

      // Assert: 验证推送包含处理信息
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        'equipment-111',
        'alarm:push',
        expect.objectContaining({
          status: 'resolved',
          statusText: '已解决',
          handler: 'user-123',
          handledAt: new Date('2025-12-09T10:30:00.000Z'),
          handleNote: '已调整电压调节器',
        }),
      );
    });

    it('应该支持不包含监测点的告警（向后兼容）', async () => {
      // Arrange: 准备无监测点的告警
      const alarm = new AlarmRecord();
      alarm.id = 'alarm-no-mp-001';
      alarm.equipmentId = 'equipment-legacy';
      alarm.severity = AlarmSeverity.LOW;
      alarm.abnormalMetricType = MetricType.TEMPERATURE;
      alarm.abnormalValue = 65.0;
      alarm.thresholdRange = '上限: 60.0°C';
      alarm.triggeredAt = new Date('2025-12-09T13:00:00.000Z');
      alarm.status = AlarmStatus.PENDING;
      // 无 monitoringPoint, faultName, recommendedAction

      // Act: 调用推送方法
      await service.pushUpsertAlarm(alarm);

      // Assert: 验证推送成功（字段为 undefined）
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        'equipment-legacy',
        'alarm:push',
        expect.objectContaining({
          id: 'alarm-no-mp-001',
          monitoringPoint: undefined,
          faultName: undefined,
          recommendedAction: undefined,
        }),
      );
    });
  });

  // ==================== pushBatchAlarms 测试 ====================
  describe('推送批量告警 (pushBatchAlarms)', () => {
    it('应该成功推送批量告警到管理角色', async () => {
      // Arrange: 准备批量告警数据
      const alarms = [
        Object.assign(new AlarmRecord(), {
          id: 'alarm-1',
          equipmentId: 'eq-1',
          severity: AlarmSeverity.HIGH,
          abnormalMetricType: MetricType.VOLTAGE,
          abnormalValue: 28.5,
          thresholdRange: '上限: 27.0V',
          triggeredAt: new Date('2025-12-09T10:00:00.000Z'),
          status: 'pending',
          monitoringPoint: '总电压',
          faultName: '总压过压',
        }),
        Object.assign(new AlarmRecord(), {
          id: 'alarm-2',
          equipmentId: 'eq-2',
          severity: AlarmSeverity.CRITICAL,
          abnormalMetricType: MetricType.TEMPERATURE,
          abnormalValue: 95.0,
          thresholdRange: '上限: 85.0°C',
          triggeredAt: new Date('2025-12-09T10:05:00.000Z'),
          status: 'pending',
          monitoringPoint: '单体最高温度',
          faultName: '温度过高',
        }),
      ];

      // Act: 调用批量推送方法
      await service.pushBatchAlarms(alarms);

      // Assert: 验证推送到管理员和运维人员
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledTimes(2);
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledWith(
        'administrator',
        'alarm:batch',
        expect.objectContaining({
          count: 2,
          alarms: expect.arrayContaining([
            expect.objectContaining({
              id: 'alarm-1',
              monitoringPoint: '总电压',
              faultName: '总压过压',
            }),
            expect.objectContaining({
              id: 'alarm-2',
              monitoringPoint: '单体最高温度',
              faultName: '温度过高',
            }),
          ]),
        }),
      );
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledWith(
        'operator',
        'alarm:batch',
        expect.objectContaining({
          count: 2,
        }),
      );
    });

    it('应该正确处理空告警列表', async () => {
      // Arrange: 空列表
      const alarms: AlarmRecord[] = [];

      // Act: 调用批量推送方法
      await service.pushBatchAlarms(alarms);

      // Assert: 验证推送消息包含 count: 0
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledTimes(2);
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledWith(
        'administrator',
        'alarm:batch',
        expect.objectContaining({
          count: 0,
          alarms: [],
        }),
      );
    });

    it('应该在批量告警消息中包含业务上下文', async () => {
      // Arrange: 准备包含完整业务上下文的告警
      const alarms = [
        Object.assign(new AlarmRecord(), {
          id: 'alarm-with-context',
          equipmentId: 'eq-ctx',
          severity: AlarmSeverity.MEDIUM,
          abnormalMetricType: MetricType.VOLTAGE,
          abnormalValue: 26.5,
          thresholdRange: '上限: 27.0V, 下限: 20.0V',
          triggeredAt: new Date('2025-12-09T14:00:00.000Z'),
          status: 'pending',
          monitoringPoint: '总电压',
          faultName: '总压偏低',
          recommendedAction: '检查充电系统',
        }),
      ];

      // Act: 调用批量推送方法
      await service.pushBatchAlarms(alarms);

      // Assert: 验证消息包含业务上下文
      expect(mockWebsocketGateway.sendToRole).toHaveBeenCalledWith(
        'administrator',
        'alarm:batch',
        expect.objectContaining({
          alarms: expect.arrayContaining([
            expect.objectContaining({
              monitoringPoint: '总电压',
              faultName: '总压偏低',
              recommendedAction: '检查充电系统',
            }),
          ]),
        }),
      );
    });
  });

  // ==================== pushAlarmTrend 测试 ====================
  describe('推送告警趋势 (pushAlarmTrend)', () => {
    it('应该成功推送告警趋势数据到设备房间', async () => {
      // Arrange: 准备趋势数据
      const equipmentId = 'equipment-trend-001';
      const trendData = {
        equipmentId,
        period: '7d',
        totalAlarms: 15,
        criticalCount: 2,
        highCount: 5,
        mediumCount: 6,
        lowCount: 2,
        trend: 'increasing',
      };

      // Act: 调用推送方法
      await service.pushAlarmTrend(equipmentId, trendData);

      // Assert: 验证推送到设备房间
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledTimes(1);
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        equipmentId,
        'alarm:trend',
        trendData,
      );
    });
  });
});
