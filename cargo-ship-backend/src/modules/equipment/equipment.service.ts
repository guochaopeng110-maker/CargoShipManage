import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';
import { MonitoringPoint } from '../../database/entities/monitoring-point.entity';
import { AuditAction } from '../../database/entities/audit-log.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { QueryMonitoringPointDto } from './dto/monitoring-point.dto';
import { AuditService } from '../auth/audit.service';

/**
 * 设备服务
 * 处理设备管理的所有业务逻辑
 */
@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(MonitoringPoint)
    private readonly monitoringPointRepository: Repository<MonitoringPoint>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 创建设备
   * @param createEquipmentDto 创建设备的数据
   * @param userId 当前用户ID（用于审计）
   * @returns 创建的设备实体
   */
  async create(
    createEquipmentDto: CreateEquipmentDto,
    userId: string,
  ): Promise<Equipment> {
    // 检查设备编号是否已存在
    const existingEquipment = await this.equipmentRepository.findOne({
      where: { deviceId: createEquipmentDto.deviceId },
      withDeleted: true, // 包括已软删除的记录
    });

    if (existingEquipment) {
      if (existingEquipment.deletedAt) {
        throw new ConflictException(
          `设备编号 ${createEquipmentDto.deviceId} 已存在但已被删除，请使用其他编号或恢复已删除的设备`,
        );
      }
      throw new ConflictException(
        `设备编号 ${createEquipmentDto.deviceId} 已存在`,
      );
    }

    // 创建设备实体
    const equipment = this.equipmentRepository.create({
      ...createEquipmentDto,
      status: createEquipmentDto.status ?? EquipmentStatus.NORMAL, // 使用传入的状态，如果没有则默认为正常
    });

    // 保存到数据库
    const savedEquipment = await this.equipmentRepository.save(equipment);

    // 记录审计日志
    await this.auditService.log({
      userId,
      action: AuditAction.CREATE,
      resource: 'equipment',
      resourceId: savedEquipment.id,
      details: `创建设备：${savedEquipment.deviceName} (${savedEquipment.deviceId})`,
    });

    return savedEquipment;
  }

  /**
   * 分页查询设备列表
   * @param queryDto 查询参数
   * @returns 分页的设备列表和总数
   */
  async findAll(queryDto: QueryEquipmentDto): Promise<{
    data: Equipment[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, deviceType, status, keyword } = queryDto;

    // 构建查询条件
    const queryBuilder =
      this.equipmentRepository.createQueryBuilder('equipment');

    // 设备类型筛选
    if (deviceType) {
      queryBuilder.andWhere('equipment.deviceType = :deviceType', {
        deviceType,
      });
    }

    // 设备状态筛选
    if (status) {
      queryBuilder.andWhere('equipment.status = :status', { status });
    }

    // 关键词搜索（设备编号或名称）
    if (keyword) {
      queryBuilder.andWhere(
        '(equipment.deviceId LIKE :keyword OR equipment.deviceName LIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 排序：按创建时间降序
    queryBuilder.orderBy('equipment.createdAt', 'DESC');

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 执行查询
    const [data, total] = await queryBuilder.getManyAndCount();

    // 计算总页数
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * 查询设备详情
   * @param id 设备ID
   * @returns 设备实体
   */
  async findOne(id: string): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException(`设备 ID ${id} 不存在`);
    }

    return equipment;
  }

  /**
   * 根据设备编号查询设备
   * @param deviceId 设备编号
   * @returns 设备实体
   */
  async findByDeviceId(deviceId: string): Promise<Equipment> {
    const equipment = await this.equipmentRepository.findOne({
      where: { deviceId },
    });

    if (!equipment) {
      throw new NotFoundException(`设备编号 ${deviceId} 不存在`);
    }

    return equipment;
  }

  /**
   * 更新设备信息
   * @param id 设备ID
   * @param updateEquipmentDto 更新的数据
   * @param userId 当前用户ID（用于审计）
   * @returns 更新后的设备实体
   */
  async update(
    id: string,
    updateEquipmentDto: UpdateEquipmentDto,
    userId: string,
  ): Promise<Equipment> {
    // 查询设备是否存在
    const equipment = await this.findOne(id);

    // 合并更新数据
    Object.assign(equipment, updateEquipmentDto);

    // 保存更新
    const updatedEquipment = await this.equipmentRepository.save(equipment);

    // 记录审计日志
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'equipment',
      resourceId: id,
      details: `更新设备：${updatedEquipment.deviceName} (${updatedEquipment.deviceId})`,
    });

    return updatedEquipment;
  }

  /**
   * 更新设备状态
   * @param id 设备ID
   * @param status 新状态
   * @param userId 当前用户ID（用于审计）
   * @returns 更新后的设备实体
   */
  async updateStatus(
    id: string,
    status: EquipmentStatus,
    userId: string,
  ): Promise<Equipment> {
    const equipment = await this.findOne(id);

    const oldStatus = equipment.status;
    equipment.status = status;

    const updatedEquipment = await this.equipmentRepository.save(equipment);

    // 记录审计日志
    await this.auditService.log({
      userId,
      action: AuditAction.UPDATE,
      resource: 'equipment',
      resourceId: id,
      details: `设备 ${equipment.deviceName} 状态变更：${oldStatus} -> ${status}`,
    });

    return updatedEquipment;
  }

  /**
   * 软删除设备
   * @param id 设备ID
   * @param userId 当前用户ID（用于审计）
   */
  async remove(id: string, userId: string): Promise<void> {
    const equipment = await this.findOne(id);

    // 执行软删除
    await this.equipmentRepository.softDelete(id);

    // 记录审计日志
    await this.auditService.log({
      userId,
      action: AuditAction.DELETE,
      resource: 'equipment',
      resourceId: id,
      details: `删除设备：${equipment.deviceName} (${equipment.deviceId})`,
    });
  }

  /**
   * 恢复已删除的设备
   * @param id 设备ID
   * @param userId 当前用户ID（用于审计）
   * @returns 恢复后的设备实体
   */
  async restore(id: string, userId: string): Promise<Equipment> {
    // 查找已删除的设备
    const equipment = await this.equipmentRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!equipment) {
      throw new NotFoundException(`设备 ID ${id} 不存在`);
    }

    if (!equipment.deletedAt) {
      throw new BadRequestException(
        `设备 ${equipment.deviceName} 未被删除，无需恢复`,
      );
    }

    // 恢复设备
    await this.equipmentRepository.restore(id);

    // 重新查询恢复后的设备
    const restoredEquipment = await this.findOne(id);

    // 记录审计日志
    await this.auditService.log({
      userId,
      action: AuditAction.RESTORE,
      resource: 'equipment',
      resourceId: id,
      details: `恢复设备：${equipment.deviceName} (${equipment.deviceId})`,
    });

    return restoredEquipment;
  }

  /**
   * 获取设备统计信息
   * @returns 各状态设备的数量统计
   */
  async getStatistics(): Promise<{
    total: number;
    normal: number;
    warning: number;
    fault: number;
    offline: number;
  }> {
    const total = await this.equipmentRepository.count();
    const normal = await this.equipmentRepository.count({
      where: { status: EquipmentStatus.NORMAL },
    });
    const warning = await this.equipmentRepository.count({
      where: { status: EquipmentStatus.WARNING },
    });
    const fault = await this.equipmentRepository.count({
      where: { status: EquipmentStatus.FAULT },
    });
    const offline = await this.equipmentRepository.count({
      where: { status: EquipmentStatus.OFFLINE },
    });

    return {
      total,
      normal,
      warning,
      fault,
      offline,
    };
  }

  // ========== 监测点相关方法 ==========

  /**
   * 查询设备的所有监测点
   *
   * @param equipmentId 设备ID（UUID）
   * @param queryDto 查询参数（分页、筛选）
   * @returns 分页的监测点列表和总数
   */
  async getMonitoringPoints(
    equipmentId: string,
    queryDto?: QueryMonitoringPointDto,
  ): Promise<{
    items: MonitoringPoint[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // 验证设备是否存在
    await this.findOne(equipmentId);

    const { page = 1, pageSize = 20, metricType, keyword } = queryDto || {};

    // 构建查询条件
    const queryBuilder = this.monitoringPointRepository
      .createQueryBuilder('mp')
      .where('mp.equipmentId = :equipmentId', { equipmentId });

    // 按指标类型筛选
    if (metricType) {
      queryBuilder.andWhere('mp.metricType = :metricType', { metricType });
    }

    // 关键词搜索（监测点名称）
    if (keyword) {
      queryBuilder.andWhere('mp.pointName LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    // 排序：按监测点名称升序
    queryBuilder.orderBy('mp.pointName', 'ASC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // 执行查询
    const [items, total] = await queryBuilder.getManyAndCount();

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 根据监测点名称查询单个监测点
   *
   * @param equipmentId 设备ID（UUID）
   * @param pointName 监测点名称
   * @returns 监测点实体，如果不存在返回 null
   */
  async getMonitoringPointByName(
    equipmentId: string,
    pointName: string,
  ): Promise<MonitoringPoint | null> {
    // 验证设备是否存在
    await this.findOne(equipmentId);

    const monitoringPoint = await this.monitoringPointRepository.findOne({
      where: {
        equipmentId,
        pointName,
      },
    });

    return monitoringPoint;
  }

  /**
   * 校验监测点是否为该设备的有效监测点
   *
   * 用于数据上报、导入、告警配置时的校验
   *
   * @param equipmentId 设备ID（UUID）
   * @param pointName 监测点名称
   * @param metricType 可选：同时校验指标类型是否一致
   * @throws NotFoundException 如果设备不存在
   * @throws BadRequestException 如果监测点无效或类型不匹配
   */
  async validateMonitoringPoint(
    equipmentId: string,
    pointName: string,
    metricType?: string,
  ): Promise<MonitoringPoint> {
    // 验证设备是否存在
    const equipment = await this.findOne(equipmentId);

    // 查询监测点
    const monitoringPoint = await this.getMonitoringPointByName(
      equipmentId,
      pointName,
    );

    if (!monitoringPoint) {
      throw new BadRequestException(
        `监测点 '${pointName}' 不是设备 ${equipment.deviceId} 的有效监测点。` +
          `请调用 GET /api/equipment/${equipmentId}/monitoring-points 获取有效监测点列表。`,
      );
    }

    // 如果提供了 metricType，验证类型是否一致
    if (metricType && monitoringPoint.metricType !== metricType) {
      throw new BadRequestException(
        `监测点 '${pointName}' 的指标类型应为 ${monitoringPoint.metricType}，但收到 ${metricType}。`,
      );
    }

    return monitoringPoint;
  }

  /**
   * 批量校验多个监测点（性能优化版本）
   *
   * 用于批量导入时的校验，避免逐条查询数据库
   *
   * @param equipmentId 设备ID（UUID）
   * @param pointNames 监测点名称数组
   * @returns 有效的监测点实体列表
   */
  async validateMonitoringPointsBatch(
    equipmentId: string,
    pointNames: string[],
  ): Promise<MonitoringPoint[]> {
    // 验证设备是否存在
    await this.findOne(equipmentId);

    if (pointNames.length === 0) {
      return [];
    }

    // 一次性加载该设备的所有监测点
    // 优化：只查询需要的监测点名称
    const monitoringPoints = await this.monitoringPointRepository
      .createQueryBuilder('mp')
      .where('mp.equipmentId = :equipmentId', { equipmentId })
      .andWhere('mp.pointName IN (:...pointNames)', { pointNames })
      .getMany();

    return monitoringPoints;
  }
}
