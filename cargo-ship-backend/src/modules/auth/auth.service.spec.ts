/**
 * AuthService 单元测试
 *
 * 测试范围：
 * - T010: 用户注册逻辑
 * - T011: 用户登录逻辑（成功、失败、锁定）
 * - T012: JWT 令牌生成与刷新
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { AuditService } from './audit.service';
import { User, UserStatus } from '../../database/entities/user.entity';
import { Role, SystemRole } from '../../database/entities/role.entity';
import { RegisterDto } from './dto/register.dto';

/**
 * 模拟的 Repository 工厂函数
 */
const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let passwordService: jest.Mocked<PasswordService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let auditService: jest.Mocked<AuditService>;

  // 测试数据
  const mockRole: Role = {
    id: 'role-id',
    name: SystemRole.VIEWER,
    description: 'Viewer role',
    isSystem: true,
    isActive: true,
    permissions: [],
    users: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(),
  };

  const mockUser: Partial<User> = {
    id: 'test-user-id',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword123',
    fullName: '测试用户',
    status: UserStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockedUntil: null,
    roles: [mockRole],
  };

  const mockViewerRole: Partial<Role> = {
    id: 'viewer-role-id',
    name: SystemRole.VIEWER,
    description: 'Viewer role',
    isSystem: true,
    isActive: true,
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Role),
          useValue: createMockRepository(),
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: jest.fn(),
            comparePassword: jest.fn(),
            validatePasswordStrength: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logLogin: jest.fn(),
            logLogout: jest.fn(),
            logPasswordChange: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    roleRepository = module.get(getRepositoryToken(Role));
    passwordService = module.get(PasswordService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应该被定义', () => {
    expect(service).toBeDefined();
  });

  /**
   * T010: 测试用户注册逻辑
   */
  describe('用户注册 (register)', () => {
    const registerDto: RegisterDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'Password123!',
      fullName: '新用户',
      phoneNumber: '+86 138-1234-5678',
    };

    it('应该成功注册新用户', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null); // 用户名和邮箱不存在
      roleRepository.findOne.mockResolvedValue(mockViewerRole as Role);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: 'hashedPassword',
        status: UserStatus.ACTIVE,
        roles: [mockViewerRole as Role],
      } as User);
      userRepository.save.mockResolvedValue({
        id: 'new-user-id',
        ...registerDto,
        password: 'hashedPassword',
        status: UserStatus.ACTIVE,
        roles: [mockViewerRole as Role],
      } as User);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.username).toBe(registerDto.username);
      expect(result.email).toBe(registerDto.email);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [
          { username: registerDto.username },
          { email: registerDto.email },
        ],
      });
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        registerDto.password,
      );
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: SystemRole.VIEWER },
      });
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('应该在用户名已存在时抛出 ConflictException', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
      } as User);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );
    });

    it('应该在邮箱已存在时抛出 ConflictException', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        email: registerDto.email,
      } as User);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already exists',
      );
    });

    it('应该为新用户分配默认 VIEWER 角色', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      roleRepository.findOne.mockResolvedValue(mockViewerRole as Role);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');
      userRepository.create.mockReturnValue({
        ...registerDto,
        roles: [mockViewerRole as Role],
      } as User);
      userRepository.save.mockResolvedValue({
        id: 'new-user-id',
        ...registerDto,
        roles: [mockViewerRole as Role],
      } as User);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result.roles).toBeDefined();
      expect(result.roles[0].name).toBe(SystemRole.VIEWER);
    });

    it('应该在 VIEWER 角色不存在时创建它', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);
      roleRepository.findOne.mockResolvedValueOnce(null); // 第一次查找返回null
      const newRole = {
        ...mockViewerRole,
        id: 'new-role-id',
      } as Role;
      roleRepository.create.mockReturnValue(newRole);
      roleRepository.save.mockResolvedValue(newRole);
      passwordService.hashPassword.mockResolvedValue('hashedPassword');
      userRepository.create.mockReturnValue({
        ...registerDto,
        roles: [newRole],
      } as User);
      userRepository.save.mockResolvedValue({
        id: 'new-user-id',
        ...registerDto,
        roles: [newRole],
      } as User);

      // Act
      await service.register(registerDto);

      // Assert
      expect(roleRepository.create).toHaveBeenCalledWith({
        name: SystemRole.VIEWER,
        description: 'Viewer role',
        isSystem: true,
        isActive: true,
      });
      expect(roleRepository.save).toHaveBeenCalled();
    });
  });

  /**
   * T011: 测试用户登录逻辑（成功、失败、锁定）
   */
  describe('用户身份验证 (validateUser)', () => {
    it('应该在密码正确时返回用户对象', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordService.comparePassword.mockResolvedValue(true);
      userRepository.save.mockResolvedValue(mockUser as User);

      // Act
      const result = await service.validateUser('testuser', 'correctPassword');

      // Assert
      expect(result).toBeDefined();
      expect(result?.username).toBe('testuser');
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        'correctPassword',
        'hashedPassword123',
      );
    });

    it('应该在用户不存在时返回 null', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent', 'anyPassword');

      // Assert
      expect(result).toBeNull();
    });

    it('应该在密码错误时返回 null 并增加失败次数', async () => {
      // Arrange
      const userWithFailedAttempts = {
        ...mockUser,
        failedLoginAttempts: 2,
      } as User;
      userRepository.findOne.mockResolvedValue(userWithFailedAttempts);
      passwordService.comparePassword.mockResolvedValue(false);
      userRepository.save.mockResolvedValue({
        ...userWithFailedAttempts,
        failedLoginAttempts: 3,
      } as User);

      // Act
      const result = await service.validateUser('testuser', 'wrongPassword');

      // Assert
      expect(result).toBeNull();
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 3,
        }),
      );
    });

    it('应该在连续失败5次后锁定账户', async () => {
      // Arrange
      const userWithManyFailures = {
        ...mockUser,
        failedLoginAttempts: 4, // 第5次失败会触发锁定
      } as User;
      userRepository.findOne.mockResolvedValue(userWithManyFailures);
      passwordService.comparePassword.mockResolvedValue(false);

      // Act
      await service.validateUser('testuser', 'wrongPassword');

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.LOCKED,
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });

    it('应该在账户锁定时抛出 UnauthorizedException', async () => {
      // Arrange
      const lockedUser = {
        ...mockUser,
        status: UserStatus.LOCKED,
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30分钟后解锁
      } as User;
      userRepository.findOne.mockResolvedValue(lockedUser);

      // Act & Assert
      await expect(
        service.validateUser('testuser', 'anyPassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('testuser', 'anyPassword'),
      ).rejects.toThrow('Account is locked');
    });

    it('应该在锁定过期后自动解锁账户', async () => {
      // Arrange
      const expiredLockedUser = {
        ...mockUser,
        status: UserStatus.LOCKED,
        lockedUntil: new Date(Date.now() - 1000), // 已过期
        failedLoginAttempts: 5,
      } as User;
      userRepository.findOne.mockResolvedValue(expiredLockedUser);
      passwordService.comparePassword.mockResolvedValue(true);
      userRepository.save.mockResolvedValue({
        ...expiredLockedUser,
        status: UserStatus.ACTIVE,
        lockedUntil: null,
        failedLoginAttempts: 0,
      } as User);

      // Act
      const result = await service.validateUser('testuser', 'correctPassword');

      // Assert
      expect(result).toBeDefined();
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: UserStatus.ACTIVE,
          lockedUntil: null,
          failedLoginAttempts: 0,
        }),
      );
    });

    it('应该在密码正确时重置失败次数', async () => {
      // Arrange
      const userWithPreviousFailures = {
        ...mockUser,
        failedLoginAttempts: 3,
      } as User;
      userRepository.findOne.mockResolvedValue(userWithPreviousFailures);
      passwordService.comparePassword.mockResolvedValue(true);
      userRepository.save.mockResolvedValue({
        ...userWithPreviousFailures,
        failedLoginAttempts: 0,
      } as User);

      // Act
      await service.validateUser('testuser', 'correctPassword');

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 0,
        }),
      );
    });
  });

  /**
   * T012: 测试 JWT 令牌生成与刷新
   */
  describe('用户登录 (login)', () => {
    const ipAddress = '192.168.1.100';
    const userAgent = 'Mozilla/5.0';

    it('应该成功生成访问令牌和刷新令牌', async () => {
      // Arrange
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';
      jwtService.sign
        .mockReturnValueOnce(mockAccessToken) // 第一次调用返回 accessToken
        .mockReturnValueOnce(mockRefreshToken); // 第二次调用返回 refreshToken
      configService.get
        .mockReturnValueOnce('refresh-secret')
        .mockReturnValueOnce('7d');
      passwordService.hashPassword.mockResolvedValue('hashedRefreshToken');
      userRepository.save.mockResolvedValue(mockUser as User);
      auditService.logLogin.mockResolvedValue(undefined);

      // Act
      const result = await service.login(
        mockUser as User,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
      expect(result.user.username).toBe(mockUser.username);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('应该在登录时更新用户的最后登录信息', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock.token');
      configService.get.mockReturnValue('default-value');
      passwordService.hashPassword.mockResolvedValue('hashedToken');
      userRepository.save.mockResolvedValue(mockUser as User);
      auditService.logLogin.mockResolvedValue(undefined);

      // Act
      await service.login(mockUser as User, ipAddress, userAgent);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
          lastLoginIp: ipAddress,
          refreshToken: 'hashedToken',
        }),
      );
    });

    it('应该记录登录审计日志', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock.token');
      configService.get.mockReturnValue('default-value');
      passwordService.hashPassword.mockResolvedValue('hashedToken');
      userRepository.save.mockResolvedValue(mockUser as User);
      auditService.logLogin.mockResolvedValue(undefined);

      // Act
      await service.login(mockUser as User, ipAddress, userAgent);

      // Assert
      expect(auditService.logLogin).toHaveBeenCalledWith(
        mockUser.id,
        ipAddress,
        userAgent,
      );
    });

    it('应该在 JWT payload 中包含用户角色和权限', async () => {
      // Arrange
      const userWithPermissions = {
        ...mockUser,
        roles: [
          {
            id: 'role-id',
            name: 'administrator',
            permissions: [
              { resource: 'device', action: 'create' },
              { resource: 'device', action: 'read' },
            ],
          },
        ],
      } as User;
      jwtService.sign.mockReturnValue('mock.token');
      configService.get.mockReturnValue('default-value');
      passwordService.hashPassword.mockResolvedValue('hashedToken');
      userRepository.save.mockResolvedValue(userWithPermissions);
      auditService.logLogin.mockResolvedValue(undefined);

      // Act
      const result = await service.login(
        userWithPermissions,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(result.user.roles).toContain('administrator');
      expect(result.user.permissions).toContain('device:create');
      expect(result.user.permissions).toContain('device:read');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userWithPermissions.id,
          username: userWithPermissions.username,
          roles: ['administrator'],
          permissions: ['device:create', 'device:read'],
        }),
      );
    });
  });

  describe('刷新令牌 (refreshToken)', () => {
    const mockRefreshToken = 'valid.refresh.token';
    const mockPayload = {
      sub: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      roles: ['viewer'],
      permissions: [],
    };

    it('应该使用有效的刷新令牌生成新的访问令牌', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(mockPayload);
      configService.get.mockReturnValue('refresh-secret');
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashedRefreshToken',
      } as User);
      passwordService.comparePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('new.access.token');

      // Act
      const result = await service.refreshToken(mockRefreshToken);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new.access.token');
      expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken, {
        secret: 'refresh-secret',
      });
    });

    it('应该在刷新令牌无效时抛出 UnauthorizedException', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('invalid.token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('应该在用户不存在时抛出 UnauthorizedException', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(mockPayload);
      configService.get.mockReturnValue('refresh-secret');
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('应该在刷新令牌不匹配时抛出 UnauthorizedException', async () => {
      // Arrange
      jwtService.verify.mockReturnValue(mockPayload);
      configService.get.mockReturnValue('refresh-secret');
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashedRefreshToken',
      } as User);
      passwordService.comparePassword.mockResolvedValue(false); // 令牌不匹配

      // Act & Assert
      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });
  });

  describe('用户登出 (logout)', () => {
    const userId = 'test-user-id';
    const ipAddress = '192.168.1.100';
    const userAgent = 'Mozilla/5.0';

    it('应该清除用户的刷新令牌', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        refreshToken: 'some-refresh-token',
      } as User);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      } as User);
      auditService.logLogout.mockResolvedValue(undefined);

      // Act
      await service.logout(userId, ipAddress, userAgent);

      // Assert
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: null,
        }),
      );
    });

    it('应该记录登出审计日志', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      userRepository.save.mockResolvedValue(mockUser as User);
      auditService.logLogout.mockResolvedValue(undefined);

      // Act
      await service.logout(userId, ipAddress, userAgent);

      // Assert
      expect(auditService.logLogout).toHaveBeenCalledWith(
        userId,
        ipAddress,
        userAgent,
      );
    });

    it('应该在用户不存在时不抛出错误', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.logout(userId, ipAddress, userAgent),
      ).resolves.not.toThrow();
    });
  });

  describe('修改密码 (changePassword)', () => {
    const userId = 'test-user-id';
    const oldPassword = 'OldPassword123!';
    const newPassword = 'NewPassword123!';
    const ipAddress = '192.168.1.100';
    const userAgent = 'Mozilla/5.0';

    it('应该成功修改密码', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.validatePasswordStrength.mockReturnValue(true);
      passwordService.hashPassword.mockResolvedValue('newHashedPassword');
      userRepository.save.mockResolvedValue(mockUser as User);
      auditService.logPasswordChange.mockResolvedValue(undefined);

      // Act
      await service.changePassword(
        userId,
        oldPassword,
        newPassword,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        oldPassword,
        'hashedPassword123',
      );
      expect(passwordService.validatePasswordStrength).toHaveBeenCalledWith(
        newPassword,
      );
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newHashedPassword',
          passwordChangedAt: expect.any(Date),
          refreshToken: null, // 强制重新登录
        }),
      );
    });

    it('应该在用户不存在时抛出 BadRequestException', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword(
          userId,
          oldPassword,
          newPassword,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword(
          userId,
          oldPassword,
          newPassword,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow('User not found');
    });

    it('应该在旧密码错误时抛出 BadRequestException', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordService.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword(
          userId,
          oldPassword,
          newPassword,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword(
          userId,
          oldPassword,
          newPassword,
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('应该在新密码不符合要求时抛出 BadRequestException', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.validatePasswordStrength.mockReturnValue(false);

      // Act & Assert
      await expect(
        service.changePassword(
          userId,
          oldPassword,
          'weak',
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.changePassword(
          userId,
          oldPassword,
          'weak',
          ipAddress,
          userAgent,
        ),
      ).rejects.toThrow('Password does not meet requirements');
    });

    it('应该记录密码修改审计日志', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser as User);
      passwordService.comparePassword.mockResolvedValue(true);
      passwordService.validatePasswordStrength.mockReturnValue(true);
      passwordService.hashPassword.mockResolvedValue('newHashedPassword');
      userRepository.save.mockResolvedValue(mockUser as User);
      auditService.logPasswordChange.mockResolvedValue(undefined);

      // Act
      await service.changePassword(
        userId,
        oldPassword,
        newPassword,
        ipAddress,
        userAgent,
      );

      // Assert
      expect(auditService.logPasswordChange).toHaveBeenCalledWith(
        userId,
        ipAddress,
        userAgent,
      );
    });
  });
});
