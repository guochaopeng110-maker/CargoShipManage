/**
 * 货船智能机舱管理系统 - 顶部工具栏组件
 * 
 * 该组件是应用的主要顶部导航区域，提供：
 * 1. 系统标题和版本信息显示
 * 2. 实时通知下拉菜单
 * 3. 用户菜单和登出功能
 * 4. 系统状态指示器
 */

// React核心库和状态管理
import React, { useState, useEffect } from 'react'; // React组件和useState, useEffect钩子函数

// React Router导航
import { useNavigate } from 'react-router-dom'; // React Router导航hook

// 导入Lucide React图标库
import { Bell, User, LogOut, Settings } from 'lucide-react'; // Bell:通知图标, User:用户图标, LogOut:登出图标, Settings:设置图标

// 导入UI组件
import { Button } from './ui/button'; // 按钮组件

// 导入认证服务
import { authService } from '../services/auth-service'; // 认证服务

// 导入类型定义
import { User as UserType } from '../types/auth'; // 用户类型

// 导入Radix UI下拉菜单组件
import {
  DropdownMenu, // 下拉菜单主容器
  DropdownMenuContent, // 下拉菜单内容区域
  DropdownMenuItem, // 下拉菜单项
  DropdownMenuSeparator, // 下拉菜单分隔线
  DropdownMenuTrigger, // 下拉菜单触发器
} from './ui/dropdown-menu';

import { Badge } from './ui/badge'; // 徽章组件，用于显示通知数量

/**
 * TopBar组件属性接口
 */
interface TopBarProps {
  onLogout: () => void; // 登出回调函数
}

/**
 * 顶部工具栏组件
 * 
 * 这是一个功能丰富的顶部导航栏组件，主要特性包括：
 * 1. 系统标识：显示系统名称和版本信息
 * 2. 通知管理：实时显示系统通知，支持下拉查看详情
 * 3. 用户交互：用户信息展示和菜单操作
 * 4. 响应式设计：适配不同屏幕尺寸
 * 5. 统一的视觉风格：与其他组件保持一致的设计语言
 * 
 * @param props.onLogout - 登出回调函数
 */
