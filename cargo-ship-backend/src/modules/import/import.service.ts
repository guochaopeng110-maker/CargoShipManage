import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ImportRecord,
  ImportStatus,
  DuplicateStrategy,
  FileFormat,
} from '../../database/entities/import-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { FileParserService, ParsedTimeSeriesData } from './file-parser.service';
import type { Express } from 'express';

/**
 * 数据导入服务
 * 负责管理导入记录和执行时间序列数据导入操作
 */
@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(ImportRecord)
    private readonly importRecordRepository: Repository<ImportRecord>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(TimeSeriesData)
    private readonly timeSeriesDataRepository: Repository<TimeSeriesData>,
    private readonly fileParserService: FileParserService,
    private readonly dataSource: DataSource,
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
      } else {
        throw new BadRequestException(`不支持的文件格式: ${fileFormat}`);
      }
    } catch (error) {
      throw new BadRequestException(`文件解析失败: ${error.message}`);
    }

    // 创建导入记录
    const importRecord = this.importRecordRepository.create({
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
   * @param data 时间序列数据数组
   * @param skipInvalidRows 是否跳过无效行
   * @returns 导入结果统计
   */
  private async batchImportTimeSeriesData(
    data: ParsedTimeSeriesData[],
    skipInvalidRows: boolean,
  ): Promise<{
    successCount: number;
    failedCount: number;
    skippedCount: number;
    errors: any[];
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

    // 使用事务处理
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 预先查询所有设备ID，验证是否存在
      const equipmentIds = [...new Set(data.map((d) => d.equipmentId))];
      const existingEquipment = await queryRunner.manager.find(Equipment, {
        where: equipmentIds.map((id) => ({ deviceId: id })),
        select: ['deviceId'],
      });
      const existingEquipmentIds = new Set(
        existingEquipment.map((e) => e.deviceId),
      );

      // 处理每一批数据
      for (const batch of batches) {
        const validBatchData: TimeSeriesData[] = [];

        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const rowNumber = data.indexOf(row) + 1;

          try {
            // 验证设备是否存在
            if (!existingEquipmentIds.has(row.equipmentId)) {
              throw new Error(`设备不存在: ${row.equipmentId}`);
            }

            // 创建时间序列数据实体
            const timeSeriesData = queryRunner.manager.create(TimeSeriesData, {
              equipmentId: row.equipmentId,
              timestamp: row.timestamp,
              metricType: row.metricType,
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
          await queryRunner.manager.save(TimeSeriesData, validBatchData);
          successCount += validBatchData.length;
        }
      }

      // 提交事务
      await queryRunner.commitTransaction();

      return {
        successCount,
        failedCount,
        skippedCount,
        errors,
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
      [FileFormat.XML]: ['application/xml', 'text/xml'],
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
   * @returns 分页结果
   */
  async findAll(
    queryDto: any,
  ): Promise<{ data: ImportRecord[]; total: number }> {
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
    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
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
