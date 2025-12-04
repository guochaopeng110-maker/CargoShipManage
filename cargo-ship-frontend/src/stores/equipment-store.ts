// 设备状态管理Store（对应后端Equipment实体）
// 基于货船智能机舱管理系统设备管理架构
//
// 功能说明：
// - 管理设备列表的获取、分页、筛选
// - 提供设备的增删改查功能
// - 处理设备状态的实时更新
// - 维护设备概览统计信息
// - 支持设备选择的本地状态管理

import { useState, useCallback } from 'react';
import { EquipmentState, Equipment, EquipmentFilters, EquipmentOverview, CreateEquipmentRequest, UpdateEquipmentRequest } from '../types/equipment';
import { equipmentService } from '../services/equipment-service';

/**
 * 设备状态管理Hook
 * 提供设备相关的所有状态管理和业务逻辑操作
 *
 * @returns {Object} 包含设备状态和操作方法的对象
 *   - items: 设备列表
 *   - selectedEquipment: 当前选中的设备
 *   - loading: 加载状态
 *   - error: 错误信息
 *   - total: 总设备数量
 *   - page: 当前页码
 *   - pageSize: 每页数量
 *   - totalPages: 总页数
 *   - filters: 筛选条件
 *   - overview: 设备概览统计
 *   - fetchEquipmentList: 获取设备列表
 *   - fetchEquipmentDetail: 获取设备详情
 *   - createEquipment: 创建设备
 *   - updateEquipment: 更新设备
 *   - deleteEquipment: 删除设备
 *   - fetchEquipmentOverview: 获取设备概览
 *   - updateEquipmentStatus: 更新设备状态
 *   - setSelectedEquipment: 设置选中设备
 *   - setPage: 设置页码
 *   - setPageSize: 设置页面大小
 *   - setFilters: 设置筛选条件
 *   - clearError: 清除错误信息
 */
