/**
 * 货船智能机舱管理系统 - 维护历史页面组件
 *
 * 功能说明：
 * 本组件提供完整的设备维护历史记录查看功能，包括维护记录列表展示、
 * 详细步骤查看、维护结果分析、执行人员统计等核心功能。
 *
 * 主要特性：
 * 1. 维护历史记录信息展示（任务名称、设备、完成日期、执行人员、结果）
 * 2. 智能搜索和筛选功能（支持任务名称搜索和设备类型、结果筛选）
 * 3. 维护记录详情查看（详细步骤、执行备注、结果分析）
 * 4. 维护结果统计分析（成功、部分成功、失败统计）
 * 5. 维护记录导出和打印功能
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
 * 维护历史管理流程：
 * 1. 组件加载时获取设备列表和维护历史记录
 * 2. 根据用户输入实时搜索和筛选维护记录
 * 3. 提供维护记录详情查看对话框
 * 4. 支持维护结果统计和分析
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
  Search,        // 搜索图标
  Eye,           // 查看详情图标
  RefreshCw,     // 刷新图标
  Filter,        // 过滤器图标
  Download,      // 导出图标
  Calendar,      // 日历图标
  CheckCircle,   // 成功图标
  AlertCircle,   // 警告图标
  XCircle,       // 失败图标
  Clock          // 时钟图标
} from 'lucide-react';

// UI组件导入
import { Card } from './ui/card';                    // 卡片容器组件
import { Button } from './ui/button';                // 按钮组件
import { Input } from './ui/input';                  // 输入框组件
import { Badge } from './ui/badge';                  // 徽章组件
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';   // 选择器组件
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'; // 对话框组件
import { Alert, AlertDescription } from './ui/alert'; // 警告提示组件

// 设备相关类型和接口导入
// 从设备存储导入前端业务类型
import type { Equipment } from '../stores/equipment-store'; // 设备实体类型

// 维护历史记录相关类型定义
interface MaintenanceRecord {
  id: string;
  taskName: string;
  deviceId: string;
  deviceName: string;
  completedDate: string;
  executor: string;
  result: 'success' | 'partial' | 'failed';
  actualDuration?: number; // 实际执行时长（小时）
  startTime?: string;      // 开始执行时间
  endTime?: string;        // 结束执行时间
  notes: string;           // 执行备注
  details: string[];       // 详细执行步骤
  cost?: number;           // 维护成本
  partsUsed?: string[];    // 使用部件列表
  issuesFound?: string[];  // 发现的问题
  recommendations?: string[]; // 后续建议（改为字符串数组）
  createdAt: number;
  updatedAt: number;
}

// 设备管理Store状态管理
import { useEquipmentStore } from '../stores/equipment-store';

/**
 * 维护历史页面主组件
 *
 * 这是整个维护历史管理功能的核心组件，提供完整的维护历史记录管理界面
 * 包括维护记录列表展示、搜索筛选、详情查看等所有维护历史管理功能
 *
 * 功能特点：
 * - 响应式设计，支持桌面和移动设备
 * - 实时数据更新和状态同步
 * - 智能搜索和多维度筛选
 * - 直观的维护结果可视化
 * - 完整的错误处理和用户反馈
 * - 维护记录统计分析
 */
