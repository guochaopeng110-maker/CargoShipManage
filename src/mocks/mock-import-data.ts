/**
 * 货船智能机舱管理系统 - 数据导入Mock数据
 *
 * 功能说明：
 * - 为数据导入页面提供mock数据支持
 * - 当后端API失败时，生成模拟的导入记录
 * - 包含各种导入状态和错误情况的模拟数据
 *
 * 使用场景：
 * - 开发环境下的功能演示
 * - 后端API不可用时的降级方案
 * - 测试各种导入状态和错误处理
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025
 */

import { 
  ImportRecord, 
  ImportStatus, 
  FileFormat, 
  ImportError,
  User 
} from '../types/import';

/**
 * 获取文件格式
 * 
 * @param fileName 文件名
 * @returns 文件格式枚举
 */
function getFileFormat(fileName: string): FileFormat {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'json':
      return FileFormat.JSON;
    case 'xml':
      return FileFormat.XML;
    case 'xlsx':
    case 'xls':
      return FileFormat.EXCEL;
    case 'csv':
      return FileFormat.CSV;
    default:
      return FileFormat.CSV; // 默认为CSV
  }
}

/**
 * 生成随机导入错误
 * 
 * @param count 错误数量
 * @returns 错误列表
 */
function generateRandomErrors(count: number): ImportError[] {
  const errors: ImportError[] = [];
  const errorReasons = [
    '设备ID格式不正确',
    '时间戳格式无效',
    '数值超出允许范围',
    '必填字段为空',
    '数据类型不匹配',
    '单位格式错误',
    '重复数据记录',
    '权限验证失败'
  ];

  for (let i = 0; i < count; i++) {
    errors.push({
      rowNumber: Math.floor(Math.random() * 1000) + 1,
      batchNumber: Math.floor(Math.random() * 10) + 1,
      reason: errorReasons[Math.floor(Math.random() * errorReasons.length)],
      originalData: {
        deviceId: `device_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        metricType: 'temperature',
        value: Math.random() * 100
      },
      errorDetails: `详细错误信息 ${i + 1}`
    });
  }

  return errors;
}

/**
 * 生成模拟用户信息
 * 
 * @param username 用户名
 * @returns 用户信息
 */
function generateMockUser(username: string): User {
  return {
    id: `user_${Date.now()}`,
    username: username,
    email: `${username}@shipmanagement.com`
  };
}

/**
 * 生成单个模拟导入记录
 * 
 * @param fileName 文件名
 * @param fileSize 文件大小
 * @param status 导入状态
 * @param importedBy 导入者
 * @returns 导入记录
 */
export function generateMockImportRecord(
  fileName: string,
  fileSize: number,
  status: ImportStatus = ImportStatus.COMPLETED,
  importedBy: string = 'current_user'
): ImportRecord {
  const now = Date.now();
  const startedAt = now - Math.floor(Math.random() * 30000); // 30秒内开始
  const completedAt = status === ImportStatus.COMPLETED || status === ImportStatus.PARTIAL 
    ? now 
    : null;
  
  const totalRows = Math.floor(Math.random() * 2000) + 100; // 100-2100行
  let successRows = 0;
  let failedRows = 0;
  let skippedRows = 0;
  let errors: ImportError[] = [];

  // 根据状态生成不同的结果
  switch (status) {
    case ImportStatus.COMPLETED:
      successRows = totalRows;
      failedRows = 0;
      skippedRows = 0;
      errors = [];
      break;
    case ImportStatus.PARTIAL:
      successRows = Math.floor(totalRows * (0.7 + Math.random() * 0.2)); // 70-90%成功
      failedRows = totalRows - successRows;
      skippedRows = Math.floor(failedRows * 0.1); // 10%的失败记录被跳过
      failedRows -= skippedRows;
      errors = generateRandomErrors(failedRows);
      break;
    case ImportStatus.FAILED:
      successRows = 0;
      failedRows = Math.floor(totalRows * 0.1); // 10%的记录有错误
      skippedRows = totalRows - failedRows;
      errors = generateRandomErrors(failedRows);
      break;
    case ImportStatus.PROCESSING:
      // 处理中状态，部分数据已处理
      const processedRows = Math.floor(totalRows * Math.random() * 0.8); // 0-80%已处理
      successRows = Math.floor(processedRows * 0.9);
      failedRows = processedRows - successRows;
      skippedRows = 0;
      errors = failedRows > 0 ? generateRandomErrors(failedRows) : [];
      break;
    case ImportStatus.PENDING:
    default:
      successRows = 0;
      failedRows = 0;
      skippedRows = 0;
      errors = [];
      break;
  }

  const duration = completedAt ? completedAt - startedAt : 0;
  const successRate = totalRows > 0 ? (successRows / totalRows) * 100 : 0;

  return {
    id: `import_mock_${now}_${Math.random().toString(36).substr(2, 9)}`,
    fileName,
    fileFormat: getFileFormat(fileName),
    fileSize,
    status,
    totalRows,
    successRows,
    failedRows,
    skippedRows,
    errors,
    startedAt,
    completedAt,
    importedBy,
    createdAt: now,
    successRate,
    duration,
    importer: generateMockUser(importedBy)
  };
}

/**
 * 生成多个模拟导入记录
 * 
 * @param count 记录数量
 * @returns 导入记录列表
 */
export function generateMockImportRecords(count: number = 10): ImportRecord[] {
  const records: ImportRecord[] = [];
  const fileNames = [
    'sensor_data_2024_01.xlsx',
    'temperature_readings.csv',
    'equipment_status.json',
    'vibration_data.xml',
    'pressure_monitoring.csv',
    'battery_metrics.xlsx',
    'power_consumption.json',
    'humidity_records.csv',
    'speed_measurements.xlsx',
    'current_voltage_data.csv'
  ];

  const statuses = Object.values(ImportStatus);
  const importers = ['admin', 'operator_1', 'operator_2', 'engineer', 'current_user'];

  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    const fileSize = Math.floor(Math.random() * 5000000) + 100000; // 100KB-5MB
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const importedBy = importers[Math.floor(Math.random() * importers.length)];
    
    // 为较早的记录设置较早的时间
    const timeOffset = (count - i) * 3600000; // 每个记录间隔1小时
    const record = generateMockImportRecord(fileName, fileSize, status, importedBy);
    
    // 调整时间戳
    record.startedAt = record.startedAt ? record.startedAt - timeOffset : null;
    record.completedAt = record.completedAt ? record.completedAt - timeOffset : null;
    record.createdAt = record.createdAt - timeOffset;
    
    records.push(record);
  }

  // 按创建时间倒序排列
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * 根据文件信息生成模拟导入记录
 * 
 * @param file 上传的文件
 * @param importedBy 导入者
 * @returns 导入记录
 */
export function generateMockImportRecordFromFile(
  file: File,
  importedBy: string = 'current_user'
): ImportRecord {
  // 根据文件大小决定导入状态
  let status: ImportStatus;
  const random = Math.random();
  
  if (random < 0.7) {
    status = ImportStatus.COMPLETED;
  } else if (random < 0.85) {
    status = ImportStatus.PARTIAL;
  } else if (random < 0.95) {
    status = ImportStatus.FAILED;
  } else {
    status = ImportStatus.PROCESSING;
  }

  return generateMockImportRecord(file.name, file.size, status, importedBy);
}

/**
 * 获取导入状态的中文名称
 * 
 * @param status 导入状态
 * @returns 中文名称
 */
export function getImportStatusName(status: ImportStatus): string {
  const statusNames: Record<ImportStatus, string> = {
    [ImportStatus.PENDING]: '待处理',
    [ImportStatus.PROCESSING]: '处理中',
    [ImportStatus.COMPLETED]: '已完成',
    [ImportStatus.PARTIAL]: '部分完成',
    [ImportStatus.FAILED]: '失败'
  };
  return statusNames[status] || status;
}

/**
 * 获取文件格式的中文名称
 * 
 * @param format 文件格式
 * @returns 中文名称
 */
export function getFileFormatName(format: FileFormat): string {
  const formatNames: Record<FileFormat, string> = {
    [FileFormat.JSON]: 'JSON',
    [FileFormat.XML]: 'XML',
    [FileFormat.EXCEL]: 'Excel',
    [FileFormat.CSV]: 'CSV'
  };
  return formatNames[format] || format;
}