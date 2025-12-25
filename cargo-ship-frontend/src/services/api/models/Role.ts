/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Permission } from './Permission';
import type { User } from './User';
export type Role = {
    /**
     * 角色唯一标识符（UUID格式）
     */
    id: string;
    /**
     * 角色名称（全局唯一）
     */
    name: string;
    /**
     * 角色描述，说明角色的职责和权限范围
     */
    description?: string;
    /**
     * 是否为系统角色（系统角色不可删除或重命名）
     */
    isSystem: boolean;
    /**
     * 角色是否激活
     */
    isActive: boolean;
    /**
     * 拥有此角色的用户列表
     */
    users?: Array<User>;
    /**
     * 角色拥有的权限列表
     */
    permissions: Array<Permission>;
    /**
     * 记录创建时间
     */
    createdAt: string;
    /**
     * 记录最后更新时间
     */
    updatedAt: string;
    /**
     * 软删除时间（系统角色不允许删除）
     */
    deletedAt?: string;
};

