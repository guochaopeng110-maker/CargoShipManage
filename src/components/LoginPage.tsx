/**
 * 货船智能机舱管理系统 - 登录页面组件
 * 
 * 简化版本 - 专注于核心登录功能
 * 
 * 主要功能：
 * 1. 用户登录表单
 * 2. 基础表单验证
 * 3. 错误处理和加载状态
 * 4. 导航到注册页面
 * 
 * 移除的复杂功能：
 * - 密码强度指示器
 * - 安全信息展示
 * - Tab切换
 * - 复杂的UI组件
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
  Lock, 
  User, 
  AlertCircle, 
  Loader2
} from 'lucide-react';

// 导入UI组件库
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

// 导入认证状态管理
import { useAuth } from '../stores/auth-store';

/**
 * 登录页面组件的属性接口
 */
interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToRegister: () => void;
  onNavigateToResetPassword?: () => void;
}

/**
 * 简化的登录表单数据接口
 */
interface LoginFormData {
  username: string;
  password: string;
}

/**
 * 登录页面组件
 */
export function LoginPage({ 
  onLoginSuccess, 
  onNavigateToRegister,
  onNavigateToResetPassword
}: LoginPageProps) {
  // 认证状态管理
  const { login, loading, error, clearError } = useAuth();

  // 表单状态管理
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });

  // UI状态管理
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * 表单字段变更处理
   */
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除错误信息
    if (error) {
      clearError();
    }
  };

  /**
   * 表单验证
   */
  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return '请输入用户名';
    }
    if (!formData.password) {
      return '请输入密码';
    }
    return null;
  };

  /**
   * 表单提交处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 表单验证
    const validationError = validateForm();
    if (validationError) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await login(formData.username, formData.password);
      onLoginSuccess();
    } catch (error) {
      // 错误处理已在store中处理
      console.error('Login failed:', error);
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
                用户登录
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* 登录表单 */}
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
                  className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500"
                  placeholder="请输入用户名"
                  disabled={loading || isSubmitting}
                />
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
                    className="bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 pr-10"
                    placeholder="请输入密码"
                    disabled={loading || isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    disabled={loading || isSubmitting}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 登录按钮 */}
              <Button
                type="submit"
                disabled={loading || isSubmitting}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:opacity-50"
              >
                {(loading || isSubmitting) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </Button>
            </form>



            {/* 导航链接 */}
            <div className="space-y-2 text-center text-sm">
              {onNavigateToResetPassword && (
                <button
                  type="button"
                  onClick={onNavigateToResetPassword}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors"
                  disabled={loading || isSubmitting}
                >
                  忘记密码？
                </button>
              )}
              <div>
                <span className="text-slate-400">还没有账号？</span>
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="text-cyan-400 hover:text-cyan-300 transition-colors ml-1"
                  disabled={loading || isSubmitting}
                >
                  立即注册
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
