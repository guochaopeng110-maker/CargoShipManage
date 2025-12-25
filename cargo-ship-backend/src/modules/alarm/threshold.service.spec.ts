import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThresholdService } from './threshold.service';
import {
  ThresholdConfig,
  AlarmSeverity,
  RuleStatus,
} from '../../database/entities/threshold-config.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { MetricType } from '../../database/entities/time-series-data.entity';
import { NotFoundException } from '@nestjs/common';

/**
 * 创建模拟的阈值配置实体
 */
const createMockThreshold = (
  partial: Partial<ThresholdConfig> = {},
): ThresholdConfig =>
  ({
    id: 'threshold-id',
    equipmentId: 'equipment-id',
    metricType: MetricType.TEMPERATURE,
    monitoringPoint: undefined,
    faultName: undefined,
    recommendedAction: undefined,
    upperLimit: 85,
    lowerLimit: 10,
    duration: 60000,
    severity: AlarmSeverity.HIGH,
    ruleStatus: RuleStatus.ENABLED,
    creator: 'user-id',
    modifier: 'user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as any,
    equipment: null as any,
    isEnabled: jest.fn().mockReturnValue(true),
    isTriggered: jest.fn(),
    getThresholdDescription: jest.fn(),
    getSeverityText: jest.fn(),
    hasMonitoringPoint: jest.fn().mockReturnValue(false),
    hasFaultName: jest.fn().mockReturnValue(false),
    hasRecommendedAction: jest.fn().mockReturnValue(false),
    getFullIdentifier: jest.fn(),
    ...partial,
  }) as ThresholdConfig;

/**
 * 创建模拟的设备实体
 */
const createMockEquipment = (partial: Partial<Equipment> = {}): Equipment =>
  ({
    id: 'equipment-id',
    deviceId: 'ENG-001',
    deviceName: '主引擎',
    deviceType: '主机',
    ...partial,
  }) as Equipment;

