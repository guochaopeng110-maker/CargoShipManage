/**
 * 货船智能机舱管理系统 - 用户注册页面组件
 * 
 * 简化版本 - 专注于核心注册功能
 * 
 * 主要功能：
 * 1. 新用户注册表单
 * 2. 基础表单验证
 * 3. 密码强度检查
 * 4. 注册成功提示
 * 5. 跳转到登录页面
 * 
 * 移除的复杂功能：
 * - 过于复杂的密码强度指示器
 * - 复杂的安全特性
 * - 多步骤验证
 * 
 * @version 3.0.0 - 简化版
 * @author 货船智能机舱管理系统开发团队
 */

// React核心库
import React, { useState } from 'react';

// 第三方图标库
import { 
  Ship, 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowLeft
} from 'lucide-react';

// 导入UI组件库
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

// 导入认证服务
import { authService } from '../services/auth-service';

// 导入类型定义
import { RegisterRequest } from '../types/auth';

/**
 * 注册页面属性接口
 */
interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

/**
 * 注册表单数据接口
 */
interface RegisterFormData {
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

/**
 * 表单验证错误接口
 */
interface FormErrors {
  username?: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * 注册页面组件
 */
export function RegisterPage({ 
  onRegisterSuccess, 
  onNavigateToLogin 
}: RegisterPageProps) {
  // 表单状态管理
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  // UI状态管理
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  /**
   * 表单字段变更处理
   */
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // 清除通用错误
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  /**
   * 密码强度验证
   */
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return '密码至少需要8个字符';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}/.test(password)) {
      return '密码必须包含大小写字母、数字和特殊字符';
    }
    return null;
  };

  /**
   * 表单验证
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
    
    // 密码验证
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      newErrors.password = passwordError;
    }
    
    // 确认密码验证
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认密码';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }
    
    return newErrors;
  };

  /**
   * 表单提交处理
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
    
    try {
      const registerData: RegisterRequest = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber || undefined,
      };
      
      await authService.register(registerData);
      
      setRegistrationSuccess(true);
      setTimeout(() => {
        onRegisterSuccess();
      }, 2000);
      
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : '注册失败，请稍后重试'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700 shadow-2xl">
          <CardHeader className="text-center pb-4">
            {/* 系统logo和标题 */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-3 border-2 border-cyan-500">
                <Ship className="w-8 h-8 text-cyan-400" />
              </div>
              <CardTitle className="text-slate-100 text-xl">
                货船智能机舱管理系统
              </CardTitle>
              <CardDescription className="text-slate-400">
                新用户注册
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 注册成功提示 */}
            {registrationSuccess && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  注册成功！正在跳转到登录页面...
                </AlertDescription>
              </Alert>
            )}

            {/* 错误提示 */}
            {errors.general && !registrationSuccess && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {errors.general}
                </AlertDescription>
              </Alert>
            )}

            {!registrationSuccess && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 用户名输入 */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    用户名
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.username ? 'border-red-500' : ''}`}
                    placeholder="请输入用户名"
                    disabled={isSubmitting}
                  />
                  {errors.username && (
                    <p className="text-red-400 text-xs">{errors.username}</p>
                  )}
                </div>

                {/* 邮箱输入 */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    邮箱地址
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="请输入邮箱地址"
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-xs">{errors.email}</p>
                  )}
                </div>

                {/* 全名输入 */}
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    用户全名
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.fullName ? 'border-red-500' : ''}`}
                    placeholder="请输入用户全名"
                    disabled={isSubmitting}
                  />
                  {errors.fullName && (
                    <p className="text-red-400 text-xs">{errors.fullName}</p>
                  )}
                </div>

                {/* 手机号输入 */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-slate-300 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    手机号码 (可选)
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                    placeholder="请输入手机号码"
                    disabled={isSubmitting}
                  />
                  {errors.phoneNumber && (
                    <p className="text-red-400 text-xs">{errors.phoneNumber}</p>
                  )}
                </div>

                {/* 密码输入 */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="请输入密码"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-xs">{errors.password}</p>
                  )}
                </div>

                {/* 确认密码输入 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    确认密码
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="请再次输入密码"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-400 text-xs">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* 注册按钮 */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    '注册'
                  )}
                </Button>
              </form>
            )}

            {/* 导航链接 */}
            <div className="text-center">
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2 mx-auto"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4" />
                返回登录
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
