// 健康检查状态管理（简化版本，基于现有的健康服务）
// 基于货船智能机舱管理系统健康评估架构

// 简化的store实现（不依赖外部状态管理库）
import {
  HealthReport,
  HealthReportFilters,
  HealthReportGenerationRequest,
  ReportFormat,
  HealthScoreCalculation,
  PredictiveHealthAnalysis,
} from '../types/health';
import { healthService } from '../services/health-service';

// 健康状态枚举
export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

// 健康检查状态
export interface HealthState {
  // 健康报告相关
  healthReports: HealthReport[];
  currentReport: HealthReport | null;
  healthScores: Map<string, HealthScoreCalculation>;
  predictiveAnalysis: Map<string, PredictiveHealthAnalysis>;
  
  // 状态管理
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  
  // 筛选和配置
  filters: HealthReportFilters;
  reportConfig: {
    includeCharts: boolean;
    includeRecommendations: boolean;
    format: ReportFormat;
  };
}

// 健康检查操作
export interface HealthActions {
  // 报告操作
  generateReport: (request: HealthReportGenerationRequest) => Promise<HealthReport>;
  getReports: (params?: { page?: number; pageSize?: number; filters?: HealthReportFilters }) => Promise<{ items: HealthReport[]; total: number; page: number; pageSize: number }>;
  getReport: (reportId: string) => Promise<HealthReport>;
  exportReport: (reportId: string, format: ReportFormat, options?: { includeCharts?: boolean; includeRecommendations?: boolean }) => Promise<{ downloadUrl: string; expiresAt: number }>;
  
  // 健康评分
  getEquipmentHealthScore: (equipmentId: string) => Promise<HealthScoreCalculation>;
  getPredictiveHealthAnalysis: (equipmentId: string, horizonDays: number) => Promise<PredictiveHealthAnalysis>;
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setCurrentReport: (report: HealthReport | null) => void;
  
  // 筛选和配置
  setFilters: (filters: Partial<HealthReportFilters>) => void;
  updateReportConfig: (config: Partial<HealthState['reportConfig']>) => void;
  clearFilters: () => void;
  
  // 数据管理
  refresh: () => Promise<void>;
  clearCache: () => void;
  reset: () => void;
}

// 简化的健康检查Store实现
class HealthStore implements HealthState, HealthActions {
  // 状态
  healthReports: HealthReport[] = [];
  currentReport: HealthReport | null = null;
  healthScores: Map<string, HealthScoreCalculation> = new Map();
  predictiveAnalysis: Map<string, PredictiveHealthAnalysis> = new Map();
  loading = false;
  error: string | null = null;
  lastUpdate = 0;
  filters: HealthReportFilters = {};
  reportConfig = {
    includeCharts: true,
    includeRecommendations: true,
    format: ReportFormat.PDF,
  };

  // 报告操作
  async generateReport(request: HealthReportGenerationRequest): Promise<HealthReport> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      // 确保equipmentId不为undefined
      const reportRequest = {
        ...request,
        equipmentId: request.equipmentId || ''
      };
      
      const reportResult = await healthService.generateReport(reportRequest);
      
      // 生成报告后，获取完整的报告详情
      const fullReport = await healthService.getReport(reportResult.reportId);
      
      this.healthReports = [fullReport, ...this.healthReports];
      this.currentReport = fullReport;
      this.lastUpdate = Date.now();
      
      return fullReport;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate health report';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async getReports(params = {}): Promise<{ items: HealthReport[]; total: number; page: number; pageSize: number }> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await healthService.getReports(params);
      
      this.healthReports = result.items;
      this.lastUpdate = Date.now();
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch health reports';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async getReport(reportId: string): Promise<HealthReport> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const report = await healthService.getReport(reportId);
      
      this.currentReport = report;
      this.lastUpdate = Date.now();
      
      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch health report';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async exportReport(
    reportId: string,
    format: ReportFormat,
    options?: { includeCharts?: boolean; includeRecommendations?: boolean }
  ): Promise<{ downloadUrl: string; expiresAt: number }> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await healthService.exportReport(reportId, format, options);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export health report';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // 健康评分
  async getEquipmentHealthScore(equipmentId: string): Promise<HealthScoreCalculation> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const score = await healthService.getEquipmentHealthScore(equipmentId);
      
      this.healthScores.set(equipmentId, score);
      
      return score;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch equipment health score';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async getPredictiveHealthAnalysis(equipmentId: string, horizonDays: number): Promise<PredictiveHealthAnalysis> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const analysis = await healthService.getPredictiveHealthAnalysis(equipmentId, horizonDays);
      
      this.predictiveAnalysis.set(`${equipmentId}_${horizonDays}`, analysis);
      
      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch predictive health analysis';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // 状态管理
  setLoading(loading: boolean): void {
    this.loading = loading;
  }

  setError(error: string | null): void {
    this.error = error;
  }

  clearError(): void {
    this.error = null;
  }

  setCurrentReport(report: HealthReport | null): void {
    this.currentReport = report;
  }

  // 筛选和配置
  setFilters(filters: Partial<HealthReportFilters>): void {
    this.filters = { ...this.filters, ...filters };
  }

  updateReportConfig(config: Partial<HealthState['reportConfig']>): void {
    this.reportConfig = { ...this.reportConfig, ...config };
  }

  clearFilters(): void {
    this.filters = {};
  }

  // 数据管理
  async refresh(): Promise<void> {
    await this.getReports();
  }

  clearCache(): void {
    this.healthScores.clear();
    this.predictiveAnalysis.clear();
    this.healthReports = [];
    this.currentReport = null;
  }

  reset(): void {
    this.healthReports = [];
    this.currentReport = null;
    this.healthScores.clear();
    this.predictiveAnalysis.clear();
    this.loading = false;
    this.error = null;
    this.lastUpdate = 0;
    this.filters = {};
    this.reportConfig = {
      includeCharts: true,
      includeRecommendations: true,
      format: ReportFormat.PDF,
    };
  }
}

// 创建单例实例
const healthStore = new HealthStore();

// 导出Hook样式接口
export const useHealthStore = () => healthStore;

// 导出便捷Hook
export const useHealth = () => {
  const store = useHealthStore();
  return {
    // 状态
    ...store,
    // 计算属性
    latestReport: store.healthReports[0] || null,
    reportsByStatus: {
      excellent: store.healthReports.filter(r => r.status === 'EXCELLENT'),
      good: store.healthReports.filter(r => r.status === 'GOOD'),
      fair: store.healthReports.filter(r => r.status === 'FAIR'),
      poor: store.healthReports.filter(r => r.status === 'POOR'),
    },
    averageHealthScore: store.healthReports.length > 0
      ? store.healthReports.reduce((sum, report) => sum + (report.score || 0), 0) / store.healthReports.length
      : 0,
    totalReports: store.healthReports.length,
  };
};

export default useHealthStore;