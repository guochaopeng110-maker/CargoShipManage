// 阈值配置状态管理（对应后端ThresholdConfig实体）
// 基于货船智能机舱管理系统阈值配置管理架构

import { 
  ThresholdConfig,
  ThresholdRuleType,
  ThresholdOperator,
  ThresholdRule,
  ThresholdCondition,
  ThresholdAction,
  ThresholdTemplate,
  ThresholdHistoryRecord,
  ThresholdStatistics,
  ThresholdSuggestion,
  ThresholdConfigFilters,
  ThresholdConfigPaginatedResponse,
  CreateThresholdConfigRequest,
  UpdateThresholdConfigRequest,
  ThresholdTestRequest,
  ThresholdTestResult,
} from '../types/thresholds';
import { thresholdService } from '../services/threshold-service';
import { AlertSeverity } from '../types/alarms';

// 阈值配置状态接口
export interface ThresholdState {
  // 阈值配置相关
  thresholds: ThresholdConfig[];
  currentThreshold: ThresholdConfig | null;
  thresholdRules: ThresholdRule[];
  thresholdTemplates: ThresholdTemplate[];
  
  // 统计数据
  statistics: ThresholdStatistics | null;
  
  // 历史记录
  history: ThresholdHistoryRecord[];
  
  // 建议
  suggestions: ThresholdSuggestion[];
  
  // 状态管理
  loading: boolean;
  error: string | null;
  lastUpdate: number;
  isMonitoring: boolean;
  
  // 筛选和排序
  filters: ThresholdConfigFilters;
  sortBy: 'name' | 'severity' | 'metricType' | 'createdAt' | 'enabled';
  sortOrder: 'asc' | 'desc';
  
  // 视图设置
  viewMode: 'list' | 'grid';
  selectedThresholds: Set<string>;
  
  // 分页
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 阈值配置操作接口
export interface ThresholdActions {
  // 阈值配置操作
  createThreshold: (config: CreateThresholdConfigRequest) => Promise<ThresholdConfig>;
  updateThreshold: (id: string, updates: UpdateThresholdConfigRequest) => Promise<ThresholdConfig>;
  deleteThreshold: (id: string) => Promise<void>;
  testThreshold: (request: ThresholdTestRequest) => Promise<ThresholdTestResult>;
  
  // 查询操作
  getThresholds: (params?: { page?: number; pageSize?: number; filters?: ThresholdConfigFilters }) => Promise<ThresholdConfigPaginatedResponse>;
  getThreshold: (id: string) => Promise<ThresholdConfig>;
  
  // 状态管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  refresh: () => Promise<void>;
  
  // 筛选和排序
  setFilters: (filters: Partial<ThresholdConfigFilters>) => void;
  clearFilters: () => void;
  setSorting: (sortBy: ThresholdState['sortBy'], sortOrder: ThresholdState['sortOrder']) => void;
  
  // 视图操作
  setViewMode: (mode: ThresholdState['viewMode']) => void;
  toggleThresholdSelection: (thresholdId: string) => void;
  selectAllThresholds: () => void;
  clearSelection: () => void;
  
  // 数据管理
  clearCache: () => void;
  reset: () => void;
}

// 简化的阈值配置Store实现
class ThresholdStore implements ThresholdState, ThresholdActions {
  constructor() {
    // 绑定所有方法的this上下文
    this.createThreshold = this.createThreshold.bind(this);
    this.updateThreshold = this.updateThreshold.bind(this);
    this.deleteThreshold = this.deleteThreshold.bind(this);
    this.testThreshold = this.testThreshold.bind(this);
    this.getThresholds = this.getThresholds.bind(this);
    this.getThreshold = this.getThreshold.bind(this);
    this.setLoading = this.setLoading.bind(this);
    this.setError = this.setError.bind(this);
    this.clearError = this.clearError.bind(this);
    this.refresh = this.refresh.bind(this);
    this.setFilters = this.setFilters.bind(this);
    this.clearFilters = this.clearFilters.bind(this);
    this.setSorting = this.setSorting.bind(this);
    this.setViewMode = this.setViewMode.bind(this);
    this.toggleThresholdSelection = this.toggleThresholdSelection.bind(this);
    this.selectAllThresholds = this.selectAllThresholds.bind(this);
    this.clearSelection = this.clearSelection.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.reset = this.reset.bind(this);
  }

