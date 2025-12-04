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

      // Assert - 验证结果
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'import_record.created_at >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'import_record.created_at <= :endDate',
        { endDate },
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
});
