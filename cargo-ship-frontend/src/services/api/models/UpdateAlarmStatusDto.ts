/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateAlarmStatusDto = {
    /**
     * 处理状态
     */
    status: UpdateAlarmStatusDto.status;
    /**
     * 处理说明
     */
    handleNote?: string;
};
export namespace UpdateAlarmStatusDto {
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

