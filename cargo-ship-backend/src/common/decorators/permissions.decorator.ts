/**
 * 权限要求装饰器
 *
 * 描述：用于指定访问接口所需的细粒度权限
 *
 * 功能：
 * - 声明接口需要的权限列表
 * - 配合PermissionsGuard使用
 * - 实现基于权限的访问控制（细粒度RBAC）
 *
 * 权限格式：
 * - resource:action（资源:操作）
 * - 例如：device:create, user:update, report:export
 *
 * 逻辑：
 * - AND逻辑：用户必须拥有所有指定权限才能访问
 * - 例如：@RequirePermissions('device:create', 'device_type:read')
 *   表示必须同时拥有两个权限
 *
 * 使用场景：
 * - 比角色更细粒度的控制
 * - 跨资源的复合权限要求
 * - 特定操作的精确授权
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { SetMetadata } from '@nestjs/common';

/**
 * 元数据键名
 * 用于存储和读取权限要求
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * RequirePermissions 方法/类装饰器
 *
 * 用途：
 * - 声明访问接口所需的权限
 * - 必须配合PermissionsGuard使用
 * - 提供比角色更精细的访问控制
 *
 * @param permissions - 可变参数，所需的权限列表（格式：resource:action）
 * @returns SetMetadata装饰器，设置permissions元数据
 *
 * @example
 * // 单个权限：需要创建设备的权限
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions('device:create')
 * @Post('devices')
 * createDevice(@Body() dto: CreateDeviceDto) {
 *   return this.deviceService.create(dto);
 * }
 *
 * @example
 * // 多个权限：需要同时满足多个权限（AND逻辑）
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions('device:update', 'device:read', 'device_type:read')
 * @Put('devices/:id')
 * updateDevice(@Param('id') id: string, @Body() dto: UpdateDeviceDto) {
 *   // 必须同时拥有device:update、device:read和device_type:read权限
 *   return this.deviceService.update(id, dto);
 * }
 *
 * @example
 * // 跨资源权限：涉及多个资源的操作
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions('cargo:create', 'vessel:read', 'loading_plan:update')
 * @Post('loading-operations')
 * createLoadingOperation(@Body() dto: CreateLoadingDto) {
 *   // 装货操作需要跨越多个资源的权限
 *   return this.loadingService.create(dto);
 * }
 *
 * @example
 * // 导出权限：特殊操作的权限控制
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions('report:export', 'device:read')
 * @Get('devices/export')
 * exportDevices() {
 *   // 导出设备数据需要导出权限和读取权限
 *   return this.deviceService.exportToExcel();
 * }
 *
 * @example
 * // 整个控制器应用权限限制
 * @Controller('sensitive-data')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions('sensitive_data:read')
 * export class SensitiveDataController {
 *   // 该控制器下所有方法都需要sensitive_data:read权限
 *
 *   @Get()
 *   findAll() {
 *     // 继承控制器级别的权限要求
 *   }
 *
 *   @Post()
 *   @RequirePermissions('sensitive_data:create')  // 方法级别覆盖
 *   create() {
 *     // 需要sensitive_data:create权限（覆盖控制器级别）
 *   }
 * }
 *
 * @example
 * // 权限格式说明
 * // 设备管理相关权限
 * @RequirePermissions('device:create')     // 创建设备
 * @RequirePermissions('device:read')       // 读取设备
 * @RequirePermissions('device:update')     // 更新设备
 * @RequirePermissions('device:delete')     // 删除设备
 * @RequirePermissions('device:manage')     // 管理设备（包含所有操作）
 * @RequirePermissions('device:export')     // 导出设备数据
 * @RequirePermissions('device:import')     // 导入设备数据
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Permissions 装饰器别名
 * 为了向后兼容和简化使用
 */
export const Permissions = RequirePermissions;
