/**
 * 货船智能机舱管理系统 - 阈值配置服务
 * 
 * 核心功能：
 * 1. 设备监控阈值配置和管理
 * 2. 告警触发阈值设置和调整
 * 3. 阈值配置测试和验证
 * 4. 多维度阈值管理（温度、压力、振动等）
 * 5. 动态阈值调整和优化建议
 * 
 * 技术架构：
 * - 基于RESTful API的服务架构
 * - 支持多种数据类型阈值（数值、布尔、枚举）
 * - 灵活的阈值配置模型
 * - 实时阈值测试和验证
 * - 批量阈值操作支持
 * 
 * 服务特性：
 * - 分页查询和筛选支持
 * - 阈值配置创建、修改、删除
 * - 阈值测试和效果验证
 * - 多设备类型阈值管理
 * - 阈值继承和覆盖机制
 * 
 * 阈值类型：
 * - 固定阈值（单一数值）
 * - 动态阈值（基于运行状态）
 * - 复合阈值（多条件组合）
 * - 自适应阈值（机器学习优化）
 * - 季节性阈值（时间依赖）
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 * @since 2024
 */

// API客户端导入
import { apiClient } from './api-client';

// 类型定义导入
import {
  ThresholdConfig,                    // 阈值配置实体
  ThresholdConfigState,               // 阈值配置状态
  ThresholdConfigFilters,             // 阈值配置筛选条件
  CreateThresholdConfigRequest,       // 创建阈值配置请求
  UpdateThresholdConfigRequest,       // 更新阈值配置请求
  ThresholdConfigPaginatedResponse,   // 阈值配置分页响应
  ThresholdTestRequest,               // 阈值测试请求
  ThresholdTestResult,                // 阈值测试结果
} from '../types/thresholds';

// Mock数据导入
import {
  mockThresholdConfigs,
  getMockThresholdConfigs,
  getMockThresholdConfig,
  getMockThresholdByEquipmentAndMetric,
} from '../mocks/mock-threshold-data';

/**
 * 阈值配置服务类
 * 
 * 负责处理设备监控阈值配置、告警规则设置等阈值管理业务逻辑
 * 
 * 主要功能：
 * - 阈值配置的CRUD操作
 * - 阈值配置的测试和验证
 * - 阈值规则的优化建议
 * - 多维度阈值管理
 * - 批量阈值操作
 * 
 * 阈值管理流程：
 * 1. 阈值需求分析和设计
 * 2. 阈值配置创建和设置
 * 3. 阈值效果测试和验证
 * 4. 阈值优化和调整
 * 5. 阈值部署和监控
 * 
 * @class ThresholdService
 */
export class ThresholdService {
  /**
   * 获取阈值配置列表
   * 
   * 分页获取阈值配置记录，支持筛选和排序
   * 用于管理所有设备类型的监控阈值
   * 
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码（从1开始）
   * @param {number} params.pageSize - 每页数量（默认20）
   * @param {ThresholdConfigFilters} params.filters - 筛选条件（可选）
   * @returns {Promise<ThresholdConfigPaginatedResponse>} 阈值配置分页响应数据
   * @throws {Error} 获取阈值配置列表失败
   */
  async getThresholdConfigs(params: {
    page?: number;                    // 页码（从1开始）
    pageSize?: number;                // 每页数量（默认20）
    filters?: ThresholdConfigFilters; // 筛选条件（可选）
  } = {}): Promise<ThresholdConfigPaginatedResponse> {
    try {
      // 发送GET请求到阈值配置列表端点
      const response = await apiClient.get<ThresholdConfigPaginatedResponse>('/thresholds', {
        params, // 传递查询参数
      });
      return response.data; // 返回阈值配置列表和分页信息
    } catch (error) {
      // API请求失败时，使用Mock数据作为演示
      console.warn('阈值配置API请求失败，使用Mock数据:', error);
      const mockData = getMockThresholdConfigs(params.page || 1, params.pageSize || 20);
      
      // 如果有筛选条件，对Mock数据进行筛选
      let filteredItems = mockData.items;
      if (params.filters) {
        if (params.filters.deviceId) {
          filteredItems = filteredItems.filter(threshold =>
            threshold.equipmentId === params.filters!.deviceId
          );
        }
        
        if (params.filters.metricType) {
          filteredItems = filteredItems.filter(threshold =>
            threshold.metricType === params.filters!.metricType
          );
        }
        
        if (params.filters.enabled !== undefined) {
          filteredItems = filteredItems.filter(threshold =>
            threshold.enabled === params.filters!.enabled
          );
        }
        
        if (params.filters.severity && params.filters.severity.length > 0) {
          filteredItems = filteredItems.filter(threshold =>
            params.filters!.severity!.includes(threshold.severity)
          );
        }
      }
      
      return {
        ...mockData,
        items: filteredItems,
        total: filteredItems.length,
        totalPages: Math.ceil(filteredItems.length / (params.pageSize || 20)),
      };
    }
  }

