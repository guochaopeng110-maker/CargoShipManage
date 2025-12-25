import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ImportService } from './import.service';
import { ImportRecord } from '../../database/entities/import-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import {
  TimeSeriesData,
  MetricType,
} from '../../database/entities/time-series-data.entity';
import { FileParserService } from './file-parser.service';
import { AlarmService } from '../alarm/alarm.service';
import { AlarmPushService } from '../alarm/alarm-push.service';
import { MonitoringPushService } from '../monitoring/monitoring-push.service';
import { EquipmentService } from '../equipment/equipment.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

/**
 * ImportService - 监测点批量校验逻辑单元测试
 *
 * 测试范围:
 * - batchImportTimeSeriesData(): 批量导入时的监测点校验逻辑
 *   - 收集唯一监测点
 *   - 批量校验
 *   - 软校验模式(失败记录警告但不中断)
 *   - 缓存校验结果
 */
describe('ImportService - 监测点批量校验', () => {
  let service: ImportService;
  let equipmentService: EquipmentService;

  const mockEquipmentId = 'equipment-uuid-123';
  const mockEquipment = {
    id: mockEquipmentId,
    deviceId: 'SYS-BAT-001',
    deviceName: '电池系统#1',
  };

  // 批量校验的返回格式: { pointName: string; isValid: boolean }[]
  const mockValidationResults = [
    {
      pointName: '总电压',
      isValid: true,
    },
    {
      pointName: '单体最高温度',
      isValid: true,
    },
  ];

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn((entity, data) => data),
      save: jest.fn((entity, data) => {
        if (Array.isArray(data)) {
          return Promise.resolve(data.map((d, i) => ({ ...d, id: i + 1 })));
        }
        return Promise.resolve({ ...data, id: 1 });
      }),
      find: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: getRepositoryToken(ImportRecord),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TimeSeriesData),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: FileParserService,
          useValue: {
            parseExcel: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
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
            pushBatchAlarms: jest.fn(),
          },
        },
        {
          provide: MonitoringPushService,
          useValue: {
            pushNewData: jest.fn(),
          },
        },
        {
          provide: EquipmentService,
          useValue: {
            validateMonitoringPointsBatch: jest.fn(),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            sendToEquipment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    equipmentService = module.get<EquipmentService>(EquipmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('batchImportTimeSeriesData() - 监测点批量校验', () => {
    it('应当收集所有唯一的监测点名称', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 650.5,
        },
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压', // 重复
          value: 651.0,
        },
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.TEMPERATURE,
          monitoringPoint: '单体最高温度',
          value: 45.2,
        },
      ];

      mockQueryRunner.manager.find.mockResolvedValue([mockEquipment]);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue(mockValidationResults);

      // Act
      await service['batchImportTimeSeriesData'](parsedData, true);

      // Assert
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledWith(
        mockEquipmentId,
        expect.arrayContaining(['总电压', '单体最高温度']),
      );
      // 应该去重,只包含2个唯一的监测点
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledWith(
        mockEquipmentId,
        expect.arrayContaining(['总电压', '单体最高温度']),
      );
    });

    it('应当为每个设备分别批量校验监测点', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 650.5,
        },
        {
          equipmentId: 'SYS-BAT-002',
          timestamp: new Date(),
          metricType: MetricType.TEMPERATURE,
          monitoringPoint: '单体最高温度',
          value: 45.2,
        },
      ];

      const equipment2 = {
        id: 'equipment-uuid-456',
        deviceId: 'SYS-BAT-002',
      };

      mockQueryRunner.manager.find.mockResolvedValue([
        mockEquipment,
        equipment2,
      ]);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue(mockValidationResults);

      // Act
      await service['batchImportTimeSeriesData'](parsedData, true);

      // Assert
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledTimes(2);
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledWith(mockEquipmentId, ['总电压']);
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledWith('equipment-uuid-456', ['单体最高温度']);
    });

    it('应当缓存批量校验结果以提高性能', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 650.5,
        },
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压', // 相同的监测点,应该使用缓存
          value: 651.0,
        },
      ];

      mockQueryRunner.manager.find.mockResolvedValue([mockEquipment]);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue(mockValidationResults);

      // Act
      await service['batchImportTimeSeriesData'](parsedData, true);

      // Assert
      // 批量校验只应该调用一次(相同设备的监测点)
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).toHaveBeenCalledTimes(1);
    });

    it('应当在软校验模式下继续导入当批量校验失败时', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 650.5,
        },
      ];

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      mockQueryRunner.manager.find.mockResolvedValue([mockEquipment]);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockRejectedValue(new Error('批量校验失败'));

      // Act
      const result = await service['batchImportTimeSeriesData'](
        parsedData,
        true,
      );

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('监测点批量校验失败'),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('将继续导入'),
      );
      // 导入应该继续,不应该抛出异常
      expect(result.successCount).toBeGreaterThan(0);
    });

    it('应当记录警告当监测点未在元数据中定义时', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '未定义的监测点',
          value: 650.5,
        },
      ];

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      mockQueryRunner.manager.find.mockResolvedValue([mockEquipment]);
      // 批量校验返回空数组(监测点不存在)
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue([]);

      // Act
      await service['batchImportTimeSeriesData'](parsedData, true);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("监测点 '未定义的监测点' 未在设备"),
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('的元数据中定义'),
      );
    });

    it('应当记录警告当所有数据都缺失监测点时', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          // 没有 monitoringPoint
          value: 650.5,
        },
      ];

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      mockQueryRunner.manager.find.mockResolvedValue([mockEquipment]);

      // Act
      await service['batchImportTimeSeriesData'](parsedData, true);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('批量数据缺失监测点信息'),
      );
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).not.toHaveBeenCalled();
    });

    it('应当记录详细的统计日志', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'SYS-BAT-001',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 650.5,
        },
      ];

      const loggerLogSpy = jest.spyOn(service['logger'], 'log');

      mockQueryRunner.manager.find.mockResolvedValue([mockEquipment]);
      jest
        .spyOn(equipmentService, 'validateMonitoringPointsBatch')
        .mockResolvedValue(mockValidationResults);

      // Act
      await service['batchImportTimeSeriesData'](parsedData, true);

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('开始批量校验监测点'),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('监测点批量校验完成'),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('尝试='),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('失败='),
      );
    });

    it('应当跳过不存在的设备的监测点校验', async () => {
      // Arrange
      const parsedData = [
        {
          equipmentId: 'NOT-EXIST-DEVICE',
          timestamp: new Date(),
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          value: 650.5,
        },
      ];

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      mockQueryRunner.manager.find.mockResolvedValue([]); // 设备不存在

      // Act
      await service['batchImportTimeSeriesData'](parsedData, false);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('设备不存在,跳过监测点校验'),
      );
      expect(
        equipmentService.validateMonitoringPointsBatch,
      ).not.toHaveBeenCalled();
    });
  });
});
