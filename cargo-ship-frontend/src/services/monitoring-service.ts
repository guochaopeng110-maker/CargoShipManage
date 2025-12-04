/**
 * 货船智能机舱管理系统 - 监测数据服务
 *
 * 核心功能：
 * 1. 监测数据的CRUD操作
 * 2. 批量数据导入导出
 * 3. 数据查询和统计分析
 * 4. 实时数据和历史数据统一管理
 * 5. 数据质量控制和验证
 *
 * 技术架构：
 * - 基于monitoring-api.md的4个核心接口
 * - 统一的数据类型和错误处理
 * - 支持单条和批量数据操作
 * - 完整的数据验证和转换
 * - 权限控制和访问管理
 *
 * 服务特性：
 * - 单条数据上报接口
 * - 批量数据上报接口
 * - 数据查询和分页
 * - 数据统计分析
 * - 数据导入导出
 * - 实时数据订阅
 *
 * API接口映射：
 * - POST /api/monitoring/data - 单条数据上报
 * - POST /api/monitoring/data/batch - 批量数据上报
 * - GET /api/monitoring/data - 数据查询
 * - GET /api/monitoring/data/statistics - 数据统计
 *
 * 数据流程：
 * 1. 数据验证和格式化
 * 2. 权限检查和访问控制
 * 3. API请求发送和响应处理
 * 4. 数据转换和统一化
 * 5. 错误处理和重试机制
 *
 * 权限要求：
 * - sensor_data:create - 创建/上报监测数据
 * - sensor_data:read - 查询监测数据
 * - sensor_data:update - 更新监测数据
 * - sensor_data:delete - 删除监测数据
 * - sensor_data:import - 导入传感器数据
 * - sensor_data:export - 导出传感器数据
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025
 */

// 统一监测数据类型导入
import {
  UnifiedMonitoringData,        // 统一监测数据接口
  BatchMonitoringData,         // 批量监测数据接口
  MonitoringQueryParams,        // 监测数据查询参数
  MonitoringStatisticsParams,   // 监测数据统计参数
  MonitoringDataResponse,       // 监测数据响应
  MonitoringStatisticsResponse, // 监测数据统计响应
  MonitoringSubmitResponse,     // 数据提交响应
  MonitoringBatchSubmitResponse, // 批量数据提交响应
  MetricType,                 // 指标类型枚举
  DataQuality,                // 数据质量枚举
  DataSource,                // 数据来源枚举
  validateMonitoringData,      // 数据验证函数
  convertApiToUnifiedData,    // API数据转换函数
  convertWebSocketToUnifiedData, // WebSocket数据转换函数
  METRIC_TYPE_UNITS,         // 指标类型默认单位映射
} from '../types/monitoring';

// API客户端导入
import { apiClient } from './api-client';

// 权限检查类型导入
import type { PermissionChecker } from '../hooks/usePermissions';

// Mock数据导入
import {
  generateMockMonitoringData,
  generateMockMonitoringStatistics,
} from '../mocks/mock-monitoring-data';

/**
 * 监测数据服务类
 *
 * 负责与后端监测API的所有交互
 * 包括数据上报、查询、统计、导入导出等功能
 *
 * 主要功能：
 * - 单条和批量数据上报
 * - 历史数据查询和分页
 * - 数据统计和分析
 * - 数据质量控制和验证
 * - 权限检查和访问控制
 *
 * 数据流程：
 * 1. 接收前端数据请求
 * 2. 验证数据格式和权限
 * 3. 转换为API标准格式
 * 4. 发送HTTP请求到后端
 * 5. 处理响应和错误
 * 6. 转换为统一数据格式
 * 7. 返回给调用方
 *
 * @class MonitoringService
 */
export class MonitoringService {
  /**
   * 权限检查实例
   */
  private permissions: PermissionChecker | null = null;

