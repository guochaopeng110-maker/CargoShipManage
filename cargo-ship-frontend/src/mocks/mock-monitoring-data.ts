/**
 * 货船智能机舱管理系统 - 监测数据Mock数据
 *
 * 功能说明：
 * - 为数据查询页面提供mock数据支持
 * - 当后端API失败时，生成模拟的监测数据
 * - 包含各种指标类型和时间序列的模拟数据
 *
 * 使用场景：
 * - 开发环境下的功能演示
 * - 后端API不可用时的降级方案
 * - 测试各种查询条件和数据可视化
 *
 * @author 货船智能机舱管理系统开发团队
 * @version 1.0.0
 * @since 2025
 */

import { 
  UnifiedMonitoringData,
  MonitoringQueryParams,
  MonitoringStatisticsParams,
  MonitoringDataResponse,
  MonitoringStatisticsResponse,
  MetricType,
  DataQuality,
  DataSource,
  METRIC_TYPE_UNITS
} from '../types/monitoring';

/**
 * 生成随机监测数值
 * 
 * @param metricType 指标类型
 * @returns 随机数值
 */
function generateRandomValue(metricType: MetricType): number {
  switch (metricType) {
    case MetricType.TEMPERATURE:
      return Math.random() * 80 + 20; // 20-100°C
    case MetricType.VIBRATION:
      return Math.random() * 10 + 0.1; // 0.1-10.1 mm/s
    case MetricType.PRESSURE:
      return Math.random() * 2 + 0.1; // 0.1-2.1 MPa
    case MetricType.HUMIDITY:
      return Math.random() * 60 + 30; // 30-90%
    case MetricType.SPEED:
      return Math.random() * 30 + 5; // 5-35 km/h
    case MetricType.CURRENT:
      return Math.random() * 50 + 5; // 5-55 A
    case MetricType.VOLTAGE:
      return Math.random() * 100 + 200; // 200-300 V
    case MetricType.POWER:
      return Math.random() * 500 + 100; // 100-600 kW
    case MetricType.SOC:
      return Math.random() * 40 + 60; // 60-100%
    case MetricType.SOH:
      return Math.random() * 30 + 70; // 70-100%
    case MetricType.ENERGY:
      return Math.random() * 1000 + 100; // 100-1100 kWh
    case MetricType.RPM:
      return Math.random() * 2000 + 500; // 500-2500 r/min
    default:
      return Math.random() * 100;
  }
}

/**
 * 生成随机数据质量
 * 
 * @returns 数据质量枚举
 */
function generateRandomQuality(): DataQuality {
  const qualities = [DataQuality.NORMAL, DataQuality.NORMAL, DataQuality.NORMAL, DataQuality.ESTIMATED, DataQuality.QUESTIONABLE];
  return qualities[Math.floor(Math.random() * qualities.length)];
}

/**
 * 生成随机数据来源
 * 
 * @returns 数据来源枚举
 */
function generateRandomSource(): DataSource {
  const sources = [DataSource.SENSOR_UPLOAD, DataSource.SENSOR_UPLOAD, DataSource.SENSOR_UPLOAD, DataSource.MANUAL_INPUT, DataSource.FILE_IMPORT];
  return sources[Math.floor(Math.random() * sources.length)];
}

/**
 * 生成单个监测数据点
 * 
 * @param equipmentId 设备ID
 * @param timestamp 时间戳
 * @param metricType 指标类型
 * @returns 监测数据点
 */
function generateDataPoint(
  equipmentId: string,
  timestamp: number,
  metricType: MetricType
): UnifiedMonitoringData {
  return {
    id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    equipmentId,
    timestamp,
    metricType,
    value: generateRandomValue(metricType),
    unit: METRIC_TYPE_UNITS[metricType],
    quality: generateRandomQuality(),
    source: generateRandomSource(),
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {
      mockData: true,
      generatedAt: Date.now()
    }
  };
}

