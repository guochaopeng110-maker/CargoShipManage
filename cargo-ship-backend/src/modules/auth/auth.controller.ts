import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService, LoginResponse } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  RefreshTokenDto,
  CreateUserDto,
  UpdateUserDto,
} from './dto';
import {
  JwtAuthGuard,
  LocalAuthGuard,
  PermissionsGuard,
  RolesGuard,
} from '../../common/guards';
import { CurrentUser, Permissions, Roles } from '../../common/decorators';
import { User } from '../../database/entities/user.entity';
import { Public } from '../../common/decorators/public.decorator';
import { AuditService } from './audit.service';

@ApiTags('认证与授权 (Auth)')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '用户注册' })
  @ApiCreatedResponse({ description: '用户注册成功' })
  @ApiConflictResponse({ description: '用户名或邮箱已存在' })
  @ApiBadRequestResponse({ description: '输入数据验证失败' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<{ message: string }> {
    await this.authService.register(registerDto);
    return { message: 'User registered successfully' };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: '登录成功，返回访问令牌和刷新令牌' })
  @ApiUnauthorizedResponse({ description: '用户名或密码错误' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @CurrentUser() user: User,
  ): Promise<LoginResponse> {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.login(user, ipAddress, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiOkResponse({ description: '成功刷新访问令牌' })
  @ApiUnauthorizedResponse({ description: '刷新令牌无效或已过期' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '用户登出' })
  @ApiNoContentResponse({ description: '登出成功' })
  @ApiUnauthorizedResponse({ description: '未提供或无效的访问令牌' })
  async logout(@CurrentUser() user: User, @Req() req: Request): Promise<void> {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await this.authService.logout(user.id, ipAddress, userAgent);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '修改当前用户密码' })
  @ApiOkResponse({ description: '密码修改成功' })
  @ApiBadRequestResponse({ description: '旧密码错误或新密码不符合要求' })
  @ApiUnauthorizedResponse({ description: '未提供或无效的访问令牌' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await this.authService.changePassword(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
      ipAddress,
      userAgent,
    );
    return { message: '密码修改成功' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiOkResponse({ description: '成功获取用户信息', type: User })
  @ApiUnauthorizedResponse({ description: '未提供或无效的访问令牌' })
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  @Permissions('user:read')
  @Roles('administrator')
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('users')
  @ApiOperation({ summary: '获取所有用户列表 (管理员)' })
  @ApiOkResponse({ description: '成功获取用户列表', type: [User] })
  @ApiForbiddenResponse({ description: '权限不足' })
  async findAllUsers(): Promise<User[]> {
    return this.authService.findAllUsers();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  @Permissions('user:read')
  @Roles('administrator')
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('users/:id')
  @ApiOperation({ summary: '根据ID获取单个用户 (管理员)' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiOkResponse({ description: '成功获取用户', type: User })
  @ApiNotFoundResponse({ description: '用户不存在' })
  @ApiForbiddenResponse({ description: '权限不足' })
  async findUserById(@Param('id') id: string): Promise<User> {
    return this.authService.findUserById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  @Permissions('user:create')
  @Roles('administrator')
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建新用户 (管理员)' })
  @ApiCreatedResponse({ description: '用户创建成功', type: User })
  @ApiConflictResponse({ description: '用户名或邮箱已存在' })
  @ApiBadRequestResponse({ description: '输入数据验证失败' })
  @ApiForbiddenResponse({ description: '权限不足' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.authService.createUser(createUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  @Permissions('user:update')
  @Roles('administrator')
  @UseInterceptors(ClassSerializerInterceptor)
  @Put('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新用户信息 (管理员)' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiOkResponse({ description: '用户更新成功', type: User })
  @ApiNotFoundResponse({ description: '用户不存在' })
  @ApiConflictResponse({ description: '用户名或邮箱与他人冲突' })
  @ApiForbiddenResponse({ description: '权限不足' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.authService.updateUser(id, updateUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
  @Permissions('user:delete')
  @Roles('administrator')
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除用户 (管理员)' })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiOkResponse({ description: '用户删除成功' })
  @ApiNotFoundResponse({ description: '用户不存在' })
  @ApiBadRequestResponse({ description: '不能删除最后一个管理员' })
  @ApiForbiddenResponse({ description: '权限不足' })
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return this.authService.deleteUser(id);
  }
}
