/**
 * 货船智能机舱管理系统 - 个人信息页面组件
 * 
 * 主要功能：
 * 1. 显示当前用户详细信息
 * 2. 编辑个人信息（用户名、邮箱、全名、手机号）
 * 3. 表单验证和数据提交
 * 4. 加载状态和错误处理
 * 5. 成功后更新本地存储的用户信息
 * 
 * UI设计：
 * - 使用与LoginPage相同的布局结构
 * - 保持一致的UI风格和交互模式
 * - 响应式设计，适配不同屏幕尺寸
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

// React核心库和钩子函数
import React, { useState, useEffect } from 'react';

// 第三方图标库
import {
  Ship,        // 系统logo图标
  User,        // 用户图标
  Mail,        // 邮箱图标
  Phone,       // 手机号图标
  Calendar,    // 时间图标
  Edit3,       // 编辑图标
  Save,        // 保存图标
  X,           // 取消图标
  AlertCircle, // 错误提示图标
  CheckCircle, // 成功提示图标
  Loader2,     // 加载图标
  Key,         // 密码修改图标
  AlertTriangle // 警告提示图标
} from 'lucide-react';

// 导入UI组件库
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

// 导入认证服务和类型
import { authService } from '../services/auth-service';
import { User as UserType } from '../types/auth';

// 导入认证状态管理
import { useAuth } from '../stores/auth-store';

/**
 * 个人信息页面属性接口
 */
interface ProfilePageProps {
  onNavigateToChangePassword?: () => void;
}

/**
 * 个人信息表单数据接口
 */
interface ProfileFormData {
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
}

/**
 * 表单验证错误接口
 */
interface FormErrors {
  username?: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  general?: string;
}

/**
 * 个人信息页面组件
 * 
 * 组件特性：
 * - 支持查看和编辑个人信息
 * - 完整的表单验证
 * - 加载状态管理
 * - 错误和成功提示
 * - 与authService集成的数据同步
 */
