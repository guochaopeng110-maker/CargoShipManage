/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TrendAnalysis = {
    /**
     * 温度趋势（如上升、下降、稳定）
     */
    temperatureTrend: string;
    /**
     * 振动趋势（如上升、下降、稳定）
     */
    vibrationTrend: string;
    /**
     * 总体趋势（如改善、恶化、稳定）
     */
    overallTrend: string;
    /**
     * 风险等级
     */
    riskLevel: TrendAnalysis.riskLevel;
    /**
     * 建议事项
     */
    suggestions: Array<string>;
};
export namespace TrendAnalysis {
    /**
     * 风险等级
     */
    export enum riskLevel {
        LOW = 'low',
        MEDIUM = 'medium',
        HIGH = 'high',
    }
}

