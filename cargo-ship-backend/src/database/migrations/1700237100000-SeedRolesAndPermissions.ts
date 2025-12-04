/**
 * 初始化角色和权限数据种子迁移
 *
 * @description
 * 为系统初始化基础的角色和权限数据，包括：
 * 1. 创建35个系统权限（涵盖设备、传感器数据、告警、报表、用户等资源）
 * 2. 创建3个系统角色（administrator, operator, viewer）
 * 3. 为每个角色分配对应的权限
 *
 * @author 系统生成
 * @date 2024-11-26
 * @version 2.0 - 统一权限体系
 * @migration-timestamp 1700237100000
 * @migration-name SeedRolesAndPermissions
 *
 * @依赖关系
 * 必须在InitialAuthSetup迁移之后执行，依赖permissions、roles、role_permissions表
 *
 * @变更历史
 * - 2024-11-26: 重构为新的35权限体系
 *   - 移除vessel、cargo、compartment、loading_plan、device_type资源
 *   - 将manage权限拆分为细粒度CRUD权限
 *   - 为sensor_data添加完整CRUD+导入导出权限
 *   - 为report添加完整CRUD+导出权限
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 种子数据迁移类 - 初始化角色和权限
 *
 * 该迁移创建系统的初始RBAC配置，定义了三种预设角色：
 * - administrator: 系统管理员，拥有所有权限（35个）
 * - operator: 操作员，拥有部分业务操作权限（16个）
 * - viewer: 查看者，仅拥有基础的只读权限（4个）
 *
 * @权限体系说明（最终版 - 2024-11-26）
 *
 * 权限采用"资源:操作"格式，例如：device:create
 *
 * 资源类型（9种）:
 * - device: 设备管理
 * - sensor_data: 传感器数据
 * - alert: 告警信息
 * - report: 报表管理
 * - user: 用户管理
 * - role: 角色管理
 * - permission: 权限管理
 * - audit_log: 审计日志
 * - system_config: 系统配置
 *
 * 操作类型（8种）:
 * - create: 创建
 * - read: 读取/查看
 * - update: 更新
 * - delete: 删除
 * - manage: 完全管理（已废弃，改用CRUD）
 * - export: 导出
 * - import: 导入
 * - approve: 审批
 *
 * @角色权限分配策略
 *
 * 1. administrator（管理员 - 35个权限）:
 *    - 拥有所有35个权限
 *    - 可以管理用户、角色、权限、系统配置
 *    - 可以查看和导出审计日志
 *    - 适用对象: 系统管理员、超级用户
 *
 * 2. operator（操作员 - 16个权限）:
 *    - device: 仅读取（read）
 *    - sensor_data: 创建、读取、更新、导入、导出（create, read, update, import, export）
 *    - alert: 完整CRUD（create, read, update, delete）
 *    - report: 创建、读取、更新、导出（create, read, update, export）
 *    - 不包括: 用户管理、角色管理、权限管理、系统配置、审计日志
 *    - 适用对象: 业务操作人员、设备管理员
 *
 * 3. viewer（查看者 - 4个权限）:
 *    - 仅拥有基础资源的read权限
 *    - device:read, sensor_data:read, alert:read, report:read
 *    - 不包括: 任何写入、管理、配置权限
 *    - 适用对象: 只读用户、报表查看人员
 *
 * @权限详细列表（35个）
 *
 * 设备管理（4个）:
 *   device:create, device:read, device:update, device:delete
 *
 * 传感器数据（6个）:
 *   sensor_data:create, sensor_data:read, sensor_data:update, sensor_data:delete,
 *   sensor_data:import, sensor_data:export
 *
 * 告警信息（4个）:
 *   alert:create, alert:read, alert:update, alert:delete
 *
 * 报表管理（5个）:
 *   report:create, report:read, report:update, report:delete, report:export
 *
 * 用户管理（4个）:
 *   user:create, user:read, user:update, user:delete
 *
 * 角色管理（4个）:
 *   role:create, role:read, role:update, role:delete
 *
 * 权限管理（4个）:
 *   permission:create, permission:read, permission:update, permission:delete
 *
 * 审计日志（2个）:
 *   audit_log:read, audit_log:export
 *
 * 系统配置（2个）:
 *   system_config:read, system_config:update
 */
