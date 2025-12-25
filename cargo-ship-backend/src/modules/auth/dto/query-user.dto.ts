import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 查询用户列表DTO
 *
 * 用于分页查询用户列表的参数验证
 */
export class QueryUserDto {
  /**
   * 当前页码
   * 从1开始，默认为1
   */
  @ApiPropertyOptional({
    description: '当前页码（从1开始）',
    example: 1,
    minimum: 1,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于或等于1' })
  page?: number;

  /**
   * 每页大小
   * 默认为20，最小1，最大100
   */
  @ApiPropertyOptional({
    description: '每页记录数',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页大小必须是整数' })
  @Min(1, { message: '每页大小必须大于或等于1' })
  @Max(100, { message: '每页大小不能超过100' })
  pageSize?: number;
}
