/**
 * 初始化认证授权系统数据库架构迁移
 *
 * @description
 * 创建认证授权系统所需的核心数据表，包括：
 * 1. permissions - 权限表（定义系统中所有可用权限）
 * 2. roles - 角色表（定义用户角色）
 * 3. users - 用户表（存储用户账户信息）
 * 4. audit_logs - 审计日志表（记录所有重要操作）
 * 5. role_permissions - 角色权限关联表（多对多）
 * 6. user_roles - 用户角色关联表（多对多）
 *
 * @author 系统生成
 * @date 2024-01-15
 * @migration-timestamp 1700237000000
 * @migration-name InitialAuthSetup
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 初始认证授权系统设置迁移类
 *
 * 该迁移创建完整的RBAC（基于角色的访问控制）数据库架构，
 * 包括用户管理、角色管理、权限管理和审计日志功能。
 *
 * @表结构详细说明
 *
 * 1. permissions表 - 权限定义表
 *    字段:
 *    - id: varchar(36) - 权限UUID
 *    - name: varchar(100) - 权限名称（唯一）
 *    - resource: enum - 资源类型（device, user, role等14种）
 *    - action: enum - 操作动作（create, read, update, delete等8种）
 *    - description: varchar(255) - 权限描述
 *    - is_system: tinyint - 是否系统内置权限（1=是，0=否）
 *    - created_at, updated_at: datetime(6) - 时间戳
 *    索引:
 *    - UNIQUE IDX_permissions_name: name（权限名称唯一）
 *    - UNIQUE IDX_permissions_resource_action: (resource, action)（资源+动作组合唯一）
 *
 * 2. roles表 - 角色定义表
 *    字段:
 *    - id: varchar(36) - 角色UUID
 *    - name: varchar(50) - 角色名称（唯一）
 *    - description: varchar(255) - 角色描述
 *    - is_system: tinyint - 是否系统内置角色
 *    - is_active: tinyint - 是否激活（1=激活，0=停用）
 *    - created_at, updated_at, deleted_at: datetime(6) - 时间戳（支持软删除）
 *    索引:
 *    - UNIQUE IDX_roles_name: name（角色名称唯一）
 *
 * 3. users表 - 用户账户表
 *    字段:
 *    - id: varchar(36) - 用户UUID
 *    - username: varchar(50) - 用户名（唯一）
 *    - email: varchar(100) - 邮箱地址（唯一）
 *    - password: varchar(255) - 加密密码（bcrypt）
 *    - full_name: varchar(100) - 用户全名
 *    - phone_number: varchar(20) - 电话号码
 *    - status: enum - 账户状态（active, inactive, locked, pending）
 *    - last_login_at: datetime - 最后登录时间
 *    - last_login_ip: varchar(45) - 最后登录IP（支持IPv6）
 *    - failed_login_attempts: int - 登录失败次数
 *    - locked_until: datetime - 账户锁定截止时间
 *    - password_changed_at: datetime - 密码修改时间
 *    - refresh_token: text - 刷新令牌
 *    - created_at, updated_at, deleted_at: datetime(6) - 时间戳（支持软删除）
 *    索引:
 *    - UNIQUE IDX_users_username: username
 *    - UNIQUE IDX_users_email: email
 *
 * 4. audit_logs表 - 审计日志表
 *    字段:
 *    - id: varchar(36) - 日志UUID
 *    - user_id: varchar(36) - 操作用户ID（外键）
 *    - action: enum - 操作动作（17种：login, logout, create, update等）
 *    - resource: varchar(100) - 操作资源
 *    - resource_id: varchar(100) - 资源ID
 *    - details: text - 操作详情
 *    - old_values: json - 修改前的值
 *    - new_values: json - 修改后的值
 *    - ip_address: varchar(45) - 客户端IP
 *    - user_agent: varchar(255) - 用户代理
 *    - success: tinyint - 操作是否成功（1=成功，0=失败）
 *    - error_message: text - 错误信息
 *    - duration: int - 操作耗时（毫秒）
 *    - created_at: datetime(6) - 创建时间
 *    索引:
 *    - IDX_audit_logs_user_created: (user_id, created_at)
 *    - IDX_audit_logs_resource_created: (resource, created_at)
 *    - IDX_audit_logs_action_created: (action, created_at)
 *    外键:
 *    - user_id -> users.id (ON DELETE SET NULL)
 *
 * 5. role_permissions表 - 角色权限关联表（多对多）
 *    字段:
 *    - role_id: varchar(36) - 角色ID
 *    - permission_id: varchar(36) - 权限ID
 *    主键: (role_id, permission_id) - 复合主键
 *    索引:
 *    - IDX_role_permissions_role: role_id
 *    - IDX_role_permissions_permission: permission_id
 *    外键:
 *    - role_id -> roles.id (ON DELETE CASCADE)
 *    - permission_id -> permissions.id (ON DELETE CASCADE)
 *
 * 6. user_roles表 - 用户角色关联表（多对多）
 *    字段:
 *    - user_id: varchar(36) - 用户ID
 *    - role_id: varchar(36) - 角色ID
 *    主键: (user_id, role_id) - 复合主键
 *    索引:
 *    - IDX_user_roles_user: user_id
 *    - IDX_user_roles_role: role_id
 *    外键:
 *    - user_id -> users.id (ON DELETE CASCADE)
 *    - role_id -> roles.id (ON DELETE CASCADE)
 *
 * @执行顺序
 * up():
 *   1. 创建基础表（permissions, roles, users, audit_logs）
 *   2. 创建关联表（role_permissions, user_roles）
 *   3. 添加外键约束
 *
 * down():
 *   1. 删除外键约束
 *   2. 删除关联表
 *   3. 删除基础表
 */
