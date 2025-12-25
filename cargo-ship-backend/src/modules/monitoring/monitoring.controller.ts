import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiExtraModels,
} from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import {
  ErrorResponseDto,
  DataStatisticsResponseDto,
  BatchOperationResultDto,
} from '../../common/dto';
import {
  CreateTimeSeriesDataDto,
  CreateBatchTimeSeriesDataDto,
  QueryTimeSeriesDataDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  MetricType,
  TimeSeriesData,
} from '../../database/entities/time-series-data.entity';

/**
 * 监测数据控制器
 *
 * 提供监测数据的上报、查询、统计等API接口
 * 所有接口需要JWT认证、权限验证和角色验证
 *
 * 权限说明：
 * - sensor_data:create - 创建/上报监测数据
 * - sensor_data:read - 查询监测数据
 */
@ApiTags('监测数据')
@ApiExtraModels(TimeSeriesData) // ✅ 显式注册 TimeSeriesData 到 Swagger schemas
@ApiBearerAuth()
@Controller('api/monitoring')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * 接收单条监测数据
   *
   * POST /api/monitoring/data
   *
   * 权限要求：sensor_data:create
   * 角色要求：administrator, operator
   */
  @Post('data')
  @HttpCode(HttpStatus.OK)
  @Permissions('sensor_data:create')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '接收单条监测数据',
    description: '接收并存储单条设备监测数据，成功后返回数据ID',
  })
  @ApiOkResponse({
    description: '接收成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'success' },
        data: {
          type: 'object',
          properties: {
            dataId: { type: 'number', example: 123456 },
            received: { type: 'boolean', example: true },
          },
        },
        timestamp: { type: 'number', example: 1700000000000 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '参数验证失败',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 sensor_data:create 权限',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在',
    type: ErrorResponseDto,
  })
  async receiveMonitoringData(@Body() createDto: CreateTimeSeriesDataDto) {
    const savedData =
      await this.monitoringService.receiveMonitoringData(createDto);

    return {
      code: 200,
      message: 'success',
      data: {
        dataId: savedData.id,
        received: true,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 批量接收监测数据
   *
   * POST /api/monitoring/data/batch
   *
   * 权限要求：sensor_data:create
   * 角色要求：administrator, operator
   */
  @Post('data/batch')
  @HttpCode(HttpStatus.OK)
  @Permissions('sensor_data:create')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '批量接收监测数据',
    description: '批量接收并存储设备监测数据，最多1000条/次',
  })
  @ApiOkResponse({
    description: '接收成功，返回批量操作结果',
    type: BatchOperationResultDto,
  })
  @ApiBadRequestResponse({
    description: '参数验证失败或数据格式错误',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: '未授权，需要登录',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: '权限不足，需要 sensor_data:create 权限',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: '设备不存在',
    type: ErrorResponseDto,
  })
  async receiveBatchMonitoringData(
    @Body() batchDto: CreateBatchTimeSeriesDataDto,
  ) {
    const result =
      await this.monitoringService.receiveBatchMonitoringData(batchDto);

    return {
      code: 200,
      message: 'success',
      data: result,
      timestamp: Date.now(),
    };
  }

  /**
   * 查询监测数据
   *
   * GET /api/monitoring/data
   *
   * 权限要求：sensor_data:read
   * 角色要求：administrator, operator, viewer
   */
  @Get('data')
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '查询监测数据',
    description: '根据设备、指标类型、时间范围查询监测数据，支持分页',
  })
  @ApiOkResponse({
    description: '成功获取监测数据列表',
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
              items: { $ref: '#/components/schemas/TimeSeriesData' },
            },
            total: { type: 'number', example: 1000 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 50 },
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
  @ApiNotFoundResponse({
    description: '设备不存在',
    type: ErrorResponseDto,
  })
  async queryMonitoringData(@Query() queryDto: QueryTimeSeriesDataDto) {
    const result = await this.monitoringService.queryMonitoringData(queryDto);

    return {
      code: 200,
      message: '查询成功',
      data: result,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取数据统计信息
   *
   * GET /api/monitoring/data/statistics
   *
   * 权限要求：sensor_data:read
   * 角色要求：administrator, operator, viewer
   */
  @Get('data/statistics')
  @Permissions('sensor_data:read')
  @Roles('administrator', 'operator', 'viewer')
  @ApiOperation({
    summary: '获取数据统计信息',
    description:
      '获取指定设备、指标类型、时间范围的统计数据（最大值、最小值、平均值等）',
  })
  @ApiQuery({
    name: 'equipmentId',
    description: '设备ID（UUID格式）',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'metricType',
    description: '指标类型',
    required: true,
    enum: MetricType,
  })
  @ApiQuery({
    name: 'startTime',
    description: '开始时间戳（毫秒）',
    required: true,
    type: Number,
  })
  @ApiQuery({
    name: 'endTime',
    description: '结束时间戳（毫秒）',
    required: true,
    type: Number,
  })
  @ApiOkResponse({
    description: '查询成功，返回统计数据',
    type: DataStatisticsResponseDto,
  })
  @ApiBadRequestResponse({
    description: '查询参数格式错误或参数验证失败',
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
  @ApiNotFoundResponse({
    description: '设备不存在',
    type: ErrorResponseDto,
  })
  async getDataStatistics(
    @Query('equipmentId') equipmentId: string,
    @Query('metricType') metricType: MetricType,
    @Query('startTime') startTime: number,
    @Query('endTime') endTime: number,
  ) {
    const statistics = await this.monitoringService.getDataStatistics(
      equipmentId,
      metricType,
      startTime,
      endTime,
    );

    return {
      code: 200,
      message: 'success',
      data: statistics,
      timestamp: Date.now(),
    };
  }
}
