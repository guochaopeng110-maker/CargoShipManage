/**
 * 货船智能机舱管理系统 - 用户管理页面（重构版）
 *
 * 基于标准CRUD模板和user-store重构
 *
 * 功能特性：
 * - 用户列表展示（分页、排序、搜索）
 * - 用户CRUD操作（创建、编辑、删除）
 * - 角色分配和权限管理
 * - 用户状态管理（激活、停用、锁定）
 * - 密码管理（创建时必填，编辑时可选）
 *
 * @version 4.0.0 - 基于CRUD模板重构
 */

import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, Lock, Unlock, Power, Edit, Trash2 } from 'lucide-react';
import { CRUDPageTemplate } from './crud/CRUDPageTemplate';
import { CRUDFormModal } from './crud/CRUDFormModal';
import { ColumnDef, FormFieldConfig } from '../types/crud';
// 从后端 API 客户端导入类型
import { User, CreateUserDto, UpdateUserDto } from '@/services/api';
// 从 auth-store 导入用户管理功能
import { useAuthStore } from '../stores/auth-store';
import { usePermissions } from '../hooks/usePermissions';
import { Button } from './ui/button';
import { PERMISSION_RESOURCES, PERMISSION_ACTIONS, ROLES } from '../config/permissions';

/**
 * 角色名称转换
 */
const getRoleLabel = (roleName: string) => {
  const roleLabels: Record<string, string> = {
    [ROLES.ADMIN]: '管理员',
    [ROLES.OPERATOR]: '操作员',
    [ROLES.VIEWER]: '查看者',
  };
  return roleLabels[roleName] || roleName;
};

/**
 * 状态徽章配置
 */
const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500', label: '激活' },
    inactive: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500', label: '停用' },
    locked: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500', label: '锁定' },
  };
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
  return <Badge className={`${config.bg} ${config.text} ${config.border}`}>{config.label}</Badge>;
};

/**
 * 用户管理页面主组件
 */
