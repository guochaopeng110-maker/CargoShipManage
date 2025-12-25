/**
 * 货船智能机舱管理系统 - 设备状态管理
 *
 * 职责：
 * 1. 管理设备列表、详情和概览的全局状态。
 * 2. 封装设备增删改查的 API 调用。
 *
 * 架构：
 * - State: 纯数据状态 (items, selectedEquipment, filters...)
 * - Actions: 业务逻辑 (fetchEquipmentList, createEquipment...)
 * - 100% 使用后端生成的 API 类型，无前端映射逻辑
 *
 * @module stores/equipment-store
 */

import { create } from 'zustand';
// 从 API 客户端导入设备相关类型和服务（完全对齐后端接口）
import {
  Equipment,
  CreateEquipmentDto,
  UpdateEquipmentDto,
  Service,
  MonitoringPoint,
} from '@/services/api';

// ==========================================
// 筛选条件接口（前端使用）
// ==========================================

// 设备筛选条件接口
export interface EquipmentFilters {
  name?: string;          // 设备名称筛选（模糊匹配）
  model?: string;         // 设备型号筛选（精确或模糊匹配）
  location?: string;      // 设备位置筛选
  status?: Equipment.status; // 设备状态筛选（使用后端枚举）
  searchTerm?: string;    // 搜索关键词（模糊匹配设备名称、型号、位置等）
}

// 设备统计概览（后端 API 实际返回的类型）
export interface EquipmentStatistics {
  normal?: number;   // 正常状态设备数量
  warning?: number;  // 告警状态设备数量
  fault?: number;    // 故障状态设备数量
  offline?: number;  // 离线状态设备数量
  total?: number;    // 设备总数
}

// ==========================================
// State 定义
// ==========================================
interface EquipmentStoreState {
  /** 设备列表 */
  items: Equipment[];

  /** 当前选中的设备 */
  selectedEquipment: Equipment | null;

  /** 加载状态 */
  loading: boolean;

  /** 错误信息 */
  error: string | null;

  /** 总数 */
  total: number;

  /** 当前页码 */
  page: number;

  /** 每页数量 */
  pageSize: number;

  /** 总页数 */
  totalPages: number;

  /** 筛选条件 */
  filters: EquipmentFilters;

  /** 排序字段 */
  sortBy?: string;

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';

  /** 设备概览统计（使用后端 API 实际返回的类型） */
  overview: EquipmentStatistics | null;

  /** 当前选中设备的监测点列表 */
  monitoringPoints: MonitoringPoint[];
}

