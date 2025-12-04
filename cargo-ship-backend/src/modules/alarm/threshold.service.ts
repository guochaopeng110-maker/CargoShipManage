import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThresholdConfig, Equipment } from '../../database/entities';
import {
  CreateThresholdDto,
  UpdateThresholdDto,
  QueryThresholdDto,
} from './dto';
import { RuleStatus } from '../../database/entities/threshold-config.entity';

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
 */
@Injectable()
export class ThresholdService {
  private readonly logger = new Logger(ThresholdService.name);

  constructor(
    @InjectRepository(ThresholdConfig)
    private readonly thresholdRepository: Repository<ThresholdConfig>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  /**
   * 创建阈值配置
   */
  async create(
    createDto: CreateThresholdDto,
    userId?: string,
  ): Promise<ThresholdConfig> {
    // 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: createDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${createDto.equipmentId}`);
    }

    // 创建阈值配置
    const threshold = this.thresholdRepository.create({
      ...createDto,
      creator: userId,
      modifier: userId,
    });

    const saved = await this.thresholdRepository.save(threshold);
    this.logger.log(`创建阈值配置成功: ${saved.id}`);
    return saved;
  }

  /**
   * 查询阈值配置列表
   */
  async findAll(
    queryDto: QueryThresholdDto,
  ): Promise<PaginatedResult<ThresholdConfig>> {
    const {
      equipmentId,
      metricType,
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
   */
  async update(
    id: string,
    updateDto: UpdateThresholdDto,
    userId?: string,
  ): Promise<ThresholdConfig> {
    const threshold = await this.findOne(id);

    // 如果更新了设备ID，验证设备是否存在
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

    // 更新数据
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
}
