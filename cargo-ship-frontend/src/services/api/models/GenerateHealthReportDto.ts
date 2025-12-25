/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GenerateHealthReportDto = {
    /**
     * 需要进行健康评估的设备的唯一标识符
     */
    deviceId: string;
    /**
     * 评估数据范围的起始时间 (ISO 8601格式)
     */
    startTime: string;
    /**
     * 评估数据范围的结束时间 (ISO 8601格式)
     */
    endTime: string;
};

