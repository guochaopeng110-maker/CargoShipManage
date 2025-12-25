/**
 * 货船智能机舱管理系统 - 整船健康仪表盘组件
 *
 * 本组件用于展示整船的综合健康状况概览。
 * 采用大型仪表盘图表，提供一目了然的整体健康评分和等级。
 *
 * 核心功能：
 * 1. 展示整船综合健康评分（通过各系统加权平均计算）
 * 2. 根据健康等级动态改变背景色和主题色
 * 3. 清晰显示健康等级文字标识
 * 4. 提供手动刷新功能
 * 5. 支持加载状态显示
 *
 * 数据来源：
 * - 综合健康评分：由各系统健康评分加权平均计算得出
 * - 健康等级：根据评分区间自动判定
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025-12-14
 */

import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { RefreshCw } from 'lucide-react';
import { GaugeChart } from '../visualization/GaugeChart';

// 从 reports-store 导入前端业务类型（已合并自 health-store）
import type { HealthStatus } from '../../stores/reports-store';

/**
 * OverallHealthScorecard 组件 Props 接口
 */
export interface OverallHealthScorecardProps {
  score: number;                             // 整船综合健康评分（0-100）
  grade: HealthStatus;                       // 整船健康等级
  onRefresh: () => void;                     // 刷新回调函数
  loading?: boolean;                         // 加载状态
}

/**
 * 健康等级颜色映射配置
 *
 * 根据健康等级返回对应的 Tailwind CSS 类名和边框色
 */
const gradeColorConfig: Record<HealthStatus, {
  bgClass: string;      // 背景色类名
  textClass: string;    // 文字颜色类名
  borderClass: string;  // 边框颜色类名
  badgeBg: string;      // Badge 背景色
  badgeText: string;    // Badge 文字颜色
  badgeBorder: string;  // Badge 边框颜色
}> = {
  EXCELLENT: {
    bgClass: 'bg-emerald-900/20',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500'
  },
  GOOD: {
    bgClass: 'bg-green-900/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500',
    badgeBg: 'bg-green-500/20',
    badgeText: 'text-green-400',
    badgeBorder: 'border-green-500'
  },
  FAIR: {
    bgClass: 'bg-amber-900/20',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500'
  },
  POOR: {
    bgClass: 'bg-orange-900/20',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500'
  },
  CRITICAL: {
    bgClass: 'bg-red-900/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500',
    badgeBg: 'bg-red-500/20',
    badgeText: 'text-red-400',
    badgeBorder: 'border-red-500'
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
 * 健康等级描述文本映射
 */
const gradeDescriptionMap: Record<HealthStatus, string> = {
  EXCELLENT: '设备运行状态极佳，健康状况优秀',
  GOOD: '设备运行正常，健康状况良好',
  FAIR: '设备存在轻微问题，需要关注',
  POOR: '设备存在严重问题，需要维护',
  CRITICAL: '设备存在危急问题，需要立即处理'
};

/**
 * GaugeChart 组件所需的状态类型映射
 *
 * 将 HealthStatus 映射到 GaugeChart 的 status prop
 */
const gaugeStatusMap: Record<HealthStatus, 'normal' | 'warning' | 'critical'> = {
  EXCELLENT: 'normal',
  GOOD: 'normal',
  FAIR: 'warning',
  POOR: 'warning',
  CRITICAL: 'critical'
};

/**
 * OverallHealthScorecard 组件
 *
 * 整船健康仪表盘组件，展示综合健康评分和等级
 *
 * @param props - 组件属性
 * @returns React 组件
 */
export const OverallHealthScorecard: React.FC<OverallHealthScorecardProps> = ({
  score,
  grade,
  onRefresh,
  loading = false
}) => {
  // 计算健康等级的颜色配置
  const colorConfig = useMemo(() => {
    return gradeColorConfig[grade] || gradeColorConfig.GOOD;
  }, [grade]);

  // 计算 GaugeChart 所需的 status
  const gaugeStatus = useMemo(() => {
    return gaugeStatusMap[grade] || 'normal';
  }, [grade]);

  // 获取等级名称
  const gradeName = useMemo(() => {
    return gradeNameMap[grade] || '未知';
  }, [grade]);

  // 获取等级描述
  const gradeDescription = useMemo(() => {
    return gradeDescriptionMap[grade] || '';
  }, [grade]);

  return (
    <Card
      className={`${colorConfig.bgClass} ${colorConfig.borderClass} border-2 p-6 transition-all duration-300`}
    >
      {/* 标题和刷新按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-slate-100 text-xl font-bold">整船综合健康评分</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className={`${colorConfig.textClass} ${colorConfig.borderClass} hover:${colorConfig.bgClass}`}
          aria-label="刷新健康数据"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 加载状态 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <RefreshCw className="w-16 h-16 text-slate-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载健康数据...</p>
        </div>
      ) : (
        <>
          {/* 仪表盘图表 */}
          <div className="flex justify-center mb-6">
            <GaugeChart
              value={score}
              maxValue={100}
              label=""
              unit="%"
              size="large"
              status={gaugeStatus}
            />
          </div>

          {/* 健康等级展示 */}
          <div className="text-center space-y-3">
            {/* 健康等级 Badge（大号） */}
            <div className="flex justify-center">
              <Badge
                className={`${colorConfig.badgeBg} ${colorConfig.badgeText} ${colorConfig.badgeBorder} text-lg px-4 py-2 font-bold`}
              >
                健康等级：{gradeName}
              </Badge>
            </div>

            {/* 健康等级描述 */}
            <p className={`${colorConfig.textClass} text-sm`}>
              {gradeDescription}
            </p>

            {/* 评分数值展示 */}
            <div className="mt-4">
              <span className="text-slate-400 text-sm">综合评分：</span>
              <span className={`${colorConfig.textClass} text-3xl font-bold ml-2`}>
                {score}
              </span>
              <span className="text-slate-400 text-lg"> / 100</span>
            </div>
          </div>

          {/* 评分说明 */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <p className="text-slate-400 text-xs text-center">
              综合评分由各核心系统（电池、推进、逆变器、配电、辅助）的健康评分加权平均计算得出
            </p>
          </div>
        </>
      )}
    </Card>
  );
};

// 设置组件显示名称（便于调试）
OverallHealthScorecard.displayName = 'OverallHealthScorecard';
