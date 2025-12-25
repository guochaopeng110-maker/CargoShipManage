import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import {
  TimeSeriesData,
  DataSource as DataSourceEnum,
} from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { CacheService } from '../../common/services/cache.service';
import { PerformanceMonitorService } from '../../common/services/performance-monitor.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * 实时监测数据推送服务
 *
 * 当新监测数据成功保存时，通过 WebSocket 实时推送给订阅了该设备的前端客户端。
 *
 * 推送策略：
 * - 推送范围：仅推送给订阅了对应设备房间（`equipment:{deviceId}`）的用户
 * - 权限控制：依赖 WebSocket 网关的认证和房间订阅机制
 * - 事件名称：`monitoring:new-data`
 * - 推送内容：包含完整的监测数据信息（id, equipmentId, timestamp, metricType, monitoringPoint, value, unit, quality, source）
 *
 * 注意事项：
 * - 推送操作是异步的，不应阻塞数据保存流程
 * - 推送失败仅记录日志，不影响核心业务逻辑
 * - 自动处理设备ID转换：将数据库UUID转换为前端使用的设备编号(deviceId)
 */
@Injectable()
export class MonitoringPushService {
  private readonly logger = new Logger(MonitoringPushService.name);

  // 配置项
  private readonly BATCH_CHUNK_SIZE: number;
  private readonly CHUNK_DELAY: number;
  private readonly EQUIPMENT_CACHE_TTL: number;

  constructor(
    private readonly websocketGateway: WebsocketGateway,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    private readonly cacheService: CacheService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly configService: ConfigService,
  ) {
    // 从配置中读取参数,如果未配置则使用默认值
    this.BATCH_CHUNK_SIZE =
      this.configService.get<number>('monitoring.push.batchChunkSize') || 100;
    this.CHUNK_DELAY =
      this.configService.get<number>('monitoring.push.chunkDelay') || 10;
    this.EQUIPMENT_CACHE_TTL =
      this.configService.get<number>('monitoring.cache.equipmentTtl') || 3600;

    this.logger.log(
      `监测数据推送服务已启动: 分片大小=${this.BATCH_CHUNK_SIZE}, 延迟=${this.CHUNK_DELAY}ms, 缓存TTL=${this.EQUIPMENT_CACHE_TTL}s`,
    );
  }

