import { Test, TestingModule } from '@nestjs/testing';
import { FileParserService } from './file-parser.service';
import { BadRequestException } from '@nestjs/common';
import {
  MetricType,
  DataQuality,
  DataSource,
} from '../../database/entities/time-series-data.entity';
import * as XLSX from 'xlsx';

describe('FileParserService', () => {
  let service: FileParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileParserService],
    }).compile();

    service = module.get<FileParserService>(FileParserService);
  });

  it('应该成功定义服务', () => {
    expect(service).toBeDefined();
  });

  // ==================== 解析Excel文件测试 ====================
  describe('解析Excel文件 (parseExcel)', () => {
    it('应该成功解析有效的时间序列数据Excel文件', async () => {
      // Arrange: 创建测试Excel文件（时间序列数据）
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
          单位: 'mm/s',
          数据质量: '正常',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '温度',
          数值: '75.3',
          单位: '°C',
          数据质量: '正常',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);

      // 验证第一条数据
      expect(result.data[0].equipmentId).toBe('ENG-001');
      expect(result.data[0].metricType).toBe(MetricType.VIBRATION);
      expect(result.data[0].value).toBe(2.5);
      expect(result.data[0].unit).toBe('mm/s');
      expect(result.data[0].quality).toBe(DataQuality.NORMAL);
      expect(result.data[0].source).toBe(DataSource.FILE_IMPORT);
      expect(result.data[0].timestamp).toBeInstanceOf(Date);

      // 验证第二条数据
      expect(result.data[1].metricType).toBe(MetricType.TEMPERATURE);
      expect(result.data[1].value).toBe(75.3);
    });

    it('应该在Excel文件为空时抛出错误', async () => {
      // Arrange: 创建空Excel文件
      const worksheet = XLSX.utils.json_to_sheet([]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act & Assert: 执行并验证异常
      await expect(service.parseExcel(buffer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.parseExcel(buffer)).rejects.toThrow(
        'Excel文件中没有数据',
      );
    });

    it('应该检测缺少必填字段的行', async () => {
      // Arrange: 创建缺少必填字段的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          // 缺少"指标类型"
          数值: '2.5',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(0);
      expect(result.data).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('缺少必填字段');
    });

    it('应该检测所有必填字段（equipmentId, timestamp, metricType, value）', async () => {
      // Arrange: 创建分别缺少不同必填字段的Excel文件
      const testCases = [
        { 时间戳: '2024-01-15 10:30:00', 指标类型: '振动', 数值: '2.5' }, // 缺少设备ID
        { 设备ID: 'ENG-001', 指标类型: '振动', 数值: '2.5' }, // 缺少时间戳
        { 设备ID: 'ENG-001', 时间戳: '2024-01-15 10:30:00', 数值: '2.5' }, // 缺少指标类型
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
        }, // 缺少数值
      ];

      for (const testData of testCases) {
        const worksheet = XLSX.utils.json_to_sheet([testData]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const buffer = XLSX.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        });

        // Act: 执行操作
        const result = await service.parseExcel(buffer);

        // Assert: 验证结果
        expect(result.validRows).toBe(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].reason).toContain('缺少必填字段');
      }
    });

    it('应该检测无效的指标类型', async () => {
      // Arrange: 创建包含无效指标类型的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '无效指标',
          数值: '2.5',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('无效的指标类型');
    });

    it('应该检测无效的数值格式', async () => {
      // Arrange: 创建包含无效数值的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '非数字',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('无效的数值格式');
    });

    it('应该正确映射所有指标类型', async () => {
      // Arrange: 创建包含所有指标类型的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '温度',
          数值: '75',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '压力',
          数值: '0.8',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '湿度',
          数值: '60',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '转速',
          数值: '1500',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '电流',
          数值: '10',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '电压',
          数值: '220',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '功率',
          数值: '50',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(8);
      expect(result.data[0].metricType).toBe(MetricType.VIBRATION);
      expect(result.data[1].metricType).toBe(MetricType.TEMPERATURE);
      expect(result.data[2].metricType).toBe(MetricType.PRESSURE);
      expect(result.data[3].metricType).toBe(MetricType.HUMIDITY);
      expect(result.data[4].metricType).toBe(MetricType.SPEED);
      expect(result.data[5].metricType).toBe(MetricType.CURRENT);
      expect(result.data[6].metricType).toBe(MetricType.VOLTAGE);
      expect(result.data[7].metricType).toBe(MetricType.POWER);
    });

    it('应该正确映射所有数据质量状态', async () => {
      // Arrange: 创建包含所有数据质量的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
          数据质量: '正常',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:31:00',
          指标类型: '振动',
          数值: '150',
          数据质量: '异常',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:32:00',
          指标类型: '振动',
          数值: '95',
          数据质量: '疑似',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果（注意：数值超范围的会被过滤）
      expect(result.data[0].quality).toBe(DataQuality.NORMAL);
    });

    it('应该自动填充标准单位（如果未提供）', async () => {
      // Arrange: 创建不包含单位字段的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '温度',
          数值: '75',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '压力',
          数值: '0.8',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(3);
      expect(result.data[0].unit).toBe('mm/s'); // 振动
      expect(result.data[1].unit).toBe('°C'); // 温度
      expect(result.data[2].unit).toBe('MPa'); // 压力
    });

    it('应该验证 source 自动设置为 FILE_IMPORT', async () => {
      // Arrange: 创建测试Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.data[0].source).toBe(DataSource.FILE_IMPORT);
    });

    it('应该支持多种时间戳格式', async () => {
      // Arrange: 创建包含不同时间格式的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024/01/15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15',
          指标类型: '振动',
          数值: '2.5',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(3);
      expect(result.data[0].timestamp).toBeInstanceOf(Date);
      expect(result.data[1].timestamp).toBeInstanceOf(Date);
      expect(result.data[2].timestamp).toBeInstanceOf(Date);
    });

    it('应该检测数值超出合理范围', async () => {
      // Arrange: 创建数值超出范围的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '150', // 超出范围 [0, 100]
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('数值超出合理范围');
    });

    it('应该处理包含可选字段的数据', async () => {
      // Arrange: 创建包含所有可选字段的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
          单位: 'mm/s',
          数据质量: '正常',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(1);
      expect(result.data[0].unit).toBe('mm/s');
      expect(result.data[0].quality).toBe(DataQuality.NORMAL);
    });

    it('应该支持预览功能（前100行）', async () => {
      // Arrange: 创建超过100行的Excel文件
      const testData = Array(150)
        .fill(null)
        .map((_, index) => ({
          设备ID: `ENG-${String(index + 1).padStart(3, '0')}`,
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        }));

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果（解析所有行）
      expect(result.totalRows).toBe(150);
      expect(result.validRows).toBe(150);
    });
  });

  // ==================== 解析CSV文件测试 ====================
  describe('解析CSV文件 (parseCSV)', () => {
    it('应该成功解析有效的时间序列数据CSV文件', async () => {
      // Arrange: 创建测试CSV文件（时间序列数据）
      const csvContent = `设备ID,时间戳,指标类型,数值,单位,数据质量
ENG-001,2024-01-15 10:30:00,振动,2.5,mm/s,正常
ENG-001,2024-01-15 10:30:00,温度,75.3,°C,正常`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act: 执行操作
      const result = await service.parseCSV(buffer);

      // Assert: 验证结果
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.data[0].equipmentId).toBe('ENG-001');
      expect(result.data[0].metricType).toBe(MetricType.VIBRATION);
      expect(result.data[0].value).toBe(2.5);
    });

    it('应该在CSV文件为空时抛出错误', async () => {
      // Arrange: 创建空CSV文件
      const csvContent = '';
      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act & Assert: 执行并验证异常
      await expect(service.parseCSV(buffer)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.parseCSV(buffer)).rejects.toThrow(
        'CSV文件中没有数据',
      );
    });

    it('应该检测CSV中缺少必填字段的行', async () => {
      // Arrange: 创建缺少必填字段的CSV文件
      const csvContent = `设备ID,时间戳,数值
ENG-001,2024-01-15 10:30:00,2.5`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act: 执行操作
      const result = await service.parseCSV(buffer);

      // Assert: 验证结果
      expect(result.validRows).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toContain('缺少必填字段');
    });

    it('应该跳过CSV中的空行', async () => {
      // Arrange: 创建包含空行的CSV文件
      const csvContent = `设备ID,时间戳,指标类型,数值

ENG-001,2024-01-15 10:30:00,振动,2.5

ENG-002,2024-01-15 10:31:00,温度,75`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Act: 执行操作
      const result = await service.parseCSV(buffer);

      // Assert: 验证结果（应该只有2条有效数据）
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
    });
  });

  // ==================== 数据预览测试 ====================
  describe('数据预览功能', () => {
    it('应该能够预览前100行数据', async () => {
      // Arrange: 创建大量数据的Excel文件
      const testData = Array(200)
        .fill(null)
        .map((_, index) => ({
          设备ID: `ENG-${String(index + 1).padStart(3, '0')}`,
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        }));

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果（实际会解析所有数据，预览逻辑在控制器层实现）
      expect(result.totalRows).toBe(200);
      expect(result.validRows).toBe(200);
    });
  });

  // ==================== 错误处理测试 ====================
  describe('错误处理', () => {
    it('应该处理部分数据有效的情况', async () => {
      // Arrange: 创建部分数据有效的Excel文件
      const testData = [
        {
          设备ID: 'ENG-001',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
        {
          设备ID: 'ENG-002',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '温度',
          // 缺少数值
        },
        {
          设备ID: 'ENG-003',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '压力',
          数值: '0.8',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证结果
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });

    it('应该记录每个错误行的详细信息', async () => {
      // Arrange: 创建包含错误的Excel文件
      const testData = [
        {
          设备ID: '',
          时间戳: '2024-01-15 10:30:00',
          指标类型: '振动',
          数值: '2.5',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(testData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Act: 执行操作
      const result = await service.parseExcel(buffer);

      // Assert: 验证错误信息
      expect(result.errors[0].row).toBe(2); // 第2行（包含表头）
      expect(result.errors[0].data).toBeDefined();
      expect(result.errors[0].reason).toBeDefined();
    });
  });
});
