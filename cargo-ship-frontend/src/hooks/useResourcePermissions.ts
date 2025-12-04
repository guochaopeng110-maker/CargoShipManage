/**
 * 货船智能机舱管理系统 - 资源权限控制Hook
 * 
 * 为特定资源类型创建专门的权限检查Hook
 * 支持传感器数据、角色管理、权限管理等新资源类型
 */

import { useCallback } from 'react';
import { usePermissions } from './usePermissions';

/**
 * 传感器数据权限Hook
 * 
 * 提供传感器数据相关的权限检查功能
 */
export const useSensorDataPermissions = () => {
  const { hasPermission } = usePermissions();

  return {
    // 传感器数据权限检查
    canCreateSensorData: () => hasPermission('sensor_data', 'create'),
    canReadSensorData: () => hasPermission('sensor_data', 'read'),
    canUpdateSensorData: () => hasPermission('sensor_data', 'update'),
    canDeleteSensorData: () => hasPermission('sensor_data', 'delete'),
    canImportSensorData: () => hasPermission('sensor_data', 'import'),
    canExportSensorData: () => hasPermission('sensor_data', 'export'),
    
    // 组合权限检查
    canManageSensorData: () => (
      hasPermission('sensor_data', 'create') &&
      hasPermission('sensor_data', 'update') &&
      hasPermission('sensor_data', 'delete')
    ),
    canViewSensorData: () => hasPermission('sensor_data', 'read'),
    canImportExportSensorData: () => (
      hasPermission('sensor_data', 'import') &&
      hasPermission('sensor_data', 'export')
    ),
  };
};

/**
 * 角色管理权限Hook
 * 
 * 提供角色管理相关的权限检查功能
 */
export const useRolePermissions = () => {
  const { hasPermission } = usePermissions();

  return {
    // 角色权限检查
    canCreateRole: () => hasPermission('role', 'create'),
    canReadRole: () => hasPermission('role', 'read'),
    canUpdateRole: () => hasPermission('role', 'update'),
    canDeleteRole: () => hasPermission('role', 'delete'),
    
    // 组合权限检查
    canManageRoles: () => (
      hasPermission('role', 'create') &&
      hasPermission('role', 'update') &&
      hasPermission('role', 'delete')
    ),
    canViewRoles: () => hasPermission('role', 'read'),
  };
};

/**
 * 权限管理权限Hook
 * 
 * 提供权限管理相关的权限检查功能
 */
export const usePermissionPermissions = () => {
  const { hasPermission } = usePermissions();

  return {
    // 权限权限检查
    canCreatePermission: () => hasPermission('permission', 'create'),
    canReadPermission: () => hasPermission('permission', 'read'),
    canUpdatePermission: () => hasPermission('permission', 'update'),
    canDeletePermission: () => hasPermission('permission', 'delete'),
    
    // 组合权限检查
    canManagePermissions: () => (
      hasPermission('permission', 'create') &&
      hasPermission('permission', 'update') &&
      hasPermission('permission', 'delete')
    ),
    canViewPermissions: () => hasPermission('permission', 'read'),
  };
};

/**
 * 设备管理权限Hook（更新）
 * 
 * 提供设备管理相关的权限检查功能（使用统一的资源名称）
 */
export const useDevicePermissions = () => {
  const { hasPermission } = usePermissions();

  return {
    // 设备权限检查
    canCreateDevice: () => hasPermission('device', 'create'),
    canReadDevice: () => hasPermission('device', 'read'),
    canUpdateDevice: () => hasPermission('device', 'update'),
    canDeleteDevice: () => hasPermission('device', 'delete'),
    
    // 组合权限检查
    canManageDevices: () => (
      hasPermission('device', 'create') &&
      hasPermission('device', 'update') &&
      hasPermission('device', 'delete')
    ),
    canViewDevices: () => hasPermission('device', 'read'),
  };
};

/**
 * 告警管理权限Hook（更新）
 * 
 * 提供告警管理相关的权限检查功能（使用统一的资源名称）
 */
export const useAlertPermissions = () => {
  const { hasPermission } = usePermissions();

  return {
    // 告警权限检查
    canCreateAlert: () => hasPermission('alert', 'create'),
    canReadAlert: () => hasPermission('alert', 'read'),
    canUpdateAlert: () => hasPermission('alert', 'update'),
    canDeleteAlert: () => hasPermission('alert', 'delete'),
    
    // 组合权限检查
    canManageAlerts: () => (
      hasPermission('alert', 'create') &&
      hasPermission('alert', 'update') &&
      hasPermission('alert', 'delete')
    ),
    canViewAlerts: () => hasPermission('alert', 'read'),
  };
};

/**
 * 报表管理权限Hook（更新）
 * 
 * 提供报表管理相关的权限检查功能（添加缺失的export权限）
 */
