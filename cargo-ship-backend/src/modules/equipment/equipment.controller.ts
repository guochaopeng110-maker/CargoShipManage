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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { QueryEquipmentDto } from './dto/query-equipment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  Equipment,
  EquipmentStatus,
} from '../../database/entities/equipment.entity';

/**
 * 设备管理控制器
 * 提供设备 CRUD 操作的 RESTful API
 */
@ApiTags('设备管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('api/equipment')
@ApiResponse({ status: 401, description: '未授权，需要登录' })
@ApiResponse({ status: 403, description: '权限不足' })
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  /**
   * 创建设备
   */
  @Post()
  @ApiOperation({
    summary: '创建新设备',
    description: '提供设备的基本信息来创建一条新的设备记录。',
  })
  @ApiCreatedResponse({ description: '设备创建成功', type: Equipment })
  @ApiConflictResponse({ description: '设备编号已存在' })
  @ApiBadRequestResponse({ description: '请求参数验证失败' })
  @Permissions('device:create')
  @Roles('administrator', 'operator')
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
  @ApiOperation({
    summary: '查询设备列表',
    description: '分页查询设备列表，支持按类型、状态和关键词进行筛选。',
  })
  @ApiOkResponse({ description: '查询成功' })
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  async findAll(@Query() queryDto: QueryEquipmentDto) {
    const result = await this.equipmentService.findAll(queryDto);

    return {
      code: HttpStatus.OK,
      message: '查询成功',
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * 获取设备统计信息
   */
  @Get('statistics')
  @ApiOperation({
    summary: '获取设备统计信息',
    description: '获取所有设备按状态（正常、告警、故障、离线）分类的数量统计。',
  })
  @ApiOkResponse({ description: '查询成功' })
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOkResponse({ description: '查询成功', type: Equipment })
  @ApiNotFoundResponse({ description: '设备不存在' })
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({
    summary: '更新设备信息',
    description: '更新指定设备的部分或全部信息。',
  })
  @ApiParam({ name: 'id', description: '设备ID (UUID格式)', type: String })
  @ApiOkResponse({ description: '更新成功', type: Equipment })
  @ApiNotFoundResponse({ description: '设备不存在' })
  @ApiConflictResponse({ description: '设备编号与现有其他设备冲突' })
  @Permissions('device:update')
  @Roles('administrator', 'operator')
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
  @ApiOperation({
    summary: '单独更新设备状态',
    description: '快速更新指定设备的运行状态。',
  })
  @ApiParam({ name: 'id', description: '设备ID (UUID格式)', type: String })
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
  @ApiOkResponse({ description: '状态更新成功', type: Equipment })
  @ApiNotFoundResponse({ description: '设备不存在' })
  @Permissions('device:update')
  @Roles('administrator', 'operator')
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
  @ApiOperation({
    summary: '删除设备',
    description: '软删除指定设备，记录将保留在数据库中但无法通过常规查询获取。',
  })
  @ApiParam({ name: 'id', description: '设备ID (UUID格式)', type: String })
  @ApiOkResponse({ description: '删除成功' })
  @ApiNotFoundResponse({ description: '设备不存在' })
  @Permissions('device:delete')
  @Roles('administrator')
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
  @ApiOperation({
    summary: '恢复已删除的设备',
    description: '将被软删除的设备恢复为可用状态。',
  })
  @ApiParam({ name: 'id', description: '设备ID (UUID格式)', type: String })
  @ApiOkResponse({ description: '恢复成功', type: Equipment })
  @ApiNotFoundResponse({ description: '设备不存在' })
  @ApiBadRequestResponse({ description: '设备未被删除，无需恢复' })
  @Permissions('device:create') // 通常恢复权限与创建权限绑定
  @Roles('administrator')
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
}
