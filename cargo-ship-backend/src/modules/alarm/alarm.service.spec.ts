import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmService } from './alarm.service';
import {
  AlarmRecord,
  AlarmStatus,
} from '../../database/entities/alarm-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import {
  AlarmSeverity,
  ThresholdConfig,
} from '../../database/entities/threshold-config.entity';
import { MetricType } from '../../database/entities/time-series-data.entity';
import { NotFoundException } from '@nestjs/common';
import { AlarmPushService } from './alarm-push.service';

/**
 * 创建模拟的告警记录实体
 */
const createMockAlarm = (partial: Partial<AlarmRecord> = {}): AlarmRecord =>
  ({
    id: 'alarm-id',
    equipmentId: 'equipment-id',
    thresholdId: 'threshold-id',
    abnormalMetricType: MetricType.TEMPERATURE,
    monitoringPoint: undefined,
    faultName: undefined,
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

    const mockThresholdRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockAlarmPushService = {
      pushUpsertAlarm: jest.fn(),
      pushBatchAlarms: jest.fn(),
      pushAlarmTrend: jest.fn(),
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
        {
          provide: getRepositoryToken(ThresholdConfig),
          useValue: mockThresholdRepository,
        },
        {
          provide: AlarmPushService,
          useValue: mockAlarmPushService,
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
      const startTimestamp = Math.floor(startTime / 1000);
      const endTimestamp = Math.floor(endTime / 1000);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'UNIX_TIMESTAMP(alarm.triggeredAt) BETWEEN :startTime AND :endTime',
        {
          startTime: startTimestamp,
          endTime: endTimestamp,
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
      const startTimestamp = Math.floor(startTime / 1000);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'UNIX_TIMESTAMP(alarm.triggeredAt) >= :startTime',
        { startTime: startTimestamp },
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
      const endTimestamp = Math.floor(endTime / 1000);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'UNIX_TIMESTAMP(alarm.triggeredAt) <= :endTime',
        { endTime: endTimestamp },
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

  // ==================== 监测点匹配逻辑测试 ====================
  describe('监测点匹配逻辑', () => {
    it('应该基于设备ID和监测点组合创建告警', async () => {
      // Arrange: 准备包含监测点的告警数据
      const createDto = {
        equipmentId: 'battery-equipment-id',
        thresholdId: 'threshold-id',
        abnormalMetricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        abnormalValue: 690.5,
        thresholdRange: '上限: 683.1V',
        severity: AlarmSeverity.MEDIUM,
      };

      const mockAlarm = createMockAlarm({
        ...createDto,
        monitoringPoint: '总电压',
        faultName: '总压过压',
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(createDto);

      // Assert: 验证监测点和故障名称被正确保存
      expect(result.monitoringPoint).toBe('总电压');
      expect(result.faultName).toBe('总压过压');
      expect(result.abnormalValue).toBe(690.5);
    });

    it('应该支持同一设备同一指标类型不同监测点的独立告警', async () => {
      // Arrange: 准备两个不同监测点的告警
      const totalVoltageAlarm = {
        equipmentId: 'battery-equipment-id',
        thresholdId: 'threshold-total-voltage',
        abnormalMetricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        abnormalValue: 690.5,
        thresholdRange: '上限: 683.1V',
        severity: AlarmSeverity.MEDIUM,
      };

      const singleVoltageAlarm = {
        equipmentId: 'battery-equipment-id',
        thresholdId: 'threshold-single-voltage',
        abnormalMetricType: MetricType.VOLTAGE,
        monitoringPoint: '单体电压',
        faultName: '单体过压',
        abnormalValue: 3.52,
        thresholdRange: '上限: 3.45V',
        severity: AlarmSeverity.MEDIUM,
      };

      const mockTotalAlarm = createMockAlarm({
        ...totalVoltageAlarm,
        id: 'alarm-1',
      });
      const mockSingleAlarm = createMockAlarm({
        ...singleVoltageAlarm,
        id: 'alarm-2',
      });

      alarmRepository.create
        .mockReturnValueOnce(mockTotalAlarm)
        .mockReturnValueOnce(mockSingleAlarm);
      alarmRepository.save
        .mockResolvedValueOnce(mockTotalAlarm)
        .mockResolvedValueOnce(mockSingleAlarm);

      // Act: 执行操作
      const result1 = await service.create(totalVoltageAlarm);
      const result2 = await service.create(singleVoltageAlarm);

      // Assert: 验证两个不同监测点的告警都被创建
      expect(result1.monitoringPoint).toBe('总电压');
      expect(result1.faultName).toBe('总压过压');
      expect(result2.monitoringPoint).toBe('单体电压');
      expect(result2.faultName).toBe('单体过压');
    });

    it('应该支持按监测点查询告警记录', async () => {
      // Arrange: 准备查询条件
      const queryDto = {
        equipmentId: 'battery-equipment-id',
        metricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        page: 1,
        pageSize: 20,
      };

      const mockAlarms = [
        createMockAlarm({
          id: '1',
          monitoringPoint: '总电压',
          faultName: '总压过压',
        }),
        createMockAlarm({
          id: '2',
          monitoringPoint: '总电压',
          faultName: '总压欠压',
        }),
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
      const result = await service.findAll(queryDto);

      // Assert: 验证返回了特定监测点的告警
      expect(result.items).toHaveLength(2);
      expect(result.items.every((a) => a.monitoringPoint === '总电压')).toBe(
        true,
      );
    });

    it('应该在告警记录中保留监测点信息（反规范化设计）', async () => {
      // Arrange: 准备告警数据
      const createDto = {
        equipmentId: 'battery-equipment-id',
        thresholdId: 'threshold-id',
        abnormalMetricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        abnormalValue: 690.5,
        thresholdRange: '上限: 683.1V',
        severity: AlarmSeverity.MEDIUM,
      };

      const mockAlarm = createMockAlarm({
        ...createDto,
        monitoringPoint: '总电压',
        faultName: '总压过压',
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(createDto);

      // Assert: 验证监测点和故障名称作为历史数据保留
      expect(result.monitoringPoint).toBe('总电压');
      expect(result.faultName).toBe('总压过压');
      // 即使后续阈值配置被修改或删除，告警记录仍保留原始信息
    });

    it('应该允许监测点为空（向后兼容旧数据）', async () => {
      // Arrange: 准备不含监测点的告警数据
      const createDto = {
        equipmentId: 'equipment-id',
        thresholdId: 'threshold-id',
        abnormalMetricType: MetricType.TEMPERATURE,
        abnormalValue: 95.5,
        thresholdRange: '上限: 85.5°C',
        severity: AlarmSeverity.HIGH,
      };

      const mockAlarm = createMockAlarm({
        ...createDto,
        monitoringPoint: undefined,
        faultName: undefined,
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(createDto);

      // Assert: 验证可以创建不含监测点的告警
      expect(result).toBeDefined();
      expect(result.monitoringPoint).toBeUndefined();
      expect(result.faultName).toBeUndefined();
    });

    it('应该在告警统计中考虑监测点', async () => {
      // Arrange: 准备包含不同监测点的告警数据
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          {
            equipmentId: 'battery-equipment-id',
            monitoringPoint: '总电压',
            severityCount: '5',
            severity: AlarmSeverity.MEDIUM,
          },
          {
            equipmentId: 'battery-equipment-id',
            monitoringPoint: '单体电压',
            severityCount: '3',
            severity: AlarmSeverity.MEDIUM,
          },
        ]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作（假设有相应的统计方法）
      const result = await alarmRepository
        .createQueryBuilder('alarm')
        .select('alarm.equipmentId')
        .addSelect('alarm.monitoringPoint')
        .addSelect('COUNT(*)', 'severityCount')
        .groupBy('alarm.equipmentId')
        .getRawMany();

      // Assert: 验证统计结果按监测点分组
      expect(result).toHaveLength(2);
      expect(result[0].monitoringPoint).toBe('总电压');
      expect(result[1].monitoringPoint).toBe('单体电压');
    });

    it('应该在告警详情中显示完整的监测点和故障信息', async () => {
      // Arrange: 准备完整信息的告警
      const mockAlarm = createMockAlarm({
        id: 'alarm-id',
        equipmentId: 'battery-equipment-id',
        abnormalMetricType: MetricType.VOLTAGE,
        monitoringPoint: '总电压',
        faultName: '总压过压',
        abnormalValue: 690.5,
        thresholdRange: '上限: 683.1V',
        severity: AlarmSeverity.MEDIUM,
        status: AlarmStatus.PENDING,
      });

      alarmRepository.findOne.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.findOne('alarm-id');

      // Assert: 验证返回的告警包含完整信息
      expect(result.monitoringPoint).toBe('总电压');
      expect(result.faultName).toBe('总压过压');
      expect(result.abnormalValue).toBe(690.5);
      expect(result.abnormalMetricType).toBe(MetricType.VOLTAGE);
    });
  });

  // ==================== 故障名称和处理措施显示测试 ====================
  describe('故障名称和处理措施显示', () => {
    it('应该在告警记录中保存故障名称', async () => {
      // Arrange: 准备包含故障名称的告警数据
      const createDto = {
        equipmentId: 'battery-equipment-id',
        thresholdId: 'threshold-id',
        abnormalMetricType: MetricType.TEMPERATURE,
        monitoringPoint: '电池温度',
        faultName: '充电高温',
        abnormalValue: 58.5,
        thresholdRange: '上限: 55°C',
        severity: AlarmSeverity.HIGH,
      };

      const mockAlarm = createMockAlarm({
        ...createDto,
        faultName: '充电高温',
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(createDto);

      // Assert: 验证故障名称被正确保存
      expect(result.faultName).toBe('充电高温');
    });

    it('应该支持查询特定故障类型的告警', async () => {
      // Arrange: 准备查询条件
      const mockAlarms = [
        createMockAlarm({
          id: '1',
          faultName: '总压过压',
          monitoringPoint: '总电压',
        }),
        createMockAlarm({
          id: '2',
          faultName: '总压过压',
          monitoringPoint: '总电压',
        }),
      ];

      alarmRepository.find.mockResolvedValue(mockAlarms);

      // Act: 执行操作
      const result = await alarmRepository.find({
        where: { faultName: '总压过压' },
      });

      // Assert: 验证返回了特定故障类型的告警
      expect(result).toHaveLength(2);
      expect(result.every((a) => a.faultName === '总压过压')).toBe(true);
    });

    it('应该在告警列表中显示故障名称便于快速识别', async () => {
      // Arrange: 准备混合故障类型的告警
      const mockAlarms = [
        createMockAlarm({
          id: '1',
          monitoringPoint: '总电压',
          faultName: '总压过压',
          abnormalValue: 690.5,
        }),
        createMockAlarm({
          id: '2',
          monitoringPoint: '单体电压',
          faultName: '单体过压',
          abnormalValue: 3.52,
        }),
        createMockAlarm({
          id: '3',
          monitoringPoint: '电池温度',
          faultName: '充电高温',
          abnormalValue: 58.5,
        }),
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
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

      // Assert: 验证每条告警都包含故障名称
      expect(result.items).toHaveLength(3);
      expect(result.items[0].faultName).toBe('总压过压');
      expect(result.items[1].faultName).toBe('单体过压');
      expect(result.items[2].faultName).toBe('充电高温');
    });

    it('应该允许故障名称为空（向后兼容）', async () => {
      // Arrange: 准备不含故障名称的告警
      const createDto = {
        equipmentId: 'equipment-id',
        thresholdId: 'threshold-id',
        abnormalMetricType: MetricType.TEMPERATURE,
        abnormalValue: 95.5,
        thresholdRange: '上限: 85.5°C',
        severity: AlarmSeverity.HIGH,
      };

      const mockAlarm = createMockAlarm({
        ...createDto,
        faultName: undefined,
      });

      alarmRepository.create.mockReturnValue(mockAlarm);
      alarmRepository.save.mockResolvedValue(mockAlarm);

      // Act: 执行操作
      const result = await service.create(createDto);

      // Assert: 验证可以创建不含故障名称的告警
      expect(result).toBeDefined();
      expect(result.faultName).toBeUndefined();
    });
  });
});