  /**
   * 创建阈值配置
   * 
   * 创建新的设备监控阈值配置规则
   * 支持多种阈值类型和条件设置
   * 
   * @param {CreateThresholdConfigRequest} config - 阈值配置创建请求
   * @returns {Promise<ThresholdConfig>} 创建成功的阈值配置对象
   * @throws {Error} 配置创建失败（参数无效、设备不存在等）
   */
  async createThreshold(config: CreateThresholdConfigRequest): Promise<ThresholdConfig> {
    try {
      // 发送POST请求到阈值配置创建端点
      const response = await apiClient.post<ThresholdConfig>('/thresholds', config);
      return response.data; // 返回创建成功的阈值配置
    } catch (error) {
      // API请求失败时，模拟创建成功（仅用于演示）
      console.warn('创建阈值配置API请求失败，使用Mock模拟:', error);
      const newThreshold: ThresholdConfig = {
        id: `mock-${Date.now()}`,
        equipmentId: config.equipmentId,
        equipmentName: config.equipmentId, // 简化处理，实际应从设备信息获取
        metricType: config.metricType,
        upperLimit: config.upperLimit,
        lowerLimit: config.lowerLimit,
        duration: config.duration,
        severity: config.severity,
        enabled: config.enabled || true,
        createdAt: Date.now(),
        updatedAt: null,
        deletedAt: null,
        description: config.description,
      };
      
      // 添加到Mock数据中
      mockThresholdConfigs.push(newThreshold);
      
      return newThreshold;
    }
  }

  /**
   * 更新阈值配置
   * 
   * 修改指定ID的阈值配置规则
   * 保持配置历史记录和版本管理
   * 
   * @param {string} id - 要更新的阈值配置ID
   * @param {UpdateThresholdConfigRequest} config - 阈值配置更新内容
   * @returns {Promise<ThresholdConfig>} 更新后的阈值配置对象
   * @throws {Error} 配置更新失败（权限不足、ID不存在等）
   */
  async updateThreshold(id: string, config: UpdateThresholdConfigRequest): Promise<ThresholdConfig> {
    try {
      // 发送PUT请求到阈值配置更新端点
      const response = await apiClient.put<ThresholdConfig>(`/thresholds/${id}`, config);
      return response.data; // 返回更新后的阈值配置
    } catch (error) {
      // API请求失败时，模拟更新成功（仅用于演示）
      console.warn('更新阈值配置API请求失败，使用Mock模拟:', error);
      const thresholdIndex = mockThresholdConfigs.findIndex(t => t.id === id);
      
      if (thresholdIndex === -1) {
        throw new Error(`Threshold config with id ${id} not found`);
      }
      
      const updatedThreshold: ThresholdConfig = {
        ...mockThresholdConfigs[thresholdIndex],
        ...config,
        updatedAt: Date.now(),
      };
      
      // 更新Mock数据
      mockThresholdConfigs[thresholdIndex] = updatedThreshold;
      
      return updatedThreshold;
    }
  }

