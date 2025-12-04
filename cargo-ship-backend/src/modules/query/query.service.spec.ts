import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QueryService } from './query.service';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';
import {
  TimeSeriesData,
  MetricType,
} from '../../database/entities/time-series-data.entity';
import {
  AlarmRecord,
  AlarmStatus,
} from '../../database/entities/alarm-record.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import { MonitoringStatisticsDto, AlarmStatisticsDto } from './dto';

/**
 * 查询统计服务单元测试
 * 测试监测数据统计、告警统计、设备状态概览等功能
 */
describe('QueryService', () => {
  let service: QueryService;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;
  let timeSeriesRepository: jest.Mocked<Repository<TimeSeriesData>>;
  let alarmRepository: jest.Mocked<Repository<AlarmRecord>>;

  /**
   * 创建模拟的设备对象
   */
  const createMockEquipment = (partial: Partial<Equipment> = {}): Equipment =>
    ({
      id: 'equipment-id',
      deviceId: 'ENG-001',
      deviceName: '主引擎',
      deviceType: '主机',
      manufacturer: '某制造商',
      model: 'Model-X',
      location: '机舱',
      status: EquipmentStatus.NORMAL,
      commissionDate: new Date('2020-01-01'),
      description: '测试设备',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    }) as Equipment;

  /**
   * 创建模拟的告警记录对象
   */
  const createMockAlarmRecord = (
    partial: Partial<AlarmRecord> = {},
  ): AlarmRecord =>
    ({
      id: 'alarm-id',
      equipmentId: 'equipment-id',
      metricType: 'temperature',
      currentValue: 95.0,
      threshold: 85.0,
      severity: AlarmSeverity.HIGH,
      status: AlarmStatus.PENDING,
      triggeredAt: new Date(),
      description: '温度过高',
      ...partial,
    }) as AlarmRecord;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TimeSeriesData),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AlarmRecord),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QueryService>(QueryService);
    equipmentRepository = module.get(getRepositoryToken(Equipment));
    timeSeriesRepository = module.get(getRepositoryToken(TimeSeriesData));
    alarmRepository = module.get(getRepositoryToken(AlarmRecord));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('getMonitoringStatistics', () => {
    it('应该成功返回监测数据统计', async () => {
      // Arrange - 准备测试数据
      const dto: MonitoringStatisticsDto = {
        equipmentId: 'equipment-id',
        metricType: MetricType.TEMPERATURE,
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockEquipment = createMockEquipment();
      const mockStatistics = {
        max: '95.5',
        min: '65.2',
        average: '80.3',
        stdDev: '5.8',
        dataPoints: '100',
      };

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStatistics),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getMonitoringStatistics(dto);

      // Assert - 验证结果
      expect(result.max).toBe(95.5);
      expect(result.min).toBe(65.2);
      expect(result.average).toBe(80.3);
      expect(result.stdDev).toBe(5.8);
      expect(result.dataPoints).toBe(100);
    });

    it('应该在设备不存在时抛出异常', async () => {
      // Arrange - 准备测试数据
      const dto: MonitoringStatisticsDto = {
        equipmentId: 'non-existent-id',
        metricType: MetricType.TEMPERATURE,
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      equipmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert - 验证抛出异常
      await expect(service.getMonitoringStatistics(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该在没有数据时返回零值', async () => {
      // Arrange - 准备测试数据
      const dto: MonitoringStatisticsDto = {
        equipmentId: 'equipment-id',
        metricType: MetricType.TEMPERATURE,
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getMonitoringStatistics(dto);

      // Assert - 验证结果
      expect(result.max).toBe(0);
      expect(result.min).toBe(0);
      expect(result.average).toBe(0);
      expect(result.stdDev).toBe(0);
      expect(result.dataPoints).toBe(0);
    });

    it('应该在数据点为零时返回零值', async () => {
      // Arrange - 准备测试数据
      const dto: MonitoringStatisticsDto = {
        equipmentId: 'equipment-id',
        metricType: MetricType.TEMPERATURE,
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ dataPoints: '0' }),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getMonitoringStatistics(dto);

      // Assert - 验证结果
      expect(result.dataPoints).toBe(0);
    });

    it('应该正确处理小数精度', async () => {
      // Arrange - 准备测试数据
      const dto: MonitoringStatisticsDto = {
        equipmentId: 'equipment-id',
        metricType: MetricType.TEMPERATURE,
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockEquipment = createMockEquipment();
      const mockStatistics = {
        max: '95.555',
        min: '65.222',
        average: '80.333',
        stdDev: '5.888',
        dataPoints: '100',
      };

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStatistics),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getMonitoringStatistics(dto);

      // Assert - 验证结果（平均值和标准差保留2位小数）
      expect(result.average).toBe(80.33);
      expect(result.stdDev).toBe(5.89);
    });
  });

  describe('getAlarmStatistics', () => {
    it('应该成功返回告警统计（所有设备）', async () => {
      // Arrange - 准备测试数据
      const dto: AlarmStatisticsDto = {
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockAlarms = [
        createMockAlarmRecord({
          severity: AlarmSeverity.LOW,
          status: AlarmStatus.PENDING,
        }),
        createMockAlarmRecord({
          severity: AlarmSeverity.MEDIUM,
          status: AlarmStatus.PROCESSING,
        }),
        createMockAlarmRecord({
          severity: AlarmSeverity.HIGH,
          status: AlarmStatus.RESOLVED,
        }),
        createMockAlarmRecord({
          severity: AlarmSeverity.CRITICAL,
          status: AlarmStatus.IGNORED,
        }),
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlarms),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getAlarmStatistics(dto);

      // Assert - 验证结果
      expect(result.totalCount).toBe(4);
      expect(result.groupBySeverity.low).toBe(1);
      expect(result.groupBySeverity.medium).toBe(1);
      expect(result.groupBySeverity.high).toBe(1);
      expect(result.groupBySeverity.critical).toBe(1);
      expect(result.groupByStatus.pending).toBe(1);
      expect(result.groupByStatus.processing).toBe(1);
      expect(result.groupByStatus.resolved).toBe(1);
      expect(result.groupByStatus.ignored).toBe(1);
    });

    it('应该成功返回指定设备的告警统计', async () => {
      // Arrange - 准备测试数据
      const dto: AlarmStatisticsDto = {
        equipmentId: 'equipment-id',
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockEquipment = createMockEquipment();
      const mockAlarms = [
        createMockAlarmRecord({
          severity: AlarmSeverity.HIGH,
          status: AlarmStatus.PENDING,
        }),
      ];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlarms),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getAlarmStatistics(dto);

      // Assert - 验证结果
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'equipment-id' },
      });
      expect(result.totalCount).toBe(1);
      expect(result.groupBySeverity.high).toBe(1);
    });

    it('应该在指定设备不存在时抛出异常', async () => {
      // Arrange - 准备测试数据
      const dto: AlarmStatisticsDto = {
        equipmentId: 'non-existent-id',
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      equipmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert - 验证抛出异常
      await expect(service.getAlarmStatistics(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该支持按严重程度筛选', async () => {
      // Arrange - 准备测试数据
      const dto: AlarmStatisticsDto = {
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
        severity: AlarmSeverity.CRITICAL,
      };

      const mockAlarms = [
        createMockAlarmRecord({
          severity: AlarmSeverity.CRITICAL,
          status: AlarmStatus.PENDING,
        }),
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlarms),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getAlarmStatistics(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.severity = :severity',
        { severity: AlarmSeverity.CRITICAL },
      );
      expect(result.totalCount).toBe(1);
      expect(result.groupBySeverity.critical).toBe(1);
    });

    it('应该在没有告警时返回零值', async () => {
      // Arrange - 准备测试数据
      const dto: AlarmStatisticsDto = {
        startTime: new Date('2024-01-01').getTime(),
        endTime: new Date('2024-01-31').getTime(),
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getAlarmStatistics(dto);

      // Assert - 验证结果
      expect(result.totalCount).toBe(0);
      expect(result.groupBySeverity.low).toBe(0);
      expect(result.groupBySeverity.medium).toBe(0);
      expect(result.groupBySeverity.high).toBe(0);
      expect(result.groupBySeverity.critical).toBe(0);
      expect(result.groupByStatus.pending).toBe(0);
      expect(result.groupByStatus.processing).toBe(0);
      expect(result.groupByStatus.resolved).toBe(0);
      expect(result.groupByStatus.ignored).toBe(0);
    });
  });

  describe('getEquipmentOverview', () => {
    it('应该成功返回设备状态概览', async () => {
      // Arrange - 准备测试数据
      equipmentRepository.count
        .mockResolvedValueOnce(100) // 总设备数
        .mockResolvedValueOnce(15); // 离线设备数

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { equipmentId: 'eq-1' },
            { equipmentId: 'eq-2' },
            { equipmentId: 'eq-3' },
          ]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getEquipmentOverview();

      // Assert - 验证结果
      expect(result.totalCount).toBe(100);
      expect(result.onlineCount).toBe(85); // 100 - 15
      expect(result.offlineCount).toBe(15);
      expect(result.abnormalCount).toBe(3); // 3个设备有未处理告警
    });

    it('应该在没有异常设备时返回零', async () => {
      // Arrange - 准备测试数据
      equipmentRepository.count
        .mockResolvedValueOnce(50) // 总设备数
        .mockResolvedValueOnce(5); // 离线设备数

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]), // 没有异常设备
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getEquipmentOverview();

      // Assert - 验证结果
      expect(result.totalCount).toBe(50);
      expect(result.onlineCount).toBe(45);
      expect(result.offlineCount).toBe(5);
      expect(result.abnormalCount).toBe(0);
    });

    it('应该在没有设备时返回零值', async () => {
      // Arrange - 准备测试数据
      equipmentRepository.count
        .mockResolvedValueOnce(0) // 总设备数
        .mockResolvedValueOnce(0); // 离线设备数

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getEquipmentOverview();

      // Assert - 验证结果
      expect(result.totalCount).toBe(0);
      expect(result.onlineCount).toBe(0);
      expect(result.offlineCount).toBe(0);
      expect(result.abnormalCount).toBe(0);
    });
  });

  describe('getEquipmentCompleteProfile', () => {
    it('应该成功返回设备完整档案', async () => {
      // Arrange - 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockAlarmStats = [
        { status: 'pending', count: '5' },
        { status: 'processing', count: '3' },
        { status: 'resolved', count: '20' },
        { status: 'ignored', count: '2' },
      ];

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesRepository.count.mockResolvedValue(150); // 最近7天有150条数据

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockAlarmStats),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getEquipmentCompleteProfile('equipment-id');

      // Assert - 验证结果
      expect(result.equipment.id).toBe('equipment-id');
      expect(result.equipment.deviceId).toBe('ENG-001');
      expect(result.monitoring.recentDataCount).toBe(150);
      expect(result.monitoring.period).toBe('最近7天');
      expect(result.alarms.pending).toBe(5);
      expect(result.alarms.processing).toBe(3);
      expect(result.alarms.resolved).toBe(20);
      expect(result.alarms.ignored).toBe(2);
      expect(result.alarms.total).toBe(30);
    });

    it('应该在设备不存在时抛出异常', async () => {
      // Arrange - 准备测试数据
      equipmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert - 验证抛出异常
      await expect(
        service.getEquipmentCompleteProfile('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该处理没有告警记录的情况', async () => {
      // Arrange - 准备测试数据
      const mockEquipment = createMockEquipment();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesRepository.count.mockResolvedValue(100);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]), // 没有告警记录
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getEquipmentCompleteProfile('equipment-id');

      // Assert - 验证结果
      expect(result.alarms.pending).toBe(0);
      expect(result.alarms.processing).toBe(0);
      expect(result.alarms.resolved).toBe(0);
      expect(result.alarms.ignored).toBe(0);
      expect(result.alarms.total).toBe(0);
    });

    it('应该处理没有监测数据的情况', async () => {
      // Arrange - 准备测试数据
      const mockEquipment = createMockEquipment();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      timeSeriesRepository.count.mockResolvedValue(0); // 没有监测数据

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.getEquipmentCompleteProfile('equipment-id');

      // Assert - 验证结果
      expect(result.monitoring.recentDataCount).toBe(0);
    });
  });
});
