/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type EquipmentOverviewDto = {
    /**
     * 设备总数
     */
    totalCount: number;
    /**
     * 在线设备数（状态为normal或warning）
     */
    onlineCount: number;
    /**
     * 离线设备数（状态为offline）
     */
    offlineCount: number;
    /**
     * 异常设备数（有未处理告警）
     */
    abnormalCount: number;
};

