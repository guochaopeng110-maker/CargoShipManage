import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Between } from 'typeorm';
import {
  HealthReport,
  ReportType,
  RiskLevel,
} from '../../database/entities/health-report.entity';
import { HealthAssessmentService } from './health-assessment.service';
import { CreateHealthReportDto } from './dto/create-health-report.dto';
import { QueryHealthReportDto } from './dto/query-health-report.dto';
import { UpdateHealthReportDto } from './dto/update-health-report.dto';
import { Equipment } from '../../database/entities/equipment.entity';

/**
 * 健康报告生成服务
 * 负责生成单设备报告和汇总报告
 */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    private readonly healthAssessmentService: HealthAssessmentService,
  ) {}

  /**
   * 生成健康报告
   * @param createDto 创建报告DTO
   * @param userId 用户ID
   * @returns 生成的报告
   */
  async generateReport(
    createDto: CreateHealthReportDto,
    userId: string,
  ): Promise<HealthReport> {
    this.logger.log(
      `用户 ${userId} 请求生成健康报告，类型：${createDto.reportType}`,
    );

    // 验证时间范围
    if (createDto.startTime >= createDto.endTime) {
      throw new BadRequestException('开始时间必须小于结束时间');
    }

    // 根据报告类型生成不同的报告
    if (createDto.reportType === ReportType.SINGLE) {
      return this.generateSingleReport(createDto, userId);
    } else {
      return this.generateAggregateReport(createDto, userId);
    }
  }

  /**
   * 生成单设备报告
   * @param createDto 创建报告DTO
   * @param userId 用户ID
   * @returns 单设备报告
   */
  private async generateSingleReport(
    createDto: CreateHealthReportDto,
    userId: string,
  ): Promise<HealthReport> {
    // 验证设备ID列表
    if (!createDto.equipmentIds || createDto.equipmentIds.length === 0) {
      throw new BadRequestException('单设备报告必须指定设备ID');
    }

    if (createDto.equipmentIds.length > 1) {
      throw new BadRequestException('单设备报告只能指定一个设备ID');
    }

    const equipmentId = createDto.equipmentIds[0];

    // 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备 ${equipmentId} 不存在`);
    }

    this.logger.debug(
      `开始生成设备 ${equipmentId} 的单设备报告，时间范围：${createDto.startTime} - ${createDto.endTime}`,
    );

    // 计算健康评分
    const healthScore = await this.healthAssessmentService.calculateHealthScore(
      equipmentId,
      createDto.startTime,
      createDto.endTime,
    );

    // 计算运行时间统计
    const uptimeStats = await this.healthAssessmentService.calculateUptimeStats(
      equipmentId,
      createDto.startTime,
      createDto.endTime,
    );

    // 统计异常次数
    const abnormalCount =
      await this.healthAssessmentService.countAbnormalEvents(
        equipmentId,
        createDto.startTime,
        createDto.endTime,
      );

    // 生成趋势分析
    const trendAnalysis =
      await this.healthAssessmentService.generateTrendAnalysis(
        equipmentId,
        createDto.startTime,
        createDto.endTime,
      );

    // 创建报告实体
    const report = this.healthReportRepository.create({
      equipmentId,
      reportType: ReportType.SINGLE,
      dataStartTime: createDto.startTime,
      dataEndTime: createDto.endTime,
      healthScore,
      uptimeStats,
      abnormalCount,
      trendAnalysis,
      generatedAt: Date.now(),
      generatedBy: userId,
    });

    // 计算健康等级
    report.healthLevel = report.calculateHealthLevel();

    // 保存报告
    const savedReport = await this.healthReportRepository.save(report);

    this.logger.log(
      `设备 ${equipmentId} 的单设备报告生成成功，ID：${savedReport.id}，健康评分：${healthScore}`,
    );

    return savedReport;
  }

  /**
   * 生成汇总报告
   * @param createDto 创建报告DTO
   * @param userId 用户ID
   * @returns 汇总报告
   */
  private async generateAggregateReport(
    createDto: CreateHealthReportDto,
    userId: string,
  ): Promise<HealthReport> {
    this.logger.debug(
      `开始生成汇总报告，时间范围：${createDto.startTime} - ${createDto.endTime}`,
    );

    // 获取要汇总的设备列表
    let equipmentIds: string[];
    if (createDto.equipmentIds && createDto.equipmentIds.length > 0) {
      equipmentIds = createDto.equipmentIds;
    } else {
      // 如果未指定设备，则汇总所有设备
      const allEquipment = await this.equipmentRepository.find({
        select: ['id'],
      });
      equipmentIds = allEquipment.map((eq) => eq.id);
    }

    if (equipmentIds.length === 0) {
      throw new BadRequestException('没有可用的设备进行汇总');
    }

    this.logger.debug(`汇总报告包含 ${equipmentIds.length} 个设备`);

    // 计算所有设备的健康评分
    const healthScores: number[] = [];
    let totalAbnormalCount = 0;
    let totalRunningDuration = 0;
    let totalDuration = 0;

    for (const equipmentId of equipmentIds) {
      const score = await this.healthAssessmentService.calculateHealthScore(
        equipmentId,
        createDto.startTime,
        createDto.endTime,
      );
      healthScores.push(score);

      const abnormalCount =
        await this.healthAssessmentService.countAbnormalEvents(
          equipmentId,
          createDto.startTime,
          createDto.endTime,
        );
      totalAbnormalCount += abnormalCount;

      const uptimeStats =
        await this.healthAssessmentService.calculateUptimeStats(
          equipmentId,
          createDto.startTime,
          createDto.endTime,
        );
      totalRunningDuration += uptimeStats.runningDuration;
      totalDuration += uptimeStats.totalDuration;
    }

    // 计算平均健康评分
    const avgHealthScore =
      healthScores.reduce((a, b) => a + b, 0) / healthScores.length;

    // 计算汇总运行时间统计
    const avgUptimeRate =
      totalDuration > 0 ? (totalRunningDuration / totalDuration) * 100 : 0;
    const uptimeStats = {
      totalDuration: totalDuration,
      runningDuration: totalRunningDuration,
      maintenanceDuration: 0, // 汇总报告不统计维护时间
      stoppedDuration: totalDuration - totalRunningDuration,
      uptimeRate: Math.round(avgUptimeRate * 100) / 100,
    };

    // 生成汇总趋势分析
    const trendAnalysis = {
      temperatureTrend: '整体稳定',
      vibrationTrend: '整体稳定',
      overallTrend:
        avgHealthScore >= 75
          ? '良好'
          : avgHealthScore >= 60
            ? '一般'
            : '需要关注',
      riskLevel:
        totalAbnormalCount === 0
          ? RiskLevel.LOW
          : totalAbnormalCount <= equipmentIds.length * 5
            ? RiskLevel.MEDIUM
            : RiskLevel.HIGH,
      suggestions: [
        `共计 ${equipmentIds.length} 个设备，平均健康评分 ${avgHealthScore.toFixed(2)}`,
        `总异常次数 ${totalAbnormalCount} 次`,
        avgHealthScore < 70 ? '部分设备健康状况需要关注' : '整体运行状况良好',
      ],
    };

    // 创建报告实体
    const report = this.healthReportRepository.create({
      reportType: ReportType.AGGREGATE,
      dataStartTime: createDto.startTime,
      dataEndTime: createDto.endTime,
      healthScore: Math.round(avgHealthScore * 100) / 100,
      uptimeStats,
      abnormalCount: totalAbnormalCount,
      trendAnalysis,
      generatedAt: Date.now(),
      generatedBy: userId,
    });

    // 计算健康等级
    report.healthLevel = report.calculateHealthLevel();

    // 保存报告
    const savedReport = await this.healthReportRepository.save(report);

    this.logger.log(
      `汇总报告生成成功，ID：${savedReport.id}，包含设备数：${equipmentIds.length}，平均健康评分：${avgHealthScore.toFixed(2)}`,
    );

    return savedReport;
  }

  /**
   * 查询报告列表
   * @param queryDto 查询DTO
   * @returns 报告列表和分页信息
   */
  async findAll(queryDto: QueryHealthReportDto) {
    const { equipmentId, reportType, startTime, endTime, page, pageSize } =
      queryDto;

    // 构建查询条件
    const where: FindOptionsWhere<HealthReport> = {};

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (reportType) {
      where.reportType = reportType;
    }

    if (startTime && endTime) {
      where.generatedAt = Between(startTime, endTime) as any;
    }

    // 执行分页查询
    const [items, total] = await this.healthReportRepository.findAndCount({
      where,
      order: { generatedAt: 'DESC' },
      skip: ((page || 1) - 1) * (pageSize || 20),
      take: pageSize || 20,
    });

    this.logger.debug(`查询报告列表，共 ${total} 条记录`);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询报告详情
   * @param id 报告ID
   * @returns 报告详情
   */
  async findOne(id: string): Promise<HealthReport> {
    const report = await this.healthReportRepository.findOne({
      where: { id },
      relations: ['equipment'],
    });

    if (!report) {
      throw new NotFoundException(`报告 ${id} 不存在`);
    }

    return report;
  }

  /**
   * 更新报告
   *
   * 注意：只允许更新备注和附加说明，不允许修改报告的核心数据（健康评分、统计数据等）
   *
   * @param id 报告ID
   * @param updateDto 更新DTO
   * @param userId 用户ID
   * @returns 更新后的报告
   */
  async update(
    id: string,
    updateDto: UpdateHealthReportDto,
    userId: string,
  ): Promise<HealthReport> {
    // 查询报告是否存在
    const report = await this.findOne(id);

    this.logger.log(`用户 ${userId} 请求更新报告 ${id}`);

    // 更新可编辑字段
    if (updateDto.remarks !== undefined) {
      report.remarks = updateDto.remarks;
    }

    if (updateDto.additionalNotes !== undefined) {
      report.additionalNotes = updateDto.additionalNotes;
    }

    // 保存更新
    const updatedReport = await this.healthReportRepository.save(report);

    this.logger.log(`报告 ${id} 更新成功`);

    return updatedReport;
  }

  /**
   * 删除报告
   *
   * 说明：物理删除报告记录
   *
   * @param id 报告ID
   * @param userId 用户ID
   * @returns 删除结果消息
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    // 查询报告是否存在
    const report = await this.findOne(id);

    this.logger.log(`用户 ${userId} 请求删除报告 ${id}`);

    // 删除报告
    await this.healthReportRepository.remove(report);

    this.logger.log(`报告 ${id} 删除成功`);

    return { message: '报告删除成功' };
  }
}
