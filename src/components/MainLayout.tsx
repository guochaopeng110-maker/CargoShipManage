/**
 * 货船智能机舱管理系统 - 主布局组件
 * 
 * 该组件是应用的主界面布局，负责：
 * 1. 整体页面结构的组织（侧边栏、顶部栏、主内容区）
 * 2. 路由管理和页面内容渲染（React Router）
 * 3. 各个功能模块页面的路由配置
 * 4. 用户登出功能
 */

// React核心库和状态管理
import React from 'react'; // React组件

// React Router组件
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// 导入布局相关组件
import { Sidebar } from './Sidebar'; // 左侧导航栏组件
import { TopBar } from './TopBar'; // 顶部工具栏组件

// 导入各个功能页面组件
import { UnderDevelopmentPage } from './UnderDevelopmentPage'; // 开发中页面组件
import { DashboardPage } from './DashboardPage'; // 驾驶舱页面
import { BatteryMonitoringPage } from './BatteryMonitoringPage'; // 电池监控页面
import { PropulsionMonitoringPage } from './PropulsionMonitoringPage'; // 推进系统监控页面
import { InverterMonitoringPage } from './InverterMonitoringPage'; // 逆变器监控页面
import { AuxiliaryMonitoringPage } from './AuxiliaryMonitoringPage'; // 辅助系统监控页面
import { DataImportPage } from './DataImportPage'; // 数据导入页面
import { DataQueryPage } from './DataQueryPage'; // 设备数据查询页面
import { HealthAssessmentPage } from './HealthAssessmentPage'; // 健康评估页面
import { ReportsPage } from './ReportsPage'; // 报表页面
import { MaintenancePlanPage } from './MaintenancePlanPage'; // 维护计划页面
import { EquipmentHealthPage } from './EquipmentHealthPage'; // 设备健康页面
import { MaintenanceHistoryPage } from './MaintenanceHistoryPage'; // 维护历史页面
import { DecisionSuggestionsPage } from './DecisionSuggestionsPage'; // 决策建议页面
import { EnergyOptimizationPage } from './EnergyOptimizationPage'; // 能源优化页面
import { ComplexOperationsPage } from './ComplexOperationsPage'; // 复杂操作页面
import { UserManagementPage } from './UserManagementPage'; // 用户管理页面
import { AlertThresholdPage } from './AlertThresholdPage'; // 报警阈值页面
import { AlertCenterPage } from './AlertCenterPage'; // 告警中心页面
import { DeviceManagementPage } from './DeviceManagementPage'; // 设备管理页面
import { ProfilePage } from './ProfilePage'; // 个人信息页面
import { ChangePasswordPage } from './ChangePasswordPage'; // 密码修改页面

/**
 * MainLayout组件的属性接口
 * 
 * 定义了主布局组件需要接收的回调函数：
 * - onLogout: 处理用户登出的回调函数
 */
interface MainLayoutProps {
  onLogout: () => void; // 登出回调函数
}

/**
 * 主布局组件
 * 
 * 这是应用的核心布局组件，实现了：
 * - 响应式的侧边栏导航（使用React Router导航）
 * - 顶部工具栏（包含用户信息和登出按钮）
 * - 主内容区域的路由页面渲染
 * - 统一的布局样式和主题
 * 
 * 该组件现在使用React Router来管理页面路由，每个Route对应一个特定的功能模块。
 * 
 * @param props.onLogout - 登出回调函数
 */
export function MainLayout({ onLogout }: MainLayoutProps) {
  // React Router导航hook
  const navigate = useNavigate();

  // 返回主布局的JSX结构
  return (
    // 主容器，设置为全屏高度，垂直flex布局，深色背景
    <div className="min-h-screen bg-slate-900 flex">
      
      {/* 左侧导航栏 */}
      {/* Sidebar组件现在使用React Router的useNavigate和useLocation进行导航 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        {/* TopBar组件接收：
         * - onLogout: 登出回调函数，用于处理用户登出
         */}
        <TopBar onLogout={onLogout} />

        {/* 内容区域 */}
        {/* main标签用于语义化，表示页面主要内容 */}
        <main className="flex-1 overflow-auto">
          {/* 使用React Router Routes来渲染不同的页面组件 */}
          <Routes>
            {/* 默认路由 - 重定向到仪表盘 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 仪表盘页面 - 使用驾驶舱组件 */}
            <Route path="/dashboard" element={<DashboardPage onNavigate={(page) => navigate(`/${page}`)} />} />
            
            {/* 监测相关页面 */}
            <Route path="/battery" element={<BatteryMonitoringPage />} />
            <Route path="/propulsion" element={<PropulsionMonitoringPage />} />
            <Route path="/inverter" element={<InverterMonitoringPage />} />
            <Route path="/auxiliary" element={<AuxiliaryMonitoringPage />} />
            
            {/* 告警监测页面 */}
            <Route path="/alerts" element={<AlertCenterPage />} />
            
            {/* 数据管理页面 */}
            <Route path="/data-import" element={<DataImportPage />} />
            <Route path="/data-query" element={<DataQueryPage />} />
            
            {/* 健康和报表页面 */}
            <Route path="/health" element={<HealthAssessmentPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            
            {/* 系统设置页面 */}
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/alert-threshold" element={<AlertThresholdPage />} />
            <Route path="/device-management" element={<DeviceManagementPage />} />
            
            {/* 维护相关页面 */}
            <Route path="/maintenance-plan" element={<MaintenancePlanPage />} />
            <Route path="/equipment-health" element={<EquipmentHealthPage />} />
            <Route path="/maintenance-history" element={<MaintenanceHistoryPage />} />
            
            {/* 辅助决策页面 */}
            <Route path="/decision-suggestions" element={<DecisionSuggestionsPage />} />
            <Route path="/energy-optimization" element={<EnergyOptimizationPage />} />
            <Route path="/complex-operations" element={<ComplexOperationsPage />} />
            
            {/* 个人信息管理页面 */}
            <Route path="/profile" element={<ProfilePage onNavigateToChangePassword={() => navigate('/change-password')} />} />
            <Route path="/change-password" element={<ChangePasswordPage onNavigateToProfile={() => navigate('/profile')} />} />
            
            {/* 未匹配的路由显示开发中页面 */}
            <Route path="*" element={<UnderDevelopmentPage moduleName="功能开发中" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}