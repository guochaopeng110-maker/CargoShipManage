import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  TimeSeriesData,
  MetricType,
  DataSource as DataSourceEnum,
} from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import {
  CreateTimeSeriesDataDto,
  CreateBatchTimeSeriesDataDto,
  QueryTimeSeriesDataDto,
} from './dto';
import { DataQualityService } from './data-quality.service';
import { EquipmentService } from '../equipment/equipment.service';
import { AlarmService } from '../alarm/alarm.service';
import { AlarmPushService } from '../alarm/alarm-push.service';
import { MonitoringPushService } from './monitoring-push.service';

/**
 * 批量上报结果接口
 */
export interface BatchUploadResult {
  totalCount: number; // 总数据条数
  successCount: number; // 成功接收条数
  failedCount: number; // 失败条数
  errors: Array<{
    index: number; // 失败数据索引
    reason: string; // 失败原因
  }>;
}

/**
 * 分页查询结果接口
 */
export interface PaginatedResult<T> {
  items: T[]; // 数据列表
  total: number; // 总记录数
  page: number; // 当前页码
  pageSize: number; // 每页条数
  totalPages: number; // 总页数
}

/**
 * 数据统计结果接口
 */
export interface DataStatistics {
  metricType: MetricType; // 指标类型
  count: number; // 数据条数
  maxValue: number; // 最大值
  minValue: number; // 最小值
  avgValue: number; // 平均值
  unit: string; // 单位
}

