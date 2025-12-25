/**
 * 货船智能机舱管理系统 - 报表状态管理（重构版 + 健康评分合并）
 *
 * 职责：
 * 1. 管理健康报告的全局状态
 * 2. 管理系统健康评分（5个核心系统）（合并自 health-store）
 * 3. 处理报告生成和查询操作
 * 4. 管理筛选、排序和分页状态
 * 5. 直接调用后端 API（移除 Service 层包装）
 *
 * 架构：
 * - State: 纯数据状态 (reports, systemHealthScores, statistics, loading...)
 * - Actions: 业务逻辑 (fetchReports, fetchSystemHealthScores, generateReport...)
 *
 * 重构原则：
 * - 代码简化：删除冗余的 API 包装层
 * - 类型统一：后端类型直接从 OpenAPI 生成
 * - 职责清晰：Store 直接调用后端 API
 * - 维护性提升：后端 API 变更时，自动同步
 * - 功能合并：将 health-store 功能合并进来，避免状态分散
 *
 * @module stores/reports-store
 */

import { create } from 'zustand';
import { toast } from 'sonner';
import { Service } from '../services/api/services/Service';

// 从后端 API 客户端导入基础类型
import type { GenerateHealthReportDto, HealthReport } from '../services/api';

// ==================== 前端业务逻辑类型定义 ====================

/**
 * 健康状态枚举（前端扩展）（从 health-store 合并）
 *
 * 用于前端显示的健康状态等级
 * 注意：后端使用 HealthReport.healthLevel (excellent/good/fair/poor)
 */
export enum HealthStatus {
  EXCELLENT = 'EXCELLENT',   // 优秀：健康评分 >= 90
  GOOD = 'GOOD',             // 良好：健康评分 >= 80
  FAIR = 'FAIR',             // 一般：健康评分 >= 70
  POOR = 'POOR',             // 较差：健康评分 >= 60
  CRITICAL = 'CRITICAL'      // 严重：健康评分 < 60
}

/**
 * 趋势方向枚举（前端扩展）（从 health-store 合并）
 *
 * 用于显示健康指标的变化趋势
 */
export enum TrendDirection {
  IMPROVING = 'IMPROVING',   // 改善趋势：指标值向好的方向发展
  STABLE = 'STABLE',         // 稳定趋势：指标值相对稳定
  DECLINING = 'DECLINING'    // 下降趋势：指标值向坏的方向发展
}

/**
 * 健康趋势数据点（从 health-store 合并）
 *
 * 用于 Sparkline 趋势图的单个数据点
 */
export interface HealthTrendDataPoint {
  timestamp: number;         // 时间戳（毫秒）
  score: number;             // 健康评分（0-100）
  label?: string;            // 数据点标签（可选）
}

/**
 * 系统健康评分（从 health-store 合并）
 *
 * 用于系统健康卡片的数据结构，包含评分、趋势和告警信息
 */
export interface SystemHealthScore {
  deviceId: string;                          // 设备/系统 ID
  systemName: string;                        // 系统名称（中文）
  score: number;                             // 健康评分（0-100）
  grade: HealthStatus;                       // 健康等级
  trend: TrendDirection;                     // 趋势方向
  trendData: HealthTrendDataPoint[];        // 近期趋势数据点数组
  lastUpdated: number;                       // 最后更新时间戳（毫秒）
  reportId?: string;                         // 关联的健康报告 ID（可选）
}

/**
 * 报表类型枚举（前端扩展）
 *
 * 用于前端业务逻辑，映射到后端的 reportType
 */
export type ReportType =
  | 'DAILY_OPERATION'     // 日常运行报表（映射到 single）
  | 'MONTHLY_OPERATION'   // 月度运行报表（映射到 aggregate）
  | 'EQUIPMENT_HEALTH'    // 设备健康评估报表（映射到 single）
  | 'FAILURE_STATISTICS'  // 故障统计报表（映射到 aggregate）
  | 'ENERGY_EFFICIENCY';  // 能效分析报表（映射到 aggregate）

/**
 * 导出格式枚举（前端扩展）
 */
export type ExportFormat = 'PDF' | 'EXCEL';

/**
 * 报表状态枚举（前端扩展）
 *
 * 基于后端健康报告的状态，扩展前端业务状态
 */
export type ReportStatus =
  | 'PENDING'      // 待生成
  | 'GENERATING'   // 生成中
  | 'COMPLETED'    // 已完成
  | 'FAILED'       // 生成失败
  | 'EXPIRED';     // 已过期

