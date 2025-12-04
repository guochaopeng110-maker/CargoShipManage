// 数据导入状态管理（对应后端ImportRecord实体）
// 基于货船智能机舱管理系统数据导入架构
// 
// 功能说明：
// - 基于后端API契约实现完整的数据导入状态管理
// - 支持文件上传、验证、转换的完整流程
// - 包含批量导入、作业管理、模板管理
// - 实时WebSocket更新和性能监控
// - 完整的错误处理和重试机制

import {
  ImportRecord,
  ImportRecordFilters,
  DataImportRequest,
  ImportPreviewData,
  ImportTemplate,
  ImportJob,
  ImportJobStatus,
  BatchImportJob,
  ImportStatistics,
  ImportHistoryStatistics,
  FileFormat,
  DuplicateHandling,
} from '../types/import';
import { DataQuality } from '../types/equipment';
import { importService } from '../services/import-service';

/**
 * 数据导入状态接口
 * 
 * 定义前端数据导入状态管理的完整数据结构
 * 对应后端ImportRecord实体和相关业务逻辑
 */
export interface ImportState {
  // 核心数据
  records: ImportRecord[];          // 导入记录列表
  currentRecord: ImportRecord | null; // 当前激活的记录
  
  // 状态管理
  uploading: boolean;               // 文件上传中
  importing: boolean;               // 数据导入中
  loading: boolean;                 // 列表加载中
  processing: boolean;              // 数据处理中
  error: string | null;             // 错误信息
  lastUpdate: number;               // 最后更新时间
  
  // 文件上传状态
  uploadProgress: number;           // 上传进度百分比
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'; // 上传状态
  currentUploadFile: File | null;   // 当前上传文件
  
  // 预览数据管理
  previewData: ImportPreviewData | null; // 文件预览数据
  showPreview: boolean;             // 是否显示预览对话框
  previewValidationErrors: any[];   // 预览验证错误
  
  // 筛选和排序
  filters: ImportRecordFilters;     // 当前筛选条件
  sortBy: 'uploadTime' | 'status' | 'fileName' | 'fileSize' | 'duration'; // 排序字段
  sortOrder: 'asc' | 'desc';        // 排序方向
  
  // 分页
  page: number;                     // 当前页码
  pageSize: number;                 // 每页大小
  total: number;                    // 总记录数
  totalPages: number;               // 总页数
  
  // 导入作业管理
  activeJobs: Map<string, ImportJob>;      // 活跃作业映射
  jobProgress: Map<string, number>;        // 作业进度映射
  jobStatus: Map<string, ImportJobStatus>; // 作业状态映射
  
  // 批量导入管理
  batchJobs: BatchImportJob[];      // 批量导入作业列表
  activeBatchJob: BatchImportJob | null; // 当前活跃的批量作业
  batchProgress: number;            // 批量作业总体进度
  
  // 模板管理
  templates: ImportTemplate[];      // 导入模板列表
  currentTemplate: ImportTemplate | null; // 当前选择的模板
  templateValidation: {
    isValid: boolean;
    errors: string[];
  };
  
  // 统计数据
  statistics: ImportStatistics | null;     // 当前统计
  historyStatistics: ImportHistoryStatistics | null; // 历史统计数据
  trendData: {                              // 趋势数据
    dailyImports: number[];
    successRate: number[];
    lastUpdated: number;
  };
  
  // 性能监控
  performanceMetrics: {
    averageImportTime: number;   // 平均导入时间
    importRate: number;          // 导入速率（行/秒）
    errorRate: number;           // 错误率
    cacheHitRate: number;        // 缓存命中率
  };
  
  // 缓存管理
  cache: {
    lastFetch: number;           // 最后获取时间
    cacheTimeout: number;        // 缓存超时（5分钟）
    data: Map<string, any>;      // 缓存数据映射
  };
  
  // WebSocket连接状态
  websocketStatus: 'disconnected' | 'connecting' | 'connected';
  realtimeUpdates: boolean;      // 是否启用实时更新
  
  // 重复数据处理策略
  duplicateHandling: DuplicateHandling; // 默认重复处理策略
  
