import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ExportService } from './export.service';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { HealthReport } from '../../database/entities/health-report.entity';
import {
  ExportMonitoringDataDto,
  ExportAlarmsDto,
  ExportReportsDto,
  ExportFormat,
} from './dto';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import { AlarmStatus } from '../../database/entities/alarm-record.entity';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 查询模块导出服务单元测试
 * 测试监测数据、告警记录、健康报告的导出功能
 */
describe('QueryService ExportService', () => {
  let service: ExportService;
  let timeSeriesRepository: jest.Mocked<Repository<TimeSeriesData>>;
  let alarmRepository: jest.Mocked<Repository<AlarmRecord>>;
  let healthReportRepository: jest.Mocked<Repository<HealthReport>>;

  const exportDir = path.join(process.cwd(), 'exports');

  /**
   * 创建模拟的时序数据对象
   */
  const createMockTimeSeriesData = (
    partial: Partial<TimeSeriesData> = {},
  ): TimeSeriesData =>
    ({
      id: 'data-id',
      equipmentId: 'equipment-id',
      metricType: 'temperature',
      value: 75.5,
      unit: '°C',
      timestamp: new Date('2024-01-15T10:30:00'),
      createdAt: new Date(),
      ...partial,
    }) as TimeSeriesData;

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
      triggeredAt: new Date('2024-01-15T10:30:00'),
      description: '温度过高',
      ...partial,
    }) as AlarmRecord;

  /**
   * 创建模拟的健康报告对象
   */
  const createMockHealthReport = (
    partial: Partial<HealthReport> = {},
  ): HealthReport =>
    ({
      id: 'report-id',
      equipmentId: 'equipment-id',
      healthScore: 85.5,
      generatedAt: new Date('2024-01-15'),
      ...partial,
    }) as HealthReport;

  beforeEach(async () => {
    // 确保导出目录存在
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TimeSeriesData),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AlarmRecord),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(HealthReport),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    timeSeriesRepository = module.get(getRepositoryToken(TimeSeriesData));
    alarmRepository = module.get(getRepositoryToken(AlarmRecord));
    healthReportRepository = module.get(getRepositoryToken(HealthReport));
  });

  afterEach(() => {
    jest.clearAllMocks();

    // 清理测试生成的文件
    if (fs.existsSync(exportDir)) {
      const files = fs.readdirSync(exportDir);
      files.forEach((file) => {
        const filePath = path.join(exportDir, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('exportMonitoringData', () => {
    it('应该成功导出监测数据为 Excel 格式', async () => {
      // Arrange - 准备测试数据
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          equipmentId: 'equipment-id',
          metricType: 'temperature',
          startTime: new Date('2024-01-01').getTime(),
          endTime: new Date('2024-01-31').getTime(),
        },
      };

      const mockData = [
        createMockTimeSeriesData(),
        createMockTimeSeriesData({ value: 80.2, id: 'data-id-2' }),
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(result.downloadUrl).toContain('/api/export/download/');
      expect(result.downloadUrl).toContain('monitoring_data_');
      expect(result.downloadUrl).toContain('.xlsx');
      expect(result.expiresAt).toBeGreaterThan(Date.now());

      // 验证文件已生成
      const fileName = result.downloadUrl.split('/').pop();
      const filePath = path.join(exportDir, fileName!);
      expect(fs.existsSync(filePath)).toBe(true);

      // 验证Excel文件内容
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets['监测数据'];
      expect(worksheet).toBeDefined();
    });

    it('应该成功导出监测数据为 CSV 格式', async () => {
      // Arrange - 准备测试数据
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.CSV,
        queryConditions: {
          equipmentId: 'equipment-id',
        },
      };

      const mockData = [createMockTimeSeriesData()];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(result.downloadUrl).toContain('.csv');

      // 验证文件已生成
      const fileName = result.downloadUrl.split('/').pop();
      const filePath = path.join(exportDir, fileName!);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('应该支持按设备ID筛选', async () => {
      // Arrange - 准备测试数据
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          equipmentId: 'specific-equipment',
        },
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'data.equipmentId = :equipmentId',
        { equipmentId: 'specific-equipment' },
      );
    });

    it('应该支持按指标类型筛选', async () => {
      // Arrange - 准备测试数据
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          metricType: 'pressure',
        },
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'data.metricType = :metricType',
        { metricType: 'pressure' },
      );
    });

    it('应该支持按时间范围筛选', async () => {
      // Arrange - 准备测试数据
      const startTime = new Date('2024-01-01').getTime();
      const endTime = new Date('2024-01-31').getTime();
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          startTime,
          endTime,
        },
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'data.timestamp >= :startDate',
        { startDate: new Date(startTime) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'data.timestamp <= :endDate',
        { endDate: new Date(endTime) },
      );
    });

    it('应该限制导出数量为50000条', async () => {
      // Arrange - 准备测试数据
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {},
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50000);
    });

    it('应该处理空数据集', async () => {
      // Arrange - 准备测试数据
      const dto: ExportMonitoringDataDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {},
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // 空数据集
      };

      timeSeriesRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.exportMonitoringData(dto);

      // Assert - 验证结果
      expect(result.downloadUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('exportAlarms', () => {
    it('应该成功导出告警记录为 Excel 格式', async () => {
      // Arrange - 准备测试数据
      const dto: ExportAlarmsDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          equipmentId: 'equipment-id',
          severity: AlarmSeverity.HIGH,
        },
      };

      const mockData = [
        createMockAlarmRecord(),
        createMockAlarmRecord({
          id: 'alarm-id-2',
          severity: AlarmSeverity.CRITICAL,
        }),
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.exportAlarms(dto);

      // Assert - 验证结果
      expect(result.downloadUrl).toContain('/api/export/download/');
      expect(result.downloadUrl).toContain('alarm_records_');
      expect(result.downloadUrl).toContain('.xlsx');

      // 验证文件已生成
      const fileName = result.downloadUrl.split('/').pop();
      const filePath = path.join(exportDir, fileName!);
      expect(fs.existsSync(filePath)).toBe(true);

      // 验证Excel文件内容
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets['告警记录'];
      expect(worksheet).toBeDefined();
    });

    it('应该成功导出告警记录为 CSV 格式', async () => {
      // Arrange - 准备测试数据
      const dto: ExportAlarmsDto = {
        exportFormat: ExportFormat.CSV,
        queryConditions: {},
      };

      const mockData = [createMockAlarmRecord()];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.exportAlarms(dto);

      // Assert - 验证结果
      expect(result.downloadUrl).toContain('.csv');
    });

    it('应该支持按严重程度筛选', async () => {
      // Arrange - 准备测试数据
      const dto: ExportAlarmsDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          severity: AlarmSeverity.CRITICAL,
        },
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportAlarms(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.severity = :severity',
        { severity: AlarmSeverity.CRITICAL },
      );
    });

    it('应该支持按处理状态筛选', async () => {
      // Arrange - 准备测试数据
      const dto: ExportAlarmsDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {
          status: AlarmStatus.RESOLVED,
        },
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportAlarms(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'alarm.status = :status',
        { status: AlarmStatus.RESOLVED },
      );
    });

    it('应该限制导出数量为10000条', async () => {
      // Arrange - 准备测试数据
      const dto: ExportAlarmsDto = {
        exportFormat: ExportFormat.EXCEL,
        queryConditions: {},
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      alarmRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportAlarms(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10000);
    });
  });

  describe('exportReports', () => {
    it('应该成功导出健康报告', async () => {
      // Arrange - 准备测试数据
      const dto: ExportReportsDto = {
        exportFormat: ExportFormat.PDF,
        queryConditions: {
          reportId: 'report-id',
        },
      };

      const mockReports = [createMockHealthReport()];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockReports),
      };

      healthReportRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.exportReports(dto);

      // Assert - 验证结果
      expect(result.downloadUrl).toContain('/api/export/download/');
      expect(result.downloadUrl).toContain('health_reports_');
      expect(result.downloadUrl).toContain('.pdf');

      // 验证文件已生成
      const fileName = result.downloadUrl.split('/').pop();
      const filePath = path.join(exportDir, fileName!);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('应该在没有报告时抛出异常', async () => {
      // Arrange - 准备测试数据
      const dto: ExportReportsDto = {
        exportFormat: ExportFormat.PDF,
        queryConditions: {},
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]), // 没有报告
      };

      healthReportRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act & Assert - 验证抛出异常
      await expect(service.exportReports(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('应该支持按报告ID筛选', async () => {
      // Arrange - 准备测试数据
      const dto: ExportReportsDto = {
        exportFormat: ExportFormat.PDF,
        queryConditions: {
          reportId: 'specific-report-id',
        },
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([createMockHealthReport()]),
      };

      healthReportRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportReports(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'report.id = :reportId',
        { reportId: 'specific-report-id' },
      );
    });

    it('应该限制导出数量为100条', async () => {
      // Arrange - 准备测试数据
      const dto: ExportReportsDto = {
        exportFormat: ExportFormat.PDF,
        queryConditions: {},
      };

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([createMockHealthReport()]),
      };

      healthReportRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.exportReports(dto);

      // Assert - 验证结果
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('cleanupExpiredFiles', () => {
    it('应该成功清理过期文件', async () => {
      // Arrange - 准备测试数据：创建一个旧文件
      const oldFileName = 'old_file.xlsx';
      const oldFilePath = path.join(exportDir, oldFileName);
      fs.writeFileSync(oldFilePath, 'test content');

      // 修改文件的修改时间为1小时前
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      fs.utimesSync(oldFilePath, new Date(oneHourAgo), new Date(oneHourAgo));

      // Act - 执行操作
      await service.cleanupExpiredFiles();

      // Assert - 验证结果（30分钟过期，所以1小时前的文件应该被删除）
      expect(fs.existsSync(oldFilePath)).toBe(false);
    });

    it('应该保留未过期的文件', async () => {
      // Arrange - 准备测试数据：创建一个新文件
      const newFileName = 'new_file.xlsx';
      const newFilePath = path.join(exportDir, newFileName);
      fs.writeFileSync(newFilePath, 'test content');

      // Act - 执行操作
      await service.cleanupExpiredFiles();

      // Assert - 验证结果
      expect(fs.existsSync(newFilePath)).toBe(true);

      // 清理测试文件
      fs.unlinkSync(newFilePath);
    });

    it('应该处理空目录', async () => {
      // Arrange - 准备测试数据：确保目录为空
      const files = fs.readdirSync(exportDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(exportDir, file));
      });

      // Act & Assert - 不应抛出异常
      await expect(service.cleanupExpiredFiles()).resolves.not.toThrow();
    });
  });
});
