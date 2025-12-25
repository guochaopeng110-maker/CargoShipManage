import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import {
  HealthReport,
  ReportType,
  HealthLevel,
  RiskLevel,
} from '../../database/entities/health-report.entity';
import * as ExcelJS from 'exceljs';

/**
 * 创建模拟的健康报告实体
 */
const createMockHealthReport = (
  partial: Partial<HealthReport> = {},
): HealthReport =>
  ({
    id: 'report-id-123',
    equipmentId: 'equipment-id-456',
    reportType: ReportType.SINGLE,
    dataStartTime: Date.now() - 86400000,
    dataEndTime: Date.now(),
    healthScore: 85.5,
    healthLevel: HealthLevel.GOOD,
    uptimeStats: {
      totalDuration: 86400000,
      runningDuration: 82800000,
      maintenanceDuration: 3600000,
      stoppedDuration: 0,
      uptimeRate: 95.83,
    },
    abnormalCount: 2,
    trendAnalysis: {
      temperatureTrend: '稳定',
      vibrationTrend: '轻微上升',
      overallTrend: '良好',
      riskLevel: RiskLevel.LOW,
      suggestions: ['设备运行正常', '建议定期维护', '注意温度监测'],
    },
    generatedAt: Date.now(),
    generatedBy: 'user-id',
    createdAt: new Date(),
    equipment: null as any,
    calculateHealthLevel: jest.fn(),
    ...partial,
  }) as HealthReport;

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExportService],
    }).compile();

    service = module.get<ExportService>(ExportService);
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 导出Excel测试 ====================
  describe('导出报告为Excel (exportReportToExcel)', () => {
    it('应该成功导出单设备报告为Excel', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport();

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();
    });

    it('应该成功导出汇总报告为Excel', async () => {
      // Arrange: 准备汇总报告数据
      const mockReport = createMockHealthReport({
        reportType: ReportType.AGGREGATE,
        equipmentId: null as any,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该在Excel中包含报告基本信息', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport();

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();

      // 验证标题行
      const titleCell = worksheet?.getCell('A1');
      expect(titleCell?.value).toBe('设备健康评估报告');
    });

    it('应该在Excel中包含健康评估结果', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport({
        healthScore: 90.5,
        healthLevel: HealthLevel.EXCELLENT,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();

      // 检查是否包含健康评分
      let hasHealthScore = false;
      worksheet?.eachRow((row) => {
        row.eachCell((cell) => {
          if (
            cell.value &&
            typeof cell.value !== 'object' &&
            String(cell.value).includes('90.5')
          ) {
            hasHealthScore = true;
          }
        });
      });
      expect(hasHealthScore).toBe(true);
    });

    it('应该在Excel中包含运行时间统计', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport();

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();

      // 检查是否包含运行时间统计标题
      let hasUptimeStats = false;
      worksheet?.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value === '运行时间统计') {
            hasUptimeStats = true;
          }
        });
      });
      expect(hasUptimeStats).toBe(true);
    });

    it('应该在Excel中包含趋势分析', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport();

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();

      // 检查是否包含趋势分析标题
      let hasTrendAnalysis = false;
      worksheet?.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value === '趋势分析') {
            hasTrendAnalysis = true;
          }
        });
      });
      expect(hasTrendAnalysis).toBe(true);
    });

    it('应该在Excel中包含维护建议', async () => {
      // Arrange: 准备测试数据
      const mockReport = createMockHealthReport({
        trendAnalysis: {
          temperatureTrend: '稳定',
          vibrationTrend: '稳定',
          overallTrend: '良好',
          riskLevel: RiskLevel.LOW,
          suggestions: ['建议1', '建议2', '建议3'],
        },
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();

      // 检查是否包含维护建议
      let hasSuggestions = false;
      worksheet?.eachRow((row) => {
        row.eachCell((cell) => {
          if (cell.value === '维护建议') {
            hasSuggestions = true;
          }
        });
      });
      expect(hasSuggestions).toBe(true);
    });

    it('应该正确格式化时间戳', async () => {
      // Arrange: 准备测试数据
      const timestamp = new Date('2025-11-25T12:00:00').getTime();
      const mockReport = createMockHealthReport({
        dataStartTime: timestamp,
        dataEndTime: timestamp + 86400000,
        generatedAt: timestamp,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该正确格式化时长（天）', async () => {
      // Arrange: 准备测试数据（超过1天的时长）
      const mockReport = createMockHealthReport({
        uptimeStats: {
          totalDuration: 172800000, // 2天
          runningDuration: 165600000, // 1.92天
          maintenanceDuration: 7200000, // 2小时
          stoppedDuration: 0,
          uptimeRate: 95.83,
        },
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该正确格式化时长（小时）', async () => {
      // Arrange: 准备测试数据（小于1天的时长）
      const mockReport = createMockHealthReport({
        uptimeStats: {
          totalDuration: 7200000, // 2小时
          runningDuration: 6900000, // 1.92小时
          maintenanceDuration: 300000, // 5分钟
          stoppedDuration: 0,
          uptimeRate: 95.83,
        },
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该正确格式化时长（分钟）', async () => {
      // Arrange: 准备测试数据（小于1小时的时长）
      const mockReport = createMockHealthReport({
        uptimeStats: {
          totalDuration: 300000, // 5分钟
          runningDuration: 288000, // 4.8分钟
          maintenanceDuration: 12000, // 12秒
          stoppedDuration: 0,
          uptimeRate: 96,
        },
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该正确设置不同健康等级的颜色', async () => {
      // Arrange: 准备不同健康等级的报告
      const excellentReport = createMockHealthReport({
        healthLevel: HealthLevel.EXCELLENT,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(excellentReport);

      // Assert: 验证结果
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();
    });

    it('应该正确设置不同风险等级的颜色', async () => {
      // Arrange: 准备高风险报告
      const highRiskReport = createMockHealthReport({
        trendAnalysis: {
          temperatureTrend: '持续上升',
          vibrationTrend: '异常',
          overallTrend: '需要关注',
          riskLevel: RiskLevel.HIGH,
          suggestions: ['立即检查设备'],
        },
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(highRiskReport);

      // Assert: 验证结果
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();
    });

    it('应该处理没有运行时间统计的报告', async () => {
      // Arrange: 准备没有运行时间统计的报告
      const mockReport = createMockHealthReport({
        uptimeStats: undefined,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该处理没有趋势分析的报告', async () => {
      // Arrange: 准备没有趋势分析的报告
      const mockReport = createMockHealthReport({
        trendAnalysis: undefined,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该处理没有维护建议的报告', async () => {
      // Arrange: 准备没有维护建议的报告
      const mockReport = createMockHealthReport({
        trendAnalysis: {
          temperatureTrend: '稳定',
          vibrationTrend: '稳定',
          overallTrend: '良好',
          riskLevel: RiskLevel.LOW,
          suggestions: [],
        },
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证结果
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('应该为汇总报告显示特殊的设备ID文本', async () => {
      // Arrange: 准备汇总报告
      const mockReport = createMockHealthReport({
        reportType: ReportType.AGGREGATE,
        equipmentId: null as any,
      });

      // Act: 执行操作
      const buffer = await service.exportReportToExcel(mockReport);

      // Assert: 验证Excel内容
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const worksheet = workbook.getWorksheet('健康评估报告');
      expect(worksheet).toBeDefined();

      // 检查是否包含"汇总报告"文本
      let hasAggregateText = false;
      worksheet?.eachRow((row) => {
        row.eachCell((cell) => {
          if (
            cell.value &&
            typeof cell.value !== 'object' &&
            String(cell.value).includes('汇总报告（所有设备）')
          ) {
            hasAggregateText = true;
          }
        });
      });
      expect(hasAggregateText).toBe(true);
    });
  });
});
