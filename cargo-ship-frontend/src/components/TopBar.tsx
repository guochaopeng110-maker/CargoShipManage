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
import { ConnectionStatusIndicator } from './ui/ConnectionStatusIndicator'; // WebSocket 连接状态指示器

// 从后端 API 客户端导入类型定义
import { User as UserType } from '@/services/api'; // 用户类型

// 导入认证状态管理
import { useAuthStore } from '../stores/auth-store';

// 导入Radix UI下拉菜单组件
import {
  DropdownMenu, // 下拉菜单主容器
  DropdownMenuContent, // 下拉菜单内容区域
  DropdownMenuItem, // 下拉菜单项
  DropdownMenuSeparator, // 下拉菜单分隔线
  DropdownMenuTrigger, // 下拉菜单触发器
} from './ui/dropdown-menu';

import { Badge } from './ui/badge'; // 徽章组件，用于显示通知数量

// 导入告警状态管理
import { useAlarmsStore, AlertSeverity } from '../stores/alarms-store';

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

  // 从 alarms-store 获取告警状态和操作
  const { pendingAlarms, getPendingAlarms, loading: alarmsLoading } = useAlarmsStore();

  // 通知数量即为待处理告警的数量
  const notificationCount = pendingAlarms.length;

  // 从 auth-store 获取用户信息
  const { user: currentUser, refreshCurrentUser, loading: isLoading, error } = useAuthStore();

  /**
   * 组件加载时获取用户信息
   */
  useEffect(() => {
    if (!currentUser) {
      refreshCurrentUser().catch(err => {
        console.error('Failed to fetch current user:', err);
      });
    }
  }, [currentUser, refreshCurrentUser]);

  /**
   * 组件加载时获取最新的待处理告警
   */
  useEffect(() => {
    getPendingAlarms(5); // 获取最近5条待处理告警
  }, [getPendingAlarms]);

  /**
   * 格式化告警发生时间为相对时间
   * @param dateString ISO格式的时间字符串
   */
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return '时间未知';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  };

  /**
   * 根据严重程度获取状态灯的类名
   */
  const getSeverityColorClass = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
      case AlertSeverity.HIGH:
        return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      case AlertSeverity.MEDIUM:
        return 'bg-amber-500';
      case AlertSeverity.LOW:
        return 'bg-blue-500';
      default:
        return 'bg-slate-500';
    }
  };

  /**
   * 根据严重程度获取文字描述
   */
  const getSeverityText = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL: return '极其严重';
      case AlertSeverity.HIGH: return '严重告警';
      case AlertSeverity.MEDIUM: return '一般告警';
      case AlertSeverity.LOW: return '提示信息';
      default: return '未知状态';
    }
  };

  /**
   * 处理用户登出
   *
   * 直接调用父组件传递的登出回调函数，
   * 父组件会负责调用 auth-store 的登出方法
   */
  const handleLogout = async () => {
    // 直接调用父组件的登出回调函数
    onLogout();
  };

  /**
   * 导航到个人信息页面
   */
  const navigateToProfile = () => {
    navigate('/profile');
  };

  // 返回顶部工具栏的JSX结构
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      {/* 主容器：水平布局，左右两端对齐 */}
      <div className="flex items-center justify-between">

        {/* 左侧：系统标题和版本信息 */}
        <h1 className="text-slate-100">
          货船智能机舱管理系统V1.1
        </h1>

        {/* 右侧：连接状态、通知和用户菜单区域 */}
        <div className="flex items-center gap-4">

          {/* WebSocket 连接状态指示器 */}
          <ConnectionStatusIndicator />

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
                {pendingAlarms.length > 0 ? (
                  pendingAlarms.slice(0, 5).map((alarm) => (
                    <DropdownMenuItem
                      key={alarm.id}
                      onClick={() => navigate('/alarm-center')}
                      className="flex flex-col items-start px-4 py-3 cursor-pointer hover:bg-slate-700 border-b border-slate-700/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 w-full">
                        {/* 告警级别指示点 */}
                        <span className={`w-2 h-2 rounded-full ${getSeverityColorClass(alarm.severity)}`}></span>
                        <span className="text-slate-200 text-xs font-medium">{getSeverityText(alarm.severity)}</span>
                        <span className="text-[10px] text-slate-500 ml-auto">{formatRelativeTime(alarm.triggeredAt)}</span>
                      </div>
                      {/* 告警描述内容 */}
                      <p className="text-sm text-slate-300 mt-1 line-clamp-2">
                        {alarm.message || alarm.faultName || '未知异常告警'}
                      </p>
                      {/* 设备名称 */}
                      <span className="text-[10px] text-cyan-500/80 mt-1">
                        来源: {alarm.equipmentName || alarm.equipmentId || '未知系统'}
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-slate-500 text-sm">暂无待处理通知</p>
                  </div>
                )}
              </div>

              {/* 查看全部按钮 */}
              <div className="p-2 border-t border-slate-700">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-cyan-400 hover:text-cyan-300 hover:bg-slate-700"
                  onClick={() => navigate('/alarm-center')}
                >
                  查看全部历史告警
                </Button>
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
