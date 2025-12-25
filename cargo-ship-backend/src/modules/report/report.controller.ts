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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { ExportService } from './export.service';
import { HealthReport } from '../../database/entities';
import {
  GenerateHealthReportDto,
  QueryHealthReportDto,
  UpdateHealthReportDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ErrorResponseDto } from '../../common/dto';

@ApiTags('健康报告')
@ApiExtraModels(HealthReport) // ✅ 显式注册 HealthReport 到 Swagger schemas
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
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Permissions('report:create')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '按需生成新的健康评估报告 (同步)',
    description:
      '根据指定的设备ID和时间范围，立即触发一次新的健康评估，并同步返回生成的报告。',
  })
  @ApiOkResponse({
    description: '生成成功，返回新的报告实体',
    type: HealthReport,
  })
  @ApiBadRequestResponse({
    description: '请求参数验证失败或设备ID格式错误',
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
    description: '权限不足，需要 report:create 权限',
    type: ErrorResponseDto,
  })
  async generateReport(
    @Body() generateDto: GenerateHealthReportDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const report = await this.reportService.generateReport(generateDto, userId);

    return {
      code: 200,
      message: '报告生成成功',
      data: report,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询报告列表
   */
  @Get()
  @Permissions('report:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询报告列表',
    description: '分页查询健康评估报告列表，支持按设备ID、报告类型筛选',
  })
  @ApiOkResponse({
    description: '成功获取健康报告列表',
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
              items: { $ref: '#/components/schemas/HealthReport' },
            },
            total: { type: 'number', example: 50 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 3 },
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
    description: '权限不足，需要 report:read 权限',
    type: ErrorResponseDto,
  })
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
   */
  @Get(':id')
  @Permissions('report:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询报告详情',
    description: '根据ID查询单个健康评估报告的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '报告ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '查询成功，返回报告详细信息',
    type: HealthReport,
  })
  @ApiBadRequestResponse({
    description: '报告ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '报告不存在',
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
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
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
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('report:update')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '更新报告',
    description: '更新报告的备注和附加说明（不允许修改核心数据）',
  })
  @ApiParam({
    name: 'id',
    description: '报告ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '报告更新成功，返回更新后的报告信息',
    type: HealthReport,
  })
  @ApiBadRequestResponse({
    description: '请求参数验证失败或报告ID格式错误',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '报告不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 report:update 权限',
    type: ErrorResponseDto,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateHealthReportDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
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
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('report:delete')
  @Roles('administrator')
  @ApiOperation({
    summary: '删除报告',
    description: '删除指定的健康评估报告（物理删除）',
  })
  @ApiParam({
    name: 'id',
    description: '报告ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '报告删除成功' },
        timestamp: { type: 'number', example: 1700000000000 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '报告ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '报告不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 report:delete 权限',
    type: ErrorResponseDto,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user.id;
    const result = await this.reportService.remove(id, userId);

    return {
      code: 200,
      message: result.message,
      timestamp: Date.now(),
    };
  }

  /**
   * 导出报告为Excel
   */
  @Get(':id/export')
  @Permissions('report:export')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '导出报告为Excel',
    description: '将指定的健康评估报告导出为Excel文件',
  })
  @ApiParam({
    name: 'id',
    description: '报告ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '导出成功，返回Excel文件流',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiBadRequestResponse({
    description: '报告ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '报告不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 report:export 权限',
    type: ErrorResponseDto,
  })
  async exportReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const report = await this.reportService.findOne(id);

    if (!report) {
      throw new NotFoundException(`报告 ${id} 不存在`);
    }

    const buffer = await this.exportService.exportReportToExcel(report);

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

    res.send(buffer);
  }
}
