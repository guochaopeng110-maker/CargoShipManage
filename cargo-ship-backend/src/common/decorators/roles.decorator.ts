/**
 * 角色要求装饰器
 *
 * 描述：用于指定访问接口所需的用户角色
 *
 * 功能：
 * - 声明接口需要的角色列表
 * - 配合RolesGuard使用
 * - 实现基于角色的访问控制（RBAC）
 *
 * 逻辑：
 * - OR逻辑：用户拥有任意一个指定角色即可访问
 * - 例如：@RequireRoles('admin', 'operator') 表示admin或operator都可以访问
 *
 * 使用场景：
 * - 管理员专用接口
 * - 操作员功能限制
 * - 基于角色的权限控制
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { SetMetadata } from '@nestjs/common';

/**
 * 元数据键名
 * 用于存储和读取角色要求
 */
export const ROLES_KEY = 'roles';

/**
 * RequireRoles 方法/类装饰器
 *
 * 用途：
 * - 声明访问接口所需的角色
 * - 必须配合RolesGuard使用
 *
 * @param roles - 可变参数，允许的角色名称列表
 * @returns SetMetadata装饰器，设置roles元数据
 *
 * @example
 * // 单个角色：仅管理员可访问
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @RequireRoles('administrator')
 * @Delete('users/:id')
 * deleteUser(@Param('id') id: string) {
 *   return this.userService.delete(id);
 * }
 *
 * @example
 * // 多个角色：管理员或操作员可访问（OR逻辑）
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @RequireRoles('administrator', 'operator')
 * @Post('devices')
 * createDevice(@Body() dto: CreateDeviceDto) {
 *   // admin或operator角色都可以创建设备
 *   return this.deviceService.create(dto);
 * }
 *
 * @example
 * // 整个控制器应用角色限制
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @RequireRoles('administrator')
 * export class AdminController {
 *   // 该控制器下所有方法都需要administrator角色
 * }
 *
 * @example
 * // 方法级别覆盖类级别的角色要求
 * @Controller('devices')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @RequireRoles('viewer')  // 类级别：默认viewer可访问
 * export class DeviceController {
 *   @Get()
 *   findAll() {
 *     // 继承类级别：viewer可访问
 *   }
 *
 *   @Post()
 *   @RequireRoles('operator', 'administrator')  // 方法级别覆盖
 *   create() {
 *     // 只有operator或admin可访问
 *   }
 * }
 */
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

/**
 * Roles 装饰器别名
 * 为了向后兼容和简化使用
 */
export const Roles = RequireRoles;
