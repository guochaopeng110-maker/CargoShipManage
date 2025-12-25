/**
 * 货船智能机舱管理系统 - 侧边栏导航组件
 * 
 * 该组件是应用的主要导航界面，提供：
 * 1. 分层级的导航菜单结构
 * 2. 展开/收缩的交互功能
 * 3. 当前页面高亮显示
 * 4. 悬停效果和过渡动画
 * 5. 图标和文字的组合显示
 * 6. React Router集成导航
 */

// React核心库和状态管理
import React, { useState } from 'react'; // React组件和useState钩子函数

// React Router hooks
import { useNavigate, useLocation } from 'react-router-dom'; // React Router导航hooks

// 导入统一导航配置模块
import { navigationConfig, NavItem } from '../config/navigation';

// 导入 Lucide React 图标（用于箭头图标）
import {
  ChevronRight, // 右箭头图标
  ChevronDown, // 下箭头图标
} from 'lucide-react';

/**
 * 侧边栏组件
 *
 * 这是一个功能丰富的侧边栏组件，主要特性包括：
 * 1. 响应式设计：支持展开和收缩两种状态
 * 2. 悬停交互：鼠标悬停时自动展开
 * 3. 层级导航：支持主菜单和子菜单的层级结构
 * 4. React Router集成：使用useNavigate和useLocation进行导航
 * 5. 状态管理：跟踪当前选中的菜单项和展开状态
 * 6. 视觉反馈：当前页面高亮显示，悬停效果等
 *
 * 数据来源：从 src/config/navigation.ts 统一导航配置模块获取导航数据
 * 确保导航结构的一致性，所有导航变更只需修改配置文件
 */
export function Sidebar() {
  // React Router hooks
  const navigate = useNavigate(); // 用于导航到新路由
  const location = useLocation(); // 用于获取当前路由信息

  // 侧边栏展开状态管理
  const [isExpanded, setIsExpanded] = useState(false); // 是否展开状态，默认为收缩状态
  // 展开的菜单项集合管理（用于支持多个子菜单同时展开）
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  /**
   * 切换菜单项展开状态
   * 
   * @param itemId 要切换的菜单项ID
   */
  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems); // 创建新的集合副本
    if (newExpanded.has(itemId)) {
      // 如果当前项已展开，则收起
      newExpanded.delete(itemId);
    } else {
      // 如果当前项未展开，则展开
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded); // 更新展开状态
  };

  /**
   * 处理主菜单项点击事件
   * 
   * 如果是父级菜单项（有子菜单），则切换展开状态
   * 如果是叶子菜单项（无子菜单且有路径），则执行React Router导航
   * 
   * @param item 被点击的导航项
   */
  const handleItemClick = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      // 有子菜单：切换展开状态
      toggleExpanded(item.id);
    } else if (item.path) {
      // 无子菜单但有路径：执行React Router导航
      navigate(item.path);
    }
  };

  /**
   * 处理子菜单项点击事件
   * 
   * @param child 被点击的子菜单项
   */
  const handleChildClick = (child: NavItem) => {
    if (child.path) {
      navigate(child.path); // 执行React Router导航
    }
  };

  /**
   * 检查导航项是否当前激活
   * 
   * @param item 要检查的导航项
   * @returns 是否激活
   */
  const isActiveItem = (item: NavItem): boolean => {
    if (item.path) {
      return location.pathname === item.path;
    }

    // 如果是父级菜单，检查是否有子菜单项激活
    if (item.children) {
      return item.children.some(child => isActiveItem(child));
    }

    return false;
  };

  /**
   * 递归检查子菜单项是否激活
   * 
   * @param item 要检查的导航项
   * @returns 是否激活
   */
  const isChildActive = (item: NavItem): boolean => {
    return location.pathname === item.path;
  };

  // 返回侧边栏的JSX结构
  return (
    <aside
      // 主容器样式：背景色、边框、过渡动画、宽度根据展开状态变化
      className={`bg-slate-800 border-r border-slate-700 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-16' // 展开时宽度256px，收缩时宽度64px
        } flex flex-col`} // flex布局，垂直排列
      // 鼠标悬停事件：悬停时展开，移出时收缩
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* 导航内容区域 */}
      <div className="flex-1 overflow-y-auto py-4"> {/* 垂直滚动、上下内边距 */}
        <nav className="space-y-1 px-2"> {/* 导航列表，项间距、左右内边距 */}
          {/* 使用统一导航配置渲染菜单 */}
          {navigationConfig.map((item) => (
            <div key={item.id}> {/* 每个导航项的容器 */}
              {/* 主菜单项按钮 */}
              <button
                onClick={() => handleItemClick(item)} // 点击事件处理
                // 按钮样式：根据激活状态和悬停状态应用不同样式
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all group ${isActiveItem(item)
                    ? 'bg-cyan-500/20 text-cyan-400 border-l-4 border-cyan-500 pl-2' // 激活状态：青色背景，左边框青色
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-400' // 默认状态：灰色文字，悬停时青色
                  }`}
              >
                {/* 菜单项图标 */}
                <item.icon className="w-5 h-5 flex-shrink-0" />

                {/* 展开状态下的菜单文字和展开箭头 */}
                {isExpanded && (
                  <>
                    {/* 菜单项文字 */}
                    <span className="flex-1 text-left whitespace-nowrap">
                      {item.label}
                    </span>

                    {/* 有子菜单时显示展开/收起箭头 */}
                    {item.children && item.children.length > 0 && (
                      <>
                        {expandedItems.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 flex-shrink-0" /> // 展开状态：向下箭头
                        ) : (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" /> // 收起状态：向右箭头
                        )}
                      </>
                    )}
                  </>
                )}
              </button>

              {/* 子菜单区域 */}
              {/* 只有在侧边栏展开且该菜单项有子菜单且处于展开状态时才显示 */}
              {item.children && item.children.length > 0 && isExpanded && expandedItems.has(item.id) && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-2">
                  {item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => handleChildClick(child)} // 子菜单点击事件
                      // 子菜单样式：更紧凑的文字大小
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${isChildActive(child)
                          ? 'bg-cyan-500/10 text-white shadow-sm shadow-cyan-500/10' // 子菜单激活状态：浅青色背景
                          : 'text-slate-300 hover:bg-slate-700/30 hover:text-cyan-400' // 子菜单默认状态
                        }`}
                    >
                      {/* 子菜单图标（尺寸较小） */}
                      <child.icon className="w-4 h-4 flex-shrink-0" />
                      {/* 子菜单文字 */}
                      <span className="whitespace-nowrap">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}