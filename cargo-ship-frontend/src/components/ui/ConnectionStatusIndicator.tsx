/**
 * WebSocket 连接状态指示器组件
 *
 * 功能：
 * 1. 显示实时 WebSocket 连接状态
 * 2. 颜色编码：绿色（已连接）、黄色（连接中）、红色（断开）
 * 3. 点击显示详细连接信息
 */

import React, { useState } from 'react';
import { useMonitoringStore } from '../../stores/monitoring-store';
import { useAlarmsStore } from '../../stores/alarms-store';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

export function ConnectionStatusIndicator() {
  const [showDetails, setShowDetails] = useState(false);

  // 获取各个 store 的连接状态
  const monitoringConnected = useMonitoringStore(state => state.realtimeConnected);
  const alarmsConnected = useAlarmsStore(state => state.realtimeConnected);
  // 注意：health-store 已重构为基于 HTTP API，不再有实时连接状态

  // 计算整体连接状态
  const isFullyConnected = monitoringConnected && alarmsConnected;
  const isPartiallyConnected = monitoringConnected || alarmsConnected;

  // 确定显示状态
  const status = isFullyConnected
    ? 'connected'
    : isPartiallyConnected
      ? 'connecting'
      : 'disconnected';

  // 状态配置
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      text: '已连接',
      pulse: false
    },
    connecting: {
      icon: AlertCircle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/50',
      text: '连接中',
      pulse: true
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: '未连接',
      pulse: false
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="relative">
      {/* 状态指示器按钮 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          border ${config.border} ${config.bg}
          transition-all duration-200
          hover:opacity-80
        `}
      >
        <Icon
          className={`w-4 h-4 ${config.color} ${config.pulse ? 'animate-pulse' : ''}`}
        />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>
      </button>

      {/* 详细信息面板 */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">连接状态详情</h3>

          <div className="space-y-2">
            {/* 监测数据连接 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">监测数据</span>
              <div className={`w-2 h-2 rounded-full ${monitoringConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>

            {/* 告警连接 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">实时告警</span>
              <div className={`w-2 h-2 rounded-full ${alarmsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>

          {/* 提示信息 */}
          {!isFullyConnected && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                {isPartiallyConnected
                  ? '部分服务未连接，正在重试...'
                  : '所有服务未连接，请检查网络'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
