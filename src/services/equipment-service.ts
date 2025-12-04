/**
 * 货船智能机舱管理系统 - 设备管理服务
 * 
 * 核心功能：
 * 1. 设备信息管理（增删改查）
 * 2. 设备状态监控和更新
 * 3. 设备维护信息管理
 * 4. 设备历史记录查询
 * 5. 批量设备操作支持
 * 6. 设备搜索和筛选
 * 7. 设备健康评估
 * 8. 设备告警统计分析
 * 9. 设备性能指标监控
 * 10. 设备数据导出
 * 
 * 技术架构：
 * - 基于RESTful API的服务架构
 * - 分页查询和筛选优化
 * - 批量操作和事务处理
 * - 实时状态更新机制
 * - 多格式数据导出支持
 * 
 * 服务特性：
 * - 设备信息完整性验证
 * - 设备ID唯一性检查
 * - 设备状态实时同步
 * - 维护计划和历史跟踪
 * - 健康评分算法支持
 * - 告警关联分析
 * - 性能指标统计分析
 * 
 * 设备管理维度：
 * - 基础信息：设备ID、名称、型号、类型、位置
 * - 技术参数：规格、功率、制造商、安装日期
 * - 状态监控：运行状态、健康状态、告警状态
 * - 维护信息：维护计划、维护记录、保养周期
 * - 历史记录：操作历史、告警历史、性能历史
 * - 关联数据：传感器、控制器、报警器
 * 
 * 设备状态类型：
 * - 运行中（Running）
 * - 维护中（Maintenance）
 * - 停机（Stopped）
 * - 故障（Fault）
 * - 离线（Offline）
 * - 待维护（Pending Maintenance）
 * 
 * 健康评分级别：
 * - 优秀（Excellent）：90-100分
 * - 良好（Good）：70-89分
 * - 一般（Fair）：50-69分
 * - 较差（Poor）：0-49分
 * 
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 * @since 2024
 */

// API客户端导入
import { apiClient } from './api-client';

// 设备相关类型导入
import {
  Equipment,                      // 设备实体
  EquipmentState,                 // 设备状态枚举
  EquipmentFilters,               // 设备筛选条件
  EquipmentOverview,              // 设备概览信息
  CreateEquipmentRequest,         // 创建设备请求
  UpdateEquipmentRequest,         // 更新设备请求
  EquipmentListParams,            // 设备列表查询参数
  EquipmentPaginatedResponse,     // 设备分页响应
  EquipmentDetailResponse,        // 设备详情响应
  EquipmentMaintenanceInfo,       // 设备维护信息
  EquipmentHistoryRecord,         // 设备历史记录
  EquipmentStatus,                // 设备状态类型
  mapApiStatusToFrontend,         // 后端API状态到前端状态的映射函数
  mapFrontendStatusToApi,       // 前端状态到后端API状态的映射函数
} from '../types/equipment';

// Mock数据导入
import {
  mockEquipmentOverview,
  getMockEquipmentList,
  getMockEquipmentDetail,
  getMockEquipmentTypes,
  getMockEquipmentLocations,
} from '../mocks/mock-equipment-data';

/**
 * 设备管理服务类
 * 
 * 负责处理设备信息管理、状态监控、维护管理等设备相关业务逻辑
 * 
 * 主要功能：
 * - 设备信息的CRUD操作
 * - 设备状态管理和监控
 * - 设备维护信息和历史记录
 * - 批量设备操作处理
 * - 设备搜索和数据导出
 * - 设备健康评估和分析
 * - 设备告警统计和关联分析
 * 
 * 设备管理流程：
 * 1. 设备注册和信息录入
 * 2. 设备状态初始化和监控
 * 3. 维护计划制定和执行
 * 4. 设备运行状态跟踪
 * 5. 告警处理和问题解决
 * 6. 设备性能分析和优化
 * 7. 设备退役和记录归档
 * 
 * 数据处理：
 * - 设备信息验证和去重
 * - 状态变更实时同步
 * - 维护记录自动更新
 * - 历史数据查询优化
 * - 批量操作事务处理
 * 
 * @class EquipmentService
 */