export function TopBar({ onLogout }: TopBarProps) {
  // React Router导航hook
  const navigate = useNavigate();
  
  // 通知数量状态管理（实际项目中应该从状态管理或API获取）
  const [notificationCount] = useState(3); // 当前未读通知数量

  // 用户信息状态管理
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 获取当前用户信息
   */
  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      setError(null);
    } catch (err) {
      setError('获取用户信息失败');
      console.error('Failed to fetch current user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 组件加载时获取用户信息
   */
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  /**
   * 刷新用户信息（用于从ProfilePage返回后更新）
   */
  const refreshUserInfo = () => {
    fetchCurrentUser();
  };

  /**
   * 处理用户登出
   *
   * 调用认证服务的登出方法，清理本地存储的认证数据
   * 然后调用父组件传递的登出回调函数
   */
  const handleLogout = async () => {
    try {
      // 调用认证服务的登出方法
      await authService.logout();
      console.log('用户登出成功');
    } catch (error) {
      console.error('登出失败:', error);
      // 即使登出API失败，也继续执行本地登出逻辑
    } finally {
      // 调用父组件的登出回调函数
      onLogout();
    }
  };

  /**
   * 导航到个人信息页面
   */
  const navigateToProfile = () => {
    navigate('/profile');
  };

  /**
   * 监听路由变化，从ProfilePage返回时刷新用户信息
   */
  useEffect(() => {
    const handleRouteChange = () => {
      // 如果从ProfilePage返回，刷新用户信息
      if (window.location.pathname === '/') {
        refreshUserInfo();
      }
    };

    // 监听popstate事件（浏览器前进后退）
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // 返回顶部工具栏的JSX结构
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      {/* 主容器：水平布局，左右两端对齐 */}
      <div className="flex items-center justify-between">
        
        {/* 左侧：系统标题和版本信息 */}
        <h1 className="text-slate-100">
          货船智能机舱管理系统V1.1
        </h1>

        {/* 右侧：通知和用户菜单区域 */}
        <div className="flex items-center gap-4">
          
          {/* 通知下拉菜单 */}
          <DropdownMenu>
            {/* 下拉菜单触发器 */}
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" // 幽灵样式按钮
                size="icon" // 图标尺寸
                className="relative text-slate-300 hover:text-cyan-400 hover:bg-slate-700"
              >
                {/* 通知铃铛图标 */}
                <Bell className="w-5 h-5" />
                
                {/* 通知数量徽章 - 仅在有通知时显示 */}
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 border-none text-white text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>

            {/* 下拉菜单内容 */}
            <DropdownMenuContent 
              align="end" // 右对齐
              className="w-80 bg-slate-800 border-slate-700 text-slate-300 min-h-10 z-[100]"
            >
              {/* 通知列表头部 */}
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-slate-100">通知</p>
              </div>

              {/* 通知列表内容区域 */}
              <div className="max-h-96 overflow-y-auto">
                {/* 通知项1：严重告警 */}
                <DropdownMenuItem className="flex flex-col items-start px-4 py-3 cursor-pointer hover:bg-slate-700">
                  <div className="flex items-center gap-2 w-full">
                    {/* 严重告警指示点 */}
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-slate-200">严重告警</span>
                  </div>
                  {/* 告警内容 */}
                  <p className="text-sm text-slate-400 mt-1">
                    电池1温度超过安全阈值
                  </p>
                  {/* 时间戳 */}
                  <span className="text-xs text-slate-500 mt-1">5分钟前</span>
                </DropdownMenuItem>

                {/* 通知项2：警告 */}
                <DropdownMenuItem className="flex flex-col items-start px-4 py-3 cursor-pointer hover:bg-slate-700">
                  <div className="flex items-center gap-2 w-full">
                    {/* 警告指示点 */}
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    <span className="text-slate-200">警告</span>
                  </div>
                  {/* 警告内容 */}
                  <p className="text-sm text-slate-400 mt-1">
                    推进系统效率下降15%
                  </p>
                  {/* 时间戳 */}
                  <span className="text-xs text-slate-500 mt-1">1小时前</span>
                </DropdownMenuItem>

                {/* 通知项3：正常状态 */}
                <DropdownMenuItem className="flex flex-col items-start px-4 py-3 cursor-pointer hover:bg-slate-700">
                  <div className="flex items-center gap-2 w-full">
                    {/* 正常状态指示点 */}
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-slate-200">正常</span>
                  </div>
                  {/* 状态内容 */}
                  <p className="text-sm text-slate-400 mt-1">
                    系统健康检查完成
                  </p>
                  {/* 时间戳 */}
                  <span className="text-xs text-slate-500 mt-1">2小时前</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 用户菜单下拉菜单 */}
          <DropdownMenu>
            {/* 用户菜单触发器 */}
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" // 幽灵样式按钮
                size="icon" // 图标尺寸
                className="text-slate-300 hover:text-cyan-400 hover:bg-slate-700"
              >
                {/* 用户头像容器 */}
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-500">
                  <User className="w-5 h-5 text-cyan-400" />
                </div>
              </Button>
            </DropdownMenuTrigger>

            {/* 用户菜单内容 */}
            <DropdownMenuContent 
              align="end" // 右对齐
              className="w-56 bg-slate-800 border-slate-700 text-slate-300 min-h-10 z-[100]"
            >
              {/* 用户信息头部 */}
              <div className="px-4 py-3 border-b border-slate-700">
                {isLoading ? (
                  <p className="text-slate-400">加载中...</p>
                ) : error ? (
                  <p className="text-slate-400">获取用户信息失败</p>
                ) : currentUser ? (
                  <>
                    <p className="text-slate-100">{currentUser.fullName}</p>
                    <p className="text-sm text-slate-400">{currentUser.email}</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-100">未知用户</p>
                    <p className="text-sm text-slate-400">unknown@example.com</p>
                  </>
                )}
              </div>

              {/* 个人信息菜单项 */}
              <DropdownMenuItem
                onClick={navigateToProfile}
                className="cursor-pointer hover:bg-slate-700 text-slate-300"
              >
                <User className="w-4 h-4 mr-2" />
                个人信息
              </DropdownMenuItem>

              {/* 通知设置菜单项 */}
              <DropdownMenuItem className="cursor-pointer hover:bg-slate-700 text-slate-300">
                <Bell className="w-4 h-4 mr-2" />
                通知设置
              </DropdownMenuItem>

              {/* 分隔线 */}
              <DropdownMenuSeparator className="bg-slate-700" />

              {/* 退出登录菜单项 */}
              <DropdownMenuItem
                onClick={handleLogout} // 点击时执行登出操作
                className="cursor-pointer hover:bg-slate-700 text-red-400"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
