import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import { ImportError } from '../../database/entities/import-record.entity';
import {
  MetricType,
  DataQuality,
  DataSource,
} from '../../database/entities/time-series-data.entity';

/**
 * 解析后的时间序列数据接口
 * 对应 time_series_data 表的字段结构
 */
export interface ParsedTimeSeriesData {
  equipmentId: string; // 设备ID（必填）
  timestamp: Date; // 时间戳（必填）
  metricType: MetricType; // 指标类型（必填）
  monitoringPoint?: string; // 监测点（可选，用于精确匹配告警规则）
  value: number; // 数值（必填）
  unit?: string; // 单位（可选）
  quality?: DataQuality; // 数据质量（可选）
  source?: DataSource; // 数据来源（可选，默认file-import）
}

/**
 * 文件解析结果接口
 */
export interface ParseResult {
  data: ParsedTimeSeriesData[];
  errors: ImportError[];
  totalRows: number;
  validRows: number;
}

/**
 * 文件解析服务
 * 负责解析Excel、CSV和JSON格式的时间序列数据文件
 */
@Injectable()
export class FileParserService {
  // 必填字段列表
  private readonly REQUIRED_FIELDS = [
    'equipmentId',
    'timestamp',
    'metricType',
    'value',
  ];

  // Excel表头映射（中文->英文字段名）
  private readonly COLUMN_MAPPING: Record<string, string> = {
    设备ID: 'equipmentId',
    设备编号: 'equipmentId',
    时间戳: 'timestamp',
    时间: 'timestamp',
    采集时间: 'timestamp',
    指标类型: 'metricType',
    监测指标: 'metricType',
    监测点: 'monitoringPoint',
    监控点: 'monitoringPoint',
    测点: 'monitoringPoint',
    监测点名称: 'monitoringPoint',
    'Monitoring Point': 'monitoringPoint',
    MonitoringPoint: 'monitoringPoint',
    数值: 'value',
    值: 'value',
    测量值: 'value',
    单位: 'unit',
    数据质量: 'quality',
    质量: 'quality',
  };

  // 指标类型映射（中文->枚举值）
  private readonly METRIC_TYPE_MAPPING: Record<string, MetricType> = {
    振动: MetricType.VIBRATION,
    温度: MetricType.TEMPERATURE,
    压力: MetricType.PRESSURE,
    湿度: MetricType.HUMIDITY,
    转速: MetricType.SPEED,
    电流: MetricType.CURRENT,
    电压: MetricType.VOLTAGE,
    功率: MetricType.POWER,
    频率: MetricType.FREQUENCY,
    液位: MetricType.LEVEL,
    水位: MetricType.LEVEL,
    电阻: MetricType.RESISTANCE,
    开关状态: MetricType.SWITCH,
    开关: MetricType.SWITCH,
  };

  // 数据质量映射（中文->枚举值）
  private readonly DATA_QUALITY_MAPPING: Record<string, DataQuality> = {
    正常: DataQuality.NORMAL,
    异常: DataQuality.ABNORMAL,
    疑似: DataQuality.SUSPICIOUS,
    可疑: DataQuality.SUSPICIOUS,
  };

  // 指标类型对应的合理数值范围
  private readonly METRIC_VALUE_RANGES: Record<
    MetricType,
    { min: number; max: number }
  > = {
    [MetricType.VIBRATION]: { min: 0, max: 100 }, // mm/s
    [MetricType.TEMPERATURE]: { min: -50, max: 200 }, // °C
    [MetricType.PRESSURE]: { min: 0, max: 10 }, // MPa
    [MetricType.HUMIDITY]: { min: 0, max: 100 }, // %
    [MetricType.SPEED]: { min: 0, max: 10000 }, // rpm
    [MetricType.CURRENT]: { min: 0, max: 1000 }, // A
    [MetricType.VOLTAGE]: { min: 0, max: 1000 }, // V
    [MetricType.POWER]: { min: 0, max: 10000 }, // kW
    [MetricType.FREQUENCY]: { min: 0, max: 100 }, // Hz
    [MetricType.LEVEL]: { min: 0, max: 10000 }, // mm
    [MetricType.RESISTANCE]: { min: 0, max: 10000 }, // Ω/V
    [MetricType.SWITCH]: { min: 0, max: 1 }, // 开关状态 (0/1)
  };