export class EquipmentService {
  /**
   * 获取设备列表
   * 
   * 分页获取设备信息列表，支持筛选和排序
   * 用于设备管理页面展示和搜索
   * 
   * @param {EquipmentListParams} params - 设备列表查询参数（可选）
   * @returns {Promise<EquipmentPaginatedResponse>} 设备分页响应数据
   * @throws {Error} 获取设备列表失败
   */
  async getEquipmentList(params: EquipmentListParams = {}): Promise<EquipmentPaginatedResponse> {
    try {
      // 发送GET请求到设备列表端点
      const response = await apiClient.get<EquipmentPaginatedResponse>('/equipment', {
        params, // 传递查询参数
      });
      
      // 修复：映射后端设备状态到前端状态枚举
      // 后端返回的状态值：normal, warning, fault, offline
      // 前端需要的状态值：running, maintenance, disabled, deleted
      const mappedItems = response.data.items.map(equipment => ({
        ...equipment,
        status: mapApiStatusToFrontend(equipment.status)
      }));
      
      // 返回映射后的设备列表和分页信息
      return {
        ...response.data,
        items: mappedItems
      };
    } catch (error) {
      // API请求失败时，使用Mock数据作为演示
      console.warn('设备列表API请求失败，使用Mock数据:', error);
      const mockData = getMockEquipmentList(params.page || 1, params.pageSize || 20);
      
      // 如果有筛选条件，对Mock数据进行筛选
      let filteredItems = mockData.items;
      if (params.search) {
        const searchTerm = params.search.toLowerCase();
        filteredItems = filteredItems.filter(equipment =>
          equipment.deviceId.toLowerCase().includes(searchTerm) ||
          equipment.deviceName.toLowerCase().includes(searchTerm) ||
          equipment.location?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (params.deviceType) {
        filteredItems = filteredItems.filter(equipment =>
          equipment.deviceType === params.deviceType
        );
      }
      
      if (params.status) {
        filteredItems = filteredItems.filter(equipment =>
          equipment.status === params.status
        );
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
   * 获取设备详情
   * 
   * 根据设备ID获取单个设备的完整信息
   * 包括基础信息、维护信息、历史记录等
   * 
   * @param {string} equipmentId - 设备ID
   * @returns {Promise<EquipmentDetailResponse>} 设备详情响应对象
   * @throws {Error} 设备不存在或获取详情失败
   */
  async getEquipmentDetail(equipmentId: string): Promise<EquipmentDetailResponse> {
    try {
      // 发送GET请求到设备详情端点
      const response = await apiClient.get<EquipmentDetailResponse>(`/equipment/${equipmentId}`);
      
      // 修复：映射后端设备状态到前端状态枚举
      const mappedEquipment = {
        ...response.data,
        status: mapApiStatusToFrontend(response.data.status)
      };
      
      return mappedEquipment; // 返回映射后的设备详情
    } catch (error) {
      // API请求失败时，使用Mock数据作为演示
      console.warn('设备详情API请求失败，使用Mock数据:', error);
      const mockEquipment = getMockEquipmentDetail(equipmentId);
      
      if (!mockEquipment) {
        throw this.normalizeEquipmentError(error);
      }
      
      // 将Mock设备数据转换为设备详情格式
      return {
        ...mockEquipment,
        manufacturer: mockEquipment.manufacturer || '未知制造商',
        model: mockEquipment.model || '未知型号',
        installationDate: mockEquipment.installationDate || mockEquipment.createdAt,
        lastMaintenanceDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7天前
        nextMaintenanceDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天后
        warrantyExpiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1年后
        specifications: [
          { name: '功率', value: '100kW', unit: 'kW', category: '电气参数' },
          { name: '电压', value: '400V', unit: 'V', category: '电气参数' },
          { name: '电流', value: '250A', unit: 'A', category: '电气参数' },
          { name: '频率', value: '50Hz', unit: 'Hz', category: '电气参数' },
        ],
        location: {
          zone: mockEquipment.location || '未设置',
          floor: '主甲板',
          room: '机舱',
          coordinates: { x: 0, y: 0, z: 0 }
        }
      };
    }
  }

  /**
   * 创建设备
   * 
   * 创建新的设备记录并初始化相关信息
   * 包括设备信息、维护计划、关联设置等
   * 
   * @param {CreateEquipmentRequest} equipmentData - 设备创建数据
   * @returns {Promise<Equipment>} 创建成功的设备对象
   * @throws {Error} 设备创建失败（设备ID重复、数据无效等）
   */
  async createEquipment(equipmentData: CreateEquipmentRequest): Promise<Equipment> {
    try {
      // 发送POST请求到设备创建端点
      const response = await apiClient.post<Equipment>('/equipment', equipmentData);
      
      // 修复：映射后端设备状态到前端状态枚举
      const mappedEquipment = {
        ...response.data,
        status: mapApiStatusToFrontend(response.data.status)
      };
      
      return mappedEquipment; // 返回映射后的设备信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 更新设备信息
   * 
   * 修改指定设备的详细信息
   * 支持部分更新和完整更新
   * 
   * @param {string} equipmentId - 设备ID
   * @param {UpdateEquipmentRequest} equipmentData - 设备更新数据
   * @returns {Promise<Equipment>} 更新后的设备对象
   * @throws {Error} 设备更新失败（权限不足、设备不存在等）
   */
  async updateEquipment(equipmentId: string, equipmentData: UpdateEquipmentRequest): Promise<Equipment> {
    try {
      // 修复：如果更新数据中包含状态，需要映射为后端状态值
      const mappedData = {
        ...equipmentData,
        ...(equipmentData.status && { status: mapFrontendStatusToApi(equipmentData.status) })
      };
      
      // 发送PUT请求到设备更新端点
      const response = await apiClient.put<Equipment>(`/equipment/${equipmentId}`, mappedData);
      
      // 修复：映射返回的设备状态到前端状态枚举
      const mappedEquipment = {
        ...response.data,
        status: mapApiStatusToFrontend(response.data.status)
      };
      
      return mappedEquipment; // 返回映射后的设备信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 删除设备（软删除）
   * 
   * 将设备标记为已删除，保留历史记录用于审计
   * 实际数据不会从数据库中物理删除
   * 
   * @param {string} equipmentId - 要删除的设备ID
   * @returns {Promise<void>} 无返回值
   * @throws {Error} 设备删除失败（正在使用中、权限不足等）
   */
  async deleteEquipment(equipmentId: string): Promise<void> {
    try {
      // 发送DELETE请求到设备删除端点
      await apiClient.delete(`/equipment/${equipmentId}`);
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备状态概览
   *
   * 获取所有设备的整体状态统计信息
   * 用于仪表盘和状态监控
   *
   * @returns {Promise<EquipmentOverview>} 设备概览信息对象
   * @throws {Error} 获取设备概览失败
   */
  async getEquipmentOverview(): Promise<EquipmentOverview> {
    try {
      // 修复：发送GET请求到设备统计端点（与后端API文档一致）
      // 后端API文档中统计接口为：GET /equipment/statistics
      const response = await apiClient.get<any>('/equipment/statistics');
      
      // 修复：映射后端统计数据到前端兼容格式
      // 后端返回：{ total, normal, warning, fault, offline }
      // 前端需要：{ totalCount, runningCount, maintenanceCount, disabledCount, ... }
      const backendStats = response.data;
      
      const mappedOverview: EquipmentOverview = {
        // 后端字段（直接使用）
        total: backendStats.total,
        normal: backendStats.normal,
        warning: backendStats.warning,
        fault: backendStats.fault,
        offline: backendStats.offline,
        
        // 前端兼容字段（映射计算）
        totalCount: backendStats.total,
        runningCount: backendStats.normal,           // normal -> running
        maintenanceCount: (backendStats.warning || 0) + (backendStats.fault || 0), // warning + fault -> maintenance
        disabledCount: backendStats.offline,        // offline -> disabled
        abnormalCount: (backendStats.warning || 0) + (backendStats.fault || 0), // warning + fault -> abnormal
      };
      
      return mappedOverview; // 返回映射后的设备概览信息
    } catch (error) {
      // API请求失败时，使用Mock数据作为演示
      console.warn('设备概览API请求失败，使用Mock数据:', error);
      return mockEquipmentOverview;
    }
  }

  /**
   * 更新设备状态
   * 
   * 修改设备的运行状态或健康状态
   * 用于设备启停、维护切换等操作
   * 
   * @param {string} equipmentId - 设备ID
   * @param {EquipmentStatus} status - 新设备状态
   * @returns {Promise<Equipment>} 更新后的设备对象
   * @throws {Error} 设备状态更新失败
   */
  async updateEquipmentStatus(equipmentId: string, status: EquipmentStatus): Promise<Equipment> {
    try {
      // 修复：映射前端状态到后端API状态值
      const apiStatus = mapFrontendStatusToApi(status);
      
      // 发送PATCH请求到设备状态更新端点
      const response = await apiClient.patch<Equipment>(`/equipment/${equipmentId}/status`, {
        status: apiStatus, // 映射后的设备状态
      });
      
      // 修复：映射返回的设备状态到前端状态枚举
      const mappedEquipment = {
        ...response.data,
        status: mapApiStatusToFrontend(response.data.status)
      };
      
      return mappedEquipment; // 返回映射后的设备信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备维护信息
   * 
   * 获取指定设备的维护计划、维护记录等信息
   * 包括下次维护时间、维护历史、保养建议等
   * 
   * @param {string} equipmentId - 设备ID
   * @returns {Promise<EquipmentMaintenanceInfo>} 设备维护信息对象
   * @throws {Error} 获取维护信息失败
   */
  async getEquipmentMaintenance(equipmentId: string): Promise<EquipmentMaintenanceInfo> {
    try {
      // 发送GET请求到设备维护信息端点
      const response = await apiClient.get<EquipmentMaintenanceInfo>(`/equipment/${equipmentId}/maintenance`);
      return response.data; // 返回设备维护信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备历史记录
   * 
   * 获取指定设备的历史操作记录
   * 包括状态变更、维护记录、告警记录等
   * 
   * @param {string} equipmentId - 设备ID
   * @param {number} page - 页码（从1开始，默认1）
   * @param {number} pageSize - 每页数量（默认20）
   * @returns {Promise<{items: EquipmentHistoryRecord[], total: number, page: number, pageSize: number}>} 设备历史记录列表和分页信息
   * @throws {Error} 获取设备历史记录失败
   */
  async getEquipmentHistory(
    equipmentId: string,          // 设备ID
    page: number = 1,            // 页码（从1开始，默认1）
    pageSize: number = 20        // 每页数量（默认20）
  ): Promise<{
    items: EquipmentHistoryRecord[]; // 历史记录项目列表
    total: number;               // 总记录数
    page: number;                // 当前页码
    pageSize: number;            // 每页大小
  }> {
    try {
      // 发送GET请求到设备历史记录端点
      const response = await apiClient.get(`/equipment/${equipmentId}/history`, {
        params: { page, pageSize }, // 传递分页参数
      });
      return response.data; // 返回设备历史记录列表和分页信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 批量更新设备
   * 
   * 对多个设备执行相同的更新操作
   * 支持部分成功和部分失败的情况
   * 
   * @param {string[]} equipmentIds - 设备ID数组
   * @param {Partial<UpdateEquipmentRequest>} updateData - 更新数据
   * @returns {Promise<{successful: string[], failed: Array<{id: string, error: string}>}>} 批量操作结果
   * @throws {Error} 批量操作请求失败
   */
  async batchUpdateEquipment(
    equipmentIds: string[],                        // 设备ID数组
    updateData: Partial<UpdateEquipmentRequest>   // 更新数据
  ): Promise<{
    successful: string[];                         // 成功更新的设备ID列表
    failed: Array<{ id: string; error: string }>; // 失败的设备和错误信息
  }> {
    try {
      // 发送PATCH请求到批量更新端点
      const response = await apiClient.patch('/equipment/batch', {
        equipmentIds,   // 设备ID列表
        updateData,     // 更新数据
      });
      return response.data; // 返回批量操作结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 搜索设备
   * 
   * 根据搜索关键词和筛选条件查找设备
   * 支持模糊搜索和多条件组合筛选
   * 
   * @param {string} searchTerm - 搜索关键词
   * @param {EquipmentFilters} filters - 筛选条件（可选）
   * @returns {Promise<Equipment[]>} 匹配的设备数组
   * @throws {Error} 设备搜索失败
   */
  async searchEquipment(searchTerm: string, filters?: EquipmentFilters): Promise<Equipment[]> {
    try {
      // 构建搜索参数
      const params = {
        search: searchTerm, // 搜索关键词
        ...filters,         // 展开筛选条件
      };
      
      // 发送GET请求到设备搜索端点
      const response = await apiClient.get<Equipment[]>('/equipment/search', {
        params, // 传递搜索参数
      });
      return response.data; // 返回匹配的设备列表
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备类型列表
   * 
   * 获取系统中所有可用的设备类型
   * 用于设备创建和筛选的下拉选项
   * 
   * @returns {Promise<string[]>} 设备类型字符串数组
   * @throws {Error} 获取设备类型列表失败
   */
  async getEquipmentTypes(): Promise<string[]> {
    try {
      // 发送GET请求到设备类型端点
      const response = await apiClient.get<string[]>('/equipment/types');
      return response.data; // 返回设备类型列表
    } catch (error) {
      // API请求失败时，使用Mock数据作为演示
      console.warn('设备类型API请求失败，使用Mock数据:', error);
      return getMockEquipmentTypes();
    }
  }

  /**
   * 获取设备位置列表
   * 
   * 获取系统中所有设备的位置信息
   * 用于设备创建和筛选的位置选项
   * 
   * @returns {Promise<string[]>} 设备位置字符串数组
   * @throws {Error} 获取设备位置列表失败
   */
  async getEquipmentLocations(): Promise<string[]> {
    try {
      // 发送GET请求到设备位置端点
      const response = await apiClient.get<string[]>('/equipment/locations');
      return response.data; // 返回设备位置列表
    } catch (error) {
      // API请求失败时，使用Mock数据作为演示
      console.warn('设备位置API请求失败，使用Mock数据:', error);
      return getMockEquipmentLocations();
    }
  }

  /**
   * 验证设备ID是否唯一
   * 
   * 检查指定设备ID是否已被使用
   * 用于创建设备时的唯一性验证
   * 
   * @param {string} deviceId - 要验证的设备ID
   * @param {string} excludeId - 排除的设备ID（用于更新时检查，默认不排除）
   * @returns {Promise<boolean>} 设备ID是否唯一
   * @throws {Error} ID验证失败
   */
  async validateDeviceId(deviceId: string, excludeId?: string): Promise<boolean> {
    try {
      // 发送POST请求到ID验证端点
      const response = await apiClient.post<{ valid: boolean }>('/equipment/validate-device-id', {
        deviceId,    // 要验证的设备ID
        excludeId,   // 排除的设备ID（可选）
      });
      return response.data.valid; // 返回验证结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备运行统计
   * 
   * 获取指定设备在时间范围内的运行统计信息
   * 包括运行时间、停机时间、效率等指标
   * 
   * @param {string[]} equipmentIds - 设备ID数组（可选，不指定则统计所有设备）
   * @param {{start: number; end: number}} timeRange - 时间范围（可选）
   * @returns {Promise<Object>} 设备统计信息对象
   * @throws {Error} 获取设备统计信息失败
   */
  async getEquipmentStatistics(
    equipmentIds?: string[],                      // 设备ID数组（可选）
    timeRange?: { start: number; end: number }   // 时间范围（可选）
  ): Promise<{
    total: number;            // 总设备数
    running: number;          // 运行中设备数
    maintenance: number;      // 维护中设备数
    disabled: number;         // 停用设备数
    averageUptime: number;    // 平均运行时间（百分比）
    totalDowntime: number;    // 总停机时间（小时）
    efficiency: number;       // 平均效率（百分比）
  }> {
    try {
      // 构建查询参数
      const params: any = {};
      if (equipmentIds) params.equipmentIds = equipmentIds;
      if (timeRange) params.timeRange = timeRange;

      // 发送GET请求到设备统计端点
      const response = await apiClient.get('/equipment/statistics', { params });
      return response.data; // 返回设备统计信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 导出设备数据
   * 
   * 将设备数据导出为指定格式的文件
   * 支持CSV、Excel、JSON等多种格式
   * 
   * @param {'csv' | 'excel' | 'json'} format - 导出格式
   * @param {EquipmentFilters} filters - 导出筛选条件（可选）
   * @returns {Promise<{downloadUrl: string, expiresAt: number}>} 导出结果对象
   * @throws {Error} 设备数据导出失败
   */
  async exportEquipment(
    format: 'csv' | 'excel' | 'json',   // 导出格式
    filters?: EquipmentFilters          // 导出筛选条件（可选）
  ): Promise<{
    downloadUrl: string;  // 下载URL
    expiresAt: number;    // 过期时间戳
  }> {
    try {
      // 发送POST请求到设备导出端点
      const response = await apiClient.post('/equipment/export', {
        format,   // 导出格式
        filters,  // 筛选条件
      });
      return response.data; // 返回导出结果
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备健康评分
   * 
   * 计算指定设备的健康评分和相关因素
   * 基于设备运行状态、维护记录、告警历史等
   * 
   * @param {string} equipmentId - 设备ID
   * @returns {Promise<Object>} 设备健康评分对象
   * @throws {Error} 获取设备健康评分失败
   */
  async getEquipmentHealthScore(equipmentId: string): Promise<{
    score: number;                    // 健康评分（0-100）
    level: 'excellent' | 'good' | 'fair' | 'poor'; // 健康等级
    factors: Array<{                 // 影响评分的因素
      name: string;                  // 因素名称
      score: number;                 // 因素得分
      weight: number;                // 因素权重
    }>;
    lastUpdated: number;             // 最后更新时间
  }> {
    try {
      // 发送GET请求到设备健康评分端点
      const response = await apiClient.get(`/equipment/${equipmentId}/health-score`);
      return response.data; // 返回设备健康评分
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备告警统计
   * 
   * 获取指定设备在时间范围内的告警统计信息
   * 包括告警数量、严重级别分布、最近告警等
   * 
   * @param {string} equipmentId - 设备ID
   * @param {{start: number; end: number}} timeRange - 时间范围（可选）
   * @returns {Promise<Object>} 设备告警统计对象
   * @throws {Error} 获取设备告警统计失败
   */
  async getEquipmentAlarmStats(
    equipmentId: string,                          // 设备ID
    timeRange?: { start: number; end: number }   // 时间范围（可选）
  ): Promise<{
    total: number;                     // 总告警数
    pending: number;                   // 未处理告警数
    resolved: number;                  // 已解决告警数
    bySeverity: Record<string, number>; // 按严重级别分布的告警数
    recent: Array<{                   // 最近告警列表
      id: string;                     // 告警ID
      severity: string;               // 严重级别
      message: string;                // 告警消息
      timestamp: number;              // 告警时间戳
    }>;
  }> {
    try {
      // 构建查询参数
      const params: any = {};
      if (timeRange) params.timeRange = timeRange;

      // 发送GET请求到设备告警统计端点
      const response = await apiClient.get(`/equipment/${equipmentId}/alarm-stats`, { params });
      return response.data; // 返回设备告警统计
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 获取设备性能指标
   * 
   * 获取指定设备在时间范围内的性能指标数据
   * 用于性能分析和趋势监控
   * 
   * @param {string} equipmentId - 设备ID
   * @param {string[]} metricTypes - 指标类型数组
   * @param {{start: number; end: number}} timeRange - 时间范围
   * @returns {Promise<Record<string, Array<Object>>>> 设备性能指标字典
   * @throws {Error} 获取设备性能指标失败
   */
  async getEquipmentMetrics(
    equipmentId: string,                              // 设备ID
    metricTypes: string[],                           // 指标类型数组
    timeRange: { start: number; end: number }        // 时间范围
  ): Promise<Record<string, Array<{
    timestamp: number;  // 时间戳
    value: number;      // 指标值
    quality: string;    // 数据质量
  }>>> {
    try {
      // 发送GET请求到设备性能指标端点
      const response = await apiClient.get(`/equipment/${equipmentId}/metrics`, {
        params: {
          metricTypes: metricTypes.join(','), // 指标类型列表（逗号分隔）
          startTime: timeRange.start,        // 开始时间
          endTime: timeRange.end,            // 结束时间
        },
      });
      return response.data; // 返回设备性能指标数据
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 恢复已删除的设备
   *
   * 恢复被软删除的设备，使其重新变为可用状态
   * 根据后端API文档，使用POST /equipment/:id/restore接口
   *
   * @param {string} equipmentId - 要恢复的设备ID
   * @returns {Promise<Equipment>} 恢复后的设备对象
   * @throws {Error} 设备恢复失败（设备不存在、权限不足等）
   */
  async restoreEquipment(equipmentId: string): Promise<Equipment> {
    try {
      // 发送POST请求到设备恢复端点（与后端API文档一致）
      const response = await apiClient.post<Equipment>(`/equipment/${equipmentId}/restore`);
      
      // 映射返回的设备状态到前端状态枚举
      const restoredEquipment = {
        ...response.data,
        status: mapApiStatusToFrontend(response.data.status)
      };
      
      return restoredEquipment; // 返回恢复后的设备信息
    } catch (error) {
      // 标准化错误处理
      throw this.normalizeEquipmentError(error);
    }
  }

  /**
   * 标准化设备错误
   * 
   * 将各种错误类型标准化为统一的错误对象
   * 
   * @param {any} error - 原始错误对象
   * @returns {Error} 标准化后的错误对象
   * @private
   */
  private normalizeEquipmentError(error: any): Error {
    // 如果是API错误，包含错误码和消息
    if (error.code) {
      return new Error(`Equipment operation failed: ${error.message}`);
    }

    // 否则返回通用错误消息
    return new Error(error.message || 'Equipment operation failed');
  }
}

// 创建设备管理服务实例（单例模式）
export const equipmentService = new EquipmentService();

// 导出便捷方法（解构导出，方便直接调用）
export const {
  getEquipmentList,          // 获取设备列表
  getEquipmentDetail,        // 获取设备详情
  createEquipment,          // 创建设备
  updateEquipment,          // 更新设备信息
  deleteEquipment,          // 删除设备
  restoreEquipment,         // 恢复已删除的设备
  getEquipmentOverview,     // 获取设备状态概览
  updateEquipmentStatus,    // 更新设备状态
  getEquipmentMaintenance,  // 获取设备维护信息
  getEquipmentHistory,      // 获取设备历史记录
  batchUpdateEquipment,     // 批量更新设备
  searchEquipment,          // 搜索设备
  getEquipmentTypes,        // 获取设备类型列表
  getEquipmentLocations,    // 获取设备位置列表
  validateDeviceId,         // 验证设备ID唯一性
  getEquipmentStatistics,   // 获取设备运行统计
  exportEquipment,          // 导出设备数据
  getEquipmentHealthScore,  // 获取设备健康评分
  getEquipmentAlarmStats,   // 获取设备告警统计
  getEquipmentMetrics,      // 获取设备性能指标
} = equipmentService;

/**
 * 使用示例：
 * 
 * ```typescript
 * import { equipmentService } from './services/equipment-service';
 * 
 * // 获取设备列表
 * const { items } = await equipmentService.getEquipmentList({
 *   page: 1,
 *   pageSize: 20,
 *   filters: { type: 'pump', status: 'running' }
 * });
 * 
 * console.log('设备总数:', items.length);
 * 
 * // 创建设备
 * const newEquipment = await equipmentService.createEquipment({
 *   deviceId: 'pump-001',
 *   name: '主循环泵',
 *   type: 'pump',
 *   location: '机舱甲板',
 *   manufacturer: '某某公司',
 *   model: 'XP-2000',
 *   power: '50kW',
 *   installationDate: Date.now()
 * });
 * 
 * console.log('设备创建成功:', newEquipment.id);
 * 
 * // 获取设备详情
 * const detail = await equipmentService.getEquipmentDetail('pump-001');
 * console.log('设备详情:', detail);
 * 
 * // 更新设备信息
 * const updated = await equipmentService.updateEquipment('pump-001', {
 *   name: '主循环泵-升级版',
 *   location: '机舱二层'
 * });
 * 
 * // 更新设备状态
 * const statusUpdated = await equipmentService.updateEquipmentStatus('pump-001', 'maintenance');
 * 
 * // 获取设备维护信息
 * const maintenance = await equipmentService.getEquipmentMaintenance('pump-001');
 * console.log('下次维护时间:', new Date(maintenance.nextMaintenanceDate));
 * 
 * // 获取设备历史记录
 * const { items: history } = await equipmentService.getEquipmentHistory('pump-001', 1, 10);
 * console.log('历史记录数:', history.length);
 * 
 * // 批量更新设备
 * const batchResult = await equipmentService.batchUpdateEquipment(
 *   ['pump-001', 'motor-002'],
 *   { location: '机舱区域' }
 * );
 * 
 * console.log('成功更新:', batchResult.successful.length);
 * console.log('更新失败:', batchResult.failed.length);
 * 
 * // 搜索设备
 * const searchResults = await equipmentService.searchEquipment('循环泵', {
 *   type: 'pump'
 * });
 * 
 * // 获取设备类型列表
 * const equipmentTypes = await equipmentService.getEquipmentTypes();
 * console.log('可用设备类型:', equipmentTypes);
 * 
 * // 获取设备位置列表
 * const locations = await equipmentService.getEquipmentLocations();
 * console.log('设备位置:', locations);
 * 
 * // 验证设备ID唯一性
 * const isUnique = await equipmentService.validateDeviceId('pump-002');
 * if (isUnique) {
 *   console.log('设备ID可用');
 * } else {
 *   console.log('设备ID已存在');
 * }
 * 
 * // 获取设备运行统计
 * const stats = await equipmentService.getEquipmentStatistics(
 *   ['pump-001', 'motor-002'],
 *   { 
 *     start: Date.now() - 30*24*60*60*1000, // 30天前
 *     end: Date.now() // 现在
 *   }
 * );
 * 
 * console.log('设备统计:', {
 *   总设备数: stats.total,
 *   运行中: stats.running,
 *   平均运行时间: `${stats.averageUptime.toFixed(1)}%`,
 *   平均效率: `${stats.efficiency.toFixed(1)}%`
 * });
 * 
 * // 导出设备数据
 * const exportResult = await equipmentService.exportEquipment('excel', {
 *   type: 'pump',
 *   status: 'running'
 * });
 * 
 * console.log('导出文件:', exportResult.downloadUrl);
 * 
 * // 获取设备健康评分
 * const healthScore = await equipmentService.getEquipmentHealthScore('pump-001');
 * console.log('设备健康评分:', {
 *   分数: healthScore.score,
 *   等级: healthScore.level,
 *   更新时间: new Date(healthScore.lastUpdated)
 * });
 * 
 * // 获取设备告警统计
 * const alarmStats = await equipmentService.getEquipmentAlarmStats('pump-001', {
 *   start: Date.now() - 7*24*60*60*1000, // 7天前
 *   end: Date.now()
 * });
 * 
 * console.log('告警统计:', {
 *   总告警数: alarmStats.total,
 *   未处理: alarmStats.pending,
 *   已解决: alarmStats.resolved
 * });
 * 
 * // 获取设备性能指标
 * const metrics = await equipmentService.getEquipmentMetrics(
 *   'pump-001',
 *   ['temperature', 'pressure', 'flow_rate'],
 *   { 
 *     start: Date.now() - 24*60*60*1000, // 24小时前
 *     end: Date.now() 
 *   }
 * );
 * 
 * console.log('温度数据点:', metrics.temperature?.length || 0);
 * console.log('压力数据点:', metrics.pressure?.length || 0);
 * console.log('流量数据点:', metrics.flow_rate?.length || 0);
 * 
 * // 获取设备状态概览
 * const overview = await equipmentService.getEquipmentOverview();
 * console.log('设备概览:', overview);
 * 
 * // 删除设备
 * await equipmentService.deleteEquipment('pump-002');
 * ```
 */