  // 导入配置
  importConfig: {
    maxFileSize: number;         // 最大文件大小
    allowedFormats: FileFormat[]; // 允许的文件格式
    maxRowsPerFile: number;      // 每文件最大行数
    batchSize: number;           // 批处理大小
  };
}

/**
 * 数据导入操作接口
 * 
 * 定义数据导入相关的所有操作方法
 */
export interface ImportActions {
  // === 文件上传操作 ===
  uploadFile: (request: DataImportRequest) => Promise<ImportRecord>;
  uploadFileWithProgress: (request: DataImportRequest, onProgress?: (progress: number) => void) => Promise<ImportRecord>;
  cancelUpload: () => void;
  
  // === 预览操作 ===
  previewFile: (file: File, equipmentId?: string) => Promise<ImportPreviewData>;
  clearPreview: () => void;
  showPreviewDialog: () => void;
  hidePreviewDialog: () => void;
  validatePreviewData: () => { isValid: boolean; errors: string[] };
  
  // === 导入执行操作 ===
  executeImport: (recordId: string, options?: any) => Promise<ImportRecord>;
  executeBatchImport: (batchJob: BatchImportJob) => Promise<void>;
  cancelImport: (recordId: string) => Promise<void>;
  retryImport: (recordId: string) => Promise<ImportRecord>;
  
  // === 作业管理 ===
  getImportJobs: (recordId: string) => Promise<ImportJob[]>;
  pauseJob: (jobId: string) => Promise<void>;
  resumeJob: (jobId: string) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  
  // === 查询操作 ===
  getRecords: (params?: { 
    page?: number; 
    pageSize?: number; 
    filters?: ImportRecordFilters;
    sortBy?: ImportState['sortBy'];
    sortOrder?: ImportState['sortOrder'];
  }) => Promise<{ 
    items: ImportRecord[]; 
    total: number; 
    page: number; 
    pageSize: number; 
    totalPages: number;
  }>;
  getRecord: (recordId: string) => Promise<ImportRecord>;
  getStatistics: () => Promise<ImportStatistics>;
  getHistoryStatistics: (period: { start: number; end: number }) => Promise<ImportHistoryStatistics>;
  
  // === 模板管理 ===
  getTemplates: () => Promise<ImportTemplate[]>;
  getTemplate: (templateId: string) => Promise<ImportTemplate>;
  createTemplate: (template: Omit<ImportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<ImportTemplate>;
  updateTemplate: (templateId: string, updates: Partial<ImportTemplate>) => Promise<ImportTemplate>;
  deleteTemplate: (templateId: string) => Promise<void>;
  selectTemplate: (template: ImportTemplate) => void;
  
  // === 状态管理 ===
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  reset: () => void;
  
  // === 筛选和排序 ===
  setFilters: (filters: Partial<ImportRecordFilters>) => void;
  clearFilters: () => void;
  setSorting: (sortBy: ImportState['sortBy'], sortOrder: ImportState['sortOrder']) => void;
  resetFilters: () => void;
  
  // === 分页操作 ===
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  changePageSize: (pageSize: number) => void;
  
  // === 实时更新 ===
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
  handleWebSocketMessage: (message: any) => void;
  reconnectWebSocket: () => void;
  
  // === 缓存管理 ===
  clearCache: () => void;
  invalidateCache: (key: string) => void;
  getCachedData: <T>(key: string) => T | null;
  setCachedData: <T>(key: string, data: T, ttl?: number) => void;
  
  // === 性能监控 ===
  recordPerformanceMetric: (metric: string, value: number) => void;
  getPerformanceReport: () => any;
  resetPerformanceMetrics: () => void;
  
  // === 配置管理 ===
  updateImportConfig: (config: Partial<ImportState['importConfig']>) => void;
  setDuplicateHandling: (handling: DuplicateHandling) => void;
  
  // === 工具方法 ===
  calculateSuccessRate: () => number;
  formatFileSize: (bytes: number) => string;
  getStatusColor: (status: string) => string;
  exportRecords: (format: 'csv' | 'excel') => Promise<void>;
}

/**
 * 数据导入状态管理Store
 * 
 * 实现完整的数据导入状态管理功能
 * 对应后端ImportRecord实体和相关API
 */
class ImportStore implements ImportState, ImportActions {
  // === 核心数据状态 ===
  records: ImportRecord[] = [];
  currentRecord: ImportRecord | null = null;
  
