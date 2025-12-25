/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateUserDto = {
    /**
     * 新用户名 (3-50位, 字母/数字/下划线/连字符)
     */
    username?: string;
    /**
     * 新邮箱地址
     */
    email?: string;
    /**
     * 重置后的新密码 (至少8位,包含大小写字母、数字和特殊字符)
     */
    password?: string;
    /**
     * 新用户全名
     */
    fullName?: string;
    /**
     * 新手机号码
     */
    phoneNumber?: string;
    /**
     * 完全替换用户现有角色的ID数组
     */
    roleIds?: Array<string>;
    /**
     * 新用户状态 (active, inactive, locked)
     */
    status?: UpdateUserDto.status;
};
export namespace UpdateUserDto {
    /**
     * 新用户状态 (active, inactive, locked)
     */
    export enum status {
        ACTIVE = 'active',
        INACTIVE = 'inactive',
        LOCKED = 'locked',
        PENDING = 'pending',
    }
}

