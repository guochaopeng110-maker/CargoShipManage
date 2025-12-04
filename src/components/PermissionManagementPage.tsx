/**
 * 货船智能机舱管理系统 - 权限管理页面
 * 
 * 功能说明：
 * 提供系统权限管理功能，包括权限查看、权限分配、权限描述等
 * 
 * 主要特性：
 * 1. 系统权限列表展示和管理
 * 2. 权限分类和层级展示
 * 3. 权限描述和用途说明
 * 4. 权限使用统计和分析
 * 5. 权限控制和访问限制
 * 
 * 权限控制：
 * - permission:read - 查看权限信息
 * - permission:create - 创建新权限
 * - permission:update - 更新权限信息
 * - permission:delete - 删除权限
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Key,
  Shield,
  Database,
  Settings,
  Users,
  FileText,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Tag,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// 权限控制
import { usePermissionPermissions } from '../hooks/useResourcePermissions';
import { PermissionGuardComponent } from './AuthGuard';

/**
 * 权限数据类型
 */
interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  level: number;
  isSystem: boolean;
  isActive: boolean;
  usedByRoles: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 权限管理页面主组件
 */
export function PermissionManagementPage() {
  // 权限控制
  const { 
    canCreatePermission, 
    canReadPermission, 
    canUpdatePermission, 
    canDeletePermission,
    canViewPermissions,
    canManagePermissions 
  } = usePermissionPermissions();

  // 检查查看权限
  if (!canViewPermissions()) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md bg-slate-800/80 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Key className="h-5 w-5" />
                访问被拒绝
              </CardTitle>
              <p className="text-slate-400 text-sm">
                您没有权限查看权限管理页面
              </p>
            </CardHeader>
            <CardContent>
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  请联系系统管理员获取权限管理权限
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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // 模拟权限数据
  const [permissions] = useState<Permission[]>([
    // === 设备管理权限（4个）===
    {
      id: 'device:create',
      name: 'device:create',
      displayName: '创建设备',
      description: '创建新的设备记录',
      category: '设备管理',
      resource: 'device',
      action: 'create',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'device:read',
      name: 'device:read',
      displayName: '查看设备',
      description: '查看设备列表和详细信息',
      category: '设备管理',
      resource: 'device',
      action: 'read',
      level: 1,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator', 'viewer'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'device:update',
      name: 'device:update',
      displayName: '更新设备',
      description: '修改设备信息和配置',
      category: '设备管理',
      resource: 'device',
      action: 'update',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'device:delete',
      name: 'device:delete',
      displayName: '删除设备',
      description: '删除设备记录',
      category: '设备管理',
      resource: 'device',
      action: 'delete',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },

    // === 传感器数据权限（6个）===
    {
      id: 'sensor_data:create',
      name: 'sensor_data:create',
      displayName: '创建传感器数据',
      description: '录入新的传感器数据',
      category: '传感器数据',
      resource: 'sensor_data',
      action: 'create',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sensor_data:read',
      name: 'sensor_data:read',
      displayName: '查看传感器数据',
      description: '查看传感器数据记录',
      category: '传感器数据',
      resource: 'sensor_data',
      action: 'read',
      level: 1,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator', 'viewer'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sensor_data:update',
      name: 'sensor_data:update',
      displayName: '更新传感器数据',
      description: '修改传感器数据',
      category: '传感器数据',
      resource: 'sensor_data',
      action: 'update',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sensor_data:delete',
      name: 'sensor_data:delete',
      displayName: '删除传感器数据',
      description: '删除传感器数据记录',
      category: '传感器数据',
      resource: 'sensor_data',
      action: 'delete',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sensor_data:import',
      name: 'sensor_data:import',
      displayName: '导入传感器数据',
      description: '批量导入传感器数据',
      category: '传感器数据',
      resource: 'sensor_data',
      action: 'import',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'sensor_data:export',
      name: 'sensor_data:export',
      displayName: '导出传感器数据',
      description: '导出传感器数据到文件',
      category: '传感器数据',
      resource: 'sensor_data',
      action: 'export',
      level: 3,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },

    // === 告警信息权限（4个）===
    {
      id: 'alert:read',
      name: 'alert:read',
      displayName: '查看告警',
      description: '查看告警信息和历史',
      category: '告警管理',
      resource: 'alert',
      action: 'read',
      level: 1,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator', 'viewer'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'alert:create',
      name: 'alert:create',
      displayName: '创建告警',
      description: '创建新的告警记录',
      category: '告警管理',
      resource: 'alert',
      action: 'create',
      level: 2,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator', 'operator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },

    // === 角色管理权限（4个）===
    {
      id: 'role:read',
      name: 'role:read',
      displayName: '查看角色',
      description: '查看角色信息和权限',
      category: '角色管理',
      resource: 'role',
      action: 'read',
      level: 2,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'role:create',
      name: 'role:create',
      displayName: '创建角色',
      description: '创建新的系统角色',
      category: '角色管理',
      resource: 'role',
      action: 'create',
      level: 4,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },

    // === 用户管理权限（4个）===
    {
      id: 'user:read',
      name: 'user:read',
      displayName: '查看用户',
      description: '查看用户信息和列表',
      category: '用户管理',
      resource: 'user',
      action: 'read',
      level: 2,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'user:create',
      name: 'user:create',
      displayName: '创建用户',
      description: '创建新的系统用户',
      category: '用户管理',
      resource: 'user',
      action: 'create',
      level: 4,
      isSystem: true,
      isActive: true,
      usedByRoles: ['administrator'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ]);

  // 获取权限分类
  const categories = Array.from(new Set(permissions.map(p => p.category)));

  // 过滤数据
  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // 获取权限统计信息
  const getPermissionStats = () => {
    const totalPermissions = permissions.length;
    const activePermissions = permissions.filter(p => p.isActive).length;
    const systemPermissions = permissions.filter(p => p.isSystem).length;
    const categoriesCount = categories.length;
    
    return { totalPermissions, activePermissions, systemPermissions, categoriesCount };
  };

  // 获取权限级别徽章样式
  const getLevelBadge = (level: number) => {
    if (level >= 4) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500">
          关键权限
        </Badge>
      );
    } else if (level >= 3) {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">
          高级权限
        </Badge>
      );
    } else if (level >= 2) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">
          中级权限
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500">
          基础权限
        </Badge>
      );
    }
  };

  // 获取权限使用统计
  const getUsageStats = () => {
    const usageCount = permissions.reduce((acc, permission) => {
      const count = permission.usedByRoles.length;
      if (count >= 3) {
        acc.high++;
      } else if (count >= 1) {
        acc.medium++;
      } else {
        acc.low++;
      }
      return acc;
    }, { high: 0, medium: 0, low: 0 });
    
    return usageCount;
  };

  const stats = getPermissionStats();
  const usageStats = getUsageStats();

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <Key className="w-8 h-8 text-green-400" />
              权限管理
            </h1>
            <p className="text-slate-400 mt-1">
              系统权限统一管理平台 - 共 {stats.totalPermissions} 个权限，{stats.categoriesCount} 个分类
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
          </div>
        </div>

        {/* 搜索和筛选控制栏 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索权限名称、描述、资源或操作..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            
            {/* 分类筛选 */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-48 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-md text-slate-100"
            >
              <option value="all">全部分类</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {/* 筛选结果显示 */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              显示 {filteredPermissions.length} 个权限
              {searchTerm && ` (搜索: "${searchTerm}")`}
              {selectedCategory !== 'all' && ` (分类: ${selectedCategory})`}
            </span>
          </div>
        </Card>

        {/* 权限统计信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-100">{stats.totalPermissions}</div>
              <div className="text-slate-400 text-sm">总权限数</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.activePermissions}</div>
              <div className="text-slate-400 text-sm">活跃权限</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.systemPermissions}</div>
              <div className="text-slate-400 text-sm">系统权限</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.categoriesCount}</div>
              <div className="text-slate-400 text-sm">权限分类</div>
            </div>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="list" className="data-[state=active]:bg-blue-500/20">
              <Key className="w-4 h-4 mr-1" />
              权限列表
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-green-500/20">
              <Tag className="w-4 h-4 mr-1" />
              分类统计
            </TabsTrigger>
            <TabsTrigger value="usage" className="data-[state=active]:bg-purple-500/20">
              <BarChart3 className="w-4 h-4 mr-1" />
              使用统计
            </TabsTrigger>
          </TabsList>

          {/* 权限列表标签页 */}
          <TabsContent value="list" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPermissions.map((permission) => (
                <Card key={permission.id} className="bg-slate-800/80 border-slate-700 hover:bg-slate-800 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-slate-100 text-sm flex items-center gap-2">
                          {permission.displayName}
                          {getLevelBadge(permission.level)}
                        </CardTitle>
                        <p className="text-slate-400 text-xs mt-1 font-mono">{permission.name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {permission.isSystem && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500 text-xs">
                            系统
                          </Badge>
                        )}
                        {permission.isActive ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500 text-xs">
                            活跃
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500 text-xs">
                            停用
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-slate-300 text-xs">{permission.description}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">资源</span>
                        <div className="text-slate-200 font-medium">{permission.resource}</div>
                      </div>
                      <div>
                        <span className="text-slate-400">操作</span>
                        <div className="text-slate-200 font-medium">{permission.action}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-xs">使用角色</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {permission.usedByRoles.slice(0, 3).map((role, index) => (
                          <Badge key={index} variant="outline" className="text-xs border-slate-600 text-slate-300">
                            {role}
                          </Badge>
                        ))}
                        {permission.usedByRoles.length > 3 && (
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                            +{permission.usedByRoles.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 pt-2 border-t border-slate-700">
                      <PermissionGuardComponent operation="update">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30 text-xs"
                        >
                          编辑
                        </Button>
                      </PermissionGuardComponent>
                      
                      {!permission.isSystem && (
                        <PermissionGuardComponent operation="delete">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30 text-xs"
                          >
                            删除
                          </Button>
                        </PermissionGuardComponent>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredPermissions.length === 0 && (
              <Card className="bg-slate-800/80 border-slate-700 p-12 text-center">
                <Key className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-slate-300 text-lg font-medium mb-2">暂无权限</h3>
                <p className="text-slate-400">当前条件下没有找到权限记录</p>
              </Card>
            )}
          </TabsContent>

          {/* 分类统计标签页 */}
          <TabsContent value="categories" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const categoryPermissions = permissions.filter(p => p.category === category);
                const activeCount = categoryPermissions.filter(p => p.isActive).length;
                
                return (
                  <Card key={category} className="bg-slate-800/80 border-slate-700 p-6">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                        {category === '设备管理' && <Database className="w-5 h-5 text-blue-400" />}
                        {category === '传感器数据' && <BarChart3 className="w-5 h-5 text-green-400" />}
                        {category === '告警管理' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                        {category === '角色管理' && <Shield className="w-5 h-5 text-purple-400" />}
                        {category === '用户管理' && <Users className="w-5 h-5 text-cyan-400" />}
                        {category === '系统管理' && <Settings className="w-5 h-5 text-red-400" />}
                        {category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">总权限数</span>
                          <span className="text-slate-200 font-medium">{categoryPermissions.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">活跃权限</span>
                          <span className="text-green-400 font-medium">{activeCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">占比</span>
                          <span className="text-slate-200 font-medium">
                            {((categoryPermissions.length / permissions.length) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(categoryPermissions.length / permissions.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* 使用统计标签页 */}
          <TabsContent value="usage" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800/80 border-slate-700 p-6">
                <CardHeader>
                  <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                    <Lock className="w-5 h-5 text-green-400" />
                    高频使用
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-400 mb-2">{usageStats.high}</div>
                  <p className="text-slate-400 text-sm">3个或以上角色使用</p>
                  <div className="mt-4 space-y-2">
                    {permissions
                      .filter(p => p.usedByRoles.length >= 3)
                      .slice(0, 5)
                      .map((permission) => (
                        <div key={permission.id} className="text-xs text-slate-300">
                          {permission.displayName} ({permission.usedByRoles.length}个角色)
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/80 border-slate-700 p-6">
                <CardHeader>
                  <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-yellow-400" />
                    中频使用
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-400 mb-2">{usageStats.medium}</div>
                  <p className="text-slate-400 text-sm">1-2个角色使用</p>
                  <div className="mt-4 space-y-2">
                    {permissions
                      .filter(p => p.usedByRoles.length >= 1 && p.usedByRoles.length < 3)
                      .slice(0, 5)
                      .map((permission) => (
                        <div key={permission.id} className="text-xs text-slate-300">
                          {permission.displayName} ({permission.usedByRoles.length}个角色)
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/80 border-slate-700 p-6">
                <CardHeader>
                  <CardTitle className="text-slate-100 text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-400" />
                    低频使用
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-400 mb-2">{usageStats.low}</div>
                  <p className="text-slate-400 text-sm">未被任何角色使用</p>
                  <div className="mt-4 space-y-2">
                    {permissions
                      .filter(p => p.usedByRoles.length === 0)
                      .slice(0, 5)
                      .map((permission) => (
                        <div key={permission.id} className="text-xs text-slate-300">
                          {permission.displayName}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default PermissionManagementPage;