  /**
   * 推送新监测数据
   *
   * @param timeSeriesData 时序监测数据实体
   */
  async pushNewData(timeSeriesData: TimeSeriesData): Promise<void> {
    try {
      // 获取设备编号(deviceId)
      // 如果实体中已包含equipment关联且有deviceId，直接使用
      // 否则，根据equipmentId(UUID)查询数据库获取deviceId
      let deviceId: string;

      if (timeSeriesData.equipment && timeSeriesData.equipment.deviceId) {
        deviceId = timeSeriesData.equipment.deviceId;
      } else {
        const equipment = await this.equipmentRepository.findOne({
          where: { id: timeSeriesData.equipmentId },
          select: ['deviceId'],
          cache: 60000, // 启用1分钟缓存，减少高频推送时的数据库查询压力
        });

        if (!equipment) {
          this.logger.warn(
            `无法找到设备信息，跳过推送: UUID=${timeSeriesData.equipmentId}`,
          );
          return;
        }
        deviceId = equipment.deviceId;
      }

      // 构建日志消息，包含监测点信息
      const logMsg = timeSeriesData.monitoringPoint
        ? `推送监测数据: 设备=${deviceId}, 监测点=${timeSeriesData.monitoringPoint}, 指标=${timeSeriesData.metricType}, 值=${timeSeriesData.value}`
        : `推送监测数据: 设备=${deviceId}, 指标=${timeSeriesData.metricType}, 值=${timeSeriesData.value}`;

      this.logger.debug(logMsg);

      // 构建符合规范的推送消息体
      // 注意：equipmentId字段返回的是设备编号(deviceId)，而非UUID，以便前端识别
      const monitoringMessage = {
        id: timeSeriesData.id,
        equipmentId: deviceId, // 使用设备编号(如 SYS-INV-1-001)
        timestamp: timeSeriesData.timestamp.toISOString(),
        metricType: timeSeriesData.metricType,
        monitoringPoint: timeSeriesData.monitoringPoint,
        value: timeSeriesData.value,
        unit: timeSeriesData.unit,
        quality: timeSeriesData.quality,
        source: timeSeriesData.source,
      };

      // 推送给订阅该设备的用户
      // 房间名为: equipment:SYS-INV-1-001
      this.websocketGateway.sendToEquipment(
        deviceId,
        'monitoring:new-data',
        monitoringMessage,
      );

      this.logger.debug(`监测数据已推送到设备房间: equipment:${deviceId}`);
    } catch (error) {
      // 捕获推送异常，记录错误但不向上抛出
      this.logger.error(
        `推送监测数据失败: 设备UUID=${timeSeriesData.equipmentId}, 错误=${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 批量推送监测数据
   *
   * 用于批量上报和文件导入场景
   * - 按设备分组推送
   * - 内部分片 (默认100条/片)
   * - 串行发送确保顺序性
   * - 使用缓存优化设备ID转换
   *
   * @param dataList 时序监测数据列表
   */
  async pushBatchData(dataList: TimeSeriesData[]): Promise<void> {
    if (!dataList || dataList.length === 0) {
      return;
    }

    const startTime = Date.now();
    const batchId = uuidv4(); // 生成批次唯一标识

    this.logger.log(
      `批量数据推送开始: 批次ID=${batchId}, 数据量=${dataList.length}`,
    );

    try {
      // 1. 收集所有唯一的设备 UUID
      const uniqueUuids = Array.from(
        new Set(dataList.map((d) => d.equipmentId)),
      );

      // 2. 批量转换 UUID 为 deviceId (使用缓存)
      const deviceIdMap = await this.convertUuidsToDeviceIds(uniqueUuids);

      // 3. 按设备分组
      const groupedData = this.groupByEquipment(dataList);

      let totalChunks = 0;

      // 4. 遍历每个设备进行推送
      for (const [equipmentUuid, records] of groupedData) {
        const deviceId = deviceIdMap.get(equipmentUuid);

        if (!deviceId) {
          this.logger.warn(
            `设备 UUID ${equipmentUuid} 未找到对应的 deviceId，跳过推送`,
          );
          continue;
        }

        // 5. 分片 (BATCH_CHUNK_SIZE 条/片)
        const chunks = this.chunkArray(records, this.BATCH_CHUNK_SIZE);
        totalChunks += chunks.length;

        this.logger.debug(
          `设备 ${deviceId}: 数据量=${records.length}, 分片数=${chunks.length}`,
        );

        // 6. 串行发送每个分片
        for (let i = 0; i < chunks.length; i++) {
          const payload = {
            batchId,
            equipmentId: deviceId,
            data: chunks[i].map((d) => ({
              id: d.id,
              timestamp: d.timestamp.toISOString(),
              metricType: d.metricType,
              monitoringPoint: d.monitoringPoint,
              value: d.value,
              unit: d.unit,
              quality: d.quality,
              source: d.source,
            })),
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            isHistory:
              records[0]?.source === DataSourceEnum.FILE_IMPORT ||
              records[0]?.source === DataSourceEnum.MANUAL_ENTRY,
          };

          // 发送到设备专属房间
          this.websocketGateway.sendToEquipment(
            deviceId,
            'monitoring:batch-data',
            payload,
          );

          // 记录 WebSocket 消息发送
          this.performanceMonitor.recordWebSocketMessageSent();

          // 添加小延迟 (避免瞬时流量冲击)
          if (i < chunks.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.CHUNK_DELAY),
            );
          }
        }
      }

      const duration = Date.now() - startTime;

      // 记录批量推送指标
      this.performanceMonitor.recordBatchPush(
        dataList.length,
        totalChunks,
        duration,
      );

      this.logger.log(
        `批量数据推送完成: 批次ID=${batchId}, 数据量=${dataList.length}, 分片数=${totalChunks}, 耗时=${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `批量数据推送失败: 批次ID=${batchId}, 错误=${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 批量转换设备 UUID 为 deviceId (使用缓存)
   *
   * @param uuids 设备 UUID 列表
   * @returns UUID -> deviceId 映射
   */
  private async convertUuidsToDeviceIds(
    uuids: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const missingUuids: string[] = [];

    // 1. 尝试从缓存获取
    for (const uuid of uuids) {
      const cacheKey = `equipment:uuid:${uuid}`;
      const cachedDeviceId = this.cacheService.get<string>(cacheKey);

      if (cachedDeviceId) {
        result.set(uuid, cachedDeviceId);
      } else {
        missingUuids.push(uuid);
      }
    }

    this.logger.debug(
      `UUID 转换: 缓存命中=${uuids.length - missingUuids.length}, 缓存未命中=${missingUuids.length}`,
    );

    // 2. 批量查询数据库 (使用 IN 查询)
    if (missingUuids.length > 0) {
      const equipments = await this.equipmentRepository.find({
        where: { id: In(missingUuids) },
        select: ['id', 'deviceId'],
      });

      // 3. 回填缓存
      for (const eq of equipments) {
        result.set(eq.id, eq.deviceId);

        // 写入缓存
        const cacheKey = `equipment:uuid:${eq.id}`;
        this.cacheService.set(cacheKey, eq.deviceId, this.EQUIPMENT_CACHE_TTL);
      }

      // 记录缓存命中率
      const cacheHitRate =
        ((uuids.length - missingUuids.length) / uuids.length) * 100;
      this.logger.debug(
        `UUID 批量转换完成: 总数=${uuids.length}, 数据库查询=${equipments.length}, 缓存命中率=${cacheHitRate.toFixed(2)}%`,
      );
    }

    return result;
  }

  /**
   * 按设备分组数据
   *
   * @param dataList 数据列表
   * @returns 设备 UUID -> 数据列表映射
   */
  private groupByEquipment(
    dataList: TimeSeriesData[],
  ): Map<string, TimeSeriesData[]> {
    const grouped = new Map<string, TimeSeriesData[]>();

    for (const data of dataList) {
      const existing = grouped.get(data.equipmentId) || [];
      existing.push(data);
      grouped.set(data.equipmentId, existing);
    }

    return grouped;
  }

  /**
   * 数组分片
   *
   * @param array 原数组
   * @param chunkSize 每片大小
   * @returns 分片后的数组
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  }
}
