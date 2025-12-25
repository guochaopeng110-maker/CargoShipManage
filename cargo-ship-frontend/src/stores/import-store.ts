/**
 * 货船智能机舱管理系统 - 数据导入状态管理
 *
 * 职责：
 * 1. 管理数据导入记录的全局状态
 * 2. 处理文件上传和导入执行操作
 * 3. 管理分页、筛选和排序状态
 * 4. 封装 import-service API 调用
 *
 * 架构：
 * - State: 纯数据状态 (records, loading, uploadProgress...)
 * - Actions: 业务逻辑 (uploadFile, fetchRecords, executeImport...)
 *
 * @module stores/import-store
 */

import { create } from 'zustand';

// 从后端 API 客户端导入基础类型和服务
import { ImportRecord, Service, ImportDataDto } from '@/services/api';

// 从监控服务导入数据质量枚举（使用后端 API 定义）
import { DataQuality } from './monitoring-store';

// ==================== 前端业务逻辑类型定义 ====================

/**
 * 导入记录筛选条件
 *
 * 用于查询导入记录列表时的筛选参数
 */
export interface ImportRecordFilters {
  equipmentId?: string;                          // 设备ID筛选
  status?: ImportRecord.status[];                // 导入状态筛选
  fileFormat?: ImportRecord.fileFormat[];        // 文件格式筛选
  startTime?: number;                            // 开始时间（时间戳）
  endTime?: number;                              // 结束时间（时间戳）
  importedBy?: string;                           // 导入人筛选
  fileName?: string;                             // 文件名筛选
}

/**
 * 数据导入请求
 *
 * 用于文件上传和导入操作的请求参数
 */
export interface DataImportRequest {
  file: File;                                    // 上传的文件对象
  equipmentId?: string;                          // 目标设备ID（可选）
  fileFormat?: 'excel' | 'csv';                  // 文件格式
  duplicateStrategy?: 'skip' | 'overwrite';      // 重复数据处理策略
  skipInvalidRows?: boolean;                     // 是否跳过无效行
  remarks?: string;                              // 备注信息
}

/**
 * 导入统计信息
 *
 * 导入操作的统计数据
 */
export interface ImportStatistics {
  dataQualityDistribution: {
    [key in DataQuality]: number;                // 数据质量分布
  };
  equipmentDistribution: Record<string, number>; // 设备分布
  metricTypeDistribution: Record<string, number>; // 指标类型分布
  timeRange: {
    earliest: number;                            // 最早时间戳
    latest: number;                              // 最晚时间戳
  };
  valueRange: {
    min: number;                                 // 最小值
    max: number;                                 // 最大值
    mean: number;                                // 平均值
  };
}

/**
 * 导入预览数据
 *
 * 文件上传后的数据预览
 */
export interface ImportPreviewData {
  headers: string[];                             // 文件表头
  rows: any[][];                                 // 预览数据行（前N行）
  totalRows: number;                             // 文件总行数
  detectedFormat: ImportRecord.fileFormat;       // 检测到的文件格式
}

/**
 * 数据导入状态接口
 *
 * 定义数据导入功能的所有数据状态
 */
export interface ImportState {
  // 核心数据
  /** 导入记录列表 */
  records: ImportRecord[];

  /** 当前选中的导入记录 */
  currentRecord: ImportRecord | null;

  // 状态管理
  /** 是否正在加载数据 */
  loading: boolean;

  /** 是否正在上传文件 */
  uploading: boolean;

  /** 是否正在执行导入 */
  importing: boolean;

  /** 是否正在处理数据 */
  processing: boolean;

  /** 错误信息 */
  error: string | null;

  /** 最后更新时间戳 */
  lastUpdate: number;

  // 文件上传状态
  /** 上传进度百分比 (0-100) */
  uploadProgress: number;

  /** 上传状态 */
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';

  /** 当前正在上传的文件 */
  currentUploadFile: File | null;

