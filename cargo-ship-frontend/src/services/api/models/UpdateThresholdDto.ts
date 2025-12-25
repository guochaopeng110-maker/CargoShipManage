/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateThresholdDto = {
    /**
     * 设备ID
     */
    equipmentId?: string;
    /**
     * 监测指标类型
     */
    metricType?: UpdateThresholdDto.metricType;
    /**
     * 监测点名称（推荐填写，用于精确匹配告警规则）
     */
    monitoringPoint?: string;
    /**
     * 故障名称（推荐填写，描述具体故障类型）
     */
    faultName?: string;
    /**
     * 处理措施（可选，建议操作员采取的纠正措施）
     */
    recommendedAction?: string;
    /**
     * 上限值（超过此值触发告警）
     */
    upperLimit?: number;
    /**
     * 下限值（低于此值触发告警）
     */
    lowerLimit?: number;
    /**
     * 持续时间（毫秒），超过阈值并持续该时间后才触发告警
     */
    duration?: number;
    /**
     * 严重程度
     */
    severity?: UpdateThresholdDto.severity;
    /**
     * 规则状态
     */
    ruleStatus?: UpdateThresholdDto.ruleStatus;
};
export namespace UpdateThresholdDto {
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
    /**
     * 严重程度
     */
    export enum severity {
        LOW = 'low',
        MEDIUM = 'medium',
        HIGH = 'high',
        CRITICAL = 'critical',
    }
    /**
     * 规则状态
     */
    export enum ruleStatus {
        ENABLED = 'enabled',
        DISABLED = 'disabled',
    }
}

