/**
 * PasswordService 单元测试
 *
 * 测试范围：
 * - T013: 密码加密与验证
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from './password.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt 模块
jest.mock('bcrypt');

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);

    // 清除所有 mock 调用记录
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  /**
   * T013: 测试密码加密功能
   */
  describe('密码加密 (hashPassword)', () => {
    it('应该成功加密明文密码', async () => {
      // Arrange
      const plainPassword = 'MyPassword123!';
      const hashedPassword =
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await service.hashPassword(plainPassword);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(plainPassword, 10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    });

    it('应该使用正确的盐轮数（saltRounds=10）', async () => {
      // Arrange
      const password = 'TestPassword123!';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      // Act
      await service.hashPassword(password);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('应该为相同密码生成不同的哈希值（因为盐值随机）', async () => {
      // Arrange
      const password = 'SamePassword123!';
      const hash1 = '$2b$10$hash1...';
      const hash2 = '$2b$10$hash2...';
      (bcrypt.hash as jest.Mock)
        .mockResolvedValueOnce(hash1)
        .mockResolvedValueOnce(hash2);

      // Act
      const result1 = await service.hashPassword(password);
      const result2 = await service.hashPassword(password);

      // Assert
      expect(result1).not.toBe(result2); // 不同的哈希值
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
    });

    it('应该能够处理空字符串密码', async () => {
      // Arrange
      const emptyPassword = '';
      const hashedEmpty = '$2b$10$hashedEmpty...';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedEmpty);

      // Act
      const result = await service.hashPassword(emptyPassword);

      // Assert
      expect(result).toBe(hashedEmpty);
      expect(bcrypt.hash).toHaveBeenCalledWith(emptyPassword, 10);
    });

    it('应该能够处理包含特殊字符的密码', async () => {
      // Arrange
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedSpecial = '$2b$10$hashedSpecial...';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedSpecial);

      // Act
      const result = await service.hashPassword(specialPassword);

      // Assert
      expect(result).toBe(hashedSpecial);
      expect(bcrypt.hash).toHaveBeenCalledWith(specialPassword, 10);
    });

    it('应该能够处理包含 Unicode 字符的密码', async () => {
      // Arrange
      const unicodePassword = '密码123!你好';
      const hashedUnicode = '$2b$10$hashedUnicode...';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedUnicode);

      // Act
      const result = await service.hashPassword(unicodePassword);

      // Assert
      expect(result).toBe(hashedUnicode);
      expect(bcrypt.hash).toHaveBeenCalledWith(unicodePassword, 10);
    });

    it('应该能够处理很长的密码字符串', async () => {
      // Arrange
      const longPassword = 'A'.repeat(100) + '123!@#';
      const hashedLong = '$2b$10$hashedLong...';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedLong);

      // Act
      const result = await service.hashPassword(longPassword);

      // Assert
      expect(result).toBe(hashedLong);
      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 10);
    });
  });

  /**
   * T013: 测试密码验证功能
   */
  describe('密码验证 (comparePassword)', () => {
    it('应该在密码匹配时返回 true', async () => {
      // Arrange
      const plainPassword = 'CorrectPassword123!';
      const hashedPassword =
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.comparePassword(
        plainPassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    it('应该在密码不匹配时返回 false', async () => {
      // Arrange
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword =
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(
        wrongPassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        wrongPassword,
        hashedPassword,
      );
    });

    it('应该能够验证空字符串密码', async () => {
      // Arrange
      const emptyPassword = '';
      const hashedPassword = '$2b$10$hashedEmpty...';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(
        emptyPassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        emptyPassword,
        hashedPassword,
      );
    });

    it('应该能够验证包含特殊字符的密码', async () => {
      // Arrange
      const specialPassword = '!@#$%^&*()_+-=';
      const hashedPassword = '$2b$10$hashedSpecial...';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.comparePassword(
        specialPassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        specialPassword,
        hashedPassword,
      );
    });

    it('应该能够验证 Unicode 字符密码', async () => {
      // Arrange
      const unicodePassword = '密码123!';
      const hashedPassword = '$2b$10$hashedUnicode...';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.comparePassword(
        unicodePassword,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        unicodePassword,
        hashedPassword,
      );
    });

    it('应该处理错误的哈希格式', async () => {
      // Arrange
      const password = 'ValidPassword123!';
      const invalidHash = 'invalid-hash-format';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.comparePassword(password, invalidHash);

      // Assert
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, invalidHash);
    });
  });

  /**
   * T013: 测试密码强度验证功能
   */
  describe('密码强度验证 (validatePasswordStrength)', () => {
    it('应该接受符合所有要求的强密码', () => {
      // 至少8个字符 + 大写 + 小写 + 数字 + 特殊字符
      const validPasswords = [
        'Password123!',
        'MyP@ssw0rd',
        'SecurePass1!',
        'Abcd1234@',
        'Test123!@#',
        'Valid$Pass1',
      ];

      validPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(true);
      });
    });

    it('应该拒绝长度不足8个字符的密码', () => {
      const shortPasswords = [
        'Abc123!', // 7个字符
        'Ab1!', // 4个字符
        'Aa1@', // 4个字符
        '', // 空字符串
      ];

      shortPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该拒绝没有大写字母的密码', () => {
      const noUppercasePasswords = ['password123!', 'mypass123@', 'valid1234$'];

      noUppercasePasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该拒绝没有小写字母的密码', () => {
      const noLowercasePasswords = ['PASSWORD123!', 'MYPASS123@', 'VALID1234$'];

      noLowercasePasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该拒绝没有数字的密码', () => {
      const noDigitPasswords = ['Password!@#', 'MyPassword$', 'ValidPass!'];

      noDigitPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该拒绝没有特殊字符的密码', () => {
      const noSpecialCharPasswords = [
        'Password123',
        'MyPassword1',
        'ValidPass1',
      ];

      noSpecialCharPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该接受所有支持的特殊字符', () => {
      // 支持的特殊字符：@$!%*?&#
      const specialChars = ['@', '$', '!', '%', '*', '?', '&', '#'];

      specialChars.forEach((char) => {
        const password = `Password123${char}`;
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(true);
      });
    });

    it('应该拒绝只包含不支持的特殊字符的密码', () => {
      // 不支持的特殊字符：^()_+-=[]{}|;:,.<>
      const unsupportedSpecialPasswords = [
        'Password123^',
        'Password123(',
        'Password123_',
        'Password123+',
        'Password123=',
      ];

      unsupportedSpecialPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该拒绝纯数字密码', () => {
      const numericPasswords = ['12345678', '123456789', '00000000'];

      numericPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该拒绝纯字母密码', () => {
      const alphabeticPasswords = ['abcdefgh', 'ABCDEFGH', 'AbCdEfGh'];

      alphabeticPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该接受满足最小要求的8字符密码', () => {
      // 恰好8个字符，包含所有要求
      const minimalPasswords = ['Abcd123!', 'Pass123@', 'Test456$'];

      minimalPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(true);
      });
    });

    it('应该接受很长的复杂密码', () => {
      const longPasswords = [
        'VeryLongPassword123!WithManyCharacters',
        'SuperSecure@Password1234567890',
        'A'.repeat(50) + '123!bcd',
      ];

      longPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(true);
      });
    });

    it('应该拒绝常见弱密码', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty',
        'abc123',
        'Password1', // 缺少特殊字符
        'password!', // 缺少大写和数字
      ];

      weakPasswords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });

    it('应该处理边界情况：恰好缺少一个要求', () => {
      const testCases = [
        { password: 'password123!', reason: '缺少大写字母' },
        { password: 'PASSWORD123!', reason: '缺少小写字母' },
        { password: 'Password!@#', reason: '缺少数字' },
        { password: 'Password123', reason: '缺少特殊字符' },
        { password: 'Pass12!', reason: '长度不足' },
      ];

      testCases.forEach(({ password }) => {
        const result = service.validatePasswordStrength(password);
        expect(result).toBe(false);
      });
    });
  });

  /**
   * 集成测试：完整的加密和验证流程
   */
  describe('集成测试 (hashPassword + comparePassword)', () => {
    it('应该能够加密密码并成功验证', async () => {
      // Arrange
      const plainPassword = 'TestPassword123!';
      const hashedPassword = '$2b$10$hashedValue';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const hashed = await service.hashPassword(plainPassword);
      const isValid = await service.comparePassword(plainPassword, hashed);

      // Assert
      expect(hashed).toBe(hashedPassword);
      expect(isValid).toBe(true);
    });

    it('应该能够检测错误的密码', async () => {
      // Arrange
      const correctPassword = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = '$2b$10$hashedValue';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const hashed = await service.hashPassword(correctPassword);
      const isValid = await service.comparePassword(wrongPassword, hashed);

      // Assert
      expect(hashed).toBe(hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  /**
   * 性能和安全性测试
   */
  describe('性能和安全性', () => {
    it('应该使用适当的盐轮数以平衡安全和性能', async () => {
      // Arrange
      const password = 'TestPassword123!';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      // Act
      await service.hashPassword(password);

      // Assert
      // 盐轮数为10是推荐的平衡值
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('应该能够处理并发密码哈希请求', async () => {
      // Arrange
      const passwords = Array.from({ length: 10 }, (_, i) => `Password${i}!@#`);
      (bcrypt.hash as jest.Mock).mockImplementation((pwd) =>
        Promise.resolve(`hashed_${pwd}`),
      );

      // Act
      const results = await Promise.all(
        passwords.map((pwd) => service.hashPassword(pwd)),
      );

      // Assert
      expect(results).toHaveLength(10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(10);
      results.forEach((result, index) => {
        expect(result).toBe(`hashed_Password${index}!@#`);
      });
    });
  });
});
