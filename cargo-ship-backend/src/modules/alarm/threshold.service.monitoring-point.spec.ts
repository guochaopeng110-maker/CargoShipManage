import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThresholdService } from './threshold.service';
import { ThresholdConfig } from '../../database/entities/threshold-config.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { EquipmentService } from '../equipment/equipment.service';
import { MonitoringPoint } from '../../database/entities/monitoring-point.entity';
import { MetricType } from '../../database/entities/time-series-data.entity';
import {
  AlarmSeverity,
  RuleStatus,
} from '../../database/entities/threshold-config.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * ThresholdService - 监测点校验逻辑单元测试
 *
 * 测试范围:
 * - create(): 创建阈值配置时的监测点校验
 * - update(): 更新阈值配置时的监测点校验
 */
describe('ThresholdService - 监测点校验', () => {
  let service: ThresholdService;
  let thresholdRepository: Repository<ThresholdConfig>;
  let equipmentRepository: Repository<Equipment>;
  let equipmentService: EquipmentService;

  const mockEquipmentId = 'equipment-uuid-123';
  const mockEquipment = {
    id: mockEquipmentId,
    deviceId: 'SYS-BAT-001',
    deviceName: '电池系统#1',
  };

  // Helper function to create proper MonitoringPoint mocks
  const createMockMonitoringPoint = (
    overrides: Partial<MonitoringPoint> = {},
  ): MonitoringPoint => {
    const hasUnit = function (this: MonitoringPoint) {
      return !!this.unit && this.unit.trim().length > 0;
    };

    const getFullDescription = function (this: MonitoringPoint) {
      return `${this.pointName}(${this.metricType})`;
    };

    const base: MonitoringPoint = {
      id: 'mp-1',
      equipmentId: mockEquipmentId,
      pointName: '总电压',
      metricType: MetricType.VOLTAGE,
      unit: 'V',
      description: '电池组总电压',
      equipment: null,
      hasUnit,
      getFullDescription,
    };

    // Merge overrides but preserve methods
    return {
      ...base,
      ...overrides,
      hasUnit: overrides.hasUnit || hasUnit,
      getFullDescription: overrides.getFullDescription || getFullDescription,
    };
  };

  const mockMonitoringPoint: MonitoringPoint = createMockMonitoringPoint();

  const mockThreshold = {
    id: 'threshold-1',
    equipmentId: mockEquipmentId,
    metricType: MetricType.VOLTAGE,
    monitoringPoint: '总电压',
    faultName: '总压过压',
    upperLimit: 700,
    duration: 300000,
    severity: AlarmSeverity.HIGH,
    ruleStatus: RuleStatus.ENABLED,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThresholdService,
        {
          provide: getRepositoryToken(ThresholdConfig),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            softRemove: jest.fn(),
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
          provide: EquipmentService,
          useValue: {
            validateMonitoringPoint: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ThresholdService>(ThresholdService);
    thresholdRepository = module.get<Repository<ThresholdConfig>>(
      getRepositoryToken(ThresholdConfig),
    );
    equipmentRepository = module.get<Repository<Equipment>>(
      getRepositoryToken(Equipment),
    );
    equipmentService = module.get<EquipmentService>(EquipmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create() - 监测点校验', () => {
    const createDto = {
      equipmentId: mockEquipmentId,
      metricType: MetricType.VOLTAGE,
      monitoringPoint: '总电压',
      faultName: '总压过压',
      upperLimit: 700,
      duration: 300000,
      severity: AlarmSeverity.HIGH,
    };

    it('应当成功创建包含有效监测点的阈值配置', async () => {
      // Arrange
      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);
      jest
        .spyOn(thresholdRepository, 'create')
        .mockReturnValue(mockThreshold as any);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      const result = await service.create(createDto, 'user-123');

      // Assert
      expect(equipmentService.validateMonitoringPoint).toHaveBeenCalledWith(
        mockEquipmentId,
        '总电压',
        MetricType.VOLTAGE,
      );
      expect(result).toEqual(mockThreshold);
    });

    it('应当抛出 BadRequestException 当监测点不存在时', async () => {
      // Arrange
      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockRejectedValue(new NotFoundException('监测点不存在'));

      // Act & Assert
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        '监测点校验失败',
      );
    });

    it('应当抛出 BadRequestException 当监测点指标类型不匹配时', async () => {
      // Arrange
      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockRejectedValue(new BadRequestException('监测点指标类型不匹配'));

      // Act & Assert
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('应当记录警告当创建阈值配置时未提供监测点', async () => {
      // Arrange
      const dtoWithoutMonitoringPoint = {
        ...createDto,
        monitoringPoint: undefined,
      };

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(thresholdRepository, 'create')
        .mockReturnValue(mockThreshold as any);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.create(dtoWithoutMonitoringPoint, 'user-123');

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('创建阈值配置时未提供监测点'),
      );
      expect(equipmentService.validateMonitoringPoint).not.toHaveBeenCalled();
    });

    it('应当记录 debug 日志当监测点校验通过时', async () => {
      // Arrange
      const loggerDebugSpy = jest.spyOn(service['logger'], 'debug');

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);
      jest
        .spyOn(thresholdRepository, 'create')
        .mockReturnValue(mockThreshold as any);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.create(createDto, 'user-123');

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('监测点校验通过'),
      );
    });

    it('应当抛出 NotFoundException 当设备不存在时', async () => {
      // Arrange
      jest.spyOn(equipmentRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 'user-123')).rejects.toThrow(
        `设备不存在: ${mockEquipmentId}`,
      );
    });
  });

  describe('update() - 监测点校验', () => {
    const updateDto = {
      monitoringPoint: '单体最高温度',
      metricType: MetricType.TEMPERATURE,
    };

    beforeEach(() => {
      // Reset mock threshold to original state before each test
      jest.spyOn(thresholdRepository, 'findOne').mockResolvedValue({
        id: 'threshold-1',
        equipmentId: mockEquipmentId,
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        upperLimit: 700,
        duration: 300000,
        severity: AlarmSeverity.HIGH,
        ruleStatus: RuleStatus.ENABLED,
      } as any);
    });

    it('应当成功更新监测点并校验有效性', async () => {
      // Arrange
      const updatedMonitoringPoint = createMockMonitoringPoint({
        pointName: '单体最高温度',
        metricType: MetricType.TEMPERATURE,
      });

      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(updatedMonitoringPoint);
      jest.spyOn(thresholdRepository, 'save').mockResolvedValue({
        ...mockThreshold,
        ...updateDto,
      } as any);

      // Act
      const result = await service.update('threshold-1', updateDto, 'user-123');

      // Assert
      expect(equipmentService.validateMonitoringPoint).toHaveBeenCalledWith(
        mockEquipmentId,
        '单体最高温度',
        MetricType.TEMPERATURE,
      );
      expect(result.monitoringPoint).toBe('单体最高温度');
    });

    it('应当仅在监测点或指标类型发生变化时才校验', async () => {
      // Arrange
      const updateDtoNoChange = {
        upperLimit: 750, // 只更新上限,不更新监测点和指标类型
      };

      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.update('threshold-1', updateDtoNoChange, 'user-123');

      // Assert
      expect(equipmentService.validateMonitoringPoint).not.toHaveBeenCalled();
    });

    it('应当校验当更新了监测点时', async () => {
      // Arrange
      const updateDtoOnlyMonitoringPoint = {
        monitoringPoint: '单体最低温度',
      };

      const updatedMonitoringPoint = createMockMonitoringPoint({
        pointName: '单体最低温度',
      });

      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(updatedMonitoringPoint);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.update(
        'threshold-1',
        updateDtoOnlyMonitoringPoint,
        'user-123',
      );

      // Assert
      expect(equipmentService.validateMonitoringPoint).toHaveBeenCalledWith(
        mockEquipmentId,
        '单体最低温度',
        MetricType.VOLTAGE, // 使用原有的指标类型
      );
    });

    it('应当校验当更新了指标类型时', async () => {
      // Arrange
      const updateDtoOnlyMetricType = {
        metricType: MetricType.CURRENT,
      };

      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.update('threshold-1', updateDtoOnlyMetricType, 'user-123');

      // Assert
      expect(equipmentService.validateMonitoringPoint).toHaveBeenCalledWith(
        mockEquipmentId,
        '总电压', // 使用原有的监测点名称
        MetricType.CURRENT,
      );
    });

    it('应当校验当更新了设备ID时', async () => {
      // Arrange
      const newEquipmentId = 'new-equipment-uuid';
      const updateDtoWithNewEquipment = {
        equipmentId: newEquipmentId,
      };

      jest
        .spyOn(equipmentRepository, 'findOne')
        .mockResolvedValue({ id: newEquipmentId } as any);
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.update(
        'threshold-1',
        updateDtoWithNewEquipment,
        'user-123',
      );

      // Assert
      expect(equipmentService.validateMonitoringPoint).toHaveBeenCalledWith(
        newEquipmentId,
        '总电压',
        MetricType.VOLTAGE,
      );
    });

    it('应当抛出 BadRequestException 当更新后的监测点校验失败时', async () => {
      // Arrange
      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockRejectedValue(new NotFoundException('监测点不存在'));

      // Act & Assert
      await expect(
        service.update('threshold-1', updateDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('threshold-1', updateDto, 'user-123'),
      ).rejects.toThrow('监测点校验失败');
    });

    it('应当允许将监测点更新为 undefined (移除监测点)', async () => {
      // Arrange
      const updateDtoRemoveMonitoringPoint = {
        monitoringPoint: undefined,
      };

      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.update(
        'threshold-1',
        updateDtoRemoveMonitoringPoint,
        'user-123',
      );

      // Assert
      // 当监测点为 undefined 且是更新操作时,不应该进行校验
      expect(equipmentService.validateMonitoringPoint).not.toHaveBeenCalled();
    });

    it('应当记录 debug 日志当监测点校验通过时', async () => {
      // Arrange
      const loggerDebugSpy = jest.spyOn(service['logger'], 'debug');

      jest
        .spyOn(equipmentService, 'validateMonitoringPoint')
        .mockResolvedValue(mockMonitoringPoint);
      jest
        .spyOn(thresholdRepository, 'save')
        .mockResolvedValue(mockThreshold as any);

      // Act
      await service.update('threshold-1', updateDto, 'user-123');

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('监测点校验通过'),
      );
    });
  });
});
