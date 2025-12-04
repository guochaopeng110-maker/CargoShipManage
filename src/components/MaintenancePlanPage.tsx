/**
 * 货船智能机舱管理系统 - 维护计划页面组件
 *
 * 功能说明：
 * 本组件提供完整的设备维护计划管理功能，包括维护任务创建、编辑、删除、
 * 任务状态管理、设备关联维护、责任人分配等核心功能。
 *
 * 主要特性：
 * 1. 维护任务信息展示（任务名称、设备、计划日期、状态、负责人）
 * 2. 智能搜索和筛选功能（支持任务名称搜索和设备类型、状态筛选）
 * 3. 维护任务增删改查操作（添加新任务、编辑任务、删除任务）
 * 4. 任务状态管理（待执行、进行中、已完成状态切换）
 * 5. 任务详情查看和批量操作功能
 * 6. 响应式设计，适配不同屏幕尺寸
 * 7. 实时数据更新和错误处理
 *
 * 技术架构：
 * - 基于React函数组件 + Hooks
 * - 集成设备管理Store状态管理
 * - 使用设备服务API进行数据交互
 * - 采用响应式UI设计和Tailwind CSS
 * - 支持分页加载和虚拟滚动
 *
 * 维护计划管理流程：
 * 1. 组件加载时获取设备列表和当前维护计划
 * 2. 根据用户输入实时搜索和筛选维护任务
 * 3. 提供维护任务添加/编辑对话框操作
 * 4. 支持任务状态切换和批量操作
 * 5. 集成错误处理和加载状态管理
 * 6. 响应式UI适配和交互优化
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 * @since 2024
 */

// React核心库导入
import React, { useState, useEffect, useCallback } from 'react';

// 图标库导入（来自Lucide React）
import {
  Plus,          // 添加任务图标
  Search,        // 搜索图标
  Edit,          // 编辑图标
  Trash2,        // 删除图标
  Calendar,      // 日历图标
  RefreshCw,     // 刷新图标
  Filter,        // 过滤器图标
  CheckCircle,   // 完成图标
  Clock,         // 时钟图标
  Play           // 开始图标
} from 'lucide-react';

// UI组件导入
import { Card } from './ui/card';                    // 卡片容器组件
import { Button } from './ui/button';                // 按钮组件
import { Input } from './ui/input';                  // 输入框组件
import { Badge } from './ui/badge';                  // 徽章组件
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';  // 对话框组件
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';   // 选择器组件
import { Alert, AlertDescription } from './ui/alert'; // 警告提示组件

// 设备相关类型和接口导入
import { Equipment } from '../types/equipment'; // 设备实体类型

// 维护任务相关类型定义
interface MaintenanceTask {
  id: string;
  name: string;
  deviceId: string;
  deviceName: string;
  plannedDate: string;
  status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
  responsible: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  estimatedDuration?: number; // 预计持续时间（小时）
  createdAt: number;
  updatedAt: number;
}

// 创建设备请求接口
interface CreateMaintenanceTaskRequest {
  name: string;
  deviceId: string;
  plannedDate: string;
  responsible: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  estimatedDuration?: number;
}

// 更新设备请求接口
interface UpdateMaintenanceTaskRequest {
  name?: string;
  deviceId?: string;
  plannedDate?: string;
  status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
  responsible?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  estimatedDuration?: number;
}

// 设备管理Store状态管理
import { useEquipment } from '../stores/equipment-store';

/**
 * 维护计划页面主组件
 *
 * 这是整个维护计划管理功能的核心组件，提供完整的维护计划管理界面
 * 包括维护任务列表展示、搜索筛选、增删改查等所有维护计划管理功能
 *
 * 功能特点：
 * - 响应式设计，支持桌面和移动设备
 * - 实时数据更新和状态同步
 * - 智能搜索和多维度筛选
 * - 直观的维护任务状态可视化
 * - 完整的错误处理和用户反馈
 * - 批量操作和效率优化
 */
