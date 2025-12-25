/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Role } from './Role';
export type Permission = {
    /**
     * 权限唯一标识符（UUID格式）
     */
    id: string;
    /**
     * 权限名称（全局唯一，格式：resource:action）
     */
    name: string;
    /**
     * 权限控制的资源类型
     */
    resource: Permission.resource;
    /**
     * 权限允许的操作类型
     */
    action: Permission.action;
    /**
     * 权限描述，说明权限的用途和范围
     */
    description?: string;
    /**
     * 是否为系统权限（系统权限不可删除）
     */
    isSystem: boolean;
    /**
     * 拥有此权限的角色列表
     */
    roles?: Array<Role>;
    /**
     * 记录创建时间
     */
    createdAt: string;
    /**
     * 记录最后更新时间
     */
    updatedAt: string;
};
export namespace Permission {
    /**
     * 权限控制的资源类型
     */
    export enum resource {
        DEVICE = 'device',
        SENSOR_DATA = 'sensor_data',
        ALERT = 'alert',
        REPORT = 'report',
        USER = 'user',
        ROLE = 'role',
        PERMISSION = 'permission',
        AUDIT_LOG = 'audit_log',
        SYSTEM_CONFIG = 'system_config',
    }
    /**
     * 权限允许的操作类型
     */
    export enum action {
        CREATE = 'create',
        READ = 'read',
        UPDATE = 'update',
        DELETE = 'delete',
        MANAGE = 'manage',
        EXPORT = 'export',
        IMPORT = 'import',
        APPROVE = 'approve',
    }
}