export const useReportPermissions = () => {
  const { hasPermission } = usePermissions();

  return {
    // 报表权限检查
    canCreateReport: () => hasPermission('report', 'create'),
    canReadReport: () => hasPermission('report', 'read'),
    canUpdateReport: () => hasPermission('report', 'update'),
    canDeleteReport: () => hasPermission('report', 'delete'),
    canExportReport: () => hasPermission('report', 'export'),
    
    // 组合权限检查
    canManageReports: () => (
      hasPermission('report', 'create') &&
      hasPermission('report', 'update') &&
      hasPermission('report', 'delete')
    ),
    canViewReports: () => hasPermission('report', 'read'),
    canGenerateReports: () => (
      hasPermission('report', 'create') &&
      hasPermission('report', 'read')
    ),
  };
};

/**
 * 综合资源权限Hook
 * 
 * 集中管理所有资源类型的权限检查
 */
export const useAllResourcePermissions = () => {
  const sensorData = useSensorDataPermissions();
  const role = useRolePermissions();
  const permission = usePermissionPermissions();
  const device = useDevicePermissions();
  const alert = useAlertPermissions();
  const report = useReportPermissions();
  const { hasPermission } = usePermissions();

  return {
    // 传感器数据权限
    sensorData,
    
    // 角色权限
    role,
    
    // 权限权限
    permission,
    
    // 设备权限
    device,
    
    // 告警权限
    alert,
    
    // 报表权限
    report,
    
    // 用户权限（更新）
    user: {
      canCreateUser: () => hasPermission('user', 'create'),
      canReadUser: () => hasPermission('user', 'read'),
      canUpdateUser: () => hasPermission('user', 'update'),
      canDeleteUser: () => hasPermission('user', 'delete'),
      canManageUsers: () => (
        hasPermission('user', 'create') &&
        hasPermission('user', 'update') &&
        hasPermission('user', 'delete')
      ),
      canViewUsers: () => hasPermission('user', 'read'),
    },
    
    // 系统权限检查
    system: {
      canViewSystemInfo: () => hasPermission('system_config', 'read'),
      canManageSystem: () => hasPermission('system_config', 'update'),
      canViewLogs: () => hasPermission('audit_log', 'read'),
      canExportLogs: () => hasPermission('audit_log', 'export'),
    },
  };
};

/**
 * 导入记录权限Hook
 *
 * 专门用于数据导入功能的权限检查
 * 基于sensor_data权限体系
 */
export const useImportPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    // 导入数据权限 - Administrator, Operator
    canImportData: () => hasPermission('sensor_data', 'import'),
    
    // 查看导入记录权限 - Administrator, Operator, Viewer
    canViewImportRecords: () => hasPermission('sensor_data', 'read'),
    
    // 删除导入记录权限 - 仅Administrator
    canDeleteImportRecords: () => hasPermission('sensor_data', 'delete'),
    
    // 组合权限检查
    canManageImports: () => (
      hasPermission('sensor_data', 'import') &&
      hasPermission('sensor_data', 'read')
    ),
    
    // 完整导入管理权限（仅管理员）
    canFullImportManagement: () => (
      hasPermission('sensor_data', 'import') &&
      hasPermission('sensor_data', 'read') &&
      hasPermission('sensor_data', 'delete')
    ),
    
    // 检查是否为导入操作员（Operator或Administrator）
    isImportOperator: () => (
      hasPermission('sensor_data', 'import')
    ),
    
    // 检查是否为导入管理员（仅Administrator）
    isImportAdministrator: () => (
      hasPermission('sensor_data', 'import') &&
      hasPermission('sensor_data', 'delete')
    ),
  };
};

/**
 * 导入操作权限Hook
 *
 * 提供更细粒度的导入操作权限检查
 */
export const useImportOperationPermissions = () => {
  const { hasPermission } = usePermissions();
  
  return {
    // 文件上传权限
    canUploadFile: () => hasPermission('sensor_data', 'import'),
    
    // 数据预览权限
    canPreviewData: () => hasPermission('sensor_data', 'read'),
    
    // 执行导入权限
    canExecuteImport: () => hasPermission('sensor_data', 'import'),
    
    // 取消导入权限
    canCancelImport: () => hasPermission('sensor_data', 'import'),
    
    // 重试导入权限
    canRetryImport: () => hasPermission('sensor_data', 'import'),
    
    // 查看导入详情权限
    canViewImportDetails: () => hasPermission('sensor_data', 'read'),
    
    // 查看导入统计权限
    canViewImportStatistics: () => hasPermission('sensor_data', 'read'),
    
    // 导出导入记录权限
    canExportImportRecords: () => hasPermission('sensor_data', 'export'),
    
    // 删除导入记录权限
    canDeleteImportRecord: () => hasPermission('sensor_data', 'delete'),
    
    // 批量导入权限
    canBatchImport: () => hasPermission('sensor_data', 'import'),
    
    // 管理导入模板权限
    canManageImportTemplates: () => hasPermission('sensor_data', 'import'),
  };
};

export default useAllResourcePermissions;