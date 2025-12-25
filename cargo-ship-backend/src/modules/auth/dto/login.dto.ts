/**
 * 用户登录DTO（数据传输对象）
 *
 * 描述：定义用户登录接口的请求参数格式和验证规则
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 登录请求数据传输对象
 *
 * 用于POST /auth/login接口
 * 包含用户名和密码的基本验证
 */
export class LoginDto {
  /**
   * 用户名
   */
  @ApiProperty({
    description: '用户名或邮箱地址',
    example: 'admin',
    minLength: 1,
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  /**
   * 密码
   */
  @ApiProperty({
    description: '用户密码',
    example: 'password123',
    minLength: 6,
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少为6个字符' })
  password: string;
}
