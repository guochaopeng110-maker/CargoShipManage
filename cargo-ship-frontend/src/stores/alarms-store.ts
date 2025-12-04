/**
 * 货船智能机舱管理系统 - 告警状态管理Store（增强版）
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
 * - 基于React Hook的状态管理
 * - 集成TypeScript类型安全
 * - 支持实时WebSocket通信
 * - 智能缓存和性能优化
 * - 完整的错误处理和重试机制
 * 
 * @version 3.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-11-20
 */

// React Hooks导入
import { useState, useCallback, useEffect, useRef } from 'react';

// 类型导入
import { 
  Alarm, 
  AlarmsState, 
  AlarmFilters, 
  AlarmStatistics, 
  AlarmTrendAnalysis,
  AlertSeverity,
  AlarmStatus,
  AlarmAction
} from '../types/alarms';
import { User } from '../types/auth';

// 增强告警服务导入
import { enhancedAlarmsService } from '../services/alarms-service';

/**
 * 告警状态管理Hook（增强版）
 * 
 * 提供完整的告警管理系统功能
 * 包括实时通信、智能分析、紧急处理等高级特性
 * 
 * @returns {Object} 包含告警状态和操作方法的对象
 *   - items: 告警列表数据
 *   - selectedAlarms: 选中的告警ID列表
 *   - total: 总告警数量
 *   - page: 当前页码
 *   - pageSize: 每页显示数量
 *   - totalPages: 总页数
 *   - loading: 加载状态
 *   - error: 错误信息
 *   - filters: 筛选条件
 *   - statistics: 告警统计信息
 *   - trendAnalysis: 趋势分析数据
 *   - realTimeConnected: 实时连接状态
 *   - pendingAlarms: 待处理告警
 *   - criticalAlarms: 关键告警
 *   - emergencyAlarms: 紧急告警
 *   - alarmRules: 告警规则
 *   - alarmTemplates: 告警模板
 *   - bulkOperationStatus: 批量操作状态
 *   - fetchAlarms: 获取告警列表
 *   - acknowledgeAlarm: 确认告警
 *   - resolveAlarm: 解决告警
 *   - ignoreAlarm: 忽略告警
 *   - assignAlarm: 分配告警
 *   - bulkAcknowledge: 批量确认
 *   - bulkResolve: 批量解决
 *   - bulkIgnore: 批量忽略
 *   - smartBulkProcess: 智能批量处理
 *   - subscribeToRealTimeAlarms: 订阅实时告警
 *   - unsubscribeFromRealTimeAlarms: 取消实时订阅
 *   - getAlarmTrendAnalysis: 获取趋势分析
 *   - classifyAlarm: 智能分类告警
 *   - handleEmergencyAlarm: 处理紧急告警
 *   - getAlarmStatistics: 获取统计信息
 *   - getCriticalAlarms: 获取关键告警
 *   - getPendingAlarms: 获取待处理告警
 *   - getAlarmRules: 获取告警规则
 *   - createAlarmRule: 创建告警规则
 *   - getAlarmTemplates: 获取告警模板
 *   - generateAlarmReport: 生成告警报表
 *   - smartAcknowledgeAlarm: 智能确认告警
 *   - clearError: 清除错误信息
 */
