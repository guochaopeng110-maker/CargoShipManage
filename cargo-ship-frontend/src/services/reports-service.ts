/**
 * 报表生成服务
 * 货船智能机舱管理系统报表API客户端
 * 
 * 功能描述:
 * - 报表生成请求
 * - 报表列表查询
 * - 报表文件下载
 * - 批量操作管理
 * 
 * @author 前端开发团队
 * @version 1.0.0
 * @since 2025-11-20
 */

import { ApiClient, ApiResponse } from './api-client';
import { handleApiError } from '../utils/error-handler';

// 报表相关类型定义
export interface ReportConfig {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  exportFormat: ExportFormat;
  equipmentIds?: string[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  language?: 'zh-CN' | 'en-US';
}

export type ReportType =
  | 'DAILY_OPERATION'     // 日常运行报表
  | 'MONTHLY_OPERATION'   // 月度运行报表
  | 'EQUIPMENT_HEALTH'    // 设备健康评估报表
  | 'FAILURE_STATISTICS'  // 故障统计报表
  | 'ENERGY_EFFICIENCY';  // 能效分析报表

export type ExportFormat = 'PDF' | 'EXCEL';

export type ReportStatus =
  | 'PENDING'      // 待生成
  | 'GENERATING'   // 生成中
  | 'COMPLETED'    // 已完成
  | 'FAILED'       // 生成失败
  | 'EXPIRED';     // 已过期

export interface Report {
  id: string;
  name: string;
  reportType: ReportType;
  status: ReportStatus;
  fileUrl?: string;
  fileSize?: number;
  config: ReportConfig;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  progress?: number;
  errorMessage?: string;
}

export interface ReportStatistics {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  generatingReports: number;
  byType: Record<ReportType, number>;
}

export interface ReportListResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: ReportStatistics;
}

export interface ReportsQueryParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  reportType?: ReportType;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'completedAt' | 'name' | 'reportType';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 报表服务类
 *
 * 提供报表生成、查询、下载和管理的完整API接口
 * 遵循RESTful API设计原则，支持完整的错误处理和数据验证
 */
export class ReportsService {
  private static apiClient = new ApiClient({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  });
  private static baseUrl = '/reports';

