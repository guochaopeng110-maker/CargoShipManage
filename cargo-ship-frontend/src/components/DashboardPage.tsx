/**
 * 货船智能机舱管理控制台 - Dashboard (重构版)
 * 
 * 功能说明：
 * - 应用的全船指挥中心，聚合 8 大系统的核心健康数据。
 * - 实时展示全局告警态势和全船系统健康矩阵。
 * - 支持快速导航至各子系统监控详情。
 * 
 * 修改说明：
 * 1. 移除了旧版 CriticalMetricsWall。
 * 2. 引入了 SystemsStatusGrid 展示 8 大系统矩阵。
 * 3. 提升了 AlarmSummaryWidget 的显示层级。
 * 4. 采用现代暗黑玻璃拟态风格。
 */

import React from 'react';
import { useMonitoringStore } from '../stores/monitoring-store';
import { SystemsStatusGrid } from './widgets/SystemsStatusGrid';
import { AlarmSummaryWidget } from './widgets/AlarmSummaryWidget';
import { HealthQuickViewWidget } from './widgets/HealthQuickViewWidget';
import { LayoutGrid, AlertCircle, Heart } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  // ========================================================================
  // 逻辑处理
  // ========================================================================

  const handleAlarmClick = (alarmId?: string) => {
    onNavigate('alerts'); // 跳转至告警中心
  };

  const handleHealthClick = () => {
    onNavigate('health'); // 跳转至健康评估
  };

  // ========================================================================
  // 渲染
  // ========================================================================

  return (
    <div className="min-h-screen bg-[#0a0f18] p-8 text-slate-100 selection:bg-blue-500/30 overflow-hidden flex flex-col">
      <div className="w-full flex-1 flex flex-col space-y-8">

        {/* 顶部标题区 */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <LayoutGrid className="w-8 h-8 text-blue-500" />
              智能机舱全船指挥中心
            </h1>
            <p className="text-slate-300 mt-1 font-semibold italic tracking-wide">REAL-TIME SHIP MANAGEMENT CONSOLE V2.0</p>
          </div>

          {/* 这里可以放置全局的时间显示或额外的状态统计 */}
        </header>

        {/* 系统健康矩阵区域 (核心主内容) */}
        <section className="space-y-6">
          <SystemsStatusGrid />
        </section>

        {/* 页脚装饰或版本信息 */}
        <footer className="pt-8 border-t border-white/5 text-center">
          <p className="text-slate-400 text-xs font-mono tracking-widest uppercase font-bold">
            Data Contract Aligned · Standardized Realtime Bus · OpenSpec Delta Deployed
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardPage;
