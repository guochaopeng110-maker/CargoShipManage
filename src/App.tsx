/**
 * 货船智能机舱管理系统 - 主应用组件
 *
 * 这是整个应用的核心组件，负责：
 * 1. 应用路由管理和页面切换（React Router）
 * 2. 用户认证状态管理
 * 3. 公共路由和私有路由管理
 * 4. 日志记录和调试跟踪
 */

// React核心库和钩子函数
import React from 'react'; // React主库
import { useEffect } from 'react'; // React状态管理和副作用钩子

// React Router组件
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// 导入主要页面组件
import { LoginPage } from './components/LoginPage'; // 登录页面组件
import { RegisterPage } from './components/RegisterPage'; // 注册页面组件
import { MainLayout } from './components/MainLayout'; // 主布局组件（包含仪表盘和所有功能模块）
import { ProfilePage } from './components/ProfilePage'; // 个人信息页面组件
import { ChangePasswordPage } from './components/ChangePasswordPage'; // 密码修改页面组件

// 导入认证状态管理
import { useAuthStore } from './stores/auth-store'; // 认证状态管理

// 导入日志系统
import { Logger } from './utils/logger';

/**
 * 登录状态管理组件
 * 负责处理用户认证状态和页面导航
 */
function AuthenticatedApp() {
  const navigate = useNavigate(); // 获取navigate函数用于页面跳转
  
  // 使用统一的认证状态管理
  const { isAuthenticated, login, logout } = useAuthStore();

  // 组件初始化日志
  useEffect(() => {
    Logger.setComponent('AuthenticatedApp');
    Logger.info('AuthenticatedApp组件初始化完成');
  }, []);

  /**
   * 组件挂载时检查认证状态
   * 用于页面刷新或重新访问时恢复用户登录状态
   */
  useEffect(() => {
    Logger.info('检查认证状态');
    Logger.info(`当前认证状态: ${isAuthenticated}`);
  }, [isAuthenticated]);


  /**
   * 处理用户登出
   *
   * 当用户点击登出按钮时调用此函数：
   * 1. 调用auth-store的logout方法
   * 2. 记录登出日志
   */
  const handleLogout = async () => {
    Logger.info('用户登出');
    
    try {
      // 调用auth-store的logout方法
      await logout();
      
      Logger.info('用户登出成功');
      
      // 跳转到登录页
      navigate('/login');
    } catch (error) {
      Logger.error('用户登出失败:', error);
      // 即使登出失败，也跳转到登录页
      navigate('/login');
    }
  };

  // 如果未认证，显示登录/注册页面
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={
          <LoginPage
            onLoginSuccess={() => {
              // 登录成功后跳转到dashboard
              Logger.info('登录成功，跳转到dashboard页面');
              navigate('/dashboard');
            }}
            onNavigateToRegister={() => navigate('/register')}
            onNavigateToResetPassword={() => {/* 密码重置暂未实现 */}}
          />
        } />
        <Route path="/register" element={
          <RegisterPage 
            onRegisterSuccess={() => navigate('/login')} 
            onNavigateToLogin={() => navigate('/login')} 
          />
        } />
        {/* 默认重定向到登录页 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 如果已认证，显示主应用路由
  return (
    <Routes>
      {/* 所有私有路由都包装在MainLayout中 */}
      <Route path="/*" element={<MainLayout onLogout={handleLogout} />} />
    </Routes>
  );
}

/**
 * 主应用组件 - 整个应用的路由控制中心和认证入口
 *
 * 该组件管理：
 * - 路由配置和导航
 * - 全局认证状态检查
 * - 页面之间的重定向逻辑
 */
export default function App() {
  // 组件初始化日志
  useEffect(() => {
    Logger.setComponent('App');
    Logger.info('App组件初始化完成');
  }, []);

  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  );
}
