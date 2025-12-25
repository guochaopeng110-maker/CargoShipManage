/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type CreateTimeSeriesDataDto = {
    /**
     * 设备唯一标识（UUID格式）
     */
    equipmentId: string;
    /**
     * 数据时间戳
     */
    timestamp: string;
    /**
     * 指标类型
     */
    metricType: CreateTimeSeriesDataDto.metricType;
    /**
     * 监测点名称（推荐填写，用于精确标识业务监测点）
     */
    monitoringPoint?: string;
    /**
     * 指标数值
     */
    value: number;
    /**
     * 数据单位（可选，未提供时使用默认值）
     */
    unit?: string;
    /**
     * 数据质量标记（可选，默认为normal）
     */
    quality?: CreateTimeSeriesDataDto.quality;
    /**
     * 数据来源（可选，默认为sensor-upload）
     */
    source?: CreateTimeSeriesDataDto.source;
};
export namespace CreateTimeSeriesDataDto {
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
     * 数据质量标记（可选，默认为normal）
     */
    export enum quality {
        NORMAL = 'normal',
        ABNORMAL = 'abnormal',
        SUSPICIOUS = 'suspicious',
    }
    /**
     * 数据来源（可选，默认为sensor-upload）
     */
    export enum source {
        SENSOR_UPLOAD = 'sensor-upload',
        FILE_IMPORT = 'file-import',
        MANUAL_ENTRY = 'manual-entry',
    }
}