/**
 * 生成模拟监测数据
 * 
 * @param params 查询参数
 * @returns 监测数据响应
 */
export function generateMockMonitoringData(params: MonitoringQueryParams): MonitoringDataResponse {
  const timeRange = params.endTime - params.startTime;
  
  // 根据时间范围确定数据点数量和间隔
  let dataPoints: UnifiedMonitoringData[] = [];
  let interval: number;
  
  if (timeRange <= 3600000) { // 1小时内
    interval = Math.max(timeRange / 100, 60000); // 最多100个点，最小间隔1分钟
  } else if (timeRange <= 86400000) { // 1天内
    interval = Math.max(timeRange / 200, 300000); // 最多200个点，最小间隔5分钟
  } else if (timeRange <= 604800000) { // 1周内
    interval = Math.max(timeRange / 300, 900000); // 最多300个点，最小间隔15分钟
  } else { // 超过1周
    interval = Math.max(timeRange / 500, 3600000); // 最多500个点，最小间隔1小时
  }
  
  // 生成数据点
  for (let time = params.startTime; time <= params.endTime; time += interval) {
    if (params.metricType) {
      // 单一指标类型
      dataPoints.push(generateDataPoint(params.equipmentId, time, params.metricType));
    } else {
      // 所有指标类型
      Object.values(MetricType).forEach(metricType => {
        // 为每个指标类型生成数据，但添加一些随机性
        if (Math.random() > 0.3) { // 70%的概率生成数据
          dataPoints.push(generateDataPoint(params.equipmentId, time, metricType));
        }
      });
    }
  }
  
  // 应用质量过滤
  if (params.quality && params.quality.length > 0) {
    dataPoints = dataPoints.filter(point => params.quality!.includes(point.quality));
  }
  
  // 应用来源过滤
  if (params.source && params.source.length > 0) {
    dataPoints = dataPoints.filter(point => params.source!.includes(point.source));
  }
  
  // 按时间戳排序
  dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  
  // 分页处理
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 100, 1000);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = dataPoints.slice(startIndex, endIndex);
  
  return {
    data: {
      items: paginatedData,
      total: dataPoints.length,
      page,
      pageSize,
      totalPages: Math.ceil(dataPoints.length / pageSize)
    },
    timestamp: Date.now()
  };
}

/**
 * 生成模拟监测统计数据
 * 
 * @param params 统计参数
 * @returns 监测统计响应
 */
export function generateMockMonitoringStatistics(params: MonitoringStatisticsParams): MonitoringStatisticsResponse {
  // 生成一些基础统计数据
  const count = Math.floor(Math.random() * 1000) + 100;
  const unit = METRIC_TYPE_UNITS[params.metricType];
  
  let minValue: number;
  let maxValue: number;
  let avgValue: number;
  
  // 根据指标类型生成合理的统计值
  switch (params.metricType) {
    case MetricType.TEMPERATURE:
      minValue = 20 + Math.random() * 10;
      maxValue = 80 + Math.random() * 20;
      avgValue = (minValue + maxValue) / 2 + (Math.random() - 0.5) * 10;
      break;
    case MetricType.VIBRATION:
      minValue = 0.1 + Math.random() * 0.5;
      maxValue = 5 + Math.random() * 5;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.PRESSURE:
      minValue = 0.1 + Math.random() * 0.2;
      maxValue = 1.5 + Math.random() * 0.5;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.HUMIDITY:
      minValue = 30 + Math.random() * 10;
      maxValue = 80 + Math.random() * 10;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.SPEED:
      minValue = 5 + Math.random() * 5;
      maxValue = 30 + Math.random() * 5;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.CURRENT:
      minValue = 5 + Math.random() * 5;
      maxValue = 50 + Math.random() * 5;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.VOLTAGE:
      minValue = 200 + Math.random() * 20;
      maxValue = 280 + Math.random() * 20;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.POWER:
      minValue = 100 + Math.random() * 50;
      maxValue = 500 + Math.random() * 100;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.SOC:
      minValue = 60 + Math.random() * 10;
      maxValue = 95 + Math.random() * 5;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.SOH:
      minValue = 70 + Math.random() * 10;
      maxValue = 98 + Math.random() * 2;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.ENERGY:
      minValue = 100 + Math.random() * 50;
      maxValue = 1000 + Math.random() * 100;
      avgValue = (minValue + maxValue) / 2;
      break;
    case MetricType.RPM:
      minValue = 500 + Math.random() * 200;
      maxValue = 2000 + Math.random() * 500;
      avgValue = (minValue + maxValue) / 2;
      break;
    default:
      minValue = Math.random() * 10;
      maxValue = Math.random() * 100 + 50;
      avgValue = (minValue + maxValue) / 2;
  }
  
  return {
    data: {
      metricType: params.metricType,
      count,
      minValue: parseFloat(minValue.toFixed(2)),
      maxValue: parseFloat(maxValue.toFixed(2)),
      avgValue: parseFloat(avgValue.toFixed(2)),
      unit
    },
    timestamp: Date.now()
  };
}

