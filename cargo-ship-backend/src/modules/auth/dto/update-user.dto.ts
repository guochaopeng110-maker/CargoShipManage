/**
 * 管理员更新用户DTO（数据传输对象）
 *
 * 描述：定义管理员更新用户信息接口的请求参数格式和验证规则
 * 所有字段均为可选，只更新提供的字段
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsArray,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { UserStatus } from '../../../database/entities/user.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 管理员更新用户请求数据传输对象
 *
 * 用于PUT /auth/users/:id接口（仅管理员可用）
 * 允许管理员更新用户信息、角色和状态
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '新用户名 (3-50位, 字母/数字/下划线/连字符)',
    example: 'john_doe_new',
  })
  @IsString()
  @IsOptional()
  @MinLength(3, { message: '用户名长度至少为3个字符' })
  @MaxLength(50, { message: '用户名长度最多为50个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和连字符',
  })
  username?: string;

  @ApiPropertyOptional({
    description: '新邮箱地址',
    example: 'john.doe.new@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: '重置后的新密码 (至少8位,包含大小写字母、数字和特殊字符)',
    example: 'NewPassword456!',
  })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: '密码长度至少为8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符',
  })
  password?: string;

  @ApiPropertyOptional({ description: '新用户全名', example: 'Johnathan Doe' })
  @IsString()
  @IsOptional()
  @MinLength(2, { message: '姓名长度至少为2个字符' })
  @MaxLength(100, { message: '姓名长度最多为100个字符' })
  fullName?: string;

  @ApiPropertyOptional({
    description: '新手机号码',
    example: '+1 555-123-4567',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: '手机号格式不正确',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: '完全替换用户现有角色的ID数组',
    example: ['role-uuid-viewer'],
  })
  @IsArray({ message: '角色必须是数组格式' })
  @ArrayMinSize(1, { message: '至少需要分配一个角色' })
  @IsString({ each: true, message: '角色ID必须是字符串' })
  @IsOptional()
  roleIds?: string[];

  @ApiPropertyOptional({
    description: '新用户状态 (active, inactive, locked)',
    enum: UserStatus,
    example: UserStatus.INACTIVE,
  })
  @IsEnum(UserStatus, { message: '用户状态值不正确' })
  @IsOptional()
  status?: UserStatus;
}
