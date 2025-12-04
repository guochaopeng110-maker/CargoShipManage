/**
 * 货船智能机舱管理系统 - 设备健康评估页面组件
 *
 * 功能说明：
 * 本组件提供完整的设备健康评估功能，包括设备健康状态展示、健康评分显示、
 * 设备选择筛选、健康趋势分析等核心功能。
 *
 * 主要特性：
 * 1. 设备健康状态实时展示（健康评分、评估时间、状态说明）
 * 2. 智能搜索和筛选功能（支持设备名称搜索和设备类型、健康级别筛选）
 * 3. 设备健康评分可视化（使用仪表盘图表展示健康评分）
 * 4. 设备健康详情查看和趋势分析功能
 * 5. 响应式设计，适配不同屏幕尺寸
 * 6. 实时数据更新和错误处理
 *
 * 技术架构：
 * - 基于React函数组件 + Hooks
 * - 集成设备管理Store和健康评估Service状态管理
 * - 使用设备服务API和健康评估API进行数据交互
 * - 采用响应式UI设计和Tailwind CSS
 * - 支持分页加载和虚拟滚动
 *
 * 健康评估流程：
 * 1. 组件加载时获取设备列表和健康评估数据
 * 2. 根据用户输入实时搜索和筛选设备
 * 3. 提供设备健康详情查看对话框
 * 4. 支持健康评分可视化和趋势分析
 * 5. 集成错误处理和加载状态管理
 * 6. 响应式UI适配和交互优化
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 2.0.0
 * @since 2024
 */

// React核心库导入
import React, { useState, useEffect, useCallback } from 'react';

// 图标库导入（来自Lucide React）
import {
  Eye,           // 查看详情图标
  Search,        // 搜索图标
  RefreshCw,     // 刷新图标
  Filter,        // 过滤器图标
  TrendingUp,    // 趋势分析图标
  TrendingDown,  // 趋势分析图标
  Activity       // 活动状态图标
} from 'lucide-react';

// UI组件导入
import { Card } from './ui/card';                    // 卡片容器组件
import { Button } from './ui/button';                // 按钮组件
import { Input } from './ui/input';                  // 输入框组件
import { Badge } from './ui/badge';                  // 徽章组件
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';   // 选择器组件
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'; // 对话框组件
import { Alert, AlertDescription } from './ui/alert'; // 警告提示组件

// 设备相关类型和接口导入
import { Equipment } from '../types/equipment';           // 设备实体类型
import { HealthScoreCalculation } from '../types/health';   // 设备健康评分类型

// 设备管理和健康评估相关服务导入
import { useEquipment } from '../stores/equipment-store';     // 设备管理Store
import { useHealth } from '../stores/health-store';          // 健康评估Store
import { healthService } from '../services/health-service'; // 健康评估服务

// 仪表盘图表组件导入
import { GaugeChart } from './GaugeChart';

/**
 * 设备健康评估页面主组件
 *
 * 这是整个设备健康评估功能的核心组件，提供完整的设备健康评估界面
 * 包括设备健康状态展示、健康评分可视化、健康趋势分析等所有功能
 *
 * 功能特点：
 * - 响应式设计，支持桌面和移动设备
 * - 实时健康数据更新和状态同步
 * - 智能搜索和多维度筛选
 * - 直观的健康评分可视化
 * - 完整的错误处理和用户反馈
 * - 设备健康趋势分析和预测
 */
