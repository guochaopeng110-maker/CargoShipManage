/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ImportError } from './ImportError';
export type ImportRecord = {
    /**
     * 导入记录ID（UUID格式）
     */
    id: string;
    /**
     * 导入文件名
     */
    fileName: string;
    /**
     * 文件格式
     */
    fileFormat: ImportRecord.fileFormat;
    /**
     * 文件大小（字节）
     */
    fileSize: number;
    /**
     * 目标设备ID（UUID格式），多设备导入时为null
     */
    equipmentId?: string;
    /**
     * 导入状态
     */
    status: ImportRecord.status;
    /**
     * 总数据条数
     */
    totalRows: number;
    /**
     * 成功导入条数
     */
    successRows: number;
    /**
     * 失败条数
     */
    failedRows: number;
    /**
     * 跳过条数（如重复数据）
     */
    skippedRows: number;
    /**
     * 重复数据处理策略
     */
    duplicateStrategy: ImportRecord.duplicateStrategy;
    /**
     * 错误详情（JSON格式）
     */
    errors?: Array<ImportError>;
    /**
     * 开始处理时间
     */
    startedAt?: string;
    /**
     * 完成时间
     */
    completedAt?: string;
    /**
     * 导入操作人ID（UUID格式）
     */
    importedBy: string;
    /**
     * 记录创建时间
     */
    createdAt: string;
};
export namespace ImportRecord {
    /**
     * 文件格式
     */
    export enum fileFormat {
        EXCEL = 'excel',
        CSV = 'csv',
        JSON = 'json',
    }
    /**
     * 导入状态
     */
    export enum status {
        PENDING = 'pending',
        PROCESSING = 'processing',
        COMPLETED = 'completed',
        PARTIAL = 'partial',
        FAILED = 'failed',
    }
    /**
     * 重复数据处理策略
     */
    export enum duplicateStrategy {
        SKIP = 'skip',
        OVERWRITE = 'overwrite',
    }
}

