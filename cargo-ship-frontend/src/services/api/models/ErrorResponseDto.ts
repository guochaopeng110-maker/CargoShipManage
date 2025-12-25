/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ErrorResponseDto = {
    /**
     * HTTP 状态码
     */
    statusCode: number;
    /**
     * 错误消息（单个或数组）
     */
    message: (string | Array<string>);
    /**
     * 错误类型描述
     */
    error?: string;
    /**
     * 错误发生的时间戳（毫秒）
     */
    timestamp: number;
    /**
     * 触发错误的请求路径
     */
    path?: string;
};