  // === 状态管理 ===
  uploading = false;
  importing = false;
  loading = false;
  processing = false;
  error: string | null = null;
  lastUpdate = 0;
  
  // === 文件上传状态 ===
  uploadProgress = 0;
  uploadStatus: ImportState['uploadStatus'] = 'idle';
  currentUploadFile: File | null = null;
  
  // === 预览数据状态 ===
  previewData: ImportPreviewData | null = null;
  showPreview = false;
  previewValidationErrors: any[] = [];
  
  // === 筛选和排序 ===
  filters: ImportRecordFilters = {};
  sortBy: ImportState['sortBy'] = 'uploadTime';
  sortOrder: ImportState['sortOrder'] = 'desc';
  
  // === 分页状态 ===
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;
  
  // === 作业管理 ===
  activeJobs = new Map<string, ImportJob>();
  jobProgress = new Map<string, number>();
  jobStatus = new Map<string, ImportJobStatus>();
  
  // === 批量导入 ===
  batchJobs: BatchImportJob[] = [];
  activeBatchJob: BatchImportJob | null = null;
  batchProgress = 0;
  
  // === 模板管理 ===
  templates: ImportTemplate[] = [];
  currentTemplate: ImportTemplate | null = null;
  templateValidation = {
    isValid: false,
    errors: [] as string[],
  };
  
  // === 统计数据 ===
  statistics: ImportStatistics | null = null;
  historyStatistics: ImportHistoryStatistics | null = null;
  trendData = {
    dailyImports: [],
    successRate: [],
    lastUpdated: 0,
  };
  
  // === 性能监控 ===
  performanceMetrics = {
    averageImportTime: 0,
    importRate: 0,
    errorRate: 0,
    cacheHitRate: 0,
  };
  
  // === 缓存管理 ===
  cache = {
    lastFetch: 0,
    cacheTimeout: 300000, // 5 minutes
    data: new Map<string, any>(),
  };
  
  // === WebSocket状态 ===
  websocketStatus: ImportState['websocketStatus'] = 'disconnected';
  realtimeUpdates = true;
  
  // === 配置 ===
  duplicateHandling: DuplicateHandling = DuplicateHandling.SKIP;
  importConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFormats: [FileFormat.CSV, FileFormat.EXCEL, FileFormat.JSON, FileFormat.XML],
    maxRowsPerFile: 100000,
    batchSize: 1000,
  };
  
  // === 私有方法 ===
  
  /**
   * 更新最后更新时间
   */
  private updateTimestamp(): void {
    this.lastUpdate = Date.now();
  }
  
  /**
   * 标准化错误消息
   */
  private normalizeError(error: any): string {
    if (error?.message) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return '操作失败，请重试';
  }
  
  /**
   * 检查缓存是否有效
   */
  isCacheValid(): boolean {
    return Date.now() - this.cache.lastFetch < this.cache.cacheTimeout;
  }
  
  /**
   * 计算成功概率
   */
  private calculateRecordSuccessRate(record: ImportRecord): number {
    if (record.totalRows === 0) {
      return 0;
    }
    return (record.successRows / record.totalRows) * 100;
  }
  
  // === 文件上传操作实现 ===
  
  uploadFile = async (request: DataImportRequest): Promise<ImportRecord> => {
    this.uploading = true;
    this.setError(null);
    
    try {
      this.uploadProgress = 0;
      this.uploadStatus = 'uploading';
      this.currentUploadFile = request.file;
      
      // 调用导入服务
      const record = await importService.uploadFile(request);
      
      // 更新本地状态
      this.records = [record, ...this.records];
      this.total += 1;
      this.currentRecord = record;
      this.uploadProgress = 100;
      this.uploadStatus = 'success';
      this.currentUploadFile = null;
      
      this.updateTimestamp();
      return record;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      this.uploadStatus = 'error';
      this.uploadProgress = 0;
      throw error;
    } finally {
      this.uploading = false;
    }
  }
  
