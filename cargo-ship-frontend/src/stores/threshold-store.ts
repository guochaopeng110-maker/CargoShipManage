/**
 * 货船智能机舱管理系统 - 阈值配置状态管理
 *
 * 职责：
 * 1. 管理阈值配置的全局状态
 * 2. 处理阈值配置的 CRUD 操作
 * 3. 管理筛选、排序和分页状态
 * 4. 封装 threshold-service API 调用
 *
 * 架构：
 * - State: 纯数据状态 (thresholds, loading, filters...)
 * - Actions: 业务逻辑 (createThreshold, fetchThresholds...)
 *
 * @module stores/threshold-store
 */

import { create } from 'zustand';

// 从后端 API 客户端导入基础类型和服务
import { Service, ThresholdConfig } from '@/services/api'; // ThresholdConfig 需要作为值使用（访问枚举）
import type { CreateThresholdDto, UpdateThresholdDto, PaginatedResponseDto } from '@/services/api';

// ==================== 前端业务逻辑类型定义 ====================

/**
 * 阈值配置筛选条件接口（前端扩展）
 *
 * 定义阈值配置列表筛选的各种条件参数
 */
export interface ThresholdConfigFilters {
  deviceId?: string;                                    // 设备ID或编号筛选
  metricType?: string;                                  // 指标类型筛选
  monitoringPoint?: string;                             // 监测点筛选
  enabled?: boolean;                                    // 启用状态筛选（映射到后端 ruleStatus）
  severity?: ThresholdConfig.severity[];                // 严重程度筛选（数组，支持多选）
}

/**
 * 阈值配置分页响应（前端扩展）
 */
