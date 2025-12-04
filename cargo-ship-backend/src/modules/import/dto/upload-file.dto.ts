import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  FileFormat,
  DuplicateStrategy,
} from '../../../database/entities/import-record.entity';

/**
 * 文件上传DTO
 * 用于处理文件上传和导入配置
 */
export class UploadFileDto {
  /**
   * 文件格式（Excel或CSV）
   */
  @ApiProperty({
    description: '文件格式',
    enum: FileFormat,
    example: FileFormat.EXCEL,
  })
  @IsEnum(FileFormat)
  fileFormat: FileFormat;

  /**
   * 重复数据处理策略
   * - skip: 跳过重复数据
   * - overwrite: 覆盖已存在的数据
   */
  @ApiProperty({
    description: '重复数据处理策略',
    enum: DuplicateStrategy,
    example: DuplicateStrategy.SKIP,
    required: false,
  })
  @IsOptional()
  @IsEnum(DuplicateStrategy)
  duplicateStrategy?: DuplicateStrategy = DuplicateStrategy.SKIP;

  /**
   * 备注信息
   */
  @ApiProperty({
    description: '备注信息',
    example: '第一季度设备数据导入',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
