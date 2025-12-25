# 数据导入页面重构 - 技术设计文档

## 概述

本文档详细说明 DataImportPage 重构的技术设计，包括架构设计、组件设计、状态管理、数据流设计等。

## 目录

- [架构概览](#架构概览)
- [组件设计](#组件设计)
- [状态管理设计](#状态管理设计)
- [服务层设计](#服务层设计)
- [数据流设计](#数据流设计)
- [API 设计](#api-设计)
- [类型定义](#类型定义)
- [错误处理](#错误处理)
- [性能优化](#性能优化)

---

## 架构概览

### 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           DataImportPage (主页面组件)                 │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐  │   │
│  │  │FileUpload   │ │ImportStatus │ │ImportHistory │  │   │
│  │  │Zone         │ │Indicator    │ │Table         │  │   │
│  │  └─────────────┘ └─────────────┘ └──────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   State Management (Zustand)                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  import-store.ts                     │   │
│  │  • currentTask (上传和处理状态)                       │   │
│  │  • historicalImports (历史记录列表)                   │   │
│  │  • queryStatus (查询状态)                            │   │
│  │  • queryFilters (筛选条件)                           │   │
│  │  • actions (uploadFile, pollStatus, fetchHistory)   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                import-service.ts                     │   │
│  │  • uploadFileWithProgress()                          │   │
│  │  • pollImportStatus()                                │   │
│  │  • getImportRecords()                                │   │
│  │  • executeImport()                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     API Client                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  api-client.ts                       │   │
│  │  • POST /api/imports/upload                          │   │
│  │  • GET  /api/imports/status/{taskId}                 │   │
│  │  • GET  /api/imports                                 │   │
│  │  • POST /api/imports/execute                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心原则

1. **单向数据流**：UI → Action → Service → API → Store → UI
2. **职责分离**：
   - UI 层：展示和用户交互
   - Store 层：状态管理和业务编排
   - Service 层：API 调用和数据转换
   - API Client 层：HTTP 请求封装
3. **模式复用**：历史记录查询完全遵循 DataQueryPage 的"筛选-分页列表"模式

---

## 组件设计

### 组件层级结构

```
DataImportPage
├── PageHeader (页面标题和统计)
├── Section 1: 文件选择与上传
│   ├── FileUploadZone
│   │   ├── DragDropArea
│   │   ├── FileSelector
│   │   └── FileInfo
│   └── UploadButton
├── Section 2: 上传与处理状态
│   ├── ImportStatusIndicator
│   │   ├── StatusIcon (根据状态变化)
│   │   ├── StatusText
│   │   └── ProgressBar (上传中时显示)
│   └── ProcessingSpinner (处理中时显示)
├── Section 3: 导入历史
│   ├── FilterBar
│   │   ├── FileNameSearch
│   │   ├── StatusFilter
│   │   └── DateRangePicker (可选)
│   ├── ImportHistoryTable
│   │   ├── TableHeader
│   │   ├── TableBody
│   │   │   └── ImportRecordRow (循环)
│   │   │       ├── TaskInfo
│   │   │       ├── StatusBadge
│   │   │       ├── ProgressBar
│   │   │       └── ActionButtons
│   │   └── EmptyState
│   └── Pagination
└── Dialogs
    ├── ImportDetailDialog (查看详情)
    └── ErrorReportDialog (错误报告)
```

### 核心组件详细设计

#### 1. FileUploadZone 组件

**职责**：文件选择和拖放功能

**Props**:
```typescript
interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  disabled?: boolean;
}
```

**状态**:
```typescript
interface FileUploadZoneState {
  dragActive: boolean;
  selectedFile: File | null;
  validationError: string | null;
}
```

**功能**:
- 支持拖拽和点击选择文件
- 文件类型验证（CSV, Excel）
- 文件大小验证（最大 50MB）
- 拖拽激活状态的视觉反馈
- 显示已选文件的信息

**视觉设计**:
```
┌─────────────────────────────────────────────────┐
│                                                 │
│           [CloudUpload Icon]                    │
│                                                 │
│        将文件拖放到此处或点击选择                  │
│                                                 │
│     支持格式: CSV, Excel (最大 50MB)             │
│                                                 │
│          [选择文件按钮]                           │
│                                                 │
│  (已选文件: filename.csv, 2.5MB)                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

#### 2. ImportStatusIndicator 组件

**职责**：展示当前导入任务的状态

**Props**:
```typescript
interface ImportStatusIndicatorProps {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  progress?: number;
  fileName?: string;
  errorMessage?: string;
}
```

**状态映射**:
```typescript
const statusConfig = {
  idle: {
    icon: Clock,
    text: '等待上传',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20'
  },
  uploading: {
    icon: Upload,
    text: (progress) => `上传中 (${progress}%)`,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    showProgress: true
  },
  processing: {
    icon: Spinner,
    text: '处理中',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    animated: true
  },
  success: {
    icon: CheckCircle,
    text: '导入成功',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  error: {
    icon: AlertCircle,
    text: '导入失败',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    showError: true
  }
};
```

**视觉设计**:
```
┌─────────────────────────────────────────────────┐
│  [Icon]  状态文本                                │
│                                                 │
│  (如果是上传中，显示进度条)                        │
│  ████████████████░░░░░░░░░░  68%                │
│                                                 │
│  (如果是错误，显示错误信息)                        │
│  错误: 文件格式不正确                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

#### 3. ImportHistoryTable 组件

**职责**：展示导入历史记录列表

**Props**:
```typescript
interface ImportHistoryTableProps {
  records: ImportRecord[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onViewDetails: (recordId: string) => void;
  onRetry: (recordId: string) => void;
  onDownload: (recordId: string) => void;
}
```

**表格列定义**:
```typescript
const columns = [
  {
    key: 'fileName',
    label: '文件名称',
    render: (record) => (
      <div>
        <FileText icon />
        <span>{record.fileName}</span>
        <span className="text-xs">{formatFileSize(record.fileSize)}</span>
      </div>
    )
  },
  {
    key: 'status',
    label: '状态',
    render: (record) => <StatusBadge status={record.status} />
  },
  {
    key: 'progress',
    label: '进度',
    render: (record) => (
      <div>
        <Progress value={calculateProgress(record)} />
        <span>{calculateProgress(record)}%</span>
      </div>
    )
  },
  {
    key: 'rows',
    label: '成功/总数',
    render: (record) => `${record.successRows}/${record.totalRows}`
  },
  {
    key: 'createdAt',
    label: '上传时间',
    render: (record) => formatDate(record.createdAt)
  },
  {
    key: 'actions',
    label: '操作',
    render: (record) => <ActionButtons record={record} />
  }
];
```

**筛选和排序**:
```typescript
interface FilterBarState {
  fileName: string;
  status: ImportStatus[];
  dateRange?: { from: Date; to: Date };
}

interface SortState {
  sortBy: 'createdAt' | 'status' | 'fileName';
  sortOrder: 'asc' | 'desc';
}
```

---

## 状态管理设计

### import-store.ts 完整状态定义

```typescript
interface ImportState {
  // ===== 当前任务状态 =====
  currentTask: {
    // 上传进度 (0-100)
    uploadProgress: number;

    // 导入状态
    importStatus: 'idle' | 'uploading' | 'processing' | 'success' | 'error';

    // 当前任务 ID
    taskId: string | null;

    // 当前文件名
    fileName: string | null;

    // 文件大小
    fileSize: number | null;

    // 错误信息
    errorMessage: string | null;

    // 开始时间
    startTime: number | null;

    // 完成时间
    endTime: number | null;
  };

  // ===== 历史记录状态（遵循 DataQueryPage 模式）=====
  historicalImports: {
    // 导入记录列表
    items: ImportRecord[];

    // 总记录数
    total: number;

    // 当前页码（从 1 开始）
    page: number;

    // 每页大小
    pageSize: number;

    // 总页数
    totalPages: number;
  };

  // ===== 查询状态 =====
  queryStatus: 'idle' | 'loading' | 'success' | 'error';

  queryError: string | null;

  queryFilters: ImportRecordFilters;

  // ===== 轮询控制 =====
  pollingAbortController: AbortController | null;

  pollingInterval: number;  // 轮询间隔（毫秒）

  // ===== 通用加载状态 =====
  loading: boolean;

  error: string | null;

  lastUpdate: number;
}
```

### Actions 设计

```typescript
interface ImportActions {
  // ===== 文件上传相关 =====

  /**
   * 上传文件（带进度）
   */
  uploadFileWithProgress: (
    request: DataImportRequest,
    onProgress?: (progress: number) => void
  ) => Promise<ImportRecord>;

  /**
   * 重置当前任务
   */
  resetCurrentTask: () => void;

  // ===== 状态轮询相关 =====

  /**
   * 轮询导入状态
   */
  pollImportStatus: (
    taskId: string,
    interval?: number
  ) => Promise<void>;

  /**
   * 停止轮询
   */
  stopPolling: () => void;

  // ===== 历史记录查询相关（遵循 DataQueryPage 模式）=====

  /**
   * 获取历史导入记录
   */
  fetchImportHistory: (
    page: number,
    filters?: ImportRecordFilters
  ) => Promise<void>;

  /**
   * 设置筛选条件
   */
  setQueryFilters: (filters: ImportRecordFilters) => void;

  /**
   * 设置查询页码
   */
  setQueryPage: (page: number) => void;

  /**
   * 重置查询状态
   */
  resetQueryStatus: () => void;

  // ===== 导入操作相关 =====

  /**
   * 执行导入
   */
  executeImport: (recordId: string) => Promise<ImportRecord>;

  /**
   * 重试导入
   */
  retryImport: (recordId: string) => Promise<ImportRecord>;

  /**
   * 取消导入
   */
  cancelImport: (recordId: string) => Promise<void>;

  // ===== 通用方法 =====

  /**
   * 刷新数据
   */
  refresh: () => Promise<void>;

  /**
   * 设置错误
   */
  setError: (error: string | null) => void;

  /**
   * 清除错误
   */
  clearError: () => void;
}
```

---

## 服务层设计

### import-service.ts 方法设计

#### 1. uploadFileWithProgress

**签名**:
```typescript
async uploadFileWithProgress(
  request: DataImportRequest,
  onProgress?: (progress: number) => void
): Promise<ImportRecord>
```

**实现要点**:
```typescript
async uploadFileWithProgress(request, onProgress) {
  // 1. 创建 FormData
  const formData = new FormData();
  formData.append('file', request.file);
  formData.append('equipmentId', request.equipmentId || '');
  formData.append('options', JSON.stringify(request.options));
  formData.append('mapping', JSON.stringify(request.mapping));

  // 2. 使用支持进度的方式发送请求
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    // 监听完成
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const record = JSON.parse(xhr.responseText);
        resolve(record);
      } else {
        reject(new Error('上传失败'));
      }
    });

    // 监听错误
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误'));
    });

    // 发送请求
    xhr.open('POST', '/api/imports/upload');
    xhr.send(formData);
  });
}
```

---

#### 2. pollImportStatus（新增方法）

**签名**:
```typescript
async pollImportStatus(
  taskId: string,
  onUpdate?: (status: ImportStatus) => void,
  interval: number = 2000
): Promise<ImportRecord>
```

**实现要点**:
```typescript
async pollImportStatus(taskId, onUpdate, interval = 2000) {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        // 1. 请求任务状态
        const response = await apiClient.get<ImportRecord>(
          `/api/imports/status/${taskId}`
        );
        const record = response.data;

        // 2. 调用更新回调
        if (onUpdate) {
          onUpdate(record.status);
        }

        // 3. 检查是否完成
        if (record.status === ImportStatus.COMPLETED ||
            record.status === ImportStatus.FAILED) {
          resolve(record);
          return;
        }

        // 4. 继续轮询
        setTimeout(poll, interval);
      } catch (error) {
        reject(error);
      }
    };

    // 开始轮询
    poll();
  });
}
```

**支持取消的版本**:
```typescript
pollImportStatus(taskId, onUpdate, interval, abortSignal) {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      // 检查是否取消
      if (abortSignal?.aborted) {
        reject(new Error('Polling aborted'));
        return;
      }

      try {
        const response = await apiClient.get<ImportRecord>(
          `/api/imports/status/${taskId}`,
          { signal: abortSignal }
        );
        const record = response.data;

        if (onUpdate) {
          onUpdate(record.status);
        }

        if (record.status === ImportStatus.COMPLETED ||
            record.status === ImportStatus.FAILED) {
          resolve(record);
          return;
        }

        timeoutId = setTimeout(poll, interval);
      } catch (error) {
        if (error.name === 'AbortError') {
          reject(new Error('Polling aborted'));
        } else {
          reject(error);
        }
      }
    };

    poll();

    // 注册取消处理
    abortSignal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  });
}
```

---

## 数据流设计

### 完整的导入流程

```
┌──────────────┐
│ 1. 用户选择文件 │
└──────┬───────┘
       ↓
┌──────────────────────────────────────┐
│ 2. 点击"开始上传"按钮                  │
│    - UI 触发 uploadFileWithProgress   │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 3. Store Action: uploadFileWithProgress│
│    - 调用 service.uploadFileWithProgress│
│    - 更新 importStatus = 'uploading'    │
│    - 更新 uploadProgress (0→100)        │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 4. Service: uploadFileWithProgress    │
│    - 创建 FormData                     │
│    - 使用 XMLHttpRequest 发送          │
│    - 监听 upload.progress 事件         │
│    - 调用 onProgress 回调              │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 5. 上传完成                            │
│    - Service 返回 ImportRecord        │
│    - Store 保存 taskId                │
│    - 更新 importStatus = 'processing'  │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 6. Store Action: pollImportStatus    │
│    - 调用 service.pollImportStatus    │
│    - 传入 taskId 和 onUpdate 回调     │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 7. Service: pollImportStatus         │
│    - 每 2 秒请求 GET /api/imports/status/{taskId}│
│    - 调用 onUpdate 回调更新 store     │
│    - 检查是否完成                      │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 8. 处理完成                            │
│    - Service 返回最终 ImportRecord    │
│    - Store 更新 importStatus = 'success'/'error'│
│    - 刷新历史记录列表                  │
│    - 显示成功/失败提示                 │
└──────────────────────────────────────┘
```

### 历史记录查询流程（遵循 DataQueryPage 模式）

```
┌──────────────┐
│ 1. 页面加载    │
│    或用户操作  │
└──────┬───────┘
       ↓
┌──────────────────────────────────────┐
│ 2. Store Action: fetchImportHistory  │
│    - 更新 queryStatus = 'loading'     │
│    - 调用 service.getImportRecords    │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 3. Service: getImportRecords         │
│    - 构建查询参数（page, filters）     │
│    - 调用 GET /api/imports            │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 4. 接收响应                            │
│    - 更新 historicalImports.items     │
│    - 更新分页信息（total, page等）     │
│    - 更新 queryStatus = 'success'     │
└──────┬───────────────────────────────┘
       ↓
┌──────────────────────────────────────┐
│ 5. UI 响应                             │
│    - 表格重新渲染                      │
│    - 分页组件更新                      │
└──────────────────────────────────────┘
```

---

## API 设计

### 1. 文件上传

**端点**: `POST /api/imports/upload`

**请求**:
```typescript
Content-Type: multipart/form-data

FormData:
- file: File
- equipmentId: string (可选)
- options: JSON string
- mapping: JSON string
```

**响应**:
```typescript
{
  "id": "import-123",
  "fileName": "data.csv",
  "fileSize": 2048576,
  "fileFormat": "csv",
  "status": "pending",
  "totalRows": 0,
  "successRows": 0,
  "failedRows": 0,
  "createdAt": 1702550400000,
  "importedBy": "user-001"
}
```

---

### 2. 查询导入状态（新增）

**端点**: `GET /api/imports/status/{taskId}`

**请求**:
```
GET /api/imports/status/import-123
```

**响应**:
```typescript
{
  "id": "import-123",
  "fileName": "data.csv",
  "status": "processing",  // pending | processing | completed | failed
  "totalRows": 1000,
  "successRows": 680,
  "failedRows": 20,
  "progress": 70,  // 处理进度 0-100
  "estimatedTimeRemaining": 5000,  // 毫秒
  "errors": [...]  // 如果有错误
}
```

---

### 3. 获取导入历史

**端点**: `GET /api/imports`

**请求**:
```
GET /api/imports?page=1&pageSize=20&fileName=data&status=completed
```

**响应**:
```typescript
{
  "items": [ImportRecord[]],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

---

## 类型定义

```typescript
/**
 * 导入状态枚举
 */
enum ImportStatus {
  PENDING = 'pending',       // 待处理
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed',   // 已完成
  PARTIAL = 'partial',       // 部分完成
  FAILED = 'failed'          // 失败
}

/**
 * 导入记录
 */
interface ImportRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileFormat: FileFormat;
  status: ImportStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  progress?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  importedBy: string;
  equipmentId?: string;
  errors?: ImportError[];
}

/**
 * 导入错误
 */
interface ImportError {
  rowNumber: number;
  fieldName: string;
  value: any;
  reason: string;
}

/**
 * 导入记录筛选条件
 */
interface ImportRecordFilters {
  fileName?: string;
  status?: ImportStatus[];
  importedBy?: string;
  dateRange?: {
    from: number;
    to: number;
  };
}

/**
 * 数据导入请求
 */
interface DataImportRequest {
  file: File;
  equipmentId?: string;
  options: ImportOptions;
  mapping: FieldMapping;
}

/**
 * 导入选项
 */
interface ImportOptions {
  skipHeader: boolean;
  treatFirstRowAsHeader: boolean;
  delimiter: string;
  encoding: string;
  timezone: string;
  dateFormat: string;
  duplicateHandling: DuplicateHandling;
  batchSize: number;
  rollbackOnError: boolean;
}

/**
 * 字段映射
 */
interface FieldMapping {
  sourceColumns: SourceColumn[];
  transformations?: Transformation[];
  validations?: Validation[];
}

/**
 * 源列定义
 */
interface SourceColumn {
  sourceColumn: string;
  targetField: string;
  required: boolean;
  defaultValue?: any;
}
```

---

## 错误处理

### 错误类型

```typescript
/**
 * 导入错误类型
 */
enum ImportErrorType {
  NETWORK_ERROR = 'network_error',
  FILE_TOO_LARGE = 'file_too_large',
  INVALID_FILE_TYPE = 'invalid_file_type',
  UPLOAD_FAILED = 'upload_failed',
  PROCESSING_FAILED = 'processing_failed',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * 导入异常类
 */
class ImportError extends Error {
  constructor(
    public type: ImportErrorType,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ImportError';
  }
}
```

### 错误处理策略

```typescript
// Store Action 中的错误处理
async uploadFileWithProgress(request, onProgress) {
  try {
    // 调用 service
    const record = await importService.uploadFileWithProgress(request, onProgress);

    // 成功处理
    set((state) => ({
      currentTask: {
        ...state.currentTask,
        taskId: record.id,
        importStatus: 'processing'
      }
    }));

    return record;
  } catch (error) {
    // 错误处理
    let errorMessage = '文件上传失败';
    let errorType = ImportErrorType.UNKNOWN;

    if (error instanceof ImportError) {
      errorMessage = error.message;
      errorType = error.type;
    } else if (error.response) {
      // HTTP 错误
      errorMessage = error.response.data?.message || '服务器错误';
      errorType = ImportErrorType.UPLOAD_FAILED;
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接失败';
      errorType = ImportErrorType.NETWORK_ERROR;
    }

    // 更新状态
    set((state) => ({
      currentTask: {
        ...state.currentTask,
        importStatus: 'error',
        errorMessage
      },
      error: errorMessage
    }));

    // 显示错误提示
    toast.error(errorMessage);

    // 重新抛出错误（如果需要）
    throw new ImportError(errorType, errorMessage, error);
  }
}
```

---

## 性能优化

### 1. 组件优化

```typescript
// 使用 React.memo 优化组件渲染
export const ImportStatusIndicator = React.memo<ImportStatusIndicatorProps>(
  ({ status, progress, fileName, errorMessage }) => {
    // 组件实现
  },
  // 自定义比较函数
  (prevProps, nextProps) => {
    return (
      prevProps.status === nextProps.status &&
      prevProps.progress === nextProps.progress &&
      prevProps.fileName === nextProps.fileName &&
      prevProps.errorMessage === nextProps.errorMessage
    );
  }
);
```

### 2. 轮询优化

```typescript
// 合理的轮询间隔
const POLLING_INTERVAL = 2000; // 2 秒

// 任务完成后立即停止轮询
if (record.status === ImportStatus.COMPLETED ||
    record.status === ImportStatus.FAILED) {
  stopPolling();
  resolve(record);
  return;
}

// 添加超时机制
const POLLING_TIMEOUT = 60000; // 60 秒
const startTime = Date.now();

if (Date.now() - startTime > POLLING_TIMEOUT) {
  stopPolling();
  reject(new Error('轮询超时'));
  return;
}
```

### 3. 列表渲染优化

```typescript
// 使用虚拟滚动（如果记录数量很大）
import { FixedSizeList } from 'react-window';

// 或者使用分页限制一次渲染的数量
const DEFAULT_PAGE_SIZE = 20;
```

### 4. 防抖和节流

```typescript
// 搜索输入使用防抖
import { debounce } from 'lodash';

const handleSearchChange = useCallback(
  debounce((value: string) => {
    setQueryFilters({ fileName: value });
  }, 300),
  []
);
```

---

## 安全考虑

### 1. 文件上传安全

```typescript
// 文件类型验证
const ALLOWED_FILE_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// 文件大小限制
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// 文件名验证
const isValidFileName = (fileName: string): boolean => {
  // 防止路径遍历攻击
  return !fileName.includes('..') && !fileName.includes('/');
};
```

### 2. XSS 防护

```typescript
// 使用 DOMPurify 清理用户输入
import DOMPurify from 'dompurify';

const sanitizedFileName = DOMPurify.sanitize(fileName);
```

### 3. CSRF 防护

```typescript
// api-client 自动添加 CSRF token
apiClient.interceptors.request.use((config) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});
```

---

## 测试策略

### 1. 单元测试

```typescript
// ImportStatusIndicator 组件测试
describe('ImportStatusIndicator', () => {
  it('应该正确显示 idle 状态', () => {
    render(<ImportStatusIndicator status="idle" />);
    expect(screen.getByText('等待上传')).toBeInTheDocument();
  });

  it('应该正确显示上传进度', () => {
    render(<ImportStatusIndicator status="uploading" progress={50} />);
    expect(screen.getByText('上传中 (50%)')).toBeInTheDocument();
  });
});
```

### 2. 集成测试

```typescript
// 完整导入流程测试
describe('Import Flow', () => {
  it('应该完成文件上传并轮询状态', async () => {
    // 1. 选择文件
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });

    // 2. 上传文件
    const record = await uploadFileWithProgress({ file });

    // 3. 轮询状态
    const finalRecord = await pollImportStatus(record.id);

    // 4. 验证结果
    expect(finalRecord.status).toBe(ImportStatus.COMPLETED);
  });
});
```

---

## 总结

本设计文档详细说明了 DataImportPage 重构的技术实现，核心要点：

1. **清晰的"三步走"布局**：文件选择 → 上传处理 → 导入历史
2. **完善的状态管理**：使用 Zustand 管理上传、处理、历史记录等状态
3. **轮询机制**：通过 pollImportStatus 实时追踪后端处理状态
4. **模式复用**：历史记录查询完全遵循 DataQueryPage 的"筛选-分页列表"模式
5. **严格的架构分层**：UI → Store → Service → API Client → Backend
6. **完善的错误处理**：统一的错误类型和处理策略
7. **性能优化**：组件优化、轮询优化、列表渲染优化

---

**文档创建日期**: 2025-12-14
**最后更新**: 2025-12-14
**维护者**: AI Assistant
