import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MonitoringService } from './monitoring.service';
import {
  TimeSeriesData,
  MetricType,
  DataQuality,
  DataSource as DataSourceEnum,
} from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { DataQualityService } from './data-quality.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * 创建模拟的时序数据实体
 */
const createMockTimeSeriesData = (
  partial: Partial<TimeSeriesData> = {},
): TimeSeriesData =>
  ({
    id: 1,
    equipmentId: 'equipment-id',
    timestamp: new Date(),
    metricType: MetricType.TEMPERATURE,
    value: 75.5,
    unit: '°C',
    quality: DataQuality.NORMAL,
    source: DataSourceEnum.SENSOR_UPLOAD,
    createdAt: new Date(),
    equipment: null as any,
    isAbnormal: jest.fn().mockReturnValue(false),
    isImportedData: jest.fn().mockReturnValue(false),
    ...partial,
  }) as TimeSeriesData;

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

describe('MonitoringService', () => {
  let service: MonitoringService;
  let timeSeriesDataRepository: jest.Mocked<Repository<TimeSeriesData>>;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;
  let dataQualityService: jest.Mocked<DataQualityService>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    // 创建模拟的查询运行器
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };

    // 创建模拟的仓储
    const mockTimeSeriesDataRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockEquipmentRepository = {
      findOne: jest.fn(),
    };

    // 创建模拟的数据质量服务
    const mockDataQualityService = {
      checkDataQuality: jest.fn(),
    };

    // 创建模拟的数据源
    const mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        {
          provide: getRepositoryToken(TimeSeriesData),
          useValue: mockTimeSeriesDataRepository,
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockEquipmentRepository,
        },
        {
          provide: DataQualityService,
          useValue: mockDataQualityService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    timeSeriesDataRepository = module.get(getRepositoryToken(TimeSeriesData));
    equipmentRepository = module.get(getRepositoryToken(Equipment));
    dataQualityService = module.get(DataQualityService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 接收单条监测数据测试 ====================
  describe('接收单条监测数据 (receiveMonitoringData)', () => {
    const createDto = {
      equipmentId: 'equipment-id',
      timestamp: new Date(),
      metricType: MetricType.TEMPERATURE,
      value: 75.5,
      unit: '°C',
      quality: DataQuality.NORMAL,
      source: DataSourceEnum.SENSOR_UPLOAD,
    };

    it('应该成功接收单条监测数据', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockTimeSeriesData = createMockTimeSeriesData();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(mockTimeSeriesData);
      timeSeriesDataRepository.save.mockResolvedValue(mockTimeSeriesData);

      // Act: 执行操作
      const result = await service.receiveMonitoringData(createDto);

      // Assert: 验证结果
      expect(result).toEqual(mockTimeSeriesData);
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: createDto.equipmentId },
      });
      expect(dataQualityService.checkDataQuality).toHaveBeenCalledWith(
        createDto.metricType,
        createDto.value,
        createDto.timestamp,
        createDto.unit,
      );
      expect(timeSeriesDataRepository.save).toHaveBeenCalledWith(
        mockTimeSeriesData,
      );
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.receiveMonitoringData(createDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.receiveMonitoringData(createDto)).rejects.toThrow(
        `设备不存在: ${createDto.equipmentId}`,
      );
    });

    it('应该使用默认单位（未提供单位时）', async () => {
      // Arrange: 准备测试数据（不提供单位）
      const dtoWithoutUnit = {
        ...createDto,
        unit: undefined as any,
      };

      const mockEquipment = createMockEquipment();
      const mockTimeSeriesData = createMockTimeSeriesData({
        unit: '°C',
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(mockTimeSeriesData);
      timeSeriesDataRepository.save.mockResolvedValue(mockTimeSeriesData);

      // Act: 执行操作
      const result = await service.receiveMonitoringData(dtoWithoutUnit);

      // Assert: 验证使用了默认单位
      expect(result.unit).toBe('°C');
    });

    it('应该使用数据质量验证结果的质量等级（未提供质量标记时）', async () => {
      // Arrange: 准备测试数据（不提供质量标记）
      const dtoWithoutQuality = {
        ...createDto,
        quality: undefined as any,
      };

      const mockEquipment = createMockEquipment();
      const mockTimeSeriesData = createMockTimeSeriesData({
        quality: DataQuality.SUSPICIOUS,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.SUSPICIOUS,
        warnings: ['数值接近边界'],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(mockTimeSeriesData);
      timeSeriesDataRepository.save.mockResolvedValue(mockTimeSeriesData);

      // Act: 执行操作
      const result = await service.receiveMonitoringData(dtoWithoutQuality);

      // Assert: 验证使用了质量验证结果
      expect(result.quality).toBe(DataQuality.SUSPICIOUS);
    });

    it('应该使用默认数据来源（未提供来源时）', async () => {
      // Arrange: 准备测试数据（不提供来源）
      const dtoWithoutSource = {
        ...createDto,
        source: undefined as any,
      };

      const mockEquipment = createMockEquipment();
      const mockTimeSeriesData = createMockTimeSeriesData({
        source: DataSourceEnum.SENSOR_UPLOAD,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(mockTimeSeriesData);
      timeSeriesDataRepository.save.mockResolvedValue(mockTimeSeriesData);

      // Act: 执行操作
      const result = await service.receiveMonitoringData(dtoWithoutSource);

      // Assert: 验证使用了默认来源
      expect(result.source).toBe(DataSourceEnum.SENSOR_UPLOAD);
    });

    it('应该在保存失败时抛出错误请求异常', async () => {
      // Arrange: 模拟保存失败
      const mockEquipment = createMockEquipment();
      const mockTimeSeriesData = createMockTimeSeriesData();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(mockTimeSeriesData);
      timeSeriesDataRepository.save.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert: 执行并验证异常
      await expect(service.receiveMonitoringData(createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.receiveMonitoringData(createDto)).rejects.toThrow(
        '保存监测数据失败',
      );
    });
  });

  // ==================== 批量接收监测数据测试 ====================
  describe('批量接收监测数据 (receiveBatchMonitoringData)', () => {
    const batchDto = {
      equipmentId: 'equipment-id',
      data: [
        {
          timestamp: new Date(),
          metricType: MetricType.TEMPERATURE,
          value: 75.5,
          unit: '°C',
          quality: DataQuality.NORMAL,
        },
        {
          timestamp: new Date(),
          metricType: MetricType.PRESSURE,
          value: 2.5,
          unit: 'MPa',
          quality: DataQuality.NORMAL,
        },
      ],
    };

    it('应该成功批量接收监测数据', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockQueryRunner = (dataSource as any).createQueryRunner();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(
        createMockTimeSeriesData(),
      );
      mockQueryRunner.manager.save.mockResolvedValue(
        createMockTimeSeriesData(),
      );

      // Act: 执行操作
      const result = await service.receiveBatchMonitoringData(batchDto);

      // Assert: 验证结果
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.receiveBatchMonitoringData(batchDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.receiveBatchMonitoringData(batchDto),
      ).rejects.toThrow(`设备不存在: ${batchDto.equipmentId}`);
    });

    it('应该支持部分数据失败的情况', async () => {
      // Arrange: 准备测试数据（第二条数据会失败）
      const mockEquipment = createMockEquipment();
      const mockQueryRunner = (dataSource as any).createQueryRunner();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(
        createMockTimeSeriesData(),
      );

      // 第一条成功，第二条失败
      mockQueryRunner.manager.save
        .mockResolvedValueOnce(createMockTimeSeriesData())
        .mockRejectedValueOnce(new Error('保存失败'));

      // Act: 执行操作
      const result = await service.receiveBatchMonitoringData(batchDto);

      // Assert: 验证结果
      expect(result.totalCount).toBe(2);
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(1);
      expect(result.errors[0].reason).toBe('保存失败');
    });

    it('应该处理大批量数据（1000条）', async () => {
      // Arrange: 准备1000条测试数据
      const largeBatchDto = {
        equipmentId: 'equipment-id',
        data: Array(1000)
          .fill(null)
          .map(() => ({
            timestamp: new Date(),
            metricType: MetricType.TEMPERATURE,
            value: 75.5,
            unit: '°C',
            quality: DataQuality.NORMAL,
          })),
      };

      const mockEquipment = createMockEquipment();
      const mockQueryRunner = (dataSource as any).createQueryRunner();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(
        createMockTimeSeriesData(),
      );
      mockQueryRunner.manager.save.mockResolvedValue(
        createMockTimeSeriesData(),
      );

      // Act: 执行操作
      const result = await service.receiveBatchMonitoringData(largeBatchDto);

      // Assert: 验证结果
      expect(result.totalCount).toBe(1000);
      expect(result.successCount).toBe(1000);
      expect(result.failedCount).toBe(0);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1000);
    });

    it('应该在事务失败时回滚', async () => {
      // Arrange: 模拟事务失败
      const mockEquipment = createMockEquipment();
      const mockQueryRunner = (dataSource as any).createQueryRunner();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      mockQueryRunner.commitTransaction.mockRejectedValue(
        new Error('Transaction failed'),
      );

      // Act & Assert: 执行并验证异常
      await expect(
        service.receiveBatchMonitoringData(batchDto),
      ).rejects.toThrow(BadRequestException);

      // 验证回滚被调用
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该记录每条失败数据的索引和原因', async () => {
      // Arrange: 准备测试数据（多条数据失败）
      const mockEquipment = createMockEquipment();
      const mockQueryRunner = (dataSource as any).createQueryRunner();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      dataQualityService.checkDataQuality.mockReturnValue({
        isValid: true,
        quality: DataQuality.NORMAL,
        warnings: [],
        errors: [],
      });
      timeSeriesDataRepository.create.mockReturnValue(
        createMockTimeSeriesData(),
      );

      // 两条都失败
      mockQueryRunner.manager.save
        .mockRejectedValueOnce(new Error('第一条失败'))
        .mockRejectedValueOnce(new Error('第二条失败'));

      // Act: 执行操作
      const result = await service.receiveBatchMonitoringData(batchDto);

      // Assert: 验证错误详情
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toEqual({ index: 0, reason: '第一条失败' });
      expect(result.errors[1]).toEqual({ index: 1, reason: '第二条失败' });
    });
  });

  // ==================== 查询监测数据测试 ====================
  describe('查询时序监测数据 (queryMonitoringData)', () => {
    const queryDto = {
      equipmentId: 'equipment-id',
      metricType: MetricType.TEMPERATURE,
      startTime: Date.now() - 3600000, // 1小时前
      endTime: Date.now(),
      page: 1,
      pageSize: 100,
    };

    it('应该成功查询监测数据', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockData = [
        createMockTimeSeriesData({ id: 1 }),
        createMockTimeSeriesData({ id: 2 }),
      ];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesDataRepository.count.mockResolvedValue(2);
      timeSeriesDataRepository.find.mockResolvedValue(mockData);

      // Act: 执行操作
      const result = await service.queryMonitoringData(queryDto);

      // Assert: 验证结果
      expect(result.items).toEqual(mockData);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(100);
      expect(result.totalPages).toBe(1);
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.queryMonitoringData(queryDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.queryMonitoringData(queryDto)).rejects.toThrow(
        `设备不存在: ${queryDto.equipmentId}`,
      );
    });

    it('应该在开始时间大于等于结束时间时抛出错误请求异常', async () => {
      // Arrange: 准备无效的时间范围
      const mockEquipment = createMockEquipment();
      const invalidQueryDto = {
        ...queryDto,
        startTime: Date.now(),
        endTime: Date.now() - 3600000, // 结束时间早于开始时间
      };

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      // Act & Assert: 执行并验证异常
      await expect(
        service.queryMonitoringData(invalidQueryDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.queryMonitoringData(invalidQueryDto),
      ).rejects.toThrow('开始时间必须小于结束时间');
    });

    it('应该支持按指标类型过滤', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockData = [createMockTimeSeriesData()];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesDataRepository.count.mockResolvedValue(1);
      timeSeriesDataRepository.find.mockResolvedValue(mockData);

      // Act: 执行操作
      await service.queryMonitoringData(queryDto);

      // Assert: 验证查询条件包含指标类型
      expect(timeSeriesDataRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            metricType: MetricType.TEMPERATURE,
          }),
        }),
      );
    });

    it('应该支持不指定指标类型（查询所有指标）', async () => {
      // Arrange: 准备测试数据（不指定指标类型）
      const queryDtoWithoutMetric = {
        ...queryDto,
        metricType: undefined as any,
      };

      const mockEquipment = createMockEquipment();
      const mockData = [createMockTimeSeriesData()];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesDataRepository.count.mockResolvedValue(1);
      timeSeriesDataRepository.find.mockResolvedValue(mockData);

      // Act: 执行操作
      await service.queryMonitoringData(queryDtoWithoutMetric);

      // Assert: 验证查询条件不包含指标类型
      expect(timeSeriesDataRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            metricType: expect.anything(),
          }),
        }),
      );
    });

    it('应该按时间倒序排列数据', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockData = [createMockTimeSeriesData()];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesDataRepository.count.mockResolvedValue(1);
      timeSeriesDataRepository.find.mockResolvedValue(mockData);

      // Act: 执行操作
      await service.queryMonitoringData(queryDto);

      // Assert: 验证排序
      expect(timeSeriesDataRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { timestamp: 'DESC' },
        }),
      );
    });

    it('应该正确计算分页参数', async () => {
      // Arrange: 准备测试数据（第2页，每页50条）
      const queryDtoPage2 = {
        ...queryDto,
        page: 2,
        pageSize: 50,
      };

      const mockEquipment = createMockEquipment();
      const mockData = [createMockTimeSeriesData()];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesDataRepository.count.mockResolvedValue(150);
      timeSeriesDataRepository.find.mockResolvedValue(mockData);

      // Act: 执行操作
      const result = await service.queryMonitoringData(queryDtoPage2);

      // Assert: 验证分页计算
      expect(timeSeriesDataRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50, // (2-1) * 50
          take: 50,
        }),
      );
      expect(result.totalPages).toBe(3); // Math.ceil(150/50)
    });
  });

  // ==================== 获取数据统计测试 ====================
  describe('获取数据统计信息 (getDataStatistics)', () => {
    const equipmentId = 'equipment-id';
    const metricType = MetricType.TEMPERATURE;
    const startTime = Date.now() - 3600000;
    const endTime = Date.now();

    it('应该成功获取数据统计信息', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockStatResult = {
        count: '100',
        maxValue: '85.5',
        minValue: '65.0',
        avgValue: '75.5',
        unit: '°C',
      };

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStatResult),
      };

      timeSeriesDataRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.getDataStatistics(
        equipmentId,
        metricType,
        startTime,
        endTime,
      );

      // Assert: 验证结果
      expect(result).toEqual({
        metricType,
        count: 100,
        maxValue: 85.5,
        minValue: 65.0,
        avgValue: 75.5,
        unit: '°C',
      });
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.getDataStatistics(equipmentId, metricType, startTime, endTime),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getDataStatistics(equipmentId, metricType, startTime, endTime),
      ).rejects.toThrow(`设备不存在: ${equipmentId}`);
    });

    it('应该在开始时间大于等于结束时间时抛出错误请求异常', async () => {
      // Arrange: 准备无效的时间范围
      const mockEquipment = createMockEquipment();
      const invalidStartTime = Date.now();
      const invalidEndTime = Date.now() - 3600000;

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      // Act & Assert: 执行并验证异常
      await expect(
        service.getDataStatistics(
          equipmentId,
          metricType,
          invalidStartTime,
          invalidEndTime,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.getDataStatistics(
          equipmentId,
          metricType,
          invalidStartTime,
          invalidEndTime,
        ),
      ).rejects.toThrow('开始时间必须小于结束时间');
    });

    it('应该在没有数据时返回默认值', async () => {
      // Arrange: 准备测试数据（无数据）
      const mockEquipment = createMockEquipment();
      const mockStatResult = null;

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStatResult),
      };

      timeSeriesDataRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.getDataStatistics(
        equipmentId,
        metricType,
        startTime,
        endTime,
      );

      // Assert: 验证默认值
      expect(result).toEqual({
        metricType,
        count: 0,
        maxValue: 0,
        minValue: 0,
        avgValue: 0,
        unit: '°C',
      });
    });

    it('应该在数据数量为0时返回默认值', async () => {
      // Arrange: 准备测试数据（count为0）
      const mockEquipment = createMockEquipment();
      const mockStatResult = {
        count: '0',
        maxValue: null,
        minValue: null,
        avgValue: null,
        unit: '°C',
      };

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStatResult),
      };

      timeSeriesDataRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.getDataStatistics(
        equipmentId,
        metricType,
        startTime,
        endTime,
      );

      // Assert: 验证默认值
      expect(result).toEqual({
        metricType,
        count: 0,
        maxValue: 0,
        minValue: 0,
        avgValue: 0,
        unit: '°C',
      });
    });

    it('应该正确解析字符串格式的统计数据', async () => {
      // Arrange: 准备测试数据（数据库返回字符串格式）
      const mockEquipment = createMockEquipment();
      const mockStatResult = {
        count: '50',
        maxValue: '100.25',
        minValue: '50.75',
        avgValue: '75.123',
        unit: 'MPa',
      };

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStatResult),
      };

      timeSeriesDataRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.getDataStatistics(
        equipmentId,
        MetricType.PRESSURE,
        startTime,
        endTime,
      );

      // Assert: 验证数值转换
      expect(result.count).toBe(50);
      expect(result.maxValue).toBe(100.25);
      expect(result.minValue).toBe(50.75);
      expect(result.avgValue).toBe(75.123);
      expect(result.unit).toBe('MPa');
    });
  });
});