  // ===== 新增：当前任务状态（三步走流程） =====
  /**
   * 当前导入任务状态
   *
   * 用于追踪从文件选择到处理完成的完整流程
   */
  currentTask: {
    /** 上传进度 (0-100) */
    uploadProgress: number;
    /** 导入状态：idle(等待) | uploading(上传中) | processing(处理中) | success(成功) | error(失败) */
    importStatus: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
    /** 当前任务 ID（上传成功后由后端返回） */
    taskId: string | null;
    /** 当前文件名 */
    fileName: string | null;
    /** 错误信息（如果失败） */
    errorMessage: string | null;
  };

  // ===== 新增：历史记录状态（遵循 DataQueryPage 模式） =====
  /**
   * 历史导入记录状态
   *
   * 用于查询、筛选、分页显示历史导入任务
   */
  historicalImports: {
    /** 导入记录项目列表 */
    items: ImportRecord[];
    /** 总记录数 */
    total: number;
    /** 当前页码 */
    page: number;
    /** 每页大小 */
    pageSize: number;
    /** 总页数 */
    totalPages: number;
  };

  // ===== 新增：查询状态 =====
  /** 历史记录查询状态 */
  queryStatus: 'idle' | 'loading' | 'success' | 'error';

  /** 查询筛选条件 */
  queryFilters: ImportRecordFilters;

  // ===== 新增：轮询控制 =====
  /** 轮询任务状态的 AbortController（用于取消轮询） */
  pollingAbortController: AbortController | null;

  // 筛选和排序
  /** 筛选条件 */
  filters: ImportRecordFilters;

  /** 排序字段 */
  sortBy: 'uploadTime' | 'status' | 'fileName' | 'fileSize';

  /** 排序方向 */
  sortOrder: 'asc' | 'desc';

  // 分页
  /** 当前页码 */
  page: number;

  /** 每页大小 */
  pageSize: number;

  /** 总记录数 */
  total: number;

  /** 总页数 */
  totalPages: number;

  // 统计数据
  /** 导入统计信息 */
  statistics: ImportStatistics | null;

  // 预览功能
  /** 文件预览数据 */
  previewData: ImportPreviewData | null;

  /** 是否显示预览对话框 */
  showPreview: boolean;
}

/**
 * 数据导入操作接口
 *
 * 定义数据导入功能的所有业务操作
 */
export interface ImportActions {
  // ===== 文件上传操作 =====

  /**
   * 上传文件
   *
   * @param request - 导入请求参数
   * @returns Promise<ImportRecord> - 创建的导入记录
   */
  uploadFile: (request: DataImportRequest) => Promise<ImportRecord>;

  /**
   * 上传文件（带进度回调）
   *
   * @param request - 导入请求参数
   * @param onProgress - 进度回调函数
   * @returns Promise<ImportRecord> - 创建的导入记录
   */
  uploadFileWithProgress: (
    request: DataImportRequest,
    onProgress?: (progress: number) => void
  ) => Promise<ImportRecord>;

  /**
   * 取消当前上传
   */
  cancelUpload: () => void;

  // ===== 新增：三步走流程的完整上传和轮询 =====

  /**
   * 上传文件并开始轮询处理状态（完整流程）
   *
   * 这是"三步走"流程的核心方法，完成从文件上传到处理完成的全流程：
   * 1. 上传文件（uploadFileWithProgress）
   * 2. 上传成功后自动开始轮询处理状态（pollImportStatus）
   * 3. 处理完成后更新最终状态
   *
   * @param request - 导入请求参数
   * @returns Promise<ImportRecord> - 最终的导入记录
   */
  /**
   * 上传文件并立即执行导入（同步一步到位）
   *
   * 这是重构后的核心方法，直接调用后端的 upload-and-import 接口。
   * 不再需要前端轮询，减少网络请求和状态管理的复杂度。
   *
   * @param request - 导入请求参数
   * @returns Promise<ImportRecord> - 最终的导入结果
   */
  uploadAndImportDirectly: (request: DataImportRequest) => Promise<ImportRecord>;

