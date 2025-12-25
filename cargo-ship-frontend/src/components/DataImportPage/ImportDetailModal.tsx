/**
 * 导入记录详情弹窗组件
 * 
 * 功能：
 * 1. 展示导入任务的完整生命周期信息
 * 2. 统计成功、失败、跳过的数据行数
 * 3. 展示错误详情（如果有）
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import {
    FileText,
    Calendar,
    User,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    Database
} from 'lucide-react';
import type { ImportRecord } from '../../services/api/models/ImportRecord';

interface ImportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    record: ImportRecord | null;
}

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
    pending: { label: '待处理', color: 'text-slate-400', icon: Clock },
    processing: { label: '处理中', color: 'text-blue-400', icon: Clock },
    completed: { label: '已完成', color: 'text-green-400', icon: CheckCircle2 },
    partial: { label: '部分成功', color: 'text-amber-400', icon: AlertCircle },
    failed: { label: '失败', color: 'text-red-400', icon: XCircle },
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleString('zh-CN');
};

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function ImportDetailModal({ isOpen, onClose, record }: ImportDetailModalProps) {
    if (!record) return null;

    const status = statusConfig[record.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-slate-100 shadow-2xl">
                <DialogHeader className="border-b border-slate-700 pb-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl bg-slate-800 border border-slate-700`}>
                            <FileText className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl font-bold">导入任务详情</DialogTitle>
                                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500 font-mono">
                                    {record.id.substring(0, 8)}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-2">
                                <Database className="w-3.5 h-3.5" />
                                {record.fileName}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* 左侧：基本信息与时间线 */}
                    <div className="space-y-4">
                        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">执行状态</h3>
                            <div className="space-y-3.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">处理状态</span>
                                    <span className={`text-sm font-semibold flex items-center gap-1.5 ${status.color}`}>
                                        <StatusIcon className="w-4 h-4" />
                                        {status.label}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">文件格式</span>
                                    <Badge variant="secondary" className="bg-slate-700/50 text-slate-200 border-slate-600">
                                        {record.fileFormat.toUpperCase()}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">文件大小</span>
                                    <span className="text-sm text-slate-200">{formatSize(record.fileSize)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">覆盖策略</span>
                                    <span className="text-sm text-slate-200 font-medium">
                                        {record.duplicateStrategy === 'skip' ? '自动跳过' : '覆盖更新'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">操作追溯</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded bg-slate-900 border border-slate-700">
                                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-medium">创建时间</p>
                                        <p className="text-xs text-slate-300">{formatDate(record.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded bg-slate-900 border border-slate-700">
                                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-medium">完成时间</p>
                                        <p className="text-xs text-slate-300">
                                            {record.completedAt ? formatDate(record.completedAt) : '尚未完成'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 rounded bg-slate-900 border border-slate-700">
                                        <User className="w-3.5 h-3.5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase font-medium">操作人</p>
                                        <p className="text-xs text-slate-300">{record.importedBy || '系统自动导入'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：统计图表 */}
                    <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center">
                        <h3 className="w-full text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">入库成功率</h3>

                        <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                            {/* 圆形进度背景 */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-slate-700/50"
                                />
                                <circle
                                    cx="80"
                                    cy="80"
                                    r="70"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={440}
                                    strokeDashoffset={440 - (440 * (record.successRows / (record.totalRows || 1)))}
                                    className="text-emerald-500 transition-all duration-1000 ease-out"
                                />
                            </svg>

                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-bold text-slate-100 leading-none">
                                    {record.totalRows > 0 ? Math.round((record.successRows / record.totalRows) * 100) : 0}%
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium mt-1">SUCCESS RATE</span>
                            </div>
                        </div>

                        <div className="w-full space-y-3.5 mt-auto">
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-slate-400">成功导入</span>
                                </div>
                                <span className="text-slate-200 font-mono">{record.successRows} 行</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <span className="text-slate-400">失败记录</span>
                                </div>
                                <span className="text-slate-200 font-mono">{record.failedRows} 行</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-slate-400">策略跳过</span>
                                </div>
                                <span className="text-slate-200 font-mono">{record.skippedRows} 行</span>
                            </div>
                            <div className="pt-2 border-t border-slate-700/50 flex justify-between items-center">
                                <span className="text-xs text-slate-500">数据集总量</span>
                                <span className="text-sm font-bold text-cyan-400 font-mono">{record.totalRows}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 失败详情面板 */}
                {record.failedRows > 0 && record.errors && record.errors.length > 0 && (
                    <div className="mt-4 bg-red-950/20 border border-red-500/20 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-red-400 flex items-center gap-2 mb-3 uppercase tracking-wider">
                            <AlertCircle className="w-4 h-4" />
                            错误回溯 (Error Logs)
                        </h4>
                        <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {record.errors.map((error, idx) => (
                                <div key={idx} className="text-[11px] text-red-300/70 bg-red-900/10 p-2.5 rounded border border-red-900/30 flex gap-3">
                                    <span className="font-mono text-red-500 whitespace-nowrap">ROW #{error.row}</span>
                                    <span className="leading-normal">{error.reason}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