describe('ThresholdService', () => {
  let service: ThresholdService;
  let thresholdRepository: jest.Mocked<Repository<ThresholdConfig>>;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;

  beforeEach(async () => {
    // 创建模拟的仓储
    const mockThresholdRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    const mockEquipmentRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThresholdService,
        {
          provide: getRepositoryToken(ThresholdConfig),
          useValue: mockThresholdRepository,
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockEquipmentRepository,
        },
      ],
    }).compile();

    service = module.get<ThresholdService>(ThresholdService);
    thresholdRepository = module.get(getRepositoryToken(ThresholdConfig));
    equipmentRepository = module.get(getRepositoryToken(Equipment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 创建阈值配置测试 ====================
  describe('创建阈值配置 (create)', () => {
    const createDto = {
      equipmentId: 'equipment-id',
      metricType: MetricType.TEMPERATURE,
      upperLimit: 85,
      lowerLimit: 10,
      duration: 60000,
      severity: AlarmSeverity.HIGH,
      ruleStatus: RuleStatus.ENABLED,
    };

    it('应该成功创建阈值配置', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockThreshold = createMockThreshold();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create.mockReturnValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.create(createDto, 'user-id');

      // Assert: 验证结果
      expect(result).toEqual(mockThreshold);
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.equipmentId },
      });
      expect(thresholdRepository.create).toHaveBeenCalledWith({
        ...createDto,
        creator: 'user-id',
        modifier: 'user-id',
      });
      expect(thresholdRepository.save).toHaveBeenCalledWith(mockThreshold);
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.create(createDto, 'user-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create(createDto, 'user-id')).rejects.toThrow(
        `设备不存在: ${createDto.equipmentId}`,
      );
    });

    it('应该支持不提供用户ID', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockThreshold = createMockThreshold({
        creator: undefined as any,
        modifier: undefined as any,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create.mockReturnValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作（不提供用户ID）
      const result = await service.create(createDto);

      // Assert: 验证结果
      expect(result).toEqual(mockThreshold);
      expect(thresholdRepository.create).toHaveBeenCalledWith({
        ...createDto,
        creator: undefined,
        modifier: undefined,
      });
    });

    it('应该支持创建不同严重级别的阈值', async () => {
      // Arrange: 准备低严重级别的阈值
      const lowSeverityDto = {
        ...createDto,
        severity: AlarmSeverity.LOW,
      };

      const mockEquipment = createMockEquipment();
      const mockThreshold = createMockThreshold({
        severity: AlarmSeverity.LOW,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create.mockReturnValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.create(lowSeverityDto, 'user-id');

      // Assert: 验证结果
      expect(result.severity).toBe(AlarmSeverity.LOW);
    });

    it('应该支持创建不同指标类型的阈值', async () => {
      // Arrange: 准备压力指标的阈值
      const pressureDto = {
        ...createDto,
        metricType: MetricType.PRESSURE,
        upperLimit: 5,
        lowerLimit: 0.5,
      };

      const mockEquipment = createMockEquipment();
      const mockThreshold = createMockThreshold({
        metricType: MetricType.PRESSURE,
        upperLimit: 5,
        lowerLimit: 0.5,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create.mockReturnValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.create(pressureDto, 'user-id');

      // Assert: 验证结果
      expect(result.metricType).toBe(MetricType.PRESSURE);
      expect(result.upperLimit).toBe(5);
    });
  });

  // ==================== 查询阈值配置列表测试 ====================
  describe('查询阈值配置列表 (findAll)', () => {
    it('应该成功查询阈值配置列表', async () => {
      // Arrange: 准备测试数据
      const mockThresholds = [
        createMockThreshold({ id: '1' }),
        createMockThreshold({ id: '2' }),
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockThresholds),
      };

      thresholdRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证结果
      expect(result.items).toEqual(mockThresholds);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('应该支持按设备ID过滤', async () => {
      // Arrange: 准备测试数据
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      thresholdRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        equipmentId: 'equipment-id',
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'threshold.equipmentId = :equipmentId',
        { equipmentId: 'equipment-id' },
      );
    });

    it('应该支持按指标类型过滤', async () => {
      // Arrange: 准备测试数据
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      thresholdRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        metricType: MetricType.TEMPERATURE,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'threshold.metricType = :metricType',
        { metricType: MetricType.TEMPERATURE },
      );
    });

    it('应该支持按规则状态过滤', async () => {
      // Arrange: 准备测试数据
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      thresholdRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        ruleStatus: RuleStatus.ENABLED,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'threshold.ruleStatus = :ruleStatus',
        { ruleStatus: RuleStatus.ENABLED },
      );
    });

    it('应该正确计算总页数', async () => {
      // Arrange: 准备测试数据（总共50条记录，每页20条）
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(50),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      thresholdRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证总页数
      expect(result.totalPages).toBe(3); // Math.ceil(50/20) = 3
    });
  });

  // ==================== 查询单个阈值配置测试 ====================
  describe('根据ID查询阈值配置 (findOne)', () => {
    it('应该成功查询阈值配置', async () => {
      // Arrange: 准备测试数据
      const mockThreshold = createMockThreshold();
      thresholdRepository.findOne.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.findOne('threshold-id');

      // Assert: 验证结果
      expect(result).toEqual(mockThreshold);
      expect(thresholdRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'threshold-id' },
        relations: ['equipment'],
      });
    });

    it('应该在阈值配置不存在时抛出未找到异常', async () => {
      // Arrange: 模拟阈值不存在
      thresholdRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        '阈值配置不存在: non-existent-id',
      );
    });
  });

  // ==================== 更新阈值配置测试 ====================
  describe('更新阈值配置 (update)', () => {
    const updateDto = {
      upperLimit: 90,
      lowerLimit: 5,
      severity: AlarmSeverity.CRITICAL,
    };

    it('应该成功更新阈值配置', async () => {
      // Arrange: 准备测试数据
      const mockThreshold = createMockThreshold();
      const updatedThreshold = createMockThreshold({
        ...mockThreshold,
        ...updateDto,
      });

      thresholdRepository.findOne.mockResolvedValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(updatedThreshold);

      // Act: 执行操作
      const result = await service.update('threshold-id', updateDto, 'user-id');

      // Assert: 验证结果
      expect(result).toEqual(updatedThreshold);
      expect(thresholdRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateDto,
          modifier: 'user-id',
        }),
      );
    });

    it('应该在阈值配置不存在时抛出未找到异常', async () => {
      // Arrange: 模拟阈值不存在
      thresholdRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.update('non-existent-id', updateDto, 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该支持更新设备ID（验证新设备是否存在）', async () => {
      // Arrange: 准备测试数据
      const updateDtoWithEquipment = {
        ...updateDto,
        equipmentId: 'new-equipment-id',
      };

      const mockThreshold = createMockThreshold();
      const mockNewEquipment = createMockEquipment({
        id: 'new-equipment-id',
      });

      thresholdRepository.findOne.mockResolvedValue(mockThreshold);
      equipmentRepository.findOne.mockResolvedValue(mockNewEquipment);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      await service.update('threshold-id', updateDtoWithEquipment, 'user-id');

      // Assert: 验证新设备是否被验证
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'new-equipment-id' },
      });
    });

    it('应该在更新的设备ID不存在时抛出未找到异常', async () => {
      // Arrange: 准备测试数据
      const updateDtoWithEquipment = {
        ...updateDto,
        equipmentId: 'new-equipment-id',
      };

      const mockThreshold = createMockThreshold();

      thresholdRepository.findOne.mockResolvedValue(mockThreshold);
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.update('threshold-id', updateDtoWithEquipment, 'user-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('threshold-id', updateDtoWithEquipment, 'user-id'),
      ).rejects.toThrow('设备不存在: new-equipment-id');
    });

    it('应该支持不提供用户ID', async () => {
      // Arrange: 准备测试数据
      const mockThreshold = createMockThreshold();
      const updatedThreshold = createMockThreshold({
        ...mockThreshold,
        ...updateDto,
      });

      thresholdRepository.findOne.mockResolvedValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(updatedThreshold);

      // Act: 执行操作（不提供用户ID）
      const result = await service.update('threshold-id', updateDto);

      // Assert: 验证结果（modifier不应该被更新）
      expect(result).toEqual(updatedThreshold);
    });
  });

  // ==================== 删除阈值配置测试 ====================
  describe('删除阈值配置 (remove)', () => {
    it('应该成功删除阈值配置', async () => {
      // Arrange: 准备测试数据
      const mockThreshold = createMockThreshold();
      thresholdRepository.findOne.mockResolvedValue(mockThreshold);
      thresholdRepository.softRemove.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      await service.remove('threshold-id');

      // Assert: 验证结果
      expect(thresholdRepository.softRemove).toHaveBeenCalledWith(
        mockThreshold,
      );
    });

    it('应该在阈值配置不存在时抛出未找到异常', async () => {
      // Arrange: 模拟阈值不存在
      thresholdRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== 查询设备启用的阈值配置测试 ====================
  describe('查询设备的所有启用阈值配置 (findEnabledByEquipment)', () => {
    it('应该成功查询设备的启用阈值配置', async () => {
      // Arrange: 准备测试数据
      const mockThresholds = [
        createMockThreshold({ id: '1', ruleStatus: RuleStatus.ENABLED }),
        createMockThreshold({ id: '2', ruleStatus: RuleStatus.ENABLED }),
      ];

      thresholdRepository.find.mockResolvedValue(mockThresholds);

      // Act: 执行操作
      const result = await service.findEnabledByEquipment('equipment-id');

      // Assert: 验证结果
      expect(result).toEqual(mockThresholds);
      expect(thresholdRepository.find).toHaveBeenCalledWith({
        where: {
          equipmentId: 'equipment-id',
          ruleStatus: RuleStatus.ENABLED,
        },
      });
    });

    it('应该返回空数组（设备无启用的阈值）', async () => {
      // Arrange: 模拟无阈值
      thresholdRepository.find.mockResolvedValue([]);

      // Act: 执行操作
      const result = await service.findEnabledByEquipment('equipment-id');

      // Assert: 验证结果
      expect(result).toEqual([]);
    });

    it('应该只返回启用的阈值配置', async () => {
      // Arrange: 准备混合状态的阈值
      const mockThresholds = [
        createMockThreshold({ id: '1', ruleStatus: RuleStatus.ENABLED }),
      ];

      thresholdRepository.find.mockResolvedValue(mockThresholds);

      // Act: 执行操作
      const result = await service.findEnabledByEquipment('equipment-id');

      // Assert: 验证结果（只有启用的）
      expect(result).toHaveLength(1);
      expect(result[0].ruleStatus).toBe(RuleStatus.ENABLED);
    });
  });

  // ==================== 新字段功能测试 ====================
  describe('监测点、故障名称和处理措施字段', () => {
    it('应该成功创建包含监测点的阈值配置', async () => {
      // Arrange: 准备包含监测点的数据
      const createDto = {
        equipmentId: 'battery-equipment-id',
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        recommendedAction: '显示；报警；切断输出',
        upperLimit: 683.1,
        duration: 5000,
        severity: AlarmSeverity.MEDIUM,
      };

      const mockEquipment = createMockEquipment({ id: 'battery-equipment-id' });
      const mockThreshold = createMockThreshold({
        ...createDto,
        hasMonitoringPoint: jest.fn().mockReturnValue(true),
        hasFaultName: jest.fn().mockReturnValue(true),
        hasRecommendedAction: jest.fn().mockReturnValue(true),
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create.mockReturnValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.create(createDto, 'user-id');

      // Assert: 验证新字段被正确保存
      expect(result.monitoringPoint).toBe('总电压');
      expect(result.faultName).toBe('总压过压');
      expect(result.recommendedAction).toBe('显示；报警；切断输出');
      expect(thresholdRepository.save).toHaveBeenCalled();
    });

    it('应该支持同一设备同一指标类型的不同监测点', async () => {
      // Arrange: 准备两个不同监测点的阈值
      const totalVoltageDto = {
        equipmentId: 'battery-equipment-id',
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        upperLimit: 683.1,
        duration: 5000,
        severity: AlarmSeverity.MEDIUM,
      };

      const singleVoltageDto = {
        equipmentId: 'battery-equipment-id',
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '单体电压',
        faultName: '单体过压',
        upperLimit: 3.45,
        duration: 5000,
        severity: AlarmSeverity.MEDIUM,
      };

      const mockEquipment = createMockEquipment({ id: 'battery-equipment-id' });
      const mockTotalVoltageThreshold = createMockThreshold({
        ...totalVoltageDto,
        id: 'threshold-1',
      });
      const mockSingleVoltageThreshold = createMockThreshold({
        ...singleVoltageDto,
        id: 'threshold-2',
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create
        .mockReturnValueOnce(mockTotalVoltageThreshold)
        .mockReturnValueOnce(mockSingleVoltageThreshold);
      thresholdRepository.save
        .mockResolvedValueOnce(mockTotalVoltageThreshold)
        .mockResolvedValueOnce(mockSingleVoltageThreshold);

      // Act: 执行操作
      const result1 = await service.create(totalVoltageDto, 'user-id');
      const result2 = await service.create(singleVoltageDto, 'user-id');

      // Assert: 验证两个不同监测点的阈值都被创建
      expect(result1.monitoringPoint).toBe('总电压');
      expect(result1.faultName).toBe('总压过压');
      expect(result2.monitoringPoint).toBe('单体电压');
      expect(result2.faultName).toBe('单体过压');
    });

    it('应该支持查询特定监测点的阈值配置', async () => {
      // Arrange: 准备查询条件
      const queryDto = {
        equipmentId: 'battery-equipment-id',
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
      };

      const mockThresholds = [
        createMockThreshold({
          id: '1',
          monitoringPoint: '总电压',
          faultName: '总压过压',
          upperLimit: 683.1,
        }),
        createMockThreshold({
          id: '2',
          monitoringPoint: '总电压',
          faultName: '总压欠压',
          lowerLimit: 584.1,
        }),
      ];

      // Mock createQueryBuilder to return the thresholds
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue(mockThresholds),
        getManyAndCount: jest.fn().mockResolvedValue([mockThresholds, 2]),
      };
      thresholdRepository.createQueryBuilder = jest.fn(
        () => mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll(queryDto);

      // Assert: 验证返回了特定监测点的阈值
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].monitoringPoint).toBe('总电压');
      expect(result.items[1].monitoringPoint).toBe('总电压');
    });

    it('应该允许监测点为空（向后兼容）', async () => {
      // Arrange: 准备不含监测点的数据
      const createDto = {
        equipmentId: 'equipment-id',
        metricType: MetricType.TEMPERATURE,
        upperLimit: 85,
        duration: 60000,
        severity: AlarmSeverity.HIGH,
      };

      const mockEquipment = createMockEquipment();
      const mockThreshold = createMockThreshold({
        ...createDto,
        monitoringPoint: undefined,
        faultName: undefined,
        recommendedAction: undefined,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdRepository.create.mockReturnValue(mockThreshold);
      thresholdRepository.save.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.create(createDto, 'user-id');

      // Assert: 验证可以创建不含监测点的阈值
      expect(result).toBeDefined();
      expect(result.monitoringPoint).toBeUndefined();
    });

    it('应该支持更新监测点、故障名称和处理措施', async () => {
      // Arrange: 准备更新数据
      const updateDto = {
        monitoringPoint: '总电压(更新)',
        faultName: '总压过压(更新)',
        recommendedAction: '显示；报警；切断输出；通知管理员',
      };

      const existingThreshold = createMockThreshold({
        id: 'threshold-id',
        monitoringPoint: '总电压',
        faultName: '总压过压',
        recommendedAction: '显示；报警；切断输出',
      });

      const updatedThreshold = createMockThreshold({
        ...existingThreshold,
        ...updateDto,
      });

      thresholdRepository.findOne.mockResolvedValue(existingThreshold);
      thresholdRepository.save.mockResolvedValue(updatedThreshold);

      // Act: 执行操作
      const result = await service.update('threshold-id', updateDto, 'user-id');

      // Assert: 验证字段被正确更新
      expect(result.monitoringPoint).toBe('总电压(更新)');
      expect(result.faultName).toBe('总压过压(更新)');
      expect(result.recommendedAction).toBe('显示；报警；切断输出；通知管理员');
    });

    it('应该在查询结果中包含监测点和故障信息', async () => {
      // Arrange: 准备包含完整信息的阈值
      const mockThreshold = createMockThreshold({
        id: 'threshold-id',
        equipmentId: 'battery-equipment-id',
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        recommendedAction: '显示；报警；切断输出',
        upperLimit: 683.1,
        severity: AlarmSeverity.MEDIUM,
        hasMonitoringPoint: jest.fn().mockReturnValue(true),
        hasFaultName: jest.fn().mockReturnValue(true),
        hasRecommendedAction: jest.fn().mockReturnValue(true),
      });

      thresholdRepository.findOne.mockResolvedValue(mockThreshold);

      // Act: 执行操作
      const result = await service.findOne('threshold-id');

      // Assert: 验证返回的数据包含所有新字段
      expect(result.monitoringPoint).toBe('总电压');
      expect(result.faultName).toBe('总压过压');
      expect(result.recommendedAction).toBe('显示；报警；切断输出');
      expect(result.hasMonitoringPoint()).toBe(true);
      expect(result.hasFaultName()).toBe(true);
      expect(result.hasRecommendedAction()).toBe(true);
    });

    it('应该支持批量创建带监测点的阈值配置', async () => {
      // Arrange: 准备批量数据（包含监测点）
      const mockEquipment = createMockEquipment({ id: 'battery-equipment-id' });

      const thresholdsData = [
        {
          equipmentId: 'battery-equipment-id',
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '总电压',
          faultName: '总压过压',
          upperLimit: 683.1,
          duration: 5000,
          severity: AlarmSeverity.MEDIUM,
        },
        {
          equipmentId: 'battery-equipment-id',
          metricType: MetricType.VOLTAGE,
          monitoringPoint: '单体电压',
          faultName: '单体过压',
          upperLimit: 3.45,
          duration: 5000,
          severity: AlarmSeverity.MEDIUM,
        },
      ];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      thresholdsData.forEach((data, index) => {
        const mockThreshold = createMockThreshold({
          ...data,
          id: `threshold-${index}`,
        });
        thresholdRepository.create.mockReturnValueOnce(mockThreshold);
        thresholdRepository.save.mockResolvedValueOnce(mockThreshold);
      });

      // Act: 执行操作
      const results = await Promise.all(
        thresholdsData.map((data) => service.create(data, 'user-id')),
      );

      // Assert: 验证所有阈值都被创建
      expect(results).toHaveLength(2);
      expect(results[0].monitoringPoint).toBe('总电压');
      expect(results[1].monitoringPoint).toBe('单体电压');
    });
  });
});