export function MaintenanceHistoryPage() {
  // 使用设备管理Store的状态和方法
  const {
    items: equipmentList,           // 设备列表数据
    loading: equipmentLoading,       // 设备加载状态
    error: equipmentError,           // 设备错误信息
    ensureItemsLoaded,             // 确保设备列表已加载
  } = useEquipmentStore();

  // 组件本地状态管理
  const [records, setRecords] = useState<MaintenanceRecord[]>([]); // 维护历史记录列表
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDevice, setFilterDevice] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all'); // 日期范围筛选
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 组件初始化加载
   * 在组件挂载时获取设备列表和维护历史记录
   */
  useEffect(() => {
    // 确保设备列表已加载 (优先使用缓存)
    ensureItemsLoaded().catch(console.error);

    // 加载维护历史记录（这里模拟API调用）
    loadMaintenanceRecords().catch(console.error);
  }, []);

  /**
   * 加载维护历史记录列表
   * 模拟从API获取维护历史数据
   */
  const loadMaintenanceRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 模拟API调用 - 在实际项目中这里会调用维护历史服务API
      const mockRecords: MaintenanceRecord[] = [
        {
          id: '1',
          taskName: '电池组定期检查',
          deviceId: 'bat-001',
          deviceName: '电池组A',
          completedDate: '2025-11-18 16:30:00',
          executor: '技术员A',
          result: 'success',
          actualDuration: 2.5,
          startTime: '2025-11-18 14:00:00',
          endTime: '2025-11-18 16:30:00',
          notes: '所有单体电压均衡，温度正常，电池系统运行状态良好',
          details: [
            '检查电池组电压: 正常 (24V)',
            '检查电池温度: 正常 (25°C)',
            '检查绝缘性能: 正常',
            '清洁电池接线端子',
            '检查电池外观: 无异常'
          ],
          partsUsed: ['清洁布', '绝缘检测仪'],
          cost: 50,
          issuesFound: [],
          recommendations: ['下次检查时间建议在30天后'],
          createdAt: Date.now() - 172800000, // 2天前
          updatedAt: Date.now() - 172800000,
        },
        {
          id: '2',
          taskName: '推进电机润滑保养',
          deviceId: 'motor-001',
          deviceName: '左推进电机',
          completedDate: '2025-11-16 14:20:00',
          executor: '技术员B',
          result: 'success',
          actualDuration: 4.0,
          startTime: '2025-11-16 10:20:00',
          endTime: '2025-11-16 14:20:00',
          notes: '更换润滑油，轴承运行正常，无异常噪音',
          details: [
            '排放旧润滑油 (2.0L)',
            '清洁电机轴承',
            '添加新润滑油 (2.5L)',
            '运行测试30分钟',
            '检查轴承温度: 正常'
          ],
          partsUsed: ['润滑油 2.5L', '清洁剂'],
          cost: 150,
          issuesFound: [],
          recommendations: ['下次更换润滑油在6个月后'],
          createdAt: Date.now() - 345600000, // 4天前
          updatedAt: Date.now() - 345600000,
        },
        {
          id: '3',
          taskName: '逆变器冷却系统清洁',
          deviceId: 'inv-001',
          deviceName: '1#逆变器',
          completedDate: '2025-11-13 10:15:00',
          executor: '技术员C',
          result: 'partial',
          actualDuration: 1.5,
          startTime: '2025-11-13 08:45:00',
          endTime: '2025-11-13 10:15:00',
          notes: '清洁完成，但发现散热片有轻微腐蚀，需要更换',
          details: [
            '清洁散热片表面',
            '检查冷却风扇运行状态',
            '发现散热片轻微腐蚀',
            '检查冷却液液位: 正常',
            '建议下次更换散热片'
          ],
          partsUsed: ['清洁剂', '软毛刷'],
          cost: 30,
          issuesFound: ['散热片轻微腐蚀'],
          recommendations: ['建议在下个维护周期更换散热片'],
          createdAt: Date.now() - 604800000, // 7天前
          updatedAt: Date.now() - 604800000,
        },
        {
          id: '4',
          taskName: '冷却水泵更换滤芯',
          deviceId: 'pump-001',
          deviceName: '主冷却泵',
          completedDate: '2025-11-11 09:00:00',
          executor: '技术员A',
          result: 'success',
          actualDuration: 1.0,
          startTime: '2025-11-11 08:00:00',
          endTime: '2025-11-11 09:00:00',
          notes: '滤芯更换完成，流量恢复正常，系统压力稳定',
          details: [
            '关闭冷却水泵',
            '拆卸旧滤芯',
            '安装新滤芯',
            '启动系统测试',
            '检查流量: 正常'
          ],
          partsUsed: ['冷却滤芯', '密封胶'],
          cost: 80,
          issuesFound: [],
          recommendations: ['下次更换滤芯在3个月后'],
          createdAt: Date.now() - 777600000, // 9天前
          updatedAt: Date.now() - 777600000,
        },
        {
          id: '5',
          taskName: '舱底水泵检查',
          deviceId: 'pump-002',
          deviceName: '舱底水泵',
          completedDate: '2025-11-06 15:45:00',
          executor: '技术员B',
          result: 'failed',
          actualDuration: 3.0,
          startTime: '2025-11-06 12:45:00',
          endTime: '2025-11-06 15:45:00',
          notes: '检查发现泵叶轮损坏严重，需要更换新叶轮',
          details: [
            '检查泵运行状态: 发现异响',
            '拆卸泵体检查',
            '发现叶轮严重磨损',
            '检查泵轴: 正常',
            '建议更换新叶轮'
          ],
          partsUsed: ['检测工具'],
          cost: 100,
          issuesFound: ['叶轮严重磨损'],
          recommendations: ['立即更换新叶轮，预计维护时间2小时'],
          createdAt: Date.now() - 1209600000, // 14天前
          updatedAt: Date.now() - 1209600000,
        },
        {
          id: '6',
          taskName: '右推进电机绝缘检测',
          deviceId: 'motor-002',
          deviceName: '右推进电机',
          completedDate: '2025-11-14 11:30:00',
          executor: '技术员D',
          result: 'success',
          actualDuration: 2.0,
          startTime: '2025-11-14 09:30:00',
          endTime: '2025-11-14 11:30:00',
          notes: '绝缘检测合格，电机各项指标正常',
          details: [
            '停机等待30分钟',
            '使用绝缘检测仪检测',
            '检查线圈绝缘电阻: >500MΩ',
            '检查接地电阻: 正常',
            '清理电机表面灰尘'
          ],
          partsUsed: ['绝缘检测仪', '清洁布'],
          cost: 40,
          issuesFound: [],
          recommendations: ['建议每年进行一次绝缘检测'],
          createdAt: Date.now() - 518400000, // 6天前
          updatedAt: Date.now() - 518400000,
        },
      ];

      setRecords(mockRecords);
    } catch (error) {
      console.error('加载维护历史记录失败:', error);
      setError('加载维护历史记录失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取结果状态徽章组件
   * 根据维护结果返回相应的样式化徽章
   *
   * @param {string} result - 维护结果
   * @returns {JSX.Element} 结果徽章元素
   */
  const getResultBadge = (result: string) => {
    switch (result) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500">成功</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500">部分完成</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500">失败</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">未知</Badge>;
    }
  };

  /**
   * 获取结果状态图标
   * 根据维护结果返回相应的图标
   *
   * @param {string} result - 维护结果
   * @returns {JSX.Element} 结果图标元素
   */
  const getResultIcon = (result: string) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  /**
   * 处理查看维护记录详情
   * 显示维护记录的详细信息对话框
   *
   * @param {MaintenanceRecord} record - 要查看详情的维护记录
   */
  const handleViewDetails = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setDialogOpen(true);
  };

  /**
   * 处理刷新维护历史记录
   */
  const handleRefresh = () => {
    loadMaintenanceRecords().catch(console.error);
  };

  /**
   * 处理导出维护历史记录
   * 将维护记录导出为Excel或其他格式
   */
  const handleExport = () => {
    // 模拟导出功能
    const dataToExport = filteredRecords.map(record => ({
      '任务名称': record.taskName,
      '设备': record.deviceName,
      '完成日期': record.completedDate,
      '执行人员': record.executor,
      '结果': { success: '成功', partial: '部分完成', failed: '失败' }[record.result],
      '实际时长': record.actualDuration ? `${record.actualDuration}h` : '-',
      '备注': record.notes,
    }));

    console.log('导出维护历史记录:', dataToExport);
    alert('维护历史记录导出功能开发中...');
  };

  /**
   * 维护记录搜索和筛选逻辑
   * 根据搜索关键词、设备、结果和日期范围过滤记录列表
   */
  const filteredRecords = records.filter((record) => {
    // 搜索条件匹配（任务名称、设备名称或备注）
    const matchesSearch =
      record.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.issuesFound && record.issuesFound.some(issue =>
        issue.toLowerCase().includes(searchTerm.toLowerCase())
      ));

    // 设备筛选条件匹配
    const matchesDevice = filterDevice === 'all' || record.deviceId === filterDevice;

    // 结果筛选条件匹配
    const matchesResult = filterResult === 'all' || record.result === filterResult;

    // 日期范围筛选条件匹配
    const matchesDateRange = (() => {
      const recordDate = new Date(record.completedDate);
      const now = new Date();

      switch (filterDateRange) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return recordDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return recordDate >= monthAgo;
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          return recordDate >= quarterAgo;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return recordDate >= yearAgo;
        case 'all':
        default:
          return true;
      }
    })();

    return matchesSearch && matchesDevice && matchesResult && matchesDateRange;
  });

  /**
   * 获取维护记录统计信息
   */
  const getMaintenanceStats = () => {
    const total = records.length;
    const success = records.filter(r => r.result === 'success').length;
    const partial = records.filter(r => r.result === 'partial').length;
    const failed = records.filter(r => r.result === 'failed').length;
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
    const totalDuration = records.reduce((sum, r) => sum + (r.actualDuration || 0), 0);

    return { total, success, partial, failed, totalCost, totalDuration };
  };

  const stats = getMaintenanceStats();

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">维护历史</h1>
            <p className="text-slate-400 mt-1">
              货船智能机舱设备维护历史记录平台 - 共 {stats.total} 条维护记录
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
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>

            {/* 导出按钮 */}
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </div>
        </div>

        {/* 维护历史概览统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-slate-400 text-sm">记录总数</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.success}</div>
              <div className="text-slate-400 text-sm">成功</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.partial}</div>
              <div className="text-slate-400 text-sm">部分完成</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
              <div className="text-slate-400 text-sm">失败</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats.totalDuration.toFixed(1)}</div>
              <div className="text-slate-400 text-sm">总时长(h)</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">¥{stats.totalCost}</div>
              <div className="text-slate-400 text-sm">总成本</div>
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
                placeholder="搜索任务名称、设备、备注或问题..."
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

            {/* 结果筛选按钮组 */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setFilterResult('all')}
                className={
                  filterResult === 'all'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                全部
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterResult('success')}
                className={
                  filterResult === 'success'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                成功
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterResult('partial')}
                className={
                  filterResult === 'partial'
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                部分完成
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterResult('failed')}
                className={
                  filterResult === 'failed'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                失败
              </Button>
            </div>

            {/* 日期范围筛选 */}
            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="时间范围" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">全部</SelectItem>
                <SelectItem value="week" className="text-slate-300">近一周</SelectItem>
                <SelectItem value="month" className="text-slate-300">近一月</SelectItem>
                <SelectItem value="quarter" className="text-slate-300">近三月</SelectItem>
                <SelectItem value="year" className="text-slate-300">近一年</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 筛选结果显示 */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              显示 {filteredRecords.length} 条记录
              {searchTerm && ` (搜索: "${searchTerm}")`}
              {filterDevice !== 'all' && ` (设备: ${equipmentList.find(e => e.id === filterDevice)?.deviceName || filterDevice})`}
              {filterResult !== 'all' && ` (结果: ${{
                success: '成功',
                partial: '部分完成',
                failed: '失败'
              }[filterResult]})`}
              {filterDateRange !== 'all' && ` (时间: ${{
                week: '近一周',
                month: '近一月',
                quarter: '近三月',
                year: '近一年'
              }[filterDateRange]})`}
            </span>
            {loading && (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                正在加载维护历史...
              </span>
            )}
          </div>
        </Card>

        {/* 维护历史记录表格 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          {loading ? (
            // 加载状态显示
            <div className="text-center py-8 text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium">正在加载维护历史记录...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            // 空状态显示
            <div className="text-center py-8 text-slate-400">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">未找到匹配的记录</p>
              <p className="text-sm">
                {searchTerm || filterDevice !== 'all' || filterResult !== 'all' || filterDateRange !== 'all'
                  ? '请尝试调整搜索条件或筛选条件'
                  : '暂无维护历史记录数据'
                }
              </p>
            </div>
          ) : (
            // 维护历史记录列表
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">任务名称</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">设备</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">完成日期</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">执行人员</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">结果</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">实际时长</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">成本</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">备注</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {getResultIcon(record.result)}
                          <div>
                            <div className="text-slate-300 text-sm font-medium">{record.taskName}</div>
                            {record.issuesFound && record.issuesFound.length > 0 && (
                              <div className="text-red-400 text-xs">
                                问题: {record.issuesFound.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-sm">{record.deviceName}</td>
                      <td className="py-3 px-3 text-slate-400 text-sm">{record.completedDate}</td>
                      <td className="py-3 px-3 text-slate-400 text-sm">{record.executor}</td>
                      <td className="py-3 px-3">{getResultBadge(record.result)}</td>
                      <td className="py-3 px-3 text-slate-400 text-sm">
                        {record.actualDuration ? `${record.actualDuration}h` : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-sm">
                        {record.cost ? `¥${record.cost}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-sm max-w-xs truncate">
                        {record.notes}
                      </td>
                      <td className="py-3 px-3">
                        <Button
                          size="sm"
                          onClick={() => handleViewDetails(record)}
                          className="bg-cyan-500 hover:bg-cyan-600 text-white"
                          title="查看详情"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          详情
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* 维护记录详情对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                维护记录详情 - {selectedRecord?.taskName}
              </DialogTitle>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">设备名称</p>
                    <p className="text-slate-100 font-medium">{selectedRecord.deviceName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">执行人员</p>
                    <p className="text-slate-100">{selectedRecord.executor}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">完成日期</p>
                    <p className="text-slate-100">{selectedRecord.completedDate}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">维护结果</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getResultIcon(selectedRecord.result)}
                      {getResultBadge(selectedRecord.result)}
                    </div>
                  </div>
                </div>

                {/* 时间和成本信息 */}
                {(selectedRecord.actualDuration || selectedRecord.cost || selectedRecord.startTime || selectedRecord.endTime) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded">
                    {selectedRecord.startTime && (
                      <div>
                        <p className="text-slate-500 text-sm">开始时间</p>
                        <p className="text-slate-100">{selectedRecord.startTime}</p>
                      </div>
                    )}
                    {selectedRecord.endTime && (
                      <div>
                        <p className="text-slate-500 text-sm">结束时间</p>
                        <p className="text-slate-100">{selectedRecord.endTime}</p>
                      </div>
                    )}
                    {selectedRecord.actualDuration && (
                      <div>
                        <p className="text-slate-500 text-sm">实际时长</p>
                        <p className="text-slate-100">{selectedRecord.actualDuration} 小时</p>
                      </div>
                    )}
                    {selectedRecord.cost && (
                      <div>
                        <p className="text-slate-500 text-sm">维护成本</p>
                        <p className="text-slate-100">¥{selectedRecord.cost}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 执行备注 */}
                <div>
                  <p className="text-slate-500 text-sm mb-2">执行备注</p>
                  <p className="text-slate-100 bg-slate-700/50 p-3 rounded">{selectedRecord.notes}</p>
                </div>

                {/* 详细执行步骤 */}
                <div>
                  <p className="text-slate-500 text-sm mb-2">详细执行步骤</p>
                  <div className="bg-slate-700/30 rounded p-3">
                    <ul className="space-y-1">
                      {selectedRecord.details.map((detail, index) => (
                        <li key={index} className="text-slate-300 text-sm flex items-start gap-2">
                          <span className="text-cyan-400 font-mono text-xs mt-1">{index + 1}.</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 发现的问题 */}
                {selectedRecord.issuesFound && selectedRecord.issuesFound.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-sm mb-2">发现的问题</p>
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                      <ul className="space-y-1">
                        {selectedRecord.issuesFound.map((issue, index) => (
                          <li key={index} className="text-red-300 text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-red-400" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 使用部件 */}
                {selectedRecord.partsUsed && selectedRecord.partsUsed.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-sm mb-2">使用部件</p>
                    <div className="bg-slate-700/30 rounded p-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedRecord.partsUsed.map((part, index) => (
                          <Badge key={index} className="bg-blue-500/20 text-blue-400 border-blue-500 text-xs">
                            {part}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 后续建议 */}
                {selectedRecord.recommendations && selectedRecord.recommendations.length > 0 && (
                  <div>
                    <p className="text-slate-500 text-sm mb-2">后续建议</p>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
                      <ul className="space-y-1">
                        {selectedRecord.recommendations.map((rec, index) => (
                          <li key={index} className="text-amber-300 text-sm flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 mt-0.5 text-amber-400" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
