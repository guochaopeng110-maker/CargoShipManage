/**
 * 货船智能机舱管理系统 - 健康评估服务
 * 
 * 核心功能：
 * 1. 健康评估报告生成和管理
 * 2. 设备健康状况评估和评分
 * 3. 预测性健康分析和预警
 * 4. 健康报告导出和分发
 * 5. 健康趋势分析和监控
 * 
 * 技术架构：
 * - 基于RESTful API的服务架构
 * - 智能健康评估算法
 * - 预测性分析模型
 * - 多格式报告导出支持
 * - 分页查询和筛选优化
 * 
 * 服务特性：
 * - 自动化健康报告生成
 * - 实时健康评分计算
 * - 机器学习预测分析
 * - 多格式导出（PDF、Excel、JSON等）
 * - 自定义报告模板支持
 * 
 * 健康评估维度：
 * - 设备运行状态分析
 * - 性能指标评估
 * - 维护历史分析
 * - 故障预测模型
 * - 能效优化建议
 * 
 * API 契约映射：
 * - GET /health/equipment/{id} -> getEquipmentHealth()
 * - POST /health/generate -> generateReport()
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 * @since 2024
 */

// API客户端导入
import { apiClient } from './api-client';

// 类型定义导入
import {
  HealthReport,                    // 健康报告实体
  HealthReportFilters,             // 健康报告筛选条件
  ReportFormat,                    // 报告格式类型
  HealthScoreCalculation,          // 健康评分计算结果
  HealthRecommendation,            // 健康建议
  PredictiveHealthAnalysis,        // 预测性健康分析
} from '../types/health';

/**
 * 健康评估服务类
 * 
 * 负责处理设备健康评估、报告生成、预测分析等健康管理业务逻辑
 * 基于 API 契约 health.yml v2.0.0 实现
 * 
 * 主要功能：
 * - 自动化健康报告生成
 * - 实时健康状况监控
 * - 预测性故障分析
 * - 健康评分计算
 * - 报告导出和分享
 * 
 * 健康评估流程：
 * 1. 数据采集和预处理
 * 2. 健康指标计算
 * 3. 评分算法应用
 * 4. 预测模型分析
 * 5. 报告生成和导出
 * 
 * @class HealthService
 */
