import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AlarmRecord,
  AlarmStatus,
  Equipment,
  ThresholdConfig,
} from '../../database/entities';
import { QueryAlarmDto, UpdateAlarmStatusDto } from './dto';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { RuleStatus } from '../../database/entities/threshold-config.entity';
import { AlarmPushService } from './alarm-push.service';

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
 * 提供告警记录的查询、状态更新和告警评估触发功能
 */
@Injectable()
export class AlarmService {
  private readonly logger = new Logger(AlarmService.name);

  constructor(
    @InjectRepository(AlarmRecord)
    private readonly alarmRepository: Repository<AlarmRecord>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(ThresholdConfig)
    private readonly thresholdRepository: Repository<ThresholdConfig>,
    private readonly alarmPushService: AlarmPushService,
  ) {}

  /**
   * 查询告警记录列表
   *
   * 支持按设备、严重程度、状态、监测点、时间范围筛选
   */
  async findAll(
    queryDto: QueryAlarmDto,
  ): Promise<PaginatedResult<AlarmRecord>> {
    const {
      equipmentId,
      monitoringPoint,
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

    // 新增：监测点筛选
    if (monitoringPoint) {
      queryBuilder.andWhere('alarm.monitoringPoint = :monitoringPoint', {
        monitoringPoint,
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

    // 推送告警状态更新
    await this.alarmPushService.pushUpsertAlarm(saved);

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

  /**
   * 评估时序数据是否触发告警
   *
   * 核心逻辑:
   * 1. 根据 (equipmentId, metricType, monitoringPoint) 三元组精确匹配阈值规则
   * 2. 检查数据值是否超过阈值上限或下限
   * 3. 如果触发,创建告警记录并包含故障名称和处理措施(反规范化)
   *
   * @param data 时序监测数据
   * @returns 触发的告警记录数组(可能为空)
   */
  async evaluateThresholds(data: TimeSeriesData): Promise<AlarmRecord[]> {
    const triggeredAlarms: AlarmRecord[] = [];

    try {
      // 1. 查询该设备的所有启用阈值配置
      // 关键点: 同时匹配 metricType 和 monitoringPoint
      const queryBuilder = this.thresholdRepository
        .createQueryBuilder('threshold')
        .where('threshold.equipmentId = :equipmentId', {
          equipmentId: data.equipmentId,
        })
        .andWhere('threshold.metricType = :metricType', {
          metricType: data.metricType,
        })
        .andWhere('threshold.ruleStatus = :ruleStatus', {
          ruleStatus: RuleStatus.ENABLED,
        });

      // 如果时序数据包含监测点,则精确匹配
      if (data.monitoringPoint) {
        queryBuilder.andWhere('threshold.monitoringPoint = :monitoringPoint', {
          monitoringPoint: data.monitoringPoint,
        });
      } else {
        // 如果时序数据没有监测点,则只匹配没有监测点的阈值规则
        queryBuilder.andWhere('threshold.monitoringPoint IS NULL');
      }

      const thresholds = await queryBuilder.getMany();

      if (thresholds.length === 0) {
        // 没有匹配的阈值规则,不触发告警
        return triggeredAlarms;
      }

      // 2. 检查每个阈值规则
      for (const threshold of thresholds) {
        // 检查值是否触发阈值
        const isTriggered = threshold.isTriggered(data.value);

        if (isTriggered) {
          // 3. 创建告警记录
          const alarm = await this.createAlarmFromThreshold(data, threshold);
          triggeredAlarms.push(alarm);

          // 记录告警触发日志
          const logMsg = threshold.monitoringPoint
            ? `告警触发: 设备=${data.equipmentId}, 监测点=${threshold.monitoringPoint}, 故障=${threshold.faultName || '未指定'}, 值=${data.value}, 阈值=${threshold.getThresholdDescription()}`
            : `告警触发: 设备=${data.equipmentId}, 指标=${data.metricType}, 值=${data.value}, 阈值=${threshold.getThresholdDescription()}`;

          this.logger.warn(logMsg);
        }
      }

      return triggeredAlarms;
    } catch (error) {
      this.logger.error(
        `评估告警失败: 设备=${data.equipmentId}, 错误=${error.message}`,
        error.stack,
      );
      return triggeredAlarms;
    }
  }

  /**
   * 从阈值配置和时序数据创建告警记录
   *
   * 关键点: 将故障名称、处理措施、监测点反规范化到告警记录中
   * 这样即使阈值配置后续被修改或删除,历史告警仍保留完整的业务上下文
   *
   * @param data 触发告警的时序数据
   * @param threshold 匹配的阈值配置
   * @returns 创建的告警记录
   */
  private async createAlarmFromThreshold(
    data: TimeSeriesData,
    threshold: ThresholdConfig,
  ): Promise<AlarmRecord> {
    // 构建阈值范围描述
    const thresholdRange = threshold.getThresholdDescription();

    // 创建告警记录实体
    const alarm = this.alarmRepository.create({
      equipmentId: data.equipmentId,
      thresholdId: threshold.id,
      abnormalMetricType: data.metricType,
      abnormalValue: data.value,
      thresholdRange: thresholdRange,
      triggeredAt: data.timestamp,
      severity: threshold.severity,
      status: AlarmStatus.PENDING,

      // 反规范化字段: 从阈值配置复制到告警记录
      // 保证历史准确性 - 即使阈值配置被修改,告警记录仍保留触发时的原始信息
      monitoringPoint: threshold.monitoringPoint, // 监测点名称
      faultName: threshold.faultName, // 故障名称
      recommendedAction: threshold.recommendedAction, // 处理措施建议
    });

    // 保存告警记录
    const savedAlarm = await this.alarmRepository.save(alarm);

    return savedAlarm;
  }
}
