import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ThresholdService } from './threshold.service';
import { AlarmService } from './alarm.service';
import { ThresholdConfig } from '../../database/entities/threshold-config.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { ErrorResponseDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateThresholdDto,
  UpdateThresholdDto,
  QueryThresholdDto,
  QueryAlarmDto,
  UpdateAlarmStatusDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * 告警管理控制器
 *
 * 权限说明：
 * - alert:create - 创建告警阈值配置（Administrator, Operator）
 * - alert:read - 查看告警和阈值（Administrator, Operator, Viewer）
 * - alert:update - 更新告警状态和阈值（Administrator, Operator）
 * - alert:delete - 删除告警阈值配置（Administrator, Operator）
 */
@ApiTags('告警管理')
@ApiBearerAuth()
@Controller('api')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class AlarmController {
  constructor(
    private readonly thresholdService: ThresholdService,
    private readonly alarmService: AlarmService,
  ) {}

  // ========== 阈值配置相关 ==========

  /**
   * 创建阈值配置
   * 权限：alert:create
   * 角色：administrator, operator
   */
  @Post('thresholds')
  @Permissions('alert:create')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '创建阈值配置',
    description: '创建新的告警阈值配置规则，用于监测设备指标异常',
  })
  @ApiCreatedResponse({
    description: '阈值配置创建成功',
    type: ThresholdConfig,
  })
  @ApiBadRequestResponse({
    description: '参数验证失败或设备ID格式错误',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:create 权限',
    type: ErrorResponseDto,
  })
  async createThreshold(
    @Body() createDto: CreateThresholdDto,
    @Req() req: any,
  ) {
    const threshold = await this.thresholdService.create(
      createDto,
      req.user?.userId,
    );
    return {
      code: 200,
      message: '创建成功',
      data: threshold,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询阈值列表
   * 权限：alert:read
   * 角色：administrator, operator, viewer
   */
  @Get('thresholds')
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询阈值列表',
    description: '分页查询阈值配置列表，支持按设备ID、指标类型、严重程度筛选',
  })
  @ApiOkResponse({
    description: '查询成功，返回分页数据',
    type: PaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: '查询参数格式错误',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:read 权限',
    type: ErrorResponseDto,
  })
  async findAllThresholds(@Query() queryDto: QueryThresholdDto) {
    const result = await this.thresholdService.findAll(queryDto);
    return {
      code: 200,
      message: '查询成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询阈值详情
   * 权限：alert:read
   * 角色：administrator, operator, viewer
   */
  @Get('thresholds/:id')
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询阈值详情',
    description: '根据ID获取单个阈值配置的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '阈值配置ID（UUID格式）',
    type: String,
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '查询成功',
    type: ThresholdConfig,
  })
  @ApiBadRequestResponse({
    description: 'ID格式错误（非UUID格式）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '阈值配置不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:read 权限',
    type: ErrorResponseDto,
  })
  async findOneThreshold(@Param('id', ParseUUIDPipe) id: string) {
    const threshold = await this.thresholdService.findOne(id);
    return {
      code: 200,
      message: '查询成功',
      data: threshold,
      timestamp: Date.now(),
    };
  }

  /**
   * 更新阈值配置
   * 权限：alert:update
   * 角色：administrator, operator
   */
  @Put('thresholds/:id')
  @Permissions('alert:update')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '更新阈值配置',
    description: '修改现有阈值配置的参数（上下限、持续时间、严重程度等）',
  })
  @ApiParam({
    name: 'id',
    description: '阈值配置ID（UUID格式）',
    type: String,
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '更新成功',
    type: ThresholdConfig,
  })
  @ApiBadRequestResponse({
    description: 'ID格式错误或参数验证失败',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '阈值配置不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:update 权限',
    type: ErrorResponseDto,
  })
  async updateThreshold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateThresholdDto,
    @Req() req: any,
  ) {
    const threshold = await this.thresholdService.update(
      id,
      updateDto,
      req.user?.userId,
    );
    return {
      code: 200,
      message: '更新成功',
      data: threshold,
      timestamp: Date.now(),
    };
  }

  /**
   * 删除阈值配置
   * 权限：alert:delete
   * 角色：administrator, operator
   */
  @Delete('thresholds/:id')
  @Permissions('alert:delete')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '删除阈值配置',
    description: '删除指定的阈值配置规则',
  })
  @ApiParam({
    name: 'id',
    description: '阈值配置ID（UUID格式）',
    type: String,
    format: 'uuid',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '删除成功',
  })
  @ApiBadRequestResponse({
    description: 'ID格式错误（非UUID格式）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '阈值配置不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:delete 权限',
    type: ErrorResponseDto,
  })
  async deleteThreshold(@Param('id', ParseUUIDPipe) id: string) {
    await this.thresholdService.remove(id);
    return {
      code: 200,
      message: '删除成功',
      data: null,
      timestamp: Date.now(),
    };
  }

  // ========== 告警记录相关 ==========

  /**
   * 查询告警列表
   * 权限：alert:read
   * 角色：administrator, operator, viewer
   */
  @Get('alarms')
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询告警列表',
    description: '分页查询告警记录列表，支持按设备ID、严重程度、处理状态筛选',
  })
  @ApiOkResponse({
    description: '查询成功，返回分页数据',
    type: PaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: '查询参数格式错误',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:read 权限',
    type: ErrorResponseDto,
  })
  async findAllAlarms(@Query() queryDto: QueryAlarmDto) {
    const result = await this.alarmService.findAll(queryDto);
    return {
      code: 200,
      message: '查询成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询告警详情
   * 权限：alert:read
   * 角色：administrator, operator, viewer
   */
  @Get('alarms/:id')
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询告警详情',
    description: '根据ID获取单个告警记录的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '告警记录ID（UUID格式）',
    type: String,
    format: 'uuid',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiOkResponse({
    description: '查询成功',
    type: AlarmRecord,
  })
  @ApiBadRequestResponse({
    description: 'ID格式错误（非UUID格式）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '告警记录不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:read 权限',
    type: ErrorResponseDto,
  })
  async findOneAlarm(@Param('id', ParseUUIDPipe) id: string) {
    const alarm = await this.alarmService.findOne(id);
    return {
      code: 200,
      message: '查询成功',
      data: alarm,
      timestamp: Date.now(),
    };
  }

  /**
   * 更新告警状态
   * 权限：alert:update
   * 角色：administrator, operator
   */
  @Put('alarms/:id')
  @Permissions('alert:update')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '更新告警状态',
    description: '修改告警记录的处理状态（待处理、处理中、已解决、已忽略）',
  })
  @ApiParam({
    name: 'id',
    description: '告警记录ID（UUID格式）',
    type: String,
    format: 'uuid',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @ApiOkResponse({
    description: '更新成功',
    type: AlarmRecord,
  })
  @ApiBadRequestResponse({
    description: 'ID格式错误或参数验证失败',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '告警记录不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 alert:update 权限',
    type: ErrorResponseDto,
  })
  async updateAlarmStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateAlarmStatusDto,
    @Req() req: any,
  ) {
    const alarm = await this.alarmService.updateStatus(
      id,
      updateDto,
      req.user?.userId,
    );
    return {
      code: 200,
      message: '更新成功',
      data: alarm,
      timestamp: Date.now(),
    };
  }
}
