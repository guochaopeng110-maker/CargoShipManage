import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlarmRecord, AlarmStatus, Equipment } from '../../database/entities';
import { QueryAlarmDto, UpdateAlarmStatusDto } from './dto';

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
 * 告警记录服务
 *
 * 提供告警记录的查询和状态更新功能
 */
@Injectable()
export class AlarmService {
  private readonly logger = new Logger(AlarmService.name);

  constructor(
    @InjectRepository(AlarmRecord)
    private readonly alarmRepository: Repository<AlarmRecord>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  /**
   * 查询告警记录列表
   */
  async findAll(
    queryDto: QueryAlarmDto,
  ): Promise<PaginatedResult<AlarmRecord>> {
    const {
      equipmentId,
      severity,
      status,
      startTime,
      endTime,
      page = 1,
      pageSize = 20,
    } = queryDto;

    const queryBuilder = this.alarmRepository
      .createQueryBuilder('alarm')
      .leftJoinAndSelect('alarm.equipment', 'equipment')
      .leftJoinAndSelect('alarm.threshold', 'threshold');

    // 构建查询条件
    if (equipmentId) {
      queryBuilder.andWhere('alarm.equipmentId = :equipmentId', {
        equipmentId,
      });
    }

    if (severity) {
      queryBuilder.andWhere('alarm.severity = :severity', { severity });
    }

    if (status) {
      queryBuilder.andWhere('alarm.status = :status', { status });
    }

    // 时间范围筛选
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    if (startTime && endTime) {
      queryBuilder.andWhere(
        'UNIX_TIMESTAMP(alarm.triggeredAt) BETWEEN :startTime AND :endTime',
        {
          startTime: Math.floor(startTime / 1000),
          endTime: Math.floor(endTime / 1000),
        },
      );
    } else if (startTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(alarm.triggeredAt) >= :startTime', {
        startTime: Math.floor(startTime / 1000),
      });
    } else if (endTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(alarm.triggeredAt) <= :endTime', {
        endTime: Math.floor(endTime / 1000),
      });
    }

    // 查询总数
    const total = await queryBuilder.getCount();

    // 分页查询
    const items = await queryBuilder
      .orderBy('alarm.triggeredAt', 'DESC')
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
   * 根据ID查询告警记录
   */
  async findOne(id: string): Promise<AlarmRecord> {
    const alarm = await this.alarmRepository.findOne({
      where: { id },
      relations: ['equipment', 'threshold'],
    });

    if (!alarm) {
      throw new NotFoundException(`告警记录不存在: ${id}`);
    }

    return alarm;
  }

  /**
   * 更新告警状态
   */
  async updateStatus(
    id: string,
    updateDto: UpdateAlarmStatusDto,
    userId?: string,
  ): Promise<AlarmRecord> {
    const alarm = await this.findOne(id);

    // 更新状态
    alarm.status = updateDto.status;

    // 更新处理说明（包括空字符串的情况）
    if (updateDto.handleNote !== undefined) {
      alarm.handleNote = updateDto.handleNote;
    }

    // 更新处理人（如果提供了userId则使用，否则保持原值）
    if (userId) {
      alarm.handler = userId;
    }

    alarm.handledAt = new Date();

    const saved = await this.alarmRepository.save(alarm);
    this.logger.log(`更新告警状态成功: ${id} -> ${updateDto.status}`);
    return saved;
  }

  /**
   * 创建告警记录
   */
  async create(alarmData: Partial<AlarmRecord>): Promise<AlarmRecord> {
    const alarm = this.alarmRepository.create(alarmData);
    const saved = await this.alarmRepository.save(alarm);
    this.logger.warn(
      `创建告警记录: 设备=${saved.equipmentId}, 严重程度=${saved.severity}`,
    );
    return saved;
  }

  /**
   * 查询设备的待处理告警数量
   */
  async countPendingByEquipment(equipmentId: string): Promise<number> {
    return this.alarmRepository.count({
      where: {
        equipmentId,
        status: AlarmStatus.PENDING,
      },
    });
  }
}
