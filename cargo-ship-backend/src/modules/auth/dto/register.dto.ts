/**
 * 用户注册DTO（数据传输对象）
 *
 * 描述：定义用户注册接口的请求参数格式和验证规则
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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 用户注册请求数据传输对象
 *
 * 用于POST /auth/register接口
 * 包含完整的用户信息和严格的验证规则
 */
export class RegisterDto {
  @ApiProperty({
    description: '用户名 (3-50位, 字母/数字/下划线/连字符)',
    example: 'john_doe',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores and hyphens',
  })
  username: string;

  @ApiProperty({ description: '用户邮箱地址', example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '用户密码 (至少8位,包含大小写字母、数字和特殊字符)',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  })
  password: string;

  @ApiProperty({ description: '用户全名', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({
    description: '手机号码 (可选)',
    example: '+86 138-1234-5678',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]+$/, {
    message: 'Invalid phone number format',
  })
  phoneNumber?: string;
}
