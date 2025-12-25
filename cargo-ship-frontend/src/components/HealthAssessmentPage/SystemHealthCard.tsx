/**
 * 货船智能机舱管理系统 - 系统健康卡片组件
 *
 * 本组件用于展示单个系统（电池、推进、逆变器等）的健康状况概览。
 * 采用卡片布局，集成健康评分、趋势图、告警徽章等信息。
 *
 * 核心功能：
 * 1. 展示系统健康评分和等级（带颜色标识）
 * 2. 展示近期健康趋势图（Sparkline 迷你图表）
 * 3. 展示活跃告警数量徽章
 * 4. 支持点击导航至系统详情页面
 * 5. 响应式布局和悬停效果
 *
 * 数据来源：
 * - 健康评分：来自 health-store（通过 WebSocket 实时更新）
 * - 告警数量：来自 alarms-store（跨 Store 数据聚合）
 * - 趋势数据：来自 health-store 的历史数据点
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025-12-14
 */

import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
// 锁定了趋势和图表相关的导入

// 从 reports-store 导入前端业务类型和枚举
import { HealthStatus } from '../../stores/reports-store';
import type { SystemHealthScore } from '../../stores/reports-store';

/**
 * SystemHealthCard 组件 Props 接口
 */
export interface SystemHealthCardProps {
  systemId: string;                          // 系统唯一标识符
  systemName: string;                        // 系统名称（中文）
  icon: React.ComponentType<{ className?: string }>; // 系统图标组件
  healthScore?: number;                      // 健康评分（0-100）
  grade?: HealthStatus;                      // 健康等级
  activeAlarmsCount: number;                 // 活跃告警数量
  isSelected?: boolean;                      // 是否被选中
  onSelect: () => void;                      // 点击选择回调
  loading?: boolean;                         // 加载状态
}

/**
 * 健康等级颜色映射配置
 *
 * 根据健康等级返回对应的 Tailwind CSS 类名
 */
const gradeColorMap: Record<HealthStatus, {
  bg: string;
  text: string;
  border: string;
  bar: string;
  hex: string;   // 核心：强制着色的 Hex 值，规避 CSS 编译缺失
  bgHex: string; // 核心：背景 Hex 值 (20% 透明度)
}> = {
  EXCELLENT: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    bar: 'bg-emerald-500',
    hex: '#34d399',   // Emerald 400
    bgHex: 'rgba(16, 185, 129, 0.2)'
  },
  GOOD: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500',
    bar: 'bg-green-500',
    hex: '#4ade80',   // Green 400
    bgHex: 'rgba(34, 197, 94, 0.2)'
  },
  FAIR: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500',
    bar: 'bg-amber-500',
    hex: '#fbbf24',   // Amber 400
    bgHex: 'rgba(245, 158, 11, 0.2)'
  },
  POOR: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    border: 'border-orange-500',
    bar: 'bg-orange-500',
    hex: '#fb923c',   // Orange 400
    bgHex: 'rgba(249, 115, 22, 0.2)'
  },
  CRITICAL: {
    bg: 'bg-red-500/20',
    text: 'text-red-400 font-bold', // 使用确认存在的类名
    border: 'border-red-500',
    bar: 'bg-red-500',
    hex: '#f87171',   // Red 400
    bgHex: 'rgba(239, 68, 68, 0.2)'
  }
};

/**
 * 健康等级中文名称映射
 */
const gradeNameMap: Record<HealthStatus, string> = {
  EXCELLENT: '优秀',
  GOOD: '良好',
  FAIR: '一般',
  POOR: '较差',
  CRITICAL: '严重'
};


/**
 * SystemHealthCard 组件
 *
 * 可复用的系统健康卡片组件，用于展示单个系统的健康状况概览
 *
 * @param props - 组件属性
 * @returns React 组件
 */
export const SystemHealthCard = React.memo<SystemHealthCardProps>(({
  systemId,
  systemName,
  icon: Icon,
  healthScore,
  grade,
  activeAlarmsCount,
  isSelected = false,
  onSelect,
  loading = false
}) => {
  // 计算健康等级的颜色样式（用于进度条、数值和 Badge）
  const gradeColors = useMemo(() => {
    if (!grade) return gradeColorMap.GOOD;
    return gradeColorMap[grade] || gradeColorMap.GOOD;
  }, [grade]);

  // 处理卡片点击事件（变为选择逻辑）
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onSelect();
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <Card
      className={`relative p-4 transition-all duration-300 cursor-pointer group border-2 ${isSelected
        ? 'bg-slate-800 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/50'
        : 'bg-slate-800/80 border-slate-700 hover:border-slate-500'
        }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="radio"
      aria-checked={isSelected}
      aria-label={`${systemName}健康卡片，评分 ${healthScore || '待评估'}`}
    >
      {/* 选中标识勾选图标（可选，目前通过边框区分） */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded"></div>
            <div className="h-5 bg-slate-700 rounded w-24"></div>
          </div>
          <div className="h-16 bg-slate-700 rounded"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
        </div>
      ) : (
        <>
          {/* 系统名称和图标 */}
          <div className="flex items-center gap-2.5 mb-2.5">
            <motion.div
              animate={{
                y: [0, -4, 0],
                filter: isSelected ? ["drop-shadow(0 0 2px rgba(34,211,238,0.3))", "drop-shadow(0 0 8px rgba(34,211,238,0.6))", "drop-shadow(0 0 2px rgba(34,211,238,0.3))"] : "none"
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Icon className={`w-8 h-8 ${isSelected ? 'text-cyan-400' : 'text-slate-400'} transition-colors duration-300`} />
            </motion.div>
            <h3 className="text-slate-100 font-semibold text-base truncate">{systemName}</h3>
          </div>

          {/* 健康评分展示 */}
          <div className="mb-1">
            {healthScore !== undefined ? (
              <>
                {/* 评分数值和等级 Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: gradeColors.hex }} // 强制 Hex 着色
                    >
                      {healthScore}
                    </span>
                    <span className="text-slate-500 text-xs font-medium">分</span>
                  </div>

                  {grade && (
                    <Badge
                      className="border text-[10px] px-1.5 py-0"
                      style={{
                        backgroundColor: gradeColors.bgHex,
                        color: gradeColors.hex,
                        borderColor: gradeColors.hex
                      }}
                    >
                      {gradeNameMap[grade]}
                    </Badge>
                  )}
                </div>

                {/* 进度条 */}
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden border border-slate-700/50">
                  <motion.div
                    className="h-full"
                    style={{
                      backgroundColor: gradeColors.hex,
                      boxShadow: `0 0 10px ${gradeColors.hex}80` // 动态 80 表示 50% 透明度的发光
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${healthScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  ></motion.div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-2xl font-bold text-slate-600">--</span>
                <span className="text-xs text-slate-500 mt-1">待评估</span>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
});

// 设置组件显示名称（便于调试）
SystemHealthCard.displayName = 'SystemHealthCard';
