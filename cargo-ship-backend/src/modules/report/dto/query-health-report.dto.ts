import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ReportType } from '../../../database/entities/health-report.entity';

/**
 * 查询健康报告DTO
 */
export class QueryHealthReportDto {
  /**
   * 设备ID（仅查询单设备报告）
   */
  @ApiProperty({
    description: '设备ID（仅查询单设备报告）',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '设备ID必须是字符串' })
  equipmentId?: string;

  /**
   * 报告类型
   */
  @ApiProperty({
    description: '报告类型',
    enum: ReportType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReportType, { message: '报告类型必须是single或aggregate' })
  reportType?: ReportType;

  /**
   * 生成时间-开始（时间戳，毫秒）
   */
  @ApiProperty({
    description: '生成时间-开始（时间戳，毫秒）',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Type(() => Number)
  startTime?: number;

  /**
   * 生成时间-结束（时间戳，毫秒）
   */
  @ApiProperty({
    description: '生成时间-结束（时间戳，毫秒）',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Type(() => Number)
  endTime?: number;

  /**
   * 页码（从1开始）
   */
  @ApiProperty({
    description: '页码（从1开始）',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码必须大于等于1' })
  @Type(() => Number)
  page?: number = 1;

  /**
   * 每页数量
   */
  @ApiProperty({
    description: '每页数量',
    default: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量必须大于等于1' })
  @Type(() => Number)
  pageSize?: number = 20;
}
