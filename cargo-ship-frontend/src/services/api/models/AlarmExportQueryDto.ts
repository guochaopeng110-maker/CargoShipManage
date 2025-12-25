/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AlarmExportQueryDto = {
    /**
     * 设备ID
     */
    equipmentId?: string;
    /**
     * 严重程度
     */
    severity?: AlarmExportQueryDto.severity;
    /**
     * 处理状态
     */
    status?: AlarmExportQueryDto.status;
    /**
     * 开始时间（Unix时间戳，毫秒）
     */
    startTime?: number;
    /**
     * 结束时间（Unix时间戳，毫秒）
     */
    endTime?: number;
};
export namespace AlarmExportQueryDto {
    /**
     * 严重程度
     */
    export enum severity {
        LOW = 'low',
        MEDIUM = 'medium',
        HIGH = 'high',
        CRITICAL = 'critical',
    }
    /**
     * 处理状态
     */
    export enum status {
        PENDING = 'pending',
        PROCESSING = 'processing',
        RESOLVED = 'resolved',
        IGNORED = 'ignored',
    }
}

