/**
 * 告警中心页面 - 主组件
 *
 * 功能特性：
 * - 双模视图设计（实时告警 + 历史告警）
 * - 通过 Tabs 组件实现视图切换
 * - 自动管理实时订阅的生命周期
 * - 统一的告警管理入口
 *
 * 架构亮点：
 * - 实时告警：WebSocket 推送驱动，自动更新
 * - 历史告警：用户驱动查询，筛选-分页列表模式
 * - 闭环数据流：用户操作 → API → WebSocket → Store → UI
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { Bell, History } from 'lucide-react';
import { useAlarmsStore } from '../../stores/alarms-store';
import { RealTimeAlarmsView } from './RealTimeAlarmsView';
import { HistoricalAlarmsView } from './HistoricalAlarmsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

/**
 * 告警中心页面主组件
 *
 * 职责：
 * 1. 管理 Tabs 切换逻辑
 * 2. 在组件挂载时初始化实时订阅
 * 3. 在组件卸载时清理订阅
 * 4. 协调两个子视图的展示
 */
export default function AlarmCenterPage() {
  // 注意：实时告警订阅现由 App.tsx 全局管理，无需在此初始化

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="container mx-auto space-y-6">
        {/* 页面头部 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">告警中心</h1>
          <p className="text-slate-400">
            统一管理实时告警和历史告警，实时监控系统健康状态
          </p>
        </div>

        {/* 双模视图 Tabs */}
        <Tabs defaultValue="realtime" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-800/50">
            <TabsTrigger value="realtime" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Bell className="h-4 w-4" />
              实时告警
            </TabsTrigger>
            <TabsTrigger value="historical" className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <History className="h-4 w-4" />
              历史告警
            </TabsTrigger>
          </TabsList>

          {/* 实时告警标签页内容 */}
          <TabsContent value="realtime" className="space-y-4">
            <RealTimeAlarmsView />
          </TabsContent>

          {/* 历史告警标签页内容 */}
          <TabsContent value="historical" className="space-y-4">
            <HistoricalAlarmsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
