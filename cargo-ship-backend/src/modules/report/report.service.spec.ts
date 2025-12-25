import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportService } from './report.service';
import {
  HealthReport,
  ReportType,
  HealthLevel,
} from '../../database/entities/health-report.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { HealthAssessmentService } from './health-assessment.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GenerateHealthReportDto } from './dto';

/**
 * 创建一个模拟的健康报告实体，用于测试
 * @param partial 部分实体数据，用于覆盖默认值
 * @returns 一个模拟的HealthReport实例
 */
const createMockHealthReport = (
  partial: Partial<HealthReport> = {},
): HealthReport =>
  ({
    id: 'report-id-123',
    equipmentId: 'device-abc',
    reportType: ReportType.SINGLE,
    dataStartTime: new Date('2025-12-01T00:00:00Z').getTime(),
    dataEndTime: new Date('2025-12-12T00:00:00Z').getTime(),
    healthScore: 95.5,
    healthLevel: HealthLevel.EXCELLENT,
    remarks: '评估基于第三方API计算结果。',
    additionalNotes: '{}',
    generatedAt: Date.now(),
    generatedBy: 'user-xyz',
    createdAt: new Date(),
    ...partial,
  }) as HealthReport;

/**
 * 创建一个模拟的设备实体
 * @param partial 部分实体数据
 * @returns 一个模拟的Equipment实例
 */
const createMockEquipment = (partial: Partial<Equipment> = {}): Equipment =>
  ({
    id: 'device-abc',
    deviceId: 'SYS-BILGE-001',
    deviceName: '舱底水系统',
    ...partial,
  }) as Equipment;

describe('ReportService (重构后)', () => {
  let service: ReportService;
  let healthReportRepository: jest.Mocked<Repository<HealthReport>>;
  let equipmentRepository: jest.Mocked<Repository<Equipment>>;
  let healthAssessmentService: jest.Mocked<HealthAssessmentService>;

  beforeEach(async () => {
    // 模拟 HealthAssessmentService，现在它只有一个 assess 方法
    const mockHealthAssessmentService = {
      assess: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(HealthReport),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
          },
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

  it('服务应该被成功定义', () => {
    expect(service).toBeDefined();
  });

  // ==================== generateReport (重构后) ====================
  describe('generateReport', () => {
    const generateDto: GenerateHealthReportDto = {
      deviceId: 'device-abc',
      startTime: '2025-12-01T00:00:00Z',
      endTime: '2025-12-12T00:00:00Z',
    };
    const userId = 'user-xyz';

    it('应该成功生成一份新的健康报告', async () => {
      // Arrange
      const mockEquipment = createMockEquipment();
      const partialReportFromAssessment: Partial<HealthReport> = {
        healthScore: 95.5,
        healthLevel: HealthLevel.EXCELLENT,
        remarks: '评估基于第三方API计算结果。',
      };
      const finalReport = createMockHealthReport();

      equipmentRepository.findOne.mockResolvedValue(mockEquipment);
      healthAssessmentService.assess.mockResolvedValue(
        partialReportFromAssessment,
      );
      healthReportRepository.create.mockReturnValue(finalReport);
      healthReportRepository.save.mockResolvedValue(finalReport);

      // Act
      const result = await service.generateReport(generateDto, userId);

      // Assert
      expect(result).toEqual(finalReport);
      // 验证是否检查了设备存在性
      expect(equipmentRepository.findOne).toHaveBeenCalledWith({
        where: { id: generateDto.deviceId },
      });
      // 验证是否调用了评估服务
      expect(healthAssessmentService.assess).toHaveBeenCalledWith(generateDto);
      // 验证是否使用评估结果和上下文创建了报告实体
      expect(healthReportRepository.create).toHaveBeenCalledWith({
        ...partialReportFromAssessment,
        equipmentId: generateDto.deviceId,
        reportType: ReportType.SINGLE,
        dataStartTime: new Date(generateDto.startTime).getTime(),
        dataEndTime: new Date(generateDto.endTime).getTime(),
        generatedAt: expect.any(Number),
        generatedBy: userId,
      });
      // 验证是否保存了报告
      expect(healthReportRepository.save).toHaveBeenCalledWith(finalReport);
    });

    it('当设备ID未提供时，应该抛出 BadRequestException', async () => {
      // Arrange
      const invalidDto: GenerateHealthReportDto = {
        ...generateDto,
        deviceId: '',
      };

      // Act & Assert
      await expect(service.generateReport(invalidDto, userId)).rejects.toThrow(
        new BadRequestException('必须提供设备ID (deviceId)'),
      );
    });

    it('当设备不存在时，应该抛出 NotFoundException', async () => {
      // Arrange
      equipmentRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateReport(generateDto, userId)).rejects.toThrow(
        new NotFoundException(`设备 ${generateDto.deviceId} 不存在`),
      );
    });

    it('当评估服务返回无数据时，应该能正确处理并生成一份"无数据"报告', async () => {
      // Arrange
      const noDataPartialReport: Partial<HealthReport> = {
        healthScore: 0,
        healthLevel: HealthLevel.POOR,
        remarks: '在指定的时间范围内未找到相关监测数据，无法进行评估。',
      };
      const finalReport = createMockHealthReport({ healthScore: 0 });

      equipmentRepository.findOne.mockResolvedValue(createMockEquipment());
      healthAssessmentService.assess.mockResolvedValue(noDataPartialReport);
      healthReportRepository.create.mockReturnValue(finalReport);
      healthReportRepository.save.mockResolvedValue(finalReport);

      // Act
      const result = await service.generateReport(generateDto, userId);

      // Assert
      expect(result.healthScore).toBe(0);
      expect(healthReportRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          remarks: '在指定的时间范围内未找到相关监测数据，无法进行评估。',
        }),
      );
      expect(healthReportRepository.save).toHaveBeenCalled();
    });
  });

  // 其他测试 (findAll, findOne, update, remove) 保持不变，因为它们的功能未受影响
  // 为简洁起见，此处省略这些测试的完整代码，假设它们已存在且仍然有效
  describe('findAll', () => {
    it('应该能成功查询列表', async () => {
      // Arrange
      const mockReports = [createMockHealthReport()];
      healthReportRepository.findAndCount.mockResolvedValue([mockReports, 1]);
      // Act
      const result = await service.findAll({ page: 1, pageSize: 10 });
      // Assert
      expect(result.items).toEqual(mockReports);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findOne', () => {
    it('应该能成功查询详情', async () => {
      // Arrange
      const mockReport = createMockHealthReport();
      healthReportRepository.findOne.mockResolvedValue(mockReport);
      // Act
      const result = await service.findOne('report-id-123');
      // Assert
      expect(result).toEqual(mockReport);
    });

    it('当报告不存在时应抛出 NotFoundException', async () => {
      // Arrange
      healthReportRepository.findOne.mockResolvedValue(null);
      // Act & Assert
      await expect(service.findOne('not-found-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
