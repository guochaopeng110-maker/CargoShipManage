import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThresholdConfig, Equipment } from '../../database/entities';
import {
  CreateThresholdDto,
  UpdateThresholdDto,
  QueryThresholdDto,
} from './dto';
import { RuleStatus } from '../../database/entities/threshold-config.entity';
import { EquipmentService } from '../equipment/equipment.service';

/**
 * 分页查询结果接口
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 阈值配置服务
 *
 * 提供阈值规则的CRUD操作
 * 集成监测点校验:创建/更新时自动校验监测点有效性和类型一致性
 */
@Injectable()
export class ThresholdService {
  private readonly logger = new Logger(ThresholdService.name);

  constructor(
    @InjectRepository(ThresholdConfig)
    private readonly thresholdRepository: Repository<ThresholdConfig>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    private readonly equipmentService: EquipmentService,
  ) {}

  /**
   * 创建阈值配置
   *
   * 包含监测点、故障名称、处理措施等完整信息
   * 集成监测点校验:如果提供了监测点,自动校验其有效性和类型一致性
   */
  async create(
    createDto: CreateThresholdDto,
    userId?: string,
  ): Promise<ThresholdConfig> {
    // 1. 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: createDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${createDto.equipmentId}`);
    }

    // 2. 如果提供了监测点,校验其有效性和类型一致性
    if (createDto.monitoringPoint) {
      try {
        await this.equipmentService.validateMonitoringPoint(
          createDto.equipmentId,
          createDto.monitoringPoint,
          createDto.metricType,
        );

        this.logger.debug(
          `监测点校验通过: 设备=${createDto.equipmentId}, 监测点=${createDto.monitoringPoint}, 指标类型=${createDto.metricType}`,
        );
      } catch (error) {
        // 如果监测点不存在或类型不匹配,抛出 BadRequestException
        this.logger.error(
          `监测点校验失败: 设备=${createDto.equipmentId}, 监测点=${createDto.monitoringPoint}, 错误=${error.message}`,
        );
        throw new BadRequestException(
          `监测点校验失败: ${error.message}。请确保监测点已在设备元数据中定义。`,
        );
      }
    } else {
      // 向后兼容:如果未提供监测点,记录警告
      this.logger.warn(
        `创建阈值配置时未提供监测点: 设备=${createDto.equipmentId}, 指标=${createDto.metricType}。` +
          `建议提供监测点以提高告警匹配准确性。`,
      );
    }

    // 3. 创建阈值配置（包含新增字段）
    const threshold = this.thresholdRepository.create({
      ...createDto,
      creator: userId,
      modifier: userId,
    });

    const saved = await this.thresholdRepository.save(threshold);

    // 日志中包含监测点和故障名称信息
    const logMsg = createDto.monitoringPoint
      ? `创建阈值配置成功: ${saved.id}, 设备=${createDto.equipmentId}, 监测点=${createDto.monitoringPoint}, 故障=${createDto.faultName || '未指定'}`
      : `创建阈值配置成功: ${saved.id}, 设备=${createDto.equipmentId}, 指标=${createDto.metricType}`;

