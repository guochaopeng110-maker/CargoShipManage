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
} from '../../database/entities/health-report.entity';
import { HealthAssessmentService } from './health-assessment.service';
import { GenerateHealthReportDto } from './dto';
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
   * 生成新的健康评估报告（已重构）
   *
   * @description
   * 此方法协调整个报告生成流程：
   * 1. 验证输入参数和设备是否存在。
   * 2. 调用 HealthAssessmentService 以获取基于第三方 API 的评估结果。
   * 3. 将评估结果与请求元数据（如用户ID、时间戳）合并。
   * 4. 创建并持久化一个新的 HealthReport 实体。
   *
   * @param dto 包含设备ID和时间范围的数据传输对象
   * @param userId 执行此操作的用户的ID
   * @returns {Promise<HealthReport>} 持久化后的完整健康报告实体
   * @throws {BadRequestException} 如果请求参数不合法（如缺少设备ID）
   * @throws {NotFoundException} 如果请求的设备不存在
   */
  async generateReport(
    dto: GenerateHealthReportDto,
    userId: string,
  ): Promise<HealthReport> {
    this.logger.log(`用户 ${userId} 请求为设备 ${dto.deviceId} 生成健康报告`);

    const { deviceId, startTime, endTime } = dto;

    // 步骤 1: 验证输入
    if (!deviceId) {
      throw new BadRequestException('必须提供设备ID (deviceId)');
    }
    const equipment = await this.equipmentRepository.findOne({
      where: { id: deviceId },
    });
    if (!equipment) {
      throw new NotFoundException(`设备 ${deviceId} 不存在`);
    }

    // 步骤 2: 调用核心评估服务获取评估数据
    this.logger.debug(
      `调用 HealthAssessmentService 为设备 ${deviceId} 进行评估...`,
    );

    dto.deviceId = equipment.deviceId;
    this.logger.debug('此时deviceId:' + dto.deviceId);
    const partialReport = await this.healthAssessmentService.assess(dto);

    // 步骤 3: 创建并组合完整的报告实体
    this.logger.debug(`评估完成，准备创建报告实体...`);
    const reportToSave = this.healthReportRepository.create({
      ...partialReport, // 合并来自评估服务的结果 (healthScore, healthLevel, etc.)
      equipmentId: deviceId,
      reportType: ReportType.SINGLE, // 新流程只支持单设备报告
      dataStartTime: new Date(startTime).getTime(),
      dataEndTime: new Date(endTime).getTime(),
      generatedAt: Date.now(),
      generatedBy: userId,
    });

    // 步骤 4: 持久化报告到数据库
    const savedReport = await this.healthReportRepository.save(reportToSave);

    this.logger.log(
      `成功为设备 ${deviceId} 生成并存储了新的健康报告, 报告ID: ${savedReport.id}`,
    );

    // 步骤 5: 返回已保存的报告
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
      totalPages: Math.ceil(total / (pageSize || 20)),
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