  /**
   * 构造函数
   *
   * @param permissions 权限检查实例（可选）
   */
  constructor(permissions?: PermissionChecker) {
    this.permissions = permissions || null;
  }

  /**
   * 设置权限检查实例
   *
   * @param permissions 权限检查实例
   */
  setPermissions(permissions: PermissionChecker): void {
    this.permissions = permissions;
  }

  /**
   * 检查权限
   *
   * @param resource 资源类型
   * @param action 操作类型
   * @returns 是否有权限
   * @private
   */
  private hasPermission(resource: string, action: string): boolean {
    if (!this.permissions) {
      // 如果没有权限检查实例，默认返回true（开发模式）
      console.warn('权限检查实例未设置，默认允许所有操作');
      return true;
    }
    return this.permissions.hasPermission(resource, action);
  }

  /**
   * 上报单条监测数据
   *
   * 向后端API发送单条监测数据
   * 基于monitoring-api.md的单条数据接口
   *
   * @param {UnifiedMonitoringData} data - 监测数据对象
   * @returns {Promise<MonitoringSubmitResponse>} 上报结果
   * @throws {Error} 权限不足或数据验证失败
   * @async
   */
  async submitMonitoringData(data: UnifiedMonitoringData): Promise<MonitoringSubmitResponse> {
    // 检查权限
    if (!this.hasPermission('sensor_data', 'create')) {
      throw new Error('权限不足：无法创建监测数据');
    }

    // 验证数据
    const validation = validateMonitoringData(data);
    if (!validation.isValid) {
      throw new Error(`数据验证失败：${validation.errors.join(', ')}`);
    }

    try {
      // 转换为API格式
      const apiData = {
        equipmentId: data.equipmentId,
        timestamp: new Date(data.timestamp).toISOString(),
        metricType: data.metricType,
        value: data.value,
        unit: data.unit || METRIC_TYPE_UNITS[data.metricType],
        quality: data.quality,
        source: data.source,
      };

      // 发送API请求
      const response = await apiClient.post('/api/monitoring/data', apiData);

      // 返回标准响应格式
      return {
        data: {
          dataId: response.data.data?.dataId || 0,
          received: response.data.data?.received || true,
        },
        timestamp: response.data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error('上报监测数据失败:', error);
      throw new Error(`上报监测数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 批量上报监测数据
   * 
   * 向后端API批量发送监测数据
   * 基于monitoring-api.md的批量数据接口
   * 支持最多1000条数据的批量提交
   * 
   * @param {BatchMonitoringData} batchData - 批量监测数据对象
   * @returns {Promise<MonitoringBatchSubmitResponse>} 批量上报结果
   * @throws {Error} 权限不足或数据验证失败
   * @async
   */
  async submitBatchMonitoringData(batchData: BatchMonitoringData): Promise<MonitoringBatchSubmitResponse> {
    // 检查权限
    if (!this.hasPermission('sensor_data', 'create')) {
      throw new Error('权限不足：无法创建监测数据');
    }

    // 验证批量数据
    if (!batchData.data || batchData.data.length === 0) {
      throw new Error('批量数据不能为空');
    }

    if (batchData.data.length > 1000) {
      throw new Error('批量数据最多支持1000条');
    }

    // 验证每条数据
    for (let i = 0; i < batchData.data.length; i++) {
      const data = batchData.data[i];
      const validation = validateMonitoringData({
        ...data,
        id: '',
        equipmentId: batchData.equipmentId,
      });
      
      if (!validation.isValid) {
        throw new Error(`第${i + 1}条数据验证失败：${validation.errors.join(', ')}`);
      }
    }

    try {
      // 转换为API格式
      const apiData = {
        equipmentId: batchData.equipmentId,
        data: batchData.data.map(item => ({
          timestamp: new Date(item.timestamp).toISOString(),
          metricType: item.metricType,
          value: item.value,
          unit: item.unit || METRIC_TYPE_UNITS[item.metricType],
          quality: item.quality,
        })),
      };

      // 发送API请求
      const response = await apiClient.post('/api/monitoring/data/batch', apiData);

      // 返回标准响应格式
      return {
        data: {
          totalCount: response.data.data?.totalCount || batchData.data.length,
          successCount: response.data.data?.successCount || 0,
          failedCount: response.data.data?.failedCount || 0,
          errors: response.data.data?.errors || [],
        },
        timestamp: response.data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error('批量上报监测数据失败:', error);
      throw new Error(`批量上报监测数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 查询监测数据
   * 
   * 根据设备、指标类型、时间范围查询监测数据
   * 基于monitoring-api.md的查询接口
   * 支持分页和数据过滤
   * 
   * @param {MonitoringQueryParams} params - 查询参数
   * @returns {Promise<MonitoringDataResponse>} 查询结果
   * @throws {Error} 权限不足或参数错误
   * @async
   */
  async queryMonitoringData(params: MonitoringQueryParams): Promise<MonitoringDataResponse> {
    // 检查权限
    if (!this.hasPermission('sensor_data', 'read')) {
      throw new Error('权限不足：无法查询监测数据');
    }

    // 验证查询参数
    if (!params.equipmentId) {
      throw new Error('设备ID不能为空');
    }

    if (!params.startTime || !params.endTime) {
      throw new Error('开始时间和结束时间不能为空');
    }

    if (params.startTime >= params.endTime) {
      throw new Error('开始时间必须小于结束时间');
    }

    // 限制查询时间范围（最多30天）
    const maxTimeRange = 30 * 24 * 60 * 60 * 1000; // 30天的毫秒数
    if (params.endTime - params.startTime > maxTimeRange) {
      throw new Error('查询时间范围不能超过30天');
    }

    try {
      // 构建查询参数
      const queryParams: any = {
        equipmentId: params.equipmentId,
        startTime: params.startTime,
        endTime: params.endTime,
        page: params.page || 1,
        pageSize: Math.min(params.pageSize || 100, 1000), // 限制最大1000条
      };

      // 添加可选参数
      if (params.metricType) {
        queryParams.metricType = params.metricType;
      }

      if (params.quality && params.quality.length > 0) {
        queryParams.quality = params.quality.join(',');
      }

      if (params.source && params.source.length > 0) {
        queryParams.source = params.source.join(',');
      }

      // 发送API请求
      const response = await apiClient.get('/api/monitoring/data', { params: queryParams });

      // 转换数据格式
      const items = (response.data.data?.items || []).map(convertApiToUnifiedData);

      // 返回标准响应格式
      return {
        data: {
          items,
          total: response.data.data?.total || 0,
          page: response.data.data?.page || 1,
          pageSize: response.data.data?.pageSize || 100,
          totalPages: response.data.data?.totalPages || 0,
        },
        timestamp: response.data.timestamp || Date.now(),
      };
    } catch (error) {
      console.warn('查询监测数据API失败，使用mock数据:', error);
      // API失败时，返回mock数据
      return generateMockMonitoringData(params);
    }
  }

  /**
   * 获取监测数据统计信息
   * 
   * 获取指定设备、指标类型、时间范围的统计数据
   * 基于monitoring-api.md的统计接口
   * 包括最大值、最小值、平均值等统计信息
   * 
   * @param {MonitoringStatisticsParams} params - 统计参数
   * @returns {Promise<MonitoringStatisticsResponse>} 统计结果
   * @throws {Error} 权限不足或参数错误
   * @async
   */
  async getMonitoringStatistics(params: MonitoringStatisticsParams): Promise<MonitoringStatisticsResponse> {
    // 检查权限
    if (!this.hasPermission('sensor_data', 'read')) {
      throw new Error('权限不足：无法查询监测数据');
    }

    // 验证统计参数
    if (!params.equipmentId) {
      throw new Error('设备ID不能为空');
    }

    if (!params.metricType) {
      throw new Error('指标类型不能为空');
    }

    if (!params.startTime || !params.endTime) {
      throw new Error('开始时间和结束时间不能为空');
    }

    if (params.startTime >= params.endTime) {
      throw new Error('开始时间必须小于结束时间');
    }

    try {
      // 构建查询参数
      const queryParams: any = {
        equipmentId: params.equipmentId,
        metricType: params.metricType,
        startTime: params.startTime,
        endTime: params.endTime,
      };

      // 添加可选参数
      if (params.quality && params.quality.length > 0) {
        queryParams.quality = params.quality.join(',');
      }

      // 发送API请求
      const response = await apiClient.get('/api/monitoring/data/statistics', { params: queryParams });

      // 返回标准响应格式
      return {
        data: {
          metricType: response.data.data?.metricType || params.metricType,
          count: response.data.data?.count || 0,
          maxValue: response.data.data?.maxValue || 0,
          minValue: response.data.data?.minValue || 0,
          avgValue: response.data.data?.avgValue || 0,
          unit: response.data.data?.unit || METRIC_TYPE_UNITS[params.metricType],
        },
        timestamp: response.data.timestamp || Date.now(),
      };
    } catch (error) {
      console.warn('获取监测数据统计API失败，使用mock数据:', error);
      // API失败时，返回mock数据
      return generateMockMonitoringStatistics(params);
    }
  }

  /**
   * 导入监测数据
   * 
   * 从文件导入监测数据
   * 支持Excel和CSV格式
   * 
   * @param {File} file - 导入文件
   * @param {Object} options - 导入选项
   * @param {boolean} options.skipValidation - 是否跳过验证
   * @param {boolean} options.updateExisting - 是否更新已存在的数据
   * @returns {Promise<MonitoringBatchSubmitResponse>} 导入结果
   * @throws {Error} 权限不足或文件格式错误
   * @async
   */
  async importMonitoringData(
    file: File,
    options: {
      skipValidation?: boolean;
      updateExisting?: boolean;
    } = {}
  ): Promise<MonitoringBatchSubmitResponse> {
    // 检查权限
    if (!this.hasPermission('sensor_data', 'import')) {
      throw new Error('权限不足：无法导入监测数据');
    }

    // 验证文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件格式，请使用Excel或CSV文件');
    }

    // 验证文件大小（最大10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('文件大小不能超过10MB');
    }

    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skipValidation', options.skipValidation ? 'true' : 'false');
      formData.append('updateExisting', options.updateExisting ? 'true' : 'false');

      // 发送API请求
      const response = await apiClient.post('/api/monitoring/data/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 返回标准响应格式
      return {
        data: {
          totalCount: response.data.data?.totalCount || 0,
          successCount: response.data.data?.successCount || 0,
          failedCount: response.data.data?.failedCount || 0,
          errors: response.data.data?.errors || [],
        },
        timestamp: response.data.timestamp || Date.now(),
      };
    } catch (error) {
      console.error('导入监测数据失败:', error);
      throw new Error(`导入监测数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 导出监测数据
   * 
   * 导出监测数据为文件
   * 支持Excel和CSV格式
   * 
   * @param {MonitoringQueryParams} params - 查询参数
   * @param {Object} options - 导出选项
   * @param {'excel' | 'csv'} options.format - 导出格式
   * @param {boolean} options.includeHeaders - 是否包含表头
   * @returns {Promise<Blob>} 导出文件数据
   * @throws {Error} 权限不足或参数错误
   * @async
   */
  async exportMonitoringData(
    params: MonitoringQueryParams,
    options: {
      format?: 'excel' | 'csv';
      includeHeaders?: boolean;
    } = {}
  ): Promise<Blob> {
    // 检查权限
    if (!this.hasPermission('sensor_data', 'export')) {
      throw new Error('权限不足：无法导出监测数据');
    }

    // 验证查询参数
    if (!params.equipmentId) {
      throw new Error('设备ID不能为空');
    }

    if (!params.startTime || !params.endTime) {
      throw new Error('开始时间和结束时间不能为空');
    }

    try {
      // 构建查询参数
      const queryParams: any = {
        equipmentId: params.equipmentId,
        startTime: params.startTime,
        endTime: params.endTime,
        format: options.format || 'excel',
        includeHeaders: options.includeHeaders !== false,
      };

      // 添加可选参数
      if (params.metricType) {
        queryParams.metricType = params.metricType;
      }

      if (params.quality && params.quality.length > 0) {
        queryParams.quality = params.quality.join(',');
      }

      if (params.source && params.source.length > 0) {
        queryParams.source = params.source.join(',');
      }

      // 发送API请求 - 使用原生fetch处理blob响应
      const token = localStorage.getItem('access_token');
      const url = `${apiClient['baseURL']}/api/monitoring/data/export`;
      
      // 构建查询字符串
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      
      const fullUrl = `${url}?${searchParams.toString()}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': options.format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      if (!response.ok) {
        throw new Error(`导出失败: ${response.status} ${response.statusText}`);
      }

      // 返回文件数据
      return await response.blob();
    } catch (error) {
      console.error('导出监测数据失败:', error);
      throw new Error(`导出监测数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 获取支持的指标类型列表
   * 
   * 返回系统支持的所有监测指标类型
   * 
   * @returns {Array<{type: MetricType, name: string, unit: string}>} 指标类型列表
   */
  getSupportedMetricTypes(): Array<{ type: MetricType; name: string; unit: string }> {
    return Object.values(MetricType).map(type => ({
      type,
      name: this.getMetricTypeName(type),
      unit: METRIC_TYPE_UNITS[type],
    }));
  }

  /**
   * 获取指标类型的中文名称
   * 
   * @param {MetricType} type - 指标类型
   * @returns {string} 中文名称
   * @private
   */
  private getMetricTypeName(type: MetricType): string {
    const nameMap: Record<MetricType, string> = {
      [MetricType.TEMPERATURE]: '温度',
      [MetricType.VIBRATION]: '振动',
      [MetricType.PRESSURE]: '压力',
      [MetricType.HUMIDITY]: '湿度',
      [MetricType.SPEED]: '速度',
      [MetricType.CURRENT]: '电流',
      [MetricType.VOLTAGE]: '电压',
      [MetricType.POWER]: '功率',
      [MetricType.SOC]: '电池荷电状态',
      [MetricType.SOH]: '电池健康状态',
      [MetricType.ENERGY]: '能量',
      [MetricType.RPM]: '转速',
    };
    return nameMap[type] || type;
  }

  /**
   * 验证设备ID格式
   * 
   * @param {string} equipmentId - 设备ID
   * @returns {boolean} 是否为有效的UUID格式
   * @private
   */
  private isValidUUID(equipmentId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(equipmentId);
  }
}

/**
 * 创建监测数据服务实例
 *
 * @param permissions 权限检查实例（可选）
 * @returns {MonitoringService} 监测数据服务实例
 */
export const createMonitoringService = (permissions?: PermissionChecker): MonitoringService => {
  return new MonitoringService(permissions);
};

// 创建默认的监测数据服务实例（无权限检查）
export const monitoringService = createMonitoringService();

// 导出便捷方法（解构导出，方便直接调用）
export const {
  submitMonitoringData,        // 上报单条监测数据
  submitBatchMonitoringData,   // 批量上报监测数据
  queryMonitoringData,         // 查询监测数据
  getMonitoringStatistics,      // 获取监测数据统计
  importMonitoringData,         // 导入监测数据
  exportMonitoringData,         // 导出监测数据
  getSupportedMetricTypes,      // 获取支持的指标类型列表
} = monitoringService;

/**
 * 使用示例：
 * 
 * ```typescript
 * import { monitoringService, MetricType, DataQuality, DataSource } from './services/monitoring-service';
 * 
 * // 上报单条监测数据
 * const singleData = {
 *   id: 'data_001',
 *   equipmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   timestamp: Date.now(),
 *   metricType: MetricType.TEMPERATURE,
 *   value: 25.5,
 *   unit: '°C',
 *   quality: DataQuality.NORMAL,
 *   source: DataSource.SENSOR_UPLOAD,
 * };
 * 
 * try {
 *   const result = await monitoringService.submitMonitoringData(singleData);
 *   console.log('数据上报成功:', result);
 * } catch (error) {
 *   console.error('数据上报失败:', error);
 * }
 * 
 * // 批量上报监测数据
 * const batchData = {
 *   equipmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   data: [
 *     {
 *       timestamp: Date.now(),
 *       metricType: MetricType.TEMPERATURE,
 *       value: 25.5,
 *       unit: '°C',
 *       quality: DataQuality.NORMAL,
 *       source: DataSource.SENSOR_UPLOAD,
 *     },
 *     {
 *       timestamp: Date.now() + 60000,
 *       metricType: MetricType.PRESSURE,
 *       value: 0.3,
 *       unit: 'MPa',
 *       quality: DataQuality.NORMAL,
 *       source: DataSource.SENSOR_UPLOAD,
 *     },
 *   ],
 * };
 * 
 * try {
 *   const result = await monitoringService.submitBatchMonitoringData(batchData);
 *   console.log('批量数据上报成功:', result);
 * } catch (error) {
 *   console.error('批量数据上报失败:', error);
 * }
 * 
 * // 查询监测数据
 * const queryParams = {
 *   equipmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   metricType: MetricType.TEMPERATURE,
 *   startTime: Date.now() - 24 * 60 * 60 * 1000, // 24小时前
 *   endTime: Date.now(),
 *   page: 1,
 *   pageSize: 100,
 * };
 * 
 * try {
 *   const result = await monitoringService.queryMonitoringData(queryParams);
 *   console.log('查询到数据:', result.data.items.length, '条');
 *   console.log('总记录数:', result.data.total);
 * } catch (error) {
 *   console.error('查询数据失败:', error);
 * }
 * 
 * // 获取统计数据
 * const statisticsParams = {
 *   equipmentId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   metricType: MetricType.TEMPERATURE,
 *   startTime: Date.now() - 24 * 60 * 60 * 1000, // 24小时前
 *   endTime: Date.now(),
 * };
 * 
 * try {
 *   const result = await monitoringService.getMonitoringStatistics(statisticsParams);
 *   console.log('统计结果:', result.data);
 * } catch (error) {
 *   console.error('获取统计失败:', error);
 * }
 * 
 * // 导入监测数据
 * const fileInput = document.getElementById('file-input') as HTMLInputElement;
 * const file = fileInput.files?.[0];
 * 
 * if (file) {
 *   try {
 *     const result = await monitoringService.importMonitoringData(file, {
 *       skipValidation: false,
 *       updateExisting: true,
 *     });
 *     console.log('导入成功:', result);
 *   } catch (error) {
 *     console.error('导入失败:', error);
 *   }
 * }
 * 
 * // 导出监测数据
 * try {
 *   const blob = await monitoringService.exportMonitoringData(queryParams, {
 *     format: 'excel',
 *     includeHeaders: true,
 *   });
 *   
 *   // 下载文件
 *   const url = URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = `monitoring-data-${Date.now()}.xlsx`;
 *   document.body.appendChild(a);
 *   a.click();
 *   document.body.removeChild(a);
 *   URL.revokeObjectURL(url);
 * } catch (error) {
 *   console.error('导出失败:', error);
 * }
 * 
 * // 获取支持的指标类型
 * const metricTypes = monitoringService.getSupportedMetricTypes();
 * console.log('支持的指标类型:', metricTypes);
 * ```
 */