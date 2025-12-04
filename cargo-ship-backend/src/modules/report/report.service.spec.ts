import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportService } from './report.service';
import {
  HealthReport,
  ReportType,
  HealthLevel,
  RiskLevel,
} from '../../database/entities/health-report.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { HealthAssessmentService } from './health-assessment.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * 创建模拟的健康报告实体
 */
const createMockHealthReport = (
  partial: Partial<HealthReport> = {},
): HealthReport =>
  ({
    id: 'report-id',
    equipmentId: 'equipment-id',
    reportType: ReportType.SINGLE,
    dataStartTime: Date.now() - 86400000,
    dataEndTime: Date.now(),
    healthScore: 85.5,
    healthLevel: HealthLevel.GOOD,
    uptimeStats: {
      totalDuration: 86400,
      runningDuration: 82800,
      maintenanceDuration: 3600,
      stoppedDuration: 0,
      uptimeRate: 95.83,
    },
    abnormalCount: 2,
    trendAnalysis: {
      temperatureTrend: '稳定',
      vibrationTrend: '轻微上升',
      overallTrend: '良好',
      riskLevel: RiskLevel.LOW,
      suggestions: ['设备运行正常', '建议定期维护'],
    },
    generatedAt: Date.now(),
    generatedBy: 'user-id',
    createdAt: new Date(),
    equipment: null as any,
    calculateHealthLevel: jest.fn().mockReturnValue(HealthLevel.GOOD),
    ...partial,
  }) as HealthReport;

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

