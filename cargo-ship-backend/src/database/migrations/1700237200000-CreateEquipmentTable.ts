import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * 创建设备表的数据库迁移
 * 包含设备台账管理所需的所有字段、索引和初始种子数据
 *
 * @description
 * 1. 创建 equipment 表结构
 * 2. 创建相关索引
 * 3. 插入8个系统级设备数据（基于 docs/data/ 业务需求文档）
 *
 * @author 系统生成
 * @date 2024-11-26
 * @version 2.0 - 重构为8个系统级设备
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
    // 第三步：插入初始设备数据（8个系统级设备）
    // 数据来源：docs/data/ 业务需求文档
    // 变更说明：从15个细粒度组件级设备重构为8个系统级设备
    // ==========================================

    // 定义设备数据（基于 docs/data/ 业务需求）
    const equipmentData = [
      // ==========================================
      // 1. 电池系统（1个）
      // 监测点数量：24个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-BAT-001',
        deviceName: '电池系统',
        deviceType: '电池装置',
        model: 'LFP-648V-300Ah',
        manufacturer: '某电池制造商',
        location: '电池舱',
        commissionDate: '2024-01-15',
        status: 'normal',
        description:
          '锂电池能源管理系统，包含BMS及所有电池单元，额定电压648V，总容量300Ah',
      },

      // ==========================================
      // 2. 左推进系统（1个）
      // 监测点数量：15个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-PROP-L-001',
        deviceName: '左推进系统',
        deviceType: '推进系统',
        model: 'PROP-L-1500kW',
        manufacturer: '某推进系统制造商',
        location: '机舱左侧',
        commissionDate: '2024-02-01',
        status: 'normal',
        description:
          '左侧推进电机及其逆变控制系统，永磁同步电机，额定功率1500kW',
      },

      // ==========================================
      // 3. 右推进系统（1个）
      // 监测点数量：15个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-PROP-R-001',
        deviceName: '右推进系统',
        deviceType: '推进系统',
        model: 'PROP-R-1500kW',
        manufacturer: '某推进系统制造商',
        location: '机舱右侧',
        commissionDate: '2024-02-01',
        status: 'normal',
        description:
          '右侧推进电机及其逆变控制系统，永磁同步电机，额定功率1500kW',
      },

      // ==========================================
      // 4. 1#日用逆变器系统（1个）
      // 监测点数量：10个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-INV-1-001',
        deviceName: '1#日用逆变器系统',
        deviceType: '逆变器系统',
        model: 'AC-INV-190A',
        manufacturer: '某逆变器制造商',
        location: '配电室',
        commissionDate: '2024-01-25',
        status: 'normal',
        description: '1号日用逆变器及配套设备，额定输出电流190A',
      },

      // ==========================================
      // 5. 2#日用逆变器系统（1个）
      // 监测点数量：10个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-INV-2-001',
        deviceName: '2#日用逆变器系统',
        deviceType: '逆变器系统',
        model: 'AC-INV-190A',
        manufacturer: '某逆变器制造商',
        location: '配电室',
        commissionDate: '2024-01-25',
        status: 'normal',
        description: '2号日用逆变器及配套设备，额定输出电流190A',
      },

      // ==========================================
      // 6. 直流配电板系统（1个）
      // 监测点数量：11个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-DCPD-001',
        deviceName: '直流配电板系统',
        deviceType: '配电系统',
        model: 'DCB-750V-1000A',
        manufacturer: '某配电设备制造商',
        location: '主配电室',
        commissionDate: '2024-01-20',
        status: 'normal',
        description: '直流母排配电及保护系统，额定电压750V，额定电流1000A',
      },

      // ==========================================
      // 7. 舱底水系统（1个）
      // 监测点数量：4个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-BILGE-001',
        deviceName: '舱底水系统',
        deviceType: '辅助系统',
        model: 'BW-Monitor-4Wells',
        manufacturer: '某传感器制造商',
        location: '舱底各区',
        commissionDate: '2024-01-10',
        status: 'normal',
        description: '舱底水集水井及排水系统，包含4个集水井水位监测',
      },

      // ==========================================
      // 8. 冷却水泵系统（1个）
      // 监测点数量：5个
      // ==========================================
      {
        id: this.generateUUID(),
        deviceId: 'SYS-COOL-001',
        deviceName: '冷却水泵系统',
        deviceType: '辅助系统',
        model: 'CP-Dual-100L',
        manufacturer: '某泵制造商',
        location: '机舱',
        commissionDate: '2024-02-05',
        status: 'normal',
        description:
          '冷却水循环泵及管路系统，包含2台泵，额定流量100L/min，额定压力0.1MPa',
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

    console.log('✅ 设备表创建完成，已插入8个系统级设备');
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
