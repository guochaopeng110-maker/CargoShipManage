/**
 * InverterMonitoringPage 组件 - 逆变器系统监控页面（重构版）
 *
 * 功能说明：
 * - 采用监控墙模式重构的逆变器系统监控页面
 * - 整合双逆变器（1#和2#）的实时监控数据
 * - 使用MonitoringWall组件实现响应式网格布局
 * - 使用DedicatedAlarmZone组件显示逆变器系统专属告警
 * - 管理实时数据订阅的生命周期（订阅/取消订阅）
 *
 * 页面布局：
 * - 顶部：页面标题和面包屑导航
 * - 中部：左右双栏监控墙（响应式网格展示所有监测点）
 *   - 左栏：1#日用逆变器（SYS-INV-1-001）
 *   - 右栏：2#日用逆变器（SYS-INV-2-001）
 * - 底部：专属告警区（仅显示逆变器系统的告警）
 *
 * 架构特点：
 * - 页面组件是"哑"组件，完全通过 Zustand stores 驱动渲染
 * - 不包含数据获取或订阅管理的复杂逻辑（由 stores 和 services 负责）
 * - 遵循"单一真理源"原则
 * - 使用framer-motion实现流畅的动画效果
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0 (监控墙模式)
 * @since 2025-01-13
 */

import React, { useEffect, useState } from 'react';
import { useMonitoringStore } from '../stores/monitoring-store';
import { useAlarmsStore } from '../stores/alarms-store';
import { realtimeService } from '../services/realtime-service';
import MonitoringWall from './monitoring/MonitoringWall';
import DedicatedAlarmZone from './monitoring/DedicatedAlarmZone';
import { Zap, Home, ChevronRight, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 1#逆变器设备ID
 */
const INVERTER_1_EQUIPMENT_ID = 'SYS-INV-1-001';

/**
 * 2#逆变器设备ID
 */
const INVERTER_2_EQUIPMENT_ID = 'SYS-INV-2-001';

/**
 * 页面标题
 */
const PAGE_TITLE = '逆变器系统监控';

/**
 * 面包屑导航配置
 */
const BREADCRUMBS = [
  { label: '首页', path: '/dashboard', icon: Home },
  { label: '实时监控', path: '/monitoring' },
  { label: PAGE_TITLE, path: '/monitoring/inverter' },
];

// ============================================================================
// 连接状态指示器组件
// ============================================================================

/**
 * ConnectionStatusIndicator - 连接状态指示器
 *
 * 显示 WebSocket 连接状态，帮助用户了解实时数据流的连接情况
 */
const ConnectionStatusIndicator: React.FC = () => {
  const { realtimeConnected, connectionStatus } = useMonitoringStore((state) => ({
    realtimeConnected: state.realtimeConnected,
    connectionStatus: state.connectionStatus,
  }));

  if (realtimeConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Wifi className="w-4 h-4" />
        <span>实时连接</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-400">
      <WifiOff className="w-4 h-4" />
      <span>连接中断</span>
    </div>
  );
};

// ============================================================================
// 面包屑导航组件
// ============================================================================

/**
 * Breadcrumbs - 面包屑导航
 *
 * 提供清晰的页面层级导航，帮助用户了解当前位置
 */
const Breadcrumbs: React.FC = () => {
  return (
    <nav className="flex items-center gap-2 text-sm text-slate-300 mb-4 font-medium">
      {BREADCRUMBS.map((crumb, index) => {
        const isLast = index === BREADCRUMBS.length - 1;
        const Icon = crumb.icon;

        return (
          <React.Fragment key={crumb.path}>
            {index > 0 && <ChevronRight className="w-4 h-4 opacity-50" />}
            {isLast ? (
              <span className="text-white font-bold flex items-center gap-1">
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-slate-300 hover:text-white transition-colors flex items-center gap-1"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// ============================================================================
// InverterMonitoringPage 组件
// ============================================================================

/**
 * InverterMonitoringPage - 逆变器系统监控页面
 *
 * 采用监控墙模式的标准实现，使用左右双栏布局展示双逆变器监控
 */
export const InverterMonitoringPage: React.FC = () => {
  // --------------------------------------------------------------------------
  // 状态管理
  // --------------------------------------------------------------------------

  // 页面初始化状态（由原本的 true 改为 false，因为订阅现已在全局完成）
  const [isInitializing] = useState(false);

  // --------------------------------------------------------------------------
  // 渲染逻辑
  // --------------------------------------------------------------------------

  // 初始化加载状态
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4" />
            <p className="text-slate-300 text-lg font-medium">正在初始化监控系统...</p>
          </div>
        </div>
      </div>
    );
  }

  // 正常页面渲染
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ====================================================================== */}
        {/* 顶部区域：面包屑导航 + 页面标题 + 连接状态 */}
        {/* ====================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          {/* 面包屑导航 */}
          <Breadcrumbs />

          {/* 页面标题 + 连接状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{PAGE_TITLE}</h1>
                <p className="text-sm text-slate-300 mt-1 font-medium italic">1#/2#日用逆变器实时监控与管理</p>
              </div>
            </div>

            {/* 连接状态已移至 TopBar */}
          </div>
        </motion.div>

        {/* ====================================================================== */}
        {/* 中部区域：左右双栏监控墙 */}
        {/* ====================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 1#逆变器监控墙 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <MonitoringWall
              equipmentId={INVERTER_1_EQUIPMENT_ID}
              title="1#日用逆变器"
              columnCount={{ desktop: 2, tablet: 2, mobile: 1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            />
          </motion.div>

          {/* 2#逆变器监控墙 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <MonitoringWall
              equipmentId={INVERTER_2_EQUIPMENT_ID}
              title="2#日用逆变器"
              columnCount={{ desktop: 2, tablet: 2, mobile: 1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            />
          </motion.div>
        </div>

        {/* ====================================================================== */}
        {/* 底部区域：专属告警区 */}
        {/* ====================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <DedicatedAlarmZone
            equipmentIds={[INVERTER_1_EQUIPMENT_ID, INVERTER_2_EQUIPMENT_ID]}
            maxItems={10}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          />
        </motion.div>

        {/* ====================================================================== */}
        {/* 页脚提示 */}
        {/* ====================================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-8 text-center text-sm text-slate-300/90 font-bold"
        >
          <p className="flex items-center justify-center gap-2 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            数据每秒自动更新 · 无需手动刷新
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================================================
// 默认导出
// ============================================================================

export default InverterMonitoringPage;
