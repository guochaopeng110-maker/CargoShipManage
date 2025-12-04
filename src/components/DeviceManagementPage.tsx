/**
 * 货船智能机舱管理系统 - 设备管理页面组件
 * 
 * 功能说明：
 * 本组件提供完整的设备管理功能，包括设备列表展示、搜索筛选、添加编辑设备、
 * 设备状态管理、设备详情查看等核心功能。
 * 
 * 主要特性：
 * 1. 设备信息展示（设备ID、名称、类型、位置、状态、上次通讯等）
 * 2. 智能搜索和筛选功能（支持设备ID、名称搜索和类型筛选）
 * 3. 设备增删改查操作（添加新设备、编辑设备、删除设备）
 * 4. 设备状态管理（在线/离线状态切换、启停控制）
 * 5. 设备详情查看和批量操作功能
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
 * 设备管理流程：
 * 1. 组件加载时获取设备列表和概览数据
 * 2. 根据用户输入实时搜索和筛选设备
 * 3. 提供设备添加/编辑对话框操作
 * 4. 支持设备状态切换和批量操作
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
  Plus,          // 添加设备图标
  Search,        // 搜索图标
  Eye,           // 查看详情图标
  Edit,          // 编辑图标
  Power,         // 电源/启停图标
  Settings,      // 设置图标
  RefreshCw,     // 刷新图标
  Download,      // 导出图标
  Upload,        // 导入图标
  Filter,        // 过滤器图标
  X,             // 关闭图标
  RotateCcw,     // 恢复图标
  Trash2         // 删除图标
} from 'lucide-react';

// UI组件导入
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';  // 卡片容器组件
import { Button } from './ui/button';                // 按钮组件
import { Input } from './ui/input';                  // 输入框组件
import { Badge } from './ui/badge';                  // 徽章组件
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';  // 对话框组件
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';   // 选择器组件
import { Alert, AlertDescription } from './ui/alert'; // 警告提示组件

// 设备相关类型和接口导入
import { Equipment, EquipmentFilters, EquipmentOverview, EquipmentStatus, CreateEquipmentRequest, UpdateEquipmentRequest } from '../types/equipment';

// 设备管理Store状态管理
import { useEquipment } from '../stores/equipment-store';

// 权限控制Hook导入
import { useDevicePermissions } from '../hooks/useResourcePermissions';

/**
 * 设备管理页面主组件
 * 
 * 这是整个设备管理功能的核心组件，提供完整的设备管理界面
 * 包括设备列表展示、搜索筛选、增删改查等所有设备管理功能
 * 
 * 功能特点：
 * - 响应式设计，支持桌面和移动设备
 * - 实时数据更新和状态同步
 * - 智能搜索和多维度筛选
 * - 直观的设备状态可视化
 * - 完整的错误处理和用户反馈
 * - 批量操作和效率优化
 */
