/**
 * 数据导入页面
 *
 * 采用"三步走"布局设计，提供清晰、直观的数据导入体验：
 * 1. 第一步：文件选择与上传
 * 2. 第二步：上传与处理状态监控
 * 3. 第三步：导入历史记录查询
 *
 * 复用 DataQueryPage 的"筛选-分页列表"模式
 * 实现完整的上传→轮询→完成流程
 *
 * @module components/DataImportPage
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { FileUploadZone } from './DataImportPage/FileUploadZone';
import { ImportStatusIndicator } from './DataImportPage/ImportStatusIndicator';
import { ImportHistoryTable } from './DataImportPage/ImportHistoryTable';
import { ImportDetailModal } from './DataImportPage/ImportDetailModal';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';

// 状态管理
import { useImportStore } from '../stores/import-store';
import { useMonitoringStore } from '../stores/monitoring-store';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../config/permissions';
import { AlertCircle, FileText, Upload, RefreshCw, Shield } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

// 从 import-store 导入前端业务类型
import type { DataImportRequest } from '../stores/import-store';
import type { ImportRecord } from '../services/api/models/ImportRecord';

/**
 * DataImportPage 主组件
 *
 * 遵循"三步走"设计模式的数据导入页面
 */
export function DataImportPage() {
  // ===== Store 状态订阅 =====

  // 当前任务状态（用于第二步：上传与处理状态）
  const currentTask = useImportStore((state) => state.currentTask);

  // 历史记录状态（用于第三步：导入历史）
  const historicalImports = useImportStore((state) => state.historicalImports);
  const queryStatus = useImportStore((state) => state.queryStatus);

  // Actions
  const uploadAndImportDirectly = useImportStore((state) => state.uploadAndImportDirectly);
  const downloadTemplate = useImportStore((state) => state.downloadTemplate);
  const resetCurrentTask = useImportStore((state) => state.resetCurrentTask);
  const fetchImportHistory = useImportStore((state) => state.fetchImportHistory);
  const setQueryPage = useImportStore((state) => state.setQueryPage);
  const setQueryFilters = useImportStore((state) => state.setQueryFilters);
  const executeImport = useImportStore((state) => state.executeImport);
  const cancelImport = useImportStore((state) => state.cancelImport);
  const retryImport = useImportStore((state) => state.retryImport);
  const getRecord = useImportStore((state) => state.getRecord);
  const downloadImportResult = useImportStore((state) => state.downloadImportResult);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ImportRecord | null>(null);

  // 权限控制
  const { hasPermission } = usePermissions();
  const canImport = hasPermission(PERMISSION_RESOURCES.SENSOR_DATA, PERMISSION_ACTIONS.IMPORT);
  const canReadHistory = hasPermission(PERMISSION_RESOURCES.SENSOR_DATA, PERMISSION_ACTIONS.READ);

  // ===== 批量任务进度 (WebSocket) =====
  const importProgress = useMonitoringStore(state => state.importProgress);

  // 匹配当前任务的 WebSocket 进度
  // 优化：处理 batchId 和 taskId 可能不一致的情况，或者 taskId 尚未同步的情况
  const currentBatchProgress = useMemo(() => {
    // 1. 优先尝试精确 ID 匹配
    if (currentTask.taskId && importProgress[currentTask.taskId]) {
      return importProgress[currentTask.taskId];
    }

    // 2. 如果正处于处理中状态且 ID 还没拿到，或者 ID 匹配失败，
    // 则寻找最近更新的活跃历史导入批次（模糊匹配策略）
    if (currentTask.importStatus === 'processing') {
      const activeHistoryBatches = Object.values(importProgress)
        .filter(p => p.isHistory)
        .sort((a, b) => b.lastUpdated - a.lastUpdated);

      return activeHistoryBatches[0] || null;
    }

    return null;
  }, [currentTask.taskId, currentTask.importStatus, importProgress]);


  // ===== 事件处理：第一步 - 文件上传 =====

  /**
   * 处理文件上传
   *
   * 重构后：增加数据量校验，直接调用一步式导入接口
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        const MAX_RECORDS = 50000;

        // 针对 CSV 进行简单的行数预校验
        if (isCsv) {
          const rowCount = await new Promise<number>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result as string;
              // 简单按行切割，过滤空行
              const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
              resolve(lines.length > 0 ? lines.length - 1 : 0); // 扣除表头
            };
            reader.readAsText(file.slice(0, 10 * 1024 * 1024)); // 仅读取前10MB进行估算或完整读取
          });

          if (rowCount > MAX_RECORDS) {
            toast.error('文件数据量过大', {
              description: `当前约 ${rowCount.toLocaleString()} 条记录，超过单次导入上限 ${MAX_RECORDS.toLocaleString()} 条。请拆分文件后重试。`,
              duration: 5000,
            });
            return;
          }
        }

        // 构建导入请求
        const request: DataImportRequest = {
          file,
          equipmentId: '',
          fileFormat: isCsv ? 'csv' : 'excel',
          duplicateStrategy: 'skip',
          skipInvalidRows: true,
          remarks: `上传文件: ${file.name}`,
        };

        // 调用一步式上传导入接口
        const finalRecord = await uploadAndImportDirectly(request);

        // 成功提示
        toast.success('数据导入请求已提交！', {
          description: `正在处理文件 ${file.name}，请关注下方进度状态。`,
        });

      } catch (error) {
        console.error('文件上传失败:', error);
        toast.error('文件上传失败', {
          description: error instanceof Error ? error.message : '未知错误',
        });
      }
    },
    [uploadAndImportDirectly]
  );

  /**
   * 处理模板下载
   */
  const handleDownloadTemplate = useCallback(
    async (format: 'csv' | 'excel') => {
      try {
        toast.loading(`正在准备 ${format.toUpperCase()} 模板...`, { id: 'download-tpl' });
        await downloadTemplate(format);
        toast.success('模板下载成功', { id: 'download-tpl' });
      } catch (error) {
        toast.error('模板下载失败', { id: 'download-tpl' });
      }
    },
    [downloadTemplate]
  );

  /**
   * 处理取消上传
   */
  const handleCancelUpload = useCallback(() => {
    resetCurrentTask();
    toast.info('已取消上传');
  }, [resetCurrentTask]);

  // ===== 事件处理：第三步 - 历史记录操作 =====

  /**
   * 处理查看详情
   */
  const handleViewDetails = useCallback(
    async (recordId: string) => {
      try {
        toast.loading('正在获取记录详情...', { id: 'fetch-detail' });
        const record = await getRecord(recordId);
        setSelectedRecord(record);
        setDetailModalOpen(true);
        toast.dismiss('fetch-detail');
      } catch (error) {
        toast.error('获取记录详情失败', { id: 'fetch-detail' });
      }
    },
    [getRecord]
  );

  /**
   * 处理重试导入
   */
  const handleRetry = useCallback(
    async (recordId: string) => {
      try {
        toast.loading('正在重试导入...', { id: 'retry' });
        await retryImport(recordId);
        toast.success('重试成功', { id: 'retry' });
        await fetchImportHistory(historicalImports.page, {});
      } catch (error) {
        toast.error('重试失败', { id: 'retry' });
      }
    },
    [retryImport, fetchImportHistory, historicalImports.page]
  );

  /**
   * 处理下载结果 (下载错误报告或执行总结)
   */
  const handleDownload = useCallback(
    async (recordId: string) => {
      try {
        toast.loading('正在生成导入报告...', { id: 'download-result' });
        await downloadImportResult(recordId);
        toast.success('报告下载成功', { id: 'download-result' });
      } catch (error) {
        toast.error('下载失败', { id: 'download-result' });
      }
    },
    [downloadImportResult]
  );

  /**
   * 处理执行导入（待处理状态）
   */
  const handleExecute = useCallback(
    async (recordId: string) => {
      try {
        toast.loading('正在执行导入...', { id: 'execute' });
        await executeImport(recordId);
        toast.success('执行成功', { id: 'execute' });
        await fetchImportHistory(historicalImports.page, {});
      } catch (error) {
        toast.error('执行失败', { id: 'execute' });
      }
    },
    [executeImport, fetchImportHistory, historicalImports.page]
  );

  /**
   * 处理取消导入（处理中状态）
   */
  const handleCancel = useCallback(
    async (recordId: string) => {
      try {
        toast.loading('正在取消导入...', { id: 'cancel' });
        await cancelImport(recordId);
        toast.success('已取消', { id: 'cancel' });
        await fetchImportHistory(historicalImports.page, {});
      } catch (error) {
        toast.error('取消失败', { id: 'cancel' });
      }
    },
    [cancelImport, fetchImportHistory, historicalImports.page]
  );

  /**
   * 处理页码变化
   */
  const handlePageChange = useCallback(
    (page: number) => {
      setQueryPage(page).catch((error) => {
        console.error('切换页码失败:', error);
        toast.error('切换页码失败');
      });
    },
    [setQueryPage]
  );

  /**
   * 处理筛选条件变化
   */
  const handleFilterChange = useCallback(
    (filters: { fileName?: string; status?: string }) => {
      setQueryFilters({
        fileName: filters.fileName,
        status: filters.status ? [filters.status as any] : undefined,
      }).catch((error) => {
        console.error('应用筛选失败:', error);
        toast.error('应用筛选失败');
      });
    },
    [setQueryFilters]
  );

  /**
   * 处理刷新
   */
  const handleRefresh = useCallback(() => {
    fetchImportHistory(historicalImports.page, {}).catch((error) => {
      console.error('刷新失败:', error);
      toast.error('刷新失败');
    });
  }, [fetchImportHistory, historicalImports.page]);

  // ===== 渲染 UI =====

  if (!canReadHistory && !canImport) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <Card className="max-w-md mx-auto mt-20 p-6 bg-slate-800 border-slate-700">
          <Alert className="bg-red-900/20 border-red-600/50">
            <Shield className="h-4 w-4" />
            <AlertDescription>您没有权限查看数据导入页面，请联系系统管理员</AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Upload className="w-8 h-8 text-cyan-400" />
            数据导入
          </h1>
          <p className="text-slate-400 mt-2">
            提供标准的 CSV 和 Excel 模板下载，支持一键上传并自动执行入库
          </p>
        </div>
        <div className="flex gap-4">
          {/* 模板中心按钮 */}
          <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadTemplate('csv')}
              className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700/50"
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV 模板
            </Button>
            <div className="w-[1px] bg-slate-700 mx-1 my-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadTemplate('excel')}
              className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700/50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Excel 模板
            </Button>
          </div>

        </div>
      </div>

      {/* 第一步：文件选择与上传 */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-semibold">1</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">选择文件</h2>
        </div>

        <FileUploadZone
          onFileSelect={handleFileUpload}
          acceptedTypes={[
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ]}
          maxSize={50 * 1024 * 1024} // 50MB
          disabled={currentTask.importStatus === 'uploading' || currentTask.importStatus === 'processing'}
        />
      </Card>

      {/* 第二步：上传与处理状态 */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-semibold">2</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">上传与处理状态</h2>
        </div>

        <ImportStatusIndicator
          status={currentTask.importStatus}
          progress={currentTask.uploadProgress}
          fileName={currentTask.fileName || undefined}
          errorMessage={currentTask.errorMessage || undefined}
          batchIndex={currentBatchProgress?.current}
          batchTotal={currentBatchProgress?.total}
          onCancel={currentTask.importStatus === 'uploading' ? handleCancelUpload : undefined}
        />
      </Card>

      {/* 第三步：导入历史 */}
      <Card className="bg-slate-900/50 border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 font-semibold">3</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">导入历史记录</h2>
          <span className="text-sm text-slate-400">
            （共 {historicalImports.total} 条记录）
          </span>
        </div>

        <ImportHistoryTable
          records={historicalImports.items}
          loading={queryStatus === 'loading'}
          page={historicalImports.page}
          pageSize={historicalImports.pageSize}
          total={historicalImports.total}
          totalPages={historicalImports.totalPages}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
          onRetry={handleRetry}
          onDownload={handleDownload}
          onExecute={handleExecute}
          onCancel={handleCancel}
          onFilterChange={handleFilterChange}
        />
      </Card>

      {/* 详情弹窗 */}
      <ImportDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        record={selectedRecord}
      />
    </div>
  );
}

/**
 * 默认导出
 */
export default DataImportPage;
