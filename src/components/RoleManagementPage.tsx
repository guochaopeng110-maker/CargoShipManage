/**
 * 货船智能机舱管理系统 - 角色管理页面
 * 
 * 功能说明：
 * 提供系统角色管理功能，包括角色查看、创建、更新、删除等
 * 
 * 主要特性：
 * 1. 系统角色列表展示和管理
 * 2. 角色权限分配和编辑
 * 3. 角色创建和删除操作
 * 4. 角色层级管理和权限继承
 * 5. 权限控制和访问限制
 * 
 * 权限控制：
 * - role:read - 查看角色信息
 * - role:create - 创建新角色
 * - role:update - 更新角色信息
 * - role:delete - 删除角色
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Shield,
  Key,
  RefreshCw,
  FileText,
  Check,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

// 权限控制
import { useRolePermissions } from '../hooks/useResourcePermissions';
import { RoleGuard } from './AuthGuard';

/**
 * 模拟角色数据类型
 */
interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  level: number;
  userCount: number;
  permissions: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/**
 * 权限信息
 */
interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * 角色管理页面主组件
 */
export function RoleManagementPage() {
  // 权限控制
  const { 
    canCreateRole, 
    canReadRole, 
    canUpdateRole, 
    canDeleteRole,
    canViewRoles,
    canManageRoles 
  } = useRolePermissions();

  // 检查查看权限
  if (!canViewRoles()) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="h-5 w-5" />
                访问被拒绝
              </CardTitle>
              <p className="text-slate-400 text-sm">
                您没有权限查看角色管理页面
              </p>
            </CardHeader>
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  请联系系统管理员获取角色管理权限
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 本地状态
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // 模拟角色数据
  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      name: 'administrator',
      displayName: '系统管理员',
      description: '拥有系统所有权限，可管理用户、角色和系统配置',
      level: 5,
      userCount: 2,
      permissions: ['device:*', 'sensor_data:*', 'alert:*', 'report:*', 'user:*', 'role:*', 'permission:*', 'system:*'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2025-11-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'operator',
      displayName: '操作员',
      description: '负责设备操作和数据管理，拥有设备操作和数据录入权限',
      level: 3,
      userCount: 8,
      permissions: ['device:read', 'device:execute', 'sensor_data:read', 'sensor_data:create', 'sensor_data:update', 'alert:read', 'alert:create', 'report:read', 'report:create'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2025-11-01T00:00:00Z'
    },
    {
      id: '3',
      name: 'viewer',
      displayName: '查看者',
      description: '只能查看系统数据和报表，无法进行任何操作',
      level: 1,
      userCount: 15,
      permissions: ['device:read', 'sensor_data:read', 'alert:read', 'report:read'],
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2025-11-01T00:00:00Z'
    }
  ]);

  // 过滤数据
  const filteredRoles = roles.filter(role => {
    return role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           role.description.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // 获取角色层级徽章样式
  const getLevelBadge = (level: number) => {
    switch (level) {
      case 5:
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500">
            管理员
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">
            操作员
          </Badge>
        );
      case 1:
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500">
            查看者
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500">
            自定义
          </Badge>
        );
    }
  };

  // 获取权限数量统计
  const getPermissionStats = () => {
    const totalPermissions = roles.reduce((sum, role) => sum + role.permissions.length, 0);
    const averagePermissions = Math.round(totalPermissions / roles.length);
    const maxPermissions = Math.max(...roles.map(role => role.permissions.length));
    const minPermissions = Math.min(...roles.map(role => role.permissions.length));
    
    return { totalPermissions, averagePermissions, maxPermissions, minPermissions };
  };

  // 编辑角色
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setEditDialogOpen(true);
  };

  // 删除角色
  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('确定要删除这个角色吗？此操作不可恢复。')) {
      setRoles(prev => prev.filter(role => role.id !== roleId));
    }
  };

  const stats = getPermissionStats();

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              角色管理
            </h1>
            <p className="text-slate-400 mt-1">
              系统角色权限管理平台 - 共 {roles.length} 个角色，{roles.reduce((sum, role) => sum + role.userCount, 0)} 个用户
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 刷新按钮 */}
            <Button 
              onClick={() => setLoading(true)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            
            {/* 创建角色按钮 */}
            <RoleGuard operation="create">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建角色
              </Button>
            </RoleGuard>
          </div>
        </div>

        {/* 搜索控制栏 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索角色名称、显示名称或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
          
          {/* 搜索结果统计 */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              显示 {filteredRoles.length} 个角色
              {searchTerm && ` (搜索: "${searchTerm}")`}
            </span>
          </div>
        </Card>

        {/* 角色统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-100">{roles.length}</div>
              <div className="text-slate-400 text-sm">总角色数</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.totalPermissions}</div>
              <div className="text-slate-400 text-sm">权限总数</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.averagePermissions}</div>
              <div className="text-slate-400 text-sm">平均权限</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{roles.reduce((sum, role) => sum + role.userCount, 0)}</div>
              <div className="text-slate-400 text-sm">用户总数</div>
            </div>
          </Card>
        </div>

        {/* 角色列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <Card key={role.id} className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                      {role.displayName}
                      {getLevelBadge(role.level)}
                    </CardTitle>
                    <p className="text-slate-400 text-sm mt-1">{role.name}</p>
                  </div>
                  <Badge 
                    variant={role.status === 'active' ? 'default' : 'secondary'}
                    className={role.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-slate-500/20 text-slate-400 border-slate-500'}
                  >
                    {role.status === 'active' ? '活跃' : '停用'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-slate-300 text-sm">{role.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">用户数量</span>
                    <div className="text-slate-200 font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {role.userCount}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">权限数量</span>
                    <div className="text-slate-200 font-medium flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      {role.permissions.length}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-sm">权限范围</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {role.permissions.slice(0, 3).map((permission, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {permission}
                      </Badge>
                    ))}
                    {role.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                        +{role.permissions.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500">
                  <div>创建: {new Date(role.createdAt).toLocaleDateString('zh-CN')}</div>
                  <div>更新: {new Date(role.updatedAt).toLocaleDateString('zh-CN')}</div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <RoleGuard operation="update">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditRole(role)}
                      className="flex-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      编辑
                    </Button>
                  </RoleGuard>
                  
                  {role.name !== 'administrator' && (
                    <RoleGuard operation="delete">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRole(role.id)}
                        className="flex-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        删除
                      </Button>
                    </RoleGuard>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRoles.length === 0 && (
          <Card className="bg-slate-800/80 border-slate-700 p-12 text-center">
            <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-slate-300 text-lg font-medium mb-2">暂无角色</h3>
            <p className="text-slate-400 mb-4">当前条件下没有找到角色记录</p>
            <RoleGuard operation="create">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                创建第一个角色
              </Button>
            </RoleGuard>
          </Card>
        )}

        {/* 编辑角色对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-slate-200">
                编辑角色: {selectedRole?.displayName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">角色名称</label>
                  <Input
                    value={selectedRole?.name || ''}
                    disabled
                    className="bg-slate-900/50 border-slate-600 text-slate-300"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-2 block">显示名称</label>
                  <Input
                    value={selectedRole?.displayName || ''}
                    className="bg-slate-900/50 border-slate-600 text-slate-100"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm mb-2 block">角色描述</label>
                <textarea
                  value={selectedRole?.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-100 resize-none"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => setEditDialogOpen(false)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  取消
                </Button>
                <Button
                  onClick={() => {
                    // 这里应该保存角色修改
                    setEditDialogOpen(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  保存修改
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default RoleManagementPage;