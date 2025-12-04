/**
 * 货船智能机舱管理系统 - 用户管理页面（API集成版）
 * 
 * 核心功能：
 * 1. 用户列表展示和管理（集成真实API）
 * 2. 完整的CRUD操作（创建、读取、更新、删除用户）
 * 3. 用户状态管理和权限控制
 * 4. 搜索和筛选功能
 * 
 * API集成：
 * - GET /auth/users - 获取用户列表
 * - GET /auth/users/:id - 获取单个用户详情
 * - POST /auth/users - 创建新用户
 * - PUT /auth/users/:id - 更新用户信息
 * - DELETE /auth/users/:id - 删除用户
 * 
 * 权限控制：
 * - 需要 user:read 权限查看用户列表
 * - 需要 user:create 权限创建用户
 * - 需要 user:update 权限编辑用户
 * - 需要 user:delete 权限删除用户
 * 
 * @version 3.0.0-api-integrated
 * @author 货船智能机舱管理系统开发团队
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Power, 
  Eye,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuthStore } from '../stores/auth-store';
import { usePermissions } from '../hooks/usePermissions';
import { AdminGuard } from './AuthGuard';
import { User, Role, ROLE_PERMISSIONS, SystemRole } from '../types/auth';
import { authService } from '../services/auth-service';

// 用户管理表单数据接口
interface UserFormData {
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: string;
  roleIds: string[];
  password?: string;
  confirmPassword?: string;
  status?: 'active' | 'inactive' | 'locked';
  isActive: boolean;
}

// 用户统计信息接口
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedUsers: number;
}

// 筛选配置接口
interface UserFilters {
  search: string;
  role: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

// 角色映射常量，用于API调用
const ROLE_MAPPING = {
  'Administrator': 'role_administrator',
  'Operator': 'role_operator', 
  'Viewer': 'role_viewer'
} as const;

/**
 * 简化的用户管理页面主组件
 */