  // 阈值配置相关
  thresholds: ThresholdConfig[] = [];
  currentThreshold: ThresholdConfig | null = null;
  thresholdRules: ThresholdRule[] = [];
  thresholdTemplates: ThresholdTemplate[] = [];
  
  // 统计数据
  statistics: ThresholdStatistics | null = null;
  
  // 历史记录
  history: ThresholdHistoryRecord[] = [];
  
  // 建议
  suggestions: ThresholdSuggestion[] = [];
  
  // 状态管理
  loading = false;
  error: string | null = null;
  lastUpdate = 0;
  isMonitoring = false;
  
  // 筛选和排序
  filters: ThresholdConfigFilters = {};
  sortBy: ThresholdState['sortBy'] = 'createdAt';
  sortOrder: ThresholdState['sortOrder'] = 'desc';
  
  // 视图设置
  viewMode: ThresholdState['viewMode'] = 'list';
  selectedThresholds = new Set<string>();
  
  // 分页
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 0;

  // 阈值配置操作
  async createThreshold(config: CreateThresholdConfigRequest): Promise<ThresholdConfig> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const newThreshold = await thresholdService.createThreshold(config);
      
      this.thresholds = [newThreshold, ...this.thresholds];
      this.total += 1;
      this.lastUpdate = Date.now();
      
      return newThreshold;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create threshold config';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async updateThreshold(id: string, updates: UpdateThresholdConfigRequest): Promise<ThresholdConfig> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const updatedThreshold = await thresholdService.updateThreshold(id, updates);
      
      this.thresholds = this.thresholds.map(t => 
        t.id === id ? updatedThreshold : t
      );
      this.lastUpdate = Date.now();
      
      return updatedThreshold;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update threshold config';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async deleteThreshold(id: string): Promise<void> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      await thresholdService.deleteThreshold(id);
      
      this.thresholds = this.thresholds.filter(t => t.id !== id);
      this.selectedThresholds.delete(id);
      this.total -= 1;
      this.lastUpdate = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete threshold config';
      this.setError(errorMessage);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async testThreshold(request: ThresholdTestRequest): Promise<ThresholdTestResult> {
    try {
      return await thresholdService.testThreshold(request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test threshold config';
      this.setError(errorMessage);
      throw error;
    }
  }

  // 查询操作
  async getThresholds(params: any = {}): Promise<ThresholdConfigPaginatedResponse> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const result = await thresholdService.getThresholdConfigs(params);
      
      this.thresholds = result.items;
      this.page = result.page;
      this.pageSize = result.pageSize;
      this.total = result.total;
      this.totalPages = result.totalPages;
      this.lastUpdate = Date.now();
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threshold configs';
      this.setError(errorMessage);
      // 不抛出错误，允许页面继续使用Mock数据
      console.error('获取阈值配置失败:', error);
      return {
        items: [],
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        total: 0,
        totalPages: 0,
      };
    } finally {
      this.setLoading(false);
    }
  }