  /**
   * 下载数据导入模板
   *
   * @param format - 模板格式 ('excel' | 'csv' | 'json')
   */
  downloadTemplate: (format: 'excel' | 'csv' | 'json') => Promise<void>;

  /**
   * 重置当前任务状态
   *
   * 清除当前任务的所有状态，准备下一次导入
   */
  resetCurrentTask: () => void;

  // ===== 导入执行操作 =====

  /**
   * 执行导入
   *
   * @param recordId - 导入记录ID
   * @returns Promise<ImportRecord> - 更新后的导入记录
   */
  executeImport: (recordId: string) => Promise<ImportRecord>;

  /**
   * 重试导入
   *
   * @param recordId - 导入记录ID
   * @returns Promise<ImportRecord> - 更新后的导入记录
   */
  retryImport: (recordId: string) => Promise<ImportRecord>;

  /**
   * 取消导入
   *
   * @param recordId - 导入记录ID
   */
  cancelImport: (recordId: string) => Promise<void>;

  /**
   * 下载导入结果（错误报告或执行情况摘要）
   * 
   * @param recordId - 导入记录ID
   */
  downloadImportResult: (recordId: string) => Promise<void>;

  // ===== 新增：历史记录查询操作（遵循 DataQueryPage 模式） =====

  /**
   * 获取历史导入记录列表
   *
   * 遵循 DataQueryPage 的"筛选-分页列表"模式
   *
   * @param page - 页码
   * @param filters - 筛选条件（可选）
   * @returns Promise<void>
   */
  fetchImportHistory: (page?: number, filters?: ImportRecordFilters) => Promise<void>;

  /**
   * 设置查询筛选条件
   *
   * 更新筛选条件并自动重新查询第一页
   *
   * @param filters - 筛选条件
   */
  setQueryFilters: (filters: ImportRecordFilters) => Promise<void>;

  /**
   * 设置查询页码
   *
   * 更新页码并重新查询
   *
   * @param page - 页码
   */
  setQueryPage: (page: number) => Promise<void>;

  // ===== 查询操作 =====

  /**
   * 获取导入记录列表
   *
   * @param params - 查询参数（分页、筛选、排序）
   * @returns Promise<void>
   */
  getRecords: (params?: {
    page?: number;
    pageSize?: number;
    filters?: ImportRecordFilters;
    sortBy?: ImportState['sortBy'];
    sortOrder?: ImportState['sortOrder'];
  }) => Promise<void>;

  /**
   * 获取单条导入记录
   *
   * @param recordId - 导入记录ID
   * @returns Promise<ImportRecord>
   */
  getRecord: (recordId: string) => Promise<ImportRecord>;

  /**
   * 获取统计信息
   *
   * @returns Promise<void>
   */
  getStatistics: () => Promise<void>;

  // ===== 状态管理 =====

  /**
   * 设置加载状态
   *
   * @param loading - 是否加载中
   */
  setLoading: (loading: boolean) => void;

  /**
   * 设置错误信息
   *
   * @param error - 错误消息
   */
  setError: (error: string | null) => void;

  /**
   * 清除错误信息
   */
  clearError: () => void;

  /**
   * 刷新数据（重新加载记录和统计）
   */
  refresh: () => Promise<void>;

  /**
   * 重置Store到初始状态
   */
  reset: () => void;

  // ===== 筛选和排序 =====

  /**
   * 设置筛选条件
   *
   * @param filters - 部分筛选条件
   */
  setFilters: (filters: Partial<ImportRecordFilters>) => void;

  /**
   * 清除筛选条件
   */
  clearFilters: () => void;

  /**
   * 设置排序规则
   *
   * @param sortBy - 排序字段
   * @param sortOrder - 排序方向
   */
  setSorting: (sortBy: ImportState['sortBy'], sortOrder: ImportState['sortOrder']) => void;

  // ===== 分页操作 =====

