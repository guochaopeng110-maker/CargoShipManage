/**
 * DedicatedAlarmZone 组件 - 专属告警区
 *
 * 功能说明：
 * - 展示与指定设备相关的告警列表
 * - 从 alarms-store 获取告警数据并实时更新
 * - 支持单设备和多设备告警展示
 * - 提供告警分组、限制数量、查看全部等功能
 *
 * 组件职责：
 * - 过滤和展示特定设备的告警
 * - 处理空状态、加载状态
 * - 提供告警详情展示和操作入口
 *
 * 使用场景：
 * - 单设备监控页面（仅显示该设备的告警）
 * - 多设备监控页面（显示多个设备的告警，支持分组）
 *
 * @example
 * ```tsx
 * // 单设备场景
 * <DedicatedAlarmZone equipmentIds="SYS-BAT-001" />
 *
 * // 多设备场景（左右推进系统）
 * <DedicatedAlarmZone
 *   equipmentIds={['SYS-PROP-L-001', 'SYS-PROP-R-001']}
 *   groupByEquipment={true}
 *   maxItems={30}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import { useAlarmsStore } from '../../stores/alarms-store';
import { motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, ExternalLink, AlertOctagon } from 'lucide-react';
// 从 alarms-store 导入扩展后的 Alarm 类型和枚举
import { Alarm, AlertSeverity, AlarmStatus } from '../../stores/alarms-store';
import { Link } from 'react-router-dom';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * DedicatedAlarmZone 组件属性
 */
export interface DedicatedAlarmZoneProps {
  /** 设备ID（单个或多个）。支持字符串或字符串数组 */
  equipmentIds: string | string[];

  /** 是否按设备分组显示（多设备场景）。默认：false */
  groupByEquipment?: boolean;

  /** 最大显示数量。默认：20 */
  maxItems?: number;

  /** 自定义CSS类名（可选） */
  className?: string;
}

// ============================================================================
// 严重程度配置
// ============================================================================

/**
 * 严重程度样式配置
 */
const SEVERITY_STYLES = {
  [AlertSeverity.LOW]: {
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    textColor: 'text-blue-300',
    icon: Info,
    label: '提示',
  },
  [AlertSeverity.MEDIUM]: {
    bgColor: 'bg-amber-400/20',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-300',
    icon: AlertCircle,
    label: '警告',
  },
  [AlertSeverity.HIGH]: {
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-600/40',
    textColor: 'text-amber-200',
    icon: AlertTriangle,
    label: '严重',
  },
  [AlertSeverity.CRITICAL]: {
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    textColor: 'text-red-300',
    icon: AlertOctagon,
    label: '紧急',
  },
};

/**
 * 告警状态样式配置
 */
const STATUS_STYLES = {
  [AlarmStatus.PENDING]: {
    label: '待处理',
    badgeColor: 'bg-red-500/20 text-red-200 border-red-500/40',
  },
  [AlarmStatus.PROCESSING]: {
    label: '处理中',
    badgeColor: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
  },
  [AlarmStatus.RESOLVED]: {
    label: '已解决',
    badgeColor: 'bg-green-500/20 text-green-200 border-green-500/40',
  },
  [AlarmStatus.IGNORED]: {
    label: '已忽略',
    badgeColor: 'bg-gray-500/20 text-gray-200 border-gray-500/40',
  },
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化时间显示
 * 
 * @param timestamp ISO 字符串或数字时间戳
 * @returns 相对时间字符串
 */
const formatRelativeTime = (timestamp: string | number): string => {
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '未知时间';

    const now = Date.now();
    const diff = now - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  } catch (e) {
    return '未知时间';
  }
};

// ============================================================================
// 告警卡片组件
// ============================================================================

/**
 * AlarmCard - 单个告警卡片
 */