export interface ThresholdConfigPaginatedResponse {
  items: ThresholdConfig[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 创建阈值配置请求（使用后端 DTO 作为基础）
 */
export type CreateThresholdConfigRequest = CreateThresholdDto;

/**
 * 更新阈值配置请求（使用后端 DTO 作为基础）
 */
export type UpdateThresholdConfigRequest = UpdateThresholdDto;

/**
 * 阈值测试请求（前端业务类型）
 */
export interface ThresholdTestRequest {
  equipmentId: string;
  metricType: string;
  testValues: number[];
  duration: number;
}

/**
 * 阈值测试结果（前端业务类型）
 */
export interface ThresholdTestResult {
  testId: string;
  status: 'passed' | 'failed' | 'warning';
  results: Array<{
    value: number;
    triggered: boolean;
    timeToTrigger?: number;
    severity?: ThresholdConfig.severity;
    message: string;
  }>;
  summary: {
    totalTests: number;
    triggers: number;
    averageResponseTime?: number;
  };
  recommendations: string[];
}

/**
 * 阈值配置状态接口
 *
 * 定义阈值配置功能的所有数据状态
 */
export interface ThresholdState {
  // 核心数据
  /** 阈值配置列表 */
  thresholds: ThresholdConfig[];

  /** 当前选中的阈值配置 */
  currentThreshold: ThresholdConfig | null;

  // 状态管理
  /** 是否正在加载数据 */
  loading: boolean;

  /** 错误信息 */
  error: string | null;

  /** 最后更新时间戳 */
  lastUpdate: number;

  // 筛选和排序
  /** 筛选条件 */
  filters: ThresholdConfigFilters;

  /** 排序字段 */
  sortBy: 'name' | 'severity' | 'metricType' | 'createdAt' | 'enabled';

  /** 排序方向 */
  sortOrder: 'asc' | 'desc';

  // 视图设置
  /** 视图模式 */
  viewMode: 'list' | 'grid';

  /** 选中的阈值配置ID集合 */
  selectedThresholds: Set<string>;

  // 分页
  /** 当前页码 */
  page: number;

  /** 每页大小 */
  pageSize: number;

  /** 总记录数 */
  total: number;

  /** 总页数 */
  totalPages: number;
}

/**
 * 阈值配置操作接口
 *
 * 定义阈值配置功能的所有业务操作
 */
export interface ThresholdActions {
  // ===== 标准CRUD方法（符合CRUDStoreActions接口） =====

  /**
   * 获取项目列表（标准CRUD方法别名）
   * @alias fetchThresholds
   */
  fetchItems: (params?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => Promise<ThresholdConfigPaginatedResponse>;

  /**
   * 根据ID获取单个项目（标准CRUD方法别名）
   * @alias getThreshold
   */
  fetchItemById: (id: string) => Promise<ThresholdConfig>;

  /**
   * 创建项目（标准CRUD方法别名）
   * @alias createThreshold
   */
  createItem: (data: CreateThresholdConfigRequest) => Promise<ThresholdConfig>;

  /**
   * 更新项目（标准CRUD方法别名）
   * @alias updateThreshold
   */
  updateItem: (id: string, data: UpdateThresholdConfigRequest) => Promise<ThresholdConfig>;

  /**
   * 删除项目（标准CRUD方法别名）
   * @alias deleteThreshold
   */
  deleteItem: (id: string) => Promise<void>;

  /**
   * 设置选中项（标准CRUD方法）
   */
  setSelectedItem: (item: ThresholdConfig | null) => void;

  /**
   * 设置页码（标准CRUD方法别名）
   * @alias goToPage
   */
  setPage: (page: number) => void;

  /**
   * 设置每页条数（标准CRUD方法别名）
   * @alias changePageSize
   */
  setPageSize: (pageSize: number) => void;

  /**
   * 设置排序（标准CRUD方法别名）
   * @alias setSorting
   */
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  // ===== 阈值配置操作 =====

  /**
   * 创建阈值配置
   *
   * @param config - 阈值配置创建请求
   * @returns Promise<ThresholdConfig> - 创建的阈值配置
   */
  createThreshold: (config: CreateThresholdConfigRequest) => Promise<ThresholdConfig>;

  /**
   * 更新阈值配置
   *
   * @param id - 阈值配置ID
   * @param updates - 更新内容
   * @returns Promise<ThresholdConfig> - 更新后的阈值配置
   */
  updateThreshold: (id: string, updates: UpdateThresholdConfigRequest) => Promise<ThresholdConfig>;

  /**
   * 删除阈值配置
   *
   * @param id - 阈值配置ID
   */
  deleteThreshold: (id: string) => Promise<void>;

  /**
   * 测试阈值配置
   *
   * @param request - 测试请求参数
   * @returns Promise<ThresholdTestResult> - 测试结果
   */
  testThreshold: (request: ThresholdTestRequest) => Promise<ThresholdTestResult>;

  // ===== 查询操作 =====

  /**
   * 获取阈值配置列表
   *
   * @param params - 查询参数（分页、筛选）
   * @returns Promise<ThresholdConfigPaginatedResponse>
   */
  fetchThresholds: (params?: {
    page?: number;
    pageSize?: number;
    filters?: ThresholdConfigFilters;
  }) => Promise<ThresholdConfigPaginatedResponse>;

  /**
   * 获取阈值配置列表（向后兼容别名）
   *
   * @deprecated 使用 fetchThresholds 代替
   * @param params - 查询参数（分页、筛选）
   * @returns Promise<ThresholdConfigPaginatedResponse>
   */
  getThresholds: (params?: {
    page?: number;
    pageSize?: number;
    filters?: ThresholdConfigFilters;
  }) => Promise<ThresholdConfigPaginatedResponse>;

  /**
   * 获取单个阈值配置
   *
   * @param id - 阈值配置ID
   * @returns Promise<ThresholdConfig>
   */
  getThreshold: (id: string) => Promise<ThresholdConfig>;

  // ===== 状态管理 =====

  /**
   * 设置加载状态
   *
   * @param loading - 是否加载中
   */
  setLoading: (loading: boolean) => void;

  /**
   * 设置错误信息
   *
   * @param error - 错误消息
   */
  setError: (error: string | null) => void;

  /**
   * 清除错误信息
   */
  clearError: () => void;

  /**
   * 刷新数据
   */
  refresh: () => Promise<void>;

  /**
   * 重置Store到初始状态
   */
  reset: () => void;

  // ===== 筛选和排序 =====

  /**
   * 设置筛选条件
   *
   * @param filters - 部分筛选条件
   */
  setFilters: (filters: Partial<ThresholdConfigFilters>) => void;

  /**
   * 清除筛选条件
   */
  clearFilters: () => void;

  /**
   * 设置排序规则
   *
   * @param sortBy - 排序字段
   * @param sortOrder - 排序方向
   */
  setSorting: (sortBy: ThresholdState['sortBy'], sortOrder: ThresholdState['sortOrder']) => void;

  // ===== 视图操作 =====

  /**
   * 设置视图模式
   *
   * @param mode - 视图模式（列表/网格）
   */
  setViewMode: (mode: ThresholdState['viewMode']) => void;

  /**
   * 切换阈值配置的选中状态
   *
   * @param thresholdId - 阈值配置ID
   */
  toggleThresholdSelection: (thresholdId: string) => void;

  /**
   * 全选阈值配置
   */
  selectAllThresholds: () => void;

  /**
   * 清除所有选中
   */
  clearSelection: () => void;

  // ===== 分页操作 =====

  /**
   * 跳转到指定页
   *
   * @param page - 目标页码
   */
  goToPage: (page: number) => void;

  /**
   * 下一页
   */
  goToNextPage: () => void;

  /**
   * 上一页
   */
  goToPreviousPage: () => void;

  /**
   * 改变每页大小
   *
   * @param pageSize - 新的每页大小
   */
  changePageSize: (pageSize: number) => void;
}

/**
 * 默认筛选条件
 */
const defaultFilters: ThresholdConfigFilters = {};

/**
 * 阈值配置状态管理 Store
 *
 * 使用 Zustand 实现的响应式状态管理，提供：
 * - 阈值配置的 CRUD 操作
 * - 分页、筛选和排序
 * - 视图模式和选择管理
 */
export const useThresholdStore = create<ThresholdState & ThresholdActions>((set, get) => ({
  // ===== 初始状态 =====

  // 核心数据
  thresholds: [],
  currentThreshold: null,

  // 状态管理
  loading: false,
  error: null,
  lastUpdate: 0,

  // 筛选和排序
  filters: defaultFilters,
  sortBy: 'createdAt',
  sortOrder: 'desc',

  // 视图设置
  viewMode: 'list',
  selectedThresholds: new Set<string>(),

  // 分页
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,

  // ===== Actions 实现 =====

  // --- 标准CRUD方法实现 ---

  /**
   * 获取项目列表（标准CRUD方法）
   */
  fetchItems: async (params = {}): Promise<ThresholdConfigPaginatedResponse> => {
    return await get().fetchThresholds(params);
  },

  /**
   * 根据ID获取单个项目（标准CRUD方法）
   */
  fetchItemById: async (id: string): Promise<ThresholdConfig> => {
    return await get().getThreshold(id);
  },

  /**
   * 创建项目（标准CRUD方法）
   */
  createItem: async (data: CreateThresholdConfigRequest): Promise<ThresholdConfig> => {
    return await get().createThreshold(data);
  },

  /**
   * 更新项目（标准CRUD方法）
   */
  updateItem: async (id: string, data: UpdateThresholdConfigRequest): Promise<ThresholdConfig> => {
    return await get().updateThreshold(id, data);
  },

  /**
   * 删除项目（标准CRUD方法）
   */
  deleteItem: async (id: string): Promise<void> => {
    return await get().deleteThreshold(id);
  },

  /**
   * 设置选中项（标准CRUD方法）
   */
  setSelectedItem: (item: ThresholdConfig | null) => {
    set({ currentThreshold: item });
  },

  /**
   * 设置页码（标准CRUD方法）
   */
  setPage: (page: number) => {
    get().goToPage(page);
  },

  /**
   * 设置每页条数（标准CRUD方法）
   */
  setPageSize: (pageSize: number) => {
    get().changePageSize(pageSize);
  },

  /**
   * 设置排序（标准CRUD方法）
   */
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => {
    get().setSorting(sortBy as ThresholdState['sortBy'], sortOrder);
  },

  // --- 阈值管理特有方法 ---

  /**
   * 创建阈值配置
   *
   * 直接调用后端 API 创建新的阈值配置
   */
  createThreshold: async (config: CreateThresholdConfigRequest): Promise<ThresholdConfig> => {
    set({ loading: true, error: null });

    try {
      // 直接调用后端 API：POST /api/thresholds
      const apiResponse = await Service.alarmControllerCreateThreshold(config);

      // 提取实际的数据（处理包装的响应结构 {code, message, data}）
      const newThreshold = (apiResponse as any).data || apiResponse;

      set(state => ({
        thresholds: [newThreshold, ...state.thresholds],
        total: state.total + 1,
        loading: false,
        lastUpdate: Date.now(),
      }));

      return newThreshold;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建阈值配置失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 更新阈值配置
   *
   * 直接调用后端 API 更新阈值配置
   */
  updateThreshold: async (id: string, updates: UpdateThresholdConfigRequest): Promise<ThresholdConfig> => {
    set({ loading: true, error: null });

    try {
      // 直接调用后端 API：PUT /api/thresholds/:id
      const apiResponse = await Service.alarmControllerUpdateThreshold(id, updates);

      // 提取实际的数据（处理包装的响应结构 {code, message, data}）
      const updatedThreshold = (apiResponse as any).data || apiResponse;

      set(state => ({
        thresholds: state.thresholds.map(t => t.id === id ? updatedThreshold : t),
        currentThreshold: state.currentThreshold?.id === id ? updatedThreshold : state.currentThreshold,
        loading: false,
        lastUpdate: Date.now(),
      }));

      return updatedThreshold;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新阈值配置失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 删除阈值配置
   *
   * 直接调用后端 API 删除阈值配置
   */
  deleteThreshold: async (id: string): Promise<void> => {
    set({ loading: true, error: null });

    try {
      // 直接调用后端 API：DELETE /api/thresholds/:id
      await Service.alarmControllerDeleteThreshold(id);

      set(state => {
        const newSelectedThresholds = new Set(state.selectedThresholds);
        newSelectedThresholds.delete(id);

        return {
          thresholds: state.thresholds.filter(t => t.id !== id),
          selectedThresholds: newSelectedThresholds,
          total: state.total - 1,
          loading: false,
          lastUpdate: Date.now(),
        };
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除阈值配置失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 测试阈值配置
   *
   * 注意：后端暂未提供阈值测试接口，此方法返回模拟数据
   * TODO: 等待后端实现阈值测试 API 后更新此方法
   */
  testThreshold: async (request: ThresholdTestRequest): Promise<ThresholdTestResult> => {
    try {
      // 返回模拟测试结果（后端暂无此接口）
      console.warn('阈值测试功能暂未由后端 API 提供，返回模拟数据');

      const mockResult: ThresholdTestResult = {
        testId: `test-${Date.now()}`,
        status: 'passed',
        results: request.testValues.map(value => ({
          value,
          triggered: false,
          message: '测试通过',
        })),
        summary: {
          totalTests: request.testValues.length,
          triggers: 0,
        },
        recommendations: ['阈值测试功能正在开发中'],
      };

      return mockResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '测试阈值配置失败';
      set({ error: errorMessage });
      throw error;
    }
  },

  /**
   * 获取阈值配置列表
   *
   * 直接调用后端 API 获取阈值配置列表，支持分页和筛选
   */
  fetchThresholds: async (params = {}): Promise<ThresholdConfigPaginatedResponse> => {
    // 🔍 防重复请求检查
    if (get().loading) {
      return {
        items: get().thresholds,
        total: get().total,
        page: get().page,
        pageSize: get().pageSize,
        totalPages: get().totalPages
      };
    }

    set({ loading: true, error: null });

    try {
      const state = get();

      // 构建查询参数
      const page = params.page ?? state.page;
      const pageSize = params.pageSize ?? state.pageSize;
      const filters = params.filters ?? state.filters;

      // 从筛选条件中提取后端 API 所需参数
      const equipmentId = filters.deviceId;
      // monitoringPoint 支持通过筛选条件传入
      const monitoringPoint = filters.monitoringPoint;
      // metricType 需要进行类型断言，因为后端 API 只接受特定的枚举值
      const metricType = filters.metricType as ThresholdConfig.metricType | undefined;
      // 将前端 enabled 布尔值映射到后端 ruleStatus 枚举
      const ruleStatus = filters.enabled !== undefined
        ? (filters.enabled ? ('enabled' as const) : ('disabled' as const))
        : undefined;

      // 直接调用后端 API：GET /api/thresholds
      const apiResponse = await Service.alarmControllerFindAllThresholds(
        equipmentId,
        metricType,
        monitoringPoint,
        ruleStatus,
        page,
        pageSize
      );

      // 提取实际的数据（处理包装的响应结构 {code, message, data}）
      const result = (apiResponse as any).data || apiResponse;

      // 类型转换：PaginatedResponseDto -> ThresholdConfigPaginatedResponse
      const response: ThresholdConfigPaginatedResponse = {
        items: result.items as unknown as ThresholdConfig[], // 通过 unknown 进行安全的类型转换
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };

      // 如果有 severity 筛选，在前端进行过滤（后端暂不支持）
      if (filters.severity && filters.severity.length > 0) {
        response.items = response.items.filter(threshold =>
          filters.severity!.includes(threshold.severity)
        );
        response.total = response.items.length;
        response.totalPages = Math.ceil(response.total / pageSize);
      }

      // 更新状态
      set({
        thresholds: response.items,
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
        loading: false,
        lastUpdate: Date.now(),
      });

      // 更新筛选条件
      if (params.filters !== undefined) {
        set({ filters: { ...state.filters, ...params.filters } });
      }

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取阈值配置失败';
      set({ error: errorMessage, loading: false });

      // 返回空结果以防止页面崩溃
      console.error('获取阈值配置失败:', error);
      return {
        items: [],
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        total: 0,
        totalPages: 0,
      };
    }
  },

  /**
   * 获取阈值配置列表（向后兼容别名）
   *
   * @deprecated 使用 fetchThresholds 代替
   */
  getThresholds: async (params = {}): Promise<ThresholdConfigPaginatedResponse> => {
    return await get().fetchThresholds(params);
  },

  /**
   * 获取单个阈值配置
   *
   * 直接调用后端 API 获取单个阈值配置详情
   */
  getThreshold: async (id: string): Promise<ThresholdConfig> => {
    set({ loading: true, error: null });

    try {
      // 先尝试从缓存中查找
      const cachedThreshold = get().thresholds.find(t => t.id === id);
      if (cachedThreshold) {
        set({ currentThreshold: cachedThreshold, loading: false });
        return cachedThreshold;
      }

      // 直接调用后端 API：GET /api/thresholds/:id
      const apiResponse = await Service.alarmControllerFindOneThreshold(id);

      // 提取实际的数据（处理包装的响应结构 {code, message, data}）
      const threshold = (apiResponse as any).data || apiResponse;

      set({ currentThreshold: threshold, loading: false, lastUpdate: Date.now() });
      return threshold;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取阈值配置详情失败';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  /**
   * 设置加载状态
   */
  setLoading: (loading: boolean) => {
    set({ loading });
  },

  /**
   * 设置错误信息
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * 刷新数据
   */
  refresh: async (): Promise<void> => {
    const state = get();
    await get().fetchThresholds({
      page: state.page,
      pageSize: state.pageSize,
      filters: state.filters,
    });
  },

  /**
   * 重置Store
   */
  reset: () => {
    set({
      thresholds: [],
      currentThreshold: null,
      loading: false,
      error: null,
      lastUpdate: 0,
      filters: defaultFilters,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      viewMode: 'list',
      selectedThresholds: new Set<string>(),
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    });
  },

  /**
   * 设置筛选条件
   */
  setFilters: (filters: Partial<ThresholdConfigFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
      page: 1, // 重置到第一页
    }));
  },

  /**
   * 清除筛选条件
   */
  clearFilters: () => {
    set({ filters: defaultFilters, page: 1 });
  },

  /**
   * 设置排序规则
   */
  setSorting: (sortBy: ThresholdState['sortBy'], sortOrder: ThresholdState['sortOrder']) => {
    set({ sortBy, sortOrder, page: 1 });
  },

  /**
   * 设置视图模式
   */
  setViewMode: (mode: ThresholdState['viewMode']) => {
    set({ viewMode: mode });
  },

  /**
   * 切换阈值配置的选中状态
   */
  toggleThresholdSelection: (thresholdId: string) => {
    set(state => {
      const newSelectedThresholds = new Set(state.selectedThresholds);
      if (newSelectedThresholds.has(thresholdId)) {
        newSelectedThresholds.delete(thresholdId);
      } else {
        newSelectedThresholds.add(thresholdId);
      }
      return { selectedThresholds: newSelectedThresholds };
    });
  },

  /**
   * 全选阈值配置
   */
  selectAllThresholds: () => {
    set(state => ({
      selectedThresholds: new Set(state.thresholds.map(t => t.id)),
    }));
  },

  /**
   * 清除所有选中
   */
  clearSelection: () => {
    set({ selectedThresholds: new Set<string>() });
  },

  /**
   * 跳转到指定页
   */
  goToPage: (page: number) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) {
      set({ page });
      get().fetchThresholds(); // 自动触发数据获取
    }
  },

  /**
   * 下一页
   */
  goToNextPage: () => {
    const { page, totalPages } = get();
    if (page < totalPages) {
      set({ page: page + 1 });
      get().fetchThresholds(); // 自动触发数据获取
    }
  },

  /**
   * 上一页
   */
  goToPreviousPage: () => {
    const { page } = get();
    if (page > 1) {
      set({ page: page - 1 });
      get().fetchThresholds(); // 自动触发数据获取
    }
  },

  /**
   * 改变每页大小
   */
  changePageSize: (pageSize: number) => {
    set(state => ({
      pageSize,
      page: 1,
      totalPages: Math.ceil(state.total / pageSize),
    }));
    get().fetchThresholds(); // 自动触发数据获取
  },
}));

/**
 * Threshold Store Selector 导出
 *
 * 提供常用状态的 Selector 函数，支持组件精确订阅状态片段
 */
export const useThresholdSelector = {
  /** 阈值配置列表 */
  thresholds: (state: ThresholdState & ThresholdActions) => state.thresholds,

  /** 当前阈值配置 */
  currentThreshold: (state: ThresholdState & ThresholdActions) => state.currentThreshold,

  /** 加载状态 */
  loading: (state: ThresholdState & ThresholdActions) => state.loading,

  /** 错误信息 */
  error: (state: ThresholdState & ThresholdActions) => state.error,

  /** 筛选条件 */
  filters: (state: ThresholdState & ThresholdActions) => state.filters,

  /** 分页信息 */
  pagination: (state: ThresholdState & ThresholdActions) => ({
    page: state.page,
    pageSize: state.pageSize,
    total: state.total,
    totalPages: state.totalPages,
  }),

  /** 选中的阈值配置 */
  selectedThresholds: (state: ThresholdState & ThresholdActions) => state.selectedThresholds,

  /** 视图模式 */
  viewMode: (state: ThresholdState & ThresholdActions) => state.viewMode,
};

