/**
 * AuditService 单元测试
 *
 * 测试范围：
 * - T014: 审计日志记录功能
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService, AuditLogData } from './audit.service';
import {
  AuditLog,
  AuditAction,
} from '../../database/entities/audit-log.entity';

/**
 * 模拟的 Repository 工厂函数
 */
const createMockRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
});

/**
 * 创建完整的 mock AuditLog 对象
 */
const createMockAuditLog = (partial: Partial<AuditLog> = {}): AuditLog =>
  ({
    id: 'mock-audit-log-id',
    userId: null as any,
    action: AuditAction.CREATE,
    resource: 'test',
    resourceId: null as any,
    details: null as any,
    oldValues: null as any,
    newValues: null as any,
    ipAddress: null as any,
    userAgent: null as any,
    success: true,
    errorMessage: null as any,
    duration: null as any,
    user: null as any,
    createdAt: new Date(),
    ...partial,
  }) as AuditLog;

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

  // 测试数据
  const mockUserId = 'user-123';
  const mockIpAddress = '192.168.1.100';
  const mockUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  /**
   * T014: 测试通用日志记录功能
   */
  describe('通用日志记录 (log)', () => {
    it('应该成功创建审计日志记录', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.CREATE,
        resource: 'device',
        resourceId: 'device-456',
        details: '创建新设备',
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      };

      const mockAuditLog = createMockAuditLog({
        id: 'audit-log-id',
        userId: mockUserId,
        action: AuditAction.CREATE,
        resource: 'device',
        resourceId: 'device-456',
        details: '创建新设备',
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      });

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.action).toBe(AuditAction.CREATE);
      expect(result.resource).toBe('device');
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: AuditAction.CREATE,
          resource: 'device',
          resourceId: 'device-456',
          success: true,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('应该默认将 success 设置为 true', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.UPDATE,
        resource: 'user',
        ipAddress: mockIpAddress,
      };

      const mockAuditLog = createMockAuditLog({
        userId: mockUserId,
        action: AuditAction.UPDATE,
        resource: 'user',
        ipAddress: mockIpAddress,
        success: true,
      });
      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.log(logData);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it('应该能够记录失败的操作', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.DELETE,
        resource: 'device',
        resourceId: 'device-789',
        success: false,
        errorMessage: 'Permission denied',
        ipAddress: mockIpAddress,
      };

      const mockAuditLog = createMockAuditLog({
        userId: mockUserId,
        action: AuditAction.DELETE,
        resource: 'device',
        resourceId: 'device-789',
        success: false,
        errorMessage: 'Permission denied',
        ipAddress: mockIpAddress,
      });
      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Permission denied');
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: 'Permission denied',
        }),
      );
    });

    it('应该能够记录数据变更（oldValues 和 newValues）', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.UPDATE,
        resource: 'device',
        resourceId: 'device-123',
        oldValues: { name: '旧名称', status: 'offline' },
        newValues: { name: '新名称', status: 'online' },
        ipAddress: mockIpAddress,
      };

      const mockAuditLog = createMockAuditLog({
        userId: mockUserId,
        action: AuditAction.UPDATE,
        resource: 'device',
        resourceId: 'device-123',
        oldValues: { name: '旧名称', status: 'offline' },
        newValues: { name: '新名称', status: 'online' },
        ipAddress: mockIpAddress,
      });
      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result.oldValues).toEqual({ name: '旧名称', status: 'offline' });
      expect(result.newValues).toEqual({ name: '新名称', status: 'online' });
    });

    it('应该能够记录操作执行时长', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.EXPORT,
        resource: 'report',
        duration: 1250, // 毫秒
        ipAddress: mockIpAddress,
      };

      const mockAuditLog = createMockAuditLog({
        userId: mockUserId,
        action: AuditAction.EXPORT,
        resource: 'report',
        duration: 1250,
        ipAddress: mockIpAddress,
      });
      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result.duration).toBe(1250);
    });

    it('应该能够记录系统操作（无用户ID）', async () => {
      // Arrange
      const logData: AuditLogData = {
        action: AuditAction.CONFIG_CHANGE,
        resource: 'system',
        details: '系统配置自动更新',
      };

      const mockAuditLog = createMockAuditLog({
        userId: null as any,
        action: AuditAction.CONFIG_CHANGE,
        resource: 'system',
        details: '系统配置自动更新',
      });
      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result.userId).toBeNull();
      expect(result.action).toBe(AuditAction.CONFIG_CHANGE);
    });

    it('应该能够处理所有审计操作类型', async () => {
      // Arrange
      const actions = [
        AuditAction.LOGIN,
        AuditAction.LOGOUT,
        AuditAction.CREATE,
        AuditAction.READ,
        AuditAction.UPDATE,
        AuditAction.DELETE,
        AuditAction.EXPORT,
        AuditAction.IMPORT,
      ];

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act & Assert
      for (const action of actions) {
        const logData: AuditLogData = {
          userId: mockUserId,
          action,
          resource: 'test',
          ipAddress: mockIpAddress,
        };

        const result = await service.log(logData);
        expect(result.action).toBe(action);
      }
    });
  });

  /**
   * T014: 测试登录日志记录
   */
  describe('登录日志记录 (logLogin)', () => {
    it('应该成功记录登录事件', async () => {
      // Arrange
      const mockAuditLog = createMockAuditLog({
        id: 'log-id',
        userId: mockUserId,
        action: AuditAction.LOGIN,
        resource: 'auth',
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        success: true,
      });

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logLogin(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: AuditAction.LOGIN,
          resource: 'auth',
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          success: true,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('应该记录完整的登录上下文信息', async () => {
      // Arrange
      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.logLogin(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
        }),
      );
    });
  });

  /**
   * T014: 测试登录失败日志记录
   */
  describe('登录失败日志记录 (logLoginFailed)', () => {
    it('应该记录登录失败事件', async () => {
      // Arrange
      const username = 'testuser';
      const reason = 'Invalid password';
      const mockAuditLog = createMockAuditLog({
        action: AuditAction.LOGIN_FAILED,
        resource: 'auth',
        details: `Failed login attempt for username: ${username}`,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        success: false,
        errorMessage: reason,
      });

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logLoginFailed(
        username,
        mockIpAddress,
        mockUserAgent,
        reason,
      );

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.LOGIN_FAILED,
          resource: 'auth',
          details: `Failed login attempt for username: ${username}`,
          success: false,
          errorMessage: reason,
        }),
      );
    });

    it('应该记录不同的失败原因', async () => {
      // Arrange
      const username = 'admin';
      const reasons = [
        'Invalid password',
        'Account locked',
        'User not found',
        'Account disabled',
      ];

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act & Assert
      for (const reason of reasons) {
        await service.logLoginFailed(
          username,
          mockIpAddress,
          mockUserAgent,
          reason,
        );
        expect(auditLogRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            errorMessage: reason,
          }),
        );
      }
    });

    it('应该包含尝试登录的用户名', async () => {
      // Arrange
      const username = 'attacker';
      const reason = 'Invalid password';

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.logLoginFailed(
        username,
        mockIpAddress,
        mockUserAgent,
        reason,
      );

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: `Failed login attempt for username: ${username}`,
        }),
      );
    });
  });

  /**
   * T014: 测试登出日志记录
   */
  describe('登出日志记录 (logLogout)', () => {
    it('应该成功记录登出事件', async () => {
      // Arrange
      const mockAuditLog = createMockAuditLog({
        userId: mockUserId,
        action: AuditAction.LOGOUT,
        resource: 'auth',
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        success: true,
      });

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logLogout(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: AuditAction.LOGOUT,
          resource: 'auth',
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          success: true,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('应该记录登出时的上下文信息', async () => {
      // Arrange
      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.logLogout(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
        }),
      );
    });
  });

  /**
   * T014: 测试密码修改日志记录
   */
  describe('密码修改日志记录 (logPasswordChange)', () => {
    it('应该成功记录密码修改事件', async () => {
      // Arrange
      const mockAuditLog = createMockAuditLog({
        userId: mockUserId,
        action: AuditAction.PASSWORD_CHANGED,
        resource: 'user',
        resourceId: mockUserId,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
        success: true,
      });

      auditLogRepository.create.mockReturnValue(mockAuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog);

      // Act
      await service.logPasswordChange(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: AuditAction.PASSWORD_CHANGED,
          resource: 'user',
          resourceId: mockUserId,
          ipAddress: mockIpAddress,
          userAgent: mockUserAgent,
          success: true,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('应该不记录密码内容（安全考虑）', async () => {
      // Arrange
      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.logPasswordChange(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({
          oldValues: expect.anything(),
          newValues: expect.anything(),
        }),
      );
    });

    it('应该关联到用户资源', async () => {
      // Arrange
      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.logPasswordChange(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: 'user',
          resourceId: mockUserId,
        }),
      );
    });
  });

  /**
   * 集成测试：完整的审计流程
   */
  describe('集成测试', () => {
    it('应该能够记录完整的用户登录流程', async () => {
      // Arrange
      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act - 模拟完整的登录流程
      // 1. 登录失败（密码错误）
      await service.logLoginFailed(
        'testuser',
        mockIpAddress,
        mockUserAgent,
        'Invalid password',
      );

      // 2. 登录成功
      await service.logLogin(mockUserId, mockIpAddress, mockUserAgent);

      // 3. 执行一些操作
      await service.log({
        userId: mockUserId,
        action: AuditAction.READ,
        resource: 'device',
        resourceId: 'device-123',
        ipAddress: mockIpAddress,
      });

      // 4. 修改密码
      await service.logPasswordChange(mockUserId, mockIpAddress, mockUserAgent);

      // 5. 登出
      await service.logLogout(mockUserId, mockIpAddress, mockUserAgent);

      // Assert
      expect(auditLogRepository.save).toHaveBeenCalledTimes(5);
    });

    it('应该能够处理并发的日志记录请求', async () => {
      // Arrange
      const logPromises: Promise<AuditLog>[] = [];
      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act - 并发记录10条日志
      for (let i = 0; i < 10; i++) {
        const logData: AuditLogData = {
          userId: `user-${i}`,
          action: AuditAction.READ,
          resource: 'device',
          ipAddress: mockIpAddress,
        };
        logPromises.push(service.log(logData));
      }

      const results = await Promise.all(logPromises);

      // Assert
      expect(results).toHaveLength(10);
      expect(auditLogRepository.save).toHaveBeenCalledTimes(10);
    });
  });

  /**
   * 边界条件和错误处理
   */
  describe('边界条件和错误处理', () => {
    it('应该能够处理空的详细信息', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.CREATE,
        resource: 'device',
      };

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.log(logData);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: undefined,
        }),
      );
    });

    it('应该能够处理空的 IP 地址和用户代理', async () => {
      // Arrange
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.UPDATE,
        resource: 'user',
      };

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      await service.log(logData);

      // Assert
      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined,
        }),
      );
    });

    it('应该能够处理复杂的 JSON 数据变更', async () => {
      // Arrange
      const complexOldValues = {
        name: '设备A',
        config: {
          threshold: { min: 10, max: 100 },
          enabled: true,
        },
        tags: ['重要', '监控'],
      };

      const complexNewValues = {
        name: '设备B',
        config: {
          threshold: { min: 20, max: 200 },
          enabled: false,
        },
        tags: ['次要', '观察'],
      };

      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.UPDATE,
        resource: 'device',
        oldValues: complexOldValues,
        newValues: complexNewValues,
        ipAddress: mockIpAddress,
      };

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result.oldValues).toEqual(complexOldValues);
      expect(result.newValues).toEqual(complexNewValues);
    });

    it('应该能够处理很长的错误消息', async () => {
      // Arrange
      const longErrorMessage = 'A'.repeat(1000);
      const logData: AuditLogData = {
        userId: mockUserId,
        action: AuditAction.DELETE,
        resource: 'device',
        success: false,
        errorMessage: longErrorMessage,
        ipAddress: mockIpAddress,
      };

      auditLogRepository.create.mockImplementation((data) =>
        createMockAuditLog(data as Partial<AuditLog>),
      );
      auditLogRepository.save.mockImplementation((data) =>
        Promise.resolve(data as AuditLog),
      );

      // Act
      const result = await service.log(logData);

      // Assert
      expect(result.errorMessage).toBe(longErrorMessage);
    });
  });
});
