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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
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
import type { Express } from 'express';

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
   * 上传文件并获取预览数据（T057 + T059）
   * 支持Excel和CSV格式
   * 权限：sensor_data:import
   * 角色：administrator, operator
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传文件并解析预览' })
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
  @ApiResponse({
    status: 201,
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
  @ApiResponse({ status: 400, description: '文件格式错误或解析失败' })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('sensor_data:import')
  @Roles('administrator', 'operator')
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
   * 权限：sensor_data:import
   * 角色：administrator, operator
   */
  @Post('upload-and-import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传文件并立即执行导入' })
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
  @ApiResponse({
    status: 200,
    description: '导入完成，返回导入记录',
    type: ImportRecord,
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('sensor_data:import')
  @Roles('administrator', 'operator')
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
  @ApiOperation({ summary: '查询导入记录列表' })
  @ApiResponse({
    status: 200,
    description: '返回导入记录列表和总数',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: {
          type: 'number',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  async findAll(
    @Query() queryDto: QueryImportDto,
  ): Promise<{ data: ImportRecord[]; total: number }> {
    return await this.importService.findAll(queryDto);
  }

  /**
   * 查询单个导入记录详情
   * 包含完整的错误信息和统计数据
   * 权限：sensor_data:read
   * 角色：administrator, operator, viewer
   */
  @Get(':id')
  @ApiOperation({ summary: '查询导入记录详情' })
  @ApiResponse({
    status: 200,
    description: '返回导入记录详情',
    type: ImportRecord,
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '导入记录不存在' })
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
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
  @ApiOperation({ summary: '删除导入记录' })
  @ApiResponse({ status: 204, description: '删除成功' })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '导入记录不存在' })
  @Permissions('sensor_data:delete')
  @Roles('administrator')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.importService.remove(id);
  }
}
