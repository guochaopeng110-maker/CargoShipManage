/**
 * 货船智能机舱管理系统 - 统一导航配置模块
 *
 * 本模块是应用导航结构和路由配置的唯一数据源 (Single Source of Truth)。
 *
 * 核心功能：
 * 1. 定义标准化的导航数据结构
 * 2. 维护应用的完整导航树配置
 * 3. 提供类型安全的导航数据查询工具
 * 4. 明确标识各页面的开发状态和实现范围
 *
 * 设计原则：
 * - 导航结构严格遵循 docs/plan/frontend_refactoring_plan.md 中的信息架构
 * - Sidebar 组件和 MainLayout 路由配置均从此模块消费数据
 * - 任何导航结构的变更只需修改此文件，确保一致性
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025-01-12
 */

import React from 'react';

// ========== 导入图标库 ==========
import {
  LayoutDashboard,  // 驾控台图标
  Monitor,          // 监测图标
  Battery,          // 电池图标
  Fan,              // 推进系统图标
  Zap,              // 闪电/逆变器图标
  Settings2,        // 辅助系统图标
  Database,         // 数据库图标
  Upload,           // 上传图标
  Search,           // 搜索图标
  Activity,         // 活动/健康图标
  Wrench,           // 扳手/维护图标
  Lightbulb,        // 灯泡/决策图标
  Settings,         // 设置图标
  Users,            // 用户图标
  AlertCircle,      // 告警图标
  HardDrive,        // 硬盘/设备图标
  Shield,           // 盾牌/权限图标
  User,             // 个人图标
  Key,              // 密钥/密码图标
  Power,            // 电力/配电图标
  Sliders,          // 滑块/阈值图标
} from 'lucide-react';

// ========== 类型定义 ==========

/**
 * 导航项接口定义
 *
 * 定义了导航菜单项的完整数据结构，包含显示、路由、状态等所有必要信息。
 */
export interface NavItem {
  /**
   * 导航项的唯一标识符
   * 用于 React key 和内部引用
   */
  id: string;

  /**
   * 导航项的显示标签（中文名称）
   */
  label: string;

  /**
   * 导航项的图标组件（来自 lucide-react）
   */
  icon: React.ComponentType<{ className?: string }>;

  /**
   * 路由路径（可选）
   * - 叶子节点（无子菜单）必须有 path
   * - 菜单组节点可以没有 path
   */
  path?: string;

  /**
   * 子导航项（可选）
   * 用于创建多级菜单结构
   */
  children?: NavItem[];

  /**
   * 页面开发状态标识（可选）
   *
   * 用于标识页面的实现程度：
   * - true: 页面需要完整的前后端功能实现（默认值）
   * - false: 页面仅保留UI骨架，当前阶段不实现后端功能
   *
   * 注：此字段主要用于"视情维护"和"辅助决策"菜单组下的页面
   */
  needsBackend?: boolean;

  /**
   * 页面描述信息（可选）
   * 用于提供页面功能的简要说明
   */
  description?: string;
}

// ========== 导航配置数据 ==========

/**
 * 应用导航树配置
 *
 * 这是整个应用的导航结构定义，严格按照 frontend_refactoring_plan.md 中的
 * 信息架构组织。所有导航相关的组件（Sidebar、MainLayout等）都应该从这里
 * 获取导航数据。
 *
 * 导航结构说明：
 * ===============
 *
 * 第一阶段核心功能（需要完整前后端实现）：
 * - 驾控台（Dashboard）
 * - 监测与报警（包含5个监测页面）
 * - 告警中心
 * - 数据中心（数据查询、历史数据导入）
 * - 健康评估
 * - 系统管理（设备管理、用户管理、角色权限）
 * - 个人账户（个人信息、修改密码）
 *
 * 第二阶段功能（仅保留UI骨架，暂不实现后端功能）：
 * - 视情维护（维护计划、维护历史）
 * - 辅助决策（决策建议、能效优化、复杂工况操作）
 *
 * 注：标记为 needsBackend: false 的页面在当前阶段仅展示UI界面，
 *     不进行数据交互和复杂逻辑实现，以保持导航结构的完整性。
 */