/**
 * 生成多个设备的模拟监测数据
 * 
 * @param equipmentIds 设备ID列表
 * @param startTime 开始时间
 * @param endTime 结束时间
 * @param metricType 指标类型（可选）
 * @returns 监测数据数组
 */
export function generateMockMultiEquipmentData(
  equipmentIds: string[],
  startTime: number,
  endTime: number,
  metricType?: MetricType
): UnifiedMonitoringData[] {
  const allData: UnifiedMonitoringData[] = [];
  
  equipmentIds.forEach(equipmentId => {
    const params: MonitoringQueryParams = {
      equipmentId,
      startTime,
      endTime,
      metricType,
      page: 1,
      pageSize: 1000
    };
    
    const response = generateMockMonitoringData(params);
    allData.push(...response.data.items);
  });
  
  // 按时间戳排序
  return allData.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 生成实时监测数据
 * 
 * @param equipmentId 设备ID
 * @param metricTypes 指标类型列表
 * @returns 实时监测数据数组
 */
export function generateMockRealtimeData(
  equipmentId: string,
  metricTypes: MetricType[] = Object.values(MetricType)
): UnifiedMonitoringData[] {
  const now = Date.now();
  const realtimeData: UnifiedMonitoringData[] = [];
  
  metricTypes.forEach(metricType => {
    // 为每个指标类型生成当前时间点的数据
    realtimeData.push(generateDataPoint(equipmentId, now, metricType));
  });
  
  return realtimeData;
}

/**
 * 获取指标类型的中文名称
 * 
 * @param metricType 指标类型
 * @returns 中文名称
 */
export function getMetricTypeName(metricType: MetricType): string {
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
  return nameMap[metricType] || metricType;
}

/**
 * 获取数据质量的中文名称
 * 
 * @param quality 数据质量
 * @returns 中文名称
 */
export function getDataQualityName(quality: DataQuality): string {
  const qualityMap: Record<DataQuality, string> = {
    [DataQuality.NORMAL]: '正常',
    [DataQuality.ESTIMATED]: '估算',
    [DataQuality.QUESTIONABLE]: '可疑',
    [DataQuality.BAD]: '坏值',
  };
  return qualityMap[quality] || quality;
}

/**
 * 获取数据来源的中文名称
 * 
 * @param source 数据来源
 * @returns 中文名称
 */
export function getDataSourceName(source: DataSource): string {
  const sourceMap: Record<DataSource, string> = {
    [DataSource.SENSOR_UPLOAD]: '传感器上报',
    [DataSource.MANUAL_INPUT]: '手动输入',
    [DataSource.FILE_IMPORT]: '文件导入',
    [DataSource.SYSTEM_GENERATED]: '系统生成',
  };
  return sourceMap[source] || source;
}