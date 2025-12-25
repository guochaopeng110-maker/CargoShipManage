/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type BatchDataItemDto = {
    /**
     * 数据时间戳
     */
    timestamp: string;
    /**
     * 指标类型
     */
    metricType: BatchDataItemDto.metricType;
    /**
     * 监测点名称（可选）
     */
    monitoringPoint?: string;
    /**
     * 指标数值
     */
    value: number;
    /**
     * 数据单位（可选）
     */
    unit?: string;
    /**
     * 数据质量标记（可选）
     */
    quality?: BatchDataItemDto.quality;
};
export namespace BatchDataItemDto {
    /**
     * 指标类型
     */
    export enum metricType {
        TEMPERATURE = 'temperature',
        PRESSURE = 'pressure',
        HUMIDITY = 'humidity',
        VIBRATION = 'vibration',
        SPEED = 'speed',
        CURRENT = 'current',
        VOLTAGE = 'voltage',
        POWER = 'power',
        FREQUENCY = 'frequency',
        LEVEL = 'level',
        RESISTANCE = 'resistance',
        SWITCH = 'switch',
    }
    /**
     * 数据质量标记（可选）
     */
    export enum quality {
        NORMAL = 'normal',
        ABNORMAL = 'abnormal',
        SUSPICIOUS = 'suspicious',
    }
}

