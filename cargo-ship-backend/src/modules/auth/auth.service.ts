/**
 * 认证服务类
 *
 * 描述：提供用户认证、授权、注册、登录、令牌管理等核心功能
 *
 * 职责：
 * - 用户身份验证（用户名密码验证）
 * - JWT令牌生成和管理
 * - 用户注册
 * - 密码修改
 * - 账户锁定/解锁机制
 * - 登录失败次数追踪
 *
 * @author TDu Cargo Ships Management System
 * @date 2024
 */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from '../../database/entities/user.entity';
import { Role, SystemRole } from '../../database/entities/role.entity';
import { PasswordService } from './password.service';
import { AuditService } from './audit.service';
import { RegisterDto } from './dto/register.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * 登录响应接口
 *
 * 定义用户成功登录后返回的数据结构
 */
export interface LoginResponse {
  /** 访问令牌，用于API调用认证 */
  accessToken: string;
  /** 刷新令牌，用于获取新的访问令牌 */
  refreshToken: string;
  /** 用户基本信息 */
  user: {
    /** 用户ID */
    id: string;
    /** 用户名 */
    username: string;
    /** 邮箱地址 */
    email: string;
    /** 用户全名 */
    fullName: string;
    /** 用户角色列表 */
    roles: string[];
    /** 用户权限列表 */
    permissions: string[];
  };
}

/**
 * 认证服务
 *
 * 提供完整的用户认证和授权功能
 */
@Injectable()
export class AuthService {
  /** 最大连续登录失败次数，超过后锁定账户 */
  private readonly maxFailedAttempts = 5;

  /** 账户锁定时长（毫秒），默认30分钟 */
  private readonly lockDuration = 30 * 60 * 1000;

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 验证用户身份
   *
   * 用途：
   * - LocalStrategy中调用，验证用户名和密码
   * - 处理账户锁定逻辑
   * - 追踪登录失败次数
   *
   * @param username - 用户名
   * @param password - 密码（明文）
   * @returns 验证成功返回用户对象，失败返回null
   * @throws UnauthorizedException 如果账户被锁定
   */
  async validateUser(username: string, password: string): Promise<User | null> {
    // 查询用户，支持用户名或邮箱登录，包含角色和权限信息
    const user = await this.userRepository.findOne({
      where: [{ username }, { email: username }],
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) return null;

    // 检查账户是否被禁用
    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 检查账户是否被锁定
    if (user.status === UserStatus.LOCKED) {
      // 检查锁定是否已过期
      if (user.lockedUntil && user.lockedUntil > new Date())
        throw new UnauthorizedException('账户已被锁定');

      // 锁定已过期，自动解锁
      user.status = UserStatus.ACTIVE;
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
      await this.userRepository.save(user);
    }

    // 验证密码
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      // 密码错误，增加失败次数
      user.failedLoginAttempts += 1;

      // 检查是否达到锁定阈值
      if (user.failedLoginAttempts >= this.maxFailedAttempts) {
        user.status = UserStatus.LOCKED;
        user.lockedUntil = new Date(Date.now() + this.lockDuration);
      }

      await this.userRepository.save(user);
      return null;
    }

    // 密码正确，重置失败次数
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * 用户登录
   *
   * 功能：
   * - 生成访问令牌和刷新令牌
   * - 更新用户登录信息（时间、IP）
   * - 记录审计日志
   *
   * @param user - 已验证的用户对象
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串
   * @returns 包含令牌和用户信息的登录响应
   */
  async login(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginResponse> {
    // 提取用户权限
    const permissions = this.extractPermissions(user);
    //const roles = user.roles.map((r) => r.name);
    const roles = user.roles.map(
      (r) => r.name.charAt(0).toUpperCase() + r.name.slice(1),
    );

    // 构造JWT载荷
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions,
    };

    // 生成访问令牌（短期有效）
    const accessToken = this.jwtService.sign(payload);

    // 生成刷新令牌（长期有效）
    const refreshSecret =
      this.configService.get<string>('jwt.refreshSecret') ||
      'default-refresh-secret';
    const refreshExpiresIn =
      this.configService.get<string>('jwt.refreshExpirationTime') || '7d';
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    // 更新用户登录信息
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    user.refreshToken = await this.passwordService.hashPassword(refreshToken);
    await this.userRepository.save(user);

    // 记录登录审计日志
    await this.auditService.logLogin(user.id, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles,
        permissions,
      },
    };
  }

