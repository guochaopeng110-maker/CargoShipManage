/**
 * 测试用户数据迁移
 *
 * @description
 * 为开发和测试环境准备3个测试用户：
 * 1. admin (管理员) - 拥有 administrator 角色，所有权限
 * 2. operator (操作员) - 拥有 operator 角色，设备和监测操作权限
 * 3. viewer (查看者) - 拥有 viewer 角色，只读权限
 *
 * @prerequisite
 * 此迁移依赖 roles 和 permissions 表已完成初始化
 *
 * @author 系统生成
 * @date 2024-12-07
 * @version 1.0 - 从 SeedTestData 迁移拆分出用户数据部分
 */

import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedTestUsers1732610000000 implements MigrationInterface {
  name = 'SeedTestUsers1732610000000';

  /**
   * 生成UUID (简单实现)
   * 用于生成用户的唯一标识符
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }

  /**
   * 执行迁移：插入测试用户数据
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // 1. 检查是否已经执行过此迁移（幂等性检查）
    // ========================================
    const existingUser = await queryRunner.query(
      `SELECT COUNT(*) as count FROM users WHERE username = 'admin'`,
    );

    if (existingUser[0].count > 0) {
      console.log('⚠️  检测到测试用户数据已存在，跳过迁移');
      return;
    }

    // ========================================
    // 2. 生成加密密码
    // ========================================
    console.log('开始生成测试用户密码...');

    // 使用 bcrypt 加密密码，盐值为 10
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const operatorPasswordHash = await bcrypt.hash('operator123', 10);
    const viewerPasswordHash = await bcrypt.hash('viewer123', 10);

    // ========================================
    // 3. 生成用户UUID
    // ========================================
    const adminId = this.generateUUID();
    const operatorId = this.generateUUID();
    const viewerId = this.generateUUID();

    console.log('开始插入测试用户数据...');

    // ========================================
    // 4. 插入3个测试用户
    // ========================================
    await queryRunner.query(
      `
      INSERT INTO users (id, username, email, password, full_name, status, created_at, updated_at)
      VALUES
        (?, 'admin', 'admin@cargoship.com', ?, '系统管理员', 'active', NOW(), NOW()),
        (?, 'operator', 'operator@cargoship.com', ?, '设备操作员', 'active', NOW(), NOW()),
        (?, 'viewer', 'viewer@cargoship.com', ?, '数据查看者', 'active', NOW(), NOW())
    `,
      [
        adminId,
        adminPasswordHash,
        operatorId,
        operatorPasswordHash,
        viewerId,
        viewerPasswordHash,
      ],
    );

    console.log('✅ 测试用户插入完成');

    // ========================================
    // 5. 获取角色ID
    // ========================================
    const roles = await queryRunner.query(
      `SELECT id, name FROM roles WHERE name IN ('administrator', 'operator', 'viewer')`,
    );

    // 将角色数组转换为 Map，方便查找
    const roleMap = roles.reduce((acc: any, role: any) => {
      acc[role.name] = role.id;
      return acc;
    }, {});

    console.log('开始关联用户角色...');

    // ========================================
    // 6. 关联用户角色（user_roles 表）
    // ========================================
    // admin 用户关联 administrator 角色
    if (roleMap['administrator']) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [adminId, roleMap['administrator']],
      );
    }

    // operator 用户关联 operator 角色
    if (roleMap['operator']) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [operatorId, roleMap['operator']],
      );
    }

    // viewer 用户关联 viewer 角色
    if (roleMap['viewer']) {
      await queryRunner.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [viewerId, roleMap['viewer']],
      );
    }

    console.log('✅ 用户角色关联完成');
    console.log('✅ 测试用户数据迁移完成，共创建 3 个测试用户');
  }

  /**
   * 回滚迁移：删除测试用户数据
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('开始回滚测试用户数据...');

    // ========================================
    // 1. 删除用户角色关联（user_roles 表）
    // ========================================
    await queryRunner.query(
      `DELETE FROM user_roles WHERE user_id IN (
        SELECT id FROM users WHERE username IN ('admin', 'operator', 'viewer')
      )`,
    );

    console.log('✅ 用户角色关联已删除');

    // ========================================
    // 2. 删除测试用户
    // ========================================
    await queryRunner.query(
      `DELETE FROM users WHERE username IN ('admin', 'operator', 'viewer')`,
    );

    console.log('✅ 测试用户已删除');
    console.log('✅ 测试用户数据回滚完成');
  }
}