/**
 * 监测数据服务
 *
 * 提供时序监测数据的存储、查询、统计等功能
 * 集成监测点校验:数据保存前校验监测点有效性并自动补全单位
 * 集成告警评估:数据保存后自动评估是否触发告警
 * 集成实时推送:数据保存后实时推送给订阅用户
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    @InjectRepository(TimeSeriesData)
    private readonly timeSeriesDataRepository: Repository<TimeSeriesData>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    private readonly dataSource: DataSource,
    private readonly dataQualityService: DataQualityService,
    private readonly equipmentService: EquipmentService,
    private readonly alarmService: AlarmService,
    private readonly alarmPushService: AlarmPushService,
    private readonly monitoringPushService: MonitoringPushService,
  ) {}

  /**
   * 接收单条监测数据
   *
   * @param createDto 创建数据DTO
   * @returns 保存的时序数据实体
   */
  async receiveMonitoringData(
    createDto: CreateTimeSeriesDataDto,
  ): Promise<TimeSeriesData> {
    // 1. 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: createDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${createDto.equipmentId}`);
    }

    // 2. 监测点校验和单位自动补全（如果提供了监测点）
    let unit = createDto.unit;

    if (createDto.monitoringPoint) {
      // 校验监测点有效性和类型一致性
      const monitoringPoint =
        await this.equipmentService.validateMonitoringPoint(
          createDto.equipmentId,
          createDto.monitoringPoint,
          createDto.metricType,
        );

      // 如果未提供单位，从监测点元数据中自动补全
      if (!unit && monitoringPoint.hasUnit()) {
        unit = monitoringPoint.unit;
        this.logger.debug(
          `自动补全监测点 '${createDto.monitoringPoint}' 的单位: ${unit}`,
        );
      }
    } else {
      // 向后兼容：如果未提供监测点，记录警告但继续处理
      this.logger.warn(
        `数据缺失监测点信息: 设备=${createDto.equipmentId}, 指标=${createDto.metricType}。` +
          `建议补充监测点以提高数据质量和告警准确性。`,
      );
    }

    // 3. 如果仍未提供单位，使用默认单位
    if (!unit) {
      unit = TimeSeriesData.getStandardUnit(createDto.metricType);
    }

    // 4. 数据质量验证
    const qualityCheck = this.dataQualityService.checkDataQuality(
      createDto.metricType,
      createDto.value,
      createDto.timestamp,
      unit,
    );

    // 5. 如果未提供质量标记，使用验证结果的质量等级
    const quality = createDto.quality || qualityCheck.quality;

    // 6. 如果未提供数据来源，使用默认值
    const source = createDto.source || DataSourceEnum.SENSOR_UPLOAD;

    // 7. 创建时序数据实体（包含监测点信息）
    const timeSeriesData = this.timeSeriesDataRepository.create({
      equipmentId: createDto.equipmentId,
      timestamp:
        typeof createDto.timestamp === 'string'
          ? new Date(createDto.timestamp)
          : createDto.timestamp,
      metricType: createDto.metricType,
      monitoringPoint: createDto.monitoringPoint, // 添加监测点字段
      value: createDto.value,
      unit,
      quality,
      source,
    });

    // 8. 保存到数据库
    try {
      const savedData =
        await this.timeSeriesDataRepository.save(timeSeriesData);

      // 日志中包含监测点信息
      const logMsg = createDto.monitoringPoint
        ? `成功接收监测数据: 设备=${createDto.equipmentId}, 监测点=${createDto.monitoringPoint}, 指标=${createDto.metricType}, 值=${createDto.value}`
        : `成功接收监测数据: 设备=${createDto.equipmentId}, 指标=${createDto.metricType}, 值=${createDto.value}`;

      this.logger.log(logMsg);

      // 9. 异步推送监测数据到 WebSocket
      // 使用 void 操作符明确标记为故意不等待的 Promise
      void this.monitoringPushService.pushNewData(savedData);

      // 10. 异步评估是否触发告警
      // 使用 void 操作符明确标记为故意不等待的 Promise
      void Promise.resolve().then(async () => {
        try {
          const alarms = await this.alarmService.evaluateThresholds(savedData);

          // 如果触发了告警,通过 WebSocket 推送
          if (alarms.length > 0) {
            for (const alarm of alarms) {
              await this.alarmPushService.pushUpsertAlarm(alarm);
            }
          }
        } catch (error) {
          this.logger.error(`告警评估失败: ${error.message}`, error.stack);
        }
      });

      return savedData;
    } catch (error) {
      this.logger.error(`保存监测数据失败: ${error.message}`, error.stack);
      throw new BadRequestException('保存监测数据失败');
    }
  }

  /**
   * 批量接收监测数据
   *
   * 使用事务确保数据一致性
   * 支持部分失败（记录失败详情，成功的数据继续保存）
   * 集成监测点批量校验：使用缓存优化性能
   *
   * @param batchDto 批量数据DTO
   * @returns 批量上报结果
   */
  async receiveBatchMonitoringData(
    batchDto: CreateBatchTimeSeriesDataDto,
  ): Promise<BatchUploadResult> {
    // 1. 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: batchDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${batchDto.equipmentId}`);
    }

    // 2. 收集所有唯一的监测点名称用于批量校验
    const uniqueMonitoringPoints = new Set<string>();
    for (const item of batchDto.data) {
      if (item.monitoringPoint) {
        uniqueMonitoringPoints.add(item.monitoringPoint);
      }
    }

    // 3. 批量校验监测点（使用缓存优化性能）
    const monitoringPointCache = new Map<string, any>();
    if (uniqueMonitoringPoints.size > 0) {
      try {
        const validationResults =
          await this.equipmentService.validateMonitoringPointsBatch(
            batchDto.equipmentId,
            Array.from(uniqueMonitoringPoints),
          );

        // 缓存校验结果
        for (const mp of validationResults) {
          monitoringPointCache.set(mp.pointName, mp);
        }

        this.logger.debug(
          `批量校验监测点完成: 设备=${batchDto.equipmentId}, 监测点数量=${uniqueMonitoringPoints.size}`,
        );
      } catch (error) {
        // 如果批量校验失败，记录错误但继续处理（向后兼容）
        this.logger.error(
          `批量校验监测点失败: ${error.message}。将在单条处理时进行校验。`,
        );
      }
    } else {
      // 向后兼容：如果批量数据中没有监测点信息，记录警告
      this.logger.warn(
        `批量数据缺失监测点信息: 设备=${batchDto.equipmentId}, 数据量=${batchDto.data.length}。` +
          `建议补充监测点以提高数据质量和告警准确性。`,
      );
    }

    // 4. 初始化结果统计
    const result: BatchUploadResult = {
      totalCount: batchDto.data.length,
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    // 5. 使用事务批量插入数据
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const savedEntities: TimeSeriesData[] = []; // 收集已保存的实体

    try {
      // 批量处理数据
      for (let i = 0; i < batchDto.data.length; i++) {
        const item = batchDto.data[i];

        try {
          // 确保时间戳是 Date 对象
          const timestamp =
            typeof item.timestamp === 'string'
              ? new Date(item.timestamp)
              : item.timestamp;

          let unit = item.unit;

          // 如果提供了监测点，进行校验和单位自动补全
          if (item.monitoringPoint) {
            const cachedMonitoringPoint = monitoringPointCache.get(
              item.monitoringPoint,
            );

            if (cachedMonitoringPoint) {
              // 校验指标类型一致性
              if (
                item.metricType &&
                cachedMonitoringPoint.metricType !== item.metricType
              ) {
                throw new BadRequestException(
                  `监测点 '${item.monitoringPoint}' 的指标类型不匹配: ` +
                    `期望 ${cachedMonitoringPoint.metricType}, 实际 ${item.metricType}`,
                );
              }

              // 如果未提供单位，从监测点元数据中自动补全
              if (!unit && cachedMonitoringPoint.hasUnit()) {
                unit = cachedMonitoringPoint.unit;
              }
            } else {
              // 缓存中不存在（批量校验失败或校验时不存在），单独校验
              const monitoringPoint =
                await this.equipmentService.validateMonitoringPoint(
                  batchDto.equipmentId,
                  item.monitoringPoint,
                  item.metricType,
                );

              // 如果未提供单位，从监测点元数据中自动补全
              if (!unit && monitoringPoint.hasUnit()) {
                unit = monitoringPoint.unit;
              }
            }
          }

          // 如果仍未提供单位，使用默认单位
          if (!unit) {
            unit = TimeSeriesData.getStandardUnit(item.metricType);
          }

          // 数据质量验证
          const qualityCheck = this.dataQualityService.checkDataQuality(
            item.metricType,
            item.value,
            timestamp,
            unit,
          );

          // 如果未提供质量标记，使用验证结果的质量等级
          const quality = item.quality || qualityCheck.quality;

          // 创建时序数据实体（包含监测点信息）
          const timeSeriesData = this.timeSeriesDataRepository.create({
            equipmentId: batchDto.equipmentId,
            timestamp: timestamp,
            metricType: item.metricType,
            monitoringPoint: item.monitoringPoint, // 添加监测点字段
            value: item.value,
            unit,
            quality,
            source: DataSourceEnum.SENSOR_UPLOAD,
          });

          // 保存数据
          const saved = await queryRunner.manager.save(timeSeriesData);
          savedEntities.push(saved); // 收集成功保存的实体
          result.successCount++;
        } catch (error) {
          // 记录失败详情
          result.failedCount++;
          result.errors.push({
            index: i,
            reason: error.message || '数据格式错误',
          });
          this.logger.warn(`批量数据第${i}条保存失败: ${error.message}`);
        }
      }

      // 提交事务
      await queryRunner.commitTransaction();

      this.logger.log(
        `批量接收监测数据完成: 总数=${result.totalCount}, 成功=${result.successCount}, 失败=${result.failedCount}`,
      );

      // ========== 新增: 异步告警评估 (事务外执行) ==========
      if (savedEntities.length > 0) {
        void this.evaluateBatchAlarms(savedEntities);
      }

      // ========== 新增: 异步数据推送 (事务外执行) ==========
      if (savedEntities.length > 0) {
        void this.monitoringPushService.pushBatchData(savedEntities);
      }

      return result;
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `批量接收监测数据事务失败: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('批量接收监测数据失败');
    } finally {
      // 释放查询运行器
      await queryRunner.release();
    }
  }

  /**
   * 查询时序监测数据
   *
   * 支持按设备、指标类型、监测点、时间范围查询
   * 支持分页查询
   *
   * @param queryDto 查询条件DTO
   * @returns 分页查询结果
   */
  async queryMonitoringData(
    queryDto: QueryTimeSeriesDataDto,
  ): Promise<PaginatedResult<TimeSeriesData>> {
    // 1. 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: queryDto.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${queryDto.equipmentId}`);
    }

    // 2. 验证时间范围
    if (queryDto.startTime > queryDto.endTime) {
      throw new BadRequestException('开始时间不能大于结束时间');
    }

    // 3. 构建查询条件
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    const queryBuilder = this.timeSeriesDataRepository
      .createQueryBuilder('data')
      .where('data.equipmentId = :equipmentId', {
        equipmentId: queryDto.equipmentId,
      })
      .andWhere('UNIX_TIMESTAMP(data.timestamp) >= :startTime', {
        startTime: Math.floor(queryDto.startTime / 1000),
      })
      .andWhere('UNIX_TIMESTAMP(data.timestamp) <= :endTime', {
        endTime: Math.floor(queryDto.endTime / 1000),
      });

    // 如果指定了指标类型，添加过滤条件
    if (queryDto.metricType) {
      queryBuilder.andWhere('data.metricType = :metricType', {
        metricType: queryDto.metricType,
      });
    }

    // 如果指定了监测点，添加过滤条件（新增）
    if (queryDto.monitoringPoint) {
      queryBuilder.andWhere('data.monitoringPoint = :monitoringPoint', {
        monitoringPoint: queryDto.monitoringPoint,
      });
    }

    // 4. 查询总数
    const total = await queryBuilder.getCount();

    // 5. 分页查询数据
    const page = queryDto.page || 1;
    const pageSize = queryDto.pageSize || 100;
    const skip = (page - 1) * pageSize;

    const items = await queryBuilder
      .orderBy('data.timestamp', 'DESC') // 按时间倒序
      .skip(skip)
      .take(pageSize)
      .getMany();

    // 7. 返回分页结果
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取数据统计信息
   *
   * 提供最大值、最小值、平均值等统计数据
   *
   * @param equipmentId 设备ID
   * @param metricType 指标类型
   * @param startTime 开始时间（毫秒）
   * @param endTime 结束时间（毫秒）
   * @returns 数据统计结果
   */
  async getDataStatistics(
    equipmentId: string,
    metricType: MetricType,
    startTime: number,
    endTime: number,
  ): Promise<DataStatistics> {
    // 1. 验证设备是否存在
    const equipment = await this.equipmentRepository.findOne({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备不存在: ${equipmentId}`);
    }

    // 2. 验证时间范围
    if (startTime >= endTime) {
      throw new BadRequestException('开始时间必须小于结束时间');
    }

    // 3. 执行聚合查询
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    const result = await this.timeSeriesDataRepository
      .createQueryBuilder('data')
      .select('COUNT(data.id)', 'count')
      .addSelect('MAX(data.value)', 'maxValue')
      .addSelect('MIN(data.value)', 'minValue')
      .addSelect('AVG(data.value)', 'avgValue')
      .addSelect('data.unit', 'unit')
      .where('data.equipmentId = :equipmentId', { equipmentId })
      .andWhere('data.metricType = :metricType', { metricType })
      .andWhere(
        'UNIX_TIMESTAMP(data.timestamp) BETWEEN :startTime AND :endTime',
        {
          startTime: Math.floor(startTime / 1000),
          endTime: Math.floor(endTime / 1000),
        },
      )
      .groupBy('data.unit')
      .getRawOne();

    // 4. 如果没有数据，返回默认值
    if (!result || result.count === '0') {
      return {
        metricType,
        count: 0,
        maxValue: 0,
        minValue: 0,
        avgValue: 0,
        unit: TimeSeriesData.getStandardUnit(metricType),
      };
    }

    // 6. 返回统计结果
    return {
      metricType,
      count: parseInt(result.count, 10),
      maxValue: parseFloat(result.maxValue),
      minValue: parseFloat(result.minValue),
      avgValue: parseFloat(result.avgValue),
      unit: result.unit || TimeSeriesData.getStandardUnit(metricType),
    };
  }

  /**
   * 批量评估告警 (异步执行，不阻塞响应)
   *
   * 用于批量上报场景的告警评估
   * - 采用"最大努力"模式：单条失败不影响其他数据
   * - 异步执行，不阻塞 API 响应
   *
   * @param dataList 时序数据列表
   */
  private async evaluateBatchAlarms(dataList: TimeSeriesData[]): Promise<void> {
    this.logger.log(`开始对 ${dataList.length} 条批量上报数据进行告警评估...`);

    let evaluatedCount = 0;
    let triggeredCount = 0;
    let failedCount = 0;

    for (const data of dataList) {
      try {
        // 调用 AlarmService 的阈值评估方法
        const alarms = await this.alarmService.evaluateThresholds(data);
        evaluatedCount++;

        if (alarms.length > 0) {
          triggeredCount += alarms.length;

          // 逐条推送告警
          for (const alarm of alarms) {
            await this.alarmPushService.pushUpsertAlarm(alarm);
          }
        }
      } catch (error) {
        failedCount++;
        this.logger.warn(
          `批量数据第 ${evaluatedCount + failedCount} 条告警评估失败: 设备=${data.equipmentId}, 监测点=${data.monitoringPoint}, 错误=${error.message}`,
        );
      }
    }

    this.logger.log(
      `批量上报告警评估完成: 总数据=${dataList.length}, 成功评估=${evaluatedCount}, ` +
        `触发告警=${triggeredCount}, 评估失败=${failedCount}`,
    );
  }
}
