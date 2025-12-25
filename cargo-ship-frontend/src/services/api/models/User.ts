/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Role } from './Role';
export type User = {
    /**
     * 用户唯一标识符（UUID格式）
     */
    id: string;
    /**
     * 用户名（全局唯一）
     */
    username: string;
    /**
     * 邮箱地址（全局唯一）
     */
    email: string;
    /**
     * 用户全名
     */
    fullName: string;
    /**
     * 手机号码
     */
    phoneNumber?: string;
    /**
     * 用户状态
     */
    status: User.status;
    /**
     * 最后登录时间
     */
    lastLoginAt?: string;
    /**
     * 最后登录IP地址
     */
    lastLoginIp?: string;
    /**
     * 密码最后修改时间
     */
    passwordChangedAt?: string;
    /**
     * 用户拥有的角色列表
     */
    roles: Array<Role>;
    /**
     * 记录创建时间
     */
    createdAt: string;
    /**
     * 记录最后更新时间
     */
    updatedAt: string;
    /**
     * 软删除时间
     */
    deletedAt?: string;
};
export namespace User {
    /**
     * 用户状态
     */
    export enum status {
        ACTIVE = 'active',
        INACTIVE = 'inactive',
        LOCKED = 'locked',
        PENDING = 'pending',
    }
}

