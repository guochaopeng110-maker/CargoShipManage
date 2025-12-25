/**
 * 货船智能机舱管理系统 - 设备管理页面组件（重构版）
 *
 * 基于标准CRUD模板重构，显著减少代码量并提升可维护性
 *
 * 功能特性：
 * - 设备列表展示（分页、排序、搜索）
 * - 设备CRUD操作（创建、编辑、删除）
 * - 设备状态管理（启用、停用、恢复）
 * - 权限控制集成
 * - 设备概览统计
 *
 * @version 3.0.0 - 基于CRUD模板重构
 */

import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Power, RotateCcw, Settings, Edit, Trash2 } from 'lucide-react';
import { CRUDPageTemplate } from './crud/CRUDPageTemplate';
import { CRUDFormModal } from './crud/CRUDFormModal';
import { ColumnDef, FormFieldConfig } from '../types/crud';
// 从设备存储导入后端类型
import { Equipment, CreateEquipmentDto, UpdateEquipmentDto, useEquipmentStore } from '../stores/equipment-store';
import { usePermissions } from '../hooks/usePermissions';
import { Button } from './ui/button';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../config/permissions';

/**
 * 设备管理页面主组件
 */
export function DeviceManagementPage() {
  // 权限控制
  const { hasPermission } = usePermissions();

  // Store状态和方法
  console.log('DeviceManagementPage store调用');
  const {
    items: devices,
    loading,
    error,
    total,
    page,
    pageSize,
    fetchEquipmentList,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    restoreEquipment,
    updateEquipmentStatus,
    setPage,
    setPageSize,
    setFilters,
    ensureItemsLoaded,
  } = useEquipmentStore();

  // 本地状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Equipment | null>(null);

  // 移除初始化加载数据，让CRUDPageTemplate完全负责首次请求
  // useEffect(() => {
  //   console.log('DeviceManagementPage useEffect 触发');
  //   fetchEquipmentList();
  // }, [fetchEquipmentList]); // 移除依赖，避免重复调用

  // 权限检查
  if (!hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.READ)) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <Card className="max-w-md mx-auto mt-20 p-6 bg-slate-800 border-slate-700">
          <Alert className="bg-red-900/20 border-red-600/50">
            <Settings className="h-4 w-4" />
            <AlertDescription>您没有权限查看设备管理页面，请联系系统管理员</AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  // ===== 表格列配置 =====
  const columns: ColumnDef<Equipment>[] = [
    {
      key: 'deviceId',
      title: '设备ID',
      width: '140px',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'deviceName',
      title: '设备名称',
      width: '180px',
      sortable: true,
    },
    {
      key: 'deviceType',
      title: '设备类型',
      width: '120px',
      render: (value) => (
        <Badge className="bg-slate-700 text-slate-300 border-slate-600">{value}</Badge>
      ),
    },
    {
      key: 'location',
      title: '安装位置',
      width: '150px',
      render: (value) => value || <span className="text-slate-500">未设置</span>,
    },
    {
      key: 'status',
      title: '运行状态',
      width: '100px',
      render: (value) => getStatusBadge(value as Equipment.status),
    },
    {
      key: 'createdAt',
      title: '创建时间',
      width: '140px',
      render: (value) => new Date(value).toLocaleDateString('zh-CN'),
    },
  ];

  // ===== 表单字段配置 =====
  const formFields: FormFieldConfig[] = [
    {
      name: 'deviceId',
      label: '设备ID',
      type: 'text',
      required: true,
      placeholder: '例如: BAT-001',
      disabled: !!editingDevice, // 编辑时禁用
      helperText: '设备的唯一标识符',
    },
    {
      name: 'deviceName',
      label: '设备名称',
      type: 'text',
      required: true,
      placeholder: '输入设备名称',
    },
    {
      name: 'deviceType',
      label: '设备类型',
      type: 'select',
      required: true,
      options: [
        { label: '电池装置', value: '电池装置' },
        { label: '推进系统', value: '推进系统' },
        { label: '逆变器系统', value: '逆变器系统' },
        { label: '配电系统', value: '配电系统' },
        { label: '辅助系统', value: '辅助系统' },
      ],
    },
    {
      name: 'location',
      label: '安装位置',
      type: 'text',
      placeholder: '输入设备安装位置',
    },
    {
      name: 'description',
      label: '设备描述',
      type: 'textarea',
      placeholder: '输入设备描述信息（可选）',
      rows: 3,
    },
  ];

  // ===== 状态徽章渲染 =====
  const getStatusBadge = (status: Equipment.status) => {
    const statusConfig = {
      [Equipment.status.NORMAL]: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        border: 'border-green-500',
        label: '正常'
      },
      [Equipment.status.WARNING]: {
        bg: 'bg-yellow-500/20',
        text: 'text-yellow-400',
        border: 'border-yellow-500',
        label: '告警'
      },
      [Equipment.status.FAULT]: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        border: 'border-red-500',
        label: '故障'
      },
      [Equipment.status.OFFLINE]: {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500',
        label: '离线'
      },
    };
    const config = statusConfig[status];
    return <Badge className={`${config.bg} ${config.text} ${config.border}`}>{config.label}</Badge>;
  };

  // ===== 事件处理函数 =====

  /** 创建设备 */
  const handleCreate = () => {
    setEditingDevice(null);
    setDialogOpen(true);
  };

  /** 编辑设备 */
  const handleEdit = (device: Equipment) => {
    setEditingDevice(device);
    setDialogOpen(true);
  };

  /** 删除设备 */
  const handleDelete = async (device: Equipment) => {
    if (confirm(`确定要删除设备 ${device.deviceName} 吗？此操作不可恢复。`)) {
      await deleteEquipment(device.id);
    }
  };

  /** 表单提交 */
  const handleFormSubmit = async (data: any) => {
    if (editingDevice) {
      await updateEquipment(editingDevice.id, data as UpdateEquipmentDto);
    } else {
      await createEquipment(data as CreateEquipmentDto);
    }
    setDialogOpen(false);
    setEditingDevice(null);
  };

  /** 搜索处理 */
  const handleSearch = (searchTerm: string) => {
    // 使用智能缓存版获取，如果搜索词为空且已有数据，则跳过请求
    if (!searchTerm) {
      ensureItemsLoaded({ page: 1, pageSize: 20 });
    } else {
      // 如果有实际搜索词，仍然执行正常获取以保证结果准确
      fetchEquipmentList({ filters: { searchTerm } });
    }
  };

  /** 切换设备状态 */
  const handleToggleStatus = async (device: Equipment) => {
    // 从store中获取最新的设备状态,而不是使用传入的device对象
    const currentDevice = devices.find(item => item.id === device.id);
    if (!currentDevice) return;

    const newStatus = currentDevice.status === Equipment.status.OFFLINE
      ? Equipment.status.NORMAL
      : Equipment.status.OFFLINE;
    await updateEquipmentStatus(device.id, newStatus);
  };


  /** 恢复已删除设备 */
  const handleRestore = async (device: Equipment) => {
    await restoreEquipment(device.id);
  };

  // ===== 自定义操作按钮 =====
  const renderActionButtons = (device: Equipment) => {
    // 判断设备是否已删除（通过 deletedAt 字段）
    const isDeleted = device.deletedAt != null;

    return (
      <div className="flex items-center justify-end gap-2">
        {/* 编辑按钮 */}
        {hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.UPDATE) && !isDeleted && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(device)}
            className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/20"
            title="编辑设备"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {/* 启停控制按钮 */}
        {hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.UPDATE) && !isDeleted && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleStatus(device)}
            className={`h-8 px-2 ${device.status === Equipment.status.OFFLINE
              ? 'text-green-400 hover:text-green-300 hover:bg-green-600/20'
              : 'text-orange-400 hover:text-orange-300 hover:bg-orange-600/20'
              }`}
            title={device.status === Equipment.status.OFFLINE ? '启用设备' : '停用设备'}
          >
            <Power className="h-4 w-4" />
          </Button>
        )}

        {/* 恢复按钮 - 仅对已删除设备显示 */}
        {hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.DELETE) && isDeleted && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleRestore(device)}
            className="h-8 px-2 text-green-400 hover:text-green-300 hover:bg-green-600/20"
            title="恢复设备"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}

        {/* 删除按钮 */}
        {hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.DELETE) && !isDeleted && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(device)}
            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/20"
            title="删除设备"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 调试日志：传入CRUDPageTemplate的数据 */}
      {console.log('DeviceManagementPage 渲染 - 设备数:', devices.length, '总数:', total)}

      {/* CRUD页面模板 */}
      <CRUDPageTemplate
        title="设备管理"
        description={`货船智能机舱设备统一管理平台 - 共 ${total} 台设备`}
        items={devices}
        total={total}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        columns={columns}
        rowKey="id"
        searchable
        searchPlaceholder="搜索设备ID或设备名称..."
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={handleSearch}
        onCreateClick={hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.CREATE) ? handleCreate : undefined}
        onEditClick={hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.UPDATE) ? handleEdit : undefined}
        onDeleteClick={hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.DELETE) ? handleDelete : undefined}
        canCreate={hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.CREATE)}
        canEdit={hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.UPDATE)}
        canDelete={hasPermission(PERMISSION_RESOURCES.DEVICE, PERMISSION_ACTIONS.DELETE)}
        renderActionButtons={renderActionButtons}
      />

      {/* 表单模态框 */}
      <CRUDFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingDevice ? '编辑设备' : '添加新设备'}
        mode={editingDevice ? 'edit' : 'create'}
        fields={formFields}
        defaultValues={editingDevice || undefined}
        onSubmit={handleFormSubmit}
        loading={loading}
      />
    </>
  );
}