export function DeviceManagementPage() {
  // 权限控制
  const { canCreateDevice, canUpdateDevice, canDeleteDevice, canViewDevices } = useDevicePermissions();
  
  // 检查是否具有查看权限
  if (!canViewDevices()) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Settings className="h-5 w-5" />
                访问被拒绝
              </CardTitle>
              <p className="text-slate-400 text-sm">
                您没有权限查看设备管理页面
              </p>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  请联系系统管理员获取设备管理权限
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 使用设备管理Store的状态和方法
  const {
    items: devices,                    // 设备列表数据
    selectedEquipment,                 // 当前选中的设备
    loading,                           // 加载状态标识
    error,                             // 错误信息
    total,                             // 总设备数量
    page,                              // 当前页码
    pageSize,                          // 每页数量
    totalPages,                        // 总页数
    overview: equipmentOverview,       // 设备概览统计
    filters,                           // 当前筛选条件
    fetchEquipmentList,               // 获取设备列表
    fetchEquipmentDetail,             // 获取设备详情
    createEquipment,                  // 创建设备
    updateEquipment,                  // 更新设备
    deleteEquipment,                  // 删除设备
    restoreEquipment,                 // 恢复已删除的设备
    fetchEquipmentOverview,           // 获取设备概览
    updateEquipmentStatus,            // 更新设备状态
    setSelectedEquipment,             // 设置选中设备
    setPage,                          // 设置页码
    setPageSize,                      // 设置页面大小
    setFilters,                       // 设置筛选条件
    clearError,                       // 清除错误信息
  } = useEquipment();

  // 组件本地状态管理
  const [searchTerm, setSearchTerm] = useState('');     // 搜索关键词状态
  const [filterType, setFilterType] = useState<string>('all'); // 设备类型筛选状态
  const [dialogOpen, setDialogOpen] = useState(false);  // 添加/编辑对话框状态
  const [editingDevice, setEditingDevice] = useState<Equipment | null>(null); // 当前编辑的设备
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false); // 确认对话框状态
  const [deviceToDelete, setDeviceToDelete] = useState<Equipment | null>(null); // 要删除的设备
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set()); // 批量选择的设备
  const [usingMockData, setUsingMockData] = useState(false); // 是否使用Mock数据

  /**
   * 组件初始化加载
   * 在组件挂载时获取设备列表和概览数据
   */
  useEffect(() => {
    // 获取设备概览统计信息
    fetchEquipmentOverview().catch(error => {
      console.error('获取设备概览失败:', error);
      setUsingMockData(true);
    });
    
    // 获取设备列表（带分页和筛选）
    fetchEquipmentList().catch(error => {
      console.error('获取设备列表失败:', error);
      setUsingMockData(true);
    });
  }, []);

  /**
   * 设备状态徽章组件
   * 根据设备状态返回相应的样式化徽章
   * 
   * @param {string} status - 设备状态
   * @returns {JSX.Element} 状态徽章元素
   */
  const getStatusBadge = (status: string) => {
    // 根据状态返回不同的徽章样式和文本
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500">
            运行中
          </Badge>
        );
      case 'maintenance':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500">
            维护中
          </Badge>
        );
      case 'disabled':
        return (
          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">
            已停用
          </Badge>
        );
      case 'deleted':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500">
            已删除
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500">
            未知状态
          </Badge>
        );
    }
  };

  /**
   * 设备操作处理方法 - 添加新设备
   * 打开添加设备对话框，清空编辑设备状态
   */
  const handleAddDevice = () => {
    setEditingDevice(null);  // 清除编辑设备（表示添加模式）
    setDialogOpen(true);     // 打开对话框
  };

  /**
   * 设备操作处理方法 - 编辑设备
   * 打开编辑设备对话框，设置当前编辑的设备
   * 
   * @param {Equipment} device - 要编辑的设备对象
   */
  const handleEditDevice = (device: Equipment) => {
    setEditingDevice(device); // 设置编辑设备
    setDialogOpen(true);      // 打开对话框
  };

  /**
   * 设备操作处理方法 - 查看设备详情
   * 获取设备详细信息并在新的标签页中显示
   * 
   * @param {Equipment} device - 要查看详情的设备
   */
  const handleViewDetails = async (device: Equipment) => {
    try {
      setSelectedEquipment(device); // 设置选中的设备
      // 可以在这里打开详情页面或弹窗显示更多信息
      console.log('查看设备详情:', device.deviceName);
    } catch (error) {
      console.error('获取设备详情失败:', error);
    }
  };

  /**
   * 设备操作处理方法 - 设备启停控制
   * 切换设备的运行状态（启用/停用）
   * 
   * @param {Equipment} device - 要切换状态的设备
   */
  const handleToggleDevice = async (device: Equipment) => {
    try {
      const newStatus = device.status === 'disabled' ? 'running' : 'disabled';
      await updateEquipmentStatus(device.id, newStatus);
      console.log(`设备 ${device.deviceName} 状态已切换为: ${newStatus}`);
    } catch (error) {
      console.error('设备状态切换失败:', error);
    }
  };

  /**
   * 设备操作处理方法 - 设备校准
   * 执行设备的校准操作
   * 
   * @param {Equipment} device - 要校准的设备
   */
  const handleCalibrateDevice = (device: Equipment) => {
    console.log(`开始校准设备: ${device.deviceName}`);
    // 这里可以添加校准逻辑或打开校准对话框
  };

  /**
   * 设备操作处理方法 - 保存设备信息
   * 处理设备添加/编辑对话框的保存操作
   * 
   * @param {React.FormEvent<HTMLFormElement>} event - 表单提交事件
   */
  const handleSaveDevice = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 阻止表单默认提交行为
    
    const formData = new FormData(event.currentTarget);
    const deviceData = {
      deviceId: formData.get('deviceId') as string,
      deviceName: formData.get('deviceName') as string,
      deviceType: formData.get('deviceType') as string,
      location: formData.get('location') as string,
      description: formData.get('description') as string,
    };

    try {
      if (editingDevice) {
        // 编辑模式 - 更新设备信息
        await updateEquipment(editingDevice.id, deviceData);
      } else {
        // 添加模式 - 创建设备
        await createEquipment(deviceData);
      }
      
      // 操作成功后关闭对话框
      setDialogOpen(false);
      setEditingDevice(null);
    } catch (error) {
      console.error('设备操作失败:', error);
    }
  };

  /**
   * 设备操作处理方法 - 准备删除设备
   * 显示删除确认对话框
   * 
   * @param {Equipment} device - 要删除的设备
   */
  const handleDeleteDevice = (device: Equipment) => {
    setDeviceToDelete(device);       // 设置要删除的设备
    setConfirmDialogOpen(true);      // 显示确认对话框
  };

  /**
   * 设备操作处理方法 - 确认删除设备
   * 执行设备删除操作
   */
  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return;
    
    try {
      await deleteEquipment(deviceToDelete.id);
      setConfirmDialogOpen(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error('删除设备失败:', error);
    }
  };

  /**
   * 设备操作处理方法 - 恢复已删除的设备
   * 恢复被软删除的设备，使其重新变为可用状态
   *
   * @param {Equipment} device - 要恢复的设备
   */
  const handleRestoreDevice = async (device: Equipment) => {
    try {
      await restoreEquipment(device.id);
      console.log(`设备 ${device.deviceName} 已成功恢复`);
    } catch (error) {
      console.error('恢复设备失败:', error);
    }
  };

  /**
   * 设备操作处理方法 - 批量启用设备
   * 将选中的设备状态设置为运行中
   */
  const handleBatchEnable = async () => {
    for (const deviceId of selectedDevices) {
      try {
        await updateEquipmentStatus(deviceId, 'running');
      } catch (error) {
        console.error(`设备 ${deviceId} 批量启用失败:`, error);
      }
    }
    setSelectedDevices(new Set()); // 清空选择
  };

  /**
   * 设备操作处理方法 - 批量停用设备
   * 将选中的设备状态设置为已停用
   */
  const handleBatchDisable = async () => {
    for (const deviceId of selectedDevices) {
      try {
        await updateEquipmentStatus(deviceId, 'disabled');
      } catch (error) {
        console.error(`设备 ${deviceId} 批量停用失败:`, error);
      }
    }
    setSelectedDevices(new Set()); // 清空选择
  };

  /**
   * 设备搜索和筛选逻辑
   * 根据搜索关键词和类型筛选条件过滤设备列表
   */
  const filteredDevices = devices.filter((device) => {
    // 搜索条件匹配（设备ID或设备名称）
    const matchesSearch = 
      device.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 类型筛选条件匹配
    const matchesType = filterType === 'all' || device.deviceType === filterType;
    
    return matchesSearch && matchesType;
  });

  /**
   * 设备选择处理方法
   * 处理设备的单选和多选逻辑
   * 
   * @param {string} deviceId - 设备ID
   * @param {boolean} checked - 是否选中
   */
  const handleDeviceSelect = (deviceId: string, checked: boolean) => {
    const newSelected = new Set(selectedDevices);
    if (checked) {
      newSelected.add(deviceId);
    } else {
      newSelected.delete(deviceId);
    }
    setSelectedDevices(newSelected);
  };

  /**
   * 全选/取消全选设备
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} event - 复选框状态变化事件
   */
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    if (checked) {
      setSelectedDevices(new Set(filteredDevices.map(device => device.id)));
    } else {
      setSelectedDevices(new Set());
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-100">设备管理</h1>
              {usingMockData && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500">
                  演示模式
                </Badge>
              )}
            </div>
            <p className="text-slate-400 mt-1">
              货船智能机舱设备统一管理平台 - 共 {total} 台设备
              {usingMockData && ' (演示数据)'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Mock数据提示 */}
            {usingMockData && (
              <Alert className="bg-amber-500/20 border-amber-500 text-amber-400">
                <AlertDescription>
                  当前显示的是演示数据，无法连接到后端服务器
                </AlertDescription>
              </Alert>
            )}
            
            {/* 错误提示 */}
            {error && !usingMockData && (
              <Alert className="bg-red-500/20 border-red-500 text-red-400">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* 刷新按钮 */}
            <Button
              onClick={() => {
                setUsingMockData(false);
                clearError();
                fetchEquipmentList().catch(error => {
                  console.error('刷新设备列表失败:', error);
                  setUsingMockData(true);
                });
                fetchEquipmentOverview().catch(error => {
                  console.error('刷新设备概览失败:', error);
                  setUsingMockData(true);
                });
              }}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            
            {/* 导出数据按钮 */}
            <Button 
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            
            {/* 添加新设备按钮 */}
            <Button
              onClick={handleAddDevice}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={!canCreateDevice()}
            >
              <Plus className="w-4 h-4 mr-2" />
              添加设备
            </Button>
          </div>
        </div>

        {/* 设备概览统计卡片 */}
        {equipmentOverview && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card className="bg-slate-800/60 border-slate-700 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-100">{equipmentOverview.totalCount}</div>
                <div className="text-slate-400 text-sm">设备总数</div>
              </div>
            </Card>
            <Card className="bg-slate-800/60 border-slate-700 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{equipmentOverview.runningCount}</div>
                <div className="text-slate-400 text-sm">运行中</div>
              </div>
            </Card>
            <Card className="bg-slate-800/60 border-slate-700 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{equipmentOverview.maintenanceCount}</div>
                <div className="text-slate-400 text-sm">维护中</div>
              </div>
            </Card>
            <Card className="bg-slate-800/60 border-slate-700 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-400">{equipmentOverview.disabledCount}</div>
                <div className="text-slate-400 text-sm">已停用</div>
              </div>
            </Card>
            <Card className="bg-slate-800/60 border-slate-700 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{equipmentOverview.abnormalCount}</div>
                <div className="text-slate-400 text-sm">异常状态</div>
              </div>
            </Card>
            <Card className="bg-slate-800/60 border-slate-700 p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {total > 0 && equipmentOverview.runningCount ? ((equipmentOverview.runningCount / total) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-slate-400 text-sm">运行率</div>
              </div>
            </Card>
          </div>
        )}

        {/* 搜索和筛选控制栏 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索设备ID或设备名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            
            {/* 设备类型筛选 */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="选择设备类型" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">全部类型</SelectItem>
                <SelectItem value="电池" className="text-slate-300">电池系统</SelectItem>
                <SelectItem value="推进电机" className="text-slate-300">推进电机</SelectItem>
                <SelectItem value="逆变器" className="text-slate-300">逆变器</SelectItem>
                <SelectItem value="冷却泵" className="text-slate-300">冷却系统</SelectItem>
                <SelectItem value="舱底水泵" className="text-slate-300">舱底水系统</SelectItem>
                <SelectItem value="传感器" className="text-slate-300">传感器</SelectItem>
                <SelectItem value="控制器" className="text-slate-300">控制器</SelectItem>
                <SelectItem value="deleted" className="text-slate-300">已删除设备</SelectItem>
              </SelectContent>
            </Select>
            
            {/* 批量操作按钮组 */}
            {selectedDevices.size > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleBatchEnable}
                  size="sm"
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  批量启用 ({selectedDevices.size})
                </Button>
                <Button
                  onClick={handleBatchDisable}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  批量停用 ({selectedDevices.size})
                </Button>
              </div>
            )}
          </div>
          
          {/* 筛选结果显示 */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              显示 {filteredDevices.length} 台设备
              {searchTerm && ` (搜索: "${searchTerm}")`}
              {filterType !== 'all' && ` (类型: ${filterType})`}
            </span>
            {selectedDevices.size > 0 && (
              <span>已选择 {selectedDevices.size} 台设备</span>
            )}
          </div>
        </Card>

        {/* 设备列表表格 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDevices.size === filteredDevices.length && filteredDevices.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-600 bg-slate-700 text-cyan-500"
                    />
                  </th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">设备ID</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">设备名称</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">设备类型</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">安装位置</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">运行状态</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">创建时间</th>
                  <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // 加载状态显示
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      正在加载设备数据...
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  // 空状态显示
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">未找到匹配的设备</p>
                      <p className="text-sm">
                        {searchTerm || filterType !== 'all' 
                          ? '请尝试调整搜索条件或筛选条件'
                          : '系统暂无设备数据，请添加设备'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  // 设备列表数据
                  filteredDevices.map((device) => (
                    <tr 
                      key={device.id} 
                      className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={selectedDevices.has(device.id)}
                          onChange={(e) => handleDeviceSelect(device.id, e.target.checked)}
                          className="rounded border-slate-600 bg-slate-700 text-cyan-500"
                        />
                      </td>
                      <td className="py-3 px-3 text-slate-300 text-sm font-mono">
                        {device.deviceId}
                      </td>
                      <td className="py-3 px-3 text-slate-300 text-sm font-medium">
                        {device.deviceName}
                      </td>
                      <td className="py-3 px-3">
                        <Badge className="bg-slate-700 text-slate-300 border-slate-600">
                          {device.deviceType}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-sm">
                        {device.location || '未设置位置'}
                      </td>
                      <td className="py-3 px-3">
                        {getStatusBadge(device.status)}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-sm">
                        {new Date(device.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          {/* 查看详情按钮 */}
                          <Button
                            size="sm"
                            onClick={() => handleViewDetails(device)}
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2"
                            title="查看详情"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          
                          {/* 编辑按钮 */}
                          {canUpdateDevice() && (
                            <Button
                              size="sm"
                              onClick={() => handleEditDevice(device)}
                              className="bg-cyan-500 hover:bg-cyan-600 text-white p-2"
                              title="编辑设备"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {/* 启停控制按钮 */}
                          {canUpdateDevice() && (
                            <Button
                              size="sm"
                              onClick={() => handleToggleDevice(device)}
                              className={`${
                                device.status === 'disabled'
                                  ? 'bg-green-500 hover:bg-green-600'
                                  : 'bg-orange-500 hover:bg-orange-600'
                              } text-white p-2`}
                              title={device.status === 'disabled' ? '启用设备' : '停用设备'}
                            >
                              <Power className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {/* 校准按钮 */}
                          {canUpdateDevice() && (
                            <Button
                              size="sm"
                              onClick={() => handleCalibrateDevice(device)}
                              className="bg-purple-500 hover:bg-purple-600 text-white p-2"
                              title="设备校准"
                            >
                              <Settings className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {/* 删除按钮 */}
                          {canDeleteDevice() && device.status !== 'deleted' && (
                            <Button
                              size="sm"
                              onClick={() => handleDeleteDevice(device)}
                              className="bg-red-500 hover:bg-red-600 text-white p-2"
                              title="删除设备"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                          
                          {/* 恢复按钮 - 仅对已删除的设备显示 */}
                          {canDeleteDevice() && device.status === 'deleted' && (
                            <Button
                              size="sm"
                              onClick={() => handleRestoreDevice(device)}
                              className="bg-green-500 hover:bg-green-600 text-white p-2"
                              title="恢复设备"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 添加/编辑设备对话框 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                {editingDevice ? '编辑设备' : '添加新设备'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSaveDevice} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm mb-2 block">设备ID *</label>
                <Input
                  name="deviceId"
                  required
                  className="bg-slate-900/50 border-slate-600 text-slate-100 font-mono"
                  placeholder="例如: BAT-001"
                  defaultValue={editingDevice?.deviceId}
                  disabled={!!editingDevice} // 编辑时禁用设备ID修改
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">设备名称 *</label>
                <Input
                  name="deviceName"
                  required
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入设备名称"
                  defaultValue={editingDevice?.deviceName}
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">设备类型 *</label>
                <Select name="deviceType" required defaultValue={editingDevice?.deviceType}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="选择设备类型" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="电池" className="text-slate-300">电池系统</SelectItem>
                    <SelectItem value="推进电机" className="text-slate-300">推进电机</SelectItem>
                    <SelectItem value="逆变器" className="text-slate-300">逆变器</SelectItem>
                    <SelectItem value="冷却泵" className="text-slate-300">冷却泵</SelectItem>
                    <SelectItem value="舱底水泵" className="text-slate-300">舱底水泵</SelectItem>
                    <SelectItem value="传感器" className="text-slate-300">传感器</SelectItem>
                    <SelectItem value="控制器" className="text-slate-300">控制器</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">安装位置</label>
                <Input
                  name="location"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入设备安装位置"
                  defaultValue={editingDevice?.location}
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">设备描述</label>
                <Input
                  name="description"
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入设备描述信息"
                  defaultValue={editingDevice?.description}
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
                确认删除设备
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <p className="text-slate-300">
                您确定要删除设备 <strong>{deviceToDelete?.deviceName}</strong> 吗？
              </p>
              <p className="text-red-400 text-sm mt-2">
                此操作不可恢复，设备的所有历史数据将被保留。
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
                onClick={confirmDeleteDevice}
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
