import { IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ImportStatus,
  FileFormat,
} from '../../../database/entities/import-record.entity';

/**
 * 查询导入记录DTO
 * 用于分页查询和筛选导入记录
 */
export class QueryImportDto {
  /**
   * 页码（从1开始）
   */
  @ApiProperty({
    description: '页码',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * 每页数量
   */
  @ApiProperty({
    description: '每页数量',
    example: 10,
    minimum: 1,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  /**
   * 按导入状态筛选
   */
  @ApiProperty({
    description: '导入状态',
    enum: ImportStatus,
    example: ImportStatus.COMPLETED,
    required: false,
  })
  @IsOptional()
  @IsEnum(ImportStatus)
  status?: ImportStatus;

  /**
   * 按文件格式筛选
   */
  @ApiProperty({
    description: '文件格式',
    enum: FileFormat,
    example: FileFormat.EXCEL,
    required: false,
  })
  @IsOptional()
  @IsEnum(FileFormat)
  fileFormat?: FileFormat;

  /**
   * 开始日期（筛选创建时间）
   */
  @ApiProperty({
    description: '开始日期',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * 结束日期（筛选创建时间）
   */
  @ApiProperty({
    description: '结束日期',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
