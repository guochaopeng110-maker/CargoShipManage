/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateUserDto = {
    /**
     * 用户名 (3-50位, 字母/数字/下划线/连字符)
     */
    username: string;
    /**
     * 用户邮箱地址
     */
    email: string;
    /**
     * 用户初始密码 (至少8位,包含大小写字母、数字和特殊字符)
     */
    password: string;
    /**
     * 用户全名
     */
    fullName: string;
    /**
     * 手机号码 (可选)
     */
    phoneNumber?: string;
    /**
     * 分配给用户的角色ID数组
     */
    roleIds: Array<string>;
    /**
     * 用户状态 (可选, 默认为 active)
     */
    status?: CreateUserDto.status;
};
export namespace CreateUserDto {
    /**
     * 用户状态 (可选, 默认为 active)
     */
    export enum status {
        ACTIVE = 'active',
        INACTIVE = 'inactive',
        LOCKED = 'locked',
        PENDING = 'pending',
    }
}