export const useEquipmentStore = () => {
  // 设备状态初始化
  const [state, setState] = useState<EquipmentState>({
    items: [],                // 设备列表数据
    selectedEquipment: null,  // 当前选中的设备
    loading: false,           // 加载状态标识
    error: null,              // 错误信息
    total: 0,                 // 总设备数量
    page: 1,                  // 当前页码
    pageSize: 20,             // 每页显示数量
    totalPages: 0,            // 总页数
    filters: {},              // 筛选条件
    overview: null,           // 设备概览统计信息
  });

  /**
   * 获取设备列表
   *
   * 根据分页参数和筛选条件获取设备列表数据
   * 支持动态分页、筛选和排序功能
   *
   * @param {Object} params - 获取参数
   * @param {number} params.page - 页码（从1开始）
   * @param {number} params.pageSize - 每页数量
   * @param {EquipmentFilters} params.filters - 筛选条件
   * @returns {Promise<Object>} 设备列表响应数据
   *
   * @throws {Error} 当获取设备列表失败时抛出错误
   */
  const fetchEquipmentList = useCallback(async (params?: { page?: number; pageSize?: number; filters?: EquipmentFilters }) => {
    // 设置加载状态并清除之前的错误
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 调用设备服务获取数据，使用传入参数或当前状态值
      const response = await equipmentService.getEquipmentList({
        page: params?.page || state.page,        // 使用传入页码或当前页码
        pageSize: params?.pageSize || state.pageSize, // 使用传入页面大小或当前页面大小
        ...params?.filters,                      // 展开筛选条件
      });

      // 更新状态为获取成功的结果
      setState(prev => ({
        ...prev,
        items: response.items,          // 设备列表数据
        total: response.total,          // 总设备数量
        page: response.page,            // 当前页码
        pageSize: response.pageSize,    // 每页数量
        totalPages: response.totalPages, // 总页数
        loading: false,                 // 清除加载状态
        error: null,                    // 清除错误信息
        filters: params?.filters || prev.filters, // 更新筛选条件
      }));

      return response; // 返回响应数据供调用者使用
    } catch (error) {
      // 发生错误时更新状态
      setState(prev => ({
        ...prev,
        loading: false, // 清除加载状态
        error: error instanceof Error ? error.message : '获取设备列表失败', // 设置错误信息
      }));
      throw error; // 重新抛出错误供调用者处理
    }
  }, [state.page, state.pageSize]);

  // 获取设备详情
  const fetchEquipmentDetail = useCallback(async (equipmentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const equipment = await equipmentService.getEquipmentDetail(equipmentId);
      
      setState(prev => ({
        ...prev,
        selectedEquipment: equipment,
        loading: false,
        error: null,
      }));

      return equipment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '获取设备详情失败',
      }));
      throw error;
    }
  }, []);

  // 创建设备
  const createEquipment = useCallback(async (equipmentData: CreateEquipmentRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const equipment = await equipmentService.createEquipment(equipmentData);
      
      setState(prev => ({
        ...prev,
        items: [equipment, ...prev.items],
        total: prev.total + 1,
        loading: false,
        error: null,
      }));

      return equipment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '创建设备失败',
      }));
      throw error;
    }
  }, []);

  // 更新设备
  const updateEquipment = useCallback(async (equipmentId: string, equipmentData: UpdateEquipmentRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const equipment = await equipmentService.updateEquipment(equipmentId, equipmentData);
      
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => item.id === equipmentId ? equipment : item),
        selectedEquipment: prev.selectedEquipment?.id === equipmentId ? equipment : prev.selectedEquipment,
        loading: false,
        error: null,
      }));

      return equipment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '更新设备失败',
      }));
      throw error;
    }
  }, []);

  // 删除设备
  const deleteEquipment = useCallback(async (equipmentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      await equipmentService.deleteEquipment(equipmentId);
      
      setState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== equipmentId),
        total: prev.total - 1,
        selectedEquipment: prev.selectedEquipment?.id === equipmentId ? null : prev.selectedEquipment,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '删除设备失败',
      }));
      throw error;
    }
  }, []);

  // 恢复已删除的设备
  const restoreEquipment = useCallback(async (equipmentId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const equipment = await equipmentService.restoreEquipment(equipmentId);
      
      setState(prev => ({
        ...prev,
        items: [equipment, ...prev.items],
        total: prev.total + 1,
        selectedEquipment: prev.selectedEquipment?.id === equipmentId ? equipment : prev.selectedEquipment,
        loading: false,
        error: null,
      }));

      return equipment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '恢复设备失败',
      }));
      throw error;
    }
  }, []);

  // 获取设备概览
  const fetchEquipmentOverview = useCallback(async () => {
    try {
      const overview = await equipmentService.getEquipmentOverview();
      
      setState(prev => ({
        ...prev,
        overview,
      }));

      return overview;
    } catch (error) {
      console.error('获取设备概览失败:', error);
      // 不抛出错误，允许页面继续使用Mock数据
      return null;
    }
  }, []);

  // 更新设备状态
  const updateEquipmentStatus = useCallback(async (equipmentId: string, status: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const equipment = await equipmentService.updateEquipmentStatus(equipmentId, status);
      
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => item.id === equipmentId ? equipment : item),
        loading: false,
        error: null,
      }));

      return equipment;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : '更新设备状态失败',
      }));
      throw error;
    }
  }, []);

  // 设置选中设备
  const setSelectedEquipment = useCallback((equipment: Equipment | null) => {
    setState(prev => ({ ...prev, selectedEquipment: equipment }));
  }, []);

  // 设置分页
  const setPage = useCallback((page: number) => {
    setState(prev => ({ ...prev, page }));
  }, []);

  // 设置页面大小
  const setPageSize = useCallback((pageSize: number) => {
    setState(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // 设置筛选条件
  const setFilters = useCallback((filters: EquipmentFilters) => {
    setState(prev => ({ ...prev, filters, page: 1 }));
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // 状态
    ...state,
    
    // 方法
    fetchEquipmentList,
    fetchEquipmentDetail,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    restoreEquipment,
    fetchEquipmentOverview,
    updateEquipmentStatus,
    setSelectedEquipment,
    setPage,
    setPageSize,
    setFilters,
    clearError,
  };
};

// 导出便捷Hook
export const useEquipment = () => {
  const store = useEquipmentStore();
  return {
    ...store,
    // 便捷方法
    equipmentList: store.items,
    selectedEquipmentData: store.selectedEquipment,
    isLoading: store.loading,
    error: store.error,
    totalCount: store.total,
    currentPage: store.page,
    pageSize: store.pageSize,
    totalPages: store.totalPages,
    equipmentOverview: store.overview,
    filters: store.filters,
  };
};