  /**
   * 用户注册
   *
   * 功能：
   * - 验证用户名和邮箱唯一性
   * - 加密存储密码
   * - 分配默认角色（VIEWER）
   * - 创建新用户记录
   *
   * @param registerDto - 注册信息
   * @returns 新创建的用户对象
   * @throws ConflictException 如果用户名或邮箱已存在
   */
  async register(registerDto: RegisterDto): Promise<User> {
    // 检查用户名和邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username: registerDto.username }, { email: registerDto.email }],
    });

    if (existingUser) {
      if (existingUser.username === registerDto.username)
        throw new ConflictException('Username already exists');
      throw new ConflictException('Email already exists');
    }

    // 加密密码
    const hashedPassword = await this.passwordService.hashPassword(
      registerDto.password,
    );

    // 获取或创建默认角色（VIEWER）
    let viewerRole = await this.roleRepository.findOne({
      where: { name: SystemRole.VIEWER },
    });

    if (!viewerRole) {
      viewerRole = this.roleRepository.create({
        name: SystemRole.VIEWER,
        description: 'Viewer role',
        isSystem: true,
        isActive: true,
      });
      await this.roleRepository.save(viewerRole);
    }

    // 创建新用户
    const user = this.userRepository.create({
      username: registerDto.username,
      email: registerDto.email,
      password: hashedPassword,
      fullName: registerDto.fullName,
      phoneNumber: registerDto.phoneNumber,
      status: UserStatus.ACTIVE,
      passwordChangedAt: new Date(),
      roles: [viewerRole],
    });

    return this.userRepository.save(user);
  }

  /**
   * 刷新访问令牌
   *
   * 功能：
   * - 验证刷新令牌的有效性
   * - 生成新的访问令牌
   *
   * @param refreshToken - 刷新令牌
   * @returns 新的访问令牌
   * @throws UnauthorizedException 如果刷新令牌无效或已过期
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // 验证刷新令牌
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('jwt.refreshSecret') ||
          'default-refresh-secret',
      });

      // 获取用户信息
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['roles', 'roles.permissions'],
      });

      // 【修复1】分离用户存在性检查，以返回准确的错误消息
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 检查用户是否有刷新令牌
      if (!user.refreshToken) {
        throw new UnauthorizedException('无效或已过期的刷新令牌');
      }

      // 验证刷新令牌是否匹配
      const isValidRefreshToken = await this.passwordService.comparePassword(
        refreshToken,
        user.refreshToken,
      );

      if (!isValidRefreshToken) {
        throw new UnauthorizedException('无效或已过期的刷新令牌');
      }

      // 【修复2】检查用户状态 - 锁定状态
      if (user.status === UserStatus.LOCKED) {
        // 检查锁定是否已过期
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new UnauthorizedException('账户已被锁定');
        }
        // 锁定已过期，自动解锁用户
        user.status = UserStatus.ACTIVE;
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
        await this.userRepository.save(user);
      }

      // 【修复2】检查用户状态 - 禁用状态
      if (user.status === UserStatus.INACTIVE) {
        throw new UnauthorizedException('账户已被禁用');
      }

      // 检查用户状态 - 活跃状态
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('账户未激活');
      }

      // 生成新的访问令牌
      const permissions = this.extractPermissions(user);
      //const roles = user.roles.map((r) => r.name);
      const roles = user.roles.map(
        (r) => r.name.charAt(0).toUpperCase() + r.name.slice(1),
      );

      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        email: user.email,
        roles,
        permissions,
      };

      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      // 【修复3】保留特定错误消息，只捕获JWT验证错误
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('无效或已过期的刷新令牌');
    }
  }

  /**
   * 用户登出
   *
   * 功能：
   * - 清除用户的刷新令牌
   * - 记录登出审计日志
   *
   * @param userId - 用户ID
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串
   */
  async logout(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (user) {
      // 清除刷新令牌，使其失效
      user.refreshToken = null;
      await this.userRepository.save(user);

      // 记录登出审计日志
      await this.auditService.logLogout(userId, ipAddress, userAgent);
    }
  }

  /**
   * 修改密码
   *
   * 功能：
   * - 验证旧密码
   * - 验证新密码强度
   * - 更新密码并清除刷新令牌
   * - 记录密码修改审计日志
   *
   * @param userId - 用户ID
   * @param oldPassword - 旧密码
   * @param newPassword - 新密码
   * @param ipAddress - 客户端IP地址
   * @param userAgent - 用户代理字符串
   * @throws BadRequestException 如果用户不存在、旧密码错误或新密码不符合要求
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new BadRequestException('用户不存在');

    // 验证旧密码
    const isOldPasswordValid = await this.passwordService.comparePassword(
      oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) throw new BadRequestException('旧密码错误');

    // 验证新密码与旧密码不能相同
    if (oldPassword === newPassword)
      throw new BadRequestException('新密码不能与旧密码相同');

    // 验证新密码不能包含用户名
    if (newPassword.toLowerCase().includes(user.username.toLowerCase()))
      throw new BadRequestException('密码不能包含用户名');

    // 验证新密码强度
    if (!this.passwordService.validatePasswordStrength(newPassword))
      throw new BadRequestException('密码强度不符合要求');

    // 验证常见弱密码
    const commonWeakPasswords = [
      'password',
      'admin',
      'welcome',
      'qwerty',
      '123456',
      '12345678',
    ];
    if (
      commonWeakPasswords.some((weak) =>
        newPassword.toLowerCase().includes(weak),
      )
    ) {
      throw new BadRequestException('不能使用常见弱密码');
    }

    // 更新密码
    user.password = await this.passwordService.hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.refreshToken = null; // 清除刷新令牌，强制重新登录
    await this.userRepository.save(user);

    // 记录密码修改审计日志
    await this.auditService.logPasswordChange(userId, ipAddress, userAgent);
  }

  /**
   * 从用户对象中提取权限列表（私有方法）
   *
   * 功能：
   * - 遍历用户的所有角色
   * - 收集每个角色的所有权限
   * - 去重并返回权限列表
   *
   * @param user - 用户对象（需包含roles和permissions关联）
   * @returns 权限字符串数组，格式为"resource:action"
   */
  private extractPermissions(user: User): string[] {
    const permissions: string[] = [];

    if (user.roles && Array.isArray(user.roles)) {
      for (const role of user.roles) {
        if (role.permissions && Array.isArray(role.permissions)) {
          for (const permission of role.permissions) {
            const permissionName = `${permission.resource}:${permission.action}`;
            if (!permissions.includes(permissionName))
              permissions.push(permissionName);
          }
        }
      }
    }

    return permissions;
  }

  /**
   * 获取所有用户列表（管理员功能）
   *
   * 功能：
   * - 查询所有用户
   * - 包含角色和权限信息
   * - 支持分页和筛选（可扩展）
   *
   * 权限要求：user:read
   * 角色要求：administrator
   *
   * @returns 用户列表
   */
  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['roles', 'roles.permissions'],
      order: {
        createdAt: 'DESC', // 按创建时间降序排列
      },
    });
  }

  /**
   * 根据ID获取单个用户（管理员功能）
   *
   * 功能：
   * - 根据用户ID查询用户详细信息
   * - 包含角色和权限信息
   *
   * 权限要求：user:read
   * 角色要求：administrator
   *
   * @param id - 用户ID
   * @returns 用户对象
   * @throws BadRequestException 如果用户不存在
   */
  async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return user;
  }

  /**
   * 创建用户（管理员功能）
   *
   * 功能：
   * - 管理员创建新用户账户
   * - 验证用户名和邮箱唯一性
   * - 加密存储密码
   * - 分配指定角色
   * - 设置用户状态
   *
   * 权限要求：user:create
   * 角色要求：administrator
   *
   * @param createUserDto - 创建用户信息
   * @returns 新创建的用户对象
   * @throws ConflictException 如果用户名或邮箱已存在
   * @throws BadRequestException 如果角色ID无效
   */
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // 1. 检查用户名和邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      if (existingUser.username === createUserDto.username) {
        throw new ConflictException('用户名已存在');
      }
      throw new ConflictException('邮箱已存在');
    }

    // 2. 验证角色ID是否有效
    const roles = await this.roleRepository.findByIds(createUserDto.roleIds);

    if (roles.length !== createUserDto.roleIds.length) {
      throw new BadRequestException('提供的角色ID无效');
    }

    // 3. 加密密码
    const hashedPassword = await this.passwordService.hashPassword(
      createUserDto.password,
    );

    // 4. 创建用户对象
    const user = this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      password: hashedPassword,
      fullName: createUserDto.fullName,
      phoneNumber: createUserDto.phoneNumber,
      status: createUserDto.status || UserStatus.ACTIVE, // 默认为激活状态
      passwordChangedAt: new Date(),
      roles: roles, // 分配角色
    });

    // 5. 保存用户到数据库
    return this.userRepository.save(user);
  }

  /**
   * 更新用户信息（管理员功能）
   *
   * 功能：
   * - 管理员更新用户信息
   * - 支持更新基本信息、角色、状态
   * - 支持重置用户密码
   * - 只更新提供的字段
   *
   * 权限要求：user:update
   * 角色要求：administrator
   *
   * @param id - 用户ID
   * @param updateUserDto - 更新用户信息
   * @returns 更新后的用户对象
   * @throws BadRequestException 如果用户不存在或角色ID无效
   * @throws ConflictException 如果用户名或邮箱已被其他用户使用
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // 1. 查询用户是否存在
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 2. 如果更新用户名或邮箱，检查唯一性
    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id != :id', { id })
        .andWhere('(user.username = :username OR user.email = :email)', {
          username: updateUserDto.username || '',
          email: updateUserDto.email || '',
        })
        .getOne();

      if (existingUser) {
        if (existingUser.username === updateUserDto.username) {
          throw new ConflictException('用户名已被其他用户使用');
        }
        if (existingUser.email === updateUserDto.email) {
          throw new ConflictException('邮箱已被其他用户使用');
        }
      }
    }

    // 3. 如果提供了新密码，加密后更新
    if (updateUserDto.password) {
      user.password = await this.passwordService.hashPassword(
        updateUserDto.password,
      );
      user.passwordChangedAt = new Date();
      user.refreshToken = null; // 重置密码后清除刷新令牌，要求重新登录
    }

    // 4. 如果提供了角色ID，更新角色
    if (updateUserDto.roleIds && updateUserDto.roleIds.length > 0) {
      const roles = await this.roleRepository.findByIds(updateUserDto.roleIds);

      if (roles.length !== updateUserDto.roleIds.length) {
        throw new BadRequestException('提供的角色ID无效');
      }

      user.roles = roles;
    }

    // 5. 更新其他字段
    if (updateUserDto.username) user.username = updateUserDto.username;
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.fullName) user.fullName = updateUserDto.fullName;
    if (updateUserDto.phoneNumber !== undefined)
      user.phoneNumber = updateUserDto.phoneNumber;
    if (updateUserDto.status) user.status = updateUserDto.status;

    // 6. 保存更新
    return this.userRepository.save(user);
  }

  /**
   * 删除用户（管理员功能）
   *
   * 功能：
   * - 管理员删除用户账户
   * - 软删除或硬删除（根据需求）
   * - 防止删除最后一个管理员
   *
   * 权限要求：user:delete
   * 角色要求：administrator
   *
   * @param id - 用户ID
   * @returns 删除操作结果
   * @throws BadRequestException 如果用户不存在或尝试删除最后一个管理员
   */
  async deleteUser(id: string): Promise<{ message: string }> {
    // 1. 查询用户是否存在
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    // 2. 检查是否是管理员角色
    const isAdministrator = user.roles.some(
      (role) => role.name === SystemRole.ADMINISTRATOR,
    );

    if (isAdministrator) {
      // 检查是否是最后一个管理员
      const adminCount = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.roles', 'role')
        .where('role.name = :roleName', { roleName: SystemRole.ADMINISTRATOR })
        .andWhere('user.id != :userId', { userId: id })
        .getCount();

      if (adminCount === 0) {
        throw new BadRequestException('不能删除系统中最后一个管理员账户');
      }
    }

    // 3. 删除用户（硬删除）
    await this.userRepository.remove(user);

    return { message: '用户已成功删除' };
  }
}
