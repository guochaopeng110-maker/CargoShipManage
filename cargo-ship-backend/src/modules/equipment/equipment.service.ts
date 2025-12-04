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
import { AuditAction } from '../../database/entities/audit-log.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
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
    limit: number;
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
      limit,
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
}
