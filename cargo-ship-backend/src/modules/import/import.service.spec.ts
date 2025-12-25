import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository, QueryRunner, EntityManager } from 'typeorm';
import { ImportService } from './import.service';
import {
  ImportRecord,
  ImportStatus,
  DuplicateStrategy,
  FileFormat,
} from '../../database/entities/import-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import {
  TimeSeriesData,
  MetricType,
  DataQuality,
  DataSource as TimeSeriesDataSource,
} from '../../database/entities/time-series-data.entity';
import { FileParserService, ParsedTimeSeriesData } from './file-parser.service';
import { AlarmService } from '../alarm/alarm.service';
import { AlarmPushService } from '../alarm/alarm-push.service';
import { MonitoringPushService } from '../monitoring/monitoring-push.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

/**
 * 导入服务单元测试
 * 测试时间序列数据导入记录管理和批量导入逻辑
 */
describe('ImportService', () => {
  let service: ImportService;
  let importRecordRepository: jest.Mocked<Repository<ImportRecord>>;
  let fileParserService: jest.Mocked<FileParserService>;
  let dataSource: jest.Mocked<DataSource>;
  let mockQueryRunner: jest.Mocked<QueryRunner>;
  let mockEntityManager: jest.Mocked<EntityManager>;

  /**
   * 创建模拟的导入记录
   */
  const createMockImportRecord = (
    partial: Partial<ImportRecord> = {},
  ): ImportRecord =>
    ({
      id: 'import-record-id',
      fileName: 'test.xlsx',
      fileFormat: FileFormat.EXCEL,
      fileSize: 1024,
      duplicateStrategy: DuplicateStrategy.SKIP,
      status: ImportStatus.PENDING,
      totalRows: 10,
      successRows: 0,
      failedRows: 0,
      skippedRows: 0,
      errors: [],
      importedBy: 'user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    }) as ImportRecord;

  /**
   * 创建模拟的文件对象
   */
  const createMockFile = (
    partial: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: 'test.xlsx',
      encoding: '7bit',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test'),
      size: 1024,
      ...partial,
    }) as Express.Multer.File;

  /**
   * 创建模拟的时间序列数据
   */
  const createMockParsedTimeSeriesData = (
    partial: Partial<ParsedTimeSeriesData> = {},
  ): ParsedTimeSeriesData => ({
    equipmentId: 'ENG-001',
    timestamp: new Date('2024-01-15T10:30:00'),
    metricType: MetricType.VIBRATION,
    value: 2.5,
    unit: 'mm/s',
    quality: DataQuality.NORMAL,
    source: TimeSeriesDataSource.FILE_IMPORT,
    ...partial,
  });

  beforeEach(async () => {
    // 创建模拟的 EntityManager
    mockEntityManager = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    // 创建模拟的 QueryRunner
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: mockEntityManager,
    } as any;

    // 创建模拟的 DataSource
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: getRepositoryToken(ImportRecord),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TimeSeriesData),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: FileParserService,
          useValue: {
            parseExcel: jest.fn(),
            parseCSV: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: AlarmService,
          useValue: {
            evaluateThresholds: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AlarmPushService,
          useValue: {
            pushBatchAlarms: jest.fn(),
          },
        },
        {
          provide: MonitoringPushService,
          useValue: {
            pushNewData: jest.fn(),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            sendToEquipment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    importRecordRepository = module.get(getRepositoryToken(ImportRecord));
    fileParserService = module.get(FileParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被正确定义', () => {
    expect(service).toBeDefined();
  });

  describe('uploadAndParseFile', () => {
    it('应该成功上传并解析 Excel 时间序列数据文件', async () => {
      // Arrange - 准备测试数据
      const mockFile = createMockFile();
      const mockParsedData = [
        createMockParsedTimeSeriesData(),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-002',
          metricType: MetricType.TEMPERATURE,
          value: 75.3,
        }),
      ];
      const mockParseResult = {
        data: mockParsedData,
        totalRows: 2,
        validRows: 2,
        errors: [],
      };
      const mockImportRecord = createMockImportRecord();

      fileParserService.parseExcel.mockResolvedValue(mockParseResult);
      importRecordRepository.create.mockReturnValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);

      // Act - 执行操作
      const result = await service.uploadAndParseFile(
        mockFile,
        FileFormat.EXCEL,
        DuplicateStrategy.SKIP,
        'user-id',
      );

      // Assert - 验证结果
      expect(fileParserService.parseExcel).toHaveBeenCalledWith(
        mockFile.buffer,
      );
      expect(importRecordRepository.create).toHaveBeenCalled();
      expect(importRecordRepository.save).toHaveBeenCalled();
      expect(result.importRecord).toBeDefined();
      expect(result.previewData).toHaveLength(2);
      expect(result.previewData[0].equipmentId).toBe('ENG-001');
      expect(result.previewData[0].metricType).toBe(MetricType.VIBRATION);
    });

    it('应该成功上传并解析 CSV 时间序列数据文件', async () => {
      // Arrange - 准备测试数据
      const mockFile = createMockFile({
        originalname: 'test.csv',
        mimetype: 'text/csv',
      });
      const mockParsedData = [createMockParsedTimeSeriesData()];
      const mockParseResult = {
        data: mockParsedData,
        totalRows: 1,
        validRows: 1,
        errors: [],
      };
      const mockImportRecord = createMockImportRecord();

      fileParserService.parseCSV.mockResolvedValue(mockParseResult);
      importRecordRepository.create.mockReturnValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);

      // Act - 执行操作
      const result = await service.uploadAndParseFile(
        mockFile,
        FileFormat.CSV,
        DuplicateStrategy.SKIP,
        'user-id',
      );

      // Assert - 验证结果
      expect(fileParserService.parseCSV).toHaveBeenCalledWith(mockFile.buffer);
      expect(result.previewData).toHaveLength(1);
    });

    it('应该拒绝不匹配的文件格式', async () => {
      // Arrange - 准备测试数据：声明为 Excel 但实际是 CSV
      const mockFile = createMockFile({
        mimetype: 'text/csv',
      });

      // Act & Assert - 验证抛出异常
      await expect(
        service.uploadAndParseFile(
          mockFile,
          FileFormat.EXCEL,
          DuplicateStrategy.SKIP,
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该处理文件解析错误', async () => {
      // Arrange - 准备测试数据
      const mockFile = createMockFile();
      fileParserService.parseExcel.mockRejectedValue(new Error('解析失败'));

      // Act & Assert - 验证抛出异常
      await expect(
        service.uploadAndParseFile(
          mockFile,
          FileFormat.EXCEL,
          DuplicateStrategy.SKIP,
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该记录解析错误到导入记录', async () => {
      // Arrange - 准备测试数据
      const mockFile = createMockFile();
      const mockParseResult = {
        data: [createMockParsedTimeSeriesData()],
        totalRows: 2,
        validRows: 1,
        errors: [{ row: 2, data: {}, reason: '缺少必填字段: 数值' }],
      };

      fileParserService.parseExcel.mockResolvedValue(mockParseResult);
      importRecordRepository.create.mockImplementation((data: any) => {
        return {
          ...createMockImportRecord(),
          ...data,
        } as ImportRecord;
      });
      importRecordRepository.save.mockImplementation((record) =>
        Promise.resolve(record as ImportRecord),
      );

      // Act - 执行操作
      const result = await service.uploadAndParseFile(
        mockFile,
        FileFormat.EXCEL,
        DuplicateStrategy.SKIP,
        'user-id',
      );

      // Assert - 验证结果
      expect(result.importRecord.failedRows).toBe(1);
      expect(result.importRecord.errors).toHaveLength(1);
    });

    it('应该只返回前 100 行作为预览', async () => {
      // Arrange - 准备测试数据：150 行数据
      const mockParsedData = Array.from({ length: 150 }, (_, i) =>
        createMockParsedTimeSeriesData({
          equipmentId: `ENG-${i + 1}`,
          timestamp: new Date(`2024-01-15T10:${i % 60}:00`),
        }),
      );
      const mockParseResult = {
        data: mockParsedData,
        totalRows: 150,
        validRows: 150,
        errors: [],
      };

      fileParserService.parseExcel.mockResolvedValue(mockParseResult);
      importRecordRepository.create.mockImplementation((data: any) => {
        return {
          ...createMockImportRecord(),
          ...data,
        } as ImportRecord;
      });
      importRecordRepository.save.mockImplementation((record) =>
        Promise.resolve(record as ImportRecord),
      );

      // Act - 执行操作
      const result = await service.uploadAndParseFile(
        createMockFile(),
        FileFormat.EXCEL,
        DuplicateStrategy.SKIP,
        'user-id',
      );

      // Assert - 验证结果
      expect(result.previewData).toHaveLength(100);
      expect(result.importRecord.totalRows).toBe(150);
    });
  });

  describe('executeImport', () => {
    it('应该成功执行时间序列数据导入', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData(),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-002',
          metricType: MetricType.TEMPERATURE,
          value: 75,
        }),
      ];

      const mockEquipment = [
        { deviceId: 'ENG-001' },
        { deviceId: 'ENG-002' },
      ] as Equipment[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(undefined);

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        false,
      );

      // Assert - 验证结果
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.status).toBe(ImportStatus.COMPLETED);
      expect(result.successRows).toBe(2);
      expect(result.failedRows).toBe(0);
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        TimeSeriesData,
        expect.any(Array),
      );
    });

    it('应该验证设备是否存在', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData(),
        createMockParsedTimeSeriesData({ equipmentId: 'NON-EXISTENT' }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(undefined);

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        true, // 跳过无效行
      );

      // Assert - 验证结果
      expect(result.successRows).toBe(1);
      expect(result.failedRows).toBe(1);
      expect(result.status).toBe(ImportStatus.PARTIAL);
      expect(result.errors[0].reason).toContain('设备不存在');
    });

    it('应该支持批量插入（1000 条一批）', async () => {
      // Arrange - 准备测试数据：1500 条数据
      const mockImportRecord = createMockImportRecord();
      const mockData = Array.from({ length: 1500 }, (_, i) =>
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: new Date(`2024-01-15T${i % 24}:00:00`),
        }),
      );

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(undefined);

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        false,
      );

      // Assert - 验证结果
      expect(result.successRows).toBe(1500);
      // 应该调用了2次 save（1000 + 500）
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
    });

    it('应该在遇到错误时回滚事务（不跳过无效行）', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [createMockParsedTimeSeriesData()];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockRejectedValue(new Error('数据库错误'));

      // Act & Assert - 验证抛出异常
      await expect(
        service.executeImport(
          'import-record-id',
          mockData,
          false, // 不跳过无效行
        ),
      ).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('应该跳过无效行并继续导入', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData(),
        createMockParsedTimeSeriesData({ equipmentId: 'NON-EXISTENT' }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(undefined);

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        true, // 跳过无效行
      );

      // Assert - 验证结果
      expect(result.successRows).toBe(1);
      expect(result.failedRows).toBe(1);
      expect(result.status).toBe(ImportStatus.PARTIAL);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('应该拒绝正在执行的导入任务', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord({
        status: ImportStatus.PROCESSING,
      });

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);

      // Act & Assert - 验证抛出异常
      await expect(
        service.executeImport('import-record-id', [], false),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该拒绝已完成的导入任务', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord({
        status: ImportStatus.COMPLETED,
      });

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);

      // Act & Assert - 验证抛出异常
      await expect(
        service.executeImport('import-record-id', [], false),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该在导入记录不存在时抛出异常', async () => {
      // Arrange - 准备测试数据
      importRecordRepository.findOne.mockResolvedValue(null);

      // Act & Assert - 验证抛出异常
      await expect(
        service.executeImport('non-existent-id', [], false),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该在所有行失败时设置状态为 FAILED', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [createMockParsedTimeSeriesData()];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue([]); // 没有设备存在

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        true, // 跳过无效行
      );

      // Assert - 验证结果
      expect(result.status).toBe(ImportStatus.FAILED);
      expect(result.successRows).toBe(0);
      expect(result.failedRows).toBe(1);
    });

    it('应该正确保存时间序列数据的所有字段', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: new Date('2024-01-15T10:30:00'),
          metricType: MetricType.VIBRATION,
          value: 2.5,
          unit: 'mm/s',
          quality: DataQuality.NORMAL,
          source: TimeSeriesDataSource.FILE_IMPORT,
        }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(undefined);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证结果
      expect(mockEntityManager.create).toHaveBeenCalledWith(
        TimeSeriesData,
        expect.objectContaining({
          equipmentId: 'ENG-001',
          timestamp: expect.any(Date),
          metricType: MetricType.VIBRATION,
          value: 2.5,
          unit: 'mm/s',
          quality: DataQuality.NORMAL,
          source: TimeSeriesDataSource.FILE_IMPORT,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('应该返回分页的导入记录列表', async () => {
      // Arrange - 准备测试数据
      const mockRecords = [
        createMockImportRecord(),
        createMockImportRecord({ id: 'record-2' }),
      ];
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockRecords, 2]),
      };

      importRecordRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      const result = await service.findAll({ page: 1, pageSize: 10 });

      // Assert - 验证结果
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('应该支持按状态筛选', async () => {
      // Arrange - 准备测试数据
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      importRecordRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.findAll({ status: ImportStatus.COMPLETED });

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'import_record.status = :status',
        { status: ImportStatus.COMPLETED },
      );
    });

    it('应该支持按文件格式筛选', async () => {
      // Arrange - 准备测试数据
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      importRecordRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act - 执行操作
      await service.findAll({ fileFormat: FileFormat.EXCEL });

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'import_record.file_format = :fileFormat',
        { fileFormat: FileFormat.EXCEL },
      );
    });

    it('应该支持按日期范围筛选', async () => {
      // Arrange - 准备测试数据
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      importRecordRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Act - 执行操作
      await service.findAll({ startDate, endDate });

      // Assert - 验证结果 (使用 UNIX_TIMESTAMP)
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'UNIX_TIMESTAMP(import_record.created_at) >= :startTimestamp',
        { startTimestamp },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'UNIX_TIMESTAMP(import_record.created_at) <= :endTimestamp',
        { endTimestamp },
      );
    });
  });

  describe('findOne', () => {
    it('应该返回指定ID的导入记录', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);

      // Act - 执行操作
      const result = await service.findOne('import-record-id');

      // Assert - 验证结果
      expect(result).toEqual(mockImportRecord);
      expect(importRecordRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'import-record-id' },
      });
    });

    it('应该在记录不存在时抛出异常', async () => {
      // Arrange - 准备测试数据
      importRecordRepository.findOne.mockResolvedValue(null);

      // Act & Assert - 验证抛出异常
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('应该成功删除导入记录', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.remove.mockResolvedValue(mockImportRecord);

      // Act - 执行操作
      await service.remove('import-record-id');

      // Assert - 验证结果
      expect(importRecordRepository.remove).toHaveBeenCalledWith(
        mockImportRecord,
      );
    });

    it('应该在记录不存在时抛出异常', async () => {
      // Arrange - 准备测试数据
      importRecordRepository.findOne.mockResolvedValue(null);

      // Act & Assert - 验证抛出异常
      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== 任务5.1: 测试告警评估集成 ==========
  describe('告警评估集成', () => {
    let mockAlarmService: jest.Mocked<AlarmService>;
    let mockWebsocketGateway: jest.Mocked<WebsocketGateway>;

    beforeEach(() => {
      mockAlarmService = {
        evaluateThresholds: jest.fn().mockResolvedValue([]),
      } as any;

      mockWebsocketGateway = {
        sendToEquipment: jest.fn(),
      } as any;

      // 重新注入模拟服务
      (service as any).alarmService = mockAlarmService;
      (service as any).websocketGateway = mockWebsocketGateway;
    });

    it('应该在导入成功后调用告警评估', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData(),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-002',
          metricType: MetricType.TEMPERATURE,
          value: 85,
        }),
      ];

      const mockEquipment = [
        { deviceId: 'ENG-001' },
        { deviceId: 'ENG-002' },
      ] as Equipment[];

      const mockSavedData = mockData.map((data, index) => ({
        id: index + 1,
        ...data,
      })) as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Mock AlarmService.evaluateThresholds 返回空数组（未触发告警）
      mockAlarmService.evaluateThresholds.mockResolvedValue([]);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证告警评估被调用
      expect(mockAlarmService.evaluateThresholds).toHaveBeenCalledTimes(2);
      expect(mockAlarmService.evaluateThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-001',
          metricType: MetricType.VIBRATION,
        }),
      );
      expect(mockAlarmService.evaluateThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-002',
          metricType: MetricType.TEMPERATURE,
        }),
      );
    });

    it('应该在触发告警时正确创建告警记录', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          metricType: MetricType.TEMPERATURE,
          value: 95, // 触发高温告警
        }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [
        { id: 1, ...mockData[0], timestamp: mockData[0].timestamp },
      ] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Mock 返回触发的告警
      const mockAlarmRecord = {
        id: 'alarm-1',
        equipmentId: 'ENG-001',
        monitoringPoint: '引擎温度',
        faultName: '温度过高',
        triggeredAt: mockData[0].timestamp,
      };
      mockAlarmService.evaluateThresholds.mockResolvedValue([
        mockAlarmRecord as any,
      ]);

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        false,
      );

      // Assert - 验证结果
      expect(result.status).toBe(ImportStatus.COMPLETED);
      expect(mockAlarmService.evaluateThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-001',
          timestamp: mockData[0].timestamp,
        }),
      );
    });

    it('应该使用数据的原始时间戳作为告警触发时间', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const historicalTimestamp = new Date('2024-01-01T10:00:00'); // 历史时间
      const mockData = [
        createMockParsedTimeSeriesData({
          timestamp: historicalTimestamp,
        }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [
        { id: 1, ...mockData[0], timestamp: historicalTimestamp },
      ] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      mockAlarmService.evaluateThresholds.mockResolvedValue([]);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证传递了正确的时间戳
      expect(mockAlarmService.evaluateThresholds).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: historicalTimestamp,
        }),
      );
    });

    it('应该在单条评估失败时不影响其他数据', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData({ equipmentId: 'ENG-001' }),
        createMockParsedTimeSeriesData({ equipmentId: 'ENG-002' }),
        createMockParsedTimeSeriesData({ equipmentId: 'ENG-003' }),
      ];

      const mockEquipment = [
        { deviceId: 'ENG-001' },
        { deviceId: 'ENG-002' },
        { deviceId: 'ENG-003' },
      ] as Equipment[];

      const mockSavedData = mockData.map((data, index) => ({
        id: index + 1,
        ...data,
      })) as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Mock 第二条数据的评估失败
      mockAlarmService.evaluateThresholds
        .mockResolvedValueOnce([]) // 第一条成功
        .mockRejectedValueOnce(new Error('评估失败')) // 第二条失败
        .mockResolvedValueOnce([]); // 第三条成功

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        false,
      );

      // Assert - 验证导入成功，评估失败不影响
      expect(result.status).toBe(ImportStatus.COMPLETED);
      expect(result.successRows).toBe(3); // 所有数据都成功保存
      expect(mockAlarmService.evaluateThresholds).toHaveBeenCalledTimes(3);
    });

    it('应该在所有评估失败时仍然保持导入成功状态', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [createMockParsedTimeSeriesData()];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [{ id: 1, ...mockData[0] }] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Mock 所有评估都失败
      mockAlarmService.evaluateThresholds.mockRejectedValue(
        new Error('AlarmService 不可用'),
      );

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        false,
      );

      // Assert - 验证导入成功
      expect(result.status).toBe(ImportStatus.COMPLETED);
      expect(result.successRows).toBe(1);
    });
  });

  // ========== 任务5.2: 测试最新数据识别 ==========
  describe('最新数据识别', () => {
    let mockAlarmService: jest.Mocked<AlarmService>;
    let mockMonitoringPushService: jest.Mocked<MonitoringPushService>;

    beforeEach(() => {
      mockAlarmService = {
        evaluateThresholds: jest.fn().mockResolvedValue([]),
      } as any;

      mockMonitoringPushService = {
        pushNewData: jest.fn(),
      } as any;

      (service as any).alarmService = mockAlarmService;
      (service as any).monitoringPushService = mockMonitoringPushService;
    });

    it('应该从单个设备的多条数据中正确识别时间戳最新的记录', async () => {
      // Arrange - 准备测试数据：同一设备的3条数据，时间戳不同
      const mockImportRecord = createMockImportRecord();
      const timestamp1 = new Date('2024-01-15T10:00:00Z');
      const timestamp2 = new Date('2024-01-15T12:00:00Z'); // 最新
      const timestamp3 = new Date('2024-01-15T08:00:00Z');

      const mockData = [
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: timestamp1,
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: timestamp2,
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: timestamp3,
        }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [
        { id: 1, ...mockData[0], timestamp: timestamp1 },
        { id: 2, ...mockData[1], timestamp: timestamp2 },
        { id: 3, ...mockData[2], timestamp: timestamp3 },
      ] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证只推送了一次（最新数据）
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledTimes(1);
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-001',
          timestamp: timestamp2, // 最新时间
        }),
      );
    });

    it('应该从多个设备的数据中为每个设备识别最新记录', async () => {
      // Arrange - 准备测试数据：3个设备，每个设备2条数据
      const mockImportRecord = createMockImportRecord();
      const timestamp1 = new Date('2024-01-15T10:00:00Z');
      const timestamp2 = new Date('2024-01-15T11:00:00Z'); // ENG-001 最新
      const timestamp3 = new Date('2024-01-15T09:00:00Z'); // ENG-002 最新
      const timestamp4 = new Date('2024-01-15T08:00:00Z');
      const timestamp5 = new Date('2024-01-15T13:00:00Z'); // ENG-003 最新（也是全局最新）

      const mockData = [
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: timestamp1,
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: timestamp2,
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-002',
          timestamp: timestamp3,
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-002',
          timestamp: timestamp4,
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-003',
          timestamp: timestamp5,
        }),
      ];

      const mockEquipment = [
        { deviceId: 'ENG-001' },
        { deviceId: 'ENG-002' },
        { deviceId: 'ENG-003' },
      ] as Equipment[];

      const mockSavedData = [
        { id: 1, ...mockData[0], timestamp: timestamp1 },
        { id: 2, ...mockData[1], timestamp: timestamp2 },
        { id: 3, ...mockData[2], timestamp: timestamp3 },
        { id: 4, ...mockData[3], timestamp: timestamp4 },
        { id: 5, ...mockData[4], timestamp: timestamp5 },
      ] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证为每个设备推送了一次
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledTimes(3);
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-001',
          timestamp: timestamp2,
        }),
      );
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-002',
          timestamp: timestamp3,
        }),
      );
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-003',
          timestamp: timestamp5,
        }),
      );
    });

    it('应该正确处理单条数据的情况', async () => {
      // Arrange - 准备测试数据：单条数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [createMockParsedTimeSeriesData()];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [{ id: 1, ...mockData[0] }] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证推送了该条数据
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledTimes(1);
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledWith(
        expect.objectContaining({
          equipmentId: 'ENG-001',
        }),
      );
    });

    it('应该在无成功数据时跳过推送', async () => {
      // Arrange - 准备测试数据：所有数据都无效
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData({ equipmentId: 'NON-EXISTENT' }),
      ];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue([]); // 没有设备存在

      // Act - 执行操作
      await service.executeImport(
        'import-record-id',
        mockData,
        true, // 跳过无效行
      );

      // Assert - 验证没有推送
      expect(mockMonitoringPushService.pushNewData).not.toHaveBeenCalled();
    });
  });

  // ========== 任务5.3: 测试 WebSocket 推送集成 ==========
  describe('WebSocket 推送集成', () => {
    let mockAlarmService: jest.Mocked<AlarmService>;
    let mockMonitoringPushService: jest.Mocked<MonitoringPushService>;

    beforeEach(() => {
      mockAlarmService = {
        evaluateThresholds: jest.fn().mockResolvedValue([]),
      } as any;

      mockMonitoringPushService = {
        pushNewData: jest.fn(),
      } as any;

      (service as any).alarmService = mockAlarmService;
      (service as any).monitoringPushService = mockMonitoringPushService;
    });

    it('应该为每个设备调用一次 pushNewData', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp: new Date('2024-01-15T10:00:00'),
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-002',
          timestamp: new Date('2024-01-15T11:00:00'),
        }),
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-003',
          timestamp: new Date('2024-01-15T12:00:00'),
        }),
      ];

      const mockEquipment = [
        { deviceId: 'ENG-001' },
        { deviceId: 'ENG-002' },
        { deviceId: 'ENG-003' },
      ] as Equipment[];

      const mockSavedData = mockData.map((data, index) => ({
        id: index + 1,
        ...data,
      })) as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证为每个设备调用一次
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledTimes(3);
    });

    it('应该推送正确格式的消息', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const timestamp = new Date('2024-01-15T10:30:00');
      const mockData = [
        createMockParsedTimeSeriesData({
          equipmentId: 'ENG-001',
          timestamp,
          metricType: MetricType.VIBRATION,
          monitoringPoint: '主轴振动',
          value: 2.5,
          unit: 'mm/s',
          quality: DataQuality.NORMAL,
          source: TimeSeriesDataSource.FILE_IMPORT,
        }),
      ];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [
        { id: 123, ...mockData[0], timestamp },
      ] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证推送消息格式
      expect(mockMonitoringPushService.pushNewData).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          equipmentId: 'ENG-001',
          timestamp: timestamp,
          metricType: MetricType.VIBRATION,
          monitoringPoint: '主轴振动',
          value: 2.5,
          unit: 'mm/s',
          quality: DataQuality.NORMAL,
          source: TimeSeriesDataSource.FILE_IMPORT,
        }),
      );
    });

    it('应该在推送失败时不影响导入状态', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [createMockParsedTimeSeriesData()];

      const mockEquipment = [{ deviceId: 'ENG-001' }] as Equipment[];
      const mockSavedData = [{ id: 1, ...mockData[0] }] as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Mock MonitoringPushService 推送失败
      mockMonitoringPushService.pushNewData.mockImplementation(() => {
        throw new Error('WebSocket 连接失败');
      });

      // Act - 执行操作
      const result = await service.executeImport(
        'import-record-id',
        mockData,
        false,
      );

      // Assert - 验证导入仍然成功
      expect(result.status).toBe(ImportStatus.COMPLETED);
      expect(result.successRows).toBe(1);
    });

    it('应该在推送成功时记录日志', async () => {
      // Arrange - 准备测试数据
      const mockImportRecord = createMockImportRecord();
      const mockData = [
        createMockParsedTimeSeriesData({ equipmentId: 'ENG-001' }),
        createMockParsedTimeSeriesData({ equipmentId: 'ENG-002' }),
      ];

      const mockEquipment = [
        { deviceId: 'ENG-001' },
        { deviceId: 'ENG-002' },
      ] as Equipment[];

      const mockSavedData = mockData.map((data, index) => ({
        id: index + 1,
        ...data,
      })) as TimeSeriesData[];

      importRecordRepository.findOne.mockResolvedValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);
      mockEntityManager.find.mockResolvedValue(mockEquipment);
      mockEntityManager.create.mockImplementation(
        (entity, data) => data as any,
      );
      mockEntityManager.save.mockResolvedValue(mockSavedData);

      // Spy on logger
      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      // Act - 执行操作
      await service.executeImport('import-record-id', mockData, false);

      // Assert - 验证日志记录
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('最新数据推送完成'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('推送设备数=2'),
      );
    });
  });

  // ========== 任务5.4: 测试文件解析 - 监测点字段 ==========
  describe('文件解析 - 监测点字段', () => {
    it('应该正确解析包含监测点列的数据', async () => {
      // Arrange - 准备测试数据
      const mockFile = createMockFile();
      const mockParsedData = [
        createMockParsedTimeSeriesData({
          monitoringPoint: '总电压',
        }),
        createMockParsedTimeSeriesData({
          monitoringPoint: '最高单体温度',
        }),
      ];

      const mockParseResult = {
        data: mockParsedData,
        totalRows: 2,
        validRows: 2,
        errors: [],
      };

      const mockImportRecord = createMockImportRecord();

      fileParserService.parseExcel.mockResolvedValue(mockParseResult);
      importRecordRepository.create.mockReturnValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);

      // Act - 执行操作
      const result = await service.uploadAndParseFile(
        mockFile,
        FileFormat.EXCEL,
        DuplicateStrategy.SKIP,
        'user-id',
      );

      // Assert - 验证监测点字段
      expect(result.previewData[0].monitoringPoint).toBe('总电压');
      expect(result.previewData[1].monitoringPoint).toBe('最高单体温度');
    });

    it('应该在监测点为空时设置为 undefined（向后兼容）', async () => {
      // Arrange - 准备测试数据：不包含监测点列
      const mockFile = createMockFile();
      const mockParsedData = [
        createMockParsedTimeSeriesData({
          monitoringPoint: undefined,
        }),
      ];

      const mockParseResult = {
        data: mockParsedData,
        totalRows: 1,
        validRows: 1,
        errors: [],
      };

      const mockImportRecord = createMockImportRecord();

      fileParserService.parseExcel.mockResolvedValue(mockParseResult);
      importRecordRepository.create.mockReturnValue(mockImportRecord);
      importRecordRepository.save.mockResolvedValue(mockImportRecord);

      // Act - 执行操作
      const result = await service.uploadAndParseFile(
        mockFile,
        FileFormat.EXCEL,
        DuplicateStrategy.SKIP,
        'user-id',
      );

      // Assert - 验证监测点为 undefined
      expect(result.previewData[0].monitoringPoint).toBeUndefined();
    });
  });
});