export function MaintenancePlanPage() {
  // 使用设备管理Store的状态和方法
  const {
    items: equipmentList,           // 设备列表数据
    loading: equipmentLoading,       // 设备加载状态
    error: equipmentError,           // 设备错误信息
    fetchEquipmentList,             // 获取设备列表
  } = useEquipment();

  // 组件本地状态管理
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]); // 维护任务列表
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<MaintenanceTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 组件初始化加载
   * 在组件挂载时获取设备列表和当前维护计划
   */
  useEffect(() => {
    // 获取设备列表
    fetchEquipmentList().catch(console.error);
    
    // 加载维护任务列表（这里模拟API调用）
    loadMaintenanceTasks().catch(console.error);
  }, []);

  /**
   * 加载维护任务列表
   * 模拟从API获取维护任务数据
   */
  const loadMaintenanceTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 模拟API调用 - 在实际项目中这里会调用维护服务API
      const mockTasks: MaintenanceTask[] = [
        {
          id: '1',
          name: '电池组定期检查',
          deviceId: 'bat-001',
          deviceName: '电池组A',
          plannedDate: '2025-11-25',
          status: 'scheduled',
          responsible: '技术员A',
          priority: 'medium',
          description: '检查电池组电压、温度、绝缘性能',
          estimatedDuration: 2,
          createdAt: Date.now() - 86400000, // 1天前
          updatedAt: Date.now() - 86400000,
        },
        {
          id: '2',
          name: '推进电机润滑保养',
          deviceId: 'motor-001',
          deviceName: '左推进电机',
          plannedDate: '2025-11-22',
          status: 'inProgress',
          responsible: '技术员B',
          priority: 'high',
          description: '更换润滑油，检查轴承磨损情况',
          estimatedDuration: 4,
          createdAt: Date.now() - 172800000, // 2天前
          updatedAt: Date.now() - 3600000,   // 1小时前
        },
        {
          id: '3',
          name: '逆变器冷却系统清洁',
          deviceId: 'inv-001',
          deviceName: '1#逆变器',
          plannedDate: '2025-11-20',
          status: 'completed',
          responsible: '技术员C',
          priority: 'low',
          description: '清洁散热片和冷却风扇，检查冷却液液位',
          estimatedDuration: 1.5,
          createdAt: Date.now() - 259200000, // 3天前
          updatedAt: Date.now() - 7200000,   // 2小时前
        },
        {
          id: '4',
          name: '冷却水泵更换滤芯',
          deviceId: 'pump-001',
          deviceName: '主冷却泵',
          plannedDate: '2025-11-28',
          status: 'scheduled',
          responsible: '技术员A',
          priority: 'medium',
          description: '更换冷却系统滤芯，检查泵体运行状态',
          estimatedDuration: 1,
          createdAt: Date.now() - 345600000, // 4天前
          updatedAt: Date.now() - 345600000,
        },
        {
          id: '5',
          name: '舱底水泵年度检修',
          deviceId: 'pump-002',
          deviceName: '舱底水泵',
          plannedDate: '2025-12-01',
          status: 'scheduled',
          responsible: '技术员B',
          priority: 'high',
          description: '年度检修包括叶轮检查、密封件更换、性能测试',
          estimatedDuration: 8,
          createdAt: Date.now() - 432000000, // 5天前
          updatedAt: Date.now() - 432000000,
        },
      ];
      
      setTasks(mockTasks);
    } catch (error) {
      console.error('加载维护任务失败:', error);
      setError('加载维护任务失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取任务状态徽章组件
   * 根据任务状态返回相应的样式化徽章
   *
   * @param {string} status - 任务状态
   * @returns {JSX.Element} 状态徽章元素
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">待执行</Badge>;
      case 'inProgress':
        return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500">进行中</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500">已完成</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">已取消</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">未知</Badge>;
    }
  };

  /**
   * 获取优先级徽章组件
   * 根据优先级返回相应的样式化徽章
   *
   * @param {string} priority - 任务优先级
   * @returns {JSX.Element} 优先级徽章元素
   */
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">低</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500">中</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">高</Badge>;
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">紧急</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">未知</Badge>;
    }
  };

  /**
   * 任务操作处理方法 - 添加新任务
   * 打开添加任务对话框，清空编辑任务状态
   */
  const handleAddTask = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  /**
   * 任务操作处理方法 - 编辑任务
   * 打开编辑任务对话框，设置当前编辑的任务
   *
   * @param {MaintenanceTask} task - 要编辑的任务对象
   */
  const handleEditTask = (task: MaintenanceTask) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  /**
   * 任务操作处理方法 - 准备删除任务
   * 显示删除确认对话框
   *
   * @param {MaintenanceTask} task - 要删除的任务
   */
  const handleDeleteTask = (task: MaintenanceTask) => {
    setTaskToDelete(task);
    setConfirmDialogOpen(true);
  };

  /**
   * 任务操作处理方法 - 确认删除任务
   * 执行任务删除操作
   */
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      // 模拟API调用删除任务
      setTasks(tasks.filter(t => t.id !== taskToDelete.id));
      setConfirmDialogOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error('删除维护任务失败:', error);
      setError('删除维护任务失败，请重试');
    }
  };

  /**
   * 任务操作处理方法 - 更新任务状态
   * 切换任务的状态（开始、暂停、完成等）
   *
   * @param {MaintenanceTask} task - 要更新状态的任务
   */
  const handleUpdateTaskStatus = async (task: MaintenanceTask) => {
    try {
      let newStatus: MaintenanceTask['status'];
      
      switch (task.status) {
        case 'scheduled':
          newStatus = 'inProgress';
          break;
        case 'inProgress':
          newStatus = 'completed';
          break;
        case 'completed':
          newStatus = 'scheduled'; // 可以重新安排
          break;
        default:
          return;
      }

      // 模拟API调用更新任务状态
      setTasks(tasks.map(t =>
        t.id === task.id
          ? { ...t, status: newStatus, updatedAt: Date.now() }
          : t
      ));
    } catch (error) {
      console.error('更新任务状态失败:', error);
      setError('更新任务状态失败，请重试');
    }
  };

  /**
   * 任务操作处理方法 - 保存任务信息
   * 处理任务添加/编辑对话框的保存操作
   *
   * @param {React.FormEvent<HTMLFormElement>} event - 表单提交事件
   */
  const handleSaveTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const taskData = {
      name: formData.get('name') as string,
      deviceId: formData.get('deviceId') as string,
      plannedDate: formData.get('plannedDate') as string,
      responsible: formData.get('responsible') as string,
      priority: formData.get('priority') as 'low' | 'medium' | 'high' | 'critical',
      description: formData.get('description') as string,
      estimatedDuration: formData.get('estimatedDuration') ?
        parseFloat(formData.get('estimatedDuration') as string) : undefined,
    };

    try {
      if (editingTask) {
        // 编辑模式 - 更新任务信息
        setTasks(tasks.map(t =>
          t.id === editingTask.id
            ? { ...t, ...taskData, updatedAt: Date.now() }
            : t
        ));
      } else {
        // 添加模式 - 创建新任务
        const newTask: MaintenanceTask = {
          id: Date.now().toString(),
          ...taskData,
          deviceName: equipmentList.find(e => e.id === taskData.deviceId)?.deviceName || '未知设备',
          status: 'scheduled',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setTasks([newTask, ...tasks]);
      }
      
      // 操作成功后关闭对话框
      setDialogOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('保存维护任务失败:', error);
      setError('保存维护任务失败，请重试');
    }
  };

  /**
   * 任务搜索和筛选逻辑
   * 根据搜索关键词、设备、状态和优先级过滤任务列表
   */
  const filteredTasks = tasks.filter((task) => {
    // 搜索条件匹配（任务名称或设备名称）
    const matchesSearch =
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // 状态筛选条件匹配
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    
    // 设备筛选条件匹配
    const matchesDevice = filterDevice === 'all' || task.deviceId === filterDevice;
    
    // 优先级筛选条件匹配
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesDevice && matchesPriority;
  });

  /**
   * 获取任务概览统计
   */
  const getTaskStats = () => {
    const total = tasks.length;
    const scheduled = tasks.filter(t => t.status === 'scheduled').length;
    const inProgress = tasks.filter(t => t.status === 'inProgress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;
    
    return { total, scheduled, inProgress, completed, cancelled };
  };

  const stats = getTaskStats();

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">维护计划</h1>
            <p className="text-slate-400 mt-1">
              货船智能机舱设备维护计划管理平台 - 共 {stats.total} 个维护任务
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 错误提示 */}
            {error && (
              <Alert className="bg-red-500/20 border-red-500 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* 刷新按钮 */}
            <Button
              onClick={loadMaintenanceTasks}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            
            {/* 添加新任务按钮 */}
            <Button onClick={handleAddTask} className="bg-cyan-500 hover:bg-cyan-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              添加新任务
            </Button>
          </div>
        </div>

        {/* 维护任务概览统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-slate-400 text-sm">任务总数</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.scheduled}</div>
              <div className="text-slate-400 text-sm">待执行</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats.inProgress}</div>
              <div className="text-slate-400 text-sm">进行中</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
              <div className="text-slate-400 text-sm">已完成</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.cancelled}</div>
              <div className="text-slate-400 text-sm">已取消</div>
            </div>
          </Card>
        </div>

        {/* 搜索和筛选控制栏 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索任务名称、设备或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            
            {/* 设备筛选 */}
            <Select value={filterDevice} onValueChange={setFilterDevice}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="选择设备" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">全部设备</SelectItem>
                {equipmentList.map((equipment) => (
                  <SelectItem key={equipment.id} value={equipment.id} className="text-slate-300">
                    {equipment.deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 状态筛选按钮组 */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setFilterStatus('all')}
                className={
                  filterStatus === 'all'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                全部
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterStatus('scheduled')}
                className={
                  filterStatus === 'scheduled'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                待执行
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterStatus('inProgress')}
                className={
                  filterStatus === 'inProgress'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                进行中
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterStatus('completed')}
                className={
                  filterStatus === 'completed'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                已完成
              </Button>
            </div>
          </div>
          
          {/* 筛选结果显示 */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              显示 {filteredTasks.length} 个任务
              {searchTerm && ` (搜索: "${searchTerm}")`}
              {filterDevice !== 'all' && ` (设备: ${equipmentList.find(e => e.id === filterDevice)?.deviceName || filterDevice})`}
              {filterStatus !== 'all' && ` (状态: ${{
                scheduled: '待执行',
                inProgress: '进行中',
                completed: '已完成',
                cancelled: '已取消'
              }[filterStatus]})`}
            </span>
            {loading && (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                正在加载维护任务...
              </span>
            )}
          </div>
        </Card>

        {/* 维护任务列表 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          {loading ? (
            // 加载状态显示
            <div className="text-center py-8 text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium">正在加载维护任务...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            // 空状态显示
            <div className="text-center py-8 text-slate-400">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">未找到匹配的任务</p>
              <p className="text-sm">
                {searchTerm || filterDevice !== 'all' || filterStatus !== 'all'
                  ? '请尝试调整搜索条件或筛选条件'
                  : '暂无维护任务数据，请添加新任务'
                }
              </p>
            </div>
          ) : (
            // 任务列表数据
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">任务名称</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">设备</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">计划日期</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">状态</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">优先级</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">负责人</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">预计时长</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div>
                          <div className="text-slate-300 text-sm font-medium">{task.name}</div>
                          {task.description && (
                            <div className="text-slate-500 text-xs mt-1 line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-sm">{task.deviceName}</td>
                      <td className="py-3 px-3 text-slate-400 text-sm">{task.plannedDate}</td>
                      <td className="py-3 px-3">{getStatusBadge(task.status)}</td>
                      <td className="py-3 px-3">{getPriorityBadge(task.priority)}</td>
                      <td className="py-3 px-3 text-slate-400 text-sm">{task.responsible}</td>
                      <td className="py-3 px-3 text-slate-400 text-sm">
                        {task.estimatedDuration ? `${task.estimatedDuration}h` : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          {/* 状态切换按钮 */}
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTaskStatus(task)}
                            className={`p-2 ${
                              task.status === 'scheduled' ? 'bg-blue-500 hover:bg-blue-600' :
                              task.status === 'inProgress' ? 'bg-green-500 hover:bg-green-600' :
                              'bg-cyan-500 hover:bg-cyan-600'
                            } text-white`}
                            title={
                              task.status === 'scheduled' ? '开始执行' :
                              task.status === 'inProgress' ? '标记完成' :
                              task.status === 'completed' ? '重新安排' : '未知操作'
                            }
                          >
                            {task.status === 'scheduled' ? <Play className="w-3 h-3" /> :
                             task.status === 'inProgress' ? <CheckCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                          </Button>
                          
                          {/* 编辑按钮 */}
                          <Button
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white p-2"
                            title="编辑任务"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          
                          {/* 删除按钮 */}
                          <Button
                            size="sm"
                            onClick={() => handleDeleteTask(task)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2"
                            title="删除任务"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 添加/编辑任务对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                {editingTask ? '编辑维护任务' : '添加新维护任务'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">任务名称 *</label>
                <Input
                  name="name"
                  required
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入任务名称"
                  defaultValue={editingTask?.name}
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">设备 *</label>
                <Select name="deviceId" required defaultValue={editingTask?.deviceId}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="选择设备" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {equipmentList.map((equipment) => (
                      <SelectItem key={equipment.id} value={equipment.id} className="text-slate-300">
                        {equipment.deviceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">计划日期 *</label>
                <Input
                  name="plannedDate"
                  type="date"
                  required
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  defaultValue={editingTask?.plannedDate}
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">优先级 *</label>
                <Select name="priority" required defaultValue={editingTask?.priority || 'medium'}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="low" className="text-slate-300">低优先级</SelectItem>
                    <SelectItem value="medium" className="text-slate-300">中优先级</SelectItem>
                    <SelectItem value="high" className="text-slate-300">高优先级</SelectItem>
                    <SelectItem value="critical" className="text-slate-300">紧急优先级</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">负责人 *</label>
                <Input
                  name="responsible"
                  required
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入负责人"
                  defaultValue={editingTask?.responsible}
                />
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">预计时长（小时）</label>
                <Input
                  name="estimatedDuration"
                  type="number"
                  step="0.5"
                  min="0"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入预计时长"
                  defaultValue={editingTask?.estimatedDuration}
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">任务描述</label>
                <Input
                  name="description"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入任务描述"
                  defaultValue={editingTask?.description}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  disabled={loading}
                >
                  {loading ? '处理中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                确认删除维护任务
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-slate-300">
                您确定要删除维护任务 <strong>{taskToDelete?.name}</strong> 吗？
              </p>
              <p className="text-red-400 text-sm mt-2">
                此操作不可恢复，任务的所有相关信息将被删除。
              </p>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialogOpen(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                取消
              </Button>
              <Button
                onClick={confirmDeleteTask}
                className="bg-red-500 hover:bg-red-600 text-white"
                disabled={loading}
              >
                {loading ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
