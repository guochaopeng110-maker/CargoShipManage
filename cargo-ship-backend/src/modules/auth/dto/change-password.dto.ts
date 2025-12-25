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
  @ApiProperty({
    description: '当前使用的旧密码',
    example: 'OldPassword123!',
    minLength: 6,
  })
  @IsString({ message: '旧密码必须是字符串' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  oldPassword: string;

  @ApiProperty({
    description: '符合强度要求的新密码',
    example: 'NewPassword123!',
    minLength: 8,
  })
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(8, { message: '新密码长度至少为8个字符' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
    {
      message:
        '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符',
    },
  )
  newPassword: string;
}
