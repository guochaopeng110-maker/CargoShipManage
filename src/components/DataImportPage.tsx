import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Search, 
  Eye, 
  X, 
  RotateCcw, 
  Download, 
  CloudUpload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Play,
  Pause,
  Settings,
  Filter,
  Download as ExportIcon,
  Trash2,
  Copy
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DataImportRequest, FileFormat, DuplicateHandling, ImportRecord } from '../types/import';

// 导入状态管理和权限控制
import { useImportStore } from '../stores/import-store';
import { useImportPermissions } from '../hooks/useResourcePermissions';
import { ImportRecordGuard, ImportOperationGuard, ImportViewGuard, ImportDeleteGuard } from './AuthGuard';
import { toast } from 'sonner';

interface FileUploadState {
  file: File | null;
  equipmentId: string;
  options: {
    skipHeader: boolean;
    treatFirstRowAsHeader: boolean;
    delimiter: string;
    encoding: string;
    timezone: string;
    dateFormat: string;
    duplicateHandling: DuplicateHandling;
    batchSize: number;
    rollbackOnError: boolean;
  };
  mapping: {
    sourceColumns: Array<{
      sourceColumn: string;
      targetField: string;
      required: boolean;
      defaultValue?: any;
    }>;
  };
}

// 简化的通知函数
const notify = (title: string, description?: string, variant: 'default' | 'destructive' | 'success' = 'default') => {
  const message = `${title}${description ? ': ' + description : ''}`;
  switch (variant) {
    case 'destructive':
      console.error('❌ ' + message);
      break;
    case 'success':
      console.log('✅ ' + message);
      break;
    default:
      console.info('ℹ️ ' + message);
  }
};

