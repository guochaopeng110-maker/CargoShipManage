/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TimeSeriesData = {
    /**
     * 时序数据ID（自增主键）
     */
    id: number;
    /**
     * 设备ID
     */
    equipmentId: string;
    /**
     * 数据时间戳
     */
    timestamp: string;
    /**
     * 指标类型
     */
    metricType: TimeSeriesData.metricType;
    /**
     * 监测点名称，用于区分相同物理类型但业务含义不同的测量值（如"总电压" vs "单体电压"）
     */
    monitoringPoint?: string;
    /**
     * 指标数值
     */
    value: number;
    /**
     * 数据单位
     */
    unit?: string;
    /**
     * 数据质量标记
     */
    quality: TimeSeriesData.quality;
    /**
     * 数据来源
     */
    source: TimeSeriesData.source;
    /**
     * 创建时间
     */
    createdAt: string;
};
export namespace TimeSeriesData {
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
     * 数据质量标记
     */
    export enum quality {
        NORMAL = 'normal',
        ABNORMAL = 'abnormal',
        SUSPICIOUS = 'suspicious',
    }
    /**
     * 数据来源
     */
    export enum source {
        SENSOR_UPLOAD = 'sensor-upload',
        FILE_IMPORT = 'file-import',
        MANUAL_ENTRY = 'manual-entry',
    }
}

