/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ImportDataDto = {
    /**
     * 导入记录ID
     */
    importRecordId: string;
    /**
     * 是否跳过验证失败的行
     */
    skipInvalidRows: boolean;
    /**
     * 重复数据处理策略
     */
    duplicateStrategy: ImportDataDto.duplicateStrategy;
    /**
     * 备注信息
     */
    remarks?: string;
};
export namespace ImportDataDto {
    /**
     * 重复数据处理策略
     */
    export enum duplicateStrategy {
        SKIP = 'skip',
        OVERWRITE = 'overwrite',
    }
}