export function UserManagementPage() {
  // 权限控制
  const { hasPermission } = usePermissions();
  const canViewUsers = hasPermission(PERMISSION_RESOURCES.USER, PERMISSION_ACTIONS.READ);
  const canCreateUser = hasPermission(PERMISSION_RESOURCES.USER, PERMISSION_ACTIONS.CREATE);
  const canUpdateUser = hasPermission(PERMISSION_RESOURCES.USER, PERMISSION_ACTIONS.UPDATE);
  const canDeleteUser = hasPermission(PERMISSION_RESOURCES.USER, PERMISSION_ACTIONS.DELETE);

  // Store状态和方法（从 auth-store 获取用户管理功能）
  const {
    users,
    usersLoading: loading,
    usersError: error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    total,
    page,
    pageSize,
  } = useAuthStore();

  // 本地状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // 初始化加载数据
  useEffect(() => {
    fetchUsers(1, 100); // 尽量获取足够多的数据以提取角色信息
  }, []);

  // 动态提取角色选项（基于现有用户数据中的角色信息）
  const roleOptions = React.useMemo(() => {
    const rolesMap = new Map<string, { label: string, value: string }>();

    // 遍历所有用户，提取唯一的角色信息
    users.forEach(user => {
      user.roles?.forEach(role => {
        if (!rolesMap.has(role.id)) {
          rolesMap.set(role.id, {
            label: getRoleLabel(role.name),
            value: role.id
          });
        }
      });
    });

    const options = Array.from(rolesMap.values());

    // 如果列表为空，则显示占位符或提示用户加载数据
    if (options.length === 0) {
      return [
        { label: '管理员 (等待加载...)', value: 'role_administrator' },
        { label: '操作员 (等待加载...)', value: 'role_operator' },
        { label: '查看者 (等待加载...)', value: 'role_viewer' },
      ];
    }

    return options;
  }, [users]);

  // 权限检查
  if (!canViewUsers) {
    return (
      <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
        <Card className="max-w-md mx-auto mt-20 p-6 bg-slate-800 border-slate-700">
          <Alert className="bg-red-900/20 border-red-600/50">
            <Shield className="h-4 w-4" />
            <AlertDescription>您没有权限查看用户管理页面，请联系系统管理员</AlertDescription>
          </Alert>
        </Card>
      </div>
    );
  }

  // ===== 表格列配置 =====
  const columns: ColumnDef<User>[] = [
    {
      key: 'username',
      title: '用户名',
      width: '150px',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'fullName',
      title: '姓名',
      width: '140px',
    },
    {
      key: 'email',
      title: '邮箱',
      width: '200px',
      render: (value) => <span className="text-sm">{value}</span>,
    },
    {
      key: 'roles',
      title: '角色',
      width: '150px',
      render: (value: any) => (
        <div className="flex gap-1 flex-wrap">
          {value && value.length > 0 ? (
            value.map((role: any) => (
              <Badge key={role.id} className="bg-blue-500/20 text-blue-400 border-blue-500">
                {getRoleLabel(role.name)}
              </Badge>
            ))
          ) : (
            <span className="text-slate-500 text-sm">未分配</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '100px',
      render: (value) => getStatusBadge(value as string),
    },
    {
      key: 'lastLoginAt',
      title: '最后登录',
      width: '140px',
      render: (value) => value ? new Date(value).toLocaleDateString('zh-CN') : <span className="text-slate-500">从未登录</span>,
    },
  ];

  // ===== 表单字段配置 =====
  const formFields: FormFieldConfig[] = [
    {
      name: 'username',
      label: '用户名',
      type: 'text',
      required: true,
      placeholder: '输入用户名',
      disabled: !!editingUser, // 编辑时禁用用户名
      helperText: '用户名创建后不可更改',
      minLength: 3,
      maxLength: 50,
    },
    {
      name: 'fullName',
      label: '姓名',
      type: 'text',
      required: true,
      placeholder: '输入真实姓名',
      minLength: 2,
      maxLength: 100,
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'email',
      required: true,
      placeholder: '输入邮箱地址',
    },
    {
      name: 'phoneNumber',
      label: '手机号',
      type: 'text',
      placeholder: '输入手机号码（可选）',
    },
    // 密码字段：创建时必填，编辑时可选
    ...(!editingUser
      ? [
        {
          name: 'password',
          label: '密码',
          type: 'password' as const,
          required: true,
          placeholder: '输入密码',
          helperText: '最少8个字符，包含大小写字母、数字和特殊字符',
          minLength: 8,
        },
      ]
      : [
        {
          name: 'password',
          label: '新密码',
          type: 'password' as const,
          placeholder: '留空表示不修改密码',
          helperText: '仅在需要重置密码时填写',
          minLength: 8,
        },
      ]),
    {
      name: 'roleIds',
      label: '用户角色',
      type: 'select',
      required: true,
      options: roleOptions,
      helperText: roleOptions[0]?.value?.length < 20 ? '正在同步系统角色信息...' : '选择用户的系统角色',
    },
    {
      name: 'status',
      label: '用户状态',
      type: 'select',
      options: [
        { label: '激活', value: 'active' },
        { label: '停用', value: 'inactive' },
        { label: '锁定', value: 'locked' },
      ],
    },
  ];


  // ===== 事件处理函数 =====

  /** 创建用户 */
  const handleCreate = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  /** 编辑用户 */
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  /** 删除用户 */
  const handleDelete = async (user: User) => {
    if (confirm(`确定要删除用户 ${user.fullName}（${user.username}）吗？此操作不可恢复。`)) {
      await deleteUser(user.id);
    }
  };

  /** 表单提交 */
  const handleFormSubmit = async (data: any) => {
    try {
      // 1. 构建干净的 DTO，只包含后端需要的字段
      // 注意：后端不接受 roles 字段，自接受 roleIds (UUID 数组)
      const formData: any = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        status: data.status,
      };

      // 处理 roleIds：确保是 UUID 数组，且过滤掉临时的占位符值
      const rawRoleIds = Array.isArray(data.roleIds) ? data.roleIds : [data.roleIds];
      formData.roleIds = rawRoleIds.filter((id: string) => id && id.length > 20);

      // 处理密码：如果是编辑模式且未填，则不发送该字段
      if (data.password) {
        formData.password = data.password;
      }

      if (editingUser) {
        await updateUser(editingUser.id, formData as UpdateUserDto);
      } else {
        await createUser(formData as CreateUserDto);
      }

      setDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('用户操作失败:', error);
    }
  };

  /** 切换用户状态 */
  const handleToggleStatus = async (user: User) => {
    if (user.status === 'active') {
      await updateUser(user.id, { status: User.status.INACTIVE } as UpdateUserDto);
    } else {
      await updateUser(user.id, { status: User.status.ACTIVE } as UpdateUserDto);
    }
  };

  // ===== 自定义操作按钮 =====
  const renderActionButtons = (user: User) => {
    const isAdmin = user.roles?.some((role: any) => role.name === ROLES.ADMIN);

    return (
      <div className="flex items-center justify-end gap-2">
        {/* 编辑按钮 */}
        {canUpdateUser && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(user)}
            className="h-8 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/20"
            title="编辑用户"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {/* 激活/停用按钮 */}
        {canUpdateUser && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleStatus(user)}
            className={`h-8 px-2 ${user.status === 'active'
              ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-600/20'
              : 'text-green-400 hover:text-green-300 hover:bg-green-600/20'
              }`}
            title={user.status === 'active' ? '停用用户' : '激活用户'}
          >
            {user.status === 'active' ? <Power className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        )}

        {/* 锁定按钮 */}
        {canUpdateUser && user.status !== 'locked' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateUser(user.id, { status: User.status.LOCKED } as UpdateUserDto)}
            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/20"
            title="锁定用户"
          >
            <Lock className="h-4 w-4" />
          </Button>
        )}

        {/* 删除按钮 - 管理员不可删除 */}
        {canDeleteUser && !isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(user)}
            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-600/20"
            title="删除用户"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  // 处理编辑时的默认值
  const getEditFormDefaultValues = () => {
    if (!editingUser) return undefined;

    return {
      ...editingUser,
      roleIds: editingUser.roles && editingUser.roles.length > 0 ? editingUser.roles[0].id : '',
      password: '', // 密码字段留空
    };
  };

  return (
    <>
      {/* CRUD页面模板 */}
      <CRUDPageTemplate
        title="用户管理"
        description={`系统用户账户统一管理平台 - 共 ${total} 个用户`}
        items={users}
        total={total}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        columns={columns}
        rowKey="id"
        searchable
        searchPlaceholder="搜索用户名、姓名或邮箱..."
        onPageChange={(p) => fetchUsers(p, pageSize)}
        onPageSizeChange={(ps) => fetchUsers(1, ps)}
        onCreateClick={canCreateUser ? handleCreate : undefined}
        onEditClick={canUpdateUser ? handleEdit : undefined}
        onDeleteClick={canDeleteUser ? handleDelete : undefined}
        canCreate={canCreateUser}
        canEdit={canUpdateUser}
        canDelete={canDeleteUser}
        renderActionButtons={renderActionButtons}
      />

      {/* 表单模态框 */}
      <CRUDFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingUser ? '编辑用户' : '创建新用户'}
        mode={editingUser ? 'edit' : 'create'}
        fields={formFields}
        defaultValues={getEditFormDefaultValues()}
        onSubmit={handleFormSubmit}
        loading={loading}
      />
    </>
  );
}