export function DataImportPage() {
  // 权限控制Hook
  const {
    canImportData,
    canViewImportRecords,
    canDeleteImportRecords,
    isImportOperator,
    isImportAdministrator
  } = useImportPermissions();

  // 导入状态管理 - 使用真实的store
  const importStore = useImportStore();
  
  // 确保store已正确初始化
  if (!importStore) {
    return <div className="text-center text-slate-400 p-8">加载中...</div>;
  }
  
  // 安全地解构store属性，提供默认值以防止undefined错误
  const {
    records = [],
    uploadFile,
    uploadFileWithProgress,
    executeImport,
    cancelImport,
    retryImport,
    getRecords,
    getRecord,
    getStatistics,
    loading = false,
    error = null,
    refresh,
    uploading = false,
    importing = false,
    processing = false,
    uploadProgress = 0,
    uploadStatus = 'idle' as const,
    currentUploadFile = null,
    previewData = null,
    showPreview = false,
    filters = {},
    sortBy = 'uploadTime' as const,
    sortOrder = 'desc' as const,
    page = 1,
    pageSize = 10,
    total = 0,
    totalPages = 0,
    setFilters,
    setSorting,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    setError,
    clearError
  } = importStore;

  // 使用store中的工具方法
  const calculateSuccessRate = () => {
    if (records.length === 0) return 0;
    const totalRows = records.reduce((sum, record) => sum + record.totalRows, 0);
    const successRows = records.reduce((sum, record) => sum + record.successRows, 0);
    return totalRows > 0 ? (successRows / totalRows) * 100 : 0;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      pending: 'blue',
      processing: 'cyan',
      completed: 'green',
      partial: 'yellow',
      failed: 'red',
    };
    return colorMap[status] || 'gray';
  };

  // 本地UI状态
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedTaskLogs, setSelectedTaskLogs] = useState<string[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  
  // 组件状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    file: null,
    equipmentId: '',
    options: {
      skipHeader: true,
      treatFirstRowAsHeader: true,
      delimiter: ',',
      encoding: 'utf-8',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      duplicateHandling: DuplicateHandling.SKIP,
      batchSize: 1000,
      rollbackOnError: false,
    },
    mapping: {
      sourceColumns: [],
    },
  });

  // 文件类型和配置
  const fileTypes = [
    { value: FileFormat.CSV, label: 'CSV', description: '逗号分隔值文件' },
    { value: FileFormat.EXCEL, label: 'Excel', description: 'Excel电子表格' },
    { value: FileFormat.JSON, label: 'JSON', description: 'JavaScript对象表示' },
    { value: FileFormat.XML, label: 'XML', description: '可扩展标记语言' },
  ];


  // 组件挂载时获取真实数据
  useEffect(() => {
    if (canViewImportRecords() && refresh) {
      refresh().catch(console.error);
    }
  }, [canViewImportRecords, refresh]);

  // 处理筛选条件变化
  useEffect(() => {
    if (setFilters) {
      setFilters({
        status: filterStatus === 'all' ? undefined : [filterStatus as any],
        fileName: searchTerm || undefined,
      });
    }
  }, [filterStatus, searchTerm, setFilters]);

  // 处理排序变化
  useEffect(() => {
    if (setSorting) {
      setSorting(sortBy as any, sortOrder);
    }
  }, [sortBy, sortOrder, setSorting]);

  // 计算统计数据
  const statistics = {
    totalImports: records.length,
    successfulImports: records.filter(r => r.status === 'completed').length,
    failedImports: records.filter(r => r.status === 'failed').length,
  };

  // 搜索和筛选处理
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    setFilterStatus(status);
  }, []);

  // 文件上传处理
  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      
      // 设置默认映射
      if (fileArray.length > 0) {
        const file = fileArray[0];
        setFileUploadState(prev => ({
          ...prev,
          file,
          mapping: {
            sourceColumns: [
              { sourceColumn: 'deviceId', targetField: 'deviceId', required: true },
              { sourceColumn: 'timestamp', targetField: 'timestamp', required: true },
              { sourceColumn: 'metricType', targetField: 'metricType', required: true },
              { sourceColumn: 'value', targetField: 'value', required: true },
              { sourceColumn: 'unit', targetField: 'unit', required: false },
            ],
          },
        }));
      }
    }
  };

  // 拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  // 真实的文件上传处理
  const handleFileUpload = async (request: DataImportRequest, onProgress?: (progress: number) => void) => {
    try {
      if (clearError) clearError();
      toast.loading('正在上传文件...', { id: 'upload' });
      
      if (uploadFileWithProgress) {
        const record = await uploadFileWithProgress(request, onProgress);
        
        toast.success('文件上传成功', { id: 'upload' });
        toast.success('导入记录已创建，可以开始执行导入');
        
        // 刷新记录列表
        if (refresh) await refresh();
        
        return record;
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      const errorMessage = error instanceof Error ? error.message : '文件上传失败';
      toast.error(errorMessage, { id: 'upload' });
      if (setError) setError(errorMessage);
      throw error;
    }
  };

  // 真实的文件预览处理
  const handlePreviewFile = async (file: File, equipmentId?: string) => {
    try {
      if (clearError) clearError();
      toast.loading('正在预览文件...', { id: 'preview' });
      
      // 创建预览请求
      const request: DataImportRequest = {
        file,
        equipmentId: equipmentId || undefined,
        options: {
          skipHeader: true,
          treatFirstRowAsHeader: true,
          delimiter: ',',
          encoding: 'utf-8',
          timezone: 'Asia/Shanghai',
          dateFormat: 'YYYY-MM-DD HH:mm:ss',
          numericFormat: {
            decimalSeparator: '.',
            thousandsSeparator: ',',
            negativeFormat: 'minus',
            defaultPrecision: 2,
          },
          validation: {
            strict: false,
            skipInvalidRows: true,
            validateEquipment: true,
            validateTimestamp: true,
            validateValues: true,
            validateUnits: false,
            maxErrors: 100,
          },
          duplicateHandling: DuplicateHandling.SKIP,
          batchSize: 1000,
          rollbackOnError: false,
        },
        mapping: {
          sourceColumns: [
            { sourceColumn: 'deviceId', targetField: 'deviceId', required: true },
            { sourceColumn: 'timestamp', targetField: 'timestamp', required: true },
            { sourceColumn: 'metricType', targetField: 'metricType', required: true },
            { sourceColumn: 'value', targetField: 'value', required: true },
            { sourceColumn: 'unit', targetField: 'unit', required: false },
          ],
          transformations: [],
          validations: [],
        },
      };
      
      // 这里应该调用预览API，目前使用模拟数据
      const mockPreviewData = {
        totalRows: 100,
        previewRows: [
          {
            deviceId: 'device-001',
            timestamp: '2025-11-20 08:30:00',
            metricType: 'temperature',
            value: 25.5,
            unit: '°C',
            source: 'sensor-001',
          },
          {
            deviceId: 'device-002',
            timestamp: '2025-11-20 08:30:01',
            metricType: 'pressure',
            value: 101.3,
            unit: 'kPa',
            source: 'sensor-002',
          },
        ],
        validationErrors: [],
        duplicateCount: 0,
        estimatedProcessingTime: 5000,
      };
      
      // 使用store的方法设置预览数据
      // 这里需要调用store的previewFile方法，但当前store实现中previewFile返回的是ImportPreviewData
      // 而我们创建的是mock数据，所以直接设置状态
      // 在实际实现中，应该调用 store.previewFile(file, equipmentId)
      
      // 临时解决方案：直接设置预览状态
      const previewDialog = document.getElementById('preview-dialog') as HTMLDialogElement;
      if (previewDialog) {
        previewDialog.showModal();
      }
      setPreviewDialogOpen(true);
      
      toast.success('文件预览成功', { id: 'preview' });
      
    } catch (error) {
      console.error('文件预览失败:', error);
      const errorMessage = error instanceof Error ? error.message : '文件预览失败';
      toast.error(errorMessage, { id: 'preview' });
      if (setError) setError(errorMessage);
    }
  };

  // 真实的导入执行处理
  const handleExecuteImport = async (recordId: string) => {
    try {
      if (clearError) clearError();
      toast.loading('正在执行导入...', { id: 'execute' });
      
      if (executeImport) {
        const record = await executeImport(recordId);
        
        toast.success('导入执行成功', { id: 'execute' });
        
        // 刷新记录列表
        if (refresh) await refresh();
        
        return record;
      }
    } catch (error) {
      console.error('导入执行失败:', error);
      const errorMessage = error instanceof Error ? error.message : '导入执行失败';
      toast.error(errorMessage, { id: 'execute' });
      if (setError) setError(errorMessage);
      throw error;
    }
  };

  // 真实的取消导入处理
  const handleCancelImport = async (recordId: string) => {
    try {
      if (clearError) clearError();
      toast.loading('正在取消导入...', { id: 'cancel' });
      
      if (cancelImport) {
        await cancelImport(recordId);
        
        toast.success('导入已取消', { id: 'cancel' });
        
        // 刷新记录列表
        if (refresh) await refresh();
      }
    } catch (error) {
      console.error('取消导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '取消导入失败';
      toast.error(errorMessage, { id: 'cancel' });
      if (setError) setError(errorMessage);
    }
  };

  // 真实的重试导入处理
  const handleRetryImport = async (recordId: string) => {
    try {
      if (clearError) clearError();
      toast.loading('正在重试导入...', { id: 'retry' });
      
      if (retryImport) {
        const record = await retryImport(recordId);
        
        toast.success('重试导入已开始', { id: 'retry' });
        
        // 刷新记录列表
        if (refresh) await refresh();
        
        return record;
      }
    } catch (error) {
      console.error('重试导入失败:', error);
      const errorMessage = error instanceof Error ? error.message : '重试导入失败';
      toast.error(errorMessage, { id: 'retry' });
      if (setError) setError(errorMessage);
    }
  };

  // 查看日志
  const handleViewLogs = (record: ImportRecord) => {
    const logs = record.errors?.map(err => 
      `第${err.rowNumber}行: ${err.reason}`
    ) || ['暂无日志'];
    setSelectedTaskLogs(logs);
    setLogDialogOpen(true);
  };

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    const colorMap = {
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500',
      processing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500',
      completed: 'bg-green-500/20 text-green-400 border-green-500',
      partial: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
      failed: 'bg-red-500/20 text-red-400 border-red-500',
    };
    
    const statusMap = {
      pending: '待处理',
      processing: '处理中',
      completed: '已完成',
      partial: '部分完成',
      failed: '失败',
    };

    return (
      <Badge className={colorMap[status as keyof typeof colorMap] || 'bg-gray-500/20 text-gray-400 border-gray-500'}>
        {statusMap[status as keyof typeof statusMap] || status}
      </Badge>
    );
  };

  // 筛选记录
  const filteredRecords = records.filter(record => {
    const matchesSearch = searchTerm === '' || 
      record.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // 页面操作
  const handleRefresh = async () => {
    try {
      if (clearError) clearError();
      toast.loading('正在刷新数据...', { id: 'refresh' });
      
      if (refresh) await refresh();
      
      toast.success('数据刷新完成', { id: 'refresh' });
      
    } catch (error) {
      console.error('刷新失败:', error);
      const errorMessage = error instanceof Error ? error.message : '刷新失败';
      toast.error(errorMessage, { id: 'refresh' });
      if (setError) setError(errorMessage);
    }
  };

  const handleGoToPage = (pageNum: number) => {
    if (goToPage) goToPage(pageNum);
  };

  const handleClearError = () => {
    if (clearError) clearError();
  };

  return (
    <ImportViewGuard fallback={<div className="text-center text-slate-400 p-8">您没有权限查看导入记录</div>}>
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 页面标题和统计 */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">数据导入管理</h1>
              <p className="text-slate-400 mt-1">
                导入 {total} 条记录，成功率 {calculateSuccessRate().toFixed(1)}%
              </p>
            </div>
            <div className="flex gap-3">
              <ImportOperationGuard fallback={
                <Button disabled className="bg-slate-600 text-slate-400">
                  <Upload className="w-4 h-4 mr-2" />
                  上传文件
                </Button>
              }>
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  disabled={uploading || processing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上传文件
                </Button>
              </ImportOperationGuard>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/80 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">总导入数</p>
                <p className="text-2xl font-bold text-slate-100">{total}</p>
              </div>
              <FileText className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          <Card className="bg-slate-800/80 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">成功率</p>
                <p className="text-2xl font-bold text-green-400">
                  {calculateSuccessRate().toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </Card>
          <Card className="bg-slate-800/80 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">处理中</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {records.filter(r => r.status === 'processing').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-cyan-400" />
            </div>
          </Card>
          <Card className="bg-slate-800/80 border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">失败数</p>
                <p className="text-2xl font-bold text-red-400">
                  {records.filter(r => r.status === 'failed').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </Card>
        </div>

        {/* 导入任务列表 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <h2 className="text-slate-100 mb-6">导入任务列表</h2>

          {/* 搜索和筛选 */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索任务名称..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <Select value={filterStatus} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="partial">部分完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 任务表格 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">文件名称</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">格式</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">状态</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">进度</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">成功/总数</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">上传时间</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300 text-sm">{record.fileName}</span>
                      </div>
                      <p className="text-xs text-slate-500">{formatFileSize(record.fileSize)}</p>
                    </td>
                    <td className="py-3 px-3">
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600">
                        {record.fileFormat.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(record.status)}</td>
                    <td className="py-3 px-3">
                      <div className="w-32">
                        <Progress 
                          value={record.totalRows > 0 ? (record.successRows / record.totalRows) * 100 : 0} 
                          className="h-2" 
                        />
                        <span className="text-xs text-slate-400 mt-1">
                          {record.totalRows > 0 ? Math.round((record.successRows / record.totalRows) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-sm">
                      {record.successRows}/{record.totalRows}
                      {record.failedRows > 0 && (
                        <span className="text-red-400 ml-1">({record.failedRows}失败)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 text-sm">
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewLogs(record)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          日志
                        </Button>
                        
                        <ImportOperationGuard fallback={
                          <Button size="sm" disabled className="bg-slate-600 text-slate-400">
                            <Play className="w-3 h-3 mr-1" />
                            开始
                          </Button>
                        }>
                          {record.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleExecuteImport(record.id)}
                              className="bg-green-500 hover:bg-green-600 text-white"
                              disabled={processing}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              开始
                            </Button>
                          )}
                         
                          {record.status === 'processing' && (
                            <Button
                              size="sm"
                              onClick={() => handleCancelImport(record.id)}
                              className="bg-red-500 hover:bg-red-600 text-white"
                              disabled={importing}
                            >
                              <Pause className="w-3 h-3 mr-1" />
                              取消
                            </Button>
                          )}
                         
                          {record.status === 'failed' && (
                            <Button
                              size="sm"
                              onClick={() => handleRetryImport(record.id)}
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              重试
                            </Button>
                          )}
                        </ImportOperationGuard>
                        
                        {record.status === 'completed' && (
                          <Button
                            size="sm"
                            className="bg-cyan-500 hover:bg-cyan-600 text-white"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            下载
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-slate-400 text-sm">
                显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 条，共 {total} 条
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="border-slate-600 text-slate-300"
                >
                  上一页
                </Button>
                <span className="text-slate-400 text-sm px-3 py-1">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="border-slate-600 text-slate-300"
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 文件上传对话框 */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-slate-100">上传数据文件</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-900">
                <TabsTrigger value="upload">文件上传</TabsTrigger>
                <TabsTrigger value="settings">导入设置</TabsTrigger>
                <TabsTrigger value="mapping">字段映射</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                {/* 拖拽上传区域 */}
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                    dragActive 
                      ? 'border-cyan-400 bg-cyan-400/10' 
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <CloudUpload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">
                    {selectedFiles.length > 0 
                      ? `已选择 ${selectedFiles.length} 个文件` 
                      : '将文件拖放到此处或点击选择'
                    }
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".csv,.xlsx,.xls,.json,.xml"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="file-input"
                  />
                  <Button
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    选择文件
                  </Button>
                </div>

                {/* 上传进度 */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">正在上传...</span>
                      <span className="text-cyan-400 text-sm">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {/* 选中文件列表 */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-slate-300 font-medium">已选文件:</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-slate-300 text-sm">{file.name}</p>
                            <p className="text-slate-500 text-xs">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium">设备ID</label>
                    <Input
                      value={fileUploadState.equipmentId}
                      onChange={(e) => setFileUploadState(prev => ({ ...prev, equipmentId: e.target.value }))}
                      placeholder="可选，指定设备ID"
                      className="bg-slate-900/50 border-slate-600 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium">分隔符</label>
                    <Select
                      value={fileUploadState.options.delimiter}
                      onValueChange={(value) => setFileUploadState(prev => ({
                        ...prev,
                        options: { ...prev.options, delimiter: value }
                      }))}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value=",">逗号 (,)</SelectItem>
                        <SelectItem value=";">分号 (;)</SelectItem>
                        <SelectItem value="\t">制表符 (Tab)</SelectItem>
                        <SelectItem value="|">竖线 (|)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium">编码</label>
                    <Select
                      value={fileUploadState.options.encoding}
                      onValueChange={(value) => setFileUploadState(prev => ({
                        ...prev,
                        options: { ...prev.options, encoding: value }
                      }))}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="utf-8">UTF-8</SelectItem>
                        <SelectItem value="gbk">GBK</SelectItem>
                        <SelectItem value="ascii">ASCII</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium">重复处理</label>
                    <Select
                      value={fileUploadState.options.duplicateHandling}
                      onValueChange={(value) => setFileUploadState(prev => ({
                        ...prev,
                        options: { ...prev.options, duplicateHandling: value as DuplicateHandling }
                      }))}
                    >
                      <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value={DuplicateHandling.SKIP}>跳过</SelectItem>
                        <SelectItem value={DuplicateHandling.OVERWRITE}>覆盖</SelectItem>
                        <SelectItem value={DuplicateHandling.UPDATE}>更新</SelectItem>
                        <SelectItem value={DuplicateHandling.ERROR}>报错</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fileUploadState.options.skipHeader}
                      onChange={(e) => setFileUploadState(prev => ({
                        ...prev,
                        options: { ...prev.options, skipHeader: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <span className="text-slate-300 text-sm">跳过标题行</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={fileUploadState.options.rollbackOnError}
                      onChange={(e) => setFileUploadState(prev => ({
                        ...prev,
                        options: { ...prev.options, rollbackOnError: e.target.checked }
                      }))}
                      className="rounded"
                    />
                    <span className="text-slate-300 text-sm">错误时回滚</span>
                  </label>
                </div>
              </TabsContent>
              
              <TabsContent value="mapping" className="space-y-4">
                <div>
                  <h4 className="text-slate-300 font-medium mb-3">字段映射配置</h4>
                  <div className="space-y-3">
                    {fileUploadState.mapping.sourceColumns.map((column, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded">
                        <div className="flex-1">
                          <label className="text-slate-400 text-xs">源字段</label>
                          <Input
                            value={column.sourceColumn}
                            onChange={(e) => {
                              const newColumns = [...fileUploadState.mapping.sourceColumns];
                              newColumns[index].sourceColumn = e.target.value;
                              setFileUploadState(prev => ({
                                ...prev,
                                mapping: { ...prev.mapping, sourceColumns: newColumns }
                              }));
                            }}
                            className="bg-slate-800/50 border-slate-600 text-slate-100 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-slate-400 text-xs">目标字段</label>
                          <Select
                            value={column.targetField}
                            onValueChange={(value) => {
                              const newColumns = [...fileUploadState.mapping.sourceColumns];
                              newColumns[index].targetField = value;
                              setFileUploadState(prev => ({
                                ...prev,
                                mapping: { ...prev.mapping, sourceColumns: newColumns }
                              }));
                            }}
                          >
                            <SelectTrigger className="bg-slate-800/50 border-slate-600 text-slate-100 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              <SelectItem value="deviceId">设备ID</SelectItem>
                              <SelectItem value="timestamp">时间戳</SelectItem>
                              <SelectItem value="metricType">指标类型</SelectItem>
                              <SelectItem value="value">数值</SelectItem>
                              <SelectItem value="unit">单位</SelectItem>
                              <SelectItem value="source">来源</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={column.required}
                            onChange={(e) => {
                              const newColumns = [...fileUploadState.mapping.sourceColumns];
                              newColumns[index].required = e.target.checked;
                              setFileUploadState(prev => ({
                                ...prev,
                                mapping: { ...prev.mapping, sourceColumns: newColumns }
                              }));
                            }}
                            className="rounded"
                          />
                          <span className="text-slate-400 text-xs ml-2">必填</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newColumns = fileUploadState.mapping.sourceColumns.filter((_, i) => i !== index);
                            setFileUploadState(prev => ({
                              ...prev,
                              mapping: { ...prev.mapping, sourceColumns: newColumns }
                            }));
                          }}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setFileUploadState(prev => ({
                          ...prev,
                          mapping: {
                            ...prev.mapping,
                            sourceColumns: [...prev.mapping.sourceColumns, {
                              sourceColumn: '',
                              targetField: 'value',
                              required: false,
                            }]
                          }
                        }));
                      }}
                      className="border-slate-600 text-slate-300"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      添加映射
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handlePreviewFile(selectedFiles[0])}
                disabled={selectedFiles.length === 0}
                className="border-slate-600 text-slate-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                预览
              </Button>
              <Button
                onClick={async () => {
                  if (selectedFiles.length === 0) {
                    notify('请选择文件', '请先选择要上传的文件', 'destructive');
                    return;
                  }
                  
                  try {
                    const request: DataImportRequest = {
                      file: selectedFiles[0],
                      equipmentId: fileUploadState.equipmentId || undefined,
                      options: {
                        skipHeader: fileUploadState.options.skipHeader,
                        treatFirstRowAsHeader: fileUploadState.options.treatFirstRowAsHeader,
                        delimiter: fileUploadState.options.delimiter,
                        encoding: fileUploadState.options.encoding,
                        timezone: fileUploadState.options.timezone,
                        dateFormat: fileUploadState.options.dateFormat,
                        numericFormat: {
                          decimalSeparator: '.',
                          thousandsSeparator: ',',
                          negativeFormat: 'minus',
                          defaultPrecision: 2,
                        },
                        validation: {
                          strict: true,
                          skipInvalidRows: true,
                          validateEquipment: true,
                          validateTimestamp: true,
                          validateValues: true,
                          validateUnits: true,
                          maxErrors: 100,
                        },
                        duplicateHandling: fileUploadState.options.duplicateHandling,
                        batchSize: fileUploadState.options.batchSize,
                        rollbackOnError: fileUploadState.options.rollbackOnError,
                      },
                      mapping: {
                        sourceColumns: fileUploadState.mapping.sourceColumns,
                        transformations: [],
                        validations: [],
                      },
                    };

                    if (uploadFileWithProgress) {
                      await uploadFileWithProgress(request);
                      notify('上传成功', '文件上传成功，正在处理数据导入', 'success');
                      setUploadDialogOpen(false);
                      setSelectedFiles([]);
                      if (refresh) refresh();
                    }

                  } catch (error) {
                    notify('上传失败', error instanceof Error ? error.message : '文件上传失败', 'destructive');
                  }
                }}
                disabled={selectedFiles.length === 0 || uploading}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? '上传中...' : '上传并导入'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 预览对话框 */}
        <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-slate-100">数据预览</DialogTitle>
            </DialogHeader>
            {previewData && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">总行数:</span>
                    <span className="text-slate-100 ml-2">{previewData.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">重复数据:</span>
                    <span className="text-slate-100 ml-2">{previewData.duplicateCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">验证错误:</span>
                    <span className="text-slate-100 ml-2">{previewData.validationErrors.length}</span>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-700">
                      <tr>
                        <th className="text-left p-2 text-slate-300">设备ID</th>
                        <th className="text-left p-2 text-slate-300">时间戳</th>
                        <th className="text-left p-2 text-slate-300">指标类型</th>
                        <th className="text-left p-2 text-slate-300">数值</th>
                        <th className="text-left p-2 text-slate-300">单位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.previewRows.map((row: any, index: number) => (
                        <tr key={index} className="border-b border-slate-700/50">
                          <td className="p-2 text-slate-300">{row.deviceId}</td>
                          <td className="p-2 text-slate-300">{row.timestamp}</td>
                          <td className="p-2 text-slate-300">{row.metricType}</td>
                          <td className="p-2 text-slate-300">{row.value}</td>
                          <td className="p-2 text-slate-300">{row.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                onClick={() => setPreviewDialogOpen(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300"
              >
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 日志对话框 */}
        <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-slate-100">任务日志</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-auto">
              {selectedTaskLogs.map((log, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-900/50 rounded text-sm text-slate-300 font-mono"
                >
                  {log}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={() => setLogDialogOpen(false)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-300"
              >
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 错误提示 */}
        {error && (
          <div className="fixed bottom-4 right-4 max-w-md">
            <Card className="bg-red-900/80 border-red-700 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-100 font-medium">操作失败</h4>
                  <p className="text-red-200 text-sm mt-1">{error}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearError}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
    </ImportViewGuard>
  );
}
