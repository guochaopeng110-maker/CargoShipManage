import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmService } from './alarm.service';
import {
  AlarmRecord,
  AlarmStatus,
} from '../../database/entities/alarm-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import { MetricType } from '../../database/entities/time-series-data.entity';
import { NotFoundException } from '@nestjs/common';

/**
 * 创建模拟的告警记录实体
 */
const createMockAlarm = (partial: Partial<AlarmRecord> = {}): AlarmRecord =>
  ({
    id: 'alarm-id',
    equipmentId: 'equipment-id',
    thresholdId: 'threshold-id',
    abnormalMetricType: MetricType.TEMPERATURE,
    abnormalValue: 95.5,
    thresholdRange: '上限: 85.5°C, 下限: 10.0°C',
    triggeredAt: new Date(),
    severity: AlarmSeverity.HIGH,
    status: AlarmStatus.PENDING,
    handler: null as any,
    handledAt: null as any,
    handleNote: null as any,
    createdAt: new Date(),
    equipment: null as any,
    threshold: null as any,
    isPending: jest.fn().mockReturnValue(true),
    isProcessing: jest.fn().mockReturnValue(false),
    isResolved: jest.fn().mockReturnValue(false),
    isIgnored: jest.fn().mockReturnValue(false),
    isCritical: jest.fn().mockReturnValue(true),
    getSeverityText: jest.fn(),
    getStatusText: jest.fn(),
    getAlarmDuration: jest.fn(),
    ...partial,
  }) as AlarmRecord;

