/**
 * 刷新令牌DTO（数据传输对象）
 *
 * 描述：定义刷新访问令牌接口的请求参数格式和验证规则
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 刷新令牌请求数据传输对象
 *
 * 用于POST /auth/refresh接口
 * 用于在访问令牌(access token)过期时获取新的访问令牌
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: '用于获取新访问令牌的刷新令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    minLength: 1,
  })
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  refreshToken: string;
}