  /**
   * 生成新报表
   *
   * @param config 报表配置参数
   * @returns Promise<Report> 返回生成的报表信息
   * @throws ApiError 当生成请求失败时抛出异常
   */
  static async generateReport(config: ReportConfig): Promise<Report> {
    try {
      // 验证输入参数
      this.validateReportConfig(config);
      
      const response = await this.apiClient.post<Report>(
        `${this.baseUrl}/generate`,
        config
      );

      // 数据转换和验证
      const report = this.transformReportResponse(response.data);
      
      console.info(`报表生成请求已提交: ${config.reportType}`, { reportId: report.id });
      
      return report;
    } catch (error) {
      handleApiError(error, '生成报表', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 获取报表列表
   * 
   * @param params 查询参数
   * @returns Promise<ReportListResponse> 返回报表列表和分页信息
   * @throws ApiError 当查询请求失败时抛出异常
   */
  static async getReportsList(params: ReportsQueryParams = {}): Promise<ReportListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      // 处理查询参数
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const response = await this.apiClient.get<ReportListResponse>(
        `${this.baseUrl}?${queryParams.toString()}`
      );

      // 数据转换
      const transformedResponse = this.transformReportsListResponse(response.data);
      
      console.info('报表列表获取成功', {
        count: transformedResponse.reports.length,
        total: transformedResponse.pagination.total
      });
      
      return transformedResponse;
    } catch (error) {
      handleApiError(error, '获取报表列表', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 获取报表详情
   * 
   * @param reportId 报表ID
   * @returns Promise<Report> 返回报表详细信息
   * @throws ApiError 当查询请求失败时抛出异常
   */
  static async getReportDetails(reportId: string): Promise<Report> {
    try {
      if (!reportId) {
        throw new Error('报表ID不能为空');
      }

      const response = await this.apiClient.get<Report>(
        `${this.baseUrl}/${reportId}`
      );

      const report = this.transformReportResponse(response.data);
      
      console.info(`报表详情获取成功: ${reportId}`, { reportType: report.reportType });
      
      return report;
    } catch (error) {
      handleApiError(error, '获取报表详情', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 下载报表文件
   * 
   * @param reportId 报表ID
   * @returns Promise<Blob> 返回报表文件数据
   * @throws ApiError 当下载请求失败时抛出异常
   */
  static async downloadReport(reportId: string): Promise<Blob> {
    try {
      if (!reportId) {
        throw new Error('报表ID不能为空');
      }

      // 使用fetch获取二进制数据
      const token = localStorage.getItem('authToken');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      const response = await fetch(
        `${baseURL}${this.baseUrl}/${reportId}/download`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`);
      }

      const blob = await response.blob();
      
      console.info(`报表文件下载成功: ${reportId}`, { 
        size: blob.size,
        type: blob.type 
      });
      
      return blob;
    } catch (error) {
      handleApiError(error, '下载报表', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 删除报表
   * 
   * @param reportId 报表ID
   * @returns Promise<void>
   * @throws ApiError 当删除请求失败时抛出异常
   */
  static async deleteReport(reportId: string): Promise<void> {
    try {
      if (!reportId) {
        throw new Error('报表ID不能为空');
      }

      await this.apiClient.delete(`${this.baseUrl}/${reportId}`);
      
      console.info(`报表删除成功: ${reportId}`);
    } catch (error) {
      handleApiError(error, '删除报表', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 获取报表统计信息
   * 
   * @returns Promise<ReportStatistics> 返回统计信息
   * @throws ApiError 当查询请求失败时抛出异常
   */
  static async getStatistics(): Promise<ReportStatistics> {
    try {
      const response = await this.apiClient.get<ReportStatistics>(
        `${this.baseUrl}/statistics`
      );

      console.info('报表统计信息获取成功', response.data);
      
      return response.data;
    } catch (error) {
      handleApiError(error, '获取报表统计', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 批量删除报表
   * 
   * @param reportIds 报表ID数组
   * @returns Promise<{ deletedCount: number; failedIds: string[] }>
   * @throws ApiError 当删除请求失败时抛出异常
   */
  static async batchDeleteReports(reportIds: string[]): Promise<{
    deletedCount: number;
    failedIds: string[]
  }> {
    try {
      if (!Array.isArray(reportIds) || reportIds.length === 0) {
        throw new Error('报表ID列表不能为空');
      }

      if (reportIds.length > 50) {
        throw new Error('批量删除的报表数量不能超过50个');
      }

      const response = await this.apiClient.post<{
        deletedCount: number;
        failedIds: string[];
      }>(`${this.baseUrl}/batch-delete`, { reportIds });

      console.info('批量删除报表完成', {
        total: reportIds.length,
        deleted: response.data.deletedCount,
        failed: response.data.failedIds.length
      });

      return response.data;
    } catch (error) {
      handleApiError(error, '批量删除报表', {
        showToast: true,
        logToConsole: true
      });
      throw error;
    }
  }

  /**
   * 验证报表配置参数
   * 
   * @param config 报表配置
   * @private
   */
  private static validateReportConfig(config: ReportConfig): void {
    if (!config) {
      throw new Error('报表配置不能为空');
    }

    if (!config.reportType) {
      throw new Error('报表类型不能为空');
    }

    if (!config.startDate) {
      throw new Error('开始日期不能为空');
    }

    if (!config.endDate) {
      throw new Error('结束日期不能为空');
    }

    if (!config.exportFormat) {
      throw new Error('导出格式不能为空');
    }

    // 验证日期范围
    const startDate = new Date(config.startDate);
    const endDate = new Date(config.endDate);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('日期格式不正确');
    }

    if (startDate >= endDate) {
      throw new Error('开始日期必须早于结束日期');
    }

    // 验证日期范围不能超过一年
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > oneYear) {
      throw new Error('报表日期范围不能超过一年');
    }

    // 验证设备ID数组
    if (config.equipmentIds && !Array.isArray(config.equipmentIds)) {
      throw new Error('设备ID必须为数组格式');
    }
  }

  /**
   * 获取报表类型的中文显示名称
   * 
   * @param type 报表类型
   * @returns string
   */
  static getReportTypeDisplayName(type: ReportType): string {
    const typeMap: Record<ReportType, string> = {
      'DAILY_OPERATION': '日常运行报表',
      'MONTHLY_OPERATION': '月度运行报表',
      'EQUIPMENT_HEALTH': '设备健康评估报表',
      'FAILURE_STATISTICS': '故障统计报表',
      'ENERGY_EFFICIENCY': '能效分析报表',
    };
    
    return typeMap[type] || type;
  }

  /**
   * 获取报表状态的中文显示名称和样式
   * 
   * @param status 报表状态
   * @returns { name: string, className: string }
   */
  static getReportStatusInfo(status: ReportStatus): { 
    name: string; 
    className: string; 
    icon?: string;
  } {
    const statusMap: Record<ReportStatus, { name: string; className: string; icon?: string }> = {
      'PENDING': { name: '待生成', className: 'bg-gray-500 text-white', icon: 'Clock' },
      'GENERATING': { name: '生成中', className: 'bg-blue-500 text-white', icon: 'Loader2' },
      'COMPLETED': { name: '已完成', className: 'bg-green-500 text-white', icon: 'CheckCircle' },
      'FAILED': { name: '生成失败', className: 'bg-red-500 text-white', icon: 'XCircle' },
      'EXPIRED': { name: '已过期', className: 'bg-gray-400 text-white', icon: 'AlertCircle' },
    };
    
    return statusMap[status] || { name: status, className: 'bg-gray-500 text-white' };
  }

  /**
   * 报表响应数据转换
   *
   * @param data 后端响应数据
   * @returns Report
   * @private
   */
  private static transformReportResponse(data: any): Report {
    return {
      id: data.id,
      name: data.name,
      reportType: data.reportType,
      status: data.status,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize,
      config: data.config,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
      expiresAt: data.expiresAt,
      progress: data.progress,
      errorMessage: data.errorMessage
    };
  }

  /**
   * 报表列表响应数据转换
   *
   * @param data 后端响应数据
   * @returns ReportListResponse
   * @private
   */
  private static transformReportsListResponse(data: any): ReportListResponse {
    return {
      reports: data.reports?.map((report: any) => this.transformReportResponse(report)) || [],
      pagination: data.pagination,
      statistics: data.statistics
    };
  }
}

export default ReportsService;