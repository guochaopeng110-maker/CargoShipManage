import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * 创建设备表的数据库迁移
 * 包含设备台账管理所需的所有字段、索引和初始种子数据
 *
 * @description
 * 1. 创建 equipment 表结构
 * 2. 创建相关索引
 * 3. 插入15个初始设备数据（基于 test-data-spec.md 第 2.2 节）
 *
 * @author 系统生成
 * @date 2024-11-26
 * @version 1.1 - 添加种子数据
 */
export class CreateEquipmentTable1700237200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==========================================
    // 第一步：创建设备表
    // ==========================================
    await queryRunner.createTable(
      new Table({
        name: 'equipment',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            comment: 'UUID主键',
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '50',
            isUnique: true,
            isNullable: false,
            comment: '设备编号（唯一标识）',
          },
          {
            name: 'device_name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: '设备名称',
          },
          {
            name: 'device_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: '设备类型',
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '设备型号',
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '制造商',
          },
          {
            name: 'location',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '安装位置',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['normal', 'warning', 'fault', 'offline'],
            default: "'normal'",
            isNullable: false,
            comment: '设备状态',
          },
          {
            name: 'commission_date',
            type: 'date',
            isNullable: true,
            comment: '投产日期',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '设备描述',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '创建时间',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '更新时间',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
            comment: '软删除时间',
          },
        ],
      }),
      true,
    );

    // ==========================================
    // 第二步：创建索引
    // ==========================================

    // 创建设备编号唯一索引
    await queryRunner.createIndex(
      'equipment',
      new TableIndex({
        name: 'idx_equipment_device_id',
        columnNames: ['device_id'],
        isUnique: true,
      }),
    );

    // 创建设备状态索引（用于统计和筛选）
    await queryRunner.createIndex(
      'equipment',
      new TableIndex({
        name: 'idx_equipment_status',
        columnNames: ['status'],
      }),
    );

    // 创建设备类型索引（用于筛选）
    await queryRunner.createIndex(
      'equipment',
      new TableIndex({
        name: 'idx_equipment_device_type',
        columnNames: ['device_type'],
      }),
    );

    // 创建创建时间索引（用于排序）
    await queryRunner.createIndex(
      'equipment',
      new TableIndex({
        name: 'idx_equipment_created_at',
        columnNames: ['created_at'],
      }),
    );

    // 创建软删除索引（用于过滤已删除记录）
    await queryRunner.createIndex(
      'equipment',
      new TableIndex({
        name: 'idx_equipment_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );

    // 创建设备名称索引（用于搜索）
    await queryRunner.createIndex(
      'equipment',
      new TableIndex({
        name: 'idx_equipment_device_name',
        columnNames: ['device_name'],
      }),
    );

    // ==========================================
    // 第三步：插入初始设备数据（15个设备）
    // 数据来源：test-data-spec.md 第 2.2 节
    // ==========================================

    // 定义设备数据（基于 test-data-spec.md）
    const equipmentData = [
      // ==========================================
      // 电池系统（2个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'BATT-001',
        deviceName: '1#电池组',
        deviceType: '电池系统',
        model: 'LFP-648V-150Ah',
        manufacturer: '某电池制造商',
        location: '电池舱',
        commissionDate: '2024-01-15',
        status: 'normal',
        description: '储能电池系统，额定电压648V，容量150Ah',
      },
      {
        id: this.generateUUID(),
        deviceId: 'BATT-002',
        deviceName: '2#电池组',
        deviceType: '电池系统',
        model: 'LFP-648V-150Ah',
        manufacturer: '某电池制造商',
        location: '电池舱',
        commissionDate: '2024-01-15',
        status: 'normal',
        description: '储能电池系统，额定电压648V，容量150Ah',
      },

      // ==========================================
      // 推进系统 - 推进电机（2个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'MOTOR-L-001',
        deviceName: '左推进电机',
        deviceType: '推进电机',
        model: 'PM-1500-400V',
        manufacturer: '某电机制造商',
        location: '机舱左侧',
        commissionDate: '2024-02-01',
        status: 'normal',
        description: '永磁同步电机，额定功率1500kW，额定电压400V',
      },
      {
        id: this.generateUUID(),
        deviceId: 'MOTOR-R-001',
        deviceName: '右推进电机',
        deviceType: '推进电机',
        model: 'PM-1500-400V',
        manufacturer: '某电机制造商',
        location: '机舱右侧',
        commissionDate: '2024-02-01',
        status: 'normal',
        description: '永磁同步电机，额定功率1500kW，额定电压400V',
      },

      // ==========================================
      // 推进系统 - 推进逆变器（2个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'INV-L-001',
        deviceName: '左推进逆变器',
        deviceType: '推进逆变器',
        model: 'INV-600A-750V',
        manufacturer: '某逆变器制造商',
        location: '机舱左侧',
        commissionDate: '2024-02-01',
        status: 'normal',
        description: '三相逆变器，额定电流600A，额定电压750V',
      },
      {
        id: this.generateUUID(),
        deviceId: 'INV-R-001',
        deviceName: '右推进逆变器',
        deviceType: '推进逆变器',
        model: 'INV-600A-750V',
        manufacturer: '某逆变器制造商',
        location: '机舱右侧',
        commissionDate: '2024-02-01',
        status: 'normal',
        description: '三相逆变器，额定电流600A，额定电压750V',
      },

      // ==========================================
      // 配电系统 - 直流配电板（1个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'DC-BOARD-001',
        deviceName: '主直流配电板',
        deviceType: '直流配电板',
        model: 'DCB-750V-1000A',
        manufacturer: '某配电设备制造商',
        location: '主配电室',
        commissionDate: '2024-01-20',
        status: 'normal',
        description: '直流配电板，额定电压750V，额定电流1000A',
      },

      // ==========================================
      // 配电系统 - 日用逆变器（2个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'INV-AC-001',
        deviceName: '1#日用逆变器',
        deviceType: '日用逆变器',
        model: 'AC-INV-190A',
        manufacturer: '某逆变器制造商',
        location: '配电室',
        commissionDate: '2024-01-25',
        status: 'normal',
        description: '日用交流逆变器，额定输出电流190A',
      },
      {
        id: this.generateUUID(),
        deviceId: 'INV-AC-002',
        deviceName: '2#日用逆变器',
        deviceType: '日用逆变器',
        model: 'AC-INV-190A',
        manufacturer: '某逆变器制造商',
        location: '配电室',
        commissionDate: '2024-01-25',
        status: 'normal',
        description: '日用交流逆变器，额定输出电流190A',
      },

      // ==========================================
      // 辅助系统 - 冷却水泵（2个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'PUMP-COOL-001',
        deviceName: '1#冷却水泵',
        deviceType: '冷却水泵',
        model: 'CP-100-0.1MPa',
        manufacturer: '某泵制造商',
        location: '机舱',
        commissionDate: '2024-02-05',
        status: 'normal',
        description: '齿轮箱冷却水泵，额定流量100L/min，额定压力0.1MPa',
      },
      {
        id: this.generateUUID(),
        deviceId: 'PUMP-COOL-002',
        deviceName: '2#冷却水泵',
        deviceType: '冷却水泵',
        model: 'CP-100-0.1MPa',
        manufacturer: '某泵制造商',
        location: '机舱',
        commissionDate: '2024-02-05',
        status: 'normal',
        description: '齿轮箱冷却水泵，额定流量100L/min，额定压力0.1MPa',
      },

      // ==========================================
      // 辅助系统 - 舱底水井（4个）
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'WELL-001',
        deviceName: '1#集水井',
        deviceType: '舱底水井',
        model: 'BW-Monitor',
        manufacturer: '某传感器制造商',
        location: '舱底1区',
        commissionDate: '2024-01-10',
        status: 'normal',
        description: '舱底集水井水位监测系统',
      },
      {
        id: this.generateUUID(),
        deviceId: 'WELL-002',
        deviceName: '2#集水井',
        deviceType: '舱底水井',
        model: 'BW-Monitor',
        manufacturer: '某传感器制造商',
        location: '舱底2区',
        commissionDate: '2024-01-10',
        status: 'normal',
        description: '舱底集水井水位监测系统',
      },
      {
        id: this.generateUUID(),
        deviceId: 'WELL-003',
        deviceName: '3#集水井',
        deviceType: '舱底水井',
        model: 'BW-Monitor',
        manufacturer: '某传感器制造商',
        location: '舱底3区',
        commissionDate: '2024-01-10',
        status: 'normal',
        description: '舱底集水井水位监测系统',
      },
      {
        id: this.generateUUID(),
        deviceId: 'WELL-004',
        deviceName: '4#集水井',
        deviceType: '舱底水井',
        model: 'BW-Monitor',
        manufacturer: '某传感器制造商',
        location: '舱底4区',
        commissionDate: '2024-01-10',
        status: 'normal',
        description: '舱底集水井水位监测系统',
      },
    ];

    // 插入设备数据到 equipment 表
    for (const equipment of equipmentData) {
      await queryRunner.query(
        `INSERT INTO equipment (
          id,
          device_id,
          device_name,
          device_type,
          model,
          manufacturer,
          location,
          status,
          commission_date,
          description,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          equipment.id,
          equipment.deviceId,
          equipment.deviceName,
          equipment.deviceType,
          equipment.model,
          equipment.manufacturer,
          equipment.location,
          equipment.status,
          equipment.commissionDate,
          equipment.description,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除所有索引
    await queryRunner.dropIndex('equipment', 'idx_equipment_device_name');
    await queryRunner.dropIndex('equipment', 'idx_equipment_deleted_at');
    await queryRunner.dropIndex('equipment', 'idx_equipment_created_at');
    await queryRunner.dropIndex('equipment', 'idx_equipment_device_type');
    await queryRunner.dropIndex('equipment', 'idx_equipment_status');
    await queryRunner.dropIndex('equipment', 'idx_equipment_device_id');

    // 删除设备表（会自动删除表中的所有数据）
    await queryRunner.dropTable('equipment');
  }

  /**
   * 生成UUID v4格式的唯一标识符
   *
   * @returns {string} 符合UUID v4格式的字符串
   *
   * @example
   * const uuid = this.generateUUID();
   * // 返回: "a3bb189e-8bf9-4c5d-bf3b-1e4d7e8d4c3a"
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0; // 生成0-15的随机整数
        const v = c === 'x' ? r : (r & 0x3) | 0x8; // x位随机，y位限制为8-b
        return v.toString(16); // 转换为十六进制字符串
      },
    );
  }
}
