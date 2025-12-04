import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import {
  AlarmRecord,
  AlarmStatus,
} from '../../database/entities/alarm-record.entity';
import { AlarmSeverity } from '../../database/entities/threshold-config.entity';
import {
  MonitoringStatisticsDto,
  AlarmStatisticsDto,
  EquipmentOverviewDto,
  MonitoringStatsResponseDto,
  AlarmStatsResponseDto,
} from './dto';

/**
 * 查询和统计服务
 *
 * 提供监测数据统计、告警统计、设备状态概览等功能
 */
@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(TimeSeriesData)
    private readonly timeSeriesRepository: Repository<TimeSeriesData>,
    @InjectRepository(AlarmRecord)
    private readonly alarmRepository: Repository<AlarmRecord>,
  ) {}

  /**
   * 获取监测数据统计
   *
   * 计算指定设备、指标类型、时间范围内的统计信息
   * 包括最大值、最小值、平均值、标准差和数据点数量
   *
   * @param dto 统计查询条件
   * @returns 统计结果
   */
  async getMonitoringStatistics(
    dto: MonitoringStatisticsDto,
  ): Promise<MonitoringStatsResponseDto> {
    this.logger.log(
      `获取监测数据统计: 设备=${dto.equipmentId}, 指标=${dto.metricType}, 时间范围=${new Date(dto.startTime).toISOString()} ~ ${new Date(dto.endTime).toISOString()}`,
    );

    // 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: dto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${dto.equipmentId}`);
    }

    // 使用原生SQL查询统计数据（性能优化）
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    const result = await this.timeSeriesRepository
      .createQueryBuilder('data')
      .select('MAX(data.value)', 'max')
      .addSelect('MIN(data.value)', 'min')
      .addSelect('AVG(data.value)', 'average')
      .addSelect('STDDEV(data.value)', 'stdDev')
      .addSelect('COUNT(*)', 'dataPoints')
      .where('data.equipmentId = :equipmentId', {
        equipmentId: dto.equipmentId,
      })
      .andWhere('data.metricType = :metricType', {
        metricType: dto.metricType,
      })
      .andWhere('UNIX_TIMESTAMP(data.timestamp) >= :startTime', {
        startTime: Math.floor(dto.startTime / 1000),
      })
      .andWhere('UNIX_TIMESTAMP(data.timestamp) <= :endTime', {
        endTime: Math.floor(dto.endTime / 1000),
      })
      .getRawOne();

    // 处理没有数据的情况
    if (!result || result.dataPoints === 0 || result.dataPoints === '0') {
      this.logger.warn(
        `未找到符合条件的监测数据: 设备=${dto.equipmentId}, 指标=${dto.metricType}`,
      );
      return {
        max: 0,
        min: 0,
        average: 0,
        stdDev: 0,
        dataPoints: 0,
      };
    }

    // 返回统计结果（保留2位小数）
    return {
      max: parseFloat(result.max) || 0,
      min: parseFloat(result.min) || 0,
      average: parseFloat((parseFloat(result.average) || 0).toFixed(2)) || 0,
      stdDev: parseFloat((parseFloat(result.stdDev) || 0).toFixed(2)) || 0,
      dataPoints: parseInt(result.dataPoints, 10) || 0,
    };
  }

  /**
   * 获取告警统计
   *
   * 统计指定时间范围内的告警数据
   * 按严重程度和处理状态分组统计
   *
   * @param dto 告警统计查询条件
   * @returns 告警统计结果
   */
  async getAlarmStatistics(
    dto: AlarmStatisticsDto,
  ): Promise<AlarmStatsResponseDto> {
    this.logger.log(
      `获取告警统计: 设备=${dto.equipmentId || '全部'}, 时间范围=${new Date(dto.startTime).toISOString()} ~ ${new Date(dto.endTime).toISOString()}`,
    );

    // 如果指定了设备ID，验证设备是否存在
    if (dto.equipmentId) {
      const equipment = await this.equipmentRepository.findOne({
        where: { id: dto.equipmentId },
      });

      if (!equipment) {
        throw new NotFoundException(`设备不存在: ${dto.equipmentId}`);
      }
    }

    // 转换时间戳为Date对象
    const startDate = new Date(dto.startTime);
    const endDate = new Date(dto.endTime);

    this.logger.debug(
      `查询时间范围: ${startDate.toISOString()} (${dto.startTime}) ~ ${endDate.toISOString()} (${dto.endTime})`,
    );

    // 构建查询条件
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    const queryBuilder = this.alarmRepository
      .createQueryBuilder('alarm')
      .where('UNIX_TIMESTAMP(alarm.triggeredAt) >= :startTime', {
        startTime: Math.floor(dto.startTime / 1000),
      })
      .andWhere('UNIX_TIMESTAMP(alarm.triggeredAt) <= :endTime', {
        endTime: Math.floor(dto.endTime / 1000),
      });

    // 如果指定了设备ID，添加设备筛选条件
    if (dto.equipmentId) {
      queryBuilder.andWhere('alarm.equipmentId = :equipmentId', {
        equipmentId: dto.equipmentId,
      });
    }

    // 如果指定了严重程度，添加严重程度筛选条件
    if (dto.severity) {
      queryBuilder.andWhere('alarm.severity = :severity', {
        severity: dto.severity,
      });
    }

    // 打印实际的SQL查询用于调试
    const sql = queryBuilder.getSql();
    this.logger.debug(`执行SQL: ${sql}`);
    this.logger.debug(
      `查询参数: startDate=${startDate.toISOString()}, endDate=${endDate.toISOString()}`,
    );

    // 获取所有符合条件的告警记录
    const alarms = await queryBuilder.getMany();

    this.logger.log(`查询到${alarms.length}条告警记录`);
    if (alarms.length > 0) {
      this.logger.log(`第一条告警时间: ${alarms[0].triggeredAt.toISOString()}`);
    } else {
      // 查询数据库中所有告警记录以便调试
      const allAlarms = await this.alarmRepository.find({
        take: 5,
        order: { triggeredAt: 'DESC' },
      });
      this.logger.warn(
        `数据库中共有${await this.alarmRepository.count()}条告警记录`,
      );
      if (allAlarms.length > 0) {
        this.logger.warn(
          `最新的告警时间: ${allAlarms[0].triggeredAt.toISOString()}`,
        );
      }
    }

    // 初始化统计数据
    const stats: AlarmStatsResponseDto = {
      totalCount: alarms.length,
      groupBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
      groupByStatus: {
        pending: 0,
        processing: 0,
        resolved: 0,
        ignored: 0,
      },
    };

    // 统计各个维度的数据
    alarms.forEach((alarm) => {
      // 按严重程度统计
      switch (alarm.severity) {
        case AlarmSeverity.LOW:
          stats.groupBySeverity.low++;
          break;
        case AlarmSeverity.MEDIUM:
          stats.groupBySeverity.medium++;
          break;
        case AlarmSeverity.HIGH:
          stats.groupBySeverity.high++;
          break;
        case AlarmSeverity.CRITICAL:
          stats.groupBySeverity.critical++;
          break;
      }

      // 按处理状态统计
      switch (alarm.status) {
        case AlarmStatus.PENDING:
          stats.groupByStatus.pending++;
          break;
        case AlarmStatus.PROCESSING:
          stats.groupByStatus.processing++;
          break;
        case AlarmStatus.RESOLVED:
          stats.groupByStatus.resolved++;
          break;
        case AlarmStatus.IGNORED:
          stats.groupByStatus.ignored++;
          break;
      }
    });

    this.logger.log(`告警统计完成: 总计${stats.totalCount}条告警`);

    return stats;
  }

  /**
   * 获取设备状态概览
   *
   * 统计所有设备的状态信息
   * 包括设备总数、在线数、离线数、异常数
   *
   * @returns 设备状态概览
   */
  async getEquipmentOverview(): Promise<EquipmentOverviewDto> {
    this.logger.log('获取设备状态概览');

    // 统计设备总数（不包括已删除的设备）
    const totalCount = await this.equipmentRepository.count();

    // 统计离线设备数
    const offlineCount = await this.equipmentRepository.count({
      where: { status: EquipmentStatus.OFFLINE },
    });

    // 统计在线设备数（normal + warning + fault）
    const onlineCount = totalCount - offlineCount;

    // 统计异常设备数（有未处理告警的设备）
    // 使用子查询获取有pending或processing状态告警的唯一设备ID
    const abnormalEquipmentIds = await this.alarmRepository
      .createQueryBuilder('alarm')
      .select('DISTINCT alarm.equipmentId', 'equipmentId')
      .where('alarm.status IN (:...statuses)', {
        statuses: [AlarmStatus.PENDING, AlarmStatus.PROCESSING],
      })
      .getRawMany();

    const abnormalCount = abnormalEquipmentIds.length;

    this.logger.log(
      `设备状态概览: 总数=${totalCount}, 在线=${onlineCount}, 离线=${offlineCount}, 异常=${abnormalCount}`,
    );

    return {
      totalCount,
      onlineCount,
      offlineCount,
      abnormalCount,
    };
  }

  /**
   * 获取设备完整档案
   *
   * 整合设备的所有关联信息，包括：
   * - 设备基本信息
   * - 最新监测数据
   * - 告警记录统计
   * - 最新健康评估报告
   *
   * @param equipmentId 设备ID
   * @returns 设备完整档案
   */
  async getEquipmentCompleteProfile(equipmentId: string): Promise<any> {
    this.logger.log(`获取设备完整档案: ${equipmentId}`);

    // 查询设备基本信息
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${equipmentId}`);
    }

    // 查询最近7天的监测数据统计
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const monitoringDataCount = await this.timeSeriesRepository.count({
      where: {
        equipmentId,
        timestamp: new Date(sevenDaysAgo.getTime()) as any,
      },
    });

    // 查询告警统计（所有历史告警）
    const alarmStats = await this.alarmRepository
      .createQueryBuilder('alarm')
      .select('alarm.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('alarm.equipmentId = :equipmentId', { equipmentId })
      .groupBy('alarm.status')
      .getRawMany();

    // 格式化告警统计数据
    const alarmSummary = {
      pending: 0,
      processing: 0,
      resolved: 0,
      ignored: 0,
      total: 0,
    };

    alarmStats.forEach((stat) => {
      const count = parseInt(stat.count, 10);
      alarmSummary[stat.status] = count;
      alarmSummary.total += count;
    });

    // 返回设备完整档案
    return {
      equipment: {
        id: equipment.id,
        deviceId: equipment.deviceId,
        deviceName: equipment.deviceName,
        deviceType: equipment.deviceType,
        model: equipment.model,
        manufacturer: equipment.manufacturer,
        location: equipment.location,
        status: equipment.status,
        commissionDate: equipment.commissionDate,
        description: equipment.description,
        createdAt: equipment.createdAt,
        updatedAt: equipment.updatedAt,
      },
      monitoring: {
        recentDataCount: monitoringDataCount,
        period: '最近7天',
      },
      alarms: alarmSummary,
    };
  }
}