// ==========================================
// Actions 定义
// ==========================================
interface EquipmentStoreActions {
  /**
   * 获取设备列表
   * @param params 可选参数，不传则使用当前 State 中的分页和筛选
   */
  fetchEquipmentList: (params?: { page?: number; pageSize?: number; filters?: EquipmentFilters; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => Promise<any>;

  /**
   * 确保设备列表已加载（智能缓存版）
   * 如果当前已经有缓存数据，则直接返回，不再发起网络请求。
   */
  ensureItemsLoaded: (params?: { page?: number; pageSize?: number; filters?: EquipmentFilters }) => Promise<any>;

  /** 获取设备详情 */
  fetchEquipmentDetail: (equipmentId: string) => Promise<Equipment>;

  /**
   * 根据ID获取设备（标准CRUD方法别名）
   * @alias fetchEquipmentDetail
   */
  fetchItemById: (id: string) => Promise<Equipment>;

  /**
   * 创建设备
   * @alias createItem (标准CRUD方法)
   */
  createEquipment: (equipmentData: CreateEquipmentDto) => Promise<Equipment>;

  /** 创建设备（标准CRUD方法别名） */
  createItem: (data: CreateEquipmentDto) => Promise<Equipment>;

  /**
   * 更新设备
   * @alias updateItem (标准CRUD方法)
   */
  updateEquipment: (equipmentId: string, equipmentData: UpdateEquipmentDto) => Promise<Equipment>;

  /** 更新设备（标准CRUD方法别名） */
  updateItem: (id: string, data: UpdateEquipmentDto) => Promise<Equipment>;

  /**
   * 删除设备
   * @alias deleteItem (标准CRUD方法)
   */
  deleteEquipment: (equipmentId: string) => Promise<void>;

  /** 删除设备（标准CRUD方法别名） */
  deleteItem: (id: string) => Promise<void>;

  /** 恢复设备 */
  restoreEquipment: (equipmentId: string) => Promise<Equipment>;

  /** 获取设备概览 */
  fetchEquipmentOverview: () => Promise<EquipmentStatistics | null>;

  /** 更新设备状态 */
  updateEquipmentStatus: (equipmentId: string, status: Equipment.status) => Promise<Equipment>;

  /** 获取设备监测点列表 */
  fetchMonitoringPoints: (equipmentId: string) => Promise<MonitoringPoint[]>;

  /**
   * 设置选中设备
   * @alias setSelectedItem (标准CRUD方法)
   */
  setSelectedEquipment: (equipment: Equipment | null) => void;

  /** 设置选中项（标准CRUD方法别名） */
  setSelectedItem: (item: Equipment | null) => void;

  /** 设置页码 (自动触发获取列表) */
  setPage: (page: number) => void;

  /** 设置页面大小 (自动触发获取列表) */
  setPageSize: (pageSize: number) => void;

  /** 设置筛选条件 (自动触发获取列表) */
  setFilters: (filters: EquipmentFilters, merge?: boolean) => void;

  /** 设置排序配置 (自动触发获取列表) */
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  /** 清除错误 */
  clearError: () => void;

  /** 重置Store到初始状态 */
  reset: () => void;
}

// 合并类型
export type EquipmentStore = EquipmentStoreState & EquipmentStoreActions;

/**
 * 设备 Store
 */
export const useEquipmentStore = create<EquipmentStore>((set, get) => ({
  // --- 初始 State ---
  items: [],
  selectedEquipment: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  filters: {},
  sortBy: undefined,
  sortOrder: undefined,
  overview: null,
  monitoringPoints: [],

  // --- Actions 实现 ---

  fetchEquipmentList: async (params) => {
    // 获取当前状态
    const state = get();

    // 🔍 防重复请求检查 - 已禁用，解决 App.tsx 和 Dashboard 同时请求导致的竞争问题
    // if (state.loading) {
    //   console.log('设备API请求被阻止 - 已有请求在进行中');
    //   return {
    //     items: state.items,
    //     total: state.total,
    //     page: state.page,
    //     pageSize: state.pageSize,
    //     totalPages: state.totalPages
    //   };
    // }

    // 准备参数: 优先使用传入参数，否则使用 State 中的参数
    const requestPage = params?.page ?? state.page;
    const requestPageSize = params?.pageSize ?? state.pageSize;
    const requestFilters = params?.filters ?? state.filters;
    const requestSortBy = params?.sortBy ?? state.sortBy;
    const requestSortOrder = params?.sortOrder ?? state.sortOrder;

    console.log('设备API请求 - 页码:', requestPage, '筛选:', requestFilters);

    set({ loading: true, error: null });

    try {
      // 调用后端 API：equipmentControllerFindAll
      const response = await Service.equipmentControllerFindAll(
        requestPage,
        requestPageSize,
        undefined, // deviceType (暂不使用)
        requestFilters.status, // 直接使用后端枚举值
        requestFilters.searchTerm || requestFilters.name // keyword 参数
      );

      // 解析响应结构：兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const items = (result.items as Equipment[]) || [];
      const total = result.total || 0;
      const page = result.page || requestPage;
      const pageSize = result.pageSize || requestPageSize;
      const totalPages = result.totalPages || Math.ceil(total / pageSize);

      console.log('设备API响应 - 数据条数:', items.length, '总数:', total);
      console.log('设备数据更新完成 - 设备数:', items.length, '总数:', total);

      // 计算总页数 (if not provided by backend)
      // const totalPages = Math.ceil(total / requestPageSize);

      // 更新 State
      const newState = {
        items,
        total,
        page,
        pageSize,
        totalPages,
        filters: requestFilters,
        sortBy: requestSortBy,
        sortOrder: requestSortOrder,
        loading: false,
        error: null
      };

      set(newState);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '设备列表API请求失败';
      console.error('设备列表API请求失败:', error);
      console.log('设备API错误 -', errorMessage);

      // 返回空结果（不再使用Mock数据回退）
      const emptyResponse = {
        items: [],
        total: 0,
        page: requestPage,
        pageSize: requestPageSize,
        totalPages: 0
      };
      set({
        items: [],
        total: 0,
        page: requestPage,
        pageSize: requestPageSize,
        totalPages: 0,
        filters: requestFilters,
        sortBy: requestSortBy,
        sortOrder: requestSortOrder,
        loading: false,
        error: errorMessage // 设置错误信息供UI展示
      });
      return emptyResponse;
    }
  },

  ensureItemsLoaded: async (params) => {
    const state = get();
    // 检查是否已经有数据且没有正在加载
    if (state.items.length > 0 && !state.loading) {
      console.log('设备列表已存在，跳过冗余请求');
      return {
        items: state.items,
        total: state.total,
        page: state.page,
        pageSize: state.pageSize,
        totalPages: state.totalPages
      };
    }
    // 否则执行正常获取逻辑
    return get().fetchEquipmentList(params);
  },

  fetchEquipmentDetail: async (equipmentId: string) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：equipmentControllerFindOne
      const response = await Service.equipmentControllerFindOne(equipmentId);
      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;

      // 直接使用后端返回的数据，无需映射
      set({
        selectedEquipment: result,
        loading: false,
        error: null
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取设备详情失败';
      console.error('设备详情API请求失败:', error);

      set({
        loading: false,
        error: errorMessage
      });

      throw error;
    }
  },

  // 标准CRUD方法：根据ID获取单个项目
  fetchItemById: async (id: string) => {
    return await get().fetchEquipmentDetail(id);
  },

  createEquipment: async (equipmentData) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：equipmentControllerCreate
      const response = await Service.equipmentControllerCreate(equipmentData);
      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;

      const state = get();
      set({
        items: [result, ...state.items],
        total: state.total + 1,
        loading: false,
        error: null
      });
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '创建设备失败'
      });
      throw error;
    }
  },

