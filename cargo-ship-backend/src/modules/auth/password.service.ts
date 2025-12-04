/**
 * 密码服务类
 *
 * 描述：提供密码加密、验证和强度检查功能
 *
 * 职责：
 * - 使用bcrypt算法加密密码
 * - 验证明文密码与加密密码是否匹配
 * - 检查密码强度是否符合安全要求
 *
 * 安全特性：
 * - 使用bcrypt算法（抗彩虹表攻击）
 * - 自动加盐（salt rounds = 10）
 * - 强制密码复杂度要求
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

/**
 * 密码服务
 *
 * 提供安全的密码处理功能
 */
@Injectable()
export class PasswordService {
  /**
   * bcrypt加密的盐轮数
   *
   * 说明：
   * - 值越大，加密越安全，但性能开销越大
   * - 10是推荐的平衡值
   * - 每增加1，计算时间翻倍
   */
  private readonly saltRounds = 10;

  /**
   * 加密明文密码
   *
   * 功能：
   * - 使用bcrypt算法对密码进行单向加密
   * - 自动生成随机盐值
   * - 返回包含盐值和加密结果的哈希字符串
   *
   * 安全性：
   * - 相同密码每次加密结果不同（因为盐值随机）
   * - 不可逆，无法从哈希值还原原密码
   * - 抗暴力破解和彩虹表攻击
   *
   * @param password - 明文密码
   * @returns 加密后的密码哈希值
   *
   * @example
   * const hashed = await passwordService.hashPassword('MyPassword123!');
   * // 返回类似: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 验证密码是否匹配
   *
   * 功能：
   * - 比较明文密码与加密后的密码是否匹配
   * - 自动处理盐值提取和验证
   *
   * 用途：
   * - 用户登录时验证密码
   * - 修改密码时验证旧密码
   * - 刷新令牌验证
   *
   * @param password - 明文密码
   * @param hashedPassword - 加密后的密码哈希值
   * @returns true表示密码匹配，false表示不匹配
   *
   * @example
   * const isValid = await passwordService.comparePassword('MyPassword123!', hashedPassword);
   * if (isValid) {
   *   console.log('密码正确');
   * }
   */
  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * 验证密码强度
   *
   * 功能：
   * - 检查密码是否符合安全策略要求
   * - 确保密码具有足够的复杂度
   *
   * 密码要求：
   * - 最少8个字符
   * - 至少包含1个大写字母 (A-Z)
   * - 至少包含1个小写字母 (a-z)
   * - 至少包含1个数字 (0-9)
   * - 至少包含1个特殊字符 (@$!%*?&#)
   *
   * @param password - 待验证的密码
   * @returns true表示密码符合要求，false表示不符合
   *
   * @example
   * passwordService.validatePasswordStrength('weak') // false
   * passwordService.validatePasswordStrength('Password123!') // true
   */
  validatePasswordStrength(password: string): boolean {
    // 检查最小长度：至少8个字符
    if (password.length < 8) {
      return false;
    }

    // 检查是否包含大写字母
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // 检查是否包含小写字母
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // 检查是否包含数字
    if (!/\d/.test(password)) {
      return false;
    }

    // 检查是否包含特殊字符
    if (!/[@$!%*?&#]/.test(password)) {
      return false;
    }

    return true;
  }
}
