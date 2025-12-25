// CRUD Store标准接口定义
// 为所有CRUD管理模块的Store提供统一的结构和操作规范
//
// 功能说明：
// - 定义标准的CRUD Store状态结构
// - 定义标准的CRUD Store操作接口
// - 支持泛型参数适配不同的数据模型
// - 确保各个管理模块Store的一致性

/**
 * 通用CRUD Store状态接口
 *
 * 定义所有CRUD Store的标准状态结构
 * 包含数据列表、分页、筛选、排序等通用状态
 *
 * @template T 数据实体类型
 */
export interface CRUDStoreState<T> {
  // === 数据列表 ===
  /** 数据项列表 */
  items: T[];

  // === 分页信息 ===
  /** 数据总条数 */
  total: number;

  /** 当前页码（从1开始） */
  page: number;

  /** 每页显示条数 */
  pageSize: number;

  /** 总页数 */
  totalPages: number;

  // === 状态标识 ===
  /** 加载状态标识 */
  loading: boolean;

  /** 错误信息（null表示无错误） */
  error: string | null;

  // === 筛选和排序 ===
  /** 筛选条件对象（键值对形式） */
  filters: Record<string, any>;

  /** 当前排序字段 */
  sortBy?: string;

  /** 当前排序方向 */
  sortOrder?: 'asc' | 'desc';

  // === 当前选中项 ===
  /** 当前选中的数据项（用于编辑、查看详情等） */
  selectedItem: T | null;
}

/**
 * 通用CRUD Store操作接口
 *
 * 定义所有CRUD Store的标准操作方法
 * 包含增删改查、分页、筛选等通用操作
 *
 * @template T 数据实体类型
 * @template CreateDTO 创建数据传输对象类型
 * @template UpdateDTO 更新数据传输对象类型
 */
export interface CRUDStoreActions<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  // === 查询操作 ===
  /**
   * 获取数据列表
   *
   * 支持分页、筛选、排序等参数
   *
   * @param params 查询参数对象
   * @param params.page 页码
   * @param params.pageSize 每页条数
   * @param params.filters 筛选条件
   * @param params.sortBy 排序字段
   * @param params.sortOrder 排序方向
   * @returns Promise，成功时无返回值
   */
  fetchItems: (params?: {
    page?: number;
    pageSize?: number;
    filters?: Record<string, any>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => Promise<void>;

  /**
   * 根据ID获取单个数据项
   *
   * @param id 数据项的唯一标识符
   * @returns Promise，成功时返回数据项
   */
  fetchItemById: (id: string) => Promise<T>;

  // === CRUD操作 ===
  /**
   * 创建新数据项
   *
   * @param data 创建数据传输对象
   * @returns Promise，成功时返回创建的数据项
   */
  createItem: (data: CreateDTO) => Promise<T>;

  /**
   * 更新数据项
   *
   * @param id 数据项的唯一标识符
   * @param data 更新数据传输对象
   * @returns Promise，成功时返回更新后的数据项
   */
  updateItem: (id: string, data: UpdateDTO) => Promise<T>;

  /**
   * 删除数据项
   *
   * 建议使用乐观更新策略：先更新UI，再调用API
   *
   * @param id 数据项的唯一标识符
   * @returns Promise，成功时无返回值
   */
  deleteItem: (id: string) => Promise<void>;

  // === 状态管理 ===
  /**
   * 设置当前选中的数据项
   *
   * @param item 数据项或null（清除选中）
   */
  setSelectedItem: (item: T | null) => void;

  /**
   * 设置当前页码
   *
   * @param page 新的页码
   */
  setPage: (page: number) => void;

  /**
   * 设置每页条数
   *
   * @param pageSize 新的每页条数
   */
  setPageSize: (pageSize: number) => void;

  /**
   * 设置筛选条件
   *
   * @param filters 筛选条件对象
   * @param merge 是否与现有筛选条件合并（默认true）
   */
  setFilters: (filters: Record<string, any>, merge?: boolean) => void;

  /**
   * 设置排序配置
   *
   * @param sortBy 排序字段
   * @param sortOrder 排序方向
   */
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;

  /**
   * 清除错误信息
   */
  clearError: () => void;

  /**
   * 重置Store到初始状态
   */
  reset: () => void;
}

/**
 * 完整的CRUD Store接口
 *
 * 组合状态和操作，形成完整的Store类型
 *
 * @template T 数据实体类型
 * @template CreateDTO 创建数据传输对象类型
 * @template UpdateDTO 更新数据传输对象类型
 */
export type CRUDStore<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> =
  CRUDStoreState<T> & CRUDStoreActions<T, CreateDTO, UpdateDTO>;

/**
 * 分页查询参数接口
 *
 * 定义通用的分页查询参数结构
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page?: number;

  /** 每页条数 */
  pageSize?: number;

  /** 搜索关键词 */
  search?: string;

  /** 排序字段 */
  sortBy?: string;

  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';

  /** 其他筛选条件 */
  [key: string]: any;
}

/**
 * 分页响应接口
 *
 * 定义通用的分页响应数据结构
 *
 * @template T 数据项类型
 */
export interface PaginatedResponse<T> {
  /** 数据项列表 */
  items: T[];

  /** 数据总条数 */
  total: number;

  /** 当前页码 */
  page: number;

  /** 每页条数 */
  pageSize: number;

  /** 总页数 */
  totalPages: number;
}

/**
 * Store初始状态工厂函数
 *
 * 创建符合CRUDStoreState接口的初始状态对象
 * 可用于各个具体Store的初始化
 *
 * @template T 数据实体类型
 * @param overrides 需要覆盖的默认值
 * @returns 初始状态对象
 */
export function createInitialCRUDState<T>(
  overrides?: Partial<CRUDStoreState<T>>
): CRUDStoreState<T> {
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
    loading: false,
    error: null,
    filters: {},
    sortBy: undefined,
    sortOrder: undefined,
    selectedItem: null,
    ...overrides,
  };
}

/**
 * API错误处理辅助函数
 *
 * 统一处理API错误，提取错误信息
 *
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown, defaultMessage: string = '操作失败'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

/**
 * 乐观更新辅助类型
 *
 * 用于在删除操作时保存原始状态，以便回滚
 */
export interface OptimisticUpdateSnapshot<T> {
  /** 原始数据列表 */
  items: T[];

  /** 原始数据总数 */
  total: number;
}
