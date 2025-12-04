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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThresholdService } from './threshold.service';
import { AlarmService } from './alarm.service';
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
  @ApiOperation({ summary: '创建阈值配置' })
  @Permissions('alert:create')
  @Roles('administrator', 'operator')
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
  @ApiOperation({ summary: '查询阈值列表' })
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({ summary: '查询阈值详情' })
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({ summary: '更新阈值配置' })
  @Permissions('alert:update')
  @Roles('administrator', 'operator')
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
  @ApiOperation({ summary: '删除阈值配置' })
  @Permissions('alert:delete')
  @Roles('administrator', 'operator')
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
  @ApiOperation({ summary: '查询告警列表' })
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({ summary: '查询告警详情' })
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({ summary: '更新告警状态' })
  @Permissions('alert:update')
  @Roles('administrator', 'operator')
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