export class InitialAuthSetup1700237000000 implements MigrationInterface {
  /** 迁移名称（用于TypeORM识别） */
  name = 'InitialAuthSetup1700237000000';

  /**
   * 执行数据库迁移（创建表结构）
   *
   * @param {QueryRunner} queryRunner - TypeORM查询运行器
   * @returns {Promise<void>}
   *
   * @执行步骤
   * 1. 创建permissions表（权限定义）
   * 2. 创建roles表（角色定义）
   * 3. 创建users表（用户账户）
   * 4. 创建audit_logs表（审计日志）
   * 5. 创建role_permissions表（角色-权限关联）
   * 6. 创建user_roles表（用户-角色关联）
   * 7. 添加外键约束（建立表间关系）
   *
   * @注意事项
   * - 使用InnoDB引擎确保事务和外键支持
   * - 使用utf8mb4字符集支持emoji和特殊字符
   * - 所有主键使用UUID（varchar(36)）提高分布式兼容性
   * - 时间字段使用datetime(6)精确到微秒
   * - 关联表的外键设置为CASCADE删除，保证数据一致性
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建权限表
    // 定义系统中所有可用的权限，采用resource:action模式
    await queryRunner.query(`
      CREATE TABLE \`permissions\` (
        \`id\` varchar(36) NOT NULL COMMENT '权限ID（UUID）',
        \`name\` varchar(100) NOT NULL COMMENT '权限名称（如：device:create）',
        \`resource\` enum('device','device_type','vessel','compartment','cargo','loading_plan','sensor_data','alert','user','role','permission','audit_log','system_config','report') NOT NULL COMMENT '资源类型',
        \`action\` enum('create','read','update','delete','manage','export','import','approve') NOT NULL COMMENT '操作动作',
        \`description\` varchar(255) NULL COMMENT '权限描述',
        \`is_system\` tinyint NOT NULL DEFAULT 0 COMMENT '是否系统内置权限（1=是，0=否，系统权限不可删除）',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        UNIQUE INDEX \`IDX_permissions_name\` (\`name\`),
        UNIQUE INDEX \`IDX_permissions_resource_action\` (\`resource\`, \`action\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';
    `);

    // 2. 创建角色表
    // 定义用户角色，每个角色关联多个权限
    await queryRunner.query(`
      CREATE TABLE \`roles\` (
        \`id\` varchar(36) NOT NULL COMMENT '角色ID（UUID）',
        \`name\` varchar(50) NOT NULL COMMENT '角色名称（唯一）',
        \`description\` varchar(255) NULL COMMENT '角色描述',
        \`is_system\` tinyint NOT NULL DEFAULT 0 COMMENT '是否系统内置角色（1=是，0=否，系统角色不可删除）',
        \`is_active\` tinyint NOT NULL DEFAULT 1 COMMENT '是否激活（1=激活，0=停用）',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        \`deleted_at\` datetime(6) NULL COMMENT '删除时间（软删除）',
        UNIQUE INDEX \`IDX_roles_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';
    `);

    // 3. 创建用户表
    // 存储用户账户信息、登录状态、安全信息
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` varchar(36) NOT NULL COMMENT '用户ID（UUID）',
        \`username\` varchar(50) NOT NULL COMMENT '用户名（唯一，用于登录）',
        \`email\` varchar(100) NOT NULL COMMENT '邮箱地址（唯一）',
        \`password\` varchar(255) NOT NULL COMMENT '密码（bcrypt加密存储）',
        \`full_name\` varchar(100) NOT NULL COMMENT '用户全名',
        \`phone_number\` varchar(20) NULL COMMENT '电话号码',
        \`status\` enum('active','inactive','locked','pending') NOT NULL DEFAULT 'active' COMMENT '账户状态：active-活跃，inactive-停用，locked-锁定，pending-待激活',
        \`last_login_at\` datetime NULL COMMENT '最后登录时间',
        \`last_login_ip\` varchar(45) NULL COMMENT '最后登录IP地址（支持IPv6）',
        \`failed_login_attempts\` int NOT NULL DEFAULT 0 COMMENT '连续登录失败次数（用于账户锁定机制）',
        \`locked_until\` datetime NULL COMMENT '账户锁定截止时间',
        \`password_changed_at\` datetime NULL COMMENT '密码最后修改时间',
        \`refresh_token\` text NULL COMMENT 'JWT刷新令牌',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
        \`deleted_at\` datetime(6) NULL COMMENT '删除时间（软删除）',
        UNIQUE INDEX \`IDX_users_username\` (\`username\`),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
    `);

    // 4. 创建审计日志表
    // 记录所有重要操作，用于安全审计和问题追踪
    await queryRunner.query(`
      CREATE TABLE \`audit_logs\` (
        \`id\` varchar(36) NOT NULL COMMENT '日志ID（UUID）',
        \`user_id\` varchar(36) NULL COMMENT '操作用户ID（外键关联users表）',
        \`action\` enum('login','logout','login_failed','password_changed','password_reset','create','read','update','delete','restore','export','import','approve','reject','submit','config_change','permission_change') NOT NULL COMMENT '操作动作',
        \`resource\` varchar(100) NOT NULL COMMENT '操作资源（如：user, device, role）',
        \`resource_id\` varchar(100) NULL COMMENT '资源ID（被操作对象的ID）',
        \`details\` text NULL COMMENT '操作详细信息',
        \`old_values\` json NULL COMMENT '修改前的值（JSON格式）',
        \`new_values\` json NULL COMMENT '修改后的值（JSON格式）',
        \`ip_address\` varchar(45) NULL COMMENT '客户端IP地址',
        \`user_agent\` varchar(255) NULL COMMENT '用户代理字符串',
        \`success\` tinyint NOT NULL DEFAULT 1 COMMENT '操作是否成功（1=成功，0=失败）',
        \`error_message\` text NULL COMMENT '错误信息（操作失败时记录）',
        \`duration\` int NULL COMMENT '操作耗时（毫秒）',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
        INDEX \`IDX_audit_logs_user_created\` (\`user_id\`, \`created_at\`),
        INDEX \`IDX_audit_logs_resource_created\` (\`resource\`, \`created_at\`),
        INDEX \`IDX_audit_logs_action_created\` (\`action\`, \`created_at\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';
    `);

    // 5. 创建角色-权限关联表（多对多）
    // 定义每个角色拥有哪些权限
    await queryRunner.query(`
      CREATE TABLE \`role_permissions\` (
        \`role_id\` varchar(36) NOT NULL COMMENT '角色ID',
        \`permission_id\` varchar(36) NOT NULL COMMENT '权限ID',
        INDEX \`IDX_role_permissions_role\` (\`role_id\`),
        INDEX \`IDX_role_permissions_permission\` (\`permission_id\`),
        PRIMARY KEY (\`role_id\`, \`permission_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表（多对多）';
    `);

    // 6. 创建用户-角色关联表（多对多）
    // 定义每个用户拥有哪些角色
    await queryRunner.query(`
      CREATE TABLE \`user_roles\` (
        \`user_id\` varchar(36) NOT NULL COMMENT '用户ID',
        \`role_id\` varchar(36) NOT NULL COMMENT '角色ID',
        INDEX \`IDX_user_roles_user\` (\`user_id\`),
        INDEX \`IDX_user_roles_role\` (\`role_id\`),
        PRIMARY KEY (\`user_id\`, \`role_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表（多对多）';
    `);

    // 7. 添加外键约束
    // 建立表间关系，确保引用完整性

    // 审计日志 -> 用户（SET NULL: 用户删除后日志保留但user_id置空）
    await queryRunner.query(`
      ALTER TABLE \`audit_logs\`
      ADD CONSTRAINT \`FK_audit_logs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION;
    `);

    // 角色权限关联 -> 角色（CASCADE: 角色删除时级联删除关联）
    await queryRunner.query(`
      ALTER TABLE \`role_permissions\`
      ADD CONSTRAINT \`FK_role_permissions_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    // 角色权限关联 -> 权限（CASCADE: 权限删除时级联删除关联）
    await queryRunner.query(`
      ALTER TABLE \`role_permissions\`
      ADD CONSTRAINT \`FK_role_permissions_permission\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    // 用户角色关联 -> 用户（CASCADE: 用户删除时级联删除关联）
    await queryRunner.query(`
      ALTER TABLE \`user_roles\`
      ADD CONSTRAINT \`FK_user_roles_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION;
    `);

    // 用户角色关联 -> 角色（CASCADE: 角色删除时级联删除关联）
    await queryRunner.query(`
      ALTER TABLE \`user_roles\`
      ADD CONSTRAINT \`FK_user_roles_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION;
    `);
  }

  /**
   * 回滚数据库迁移（删除表结构）
   *
   * @param {QueryRunner} queryRunner - TypeORM查询运行器
   * @returns {Promise<void>}
   *
   * @执行步骤
   * 按与up()相反的顺序执行：
   * 1. 删除所有外键约束
   * 2. 删除关联表（user_roles, role_permissions）
   * 3. 删除基础表（audit_logs, users, roles, permissions）
   *
   * @警告
   * - 此操作将删除所有相关数据，且无法恢复！
   * - 仅在开发环境或明确需要回滚时使用
   * - 生产环境应谨慎执行此操作
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 删除外键约束
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_user_roles_role\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`user_roles\` DROP FOREIGN KEY \`FK_user_roles_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`FK_role_permissions_permission\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`FK_role_permissions_role\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_audit_logs_user\``,
    );

    // 2. 删除关联表
    await queryRunner.query(`DROP TABLE \`user_roles\``);
    await queryRunner.query(`DROP TABLE \`role_permissions\``);

    // 3. 删除基础表
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`roles\``);
    await queryRunner.query(`DROP TABLE \`permissions\``);
  }
}