  // 标准CRUD方法：创建项目（别名）
  createItem: async (data) => {
    return get().createEquipment(data);
  },

  updateEquipment: async (equipmentId, equipmentData) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：equipmentControllerUpdate
      const response = await Service.equipmentControllerUpdate(equipmentId, equipmentData);
      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;

      const state = get();

      set({
        items: state.items.map(item => item.id === equipmentId ? result : item),
        selectedEquipment: state.selectedEquipment?.id === equipmentId ? result : state.selectedEquipment,
        loading: false,
        error: null
      });
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '更新设备失败'
      });
      throw error;
    }
  },

  // 标准CRUD方法：更新项目（别名）
  updateItem: async (id, data) => {
    return get().updateEquipment(id, data);
  },

  deleteEquipment: async (equipmentId) => {
    // 乐观更新：先更新UI
    const state = get();
    const originalItems = [...state.items];
    const originalTotal = state.total;

    // 立即从UI中移除
    set({
      items: state.items.filter(item => item.id !== equipmentId),
      total: state.total - 1,
      selectedEquipment: state.selectedEquipment?.id === equipmentId ? null : state.selectedEquipment,
    });

    try {
      // 调用后端 API：equipmentControllerRemove
      await Service.equipmentControllerRemove(equipmentId);
      set({ error: null });
    } catch (error) {
      // 失败时回滚
      set({
        items: originalItems,
        total: originalTotal,
        error: error instanceof Error ? error.message : '删除设备失败'
      });
      throw error;
    }
  },

  // 标准CRUD方法：删除项目（别名）
  deleteItem: async (id) => {
    return get().deleteEquipment(id);
  },

  restoreEquipment: async (equipmentId) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：equipmentControllerRestore
      const response = await Service.equipmentControllerRestore(equipmentId);
      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;

      const state = get();

      set({
        items: [result, ...state.items],
        total: state.total + 1,
        selectedEquipment: state.selectedEquipment?.id === equipmentId ? result : state.selectedEquipment,
        loading: false,
        error: null
      });
      return result;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '恢复设备失败'
      });
      throw error;
    }
  },

  fetchEquipmentOverview: async () => {
    try {
      const response = await Service.equipmentControllerGetStatistics();
      // 兼容处理可能的 .data 包装
      const stats = (response as any).data || response;

      // 直接使用后端返回的 EquipmentOverviewDto 类型
      set({ overview: stats });
      return stats;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取设备概览失败';
      console.error('获取设备概览失败:', error);

      // 返回空概览数据
      const emptyOverview: EquipmentStatistics = {
        normal: 0,
        warning: 0,
        fault: 0,
        offline: 0,
        total: 0,
      };

      set({
        overview: emptyOverview,
        error: errorMessage
      });
      return emptyOverview;
    }
  },

  updateEquipmentStatus: async (equipmentId, status) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：equipmentControllerUpdateStatus
      const response = await Service.equipmentControllerUpdateStatus(equipmentId, {
        status,
      });

      // 提取实际的设备数据（处理包装的响应结构 {code, message, data}）
      const updated = (response as any).data || response;

      const state = get();

      // 合并返回的状态到原始对象，保持其他字段不变
      const newItems = state.items.map(item =>
        item.id === equipmentId ? { ...item, ...updated } : item
      );
      set({ items: newItems, loading: false, error: null });

      return updated;
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '更新设备状态失败'
      });
      throw error;
    }
  },

  fetchMonitoringPoints: async (equipmentId) => {
    set({ loading: true, error: null });
    try {
      // 调用后端 API：equipmentControllerGetMonitoringPoints
      // 默认获取第一页，每页100条（足够覆盖单个设备的监测点）
      const response = await Service.equipmentControllerGetMonitoringPoints(
        equipmentId,
        1,
        100
      );

      // 兼容处理可能的 .data 包装
      const result = (response as any).data || response;
      const items = (result.items as MonitoringPoint[]) || [];

      set({
        monitoringPoints: items,
        loading: false,
        error: null
      });
      return items;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取监测点列表失败';
      console.error('获取监测点列表失败:', error);

      set({
        monitoringPoints: [],
        loading: false,
        error: errorMessage
      });
      throw error;
    }
  },

  setSelectedEquipment: (equipment) => {
    set({ selectedEquipment: equipment });
  },

  // 标准CRUD方法：设置选中项（别名）
  setSelectedItem: (item) => {
    get().setSelectedEquipment(item);
  },

  setPage: (page) => {
    set({ page });
    get().fetchEquipmentList();
  },

  setPageSize: (pageSize) => {
    set({ pageSize, page: 1 });
    get().fetchEquipmentList();
  },

  setFilters: (filters, merge = false) => {
    const newFilters = merge ? { ...get().filters, ...filters } : filters;
    set({ filters: newFilters, page: 1 });
    get().fetchEquipmentList();
  },

  // 标准CRUD方法：设置排序配置
  setSort: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder });
    get().fetchEquipmentList();
  },

  clearError: () => {
    set({ error: null });
  },

  // 标准CRUD方法：重置Store
  reset: () => {
    set({
      items: [],
      selectedEquipment: null,
      loading: false,
      error: null,
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      filters: {},
      sortBy: undefined,
      sortOrder: undefined,
      overview: null,
      monitoringPoints: [],
    });
  },
}));

// ==========================================
// Selectors
// ==========================================
export const selectEquipmentList = (state: EquipmentStore) => state.items;
export const selectSelectedEquipment = (state: EquipmentStore) => state.selectedEquipment;
export const selectEquipmentLoading = (state: EquipmentStore) => state.loading;
export const selectEquipmentError = (state: EquipmentStore) => state.error;
export const selectMonitoringPoints = (state: EquipmentStore) => state.monitoringPoints;

// ==========================================
// 导出后端类型供其他模块使用
// ==========================================
export { Equipment, MonitoringPoint };
export type { CreateEquipmentDto, UpdateEquipmentDto };
