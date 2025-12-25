/**
 * 货船智能机舱管理系统 - 健康报告详情页面
 * 
 * 功能：
 * 1. 展示特定健康报告的详细信息
 * 2. 包含健康评分、运行时间统计、趋势分析和人工建议
 * 3. 响应式布局与高动态视觉效果 (Framer Motion)
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Download,
    Settings,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Clock,
    ShieldCheck,
    FileText,
    Activity
} from 'lucide-react';
import { useReportsStore, HealthStatus } from '../stores/reports-store';
import { useEquipmentStore } from '../stores/equipment-store';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { getIconByDeviceType } from '../config/core-systems';

/**
 * 格式化持续时间 (毫秒 -> 小时)
 * @param ms - 毫秒数
 */
const formatDuration = (ms: number) => {
    return (ms / (1000 * 60 * 60)).toFixed(1);
};

/**
 * 格式化时间戳为本地日期字符串
 */
const formatDate = (ts: number | string) => {
    if (!ts) return '--';

    // 核心修复逻辑：将数字字符串转换为数字（JavaScript new Date 对纯数字字符串解析敏感）
    const dateValue = typeof ts === 'string' && !isNaN(Number(ts)) ? Number(ts) : ts;
    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return '日期无效';
    }

    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * 健康等级样式配置
 */
const gradeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    excellent: { label: '优秀', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: ShieldCheck },
    good: { label: '良好', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle2 },
    fair: { label: '一般', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: AlertTriangle },
    poor: { label: '较差', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: AlertTriangle },
};

