/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MonitoringDataExportQueryDto = {
    /**
     * 设备ID
     */
    equipmentId?: string;
    /**
     * 监测指标类型
     */
    metricType?: MonitoringDataExportQueryDto.metricType;
    /**
     * 监测点名称（可选，用于筛选特定监测点的数据）
     */
    monitoringPoint?: string;
    /**
     * 开始时间（Unix时间戳，毫秒）
     */
    startTime?: number;
    /**
     * 结束时间（Unix时间戳，毫秒）
     */
    endTime?: number;
};
export namespace MonitoringDataExportQueryDto {
    /**
     * 监测指标类型
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

