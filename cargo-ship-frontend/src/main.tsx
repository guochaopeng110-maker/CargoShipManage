
/**
 * 货船智能机舱管理系统 - 应用程序入口文件
 *
 * 该文件是整个前端应用的入口点，负责：
 * 1. 初始化React 18的根节点
 * 2. 渲染主应用组件
 * 3. 加载全局样式文件
 * 4. 初始化日志系统
 */

import React from 'react';
import { createRoot } from "react-dom/client"; // React 18的createRoot API，用于创建根节点并渲染组件
import App from "./App.tsx"; // 主应用组件，包含整个应用的路由和状态管理
import "./index.css"; // 全局样式文件，包含Tailwind CSS和其他全局样式
import { Logger } from "./utils/logger"; // 简洁实用的调试 Logger
import { OpenAPI } from './services/api'; // 导入 OpenAPI 配置

// 初始化 API 基础路径
OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL || '';
Logger.info(`API Base URL: ${OpenAPI.BASE}`);

Logger.setComponent('Main');

Logger.info('应用启动开始');

// 获取页面根节点元素，并创建React根实例来渲染应用
// document.getElementById("root")! 表示根节点元素，!表示非空断言
// createRoot()创建根节点，然后调用render()方法渲染App组件
const container = document.getElementById("root")!;
const root = createRoot(container);

// 仅在开发环境加载实时服务调试工具
if (import.meta.env.DEV) {
    import('./utils/verify-realtime').then(({ setupRealtimeDebug }) => {
        setupRealtimeDebug();
    });
}

root.render(<App />);

Logger.info('React应用渲染完成');
