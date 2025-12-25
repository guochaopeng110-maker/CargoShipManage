/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type AlarmRecord = {
    /**
     * 告警记录ID（UUID格式）
     */
    id: string;
    /**
     * 设备ID
     */
    equipmentId: string;
    /**
     * 触发的阈值配置ID
     */
    thresholdId?: string;
    /**
     * 异常指标类型
     */
    abnormalMetricType: AlarmRecord.abnormalMetricType;
    /**
     * 告警关联的监测点名称（反规范化，保证历史准确性）
     */
    monitoringPoint?: string;
    /**
     * 故障名称（反规范化，保证历史准确性）
     */
    faultName?: string;
    /**
     * 处理措施建议（反规范化，保证历史准确性）
     */
    recommendedAction?: string;
    /**
     * 异常值
     */
    abnormalValue: number;
    /**
     * 阈值范围描述
     */
    thresholdRange: string;
    /**
     * 告警触发时间
     */
    triggeredAt: string;
    /**
     * 严重程度
     */
    severity: AlarmRecord.severity;
    /**
     * 处理状态
     */
    status: AlarmRecord.status;
    /**
     * 处理人ID
     */
    handler?: string;
    /**
     * 处理时间
     */
    handledAt?: string;
    /**
     * 处理说明
     */
    handleNote?: string;
    /**
     * 创建时间
     */
    createdAt: string;
};
export namespace AlarmRecord {
    /**
     * 异常指标类型
     */
    export enum abnormalMetricType {
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
     * 处理状态
     */
    export enum status {
        PENDING = 'pending',
        PROCESSING = 'processing',
        RESOLVED = 'resolved',
        IGNORED = 'ignored',
    }
}