/**
 * 创建模拟的设备实体
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createMockEquipment = (partial: Partial<Equipment> = {}): Equipment =>
  ({
    id: 'equipment-id',
    deviceId: 'ENG-001',
    deviceName: '主引擎',
    deviceType: '主机',
    ...partial,
  }) as Equipment;

describe('AlarmService', () => {
  let service: AlarmService;
  let alarmRepository: jest.Mocked<Repository<AlarmRecord>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;

  beforeEach(async () => {
    // 创建模拟的仓储
    const mockAlarmRepository = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmService,
        {
          provide: getRepositoryToken(AlarmRecord),
          useValue: mockAlarmRepository,
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockEquipmentRepository,
        },
      ],
    }).compile();

    service = module.get<AlarmService>(AlarmService);
    alarmRepository = module.get(getRepositoryToken(AlarmRecord));
    equipmentRepository = module.get(getRepositoryToken(Equipment));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 查询告警记录列表测试 ====================
  describe('查询告警记录列表 (findAll)', () => {
    it('应该成功查询告警记录列表', async () => {
      // Arrange: 准备测试数据
      const mockAlarms = [
        createMockAlarm({ id: '1' }),
        createMockAlarm({ id: '2' }),
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlarms),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证结果
      expect(result.items).toEqual(mockAlarms);
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

      alarmRepository.createQueryBuilder.mockReturnValue(
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
        'alarm.equipmentId = :equipmentId',
        { equipmentId: 'equipment-id' },
      );
    });

    it('应该支持按严重程度过滤', async () => {
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

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        severity: AlarmSeverity.CRITICAL,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.severity = :severity',
        { severity: AlarmSeverity.CRITICAL },
      );
    });

    it('应该支持按告警状态过滤', async () => {
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

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        status: AlarmStatus.PENDING,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.status = :status',
        { status: AlarmStatus.PENDING },
      );
    });

    it('应该支持按时间范围过滤（同时提供开始和结束时间）', async () => {
      // Arrange: 准备测试数据
      const startTime = Date.now() - 3600000;
      const endTime = Date.now();

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        startTime,
        endTime,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.triggeredAt BETWEEN :startDate AND :endDate',
        {
          startDate: new Date(startTime),
          endDate: new Date(endTime),
        },
      );
    });

    it('应该支持只提供开始时间', async () => {
      // Arrange: 准备测试数据
      const startTime = Date.now() - 3600000;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        startTime,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.triggeredAt >= :startDate',
        { startDate: new Date(startTime) },
      );
    });

    it('应该支持只提供结束时间', async () => {
      // Arrange: 准备测试数据
      const endTime = Date.now();

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        endTime,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.triggeredAt <= :endDate',
        { endDate: new Date(endTime) },
      );
    });

    it('应该按触发时间倒序排列告警', async () => {
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

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证排序
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'alarm.triggeredAt',
        'DESC',
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

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证总页数
      expect(result.totalPages).toBe(3); // Math.ceil(50/20) = 3
    });
  });

  // ==================== 查询单个告警记录测试 ====================
  describe('根据ID查询告警记录 (findOne)', () => {
    it('应该成功查询告警记录', async () => {
      // Arrange: 准备测试数据
      const mockAlarm = createMockAlarm();
      alarmRepository.findOne.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.findOne('alarm-id');

      // Assert: 验证结果
      expect(result).toEqual(mockAlarm);
      expect(alarmRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'alarm-id' },
        relations: ['equipment', 'threshold'],
      });
    });

    it('应该在告警记录不存在时抛出未找到异常', async () => {
      // Arrange: 模拟告警不存在
      alarmRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        '告警记录不存在: non-existent-id',
      );
    });
  });

  // ==================== 更新告警状态测试 ====================
  describe('更新告警状态 (updateStatus)', () => {
    it('应该成功更新告警状态为处理中', async () => {
      // Arrange: 准备测试数据
      const updateDto = {
        status: AlarmStatus.PROCESSING,
        handleNote: '正在处理告警',
      };

      const mockAlarm = createMockAlarm({ status: AlarmStatus.PENDING });
      const updatedAlarm = createMockAlarm({
        status: AlarmStatus.PROCESSING,
        handleNote: '正在处理告警',
        handler: 'user-id',
        handledAt: expect.any(Date),
      });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(updatedAlarm);

      // Act: 执行操作
      const result = await service.updateStatus(
        'alarm-id',
        updateDto,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(AlarmStatus.PROCESSING);
      expect(result.handleNote).toBe('正在处理告警');
      expect(result.handler).toBe('user-id');
      expect(result.handledAt).toBeDefined();
    });

    it('应该成功更新告警状态为已解决', async () => {
      // Arrange: 准备测试数据
      const updateDto = {
        status: AlarmStatus.RESOLVED,
        handleNote: '已修复设备故障',
      };

      const mockAlarm = createMockAlarm({ status: AlarmStatus.PROCESSING });
      const updatedAlarm = createMockAlarm({
        status: AlarmStatus.RESOLVED,
        handleNote: '已修复设备故障',
        handler: 'user-id',
        handledAt: expect.any(Date),
      });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(updatedAlarm);

      // Act: 执行操作
      const result = await service.updateStatus(
        'alarm-id',
        updateDto,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(AlarmStatus.RESOLVED);
      expect(result.handleNote).toBe('已修复设备故障');
    });

    it('应该成功更新告警状态为已忽略', async () => {
      // Arrange: 准备测试数据
      const updateDto = {
        status: AlarmStatus.IGNORED,
        handleNote: '误报，已忽略',
      };

      const mockAlarm = createMockAlarm({ status: AlarmStatus.PENDING });
      const updatedAlarm = createMockAlarm({
        status: AlarmStatus.IGNORED,
        handleNote: '误报，已忽略',
        handler: 'user-id',
        handledAt: expect.any(Date),
      });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(updatedAlarm);

      // Act: 执行操作
      const result = await service.updateStatus(
        'alarm-id',
        updateDto,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(AlarmStatus.IGNORED);
      expect(result.handleNote).toBe('误报，已忽略');
    });

    it('应该在告警记录不存在时抛出未找到异常', async () => {
      // Arrange: 模拟告警不存在
      const updateDto = {
        status: AlarmStatus.RESOLVED,
      };

      alarmRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.updateStatus('non-existent-id', updateDto, 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该支持不提供处理说明', async () => {
      // Arrange: 准备测试数据（不提供处理说明）
      const updateDto = {
        status: AlarmStatus.RESOLVED,
      };

      const mockAlarm = createMockAlarm({ status: AlarmStatus.PROCESSING });
      const updatedAlarm = createMockAlarm({
        status: AlarmStatus.RESOLVED,
        handler: 'user-id',
        handledAt: expect.any(Date),
      });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(updatedAlarm);

      // Act: 执行操作
      const result = await service.updateStatus(
        'alarm-id',
        updateDto,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(AlarmStatus.RESOLVED);
      expect(result.handleNote).toBeNull();
    });

    it('应该支持不提供用户ID', async () => {
      // Arrange: 准备测试数据
      const updateDto = {
        status: AlarmStatus.RESOLVED,
        handleNote: '已解决',
      };

      const mockAlarm = createMockAlarm({ status: AlarmStatus.PENDING });
      const updatedAlarm = createMockAlarm({
        status: AlarmStatus.RESOLVED,
        handleNote: '已解决',
        handledAt: expect.any(Date),
      });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(updatedAlarm);

      // Act: 执行操作（不提供用户ID）
      const result = await service.updateStatus('alarm-id', updateDto);

      // Assert: 验证结果
      expect(result.status).toBe(AlarmStatus.RESOLVED);
      expect(result.handler).toBeNull();
    });

    it('应该自动设置处理时间', async () => {
      // Arrange: 准备测试数据
      const updateDto = {
        status: AlarmStatus.RESOLVED,
      };

      const beforeUpdate = Date.now();
      const mockAlarm = createMockAlarm({ status: AlarmStatus.PENDING });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);
      alarmRepository.save.mockImplementation(async (alarm) => {
        return { ...alarm, handledAt: new Date() } as AlarmRecord;
      });

      // Act: 执行操作
      const result = await service.updateStatus(
        'alarm-id',
        updateDto,
        'user-id',
      );
      const afterUpdate = Date.now();

      // Assert: 验证处理时间
      expect(result.handledAt).toBeDefined();
      expect(result.handledAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate);
      expect(result.handledAt.getTime()).toBeLessThanOrEqual(afterUpdate);
    });
  });

  // ==================== 创建告警记录测试 ====================
  describe('创建告警记录 (create)', () => {
    it('应该成功创建告警记录', async () => {
      // Arrange: 准备测试数据
      const alarmData = {
        equipmentId: 'equipment-id',
        thresholdId: 'threshold-id',
        abnormalMetricType: MetricType.TEMPERATURE,
        abnormalValue: 95.5,
        thresholdRange: '上限: 85.5°C, 下限: 10.0°C',
        triggeredAt: new Date(),
        severity: AlarmSeverity.HIGH,
        status: AlarmStatus.PENDING,
      };

      const mockAlarm = createMockAlarm(alarmData);

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(alarmData);

      // Assert: 验证结果
      expect(result).toEqual(mockAlarm);
      expect(alarmRepository.create).toHaveBeenCalledWith(alarmData);
      expect(alarmRepository.save).toHaveBeenCalledWith(mockAlarm);
    });

    it('应该创建不同严重级别的告警（低）', async () => {
      // Arrange: 准备低严重级别的告警
      const alarmData = {
        equipmentId: 'equipment-id',
        severity: AlarmSeverity.LOW,
      };

      const mockAlarm = createMockAlarm({ severity: AlarmSeverity.LOW });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(alarmData);

      // Assert: 验证结果
      expect(result.severity).toBe(AlarmSeverity.LOW);
    });

    it('应该创建不同严重级别的告警（中）', async () => {
      // Arrange: 准备中严重级别的告警
      const alarmData = {
        equipmentId: 'equipment-id',
        severity: AlarmSeverity.MEDIUM,
      };

      const mockAlarm = createMockAlarm({ severity: AlarmSeverity.MEDIUM });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(alarmData);

      // Assert: 验证结果
      expect(result.severity).toBe(AlarmSeverity.MEDIUM);
    });

    it('应该创建不同严重级别的告警（严重）', async () => {
      // Arrange: 准备严重级别的告警
      const alarmData = {
        equipmentId: 'equipment-id',
        severity: AlarmSeverity.CRITICAL,
      };

      const mockAlarm = createMockAlarm({ severity: AlarmSeverity.CRITICAL });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(alarmData);

      // Assert: 验证结果
      expect(result.severity).toBe(AlarmSeverity.CRITICAL);
    });

    it('应该创建不同指标类型的告警（压力）', async () => {
      // Arrange: 准备压力告警
      const alarmData = {
        equipmentId: 'equipment-id',
        abnormalMetricType: MetricType.PRESSURE,
        abnormalValue: 55,
        thresholdRange: '上限: 50MPa',
        severity: AlarmSeverity.HIGH,
      };

      const mockAlarm = createMockAlarm({
        abnormalMetricType: MetricType.PRESSURE,
        abnormalValue: 55,
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(alarmData);

      // Assert: 验证结果
      expect(result.abnormalMetricType).toBe(MetricType.PRESSURE);
      expect(result.abnormalValue).toBe(55);
    });

    it('应该创建不同指标类型的告警（振动）', async () => {
      // Arrange: 准备振动告警
      const alarmData = {
        equipmentId: 'equipment-id',
        abnormalMetricType: MetricType.VIBRATION,
        abnormalValue: 105,
        thresholdRange: '上限: 100mm/s',
        severity: AlarmSeverity.CRITICAL,
      };

      const mockAlarm = createMockAlarm({
        abnormalMetricType: MetricType.VIBRATION,
        abnormalValue: 105,
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(alarmData);

      // Assert: 验证结果
      expect(result.abnormalMetricType).toBe(MetricType.VIBRATION);
      expect(result.abnormalValue).toBe(105);
    });
  });

  // ==================== 查询待处理告警数量测试 ====================
  describe('查询设备的待处理告警数量 (countPendingByEquipment)', () => {
    it('应该成功查询待处理告警数量', async () => {
      // Arrange: 准备测试数据
      alarmRepository.count.mockResolvedValue(5);

      // Act: 执行操作
      const result = await service.countPendingByEquipment('equipment-id');

      // Assert: 验证结果
      expect(result).toBe(5);
      expect(alarmRepository.count).toHaveBeenCalledWith({
        where: {
          equipmentId: 'equipment-id',
          status: AlarmStatus.PENDING,
        },
      });
    });

    it('应该返回0（设备无待处理告警）', async () => {
      // Arrange: 模拟无待处理告警
      alarmRepository.count.mockResolvedValue(0);

      // Act: 执行操作
      const result = await service.countPendingByEquipment('equipment-id');

      // Assert: 验证结果
      expect(result).toBe(0);
    });

    it('应该只统计待处理状态的告警', async () => {
      // Arrange: 准备测试数据
      alarmRepository.count.mockResolvedValue(3);

      // Act: 执行操作
      await service.countPendingByEquipment('equipment-id');

      // Assert: 验证查询条件（只查询PENDING状态）
      expect(alarmRepository.count).toHaveBeenCalledWith({
        where: {
          equipmentId: 'equipment-id',
          status: AlarmStatus.PENDING,
        },
      });
    });
  });
});
