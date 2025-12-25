import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoringPushService } from './monitoring-push.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  TimeSeriesData,
  MetricType,
  DataQuality,
  DataSource,
} from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';

describe('MonitoringPushService', () => {
  let service: MonitoringPushService;
  let mockWebsocketGateway: jest.Mocked<WebsocketGateway>;
  let mockEquipmentRepository: jest.Mocked<Repository<Equipment>>;

  // 定义测试用的 UUID 和 DeviceId
  const TEST_UUID = 'test-equipment-uuid';
  const TEST_DEVICE_ID = 'SYS-TEST-001';

  beforeEach(async () => {
    // 创建 WebsocketGateway 的 Mock
    mockWebsocketGateway = {
      sendToEquipment: jest.fn(),
      sendToRole: jest.fn(),
      sendToUser: jest.fn(),
      broadcast: jest.fn(),
    } as any;

    // 创建 EquipmentRepository 的 Mock
    mockEquipmentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: TEST_UUID,
        deviceId: TEST_DEVICE_ID,
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringPushService,
        {
          provide: WebsocketGateway,
          useValue: mockWebsocketGateway,
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockEquipmentRepository,
        },
      ],
    }).compile();

    service = module.get<MonitoringPushService>(MonitoringPushService);

    // 禁用日志输出以保持测试输出清洁
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 推送监测数据测试 ====================
  describe('推送新监测数据 (pushNewData)', () => {
    it('应该将 UUID 转换为 DeviceId 并成功推送', async () => {
      // Arrange: 准备测试数据
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.id = 12345;
      timeSeriesData.equipmentId = TEST_UUID;
      timeSeriesData.timestamp = new Date('2025-12-08T10:30:00.000Z');
      timeSeriesData.metricType = MetricType.VOLTAGE;
      timeSeriesData.monitoringPoint = '总电压';
      timeSeriesData.value = 24.5;
      timeSeriesData.unit = 'V';
      timeSeriesData.quality = DataQuality.NORMAL;
      timeSeriesData.source = DataSource.SENSOR_UPLOAD;

      // Act: 调用推送方法
      await service.pushNewData(timeSeriesData);

      // Assert: 验证 Repository 被调用
      expect(mockEquipmentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_UUID },
        }),
      );

      // Assert: 验证 WebSocket 推送使用 DeviceId
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledTimes(1);
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        TEST_DEVICE_ID, // 期望使用 DeviceId
        'monitoring:new-data',
        {
          id: 12345,
          equipmentId: TEST_DEVICE_ID, // 期望 Payload 中也是 DeviceId
          timestamp: '2025-12-08T10:30:00.000Z',
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 24.5,
          unit: 'V',
          quality: DataQuality.NORMAL,
          source: DataSource.SENSOR_UPLOAD,
        },
      );
    });

    it('如果实体已包含 equipment 对象，应直接使用其 deviceId', async () => {
      // Arrange
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.id = 12345;
      timeSeriesData.equipmentId = TEST_UUID;
      // 模拟已预加载 equipment 实体
      timeSeriesData.equipment = {
        deviceId: 'PRELOADED-ID-001',
      } as Equipment;
      timeSeriesData.timestamp = new Date();
      timeSeriesData.metricType = MetricType.VOLTAGE;
      timeSeriesData.value = 100;

      // Act
      await service.pushNewData(timeSeriesData);

      // Assert: 不应查询数据库
      expect(mockEquipmentRepository.findOne).not.toHaveBeenCalled();

      // Assert: 使用预加载的 ID 推送
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        'PRELOADED-ID-001',
        'monitoring:new-data',
        expect.objectContaining({
          equipmentId: 'PRELOADED-ID-001',
        }),
      );
    });

    it('如果找不到设备，应记录警告并跳过推送', async () => {
      // Arrange
      mockEquipmentRepository.findOne.mockResolvedValue(null);
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.equipmentId = 'unknown-uuid';

      // Act
      await service.pushNewData(timeSeriesData);

      // Assert
      expect(mockWebsocketGateway.sendToEquipment).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        expect.stringContaining('无法找到设备信息'),
      );
    });

    it('应该成功推送不包含监测点的监测数据', async () => {
      // Arrange: 准备测试数据（无监测点）
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.id = 67890;
      timeSeriesData.equipmentId = TEST_UUID;
      timeSeriesData.timestamp = new Date('2025-12-08T11:00:00.000Z');
      timeSeriesData.metricType = MetricType.TEMPERATURE;
      timeSeriesData.monitoringPoint = ''; // 无监测点（空字符串）
      timeSeriesData.value = 75.3;
      timeSeriesData.unit = '°C';
      timeSeriesData.quality = DataQuality.NORMAL;
      timeSeriesData.source = DataSource.SENSOR_UPLOAD;

      // Act: 调用推送方法
      await service.pushNewData(timeSeriesData);

      // Assert: 验证推送消息中 monitoringPoint 为空字符串
      expect(mockWebsocketGateway.sendToEquipment).toHaveBeenCalledWith(
        TEST_DEVICE_ID,
        'monitoring:new-data',
        expect.objectContaining({
          monitoringPoint: '',
          metricType: MetricType.TEMPERATURE,
          value: 75.3,
        }),
      );
    });

    it('应该包含所有必需的消息字段（9个字段）', async () => {
      // Arrange
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.id = 99999;
      timeSeriesData.equipmentId = TEST_UUID;
      timeSeriesData.timestamp = new Date('2025-12-08T12:00:00.000Z');
      timeSeriesData.metricType = MetricType.PRESSURE;
      timeSeriesData.monitoringPoint = '总压';
      timeSeriesData.value = 0.5;
      timeSeriesData.unit = 'MPa';
      timeSeriesData.quality = DataQuality.NORMAL;
      timeSeriesData.source = DataSource.FILE_IMPORT;

      // Act
      await service.pushNewData(timeSeriesData);

      // Assert
      const pushMessage = mockWebsocketGateway.sendToEquipment.mock.calls[0][2];

      expect(pushMessage).toHaveProperty('id');
      expect(pushMessage).toHaveProperty('equipmentId', TEST_DEVICE_ID); // 确认是 DeviceId
      expect(pushMessage).toHaveProperty('timestamp');
      expect(pushMessage).toHaveProperty('metricType');
      expect(pushMessage).toHaveProperty('monitoringPoint');
      expect(pushMessage).toHaveProperty('value');
      expect(pushMessage).toHaveProperty('unit');
      expect(pushMessage).toHaveProperty('quality');
      expect(pushMessage).toHaveProperty('source');

      expect(Object.keys(pushMessage)).toHaveLength(9);
    });
  });

  // ==================== 异常处理测试 ====================
  describe('推送失败时的异常处理', () => {
    it('应该捕获 WebSocket 推送异常并记录错误日志', async () => {
      // Arrange
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.equipmentId = TEST_UUID;
      timeSeriesData.metricType = MetricType.VIBRATION;
      timeSeriesData.value = 12.5;

      // Mock WebSocket 推送失败
      const mockError = new Error('WebSocket connection failed');
      mockWebsocketGateway.sendToEquipment.mockImplementation(() => {
        throw mockError;
      });

      // Act
      await expect(service.pushNewData(timeSeriesData)).resolves.not.toThrow();

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        expect.stringContaining('推送监测数据失败'),
        expect.any(String),
      );
    });
  });

  // ==================== 日志记录测试 ====================
  describe('日志记录', () => {
    it('应该记录包含监测点的 debug 日志', async () => {
      // Arrange
      const timeSeriesData = new TimeSeriesData();
      timeSeriesData.equipmentId = TEST_UUID;
      timeSeriesData.metricType = MetricType.VOLTAGE;
      timeSeriesData.monitoringPoint = '单体电压';
      timeSeriesData.value = 3.7;
      timeSeriesData.timestamp = new Date(); // Fix: 设置时间戳

      // Act
      await service.pushNewData(timeSeriesData);

      // Assert: 首先检查是否有错误发生
      expect(Logger.prototype.error).not.toHaveBeenCalled();

      // Assert: 验证 debug 日志被记录了2次
      expect(Logger.prototype.debug).toHaveBeenCalledTimes(2);

      // 验证第一条日志
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('推送监测数据'),
      );
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('监测点=单体电压'),
      );

      // 验证第二条日志
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining(`设备房间: equipment:${TEST_DEVICE_ID}`),
      );
    });
  });
});
