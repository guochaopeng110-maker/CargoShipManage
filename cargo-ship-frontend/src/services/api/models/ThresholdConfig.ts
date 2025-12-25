/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ThresholdConfig = {
    /**
     * 阈值配置ID（UUID格式）
     */
    id: string;
    /**
     * 设备ID（UUID格式）
     */
    equipmentId: string;
    /**
     * 监测指标类型
     */
    metricType: ThresholdConfig.metricType;
    /**
     * 监测点名称，用于精确匹配告警规则（如"总电压"、"单体最高温度"）
     */
    monitoringPoint?: string;
    /**
     * 故障名称，描述触发告警时的具体故障类型
     */
    faultName?: string;
    /**
     * 处理措施，建议操作员在告警触发时采取的纠正措施
     */
    recommendedAction?: string;
    /**
     * 上限值，当监测值超过此值时触发告警
     */
    upperLimit?: number;
    /**
     * 下限值，当监测值低于此值时触发告警
     */
    lowerLimit?: number;
    /**
     * 持续时间（毫秒），超过阈值并持续该时间后才触发告警
     */
    duration: number;
    /**
     * 严重程度
     */
    severity: ThresholdConfig.severity;
    /**
     * 规则状态
     */
    ruleStatus: ThresholdConfig.ruleStatus;
    /**
     * 创建人ID
     */
    creator?: string;
    /**
     * 修改人ID
     */
    modifier?: string;
    /**
     * 创建时间
     */
    createdAt: string;
    /**
     * 更新时间
     */
    updatedAt: string;
    /**
     * 软删除时间
     */
    deletedAt?: string;
};
export namespace ThresholdConfig {
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