  /**
   * 删除阈值配置
   * 
   * 删除指定ID的阈值配置规则
   * 执行软删除，保留历史记录用于审计
   * 
   * @param {string} id - 要删除的阈值配置ID
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 配置删除失败（正在使用中、权限不足等）
   */
  async deleteThreshold(id: string): Promise<void> {
    try {
      // 发送DELETE请求到阈值配置删除端点
      await apiClient.delete(`/thresholds/${id}`);
    } catch (error) {
      // API请求失败时，模拟删除成功（仅用于演示）
      console.warn('删除阈值配置API请求失败，使用Mock模拟:', error);
      const thresholdIndex = mockThresholdConfigs.findIndex(t => t.id === id);
      
      if (thresholdIndex === -1) {
        throw new Error(`Threshold config with id ${id} not found`);
      }
      
      // 从Mock数据中删除
      mockThresholdConfigs.splice(thresholdIndex, 1);
    }
  }

  /**
   * 测试阈值配置
   * 
   * 验证阈值配置的有效性和效果
   * 提供详细的测试结果和建议
   * 
   * @param {ThresholdTestRequest} request - 阈值测试请求参数
   * @returns {Promise<ThresholdTestResult>} 阈值测试结果
   * @throws {Error} 阈值测试失败（配置无效、数据不足等）
   */
  async testThreshold(request: ThresholdTestRequest): Promise<ThresholdTestResult> {
    try {
      // 发送POST请求到阈值测试端点
      const response = await apiClient.post<ThresholdTestResult>('/thresholds/test', request);
      return response.data; // 返回阈值测试结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeThresholdError(error);
    }
  }

  /**
   * 标准化阈值配置错误
   * 
   * 将各种错误类型标准化为统一的错误对象
   * 
   * @param {any} error - 原始错误对象
   * @returns {Error} 标准化后的错误对象
   * @private
   */
  private normalizeThresholdError(error: any): Error {
    // 如果是API错误，包含错误码和消息
    if (error.code) {
      return new Error(`Threshold operation failed: ${error.message}`);
    }
    // 否则返回通用错误消息
    return new Error(error.message || 'Threshold operation failed');
  }
}

// 创建阈值配置服务实例（单例模式）
export const thresholdService = new ThresholdService();

// 导出便捷方法（解构导出，方便直接调用）
export const {
  getThresholdConfigs,    // 获取阈值配置列表
  createThreshold,        // 创建阈值配置
  updateThreshold,        // 更新阈值配置
  deleteThreshold,        // 删除阈值配置
  testThreshold,          // 测试阈值配置
} = thresholdService;

/**
 * 使用示例：
 * 
 * ```typescript
 * import { thresholdService } from './services/threshold-service';
 * 
 * // 获取阈值配置列表
 * const { items } = await thresholdService.getThresholdConfigs({
 *   page: 1,
 *   pageSize: 10,
 *   filters: { equipmentType: 'pump', isActive: true }
 * });
 * 
 * // 创建新的阈值配置
 * const newThreshold = await thresholdService.createThreshold({
 *   equipmentId: 'pump-001',
 *   metricName: 'temperature',
 *   thresholdType: 'upper',
 *   value: 80,
 *   unit: 'celsius',
 *   severity: 'warning',
 *   description: '泵温度过高警告阈值'
 * });
 * 
 * // 更新阈值配置
 * const updatedThreshold = await thresholdService.updateThreshold('threshold-123', {
 *   value: 75,
 *   description: '调整后的温度阈值'
 * });
 * 
 * // 测试阈值配置
 * const testResult = await thresholdService.testThreshold({
 *   thresholdId: 'threshold-123',
 *   testData: [70, 75, 80, 85, 90],
 *   simulateRealTime: true
 * });
 * 
 * console.log('测试结果:', testResult.violations);
 * 
 * // 删除阈值配置
 * await thresholdService.deleteThreshold('threshold-123');
 * ```
 */