export const navigationConfig: NavItem[] = [
  // ========== 1. 驾控台 ==========
  {
    id: 'dashboard',
    label: '驾控台',
    icon: LayoutDashboard,
    path: '/dashboard',
    description: '全局态势总览，聚合显示核心实时状态和告警摘要',
  },

  // ========== 2. 监测与报警（菜单组）==========
  {
    id: 'monitoring',
    label: '监测与报警',
    icon: Monitor,
    description: '实时设备监测和数据可视化',
    children: [
      {
        id: 'propulsion',
        label: '推进系统',
        icon: Fan,
        path: '/propulsion',
        description: '推进电机和传动系统的实时监测',
      },
      {
        id: 'battery',
        label: '电池系统',
        icon: Battery,
        path: '/monitoring/battery',
        description: '电池系统实时监测和数据可视化（重构版）',
      },
      {
        id: 'inverter',
        label: '逆变器系统',
        icon: Zap,
        path: '/inverter',
        description: '逆变器系统运行状态和性能监测',
      },
      {
        id: 'power-distribution',
        label: '配电系统',
        icon: Power,
        path: '/power-distribution',
        description: '电力分配和供电网络监测',
      },
      {
        id: 'auxiliary',
        label: '辅助系统',
        icon: Settings2,
        path: '/auxiliary',
        description: '辅助设备和支持系统监测',
      },
    ],
  },

  // ========== 3. 告警中心（独立一级菜单）==========
  {
    id: 'alarm-center',
    label: '告警中心',
    icon: AlertCircle,
    path: '/alarm-center', // 更新为新版告警中心（双模视图）
    description: '统一管理实时告警和历史告警，实时监控系统健康状态',
  },

  // ========== 4. 数据中心（菜单组）==========
  {
    id: 'data-hub',
    label: '数据中心',
    icon: Database,
    description: '历史数据管理和查询',
    children: [
      {
        id: 'data-query',
        label: '数据查询',
        icon: Search,
        path: '/data-query',
        description: '设备历史数据查询和导出',
      },
      {
        id: 'data-import',
        label: '数据导入',
        icon: Upload,
        path: '/data-import',
        description: '导入外部历史数据到系统',
      },
    ],
  },

  // ========== 5. 健康评估（独立一级菜单）==========
  {
    id: 'health',
    label: '健康评估',
    icon: Activity,
    path: '/health',
    description: '设备健康状态评估和趋势分析',
  },

  // ========== 6. 视情维护（菜单组 - 仅UI骨架）==========
  {
    id: 'maintenance',
    label: '视情维护',
    icon: Wrench,
    description: '基于设备状态的维护计划管理（第二阶段功能）',
    children: [
      {
        id: 'maintenance-plan',
        label: '维护计划',
        icon: Wrench,
        path: '/maintenance-plan',
        needsBackend: false, // 仅UI骨架，暂不实现后端功能
        description: '设备维护计划制定和管理',
      },
      {
        id: 'maintenance-history',
        label: '维护历史',
        icon: Database,
        path: '/maintenance-history',
        needsBackend: false, // 仅UI骨架，暂不实现后端功能
        description: '历史维护记录查询和统计',
      },
    ],
  },

  // ========== 7. 辅助决策（菜单组 - 仅UI骨架）==========
  {
    id: 'decision-support',
    label: '辅助决策',
    icon: Lightbulb,
    description: '智能决策支持和优化建议（第二阶段功能）',
    children: [
      {
        id: 'decision-suggestions',
        label: '决策建议',
        icon: Lightbulb,
        path: '/decision-suggestions',
        needsBackend: false, // 仅UI骨架，暂不实现后端功能
        description: '基于AI的智能决策建议',
      },
      {
        id: 'energy-optimization',
        label: '能效优化',
        icon: Zap,
        path: '/energy-optimization',
        needsBackend: false, // 仅UI骨架，暂不实现后端功能
        description: '能源消耗优化方案推荐',
      },
      {
        id: 'complex-operations',
        label: '复杂工况操作',
        icon: Settings,
        path: '/complex-operations',
        needsBackend: false, // 仅UI骨架，暂不实现后端功能
        description: '特殊工况下的操作指导',
      },
    ],
  },

  // ========== 8. 系统管理（菜单组）==========
  {
    id: 'system-admin',
    label: '系统管理',
    icon: Settings,
    description: '系统配置和权限管理',
    children: [
      {
        id: 'device-management',
        label: '设备管理',
        icon: HardDrive,
        path: '/device-management',
        description: '设备档案和配置管理',
      },
      {
        id: 'user-management',
        label: '用户管理',
        icon: Users,
        path: '/user-management',
        description: '系统用户账号管理',
      },
      {
        id: 'threshold-management',
        label: '阈值管理',
        icon: Sliders,
        path: '/threshold-management',
        description: '设备监测阈值配置管理',
      },
    ],
  },

  // ========== 9. 个人账户（菜单组）==========
  {
    id: 'my-account',
    label: '个人账户',
    icon: User,
    description: '个人信息和账户设置',
    children: [
      {
        id: 'profile',
        label: '个人信息',
        icon: User,
        path: '/profile',
        description: '查看和编辑个人资料',
      },
      {
        id: 'change-password',
        label: '修改密码',
        icon: Key,
        path: '/change-password',
        description: '修改账户登录密码',
      },
    ],
  },
];

