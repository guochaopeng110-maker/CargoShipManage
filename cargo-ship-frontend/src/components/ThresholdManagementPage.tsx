/**
 * 货船智能机舱管理系统 - 阈值管理页面
 *
 * 基于标准CRUD模板创建
 *
 * 功能特性：
 * - 阈值列表展示（分页、排序、搜索）
 * - 阈值CRUD操作（创建、编辑、删除）
 * - 阈值启用/停用管理
 * - 设备关联和指标类型管理
 * - 告警严重程度配置
 *
 * @version 1.0.0 - 基于CRUD模板创建
 */

import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Settings, Power, TestTube, Edit, Trash2, Shield } from 'lucide-react';
import { CRUDPageTemplate } from './crud/CRUDPageTemplate';
import { CRUDFormModal } from './crud/CRUDFormModal';
import { ColumnDef, FormFieldConfig } from '../types/crud';
import { useThresholdStore } from '../stores/threshold-store';
import type { CreateThresholdConfigRequest, UpdateThresholdConfigRequest } from '../stores/threshold-store';
import { ThresholdConfig } from '@/services/api';
import { Button } from './ui/button';
import { useEquipmentStore } from '../stores/equipment-store';
import { FilterConfig } from '../types/crud';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS } from '../config/permissions';
import { AlertCircle as AlertCircleIcon } from 'lucide-react';

// 类型别名
const AlertSeverity = ThresholdConfig.severity;
type AlertSeverity = ThresholdConfig.severity;

/**
 * 阈值管理页面主组件
 */