  async getThreshold(id: string): Promise<ThresholdConfig> {
    this.setLoading(true);
    this.setError(null);
    
    try {
      const threshold = await thresholdService.getThresholdConfigs({
        filters: { deviceId: id }
      });
      
      // 如果在列表中找到了，直接使用
      const foundThreshold = threshold.items.find(t => t.id === id);
      if (!foundThreshold) {
        throw new Error(`Threshold config with id ${id} not found`);
      }
      
      this.currentThreshold = foundThreshold;
      this.lastUpdate = Date.now();
      
      return foundThreshold;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch threshold config';
      this.setError(errorMessage);
      // 不抛出错误，允许页面继续使用Mock数据
      console.error('获取阈值配置详情失败:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  // 状态管理
  setLoading(loading: boolean): void {
    this.loading = loading;
  }

  setError(error: string | null): void {
    this.error = error;
  }

  clearError(): void {
    this.error = null;
  }

  async refresh(): Promise<void> {
    await this.getThresholds({
      page: this.page,
      pageSize: this.pageSize,
      filters: this.filters,
    });
  }

  // 筛选和排序
  setFilters(filters: Partial<ThresholdConfigFilters>): void {
    this.filters = { ...this.filters, ...filters };
    this.page = 1; // 重置到第一页
  }

  clearFilters(): void {
    this.filters = {};
    this.page = 1;
  }

  setSorting(sortBy: ThresholdState['sortBy'], sortOrder: ThresholdState['sortOrder']): void {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.page = 1;
  }

  // 视图操作
  setViewMode(mode: ThresholdState['viewMode']): void {
    this.viewMode = mode;
  }

  toggleThresholdSelection(thresholdId: string): void {
    if (this.selectedThresholds.has(thresholdId)) {
      this.selectedThresholds.delete(thresholdId);
    } else {
      this.selectedThresholds.add(thresholdId);
    }
  }

  selectAllThresholds(): void {
    this.thresholds.forEach(t => this.selectedThresholds.add(t.id));
  }

  clearSelection(): void {
    this.selectedThresholds.clear();
  }

  // 数据管理
  clearCache(): void {
    this.thresholds = [];
    this.currentThreshold = null;
    this.thresholdRules = [];
    this.thresholdTemplates = [];
    this.history = [];
    this.suggestions = [];
    this.selectedThresholds.clear();
  }

  reset(): void {
    this.thresholds = [];
    this.currentThreshold = null;
    this.thresholdRules = [];
    this.thresholdTemplates = [];
    this.statistics = null;
    this.history = [];
    this.suggestions = [];
    this.loading = false;
    this.error = null;
    this.lastUpdate = 0;
    this.isMonitoring = false;
    this.filters = {};
    this.sortBy = 'createdAt';
    this.sortOrder = 'desc';
    this.viewMode = 'list';
    this.selectedThresholds.clear();
    this.page = 1;
    this.pageSize = 10;
    this.total = 0;
    this.totalPages = 0;
  }
}

// 创建单例实例
const thresholdStore = new ThresholdStore();

// 导出Hook样式接口
export const useThresholdStore = () => thresholdStore;

// 导出便捷Hook
export const useThreshold = () => {
  const store = useThresholdStore();
  return {
    // 状态
    ...store,
    // 计算属性
    latestThreshold: store.thresholds[0] || null,
    thresholdsBySeverity: {
      [AlertSeverity.LOW]: store.thresholds.filter(t => t.severity === AlertSeverity.LOW),
      [AlertSeverity.MEDIUM]: store.thresholds.filter(t => t.severity === AlertSeverity.MEDIUM),
      [AlertSeverity.HIGH]: store.thresholds.filter(t => t.severity === AlertSeverity.HIGH),
      [AlertSeverity.CRITICAL]: store.thresholds.filter(t => t.severity === AlertSeverity.CRITICAL),
    },
    thresholdsByRuleType: {
      [ThresholdRuleType.UPPER]: store.thresholds.filter(t => t.ruleType === ThresholdRuleType.UPPER),
      [ThresholdRuleType.LOWER]: store.thresholds.filter(t => t.ruleType === ThresholdRuleType.LOWER),
      [ThresholdRuleType.RANGE]: store.thresholds.filter(t => t.ruleType === ThresholdRuleType.RANGE),
      [ThresholdRuleType.DURATION]: store.thresholds.filter(t => t.ruleType === ThresholdRuleType.DURATION),
    },
    totalThresholds: store.thresholds.length,
    enabledThresholds: store.thresholds.filter(t => t.enabled).length,
    disabledThresholds: store.thresholds.filter(t => !t.enabled).length,
    selectedThresholdsCount: store.selectedThresholds.size,
    hasNextPage: store.page < store.totalPages,
    hasPreviousPage: store.page > 1,
  };
};

export default useThresholdStore;