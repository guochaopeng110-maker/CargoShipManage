/**
 * 货船智能机舱管理系统 - 告警推送通知组件（增强版）
 * 
 * 扩展功能：
 * 1. 集成增强的告警服务系统和权限控制
 * 2. 支持实时告警推送和WebSocket连接管理
 * 3. 智能告警分析和自动分类功能
 * 4. 紧急告警快速响应和处理机制
 * 5. 批量智能处理和AI辅助操作
 * 6. 告警规则和模板管理
 * 7. 趋势分析和预测功能
 * 8. 多维度告警统计和报表生成
 * 
 * 核心架构：
 * - 基于React Hooks的组件化设计
 * - 集成TypeScript类型安全
 * - 支持实时WebSocket通信
 * - 智能缓存和性能优化
 * - 完整的错误处理和重试机制
 * 
 * @version 3.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-11-20
 */

// React核心钩子导入
import React, { useState, useEffect, useRef, useCallback } from 'react';

// UI组件导入
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

// 状态管理钩子导入
import { useAlarmsStore } from '../stores/alarms-store';

// 类型导入
import { Alarm, AlertSeverity, AlarmStatus } from '../types/alarms';

// 图标组件导入（来自Lucide React图标库）
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Settings,
  CheckCircle,
  Clock,
  Filter,
  Zap,
  Brain,
  TrendingUp,
  Shield,
  Users,
  FileText,
  Download,
  Sparkles,
  Cpu,
  Activity,
  Target,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Ear
} from 'lucide-react';

/**
 * 告警推送通知组件（增强版）
 * 
 * 集成高级功能的告警通知管理系统
 * 包括实时通信、智能分析、紧急处理等特性
 * 
 * @returns {JSX.Element} 告警通知组件的JSX元素
 */
