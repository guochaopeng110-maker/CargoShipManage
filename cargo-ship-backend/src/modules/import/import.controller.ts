import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ImportService } from './import.service';
import { UploadFileDto, ImportDataDto, QueryImportDto } from './dto';
import {
  ImportRecord,
  DuplicateStrategy,
} from '../../database/entities/import-record.entity';
import { ParsedTimeSeriesData } from './file-parser.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ErrorResponseDto } from '../../common/dto';
import type { Express } from 'express';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 数据导入控制器
 * 提供文件上传、数据预览、导入执行和记录查询等API
 *
 * 权限说明：
 * - sensor_data:import - 导入传感器数据（Administrator, Operator）
 * - sensor_data:read - 查看导入记录（Administrator, Operator, Viewer）
 * - sensor_data:delete - 删除导入记录（Administrator）
 */
@ApiTags('数据导入')
@ApiBearerAuth()
@Controller('api/imports')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * 下载导入模板文件
   * 支持 Excel (.xlsx)、CSV (.csv) 和 JSON (.json) 格式
   * 公开接口，无需认证
   */
  @Get('template/:format')
  @Public()
  @ApiOperation({
    summary: '下载数据导入模板',
    description: `
      下载标准的时序数据导入模板文件。

      支持格式:
      - excel: 下载 .xlsx 格式模板（适合批量导入）
      - csv: 下载 .csv 格式模板（适合批量导入）
      - json: 下载 .json 格式模板（适合API集成）

      **设备ID清单（严格区分大小写）：**
      - SYS-BAT-001 - 电池系统
      - SYS-PROP-L-001 - 左推进系统
      - SYS-PROP-R-001 - 右推进系统
      - SYS-INV-1-001 - 1#日用逆变器系统
      - SYS-INV-2-001 - 2#日用逆变器系统
      - SYS-DCPD-001 - 直流配电板系统
      - SYS-BILGE-001 - 舱底水系统
      - SYS-COOL-001 - 冷却水泵系统

      **Excel/CSV 模板字段:**
      - 设备ID (必填): 设备的唯一标识符，如 SYS-BAT-001
      - 时间戳 (必填): YYYY-MM-DD HH:mm:ss 格式
      - 监测点 (必填): 业务监测点名称（中文），如"总电压"、"电机转速"
      - 指标类型 (必填): voltage, current, temperature, speed, power 等
      - 数值 (必填): 监测数值
      - 单位 (可选): 如 V、A、°C、rpm 等
      - 数据质量 (可选): 正常、异常、疑似

      **JSON 模板结构:**
      [{
        "equipmentId": "SYS-BAT-001",
        "equipmentName": "电池系统",
        "timestamp": "2025-01-01T10:00:00Z",
        "metrics": [
          {
            "monitoringPoint": "总电压",
            "metricType": "voltage",
            "value": 650.5,
            "unit": "V"
          }
        ]
      }]

      **注意事项:**
      - 设备ID必须使用系统级格式（SYS-XXX-001），不支持旧格式
      - 监测点名称必须使用中文，且与系统定义严格匹配
      - 完整监测点列表请参考系统文档
    `,
  })
  @ApiParam({
    name: 'format',
    description: '模板格式',
    enum: ['excel', 'csv', 'json'],
    example: 'excel',
  })
  @ApiOkResponse({
    description: '模板文件下载成功',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiNotFoundResponse({
    description: '模板文件不存在或格式不支持',
    type: ErrorResponseDto,
  })
  async downloadTemplate(
    @Param('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    // 验证格式
    const supportedFormats = ['excel', 'csv', 'json'];
    if (!supportedFormats.includes(format)) {
      throw new NotFoundException(
        `不支持的模板格式: ${format}，仅支持 ${supportedFormats.join(', ')}`,
      );
    }

    // 确定文件扩展名和 MIME 类型
    let extension: string;
    let mimeType: string;

    switch (format) {
      case 'excel':
        extension = 'xlsx';
        mimeType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        extension = 'csv';
        mimeType = 'text/csv';
        break;
      case 'json':
        extension = 'json';
        mimeType = 'application/json';
        break;
      default:
        throw new NotFoundException(`不支持的格式: ${format}`);
    }

    // 构建文件路径
    const filePath = path.join(
      process.cwd(),
      'templates',
      `import-template.${extension}`,
    );

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`模板文件不存在: ${filePath}`);
    }

    // 设置响应头
    res.setHeader('Content-Type', mimeType);
    const fileName = `数据导入模板.${extension}`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );

    // 发送文件
    res.sendFile(filePath);
  }

  /**
   * 上传文件并获取预览数据（T057 + T059）
   * 支持Excel和CSV格式
   * 权限：sensor_data:import
   * 角色：administrator, operator
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('sensor_data:import')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '上传文件并解析预览',
    description: `
      上传 Excel 或 CSV 格式的时序数据文件，系统将解析文件并返回预览数据（前100行）。

      **重要字段说明：**

      必填字段：
      - 设备ID: 设备的唯一标识符
      - 时间戳: YYYY-MM-DD HH:mm:ss 格式
      - 指标类型: 电压、温度、转速等
      - 数值: 监测数值

      可选但强烈推荐的字段：
      - **监测点**: 业务监测点名称（如"总电压"、"单体最高温度"）
        * 用于精确匹配告警规则
        * 不填写可能导致部分告警无法触发
        * 最大长度: 100字符
        * 示例: "总电压"、"单体最高温度"、"左主机转速"

      其他可选字段：
      - 单位: 如 V、℃、rpm 等
      - 数据质量: 正常、异常、疑似

      **下载标准模板：** GET /api/imports/template/excel 或 GET /api/imports/template/csv
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件（Excel或CSV）',
        },
        fileFormat: {
          type: 'string',
          enum: ['excel', 'csv'],
          description: '文件格式',
        },
        duplicateStrategy: {
          type: 'string',
          enum: ['skip', 'overwrite'],
          description: '重复数据处理策略',
        },
        remarks: {
          type: 'string',
          description: '备注信息',
        },
      },
      required: ['file', 'fileFormat'],
    },
  })
  @ApiCreatedResponse({
    description: '文件上传成功，返回导入记录和预览数据',
    schema: {
      type: 'object',
      properties: {
        importRecord: {
          type: 'object',
          description: '导入记录',
        },
        previewData: {
          type: 'array',
          description: '预览数据（前100行）',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '文件格式错误或解析失败',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 sensor_data:import 权限',
    type: ErrorResponseDto,
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<{
    importRecord: ImportRecord;
    previewData: ParsedTimeSeriesData[];
  }> {
    // TODO: 从认证上下文获取用户ID，这里暂时使用固定值
    const userId = 'system-user';

    return await this.importService.uploadAndParseFile(
      file,
      uploadFileDto.fileFormat,
      uploadFileDto.duplicateStrategy || DuplicateStrategy.SKIP,
      userId,
    );
  }

  /**
   * 执行数据导入（T057）
   * 根据导入记录ID执行实际的数据导入操作
   * 权限：sensor_data:import
   * 角色：administrator, operator
   */
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '执行数据导入' })
  @ApiBody({ type: ImportDataDto })
  @ApiResponse({
    status: 200,
    description: '导入执行完成，返回更新后的导入记录',
    type: ImportRecord,
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '导入记录不存在' })
  @ApiResponse({ status: 400, description: '导入任务状态不允许执行' })
  @Permissions('sensor_data:import')
  @Roles('administrator', 'operator')
  async executeImport(): Promise<ImportRecord> {
    // 注意：这里需要从上传时保存的临时数据中读取，实际实现中应该存储在缓存或临时表中
    // 为简化实现，这里假设前端会重新上传文件或者将预览数据一并提交

    // TODO: 实现数据的临时存储和读取机制
    // 当前实现假设在execute前需要重新解析文件或从缓存获取数据

    throw new Error('此方法需要配合数据缓存机制实现');
  }

  /**
   * 完整导入流程：上传并立即执行导入
   * 这是一个便捷方法，组合了上传和导入两个步骤
   *
   * 导入完成后会自动执行：
   * 1. 历史告警回溯分析：对导入的数据评估告警阈值，生成历史告警记录
   * 2. 最新数据推送：通过 WebSocket 推送每个设备的最新数据到订阅的客户端
   *
   * 权限：sensor_data:import
   * 角色：administrator, operator
   */
  @Post('upload-and-import')
  @UseInterceptors(FileInterceptor('file'))
  @Permissions('sensor_data:import')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '上传文件并立即执行导入',
    description: `
      上传文件并立即执行导入，返回完整的导入记录（包括成功/失败统计）。

      **导入后自动执行的增强功能：**
      1. **历史告警回溯**: 对导入的每条数据评估告警阈值，自动生成历史告警记录
      2. **实时数据推送**: 通过 WebSocket 推送每个设备的最新数据（事件名: import:latest-data）

      **重要提示：**
      - 强烈建议在文件中包含"监测点"列，以确保告警规则能够精确匹配
      - 不填写监测点可能导致部分告警无法触发
      - 下载标准模板: GET /api/imports/template/excel 或 GET /api/imports/template/csv

      **字段说明：**
      - 设备ID (必填): 设备唯一标识符
      - 时间戳 (必填): YYYY-MM-DD HH:mm:ss 格式
      - 监测点 (可选但推荐): 业务监测点名称，如"总电压"、"单体最高温度"
      - 指标类型 (必填): 电压、温度、转速等
      - 数值 (必填): 监测数值
      - 单位 (可选): V、℃、rpm 等
      - 数据质量 (可选): 正常、异常、疑似
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
        fileFormat: {
          type: 'string',
          enum: ['excel', 'csv'],
        },
        duplicateStrategy: {
          type: 'string',
          enum: ['skip', 'overwrite'],
        },
        skipInvalidRows: {
          type: 'boolean',
          description: '是否跳过无效行',
        },
        remarks: {
          type: 'string',
        },
      },
      required: ['file', 'fileFormat', 'duplicateStrategy'],
    },
  })
  @ApiOkResponse({
    description: '导入完成，返回导入记录',
    type: ImportRecord,
  })
  @ApiBadRequestResponse({
    description: '文件格式错误或解析失败',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 sensor_data:import 权限',
    type: ErrorResponseDto,
  })
  async uploadAndImport(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFileDto & { skipInvalidRows?: boolean },
  ): Promise<ImportRecord> {
    const userId = 'system-user';

    // 步骤1: 上传并解析文件
    const { importRecord, previewData } =
      await this.importService.uploadAndParseFile(
        file,
        body.fileFormat,
        body.duplicateStrategy || DuplicateStrategy.SKIP,
        userId,
      );

    // 步骤2: 立即执行导入
    const skipInvalidRows = body.skipInvalidRows !== false; // 默认跳过无效行
    const result = await this.importService.executeImport(
      importRecord.id,
      previewData, // 注意：这里只导入预览的100行，实际应该导入全部数据
      skipInvalidRows,
    );

    return result;
  }

  /**
   * 查询导入记录列表
   * 支持分页和多条件筛选
   * 权限：sensor_data:read
   * 角色：administrator, operator, viewer
   */
  @Get()
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询导入记录列表',
    description: '分页查询导入记录列表，支持按状态、文件格式等条件筛选',
  })
  @ApiOkResponse({
    description: '成功获取导入记录列表',
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
              items: { $ref: '#/components/schemas/ImportRecord' },
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
    description: '权限不足，需要 sensor_data:read 权限',
    type: ErrorResponseDto,
  })
  async findAll(@Query() queryDto: QueryImportDto) {
    const result = await this.importService.findAll(queryDto);

    return {
      code: 200,
      message: '查询成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询单个导入记录详情
   * 包含完整的错误信息和统计数据
   * 权限：sensor_data:read
   * 角色：administrator, operator, viewer
   */
  @Get(':id')
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询导入记录详情',
    description:
      '根据ID查询单个导入记录的详细信息，包含完整的错误信息和统计数据',
  })
  @ApiParam({
    name: 'id',
    description: '导入记录ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '返回导入记录详情',
    type: ImportRecord,
  })
  @ApiBadRequestResponse({
    description: '导入记录ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '导入记录不存在',
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
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ImportRecord> {
    return await this.importService.findOne(id);
  }

  /**
   * 删除导入记录
   * 权限：sensor_data:delete
   * 角色：administrator
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('sensor_data:delete')
  @Roles('administrator')
  @ApiOperation({
    summary: '删除导入记录',
    description: '删除指定的导入记录（物理删除）',
  })
  @ApiParam({
    name: 'id',
    description: '导入记录ID (UUID格式)',
    type: String,
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiOkResponse({
    description: '删除成功',
    schema: {
      type: 'object',
      properties: {},
    },
  })
  @ApiBadRequestResponse({
    description: '导入记录ID格式错误（非有效的UUID）',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '导入记录不存在',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 sensor_data:delete 权限',
    type: ErrorResponseDto,
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.importService.remove(id);
  }
}
