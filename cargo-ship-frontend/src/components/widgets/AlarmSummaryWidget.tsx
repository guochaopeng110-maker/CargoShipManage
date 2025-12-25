/**
 * AlarmSummaryWidget 组件 - 告警摘要小组件
 *
 * 功能说明：
 * - 作为仪表板的核心组件之一，快速展示当前告警态势
 * - 提供按告警等级分类的实时统计数量
 * - 滚动展示最新发生的紧急告警
 * - 提供快捷跳转至告警中心的入口
 *
 * 主要特性：
 * 1. 从 alarms-store 获取告警统计和最新告警数据
 * 2. 按告警等级（Critical、High、Medium、Low）分类展示统计
 * 3. 滚动列表展示最新 2-3 条紧急告警
 * 4. 支持点击告警跳转到详情
 * 5. 提供"查看所有告警"快捷按钮
 * 6. 空状态友好提示
 *
 * 数据源：
 * - alarms-store.statistics - 告警统计数据
 * - alarms-store.criticalAlarms - 严重告警列表
 * - alarms-store.emergencyAlarms - 紧急告警列表
 *
 * @module components/widgets/AlarmSummaryWidget
 */

import React, { useMemo } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useAlarmsStore } from '../../stores/alarms-store';
import { AlarmRecord } from '@/services/api';

// 类型别名 - 使用后端类型
const AlertSeverity = AlarmRecord.severity;
type AlertSeverity = AlarmRecord.severity;
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bell,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * AlarmSummaryWidget 组件属性接口
 */
export interface AlarmSummaryWidgetProps {
  /**
   * 最大显示的最新告警数量
   * @default 3
   */
  maxRecentAlarms?: number;

  /**
   * 查看所有告警按钮点击回调
   */
  onViewAllClick?: () => void;

  /**
   * 告警点击回调
   * @param alarmId 告警ID
   */
  onAlarmClick?: (alarmId: string) => void;

  /**
   * 自定义CSS类名
   */
  className?: string;
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 告警严重程度配置
 */
const SEVERITY_CONFIG = {
  [AlertSeverity.CRITICAL]: {
    label: '严重',
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
  },
  [AlertSeverity.HIGH]: {
    label: '高危',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
  },
  [AlertSeverity.MEDIUM]: {
    label: '中等',
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
  },
  [AlertSeverity.LOW]: {
    label: '低危',
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
};

// ============================================================================
// 主组件
// ============================================================================

/**
 * AlarmSummaryWidget 组件
 *
 * 展示告警态势摘要，提供快速告警概览
 */
export const AlarmSummaryWidget: React.FC<AlarmSummaryWidgetProps> = React.memo(({
  maxRecentAlarms = 3,
  onViewAllClick,
  onAlarmClick,
  className = '',
}) => {
  // 从 alarms-store 获取数据
  const statistics = useAlarmsStore(state => state.statistics);
  const criticalAlarms = useAlarmsStore(state => state.criticalAlarms);
  const emergencyAlarms = useAlarmsStore(state => state.emergencyAlarms);

  // 合并并排序最新紧急告警
  const recentAlarms = useMemo(() => {
    const allAlarms = [...criticalAlarms, ...emergencyAlarms];
    // 按触发时间降序排序，获取最新的
    return allAlarms
      .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt))
      .slice(0, maxRecentAlarms);
  }, [criticalAlarms, emergencyAlarms, maxRecentAlarms]);

  // 按严重程度获取告警数量
  const getSeverityCount = (severity: AlertSeverity): number => {
    if (!statistics?.groupBySeverity) return 0;
    const item = statistics.groupBySeverity.find(g => g.severity === severity);
    return item?.count ?? 0;
  };

  // 渲染告警等级统计卡片
  const renderStatistics = () => {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
          const count = getSeverityCount(severity as AlertSeverity);
          const Icon = config.icon;

          return (
            <div
              key={severity}
              className={`p-3 rounded-lg border ${config.bg} ${config.border} transition-all hover:scale-105`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className="text-xs text-slate-400">{config.label}</span>
              </div>
              <div className={`text-2xl font-bold ${config.color}`}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染最新告警列表
  const renderRecentAlarms = () => {
    if (recentAlarms.length === 0) {
      return (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-500" />
          <p className="text-slate-400">暂无实时告警</p>
          <p className="text-xs text-slate-500 mt-1">系统运行正常</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {recentAlarms.map((alarm) => {
          const config = SEVERITY_CONFIG[alarm.severity];
          const Icon = config.icon;

          return (
            <div
              key={alarm.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg
                bg-slate-800/50 border ${config.border}
                hover:bg-slate-800 transition-colors cursor-pointer
              `}
              onClick={() => onAlarmClick?.(alarm.id)}
            >
              {/* 告警图标 */}
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.color}`} />

              {/* 告警信息 */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${config.color} font-medium truncate`}>
                  {alarm.message}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(alarm.triggeredAt).toLocaleString('zh-CN')}
                </p>
              </div>

              {/* 箭头图标 */}
              <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={`bg-slate-800/80 border-slate-700 p-6 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-cyan-400" />
          实时告警
        </h3>
      </div>

      {/* 告警统计 */}
      <div className="mb-6">
        {renderStatistics()}
      </div>

      {/* 最新告警列表 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">
          最新紧急告警
        </h4>
        {renderRecentAlarms()}
      </div>

      {/* 查看所有告警按钮 */}
      <Button
        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
        onClick={onViewAllClick}
      >
        查看所有告警
      </Button>
    </Card>
  );
});

// 设置显示名称（用于React DevTools调试）
AlarmSummaryWidget.displayName = 'AlarmSummaryWidget';
