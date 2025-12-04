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

    // 2. 如果未提供单位，使用默认单位
    const unit =
      createDto.unit || TimeSeriesData.getStandardUnit(createDto.metricType);

    // 3. 数据质量验证
    const qualityCheck = this.dataQualityService.checkDataQuality(
      createDto.metricType,
      createDto.value,
      createDto.timestamp,
      unit,
    );

    // 4. 如果未提供质量标记，使用验证结果的质量等级
    const quality = createDto.quality || qualityCheck.quality;

    // 5. 如果未提供数据来源，使用默认值
    const source = createDto.source || DataSourceEnum.SENSOR_UPLOAD;

    // 6. 创建时序数据实体
    const timeSeriesData = this.timeSeriesDataRepository.create({
      equipmentId: createDto.equipmentId,
      timestamp: createDto.timestamp,
      metricType: createDto.metricType,
      value: createDto.value,
      unit,
      quality,
      source,
    });

    // 6. 保存到数据库
    try {
      const savedData =
        await this.timeSeriesDataRepository.save(timeSeriesData);
      this.logger.log(
        `成功接收监测数据: 设备=${createDto.equipmentId}, 指标=${createDto.metricType}, 值=${createDto.value}`,
      );
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

    // 2. 初始化结果统计
    const result: BatchUploadResult = {
      totalCount: batchDto.data.length,
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    // 3. 使用事务批量插入数据
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 批量处理数据
      for (let i = 0; i < batchDto.data.length; i++) {
        const item = batchDto.data[i];

        try {
          // 如果未提供单位，使用默认单位
          const unit =
            item.unit || TimeSeriesData.getStandardUnit(item.metricType);

          // 数据质量验证
          const qualityCheck = this.dataQualityService.checkDataQuality(
            item.metricType,
            item.value,
            item.timestamp,
            unit,
          );

          // 如果未提供质量标记，使用验证结果的质量等级
          const quality = item.quality || qualityCheck.quality;

          // 创建时序数据实体
          const timeSeriesData = this.timeSeriesDataRepository.create({
            equipmentId: batchDto.equipmentId,
            timestamp: item.timestamp,
            metricType: item.metricType,
            value: item.value,
            unit,
            quality,
            source: DataSourceEnum.SENSOR_UPLOAD,
          });

          // 保存数据
          await queryRunner.manager.save(timeSeriesData);
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
   * 支持按设备、指标类型、时间范围查询
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
}