  /**
   * 解析Excel文件
   * @param buffer 文件缓冲区
   * @returns 解析结果
   */
  async parseExcel(buffer: Buffer): Promise<ParseResult> {
    try {
      // 读取Excel工作簿
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new BadRequestException('Excel文件中没有找到工作表');
      }

      const worksheet = workbook.Sheets[firstSheetName];

      // 将工作表转换为JSON数据（原始格式）
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: false, // 将日期等格式化为字符串
        defval: null, // 空单元格默认值
      });

      if (rawData.length === 0) {
        throw new BadRequestException('Excel文件中没有数据');
      }

      // 解析并验证数据
      return this.parseAndValidateData(rawData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Excel文件解析失败: ${error.message}`);
    }
  }

  /**
   * 解析CSV文件
   * @param buffer 文件缓冲区
   * @returns 解析结果
   */
  async parseCSV(buffer: Buffer): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      const csvContent = buffer.toString('utf-8');

      Papa.parse(csvContent, {
        header: true, // 第一行作为表头
        skipEmptyLines: true, // 跳过空行
        complete: (results) => {
          try {
            if (!results.data || results.data.length === 0) {
              reject(new BadRequestException('CSV文件中没有数据'));
              return;
            }

            // 解析并验证数据
            const parseResult = this.parseAndValidateData(results.data);
            resolve(parseResult);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        },
        error: (error) => {
          reject(new BadRequestException(`CSV文件解析失败: ${error.message}`));
        },
      });
    });
  }

  /**
   * 解析JSON文件
   *
   * 支持两种JSON格式:
   * 1. 对象数组: [{ equipmentId: "xxx", timestamp: "xxx", ... }, ...]
   * 2. 包含data字段的对象: { data: [{ equipmentId: "xxx", ... }] }
   *
   * @param buffer 文件缓冲区
   * @returns 解析结果
   */
  async parseJSON(buffer: Buffer): Promise<ParseResult> {
    try {
      const jsonContent = buffer.toString('utf-8');
      let parsedData: any;

      // 解析JSON
      try {
        parsedData = JSON.parse(jsonContent);
      } catch (error) {
        throw new BadRequestException(`JSON文件格式错误: ${error.message}`);
      }

      // 提取数据数组
      let rawData: any[];
      if (Array.isArray(parsedData)) {
        // 格式1: 直接是数组
        rawData = parsedData;
      } else if (parsedData && Array.isArray(parsedData.data)) {
        // 格式2: { data: [...] }
        rawData = parsedData.data;
      } else {
        throw new BadRequestException(
          'JSON文件格式错误: 期望是数组或包含data字段的对象',
        );
      }

      if (rawData.length === 0) {
        throw new BadRequestException('JSON文件中没有数据');
      }

      // 解析并验证数据
      return this.parseAndValidateData(rawData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`JSON文件解析失败: ${error.message}`);
    }
  }

  /**
   * 解析并验证数据
   * @param rawData 原始数据数组
   * @returns 解析结果
   */
  private parseAndValidateData(rawData: any[]): ParseResult {
    const data: ParsedTimeSeriesData[] = [];
    const errors: ImportError[] = [];
    let validRows = 0;

    rawData.forEach((row, index) => {
      const rowNumber = index + 2; // Excel行号从1开始，加上表头行

      try {
        // 映射字段名（中文->英文）
        const mappedRow = this.mapColumns(row);

        // 验证必填字段
        const validationError = this.validateRow(mappedRow, rowNumber);
        if (validationError) {
          errors.push(validationError);
          return;
        }

        // 转换数据类型
        const parsedRow = this.convertDataTypes(mappedRow);

        // 验证数值范围
        const rangeError = this.validateValueRange(parsedRow, rowNumber);
        if (rangeError) {
          errors.push(rangeError);
          return;
        }

        data.push(parsedRow);
        validRows++;
      } catch (error) {
        errors.push({
          row: rowNumber,
          data: row,
          reason: `数据转换失败: ${error.message}`,
        });
      }
    });

    return {
      data,
      errors,
      totalRows: rawData.length,
      validRows,
    };
  }

  /**
   * 映射列名（中文表头->英文字段名）
   * @param row 原始行数据
   * @returns 映射后的行数据
   */
  private mapColumns(row: any): any {
    const mappedRow: any = {};

    // 遍历原始行的所有键
    Object.keys(row).forEach((key) => {
      const trimmedKey = key.trim();
      // 查找映射关系
      const mappedKey = this.COLUMN_MAPPING[trimmedKey] || trimmedKey;
      mappedRow[mappedKey] = row[key];
    });

    return mappedRow;
  }

  /**
   * 验证行数据
   * @param row 行数据
   * @param rowNumber 行号
   * @returns 验证错误（如果有）
   */
  private validateRow(row: any, rowNumber: number): ImportError | null {
    // 检查必填字段
    for (const field of this.REQUIRED_FIELDS) {
      const value = row[field];
      if (!value || String(value).trim() === '') {
        return {
          row: rowNumber,
          data: row,
          reason: `缺少必填字段: ${this.getChineseFieldName(field)}`,
        };
      }
    }

    // 验证指标类型（如果提供）
    if (row.metricType) {
      const metricTypeValue = String(row.metricType).trim();
      const isChineseType = !!this.METRIC_TYPE_MAPPING[metricTypeValue];
      const isEnglishType = Object.values(MetricType).some(
        (v) => v === metricTypeValue.toLowerCase(),
      );

      if (!isChineseType && !isEnglishType) {
        const validChineseTypes = Object.keys(this.METRIC_TYPE_MAPPING).join(
          ', ',
        );
        const validEnglishTypes = Object.values(MetricType).join(', ');
        return {
          row: rowNumber,
          data: row,
          reason: `无效的指标类型: ${metricTypeValue}，有效值为: ${validChineseTypes} 或 ${validEnglishTypes}`,
        };
      }
    }

    // 验证数据质量（如果提供）
    if (row.quality) {
      const qualityValue = String(row.quality).trim();
      if (!this.DATA_QUALITY_MAPPING[qualityValue]) {
        const validQualities = Object.keys(this.DATA_QUALITY_MAPPING).join(
          ', ',
        );
        return {
          row: rowNumber,
          data: row,
          reason: `无效的数据质量: ${qualityValue}，有效值为: ${validQualities}`,
        };
      }
    }

    // 验证数值格式
    const valueStr = String(row.value).trim();
    const numValue = Number(valueStr);
    if (isNaN(numValue)) {
      return {
        row: rowNumber,
        data: row,
        reason: `无效的数值格式: ${valueStr}，必须是有效的数字`,
      };
    }

    return null;
  }

  /**
   * 验证数值范围
   * @param parsedRow 解析后的行数据
   * @param rowNumber 行号
   * @returns 验证错误（如果有）
   */
  private validateValueRange(
    parsedRow: ParsedTimeSeriesData,
    rowNumber: number,
  ): ImportError | null {
    const range = this.METRIC_VALUE_RANGES[parsedRow.metricType];
    if (!range) {
      return null;
    }

    if (parsedRow.value < range.min || parsedRow.value > range.max) {
      return {
        row: rowNumber,
        data: parsedRow,
        reason: `数值超出合理范围: ${parsedRow.value}，合理范围为 [${range.min}, ${range.max}]`,
      };
    }

    return null;
  }

  /**
   * 转换数据类型
   * @param row 行数据
   * @returns 转换后的数据
   */
  private convertDataTypes(row: any): ParsedTimeSeriesData {
    // 必填字段
    const equipmentId = String(row.equipmentId).trim();
    const timestamp = this.parseTimestamp(row.timestamp);
    const metricType = this.parseMetricType(row.metricType);
    const value = Number(String(row.value).trim());

    const result: ParsedTimeSeriesData = {
      equipmentId,
      timestamp,
      metricType,
      value,
      source: DataSource.FILE_IMPORT, // 默认来源为文件导入
    };

    // 可选字段：监测点
    if (row.monitoringPoint) {
      const trimmed = String(row.monitoringPoint).trim();
      if (trimmed.length > 100) {
        throw new Error('监测点名称过长（最大100字符）');
      }
      // 空字符串转为 undefined
      result.monitoringPoint = trimmed || undefined;
    } else {
      result.monitoringPoint = undefined;
    }

    // 可选字段：单位
    if (row.unit) {
      result.unit = String(row.unit).trim();
    } else {
      // 如果没有提供单位，自动填充标准单位
      result.unit = this.getStandardUnit(metricType);
    }

    // 可选字段：数据质量
    if (row.quality) {
      const qualityValue = String(row.quality).trim();
      result.quality =
        this.DATA_QUALITY_MAPPING[qualityValue] || DataQuality.NORMAL;
    } else {
      result.quality = DataQuality.NORMAL;
    }

    return result;
  }

  /**
   * 解析时间戳
   * 支持多种时间格式
   * @param timestampValue 时间戳值
   * @returns Date对象
   */
  private parseTimestamp(timestampValue: any): Date {
    if (timestampValue instanceof Date) {
      return timestampValue;
    }

    const timestampStr = String(timestampValue).trim();

    // 尝试解析ISO格式
    const isoDate = new Date(timestampStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // 尝试解析中文日期格式 YYYY年MM月DD日 HH时mm分ss秒
    const chineseMatch = timestampStr.match(
      /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2})时(\d{1,2})分(\d{1,2})秒/,
    );
    if (chineseMatch) {
      const [, year, month, day, hour, minute, second] = chineseMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );
    }

    // 尝试解析常见格式 YYYY-MM-DD HH:mm:ss
    const commonMatch = timestampStr.match(
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/,
    );
    if (commonMatch) {
      const [, year, month, day, hour, minute, second] = commonMatch;
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      );
    }

    // 尝试解析日期格式 YYYY-MM-DD 或 YYYY/MM/DD（默认时间为00:00:00）
    const dateOnlyMatch = timestampStr.match(
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
    );
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    throw new Error(`无法解析时间戳: ${timestampValue}`);
  }

  /**
   * 解析指标类型
   * @param metricTypeValue 指标类型值
   * @returns MetricType枚举
   */
  private parseMetricType(metricTypeValue: any): MetricType {
    const metricTypeStr = String(metricTypeValue).trim();
    const metricType = this.METRIC_TYPE_MAPPING[metricTypeStr];

    if (!metricType) {
      // 尝试直接匹配英文枚举值
      const enumValue = Object.values(MetricType).find(
        (v) => v === metricTypeStr.toLowerCase(),
      );
      if (enumValue) {
        return enumValue;
      }

      throw new Error(`无法解析指标类型: ${metricTypeValue}`);
    }

    return metricType;
  }

  /**
   * 获取指标类型的标准单位
   * @param metricType 指标类型
   * @returns 标准单位
   */
  private getStandardUnit(metricType: MetricType): string {
    const unitMap: Record<MetricType, string> = {
      [MetricType.VIBRATION]: 'mm/s',
      [MetricType.TEMPERATURE]: '°C',
      [MetricType.PRESSURE]: 'MPa',
      [MetricType.HUMIDITY]: '%',
      [MetricType.SPEED]: 'rpm',
      [MetricType.CURRENT]: 'A',
      [MetricType.VOLTAGE]: 'V',
      [MetricType.POWER]: 'kW',
      [MetricType.FREQUENCY]: 'Hz',
      [MetricType.LEVEL]: 'mm',
      [MetricType.RESISTANCE]: 'Ω/V',
      [MetricType.SWITCH]: '',
    };
    return unitMap[metricType] || '';
  }

  /**
   * 获取字段的中文名称
   * @param fieldName 英文字段名
   * @returns 中文字段名
   */
  private getChineseFieldName(fieldName: string): string {
    const reverseMapping: Record<string, string> = {
      equipmentId: '设备ID',
      timestamp: '时间戳',
      metricType: '指标类型',
      value: '数值',
      unit: '单位',
      quality: '数据质量',
    };
    return reverseMapping[fieldName] || fieldName;
  }
}
