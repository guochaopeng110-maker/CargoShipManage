import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { ExportService } from './export.service';
import {
  CreateHealthReportDto,
  QueryHealthReportDto,
  UpdateHealthReportDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * 健康报告控制器
 * 提供健康报告的生成和查询功能
 *
 * 权限说明：
 * - report:create - 生成健康报告（Administrator, Operator）
 * - report:read - 查看健康报告（Administrator, Operator, Viewer）
 * - report:update - 更新健康报告（Administrator, Operator）
 * - report:delete - 删除健康报告（Administrator）
 * - report:export - 导出健康报告（Administrator, Operator）
 */
@ApiTags('健康报告')
@ApiBearerAuth()
@Controller('api/reports/health')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * 生成健康评估报告
   * POST /api/reports/health
   * 权限：report:create
   * 角色：administrator, operator
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '生成健康评估报告',
    description:
      '根据指定时间范围和设备生成健康评估报告，支持单设备报告和汇总报告',
  })
  @ApiResponse({
    status: 200,
    description: '生成成功',
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，请先登录',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @Permissions('report:create')
  @Roles('administrator', 'operator')
  async generateReport(
    @Body() createDto: CreateHealthReportDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    const report = await this.reportService.generateReport(createDto, userId);

    return {
      code: 200,
      message: '报告生成成功',
      data: report,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询报告列表
   * GET /api/reports/health
   * 权限：report:read
   * 角色：administrator, operator, viewer
   */
  @Get()
  @ApiOperation({
    summary: '查询报告列表',
    description: '分页查询健康评估报告列表，支持按设备ID、报告类型筛选',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，请先登录',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @Permissions('report:read')
  @Roles('administrator', 'operator', 'viewer')
  async findAll(@Query() queryDto: QueryHealthReportDto) {
    const result = await this.reportService.findAll(queryDto);

    return {
      code: 200,
      message: '查询成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询报告详情
   * GET /api/reports/health/:id
   * 权限：report:read
   * 角色：administrator, operator, viewer
   */
  @Get(':id')
  @ApiOperation({
    summary: '查询报告详情',
    description: '根据ID查询单个健康评估报告的详细信息',
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，请先登录',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '资源不存在',
  })
  @Permissions('report:read')
  @Roles('administrator', 'operator', 'viewer')
  async findOne(@Param('id') id: string) {
    const report = await this.reportService.findOne(id);

    return {
      code: 200,
      message: '查询成功',
      data: report,
      timestamp: Date.now(),
    };
  }

  /**
   * 更新报告
   * PUT /api/reports/health/:id
   * 权限：report:update
   * 角色：administrator, operator
   *
   * 说明：只允许更新备注和附加说明，不允许修改报告的核心数据（健康评分、统计数据等）
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新报告',
    description: '更新报告的备注和附加说明（不允许修改核心数据）',
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，请先登录',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '报告不存在',
  })
  @Permissions('report:update')
  @Roles('administrator', 'operator')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateHealthReportDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    const report = await this.reportService.update(id, updateDto, userId);

    return {
      code: 200,
      message: '报告更新成功',
      data: report,
      timestamp: Date.now(),
    };
  }

  /**
   * 删除报告
   * DELETE /api/reports/health/:id
   * 权限：report:delete
   * 角色：administrator
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除报告',
    description: '删除指定的健康评估报告（物理删除）',
  })
  @ApiResponse({
    status: 200,
    description: '删除成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，请先登录',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '报告不存在',
  })
  @Permissions('report:delete')
  @Roles('administrator')
  async remove(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    const result = await this.reportService.remove(id, userId);

    return {
      code: 200,
      message: result.message,
      timestamp: Date.now(),
    };
  }

  /**
   * 导出报告为Excel
   * GET /api/reports/health/:id/export
   * 权限：report:export
   * 角色：administrator, operator
   */
  @Get(':id/export')
  @ApiOperation({
    summary: '导出报告为Excel',
    description: '将指定的健康评估报告导出为Excel文件',
  })
  @ApiResponse({
    status: 200,
    description: '导出成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权，请先登录',
  })
  @ApiResponse({
    status: 403,
    description: '权限不足',
  })
  @ApiResponse({
    status: 404,
    description: '报告不存在',
  })
  @Permissions('report:export')
  @Roles('administrator', 'operator')
  async exportReport(@Param('id') id: string, @Res() res: Response) {
    // 查询报告
    const report = await this.reportService.findOne(id);

    if (!report) {
      throw new NotFoundException(`报告 ${id} 不存在`);
    }

    // 生成Excel文件
    const buffer = await this.exportService.exportReportToExcel(report);

    // 设置响应头
    const filename = `健康报告_${report.equipmentId || '汇总'}_${new Date().getTime()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.setHeader('Content-Length', buffer.length);

    // 发送文件
    res.send(buffer);
  }
}
