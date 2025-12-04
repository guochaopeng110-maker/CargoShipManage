import { IsEnum, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { EquipmentStatus } from '../../../database/entities/equipment.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 设备列表查询 DTO
 * 支持分页、筛选和排序
 */
export class QueryEquipmentDto {
  /**
   * 页码（从1开始）
   */
  @ApiPropertyOptional({
    description: '页码（从1开始）',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于等于1' })
  page?: number = 1;

  /**
   * 每页数量
   */
  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于等于1' })
  @Max(100, { message: '每页数量不能超过100' })
  limit?: number = 10;

  /**
   * 设备类型筛选（可选）
   */
  @ApiPropertyOptional({
    description: '设备类型筛选',
    example: '主机',
  })
  @IsOptional()
  @IsString({ message: '设备类型必须是字符串' })
  deviceType?: string;

  /**
   * 设备状态筛选（可选）
   */
  @ApiPropertyOptional({
    description: '设备状态筛选',
    enum: EquipmentStatus,
    example: EquipmentStatus.NORMAL,
  })
  @IsOptional()
  @IsEnum(EquipmentStatus, { message: '设备状态无效' })
  status?: EquipmentStatus;

  /**
   * 关键词搜索（设备编号或名称）
   */
  @ApiPropertyOptional({
    description: '关键词搜索（设备编号或名称）',
    example: 'ENG',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  keyword?: string;
}
