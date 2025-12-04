/**
 * 权限守卫
 *
 * 描述：基于细粒度权限进行访问控制的守卫
 *
 * 功能：
 * - 检查用户是否拥有所需的权限
 * - 支持多个权限验证（AND逻辑）
 * - 从用户的所有角色中提取权限
 *
 * 权限格式：
 * - resource:action（如 device:create）
 * - 资源类型：操作类型
 *
 * 使用方式：
 * - 配合@RequirePermissions()装饰器使用
 * - 通常放在JwtAuthGuard之后
 * - 比角色守卫提供更细粒度的控制
 *
 * RBAC + ABAC：
 * - 基于角色和属性的访问控制
 * - 用户 -> 角色 -> 权限 -> 资源操作
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';

/**
 * 权限守卫类
 *
 * 实现CanActivate接口，提供基于权限的细粒度访问控制
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * 判断用户是否拥有所需权限
   *
   * 验证逻辑：
   * 1. 从装饰器元数据中获取所需权限列表
   * 2. 如果没有指定权限要求，直接放行
   * 3. 从请求中获取当前用户对象
   * 4. 提取用户所有角色的所有权限
   * 5. 检查用户是否拥有全部所需权限（AND逻辑）
   * 6. 通过则返回true，否则抛出ForbiddenException
   *
   * @param context - 执行上下文
   * @returns true表示通过，false或抛出异常表示拒绝
   * @throws ForbiddenException 如果用户未认证或缺少所需权限
   *
   * @example
   * // 在控制器方法上使用
   * @UseGuards(JwtAuthGuard, PermissionsGuard)
   * @RequirePermissions('device:create', 'device_type:read')
   * @Post()
   * createDevice(@Body() createDto: CreateDeviceDto) {
   *   // 只有同时拥有device:create和device_type:read权限才能访问
   *   return this.deviceService.create(createDto);
   * }
   */
  canActivate(context: ExecutionContext): boolean {
    // 从装饰器获取所需权限列表
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [
        context.getHandler(), // 方法级装饰器
        context.getClass(), // 类级装饰器
      ],
    );

    // 如果没有指定权限要求，放行
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 从HTTP请求中获取用户对象
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // 用户未认证，拒绝访问
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 提取用户拥有的所有权限
    const userPermissions = this.extractPermissions(user);

    // 检查用户是否拥有全部所需权限（AND逻辑）
    // 例如：需要['device:create', 'device:read']，用户必须同时拥有这两个权限
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    // 如果缺少任何一个权限，抛出异常
    if (!hasPermission) {
      throw new ForbiddenException(
        `User does not have required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * 从用户对象中提取所有权限（私有方法）
   *
   * 功能：
   * - 遍历用户的所有角色
   * - 收集每个角色的所有权限
   * - 去重并返回权限列表
   *
   * 权限格式：
   * - resource:action
   * - 例如：device:create, user:update, report:export
   *
   * @param user - 用户对象（包含roles和permissions关联）
   * @returns 权限字符串数组
   *
   * @example
   * // 用户有两个角色：operator和viewer
   * // operator角色有权限：device:create, device:update
   * // viewer角色有权限：device:read, user:read
   * // 返回：['device:create', 'device:update', 'device:read', 'user:read']
   */
  private extractPermissions(user: User): string[] {
    const permissions: string[] = [];

    // 遍历用户的所有角色
    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        // 遍历角色的所有权限
        if (role.permissions && Array.isArray(role.permissions)) {
          for (const permission of role.permissions) {
            // 构造权限名称：resource:action
            const permissionName = `${permission.resource}:${permission.action}`;
            // 去重：避免重复添加相同权限
            if (!permissions.includes(permissionName)) {
              permissions.push(permissionName);
            }
          }
        }
      }
    }

    return permissions;
  }
}
