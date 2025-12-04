/**
 * 修改密码DTO（数据传输对象）
 *
 * 描述：定义用户修改密码接口的请求参数格式和验证规则
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 修改密码请求数据传输对象
 *
 * 用于POST /auth/change-password接口
 * 需要提供旧密码和符合安全要求的新密码
 */
export class ChangePasswordDto {
  @ApiProperty({ description: '当前使用的旧密码', example: 'OldPassword123!' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({
    description: '符合强度要求的新密码',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
  newPassword: string;
}