  /**
   * 跳转到指定页
   *
   * @param page - 目标页码
   */
  goToPage: (page: number) => void;

  /**
   * 下一页
   */
  goToNextPage: () => void;

  /**
   * 上一页
   */
  goToPreviousPage: () => void;

  /**
   * 改变每页大小
   *
   * @param pageSize - 新的每页大小
   */
  changePageSize: (pageSize: number) => void;
}

/**
 * 默认筛选条件
 */
const defaultFilters: ImportRecordFilters = {};

/**
 * 数据导入状态管理 Store
 *
 * 使用 Zustand 实现的响应式状态管理，提供：
 * - 文件上传和进度跟踪
 * - 导入记录的 CRUD 操作
 * - 分页、筛选和排序
 * - 统计信息管理
 */
export const useImportStore = create<ImportState & ImportActions>((set, get) => ({
  // ===== 初始状态 =====

  // 核心数据
  records: [],
  currentRecord: null,

  // 状态管理
  loading: false,
  uploading: false,
  importing: false,
  processing: false,
  error: null,
  lastUpdate: 0,

  // 文件上传状态
  uploadProgress: 0,
  uploadStatus: 'idle',
  currentUploadFile: null,

  // ===== 新增：当前任务状态初始值 =====
  currentTask: {
    uploadProgress: 0,
    importStatus: 'idle',
    taskId: null,
    fileName: null,
    errorMessage: null,
  },

  // ===== 新增：历史记录状态初始值 =====
  historicalImports: {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  },

  // ===== 新增：查询状态初始值 =====
  queryStatus: 'idle',
  queryFilters: {},

  // ===== 新增：轮询控制初始值 =====
  pollingAbortController: null,

  // 筛选和排序
  filters: defaultFilters,
  sortBy: 'uploadTime',
  sortOrder: 'desc',

  // 分页
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,

  // 统计数据
  statistics: null,

  // 预览功能
  previewData: null,
  showPreview: false,

  // ===== Actions 实现 =====

  /**
   * 上传文件
   *
   * 直接调用后端 API: Service.importControllerUploadFile()
   * 返回导入记录和预览数据
   */
  uploadFile: async (request: DataImportRequest): Promise<ImportRecord> => {
    set({ uploading: true, error: null });

    try {
      set({ uploadProgress: 0, uploadStatus: 'uploading', currentUploadFile: request.file });

      // 直接调用后端 API 上传文件
      const response = await Service.importControllerUploadFile({
        file: request.file,
        fileFormat: request.fileFormat || 'excel',
        duplicateStrategy: request.duplicateStrategy || 'skip',
        remarks: request.remarks,
      });

      // 从响应中提取导入记录
      const record = response.importRecord as ImportRecord;

      // 更新本地状态
      set(state => ({
        records: [record, ...state.records],
        total: state.total + 1,
        currentRecord: record,
        uploadProgress: 100,
        uploadStatus: 'success',
        uploading: false,
        lastUpdate: Date.now(),
      }));

      // 2秒后重置上传状态
      setTimeout(() => {
        set({ uploadStatus: 'idle', currentUploadFile: null });
      }, 2000);

      return record;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      set({
        error: errorMessage,
        uploadStatus: 'error',
        uploadProgress: 0,
        uploading: false,
      });
      throw error;
    }
  },

  /**
   * 上传文件（带进度回调）
   *
   * 直接调用后端 API: Service.importControllerUploadFile()
   * 注意：后端 API 不支持原生上传进度，这里使用前端模拟进度
   */
  uploadFileWithProgress: async (
    request: DataImportRequest,
    onProgress?: (progress: number) => void
  ): Promise<ImportRecord> => {
    set({ uploading: true, error: null });

    try {
      set({ uploadProgress: 0, uploadStatus: 'uploading' });

      // 模拟上传进度（因为后端 API 不支持原生上传进度）
      const progressInterval = setInterval(() => {
        const currentProgress = get().uploadProgress;
        if (currentProgress < 90) {
          const newProgress = currentProgress + 10;
          set({ uploadProgress: newProgress });
          onProgress?.(newProgress);
        }
      }, 200);

      // 直接调用后端 API 上传文件
      const response = await Service.importControllerUploadFile({
        file: request.file,
        fileFormat: request.fileFormat || 'excel',
        duplicateStrategy: request.duplicateStrategy || 'skip',
        remarks: request.remarks,
      });

      clearInterval(progressInterval);
      set({ uploadProgress: 100 });
      onProgress?.(100);

      // 从响应中提取导入记录
      const record = response.importRecord as ImportRecord;

      // 更新状态
      set(state => ({
        records: [record, ...state.records],
        total: state.total + 1,
        currentRecord: record,
        uploadStatus: 'success',
        uploading: false,
        lastUpdate: Date.now(),
      }));

      // 2秒后重置上传状态
      setTimeout(() => {
        set({ uploadStatus: 'idle', currentUploadFile: null });
      }, 2000);

      return record;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      set({
        error: errorMessage,
        uploadStatus: 'error',
        uploadProgress: 0,
        uploading: false,
      });
      throw error;
    }
  },

  /**
   * 取消上传
   */
  /**
   * 取消上传
   */
  cancelUpload: () => {
    set({
      uploading: false,
      uploadProgress: 0,
      uploadStatus: 'idle',
      currentUploadFile: null,
      error: '上传已取消',
    });
  },

  /**
   * 上传文件并立即执行导入（同步一步到位）
   */
  uploadAndImportDirectly: async (request: DataImportRequest): Promise<ImportRecord> => {
    try {
      // 1. 设置初始状态
      set({
        uploading: true,
        currentTask: {
          uploadProgress: 0,
          importStatus: 'processing',
          taskId: null,
          fileName: request.file.name,
          errorMessage: null,
        },
        error: null,
      });

      // 2. 调用后端一步式导入接口
      const finalRecord = await Service.importControllerUploadAndImport({
        file: request.file,
        fileFormat: request.fileFormat || 'csv',
        duplicateStrategy: request.duplicateStrategy || 'skip',
        skipInvalidRows: request.skipInvalidRows ?? true,
        remarks: request.remarks,
      });

      // 3. 更新成功后的状态
      set(state => ({
        uploading: false,
        uploadProgress: 100,
        currentTask: {
          ...state.currentTask,
          importStatus: 'success',
          uploadProgress: 100,
          taskId: finalRecord.id,
        },
        // 同时刷新历史记录列表
        historicalImports: {
          ...state.historicalImports,
          items: [finalRecord, ...state.historicalImports.items].slice(0, state.historicalImports.pageSize),
          total: state.historicalImports.total + 1,
        },
      }));

      return finalRecord;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上传并导入失败';
      set(state => ({
        uploading: false,
        currentTask: {
          ...state.currentTask,
          importStatus: 'error',
          errorMessage,
        },
        error: errorMessage,
      }));
      throw error;
    }
  },

  /**
   * 下载导入模板
   */
  downloadTemplate: async (format: 'excel' | 'csv' | 'json'): Promise<void> => {
    try {
      let data = await Service.importControllerDownloadTemplate(format);

      // 确保我们处理的是 Blob 对象
      // 如果后端或请求工具返回的是字符串（通常是 CSV），则将其包装为 Blob
      const blob = data instanceof Blob
        ? data
        : new Blob([data as any], {
          type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
        });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import_template.${format === 'excel' ? 'xlsx' : format}`);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载模板失败:', error);
      throw error;
    }
  },

  /**
   * 停止轮询（已弃用，旧版流程保留占位）
   */
  stopPolling: () => {
    // 轮询已重构为一步式，此方法不再生效
  },

  /**
   * 重置当前任务状态
   */
  resetCurrentTask: () => {
    set({
      currentTask: {
        uploadProgress: 0,
        importStatus: 'idle',
        taskId: null,
        fileName: null,
        errorMessage: null,
      },
      error: null,
    });
  },

  /**
   * 执行导入
   */
  executeImport: async (recordId: string): Promise<ImportRecord> => {
    set({ importing: true, processing: true, error: null });

    try {
      const record = await Service.importControllerExecuteImport({
        importRecordId: recordId,
        skipInvalidRows: true,
        duplicateStrategy: ImportDataDto.duplicateStrategy.SKIP,
      });

      set(state => ({
        records: state.records.map(r => r.id === recordId ? record : r),
        currentRecord: state.currentRecord?.id === recordId ? record : state.currentRecord,
        importing: false,
        processing: false,
        lastUpdate: Date.now(),
      }));

      return record;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入执行失败';
      set({ error: errorMessage, importing: false, processing: false });
      throw error;
    }
  },

  /**
   * 重试导入
   */
  retryImport: async (recordId: string): Promise<ImportRecord> => {
    set({ importing: true, error: null });

    try {
      const record = await Service.importControllerExecuteImport({
        importRecordId: recordId,
        skipInvalidRows: true,
        duplicateStrategy: ImportDataDto.duplicateStrategy.SKIP,
      });

      set(state => ({
        records: state.records.map(r => r.id === recordId ? record : r),
        importing: false,
        lastUpdate: Date.now(),
      }));

      return record;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重试失败';
      set({ error: errorMessage, importing: false });
      throw error;
    }
  },

  /**
   * 取消导入
   */
  /**
   * 取消导入
   */
  cancelImport: async (recordId: string): Promise<void> => {
    set({ importing: true, error: null });

    try {
      await Service.importControllerRemove(recordId);

      set(state => ({
        records: state.records.filter(r => r.id !== recordId),
        importing: false,
        lastUpdate: Date.now(),
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '取消失败';
      set({ error: errorMessage, importing: false });
      throw error;
    }
  },

  /**
   * 下载导入结果
   * 如果有错误，则生成详细的错误 CSV 报告；否则生成简要的执行总结
   */
  downloadImportResult: async (recordId: string): Promise<void> => {
    try {
      // 1. 获取记录详情（确保拿到最新的错误列表）
      const record = await Service.importControllerFindOne(recordId);

      const headers = ['行号', '状态', '错误原因', '原始数据'];
      let csvContent = '\uFEFF'; // UTF-8 BOM，防止 Excel 打开乱码

      // 添加表头
      csvContent += headers.join(',') + '\n';

      // 2. 遍历错误列表添加行
      if (record.errors && record.errors.length > 0) {
        record.errors.forEach(err => {
          const rowData = [
            err.row,
            '失败',
            `"${err.reason.replace(/"/g, '""')}"`, // 转义 CSV 中的引号
            `"${JSON.stringify(err.data).replace(/"/g, '""')}"`
          ];
          csvContent += rowData.join(',') + '\n';
        });
      }

      // 3. 添加执行摘要
      csvContent += '\n\n导入摘要\n';
      csvContent += `文件名,${record.fileName}\n`;
      csvContent += `导入时间,${new Date(record.createdAt).toLocaleString()}\n`;
      csvContent += `总行数,${record.totalRows}\n`;
      csvContent += `成功数,${record.successRows}\n`;
      csvContent += `失败数,${record.failedRows}\n`;
      csvContent += `跳过数,${record.skippedRows}\n`;

      // 4. 触发下载
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `import_result_${record.fileName.split('.')[0]}_${record.id.substring(0, 5)}.csv`);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载导入结果失败:', error);
      throw error;
    }
  },

  /**
   * 获取历史导入记录列表
   */
  fetchImportHistory: async (page = 1, filters = {}): Promise<void> => {
    set({ queryStatus: 'loading' });

    try {
      const state = get();
      const mergedFilters = { ...state.queryFilters, ...filters };

      const response = await Service.importControllerFindAll(
        page,
        state.historicalImports.pageSize,
        mergedFilters.status?.[0],
        mergedFilters.fileFormat?.[0],
        mergedFilters.startTime ? new Date(mergedFilters.startTime).toISOString() : undefined,
        mergedFilters.endTime ? new Date(mergedFilters.endTime).toISOString() : undefined
      );

      const result = (response as any).data || response;

      set({
        historicalImports: {
          items: result.items || [],
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages,
        },
        queryStatus: 'success',
        queryFilters: mergedFilters,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取历史记录失败';
      set({
        queryStatus: 'error',
        error: errorMessage,
      });
      throw error;
    }
  },

  /**
   * 设置查询筛选条件
   */
  setQueryFilters: async (filters: ImportRecordFilters): Promise<void> => {
    set({ queryFilters: filters });
    await get().fetchImportHistory(1, filters);
  },

  /**
   * 设置查询页码
   */
  setQueryPage: async (page: number): Promise<void> => {
    const state = get();
    if (page < 1 || page > state.historicalImports.totalPages) {
      return;
    }
    await get().fetchImportHistory(page, state.queryFilters);
  },

  /**
   * 获取导入记录列表
   */
  getRecords: async (params = {}): Promise<void> => {
    set({ loading: true, error: null });

    try {
      const state = get();

      const page = params.page ?? state.page;
      const pageSize = params.pageSize ?? state.pageSize;
      const filters = params.filters ?? state.filters;

      const response = await Service.importControllerFindAll(
        page,
        pageSize,
        filters.status?.[0],
        filters.fileFormat?.[0],
        filters.startTime ? new Date(filters.startTime).toISOString() : undefined,
        filters.endTime ? new Date(filters.endTime).toISOString() : undefined
      );

      const result = (response as any).data || response;

      set(state => ({
        records: result.items || [],
        total: result.total || 0,
        page: result.page || page,
        pageSize: result.pageSize || pageSize,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / pageSize),
        loading: false,
        lastUpdate: Date.now(),
        filters: params.filters !== undefined ? { ...state.filters, ...params.filters } : state.filters,
        sortBy: params.sortBy !== undefined ? params.sortBy : state.sortBy,
        sortOrder: params.sortOrder !== undefined ? params.sortOrder : state.sortOrder,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取记录失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 获取单条导入记录
   */
  getRecord: async (recordId: string): Promise<ImportRecord> => {
    set({ loading: true, error: null });

    try {
      const record = await Service.importControllerFindOne(recordId);
      set({ currentRecord: record, loading: false, lastUpdate: Date.now() });
      return record;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取记录失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 获取统计信息
   */
  getStatistics: async (): Promise<void> => {
    set({ loading: true, error: null });

    try {
      const mockStatistics: ImportStatistics = {
        dataQualityDistribution: {
          [DataQuality.NORMAL]: 0,
          [DataQuality.ABNORMAL]: 0,
          [DataQuality.SUSPICIOUS]: 0,
        },
        equipmentDistribution: {},
        metricTypeDistribution: {},
        timeRange: {
          earliest: Date.now() - 86400000,
          latest: Date.now(),
        },
        valueRange: {
          min: 0,
          max: 100,
          mean: 50,
        },
      };

      set({ statistics: mockStatistics, loading: false, lastUpdate: Date.now() });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取统计失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 设置加载状态
   */
  setLoading: (loading: boolean) => {
    set({ loading });
  },

  /**
   * 设置错误信息
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 刷新数据
   */
  refresh: async (): Promise<void> => {
    const state = get();
    await Promise.all([
      get().getRecords({ page: state.page, pageSize: state.pageSize, filters: state.filters }),
      get().getStatistics(),
    ]);
  },

  /**
   * 重置Store
   */
  reset: () => {
    set({
      records: [],
      currentRecord: null,
      loading: false,
      uploading: false,
      importing: false,
      processing: false,
      error: null,
      lastUpdate: 0,
      uploadProgress: 0,
      uploadStatus: 'idle',
      currentUploadFile: null,
      currentTask: {
        uploadProgress: 0,
        importStatus: 'idle',
        taskId: null,
        fileName: null,
        errorMessage: null,
      },
      historicalImports: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      },
      queryStatus: 'idle',
      queryFilters: {},
      pollingAbortController: null,
      filters: defaultFilters,
      sortBy: 'uploadTime',
      sortOrder: 'desc',
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
      statistics: null,
      previewData: null,
      showPreview: false,
    });
  },

  /**
   * 设置筛选条件
   */
  setFilters: (filters: Partial<ImportRecordFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    }));
  },

  /**
   * 清除筛选条件
   */
  clearFilters: () => {
    set({ filters: defaultFilters, page: 1 });
  },

  /**
   * 设置排序规则
   */
  setSorting: (sortBy: ImportState['sortBy'], sortOrder: ImportState['sortOrder']) => {
    set({ sortBy, sortOrder, page: 1 });
  },

  /**
   * 跳转到指定页
   */
  goToPage: (page: number) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) {
      set({ page });
    }
  },

  /**
   * 下一页
   */
  goToNextPage: () => {
    const { page, totalPages } = get();
    if (page < totalPages) {
      set({ page: page + 1 });
    }
  },

  /**
   * 上一页
   */
  goToPreviousPage: () => {
    const { page } = get();
    if (page > 1) {
      set({ page: page - 1 });
    }
  },

  /**
   * 改变每页大小
   */
  changePageSize: (pageSize: number) => {
    set(state => ({
      pageSize,
      page: 1,
      totalPages: Math.ceil(state.total / pageSize),
    }));
  },
}));

/**
 * Import Store Selector 导出
 *
 * 提供常用状态的 Selector 函数，支持组件精确订阅状态片段，
 * 避免不必要的重渲染
 */
export const useImportSelector = {
  /** 导入记录列表 */
  records: (state: ImportState & ImportActions) => state.records,

  /** 当前记录 */
  currentRecord: (state: ImportState & ImportActions) => state.currentRecord,

  /** 加载状态 */
  loading: (state: ImportState & ImportActions) => state.loading,

  /** 上传进度 */
  uploadProgress: (state: ImportState & ImportActions) => state.uploadProgress,

  /** 上传状态 */
  uploadStatus: (state: ImportState & ImportActions) => state.uploadStatus,

  /** 分页信息 */
  pagination: (state: ImportState & ImportActions) => ({
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    totalPages: state.totalPages,
  }),

  /** 筛选条件 */
  filters: (state: ImportState & ImportActions) => state.filters,

  /** 统计信息 */
  statistics: (state: ImportState & ImportActions) => state.statistics,
};

/**
 * 兼容旧的 Hook（向后兼容）
 *
 * 提供与原 class-based store 兼容的导出方式
 */
export const useImport = () => {
  const store = useImportStore();

  return {
    ...store,

    // 计算属性（兼容旧代码）
    latestRecord: store.records[0] || null,

    recordsByStatus: {
      pending: store.records.filter(r => r.status === 'pending'),
      processing: store.records.filter(r => r.status === 'processing'),
      completed: store.records.filter(r => r.status === 'completed'),
      partial: store.records.filter(r => r.status === 'partial'),
      failed: store.records.filter(r => r.status === 'failed'),
    },

    successRate: (() => {
      if (store.records.length === 0) return 0;
      const totalRows = store.records.reduce((sum, r) => sum + r.totalRows, 0);
      const successRows = store.records.reduce((sum, r) => sum + r.successRows, 0);
      return totalRows > 0 ? (successRows / totalRows) * 100 : 0;
    })(),

    hasNextPage: store.page < store.totalPages,
    hasPreviousPage: store.page > 1,

    isUploading: store.uploading || store.uploadStatus === 'uploading',
    isProcessing: store.processing || store.importing,
  };
};

/**
 * 默认导出（向后兼容）
 */
export default useImportStore;