    this.logger.log(logMsg);
    return saved;
  }

  /**
   * 查询阈值配置列表
   *
   * 支持按设备、指标类型、监测点、规则状态筛选
   */
  async findAll(
    queryDto: QueryThresholdDto,
  ): Promise<PaginatedResult<ThresholdConfig>> {
    const {
      equipmentId,
      metricType,
      monitoringPoint,
      ruleStatus,
      page = 1,
      pageSize = 20,
    } = queryDto;

    const queryBuilder = this.thresholdRepository
      .createQueryBuilder('threshold')
      .leftJoinAndSelect('threshold.equipment', 'equipment');

    // 构建查询条件
    if (equipmentId) {
      queryBuilder.andWhere('threshold.equipmentId = :equipmentId', {
        equipmentId,
      });
    }

    if (metricType) {
      queryBuilder.andWhere('threshold.metricType = :metricType', {
        metricType,
      });
    }

    // 新增：监测点筛选
    if (monitoringPoint) {
      queryBuilder.andWhere('threshold.monitoringPoint = :monitoringPoint', {
        monitoringPoint,
      });
    }

    if (ruleStatus) {
      queryBuilder.andWhere('threshold.ruleStatus = :ruleStatus', {
        ruleStatus,
      });
    }

    // 查询总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const items = await queryBuilder
      .orderBy('threshold.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据ID查询阈值配置
   */
  async findOne(id: string): Promise<ThresholdConfig> {
    const threshold = await this.thresholdRepository.findOne({
      where: { id },
      relations: ['equipment'],
    });

    if (!threshold) {
      throw new NotFoundException(`阈值配置不存在: ${id}`);
    }

    return threshold;
  }

  /**
   * 更新阈值配置
   *
   * 集成监测点校验:如果更新了监测点或指标类型,自动校验其有效性和一致性
   */
  async update(
    id: string,
    updateDto: UpdateThresholdDto,
    userId?: string,
  ): Promise<ThresholdConfig> {
    const threshold = await this.findOne(id);

    // 1. 如果更新了设备ID，验证设备是否存在
    if (
      updateDto.equipmentId &&
      updateDto.equipmentId !== threshold.equipmentId
    ) {
      const equipment = await this.equipmentRepository.findOne({
        where: { id: updateDto.equipmentId },
      });

      if (!equipment) {
        throw new NotFoundException(`设备不存在: ${updateDto.equipmentId}`);
      }
    }

    // 2. 如果更新了监测点或指标类型,校验监测点有效性
    const finalEquipmentId = updateDto.equipmentId || threshold.equipmentId;
    const finalMetricType = updateDto.metricType || threshold.metricType;
    const finalMonitoringPoint =
      updateDto.monitoringPoint !== undefined
        ? updateDto.monitoringPoint
        : threshold.monitoringPoint;

    // 如果最终结果包含监测点,进行校验
    if (finalMonitoringPoint) {
      // 只有在监测点或指标类型发生变化时才进行校验
      const needValidation =
        updateDto.monitoringPoint !== undefined ||
        updateDto.metricType !== undefined ||
        updateDto.equipmentId !== undefined;

      if (needValidation) {
        try {
          await this.equipmentService.validateMonitoringPoint(
            finalEquipmentId,
            finalMonitoringPoint,
            finalMetricType,
          );

          this.logger.debug(
            `监测点校验通过: 设备=${finalEquipmentId}, 监测点=${finalMonitoringPoint}, 指标类型=${finalMetricType}`,
          );
        } catch (error) {
          this.logger.error(
            `监测点校验失败: 设备=${finalEquipmentId}, 监测点=${finalMonitoringPoint}, 错误=${error.message}`,
          );
          throw new BadRequestException(
            `监测点校验失败: ${error.message}。请确保监测点已在设备元数据中定义。`,
          );
        }
      }
    }

    // 3. 更新数据
    Object.assign(threshold, updateDto);
    if (userId) {
      threshold.modifier = userId;
    }

    const saved = await this.thresholdRepository.save(threshold);
    this.logger.log(`更新阈值配置成功: ${id}`);
    return saved;
  }

  /**
   * 删除阈值配置（软删除）
   */
  async remove(id: string): Promise<void> {
    const threshold = await this.findOne(id);
    await this.thresholdRepository.softRemove(threshold);
    this.logger.log(`删除阈值配置成功: ${id}`);
  }

  /**
   * 查询设备的所有启用阈值配置
   */
  async findEnabledByEquipment(
    equipmentId: string,
  ): Promise<ThresholdConfig[]> {
    return this.thresholdRepository.find({
      where: {
        equipmentId,
        ruleStatus: RuleStatus.ENABLED,
      },
    });
  }

  /**
   * 获取设备的所有已配置监测点
   *
   * 用于前端下拉选择或自动补全
   * 注意:这些监测点来自阈值配置,可能与设备元数据中的监测点不完全一致
   *
   * @param equipmentId 设备ID
   * @param metricType 可选:仅返回指定指标类型的监测点
   * @returns 监测点名称列表(去重)
   */
  async getMonitoringPointsByEquipment(
    equipmentId: string,
    metricType?: string,
  ): Promise<string[]> {
    const queryBuilder = this.thresholdRepository
      .createQueryBuilder('threshold')
      .select('DISTINCT threshold.monitoringPoint', 'monitoringPoint')
      .where('threshold.equipmentId = :equipmentId', { equipmentId })
      .andWhere('threshold.monitoringPoint IS NOT NULL');

    // 如果指定了指标类型,添加筛选
    if (metricType) {
      queryBuilder.andWhere('threshold.metricType = :metricType', {
        metricType,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results
      .map((r) => r.monitoringPoint)
      .filter((name) => name && name.trim().length > 0);
  }
}
