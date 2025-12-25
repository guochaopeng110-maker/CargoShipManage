/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ReportExportQueryDto } from './ReportExportQueryDto';
export type ExportReportsDto = {
    /**
     * 查询条件
     */
    queryConditions: ReportExportQueryDto;
    /**
     * 导出格式（健康报告仅支持PDF）
     */
    exportFormat: ExportReportsDto.exportFormat;
};
export namespace ExportReportsDto {
    /**
     * 导出格式（健康报告仅支持PDF）
     */
    export enum exportFormat {
        PDF = 'pdf',
    }
}

