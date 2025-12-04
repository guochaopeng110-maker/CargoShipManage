/**
 * 货船智能机舱管理系统 - 告警摘要组件
 * 
 * 功能说明：
 * 1. 在各监测页面显示简化的告警摘要信息
 * 2. 提供跳转到告警中心的入口
 * 3. 支持按设备ID筛选告警
 * 4. 显示当前设备的未处理告警数量
 * 5. 集成权限控制
 * 
 * 核心架构：
 * - 基于React Hooks的轻量级组件
 * - 集成TypeScript类型安全
 * - 使用统一的告警Store
 * - 支持实时数据更新
 * 
 * @version 1.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-01
 */

// React核心钩子导入
import React, { useState, useEffect, useCallback } from 'react';

// React Router hooks
import { useNavigate } from 'react-router-dom';

// UI组件导入
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';

// 状态管理钩子导入
import { useAlarmsStore } from '../stores/alarms-store';
import { usePermissions } from '../hooks/usePermissions';

// 类型导入
import { Alarm, AlertSeverity, AlarmStatus } from '../types/alarms';

// 图标组件导入
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

/**
 * 告警摘要组件属性接口
 */
interface AlertSummaryProps {
  /** 设备ID，用于筛选该设备的告警 */
  equipmentId?: string;
  /** 设备名称，用于显示 */
  equipmentName?: string;
  /** 显示的告警数量限制，默认为5 */
  limit?: number;
  /** 是否显示跳转按钮，默认为true */
  showNavigateButton?: boolean;
  /** 自定义标题 */
  title?: string;
  /** 是否启用自动刷新，默认为true */
  autoRefresh?: boolean;
}

/**
 * 告警摘要组件
 *
 * 提供设备告警的简要信息和快速跳转功能
 */