// ========== 辅助工具函数 ==========

/**
 * 从导航配置中提取所有路由路径
 *
 * 递归遍历导航树，收集所有包含 path 属性的导航项。
 * 用于路由配置的自动生成和验证。
 *
 * @returns 包含所有路由路径的导航项数组
 *
 * @example
 * const routes = getAllRoutes();
 * // 返回: [{ id: 'dashboard', label: '驾控台', path: '/dashboard', ... }, ...]
 */
export function getAllRoutes(): NavItem[] {
  const routes: NavItem[] = [];

  function extractRoutes(items: NavItem[]) {
    for (const item of items) {
      // 如果当前项有路径，添加到路由列表
      if (item.path) {
        routes.push(item);
      }

      // 如果有子菜单，递归处理
      if (item.children && item.children.length > 0) {
        extractRoutes(item.children);
      }
    }
  }

  extractRoutes(navigationConfig);
  return routes;
}

/**
 * 根据路径查找导航项
 *
 * 在导航树中搜索指定路径对应的导航项。
 * 用于路由激活状态判断和面包屑导航生成。
 *
 * @param path - 要查找的路由路径
 * @returns 找到的导航项，如果未找到则返回 undefined
 *
 * @example
 * const navItem = findNavItemByPath('/battery');
 * // 返回: { id: 'battery', label: '电池储能', path: '/battery', ... }
 */
export function findNavItemByPath(path: string): NavItem | undefined {
  function search(items: NavItem[]): NavItem | undefined {
    for (const item of items) {
      // 如果当前项的路径匹配，返回该项
      if (item.path === path) {
        return item;
      }

      // 如果有子菜单，递归搜索
      if (item.children && item.children.length > 0) {
        const found = search(item.children);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  return search(navigationConfig);
}

/**
 * 获取扁平化的导航树（仅一级菜单和菜单组，不包含子菜单）
 *
 * 用于 Sidebar 的主菜单渲染。
 *
 * @returns 一级导航项数组
 *
 * @example
 * const topLevelNav = getNavigationTree();
 * // 返回: [{ id: 'dashboard', ... }, { id: 'monitoring', children: [...], ... }, ...]
 */
export function getNavigationTree(): NavItem[] {
  return navigationConfig;
}

/**
 * 检查导航项是否需要后端功能实现
 *
 * 用于判断页面是否需要完整的前后端功能，还是仅展示UI骨架。
 *
 * @param navItem - 导航项
 * @returns true 表示需要后端功能，false 表示仅UI骨架
 *
 * @example
 * const needsBackend = isBackendRequired(navItem);
 * if (!needsBackend) {
 *   console.log('此页面当前阶段仅展示UI骨架');
 * }
 */
export function isBackendRequired(navItem: NavItem): boolean {
  // 如果未明确指定 needsBackend，默认为 true（需要后端功能）
  return navItem.needsBackend !== false;
}

/**
 * 获取所有需要后端功能的路由
 *
 * 过滤出标记为需要完整实现的页面路由。
 *
 * @returns 需要后端功能的导航项数组
 */
export function getBackendRequiredRoutes(): NavItem[] {
  return getAllRoutes().filter(isBackendRequired);
}

/**
 * 获取所有仅UI骨架的路由
 *
 * 过滤出标记为仅UI骨架的页面路由（第二阶段功能）。
 *
 * @returns 仅UI骨架的导航项数组
 */
export function getUIOnlyRoutes(): NavItem[] {
  return getAllRoutes().filter(item => !isBackendRequired(item));
}