export function ThresholdManagementPage() {
  // 权限控制
  const { hasPermission } = usePermissions();
  const canReadThreshold = hasPermission(PERMISSION_RESOURCES.SYSTEM_CONFIG, PERMISSION_ACTIONS.READ);
  const canUpdateThreshold = hasPermission(PERMISSION_RESOURCES.SYSTEM_CONFIG, PERMISSION_ACTIONS.UPDATE);
  // Store状态和方法
  const {
    thresholds,
    loading,
    error,
    total,
    page,
    pageSize,
    fetchThresholds,
    createThreshold,
    updateThreshold,
    deleteThreshold,
    testThreshold,
    setPage,
    setPageSize,
  } = useThresholdStore();

  const {
    items: equipments,
    ensureItemsLoaded
  } = useEquipmentStore();

  // 本地状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<ThresholdConfig | null>(null);

  // 初始化加载数据 - 移除主动调用，由 CRUDSearchBar 的初始 debounce 触发第一次 fetchThresholds
  useEffect(() => {
    // 页面挂载时不主动加载，节省请求
  }, []);

  // ===== 表格列配置 =====
  const columns: ColumnDef<ThresholdConfig>[] = [
    {
      key: 'equipmentId',
      title: '设备ID',
      width: '140px',
      sortable: true,
      render: (value, row) => {
        // 1. 优先使用后端可能直接返回的关联对象中的编号
        const equipmentObj = (row as any).equipment;
        if (equipmentObj?.deviceId) return <span className="font-mono text-sm">{equipmentObj.deviceId}</span>;

        // 2. 否则从本地已加载的设备列表中查找匹配的编号
        const matched = equipments.find(e => e.id === value);
        if (matched) return <span className="font-mono text-sm">{matched.deviceId}</span>;

        // 3. 最后退回到显示原始内容 (UUID)
        return <span className="font-mono text-sm text-slate-400">{String(value).slice(0, 8)}...</span>;
      },
    },
    {
      key: 'monitoringPoint',
      title: '监测点',
      width: '160px',
      render: (value) => value || <span className="text-slate-500">-</span>,
    },
    {
      key: 'metricType',
      title: '监测指标',
      width: '120px',
      render: (value) => (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">{value}</Badge>
      ),
    },
    {
      key: 'upperLimit',
      title: '上限值',
      width: '100px',
      render: (value) => {
        if (value === undefined || value === null) return <span className="text-slate-500">-</span>;
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? <span className="text-slate-500">-</span> : numValue.toFixed(2);
      },
    },
    {
      key: 'lowerLimit',
      title: '下限值',
      width: '100px',
      render: (value) => {
        if (value === undefined || value === null) return <span className="text-slate-500">-</span>;
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? <span className="text-slate-500">-</span> : numValue.toFixed(2);
      },
    },
    {
      key: 'duration',
      title: '持续时间',
      width: '110px',
      render: (value) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return `${(numValue / 1000).toFixed(0)}秒`;
      },
    },
    {
      key: 'severity',
      title: '告警级别',
      width: '100px',
      render: (value) => getSeverityBadge(value as AlertSeverity),
    },
    {
      key: 'ruleStatus',
      title: '状态',
      width: '90px',
      render: (value) => getStatusBadge(value as ThresholdConfig.ruleStatus),
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
      name: 'equipmentId',
      label: '选择设备',
      type: 'select',
      required: true,
      options: equipments.map(e => ({
        label: `${e.deviceName} (${e.deviceId})`,
        value: e.id,
      })),
      placeholder: '请选择关联设备',
      helperText: '关联的设备系统标识',
    },
    {
      name: 'monitoringPoint',
      label: '监测点名称',
      type: 'text',
      required: true,
      placeholder: '例如：总电压、最高电池温度',
    },
    {
      name: 'metricType',
      label: '监测指标',
      type: 'select',
      required: true,
      options: [
        { label: '振动 (Vibration)', value: ThresholdConfig.metricType.VIBRATION },
        { label: '温度 (Temperature)', value: ThresholdConfig.metricType.TEMPERATURE },
        { label: '压力 (Pressure)', value: ThresholdConfig.metricType.PRESSURE },
        { label: '湿度 (Humidity)', value: ThresholdConfig.metricType.HUMIDITY },
        { label: '转速 (Speed)', value: ThresholdConfig.metricType.SPEED },
        { label: '电流 (Current)', value: ThresholdConfig.metricType.CURRENT },
        { label: '电压 (Voltage)', value: ThresholdConfig.metricType.VOLTAGE },
        { label: '功率 (Power)', value: ThresholdConfig.metricType.POWER },
        { label: '频率 (Frequency)', value: ThresholdConfig.metricType.FREQUENCY },
        { label: '液位 (Level)', value: ThresholdConfig.metricType.LEVEL },
        { label: '阻值 (Resistance)', value: ThresholdConfig.metricType.RESISTANCE },
        { label: '开关 (Switch)', value: ThresholdConfig.metricType.SWITCH },
      ],
    },
    {
      name: 'upperLimit',
      label: '上限值',
      type: 'number',
      placeholder: '输入上限阈值（可选）',
      helperText: '超过此值将触发告警',
    },
    {
      name: 'lowerLimit',
      label: '下限值',
      type: 'number',
      placeholder: '输入下限阈值（可选）',
      helperText: '低于此值将触发告警',
    },
    {
      name: 'duration',
      label: '持续时间（秒）',
      type: 'number',
      required: true,
      placeholder: '输入持续时间',
      helperText: '超过阈值持续多长时间才触发告警',
      min: 0,
    },
    {
      name: 'severity',
      label: '告警级别',
      type: 'select',
      required: true,
      options: [
        { label: '低', value: 'low' },
        { label: '中', value: 'medium' },
        { label: '高', value: 'high' },
        { label: '紧急', value: 'critical' },
      ],
    },
    {
      name: 'ruleStatus',
      label: '启用状态',
      type: 'select',
      options: [
        { label: '启用', value: 'enabled' },
        { label: '停用', value: 'disabled' },
      ],
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      placeholder: '输入阈值配置描述（可选）',
      rows: 3,
    },
  ];

  // ===== 告警级别徽章渲染 =====
  const getSeverityBadge = (severity: AlertSeverity) => {
    const severityConfig: Record<AlertSeverity, { bg: string; text: string; border: string; label: string }> = {
      [AlertSeverity.LOW]: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500', label: '低' },
      [AlertSeverity.MEDIUM]: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500', label: '中' },
      [AlertSeverity.HIGH]: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500', label: '高' },
      [AlertSeverity.CRITICAL]: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500', label: '紧急' },
    };
    const config = severityConfig[severity] || severityConfig[AlertSeverity.LOW];
    return <Badge className={`${config.bg} ${config.text} ${config.border}`}>{config.label}</Badge>;
  };

  // ===== 状态徽章渲染 =====
  const getStatusBadge = (ruleStatus: ThresholdConfig.ruleStatus) => {
    return ruleStatus === ThresholdConfig.ruleStatus.ENABLED ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500">启用</Badge>
    ) : (
      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">停用</Badge>
    );
  };

  // ===== 事件处理函数 =====

  /** 创建阈值 */
  const handleCreate = () => {
    setEditingThreshold(null);
    setDialogOpen(true);
    // 按需确保设备列表已加载
    ensureItemsLoaded({ page: 1, pageSize: 100 });
  };

  /** 编辑阈值 */
  const handleEdit = (threshold: ThresholdConfig) => {
    setEditingThreshold(threshold);
    setDialogOpen(true);
    // 按需确保设备列表已加载
    ensureItemsLoaded({ page: 1, pageSize: 100 });
  };

  /** 删除阈值 */
  const handleDelete = async (threshold: ThresholdConfig) => {
    // 获取设备名称显示（从 equipmentId 或 monitoringPoint 提取）
    const displayName = threshold.monitoringPoint || threshold.equipmentId;
    if (confirm(`确定要删除阈值配置 ${displayName} - ${threshold.metricType} 吗？`)) {
      await deleteThreshold(threshold.id);
    }
  };

  /** 表单提交 */
  const handleFormSubmit = async (data: any) => {
    try {
      // 转换duration从秒到毫秒
      const formData = {
        ...data,
        duration: data.duration * 1000,
      };

      if (editingThreshold) {
        await updateThreshold(editingThreshold.id, formData as UpdateThresholdConfigRequest);
      } else {
        await createThreshold(formData as CreateThresholdConfigRequest);
      }

      setDialogOpen(false);
      setEditingThreshold(null);
    } catch (error) {
      console.error('阈值操作失败:', error);
    }
  };

  /** 切换阈值启用状态 */
  const handleToggleStatus = async (threshold: ThresholdConfig) => {
    const newStatus = threshold.ruleStatus === ThresholdConfig.ruleStatus.ENABLED
      ? ThresholdConfig.ruleStatus.DISABLED
      : ThresholdConfig.ruleStatus.ENABLED;
    await updateThreshold(threshold.id, { ruleStatus: newStatus });
  };

  /** 测试阈值 */
  const handleTestThreshold = async (threshold: ThresholdConfig) => {
    if (typeof testThreshold === 'function') {
      try {
        await testThreshold({
          equipmentId: threshold.equipmentId,
          metricType: threshold.metricType,
          testValues: [threshold.upperLimit || 0],
          duration: threshold.duration,
        });
        alert('阈值测试已触发');
      } catch (error) {
        console.error('测试阈值失败:', error);
      }
    }
  };

  /** 搜索处理 */
  const handleSearch = (searchTerm: string) => {
    if (!searchTerm) {
      fetchThresholds({ page: 1, filters: { deviceId: undefined, monitoringPoint: undefined } });
      return;
    }

    // 如果还没有设备列表，尝试异步加载一次以便后续匹配
    ensureItemsLoaded({ page: 1, pageSize: 100 });

    // 尝试在本地已加载的设备列表中匹配编号或名称
    const term = searchTerm.toLowerCase();
    const matchedEquipment = equipments.find(e =>
      e.deviceId.toLowerCase() === term ||
      e.deviceName.toLowerCase().includes(term)
    );

    if (matchedEquipment) {
      // 如果匹配到设备，优先按设备 UUID 查询，并清除监测点过滤以获得该设备的所有记录
      fetchThresholds({
        page: 1,
        filters: {
          deviceId: matchedEquipment.id,
          monitoringPoint: undefined
        }
      });
    } else {
      // 如果没匹配到设备，则作为监测点名称进行搜索，同时清除设备过滤
      fetchThresholds({
        page: 1,
        filters: {
          deviceId: undefined,
          monitoringPoint: searchTerm
        }
      });
    }
  };

  // 移除多余的筛选配置，保持与设备管理页面一致的简约样式
  // 只保留主搜索框，通过 handleSearch 同时处理监测点和设备ID

  // ===== 自定义操作按钮 =====
  const renderActionButtons = (threshold: ThresholdConfig) => (
    <div className="flex items-center justify-end gap-2">
      {/* 编辑按钮 */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleEdit(threshold)}
        className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/20"
        title="编辑阈值"
      >
        <Edit className="h-4 w-4" />
      </Button>

      {/* 启用/停用按钮 */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleToggleStatus(threshold)}
        className={`h-8 px-2 ${threshold.ruleStatus === ThresholdConfig.ruleStatus.ENABLED
          ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-600/20'
          : 'text-green-400 hover:text-green-300 hover:bg-green-600/20'
          }`}
        title={threshold.ruleStatus === ThresholdConfig.ruleStatus.ENABLED ? '停用阈值' : '启用阈值'}
      >
        <Power className="h-4 w-4" />
      </Button>

      {/* 测试阈值按钮 */}
      {typeof testThreshold === 'function' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleTestThreshold(threshold)}
          className="h-8 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-600/20"
          title="测试阈值"
        >
          <TestTube className="h-4 w-4" />
        </Button>
      )}

      {/* 删除按钮 */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => handleDelete(threshold)}
        className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/20"
        title="删除阈值"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  // 处理编辑时的默认值
  const getEditFormDefaultValues = () => {
    if (!editingThreshold) return undefined;

    return {
      ...editingThreshold,
      duration: editingThreshold.duration / 1000, // 转换毫秒到秒
    };
  };

  if (!canReadThreshold) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <Card className="max-w-md mx-auto mt-20 p-6 bg-slate-800 border-slate-700">
          <Alert className="bg-red-900/20 border-red-600/50">
            <Shield className="h-4 w-4" />
            <AlertDescription>您没有权限查看阈值管理页面，请联系系统管理员</AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* CRUD页面模板 */}
      <CRUDPageTemplate
        title="阈值管理"
        description={`设备监测阈值配置管理平台 - 共 ${total} 个阈值配置`}
        items={thresholds}
        total={total}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        columns={columns}
        rowKey="id"
        searchable
        searchPlaceholder="搜索设备编号、名称或监测点..."
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSearchChange={handleSearch}
        // 移除 filters 属性以匹配其他页面的简约风格
        onCreateClick={canUpdateThreshold ? handleCreate : undefined}
        onEditClick={canUpdateThreshold ? handleEdit : undefined}
        onDeleteClick={canUpdateThreshold ? handleDelete : undefined}
        canCreate={canUpdateThreshold}
        canEdit={canUpdateThreshold}
        canDelete={canUpdateThreshold}
        renderActionButtons={renderActionButtons}
      />

      {/* 表单模态框 */}
      <CRUDFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingThreshold ? '编辑阈值配置' : '创建阈值配置'}
        mode={editingThreshold ? 'edit' : 'create'}
        fields={formFields}
        defaultValues={getEditFormDefaultValues()}
        onSubmit={handleFormSubmit}
        loading={loading}
      />
    </>
  );
}
