/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MonitoringPoint = {
    /**
     * 监测点唯一ID（UUID格式）
     */
    id: string;
    /**
     * 关联设备ID（UUID）
     */
    equipmentId: string;
    /**
     * 监测点名称（中文标识，业务层面的精确监测位置）
     */
    pointName: string;
    /**
     * 指标类型（物理测量类型）
     */
    metricType: MonitoringPoint.metricType;
    /**
     * 数据单位（如: V, A, ℃, %, kΩ）
     */
    unit?: string;
    /**
     * 监测点说明/描述
     */
    description?: string;
};
export namespace MonitoringPoint {
    /**
     * 指标类型（物理测量类型）
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
}

