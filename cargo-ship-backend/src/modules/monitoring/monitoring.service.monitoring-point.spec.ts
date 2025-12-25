import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MonitoringService } from './monitoring.service';
import {
  TimeSeriesData,
  MetricType,
} from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { MonitoringPoint } from '../../database/entities/monitoring-point.entity';
import { EquipmentService } from '../equipment/equipment.service';
import { DataQualityService } from './data-quality.service';
import { AlarmService } from '../alarm/alarm.service';
import { AlarmPushService } from '../alarm/alarm-push.service';
import { MonitoringPushService } from './monitoring-push.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * MonitoringService - 监测点校验逻辑单元测试
 *
 * 测试范围:
 * - receiveMonitoringData(): 单条数据接收时的监测点校验和单位补全
 * - receiveBatchMonitoringData(): 批量数据接收时的监测点批量校验
 */
describe('MonitoringService - 监测点校验', () => {
  let service: MonitoringService;
  let equipmentRepository: Repository<Equipment>;
  let timeSeriesDataRepository: Repository<TimeSeriesData>;
  let equipmentService: EquipmentService;

  const mockEquipmentId = 'equipment-uuid-123';
  const mockEquipment = {
    id: mockEquipmentId,
    deviceId: 'SYS-BAT-001',
    deviceName: '电池系统#1',
  };

  const mockMonitoringPoint: MonitoringPoint = {
    id: 'mp-1',
    equipmentId: mockEquipmentId,
    pointName: '总电压',
    metricType: MetricType.VOLTAGE,
    unit: 'V',
    description: '电池组总电压',
    equipment: null,
    hasUnit: function () {
      return !!this.unit && this.unit.trim().length > 0;
    },
    getFullDescription: function () {
      return `${this.pointName}(${this.metricType})`;
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: getRepositoryToken(TimeSeriesData),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => ({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                create: jest.fn(),
                save: jest.fn(),
                find: jest.fn(),
              },
            })),
          },
        },
        {
          provide: EquipmentService,
          useValue: {
            validateMonitoringPoint: jest.fn(),
            validateMonitoringPointsBatch: jest.fn(),
          },
        },
        {
          provide: DataQualityService,
          useValue: {
            checkDataQuality: jest.fn(() => ({
              quality: 'normal',
              warnings: [],
            })),
          },
        },
        {
          provide: AlarmService,
          useValue: {
            evaluateThresholds: jest.fn(() => Promise.resolve([])),
          },
        },
        {
          provide: AlarmPushService,
          useValue: {
            pushUpsertAlarm: jest.fn(),
          },
        },
        {
          provide: MonitoringPushService,
          useValue: {
            pushNewData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    equipmentRepository = module.get<Repository<Equipment>>(
      getRepositoryToken(Equipment),
    );
    timeSeriesDataRepository = module.get<Repository<TimeSeriesData>>(
      getRepositoryToken(TimeSeriesData),
    );
    equipmentService = module.get<EquipmentService>(EquipmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('receiveMonitoringData() - 监测点校验', () => {
    it('应当成功校验有效的监测点', async () => {
      // Arrange
      const createDto = {
        equipmentId: mockEquipmentId,
        timestamp: new Date(),
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        value: 650.5,
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);
      jest
        .spyOn(timeSeriesDataRepository, 'create')
        .mockReturnValue(createDto as any);
      jest
        .spyOn(timeSeriesDataRepository, 'save')
        .mockResolvedValue({ id: 1, ...createDto } as any);

      // Act
      const result = await service.receiveMonitoringData(createDto);

      // Assert
      expect(equipmentService.validateMonitoringPoint).toHaveBeenCalledWith(
        mockEquipmentId,
        '总电压',
        MetricType.VOLTAGE,
      );
      expect(result).toBeDefined();
    });

    it('应当抛出异常当监测点不存在时', async () => {
      // Arrange
      const createDto = {
        equipmentId: mockEquipmentId,
        timestamp: new Date(),
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '不存在的监测点',
        value: 650.5,
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockRejectedValue(new NotFoundException('监测点不存在'));

      // Act & Assert
      await expect(service.receiveMonitoringData(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应当抛出异常当监测点指标类型不匹配时', async () => {
      // Arrange
      const createDto = {
        equipmentId: mockEquipmentId,
        timestamp: new Date(),
        metricType: MetricType.TEMPERATURE,
        monitoringPoint: '总电压', // 总电压的类型是 VOLTAGE
        value: 650.5,
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockRejectedValue(new BadRequestException('监测点指标类型不匹配'));

      // Act & Assert
      await expect(service.receiveMonitoringData(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应当自动补全单位从监测点元数据', async () => {
      // Arrange
      const createDto = {
        equipmentId: mockEquipmentId,
        timestamp: new Date(),
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        value: 650.5,
        // 注意: 没有提供 unit 字段
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);

      const createSpy = jest
        .spyOn(timeSeriesDataRepository, 'create')
        .mockImplementation((data) => data as any);
      jest
        .spyOn(timeSeriesDataRepository, 'save')
        .mockResolvedValue({ id: 1, ...createDto, unit: 'V' } as any);

      // Act
      await service.receiveMonitoringData(createDto);

      // Assert
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: 'V', // 应该从监测点元数据中自动补全
        }),
      );
    });

    it('应当记录警告当数据缺失监测点时(向后兼容)', async () => {
      // Arrange
      const createDto = {
        equipmentId: mockEquipmentId,
        timestamp: new Date(),
        metricType: MetricType.VOLTAGE,
        // 注意: 没有提供 monitoringPoint 字段
        value: 650.5,
      };

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(timeSeriesDataRepository, 'create')
        .mockReturnValue(createDto as any);
      jest
        .spyOn(timeSeriesDataRepository, 'save')
        .mockResolvedValue({ id: 1, ...createDto } as any);

      // Act
      await service.receiveMonitoringData(createDto);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('数据缺失监测点信息'),
      );
      expect(equipmentService.validateMonitoringPoint).not.toHaveBeenCalled();
    });

    it('应当使用提供的单位而不是从监测点补全(当已提供单位时)', async () => {
      // Arrange
      const createDto = {
        equipmentId: mockEquipmentId,
        timestamp: new Date(),
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        value: 650.5,
        unit: 'kV', // 用户提供的单位
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);

      const createSpy = jest
        .spyOn(timeSeriesDataRepository, 'create')
        .mockImplementation((data) => data as any);
      jest
        .spyOn(timeSeriesDataRepository, 'save')
        .mockResolvedValue({ id: 1, ...createDto } as any);

      // Act
      await service.receiveMonitoringData(createDto);

      // Assert
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: 'kV', // 应该保留用户提供的单位
        }),
      );
    });
  });

  describe('receiveBatchMonitoringData() - 批量监测点校验', () => {
    it('应当成功批量校验监测点', async () => {
      // Arrange
      const batchDto = {
        equipmentId: mockEquipmentId,
        data: [
          {
            timestamp: new Date(),
            metricType: MetricType.VOLTAGE,
            monitoringPoint: '总电压',
            value: 650.5,
          },
          {
            timestamp: new Date(),
            metricType: MetricType.TEMPERATURE,
            monitoringPoint: '单体最高温度',
            value: 45.2,
          },
        ],
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue([
          {
            pointName: '总电压',
            isValid: true,
            metricType: MetricType.VOLTAGE,
            unit: 'V',
            hasUnit: () => true,
          } as any,
          {
            pointName: '单体最高温度',
            isValid: true,
            metricType: MetricType.TEMPERATURE,
            unit: '℃',
            hasUnit: () => true,
          } as any,
        ]);

      // Act
      const result = await service.receiveBatchMonitoringData(batchDto);

      // Assert
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledWith(mockEquipmentId, ['总电压', '单体最高温度']);
      expect(result.successCount).toBeGreaterThan(0);
    });

    it('应当收集唯一的监测点名称(去重)', async () => {
      // Arrange
      const batchDto = {
        equipmentId: mockEquipmentId,
        data: [
          {
            timestamp: new Date(),
            metricType: MetricType.VOLTAGE,
            monitoringPoint: '总电压',
            value: 650.5,
          },
          {
            timestamp: new Date('2024-01-01T10:01:00'),
            metricType: MetricType.VOLTAGE,
            monitoringPoint: '总电压', // 重复的监测点
            value: 651.0,
          },
        ],
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue([
          {
            pointName: '总电压',
            isValid: true,
            metricType: MetricType.VOLTAGE,
            unit: 'V',
            hasUnit: () => true,
          } as any,
        ]);

      // Act
      await service.receiveBatchMonitoringData(batchDto);

      // Assert
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledWith(
        mockEquipmentId,
        ['总电压'], // 应该去重,只校验一次
      );
    });

    it('应当继续导入当批量校验失败时(软校验模式)', async () => {
      // Arrange
      const batchDto = {
        equipmentId: mockEquipmentId,
        data: [
          {
            timestamp: new Date(),
            metricType: MetricType.VOLTAGE,
            monitoringPoint: '总电压',
            value: 650.5,
          },
        ],
      };

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');
      // Mock logger.error implementation to suppress console output during test
      loggerErrorSpy.mockImplementation(() => {});

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockRejectedValue(new Error('批量校验失败'));
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);

      // Act
      const result = await service.receiveBatchMonitoringData(batchDto);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('批量校验监测点失败'),
      );
      // 导入应该继续,不应该抛出异常
      expect(result).toBeDefined();
    });

    it('应当记录警告当批量数据缺失监测点时', async () => {
      // Arrange
      const batchDto = {
        equipmentId: mockEquipmentId,
        data: [
          {
            timestamp: new Date(),
            metricType: MetricType.VOLTAGE,
            // 没有 monitoringPoint
            value: 650.5,
          },
        ],
      };

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);

      // Act
      await service.receiveBatchMonitoringData(batchDto);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('批量数据缺失监测点信息'),
      );
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).not.toHaveBeenCalled();
    });
  });
});