export const HealthReportDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { fetchReportById, downloadReport } = useReportsStore();
    const { items, fetchEquipmentList } = useEquipmentStore();

    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // 初始化数据
    useEffect(() => {
        const initData = async () => {
            if (!id) return;
            setLoading(true);

            // 并行获取报告详情和设备列表（用于映射设备名称）
            const [reportData] = await Promise.all([
                fetchReportById(id),
                items.length === 0 ? fetchEquipmentList({ page: 1, pageSize: 100 }) : Promise.resolve()
            ]);

            setReport(reportData);
            setLoading(false);
        };

        initData();
    }, [id, fetchReportById, fetchEquipmentList, items.length]);

    // 获取关联设备信息
    const equipment = useMemo(() => {
        if (!report?.equipmentId) return null;
        return items.find((e: any) => e.id === report.equipmentId || e.deviceId === report.equipmentId);
    }, [report, items]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Activity className="w-12 h-12 text-cyan-500 animate-spin" />
                <p className="text-slate-400 animate-pulse">正在调取健康评估档案...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <div className="p-4 bg-red-500/10 rounded-full">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-100">报告未找到</h3>
                    <p className="text-slate-400 mt-2">该报告可能已被删除或 ID 不正确</p>
                </div>
                <Button onClick={() => navigate('/health')} variant="outline" className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> 返回健康中心
                </Button>
            </div>
        );
    }

    const config = gradeConfig[report.healthLevel] || gradeConfig.good;
    const GradeIcon = config.icon;
    const DeviceIcon = equipment ? getIconByDeviceType(equipment.deviceType) : FileText;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 max-w-7xl mx-auto space-y-6"
        >
            {/* 顶部导航与操作栏 */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/health')}
                        className="text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            健康评估详情
                            {report?.id && (
                                <Badge className="bg-slate-700 text-slate-300 font-mono">
                                    ID: {report.id.substring(0, 8)}
                                </Badge>
                            )}
                        </h1>
                        <p className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" /> 生成于 {report?.generatedAt ? formatDate(report.generatedAt) : '--'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => downloadReport(report.id)}
                        variant="default"
                        className="bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-900/20"
                    >
                        <Download className="w-4 h-4 mr-2" /> 导出 Excel 报告
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 左侧：核心概览卡片 */}
                <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700 shadow-xl overflow-hidden">
                    <div className={`h-2 ${config.bgColor.replace('bg-', 'bg-').split('/')[0]}`} />
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 border-slate-700 ${config.color} bg-slate-900/50`}>
                                <span className="text-5xl font-bold">{report.healthScore}</span>
                                <span className="text-sm absolute bottom-4 text-slate-500 font-medium">分</span>
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className={`absolute -top-2 -right-2 p-2 rounded-full ${config.bgColor} ${config.color} border border-white/10`}
                            >
                                <GradeIcon className="w-6 h-6" />
                            </motion.div>
                        </div>

                        <div className="space-y-1">
                            <h3 className={`text-2xl font-bold ${config.color}`}>{config.label}状态</h3>
                            <p className="text-slate-400 text-sm">系统整体运行稳定且符合安全标准</p>
                        </div>

                        <div className="w-full pt-6 border-t border-slate-700 space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">评估设备:</span>
                                <span className="text-slate-200 font-medium flex items-center gap-2">
                                    <DeviceIcon className="w-4 h-4 text-cyan-400" />
                                    {equipment?.deviceName || report.equipmentId || '通用/汇总报告'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">异常记录:</span>
                                <span className={`font-medium ${report.abnormalCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {report.abnormalCount} 次异常
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 右侧：详细分析看板 */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 运行效率统计 */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-cyan-400" /> 运行效率统计
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {report.uptimeStats ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm text-slate-400">整体运行率 (Uptime)</span>
                                            <span className="text-2xl font-bold text-cyan-400">{report.uptimeStats.uptimeRate}%</span>
                                        </div>
                                        <Progress value={report.uptimeStats.uptimeRate} className="h-2 bg-slate-700" />
                                        <div className="grid grid-cols-3 gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500" /> 运行占比</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> 维护占比</div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-600" /> 停机占比</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-500 mb-1 uppercase">运行时间</p>
                                            <p className="text-lg font-bold text-slate-200">{formatDuration(report.uptimeStats.runningDuration)} <span className="text-xs font-normal">Hrs</span></p>
                                        </div>
                                        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-500 mb-1 uppercase">停机时间</p>
                                            <p className="text-lg font-bold text-slate-200">{formatDuration(report.uptimeStats.stoppedDuration)} <span className="text-xs font-normal">Hrs</span></p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-500 italic">暂无运行数据统计</div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 趋势分析 */}
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-purple-400" /> 趋势诊断
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 py-4">
                                {report.trendAnalysis ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                                            <span className="text-sm text-slate-400">温度演变趋势</span>
                                            <div className="flex items-center gap-2 text-slate-200">
                                                {report.trendAnalysis.temperatureTrend === 'stable' ? (
                                                    <Activity className="w-4 h-4 text-emerald-400" />
                                                ) : report.trendAnalysis.temperatureTrend === 'rising' ? (
                                                    <TrendingUp className="w-4 h-4 text-red-400" />
                                                ) : (
                                                    <TrendingDown className="w-4 h-4 text-cyan-400" />
                                                )}
                                                <span className="text-sm font-medium">{report.trendAnalysis.temperatureTrend === 'stable' ? '演变稳定' : report.trendAnalysis.temperatureTrend === 'rising' ? '持续升高' : '呈下降态势'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg">
                                            <span className="text-sm text-slate-400">振动变化分析</span>
                                            <div className="flex items-center gap-2 text-slate-200">
                                                {report.trendAnalysis.vibrationTrend === 'stable' ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                ) : (
                                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                )}
                                                <span className="text-sm font-medium">{report.trendAnalysis.vibrationTrend === 'stable' ? '处于平稳区间' : '存在异常波动'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-4 text-center text-slate-500 italic">暂无趋势诊断数据</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 决策建议 */}
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-orange-400" /> 维护建议
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-4">
                                <ul className="space-y-3">
                                    {report.trendAnalysis?.suggestions?.map((item: string, idx: number) => (
                                        <li key={idx} className="flex gap-3 text-sm text-slate-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                            {item}
                                        </li>
                                    )) || (
                                            <li className="text-slate-500 italic">基于当前评分，建议维持现状，定期点检即可。</li>
                                        )}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* 补充备注 */}
            <AnimatePresence>
                {(report.remarks || report.additionalNotes) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <Card className="bg-slate-800/30 border-slate-700/50 border-dashed">
                            <CardContent className="p-4 space-y-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">人工审核意见</p>
                                <p className="text-sm text-slate-400 leading-relaxed italic">
                                    {report.remarks || "未添加备注信息"}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800/30 border-slate-700/50 border-dashed">
                            <CardContent className="p-4 space-y-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">补充说明</p>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {report.additionalNotes || "无额外说明附件"}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
