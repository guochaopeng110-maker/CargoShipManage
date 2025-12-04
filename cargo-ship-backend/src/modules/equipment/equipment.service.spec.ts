import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EquipmentService } from './equipment.service';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';
import { AuditService } from '../auth/audit.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction } from '../../database/entities/audit-log.entity';

/**
 * 创建模拟的设备实体
 */
const createMockEquipment = (partial: Partial<Equipment> = {}): Equipment =>
  ({
    id: 'equipment-id',
    deviceId: 'ENG-001',
    deviceName: '主引擎',
    deviceType: '主机',
    model: 'ABC-1000',
    manufacturer: '某某制造商',
    location: '机舱',
    status: EquipmentStatus.NORMAL,
    commissionDate: new Date('2023-01-01'),
    description: '主引擎设备',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as any,
    isNormal: jest.fn().mockReturnValue(true),
    hasWarning: jest.fn().mockReturnValue(false),
    isFault: jest.fn().mockReturnValue(false),
    isOffline: jest.fn().mockReturnValue(false),
    isDeleted: jest.fn().mockReturnValue(false),
    ...partial,
  }) as Equipment;

describe('EquipmentService', () => {
  let service: EquipmentService;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    // 创建模拟的仓储
    const mockRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    // 创建模拟的审计服务
    const mockAuditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
    equipmentRepository = module.get(getRepositoryToken(Equipment));
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 创建设备测试 ====================
  describe('创建设备 (create)', () => {
    const createDto = {
      deviceId: 'ENG-001',
      deviceName: '主引擎',
      deviceType: '主机',
      model: 'ABC-1000',
      manufacturer: '某某制造商',
      location: '机舱',
      description: '主引擎设备',
    };

    const userId = 'user-id';

    it('应该成功创建设备', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(null as any);
      equipmentRepository.create.mockReturnValue(mockEquipment);
      equipmentRepository.save.mockResolvedValue(mockEquipment);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      const result = await service.create(createDto, userId);

      // Assert: 验证结果
      expect(result).toEqual(mockEquipment);
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { deviceId: createDto.deviceId },
        withDeleted: true,
      });
      expect(equipmentRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: EquipmentStatus.NORMAL,
      });
      expect(equipmentRepository.save).toHaveBeenCalledWith(mockEquipment);
      expect(auditService.log).toHaveBeenCalledWith({
        userId,
        action: AuditAction.CREATE,
        resource: 'equipment',
        resourceId: mockEquipment.id,
        details: `创建设备：${mockEquipment.deviceName} (${mockEquipment.deviceId})`,
      });
    });

    it('应该在设备编号已存在时抛出冲突异常', async () => {
      // Arrange: 模拟设备已存在
      const existingEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(existingEquipment);

      // Act & Assert: 执行并验证异常
      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, userId)).rejects.toThrow(
        `设备编号 ${createDto.deviceId} 已存在`,
      );
    });

    it('应该在设备编号已被软删除时抛出特定冲突异常', async () => {
      // Arrange: 模拟已删除的设备
      const deletedEquipment = createMockEquipment({
        deletedAt: new Date(),
      });
      equipmentRepository.findOne.mockResolvedValue(deletedEquipment);

      // Act & Assert: 执行并验证异常
      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto, userId)).rejects.toThrow(
        `设备编号 ${createDto.deviceId} 已存在但已被删除，请使用其他编号或恢复已删除的设备`,
      );
    });
  });

  // ==================== 查询设备列表测试 ====================
  describe('分页查询设备列表 (findAll)', () => {
    it('应该成功查询设备列表（无过滤条件）', async () => {
      // Arrange: 准备测试数据
      const mockEquipments = [
        createMockEquipment({ id: '1', deviceId: 'ENG-001' }),
        createMockEquipment({ id: '2', deviceId: 'ENG-002' }),
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockEquipments, 2]),
      };

      equipmentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert: 验证结果
      expect(result.data).toEqual(mockEquipments);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('应该支持按设备类型过滤', async () => {
      // Arrange: 准备测试数据
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      equipmentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({ deviceType: '主机', page: 1, limit: 10 });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'equipment.deviceType = :deviceType',
        { deviceType: '主机' },
      );
    });

    it('应该支持按设备状态过滤', async () => {
      // Arrange: 准备测试数据
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      equipmentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({
        status: EquipmentStatus.NORMAL,
        page: 1,
        limit: 10,
      });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'equipment.status = :status',
        { status: EquipmentStatus.NORMAL },
      );
    });

    it('应该支持关键词搜索', async () => {
      // Arrange: 准备测试数据
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      equipmentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      await service.findAll({ keyword: '主引擎', page: 1, limit: 10 });

      // Assert: 验证查询条件
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(equipment.deviceId LIKE :keyword OR equipment.deviceName LIKE :keyword)',
        { keyword: '%主引擎%' },
      );
    });

    it('应该正确计算总页数', async () => {
      // Arrange: 准备测试数据（总共25条记录，每页10条）
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 25]),
      };

      equipmentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act: 执行操作
      const result = await service.findAll({ page: 1, limit: 10 });

      // Assert: 验证总页数
      expect(result.totalPages).toBe(3); // Math.ceil(25/10) = 3
    });
  });

  // ==================== 查询单个设备测试 ====================
  describe('查询设备详情 (findOne)', () => {
    it('应该成功查询设备详情', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      // Act: 执行操作
      const result = await service.findOne('equipment-id');

      // Assert: 验证结果
      expect(result).toEqual(mockEquipment);
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'equipment-id' },
      });
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        '设备 ID non-existent-id 不存在',
      );
    });
  });

  // ==================== 根据设备编号查询测试 ====================
  describe('根据设备编号查询 (findByDeviceId)', () => {
    it('应该成功根据设备编号查询设备', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      // Act: 执行操作
      const result = await service.findByDeviceId('ENG-001');

      // Assert: 验证结果
      expect(result).toEqual(mockEquipment);
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { deviceId: 'ENG-001' },
      });
    });

    it('应该在设备编号不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.findByDeviceId('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findByDeviceId('NON-EXISTENT')).rejects.toThrow(
        '设备编号 NON-EXISTENT 不存在',
      );
    });
  });

  // ==================== 更新设备测试 ====================
  describe('更新设备信息 (update)', () => {
    const updateDto = {
      deviceName: '更新后的名称',
      location: '新位置',
    };

    it('应该成功更新设备信息', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const updatedEquipment = createMockEquipment({
        ...mockEquipment,
        ...updateDto,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      equipmentRepository.save.mockResolvedValue(updatedEquipment);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      const result = await service.update('equipment-id', updateDto, 'user-id');

      // Assert: 验证结果
      expect(result).toEqual(updatedEquipment);
      expect(equipmentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'user-id',
        action: AuditAction.UPDATE,
        resource: 'equipment',
        resourceId: 'equipment-id',
        details: expect.stringContaining('更新设备'),
      });
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.update('non-existent-id', updateDto, 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 更新设备状态测试 ====================
  describe('更新设备状态 (updateStatus)', () => {
    it('应该成功更新设备状态', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment({
        status: EquipmentStatus.NORMAL,
      });
      const updatedEquipment = createMockEquipment({
        status: EquipmentStatus.WARNING,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      equipmentRepository.save.mockResolvedValue(updatedEquipment);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      const result = await service.updateStatus(
        'equipment-id',
        EquipmentStatus.WARNING,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(EquipmentStatus.WARNING);
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'user-id',
        action: AuditAction.UPDATE,
        resource: 'equipment',
        resourceId: 'equipment-id',
        details: expect.stringContaining('normal -> warning'),
      });
    });

    it('应该支持更新为故障状态', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment({
        status: EquipmentStatus.WARNING,
      });
      const updatedEquipment = createMockEquipment({
        status: EquipmentStatus.FAULT,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      equipmentRepository.save.mockResolvedValue(updatedEquipment);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      const result = await service.updateStatus(
        'equipment-id',
        EquipmentStatus.FAULT,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(EquipmentStatus.FAULT);
    });

    it('应该支持更新为离线状态', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment({
        status: EquipmentStatus.NORMAL,
      });
      const updatedEquipment = createMockEquipment({
        status: EquipmentStatus.OFFLINE,
      });

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      equipmentRepository.save.mockResolvedValue(updatedEquipment);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      const result = await service.updateStatus(
        'equipment-id',
        EquipmentStatus.OFFLINE,
        'user-id',
      );

      // Assert: 验证结果
      expect(result.status).toBe(EquipmentStatus.OFFLINE);
    });
  });

  // ==================== 软删除设备测试 ====================
  describe('软删除设备 (remove)', () => {
    it('应该成功软删除设备', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      equipmentRepository.softDelete.mockResolvedValue(undefined as any);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      await service.remove('equipment-id', 'user-id');

      // Assert: 验证结果
      expect(equipmentRepository.softDelete).toHaveBeenCalledWith(
        'equipment-id',
      );
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'user-id',
        action: AuditAction.DELETE,
        resource: 'equipment',
        resourceId: 'equipment-id',
        details: expect.stringContaining('删除设备'),
      });
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.remove('non-existent-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 恢复已删除设备测试 ====================
  describe('恢复已删除的设备 (restore)', () => {
    it('应该成功恢复已删除的设备', async () => {
      // Arrange: 准备测试数据
      const deletedEquipment = createMockEquipment({
        deletedAt: new Date(),
      });
      const restoredEquipment = createMockEquipment({
        deletedAt: null as any,
      });

      equipmentRepository.findOne
        .mockResolvedValueOnce(deletedEquipment) // 第一次调用：查找已删除设备
        .mockResolvedValueOnce(restoredEquipment); // 第二次调用：恢复后查询
      equipmentRepository.restore.mockResolvedValue(undefined as any);
      auditService.log.mockResolvedValue(undefined as any);

      // Act: 执行操作
      const result = await service.restore('equipment-id', 'user-id');

      // Assert: 验证结果
      expect(result).toEqual(restoredEquipment);
      expect(equipmentRepository.restore).toHaveBeenCalledWith('equipment-id');
      expect(auditService.log).toHaveBeenCalledWith({
        userId: 'user-id',
        action: AuditAction.RESTORE,
        resource: 'equipment',
        resourceId: 'equipment-id',
        details: expect.stringContaining('恢复设备'),
      });
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(
        service.restore('non-existent-id', 'user-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.restore('non-existent-id', 'user-id'),
      ).rejects.toThrow('设备 ID non-existent-id 不存在');
    });

    it('应该在设备未被删除时抛出错误请求异常', async () => {
      // Arrange: 模拟设备未被删除
      const mockEquipment = createMockEquipment({
        deletedAt: null as any,
      });
      equipmentRepository.findOne.mockResolvedValue(mockEquipment);

      // Act & Assert: 执行并验证异常
      await expect(service.restore('equipment-id', 'user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.restore('equipment-id', 'user-id')).rejects.toThrow(
        '未被删除，无需恢复',
      );
    });
  });

  // ==================== 设备统计测试 ====================
  describe('获取设备统计信息 (getStatistics)', () => {
    it('应该成功获取设备统计信息', async () => {
      // Arrange: 准备测试数据
      equipmentRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(70) // normal
        .mockResolvedValueOnce(15) // warning
        .mockResolvedValueOnce(10) // fault
        .mockResolvedValueOnce(5); // offline

      // Act: 执行操作
      const result = await service.getStatistics();

      // Assert: 验证结果
      expect(result).toEqual({
        total: 100,
        normal: 70,
        warning: 15,
        fault: 10,
        offline: 5,
      });

      // 验证调用次数
      expect(equipmentRepository.count).toHaveBeenCalledTimes(5);

      // 验证每次调用的参数
      expect(equipmentRepository.count).toHaveBeenNthCalledWith(1);
      expect(equipmentRepository.count).toHaveBeenNthCalledWith(2, {
        where: { status: EquipmentStatus.NORMAL },
      });
      expect(equipmentRepository.count).toHaveBeenNthCalledWith(3, {
        where: { status: EquipmentStatus.WARNING },
      });
      expect(equipmentRepository.count).toHaveBeenNthCalledWith(4, {
        where: { status: EquipmentStatus.FAULT },
      });
      expect(equipmentRepository.count).toHaveBeenNthCalledWith(5, {
        where: { status: EquipmentStatus.OFFLINE },
      });
    });

    it('应该处理空数据库的情况', async () => {
      // Arrange: 准备测试数据（所有统计为0）
      equipmentRepository.count.mockResolvedValue(0);

      // Act: 执行操作
      const result = await service.getStatistics();

      // Assert: 验证结果
      expect(result).toEqual({
        total: 0,
        normal: 0,
        warning: 0,
        fault: 0,
        offline: 0,
      });
    });

    it('应该正确统计各状态的设备数量', async () => {
      // Arrange: 准备测试数据（只有故障设备）
      equipmentRepository.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(0) // normal
        .mockResolvedValueOnce(0) // warning
        .mockResolvedValueOnce(20) // fault
        .mockResolvedValueOnce(0); // offline

      // Act: 执行操作
      const result = await service.getStatistics();

      // Assert: 验证结果
      expect(result.total).toBe(20);
      expect(result.fault).toBe(20);
      expect(result.normal).toBe(0);
    });
  });
});
