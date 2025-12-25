/**
 * 告警数据表格组件
 *
 * 功能特性：
 * - 展示告警列表的关键信息
 * - 支持告警等级颜色标识
 * - 可选的操作按钮（如确认按钮）
 * - 响应式布局
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
// 从 alarms-store 导入扩展的 Alarm 类型和枚举
import { Alarm, AlertSeverity, AlarmStatus } from '../../stores/alarms-store';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';

/**
 * 告警等级配置
 * 定义不同等级告警的颜色和样式
 */
const SEVERITY_CONFIG = {
  [AlertSeverity.LOW]: {
    label: '低',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  [AlertSeverity.MEDIUM]: {
    label: '中',
    color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  [AlertSeverity.HIGH]: {
    label: '高',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  [AlertSeverity.CRITICAL]: {
    label: '严重',
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    icon: <XCircle className="w-3 h-3" />,
  },
};

/**
 * 告警状态配置
 * 定义不同状态的显示样式
 */
const STATUS_CONFIG = {
  [AlarmStatus.PENDING]: {
    label: '待处理',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
  [AlarmStatus.PROCESSING]: {
    label: '处理中',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  [AlarmStatus.RESOLVED]: {
    label: '已解决',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  [AlarmStatus.IGNORED]: {
    label: '已忽略',
    color: 'bg-gray-400/10 text-gray-500 border-gray-400/20',
  },
};

/**
 * 组件属性接口
 */
interface AlarmTableProps {
  /** 告警数据列表 */
  alarms: Alarm[];
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 是否显示确认按钮 */
  showAcknowledgeButton?: boolean;
  /** 确认按钮点击回调 */
  onAcknowledge?: (alarmId: string) => void;
  /** 空状态提示文本 */
  emptyText?: string;
}

/**
 * 告警数据表格组件
 *
 * 用于在实时告警和历史告警视图中展示告警列表
 */
export function AlarmTable({
  alarms,
  loading = false,
  showAcknowledgeButton = false,
  onAcknowledge,
  emptyText = '暂无告警数据',
}: AlarmTableProps) {
  // 防御性编程：确保alarms始终是一个数组
  const safeAlarms = Array.isArray(alarms) ? alarms : [];
  /**
   * 格式化时间显示
   * 显示相对时间（如"3分钟前"）
   */
  const formatTime = (timestamp: string | number) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: zhCN,
    });
  };

  /**
   * 处理确认按钮点击
   */
  const handleAcknowledge = (alarmId: string) => {
    if (onAcknowledge) {
      onAcknowledge(alarmId);
    }
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 空状态
  if (safeAlarms.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <CheckCircle className="w-12 h-12 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-700 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-900/50">
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="w-[100px] text-slate-300 font-semibold">告警等级</TableHead>
            <TableHead className="w-[120px] text-slate-300 font-semibold">设备名称</TableHead>
            <TableHead className="w-[100px] text-slate-300 font-semibold">指标类型</TableHead>
            <TableHead className="text-slate-300 font-semibold">告警消息</TableHead>
            <TableHead className="w-[100px] text-slate-300 font-semibold">状态</TableHead>
            <TableHead className="w-[120px] text-slate-300 font-semibold">触发时间</TableHead>
            {showAcknowledgeButton && <TableHead className="w-[100px] text-slate-300 font-semibold">操作</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeAlarms.map((alarm) => {
            const severityConfig = SEVERITY_CONFIG[alarm.severity];
            const statusConfig = STATUS_CONFIG[alarm.status];

            return (
              <TableRow key={alarm.id} className="border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                {/* 告警等级 */}
                <TableCell>
                  <Badge variant="outline" className={severityConfig.color}>
                    <span className="flex items-center gap-1">
                      {severityConfig.icon}
                      {severityConfig.label}
                    </span>
                  </Badge>
                </TableCell>

                {/* 设备名称 */}
                <TableCell className="font-medium text-slate-200">{alarm.equipmentName}</TableCell>

                {/* 指标类型 */}
                <TableCell className="text-slate-400">{alarm.metricType}</TableCell>

                {/* 告警消息 */}
                <TableCell className="text-slate-300">
                  <div className="max-w-md truncate" title={alarm.message}>
                    {alarm.message}
                  </div>
                </TableCell>

                {/* 状态 */}
                <TableCell>
                  <Badge variant="outline" className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>

                {/* 触发时间 */}
                <TableCell className="text-sm text-slate-400">
                  {formatTime(alarm.triggeredAt)}
                </TableCell>

                {/* 操作按钮 */}
                {showAcknowledgeButton && (
                  <TableCell>
                    {alarm.status === AlarmStatus.PENDING && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(alarm.id)}
                      >
                        确认
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