describe('ReportService', () => {
  let service: ReportService;
  let healthReportRepository: jest.Mocked<Repository<HealthReport>>;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;
  let healthAssessmentService: jest.Mocked<HealthAssessmentService>;

  beforeEach(async () => {
    // 创建模拟的仓储
    const mockHealthReportRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };

    const mockEquipmentRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    // 创建模拟的健康评估服务
    const mockHealthAssessmentService = {
      calculateHealthScore: jest.fn(),
      calculateUptimeStats: jest.fn(),
      countAbnormalEvents: jest.fn(),
      generateTrendAnalysis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(HealthReport),
          useValue: mockHealthReportRepository,
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: mockEquipmentRepository,
        },
        {
          provide: HealthAssessmentService,
          useValue: mockHealthAssessmentService,
        },
      ],
    }).compile();

    service = module.get<ReportService>(ReportService);
    healthReportRepository = module.get(getRepositoryToken(HealthReport));
    equipmentRepository = module.get(getRepositoryToken(Equipment));
    healthAssessmentService = module.get(HealthAssessmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 生成单设备报告测试 ====================
  describe('生成单设备报告 (generateReport - SINGLE)', () => {
    const createDto = {
      reportType: ReportType.SINGLE,
      equipmentIds: ['equipment-id'],
      startTime: Date.now() - 86400000,
      endTime: Date.now(),
    };

    const userId = 'user-id';

    it('应该成功生成单设备报告', async () => {
      // Arrange: 准备测试数据
      const mockEquipment = createMockEquipment();
      const mockReport = createMockHealthReport();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      healthAssessmentService.calculateHealthScore.mockResolvedValue(85.5);
      healthAssessmentService.calculateUptimeStats.mockResolvedValue({
        totalDuration: 86400,
        runningDuration: 82800,
        maintenanceDuration: 3600,
        stoppedDuration: 0,
        uptimeRate: 95.83,
      });
      healthAssessmentService.countAbnormalEvents.mockResolvedValue(2);
      healthAssessmentService.generateTrendAnalysis.mockResolvedValue({
        temperatureTrend: '稳定',
        vibrationTrend: '轻微上升',
        overallTrend: '良好',
        riskLevel: RiskLevel.LOW,
        suggestions: ['设备运行正常', '建议定期维护'],
      });
      healthReportRepository.create.mockReturnValue(mockReport);
      healthReportRepository.save.mockResolvedValue(mockReport);

      // Act: 执行操作
      const result = await service.generateReport(createDto, userId);

      // Assert: 验证结果
      expect(result).toEqual(mockReport);
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'equipment-id' },
      });
      expect(healthAssessmentService.calculateHealthScore).toHaveBeenCalledWith(
        'equipment-id',
        createDto.startTime,
        createDto.endTime,
      );
      expect(healthReportRepository.save).toHaveBeenCalledWith(mockReport);
    });

    it('应该在时间范围无效时抛出错误', async () => {
      // Arrange: 准备无效的时间范围
      const invalidDto = {
        ...createDto,
        startTime: Date.now(),
        endTime: Date.now() - 86400000, // 结束时间早于开始时间
      };

      // Act & Assert: 执行并验证异常
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        '开始时间必须小于结束时间',
      );
    });

    it('应该在未提供设备ID时抛出错误', async () => {
      // Arrange: 准备缺少设备ID的数据
      const invalidDto = {
        ...createDto,
        equipmentIds: [],
      };

      // Act & Assert: 执行并验证异常
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        '单设备报告必须指定设备ID',
      );
    });

    it('应该在提供多个设备ID时抛出错误', async () => {
      // Arrange: 准备多个设备ID
      const invalidDto = {
        ...createDto,
        equipmentIds: ['equipment-id-1', 'equipment-id-2'],
      };

      // Act & Assert: 执行并验证异常
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        '单设备报告只能指定一个设备ID',
      );
    });

    it('应该在设备不存在时抛出未找到异常', async () => {
      // Arrange: 模拟设备不存在
      equipmentRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.generateReport(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.generateReport(createDto, userId)).rejects.toThrow(
        '设备 equipment-id 不存在',
      );
    });
  });

  // ==================== 生成汇总报告测试 ====================
  describe('生成汇总报告 (generateReport - AGGREGATE)', () => {
    const createDto = {
      reportType: ReportType.AGGREGATE,
      equipmentIds: ['equipment-id-1', 'equipment-id-2'],
      startTime: Date.now() - 86400000,
      endTime: Date.now(),
    };

    const userId = 'user-id';

    it('应该成功生成汇总报告（指定设备）', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport({
        reportType: ReportType.AGGREGATE,
        equipmentId: null as any,
        healthScore: 80.5,
      });

      healthAssessmentService.calculateHealthScore
        .mockResolvedValueOnce(85.5)
        .mockResolvedValueOnce(75.5);
      healthAssessmentService.countAbnormalEvents
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3);
      healthAssessmentService.calculateUptimeStats
        .mockResolvedValueOnce({
          totalDuration: 86400,
          runningDuration: 82800,
          maintenanceDuration: 0,
          stoppedDuration: 3600,
          uptimeRate: 95.83,
        })
        .mockResolvedValueOnce({
          totalDuration: 86400,
          runningDuration: 80000,
          maintenanceDuration: 0,
          stoppedDuration: 6400,
          uptimeRate: 92.59,
        });

      healthReportRepository.create.mockReturnValue(mockReport);
      healthReportRepository.save.mockResolvedValue(mockReport);

      // Act: 执行操作
      const result = await service.generateReport(createDto, userId);

      // Assert: 验证结果
      expect(result).toEqual(mockReport);
      expect(
        healthAssessmentService.calculateHealthScore,
      ).toHaveBeenCalledTimes(2);
      expect(healthAssessmentService.countAbnormalEvents).toHaveBeenCalledTimes(
        2,
      );
      expect(healthReportRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: ReportType.AGGREGATE,
        }),
      );
    });

    it('应该成功生成汇总报告（未指定设备，汇总所有设备）', async () => {
      // Arrange: 准备测试数据（未指定设备ID）
      const createDtoAllEquipment = {
        ...createDto,
        equipmentIds: undefined,
      };

      const mockEquipments = [
        createMockEquipment({ id: 'equipment-id-1' }),
        createMockEquipment({ id: 'equipment-id-2' }),
        createMockEquipment({ id: 'equipment-id-3' }),
      ];

      const mockReport = createMockHealthReport({
        reportType: ReportType.AGGREGATE,
        equipmentId: null as any,
      });

      equipmentRepository.find.mockResolvedValue(mockEquipments);
      healthAssessmentService.calculateHealthScore.mockResolvedValue(80);
      healthAssessmentService.countAbnormalEvents.mockResolvedValue(1);
      healthAssessmentService.calculateUptimeStats.mockResolvedValue({
        totalDuration: 86400,
        runningDuration: 80000,
        maintenanceDuration: 0,
        stoppedDuration: 6400,
        uptimeRate: 92.59,
      });

      healthReportRepository.create.mockReturnValue(mockReport);
      healthReportRepository.save.mockResolvedValue(mockReport);

      // Act: 执行操作
      const result = await service.generateReport(
        createDtoAllEquipment,
        userId,
      );

      // Assert: 验证结果
      expect(result).toEqual(mockReport);
      expect(equipmentRepository.find).toHaveBeenCalledWith({
        select: ['id'],
      });
      expect(
        healthAssessmentService.calculateHealthScore,
      ).toHaveBeenCalledTimes(3);
    });

    it('应该在没有可用设备时抛出错误', async () => {
      // Arrange: 模拟没有设备
      const createDtoNoEquipment = {
        ...createDto,
        equipmentIds: undefined,
      };

      equipmentRepository.find.mockResolvedValue([]);

      // Act & Assert: 执行并验证异常
      await expect(
        service.generateReport(createDtoNoEquipment, userId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateReport(createDtoNoEquipment, userId),
      ).rejects.toThrow('没有可用的设备进行汇总');
    });

    it('应该正确计算汇总报告的平均健康评分', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport({
        reportType: ReportType.AGGREGATE,
        equipmentId: null as any,
      });

      healthAssessmentService.calculateHealthScore
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(70);
      healthAssessmentService.countAbnormalEvents.mockResolvedValue(1);
      healthAssessmentService.calculateUptimeStats.mockResolvedValue({
        totalDuration: 86400,
        runningDuration: 80000,
        maintenanceDuration: 0,
        stoppedDuration: 6400,
        uptimeRate: 92.59,
      });

      healthReportRepository.create.mockImplementation((data) => {
        // 验证平均评分是否正确计算
        expect(data.healthScore).toBe(80); // (90 + 70) / 2 = 80
        return mockReport;
      });
      healthReportRepository.save.mockResolvedValue(mockReport);

      // Act: 执行操作
      await service.generateReport(createDto, userId);

      // Assert: 验证 create 被调用
      expect(healthReportRepository.create).toHaveBeenCalled();
    });
  });

  // ==================== 查询报告列表测试 ====================
  describe('查询报告列表 (findAll)', () => {
    it('应该成功查询报告列表（无过滤条件）', async () => {
      // Arrange: 准备测试数据
      const mockReports = [
        createMockHealthReport({ id: '1' }),
        createMockHealthReport({ id: '2' }),
      ];

      healthReportRepository.findAndCount.mockResolvedValue([mockReports, 2]);

      // Act: 执行操作
      const result = await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证结果
      expect(result.items).toEqual(mockReports);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该支持按设备ID过滤', async () => {
      // Arrange: 准备测试数据
      const mockReports = [createMockHealthReport()];

      healthReportRepository.findAndCount.mockResolvedValue([mockReports, 1]);

      // Act: 执行操作
      await service.findAll({
        equipmentId: 'equipment-id',
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(healthReportRepository.findAndCount).toHaveBeenCalledWith({
        where: { equipmentId: 'equipment-id' },
        order: { generatedAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该支持按报告类型过滤', async () => {
      // Arrange: 准备测试数据
      healthReportRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act: 执行操作
      await service.findAll({
        reportType: ReportType.SINGLE,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(healthReportRepository.findAndCount).toHaveBeenCalledWith({
        where: { reportType: ReportType.SINGLE },
        order: { generatedAt: 'DESC' },
        skip: 0,
        take: 20,
      });
    });

    it('应该支持按时间范围过滤', async () => {
      // Arrange: 准备测试数据
      const startTime = Date.now() - 86400000 * 7;
      const endTime = Date.now();

      healthReportRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act: 执行操作
      await service.findAll({
        startTime,
        endTime,
        page: 1,
        pageSize: 20,
      });

      // Assert: 验证查询条件
      expect(healthReportRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            generatedAt: expect.anything(),
          }),
        }),
      );
    });

    it('应该正确计算分页参数', async () => {
      // Arrange: 准备测试数据（第2页，每页10条）
      healthReportRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act: 执行操作
      await service.findAll({ page: 2, pageSize: 10 });

      // Assert: 验证分页计算
      expect(healthReportRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (2-1) * 10
          take: 10,
        }),
      );
    });

    it('应该按生成时间倒序排列', async () => {
      // Arrange: 准备测试数据
      healthReportRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act: 执行操作
      await service.findAll({ page: 1, pageSize: 20 });

      // Assert: 验证排序
      expect(healthReportRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { generatedAt: 'DESC' },
        }),
      );
    });
  });

  // ==================== 查询报告详情测试 ====================
  describe('查询报告详情 (findOne)', () => {
    it('应该成功查询报告详情', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport();
      healthReportRepository.findOne.mockResolvedValue(mockReport);

      // Act: 执行操作
      const result = await service.findOne('report-id');

      // Assert: 验证结果
      expect(result).toEqual(mockReport);
      expect(healthReportRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-id' },
        relations: ['equipment'],
      });
    });

    it('应该在报告不存在时抛出未找到异常', async () => {
      // Arrange: 模拟报告不存在
      healthReportRepository.findOne.mockResolvedValue(null as any);

      // Act & Assert: 执行并验证异常
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        '报告 non-existent-id 不存在',
      );
    });
  });
});
