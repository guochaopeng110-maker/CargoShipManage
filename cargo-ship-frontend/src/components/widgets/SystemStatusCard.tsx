/**
 * SystemStatusCard 组件 - 单个系统状态概览卡片
 * 
 * 功能说明：
 * - 展示单一子系统的连接状态、报警等级和核心指标。
 * - 采用现代暗黑风格设计，支持背景虚化和渐变效果。
 * - 使用图标和颜色深度联动，直观反馈系统健康度。
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, Wifi, WifiOff, Activity } from 'lucide-react';
import { useMonitoringStore } from '../../stores/monitoring-store';
import { useAlarmsStore, AlertSeverity } from '../../stores/alarms-store';

interface SystemStatusCardProps {
    systemId: string;
    systemName: string;
    icon: React.ElementType;
    iconColor?: string;
    iconGlow?: string;
    primaryMetricName?: string;
    unit?: string;
    onClick?: () => void;
}

const SYSTEM_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
    green: { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40', glow: 'shadow-green-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', glow: 'shadow-amber-500/20' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', glow: 'shadow-blue-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40', glow: 'shadow-red-500/20' },
};

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({
    systemId,
    systemName,
    icon: Icon,
    iconColor, // 这里现在接受颜色名称，如 'green'
    iconGlow,
    primaryMetricName,
    unit,
    onClick
}) => {
    // 从 monitoring-store 获取实时数据
    const { data, realtimeConnected } = useMonitoringStore(state => ({
        data: state.data,
        realtimeConnected: state.realtimeConnected
    }));

    // 从 alarms-store 获取该系统的当前最高告警等级
    const items = useAlarmsStore(state => state.items);
    const systemAlarms = items.filter(a => a.equipmentId === systemId && a.status === 'pending');

    // 计算最高告警等级
    const maxSeverity = React.useMemo(() => {
        if (systemAlarms.length === 0) return 'none';
        const severities = systemAlarms.map(a => a.severity);
        if (severities.includes(AlertSeverity.CRITICAL)) return 'critical';
        if (severities.includes(AlertSeverity.HIGH)) return 'high';
        if (severities.includes(AlertSeverity.MEDIUM)) return 'medium';
        return 'low';
    }, [systemAlarms]);

    // 获取主要指标数值及历史趋势
    const dataPoints = React.useMemo(() => {
        if (!primaryMetricName) return [];
        return data[`${systemId}-${primaryMetricName}`] || [];
    }, [data, systemId, primaryMetricName]);

    const latestValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : 0;

    // 生成迷你趋势图路径
    const sparklinePath = React.useMemo(() => {
        if (dataPoints.length < 2) return '';
        const width = 100;
        const height = 40; // 稍微调高
        const max = Math.max(...dataPoints.map(d => d.value), 1);
        const min = Math.min(...dataPoints.map(d => d.value), 0);
        const range = max - min || 1;

        return dataPoints.slice(-30).map((d, i, arr) => {
            const x = (i / (arr.length - 1)) * width;
            const y = height - ((d.value - min) / range) * height;
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
    }, [dataPoints]);

    // 根据系统类型获取默认动画类
    const getSystemAnimationClass = React.useMemo(() => {
        // 如果有严重或警告告警，优先使用告警动画
        if (maxSeverity === 'critical') return 'animate-icon-glow';
        if (maxSeverity === 'high' || maxSeverity === 'medium') return 'animate-icon-pulse';

        const idLower = systemId.toLowerCase();
        const nameLower = systemName.toLowerCase();

        if (idLower.includes('prop') || nameLower.includes('推进') || nameLower.includes('转速')) {
            return 'animate-slow-spin';
        }
        if (idLower.includes('bat') || nameLower.includes('电池') || nameLower.includes('soc')) {
            return 'animate-icon-wave';
        }
        if (idLower.includes('inv') || idLower.includes('pd') || nameLower.includes('逆变') || nameLower.includes('配电')) {
            return 'animate-icon-pulse';
        }
        if (idLower.includes('bilge') || idLower.includes('cool') || nameLower.includes('水')) {
            return 'animate-icon-ping';
        }
        return 'animate-icon-pulse';
    }, [systemId, systemName, maxSeverity]);

    // 根据告警等级获取配色
    const getStatusConfig = () => {
        // 优先使用专属色彩配置
        const systemColor = iconColor ? SYSTEM_COLORS[iconColor] : null;

        switch (maxSeverity) {
            case 'critical':
                return { color: 'text-red-400', border: 'border-red-500/60', bg: 'bg-red-500/20', shield: ShieldX };
            case 'high':
                return { color: 'text-amber-200', border: 'border-amber-500/50', bg: 'bg-amber-500/20', shield: ShieldAlert };
            case 'medium':
                return { color: 'text-amber-300', border: 'border-amber-500/40', bg: 'bg-amber-500/20', shield: ShieldAlert };
            case 'low':
                return { color: 'text-blue-300', border: 'border-blue-500/40', bg: 'bg-blue-500/20', shield: ShieldCheck };
            default:
                return {
                    color: systemColor?.text || 'text-cyan-400',
                    border: systemColor?.border || 'border-cyan-500/30',
                    bg: systemColor?.bg || 'bg-cyan-500/10',
                    shield: ShieldCheck
                };
        }
    };

    const config = getStatusConfig();
    const StatusShield = config.shield;
    const systemColor = iconColor ? SYSTEM_COLORS[iconColor] : null;

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative overflow-hidden rounded-[2.5rem] border ${config.border} ${config.bg} backdrop-blur-xl p-7 cursor-pointer transition-all duration-500 shadow-2xl group flex flex-col justify-between min-h-[240px] hover:shadow-cyan-500/10`}
        >
            {/* 背景装饰渐变 */}
            <div className={`absolute -right-16 -top-16 w-48 h-48 ${systemColor?.bg || 'bg-blue-500/10'} rounded-full blur-[80px] group-hover:opacity-60 transition-opacity`} />

            <div className="relative flex flex-col h-full justify-between">
                {/* 顶部：系统物理图标 + 连接状态 */}
                <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                        <motion.div
                            animate={{
                                opacity: [0.1, 0.5, 0.1],
                                scale: [1, 1.4, 1],
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className={`absolute inset-0 rounded-xl blur-lg ${systemColor?.bg || config.bg}`}
                        />
                        <div className={`relative p-4 rounded-2xl bg-slate-900/60 ${systemColor?.text || config.color} border border-white/10 shadow-lg ${systemColor?.glow || ''}`}>
                            <Icon className={`w-8 h-8 ${getSystemAnimationClass}`} />
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10">
                            {realtimeConnected ? (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">实时</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">离线</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 中间：系统名称 + 核心数值 */}
                <div className="mb-4">
                    <h3 className="text-xl font-black text-white mb-2 group-hover:text-blue-200 transition-colors uppercase tracking-tight">{systemName}</h3>

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{primaryMetricName}</span>
                            <div className="flex items-baseline gap-1.5">
                                {dataPoints.length > 0 ? (
                                    <>
                                        <span className="text-4xl font-black text-white tabular-nums drop-shadow-sm">{latestValue}</span>
                                        <span className={`text-sm font-bold ${systemColor?.text || 'text-slate-400'}`}>{unit}</span>
                                    </>
                                ) : (
                                    <Activity className="w-6 h-6 text-slate-700 animate-pulse" />
                                )}
                            </div>
                        </div>

                        {/* 迷你趋势图 */}
                        {sparklinePath && (
                            <div className="flex-1 h-12 max-w-[120px]">
                                <svg width="100%" height="100%" viewBox="0 0 100 40" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id={`grad-${systemId}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <motion.path
                                        d={sparklinePath}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={systemColor?.text || config.color}
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ duration: 1 }}
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                {/* 底部：状态栏 */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${config.bg}`}>
                            <StatusShield className={`w-4 h-4 ${config.color} ${maxSeverity !== 'none' ? 'animate-pulse' : ''}`} />
                        </div>
                        <span className={`text-[10px] font-black ${config.color} uppercase tracking-widest`}>
                            {maxSeverity === 'none' ? '系统正常' : '告警触发'}
                        </span>
                    </div>
                    <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    height: [4, 12, 4],
                                    opacity: [0.3, 1, 0.3],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                }}
                                className={`w-1 rounded-full ${realtimeConnected ? (systemColor?.text.replace('text-', 'bg-') || 'bg-blue-500') : 'bg-slate-700'}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SystemStatusCard;
