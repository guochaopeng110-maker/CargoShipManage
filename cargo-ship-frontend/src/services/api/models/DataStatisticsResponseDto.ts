/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DataStatisticsResponseDto = {
    /**
     * 指标类型
     */
    metricType: string;
    /**
     * 数据点数量
     */
    count: number;
    /**
     * 最大值
     */
    maxValue: number;
    /**
     * 最小值
     */
    minValue: number;
    /**
     * 平均值
     */
    avgValue: number;
    /**
     * 测量单位
     */
    unit?: string;
};

