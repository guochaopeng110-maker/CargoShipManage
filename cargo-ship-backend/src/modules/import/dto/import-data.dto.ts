import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DuplicateStrategy } from '../../../database/entities/import-record.entity';

/**
 * 执行数据导入DTO
 * 用于确认导入预览后的数据
 */
export class ImportDataDto {
  /**
   * 导入记录ID
   */
  @ApiProperty({
    description: '导入记录ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  importRecordId: string;

  /**
   * 是否跳过验证失败的行
   */
  @ApiProperty({
    description: '是否跳过验证失败的行',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  skipInvalidRows?: boolean = true;

  /**
   * 重复数据处理策略
   */
  @ApiProperty({
    description: '重复数据处理策略',
    enum: DuplicateStrategy,
    example: DuplicateStrategy.SKIP,
  })
  @IsEnum(DuplicateStrategy)
  duplicateStrategy: DuplicateStrategy;

  /**
   * 备注信息
   */
  @ApiProperty({
    description: '备注信息',
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;
}