/**
 * 前端报表配置
 *
 * 用于创建报表时的配置参数
 */
export interface ReportConfig {
  reportType: ReportType;                      // 报表类型
  startDate: string;                           // 开始日期（ISO 字符串）
  endDate: string;                             // 结束日期（ISO 字符串）
  exportFormat: ExportFormat;                  // 导出格式
  equipmentIds?: string[];                     // 设备ID列表
  includeCharts?: boolean;                     // 是否包含图表
  includeRawData?: boolean;                    // 是否包含原始数据
  language?: 'zh-CN' | 'en-US';                // 语言
}

/**
 * 前端报表对象
 *
 * 扩展后端 HealthReport，添加前端显示字段
 */
export interface Report extends HealthReport {
  // 前端扩展字段
  name?: string;                               // 报表名称（前端生成）
  status?: ReportStatus;                       // 报表状态（前端映射）
  fileUrl?: string;                            // 文件下载URL
  fileSize?: number;                           // 文件大小
  config?: ReportConfig;                       // 报表配置
  progress?: number;                           // 生成进度
  errorMessage?: string;                       // 错误信息
  completedAt?: string;                        // 完成时间
  expiresAt?: string;                          // 过期时间
}

/**
 * 报表统计信息（前端特有）
 */
export interface ReportStatistics {
  totalReports: number;                        // 总报表数
  completedReports: number;                    // 已完成数
  failedReports: number;                       // 失败数
  generatingReports: number;                   // 生成中数
  byType: Record<ReportType, number>;          // 按类型统计
}

/**
 * 报表列表响应（前端特有）
 */
