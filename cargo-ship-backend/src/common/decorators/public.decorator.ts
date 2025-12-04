/**
 * 公开接口装饰器
 *
 * 描述：用于标记无需认证即可访问的公开接口
 *
 * 功能：
 * - 标记路由为公开接口
 * - 跳过全局JWT认证守卫
 * - 允许匿名访问
 *
 * 使用场景：
 * - 用户登录接口
 * - 用户注册接口
 * - 刷新令牌接口
 * - 公开的API文档
 * - 健康检查接口
 *
 * 工作原理：
 * - 使用SetMetadata设置isPublic元数据为true
 * - JwtAuthGuard通过Reflector读取该元数据
 * - 如果为true，跳过JWT验证
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { SetMetadata } from '@nestjs/common';

/**
 * 元数据键名
 * 用于存储和读取公开接口标记
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public 方法/类装饰器
 *
 * 用途：
 * - 标记控制器方法或整个控制器为公开访问
 * - 配合JwtAuthGuard使用，跳过认证
 *
 * @returns SetMetadata装饰器，设置isPublic=true
 *
 * @example
 * // 标记单个方法为公开接口
 * @Public()
 * @Post('login')
 * async login(@Body() loginDto: LoginDto) {
 *   // 无需JWT认证即可访问
 *   return this.authService.login(loginDto);
 * }
 *
 * @example
 * // 标记单个方法为公开接口
 * @Public()
 * @Post('register')
 * async register(@Body() registerDto: RegisterDto) {
 *   // 注册接口，匿名可访问
 *   return this.authService.register(registerDto);
 * }
 *
 * @example
 * // 标记整个控制器为公开接口（较少使用）
 * @Public()
 * @Controller('public')
 * export class PublicController {
 *   // 该控制器下所有方法都无需认证
 * }
 *
 * @example
 * // 实际使用：认证控制器
 * @Controller('auth')
 * export class AuthController {
 *   // 登录接口 - 公开
 *   @Public()
 *   @Post('login')
 *   login(@Body() dto: LoginDto) { }
 *
 *   // 个人信息 - 需要认证
 *   @Get('profile')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: User) { }
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