export class HealthService {
  /**
   * 获取设备健康报告（与 API 契约 health.yml GET /health/equipment/{id} 对应）
   * 
   * 根据设备ID获取指定设备的健康评估报告
   * 支持按报告类型和时间范围筛选
   * 
   * @param {string} equipmentId - 设备ID（必填）
   * @param {Object} options - 查询选项（可选）
   * @param {string} options.reportType - 报告类型：DAILY|WEEKLY|MONTHLY|ON_DEMAND
   * @param {string} options.startDate - 开始日期 (YYYY-MM-DD格式)
   * @param {string} options.endDate - 结束日期 (YYYY-MM-DD格式)
   * @returns {Promise<HealthReport>} 健康评估报告对象
   * @throws {Error} 获取报告失败或设备不存在
   */
  async getEquipmentHealth(
    equipmentId: string,  // 设备ID
    options: {            // 查询选项（可选）
      reportType?: string;           // 报告类型
      startDate?: string;            // 开始日期
      endDate?: string;              // 结束日期
    } = {}
  ): Promise<HealthReport> {
    try {
      // 构建查询参数
      const params: Record<string, string> = {};
      if (options.reportType) params.reportType = options.reportType;
      if (options.startDate) params.startDate = options.startDate;
      if (options.endDate) params.endDate = options.endDate;

      // 发送GET请求到 /health/equipment/{id} 端点
      const response = await apiClient.get<HealthReport>(
        `/health/equipment/${equipmentId}`,
        { params }
      );
      return response.data; // 返回健康报告
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 生成健康评估报告（与 API 契约 health.yml POST /health/generate 对应）
   * 
   * 基于指定的设备和时间段生成综合性健康评估报告
   * 包含健康评分、故障预测、维护建议等内容
   * 
   * @param {Object} request - 报告生成请求参数
   * @param {string} request.equipmentId - 设备ID（必填）
   * @param {string} request.reportType - 报告类型：DAILY|WEEKLY|MONTHLY|ON_DEMAND（必填）
   * @param {string} request.startDate - 开始日期（可选）
   * @param {string} request.endDate - 结束日期（可选）
   * @returns {Promise<{reportId: string, status: string, estimatedTime: number}>} 报告生成请求结果
   * @throws {Error} 报告生成失败或数据不足
   */
  async generateReport(request: {
    equipmentId: string;     // 设备ID（必填）
    reportType: string;      // 报告类型（必填）
    startDate?: string;      // 开始日期（可选）
    endDate?: string;        // 结束日期（可选）
  }): Promise<{
    reportId: string;        // 报告ID
    status: string;          // 状态
    estimatedTime: number;   // 预计时间（毫秒）
  }> {
    try {
      // 发送POST请求到 /health/generate 端点
      const response = await apiClient.post('/health/generate', request);
      return response.data; // 返回报告生成结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 获取健康报告列表
   * 
   * 分页获取历史健康评估报告，支持筛选和排序
   * 用于查看和管理历史报告记录
   * 
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码（从1开始）
   * @param {number} params.pageSize - 每页数量（默认20）
   * @param {HealthReportFilters} params.filters - 筛选条件（可选）
   * @returns {Promise<{items: HealthReport[], total: number, page: number, pageSize: number}>} 报告列表和分页信息
   * @throws {Error} 获取报告列表失败
   */
  async getReports(params: {
    page?: number;           // 页码（从1开始）
    pageSize?: number;       // 每页数量（默认20）
    filters?: HealthReportFilters; // 筛选条件（可选）
  } = {}): Promise<{
    items: HealthReport[];   // 报告项目列表
    total: number;           // 总记录数
    page: number;            // 当前页码
    pageSize: number;        // 每页大小
  }> {
    try {
      // 发送GET请求到健康报告列表端点
      const response = await apiClient.get('/health/reports', { params });
      return response.data; // 返回报告列表和分页信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 获取健康报告详情
   * 
   * 根据报告ID获取单个健康评估报告的完整详情
   * 包含详细的分析结果、评分和建议
   * 
   * @param {string} reportId - 健康报告ID
   * @returns {Promise<HealthReport>} 健康报告详情对象
   * @throws {Error} 报告不存在或获取失败
   */
  async getReport(reportId: string): Promise<HealthReport> {
    try {
      // 发送GET请求到健康报告详情端点
      const response = await apiClient.get<HealthReport>(`/health/reports/${reportId}`);
      return response.data; // 返回健康报告详情
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 导出健康报告
   * 
   * 将指定格式的健康报告导出为文件下载
   * 支持多种格式和自定义导出选项
   * 
   * @param {string} reportId - 要导出的报告ID
   * @param {ReportFormat} format - 导出格式（PDF、Excel、JSON等）
   * @param {Object} options - 导出选项（可选）
   * @param {boolean} options.includeCharts - 是否包含图表（可选）
   * @param {boolean} options.includeRecommendations - 是否包含建议（可选）
   * @returns {Promise<{downloadUrl: string, expiresAt: number}>} 下载URL和过期时间
   * @throws {Error} 导出失败或格式不支持
   */
  async exportReport(
    reportId: string,                    // 报告ID
    format: ReportFormat,                // 导出格式
    options?: {                          // 导出选项（可选）
      includeCharts?: boolean;           // 是否包含图表
      includeRecommendations?: boolean;  // 是否包含建议
    }
  ): Promise<{ 
    downloadUrl: string;  // 下载URL
    expiresAt: number;    // 过期时间戳
  }> {
    try {
      // 发送POST请求到健康报告导出端点
      const response = await apiClient.post('/health/export', {
        reportId,           // 报告ID
        format,            // 导出格式
        options,           // 导出选项
      });
      return response.data; // 返回下载链接和过期时间
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 获取设备健康评分
   * 
   * 计算指定设备的实时健康评分
   * 基于设备运行数据、维护历史、故障记录等多个维度
   * 
   * @param {string} equipmentId - 设备ID
   * @returns {Promise<HealthScoreCalculation>} 设备健康评分计算结果
   * @throws {Error} 设备不存在或数据不足
   */
  async getEquipmentHealthScore(equipmentId: string): Promise<HealthScoreCalculation> {
    try {
      // 发送GET请求到设备健康评分端点
      const response = await apiClient.get<HealthScoreCalculation>(`/health/equipment/${equipmentId}/score`);
      return response.data; // 返回健康评分计算结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 获取预测性健康分析
   * 
   * 基于历史数据和机器学习模型预测设备未来健康状况
   * 提供故障预警和优化建议
   * 
   * @param {string} equipmentId - 设备ID
   * @param {number} horizonDays - 预测时间范围（天数）
   * @returns {Promise<PredictiveHealthAnalysis>} 预测性健康分析结果
   * @throws {Error} 预测分析失败或数据不足
   */
  async getPredictiveHealthAnalysis(
    equipmentId: string,   // 设备ID
    horizonDays: number    // 预测时间范围（天数）
  ): Promise<PredictiveHealthAnalysis> {
    try {
      // 发送GET请求到预测性健康分析端点
      const response = await apiClient.get<PredictiveHealthAnalysis>(
        `/health/equipment/${equipmentId}/predictive`,
        { params: { horizonDays } } // 传递预测时间范围
      );
      return response.data; // 返回预测分析结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeHealthError(error);
    }
  }

  /**
   * 标准化健康评估错误
   * 
   * 将各种错误类型标准化为统一的错误对象
   * 
   * @param {any} error - 原始错误对象
   * @returns {Error} 标准化后的错误对象
   * @private
   */
  private normalizeHealthError(error: any): Error {
    // 如果是API错误，包含错误码和消息
    if (error.code) {
      return new Error(`健康评估服务错误: ${error.message}`);
    }
    // 否则返回通用错误消息
    return new Error(error.message || '健康评估服务调用失败');
  }
}

// 创建健康评估服务实例（单例模式）
export const healthService = new HealthService();

// 导出便捷方法（解构导出，方便直接调用）
export const {
  getEquipmentHealth,              // 获取设备健康报告
  generateReport,                  // 生成健康评估报告
  getReports,                      // 获取健康报告列表
  getReport,                       // 获取健康报告详情
  exportReport,                    // 导出健康报告
  getEquipmentHealthScore,         // 获取设备健康评分
  getPredictiveHealthAnalysis,     // 获取预测性健康分析
} = healthService;

/**
 * 使用示例：
 * 
 * ```typescript
 * import { healthService } from './services/health-service';
 * 
 * // 获取设备健康报告
 * const report = await healthService.getEquipmentHealth('pump-001', {
 *   reportType: 'DAILY',
 *   startDate: '2025-11-01',
 *   endDate: '2025-11-20'
 * });
 * 
 * // 生成健康评估报告
 * const result = await healthService.generateReport({
 *   equipmentId: 'pump-001',
 *   reportType: 'WEEKLY',
 *   startDate: '2025-11-01',
 *   endDate: '2025-11-07'
 * });
 * console.log(`报告ID: ${result.reportId}, 预计时间: ${result.estimatedTime}ms`);
 * 
 * // 获取健康报告列表
 * const { items } = await healthService.getReports({
 *   page: 1,
 *   pageSize: 10,
 *   filters: { reportType: 'DAILY' }
 * });
 * 
 * // 获取设备健康评分
 * const score = await healthService.getEquipmentHealthScore('pump-001');
 * console.log(`设备健康评分: ${score.overallScore}/100`);
 * 
 * // 获取预测性分析
 * const prediction = await healthService.getPredictiveHealthAnalysis('motor-002', 30);
 * console.log(`30天后健康状况预测: ${prediction.predictedScore}`);
 * 
 * // 导出健康报告
 * const exportResult = await healthService.exportReport(
 *   'report-123',
 *   'pdf',
 *   { includeCharts: true, includeRecommendations: true }
 * );
 * 
 * // 下载报告文件
 * window.open(exportResult.downloadUrl);
 * ```
 */