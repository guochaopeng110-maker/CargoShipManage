/**
 * 当前用户装饰器
 *
 * 描述：用于在控制器方法参数中注入当前登录用户对象的参数装饰器
 *
 * 功能：
 * - 从HTTP请求对象中提取用户信息
 * - 自动注入到控制器方法参数
 * - 简化用户信息的获取
 *
 * 前提条件：
 * - 必须在认证守卫（如JwtAuthGuard）之后使用
 * - request.user必须已被认证守卫注入
 *
 * 使用场景：
 * - 获取当前登录用户信息
 * - 记录操作日志时需要用户ID
 * - 根据用户权限执行不同逻辑
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../database/entities/user.entity';

/**
 * CurrentUser 参数装饰器
 *
 * 用途：
 * - 在控制器方法参数中直接获取当前登录用户
 * - 替代手动从request对象中提取user
 *
 * 工作原理：
 * 1. 从ExecutionContext获取HTTP请求对象
 * 2. 从request.user读取用户信息
 * 3. 返回用户对象作为方法参数
 *
 * @param data - 装饰器参数（未使用）
 * @param ctx - 执行上下文，包含请求信息
 * @returns 当前登录的用户对象
 *
 * @example
 * // 基本使用：获取当前用户
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: User) {
 *   console.log(user.username);  // 访问用户信息
 *   return user;
 * }
 *
 * @example
 * // 使用场景：记录审计日志
 * @Post('devices')
 * @UseGuards(JwtAuthGuard)
 * async createDevice(
 *   @CurrentUser() user: User,
 *   @Body() createDto: CreateDeviceDto
 * ) {
 *   const device = await this.deviceService.create(createDto);
 *   await this.auditService.log({
 *     userId: user.id,
 *     action: AuditAction.CREATE,
 *     resource: 'device',
 *     resourceId: device.id
 *   });
 *   return device;
 * }
 *
 * @example
 * // 使用场景：根据用户信息过滤数据
 * @Get('my-devices')
 * @UseGuards(JwtAuthGuard)
 * getMyDevices(@CurrentUser() user: User) {
 *   // 只返回当前用户创建的设备
 *   return this.deviceService.findByUserId(user.id);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
