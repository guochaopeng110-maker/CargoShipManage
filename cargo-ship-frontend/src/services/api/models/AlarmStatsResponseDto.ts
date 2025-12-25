/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AlarmStatsResponseDto = {
    /**
     * 告警总数
     */
    totalCount: number;
    /**
     * 按严重程度分组统计
     */
    groupBySeverity: Record<string, any>;
    /**
     * 按处理状态分组统计
     */
    groupByStatus: Record<string, any>;
};

