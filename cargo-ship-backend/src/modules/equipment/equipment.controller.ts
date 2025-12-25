import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { QueryMonitoringPointDto } from './dto/monitoring-point.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../../common/dto';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';
import { MonitoringPoint } from '../../database/entities/monitoring-point.entity';

/**
 * 设备管理控制器
 * 提供设备 CRUD 操作和监测点查询的 RESTful API
 */
@ApiTags('设备管理')
@ApiExtraModels(Equipment, MonitoringPoint) // ✅ 显式注册实体到 Swagger schemas
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('api/equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  /**
   * 创建设备
   */
  @Post()
  @Permissions('device:create')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '创建新设备',
    description: '提供设备的基本信息来创建一条新的设备记录',
  })
  @ApiCreatedResponse({
    description: '设备创建成功',
    type: Equipment,
  })
  @ApiBadRequestResponse({
    description: '请求参数验证失败',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '设备编号已存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:create 权限',
    type: ErrorResponseDto,
  })
  async create(
    @Body() createEquipmentDto: CreateEquipmentDto,
    @CurrentUser() user: any,
  ) {
    const equipment = await this.equipmentService.create(
      createEquipmentDto,
      user.userId,
    );

    return {
      code: HttpStatus.CREATED,
      message: '设备创建成功',
      data: equipment,
    };
  }

  /**
   * 查询设备列表（分页）
   */
  @Get()
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询设备列表',
    description: '分页查询设备列表，支持按类型、状态和关键词进行筛选',
  })
  @ApiOkResponse({
    description: '成功获取设备列表',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '查询成功' },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/Equipment' },
            },
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
          },
        },
        timestamp: { type: 'number', example: 1734567890123 },
      },
    },
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
    description: '权限不足，需要 device:read 权限',
    type: ErrorResponseDto,
  })
  async findAll(@Query() queryDto: QueryEquipmentDto) {
    const result = await this.equipmentService.findAll(queryDto);

    return {
      code: HttpStatus.OK,
      message: '查询成功',
      data: {
        items: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 获取设备统计信息
   */
  @Get('statistics')
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '获取设备统计信息',
    description: '获取所有设备按状态（正常、告警、故障、离线）分类的数量统计。',
  })
  @ApiOkResponse({
    description: '查询成功，返回设备状态统计数据',
    schema: {
      type: 'object',
      properties: {
        normal: {
          type: 'number',
          description: '正常状态设备数量',
          example: 10,
        },
        warning: {
          type: 'number',
          description: '告警状态设备数量',
          example: 3,
        },
        fault: { type: 'number', description: '故障状态设备数量', example: 1 },
        offline: {
          type: 'number',
          description: '离线状态设备数量',
          example: 2,
        },
        total: { type: 'number', description: '设备总数', example: 16 },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:read 权限',
    type: ErrorResponseDto,
  })
  async getStatistics() {
    const statistics = await this.equipmentService.getStatistics();

    return {
      code: HttpStatus.OK,
      message: '查询成功',
      data: statistics,
    };
  }

  /**
   * 查询设备详情
   */
  @Get(':id')
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询设备详情',
    description: '根据设备的唯一ID查询其详细信息。',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '查询成功，返回设备详细信息',
    type: Equipment,
  })
  @ApiBadRequestResponse({
    description: '设备ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在或已被删除',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:read 权限',
    type: ErrorResponseDto,
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const equipment = await this.equipmentService.findOne(id);

    return {
      code: HttpStatus.OK,
      message: '查询成功',
      data: equipment,
    };
  }

  /**
   * 更新设备信息
   */
  @Patch(':id')
  @Permissions('device:update')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '更新设备信息',
    description: '更新指定设备的部分或全部信息。',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '更新成功，返回更新后的设备信息',
    type: Equipment,
  })
  @ApiBadRequestResponse({
    description: '请求参数验证失败或设备ID格式错误',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在或已被删除',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: '设备编号与现有其他设备冲突',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:update 权限',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
    @CurrentUser() user: any,
  ) {
    const equipment = await this.equipmentService.update(
      id,
      updateEquipmentDto,
      user.userId,
    );

    return {
      code: HttpStatus.OK,
      message: '设备更新成功',
      data: equipment,
    };
  }

  /**
   * 更新设备状态
   */
  @Patch(':id/status')
  @Permissions('device:update')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '单独更新设备状态',
    description: '快速更新指定设备的运行状态。',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(EquipmentStatus),
          description: '目标状态',
          example: EquipmentStatus.WARNING,
        },
      },
      required: ['status'],
    },
  })
  @ApiOkResponse({
    description: '状态更新成功，返回更新后的设备信息',
    type: Equipment,
  })
  @ApiBadRequestResponse({
    description: '请求参数验证失败或设备ID格式错误',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在或已被删除',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:update 权限',
    type: ErrorResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: EquipmentStatus,
    @CurrentUser() user: any,
  ) {
    const equipment = await this.equipmentService.updateStatus(
      id,
      status,
      user.userId,
    );

    return {
      code: HttpStatus.OK,
      message: '设备状态更新成功',
      data: equipment,
    };
  }

  /**
   * 删除设备（软删除）
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('device:delete')
  @Roles('administrator')
  @ApiOperation({
    summary: '删除设备',
    description: '软删除指定设备，记录将保留在数据库中但无法通过常规查询获取。',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '设备删除成功' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '设备ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在或已被删除',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:delete 权限',
    type: ErrorResponseDto,
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    await this.equipmentService.remove(id, user.userId);

    return {
      code: HttpStatus.OK,
      message: '设备删除成功',
    };
  }

  /**
   * 恢复已删除的设备
   */
  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @Permissions('device:create') // 通常恢复权限与创建权限绑定
  @Roles('administrator')
  @ApiOperation({
    summary: '恢复已删除的设备',
    description: '将被软删除的设备恢复为可用状态。',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '恢复成功，返回恢复后的设备信息',
    type: Equipment,
  })
  @ApiBadRequestResponse({
    description: '设备ID格式错误或设备未被删除，无需恢复',
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
    description: '权限不足，需要 device:create 权限',
    type: ErrorResponseDto,
  })
  async restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const equipment = await this.equipmentService.restore(id, user.userId);

    return {
      code: HttpStatus.OK,
      message: '设备恢复成功',
      data: equipment,
    };
  }

  // ========== 监测点相关端点 ==========

  /**
   * 获取设备的监测点列表
   *
   * 用于前端动态渲染设备详情页的监测点列表
   * 支持分页和按指标类型筛选
   */
  @Get(':id/monitoring-points')
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '获取设备的监测点列表',
    description:
      '查询指定设备的所有监测点定义，支持分页和筛选。用于前端动态展示监测点，避免硬编码。',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '成功获取监测点列表',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '查询成功' },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/MonitoringPoint' },
            },
            total: { type: 'number', example: 8 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 1 },
          },
        },
        timestamp: { type: 'number', example: 1734567890123 },
      },
    },
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
    description: '权限不足，需要 device:read 权限',
    type: ErrorResponseDto,
  })
  async getMonitoringPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: QueryMonitoringPointDto,
  ) {
    const result = await this.equipmentService.getMonitoringPoints(
      id,
      queryDto,
    );

    return {
      code: HttpStatus.OK,
      message: '查询成功',
      data: result,
      timestamp: Date.now(),
    };
  }
}
