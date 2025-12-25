import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { Equipment } from '../../database/entities/equipment.entity';
import { MonitoringPoint } from '../../database/entities/monitoring-point.entity';
import { MetricType } from '../../database/entities/time-series-data.entity';
import { AuditService } from '../auth/audit.service';

/**
 * EquipmentService - 监测点相关方法单元测试
 *
 * 测试范围:
 * - getMonitoringPoints(): 获取监测点列表
 * - getMonitoringPointByName(): 根据名称获取单个监测点
 * - validateMonitoringPoint(): 验证监测点有效性
 * - validateMonitoringPointsBatch(): 批量验证监测点
 */
describe('EquipmentService - 监测点方法', () => {
  let service: EquipmentService;
  let monitoringPointRepository: Repository<MonitoringPoint>;

  // 模拟数据
  const mockEquipmentId = 'equipment-uuid-123';
  const mockMonitoringPoints: MonitoringPoint[] = [
    {
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
    },
    {
      id: 'mp-2',
      equipmentId: mockEquipmentId,
      pointName: '单体最高温度',
      metricType: MetricType.TEMPERATURE,
      unit: '℃',
      description: '单体电池最高温度',
      equipment: null,
      hasUnit: function () {
        return !!this.unit && this.unit.trim().length > 0;
      },
      getFullDescription: function () {
        return `${this.pointName}(${this.metricType})`;
      },
    },
    {
      id: 'mp-3',
      equipmentId: mockEquipmentId,
      pointName: '开关状态',
      metricType: MetricType.SWITCH,
      unit: '',
      description: '主开关状态',
      equipment: null,
      hasUnit: function () {
        return !!this.unit && this.unit.trim().length > 0;
      },
      getFullDescription: function () {
        return `${this.pointName}(${this.metricType})`;
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MonitoringPoint),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
    monitoringPointRepository = module.get<Repository<MonitoringPoint>>(
      getRepositoryToken(MonitoringPoint),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonitoringPoints()', () => {
    const mockEquipment = {
      id: mockEquipmentId,
      deviceId: 'SYS-BAT-001',
      deviceName: '电池系统#1',
    };

    it('应当成功返回监测点列表（分页）', async () => {
      // Arrange
      const queryDto = { page: 1, pageSize: 10 };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockMonitoringPoints, 3]),
      };

      jest
        .spyOn(monitoringPointRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getMonitoringPoints(
        mockEquipmentId,
        queryDto,
      );

      // Assert
      expect(result).toEqual({
        items: mockMonitoringPoints,
        total: 3,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'mp.equipmentId = :equipmentId',
        { equipmentId: mockEquipmentId },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('应当支持分页查询', async () => {
      // Arrange
      const queryDto = { page: 2, pageSize: 2 };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockMonitoringPoints[2]], 3]),
      };

      jest
        .spyOn(monitoringPointRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getMonitoringPoints(
        mockEquipmentId,
        queryDto,
      );

      // Assert
      expect(result).toEqual({
        items: [mockMonitoringPoints[2]],
        total: 3,
        page: 2,
        pageSize: 2,
        totalPages: 2,
      });
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(2);
    });

    it('应当返回空列表当设备没有监测点时', async () => {
      // Arrange
      const queryDto = { page: 1, pageSize: 10 };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      jest
        .spyOn(monitoringPointRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getMonitoringPoints(
        mockEquipmentId,
        queryDto,
      );

      // Assert
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
    });
  });

  describe('getMonitoringPointByName()', () => {
    const mockEquipment = {
      id: mockEquipmentId,
      deviceId: 'SYS-BAT-001',
      deviceName: '电池系统#1',
    };

    it('应当成功根据名称获取监测点', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'findOne')
        .mockResolvedValue(mockMonitoringPoints[0]);

      // Act
      const result = await service.getMonitoringPointByName(
        mockEquipmentId,
        '总电压',
      );

      // Assert
      expect(result).toEqual(mockMonitoringPoints[0]);
      expect(monitoringPointRepository.findOne).toHaveBeenCalledWith({
        where: {
          equipmentId: mockEquipmentId,
          pointName: '总电压',
        },
      });
    });

    it('应当返回 null 当监测点不存在时', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest.spyOn(monitoringPointRepository, 'findOne').mockResolvedValue(null);

      // Act
      const result = await service.getMonitoringPointByName(
        mockEquipmentId,
        '不存在的监测点',
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateMonitoringPoint()', () => {
    const mockEquipment = {
      id: mockEquipmentId,
      deviceId: 'SYS-BAT-001',
      deviceName: '电池系统#1',
    };

    it('应当成功验证有效的监测点', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'findOne')
        .mockResolvedValue(mockMonitoringPoints[0]);

      // Act
      const result = await service.validateMonitoringPoint(
        mockEquipmentId,
        '总电压',
        MetricType.VOLTAGE,
      );

      // Assert
      expect(result).toEqual(mockMonitoringPoints[0]);
    });

    it('应当抛出 NotFoundException 当监测点不存在时', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest.spyOn(monitoringPointRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.validateMonitoringPoint(
          mockEquipmentId,
          '不存在的监测点',
          MetricType.VOLTAGE,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('应当抛出 BadRequestException 当指标类型不匹配时', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'findOne')
        .mockResolvedValue(mockMonitoringPoints[0]); // metricType = VOLTAGE

      // Act & Assert
      await expect(
        service.validateMonitoringPoint(
          mockEquipmentId,
          '总电压',
          MetricType.TEMPERATURE, // 不匹配
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateMonitoringPoint(
          mockEquipmentId,
          '总电压',
          MetricType.TEMPERATURE,
        ),
      ).rejects.toThrow(
        `监测点 '总电压' 的指标类型应为 voltage，但收到 temperature`,
      );
    });

    it('应当允许不提供 metricType 参数', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'findOne')
        .mockResolvedValue(mockMonitoringPoints[0]);

      // Act
      const result = await service.validateMonitoringPoint(
        mockEquipmentId,
        '总电压',
      );

      // Assert
      expect(result).toEqual(mockMonitoringPoints[0]);
    });
  });

  describe('validateMonitoringPointsBatch()', () => {
    const mockEquipment = {
      id: mockEquipmentId,
      deviceId: 'SYS-BAT-001',
      deviceName: '电池系统#1',
    };

    it('应当成功批量验证所有监测点', async () => {
      // Arrange
      const pointNames = ['总电压', '单体最高温度', '开关状态'];

      // Mock findOne (被 validateMonitoringPointsBatch 内部调用)
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);

      jest
        .spyOn(monitoringPointRepository, 'find')
        .mockResolvedValue(mockMonitoringPoints);

      // Act
      const result = await service.validateMonitoringPointsBatch(
        mockEquipmentId,
        pointNames,
      );

      // Assert
      expect(result).toEqual([
        { pointName: '总电压', isValid: true },
        { pointName: '单体最高温度', isValid: true },
        { pointName: '开关状态', isValid: true },
      ]);
      expect(service.findOne).toHaveBeenCalledWith(mockEquipmentId);
      expect(monitoringPointRepository.find).toHaveBeenCalledWith({
        where: {
          equipmentId: mockEquipmentId,
        },
      });
    });

    it('应当返回 isValid=false 当部分监测点不存在时', async () => {
      // Arrange
      const pointNames = ['总电压', '不存在的监测点'];

      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'find')
        .mockResolvedValue([mockMonitoringPoints[0]]);

      // Act
      const result = await service.validateMonitoringPointsBatch(
        mockEquipmentId,
        pointNames,
      );

      // Assert
      expect(result).toEqual([
        { pointName: '总电压', isValid: true },
        { pointName: '不存在的监测点', isValid: false },
      ]);
    });

    it('应当返回空数组当没有提供监测点名称时', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'find')
        .mockResolvedValue(mockMonitoringPoints);

      // Act
      const result = await service.validateMonitoringPointsBatch(
        mockEquipmentId,
        [],
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('应当正确处理重复的监测点名称', async () => {
      // Arrange
      const pointNames = ['总电压', '总电压', '单体最高温度'];

      jest.spyOn(service, 'findOne').mockResolvedValue(mockEquipment as any);
      jest
        .spyOn(monitoringPointRepository, 'find')
        .mockResolvedValue(mockMonitoringPoints);

      // Act
      const result = await service.validateMonitoringPointsBatch(
        mockEquipmentId,
        pointNames,
      );

      // Assert
      // 返回所有请求的监测点（包括重复的）
      expect(result.length).toBe(3);
      expect(result).toEqual([
        { pointName: '总电压', isValid: true },
        { pointName: '总电压', isValid: true },
        { pointName: '单体最高温度', isValid: true },
      ]);
    });
  });
});
