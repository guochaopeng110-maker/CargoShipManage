import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

import type { Response as ExpressResponse } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { QueryService } from './query.service';
import { ExportService } from './export.service';
import {
  MonitoringStatisticsDto,
  AlarmStatisticsDto,
  EquipmentOverviewDto,
  MonitoringStatsResponseDto,
  AlarmStatsResponseDto,
  ExportMonitoringDataDto,
  ExportAlarmsDto,
  ExportReportsDto,
  ExportResponseDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ErrorResponseDto } from '../../common/dto';

/**
 * 查询与统计控制器
 *
 * 提供监测数据统计、告警统计、设备概览、数据导出等API接口
 */
@ApiTags('统计与导出')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('api')
export class QueryController {
  constructor(
    private readonly queryService: QueryService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * 获取监测数据统计
   *
   * GET /api/statistics/monitoring
   */
  @Get('statistics/monitoring')
  @HttpCode(HttpStatus.OK)
  @Permissions('device:read', 'sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '监测数据统计',
    description:
      '对指定设备的监测指标进行统计分析，计算最大值、最小值、平均值和标准差',
  })
  @ApiQuery({
    name: 'equipmentId',
    description: '设备ID（UUID格式）',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'metricType',
    description: '监测指标类型',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'startTime',
    description: '开始时间（Unix时间戳，毫秒）',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'endTime',
    description: '结束时间（Unix时间戳，毫秒）',
    required: true,
    type: Number,
  })
  @ApiOkResponse({
    description: '统计成功，返回监测数据统计信息',
    type: MonitoringStatsResponseDto,
  })
  @ApiBadRequestResponse({
    description: '参数错误或时间范围无效',
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
    description: '权限不足，需要 device:read 和 sensor_data:read 权限',
    type: ErrorResponseDto,
  })
  async getMonitoringStatistics(@Query() dto: MonitoringStatisticsDto) {
    const data = await this.queryService.getMonitoringStatistics(dto);

    return {
      code: 200,
      message: '统计成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取告警统计
   *
   * GET /api/statistics/alarms
   */
  @Get('statistics/alarms')
  @HttpCode(HttpStatus.OK)
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '告警统计',
    description: '统计指定时间范围内的告警数据，按严重程度和处理状态分组',
  })
  @ApiQuery({
    name: 'equipmentId',
    description: '设备ID（可选，不填则统计所有设备）',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'startTime',
    description: '开始时间（Unix时间戳，毫秒）',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'endTime',
    description: '结束时间（Unix时间戳，毫秒）',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'severity',
    description: '严重程度筛选（可选）',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiOkResponse({
    description: '统计成功，返回告警统计信息',
    type: AlarmStatsResponseDto,
  })
  @ApiBadRequestResponse({
    description: '参数错误或时间范围无效',
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
  async getAlarmStatistics(@Query() dto: AlarmStatisticsDto) {
    const data = await this.queryService.getAlarmStatistics(dto);

    return {
      code: 200,
      message: '统计成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取设备状态概览
   *
   * GET /api/statistics/equipment
   */
  @Get('statistics/equipment')
  @HttpCode(HttpStatus.OK)
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '设备状态概览',
    description: '获取所有设备的状态统计概览，包括在线、离线和异常设备数量',
  })
  @ApiOkResponse({
    description: '查询成功，返回设备状态概览',
    type: EquipmentOverviewDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 device:read 权限',
    type: ErrorResponseDto,
  })
  async getEquipmentOverview() {
    const data = await this.queryService.getEquipmentOverview();

    return {
      code: 200,
      message: '查询成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取设备完整档案
   *
   * GET /api/equipment/:id/profile
   */
  @Get('equipment/:id/profile')
  @HttpCode(HttpStatus.OK)
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '获取设备完整档案',
    description:
      '获取设备的完整档案信息，包括基本信息、监测数据统计、告警统计等',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID（UUID格式）',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '查询成功，返回设备完整档案',
    schema: {
      type: 'object',
      properties: {
        equipment: { type: 'object', description: '设备基本信息' },
        monitoringStats: { type: 'object', description: '监测数据统计' },
        alarmStats: { type: 'object', description: '告警统计' },
        healthScore: { type: 'number', description: '健康评分', example: 85 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '设备ID格式错误（非有效的UUID）',
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
    description: '权限不足，需要 device:read 权限',
    type: ErrorResponseDto,
  })
  async getEquipmentCompleteProfile(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.queryService.getEquipmentCompleteProfile(id);

    return {
      code: 200,
      message: '查询成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 导出监测数据
   *
   * POST /api/export/monitoring
   */
  @Post('export/monitoring')
  @HttpCode(HttpStatus.OK)
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '导出监测数据',
    description: '根据查询条件导出监测数据为Excel或CSV文件',
  })
  @ApiOkResponse({
    description: '导出成功，返回导出文件信息',
    type: ExportResponseDto,
  })
  @ApiBadRequestResponse({
    description: '参数错误或导出条件无效',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 sensor_data:read 权限',
    type: ErrorResponseDto,
  })
  async exportMonitoringData(@Body() dto: ExportMonitoringDataDto) {
    const data = await this.exportService.exportMonitoringData(dto);

    return {
      code: 200,
      message: '导出成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 导出告警记录
   *
   * POST /api/export/alarms
   */
  @Post('export/alarms')
  @HttpCode(HttpStatus.OK)
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '导出告警记录',
    description: '根据查询条件导出告警记录为Excel或CSV文件',
  })
  @ApiOkResponse({
    description: '导出成功，返回导出文件信息',
    type: ExportResponseDto,
  })
  @ApiBadRequestResponse({
    description: '参数错误或导出条件无效',
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
  async exportAlarms(@Body() dto: ExportAlarmsDto) {
    const data = await this.exportService.exportAlarms(dto);

    return {
      code: 200,
      message: '导出成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 导出健康报告
   *
   * POST /api/export/reports
   */
  @Post('export/reports')
  @HttpCode(HttpStatus.OK)
  @Permissions('report:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '导出健康报告',
    description: '根据查询条件导出健康评估报告为PDF文件',
  })
  @ApiOkResponse({
    description: '导出成功，返回导出文件信息',
    type: ExportResponseDto,
  })
  @ApiBadRequestResponse({
    description: '参数错误或导出条件无效',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '未找到符合条件的报告',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 report:read 权限',
    type: ErrorResponseDto,
  })
  async exportReports(@Body() dto: ExportReportsDto) {
    const data = await this.exportService.exportReports(dto);

    return {
      code: 200,
      message: '导出成功',
      data,
      timestamp: Date.now(),
    };
  }

  /**
   * 下载导出的文件
   *
   * GET /api/export/download/:filename
   */
  @Get('export/download/:filename')
  @ApiOperation({
    summary: '下载导出文件',
    description: '下载已导出的文件',
  })
  @ApiParam({
    name: 'filename',
    description: '文件名',
    type: String,
    example: 'monitoring-data-2025-12-15.xlsx',
  })
  @ApiOkResponse({
    description: '下载成功，返回文件流',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiNotFoundResponse({
    description: '文件不存在或已过期',
    type: ErrorResponseDto,
  })
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: ExpressResponse,
  ) {
    const filePath = path.join(process.cwd(), 'exports', filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(HttpStatus.NOT_FOUND).json({
        code: 404,
        message: '文件不存在或已过期',
        data: null,
        timestamp: Date.now(),
      });
    }

    // 设置响应头
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // 发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