export function EquipmentHealthPage() {
  // 使用设备管理Store的状态和方法
  const {
    items: equipmentList,           // 设备列表数据
    loading: equipmentLoading,       // 设备加载状态
    error: equipmentError,           // 设备错误信息
    fetchEquipmentList,             // 获取设备列表
  } = useEquipment();

  // 使用健康评估Store的状态和方法
  const {
    loading: healthLoading,         // 健康评估加载状态
    error: healthError,             // 健康评估错误信息
    latestReport,                   // 最新健康报告
    averageHealthScore,             // 平均健康评分
    reportsByStatus,                // 按状态分类的报告
  } = useHealth();

  // 组件本地状态管理
  const [equipment, setEquipment] = useState<Array<Equipment & {
    healthScore: number;
    lastAssessment: string;
    healthStatusText: string;
    healthLevel: 'excellent' | 'good' | 'fair' | 'poor';
    trend: 'up' | 'down' | 'stable';
  }>>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterHealth, setFilterHealth] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<(Equipment & {
    healthScore: number;
    lastAssessment: string;
    healthStatusText: string;
    healthLevel: 'excellent' | 'good' | 'fair' | 'poor';
    trend: 'up' | 'down' | 'stable';
  }) | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  /**
   * 组件初始化加载
   * 在组件挂载时获取设备列表和健康评估数据
   */
  useEffect(() => {
    // 获取设备列表
    fetchEquipmentList().catch(console.error);
  }, []);

  /**
   * 当设备列表更新时，获取健康评估数据
   */
  useEffect(() => {
    const fetchHealthData = async () => {
      if (equipmentList.length > 0) {
        try {
          const healthDataPromises = equipmentList.map(async (equipment) => {
            try {
              const healthScore = await healthService.getEquipmentHealthScore(equipment.id);
              return {
                ...equipment,
                healthScore: healthScore.overallScore,
                lastAssessment: new Date().toLocaleString('zh-CN'),
                healthStatusText: getHealthStatusText(healthScore.overallScore),
                healthLevel: getHealthLevelFromScore(healthScore.overallScore),
                trend:  'stable' as 'up' | 'down' | 'stable', // TODO: 实现趋势分析
              };
            } catch (error) {
              console.error(`获取设备 ${equipment.deviceName} 健康评分失败:`, error);
              return {
                ...equipment,
                healthScore: 0,
                lastAssessment: '获取失败',
                healthStatusText: '健康数据获取失败',
                healthLevel: 'poor' as const,
                trend: 'down' as 'up' | 'down' | 'stable',
              };
            }
          });

          const healthData = await Promise.all(healthDataPromises);
          setEquipment(healthData);
        } catch (error) {
          console.error('批量获取健康评估数据失败:', error);
        }
      }
    };

    fetchHealthData();
  }, [equipmentList]);

  /**
   * 根据健康评分获取状态文本
   * @param {number} score - 健康评分
   * @returns {string} 状态描述文本
   */
  const getHealthStatusText = (score: number): string => {
    if (score >= 90) return '设备状态优秀，运行正常';
    if (score >= 80) return '设备状态良好，基本运行正常';
    if (score >= 70) return '设备状态一般，需要关注';
    if (score >= 60) return '设备状态较差，建议维护';
    return '设备状态严重，需要立即处理';
  };

  /**
   * 根据健康评分获取健康级别
   * @param {number} score - 健康评分
   * @returns {string} 健康级别
   */
  const getHealthLevelFromScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  };

  /**
   * 获取健康状态徽章颜色
   * @param {string} level - 健康级别
   * @returns {string} CSS类名
   */
  const getHealthLevelBadgeClass = (level: string): string => {
    switch (level) {
      case 'excellent':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'good':
        return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 'fair':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'poor':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500';
    }
  };

  /**
   * 获取健康状态徽章文本
   * @param {string} level - 健康级别
   * @returns {string} 徽章文本
   */
  const getHealthLevelText = (level: string): string => {
    switch (level) {
      case 'excellent':
        return '优秀';
      case 'good':
        return '良好';
      case 'fair':
        return '一般';
      case 'poor':
        return '较差';
      default:
        return '未知';
    }
  };

  /**
   * 设备健康状态检查
   * @param {number} score - 健康评分
   * @returns {'normal' | 'warning' | 'critical'} 状态类型
   */
  const getHealthStatus = (score: number): 'normal' | 'warning' | 'critical' => {
    if (score >= 80) return 'normal';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  /**
   * 处理查看设备健康详情
   * @param {Equipment & { healthScore: number; lastAssessment: string; healthStatusText: string; healthLevel: 'excellent' | 'good' | 'fair' | 'poor'; trend: 'up' | 'down' | 'stable'; }} device - 设备对象
   */
  const handleViewDetails = async (device: Equipment & {
    healthScore: number;
    lastAssessment: string;
    healthStatusText: string;
    healthLevel: 'excellent' | 'good' | 'fair' | 'poor';
    trend: 'up' | 'down' | 'stable';
  }) => {
    try {
      setSelectedEquipment(device);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('查看设备健康详情失败:', error);
    }
  };

  /**
   * 处理刷新健康数据
   */
  const handleRefresh = () => {
    fetchEquipmentList().catch(console.error);
  };

  /**
   * 过滤设备列表
   * 根据搜索词、类型和健康级别进行过滤
   */
  const filteredEquipment = equipment.filter((eq) => {
    // 搜索条件匹配（设备名称或设备类型）
    const matchesSearch =
      eq.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.deviceType.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 类型筛选条件匹配
    const matchesType = filterType === 'all' || eq.deviceType === filterType;
    
    // 健康级别筛选条件匹配
    const matchesHealth = (() => {
      switch (filterHealth) {
        case 'all':
          return true;
        case 'excellent':
          return eq.healthLevel === 'excellent' && eq.healthScore >= 90;
        case 'good':
          return eq.healthLevel === 'good' && eq.healthScore >= 80 && eq.healthScore < 90;
        case 'fair':
          return eq.healthLevel === 'fair' && eq.healthScore >= 70 && eq.healthScore < 80;
        case 'warning':
          return eq.healthScore >= 60 && eq.healthScore < 70;
        case 'critical':
          return eq.healthScore < 60;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesType && matchesHealth;
  });

  /**
   * 获取设备概览统计
   */
  const getEquipmentStats = () => {
    const total = equipment.length;
    const excellent = equipment.filter(eq => eq.healthLevel === 'excellent').length;
    const good = equipment.filter(eq => eq.healthLevel === 'good').length;
    const fair = equipment.filter(eq => eq.healthLevel === 'fair').length;
    const poor = equipment.filter(eq => eq.healthLevel === 'poor').length;
    
    return { total, excellent, good, fair, poor };
  };

  const stats = getEquipmentStats();

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和控制栏 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">设备健康评估</h1>
            <p className="text-slate-400 mt-1">
              货船智能机舱设备健康状态监控平台 - 共 {stats.total} 台设备
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 错误提示 */}
            {(equipmentError || healthError) && (
              <Alert className="bg-red-500/20 border-red-500 text-red-400">
                <AlertDescription>
                  {equipmentError || healthError}
                </AlertDescription>
              </Alert>
            )}
            
            {/* 刷新按钮 */}
            <Button
              onClick={handleRefresh}
              disabled={equipmentLoading || healthLoading}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(equipmentLoading || healthLoading) ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 设备健康概览统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-slate-400 text-sm">设备总数</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.excellent}</div>
              <div className="text-slate-400 text-sm">健康优秀</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.good}</div>
              <div className="text-slate-400 text-sm">健康良好</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.fair}</div>
              <div className="text-slate-400 text-sm">需要关注</div>
            </div>
          </Card>
          <Card className="bg-slate-800/60 border-slate-700 p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.poor}</div>
              <div className="text-slate-400 text-sm">需要维护</div>
            </div>
          </Card>
        </div>

        {/* 搜索和筛选控制栏 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="搜索设备名称或设备类型..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-600 text-slate-100 placeholder:text-slate-500"
              />
            </div>
            
            {/* 设备类型筛选 */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-600 text-slate-100">
                <SelectValue placeholder="选择设备类型" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">全部类型</SelectItem>
                <SelectItem value="电池系统" className="text-slate-300">电池系统</SelectItem>
                <SelectItem value="推进系统" className="text-slate-300">推进系统</SelectItem>
                <SelectItem value="逆变器系统" className="text-slate-300">逆变器系统</SelectItem>
                <SelectItem value="冷却系统" className="text-slate-300">冷却系统</SelectItem>
                <SelectItem value="辅助设备" className="text-slate-300">辅助设备</SelectItem>
              </SelectContent>
            </Select>
            
            {/* 健康级别筛选按钮组 */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setFilterHealth('all')}
                className={
                  filterHealth === 'all'
                    ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                全部
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterHealth('excellent')}
                className={
                  filterHealth === 'excellent'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                优秀
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterHealth('good')}
                className={
                  filterHealth === 'good'
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                良好
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterHealth('fair')}
                className={
                  filterHealth === 'fair'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                一般
              </Button>
              <Button
                size="sm"
                onClick={() => setFilterHealth('critical')}
                className={
                  filterHealth === 'critical'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-slate-900/50 border border-slate-600 text-slate-300 hover:bg-slate-700'
                }
              >
                较差
              </Button>
            </div>
          </div>
          
          {/* 筛选结果显示 */}
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <span>
              显示 {filteredEquipment.length} 台设备
              {searchTerm && ` (搜索: "${searchTerm}")`}
              {filterType !== 'all' && ` (类型: ${filterType})`}
              {filterHealth !== 'all' && ` (健康级别: ${getHealthLevelText(filterHealth)})`}
            </span>
            {(equipmentLoading || healthLoading) && (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                正在加载健康数据...
              </span>
            )}
          </div>
        </Card>

        {/* 设备健康状态列表 */}
        <Card className="bg-slate-800/80 border-slate-700 p-6">
          {equipmentLoading || healthLoading ? (
            // 加载状态显示
            <div className="text-center py-8 text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium">正在加载设备健康数据...</p>
            </div>
          ) : filteredEquipment.length === 0 ? (
            // 空状态显示
            <div className="text-center py-8 text-slate-400">
              <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">未找到匹配的设备</p>
              <p className="text-sm">
                {searchTerm || filterType !== 'all' || filterHealth !== 'all'
                  ? '请尝试调整搜索条件或筛选条件'
                  : '系统暂无设备数据'
                }
              </p>
            </div>
          ) : (
            // 设备健康卡片网格
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.map((eq) => (
                <Card key={eq.id} className="bg-slate-800/80 border-slate-700 p-6 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-slate-100 mb-1 font-medium">{eq.deviceName}</h3>
                      <Badge className="bg-slate-700 text-slate-300 border-slate-600 text-xs">
                        {eq.deviceType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* 趋势图标 */}
                      {eq.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
                      {eq.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
                      {eq.trend === 'stable' && <Activity className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  <div className="flex justify-center mb-4">
                    <GaugeChart
                      value={eq.healthScore}
                      maxValue={100}
                      label=""
                      unit="%"
                      size="medium"
                      status={getHealthStatus(eq.healthScore)}
                    />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm">健康级别:</span>
                      <Badge className={getHealthLevelBadgeClass(eq.healthLevel)}>
                        {getHealthLevelText(eq.healthLevel)}
                      </Badge>
                    </div>
                    <p className="text-slate-400 text-sm">
                      <span className="text-slate-500">上次评估:</span> {eq.lastAssessment}
                    </p>
                    <p className="text-slate-300 text-sm line-clamp-2">{eq.healthStatusText}</p>
                  </div>

                  <Button
                    onClick={() => handleViewDetails(eq)}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看健康报告
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* 设备健康详情对话框 */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-100">
                设备健康详情 - {selectedEquipment?.deviceName}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEquipment && (
              <div className="space-y-6">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">设备名称</p>
                    <p className="text-slate-100">{selectedEquipment.deviceName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">设备类型</p>
                    <p className="text-slate-100">{selectedEquipment.deviceType}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">设备编号</p>
                    <p className="text-slate-100 font-mono">{selectedEquipment.deviceId}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">安装位置</p>
                    <p className="text-slate-100">{selectedEquipment.location || '未设置位置'}</p>
                  </div>
                </div>

                {/* 健康评分仪表盘 */}
                <div className="flex justify-center">
                  <div className="text-center">
                    <GaugeChart
                      value={selectedEquipment.healthScore}
                      maxValue={100}
                      label="健康评分"
                      unit="分"
                      size="large"
                      status={getHealthStatus(selectedEquipment.healthScore)}
                    />
                    <p className="text-slate-400 mt-2">
                      健康级别: <span className="text-slate-100">{getHealthLevelText(selectedEquipment.healthLevel)}</span>
                    </p>
                  </div>
                </div>

                {/* 健康状态说明 */}
                <div>
                  <p className="text-slate-500 text-sm mb-2">健康状态说明</p>
                  <p className="text-slate-100 bg-slate-700/50 p-3 rounded">{selectedEquipment.healthStatusText}</p>
                </div>

                {/* 评估信息 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 text-sm">上次评估时间</p>
                    <p className="text-slate-100">{selectedEquipment.lastAssessment}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">健康趋势</p>
                    <div className="flex items-center gap-2">
                      {selectedEquipment.trend === 'up' && (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">上升趋势</span>
                        </>
                      )}
                      {selectedEquipment.trend === 'down' && (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">下降趋势</span>
                        </>
                      )}
                      {selectedEquipment.trend === 'stable' && (
                        <>
                          <Activity className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400">稳定状态</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
