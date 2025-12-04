import {
  IsNotEmpty,
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlarmStatus } from '../../../database/entities/alarm-record.entity';

/**
 * 更新告警状态 DTO
 */
export class UpdateAlarmStatusDto {
  /**
   * 处理状态（必填）
   */
  @ApiProperty({
    description: '处理状态',
    enum: AlarmStatus,
    example: AlarmStatus.RESOLVED,
  })
  @IsNotEmpty({ message: '处理状态不能为空' })
  @IsEnum(AlarmStatus, { message: '处理状态无效' })
  status: AlarmStatus;

  /**
   * 处理说明（可选）
   */
  @ApiPropertyOptional({
    description: '处理说明',
    example: '已现场检查并修复',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '处理说明不能超过500个字符' })
  handleNote?: string;
}
