/**
 * 管理员创建用户DTO（数据传输对象）
 *
 * 描述：定义管理员创建新用户接口的请求参数格式和验证规则
 * 与RegisterDto不同，此DTO允许管理员指定用户角色和状态
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsArray,
  IsEnum,
  ArrayMinSize,
} from 'class-validator';
import { UserStatus } from '../../../database/entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 管理员创建用户请求数据传输对象
 *
 * 用于POST /auth/users接口（仅管理员可用）
 * 允许管理员创建用户并分配角色
 */
export class CreateUserDto {
  @ApiProperty({
    description: '用户名 (3-50位, 字母/数字/下划线/连字符)',
    example: 'new_operator',
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名长度至少为3个字符' })
  @MaxLength(50, { message: '用户名长度最多为50个字符' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '用户名只能包含字母、数字、下划线和连字符',
  })
  username: string;

  @ApiProperty({ description: '用户邮箱地址', example: 'operator@example.com' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '用户初始密码 (至少8位,包含大小写字母、数字和特殊字符)',
    example: 'Operator123!',
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度至少为8个字符' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符',
  })
  password: string;

  @ApiProperty({ description: '用户全名', example: '李四' })
  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  @MinLength(2, { message: '姓名长度至少为2个字符' })
  @MaxLength(100, { message: '姓名长度最多为100个字符' })
  fullName: string;

  @ApiPropertyOptional({
    description: '手机号码 (可选)',
    example: '+86 139-8765-4321',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: '手机号格式不正确',
  })
  phoneNumber?: string;

  @ApiProperty({
    description: '分配给用户的角色ID数组',
    example: ['role-uuid-operator'],
  })
  @IsArray({ message: '角色必须是数组格式' })
  @ArrayMinSize(1, { message: '至少需要分配一个角色' })
  @IsString({ each: true, message: '角色ID必须是字符串' })
  roleIds: string[];

  @ApiPropertyOptional({
    description: '用户状态 (可选, 默认为 active)',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  @IsEnum(UserStatus, { message: '用户状态值不正确' })
  @IsOptional()
  status?: UserStatus;
}
