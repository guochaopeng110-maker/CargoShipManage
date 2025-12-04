import {
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsArray,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType } from '../../../database/entities/health-report.entity';

/**
 * 创建健康报告DTO
 */
export class CreateHealthReportDto {
  /**
   * 设备ID列表（可选，为空表示生成汇总报告）
   */
  @ApiProperty({
    description: '设备ID列表（可选，为空表示生成汇总报告）',
    example: ['eq_001', 'eq_002'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: '设备ID列表必须是数组' })
  equipmentIds?: string[];

  /**
   * 报告类型
   */
  @ApiProperty({
    description: '报告类型（single=单设备报告，aggregate=汇总报告）',
    enum: ReportType,
    example: ReportType.SINGLE,
  })
  @IsNotEmpty({ message: '报告类型不能为空' })
  @IsEnum(ReportType, { message: '报告类型必须是single或aggregate' })
  reportType: ReportType;

  /**
   * 数据开始时间（时间戳，毫秒）
   */
  @ApiProperty({
    description: '数据开始时间（时间戳，毫秒）',
    example: 1699900000000,
  })
  @IsNotEmpty({ message: '开始时间不能为空' })
  @IsNumber({}, { message: '开始时间必须是数字' })
  @Min(0, { message: '开始时间必须大于0' })
  startTime: number;

  /**
   * 数据结束时间（时间戳，毫秒）
   */
  @ApiProperty({
    description: '数据结束时间（时间戳，毫秒）',
    example: 1699999999999,
  })
  @IsNotEmpty({ message: '结束时间不能为空' })
  @IsNumber({}, { message: '结束时间必须是数字' })
  @Min(0, { message: '结束时间必须大于0' })
  endTime: number;
}