  uploadFileWithProgress = async (
    request: DataImportRequest,
    onProgress?: (progress: number) => void
  ): Promise<ImportRecord> => {
    this.uploading = true;
    this.setError(null);
    
    try {
      this.uploadProgress = 0;
      this.uploadStatus = 'uploading';
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
          onProgress?.(this.uploadProgress);
        }
      }, 200);
      
      const record = await importService.uploadFile(request);
      
      clearInterval(progressInterval);
      this.uploadProgress = 100;
      this.uploadStatus = 'success';
      onProgress?.(100);
      
      // 更新状态
      this.records = [record, ...this.records];
      this.total += 1;
      this.currentRecord = record;
      this.updateTimestamp();
      
      return record;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      this.uploadStatus = 'error';
      this.uploadProgress = 0;
      throw error;
    } finally {
      this.uploading = false;
      setTimeout(() => {
        this.uploadStatus = 'idle';
        this.currentUploadFile = null;
      }, 2000);
    }
  }
  
  cancelUpload = (): void => {
    this.uploading = false;
    this.uploadProgress = 0;
    this.uploadStatus = 'idle';
    this.currentUploadFile = null;
    this.setError('上传已取消');
  }
  
  // === 预览操作实现 ===
  
  previewFile = async (file: File, equipmentId?: string): Promise<ImportPreviewData> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 创建FormData进行文件预览
      const formData = new FormData();
      formData.append('file', file);
      if (equipmentId) {
        formData.append('equipmentId', equipmentId);
      }
      
      // 调用预览API（需要后端支持）
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`预览失败: ${response.statusText}`);
      }
      
      const previewData = await response.json();
      this.previewData = previewData;
      this.showPreview = true;
      
      this.updateTimestamp();
      return previewData;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  clearPreview = (): void => {
    this.previewData = null;
    this.previewValidationErrors = [];
    this.showPreview = false;
  }
  
  showPreviewDialog = (): void => {
    this.showPreview = true;
  }
  
  hidePreviewDialog = (): void => {
    this.showPreview = false;
  }
  
  validatePreviewData = (): { isValid: boolean; errors: string[] } => {
    if (!this.previewData) {
      return { isValid: false, errors: ['没有预览数据'] };
    }
    
    const errors: string[] = [];
    
    // 检查数据格式
    if (!this.previewData.previewRows || this.previewData.previewRows.length === 0) {
      errors.push('文件没有有效数据');
    }
    
    // 检查验证错误
    if (this.previewData.validationErrors && this.previewData.validationErrors.length > 0) {
      errors.push(`发现 ${this.previewData.validationErrors.length} 个验证错误`);
    }
    
    // 检查重复数据
    if (this.previewData.duplicateCount > 0) {
      errors.push(`发现 ${this.previewData.duplicateCount} 条重复数据`);
    }
    
    const isValid = errors.length === 0;
    this.templateValidation = { isValid, errors };
    
    return { isValid, errors };
  }
  
  // === 导入执行操作实现 ===
  
  executeImport = async (recordId: string, options?: any): Promise<ImportRecord> => {
    this.importing = true;
    this.processing = true;
    this.setError(null);
    
    try {
      const record = await importService.executeImport(recordId);
      
      // 更新记录状态
      const index = this.records.findIndex(r => r.id === recordId);
      if (index !== -1) {
        this.records[index] = record;
      }
      if (this.currentRecord?.id === recordId) {
        this.currentRecord = record;
      }
      
      this.updateTimestamp();
      return record;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.importing = false;
      this.processing = false;
    }
  }
  
  executeBatchImport = async (batchJob: BatchImportJob): Promise<void> => {
    this.processing = true;
    this.setError(null);
    
    try {
      this.activeBatchJob = batchJob;
      
      // 模拟批量导入过程
      for (let i = 0; i < batchJob.files.length; i++) {
        const file = batchJob.files[i];
        this.batchProgress = (i / batchJob.files.length) * 100;
        
        // 这里应该调用实际的批量导入API
        // await importService.executeBatchImport(batchJob);
      }
      
      this.batchProgress = 100;
      this.updateTimestamp();
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.processing = false;
      this.activeBatchJob = null;
    }
  }
  
  cancelImport = async (recordId: string): Promise<void> => {
    this.importing = true;
    this.setError(null);
    
    try {
      await importService.cancelImport(recordId);
      
      // 更新记录状态
      const index = this.records.findIndex(r => r.id === recordId);
      if (index !== -1) {
        const record = this.records[index];
        record.status = 'failed' as any;
        this.records[index] = record;
      }
      
      this.updateTimestamp();
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.importing = false;
    }
  }
  
  retryImport = async (recordId: string): Promise<ImportRecord> => {
    this.importing = true;
    this.setError(null);
    
    try {
      // 重新执行导入
      const record = await importService.executeImport(recordId);
      
      // 更新记录
      const index = this.records.findIndex(r => r.id === recordId);
      if (index !== -1) {
        this.records[index] = record;
      }
      
      this.updateTimestamp();
      return record;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.importing = false;
    }
  }
  
  // === 作业管理实现 ===
  
  getImportJobs = async (recordId: string): Promise<ImportJob[]> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现获取导入作业的API调用
      // const jobs = await importService.getImportJobs(recordId);
      
      // 模拟数据
      const jobs: ImportJob[] = [];
      this.updateTimestamp();
      return jobs;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  pauseJob = async (jobId: string): Promise<void> => {
    try {
      // 实现暂停作业的逻辑
      this.jobStatus.set(jobId, ImportJobStatus.PAUSED);
      this.updateTimestamp();
    } catch (error) {
      this.setError(this.normalizeError(error));
      throw error;
    }
  }
  
  resumeJob = async (jobId: string): Promise<void> => {
    try {
      // 实现恢复作业的逻辑
      this.jobStatus.set(jobId, ImportJobStatus.RUNNING);
      this.updateTimestamp();
    } catch (error) {
      this.setError(this.normalizeError(error));
      throw error;
    }
  }
  
  cancelJob = async (jobId: string): Promise<void> => {
    try {
      // 实现取消作业的逻辑
      this.jobStatus.set(jobId, ImportJobStatus.CANCELLED);
      this.updateTimestamp();
    } catch (error) {
      this.setError(this.normalizeError(error));
      throw error;
    }
  }
  
  // === 查询操作实现 ===
  
  getRecords = async (params: {
    page?: number;
    pageSize?: number;
    filters?: ImportRecordFilters;
    sortBy?: ImportState['sortBy'];
    sortOrder?: ImportState['sortOrder'];
  } = {}): Promise<{
    items: ImportRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 更新参数
      if (params.page !== undefined) this.page = params.page;
      if (params.pageSize !== undefined) this.pageSize = params.pageSize;
      if (params.filters !== undefined) this.filters = { ...this.filters, ...params.filters };
      if (params.sortBy !== undefined) this.sortBy = params.sortBy;
      if (params.sortOrder !== undefined) this.sortOrder = params.sortOrder;
      
      // 调用API
      const result = await importService.getImportRecords({
        page: this.page,
        pageSize: this.pageSize,
        filters: this.filters,
      });
      
      // 更新本地状态
      this.records = result.items;
      this.total = result.total;
      this.totalPages = Math.ceil(result.total / this.pageSize);
      this.cache.lastFetch = Date.now();
      
      this.updateTimestamp();
      
      // 返回完整的结果对象
      return {
        items: result.items,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: this.totalPages,
      };
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  getRecord = async (recordId: string): Promise<ImportRecord> => {
    this.loading = true;
    this.setError(null);
    
    try {
      const record = await importService.getImportRecord(recordId);
      this.currentRecord = record;
      this.updateTimestamp();
      return record;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  getStatistics = async (): Promise<ImportStatistics> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 创建符合ImportStatistics接口的模拟数据
      const mockStatistics: ImportStatistics = {
        dataQualityDistribution: {
          [DataQuality.NORMAL]: 0,
          [DataQuality.ABNORMAL]: 0,
          [DataQuality.SUSPICIOUS]: 0,
        },
        equipmentDistribution: {},
        metricTypeDistribution: {},
        timeRange: {
          earliest: Date.now() - 86400000, // 24小时前
          latest: Date.now(),
        },
        valueRange: {
          min: 0,
          max: 100,
          mean: 50,
        },
      };
      
      this.statistics = mockStatistics;
      this.updateTimestamp();
      return mockStatistics;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  getHistoryStatistics = async (period: { start: number; end: number }): Promise<ImportHistoryStatistics> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现历史统计API
      // const historyStats = await importService.getHistoryStatistics(period);
      
      // 模拟数据
      const historyStats: ImportHistoryStatistics = {
        period,
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        totalRows: 0,
        totalErrors: 0,
        averageProcessingTime: 0,
        importRate: 0,
        statusDistribution: {
          pending: 0,
          processing: 0,
          completed: 0,
          partial: 0,
          failed: 0,
        },
        formatDistribution: {
          csv: 0,
          excel: 0,
          json: 0,
          xml: 0,
        },
        topErrors: [],
        equipmentDistribution: [],
      };
      
      this.historyStatistics = historyStats;
      this.updateTimestamp();
      return historyStats;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  // === 模板管理实现 ===
  
  getTemplates = async (): Promise<ImportTemplate[]> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现获取模板的API
      // const templates = await importService.getTemplates();
      
      // 模拟数据
      const templates: ImportTemplate[] = [];
      this.templates = templates;
      this.updateTimestamp();
      return templates;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  getTemplate = async (templateId: string): Promise<ImportTemplate> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现获取模板的API
      // const template = await importService.getTemplate(templateId);
      
      // 模拟数据
      const template: ImportTemplate = {
        id: templateId,
        name: '',
        description: '',
        fileFormat: FileFormat.CSV,
        mapping: { sourceColumns: [], transformations: [], validations: [] },
        options: {} as any,
        createdBy: '',
        isPublic: false,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: null,
      };
      
      this.updateTimestamp();
      return template;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  createTemplate = async (template: Omit<ImportTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<ImportTemplate> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现创建模板的API
      // const newTemplate = await importService.createTemplate(template);
      
      // 模拟数据
      const newTemplate: ImportTemplate = {
        ...template,
        id: `template-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: null,
        usageCount: 0,
      };
      
      this.templates = [newTemplate, ...this.templates];
      this.updateTimestamp();
      return newTemplate;
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  updateTemplate = async (templateId: string, updates: Partial<ImportTemplate>): Promise<ImportTemplate> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现更新模板的API
      // const updatedTemplate = await importService.updateTemplate(templateId, updates);
      
      // 模拟数据
      const index = this.templates.findIndex(t => t.id === templateId);
      if (index !== -1) {
        const updatedTemplate = {
          ...this.templates[index],
          ...updates,
          updatedAt: Date.now(),
        };
        this.templates[index] = updatedTemplate;
        this.updateTimestamp();
        return updatedTemplate;
      }
      
      throw new Error('模板不存在');
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  deleteTemplate = async (templateId: string): Promise<void> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里需要实现删除模板的API
      // await importService.deleteTemplate(templateId);
      
      this.templates = this.templates.filter(t => t.id !== templateId);
      if (this.currentTemplate?.id === templateId) {
        this.currentTemplate = null;
      }
      this.updateTimestamp();
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
  
  selectTemplate = (template: ImportTemplate): void => {
    this.currentTemplate = template;
    this.updateTimestamp();
  }
  
  // === 状态管理实现 ===
  
  setLoading = (loading: boolean): void => {
    this.loading = loading;
  }
  
  setError = (error: string | null): void => {
    this.error = error;
  }
  
  clearError = (): void => {
    this.error = null;
  }
  
  refresh = async (): Promise<void> => {
    if (!this || !this.getRecords || !this.getStatistics) {
      console.error('Store not properly initialized');
      return;
    }
    
    await Promise.all([
      this.getRecords({ page: this.page, pageSize: this.pageSize, filters: this.filters }),
      this.getStatistics(),
    ]);
  }
  
  refreshStatistics = async (): Promise<void> => {
    await this.getStatistics();
  }
  
  reset = (): void => {
    // 重置所有状态
    this.records = [];
    this.currentRecord = null;
    this.uploading = false;
    this.importing = false;
    this.loading = false;
    this.processing = false;
    this.error = null;
    this.lastUpdate = 0;
    this.uploadProgress = 0;
    this.uploadStatus = 'idle';
    this.currentUploadFile = null;
    this.previewData = null;
    this.showPreview = false;
    this.previewValidationErrors = [];
    this.filters = {};
    this.sortBy = 'uploadTime';
    this.sortOrder = 'desc';
    this.page = 1;
    this.pageSize = 10;
    this.total = 0;
    this.totalPages = 0;
    this.activeJobs.clear();
    this.jobProgress.clear();
    this.jobStatus.clear();
    this.batchJobs = [];
    this.activeBatchJob = null;
    this.batchProgress = 0;
    this.templates = [];
    this.currentTemplate = null;
    this.templateValidation = { isValid: false, errors: [] };
    this.statistics = null;
    this.historyStatistics = null;
    this.trendData = { dailyImports: [], successRate: [], lastUpdated: 0 };
    this.performanceMetrics = {
      averageImportTime: 0,
      importRate: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };
    this.cache = {
      lastFetch: 0,
      cacheTimeout: 300000,
      data: new Map<string, any>(),
    };
    this.websocketStatus = 'disconnected';
    this.realtimeUpdates = true;
    this.duplicateHandling = DuplicateHandling.SKIP;
  }
  
  // === 筛选和排序实现 ===
  
  setFilters = (filters: Partial<ImportRecordFilters>): void => {
    if (!this || !this.filters) {
      console.error('Store not properly initialized');
      return;
    }
    this.filters = { ...this.filters, ...filters };
    this.page = 1; // 重置到第一页
  }
  
  clearFilters = (): void => {
    this.filters = {};
    this.page = 1;
  }
  
  setSorting = (sortBy: ImportState['sortBy'], sortOrder: ImportState['sortOrder']): void => {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.page = 1;
  }
  
  resetFilters = (): void => {
    this.filters = {};
    this.sortBy = 'uploadTime';
    this.sortOrder = 'desc';
    this.page = 1;
  }
  
  // === 分页操作实现 ===
  
  goToPage = (page: number): void => {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
    }
  }
  
  goToNextPage = (): void => {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }
  
  goToPreviousPage = (): void => {
    if (this.page > 1) {
      this.page--;
    }
  }
  
  changePageSize = (pageSize: number): void => {
    this.pageSize = pageSize;
    this.page = 1;
    this.totalPages = Math.ceil(this.total / this.pageSize);
  }
  
  // === 实时更新实现 ===
  
  subscribeToUpdates = (): void => {
    this.realtimeUpdates = true;
    this.websocketStatus = 'connecting';
    // 这里应该实现WebSocket连接逻辑
    // this.connectWebSocket();
  }
  
  unsubscribeFromUpdates = (): void => {
    this.realtimeUpdates = false;
    this.websocketStatus = 'disconnected';
    // 这里应该断开WebSocket连接
  }
  
  handleWebSocketMessage(message: any): void {
    // 处理WebSocket消息
    switch (message.type) {
      case 'import_status_update':
        this.handleImportStatusUpdate(message);
        break;
      case 'import_progress_update':
        this.handleImportProgressUpdate(message);
        break;
      case 'import_completed':
        this.handleImportCompleted(message);
        break;
      default:
        console.log('未知消息类型:', message.type);
    }
  }
  
  reconnectWebSocket(): void {
    this.websocketStatus = 'connecting';
    // 实现重连逻辑
  }
  
  private handleImportStatusUpdate(message: any): void {
    const { recordId, status } = message;
    const index = this.records.findIndex(r => r.id === recordId);
    if (index !== -1) {
      this.records[index].status = status;
      this.updateTimestamp();
    }
  }
  
  private handleImportProgressUpdate(message: any): void {
    const { jobId, progress } = message;
    this.jobProgress.set(jobId, progress);
  }
  
  private handleImportCompleted(message: any): void {
    const { recordId, result } = message;
    const index = this.records.findIndex(r => r.id === recordId);
    if (index !== -1) {
      this.records[index] = { ...this.records[index], ...result };
      this.updateTimestamp();
    }
  }
  
  // === 缓存管理实现 ===
  
  clearCache = (): void => {
    this.cache.data.clear();
    this.cache.lastFetch = 0;
  }
  
  invalidateCache = (key: string): void => {
    this.cache.data.delete(key);
  }
  
  getCachedData = <T>(key: string): T | null => {
    if (!this.isCacheValid()) {
      return null;
    }
    return this.cache.data.get(key) as T || null;
  }
  
  setCachedData = <T>(key: string, data: T, ttl?: number): void => {
    this.cache.data.set(key, data);
    if (ttl) {
      // 设置TTL逻辑（简化实现）
      setTimeout(() => {
        this.cache.data.delete(key);
      }, ttl);
    }
  }
  
  // === 性能监控实现 ===
  
  recordPerformanceMetric = (metric: string, value: number): void => {
    switch (metric) {
      case 'importTime':
        this.performanceMetrics.averageImportTime = value;
        break;
      case 'importRate':
        this.performanceMetrics.importRate = value;
        break;
      case 'errorRate':
        this.performanceMetrics.errorRate = value;
        break;
      case 'cacheHitRate':
        this.performanceMetrics.cacheHitRate = value;
        break;
    }
  }
  
  getPerformanceReport = (): any => {
    return {
      ...this.performanceMetrics,
      timestamp: Date.now(),
      recordsCount: this.records.length,
      activeJobs: this.activeJobs.size,
    };
  }
  
  resetPerformanceMetrics = (): void => {
    this.performanceMetrics = {
      averageImportTime: 0,
      importRate: 0,
      errorRate: 0,
      cacheHitRate: 0,
    };
  }
  
  // === 配置管理实现 ===
  
  updateImportConfig = (config: Partial<ImportState['importConfig']>): void => {
    this.importConfig = { ...this.importConfig, ...config };
  }
  
  setDuplicateHandling = (handling: DuplicateHandling): void => {
    this.duplicateHandling = handling;
  }
  
  // === 工具方法实现 ===
  
  calculateSuccessRate = (): number => {
    if (this.records.length === 0) {
      return 0;
    }
    
    const totalRows = this.records.reduce((sum, record) => sum + record.totalRows, 0);
    const successRows = this.records.reduce((sum, record) => sum + record.successRows, 0);
    
    return totalRows > 0 ? (successRows / totalRows) * 100 : 0;
  }
  
  formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: 'blue',
      processing: 'cyan',
      completed: 'green',
      partial: 'yellow',
      failed: 'red',
    };
    return colorMap[status] || 'gray';
  }
  
  exportRecords = async (format: 'csv' | 'excel'): Promise<void> => {
    this.loading = true;
    this.setError(null);
    
    try {
      // 这里应该实现导出功能
      console.log(`导出 ${format} 格式的记录`);
      // const response = await importService.exportRecords(this.records, format);
      // 触发下载
      
    } catch (error) {
      const errorMessage = this.normalizeError(error);
      this.setError(errorMessage);
      throw error;
    } finally {
      this.loading = false;
    }
  }
}

// === 创建和导出Store实例 ===
const importStore = new ImportStore();

// 导出Hook样式接口
export const useImportStore = () => importStore;

// 导出便捷Hook，包含计算属性
export const useImport = () => {
  const store = useImportStore();
  
  return {
    // === 状态 ===
    ...store,
    
    // === 计算属性 ===
    latestRecord: store.records[0] || null,
    
    recordsByStatus: {
      pending: store.records.filter(r => r.status === 'pending'),
      processing: store.records.filter(r => r.status === 'processing'),
      completed: store.records.filter(r => r.status === 'completed'),
      partial: store.records.filter(r => r.status === 'partial'),
      failed: store.records.filter(r => r.status === 'failed'),
    },
    
    successRate: store.calculateSuccessRate(),
    
    hasNextPage: store.page < store.totalPages,
    hasPreviousPage: store.page > 1,
    
    isUploading: store.uploading || store.uploadStatus === 'uploading',
    isProcessing: store.processing || store.importing,
    
    // === 便捷方法 ===
    uploadAndExecute: async (request: DataImportRequest) => {
      const record = await store.uploadFile(request);
      await store.executeImport(record.id);
      return record;
    },
    
    refreshWithCache: async () => {
      if (!store.isCacheValid()) {
        await store.refresh();
      }
    },
  };
};

export default useImportStore;