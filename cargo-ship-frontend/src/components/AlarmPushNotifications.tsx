/**
 * 货船智能机舱管理系统 - 告警推送通知组件 (简化对齐版)
 * 
 * 职责说明：
 * 1. 订阅全局告警推送 (WebSocket)。
 * 2. 实时展示未处理的高危和严重告警。
 * 3. 提供基础的告警操作：确认、解决、忽略。
 * 4. 播放告警音效及语音提示。
 * 5. 管理实时连接状态。
 * 
 * 修改说明：
 * - 移除了后端尚未实现的 AI 分析、报表生成、规则管理等“幻觉”功能。
 * - 严格对齐 alarms-store.ts 接口。
 * - 修正了 TypeScript 类型定义及枚举引用错误。
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAlarmsStore } from '../stores/alarms-store';
import { AlarmRecord } from '@/services/api';
import {
  Bell, BellRing, Settings, VolumeX, Ear, Shield,
  Activity, Zap, Info, AlertTriangle, AlertCircle,
  X, CheckCircle, RotateCcw, Clock, Brain
} from 'lucide-react';

import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// 对齐后端的类型与枚举
type Alarm = AlarmRecord;
type AlertSeverity = AlarmRecord.severity;
type AlarmStatus = AlarmRecord.status;

// 获取枚举对象用于比较
const AlertSeverityEnum = AlarmRecord.severity;
const AlarmStatusEnum = AlarmRecord.status;

export function AlarmPushNotifications() {
  // 从 Store 获取核心状态和行动
  const {
    items: alarms,
    loading,
    error,
    realtimeConnected,
    statistics,
    criticalAlarms,
    emergencyAlarms,

    // 操作
    fetchAlarms,
    getAlarmStatistics,
    getCriticalAlarms,
    acknowledgeAlarm,
    resolveAlarm,
    ignoreAlarm,
    handleEmergencyAlarm,
    initSubscription,
    disposeSubscription,
    clearError,
  } = useAlarmsStore();

  // ===== 本地 UI 状态 =====
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('alarms');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [lastProcessedId, setLastProcessedId] = useState<string | null>(null);

  // 音频引用
  const audioContextRef = useRef<AudioContext | null>(null);

  // ===== 初始化与数据订阅 =====
  useEffect(() => {
    // 初始化数据
    fetchAlarms().catch(console.error);
    getAlarmStatistics().catch(console.error);
    getCriticalAlarms().catch(console.error);

    // 建立实时推送监听
    initSubscription();

    return () => {
      disposeSubscription();
    };
  }, []);

  // ===== 实时侦听处理 (音效推送) =====
  useEffect(() => {
    if (alarms.length > 0) {
      const latest = alarms[0];
      if (latest.id !== lastProcessedId) {
        setLastProcessedId(latest.id);

        // 触发音效
        if (voiceEnabled) {
          playAlarmSound(latest.severity);
        }

        // 严重告警触发紧急模式
        if (latest.severity === AlertSeverityEnum.CRITICAL) {
          setEmergencyMode(true);
          setTimeout(() => setEmergencyMode(false), 15000);
        }
      }
    }
  }, [alarms, lastProcessedId, voiceEnabled]);

  // ===== 音频逻辑 =====
  const playAlarmSound = useCallback((severity: AlertSeverity) => {
    if (!audioContextRef.current) {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }
    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const freqs = {
      [AlertSeverityEnum.LOW]: 800,
      [AlertSeverityEnum.MEDIUM]: 600,
      [AlertSeverityEnum.HIGH]: 400,
      [AlertSeverityEnum.CRITICAL]: 200
    };

    const freq = freqs[severity] || 440;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  // ===== 渲染辅助 =====
  const getSeverityStyle = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverityEnum.CRITICAL: return 'text-red-400 border-red-500/30 bg-red-500/5';
      case AlertSeverityEnum.HIGH: return 'text-orange-400 border-orange-500/30 bg-orange-500/5';
      case AlertSeverityEnum.MEDIUM: return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5';
      default: return 'text-blue-400 border-blue-500/30 bg-blue-500/5';
    }
  };

  const SeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverityEnum.CRITICAL: return <AlertCircle className="w-4 h-4" />;
      case AlertSeverityEnum.HIGH: return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // 如果没有告警且没有错误，且面板关闭，则只显示一个悬浮球按钮
  if (!showPanel && emergencyAlarms.length === 0 && criticalAlarms.length === 0) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setShowPanel(true)}
          size="icon"
          className={`w-14 h-14 rounded-full shadow-2xl ${realtimeConnected ? 'bg-blue-600' : 'bg-slate-700'}`}
        >
          {realtimeConnected ? <BellRing className="w-6 h-6 animate-pulse" /> : <Bell className="w-6 h-6" />}
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${showPanel ? 'w-96' : 'w-14'}`}>

      {/* 最小化状态的悬浮球（当有紧急告警时强行展示紧急气泡） */}
      {!showPanel ? (
        <div className="relative">
          <Button
            onClick={() => setShowPanel(true)}
            size="icon"
            className={`w-14 h-14 rounded-full shadow-2xl bg-red-600 animate-bounce`}
          >
            <AlertCircle className="w-8 h-8" />
          </Button>
          {(emergencyAlarms.length > 0 || criticalAlarms.length > 0) && (
            <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-red-600">
              {emergencyAlarms.length + criticalAlarms.length}
            </span>
          )}
        </div>
      ) : (
        /* 面板状态 */
        <Card className="bg-slate-900/95 border-slate-700 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col max-h-[600px]">
          {/* 头部控制栏 */}
          <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${realtimeConnected ? 'text-green-400' : 'text-slate-400'}`} />
              <span className="font-bold text-slate-100">实时告警监测</span>
              {realtimeConnected && <Badge className="bg-green-500/10 text-green-500 border-none px-1 text-[10px]">CONNECTED</Badge>}
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => setVoiceEnabled(!voiceEnabled)}>
                {voiceEnabled ? <Ear className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              </Button>
              <Button size="icon" variant="ghost" className="w-8 h-8" onClick={() => setShowPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="bg-slate-800 rounded-none w-full grid grid-cols-2">
              <TabsTrigger value="alarms" className="text-xs">
                正在处理 ({alarms.filter(a => a.status === AlarmStatusEnum.PENDING).length})
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">统计概览</TabsTrigger>
            </TabsList>

            <TabsContent value="alarms" className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[450px]">
              {alarms.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">暂无活跃告警，系统运行良好</p>
                </div>
              ) : (
                alarms.map(alarm => (
                  <div key={alarm.id} className={`p-3 rounded-lg border flex flex-col gap-2 ${getSeverityStyle(alarm.severity)}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {SeverityIcon(alarm.severity)}
                        <span className="text-xs font-bold uppercase">{alarm.equipmentName || '未知系统'}</span>
                      </div>
                      <span className="text-[10px] opacity-50 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alarm.triggeredAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{alarm.message || alarm.faultName}</p>

                    {/* 操作按钮区 (仅显示最核心操作) */}
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[10px] bg-slate-800/50 border-slate-700"
                        onClick={() => acknowledgeAlarm(alarm.id, '已确认')}
                      >
                        忽略并确认
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[10px] bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={() => resolveAlarm(alarm.id, '已解决')}
                      >
                        标记已处理
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="stats" className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase">待处理告警</p>
                  <p className="text-2xl font-black text-white">{statistics?.pendingCount || 0}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                  <p className="text-[10px] text-slate-400 uppercase">全天总计</p>
                  <p className="text-2xl font-black text-blue-400">{statistics?.totalCount || 0}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3" /> 系统连接健康度
                </h4>
                <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-slate-400">WebSocket 通道</span>
                  <span className={realtimeConnected ? 'text-green-400' : 'text-red-400'}>
                    {realtimeConnected ? '稳健' : '断开'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-400">最后更新</span>
                  <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <Button
                variant="link"
                className="w-full text-blue-400 text-xs"
                onClick={() => getAlarmStatistics()}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                重新同步统计数据
              </Button>
            </TabsContent>
          </Tabs>

          {/* 页脚 */}
          <div className="p-2 px-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-600">
            <span>CARGO-SPEC-ALPHA v3.0</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> REALTIME
            </span>
          </div>
        </Card>
      )}

      {/* 严重全屏闪烁提示 (仅紧急模式) */}
      {emergencyMode && (
        <div className="fixed inset-0 pointer-events-none ring-[12px] ring-red-600/30 animate-pulse z-[60]" />
      )}
    </div>
  );
}

export default AlarmPushNotifications;