const AlarmCard: React.FC<{ alarm: Alarm }> = React.memo(({ alarm }) => {
  const severityConfig = SEVERITY_STYLES[alarm.severity];
  const statusConfig = STATUS_STYLES[alarm.status];
  const Icon = severityConfig.icon;

  return (
    <motion.div
      className={`
        rounded-lg border p-4
        ${severityConfig.bgColor}
        ${severityConfig.borderColor}
        hover:scale-[1.02] transition-transform
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* 顶部：严重程度 + 状态 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${severityConfig.textColor}`} />
          <span className={`text-sm font-semibold ${severityConfig.textColor}`}>
            {severityConfig.label}
          </span>
        </div>
        <span className={`
          text-xs px-2 py-1 rounded border
          ${statusConfig.badgeColor}
        `}>
          {statusConfig.label}
        </span>
      </div>

      {/* 中部：告警消息 - 文本颜色改为亮色，增加字重 */}
      <div className="mb-2">
        <p className="text-white text-base font-bold">
          {alarm.message}
        </p>

        {/* 建议措施（如果有） */}
        {alarm.recommendedAction && (
          <div className="mt-2 flex items-start gap-2 text-xs text-blue-50 bg-blue-900/50 border border-blue-400/30 p-2.5 rounded shadow-sm">
            <Info className="w-4 h-4 shrink-0 text-blue-300 mt-0.5" />
            <p className="leading-relaxed font-semibold tracking-wide">
              {alarm.recommendedAction}
            </p>
          </div>
        )}
      </div>

      {/* 底部：设备名称 + 时间 */}
      <div className="flex items-center justify-between text-xs text-slate-200 mt-3 pt-2 border-t border-white/10 font-medium">
        <span>{alarm.equipmentName || alarm.equipmentId}</span>
        <span>{formatRelativeTime(alarm.triggeredAt)}</span>
      </div>

      {/* 阈值信息（如果有） */}
      {(alarm.thresholdRange || alarm.abnormalValue !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300 bg-black/40 border border-white/5 p-2 rounded">
          {alarm.thresholdRange && (
            <span className="flex items-center gap-1">
              <span className="text-slate-400">阈值:</span>
              <span className="font-mono text-slate-100 font-medium">{alarm.thresholdRange}</span>
            </span>
          )}
          {alarm.abnormalValue !== undefined && (
            <span className="ml-auto flex items-center gap-1">
              <span className="text-slate-400">当前值:</span>
              <span className="text-white font-mono font-black text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{alarm.abnormalValue}</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
});

AlarmCard.displayName = 'AlarmCard';

// ============================================================================
// DedicatedAlarmZone 组件
// ============================================================================

/**
 * DedicatedAlarmZone - 专属告警区组件
 *
 * 展示与指定设备相关的告警列表
 */
export const DedicatedAlarmZone: React.FC<DedicatedAlarmZoneProps> = React.memo(({
  equipmentIds,
  groupByEquipment = false,
  maxItems = 20,
  className = '',
}) => {
  // --------------------------------------------------------------------------
  // 状态管理
  // --------------------------------------------------------------------------

  // 从 alarms-store 获取告警数据
  const { items: allAlarms, loading, error } = useAlarmsStore((state) => ({
    items: state.items,
    loading: state.loading,
    error: state.error,
  }));

  // --------------------------------------------------------------------------
  // 告警过滤逻辑
  // --------------------------------------------------------------------------

  /**
   * 过滤与指定设备相关的告警
   *
   * 使用 useMemo 优化性能，仅在 allAlarms 或 equipmentIds 变化时重新计算
   */
  const filteredAlarms = useMemo(() => {
    // 将 equipmentIds 统一转换为数组
    const targetIds = Array.isArray(equipmentIds) ? equipmentIds : [equipmentIds];

    // 过滤告警：仅保留与目标设备相关的告警
    const filtered = allAlarms.filter(alarm =>
      targetIds.includes(alarm.equipmentId)
    );

    // 限制数量
    return filtered.slice(0, maxItems);
  }, [allAlarms, equipmentIds, maxItems]);

  // 是否有更多告警（超过 maxItems）
  const hasMore = useMemo(() => {
    const targetIds = Array.isArray(equipmentIds) ? equipmentIds : [equipmentIds];
    const totalCount = allAlarms.filter(alarm =>
      targetIds.includes(alarm.equipmentId)
    ).length;
    return totalCount > maxItems;
  }, [allAlarms, equipmentIds, maxItems]);

  // --------------------------------------------------------------------------
  // 渲染逻辑
  // --------------------------------------------------------------------------

  // 错误状态
  if (error) {
    return (
      <div className={`dedicated-alarm-zone ${className}`}>
        <div className="rounded-lg bg-red-500/10 border border-red-500/40 p-6 shadow-lg shadow-red-950/20">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-300" />
            <h3 className="text-lg font-black text-red-300 tracking-tight">加载告警数据失败</h3>
          </div>
          <p className="text-sm text-red-100 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  // 空状态
  if (!loading && filteredAlarms.length === 0) {
    return (
      <div className={`dedicated-alarm-zone ${className}`}>
        {/* 区域标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-100">告警中心</h2>
        </div>

        {/* 空状态提示 */}
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-8 text-center shadow-lg shadow-green-950/20">
          <Info className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-green-400 text-lg font-bold">暂无告警</p>
          <p className="text-slate-300 text-sm mt-2 font-medium">系统运行正常</p>
        </div>
      </div>
    );
  }

  // 正常渲染：告警列表
  return (
    <div className={`dedicated-alarm-zone ${className}`}>
      {/* 区域标题 + 查看全部链接 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-white tracking-tight">
          告警中心
          {filteredAlarms.length > 0 && (
            <span className="ml-2 text-sm font-bold text-slate-300">
              （{filteredAlarms.length}条）
            </span>
          )}
        </h2>

        {hasMore && (
          <Link
            to="/alarm-center"
            className="flex items-center gap-1 text-sm font-bold text-blue-400 hover:text-blue-200 transition-colors"
          >
            查看全部
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* 告警列表 - 增加固定高度滚动容器与高级感滚动条样式 */}
      <div className="relative group/scroll">
        <style dangerouslySetInnerHTML={{
          __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 10px;
            transition: all 0.3s;
          }
          .custom-scrollbar:hover::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.6);
          }
        `}} />

        <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-[250px] pr-2 scroll-smooth">
          {filteredAlarms.map((alarm) => (
            <AlarmCard key={alarm.id} alarm={alarm} />
          ))}
        </div>
      </div>

      {/* 加载更多提示 */}
      {loading && (
        <div className="text-center py-4">
          <span className="text-sm text-slate-300 font-bold animate-pulse">正在同步数据...</span>
        </div>
      )}
    </div>
  );
});

// 设置显示名称（用于调试）
DedicatedAlarmZone.displayName = 'DedicatedAlarmZone';

// ============================================================================
// 默认导出
// ============================================================================

export default DedicatedAlarmZone;
