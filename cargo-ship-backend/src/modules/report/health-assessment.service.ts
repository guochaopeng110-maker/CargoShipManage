/**
 * @file health-assessment.service.ts
 * @description 核心健康评估服务，已重构为依赖第三方API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ThirdPartyHealthService } from './third-party-health.service';
import { GenerateHealthReportDto } from './dto';
import { HealthReport, HealthLevel } from '../../database/entities';

/**
 * @class HealthAssessmentService
 * @description
 * 负责协调健康评估流程。
 * 它调用第三方服务获取原始健康数据，然后将结果适配为系统内部的 HealthReport 实体格式。
 */
@Injectable()
export class HealthAssessmentService {
  private readonly logger = new Logger(HealthAssessmentService.name);

  /**
   * 构造函数，注入依赖
   * @param thirdPartyHealthService 用于与外部API通信的服务
   */
  constructor(
    private readonly thirdPartyHealthService: ThirdPartyHealthService,
  ) {}

  /**
   * 执行健康评估
   * @param dto 包含设备ID和时间范围的数据传输对象
   * @returns 返回一个部分填充的 HealthReport 实体对象，不包含数据库ID和通用字段
   */
  async assess(dto: GenerateHealthReportDto): Promise<Partial<HealthReport>> {
    this.logger.log(`开始为设备 ${dto.deviceId} 执行健康评估`);

    // 1. 调用第三方服务获取健康数据
    const apiResponse = await this.thirdPartyHealthService.fetchHealthData(dto);

    // 2. 处理API可能返回的特殊情况（如无数据）
    if (apiResponse.msg && apiResponse.msg === '该时间段无数据') {
      this.logger.warn(
        `设备 ${dto.deviceId} 在指定时间段内无数据，将以0分处理`,
      );
      return this.createReportForNoData(dto);
    }

    // 3. 从API响应中提取核心评估结果
    const result = apiResponse.result?.[dto.deviceId];
    if (!result) {
      this.logger.error(
        `第三方API响应格式不正确，缺少 result for ${dto.deviceId}`,
        JSON.stringify(apiResponse),
      );
      throw new Error('第三方API响应格式不正确');
    }

    // 4. 将API数据映射到 HealthReport 实体
    const partialReport: Partial<HealthReport> = {
      healthScore: Number(result.total_score) || 0,
      healthLevel: this.mapStatusToHealthLevel(result.status),
      abnormalCount: 0, // 异常次数，新API无此数据

      // uptimeStats 存储评估时段信息和系统名称
      uptimeStats: {
        stat_time_range: result.stat_time_range,
        system_name: result.system_name,
      } as any,

      // trendAnalysis 存储完整的监测点详细数据 (point_details)
      // JSON 类型字段可灵活存储，不受 TypeScript 接口约束
      trendAnalysis: result.point_details,
      remarks: `评估基于第三方API计算结果。评估时段: ${result.stat_time_range || '未知'}`,
      // additionalNotes 保持为空，避免数据冗余
      additionalNotes: '暂无额外信息',
    };

    this.logger.log(
      `设备 ${dto.deviceId} 评估完成，健康分数: ${partialReport.healthScore}`,
    );

    return partialReport;
  }

  /**
   * 将第三方API的状态字符串映射到系统内的 HealthLevel 枚举
   * @param status API返回的状态字符串 (e.g., "优秀", "良好", "一般", "异常")
   * @returns 对应的 HealthLevel 枚举值
   */
  private mapStatusToHealthLevel(status: string): HealthLevel {
    switch (status) {
      case '优秀':
        return HealthLevel.EXCELLENT;
      case '良好':
        return HealthLevel.GOOD;
      case '一般':
        return HealthLevel.FAIR;
      case '异常':
      default:
        return HealthLevel.POOR;
    }
  }

  /**
   * 当第三方API返回“无数据”时，创建一个默认的报告对象
   * @param dto 请求参数
   * @returns 一个表示无数据的部分 HealthReport 实体
   */
  private createReportForNoData(
    dto: GenerateHealthReportDto,
  ): Partial<HealthReport> {
    return {
      healthScore: 0,
      healthLevel: HealthLevel.POOR,
      abnormalCount: 0,
      uptimeStats: undefined,
      trendAnalysis: undefined,
      remarks: '在指定的时间范围内未找到相关监测数据，无法进行评估。',
      additionalNotes: JSON.stringify({
        message: 'No data found in the specified time range.',
        request: dto,
      }),
    };
  }
}