export interface ReportListResponse {
  reports: Report[];                           // 报表列表
  pagination: {                                // 分页信息
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: ReportStatistics;                // 统计信息
}

/**
 * 报表查询参数（前端特有）
 */
export interface ReportsQueryParams {
  page?: number;                               // 页码
  limit?: number;                              // 每页数量
  status?: ReportStatus;                       // 状态筛选
  reportType?: ReportType;                     // 类型筛选
  equipmentId?: string;                        // 设备ID筛选 (新增)
  name?: string;                               // 设备名称/搜索词筛选 (新增)
  startDate?: string;                          // 开始日期
  endDate?: string;                            // 结束日期
  sortBy?: 'createdAt' | 'completedAt' | 'name' | 'reportType';  // 排序字段
  sortOrder?: 'asc' | 'desc';                  // 排序方向
}

// ==================== 工具函数 ====================

/**
 * 获取报表类型的中文显示名称
 *
 * @param type 报表类型
 * @returns 中文名称
 */
function getReportTypeDisplayName(type: ReportType): string {
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
 * @returns 显示信息
 */
function getReportStatusInfo(status: ReportStatus): {
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

// ==================== State 和 Actions 接口 ====================

/**
 * 报表状态接口
 *
 * 定义报表管理的所有数据状态
 */
export interface ReportsState {
  // 核心数据
  /** 报表列表 */
  reports: Report[];

  /** 报表统计信息 */
  statistics: ReportStatistics | null;

  // === 系统健康评分状态（合并自 health-store） ===
  /** 系统健康评分（按 deviceId 索引） */
  systemHealthScores: Record<string, SystemHealthScore>;

  /** 健康评分加载状态 */
  scoresLoading: boolean;

  // 状态管理
  /** 是否正在加载数据 */
  loading: boolean;

  /** 是否正在生成报表 */
  generating: boolean;

  /** 错误信息 */
  error: string | null;

  // 分页信息
  /** 分页配置 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页大小 */
    limit: number;
    /** 总记录数 */
    total: number;
    /** 总页数 */
    totalPages: number;
  };

  // 查询参数
  /** 当前查询参数 */
  queryParams: ReportsQueryParams;

  // 选择状态
  /** 选中的报表ID列表 */
  selectedReports: string[];

  // 进度跟踪
  /** 报表生成进度映射 (reportId -> progress) */
  generationProgress: Record<string, number>;
}

/**
 * 报表操作接口
 *
 * 定义报表管理的所有业务操作
 */
export interface ReportsActions {
  // ===== 报表查询操作 =====

  /**
   * 获取报表列表
   *
   * @param params - 可选的查询参数（分页、筛选、排序）
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await fetchReports({ page: 1, limit: 20, sortBy: 'createdAt' });
   * ```
   */
  fetchReports: (params?: ReportsQueryParams) => Promise<void>;

  /**
   * 根据 ID 获取单个报表详情
   * 
   * @param reportId - 报表 ID
   * @returns Promise<Report | null>
   */
  fetchReportById: (reportId: string) => Promise<Report | null>;

  /**
   * 刷新统计信息
   *
   * @returns Promise<void>
   */
  refreshStatistics: () => Promise<void>;

  // ===== 系统健康评分操作（合并自 health-store） =====

  /**
   * 获取系统健康评分
   *
   * 功能：
   * 1. 为每个核心系统查询最新的健康报告（page: 1, pageSize: 1）
   * 获取各系统/设备的最新健康评分
   *
   * @param equipments - 设备对象数组（从中提取 deviceId 和 deviceName）
   */
  fetchSystemHealthScores: (equipments: any[]) => Promise<void>;

  // ===== 报表生成操作 =====

  /**
   * 生成新报表
   *
   * @param config - 报表配置（类型、参数、时间范围等）
   * @returns Promise<Report | null> - 生成的报表对象或 null（失败时）
   *
   * @example
   * ```typescript
   * const report = await generateReport({
   *   type: 'health',
   *   deviceId: 'device-001',
   *   startTime: Date.now() - 86400000,
   *   endTime: Date.now()
   * });
   * ```
   */
  generateReport: (config: ReportConfig) => Promise<Report | null>;

  /**
   * 跟踪报表生成进度
   *
   * @param reportId - 报表ID
   */
  trackGenerationProgress: (reportId: string) => void;

  // ===== 报表操作 =====

  /**
   * 下载报表文件
   *
   * @param reportId - 报表ID
   * @returns Promise<void>
   */
  downloadReport: (reportId: string) => Promise<void>;

  /**
   * 删除单个报表
   *
   * @param reportId - 报表ID
   * @returns Promise<void>
   */
  deleteReport: (reportId: string) => Promise<void>;

  /**
   * 批量删除选中的报表
   *
   * @returns Promise<void>
   */
  deleteSelectedReports: () => Promise<void>;

  // ===== 状态管理 =====

  /**
   * 设置查询参数
   *
   * @param params - 部分查询参数
   */
  setQueryParams: (params: Partial<ReportsQueryParams>) => void;

  /**
   * 清除错误信息
   */
  clearError: () => void;

  /**
   * 重置Store到初始状态
   */
  resetStore: () => void;

  // ===== 选择操作 =====

  /**
   * 切换报表选择状态
   *
   * @param reportId - 报表ID
   */
  toggleReportSelection: (reportId: string) => void;

  /**
   * 全选所有报表
   */
  selectAllReports: () => void;

  /**
   * 清除所有选择
   */
  clearSelection: () => void;
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
 * 报表状态管理 Store
 *
 * 使用 Zustand 实现的响应式状态管理，提供：
 * - 报表的查询和生成操作
 * - 分页、筛选和排序
 * - 生成进度跟踪
 * - 选择和批量操作
 */
export const useReportsStore = create<ReportsState & ReportsActions>((set, get) => ({
  // ===== 初始状态 =====

  // 核心数据
  reports: [],
  statistics: null,

  // 系统健康评分状态（合并自 health-store）
  systemHealthScores: {},
  scoresLoading: false,

  // 状态管理
  loading: false,
  generating: false,
  error: null,

  // 分页信息
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },

  // 查询参数
  queryParams: defaultQueryParams,

  // 选择状态
  selectedReports: [],

  // 进度跟踪
  generationProgress: {},

  // ===== Actions 实现 =====

  /**
   * 获取报表列表
   *
   * 直接调用后端 API: GET /api/reports/health
   */
  fetchReports: async (params = {}) => {
    try {
      set({ loading: true, error: null });

      const currentParams = { ...get().queryParams, ...params };
      set({ queryParams: currentParams });

      // 映射前端报表类型到后端 reportType
      const backendReportType = currentParams.reportType
        ? (currentParams.reportType.includes('OPERATION') ? 'aggregate' : 'single') as 'single' | 'aggregate'
        : undefined;

      // 直接调用后端 API
      const response = await Service.reportControllerFindAll(
        currentParams.equipmentId || undefined,     // equipmentId（动态传入）
        backendReportType,                          // reportType: 'single' | 'aggregate'
        currentParams.startDate ? new Date(currentParams.startDate).getTime() : undefined,  // startTime
        currentParams.endDate ? new Date(currentParams.endDate).getTime() : undefined,      // endTime
        currentParams.page || 1,                    // page
        currentParams.limit || 20                   // pageSize
      );

      // 解析后端响应（PaginatedResponseDto）：兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const items: Report[] = (result.items as Report[]) || [];
      const total: number = result.total || 0;
      const page: number = result.page || 1;
      const pageSize: number = result.pageSize || 20;

      set({
        reports: items,
        pagination: {
          page,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        },
        loading: false
      });

      // 自动刷新统计信息
      get().refreshStatistics();

    } catch (error) {
      console.error('获取报表列表失败:', error);
      toast.error('获取报表列表失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });

      set({
        error: error instanceof Error ? error.message : '获取报表列表失败',
        loading: false
      });
    }
  },

  /**
   * 根据 ID 获取单个报表详情
   */
  fetchReportById: async (reportId: string): Promise<Report | null> => {
    try {
      set({ loading: true, error: null });

      // 直接调用后端 API 获取详情
      const result = await Service.reportControllerFindOne(reportId);
      const report = result as Report;

      // 如果当前列表中已有该报告，更新它
      set(state => ({
        reports: state.reports.find(r => r.id === reportId)
          ? state.reports.map(r => r.id === reportId ? report : r)
          : [...state.reports, report],
        loading: false
      }));

      return report;
    } catch (error) {
      console.error('获取报表详情失败:', error);
      const errorMessage = error instanceof Error ? error.message : '获取报表详情失败';
      set({ error: errorMessage, loading: false });
      return null;
    }
  },

  /**
   * 刷新统计信息
   *
   * 基于当前报表列表计算统计信息（前端计算）
   */
  refreshStatistics: async () => {
    try {
      const { reports } = get();

      // 前端计算统计信息
      const statistics: ReportStatistics = {
        totalReports: reports.length,
        completedReports: reports.filter(r => r.status === 'COMPLETED').length,
        failedReports: reports.filter(r => r.status === 'FAILED').length,
        generatingReports: reports.filter(r => r.status === 'GENERATING').length,
        byType: {
          'DAILY_OPERATION': reports.filter(r => r.config?.reportType === 'DAILY_OPERATION').length,
          'MONTHLY_OPERATION': reports.filter(r => r.config?.reportType === 'MONTHLY_OPERATION').length,
          'EQUIPMENT_HEALTH': reports.filter(r => r.config?.reportType === 'EQUIPMENT_HEALTH').length,
          'FAILURE_STATISTICS': reports.filter(r => r.config?.reportType === 'FAILURE_STATISTICS').length,
          'ENERGY_EFFICIENCY': reports.filter(r => r.config?.reportType === 'ENERGY_EFFICIENCY').length,
        }
      };

      set({ statistics });
    } catch (error) {
      console.warn('获取统计信息失败:', error);
      // 统计信息失败不影响主要功能
    }
  },

  /**
   * 获取系统健康评分
   *
   * 实现策略：
   * 1. 遍历传入的设备列表
   * 2. 为每个设备查询最新的健康报告（page: 1, pageSize: 1）
   * 3. 从报告中提取评分、等级点、趋势等数据
   * 4. 采用 Promise.all 并行处理以提高效率
   */
  fetchSystemHealthScores: async (equipments: any[]) => {
    set({ scoresLoading: true, error: null });

    try {
      const scores: Record<string, SystemHealthScore> = {};

      // 为每个设备查询最新报告
      await Promise.all(
        equipments.map(async (equipment) => {
          const systemId = equipment.id; // 🔴 统一使用数据库 UUID (id) 作为主键
          const deviceId = equipment.deviceId; // 技术标识 (如 SYS-xxx)
          const deviceName = equipment.deviceName;

          try {
            // 调用后端 API 获取该设备最新的健康报告
            const response = await Service.reportControllerFindAll(
              systemId,           // equipmentId - 过滤指定设备 (后端 API 实际使用 UUID)
              'single',           // reportType - 单设备报告
              undefined,          // startTime
              undefined,          // endTime
              1,                  // page - 第1页
              1                   // pageSize - 只要最新的1条
            );

            // 兼容处理可能的 .data 包装
            const result = (response as any).data || response;
            const items: HealthReport[] = (result.items as HealthReport[]) || [];

            if (items.length > 0) {
              const latestReport = items[0];
              const healthScore = (latestReport as any).healthScore || 0;

              // 根据评分计算健康等级 (映射后端字符串到前端枚举)
              let grade: HealthStatus;
              const backendLevel = (latestReport as any).healthLevel?.toLowerCase();

              if (backendLevel === 'excellent' || healthScore >= 90) {
                grade = HealthStatus.EXCELLENT;
              } else if (backendLevel === 'good' || healthScore >= 80) {
                grade = HealthStatus.GOOD;
              } else if (backendLevel === 'fair' || healthScore >= 70) {
                grade = HealthStatus.FAIR;
              } else if (backendLevel === 'poor' || healthScore >= 60) {
                grade = HealthStatus.POOR;
              } else {
                grade = HealthStatus.CRITICAL;
              }

              // 🟢 优化：取消初始化时的趋势查询 (trendResponse)，减少一半的请求压力
              // 趋势数据将在进入详情页或评估时按需加载
              const trendData: HealthTrendDataPoint[] = [{
                timestamp: Date.now(),
                score: healthScore
              }];

              // 计算趋势方向 (由于没有历史数据，默认为稳定)
              let trend: TrendDirection = TrendDirection.STABLE;

              scores[systemId] = {
                deviceId: systemId,
                systemName: deviceName || '未知系统',
                score: healthScore,
                grade: grade as HealthStatus,
                trend,
                trendData,
                lastUpdated: Date.now(),
                reportId: latestReport.id
              };
            } else {
              // 没有报告数据，使用默认值
              scores[systemId] = {
                deviceId: systemId,
                systemName: deviceName || '未知系统',
                score: 0,
                grade: HealthStatus.CRITICAL,
                trend: TrendDirection.STABLE,
                trendData: [{ timestamp: Date.now(), score: 0 }],
                lastUpdated: Date.now()
              };
            }
          } catch (err) {
            console.error(`获取设备 ${systemId} 健康评分失败:`, err);
            // 单个设备失败不影响其他设备
            scores[systemId] = {
              deviceId: systemId,
              systemName: deviceName || '未知系统',
              score: 0,
              grade: HealthStatus.CRITICAL,
              trend: TrendDirection.STABLE,
              trendData: [{ timestamp: Date.now(), score: 0 }],
              lastUpdated: Date.now()
            };
          }
        })
      );

      set({
        systemHealthScores: scores,
        scoresLoading: false
      });

      console.log('系统健康评分获取成功（基于动态设备列表）');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取系统健康评分失败';
      set({
        scoresLoading: false,
        error: errorMessage
      });
      console.error('获取系统健康评分失败:', err);
      throw err;
    }
  },

  /**
   * 生成新报表
   *
   * 直接调用后端 API: POST /api/reports/health
   */
  generateReport: async (config: ReportConfig): Promise<Report | null> => {
    try {
      set({ generating: true, error: null });

      // 验证配置
      if (!config.equipmentIds || config.equipmentIds.length === 0) {
        throw new Error('至少需要选择一个设备');
      }

      // 映射前端配置到后端 DTO
      const dto: GenerateHealthReportDto = {
        deviceId: config.equipmentIds![0], // 使用选中的设备ID
        startTime: config.startDate,       // 开始时间
        endTime: config.endDate,           // 结束时间
      };

      // 直接调用后端 API
      const response = await Service.reportControllerGenerateReport(dto) as any;

      // 🟢 关键修复：从原始 response 中检查业务状态码
      if (response.code !== 200 && response.code !== undefined) {
        throw new Error(response.message || '报告生成业务失败');
      }

      // 解包核心数据
      const reportData = response.data || response;

      // 转换为前端 Report 格式
      const frontendReport: Report = {
        ...reportData,
        name: `${getReportTypeDisplayName(config.reportType)} - ${new Date().toLocaleDateString()}`,
        status: reportData.status || 'COMPLETED',
        config,
        progress: reportData.progress || 100
      };

      // 🟡 关键修复：使用后端返回的数据更新系统评分
      const healthScore = reportData.healthScore;
      const healthLevel = reportData.healthLevel;
      const systemId = reportData.equipmentId;

      if (healthScore !== undefined && systemId) {
        // 根据评分和等级计算前端枚举
        let grade: HealthStatus;
        const level = healthLevel?.toLowerCase();
        if (level === 'excellent' || healthScore >= 90) grade = HealthStatus.EXCELLENT;
        else if (level === 'good' || healthScore >= 80) grade = HealthStatus.GOOD;
        else if (level === 'fair' || healthScore >= 70) grade = HealthStatus.FAIR;
        else if (level === 'poor' || healthScore >= 60) grade = HealthStatus.POOR;
        else grade = HealthStatus.CRITICAL;

        set(state => ({
          systemHealthScores: {
            ...state.systemHealthScores,
            [systemId]: {
              ...state.systemHealthScores[systemId],
              score: healthScore,
              grade,
              lastUpdated: Date.now(),
              reportId: reportData.id
            }
          }
        }));
      }

      // 添加到报表列表开头
      set(state => ({
        reports: [frontendReport, ...state.reports],
        generating: false
      }));

      // 启动进度跟踪
      if (reportData.id) {
        get().trackGenerationProgress(reportData.id);
      }

      toast.success('报表生成请求已提交');

      return frontendReport;

    } catch (error) {
      console.error('生成报表失败:', error);
      toast.error('生成报表失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });

      set({
        error: error instanceof Error ? error.message : '报表生成失败',
        generating: false
      });

      return null;
    }
  },

  /**
   * 跟踪报表生成进度
   *
   * 直接调用后端 API: GET /api/reports/health/{id}
   */
  trackGenerationProgress: (reportId: string) => {
    const updateProgress = async () => {
      try {
        // 直接调用后端 API 获取报表详情
        const updatedReport = await Service.reportControllerFindOne(reportId);

        // 更新报表列表中的进度
        set(state => ({
          reports: state.reports.map(r =>
            r.id === reportId ? { ...r, ...updatedReport } : r
          ),
          generationProgress: {
            ...state.generationProgress,
            [reportId]: (updatedReport as any).progress || 0
          }
        }));

        // 如果生成完成，从进度跟踪中移除
        const status = (updatedReport as any).status;
        if (status === 'COMPLETED' || status === 'FAILED') {
          set(state => {
            const newProgress = { ...state.generationProgress };
            delete newProgress[reportId];
            return { generationProgress: newProgress };
          });
          return;
        }

        // 继续跟踪进度
        if (status === 'GENERATING') {
          setTimeout(() => updateProgress(), 2000);
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
  },

  /**
   * 下载报表文件
   *
   * 直接调用后端 API: GET /api/reports/health/{id}/export
   */
  downloadReport: async (reportId: string) => {
    try {
      set({ error: null });

      // 直接调用后端 API，获取二进制 Blob
      const blob = await Service.reportControllerExportReport(reportId);

      // 1. 创建一个指向该 Blob 的 URL
      const url = window.URL.createObjectURL(new Blob([blob]));

      // 2. 创建一个隐藏的 <a> 标签用于触发下载
      const link = document.createElement('a');
      link.href = url;

      // 3. 设置下载文件名 (格式: 健康报告_ID.xlsx)
      // 注意：后端返回的是 Excel 流
      link.setAttribute('download', `健康评估报告_${reportId.substring(0, 8)}.xlsx`);

      // 4. 将标签添加到文档并点击
      document.body.appendChild(link);
      link.click();

      // 5. 清理：移除标签并释放 URL 对象
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast.success('报表下载已开始');
      console.log('报表导出并下载成功:', reportId);

    } catch (error) {
      console.error('下载报表失败:', error);
      const errorMessage = error instanceof Error ? error.message : '下载过程中发生错误';
      set({ error: errorMessage });
      toast.error('报表下载失败', { description: errorMessage });
    }
  },

  /**
   * 删除单个报表
   *
   * 直接调用后端 API: DELETE /api/reports/health/{id}
   */
  deleteReport: async (reportId: string) => {
    try {
      set({ error: null });

      // 直接调用后端 API
      await Service.reportControllerRemove(reportId);

      // 从列表中移除
      set(state => ({
        reports: state.reports.filter(r => r.id !== reportId),
        selectedReports: state.selectedReports.filter(id => id !== reportId)
      }));

      toast.success('报表删除成功');

    } catch (error) {
      console.error('删除报表失败:', error);
      toast.error('删除报表失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });

      set({
        error: error instanceof Error ? error.message : '删除报表失败'
      });
    }
  },

  /**
   * 批量删除选中的报表
   *
   * 循环调用单个删除接口（后端暂无批量删除接口）
   */
  deleteSelectedReports: async () => {
    const { selectedReports } = get();

    if (selectedReports.length === 0) {
      set({ error: '请先选择要删除的报表' });
      return;
    }

    try {
      set({ error: null });

      // 批量删除（循环调用单个删除）
      const deletePromises = selectedReports.map(id =>
        Service.reportControllerRemove(id).catch(err => {
          console.error(`删除报表 ${id} 失败:`, err);
          return { failed: true, id };
        })
      );

      const results = await Promise.all(deletePromises);

      // 统计失败的ID
      const failedIds = results
        .filter((r: any) => r?.failed)
        .map((r: any) => r.id);

      // 移除成功删除的报表
      set(state => ({
        reports: state.reports.filter(r => failedIds.includes(r.id)),
        selectedReports: []
      }));

      // 显示删除结果
      if (failedIds.length > 0) {
        toast.warning(`批量删除完成，但有 ${failedIds.length} 个报表删除失败`);
        set({
          error: `删除完成，但有 ${failedIds.length} 个报表删除失败`
        });
      } else {
        toast.success('批量删除成功');
      }

      // 刷新列表
      get().fetchReports();

    } catch (error) {
      console.error('批量删除报表失败:', error);
      toast.error('批量删除报表失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });

      set({
        error: error instanceof Error ? error.message : '批量删除失败'
      });
    }
  },

  /**
   * 设置查询参数
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
      systemHealthScores: {},
      scoresLoading: false,
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
   * 切换报表选择状态
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
}));

// ==================== 导出的工具函数 ====================

/**
 * 导出的 Selectors
 *
 * 提供常用状态的 Selector 函数，支持组件精确订阅状态片段
 */
export const useReportsSelector = {
  // 基本状态
  /** 报表列表 */
  reports: (state: ReportsState & ReportsActions) => state.reports,

  /** 报表统计信息 */
  statistics: (state: ReportsState & ReportsActions) => state.statistics,

  /** 加载状态 */
  loading: (state: ReportsState & ReportsActions) => state.loading,

  /** 生成状态 */
  generating: (state: ReportsState & ReportsActions) => state.generating,

  /** 错误信息 */
  error: (state: ReportsState & ReportsActions) => state.error,

  /** 分页信息 */
  pagination: (state: ReportsState & ReportsActions) => state.pagination,

  // === 系统健康评分相关（合并自 health-store）===
  /** 系统健康评分映射 */
  systemHealthScores: (state: ReportsState & ReportsActions) => state.systemHealthScores,

  /** 所有系统健康评分数组 */
  allSystemHealthScores: (state: ReportsState & ReportsActions) => Object.values(state.systemHealthScores),

  /** 健康评分加载状态 */
  scoresLoading: (state: ReportsState & ReportsActions) => state.scoresLoading,

  /** 获取指定设备的健康评分 */
  getSystemHealthScore: (deviceId: string) => (state: ReportsState & ReportsActions) =>
    state.systemHealthScores[deviceId],

  // 选择状态
  /** 选中的报表ID列表 */
  selectedReports: (state: ReportsState & ReportsActions) => state.selectedReports,

  /** 选中的报表数量 */
  selectedCount: (state: ReportsState & ReportsActions) => state.selectedReports.length,

  /** 生成进度映射 */
  generationProgress: (state: ReportsState & ReportsActions) => state.generationProgress,

  // 过滤后的报表
  /** 已完成的报表 */
  completedReports: (state: ReportsState & ReportsActions) => state.reports.filter(r => r.status === 'COMPLETED'),

  /** 生成中的报表 */
  generatingReports: (state: ReportsState & ReportsActions) => state.reports.filter(r => r.status === 'GENERATING'),

  /** 失败的报表 */
  failedReports: (state: ReportsState & ReportsActions) => state.reports.filter(r => r.status === 'FAILED'),

  // 统计信息
  /** 总报表数 */
  totalReports: (state: ReportsState & ReportsActions) => state.statistics?.totalReports || 0,

  /** 已完成数 */
  completedCount: (state: ReportsState & ReportsActions) => state.statistics?.completedReports || 0,

  /** 失败数 */
  failedCount: (state: ReportsState & ReportsActions) => state.statistics?.failedReports || 0,
};

// ==================== 导出工具函数（给外部组件使用）====================

export { getReportTypeDisplayName, getReportStatusInfo };

/**
 * 默认导出（向后兼容）
 */
export default useReportsStore;
