/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BatchDataItemDto } from './BatchDataItemDto';
export type CreateBatchTimeSeriesDataDto = {
    /**
     * 设备唯一标识（UUID格式）
     */
    equipmentId: string;
    /**
     * 监测数据数组（1-1000条）
     */
    data: Array<BatchDataItemDto>;
};

