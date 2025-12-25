/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlarmExportQueryDto } from './AlarmExportQueryDto';
export type ExportAlarmsDto = {
    /**
     * 查询条件
     */
    queryConditions: AlarmExportQueryDto;
    /**
     * 导出格式
     */
    exportFormat: ExportAlarmsDto.exportFormat;
};
export namespace ExportAlarmsDto {
    /**
     * 导出格式
     */
    export enum exportFormat {
        EXCEL = 'excel',
        CSV = 'csv',
        PDF = 'pdf',
    }
}