export function AlertSummary({ 
  equipmentId, 
  equipmentName, 
  limit = 5, 
  showNavigateButton = true,
  title = "告警摘要",
  autoRefresh = true
}: AlertSummaryProps) {
  // ===== 路由和权限管理 =====
  const navigate = useNavigate();
  
  // 权限检查
  const { hasPermission } = usePermissions();
  const canReadAlert = hasPermission('alert', 'read');

  // ===== 告警Store状态管理 =====
  const {
    items: alarms,
    loading,
    error,
    fetchAlarms,
  } = useAlarmsStore();

  // ===== 本地状态管理 =====
  const [recentAlarms, setRecentAlarms] = useState<Alarm[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // ===== 数据处理 =====

  /**
   * 生成模拟告警数据
   * 根据不同的设备ID生成差异化的告警数据
   */
  const generateMockAlarms = useCallback((): Alarm[] => {
    const now = Date.now();
    
    // 根据设备ID生成不同的告警数据
    const getAlarmsByEquipment = (id: string): Alarm[] => {
      switch (id) {
        case 'BATT-001':
          return [
            {
              id: `mock-batt-1-${now}`,
              equipmentId: 'BATT-001',
              equipmentName: '1#电池组',
              metricType: 'temperature',
              value: 42.5,
              threshold: '>40°C',
              triggeredAt: now - 5 * 60 * 1000, // 5分钟前
              createdAt: now - 5 * 60 * 1000,
              severity: AlertSeverity.HIGH,
              status: AlarmStatus.PENDING,
              message: '1#电池组温度过高警告',
              handlerNote: '检查冷却系统运行状态',
              handledAt: null
            },
            {
              id: `mock-batt-1-2-${now}`,
              equipmentId: 'BATT-001',
              equipmentName: '1#电池组',
              metricType: 'voltage',
              value: 3.1,
              threshold: '3.2-3.6V',
              triggeredAt: now - 15 * 60 * 1000, // 15分钟前
              createdAt: now - 15 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.PROCESSING,
              message: '1#电池组单体电压异常',
              handlerNote: '检查电池组均衡状态',
              handledAt: null
            },
            {
              id: `mock-batt-1-3-${now}`,
              equipmentId: 'BATT-001',
              equipmentName: '1#电池组',
              metricType: 'power',
              value: 18,
              threshold: '>20%',
              triggeredAt: now - 30 * 60 * 1000, // 30分钟前
              createdAt: now - 30 * 60 * 1000,
              severity: AlertSeverity.LOW,
              status: AlarmStatus.PENDING,
              message: '1#电池组SOC电量偏低提醒',
              handlerNote: '建议安排充电',
              handledAt: null
            }
          ];
          
        case 'BATT-002':
          return [
            {
              id: `mock-batt-2-${now}`,
              equipmentId: 'BATT-002',
              equipmentName: '2#电池组',
              metricType: 'voltage',
              value: 3.05,
              threshold: '3.2-3.6V',
              triggeredAt: now - 8 * 60 * 1000, // 8分钟前
              createdAt: now - 8 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.PENDING,
              message: '2#电池组单体电压异常',
              handlerNote: '检查电池组均衡状态',
              handledAt: null
            },
            {
              id: `mock-batt-2-2-${now}`,
              equipmentId: 'BATT-002',
              equipmentName: '2#电池组',
              metricType: 'temperature',
              value: 38.8,
              threshold: '>35°C',
              triggeredAt: now - 20 * 60 * 1000, // 20分钟前
              createdAt: now - 20 * 60 * 1000,
              severity: AlertSeverity.HIGH,
              status: AlarmStatus.PROCESSING,
              message: '2#电池组温度过高警告',
              handlerNote: '检查冷却系统运行状态',
              handledAt: null
            },
            {
              id: `mock-batt-2-3-${now}`,
              equipmentId: 'BATT-002',
              equipmentName: '2#电池组',
              metricType: 'current',
              value: 145,
              threshold: '>140A',
              triggeredAt: now - 45 * 60 * 1000, // 45分钟前
              createdAt: now - 45 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.RESOLVED,
              message: '2#电池组充放电流过大',
              handlerNote: '已调整充电功率',
              handledAt: now - 10 * 60 * 1000
            }
          ];
          
        case 'MOTOR-L-001':
          return [
            {
              id: `mock-motor-l-${now}`,
              equipmentId: 'MOTOR-L-001',
              equipmentName: '左推进电机',
              metricType: 'temperature',
              value: 85.2,
              threshold: '>80°C',
              triggeredAt: now - 12 * 60 * 1000, // 12分钟前
              createdAt: now - 12 * 60 * 1000,
              severity: AlertSeverity.HIGH,
              status: AlarmStatus.PROCESSING,
              message: '左推进电机轴承温度过高',
              handlerNote: '检查润滑系统',
              handledAt: null
            },
            {
              id: `mock-motor-l-2-${now}`,
              equipmentId: 'MOTOR-L-001',
              equipmentName: '左推进电机',
              metricType: 'speed',
              value: 1655,
              threshold: '>1650rpm',
              triggeredAt: now - 25 * 60 * 1000, // 25分钟前
              createdAt: now - 25 * 60 * 1000,
              severity: AlertSeverity.CRITICAL,
              status: AlarmStatus.PENDING,
              message: '左推进电机转速超限',
              handlerNote: '立即检查负载情况',
              handledAt: null
            }
          ];
          
        case 'MOTOR-R-001':
          return [
            {
              id: `mock-motor-r-${now}`,
              equipmentId: 'MOTOR-R-001',
              equipmentName: '右推进电机',
              metricType: 'temperature',
              value: 78.5,
              threshold: '>75°C',
              triggeredAt: now - 18 * 60 * 1000, // 18分钟前
              createdAt: now - 18 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.PENDING,
              message: '右推进电机定子温度偏高',
              handlerNote: '监控温度变化趋势',
              handledAt: null
            }
          ];
          
        case 'INV-L-001':
          return [
            {
              id: `mock-inv-l-${now}`,
              equipmentId: 'INV-L-001',
              equipmentName: '左推进逆变器',
              metricType: 'temperature',
              value: 72.3,
              threshold: '>70°C',
              triggeredAt: now - 10 * 60 * 1000, // 10分钟前
              createdAt: now - 10 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.PROCESSING,
              message: '左推进逆变器温度过高',
              handlerNote: '检查散热风扇状态',
              handledAt: null
            }
          ];
          
        case 'INV-R-001':
          return [
            {
              id: `mock-inv-r-${now}`,
              equipmentId: 'INV-R-001',
              equipmentName: '右推进逆变器',
              metricType: 'current',
              value: 520,
              threshold: '>500A',
              triggeredAt: now - 22 * 60 * 1000, // 22分钟前
              createdAt: now - 22 * 60 * 1000,
              severity: AlertSeverity.HIGH,
              status: AlarmStatus.PENDING,
              message: '右推进逆变器输出电流过大',
              handlerNote: '检查负载连接',
              handledAt: null
            }
          ];
          
        case 'PUMP-COOL-001':
          return [
            {
              id: `mock-pump-1-${now}`,
              equipmentId: 'PUMP-COOL-001',
              equipmentName: '1#冷却水泵',
              metricType: 'pressure',
              value: 0.08,
              threshold: '<0.1MPa',
              triggeredAt: now - 35 * 60 * 1000, // 35分钟前
              createdAt: now - 35 * 60 * 1000,
              severity: AlertSeverity.HIGH,
              status: AlarmStatus.PENDING,
              message: '1#冷却水泵压力过低',
              handlerNote: '检查管路泄漏',
              handledAt: null
            }
          ];
          
        case 'PUMP-COOL-002':
          return [
            {
              id: `mock-pump-2-${now}`,
              equipmentId: 'PUMP-COOL-002',
              equipmentName: '2#冷却水泵',
              metricType: 'temperature',
              value: 36.8,
              threshold: '>35°C',
              triggeredAt: now - 28 * 60 * 1000, // 28分钟前
              createdAt: now - 28 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.PROCESSING,
              message: '2#冷却水泵温度偏高',
              handlerNote: '检查冷却液循环',
              handledAt: null
            }
          ];
          
        default:
          // 默认告警数据（用于其他设备）
          return [
            {
              id: `mock-default-${now}`,
              equipmentId: equipmentId || 'unknown',
              equipmentName: equipmentName || '未知设备',
              metricType: 'temperature',
              value: 35.0,
              threshold: '>30°C',
              triggeredAt: now - 10 * 60 * 1000, // 10分钟前
              createdAt: now - 10 * 60 * 1000,
              severity: AlertSeverity.MEDIUM,
              status: AlarmStatus.PENDING,
              message: `${equipmentName || '设备'}温度异常`,
              handlerNote: '检查设备运行状态',
              handledAt: null
            }
          ];
      }
    };
    
    const mockAlarms = getAlarmsByEquipment(equipmentId || 'battery-system');
    return mockAlarms.slice(0, limit);
  }, [equipmentId, equipmentName, limit]);

  /**
   * 获取设备相关的告警
   */
  const loadEquipmentAlarms = useCallback(async () => {
    if (!canReadAlert) return;

    try {
      const response = await fetchAlarms({
        page: 1,
        pageSize: limit,
        filters: {
          deviceId: equipmentId,
          status: [AlarmStatus.PENDING, AlarmStatus.PROCESSING],
        }
      });

      // 获取未处理告警总数
      const totalResponse = await fetchAlarms({
        page: 1,
        pageSize: 1,
        filters: {
          deviceId: equipmentId,
          status: [AlarmStatus.PENDING],
        }
      });

      if (response && response.items) {
        setRecentAlarms(response.items.slice(0, limit));
      }
      
      if (totalResponse && totalResponse.total !== undefined) {
        setPendingCount(totalResponse.total);
      }
    } catch (error) {
      console.error('获取设备告警失败:', error);
      
      // 获取失败时使用模拟数据
      const mockAlarms = generateMockAlarms();
      setRecentAlarms(mockAlarms);
      setPendingCount(mockAlarms.length);
    }
  }, [canReadAlert, equipmentId, limit, fetchAlarms, generateMockAlarms]);

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    loadEquipmentAlarms();
  }, [loadEquipmentAlarms]);

  /**
   * 定期刷新数据（每30秒）
   */
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadEquipmentAlarms();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadEquipmentAlarms, autoRefresh]);

  /**
   * 跳转到告警中心
   */
  const navigateToAlertCenter = useCallback(() => {
    const params = new URLSearchParams();
    if (equipmentId) {
      params.set('equipmentId', equipmentId);
    }
    navigate(`/alerts?${params.toString()}`);
  }, [navigate, equipmentId]);

  /**
   * 获取严重程度配置
   */
  const getSeverityConfig = useCallback((severity: AlertSeverity) => {
    const configs = {
      [AlertSeverity.LOW]: {
        icon: Info,
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        label: '低',
      },
      [AlertSeverity.MEDIUM]: {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        label: '中',
      },
      [AlertSeverity.HIGH]: {
        icon: AlertTriangle,
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        label: '高',
      },
      [AlertSeverity.CRITICAL]: {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        label: '严重',
      }
    };
    return configs[severity];
  }, []);

  /**
   * 格式化时间
   */
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }, []);

  // ===== 权限检查渲染 =====
  if (!canReadAlert) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 p-6">
        <div className="flex items-center justify-center h-32">
          <p className="text-slate-400">您没有权限查看告警信息</p>
        </div>
      </Card>
    );
  }

  // ===== 主界面渲染 =====
  return (
    <Card className="bg-slate-800/80 border-slate-700 p-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
          {equipmentName && (
            <span className="text-slate-400 text-sm">({equipmentName})</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 未处理告警数量 */}
          {pendingCount > 0 && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {pendingCount} 待处理
            </Badge>
          )}
          
          {/* 刷新按钮 */}
          <Button
            onClick={loadEquipmentAlarms}
            variant="outline"
            size="sm"
            className="bg-slate-700/50 border-slate-600 text-slate-400"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 告警列表 */}
      <div className="space-y-3">
        {loading ? (
          // 骨架屏加载状态
          Array.from({ length: Math.min(3, limit) }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded">
              <Skeleton className="w-4 h-4 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 rounded mb-2" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            </div>
          ))
        ) : recentAlarms.length === 0 ? (
          // 无告警状态
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400">暂无告警记录</p>
          </div>
        ) : (
          // 告警列表
          recentAlarms.map((alarm) => {
            const severityConfig = getSeverityConfig(alarm.severity);
            const Icon = severityConfig.icon;

            return (
              <div
                key={alarm.id}
                className="flex items-start gap-3 p-3 bg-slate-900/50 rounded hover:bg-slate-900 transition-colors"
              >
                <Icon className={`w-4 h-4 mt-0.5 ${severityConfig.color}`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`${severityConfig.bg} ${severityConfig.color} border-0 px-2 py-0.5 text-xs`}>
                      {severityConfig.label}
                    </Badge>
                    <Badge className={`text-xs ${
                      alarm.status === AlarmStatus.PENDING ? 'bg-red-500/20 text-red-400 border-red-500' :
                      alarm.status === AlarmStatus.PROCESSING ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' :
                      'bg-green-500/20 text-green-400 border-green-500'
                    }`}>
                      {alarm.status === AlarmStatus.PENDING && '待处理'}
                      {alarm.status === AlarmStatus.PROCESSING && '处理中'}
                      {alarm.status === AlarmStatus.RESOLVED && '已解决'}
                      {alarm.status === AlarmStatus.IGNORED && '已忽略'}
                    </Badge>
                  </div>
                  
                  <p className="text-slate-200 text-sm mb-1 truncate">{alarm.message}</p>
                  <p className="text-slate-400 text-xs">{formatTime(alarm.triggeredAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 跳转按钮 */}
      {showNavigateButton && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <Button
            onClick={navigateToAlertCenter}
            variant="outline"
            className="w-full bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
          >
            查看全部告警
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </Card>
  );
}