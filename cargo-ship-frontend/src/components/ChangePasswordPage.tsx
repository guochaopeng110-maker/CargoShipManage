/**
 * 货船智能机舱管理系统 - 密码修改页面组件
 * 
 * 主要功能：
 * 1. 用户修改自己的登录密码
 * 2. 验证当前密码正确性
 * 3. 密码强度检查和实时验证
 * 4. 安全的密码修改流程
 * 5. 加载状态和错误处理
 * 
 * UI设计：
 * - 使用与LoginPage相同的卡片布局
 * - 保持一致的UI风格
 * - 复用RegisterPage中的密码验证逻辑
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 */

// React核心库和钩子函数
import React, { useState } from 'react';

// 第三方图标库
import { 
  Ship,           // 系统logo图标
  Lock,           // 密码图标
  Eye,            // 显示密码图标
  EyeOff,         // 隐藏密码图标
  Key,            // 密钥图标
  CheckCircle,    // 成功图标
  AlertCircle,    // 错误图标
  Loader2,        // 加载图标
  ArrowLeft       // 返回图标
} from 'lucide-react';

// 导入UI组件库
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

// 导入认证状态管理
import { useAuthStore } from '../stores/auth-store';

/**
 * 密码修改页面属性接口
 */
interface ChangePasswordPageProps {
  onNavigateToProfile?: () => void;
}

/**
 * 密码修改表单数据接口
 */
interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 表单验证错误接口
 */
interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * 密码强度检查结果接口
 */
interface PasswordStrength {
  score: number;        // 强度分数 (0-4)
  label: string;        // 强度标签
  color: string;        // 颜色样式
  requirements: {       // 密码要求检查结果
    length: boolean;    // 长度要求
    lowercase: boolean; // 小写字母要求
    uppercase: boolean; // 大写字母要求
    number: boolean;    // 数字要求
    special: boolean;   // 特殊字符要求
  };
}

/**
 * 密码修改页面组件
 * 
 * 组件特性：
 * - 安全的密码修改流程
 * - 实时密码强度检查
 * - 当前密码验证
 * - 完整的表单验证
 * - 与authService集成的API调用
 */
export function ChangePasswordPage({ onNavigateToProfile }: ChangePasswordPageProps) {
  // 认证状态管理
  const { changePassword, loading: authLoading, error: authError, clearError } = useAuthStore();

  // 表单数据状态
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI状态管理
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 表单验证错误状态
  const [errors, setErrors] = useState<FormErrors>({});

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * 处理表单字段变更
   */
  const handleInputChange = (field: keyof ChangePasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // 清除通用错误和成功消息
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
    if (authError) {
      clearError();
    }
    if (successMessage) {
      setSuccessMessage(null);
    }
  };

  /**
   * 密码强度检查
   */
  const checkPasswordStrength = (password: string): PasswordStrength => {
    const requirements = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    
    let label = '很弱';
    let color = 'text-red-400';
    
    if (score >= 4) {
      label = '很强';
      color = 'text-green-400';
    } else if (score >= 3) {
      label = '中等';
      color = 'text-yellow-400';
    } else if (score >= 2) {
      label = '弱';
      color = 'text-orange-400';
    }

    return {
      score,
      label,
      color,
      requirements,
    };
  };

  /**
   * 表单字段验证
   */
  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};

    // 当前密码验证
    if (!formData.currentPassword) {
      newErrors.currentPassword = '请输入当前密码';
    }

    // 新密码验证
    if (!formData.newPassword) {
      newErrors.newPassword = '请输入新密码';
    } else {
      const strength = checkPasswordStrength(formData.newPassword);
      
      if (formData.newPassword.length < 8) {
        newErrors.newPassword = '密码至少需要8个字符';
      } else if (!strength.requirements.lowercase || !strength.requirements.uppercase || 
                 !strength.requirements.number || !strength.requirements.special) {
        newErrors.newPassword = '密码必须包含大小写字母、数字和特殊字符';
      } else if (formData.currentPassword === formData.newPassword) {
        newErrors.newPassword = '新密码不能与当前密码相同';
      }
    }

    // 确认密码验证
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '请确认新密码';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的新密码不一致';
    }

    return newErrors;
  };

  /**
   * 处理表单提交
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
    clearError();

    try {
      // 调用认证服务修改密码
      await changePassword(formData.currentPassword, formData.newPassword);

      // 密码修改成功
      setSuccessMessage('密码修改成功！');
      
      // 清空表单
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccessMessage(null);
        // 可选：跳转到个人信息页面
        if (onNavigateToProfile) {
          onNavigateToProfile();
        }
      }, 3000);

    } catch (error) {
      console.error('修改密码失败:', error);
      setErrors({
        general: error instanceof Error ? error.message : '修改密码失败，请稍后重试'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算密码强度
  const passwordStrength = checkPasswordStrength(formData.newPassword);

  // 主页面布局
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
                修改密码
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
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
            {(errors.general || authError) && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {errors.general || authError}
                </AlertDescription>
              </Alert>
            )}

            {/* 密码修改表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 当前密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  当前密码
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                    placeholder="请输入当前密码"
                    disabled={isSubmitting || authLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    disabled={isSubmitting || authLoading}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-red-400 text-xs">{errors.currentPassword}</p>
                )}
              </div>

              {/* 新密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-300 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  新密码
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10 ${errors.newPassword ? 'border-red-500' : ''}`}
                    placeholder="请输入新密码"
                    disabled={isSubmitting || authLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    disabled={isSubmitting || authLoading}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* 密码强度指示器 */}
                {formData.newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">密码强度</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 3 ? 'bg-green-500' : 
                          passwordStrength.score >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.length ? 'text-green-400' : 'text-slate-500'}`}>
                        {passwordStrength.requirements.length ? '✓' : '○'} 8位以上
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.uppercase ? 'text-green-400' : 'text-slate-500'}`}>
                        {passwordStrength.requirements.uppercase ? '✓' : '○'} 大写字母
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.lowercase ? 'text-green-400' : 'text-slate-500'}`}>
                        {passwordStrength.requirements.lowercase ? '✓' : '○'} 小写字母
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.number ? 'text-green-400' : 'text-slate-500'}`}>
                        {passwordStrength.requirements.number ? '✓' : '○'} 数字
                      </div>
                      <div className={`flex items-center gap-1 ${passwordStrength.requirements.special ? 'text-green-400' : 'text-slate-500'}`}>
                        {passwordStrength.requirements.special ? '✓' : '○'} 特殊字符
                      </div>
                    </div>
                  </div>
                )}
                
                {errors.newPassword && (
                  <p className="text-red-400 text-xs">{errors.newPassword}</p>
                )}
              </div>

              {/* 确认新密码输入 */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  确认新密码
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="请再次输入新密码"
                    disabled={isSubmitting || authLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    disabled={isSubmitting || authLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs">{errors.confirmPassword}</p>
                )}
              </div>

              {/* 修改密码按钮 */}
              <Button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
              >
                {(isSubmitting || authLoading) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    修改密码
                  </>
                )}
              </Button>
            </form>

            {/* 导航链接 */}
            <div className="text-center">
              {onNavigateToProfile ? (
                <button
                  type="button"
                  onClick={onNavigateToProfile}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2 mx-auto"
                  disabled={isSubmitting || authLoading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回个人信息
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-2 mx-auto"
                  disabled={isSubmitting || authLoading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}