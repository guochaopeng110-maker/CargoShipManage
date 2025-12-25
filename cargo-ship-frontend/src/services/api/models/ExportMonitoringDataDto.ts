/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MonitoringDataExportQueryDto } from './MonitoringDataExportQueryDto';
export type ExportMonitoringDataDto = {
    /**
     * 查询条件
     */
    queryConditions: MonitoringDataExportQueryDto;
    /**
     * 导出格式
     */
    exportFormat: ExportMonitoringDataDto.exportFormat;
};
export namespace ExportMonitoringDataDto {
    /**
     * 导出格式
     */
    export enum exportFormat {
        EXCEL = 'excel',
        CSV = 'csv',
        PDF = 'pdf',
    }
}

