/**
 * 货船智能机舱管理系统 - 告警中心页面（简化版）
 * 
 * 功能说明：
 * 1. 统一的告警管理界面，替代分散在各监测页面的告警功能
 * 2. 基于后端 /api/alarms 接口的完整集成
 * 3. 支持多维度筛选：设备、严重程度、状态、时间范围
 * 4. 提供告警列表分页、详情查看和状态更新
 * 5. 集成权限控制，确保不同角色的功能访问
 * 6. 简化设计，移除AI分析等过度设计功能
 * 
 * 核心架构：
 * - 基于React Hooks的组件化设计
 * - 集成TypeScript类型安全
 * - 使用统一的告警Store和服务
 * - 支持实时数据更新（简化版轮询）
 * - 完整的错误处理和用户反馈
 * 
 * @version 2.0.0
 * @author 货船智能机舱管理系统开发团队
 * @since 2024-12-01
 */

// React核心钩子导入
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// React Router hooks
import { useNavigate, useSearchParams } from 'react-router-dom';

// UI组件导入
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Skeleton } from './ui/skeleton';

// 状态管理钩子导入
import { useAlarmsStore } from '../stores/alarms-store';
import { usePermissions } from '../hooks/usePermissions';

// 类型导入
import { Alarm, AlertSeverity, AlarmStatus } from '../types/alarms';

// 图标组件导入
import {
  Search,
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
  Calendar as CalendarIcon,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Cpu,
  MapPin,
  ArrowRight
} from 'lucide-react';

/**
 * 告警中心页面组件
 *
 * 提供统一的告警管理功能，包括：
 * - 告警列表展示与分页
 * - 多维度筛选功能
 * - 告警详情查看
 * - 告警状态更新
 * - 实时数据刷新（简化版）
 */