export function ProfilePage({ onNavigateToChangePassword }: ProfilePageProps) {
  // 认证状态管理
  const { user: authUser, updateProfile } = useAuth();

  // 用户信息状态
  const [user, setUserState] = useState<UserType | null>(authUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 编辑模式状态
  const [isEditing, setIsEditing] = useState(false);

  // 表单数据状态
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    email: '',
    fullName: '',
    phoneNumber: '',
  });

  // 表单验证错误状态
  const [errors, setErrors] = useState<FormErrors>({});

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Mock服务状态
  const [usingMock, setUsingMock] = useState(false);

  /**
   * 组件挂载时加载用户信息
   */
  useEffect(() => {
    loadUserProfile();
  }, []);

  /**
   * 加载用户个人信息
   *
   * 支持Mock降级机制：
   * 1. 首先尝试调用真实API
   * 2. 如果检测到网络错误，自动降级到Mock服务
   * 3. 显示相应的提示信息
   */
  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setUsingMock(false);

      // 调用authService获取当前用户信息（已包含Mock降级逻辑）
      const userData = await authService.getCurrentUser();
      
      // 检查是否使用了Mock服务
      if ((userData as any)._usingMock) {
        setUsingMock(true);
      }
      
      setUserState(userData);
      
      // 初始化表单数据
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
        fullName: userData.fullName || '',
        phoneNumber: userData.phoneNumber || '',
      });

      // 更新认证状态管理中的用户信息
      // Note: updateProfile is called after successful form submission

    } catch (error: any) {
      console.error('获取用户信息失败:', error);
      
      // 显示错误信息
      setError(error.message || '获取用户信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理表单字段变更
   */
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // 清除通用错误和成功消息
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  /**
   * 表单字段验证
   */
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // 用户名验证
    if (!formData.username.trim()) {
      newErrors.username = '请输入用户名';
    } else if (formData.username.length < 3 || formData.username.length > 50) {
      newErrors.username = '用户名长度应在3-50个字符之间';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = '用户名只能包含字母、数字、下划线和连字符';
    }

    // 邮箱验证
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }

    // 全名验证
    if (!formData.fullName.trim()) {
      newErrors.fullName = '请输入用户全名';
    } else if (formData.fullName.length < 2 || formData.fullName.length > 100) {
      newErrors.fullName = '用户全名长度应在2-100个字符之间';
    }

    // 手机号验证
    if (formData.phoneNumber && !/^[\+]?[0-9\-\s]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = '请输入有效的手机号码';
    }

    return newErrors;
  };

  /**
   * 处理表单提交
   *
   * 支持Mock降级机制：
   * 1. 首先尝试调用真实API
   * 2. 如果检测到网络错误，自动降级到Mock服务
   * 3. 显示相应的成功/失败提示
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表单验证
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setError(null);

    try {
      if (!user) {
        throw new Error('用户信息不存在');
      }

      // 调用authService更新用户信息（已包含Mock降级逻辑）
      const updatedUser = await authService.updateUser(user.id, {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || undefined,
      });

      // 检查是否使用了Mock服务
      const isUsingMockService = (updatedUser as any)._usingMock;
      if (isUsingMockService) {
        setUsingMock(true);
      }

      // 更新本地状态
      setUserState(updatedUser);
      setIsEditing(false);
      setSuccessMessage(isUsingMockService ? '个人信息更新成功（使用Mock服务）' : '个人信息更新成功！');

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (error: any) {
      console.error('更新用户信息失败:', error);
      
      // 显示错误信息
      setErrors({
        general: error.message || '更新失败，请稍后重试'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  /**
   * 取消编辑模式
   */
  const handleCancel = () => {
    // 恢复原始数据
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
    setIsEditing(false);
    setErrors({});
    setError(null);
    setSuccessMessage(null);
  };

  /**
   * 进入编辑模式
   */
  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMessage(null);
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-slate-300">正在加载用户信息...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl w-full max-w-md">
          <CardContent className="p-6">
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
            <Button 
              onClick={loadUserProfile} 
              className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600"
            >
              重新加载
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 主页面布局
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* 系统标题 */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-3 border-2 border-cyan-500">
              <Ship className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">个人信息</h1>
            <p className="text-slate-400">管理您的个人信息和账户设置</p>
          </div>
        </div>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <User className="w-5 h-5 text-cyan-400" />
                  个人信息
                </CardTitle>
                <CardDescription className="text-slate-400">
                  查看和编辑您的个人详细信息
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* 密码修改按钮 */}
                {onNavigateToChangePassword && (
                  <Button
                    onClick={onNavigateToChangePassword}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    修改密码
                  </Button>
                )}
                
                {/* 编辑/保存/取消按钮 */}
                {!isEditing ? (
                  <Button
                    onClick={handleEdit}
                    variant="outline"
                    className="border-cyan-600 text-cyan-400 hover:bg-cyan-500/10"
                    disabled={!user}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    编辑
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          保存
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={isSubmitting}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      <X className="w-4 h-4 mr-2" />
                      取消
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Mock服务提示 */}
            {usingMock && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-300">
                  当前使用Mock服务，数据修改不会保存到服务器。请检查网络连接。
                </AlertDescription>
              </Alert>
            )}

            {/* 成功提示 */}
            {successMessage && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* 错误提示 */}
            {errors.general && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {errors.general}
                </AlertDescription>
              </Alert>
            )}

            {/* 用户信息表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 用户名 */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  用户名
                </Label>
                {isEditing ? (
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.username ? 'border-red-500' : ''}`}
                    placeholder="请输入用户名"
                    disabled={isSubmitting}
                  />
                ) : (
                  <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md text-slate-300">
                    {user?.username || '未设置'}
                  </div>
                )}
                {errors.username && (
                  <p className="text-red-400 text-xs">{errors.username}</p>
                )}
              </div>

              {/* 邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  邮箱地址
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="请输入邮箱地址"
                    disabled={isSubmitting}
                  />
                ) : (
                  <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md text-slate-300">
                    {user?.email || '未设置'}
                  </div>
                )}
                {errors.email && (
                  <p className="text-red-400 text-xs">{errors.email}</p>
                )}
              </div>

              {/* 全名 */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  用户全名
                </Label>
                {isEditing ? (
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.fullName ? 'border-red-500' : ''}`}
                    placeholder="请输入用户全名"
                    disabled={isSubmitting}
                  />
                ) : (
                  <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md text-slate-300">
                    {user?.fullName || '未设置'}
                  </div>
                )}
                {errors.fullName && (
                  <p className="text-red-400 text-xs">{errors.fullName}</p>
                )}
              </div>

              {/* 手机号 */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-slate-300 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  手机号码
                </Label>
                {isEditing ? (
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                    placeholder="请输入手机号码（可选）"
                    disabled={isSubmitting}
                  />
                ) : (
                  <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md text-slate-300">
                    {user?.phoneNumber || '未设置'}
                  </div>
                )}
                {errors.phoneNumber && (
                  <p className="text-red-400 text-xs">{errors.phoneNumber}</p>
                )}
              </div>

              {/* 角色信息 */}
              <div className="space-y-2">
                <Label className="text-slate-300">角色</Label>
                <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md">
                  <div className="flex flex-wrap gap-2">
                    {user?.roles?.map((role, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full border border-cyan-500/30"
                      >
                        {role.name === 'administrator' ? '管理员' : 
                         role.name === 'operator' ? '操作员' : '查看者'}
                      </span>
                    )) || <span className="text-slate-500">未分配角色</span>}
                  </div>
                </div>
              </div>

              {/* 状态信息 */}
              <div className="space-y-2">
                <Label className="text-slate-300">账户状态</Label>
                <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                      user?.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : user?.status === 'inactive'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {user?.status === 'active' ? '活跃' : 
                     user?.status === 'inactive' ? '停用' : '锁定'}
                  </span>
                </div>
              </div>

              {/* 创建时间 */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  创建时间
                </Label>
                <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md text-slate-300">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleString('zh-CN') : '未知'}
                </div>
              </div>

              {/* 最后登录 */}
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  最后登录
                </Label>
                <div className="p-3 bg-slate-900/30 border border-slate-700 rounded-md text-slate-300">
                  {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}