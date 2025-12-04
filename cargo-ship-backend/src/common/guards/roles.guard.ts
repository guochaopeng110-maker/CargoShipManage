/**
 * 角色守卫
 *
 * 描述：基于用户角色进行访问控制的守卫
 *
 * 功能：
 * - 检查用户是否拥有所需的角色
 * - 支持单个或多个角色验证
 * - 只要拥有其中一个角色即可通过（OR逻辑）
 *
 * 使用方式：
 * - 配合@Roles()装饰器使用
 * - 通常放在JwtAuthGuard之后
 *
 * RBAC架构：
 * - Role-Based Access Control（基于角色的访问控制）
 * - 用户 -> 角色 -> 权限
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
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../database/entities/user.entity';

/**
 * 角色守卫类
 *
 * 实现CanActivate接口，提供基于角色的访问控制
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * 判断用户是否拥有所需角色
   *
   * 验证逻辑：
   * 1. 从装饰器元数据中获取所需角色列表
   * 2. 如果没有指定角色要求，直接放行
   * 3. 从请求中获取当前用户对象
   * 4. 检查用户是否拥有任一所需角色（OR逻辑）
   * 5. 通过则返回true，否则抛出ForbiddenException
   *
   * @param context - 执行上下文
   * @returns true表示通过，false或抛出异常表示拒绝
   * @throws ForbiddenException 如果用户未认证或没有所需角色
   *
   * @example
   * // 在控制器方法上使用
   * @UseGuards(JwtAuthGuard, RolesGuard)
   * @Roles('administrator', 'operator')
   * @Delete(':id')
   * deleteDevice(@Param('id') id: string) {
   *   // 只有administrator或operator角色可以访问
   *   return this.deviceService.delete(id);
   * }
   */
  canActivate(context: ExecutionContext): boolean {
    // 从装饰器获取所需角色列表
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [
        context.getHandler(), // 方法级装饰器
        context.getClass(), // 类级装饰器
      ],
    );

    // 如果没有指定角色要求，放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 从HTTP请求中获取用户对象
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // 用户未认证，拒绝访问
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // 提取用户的所有角色名称
    const userRoles = user.roles?.map((role) => role.name) || [];

    // 检查用户是否拥有任一所需角色（OR逻辑）
    // 例如：需要['admin', 'operator']，用户有'admin'即可通过
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    // 如果没有所需角色，抛出异常
    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
