/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChangePasswordDto } from '../models/ChangePasswordDto';
import type { CreateUserDto } from '../models/CreateUserDto';
import type { LoginDto } from '../models/LoginDto';
import type { RefreshTokenDto } from '../models/RefreshTokenDto';
import type { RegisterDto } from '../models/RegisterDto';
import type { UpdateUserDto } from '../models/UpdateUserDto';
import type { User } from '../models/User';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * 用户注册
     * @param requestBody
     * @returns any 用户注册成功
     * @throws ApiError
     */
    public static authControllerRegister(
        requestBody: RegisterDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `输入数据验证失败`,
                409: `用户名或邮箱已存在`,
            },
        });
    }
    /**
     * 用户登录
     * @param requestBody
     * @returns any 登录成功，返回访问令牌和刷新令牌
     * @throws ApiError
     */
    public static authControllerLogin(
        requestBody: LoginDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `用户名或密码错误`,
            },
        });
    }
    /**
     * 刷新访问令牌
     * @param requestBody
     * @returns any 成功刷新访问令牌
     * @throws ApiError
     */
    public static authControllerRefresh(
        requestBody: RefreshTokenDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `刷新令牌无效或已过期`,
            },
        });
    }
    /**
     * 用户登出
     * @returns void
     * @throws ApiError
     */
    public static authControllerLogout(): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/logout',
            errors: {
                401: `未提供或无效的访问令牌`,
            },
        });
    }
    /**
     * 修改当前用户密码
     * @param requestBody
     * @returns any 密码修改成功
     * @throws ApiError
     */
    public static authControllerChangePassword(
        requestBody: ChangePasswordDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/change-password',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `旧密码错误或新密码不符合要求`,
                401: `未提供或无效的访问令牌`,
            },
        });
    }
    /**
     * 获取当前用户信息
     * @returns User 成功获取用户信息
     * @throws ApiError
     */
    public static authControllerGetProfile(): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/profile',
            errors: {
                401: `未提供或无效的访问令牌`,
            },
        });
    }
    /**
     * 获取所有用户列表 (管理员)
     * @param page 当前页码（从1开始）
     * @param pageSize 每页记录数
     * @returns any 成功获取用户列表
     * @throws ApiError
     */
    public static authControllerFindAllUsers(
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        data?: {
            items?: Array<User>;
            total?: number;
            page?: number;
            pageSize?: number;
            totalPages?: number;
        };
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/users',
            query: {
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                403: `权限不足`,
            },
        });
    }
    /**
     * 创建新用户 (管理员)
     * @param requestBody
     * @returns User 用户创建成功
     * @throws ApiError
     */
    public static authControllerCreateUser(
        requestBody: CreateUserDto,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/auth/users',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `输入数据验证失败`,
                403: `权限不足`,
                409: `用户名或邮箱已存在`,
            },
        });
    }
    /**
     * 根据ID获取单个用户 (管理员)
     * @param id 用户ID
     * @returns User 成功获取用户
     * @throws ApiError
     */
    public static authControllerFindUserById(
        id: string,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/auth/users/{id}',
            path: {
                'id': id,
            },
            errors: {
                403: `权限不足`,
                404: `用户不存在`,
            },
        });
    }
    /**
     * 更新用户信息 (管理员)
     * @param id 用户ID
     * @param requestBody
     * @returns User 用户更新成功
     * @throws ApiError
     */
    public static authControllerUpdateUser(
        id: string,
        requestBody: UpdateUserDto,
    ): CancelablePromise<User> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/auth/users/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                403: `权限不足`,
                404: `用户不存在`,
                409: `用户名或邮箱与他人冲突`,
            },
        });
    }
    /**
     * 删除用户 (管理员)
     * @param id 用户ID
     * @returns any 用户删除成功
     * @throws ApiError
     */
    public static authControllerDeleteUser(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/auth/users/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `不能删除最后一个管理员`,
                403: `权限不足`,
                404: `用户不存在`,
            },
        });
    }
}
