import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  ImportRecord,
  ImportStatus,
  DuplicateStrategy,
  FileFormat,
} from '../../database/entities/import-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { FileParserService, ParsedTimeSeriesData } from './file-parser.service';
import { AlarmService } from '../alarm/alarm.service';
import { AlarmPushService } from '../alarm/alarm-push.service';
import { MonitoringPushService } from '../monitoring/monitoring-push.service';
import { EquipmentService } from '../equipment/equipment.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import type { Express } from 'express';

/**
 * 数据导入服务
 * 负责管理导入记录和执行时间序列数据导入操作
 *
 * 增强功能:
 * - 导入历史数据后自动评估告警阈值并生成告警记录
 * - 告警评估采用"最大努力"模式,失败不影响导入成功状态
 * - 集成监测点批量校验:导入前批量校验监测点有效性(软校验模式)
 */
@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(ImportRecord)
    private readonly importRecordRepository: Repository<ImportRecord>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(TimeSeriesData)
    private readonly timeSeriesDataRepository: Repository<TimeSeriesData>,
    private readonly fileParserService: FileParserService,
    private readonly dataSource: DataSource,
    private readonly alarmService: AlarmService,
    private readonly alarmPushService: AlarmPushService,
    private readonly monitoringPushService: MonitoringPushService,
    private readonly equipmentService: EquipmentService,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * 上传并解析文件
   * 创建导入记录并返回预览数据
   * @param file 上传的文件
   * @param fileFormat 文件格式
   * @param duplicateStrategy 重复数据处理策略
   * @param remarks 备注
   * @param userId 上传用户ID
   * @returns 导入记录和预览数据
   */
  async uploadAndParseFile(
    file: Express.Multer.File,
    fileFormat: FileFormat,
    duplicateStrategy: DuplicateStrategy | undefined,
    userId: string,
  ): Promise<{
    importRecord: ImportRecord;
    previewData: ParsedTimeSeriesData[];
  }> {
    // 验证文件格式
    this.validateFileFormat(file, fileFormat);

    // 解析文件
    let parseResult;
    try {
      if (fileFormat === FileFormat.EXCEL) {
        parseResult = await this.fileParserService.parseExcel(file.buffer);
      } else if (fileFormat === FileFormat.CSV) {
        parseResult = await this.fileParserService.parseCSV(file.buffer);
      } else if (fileFormat === FileFormat.JSON) {
        parseResult = await this.fileParserService.parseJSON(file.buffer);
      } else {
        throw new BadRequestException(`不支持的文件格式: ${fileFormat}`);
      }
    } catch (error) {
      throw new BadRequestException(`文件解析失败: ${error.message}`);
    }

    // 创建导入记录
    const importRecord = this.importRecordRepository.create({
      id: randomUUID(),
      fileName: file.originalname,
      fileFormat,
      fileSize: file.size,
      duplicateStrategy: duplicateStrategy || DuplicateStrategy.SKIP,
      status: ImportStatus.PENDING,
      totalRows: parseResult.totalRows,
      successRows: 0,
      failedRows: parseResult.errors.length,
      skippedRows: 0,
      errors: parseResult.errors,
      importedBy: userId,
    });

    await this.importRecordRepository.save(importRecord);

    // 返回前100行作为预览
    const previewData = parseResult.data.slice(0, 100);

    return {
      importRecord,
      previewData,
    };
  }

  /**
   * 执行数据导入
   * 将解析的时间序列数据批量插入数据库
   * @param importRecordId 导入记录ID
   * @param data 要导入的时间序列数据
   * @param skipInvalidRows 是否跳过无效行
   * @returns 更新后的导入记录
   */
  async executeImport(
    importRecordId: string,
    data: ParsedTimeSeriesData[],
    skipInvalidRows: boolean,
  ): Promise<ImportRecord> {
    // 获取导入记录
    const importRecord = await this.importRecordRepository.findOne({
      where: { id: importRecordId },
    });

    if (!importRecord) {
      throw new NotFoundException(`导入记录不存在: ${importRecordId}`);
    }

    // 检查状态
    if (importRecord.status === ImportStatus.PROCESSING) {
      throw new BadRequestException('导入任务正在执行中，请勿重复提交');
    }

    if (importRecord.status === ImportStatus.COMPLETED) {
      throw new BadRequestException('导入任务已完成，无法重复执行');
    }

    // 更新状态为处理中
    importRecord.status = ImportStatus.PROCESSING;
    importRecord.startedAt = new Date();
    await this.importRecordRepository.save(importRecord);

    try {
      // 执行批量导入时间序列数据
      const result = await this.batchImportTimeSeriesData(
        data,
        skipInvalidRows,
        importRecordId,
      );

      // 更新导入记录
      importRecord.successRows = result.successCount;
      importRecord.failedRows = result.failedCount;
      importRecord.skippedRows = result.skippedCount;
      importRecord.errors = [...(importRecord.errors || []), ...result.errors];
      importRecord.completedAt = new Date();

      // 设置最终状态
      if (result.failedCount === 0) {
        importRecord.status = ImportStatus.COMPLETED;
      } else if (result.successCount > 0) {
        importRecord.status = ImportStatus.PARTIAL;
      } else {
        importRecord.status = ImportStatus.FAILED;
      }

      await this.importRecordRepository.save(importRecord);

      return importRecord;
    } catch (error) {
      // 导入失败，更新状态
      importRecord.status = ImportStatus.FAILED;
      importRecord.completedAt = new Date();
      importRecord.errors = [
        ...(importRecord.errors || []),
        {
          row: 0,
          data: {},
          reason: `导入失败: ${error.message}`,
        },
      ];
      await this.importRecordRepository.save(importRecord);

      throw error;
    }
  }

  /**
   * 批量导入时间序列数据
   *
   * 核心流程:
   * 1. 批量校验监测点有效性(软校验,失败记录警告但不中断导入)
   * 2. 在事务中批量保存时序数据
   * 3. 事务提交后,对每条数据执行告警评估 (在事务外,采用"最大努力"模式)
   * 4. 告警评估失败不影响导入成功状态
   *
   * @param data 时间序列数据数组
   * @param skipInvalidRows 是否跳过无效行
   * @param importRecordId 导入记录ID(用于日志)
   * @returns 导入结果统计和成功保存的数据列表
   */
  private async batchImportTimeSeriesData(
    data: ParsedTimeSeriesData[],
    skipInvalidRows: boolean,
    importRecordId: string,
  ): Promise<{
    successCount: number;
    failedCount: number;
    skippedCount: number;
    errors: any[];
    savedDataList: TimeSeriesData[]; // 新增: 返回成功保存的数据列表
  }> {
    let successCount = 0;
    let failedCount = 0;
    const skippedCount = 0;
    const errors: any[] = [];

    // 批量大小（每次插入1000条）
    const BATCH_SIZE = 1000;
    const batches: ParsedTimeSeriesData[][] = [];

    // 将数据分批
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      batches.push(data.slice(i, i + BATCH_SIZE));
    }

    // ========== 新增: 批量校验监测点 (软校验模式) ==========
    // 收集所有设备ID和监测点的唯一组合
    const equipmentMonitoringPoints = new Map<string, Set<string>>(); // equipmentId -> Set<monitoringPoint>

    for (const row of data) {
      if (row.monitoringPoint) {
        const deviceId = row.equipmentId;
        if (!equipmentMonitoringPoints.has(deviceId)) {
          equipmentMonitoringPoints.set(deviceId, new Set());
        }
        equipmentMonitoringPoints.get(deviceId)!.add(row.monitoringPoint);
      }
    }

    // 为每个设备批量校验监测点并缓存结果
    const monitoringPointCache = new Map<string, Map<string, any>>(); // equipmentUuid -> (pointName -> MonitoringPoint)
    let totalValidationAttempts = 0;
    let totalValidationFailures = 0;

    this.logger.log(
      `开始批量校验监测点: 共 ${equipmentMonitoringPoints.size} 个设备`,
    );

    // 预留：后续在获取设备 UUID 映射后进行批量校验

    // 使用事务处理
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // 存储成功保存的时序数据,用于后续告警评估
    const savedDataList: TimeSeriesData[] = [];

    try {
      // 预先查询所有设备ID，验证是否存在并获取UUID映射
      const equipmentIds = [...new Set(data.map((d) => d.equipmentId))];
      const existingEquipment = await queryRunner.manager.find(Equipment, {
        where: equipmentIds.map((id) => ({ deviceId: id })),
        select: ['id', 'deviceId'],
      });

      // 建立 deviceId -> UUID 的映射
      const deviceIdToUuidMap = new Map<string, string>();
      existingEquipment.forEach((e) => {
        deviceIdToUuidMap.set(e.deviceId, e.id);
      });

      // ========== 批量校验监测点 (使用 UUID) ==========
      for (const [deviceId, pointNames] of equipmentMonitoringPoints) {
        const equipmentUuid = deviceIdToUuidMap.get(deviceId);
        if (!equipmentUuid) {
          this.logger.warn(`设备不存在,跳过监测点校验: 设备ID=${deviceId}`);
          continue;
        }

        totalValidationAttempts++;

        try {
          // 批量校验该设备的所有监测点
          const validatedPoints =
            await this.equipmentService.validateMonitoringPointsBatch(
              equipmentUuid,
              Array.from(pointNames),
            );

          // 缓存校验结果
          const pointCache = new Map<string, any>();
          for (const point of validatedPoints) {
            pointCache.set(point.pointName, point);
          }
          monitoringPointCache.set(equipmentUuid, pointCache);

          this.logger.debug(
            `监测点批量校验成功: 设备=${deviceId}, 监测点数=${pointNames.size}`,
          );
        } catch (error) {
          totalValidationFailures++;
          // 软校验模式: 记录警告但不中断导入
          this.logger.warn(
            `监测点批量校验失败: 设备=${deviceId}, 错误=${error.message}。将继续导入,但可能影响告警准确性。`,
          );
        }
      }

      this.logger.log(
        `监测点批量校验完成: 尝试=${totalValidationAttempts}, 失败=${totalValidationFailures}`,
      );

      // 处理每一批数据
      for (const batch of batches) {
        const validBatchData: TimeSeriesData[] = [];

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNumber = data.indexOf(row) + 1;

          try {
            // 获取对应的 UUID
            const equipmentUuid = deviceIdToUuidMap.get(row.equipmentId);

            // 验证设备是否存在
            if (!equipmentUuid) {
              throw new Error(`设备不存在: ${row.equipmentId}`);
            }

            // ========== 监测点校验 (使用缓存) ==========
            if (row.monitoringPoint) {
              const deviceCache = monitoringPointCache.get(equipmentUuid);
              if (deviceCache) {
                const cachedPoint = deviceCache.get(row.monitoringPoint);
                if (!cachedPoint) {
                  // 监测点未在元数据中定义,记录警告但允许导入
                  this.logger.warn(
                    `第 ${rowNumber} 行: 监测点 '${row.monitoringPoint}' 未在设备 ${row.equipmentId} 的元数据中定义。数据将导入,但可能影响告警匹配准确性。`,
                  );
                }
              }
            }

            // 创建时间序列数据实体
            const timeSeriesData = queryRunner.manager.create(TimeSeriesData, {
              equipmentId: equipmentUuid, // 使用转换后的 UUID
              timestamp: row.timestamp,
              metricType: row.metricType,
              monitoringPoint: row.monitoringPoint,
              value: row.value,
              unit: row.unit,
              quality: row.quality,
              source: row.source,
            });

            validBatchData.push(timeSeriesData);
          } catch (error) {
            failedCount++;
            errors.push({
              row: rowNumber,
              data: row,
              reason: error.message,
            });

            if (!skipInvalidRows) {
              // 不跳过无效行，抛出异常回滚事务
              throw error;
            }
          }
        }

        // 批量插入有效数据
        if (validBatchData.length > 0) {
          const savedBatch = await queryRunner.manager.save(
            TimeSeriesData,
            validBatchData,
          );
          successCount += validBatchData.length;

          // 收集成功保存的数据,用于后续告警评估
          if (Array.isArray(savedBatch)) {
            savedDataList.push(...savedBatch);
          } else if (savedBatch) {
            // 单条数据的情况
            savedDataList.push(savedBatch);
          }
        }
      }

      // 提交事务
      await queryRunner.commitTransaction();

      // ========== 告警回溯评估 (在事务外执行) ==========
      const triggeredAlarms =
        await this.evaluateAlarmsForImportedData(savedDataList);

      // ========== 推送历史告警到 WebSocket ==========
      if (triggeredAlarms.length > 0) {
        await this.pushHistoricalAlarmsToWebSocket(triggeredAlarms);
        this.logger.log(
          `历史告警推送完成: 导入记录=${importRecordId}, 告警数=${triggeredAlarms.length}`,
        );
      }

      // ========== 批量推送完整数据 (替代仅推最新) ==========
      if (savedDataList.length > 0) {
        this.logger.log(
          `开始推送导入数据: 导入记录=${importRecordId}, 数据量=${savedDataList.length}`,
        );

        await this.monitoringPushService.pushBatchData(savedDataList);

        this.logger.log(
          `数据推送完成: 导入记录=${importRecordId}, 数据量=${savedDataList.length}`,
        );
      }

      return {
        successCount,
        failedCount,
        skippedCount,
        errors,
        savedDataList, // 返回成功保存的数据列表,用于后续推送
      };
    } catch (error) {
      // 回滚事务
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 释放查询运行器
      await queryRunner.release();
    }
  }

  /**
   * 对导入的历史数据执行告警评估
   *
   * 采用"最大努力"模式:
   * - 单条数据评估失败不影响其他数据
   * - 所有评估失败不抛出异常,不影响导入成功状态
   * - 记录详细的评估日志,包括成功、失败和触发告警数量
   *
   * @param dataList 成功保存的时序数据列表
   */
  private async evaluateAlarmsForImportedData(
    dataList: TimeSeriesData[],
  ): Promise<AlarmRecord[]> {
    if (dataList.length === 0) {
      return [];
    }

    this.logger.log(`开始对 ${dataList.length} 条导入数据进行告警回溯评估...`);

    let evaluatedCount = 0; // 成功评估的数据条数
    let triggeredCount = 0; // 触发告警的数据条数
    let failedCount = 0; // 评估失败的数据条数
    const allTriggeredAlarms: AlarmRecord[] = []; // 收集所有触发的告警

    // 遍历每条数据,执行告警评估
    for (const data of dataList) {
      try {
        // 调用 AlarmService 的阈值评估方法
        const triggeredAlarms =
          await this.alarmService.evaluateThresholds(data);

        evaluatedCount++;

        if (triggeredAlarms.length > 0) {
          triggeredCount += triggeredAlarms.length;
          allTriggeredAlarms.push(...triggeredAlarms); // 收集触发的告警
          this.logger.debug(
            `数据 [设备=${data.equipmentId}, 监测点=${data.monitoringPoint || '无'}, 时间=${data.timestamp.toISOString()}] 触发 ${triggeredAlarms.length} 条告警`,
          );
        }
      } catch (error) {
        failedCount++;
        this.logger.error(
          `告警评估失败 [数据ID=${data.id}, 设备=${data.equipmentId}, 监测点=${data.monitoringPoint || '无'}]: ${error.message}`,
          error.stack,
        );
        // 继续处理下一条数据,不抛出异常
      }
    }

    // 记录评估汇总统计
    this.logger.log(
      `告警回溯评估完成: 总数据=${dataList.length}, 成功评估=${evaluatedCount}, 触发告警=${triggeredCount}, 评估失败=${failedCount}`,
    );

    return allTriggeredAlarms;
  }

  /**
   * 推送历史告警到 WebSocket
   *
   * 功能说明:
   * 1. 批量推送历史数据分析产生的告警记录
   * 2. 使用 AlarmPushService.pushBatchAlarms 进行批量推送
   * 3. 采用"最大努力"模式,推送失败不影响导入成功状态
   *
   * 推送策略:
   * - 批量推送给管理员和运维人员 (使用 alarm:batch 事件)
   *
   * @param alarms 触发的告警记录列表
   */
  private async pushHistoricalAlarmsToWebSocket(
    alarms: AlarmRecord[],
  ): Promise<void> {
    if (alarms.length === 0) {
      return;
    }

    this.logger.log(
      `开始推送 ${alarms.length} 条历史告警到 WebSocket (来自数据导入)...`,
    );

    try {
      // 使用 AlarmPushService 的批量推送方法
      // 这个方法会自动推送给管理员和运维人员,使用统一的 alarm:batch 事件
      await this.alarmPushService.pushBatchAlarms(alarms);

      this.logger.log(`历史告警推送完成: 成功推送 ${alarms.length} 条告警`);
    } catch (error) {
      // 推送失败不影响导入成功状态
      this.logger.error(`历史告警推送失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 验证文件格式
   * @param file 上传的文件
   * @param fileFormat 声明的文件格式
   */
  private validateFileFormat(
    file: Express.Multer.File,
    fileFormat: FileFormat,
  ): void {
    const mimeTypeMap: Record<FileFormat, string[]> = {
      [FileFormat.EXCEL]: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
      [FileFormat.CSV]: ['text/csv', 'application/csv'],
      [FileFormat.JSON]: ['application/json'],
    };

    const allowedMimeTypes = mimeTypeMap[fileFormat];
    if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `文件格式不匹配: 期望 ${fileFormat}，实际 MIME 类型为 ${file.mimetype}`,
      );
    }
  }

  /**
   * 查询导入记录列表
   * @param queryDto 查询条件
   * @returns 分页结果，包含 items、total、page、pageSize、totalPages
   */
  async findAll(queryDto: any): Promise<{
    items: ImportRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      pageSize = 10,
      status,
      fileFormat,
      startDate,
      endDate,
    } = queryDto;

    const queryBuilder =
      this.importRecordRepository.createQueryBuilder('import_record');

    // 筛选条件
    if (status) {
      queryBuilder.andWhere('import_record.status = :status', { status });
    }
    if (fileFormat) {
      queryBuilder.andWhere('import_record.file_format = :fileFormat', {
        fileFormat,
      });
    }
    // 时间范围筛选
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    if (startDate) {
      const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
      queryBuilder.andWhere(
        'UNIX_TIMESTAMP(import_record.created_at) >= :startTimestamp',
        {
          startTimestamp,
        },
      );
    }
    if (endDate) {
      const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
      queryBuilder.andWhere(
        'UNIX_TIMESTAMP(import_record.created_at) <= :endTimestamp',
        {
          endTimestamp,
        },
      );
    }

    // 排序
    queryBuilder.orderBy('import_record.created_at', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // 执行查询
    const [items, total] = await queryBuilder.getManyAndCount();

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 根据ID查询导入记录
   * @param id 导入记录ID
   * @returns 导入记录
   */
  async findOne(id: string): Promise<ImportRecord> {
    const importRecord = await this.importRecordRepository.findOne({
      where: { id },
    });

    if (!importRecord) {
      throw new NotFoundException(`导入记录不存在: ${id}`);
    }

    return importRecord;
  }

  /**
   * 删除导入记录
   * @param id 导入记录ID
   */
  async remove(id: string): Promise<void> {
    const importRecord = await this.findOne(id);
    await this.importRecordRepository.remove(importRecord);
  }
}
