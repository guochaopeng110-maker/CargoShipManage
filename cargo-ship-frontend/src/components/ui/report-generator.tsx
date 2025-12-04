/**
 * 报表生成器组件
 * 货船智能机舱管理系统通用报表生成组件
 * 
 * 功能描述:
 * - 为各监控页面提供统一的报表生成功能
 * - 支持不同类型报表的快速生成
 * - 与报表服务集成的状态管理
 * 
 * @author 前端开发团队
 * @version 1.0.0
 * @since 2025-11-20
 */

import React, { useState } from 'react';
import { 
  FileDown, 
  Calendar, 
  Download, 
  Settings,
  X,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from './button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './dialog';
import { Input } from './input';
import { Label } from './label';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from './card';
import { Badge } from './badge';
import { Alert, AlertDescription } from './alert';

import { 
  ReportsService, 
  ReportConfig, 
  ReportType 
} from '../../services/reports-service';
import { useReportsStore } from '../../stores/reports-store';

/**
 * 报表生成器属性接口
 */
interface ReportGeneratorProps {
  // 可选：页面或设备类型，用于预配置报表类型
  context?: {
    type?: 'dashboard' | 'battery' | 'propulsion' | 'inverter' | 'auxiliary' | 'equipment' | 'history' | 'alarms';
    equipmentIds?: string[];
    defaultDateRange?: number; // 默认日期范围（天数）
  };
  
  // 可选：自定义按钮样式
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  
  // 可选：自定义文本
  buttonText?: string;
  
  // 可选：是否显示为小按钮（用于工具栏）
  compact?: boolean;
  
  // 回调函数
  onReportGenerated?: (report: any) => void;
  onError?: (error: string) => void;
}

/**
 * 报表类型配置
 */
const reportTypeConfigs = {
  dashboard: [
    { type: 'DAILY_OPERATION', name: '日常运行报表', description: '系统整体运行状态概览' },
    { type: 'MONTHLY_OPERATION', name: '月度运行报表', description: '月度综合运行数据分析' }
  ],
  battery: [
    { type: 'EQUIPMENT_HEALTH', name: '设备健康评估', description: '电池系统健康状态评估' },
    { type: 'ENERGY_EFFICIENCY', name: '能效分析报表', description: '电池能效优化分析' }
  ],
  propulsion: [
    { type: 'EQUIPMENT_HEALTH', name: '设备健康评估', description: '推进系统健康状态评估' },
    { type: 'FAILURE_STATISTICS', name: '故障统计报表', description: '推进系统故障统计分析' }
  ],
  inverter: [
    { type: 'EQUIPMENT_HEALTH', name: '设备健康评估', description: '逆变器系统健康状态评估' },
    { type: 'ENERGY_EFFICIENCY', name: '能效分析报表', description: '逆变器能效分析' }
  ],
  auxiliary: [
    { type: 'EQUIPMENT_HEALTH', name: '设备健康评估', description: '辅助设备健康状态评估' },
    { type: 'DAILY_OPERATION', name: '日常运行报表', description: '辅助系统日常运行报表' }
  ],
  equipment: [
    { type: 'EQUIPMENT_HEALTH', name: '设备健康评估', description: '指定设备健康状态评估' },
    { type: 'FAILURE_STATISTICS', name: '故障统计报表', description: '设备故障统计分析' }
  ],
  history: [
    { type: 'MONTHLY_OPERATION', name: '月度运行报表', description: '历史数据月度分析报表' },
    { type: 'ENERGY_EFFICIENCY', name: '能效分析报表', description: '历史数据能效分析' }
  ],
  alarms: [
    { type: 'FAILURE_STATISTICS', name: '故障统计报表', description: '告警事件统计分析' },
    { type: 'MONTHLY_OPERATION', name: '月度运行报表', description: '包含告警数据的月度报表' }
  ]
};

/**
 * 通用报表生成器组件
 * 
 * 提供统一的报表生成界面，支持：
 * - 多种报表类型选择
 * - 日期范围设置
 * - 导出格式选择
 * - 实时生成状态显示
 */
export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  context,
  variant = 'outline',
  size = 'default',
  className = '',
  buttonText = '生成报表',
  compact = false,
  onReportGenerated,
  onError
}) => {
  // 状态管理
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('DAILY_OPERATION');
  const [exportFormat, setExportFormat] = useState<'PDF' | 'EXCEL'>('PDF');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  
  // 报表Store
  const { generateReport } = useReportsStore();
  
  // 获取可用的报表类型
  const availableReportTypes = context?.type ? 
    reportTypeConfigs[context.type] || reportTypeConfigs.dashboard : 
    reportTypeConfigs.dashboard;
  
  // 初始化默认日期
  React.useEffect(() => {
    if (startDate && endDate) return;
    
    const today = new Date();
    const defaultDays = context?.defaultDateRange || 7; // 默认7天
    const start = new Date(today.getTime() - defaultDays * 24 * 60 * 60 * 1000);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, [context]);
  
  /**
   * 生成报表处理函数
   */
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      setGeneratedReport(null);
      
      // 验证输入
      if (!selectedReportType) {
        throw new Error('请选择报表类型');
      }
      
      if (!startDate || !endDate) {
        throw new Error('请设置日期范围');
      }
      
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      
      if (startDateTime >= endDateTime) {
        throw new Error('开始日期必须早于结束日期');
      }
      
      // 构建报表配置
      const config: ReportConfig = {
        reportType: selectedReportType,
        startDate: startDate,
        endDate: endDate,
        exportFormat,
        equipmentIds: context?.equipmentIds,
        includeCharts,
        includeRawData,
        language: 'zh-CN'
      };
      
      // 调用报表生成服务
      const report = await generateReport(config);
      
      if (report) {
        setGeneratedReport(report);
        
        // 触发成功回调
        if (onReportGenerated) {
          onReportGenerated(report);
        }
      }
      
    } catch (error: any) {
      const errorMessage = error.message || '报表生成失败';
      setError(errorMessage);
      
      // 触发错误回调
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setGenerating(false);
    }
  };
  
  /**
   * 重置表单
   */
  const resetForm = () => {
    setGeneratedReport(null);
    setError(null);
    if (availableReportTypes.length > 0) {
      setSelectedReportType(availableReportTypes[0].type as ReportType);
    }
  };
  
  /**
   * 关闭对话框
   */
  const handleClose = () => {
    if (!generating) {
      setIsOpen(false);
      resetForm();
    }
  };
  
  /**
   * 下载已生成的报表
   */
  const handleDownload = async () => {
    if (generatedReport?.id) {
      try {
        const blob = await ReportsService.downloadReport(generatedReport.id);
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${generatedReport.name}.${exportFormat.toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 清理URL对象
        URL.revokeObjectURL(url);
        
      } catch (error: any) {
        setError(error.message || '下载失败');
      }
    }
  };
  
  /**
   * 获取报表类型显示名称
   */
  const getReportTypeDisplayName = (type: ReportType): string => {
    const config = availableReportTypes.find(t => t.type === type);
    return config?.name || type;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className={className}
          disabled={generating}
        >
          {compact ? (
            <FileDown className="w-4 h-4" />
          ) : (
            <>
              <FileDown className="w-4 h-4 mr-2" />
              {buttonText}
            </>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            生成报表
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            选择报表类型和参数，生成专业的分析报表
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 报表类型选择 */}
          <div className="space-y-2">
            <Label htmlFor="report-type" className="text-slate-300">报表类型</Label>
            <Select 
              value={selectedReportType} 
              onValueChange={(value) => setSelectedReportType(value as ReportType)}
              disabled={generating}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {availableReportTypes.map((config) => (
                  <SelectItem 
                    key={config.type}
                    value={config.type} 
                    className="text-slate-300 hover:bg-slate-700"
                  >
                    <div>
                      <div className="font-medium">{config.name}</div>
                      <div className="text-xs text-slate-400">{config.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* 日期范围 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-slate-300">开始日期</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={generating}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-slate-300">结束日期</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={generating}
                className="bg-slate-900/50 border-slate-600 text-slate-100"
              />
            </div>
          </div>
          
          {/* 导出格式 */}
          <div className="space-y-2">
            <Label htmlFor="export-format" className="text-slate-300">导出格式</Label>
            <Select 
              value={exportFormat} 
              onValueChange={(value) => setExportFormat(value as 'PDF' | 'EXCEL')}
              disabled={generating}
            >
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="PDF" className="text-slate-300 hover:bg-slate-700">PDF</SelectItem>
                <SelectItem value="EXCEL" className="text-slate-300 hover:bg-slate-700">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 选项 */}
          <div className="space-y-3">
            <Label className="text-slate-300">报表选项</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  disabled={generating}
                  className="rounded border-slate-600 bg-slate-900"
                />
                <span className="text-sm text-slate-300">包含图表</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeRawData}
                  onChange={(e) => setIncludeRawData(e.target.checked)}
                  disabled={generating}
                  className="rounded border-slate-600 bg-slate-900"
                />
                <span className="text-sm text-slate-300">包含原始数据</span>
              </label>
            </div>
          </div>
          
          {/* 错误提示 */}
          {error && (
            <Alert className="bg-red-900/50 border-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-100">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* 生成成功提示 */}
          {generatedReport && (
            <Alert className="bg-green-900/50 border-green-700">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-100">
                报表生成成功！点击下载获取文件。
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter className="flex items-center justify-between">
          <div>
            {generatedReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-2" />
                下载报表
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              disabled={generating}
              className="text-slate-400 hover:text-slate-300"
            >
              关闭
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !!generatedReport}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : generatedReport ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  已生成
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  生成报表
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportGenerator;