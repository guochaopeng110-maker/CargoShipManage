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

// 导入认证状态管理
import { useAuthStore } from './stores/auth-store'; // 认证状态管理

// 导入实时通信服务和状态管理
import { realtimeService } from './services/realtime-service'; // WebSocket 实时通信服务
import { useMonitoringStore } from './stores/monitoring-store'; // 监测数据状态管理
import { useAlarmsStore } from './stores/alarms-store'; // 告警状态管理
import { useEquipmentStore } from './stores/equipment-store'; // 设备状态管理

// 导入日志系统
import { Logger } from './utils/logger';

/**
 * 登录状态管理组件
 * 负责处理用户认证状态和页面导航
 */
function AuthenticatedApp() {
  const navigate = useNavigate(); // 获取navigate函数用于页面跳转

  // 使用统一的认证状态管理
  const { isAuthenticated, accessToken, logout } = useAuthStore();

  // 获取各个 store 的初始化方法
  const initMonitoring = useMonitoringStore(state => state.init);
  const subscribeToDevice = useMonitoringStore(state => state.subscribeToDevice);
  const initAlarms = useAlarmsStore(state => state.initSubscription);

  // 获取设备列表获取方法 (智能缓存版)
  const { ensureEquipments, resetEquipmentStore } = useEquipmentStore(state => ({
    ensureEquipments: state.ensureItemsLoaded,
    resetEquipmentStore: state.reset
  }));

  // 获取连接状态
  const realtimeConnected = useMonitoringStore(state => state.realtimeConnected);
  const resetMonitoringStore = useMonitoringStore(state => state.reset);
  const resetAlarmsStore = useAlarmsStore(state => state.reset);

  // 组件初始化日志
  useEffect(() => {
    Logger.setComponent('AuthenticatedApp');
    Logger.info('AuthenticatedApp组件初始化完成');
  }, []);

  /**
   * WebSocket 连接生命周期管理
   */
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      Logger.info('用户已认证，初始化 WebSocket 连接');

      try {
        // 1. 连接 WebSocket
        realtimeService.connect();
        Logger.info('WebSocket 连接已建立');

        // 2. 初始化各个 store 的实时监听
        initMonitoring(accessToken);
        initAlarms();
        Logger.info('监测数据与告警实时监听已初始化');

      } catch (error) {
        Logger.error('WebSocket 初始化失败:', error);
      }

      // 清理函数：仅在登出或组件卸载时断开物理连接
      return () => {
        Logger.info('清理 WebSocket 连接');
        try {
          // 注意：此处不再调用 cleanupMonitoring/cleanupAlarms，
          // 避免在页面切换（如刷新 App 组件）时误置全局状态。
          realtimeService.disconnect();
          Logger.info('WebSocket 连接已断开');
        } catch (error) {
          Logger.error('WebSocket 断开失败:', error);
        }
      };
    } else if (!isAuthenticated) {
      realtimeService.disconnect();
    }
  }, [isAuthenticated, accessToken, initMonitoring, initAlarms]);

  /**
   * 全局数据总线初始化：订阅核心系统设备
   * 
   * 功能：
   * 1. 获取全量设备列表
   * 2. 筛选出 ID 以前缀 'SYS-' 开头的核心系统设备
   * 3. 发起常驻 WebSocket 订阅，确保全局数据连贯性
   */
  useEffect(() => {
    // 关键修复：必须同时满足 已认证 且 WebSocket 已连接 才能开始订阅
    if (isAuthenticated && accessToken && realtimeConnected) {
      const initializeGlobalBus = async () => {
        try {
          // 1. 确保设备列表已加载 (优先使用缓存)
          const response = await ensureEquipments({ page: 1, pageSize: 100 });
          const equipments = response.items || [];

          if (equipments.length === 0) {
            Logger.warn('后台未返回任何设备，跳过订阅');
            return;
          }

          // 2. 识别核心系统设备 (ID 以 SYS- 开头)
          const coreEquipmentIds = equipments
            .filter((eq: any) => eq.deviceId?.startsWith('SYS-'))
            .map((eq: any) => eq.deviceId);

          if (coreEquipmentIds.length > 0) {
            Logger.info(`发现 ${coreEquipmentIds.length} 个核心系统设备，正在初始化全程订阅:`, coreEquipmentIds);

            // 3. 批量执行订阅
            const subscriptionPromises = coreEquipmentIds.map((id: string) => subscribeToDevice(id));
            await Promise.all(subscriptionPromises);

            Logger.info('核心系统设备全程订阅已建立');
          } else {
            Logger.warn('未发现以 SYS- 开头的核心系统设备，请检查设备初始化数据');
          }
        } catch (error) {
          Logger.error('全局数据总线初始化失败:', error);
        }
      };

      initializeGlobalBus();
    }
  }, [isAuthenticated, accessToken, realtimeConnected, ensureEquipments, subscribeToDevice]);

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

    // 在登出流程开始时彻底切断 WebSocket 连接，并重置所有 Store 状态
    try {
      realtimeService.disconnect();
      resetEquipmentStore();
      resetMonitoringStore();
      resetAlarmsStore();
      Logger.info('WebSocket 已手动断开，Store 状态已重置');
    } catch (e) {
      Logger.warn('清理资源失败:', e);
    }

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
            onNavigateToResetPassword={() => {/* 密码重置暂未实现 */ }}
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
