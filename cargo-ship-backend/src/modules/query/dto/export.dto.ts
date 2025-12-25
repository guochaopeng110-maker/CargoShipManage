import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUUID,
  ValidateNested,
  Min,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MetricType } from '../../../database/entities/time-series-data.entity';
import { AlarmSeverity } from '../../../database/entities/threshold-config.entity';
import { AlarmStatus } from '../../../database/entities/alarm-record.entity';

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  PDF = 'pdf',
}

/**
 * 监测数据导出查询条件
 */
export class MonitoringDataExportQueryDto {
  @ApiProperty({
    description: '设备ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId?: string;

  @ApiProperty({
    description: '监测指标类型',
    enum: MetricType,
    example: MetricType.TEMPERATURE,
    required: false,
  })
  @IsOptional()
  @IsEnum(MetricType, { message: '指标类型无效' })
  metricType?: MetricType;

  @ApiPropertyOptional({
    description: '监测点名称（可选，用于筛选特定监测点的数据）',
    example: '总电压',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: '监测点名称必须是字符串' })
  @MaxLength(100, { message: '监测点名称长度不能超过100个字符' })
  monitoringPoint?: string;

  @ApiProperty({
    description: '开始时间（Unix时间戳，毫秒）',
    example: 1700000000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime?: number;

  @ApiProperty({
    description: '结束时间（Unix时间戳，毫秒）',
    example: 1700086400000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime?: number;
}

/**
 * 导出监测数据请求DTO
 */
export class ExportMonitoringDataDto {
  @ApiProperty({
    description: '查询条件',
    type: MonitoringDataExportQueryDto,
    required: true,
  })
  @IsNotEmpty({ message: '查询条件不能为空' })
  @ValidateNested()
  @Type(() => MonitoringDataExportQueryDto)
  queryConditions: MonitoringDataExportQueryDto;

  @ApiProperty({
    description: '导出格式',
    enum: ExportFormat,
    example: ExportFormat.EXCEL,
    required: true,
  })
  @IsNotEmpty({ message: '导出格式不能为空' })
  @IsEnum(ExportFormat, { message: '导出格式无效' })
  exportFormat: ExportFormat;
}

/**
 * 告警记录导出查询条件
 */
export class AlarmExportQueryDto {
  @ApiProperty({
    description: '设备ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId?: string;

  @ApiProperty({
    description: '严重程度',
    enum: AlarmSeverity,
    example: AlarmSeverity.HIGH,
    required: false,
  })
  @IsOptional()
  @IsEnum(AlarmSeverity, { message: '严重程度无效' })
  severity?: AlarmSeverity;

  @ApiProperty({
    description: '处理状态',
    enum: AlarmStatus,
    example: AlarmStatus.RESOLVED,
    required: false,
  })
  @IsOptional()
  @IsEnum(AlarmStatus, { message: '处理状态无效' })
  status?: AlarmStatus;

  @ApiProperty({
    description: '开始时间（Unix时间戳，毫秒）',
    example: 1700000000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime?: number;

  @ApiProperty({
    description: '结束时间（Unix时间戳，毫秒）',
    example: 1700086400000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime?: number;
}

/**
 * 导出告警记录请求DTO
 */
export class ExportAlarmsDto {
  @ApiProperty({
    description: '查询条件',
    type: AlarmExportQueryDto,
    required: true,
  })
  @IsNotEmpty({ message: '查询条件不能为空' })
  @ValidateNested()
  @Type(() => AlarmExportQueryDto)
  queryConditions: AlarmExportQueryDto;

  @ApiProperty({
    description: '导出格式',
    enum: ExportFormat,
    example: ExportFormat.EXCEL,
    required: true,
  })
  @IsNotEmpty({ message: '导出格式不能为空' })
  @IsEnum(ExportFormat, { message: '导出格式无效' })
  exportFormat: ExportFormat;
}

/**
 * 健康报告导出查询条件
 */
export class ReportExportQueryDto {
  @ApiProperty({
    description: '报告ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: '报告ID格式无效' })
  reportId?: string;

  @ApiProperty({
    description: '设备ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: '设备ID格式无效' })
  equipmentId?: string;

  @ApiProperty({
    description: '生成时间-开始（Unix时间戳，毫秒）',
    example: 1700000000000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Min(0, { message: '开始时间不能为负数' })
  startTime?: number;

  @ApiProperty({
    description: '生成时间-结束（Unix时间戳，毫秒）',
    example: 1700086400000,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Min(0, { message: '结束时间不能为负数' })
  endTime?: number;
}

/**
 * 导出健康报告请求DTO
 */
export class ExportReportsDto {
  @ApiProperty({
    description: '查询条件',
    type: ReportExportQueryDto,
    required: true,
  })
  @IsNotEmpty({ message: '查询条件不能为空' })
  @ValidateNested()
  @Type(() => ReportExportQueryDto)
  queryConditions: ReportExportQueryDto;

  @ApiProperty({
    description: '导出格式（健康报告仅支持PDF）',
    enum: [ExportFormat.PDF],
    example: ExportFormat.PDF,
    required: true,
  })
  @IsNotEmpty({ message: '导出格式不能为空' })
  @IsEnum([ExportFormat.PDF], { message: '健康报告仅支持PDF格式' })
  exportFormat: ExportFormat.PDF;
}

/**
 * 导出响应DTO
 */
export class ExportResponseDto {
  @ApiProperty({
    description: '下载链接',
    example: 'https://example.com/downloads/monitoring_data_20231114.xlsx',
  })
  downloadUrl: string;

  @ApiProperty({
    description: '链接过期时间（Unix时间戳，毫秒）',
    example: 1700006399999,
  })
  expiresAt: number;
}