export const useAlarmsStore = () => {
  // ===== 基础状态管理 =====
  
  /**
   * 告警Store状态
   * 包含所有告警相关的数据和状态信息
   */
  const [state, setState] = useState<AlarmsState & {
    statistics: AlarmStatistics | null;
    trendAnalysis: AlarmTrendAnalysis | null;
    realTimeConnected: boolean;
    pendingAlarms: Alarm[];
    criticalAlarms: Alarm[];
    emergencyAlarms: Alarm[];
    alarmRules: any[];
    alarmTemplates: any[];
    alarmConfig: any | null;
    smartProcessing: boolean;
    realtimeSubscriptionActive: boolean;
  }>({
    // 基础告警数据
    items: [],
    selectedAlarms: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    filters: {},
    
    // 高级功能状态
    statistics: null,
    trendAnalysis: null,
    realTimeConnected: false,
    pendingAlarms: [],
    criticalAlarms: [],
    emergencyAlarms: [],
    alarmRules: [],
    alarmTemplates: [],
    alarmConfig: null,
    bulkOperationStatus: null,
    smartProcessing: false,
    realtimeSubscriptionActive: false,
  });

  // WebSocket连接引用
  const wsConnectionRef = useRef<WebSocket | null>(null);
  
  // 实时告警监听器引用
  const alarmListenersRef = useRef<{
    onAlarmReceived?: (alarm: Alarm) => void;
    onAlarmUpdated?: (alarm: Alarm) => void;
    onConnectionStatusChanged?: (connected: boolean) => void;
  }>({});

  // ===== 基础CRUD操作（增强版） =====

  /**
   * 获取告警列表（增强版）
   * 
   * 支持高级筛选、排序和分页功能
   * 集成权限控制和缓存机制
   */
  const fetchAlarms = useCallback(async (params?: {
    page?: number;
    pageSize?: number;
    filters?: AlarmFilters;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeRelated?: boolean;
    realTime?: boolean;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await enhancedAlarmsService.getAlarms({
        page: params?.page || state.page,
        pageSize: params?.pageSize || state.pageSize,
        filters: params?.filters,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
        includeRelated: params?.includeRelated,
        realTime: params?.realTime,
      });

      setState(prev => ({
        ...prev,
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        loading: false,
      }));

      return response;
    } catch (error) {
      console.warn('获取告警列表失败:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: '无法连接到服务器，正在显示演示数据',
      }));
      // 不抛出错误，允许UI继续使用mock数据
    }
  }, [state.page, state.pageSize]);

  /**
   * 获取告警详情
   */
  const getAlarm = useCallback(async (alarmId: string, includeRelated: boolean = true) => {
    try {
      return await enhancedAlarmsService.getAlarm(alarmId, includeRelated);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取告警详情失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 处理告警（增强版）
   */
  const handleAlarm = useCallback(async (alarmId: string, action: AlarmAction, note?: string, assignee?: string) => {
    try {
      await enhancedAlarmsService.handleAlarm({
        alarmId,
        action,
        note,
        assignee,
      });

      // 更新本地状态
      setState(prev => ({
        ...prev,
        items: prev.items.map(alarm =>
          alarm.id === alarmId ? {
            ...alarm,
            status: getStatusFromAction(action) as any,
            handlerNote: note,
            assignee: assignee,
            lastModified: Date.now(),
          } : alarm
        ),
      }));

      // 如果是紧急告警，从紧急列表中移除
      if (action === 'acknowledge' || action === 'resolve') {
        setState(prev => ({
          ...prev,
          emergencyAlarms: prev.emergencyAlarms.filter(alarm => alarm.id !== alarmId),
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '处理告警失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 确认告警
   */
  const acknowledgeAlarm = useCallback(async (alarmId: string, note?: string) => {
    await handleAlarm(alarmId, AlarmAction.ACKNOWLEDGE, note);
  }, [handleAlarm]);

  /**
   * 解决告警
   */
  const resolveAlarm = useCallback(async (alarmId: string, note?: string) => {
    await handleAlarm(alarmId, AlarmAction.RESOLVE, note);
  }, [handleAlarm]);

  /**
   * 忽略告警
   */
  const ignoreAlarm = useCallback(async (alarmId: string, reason: string) => {
    await handleAlarm(alarmId, AlarmAction.IGNORE, `忽略原因: ${reason}`);
  }, [handleAlarm]);

  /**
   * 分配告警
   */
  const assignAlarm = useCallback(async (alarmId: string, assignee: string, note?: string) => {
    await handleAlarm(alarmId, AlarmAction.ASSIGN, note, assignee);
  }, [handleAlarm]);

  // ===== 批量操作（增强版） =====

  /**
   * 批量确认告警
   */
  const bulkAcknowledge = useCallback(async (alarmIds: string[], note?: string) => {
    const startedAt = Date.now();
    setState(prev => ({
      ...prev,
      bulkOperationStatus: {
        operation: 'acknowledge' as any,
        totalItems: alarmIds.length,
        processedItems: 0,
        failedItems: [],
        status: 'in_progress' as any,
        startedAt,
      }
    }));

    try {
      const result = await enhancedAlarmsService.bulkAcknowledge(alarmIds, note);
      
      // 更新本地状态
      setState(prev => ({
        ...prev,
        items: prev.items.map(alarm =>
          alarmIds.includes(alarm.id) ? {
            ...alarm,
            status: 'processing' as any,
            lastModified: Date.now(),
          } : alarm
        ),
        bulkOperationStatus: {
          operation: 'acknowledge' as any,
          totalItems: alarmIds.length,
          processedItems: result.successfulItems || alarmIds.length,
          failedItems: result.failedItems?.map(item => item.id) || [],
          status: 'completed' as any,
          startedAt,
          completedAt: Date.now(),
        },
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        bulkOperationStatus: {
          operation: 'acknowledge' as any,
          totalItems: alarmIds.length,
          processedItems: 0,
          failedItems: alarmIds,
          status: 'failed' as any,
          startedAt,
          completedAt: Date.now(),
        },
        error: error instanceof Error ? error.message : '批量确认告警失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 批量解决告警
   */
  const bulkResolve = useCallback(async (alarmIds: string[], note?: string) => {
    const startedAt = Date.now();
    setState(prev => ({
      ...prev,
      bulkOperationStatus: {
        operation: 'resolve' as any,
        totalItems: alarmIds.length,
        processedItems: 0,
        failedItems: [],
        status: 'in_progress' as any,
        startedAt,
      }
    }));

    try {
      const result = await enhancedAlarmsService.bulkResolve(alarmIds, note);
      
      setState(prev => ({
        ...prev,
        items: prev.items.map(alarm =>
          alarmIds.includes(alarm.id) ? {
            ...alarm,
            status: 'resolved' as any,
            handlerNote: note,
            lastModified: Date.now(),
          } : alarm
        ),
        bulkOperationStatus: {
          operation: 'resolve' as any,
          totalItems: alarmIds.length,
          processedItems: result.successfulItems || alarmIds.length,
          failedItems: result.failedItems?.map(item => item.id) || [],
          status: 'completed' as any,
          startedAt,
          completedAt: Date.now(),
        },
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        bulkOperationStatus: {
          operation: 'resolve' as any,
          totalItems: alarmIds.length,
          processedItems: 0,
          failedItems: alarmIds,
          status: 'failed' as any,
          startedAt,
          completedAt: Date.now(),
        },
        error: error instanceof Error ? error.message : '批量解决告警失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 批量忽略告警
   */
  const bulkIgnore = useCallback(async (alarmIds: string[], reason: string) => {
    const startedAt = Date.now();
    setState(prev => ({
      ...prev,
      bulkOperationStatus: {
        operation: 'ignore' as any,
        totalItems: alarmIds.length,
        processedItems: 0,
        failedItems: [],
        status: 'in_progress' as any,
        startedAt,
      }
    }));

    try {
      const result = await enhancedAlarmsService.bulkIgnore(alarmIds, reason);
      
      setState(prev => ({
        ...prev,
        items: prev.items.map(alarm =>
          alarmIds.includes(alarm.id) ? {
            ...alarm,
            status: 'ignored' as any,
            handlerNote: `忽略原因: ${reason}`,
            lastModified: Date.now(),
          } : alarm
        ),
        bulkOperationStatus: {
          operation: 'ignore' as any,
          totalItems: alarmIds.length,
          processedItems: result.successfulItems || alarmIds.length,
          failedItems: result.failedItems?.map(item => item.id) || [],
          status: 'completed' as any,
          startedAt,
          completedAt: Date.now(),
        },
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        bulkOperationStatus: {
          operation: 'ignore' as any,
          totalItems: alarmIds.length,
          processedItems: 0,
          failedItems: alarmIds,
          status: 'failed' as any,
          startedAt,
          completedAt: Date.now(),
        },
        error: error instanceof Error ? error.message : '批量忽略告警失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 智能批量处理
   */
  const smartBulkProcess = useCallback(async (params: {
    alarmIds: string[];
    strategy: 'auto' | 'by_severity' | 'by_type' | 'by_equipment';
    maxConfidence?: number;
    includeManualReview?: boolean;
  }) => {
    setState(prev => ({ ...prev, smartProcessing: true }));

    try {
      const result = await enhancedAlarmsService.smartBulkProcess(params);
      
      // 刷新告警列表
      await fetchAlarms();
      
      setState(prev => ({
        ...prev,
        smartProcessing: false,
        error: null,
      }));

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        smartProcessing: false,
        error: error instanceof Error ? error.message : '智能批量处理失败',
      }));
      throw error;
    }
  }, [fetchAlarms]);

  // ===== 实时通信功能 =====

  /**
   * 订阅实时告警
   */
  const subscribeToRealTimeAlarms = useCallback(async (
    onAlarmReceived?: (alarm: Alarm) => void,
    onAlarmUpdated?: (alarm: Alarm) => void,
    onConnectionStatusChanged?: (connected: boolean) => void
  ) => {
    try {
      // 保存监听器引用
      alarmListenersRef.current = {
        onAlarmReceived,
        onAlarmUpdated,
        onConnectionStatusChanged,
      };

      await enhancedAlarmsService.subscribeToRealTimeAlarms(
        (alarm) => {
          // 新告警接收处理
          if (onAlarmReceived) onAlarmReceived(alarm);
          
          // 更新本地状态
          setState(prev => ({
            ...prev,
            items: [alarm, ...prev.items.filter(item => item.id !== alarm.id)],
            total: prev.total + 1,
          }));

          // 如果是紧急告警，添加到紧急列表
          if (alarm.severity === AlertSeverity.CRITICAL) {
            setState(prev => ({
              ...prev,
              emergencyAlarms: [alarm, ...prev.emergencyAlarms.filter(item => item.id !== alarm.id)],
            }));
          }
        },
        (alarm) => {
          // 告警更新处理
          if (onAlarmUpdated) onAlarmUpdated(alarm);
          
          setState(prev => ({
            ...prev,
            items: prev.items.map(item => item.id === alarm.id ? alarm : item),
          }));
        },
        (connected) => {
          // 连接状态变化处理
          if (onConnectionStatusChanged) onConnectionStatusChanged(connected);
          
          setState(prev => ({
            ...prev,
            realTimeConnected: connected,
            realtimeSubscriptionActive: connected,
          }));
        }
      );

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '订阅实时告警失败',
        realTimeConnected: false,
        realtimeSubscriptionActive: false,
      }));
      throw error;
    }
  }, []);

  /**
   * 取消实时告警订阅
   */
  const unsubscribeFromRealTimeAlarms = useCallback(() => {
    try {
      enhancedAlarmsService.unsubscribeFromRealTimeAlarms();
      
      setState(prev => ({
        ...prev,
        realTimeConnected: false,
        realtimeSubscriptionActive: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '取消实时告警订阅失败',
      }));
    }
  }, []);

  // ===== 智能分析功能 =====

  /**
   * 获取告警趋势分析
   */
  const getAlarmTrendAnalysis = useCallback(async (params: {
    startTime: number;
    endTime: number;
    equipmentId?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
    includePrediction?: boolean;
  }) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const analysis = await enhancedAlarmsService.getAlarmTrendAnalysis(params);
      
      setState(prev => ({
        ...prev,
        trendAnalysis: analysis,
        loading: false,
      }));

      return analysis;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取趋势分析失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 智能分类告警
   */
  const classifyAlarm = useCallback(async (alarmId: string) => {
    try {
      return await enhancedAlarmsService.classifyAlarm(alarmId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '智能分类告警失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 智能确认告警
   */
  const smartAcknowledgeAlarm = useCallback(async (alarmId: string, note?: string) => {
    setState(prev => ({ ...prev, smartProcessing: true }));

    try {
      await enhancedAlarmsService.smartAcknowledgeAlarm(alarmId, note);
      
      // 刷新告警列表
      await fetchAlarms();
      
      setState(prev => ({
        ...prev,
        smartProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        smartProcessing: false,
        error: error instanceof Error ? error.message : '智能确认告警失败',
      }));
      throw error;
    }
  }, [fetchAlarms]);

  // ===== 紧急处理功能 =====

  /**
   * 处理紧急告警
   */
  const handleEmergencyAlarm = useCallback(async (
    alarmId: string, 
    action: 'acknowledge' | 'escalate' | 'auto_resolve'
  ) => {
    setState(prev => ({ 
      ...prev, 
      smartProcessing: true,
      emergencyAlarms: prev.emergencyAlarms.filter(alarm => alarm.id !== alarmId)
    }));

    try {
      await enhancedAlarmsService.handleEmergencyAlarm(alarmId, action);
      
      // 刷新告警列表
      await fetchAlarms();
      
      setState(prev => ({
        ...prev,
        smartProcessing: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        smartProcessing: false,
        error: error instanceof Error ? error.message : '处理紧急告警失败',
      }));
      throw error;
    }
  }, [fetchAlarms]);

  // ===== 数据获取方法 =====

  /**
   * 获取告警统计信息
   */
  const getAlarmStatistics = useCallback(async (params?: {
    startTime?: number;
    endTime?: number;
    equipmentId?: string;
    includeTrends?: boolean;
  }) => {
    try {
      const statistics = await enhancedAlarmsService.getAlarmStatistics(params || {});
      
      setState(prev => ({
        ...prev,
        statistics,
      }));

      return statistics;
    } catch (error) {
      console.warn('获取统计信息失败:', error);
      setState(prev => ({
        ...prev,
        error: '无法连接到服务器，正在显示演示数据',
      }));
      // 不抛出错误，允许UI继续使用mock数据
    }
  }, []);

  /**
   * 获取待处理告警
   */
  const getPendingAlarms = useCallback(async (limit: number = 10, includeAnalysis: boolean = true) => {
    try {
      const result = await enhancedAlarmsService.getPendingAlarms(limit, includeAnalysis);
      
      setState(prev => ({
        ...prev,
        pendingAlarms: result.alarms,
      }));

      return result;
    } catch (error) {
      console.warn('获取待处理告警失败:', error);
      setState(prev => ({
        ...prev,
        error: '无法连接到服务器，正在显示演示数据',
      }));
      // 不抛出错误，允许UI继续使用mock数据
    }
  }, []);

  /**
   * 获取关键告警
   */
  const getCriticalAlarms = useCallback(async (params?: {
    limit?: number;
    includeResolved?: boolean;
  }) => {
    try {
      const alarms = await enhancedAlarmsService.getCriticalAlarms(params);
      
      setState(prev => ({
        ...prev,
        criticalAlarms: alarms,
      }));

      return alarms;
    } catch (error) {
      console.warn('获取关键告警失败:', error);
      setState(prev => ({
        ...prev,
        error: '无法连接到服务器，正在显示演示数据',
      }));
      // 不抛出错误，允许UI继续使用mock数据
    }
  }, []);

  // ===== 规则和模板管理 =====

  /**
   * 获取告警规则
   */
  const getAlarmRules = useCallback(async () => {
    try {
      const rules = await enhancedAlarmsService.getAlarmRules();
      
      setState(prev => ({
        ...prev,
        alarmRules: rules,
      }));

      return rules;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取告警规则失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 创建告警规则
   */
  const createAlarmRule = useCallback(async (rule: any) => {
    try {
      const newRule = await enhancedAlarmsService.createAlarmRule(rule);
      
      // 更新本地状态
      setState(prev => ({
        ...prev,
        alarmRules: [...prev.alarmRules, newRule],
      }));

      return newRule;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '创建告警规则失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 获取告警模板
   */
  const getAlarmTemplates = useCallback(async () => {
    try {
      const templates = await enhancedAlarmsService.getAlarmTemplates();
      
      setState(prev => ({
        ...prev,
        alarmTemplates: templates,
      }));

      return templates;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '获取告警模板失败',
      }));
      throw error;
    }
  }, []);

  /**
   * 生成告警报表
   */
  const generateAlarmReport = useCallback(async (params: {
    startTime: number;
    endTime: number;
    format: 'pdf' | 'excel' | 'csv';
    includeCharts: boolean;
    sections: string[];
  }) => {
    try {
      return await enhancedAlarmsService.generateAlarmReport(params);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '生成告警报表失败',
      }));
      throw error;
    }
  }, []);

  // ===== 工具方法 =====

  /**
   * 根据操作类型获取状态
   */
  const getStatusFromAction = (action: AlarmAction): string => {
    switch (action) {
      case AlarmAction.ACKNOWLEDGE:
        return 'processing';
      case AlarmAction.RESOLVE:
        return 'resolved';
      case AlarmAction.IGNORE:
        return 'ignored';
      default:
        return 'pending';
    }
  };

  /**
   * 清除错误信息
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * 重置告警Store状态
   */
  const resetStore = useCallback(() => {
    setState({
      items: [],
      selectedAlarms: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      loading: false,
      error: null,
      filters: {},
      statistics: null,
      trendAnalysis: null,
      realTimeConnected: false,
      pendingAlarms: [],
      criticalAlarms: [],
      emergencyAlarms: [],
      alarmRules: [],
      alarmTemplates: [],
      alarmConfig: null,
      bulkOperationStatus: null,
      smartProcessing: false,
      realtimeSubscriptionActive: false,
    });
  }, []);

  /**
   * 清理资源
   */
  useEffect(() => {
    return () => {
      // 组件卸载时清理资源
      unsubscribeFromRealTimeAlarms();
    };
  }, [unsubscribeFromRealTimeAlarms]);

  /**
   * 组件加载时初始化数据
   */
  useEffect(() => {
    // 自动获取基础数据
    fetchAlarms().catch(console.error);
    getPendingAlarms().catch(console.error);
    getCriticalAlarms().catch(console.error);
    getAlarmStatistics().catch(console.error);
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // ===== 返回完整接口 =====

  return {
    // 状态数据
    ...state,

    // 基础操作方法
    fetchAlarms,
    getAlarm,
    handleAlarm,
    acknowledgeAlarm,
    resolveAlarm,
    ignoreAlarm,
    assignAlarm,

    // 批量操作方法
    bulkAcknowledge,
    bulkResolve,
    bulkIgnore,
    smartBulkProcess,

    // 实时通信方法
    subscribeToRealTimeAlarms,
    unsubscribeFromRealTimeAlarms,

    // 智能分析方法
    getAlarmTrendAnalysis,
    classifyAlarm,
    smartAcknowledgeAlarm,

    // 紧急处理方法
    handleEmergencyAlarm,

    // 数据获取方法
    getAlarmStatistics,
    getPendingAlarms,
    getCriticalAlarms,

    // 规则和模板方法
    getAlarmRules,
    createAlarmRule,
    getAlarmTemplates,
    generateAlarmReport,

    // 工具方法
    clearError,
    resetStore,
  };
};

/**
 * 使用示例：
 * 
 * ```typescript
 * import { useAlarmsStore } from './stores/alarms-store';
 * 
 * const {
 *   items: alarms,
 *   loading,
 *   realTimeConnected,
 *   criticalAlarms,
 *   fetchAlarms,
 *   acknowledgeAlarm,
 *   subscribeToRealTimeAlarms,
 *   getAlarmTrendAnalysis
 * } = useAlarmsStore();
 * 
 * // 获取告警列表
 * useEffect(() => {
 *   fetchAlarms({ page: 1, pageSize: 20 });
 * }, []);
 * 
 * // 订阅实时告警
 * useEffect(() => {
 *   subscribeToRealTimeAlarms(
 *     (alarm) => console.log('新告警:', alarm),
 *     (alarm) => console.log('告警更新:', alarm),
 *     (connected) => console.log('连接状态:', connected)
 *   );
 * }, []);
 * 
 * // 确认告警
 * const handleAcknowledge = async (alarmId: string) => {
 *   await acknowledgeAlarm(alarmId, '已收到告警');
 * };
 * 
 * // 智能批量处理
 * const handleSmartBulk = async (alarmIds: string[]) => {
 *   const result = await smartBulkProcess({
 *     alarmIds,
 *     strategy: 'auto',
 *     maxConfidence: 0.9
 *   });
 *   console.log('批量处理结果:', result);
 * };
 * 
 * // 获取趋势分析
 * const handleTrendAnalysis = async () => {
 *   const analysis = await getAlarmTrendAnalysis({
 *     startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
 *     endTime: Date.now(),
 *     groupBy: 'day',
 *     includePrediction: true
 *   });
 *   console.log('趋势分析:', analysis);
 * };
 * ```
 */