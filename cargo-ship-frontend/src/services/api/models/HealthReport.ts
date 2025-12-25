/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrendAnalysis } from './TrendAnalysis';
import type { UptimeStats } from './UptimeStats';
export type HealthReport = {
    /**
     * 健康报告ID（UUID格式）
     */
    id: string;
    /**
     * 关联的设备ID（UUID格式），对于汇总报告为null
     */
    equipmentId?: string;
    /**
     * 报告类型
     */
    reportType: HealthReport.reportType;
    /**
     * 数据开始时间（时间戳，毫秒）
     */
    dataStartTime: number;
    /**
     * 数据结束时间（时间戳，毫秒）
     */
    dataEndTime: number;
    /**
     * 健康评分（0-100分）
     */
    healthScore: number;
    /**
     * 健康等级（根据评分自动计算）
     */
    healthLevel: HealthReport.healthLevel;
    /**
     * 运行时间统计（JSON格式）
     */
    uptimeStats?: UptimeStats;
    /**
     * 异常次数
     */
    abnormalCount: number;
    /**
     * 趋势分析（JSON格式）
     */
    trendAnalysis?: TrendAnalysis;
    /**
     * 报告生成时间（时间戳，毫秒）
     */
    generatedAt: number;
    /**
     * 生成人ID（UUID格式）
     */
    generatedBy: string;
    /**
     * 报告备注，用于添加人工审核意见、补充说明等
     */
    remarks?: string;
    /**
     * 附加说明，用于记录额外的分析结果、处理建议等
     */
    additionalNotes?: string;
    /**
     * 记录创建时间
     */
    createdAt: string;
};
export namespace HealthReport {
    /**
     * 报告类型
     */
    export enum reportType {
        SINGLE = 'single',
        AGGREGATE = 'aggregate',
    }
    /**
     * 健康等级（根据评分自动计算）
     */
    export enum healthLevel {
        EXCELLENT = 'excellent',
        GOOD = 'good',
        FAIR = 'fair',
        POOR = 'poor',
    }
}