const UserManagementPage: React.FC = () => {
  // 认证和权限相关
  const authStore = useAuthStore();
  const { hasPermission } = usePermissions();
  
  // 状态管理
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    role: '',
    roleIds: [],
    password: '',
    confirmPassword: '',
    status: 'active',
    isActive: true
  });
  
  // 筛选和排序
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10
  });
  
  // 验证状态
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * 显示错误消息
   */
  const showError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  /**
   * 显示成功消息
   */
  const showSuccess = useCallback((message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  /**
   * 获取用户列表（从API）
   */
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await authService.getUsers();
      setUsers(usersData);
      showSuccess('用户列表加载成功');
    } catch (error: any) {
      console.error('Failed to load users:', error);
      showError(error.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 刷新用户列表
   */
  const refreshUsers = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUsers();
    } finally {
      setRefreshing(false);
    }
  }, [loadUsers]);

  /**
   * 组件挂载时加载用户列表
   */
  useEffect(() => {
    if (hasPermission('user', 'read')) {
      loadUsers();
    }
  }, [loadUsers, hasPermission]);

  /**
   * 计算用户统计信息
   */
  const calculateUserStats = useCallback((): UserStats => {
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      inactiveUsers: users.filter(u => u.status === 'inactive').length,
      lockedUsers: users.filter(u => u.status === 'locked').length
    };
    return stats;
  }, [users]);

  /**
   * 组件挂载时更新统计信息
   */
  useEffect(() => {
    setUserStats(calculateUserStats());
  }, [users, calculateUserStats]);

  /**
   * 格式化时间显示
   */
  const formatTime = useCallback((isoString: string | undefined): string => {
    if (!isoString) return '从未登录';
    
    const date = new Date(isoString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return '刚刚';
    if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
    if (diffInHours < 24) return `${diffInHours}小时前`;
    if (diffInDays < 7) return `${diffInDays}天前`;
    
    return date.toLocaleDateString('zh-CN');
  }, []);

  /**
   * 获取用户状态徽章
   */
  const getUserStatusBadge = useCallback((user: User) => {
    if (user.status === 'locked') {
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500">
          <Lock className="w-3 h-3 mr-1" />
          已锁定
        </Badge>
      );
    }
    
    if (user.status === 'inactive') {
      return (
        <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500">
          <XCircle className="w-3 h-3 mr-1" />
          已停用
        </Badge>
      );
    }
    
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        正常
      </Badge>
    );
  }, []);

  /**
   * 获取角色徽章
   */
  const getRoleBadge = useCallback((role: Role) => {
    const roleConfig = {
      'administrator': { variant: 'destructive' as const, className: 'bg-red-500/20 text-red-400 border-red-500', name: '管理员' },
      'operator': { variant: 'default' as const, className: 'bg-blue-500/20 text-blue-400 border-blue-500', name: '操作员' },
      'viewer': { variant: 'secondary' as const, className: 'bg-slate-500/20 text-slate-400 border-slate-500', name: '查看者' }
    };
    
    const config = roleConfig[role.name as keyof typeof roleConfig] || roleConfig.viewer;
    
    return (
      <Badge className={config.className}>
        <Shield className="w-3 h-3 mr-1" />
        {config.name}
      </Badge>
    );
  }, []);

  /**
   * 获取用户主要角色
   */
  const getUserPrimaryRole = useCallback((user: User): string => {
    return user.roles.length > 0 ? user.roles[0].name : 'viewer';
  }, []);

  /**
   * 筛选和排序用户列表
   */
  const filteredAndSortedUsers = useCallback(() => {
    let filtered = users.filter(user => {
      // 搜索筛选
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          user.username.toLowerCase().includes(searchLower) ||
          user.fullName.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // 角色筛选
      if (filters.role !== 'all') {
        const userRole = getUserPrimaryRole(user);
        if (userRole !== filters.role) return false;
      }
      
      // 状态筛选
      if (filters.status !== 'all' && user.status !== filters.status) return false;
      
      return true;
    });
    
    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'username':
          aValue = a.username;
          bValue = b.username;
          break;
        case 'fullName':
          aValue = a.fullName;
          bValue = b.fullName;
          break;
        case 'role':
          aValue = getUserPrimaryRole(a);
          bValue = getUserPrimaryRole(b);
          break;
        case 'lastLoginAt':
          aValue = a.lastLoginAt || '';
          bValue = b.lastLoginAt || '';
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }
      
      if (typeof aValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return filters.sortOrder === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    });
    
    return filtered;
  }, [users, filters, getUserPrimaryRole]);

  /**
   * 处理添加用户
   */
  const handleAddUser = useCallback(() => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      fullName: '',
      phoneNumber: '',
      role: '',
      roleIds: [],
      password: '',
      confirmPassword: '',
      status: 'active',
      isActive: true
    });
    setValidationErrors({});
    setDialogOpen(true);
  }, []);

  /**
   * 处理编辑用户
   */
  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: getUserPrimaryRole(user),
      roleIds: user.roles.map(r => r.id),
      password: '',
      confirmPassword: '',
      status: user.status,
      isActive: user.isActive
    });
    setValidationErrors({});
    setDialogOpen(true);
  }, [getUserPrimaryRole]);

  /**
   * 处理查看用户详情
   */
  const handleViewUser = useCallback((user: User) => {
    setViewingUser(user);
    setDetailsDialogOpen(true);
  }, []);

  /**
   * 处理删除用户确认
   */
  const handleDeleteUserClick = useCallback((userId: string) => {
    setDeletingUserId(userId);
    setDeleteDialogOpen(true);
  }, []);

  /**
   * 确认删除用户
   */
  const confirmDeleteUser = useCallback(async () => {
    if (!deletingUserId) return;
    
    try {
      setLoading(true);
      await authService.deleteUser(deletingUserId);
      await loadUsers();
      showSuccess('用户删除成功');
    } catch (error: any) {
      console.error('Failed to delete user:', error);
      showError(error.message || '删除用户失败');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setDeletingUserId(null);
    }
  }, [deletingUserId, loadUsers, showError, showSuccess]);

  /**
   * 保存用户（添加/编辑）
   */
  const handleSaveUser = useCallback(async () => {
    try {
      setLoading(true);
      
      // 表单验证
      const errors: Record<string, string> = {};
      
      if (!formData.username.trim()) errors.username = '用户名不能为空';
      if (!formData.email.trim()) errors.email = '邮箱不能为空';
      if (!formData.fullName.trim()) errors.fullName = '姓名不能为空';
      if (!formData.role) errors.role = '请选择角色';
      
      // 密码验证（新用户或修改密码时）
      if (!editingUser || formData.password) {
        if (!formData.password || formData.password.length < 8) {
          errors.password = '密码长度至少8位';
        }
        if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = '两次输入的密码不一致';
        }
      }
      
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }
      
      if (editingUser) {
        // 编辑用户
        const updateData = {
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          status: formData.status,
          roleIds: [ROLE_MAPPING[formData.role as keyof typeof ROLE_MAPPING]]
        };
        
        if (formData.password) {
          Object.assign(updateData, { password: formData.password });
        }
        
        await authService.updateUser(editingUser.id, updateData);
        showSuccess('用户更新成功');
      } else {
        // 添加新用户
        if (!formData.password) {
          showError('创建用户时必须设置密码');
          return;
        }

        const createData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          status: formData.status,
          roleIds: [ROLE_MAPPING[formData.role as keyof typeof ROLE_MAPPING]]
        };
        
        await authService.createUser(createData);
        showSuccess('用户创建成功');
      }
      
      await loadUsers();
      setDialogOpen(false);
      
    } catch (error: any) {
      console.error('Failed to save user:', error);
      showError(error.message || '保存用户失败');
    } finally {
      setLoading(false);
    }
  }, [formData, editingUser, loadUsers, showError, showSuccess]);

  // 检查用户权限
  const canManageUsers = hasPermission('user', 'update');
  const canDeleteUsers = hasPermission('user', 'delete');

  if (!hasPermission('user', 'read')) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              访问被拒绝
            </CardTitle>
            <CardDescription>
              您没有权限查看用户管理页面
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                请联系系统管理员获取用户管理权限
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = filteredAndSortedUsers();
  const currentPageUsers = filteredUsers.slice(
    (filters.page - 1) * filters.pageSize,
    filters.page * filters.pageSize
  );
  
  return (
    <TooltipProvider>
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 页面标题和操作 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">用户管理</h1>
              <p className="text-slate-400 mt-1">
                管理系统用户、角色和权限
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={refreshUsers} 
                disabled={refreshing}
                variant="outline"
                className="bg-slate-800 border-slate-600 text-slate-300"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button 
                onClick={handleAddUser} 
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                disabled={!hasPermission('user', 'create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加新用户
              </Button>
            </div>
          </div>
          
          {/* 消息提示 */}
          {error && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-green-400">{success}</AlertDescription>
            </Alert>
          )}
          
          {/* 用户统计卡片 */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-800/80 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">总用户数</p>
                      <p className="text-2xl font-bold text-slate-100">{userStats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/80 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">活跃用户</p>
                      <p className="text-2xl font-bold text-green-400">{userStats.activeUsers}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/80 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">停用用户</p>
                      <p className="text-2xl font-bold text-yellow-400">{userStats.inactiveUsers}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/80 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm">锁定用户</p>
                      <p className="text-2xl font-bold text-red-400">{userStats.lockedUsers}</p>
                    </div>
                    <Lock className="h-8 w-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* 搜索和筛选 */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="搜索用户名、姓名或邮箱..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                    className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
                <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value, page: 1 }))}>
                  <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="角色" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-slate-300">全部角色</SelectItem>
                    <SelectItem value="administrator" className="text-slate-300">管理员</SelectItem>
                    <SelectItem value="operator" className="text-slate-300">操作员</SelectItem>
                    <SelectItem value="viewer" className="text-slate-300">查看者</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value, page: 1 }))}>
                  <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-slate-300">全部状态</SelectItem>
                    <SelectItem value="active" className="text-slate-300">活跃</SelectItem>
                    <SelectItem value="inactive" className="text-slate-300">停用</SelectItem>
                    <SelectItem value="locked" className="text-slate-300">已锁定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
          
          {/* 用户列表表格 */}
          <Card className="bg-slate-800/80 border-slate-700 p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">用户</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">角色</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">状态</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">上次登录</th>
                    <th className="text-left py-3 px-3 text-slate-300 text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    // 加载骨架屏
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-slate-700/50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-20 mb-1" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3"><Skeleton className="h-6 w-16" /></td>
                        <td className="py-3 px-3"><Skeleton className="h-6 w-12" /></td>
                        <td className="py-3 px-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-3"><Skeleton className="h-8 w-32" /></td>
                      </tr>
                    ))
                  ) : currentPageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8" />
                          <p>没有找到符合条件的用户</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentPageUsers.map((user) => (
                      <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-700 text-slate-300 text-sm">
                                {user.fullName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-slate-300 font-medium">{user.fullName}</div>
                              <div className="text-slate-400 text-sm">@{user.username}</div>
                              <div className="text-slate-500 text-xs">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {user.roles.length > 0 ? (
                            getRoleBadge(user.roles[0])
                          ) : (
                            <Badge variant="secondary">无角色</Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {getUserStatusBadge(user)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-400 text-sm">
                            {formatTime(user.lastLoginAt)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            {/* 查看详情 */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleViewUser(user)}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-300"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>查看详情</TooltipContent>
                            </Tooltip>
                            
                            {canManageUsers && (
                              <>
                                {/* 编辑 */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditUser(user)}
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-400"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>编辑</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            
                            {canDeleteUsers && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteUserClick(user.id)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>删除</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* 分页 */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-slate-400 text-sm">
                显示 {(filters.page - 1) * filters.pageSize + 1} - {Math.min(filters.page * filters.pageSize, filteredUsers.length)} 条，
                共 {filteredUsers.length} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={filters.page === 1}
                  className="bg-slate-800 border-slate-600 text-slate-300"
                >
                  上一页
                </Button>
                <span className="text-slate-400 text-sm px-3 py-2">
                  {filters.page} / {Math.ceil(filteredUsers.length / filters.pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    page: prev.page + 1 
                  }))}
                  disabled={filters.page >= Math.ceil(filteredUsers.length / filters.pageSize)}
                  className="bg-slate-800 border-slate-600 text-slate-300"
                >
                  下一页
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* 添加/编辑用户对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? '编辑用户' : '添加新用户'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">用户名 *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入用户名"
                />
                {validationErrors.username && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.username}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">邮箱 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入邮箱地址"
                />
                {validationErrors.email && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">姓名 *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入用户姓名"
                />
                {validationErrors.fullName && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.fullName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phoneNumber">电话号码</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="bg-slate-900/50 border-slate-600 text-slate-100"
                  placeholder="输入电话号码"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">角色 *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Administrator" className="text-slate-300">管理员</SelectItem>
                    <SelectItem value="Operator" className="text-slate-300">操作员</SelectItem>
                    <SelectItem value="Viewer" className="text-slate-300">查看者</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.role && (
                  <p className="text-red-400 text-sm mt-1">{validationErrors.role}</p>
                )}
              </div>
              <div>
                <Label htmlFor="status">状态</Label>
                <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'locked') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-slate-100">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="active" className="text-slate-300">活跃</SelectItem>
                    <SelectItem value="inactive" className="text-slate-300">停用</SelectItem>
                    <SelectItem value="locked" className="text-slate-300">锁定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {!editingUser && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">密码 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-slate-900/50 border-slate-600 text-slate-100"
                    placeholder="输入密码"
                  />
                  {validationErrors.password && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.password}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="confirmPassword">确认密码 *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="bg-slate-900/50 border-slate-600 text-slate-100"
                    placeholder="再次输入密码"
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-red-400 text-sm mt-1">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}
            
            {editingUser && (
              <div className="bg-slate-700/50 p-3 rounded">
                <p className="text-slate-300 text-sm">
                  留空密码字段表示不修改当前密码
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleSaveUser} 
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingUser ? '更新中...' : '创建中...'}
                </>
              ) : (
                editingUser ? '更新用户' : '创建用户'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 用户详情对话框 */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          
          {viewingUser && (
            <div className="space-y-6">
              {/* 基本信息 */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-200">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-slate-700 text-slate-300">
                        {viewingUser.fullName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-200">{viewingUser.fullName}</p>
                      <p className="text-slate-400">@{viewingUser.username}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">邮箱</p>
                    <p className="text-slate-200">{viewingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">电话</p>
                    <p className="text-slate-200">{viewingUser.phoneNumber || '未设置'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">角色</p>
                    <div className="mt-1">
                      {viewingUser.roles.length > 0 ? (
                        getRoleBadge(viewingUser.roles[0])
                      ) : (
                        <Badge variant="secondary">无角色</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 状态信息 */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-slate-200">状态信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-400 text-sm">账户状态</p>
                    <div className="mt-1">{getUserStatusBadge(viewingUser)}</div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">最后登录</p>
                    <p className="text-slate-200 mt-1">{formatTime(viewingUser.lastLoginAt)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">创建时间</p>
                    <p className="text-slate-200 mt-1">{new Date(viewingUser.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">更新时间</p>
                    <p className="text-slate-200 mt-1">{new Date(viewingUser.updatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>确认删除用户</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-300">
              确定要删除此用户吗？此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="bg-slate-800 border-slate-600 text-slate-300"
            >
              取消
            </Button>
            <Button
              onClick={confirmDeleteUser}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

/**
 * 包装的用户管理页面，集成权限守卫
 */
const UserManagementPageWithGuard: React.FC = () => {
  return (
    <AdminGuard
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Shield className="h-5 w-5" />
                访问被拒绝
              </CardTitle>
              <CardDescription>
                您没有权限访问用户管理功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  用户管理功能需要管理员权限，请联系系统管理员
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      }
    >
      <UserManagementPage />
    </AdminGuard>
  );
};

export { UserManagementPageWithGuard as UserManagementPage };
export default UserManagementPageWithGuard;
