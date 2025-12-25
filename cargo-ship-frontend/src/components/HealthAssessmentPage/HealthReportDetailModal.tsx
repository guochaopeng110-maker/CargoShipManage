/**
 * 货船智能机舱管理系统 - 健康报告详情弹窗组件
 *
 * 功能：
 * 1. 以模态框形式展示健康报告的详细信息
 * 2. 包含评分、运行统计、趋势分析及维护建议
 * 3. 响应式布局与美观的视觉呈现
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Activity,
    TrendingUp,
    TrendingDown,
    Clock,
    Download,
    Calendar,
    FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * 属性接口
 */
interface HealthReportDetailModalProps {
    isOpen: boolean;           // 弹窗状态
    onClose: () => void;       // 关闭回调
    report: any;               // 报告详情数据
    onExport?: (id: string) => void; // 导出回调
}

/**
 * 格式化持续时间 (毫秒 -> 小时)
 */
const formatDuration = (ms: number) => {
    return (ms / (1000 * 60 * 60)).toFixed(1);
};

/**
 * 格式化时间戳
 */
const formatDate = (ts: number | string) => {
    if (!ts) return '--';

    // 核心修复逻辑：
    // 如果 ts 是 "1766120226289" 这样的数字字符串，new Date() 会返回 Invalid Date。
    // 需要将其转换为数字类型。
    const dateValue = typeof ts === 'string' && !isNaN(Number(ts)) ? Number(ts) : ts;
    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return '日期无效';
    }

    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * 健康等级配置
 */
const gradeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    excellent: { label: '优秀', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: ShieldCheck },
    good: { label: '良好', color: 'text-green-400', bgColor: 'bg-green-500/10', icon: CheckCircle2 },
    fair: { label: '一般', color: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertTriangle },
    poor: { label: '较差', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: AlertTriangle },
};

export const HealthReportDetailModal: React.FC<HealthReportDetailModalProps> = ({
    isOpen,
    onClose,
    report,
    onExport
}) => {
    if (!report) return null;

    const config = gradeConfig[report.healthLevel?.toLowerCase()] || gradeConfig.good;
    const GradeIcon = config.icon;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-slate-100 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b border-slate-700 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bgColor}`}>
                                <FileText className={`w-6 h-6 ${config.color}`} />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    健康评估报告详情
                                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                                        ID: {report.id?.substring(0, 8)}
                                    </Badge>
                                </DialogTitle>
                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> 生成时间: {formatDate(report.generatedAt)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> 数据范围: {formatDate(report.dataStartTime)} - {formatDate(report.dataEndTime)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {onExport && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onExport(report.id)}
                                className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                                <Download className="w-4 h-4 mr-2" /> 导出报告
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
                    {/* 左侧：分数与状态 */}
                    <div className="md:col-span-4 bg-slate-800/40 rounded-xl p-6 flex flex-col items-center justify-center border border-slate-700/50">
                        <div className="relative mb-4">
                            <div className={`w-32 h-32 rounded-full border-4 border-slate-700 flex flex-col items-center justify-center bg-slate-900/60 shadow-xl`}>
                                <span className={`text-4xl font-bold ${config.color}`}>{report.healthScore}</span>
                                <span className="text-xs text-slate-500 uppercase font-medium">Score</span>
                            </div>
                            <div className={`absolute -top-2 -right-2 p-2 rounded-full ${config.bgColor} border border-slate-700 shadow-lg`}>
                                <GradeIcon className={`w-5 h-5 ${config.color}`} />
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className={`text-xl font-bold ${config.color}`}>{config.label}状态</h3>
                            <p className="text-xs text-slate-400">
                                {report.healthScore >= 80 ? "系统运行稳健，各项参数正常" : "系统存在潜在风险，请注意观察"}
                            </p>
                        </div>
                        <div className="w-full mt-6 pt-6 border-t border-slate-700/50 space-y-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">涉及设备 ID:</span>
                                <span className="text-slate-300 truncate max-w-[120px]" title={report.equipmentId}>
                                    {report.equipmentId || '全船汇总'}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">异常报警记录:</span>
                                <span className={`font-bold ${report.abnormalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {report.abnormalCount} 次异常
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：详细指标 */}
                    <div className="md:col-span-8 space-y-6">
                        {/* 运行效率 */}
                        <div className="bg-slate-800/20 rounded-xl p-5 border border-slate-700/30">
                            <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                                <Activity className="w-4 h-4 text-cyan-400" /> 运行效率统计
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-slate-400 font-medium">整体运行率 (Uptime)</span>
                                        <span className="text-lg font-bold text-cyan-400">{report.uptimeStats?.uptimeRate}%</span>
                                    </div>
                                    <Progress value={report.uptimeStats?.uptimeRate} className="h-1.5 bg-slate-700" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-2 bg-slate-900/40 rounded border border-slate-700/30 text-center">
                                        <p className="text-[10px] text-slate-500 mb-1">运行时长</p>
                                        <p className="text-sm font-bold text-slate-200">{formatDuration(report.uptimeStats?.runningDuration || 0)}h</p>
                                    </div>
                                    <div className="p-2 bg-slate-900/40 rounded border border-slate-700/30 text-center">
                                        <p className="text-[10px] text-slate-500 mb-1">停机时长</p>
                                        <p className="text-sm font-bold text-slate-200">{formatDuration(report.uptimeStats?.stoppedDuration || 0)}h</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 趋势分析 */}
                            <div className="bg-slate-800/20 rounded-xl p-5 border border-slate-700/30">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-4 h-4 text-purple-400" /> 趋势诊断
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs p-2 bg-slate-900/20 rounded">
                                        <span className="text-slate-400">温度趋势</span>
                                        <span className="text-slate-200 flex items-center gap-1 font-medium">
                                            {report.trendAnalysis?.temperatureTrend === '稳定' ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <TrendingUp className="w-3 h-3 text-red-400" />}
                                            {report.trendAnalysis?.temperatureTrend || '稳定'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs p-2 bg-slate-900/20 rounded">
                                        <span className="text-slate-400">振动分析</span>
                                        <span className="text-slate-200 flex items-center gap-1 font-medium">
                                            <Activity className="w-3 h-3 text-cyan-400" />
                                            {report.trendAnalysis?.vibrationTrend || '正常'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs p-2 bg-slate-900/20 rounded">
                                        <span className="text-slate-400">总体风险</span>
                                        <Badge variant="outline" className={`text-[10px] ${report.trendAnalysis?.riskLevel === 'high' ? 'text-red-400 border-red-900' : 'text-emerald-400 border-emerald-900'}`}>
                                            {report.trendAnalysis?.riskLevel?.toUpperCase() || 'LOW'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* 专家建议 */}
                            <div className="bg-slate-800/20 rounded-xl p-5 border border-slate-700/30">
                                <h4 className="text-sm font-semibold flex items-center gap-2 mb-4">
                                    <ShieldCheck className="w-4 h-4 text-orange-400" /> 维护建议
                                </h4>
                                <div className="space-y-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                                    {report.trendAnalysis?.suggestions?.map((s: string, i: number) => (
                                        <div key={i} className="flex gap-2 text-[11px] text-slate-300 mb-1">
                                            <div className="w-1 h-1 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                                            {s}
                                        </div>
                                    )) || <span className="text-slate-500 italic text-xs">暂无建议</span>}
                                </div>
                            </div>
                        </div>

                        {/* 备注 */}
                        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30 border-dashed">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">人工审核备注</h4>
                            <p className="text-xs text-slate-400 leading-relaxed italic">
                                {report.remarks || "该报告数据由系统自动评估生成，尚未添加人工备注说明。"}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
