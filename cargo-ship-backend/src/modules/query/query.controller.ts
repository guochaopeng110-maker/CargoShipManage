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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Response } from 'express';
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: '统计成功',
    type: MonitoringStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '设备不存在',
  })
  @Permissions('device:read', 'sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiResponse({
    status: HttpStatus.OK,
    description: '统计成功',
    type: AlarmStatsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({
    summary: '设备状态概览',
    description: '获取所有设备的状态统计概览，包括在线、离线和异常设备数量',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    type: EquipmentOverviewDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({
    summary: '获取设备完整档案',
    description:
      '获取设备的完整档案信息，包括基本信息、监测数据统计、告警统计等',
  })
  @ApiParam({
    name: 'id',
    description: '设备ID（UUID格式）',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '设备不存在',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @Permissions('device:read')
  @Roles('administrator', 'operator', 'viewer')
  async getEquipmentCompleteProfile(@Param('id') id: string) {
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
  @ApiOperation({
    summary: '导出监测数据',
    description: '根据查询条件导出监测数据为Excel或CSV文件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '导出成功',
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({
    summary: '导出告警记录',
    description: '根据查询条件导出告警记录为Excel或CSV文件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '导出成功',
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @Permissions('alert:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({
    summary: '导出健康报告',
    description: '根据查询条件导出健康评估报告为PDF文件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '导出成功',
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '参数错误',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '未找到符合条件的报告',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权',
  })
  @Permissions('report:read')
  @Roles('administrator', 'operator', 'viewer')
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
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '下载成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文件不存在或已过期',
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
