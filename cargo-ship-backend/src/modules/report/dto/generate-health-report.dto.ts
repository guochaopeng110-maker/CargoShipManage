/**
 * @file generate-health-report.dto.ts
 * @description 定义生成健康评估报告的请求体数据传输对象（DTO）
 */

import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class GenerateHealthReportDto
 * @description 用于接收和验证生成健康报告接口的请求参数
 */
export class GenerateHealthReportDto {
  /**
   * 设备ID
   * @description 需要进行健康评估的设备的唯一标识符
   * @example 'SYS-BILGE-001'
   */
  @ApiProperty({
    description: '需要进行健康评估的设备的唯一标识符',
    example: 'SYS-BILGE-001',
  })
  @IsNotEmpty({ message: '设备ID (deviceId) 不能为空' })
  @IsString({ message: '设备ID (deviceId) 必须是字符串' })
  deviceId: string;

  /**
   * 评估开始时间
   * @description 健康评估数据范围的起始时间，ISO 8601格式的日期字符串
   * @example '2025-12-01T00:00:00Z'
   */
  @ApiProperty({
    description: '评估数据范围的起始时间 (ISO 8601格式)',
    example: '2025-12-01T00:00:00Z',
  })
  @IsDateString(
    {},
    { message: '开始时间 (startTime) 必须是有效的ISO 8601日期字符串' },
  )
  startTime: string;

  /**
   * 评估结束时间
   * @description 健康评估数据范围的结束时间，ISO 8601格式的日期字符串
   * @example '2025-12-12T00:00:00Z'
   */
  @ApiProperty({
    description: '评估数据范围的结束时间 (ISO 8601格式)',
    example: '2025-12-12T00:00:00Z',
  })
  @IsDateString(
    {},
    { message: '结束时间 (endTime) 必须是有效的ISO 8601日期字符串' },
  )
  endTime: string;
}