export class SeedRolesAndPermissions1700237100000
  implements MigrationInterface
{
  /** 迁移名称（用于TypeORM识别） */
  name = 'SeedRolesAndPermissions1700237100000';

  /**
   * 执行数据库迁移（插入种子数据）
   *
   * @param {QueryRunner} queryRunner - TypeORM查询运行器
   * @returns {Promise<void>}
   *
   * @执行步骤
   * 1. 插入35个系统权限数据
   * 2. 创建3个系统角色（administrator, operator, viewer）
   * 3. 为administrator角色分配所有35个权限
   * 4. 为operator角色分配16个业务操作权限
   * 5. 为viewer角色分配4个基础只读权限
   *
   * @注意事项
   * - 所有数据的is_system字段设置为1，标记为系统内置数据
   * - 使用generateUUID()生成符合UUID v4格式的ID
   * - 权限和角色的关联通过role_permissions表建立
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 定义系统权限数据（35个权限）
    const permissionsData = [
      // ==========================================
      // 设备管理权限（4个）
      // ==========================================
      {
        name: 'device:create',
        resource: 'device',
        action: 'create',
        description: '创建设备',
      },
      {
        name: 'device:read',
        resource: 'device',
        action: 'read',
        description: '查看设备',
      },
      {
        name: 'device:update',
        resource: 'device',
        action: 'update',
        description: '更新设备',
      },
      {
        name: 'device:delete',
        resource: 'device',
        action: 'delete',
        description: '删除设备',
      },

      // ==========================================
      // 传感器数据权限（6个）
      // ==========================================
      {
        name: 'sensor_data:create',
        resource: 'sensor_data',
        action: 'create',
        description: '创建传感器数据',
      },
      {
        name: 'sensor_data:read',
        resource: 'sensor_data',
        action: 'read',
        description: '查看传感器数据',
      },
      {
        name: 'sensor_data:update',
        resource: 'sensor_data',
        action: 'update',
        description: '更新传感器数据',
      },
      {
        name: 'sensor_data:delete',
        resource: 'sensor_data',
        action: 'delete',
        description: '删除传感器数据',
      },
      {
        name: 'sensor_data:import',
        resource: 'sensor_data',
        action: 'import',
        description: '导入传感器数据',
      },
      {
        name: 'sensor_data:export',
        resource: 'sensor_data',
        action: 'export',
        description: '导出传感器数据',
      },

      // ==========================================
      // 告警信息权限（4个）
      // ==========================================
      {
        name: 'alert:create',
        resource: 'alert',
        action: 'create',
        description: '创建告警',
      },
      {
        name: 'alert:read',
        resource: 'alert',
        action: 'read',
        description: '查看告警',
      },
      {
        name: 'alert:update',
        resource: 'alert',
        action: 'update',
        description: '更新告警',
      },
      {
        name: 'alert:delete',
        resource: 'alert',
        action: 'delete',
        description: '删除告警',
      },

      // ==========================================
      // 报表管理权限（5个）
      // ==========================================
      {
        name: 'report:create',
        resource: 'report',
        action: 'create',
        description: '创建报表',
      },
      {
        name: 'report:read',
        resource: 'report',
        action: 'read',
        description: '查看报表',
      },
      {
        name: 'report:update',
        resource: 'report',
        action: 'update',
        description: '更新报表',
      },
      {
        name: 'report:delete',
        resource: 'report',
        action: 'delete',
        description: '删除报表',
      },
      {
        name: 'report:export',
        resource: 'report',
        action: 'export',
        description: '导出报表',
      },

      // ==========================================
      // 用户管理权限（4个）
      // ==========================================
      {
        name: 'user:create',
        resource: 'user',
        action: 'create',
        description: '创建用户',
      },
      {
        name: 'user:read',
        resource: 'user',
        action: 'read',
        description: '查看用户',
      },
      {
        name: 'user:update',
        resource: 'user',
        action: 'update',
        description: '更新用户',
      },
      {
        name: 'user:delete',
        resource: 'user',
        action: 'delete',
        description: '删除用户',
      },

      // ==========================================
      // 角色管理权限（4个）
      // ==========================================
      {
        name: 'role:create',
        resource: 'role',
        action: 'create',
        description: '创建角色',
      },
      {
        name: 'role:read',
        resource: 'role',
        action: 'read',
        description: '查看角色',
      },
      {
        name: 'role:update',
        resource: 'role',
        action: 'update',
        description: '更新角色',
      },
      {
        name: 'role:delete',
        resource: 'role',
        action: 'delete',
        description: '删除角色',
      },

      // ==========================================
      // 权限管理权限（4个）
      // ==========================================
      {
        name: 'permission:create',
        resource: 'permission',
        action: 'create',
        description: '创建权限',
      },
      {
        name: 'permission:read',
        resource: 'permission',
        action: 'read',
        description: '查看权限',
      },
      {
        name: 'permission:update',
        resource: 'permission',
        action: 'update',
        description: '更新权限',
      },
      {
        name: 'permission:delete',
        resource: 'permission',
        action: 'delete',
        description: '删除权限',
      },

      // ==========================================
      // 审计日志权限（2个）
      // ==========================================
      {
        name: 'audit_log:read',
        resource: 'audit_log',
        action: 'read',
        description: '查看审计日志',
      },
      {
        name: 'audit_log:export',
        resource: 'audit_log',
        action: 'export',
        description: '导出审计日志',
      },

      // ==========================================
      // 系统配置权限（2个）
      // ==========================================
      {
        name: 'system_config:read',
        resource: 'system_config',
        action: 'read',
        description: '查看系统配置',
      },
      {
        name: 'system_config:update',
        resource: 'system_config',
        action: 'update',
        description: '更新系统配置',
      },
    ];

    // 2. 插入权限数据到permissions表
    for (const perm of permissionsData) {
      const id = this.generateUUID();
      await queryRunner.query(
        `INSERT INTO permissions (id, name, resource, action, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [id, perm.name, perm.resource, perm.action, perm.description],
      );
    }

    // 3. 生成角色ID（使用UUID）
    const adminRoleId = this.generateUUID();
    const operatorRoleId = this.generateUUID();
    const viewerRoleId = this.generateUUID();

    // 4. 插入角色数据到roles表

    // 管理员角色 - 拥有所有35个权限
    await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_system, is_active, created_at, updated_at) VALUES (?, 'administrator', '系统管理员，拥有所有权限', 1, 1, NOW(), NOW())`,
      [adminRoleId],
    );

    // 操作员角色 - 拥有16个业务操作权限
    await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_system, is_active, created_at, updated_at) VALUES (?, 'operator', '操作员，拥有传感器数据操作、告警管理和报表导出权限', 1, 1, NOW(), NOW())`,
      [operatorRoleId],
    );

    // 查看者角色 - 仅拥有4个只读权限
    await queryRunner.query(
      `INSERT INTO roles (id, name, description, is_system, is_active, created_at, updated_at) VALUES (?, 'viewer', '查看者，仅拥有基础数据的只读权限', 1, 1, NOW(), NOW())`,
      [viewerRoleId],
    );

    // 5. 为administrator角色分配所有35个权限
    const allPermissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE is_system = 1`,
    );
    for (const perm of allPermissions) {
      await queryRunner.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [adminRoleId, perm.id],
      );
    }

    // 6. 为operator角色分配16个业务操作权限
    // operator权限列表（16个）:
    // - device:read (1)
    // - sensor_data:create, read, update, import, export (5)
    // - alert:create, read, update, delete (4)
    // - report:create, read, update, export (4)
    // 注意: operator不包括 device:create, device:update, device:delete
    const operatorPermissionNames = [
      'device:read',
      'sensor_data:create',
      'sensor_data:read',
      'sensor_data:update',
      'sensor_data:import',
      'sensor_data:export',
      'alert:create',
      'alert:read',
      'alert:update',
      'alert:delete',
      'report:create',
      'report:read',
      'report:update',
      'report:export',
    ];

    for (const permName of operatorPermissionNames) {
      const perm = await queryRunner.query(
        `SELECT id FROM permissions WHERE name = ? AND is_system = 1`,
        [permName],
      );
      if (perm.length > 0) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [operatorRoleId, perm[0].id],
        );
      }
    }

    // 7. 为viewer角色分配4个只读权限
    // viewer权限列表（4个）:
    // - device:read
    // - sensor_data:read
    // - alert:read
    // - report:read
    const viewerPermissionNames = [
      'device:read',
      'sensor_data:read',
      'alert:read',
      'report:read',
    ];

    for (const permName of viewerPermissionNames) {
      const perm = await queryRunner.query(
        `SELECT id FROM permissions WHERE name = ? AND is_system = 1`,
        [permName],
      );
      if (perm.length > 0) {
        await queryRunner.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [viewerRoleId, perm[0].id],
        );
      }
    }
  }

  /**
   * 回滚数据库迁移（删除种子数据）
   *
   * @param {QueryRunner} queryRunner - TypeORM查询运行器
   * @returns {Promise<void>}
   *
   * @执行步骤
   * 1. 删除所有角色-权限关联（role_permissions表）
   * 2. 删除所有系统角色（is_system = 1）
   * 3. 删除所有系统权限（is_system = 1）
   *
   * @注意事项
   * - 仅删除is_system=1的数据，保留用户自定义的角色和权限
   * - 由于外键级联删除，删除角色时会自动删除user_roles关联
   *
   * @警告
   * 执行此操作将删除所有系统预设的角色和权限，可能导致已有用户失去权限！
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 获取所有系统角色ID
    const systemRoles = await queryRunner.query(
      `SELECT id FROM roles WHERE is_system = 1`,
    );

    // 2. 删除这些角色的权限关联
    for (const role of systemRoles) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = ?`,
        [role.id],
      );
    }

    // 3. 删除系统角色
    await queryRunner.query(`DELETE FROM roles WHERE is_system = 1`);

    // 4. 删除系统权限
    await queryRunner.query(`DELETE FROM permissions WHERE is_system = 1`);
  }

  /**
   * 生成UUID v4格式的唯一标识符
   *
   * @returns {string} 符合UUID v4格式的字符串（如：550e8400-e29b-41d4-a716-446655440000）
   *
   * @实现说明
   * - 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
   * - 第13位固定为'4'（表示UUID版本4）
   * - 第17位为8、9、a或b（符合RFC 4122规范）
   * - 其他位为随机十六进制数字
   *
   * @示例
   * ```typescript
   * const uuid = this.generateUUID();
   * // 返回: "a3bb189e-8bf9-4c5d-bf3b-1e4d7e8d4c3a"
   * ```
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
