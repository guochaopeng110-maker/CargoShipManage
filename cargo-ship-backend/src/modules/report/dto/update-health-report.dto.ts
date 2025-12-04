import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 更新健康报告DTO
 *
 * 说明：健康报告的核心数据（健康评分、统计数据等）是自动生成的，不允许直接修改
 * 此DTO仅允许更新报告的备注信息和附加说明
 */
export class UpdateHealthReportDto {
  /**
   * 报告备注
   *
   * 可选字段，用于添加人工审核意见、补充说明等
   */
  @ApiProperty({
    description: '报告备注（可选，用于添加人工审核意见、补充说明等）',
    example:
      '该报告数据经过人工审核，确认无误。建议关注设备BATT-001的温度变化趋势。',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  @MaxLength(1000, { message: '备注长度不能超过1000个字符' })
  remarks?: string;

  /**
   * 附加说明
   *
   * 可选字段，用于记录额外的分析结果、处理建议等
   */
  @ApiProperty({
    description: '附加说明（可选，用于记录额外的分析结果、处理建议等）',
    example: '已安排维护计划，预计在2024-12-01进行设备检修。',
    required: false,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: '附加说明必须是字符串' })
  @MaxLength(2000, { message: '附加说明长度不能超过2000个字符' })
  additionalNotes?: string;
}
