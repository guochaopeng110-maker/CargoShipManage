/**
 * HealthQuickViewWidget 组件 - 健康速览小组件（重构版 v2.0）
 *
 * 功能说明：
 * - 作为仪表板的核心组件之一，紧凑展示整船健康状况
 * - 提供整船平均健康分和健康等级的快速概览
 * - 使用迷你仪表盘（GaugeChart）进行可视化展示
 * - 支持点击跳转到健康评估页面查看详细信息
 *
 * 主要特性：
 * 1. 从 reports-store 获取所有设备的健康评分（已合并 health-store）
 * 2. 实时计算整船平均健康分（所有设备健康分的平均值）
 * 3. 自动判断健康等级（Excellent/Good/Fair/Poor/Critical）
 * 4. 使用 GaugeChart 组件展示健康分（0-100）
 * 5. 支持点击整个组件跳转到健康评估页面
 * 6. 添加 Hover 效果，提升交互体验
 * 7. 空状态友好提示（无健康数据时）
 *
 * 数据源：
 * - reports-store.systemHealthScores - 所有设备的健康评分数据（已合并自 health-store）
 *
 * 健康等级判断标准：
 * - 90-100 分：Excellent（优秀）- 绿色
 * - 70-89 分：Good（良好）- 青色
 * - 50-69 分：Fair（一般）- 黄色
 * - 30-49 分：Poor（较差）- 橙色
 * - 0-29 分：Critical（危急）- 红色
 *
 * 重构说明（v2.0）：
 * - 移除了对 health-store 的依赖
 * - 使用统一的 reports-store 管理健康评分
 * - 保持原有功能和界面不变
 *
 * @module components/widgets/HealthQuickViewWidget
 */

import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { GaugeChart } from '../visualization/GaugeChart';
import { useReportsStore } from '../../stores/reports-store';
import { Activity, Heart, TrendingDown } from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * HealthQuickViewWidget 组件属性接口
 */
export interface HealthQuickViewWidgetProps {
  /**
   * 点击组件回调（通常用于导航到健康评估页面）
   */
  onClick?: () => void;

  /**
   * 自定义CSS类名
   */
  className?: string;
}

/**
 * 健康等级类型
 */
type HealthGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' | 'Unknown';

/**
 * 整船健康状态接口
 */
interface OverallHealth {
  /** 平均健康分（0-100） */
  score: number;
  /** 健康等级 */
  grade: HealthGrade;
  /** 状态（用于 GaugeChart） */
  status: 'normal' | 'warning' | 'critical';
  /** 设备总数 */
  deviceCount: number;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据健康分计算健康等级
 *
 * 分数区间映射：
 * - 90-100 分：Excellent（优秀）
 * - 70-89 分：Good（良好）
 * - 50-69 分：Fair（一般）
 * - 30-49 分：Poor（较差）
 * - 0-29 分：Critical（危急）
 *
 * @param score 健康分（0-100）
 * @returns 健康等级
 */
function getGradeFromScore(score: number): HealthGrade {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 30) return 'Poor';
  return 'Critical';
}

/**
 * 根据健康分计算状态（用于 GaugeChart）
 *
 * 状态映射：
 * - 健康分 >= 70：normal（正常）
 * - 健康分 >= 50：warning（警告）
 * - 健康分 < 50：critical（严重）
 *
 * @param score 健康分（0-100）
 * @returns 状态
 */
function getStatusFromScore(score: number): 'normal' | 'warning' | 'critical' {
  if (score >= 70) return 'normal';
  if (score >= 50) return 'warning';
  return 'critical';
}

/**
 * 根据健康等级获取等级标签的中文翻译
 *
 * @param grade 健康等级
 * @returns 中文标签
 */
function getGradeLabel(grade: HealthGrade): string {
  const labels: Record<HealthGrade, string> = {
    Excellent: '优秀',
    Good: '良好',
    Fair: '一般',
    Poor: '较差',
    Critical: '危急',
    Unknown: '未知',
  };
  return labels[grade];
}

/**
 * 根据健康等级获取颜色样式
 *
 * @param grade 健康等级
 * @returns 颜色类名
 */
function getGradeColor(grade: HealthGrade): string {
  const colors: Record<HealthGrade, string> = {
    Excellent: 'text-green-400',
    Good: 'text-cyan-400',
    Fair: 'text-yellow-400',
    Poor: 'text-orange-400',
    Critical: 'text-red-400',
    Unknown: 'text-slate-400',
  };
  return colors[grade];
}

// ============================================================================
// 主组件
// ============================================================================

/**
 * HealthQuickViewWidget 组件
 *
 * 展示整船健康状况的紧凑型摘要，提供快速健康概览
 */
export const HealthQuickViewWidget: React.FC<HealthQuickViewWidgetProps> = React.memo((
  {
    onClick,
    className = '',
  }
) => {
  // 从 reports-store 获取系统健康评分（已合并自 health-store）
  const systemHealthScores = useReportsStore(state => state.systemHealthScores);

  // 计算整船平均健康状态
  const overallHealth: OverallHealth = useMemo(() => {
    // 获取所有系统健康评分的数组
    const scoresList = Object.values(systemHealthScores);

    // 如果没有健康评分数据，返回默认值
    if (scoresList.length === 0) {
      return {
        score: 0,
        grade: 'Unknown',
        status: 'critical',
        deviceCount: 0,
      };
    }

    // 计算平均健康分
    const totalScore = scoresList.reduce((sum, scoreData) => sum + scoreData.score, 0);
    const avgScore = Math.round(totalScore / scoresList.length);

    // 根据平均分计算等级和状态
    const grade = getGradeFromScore(avgScore);
    const status = getStatusFromScore(avgScore);

    return {
      score: avgScore,
      grade,
      status,
      deviceCount: scoresList.length,
    };
  }, [systemHealthScores]);

  // 渲染空状态（无健康数据时）
  const renderEmptyState = () => {
    return (
      <div className="text-center py-8">
        <TrendingDown className="w-12 h-12 mx-auto mb-3 text-slate-500" />
        <p className="text-slate-400">暂无健康数据</p>
        <p className="text-xs text-slate-500 mt-1">等待系统初始化</p>
      </div>
    );
  };

  // 渲染健康仪表盘
  const renderHealthGauge = () => {
    return (
      <div className="flex flex-col items-center">
        {/* 使用 GaugeChart 组件展示健康分 */}
        <GaugeChart
          value={overallHealth.score}
          maxValue={100}
          minValue={0}
          label="整船健康分"
          unit="分"
          size="large"
          status={overallHealth.status}
          type="semicircle"
          animated={true}
          thresholds={{
            warning: 50,
            critical: 30,
            showLines: true,
          }}
          showTrend={false}
          showStatistics={false}
        />

        {/* 健康等级展示 */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className={`w-5 h-5 ${getGradeColor(overallHealth.grade)}`} />
            <span className={`text-lg font-semibold ${getGradeColor(overallHealth.grade)}`}>
              {getGradeLabel(overallHealth.grade)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            已监测 {overallHealth.deviceCount} 台设备
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card
      className={`
        bg-slate-800/80 border-slate-700 p-6
        transition-all duration-300
        hover:bg-slate-800 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10
        cursor-pointer
        ${className}
      `}
      onClick={onClick}
    >
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          整船健康速览
        </h3>
      </div>

      {/* 健康仪表盘或空状态 */}
      {overallHealth.deviceCount === 0 ? renderEmptyState() : renderHealthGauge()}
    </Card>
  );
});

// 设置显示名称（用于React DevTools调试）
HealthQuickViewWidget.displayName = 'HealthQuickViewWidget';