export function AlarmPushNotifications() {
  // ===== 增强告警Store状态管理 =====
  const {
    // 基础状态
    items: alarms,
    loading,
    error,
    realTimeConnected,
    statistics,
    criticalAlarms,
    emergencyAlarms,
    smartProcessing,
    realtimeSubscriptionActive,
    
    // 操作方法
    fetchAlarms,
    subscribeToRealTimeAlarms,
    unsubscribeFromRealTimeAlarms,
    acknowledgeAlarm,
    resolveAlarm,
    ignoreAlarm,
    smartAcknowledgeAlarm,
    handleEmergencyAlarm,
    bulkAcknowledge,
    bulkResolve,
    bulkIgnore,
    smartBulkProcess,
    getAlarmTrendAnalysis,
    classifyAlarm,
    getAlarmStatistics,
    getCriticalAlarms,
    generateAlarmReport,
    getAlarmRules,
    createAlarmRule,
    getAlarmTemplates,
    clearError,
  } = useAlarmsStore();

  // ===== 本地组件状态管理 =====

  /**
   * 通知面板显示状态
   */
  const [showNotificationPanel, setShowNotificationPanel] = useState(true);
  
  /**
   * 当前活跃标签页
   */
  const [activeTab, setActiveTab] = useState('alarms');
  
  /**
   * 实时连接状态
   */
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  /**
   * 智能分析显示状态
   */
  const [showSmartAnalysis, setShowSmartAnalysis] = useState(false);
  
  /**
   * 紧急模式状态
   */
  const [emergencyMode, setEmergencyMode] = useState(false);
  
  /**
   * 语音播报状态
   */
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  
  /**
   * 自动确认状态
   */
  const [autoAcknowledge, setAutoAcknowledge] = useState(false);
  
  /**
   * AI建议显示状态
   */
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  /**
   * 选中的告警ID列表
   */
  const [selectedAlarms, setSelectedAlarms] = useState<string[]>([]);
  
  /**
   * 告警过滤器
   */
  const [alarmFilter, setAlarmFilter] = useState({
    severity: 'all' as 'all' | AlertSeverity,
    status: 'all' as 'all' | AlarmStatus,
    timeRange: '1hour' as '1hour' | '6hours' | '1day' | '1week',
    source: 'all' as 'all' | 'battery' | 'propulsion' | 'inverter' | 'auxiliary' | 'system'
  });
  
  /**
   * 智能分析数据
   */
  const [smartAnalysis, setSmartAnalysis] = useState<{
    trends?: any;
    suggestions?: Array<{
      alarmId: string;
      suggestedAction: string;
      confidence: number;
    }>;
    classification?: Array<{
      alarmId: string;
      category: string;
      priority: number;
      confidence: number;
    }>;
  }>({});

  // 音频上下文引用
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // 定时器引用
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ===== 生命周期管理 =====

  /**
   * 组件挂载时初始化
   */
  useEffect(() => {
    // 初始化音频上下文
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // 获取初始数据
    fetchAlarms().catch(console.error);
    getAlarmStatistics().catch(console.error);
    getCriticalAlarms().catch(console.error);

    // 订阅实时告警
    subscribeToRealTimeAlarms(
      handleNewAlarm,
      handleAlarmUpdate,
      handleConnectionStatusChange
    ).catch(console.error);

    return () => {
      // 组件卸载时清理资源
      unsubscribeFromRealTimeAlarms();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  /**
   * 紧急模式告警监听
   */
  useEffect(() => {
    if (emergencyMode && criticalAlarms.length > 0) {
      // 播放紧急告警声音
      playEmergencySound();
      // 自动显示紧急告警
      setActiveTab('emergency');
    }
  }, [emergencyMode, criticalAlarms]);

  // ===== 实时告警处理方法 =====

  /**
   * 处理新告警
   */
  const handleNewAlarm = useCallback((alarm: Alarm) => {
    // 播放告警声音
    if (voiceEnabled) {
      playAlarmSound(alarm.severity);
    }

    // 如果启用了自动确认且置信度较高
    if (autoAcknowledge && alarm.severity === AlertSeverity.LOW) {
      acknowledgeAlarm(alarm.id, '系统自动确认').catch(console.error);
    }

    // 如果是紧急告警，切换到紧急模式
    if (alarm.severity === AlertSeverity.CRITICAL) {
      setEmergencyMode(true);
      setTimeout(() => setEmergencyMode(false), 30000); // 30秒后退出紧急模式
    }

    // 显示智能建议
    if (showAISuggestions) {
      showSmartSuggestion(alarm);
    }
  }, [voiceEnabled, autoAcknowledge, showAISuggestions]);

  /**
   * 处理告警更新
   */
  const handleAlarmUpdate = useCallback((alarm: Alarm) => {
    console.log('告警更新:', alarm);
  }, []);

  /**
   * 处理连接状态变化
   */
  const handleConnectionStatusChange = useCallback((connected: boolean) => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
    
    if (!connected) {
      // 连接断开时尝试重连
      reconnectTimerRef.current = setTimeout(() => {
        subscribeToRealTimeAlarms(
          handleNewAlarm,
          handleAlarmUpdate,
          handleConnectionStatusChange
        ).catch(console.error);
      }, 5000);
    }
  }, []);

  // ===== 智能分析方法 =====

  /**
   * 获取智能分析
   */
  const fetchSmartAnalysis = useCallback(async () => {
    try {
      const endTime = Date.now();
      const startTime = endTime - 24 * 60 * 60 * 1000; // 24小时前

      const [trends] = await Promise.all([
        getAlarmTrendAnalysis({
          startTime,
          endTime,
          groupBy: 'hour',
          includePrediction: true
        })
      ]);

      setSmartAnalysis(prev => ({ ...prev, trends }));

      // 获取AI建议
      if (selectedAlarms.length > 0) {
        const suggestions = await Promise.all(
          selectedAlarms.map(async (alarmId) => {
            const classification = await classifyAlarm(alarmId);
            return {
              alarmId,
              suggestedAction: classification.suggestedActions[0] || '建议手动处理', // 取第一个建议作为主要建议
              confidence: classification.confidence,
            };
          })
        );
        setSmartAnalysis(prev => ({ ...prev, suggestions }));
      }
    } catch (error) {
      console.error('获取智能分析失败:', error);
    }
  }, [selectedAlarms, getAlarmTrendAnalysis, classifyAlarm]);

  /**
   * 显示智能建议
   */
  const showSmartSuggestion = useCallback((alarm: Alarm) => {
    // 简单的智能建议逻辑
    const suggestions = {
      [AlertSeverity.LOW]: '建议自动确认',
      [AlertSeverity.MEDIUM]: '建议手动确认并检查设备',
      [AlertSeverity.HIGH]: '建议立即处理并通知相关人员',
      [AlertSeverity.CRITICAL]: '建议启动紧急响应程序'
    };

    // 显示建议通知
    console.log(`智能建议: ${suggestions[alarm.severity]}`);
  }, []);

  // ===== 音频处理方法 =====

  /**
   * 播放告警声音
   */
  const playAlarmSound = useCallback((severity: AlertSeverity) => {
    if (!audioContextRef.current) return;

    const frequencies = {
      [AlertSeverity.LOW]: 800,
      [AlertSeverity.MEDIUM]: 600,
      [AlertSeverity.HIGH]: 400,
      [AlertSeverity.CRITICAL]: 200
    };

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.setValueAtTime(frequencies[severity], audioContextRef.current.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);

    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.5);
  }, []);

  /**
   * 播放紧急告警声音
   */
  const playEmergencySound = useCallback(() => {
    if (!audioContextRef.current) return;

    // 播放三声急促的警报
    for (let i = 0; i < 3; i++) {
      setTimeout(() => playAlarmSound(AlertSeverity.CRITICAL), i * 200);
    }
  }, [playAlarmSound]);

  // ===== 快速操作方法 =====

  /**
   * 快速确认告警
   */
  const quickAcknowledge = useCallback(async (alarmId: string) => {
    try {
      await smartAcknowledgeAlarm(alarmId, '快速智能确认');
    } catch (error) {
      console.error('快速确认失败:', error);
    }
  }, [smartAcknowledgeAlarm]);

  /**
   * 快速处理紧急告警
   */
  const quickEmergencyProcess = useCallback(async (alarmId: string, action: 'acknowledge' | 'escalate' | 'auto_resolve') => {
    try {
      await handleEmergencyAlarm(alarmId, action);
    } catch (error) {
      console.error('紧急处理失败:', error);
    }
  }, [handleEmergencyAlarm]);

  /**
   * 智能批量处理
   */
  const quickSmartBulkProcess = useCallback(async () => {
    if (selectedAlarms.length === 0) return;

    try {
      const result = await smartBulkProcess({
        alarmIds: selectedAlarms,
        strategy: 'auto',
        maxConfidence: 0.8,
        includeManualReview: true
      });

      console.log('智能批量处理结果:', result);
      setSelectedAlarms([]);
    } catch (error) {
      console.error('智能批量处理失败:', error);
    }
  }, [selectedAlarms, smartBulkProcess]);

  // ===== 生成报表方法 =====

  /**
   * 生成告警报表
   */
  const handleGenerateReport = useCallback(async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const endTime = Date.now();
      const startTime = endTime - 24 * 60 * 60 * 1000;

      const result = await generateAlarmReport({
        startTime,
        endTime,
        format,
        includeCharts: true,
        sections: ['summary', 'trends', 'critical', 'resolution_time']
      });

      console.log('报表生成成功:', result);
      // 这里可以添加下载链接处理
    } catch (error) {
      console.error('生成报表失败:', error);
    }
  }, [generateAlarmReport]);

  // ===== UI渲染辅助方法 =====

  /**
   * 获取严重程度配置
   */
  const getSeverityConfig = useCallback((severity: AlertSeverity) => {
    const configs = {
      [AlertSeverity.LOW]: {
        icon: Info,
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/30',
        label: '低'
      },
      [AlertSeverity.MEDIUM]: {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        label: '中'
      },
      [AlertSeverity.HIGH]: {
        icon: AlertTriangle,
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30',
        label: '高'
      },
      [AlertSeverity.CRITICAL]: {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        label: '严重'
      }
    };
    return configs[severity];
  }, []);

  /**
   * 格式化时间
   */
  const formatTime = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }, []);

  // ===== 主界面渲染 =====

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* 页面标题和控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            {/* 根据连接状态显示不同图标 */}
            {connectionStatus === 'connected' ? (
              <BellRing className="w-6 h-6 text-green-400" />
            ) : connectionStatus === 'connecting' ? (
              <Activity className="w-6 h-6 text-yellow-400 animate-pulse" />
            ) : (
              <Bell className="w-6 h-6 text-red-400" />
            )}
            智能告警管理中心
            {emergencyMode && (
              <Badge className="bg-red-500 text-white animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                紧急模式
              </Badge>
            )}
          </h2>
          <p className="text-slate-400 mt-1">
            实时监控告警 · 智能分析预测 · 自动化处理
          </p>
        </div>

        {/* 右侧控制按钮 */}
        <div className="flex items-center gap-3">
          {/* 语音播报开关 */}
          <Button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            variant="outline"
            size="sm"
            className={`${voiceEnabled ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}
          >
            {voiceEnabled ? <Ear className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* 智能分析开关 */}
          <Button
            onClick={() => {
              setShowSmartAnalysis(!showSmartAnalysis);
              if (!showSmartAnalysis) {
                fetchSmartAnalysis();
              }
            }}
            variant="outline"
            size="sm"
            className={`${showSmartAnalysis ? 'bg-purple-500/20 border-purple-500/30 text-purple-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}
          >
            <Brain className="w-4 h-4" />
          </Button>

          {/* AI建议开关 */}
          <Button
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            variant="outline"
            size="sm"
            className={`${showAISuggestions ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}
          >
            <Sparkles className="w-4 h-4" />
          </Button>

          {/* 紧急模式开关 */}
          <Button
            onClick={() => setEmergencyMode(!emergencyMode)}
            variant="outline"
            size="sm"
            className={`${emergencyMode ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}
          >
            <Shield className="w-4 h-4" />
          </Button>

          {/* 设置按钮 */}
          <Button
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
            variant="outline"
            size="sm"
            className="bg-slate-500/20 border-slate-500/30 text-slate-400"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert className="border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            {error}
            <Button
              onClick={clearError}
              variant="outline"
              size="sm"
              className="ml-2 bg-red-500/20 border-red-500/30 text-red-400"
            >
              清除
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 智能分析面板 */}
      {showSmartAnalysis && (
        <Card className="bg-purple-500/10 border-purple-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
              <Brain className="w-5 h-5" />
              智能分析中心
            </h3>
            <Button
              onClick={fetchSmartAnalysis}
              variant="outline"
              size="sm"
              className="bg-purple-500/20 border-purple-500/30 text-purple-400"
              disabled={smartProcessing}
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              刷新分析
            </Button>
          </div>

          <Tabs defaultValue="trends" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
              <TabsTrigger value="trends" className="data-[state=active]:bg-purple-500/20">
                <TrendingUp className="w-4 h-4 mr-1" />
                趋势分析
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="data-[state=active]:bg-purple-500/20">
                <Target className="w-4 h-4 mr-1" />
                AI建议
              </TabsTrigger>
              <TabsTrigger value="classification" className="data-[state=active]:bg-purple-500/20">
                <Cpu className="w-4 h-4 mr-1" />
                智能分类
              </TabsTrigger>
              <TabsTrigger value="predictions" className="data-[state=active]:bg-purple-500/20">
                <Eye className="w-4 h-4 mr-1" />
                预测分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    <div>
                      <p className="text-slate-400 text-sm">总告警数</p>
                      <p className="text-slate-100 text-xl font-bold">{statistics?.totalCount || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <div>
                      <p className="text-slate-400 text-sm">未处理</p>
                      <p className="text-slate-100 text-xl font-bold">{statistics?.pendingCount || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-slate-400 text-sm">已解决</p>
                      <p className="text-slate-100 text-xl font-bold">{statistics?.resolvedCount || 0}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="suggestions" className="mt-4">
              <div className="space-y-3">
                {smartAnalysis.suggestions?.map((suggestion, index) => (
                  <Card key={index} className="bg-slate-800/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-200 font-medium">告警 {suggestion.alarmId}</p>
                        <p className="text-slate-400 text-sm">{suggestion.suggestedAction}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">
                        置信度 {(suggestion.confidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </Card>
                )) || (
                  <p className="text-slate-400 text-center py-4">暂无AI建议</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="classification" className="mt-4">
              <div className="space-y-3">
                {smartAnalysis.classification?.map((item, index) => (
                  <Card key={index} className="bg-slate-800/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-200 font-medium">告警 {item.alarmId}</p>
                        <p className="text-slate-400 text-sm">分类: {item.category}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-500/20 text-blue-400">
                          优先级 {item.priority}
                        </Badge>
                        <p className="text-slate-400 text-xs mt-1">
                          置信度 {(item.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </Card>
                )) || (
                  <p className="text-slate-400 text-center py-4">暂无分类结果</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="predictions" className="mt-4">
              <Card className="bg-slate-800/50 p-6">
                <div className="text-center">
                  <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h4 className="text-slate-200 font-medium mb-2">预测分析</h4>
                  <p className="text-slate-400 text-sm mb-4">
                    基于历史数据预测未来24小时的告警趋势
                  </p>
                  <Button
                    variant="outline"
                    className="bg-purple-500/20 border-purple-500/30 text-purple-400"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    开始预测
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* 告警统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-slate-800/60 border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-slate-400 text-sm">总数</p>
              <p className="text-slate-100 text-xl font-bold">{alarms.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-slate-400 text-sm">严重</p>
              <p className="text-slate-100 text-xl font-bold">{criticalAlarms.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-orange-400" />
            <div>
              <p className="text-slate-400 text-sm">紧急</p>
              <p className="text-slate-100 text-xl font-bold">{emergencyAlarms.length}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-slate-400 text-sm">在线</p>
              <p className="text-slate-100 text-xl font-bold">
                {connectionStatus === 'connected' ? '是' : '否'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <div>
              <p className="text-slate-400 text-sm">AI处理</p>
              <p className="text-slate-100 text-xl font-bold">
                {smartProcessing ? '运行中' : '就绪'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-slate-400 text-sm">选中</p>
              <p className="text-slate-100 text-xl font-bold">{selectedAlarms.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 主要操作区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
          <TabsTrigger value="alarms" className="data-[state=active]:bg-blue-500/20">
            <Bell className="w-4 h-4 mr-1" />
            实时告警
          </TabsTrigger>
          <TabsTrigger value="emergency" className="data-[state=active]:bg-red-500/20">
            <Zap className="w-4 h-4 mr-1" />
            紧急响应
          </TabsTrigger>
          <TabsTrigger value="intelligence" className="data-[state=active]:bg-purple-500/20">
            <Brain className="w-4 h-4 mr-1" />
            智能分析
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-green-500/20">
            <FileText className="w-4 h-4 mr-1" />
            报表中心
          </TabsTrigger>
        </TabsList>

        {/* 实时告警标签页 */}
        <TabsContent value="alarms" className="mt-6">
          <div className="space-y-4">
            {/* 批量操作栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    if (selectedAlarms.length > 0) {
                      quickSmartBulkProcess();
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={selectedAlarms.length === 0 || smartProcessing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  智能批量处理 ({selectedAlarms.length})
                </Button>

                <Button
                  onClick={() => bulkAcknowledge(selectedAlarms)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={selectedAlarms.length === 0}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  批量确认
                </Button>

                <Button
                  onClick={() => bulkResolve(selectedAlarms)}
                  variant="outline"
                  className="border-blue-500/30 text-blue-400"
                  disabled={selectedAlarms.length === 0}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  批量解决
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedAlarms(alarms.map(a => a.id))}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400"
                >
                  全选
                </Button>
                <Button
                  onClick={() => setSelectedAlarms([])}
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400"
                >
                  清空
                </Button>
              </div>
            </div>

            {/* 告警列表 */}
            <div className="space-y-3">
              {alarms.length === 0 ? (
                <Card className="bg-slate-800/80 border-slate-700 p-8 text-center">
                  <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-slate-300 text-lg font-medium mb-2">暂无告警</h3>
                  <p className="text-slate-400">系统运行正常，没有发现告警信息</p>
                </Card>
              ) : (
                alarms
                  .filter(alarm => {
                    if (alarmFilter.severity !== 'all' && alarm.severity !== alarmFilter.severity) return false;
                    if (alarmFilter.status !== 'all' && alarm.status !== alarmFilter.status) return false;
                    return true;
                  })
                  .map(alarm => {
                    const severityConfig = getSeverityConfig(alarm.severity);
                    const Icon = severityConfig.icon;
                    const isSelected = selectedAlarms.includes(alarm.id);

                    return (
                      <Card
                        key={alarm.id}
                        className={`p-4 transition-all duration-300 ${
                          isSelected ? 'ring-2 ring-blue-500/50' : ''
                        } ${emergencyMode && alarm.severity === AlertSeverity.CRITICAL ? 'ring-2 ring-red-500/50 animate-pulse' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAlarms(prev => [...prev, alarm.id]);
                                } else {
                                  setSelectedAlarms(prev => prev.filter(id => id !== alarm.id));
                                }
                              }}
                              className="mt-1"
                            />

                            <Icon className={`w-5 h-5 mt-0.5 ${severityConfig.color}`} />

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-slate-200 font-medium">{alarm.message}</h4>
                                <Badge className={`${severityConfig.bg} ${severityConfig.color} border-0 px-2 py-0.5 text-xs`}>
                                  {severityConfig.label}
                                </Badge>
                                {showAISuggestions && (
                                  <Badge className="bg-cyan-500/20 text-cyan-400 border-0 px-2 py-0.5 text-xs">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI建议
                                  </Badge>
                                )}
                              </div>

                              <p className="text-slate-300 text-sm mb-2">{alarm.equipmentName}</p>

                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span>设备: {alarm.equipmentId}</span>
                                <span>状态: {alarm.status}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(alarm.triggeredAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              onClick={() => quickAcknowledge(alarm.id)}
                              size="sm"
                              variant="outline"
                              className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              智能确认
                            </Button>

                            <Button
                              onClick={() => quickEmergencyProcess(alarm.id, 'acknowledge')}
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                            >
                              <Zap className="w-4 h-4 mr-1" />
                              紧急处理
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-slate-500/20 border-slate-500/30 text-slate-400 hover:bg-slate-500/30"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-slate-800 border-slate-700">
                                <DialogHeader>
                                  <DialogTitle className="text-slate-200">告警详情</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-slate-400">告警ID:</span>
                                      <span className="text-slate-200 ml-2">{alarm.id}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">设备ID:</span>
                                      <span className="text-slate-200 ml-2">{alarm.equipmentId}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">严重程度:</span>
                                      <span className="text-slate-200 ml-2">{alarm.severity}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">状态:</span>
                                      <span className="text-slate-200 ml-2">{alarm.status}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => acknowledgeAlarm(alarm.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                      确认告警
                                    </Button>
                                    <Button
                                      onClick={() => resolveAlarm(alarm.id, '手动解决')}
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      解决告警
                                    </Button>
                                    <Button
                                      onClick={() => ignoreAlarm(alarm.id, '手动忽略')}
                                      variant="outline"
                                      className="border-slate-600 text-slate-300"
                                    >
                                      忽略告警
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>
        </TabsContent>

        {/* 紧急响应标签页 */}
        <TabsContent value="emergency" className="mt-6">
          <div className="space-y-4">
            <Card className="bg-red-500/10 border-red-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-red-400" />
                <h3 className="text-lg font-semibold text-red-300">紧急告警响应中心</h3>
              </div>
              <p className="text-red-200/80 mb-4">
                处理严重的系统告警，启动紧急响应程序
              </p>

              {emergencyAlarms.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-green-300">当前没有紧急告警</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyAlarms.map(alarm => (
                    <Card key={alarm.id} className="bg-red-500/20 border-red-500/50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-red-200 font-medium">{alarm.message}</h4>
                          <p className="text-red-300/80 text-sm">{alarm.equipmentName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => quickEmergencyProcess(alarm.id, 'acknowledge')}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            size="sm"
                          >
                            立即确认
                          </Button>
                          <Button
                            onClick={() => quickEmergencyProcess(alarm.id, 'escalate')}
                            variant="outline"
                            className="border-red-500/50 text-red-300"
                            size="sm"
                          >
                            升级处理
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* 智能分析标签页 */}
        <TabsContent value="intelligence" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-purple-500/10 border-purple-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-semibold text-purple-300">AI智能分析</h3>
              </div>
              <div className="space-y-4">
                <Button
                  onClick={fetchSmartAnalysis}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={smartProcessing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  获取AI分析结果
                </Button>
                <div className="space-y-2">
                  <h4 className="text-slate-300 font-medium">智能功能</h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• 自动告警分类和优先级排序</li>
                    <li>• 智能处理建议和操作推荐</li>
                    <li>• 趋势分析和预测</li>
                    <li>• 异常模式识别</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="bg-cyan-500/10 border-cyan-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-cyan-400" />
                <h3 className="text-lg font-semibold text-cyan-300">自动化规则</h3>
              </div>
              <div className="space-y-4">
                <Button
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  variant="outline"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  管理自动化规则
                </Button>
                <div className="space-y-2">
                  <h4 className="text-slate-300 font-medium">规则功能</h4>
                  <ul className="text-slate-400 text-sm space-y-1">
                    <li>• 基于条件的自动操作</li>
                    <li>• 告警升级机制</li>
                    <li>• 批量处理规则</li>
                    <li>• 自定义响应模板</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 报表中心标签页 */}
        <TabsContent value="reports" className="mt-6">
          <div className="space-y-6">
            <Card className="bg-green-500/10 border-green-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-green-400" />
                <h3 className="text-lg font-semibold text-green-300">告警报表中心</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={() => handleGenerateReport('pdf')}
                  className="bg-red-600 hover:bg-red-700 text-white h-20 flex-col"
                >
                  <Download className="w-6 h-6 mb-2" />
                  生成PDF报表
                </Button>

                <Button
                  onClick={() => handleGenerateReport('excel')}
                  className="bg-green-600 hover:bg-green-700 text-white h-20 flex-col"
                >
                  <Download className="w-6 h-6 mb-2" />
                  生成Excel报表
                </Button>

                <Button
                  onClick={() => handleGenerateReport('csv')}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-20 flex-col"
                >
                  <Download className="w-6 h-6 mb-2" />
                  生成CSV报表
                </Button>
              </div>

              <div className="mt-6">
                <h4 className="text-slate-300 font-medium mb-3">报表内容包含</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-slate-800/50 p-3 rounded">
                    <h5 className="text-slate-200 font-medium mb-1">统计摘要</h5>
                    <p className="text-slate-400">告警总数、级别分布、处理状态等</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <h5 className="text-slate-200 font-medium mb-1">趋势分析</h5>
                    <p className="text-slate-400">时间趋势、频率分析、预测图表</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <h5 className="text-slate-200 font-medium mb-1">关键告警</h5>
                    <p className="text-slate-400">严重告警详情、处理记录</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded">
                    <h5 className="text-slate-200 font-medium mb-1">性能指标</h5>
                    <p className="text-slate-400">响应时间、解决率、统计图表</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 设置面板 */}
      {showNotificationPanel && (
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              通知设置
            </h3>
            <Button
              onClick={() => setShowNotificationPanel(false)}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-slate-300 font-medium">通知偏好</h4>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-slate-300">启用语音播报</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoAcknowledge}
                    onChange={(e) => setAutoAcknowledge(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-slate-300">自动确认低级别告警</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showAISuggestions}
                    onChange={(e) => setShowAISuggestions(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-slate-300">显示AI建议</span>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-slate-300 font-medium">过滤条件</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 text-sm mb-1 block">严重程度</label>
                  <select
                    value={alarmFilter.severity}
                    onChange={(e) => setAlarmFilter(prev => ({ ...prev, severity: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm"
                  >
                    <option value="all">全部</option>
                    <option value={AlertSeverity.LOW}>低级别</option>
                    <option value={AlertSeverity.MEDIUM}>中等级别</option>
                    <option value={AlertSeverity.HIGH}>高级别</option>
                    <option value={AlertSeverity.CRITICAL}>严重级别</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-sm mb-1 block">时间范围</label>
                  <select
                    value={alarmFilter.timeRange}
                    onChange={(e) => setAlarmFilter(prev => ({ ...prev, timeRange: e.target.value as any }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm"
                  >
                    <option value="1hour">1小时</option>
                    <option value="6hours">6小时</option>
                    <option value="1day">1天</option>
                    <option value="1week">1周</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * 使用示例：
 * 
 * ```tsx
 * import { AlarmPushNotifications } from './components/AlarmPushNotifications';
 * 
 * function App() {
 *   return (
 *     <div className="min-h-screen bg-slate-900">
 *       <AlarmPushNotifications />
 *     </div>
 *   );
 * }
 * ```
 */