export function AlertCenterPage() {
  // ===== 路由和权限管理 =====
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 权限检查
  const { hasPermission } = usePermissions();
  const canReadAlert = hasPermission('alert', 'read');
  const canUpdateAlert = hasPermission('alert', 'update');

  // ===== 告警Store状态管理 =====
  const {
    // 基础状态
    items: alarms,
    loading,
    error,
    total,
    page,
    pageSize,
    totalPages,
    
    // 操作方法
    fetchAlarms,
    acknowledgeAlarm,
    resolveAlarm,
    ignoreAlarm,
    clearError,
  } = useAlarmsStore();

  // ===== 页面本地状态管理 =====

  /**
   * 搜索关键词
   */
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * 筛选条件
   */
  const [filters, setFilters] = useState({
    equipmentId: searchParams.get('equipmentId') || '',
    severity: [] as AlertSeverity[],
    status: [] as AlarmStatus[],
    startTime: undefined as Date | undefined,
    endTime: undefined as Date | undefined,
  });

  /**
   * 实时刷新状态
   */
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [pollingId, setPollingId] = useState<number | null>(null);

  /**
   * 选中的告警详情
   */
  const [selectedAlarm, setSelectedAlarm] = useState<Alarm | null>(null);

  /**
   * 操作确认对话框状态
   */
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    alarm: Alarm | null;
    action: 'acknowledge' | 'resolve' | 'ignore';
    note?: string;
  }>({
    open: false,
    alarm: null,
    action: 'acknowledge',
  });

  // ===== 数据处理和过滤 =====

  /**
   * 获取过滤后的告警列表
   */
  const filteredAlarms = useMemo(() => {
    return alarms.filter(alarm => {
      // 搜索过滤
      const matchesSearch = searchTerm === '' || 
        alarm.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alarm.equipmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alarm.equipmentId.toLowerCase().includes(searchTerm.toLowerCase());

      // 严重程度过滤（支持多选）
      const matchesSeverity = filters.severity.length === 0 || filters.severity.includes(alarm.severity);

      // 状态过滤（支持多选）
      const matchesStatus = filters.status.length === 0 || filters.status.includes(alarm.status);

      // 设备过滤
      const matchesEquipment = filters.equipmentId === '' || 
        alarm.equipmentId.toLowerCase().includes(filters.equipmentId.toLowerCase());

      // 时间范围过滤
      let matchesTimeRange = true;
      if (filters.startTime && filters.endTime) {
        const alarmTime = new Date(alarm.triggeredAt);
        matchesTimeRange = alarmTime >= filters.startTime && alarmTime <= filters.endTime;
      }

      return matchesSearch && matchesSeverity && matchesStatus && matchesEquipment && matchesTimeRange;
    });
  }, [alarms, searchTerm, filters]);

  // ===== 数据加载和刷新 =====

  /**
   * 获取告警数据
   */
  const loadAlarms = useCallback(async () => {
    try {
      await fetchAlarms({
        page: 1,
        pageSize: 20,
        filters: {
          deviceId: filters.equipmentId || undefined,
          severity: filters.severity.length > 0 ? filters.severity : undefined,
          status: filters.status.length > 0 ? filters.status : undefined,
          startTime: filters.startTime?.getTime(),
          endTime: filters.endTime?.getTime(),
        }
      });
    } catch (error) {
      console.error('获取告警数据失败:', error);
    }
  }, [fetchAlarms, filters]);

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    if (canReadAlert) {
      loadAlarms();
    }
  }, [canReadAlert, loadAlarms]);

  /**
   * 实时刷新功能
   */
  const handleRealTimeToggle = useCallback(() => {
    setRealTimeEnabled((prev) => {
      const next = !prev;
      if (next) {
        // 启用轮询
        const id = window.setInterval(() => {
          loadAlarms();
        }, 30000); // 每30秒刷新
        setPollingId(id);
      } else if (pollingId !== null) {
        // 停止轮询
        window.clearInterval(pollingId);
        setPollingId(null);
      }
      return next;
    });
  }, [loadAlarms, pollingId]);

  /**
   * 清理轮询定时器
   */
  useEffect(() => {
    return () => {
      if (pollingId !== null) {
        window.clearInterval(pollingId);
      }
    };
  }, [pollingId]);

  // ===== 告警操作处理 =====

  /**
   * 处理告警操作
   */
  const handleAlarmAction = useCallback(async (alarm: Alarm, action: 'acknowledge' | 'resolve' | 'ignore', note?: string) => {
    if (!canUpdateAlert) {
      return;
    }

    try {
      switch (action) {
        case 'acknowledge':
          await acknowledgeAlarm(alarm.id, note);
          break;
        case 'resolve':
          await resolveAlarm(alarm.id, note);
          break;
        case 'ignore':
          await ignoreAlarm(alarm.id, note || '用户忽略');
          break;
      }
      
      // 刷新数据
      await loadAlarms();
      
      // 关闭对话框
      setActionDialog({ open: false, alarm: null, action: 'acknowledge' });
    } catch (error) {
      console.error('告警操作失败:', error);
    }
  }, [canUpdateAlert, acknowledgeAlarm, resolveAlarm, ignoreAlarm, loadAlarms]);

  /**
   * 打开操作确认对话框
   */
  const openActionDialog = useCallback((alarm: Alarm, action: 'acknowledge' | 'resolve' | 'ignore') => {
    setActionDialog({
      open: true,
      alarm,
      action,
    });
  }, []);

  // ===== 工具方法 =====

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
        label: '低级别',
      },
      [AlertSeverity.MEDIUM]: {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        label: '中等级别',
      },
      [AlertSeverity.HIGH]: {
        icon: AlertTriangle,
        color: 'text-orange-400',
        bg: 'bg-orange-500/20',
        border: 'border-orange-500/30',
        label: '高级别',
      },
      [AlertSeverity.CRITICAL]: {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        label: '严重级别',
      }
    };
    return configs[severity];
  }, []);

  /**
   * 格式化时间
   */
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(timestamp)
    };
  }, []);

  /**
   * 计算相对时间
   */
  const getRelativeTime = useCallback((timestamp: number) => {
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

  /**
   * 分页处理
   */
  const handlePageChange = useCallback((newPage: number) => {
    // 这里应该调用分页API，简化实现
    console.log('切换到页面:', newPage);
  }, []);

  /**
   * 重置筛选条件
   */
  const resetFilters = useCallback(() => {
    setFilters({
      equipmentId: '',
      severity: [],
      status: [],
      startTime: undefined,
      endTime: undefined,
    });
    setSearchTerm('');
    // 清除URL参数
    setSearchParams({});
  }, [setSearchParams]);

  // ===== 主界面渲染 =====

  if (!canReadAlert) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            您没有权限访问告警中心页面。请联系管理员获取相应权限。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-slate-900 min-h-screen">
      {/* 页面标题和控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-cyan-400" />
            告警中心
            {realTimeEnabled && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                实时监控
              </Badge>
            )}
          </h2>
          <p className="text-slate-400 mt-1">
            统一告警管理 · 多维度筛选 · 状态跟踪
          </p>
        </div>

        {/* 右侧控制按钮 */}
        <div className="flex items-center gap-3">
          {/* 实时刷新开关 */}
          <Button
            onClick={handleRealTimeToggle}
            variant="outline"
            size="sm"
            className={`${realTimeEnabled ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-slate-500/20 border-slate-500/30 text-slate-400'}`}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            {realTimeEnabled ? '停止监控' : '开始监控'}
          </Button>

          {/* 手动刷新按钮 */}
          <Button
            onClick={loadAlarms}
            variant="outline"
            size="sm"
            className="bg-slate-500/20 border-slate-500/30 text-slate-400"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert className="border-yellow-500/30 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-300">
            无法连接到服务器，正在显示演示数据
            <Button
              onClick={clearError}
              variant="outline"
              size="sm"
              className="ml-2 bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
            >
              清除
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 搜索和筛选区域 */}
      <Card className="bg-slate-800/80 border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="搜索告警..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* 严重程度筛选 */}
          <Select value={filters.severity.join(',')} onValueChange={(value: string) =>
            setFilters(prev => ({
              ...prev,
              severity: value === 'all' ? [] : [value as AlertSeverity]
            }))
          }>
            <SelectTrigger className="bg-slate-900/50 border-slate-600">
              <SelectValue placeholder="选择严重程度" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-600">
              <SelectItem value="all">全部级别</SelectItem>
              <SelectItem value={AlertSeverity.LOW}>低级别</SelectItem>
              <SelectItem value={AlertSeverity.MEDIUM}>中等级别</SelectItem>
              <SelectItem value={AlertSeverity.HIGH}>高级别</SelectItem>
              <SelectItem value={AlertSeverity.CRITICAL}>严重级别</SelectItem>
            </SelectContent>
          </Select>

          {/* 状态筛选 */}
          <Select value={filters.status.join(',')} onValueChange={(value: string) =>
            setFilters(prev => ({
              ...prev,
              status: value === 'all' ? [] : [value as AlarmStatus]
            }))
          }>
            <SelectTrigger className="bg-slate-900/50 border-slate-600">
              <SelectValue placeholder="选择状态" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-600">
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value={AlarmStatus.PENDING}>待处理</SelectItem>
              <SelectItem value={AlarmStatus.PROCESSING}>处理中</SelectItem>
              <SelectItem value={AlarmStatus.RESOLVED}>已解决</SelectItem>
              <SelectItem value={AlarmStatus.IGNORED}>已忽略</SelectItem>
            </SelectContent>
          </Select>

          {/* 设备筛选 */}
          <Input
            type="text"
            placeholder="设备ID或名称"
            value={filters.equipmentId}
            onChange={(e) => setFilters(prev => ({ ...prev, equipmentId: e.target.value }))}
            className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {/* 时间范围选择 */}
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">时间范围:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-slate-900/50 border-slate-600 text-slate-300"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {filters.startTime ? filters.startTime.toLocaleDateString() : '开始日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-slate-900 border-slate-600">
              <Calendar
                mode="single"
                selected={filters.startTime}
                onSelect={(date) => setFilters(prev => ({ 
                  ...prev, 
                  startTime: date 
                }))}
                className="text-slate-200"
              />
            </PopoverContent>
          </Popover>

          <span className="text-slate-400">至</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-slate-900/50 border-slate-600 text-slate-300"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {filters.endTime ? filters.endTime.toLocaleDateString() : '结束日期'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-slate-900 border-slate-600">
              <Calendar
                mode="single"
                selected={filters.endTime}
                onSelect={(date) => setFilters(prev => ({ 
                  ...prev, 
                  endTime: date 
                }))}
                className="text-slate-200"
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={resetFilters}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-400"
          >
            重置筛选
          </Button>
        </div>
      </Card>

      {/* 告警列表 */}
      <Card className="bg-slate-800/80 border-slate-700">
        <div className="p-6">
          {loading ? (
            // 骨架屏加载状态
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                  <div className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-3 rounded" />
                        <Skeleton className="h-3 rounded" />
                        <Skeleton className="h-3 rounded" />
                        <Skeleton className="h-3 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAlarms.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-slate-300 text-lg font-medium mb-2">暂无告警记录</h3>
              <p className="text-slate-400">当前筛选条件下没有找到告警记录</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlarms.map((alarm, index) => {
                const severityConfig = getSeverityConfig(alarm.severity);
                const Icon = severityConfig.icon;
                const timeInfo = formatTime(alarm.triggeredAt);

                return (
                  <div
                    key={alarm.id}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className={`w-5 h-5 mt-0.5 ${severityConfig.color}`} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`${severityConfig.bg} ${severityConfig.color} border-0 px-2 py-0.5 text-xs`}>
                              {severityConfig.label}
                            </Badge>
                            <Badge className={`text-xs ${
                              alarm.status === AlarmStatus.PENDING ? 'bg-red-500/20 text-red-400 border-red-500' :
                              alarm.status === AlarmStatus.PROCESSING ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500' :
                              alarm.status === AlarmStatus.RESOLVED ? 'bg-green-500/20 text-green-400 border-green-500' :
                              'bg-slate-500/20 text-slate-400 border-slate-500'
                            }`}>
                              {alarm.status === AlarmStatus.PENDING && '待处理'}
                              {alarm.status === AlarmStatus.PROCESSING && '处理中'}
                              {alarm.status === AlarmStatus.RESOLVED && '已解决'}
                              {alarm.status === AlarmStatus.IGNORED && '已忽略'}
                            </Badge>
                            <span className="text-slate-500 text-xs">#{index + 1}</span>
                          </div>

                          <h4 className="text-slate-200 font-medium mb-1">{alarm.message}</h4>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400">设备:</span>
                              <span className="text-slate-300">{alarm.equipmentName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400">ID:</span>
                              <span className="text-slate-300">{alarm.equipmentId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400">触发:</span>
                              <span className="text-slate-300">{timeInfo.date} {timeInfo.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-400">相对:</span>
                              <span className="text-slate-300">{timeInfo.relative}</span>
                            </div>
                          </div>

                          {alarm.handlerNote && (
                            <div className="mt-2 p-2 bg-slate-800/50 rounded border border-slate-600">
                              <p className="text-slate-300 text-sm">
                                <span className="text-slate-400">处理记录:</span> {alarm.handlerNote}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {/* 查看详情按钮 */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                              onClick={() => setSelectedAlarm(alarm)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="text-slate-200">告警详情</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                  <span className="text-slate-400">触发时间:</span>
                                  <span className="text-slate-200 ml-2">{new Date(alarm.triggeredAt).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400">创建时间:</span>
                                  <span className="text-slate-200 ml-2">{new Date(alarm.createdAt).toLocaleString()}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">告警消息:</span>
                                <p className="text-slate-200 mt-1">{alarm.message}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">设备名称:</span>
                                <p className="text-slate-200 mt-1">{alarm.equipmentName}</p>
                              </div>
                              {alarm.handlerNote && (
                                <div>
                                  <span className="text-slate-400">处理记录:</span>
                                  <p className="text-slate-200 mt-1">{alarm.handlerNote}</p>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* 操作按钮 */}
                        {canUpdateAlert && alarm.status === AlarmStatus.PENDING && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-yellow-500/20 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/30"
                            onClick={() => openActionDialog(alarm, 'acknowledge')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {canUpdateAlert && (alarm.status === AlarmStatus.PENDING || alarm.status === AlarmStatus.PROCESSING) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
                            onClick={() => openActionDialog(alarm, 'resolve')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {canUpdateAlert && alarm.status === AlarmStatus.PENDING && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-500/20 border-slate-500/30 text-slate-400 hover:bg-slate-500/30"
                            onClick={() => openActionDialog(alarm, 'ignore')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 分页控制 */}
        {!loading && filteredAlarms.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-700">
            <div className="text-slate-400 text-sm">
              显示 {filteredAlarms.length} / {total} 条记录
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-slate-300 px-2">
                {page}
              </span>
              <Button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-400"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 操作确认对话框 */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog(prev => ({ ...prev, open }))
      }>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-200">
              {actionDialog.action === 'acknowledge' && '确认告警'}
              {actionDialog.action === 'resolve' && '解决告警'}
              {actionDialog.action === 'ignore' && '忽略告警'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {actionDialog.alarm && (
                <div>
                  <p>您确定要{actionDialog.action === 'acknowledge' ? '确认' : 
                    actionDialog.action === 'resolve' ? '解决' : '忽略'}以下告警吗？</p>
                  <div className="mt-2 p-2 bg-slate-900/50 rounded border border-slate-600">
                    <p className="text-slate-200">{actionDialog.alarm.message}</p>
                    <p className="text-slate-400 text-sm mt-1">
                      设备: {actionDialog.alarm.equipmentName} ({actionDialog.alarm.equipmentId})
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-slate-300 border-slate-600">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionDialog.alarm) {
                  handleAlarmAction(actionDialog.alarm, actionDialog.action, actionDialog.note);
                }
              }}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {actionDialog.action === 'acknowledge' && '确认'}
              {actionDialog.action === 'resolve' && '解决'}
              {actionDialog.action === 'ignore' && '忽略'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}