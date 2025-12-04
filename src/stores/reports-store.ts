/**
 * 报表状态管理Store
 * 货船智能机舱管理系统报表功能状态管理
 * 
 * 功能描述:
 * - 报表列表状态管理
 * - 报表生成状态跟踪
 * - 报表统计信息管理
 * - 错误处理和加载状态
 * 
 * @author 前端开发团队
 * @version 1.0.0
 * @since 2025-11-20
 */

import { create } from 'zustand';
import { ReportsService, Report, ReportConfig, ReportStatistics, ReportsQueryParams, ReportListResponse } from '../services/reports-service';
import { handleApiError } from '../utils/error-handler';
import { ApiError } from '../services/api-client';

interface ReportsState {
  // 基础状态
  reports: Report[];
  statistics: ReportStatistics | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  
  // 分页信息
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // 当前查询参数
  queryParams: ReportsQueryParams;
  
  // 选中的报表
  selectedReports: string[];
  
  // 生成进度跟踪
  generationProgress: Record<string, number>;
  
  // 动作方法
  fetchReports: (params?: ReportsQueryParams) => Promise<void>;
  generateReport: (config: ReportConfig) => Promise<Report | null>;
  downloadReport: (reportId: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  deleteSelectedReports: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  
  // 工具方法
  setQueryParams: (params: Partial<ReportsQueryParams>) => void;
  toggleReportSelection: (reportId: string) => void;
  selectAllReports: () => void;
  clearSelection: () => void;
  clearError: () => void;
  resetStore: () => void;
  trackGenerationProgress: (reportId: string) => void;
}

/**
 * 默认查询参数
 */
const defaultQueryParams: ReportsQueryParams = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

/**
 * 报表状态管理Store实现
 * 
 * 提供完整的报表功能状态管理，包括：
 * - 数据获取和管理
 * - 生成进度跟踪
 * - 错误处理
 * - 用户交互状态
 */
export const useReportsStore = create<ReportsState>((set, get) => ({
  // 初始状态
  reports: [],
  statistics: null,
  loading: false,
  generating: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  queryParams: defaultQueryParams,
  selectedReports: [],
  generationProgress: {},

  /**
   * 获取报表列表
   * 
   * @param params 可选的查询参数
   */
  fetchReports: async (params = {}) => {
    try {
      set({ loading: true, error: null });
      
      const currentParams = { ...get().queryParams, ...params };
      set({ queryParams: currentParams });
      
      const response: ReportListResponse = await ReportsService.getReportsList(currentParams);
      
      set({
        reports: response.reports,
        pagination: response.pagination,
        loading: false
      });
      
      // 自动刷新统计信息
      get().refreshStatistics();
      
    } catch (error) {
      handleApiError(error, '获取报表列表', {
        showToast: true,
        logToConsole: true
      });
      
      set({
        error: error instanceof Error ? error.message : '获取报表列表失败',
        loading: false
      });
    }
  },

  /**
   * 生成新报表
   * 
   * @param config 报表配置
   * @returns Promise<Report | null>
   */
  generateReport: async (config: ReportConfig): Promise<Report | null> => {
    try {
      set({ generating: true, error: null });
      
      // 生成报表
      const report = await ReportsService.generateReport(config);
      
      // 添加到报表列表开头
      set(state => ({
        reports: [report, ...state.reports],
        generating: false
      }));
      
      // 启动进度跟踪
      (function trackProgress(reportId: string) {
        const updateProgress = async () => {
          try {
            const updatedReport = await ReportsService.getReportDetails(reportId);
            
            // 更新报表列表中的进度
            set(state => ({
              reports: state.reports.map(r =>
                r.id === reportId ? updatedReport : r
              ),
              generationProgress: {
                ...state.generationProgress,
                [reportId]: updatedReport.progress || 0
              }
            }));
            
            // 如果生成完成，从进度跟踪中移除
            if (updatedReport.status === 'COMPLETED' || updatedReport.status === 'FAILED') {
              set(state => {
                const newProgress = { ...state.generationProgress };
                delete newProgress[reportId];
                return { generationProgress: newProgress };
              });
              return;
            }
            
            // 继续跟踪进度
            if (updatedReport.status === 'GENERATING') {
              setTimeout(() => trackProgress(reportId), 2000);
            }
            
          } catch (error) {
            console.warn('获取报表进度失败:', error);
            // 生成进度获取失败时停止跟踪
            set(state => {
              const newProgress = { ...state.generationProgress };
              delete newProgress[reportId];
              return { generationProgress: newProgress };
            });
          }
        };
        
        setTimeout(updateProgress, 1000);
      })(report.id);
      
      return report;
      
    } catch (error) {
      handleApiError(error, '生成报表', {
        showToast: true,
        logToConsole: true
      });
      
      set({
        error: error instanceof Error ? error.message : '报表生成失败',
        generating: false
      });
      
      return null;
    }
  },

  /**
   * 下载报表文件
   * 
   * @param reportId 报表ID
   */
  downloadReport: async (reportId: string) => {
    try {
      set({ error: null });
      
      const blob = await ReportsService.downloadReport(reportId);
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 从报表列表中获取报表信息来设置文件名
      const report = get().reports.find(r => r.id === reportId);
      const filename = report ? `${report.name}.${report.config.exportFormat.toLowerCase()}` : 'report.pdf';
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      URL.revokeObjectURL(url);
      
    } catch (error) {
      handleApiError(error, '下载报表', {
        showToast: true,
        logToConsole: true
      });
      
      set({
        error: error instanceof Error ? error.message : '下载报表失败'
      });
    }
  },

  /**
   * 删除单个报表
   * 
   * @param reportId 报表ID
   */
  deleteReport: async (reportId: string) => {
    try {
      set({ error: null });
      
      await ReportsService.deleteReport(reportId);
      
      // 从列表中移除
      set(state => ({
        reports: state.reports.filter(r => r.id !== reportId),
        selectedReports: state.selectedReports.filter(id => id !== reportId)
      }));
      
    } catch (error) {
      handleApiError(error, '删除报表', {
        showToast: true,
        logToConsole: true
      });
      
      set({
        error: error instanceof Error ? error.message : '删除报表失败'
      });
    }
  },

  /**
   * 批量删除选中的报表
   */
  deleteSelectedReports: async () => {
    const { selectedReports } = get();
    
    if (selectedReports.length === 0) {
      set({ error: '请先选择要删除的报表' });
      return;
    }
    
    try {
      set({ error: null });
      
      const result = await ReportsService.batchDeleteReports(selectedReports);
      
      // 移除成功删除的报表
      set(state => ({
        reports: state.reports.filter(r => !result.deletedCount || !selectedReports.includes(r.id)),
        selectedReports: []
      }));
      
      // 显示删除结果
      if (result.failedIds.length > 0) {
        set({ 
          error: `删除完成，但有 ${result.failedIds.length} 个报表删除失败` 
        });
      }
      
      // 刷新列表
      get().fetchReports();
      
    } catch (error) {
      handleApiError(error, '批量删除报表', {
        showToast: true,
        logToConsole: true
      });
      
      set({
        error: error instanceof Error ? error.message : '批量删除失败'
      });
    }
  },

  /**
   * 刷新统计信息
   */
  refreshStatistics: async () => {
    try {
      const statistics = await ReportsService.getStatistics();
      set({ statistics });
    } catch (error) {
      console.warn('获取统计信息失败:', error);
      // 统计信息失败不影响主要功能
    }
  },

  /**
   * 设置查询参数
   * 
   * @param params 新的查询参数
   */
  setQueryParams: (params: Partial<ReportsQueryParams>) => {
    const newParams = { ...get().queryParams, ...params };
    set({ queryParams: newParams });
    
    // 自动重新获取数据（如果参数发生变化）
    if (params.page !== undefined || params.limit !== undefined) {
      get().fetchReports(newParams);
    }
  },

  /**
   * 切换报表选择状态
   * 
   * @param reportId 报表ID
   */
  toggleReportSelection: (reportId: string) => {
    set(state => ({
      selectedReports: state.selectedReports.includes(reportId)
        ? state.selectedReports.filter(id => id !== reportId)
        : [...state.selectedReports, reportId]
    }));
  },

  /**
   * 全选所有报表
   */
  selectAllReports: () => {
    const { reports } = get();
    set({ selectedReports: reports.map(r => r.id) });
  },

  /**
   * 清除选择
   */
  clearSelection: () => {
    set({ selectedReports: [] });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 重置Store到初始状态
   */
  resetStore: () => {
    set({
      reports: [],
      statistics: null,
      loading: false,
      generating: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      },
      queryParams: defaultQueryParams,
      selectedReports: [],
      generationProgress: {}
    });
  },

  /**
   * 跟踪报表生成进度
   *
   * @param reportId 报表ID
   */
  trackGenerationProgress: (reportId: string) => {
    // 进度跟踪逻辑已在generateReport中实现
    console.info(`开始跟踪报表生成进度: ${reportId}`);
  }
}));

// 导出便捷选择器
export const useReportsSelector = {
  // 基本状态
  reports: (state: ReportsState) => state.reports,
  statistics: (state: ReportsState) => state.statistics,
  loading: (state: ReportsState) => state.loading,
  generating: (state: ReportsState) => state.generating,
  error: (state: ReportsState) => state.error,
  pagination: (state: ReportsState) => state.pagination,
  
  // 选择状态
  selectedReports: (state: ReportsState) => state.selectedReports,
  selectedCount: (state: ReportsState) => state.selectedReports.length,
  generationProgress: (state: ReportsState) => state.generationProgress,
  
  // 过滤后的报表
  completedReports: (state: ReportsState) => state.reports.filter(r => r.status === 'COMPLETED'),
  generatingReports: (state: ReportsState) => state.reports.filter(r => r.status === 'GENERATING'),
  failedReports: (state: ReportsState) => state.reports.filter(r => r.status === 'FAILED'),
  
  // 统计信息
  totalReports: (state: ReportsState) => state.statistics?.totalReports || 0,
  completedCount: (state: ReportsState) => state.statistics?.completedReports || 0,
  failedCount: (state: ReportsState) => state.statistics?.failedReports || 0
};

export default useReportsStore;