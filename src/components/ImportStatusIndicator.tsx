import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Upload,
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Database,
  TrendingUp,
  RefreshCw,
  Eye
} from 'lucide-react';
import { useImport } from '../stores/import-store';
import { ImportStatus, ImportStatistics } from '../types/import';
import { DataQuality } from '../types/equipment';

// 导入状态映射配置
const IMPORT_STATUS_CONFIG = {
  pending: {
    label: '待处理',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: Clock,
  },
  processing: {
    label: '处理中',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    icon: Loader2,
  },
  completed: {
    label: '已完成',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    icon: CheckCircle,
  },
  failed: {
    label: '失败',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: XCircle,
  },
  partial: {
    label: '部分成功',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: AlertTriangle,
  },
};

/**
 * 单个导入记录状态组件
 */
function ImportRecordStatus({ record }: { record: any }) {
  const statusConfig = IMPORT_STATUS_CONFIG[record.status as keyof typeof IMPORT_STATUS_CONFIG] || IMPORT_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
      <StatusIcon className={`w-4 h-4 ${statusConfig.color} ${record.status === ImportStatus.PROCESSING ? 'animate-spin' : ''}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-slate-300 truncate">{record.fileName}</div>
        <div className="text-xs text-slate-500">{new Date(record.createdAt).toLocaleString('zh-CN')}</div>
      </div>
      <div className="w-12">
        <div className="text-xs text-slate-400">{record.successRate?.toFixed(1) || 0}%</div>
      </div>
    </div>
  );
}

/**
 * 导入统计数据组件
 */
function ImportStatisticsDisplay({ showDetails }: { showDetails: boolean }) {
  const { records, statistics } = useImport();

  if (!statistics) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mr-2" />
        <span className="text-slate-400 text-sm">加载统计数据...</span>
      </div>
    );
  }

  // 计算基础统计数据
  const totalImports = records.length;
  const successfulImports = records.filter(r => r.status === ImportStatus.COMPLETED).length;
  const failedImports = records.filter(r => r.status === ImportStatus.FAILED).length;
  const partialImports = records.filter(r => r.status === ImportStatus.PARTIAL).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 导入总次数 */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 text-xs">总导入次数</span>
        </div>
        <div className="text-lg font-bold text-slate-100">{totalImports}</div>
        <div className="text-xs text-slate-500">成功: {successfulImports}</div>
      </div>

      {/* 数据质量分布 */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-slate-400 text-xs">数据质量</span>
        </div>
        <div className="text-lg font-bold text-slate-100">
          {statistics.dataQualityDistribution?.[DataQuality.NORMAL] || 0}
        </div>
        <div className="text-xs text-slate-500">正常数据</div>
      </div>

      {/* 成功率 */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <FileCheck className="w-4 h-4 text-blue-400" />
          <span className="text-slate-400 text-xs">成功率</span>
        </div>
        <div className="text-lg font-bold text-green-400">
          {totalImports > 0 ? Math.round((successfulImports / totalImports) * 100) : 0}%
        </div>
        <div className="text-xs text-slate-500">
          失败: {failedImports + partialImports}
        </div>
      </div>

      {/* 设备分布 */}
      <div className="bg-slate-900/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCw className="w-4 h-4 text-purple-400" />
          <span className="text-slate-400 text-xs">设备覆盖</span>
        </div>
        <div className="text-lg font-bold text-slate-100">
          {Object.keys(statistics.equipmentDistribution || {}).length}
        </div>
        <div className="text-xs text-slate-500">设备数量</div>
      </div>
    </div>
  );
}

/**
 * 数据导入状态指示器主组件
 */
interface ImportStatusIndicatorProps {
  showDetails?: boolean;
  compactMode?: boolean;
  onNavigate?: (page: string) => void;
  className?: string;
}

export function ImportStatusIndicator({
  showDetails = true,
  compactMode = false,
  onNavigate,
  className = ''
}: ImportStatusIndicatorProps) {
  const {
    records,
    statistics,
    loading,
    uploading,
    importing,
    error,
    lastUpdate,
  } = useImport();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // 获取最近的导入记录
  const recentRecords = records.slice(0, 5);

  // 获取当前正在进行的任务
  const activeTasks = records.filter(record =>
    [ImportStatus.PROCESSING].includes(record.status)
  );

  // 刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 模拟刷新操作
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('刷新导入状态失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 获取整体导入状态
  const getOverallStatus = () => {
    if (activeTasks.length > 0) {
      return ImportStatus.PROCESSING;
    }
    
    if (error) return ImportStatus.FAILED;
    if (recentRecords.some(r => r.status === ImportStatus.COMPLETED)) return ImportStatus.COMPLETED;
    if (recentRecords.some(r => r.status === ImportStatus.PARTIAL)) return ImportStatus.PARTIAL;
    return ImportStatus.PENDING;
  };

  const overallStatus = getOverallStatus();
  const statusConfig = IMPORT_STATUS_CONFIG[overallStatus as keyof typeof IMPORT_STATUS_CONFIG];
  const StatusIcon = statusConfig.icon;

  if (compactMode) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusIcon className={`w-4 h-4 ${statusConfig.color} ${overallStatus === ImportStatus.PROCESSING ? 'animate-spin' : ''}`} />
        <span className={`text-sm ${statusConfig.color}`}>{statusConfig.label}</span>
        {activeTasks.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {activeTasks.length}个任务
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`bg-slate-800/80 border-slate-700 p-4 ${className}`}>
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="text-slate-100 font-medium">数据导入状态</h3>
          {(loading || uploading || importing) && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 刷新按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* 查看详情按钮 */}
          {onNavigate && (
            <Button
              size="sm"
              onClick={() => onNavigate('data-import')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              <Eye className="w-4 h-4 mr-1" />
              查看详情
            </Button>
          )}
        </div>
      </div>

      {/* 整体状态 */}
      <div className={`flex items-center gap-3 p-3 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border mb-4`}>
        <StatusIcon className={`w-5 h-5 ${statusConfig.color} ${overallStatus === ImportStatus.PROCESSING ? 'animate-spin' : ''}`} />
        <div className="flex-1">
          <div className={`text-sm font-medium ${statusConfig.color}`}>{statusConfig.label}</div>
          <div className="text-xs text-slate-400">
            {overallStatus === ImportStatus.PROCESSING && '正在处理数据...'}
            {overallStatus === ImportStatus.COMPLETED && '所有导入任务已完成'}
            {overallStatus === ImportStatus.PARTIAL && '部分导入任务成功'}
            {overallStatus === ImportStatus.FAILED && '存在失败的导入任务'}
            {overallStatus === ImportStatus.PENDING && '暂无活跃的导入任务'}
            {lastUpdate && `最后更新: ${new Date(lastUpdate).toLocaleTimeString('zh-CN')}`}
          </div>
        </div>
        {activeTasks.length > 0 && (
          <Badge variant="outline" className={statusConfig.borderColor}>
            {activeTasks.length} 个活跃任务
          </Badge>
        )}
      </div>

      {/* 统计数据 */}
      {showDetails && (
        <div className="mb-4">
          <ImportStatisticsDisplay showDetails={showDetails} />
        </div>
      )}

      {/* 活跃任务进度 */}
      {activeTasks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-slate-300 text-sm mb-2">活跃任务</h4>
          <div className="space-y-2">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-300 text-sm font-medium">{task.fileName}</span>
                  <span className="text-slate-400 text-xs">处理中</span>
                </div>
                <Progress
                  value={task.successRate || 0}
                  className="h-2"
                />
                <div className="text-xs text-slate-500 mt-1">
                  {Math.round(task.successRate || 0)}% 完成
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最近导入记录 */}
      {showDetails && recentRecords.length > 0 && (
        <div>
          <h4 className="text-slate-300 text-sm mb-2">最近导入记录</h4>
          <div className="space-y-2">
            {recentRecords.map((record) => (
              <ImportRecordStatus record={record} />
            ))}
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">导入错误: {error}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ImportStatusIndicator;