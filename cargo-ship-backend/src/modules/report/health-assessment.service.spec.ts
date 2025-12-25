/**
 * @file health-assessment.service.spec.ts
 * @description HealthAssessmentService的单元测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthAssessmentService } from './health-assessment.service';
import { ThirdPartyHealthService } from './third-party-health.service';
import { GenerateHealthReportDto } from './dto';
import { HealthLevel } from '../../database/entities';
import { Logger } from '@nestjs/common';

describe('HealthAssessmentService (重构后)', () => {
  let service: HealthAssessmentService;
  let thirdPartyHealthService: jest.Mocked<ThirdPartyHealthService>;

  beforeEach(async () => {
    // 禁用日志输出以保持测试结果清晰
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthAssessmentService,
        {
          provide: ThirdPartyHealthService,
          useValue: {
            fetchHealthData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthAssessmentService>(HealthAssessmentService);
    thirdPartyHealthService = module.get(ThirdPartyHealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const dto: GenerateHealthReportDto = {
    deviceId: 'SYS-BILGE-001',
    startTime: '2025-12-01T00:00:00Z',
    endTime: '2025-12-12T00:00:00Z',
  };

  it('服务应该被成功定义', () => {
    expect(service).toBeDefined();
  });

  describe('assess', () => {
    it('应该成功调用第三方服务并映射数据', async () => {
      // Arrange
      const apiResponse = {
        device_id: 'SYS-BILGE-001',
        result: {
          'SYS-BILGE-001': {
            system_name: '舱底水系统',
            total_score: 95.5,
            status: '优秀',
          },
        },
      };
      thirdPartyHealthService.fetchHealthData.mockResolvedValue(apiResponse);

      // Act
      const result = await service.assess(dto);

      // Assert
      expect(thirdPartyHealthService.fetchHealthData).toHaveBeenCalledWith(dto);
      expect(result.healthScore).toBe(95.5);
      expect(result.healthLevel).toBe(HealthLevel.EXCELLENT);
      expect(result.remarks).toBe('评估基于第三方API计算结果。');
      expect(JSON.parse(result.additionalNotes)).toEqual({
        source: apiResponse,
      });
    });

    it('当API返回"无数据"时，应该返回一个默认的"无数据"报告对象', async () => {
      // Arrange
      const apiResponse = {
        msg: '该时间段无数据',
        device_id: 'SYS-BILGE-001',
      };
      thirdPartyHealthService.fetchHealthData.mockResolvedValue(apiResponse);

      // Act
      const result = await service.assess(dto);

      // Assert
      expect(result.healthScore).toBe(0);
      expect(result.healthLevel).toBe(HealthLevel.POOR);
      expect(result.remarks).toContain('未找到相关监测数据');
    });

    it('当API返回不正确的格式时，应该抛出错误', async () => {
      // Arrange
      const malformedResponse = {
        // 缺少 'result' 字段
        device_id: 'SYS-BILGE-001',
      };
      thirdPartyHealthService.fetchHealthData.mockResolvedValue(
        malformedResponse,
      );

      // Act & Assert
      await expect(service.assess(dto)).rejects.toThrow(
        '第三方API响应格式不正确',
      );
    });

    it('应该能正确映射不同的健康状态', async () => {
      // Arrange
      const testCases = [
        { status: '优秀', expectedLevel: HealthLevel.EXCELLENT },
        { status: '良好', expectedLevel: HealthLevel.GOOD },
        { status: '一般', expectedLevel: HealthLevel.FAIR },
        { status: '异常', expectedLevel: HealthLevel.POOR },
        { status: '未知状态', expectedLevel: HealthLevel.POOR },
      ];

      for (const { status, expectedLevel } of testCases) {
        thirdPartyHealthService.fetchHealthData.mockResolvedValue({
          result: {
            'SYS-BILGE-001': { total_score: 80, status },
          },
        });

        // Act
        const result = await service.assess(dto);

        // Assert
        expect(result.healthLevel).toBe(expectedLevel);
      }
    });
  });
});
