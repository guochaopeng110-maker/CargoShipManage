import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 通用 API 响应包装器（泛型）
 *
 * 用于统一封装所有 API 的成功响应，确保响应格式一致性
 *
 * @template T - 响应数据的类型
 *
 * @example
 * // 单个实体响应
 * return {
 *   code: 200,
 *   message: '操作成功',
 *   data: thresholdConfig,
 *   timestamp: Date.now(),
 * };
 *
 * @example
 * // 在控制器装饰器中使用
 * @ApiOkResponse({
 *   description: '成功获取阈值配置',
 *   type: ThresholdConfig,
 * })
 */
export class ApiResponseDto<T> {
  /**
   * 业务状态码
   * 200 表示成功，其他值表示业务层面的错误
   */
  @ApiProperty({
    description: '业务状态码（200 表示成功）',
    example: 200,
    type: Number,
  })
  code: number;

  /**
   * 响应消息
   * 人类可读的操作结果描述（中文）
   */
  @ApiProperty({
    description: '响应消息',
    example: '操作成功',
    type: String,
  })
  message: string;

  /**
   * 响应数据
   * 实际的业务数据，类型由泛型参数 T 指定
   */
  @ApiProperty({
    description: '响应数据',
  })
  data: T;

  /**
   * 响应时间戳
   * Unix 时间戳（毫秒）
   */
  @ApiProperty({
    description: '响应生成的时间戳（毫秒）',
    example: 1700000000000,
    type: Number,
  })
  timestamp: number;
}

/**
 * 分页响应包装器（泛型）
 *
 * 用于封装所有分页查询的响应数据
 *
 * @template T - 列表项的类型
 *
 * @example
 * return {
 *   items: thresholds,
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 *   totalPages: 5,
 * };
 */
export class PaginatedResponseDto<T> {
  /**
   * 数据项列表
   * 当前页的所有数据项
   */
  @ApiProperty({
    description: '数据项列表',
    isArray: true,
  })
  items: T[];

  /**
   * 总记录数
   * 满足查询条件的总记录数
   */
  @ApiProperty({
    description: '总记录数',
    example: 100,
    type: Number,
  })
  total: number;

  /**
   * 当前页码
   * 从 1 开始
   */
  @ApiProperty({
    description: '当前页码（从 1 开始）',
    example: 1,
    minimum: 1,
    type: Number,
  })
  page: number;

  /**
   * 每页大小
   * 每页返回的记录数
   */
  @ApiProperty({
    description: '每页记录数',
    example: 20,
    minimum: 1,
    maximum: 100,
    type: Number,
  })
  pageSize: number;

  /**
   * 总页数
   * 根据 total 和 pageSize 计算得出
   */
  @ApiProperty({
    description: '总页数',
    example: 5,
    type: Number,
  })
  totalPages: number;
}

/**
 * 错误响应 DTO
 *
 * 统一的错误响应格式，匹配 NestJS HttpExceptionFilter 的默认格式
 *
 * @example
 * {
 *   statusCode: 400,
 *   message: 'Validation failed',
 *   error: 'Bad Request',
 *   timestamp: 1700000000000,
 *   path: '/api/thresholds'
 * }
 */
export class ErrorResponseDto {
  /**
   * HTTP 状态码
   * 标准的 HTTP 错误状态码（400, 401, 403, 404, 500 等）
   */
  @ApiProperty({
    description: 'HTTP 状态码',
    example: 400,
    type: Number,
  })
  statusCode: number;

  /**
   * 错误消息
   * 可以是单个错误消息或错误消息数组（用于验证错误）
   */
  @ApiProperty({
    description: '错误消息（单个或数组）',
    example: 'Validation failed',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message: string | string[];

  /**
   * 错误类型
   * HTTP 错误的简短描述（如 "Bad Request", "Not Found"）
   */
  @ApiPropertyOptional({
    description: '错误类型描述',
    example: 'Bad Request',
    type: String,
  })
  error?: string;

  /**
   * 错误发生时间
   * Unix 时间戳（毫秒）
   */
  @ApiProperty({
    description: '错误发生的时间戳（毫秒）',
    example: 1700000000000,
    type: Number,
  })
  timestamp: number;

  /**
   * 请求路径
   * 触发错误的 API 端点路径
   */
  @ApiPropertyOptional({
    description: '触发错误的请求路径',
    example: '/api/thresholds',
    type: String,
  })
  path?: string;
}

/**
 * 登录响应 DTO
 *
 * 用户登录成功后返回的令牌信息
 *
 * @example
 * {
 *   accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   expiresIn: 3600,
 *   tokenType: 'Bearer'
 * }
 */
export class LoginResponseDto {
  /**
   * 访问令牌
   * JWT 格式的访问令牌，用于后续 API 请求的身份验证
   */
  @ApiProperty({
    description: 'JWT 访问令牌',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: String,
  })
  accessToken: string;

  /**
   * 刷新令牌
   * 用于刷新访问令牌的长期令牌
   */
  @ApiProperty({
    description: '刷新令牌',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.cThIIoDvwdueQB468K5xDc5633seEFoqwxjF_xSJyQQ',
    type: String,
  })
  refreshToken: string;

  /**
   * 令牌过期时间
   * 访问令牌的有效期（秒）
   */
  @ApiPropertyOptional({
    description: '访问令牌过期时间（秒）',
    example: 3600,
    type: Number,
  })
  expiresIn?: number;

  /**
   * 令牌类型
   * 通常为 "Bearer"
   */
  @ApiPropertyOptional({
    description: '令牌类型',
    example: 'Bearer',
    type: String,
    default: 'Bearer',
  })
  tokenType?: string;
}

/**
 * 数据统计响应 DTO
 *
 * 用于返回时序数据的统计信息（最大值、最小值、平均值等）
 *
 * @example
 * {
 *   metricType: 'temperature',
 *   count: 1000,
 *   maxValue: 85.5,
 *   minValue: 20.3,
 *   avgValue: 52.8,
 *   unit: '℃'
 * }
 */
export class DataStatisticsResponseDto {
  /**
   * 指标类型
   * 统计数据的指标类型（如 'temperature', 'voltage'）
   */
  @ApiProperty({
    description: '指标类型',
    example: 'temperature',
    type: String,
  })
  metricType: string;

  /**
   * 数据点数量
   * 参与统计的数据点总数
   */
  @ApiProperty({
    description: '数据点数量',
    example: 1000,
    type: Number,
  })
  count: number;

  /**
   * 最大值
   * 统计期间的最大值
   */
  @ApiProperty({
    description: '最大值',
    example: 85.5,
    type: Number,
  })
  maxValue: number;

  /**
   * 最小值
   * 统计期间的最小值
   */
  @ApiProperty({
    description: '最小值',
    example: 20.3,
    type: Number,
  })
  minValue: number;

  /**
   * 平均值
   * 统计期间的平均值
   */
  @ApiProperty({
    description: '平均值',
    example: 52.8,
    type: Number,
  })
  avgValue: number;

  /**
   * 单位
   * 数值的测量单位（可选）
   */
  @ApiPropertyOptional({
    description: '测量单位',
    example: '℃',
    type: String,
  })
  unit?: string;
}

/**
 * 错误详情 DTO
 *
 * 批量操作中单个失败项的详细信息
 */
export class ErrorDetailDto {
  /**
   * 失败项的索引
   * 在批量数据中的位置（从 0 开始）
   */
  @ApiProperty({
    description: '失败项索引',
    example: 5,
    type: Number,
  })
  index: number;

  /**
   * 失败原因
   * 人类可读的错误描述
   */
  @ApiProperty({
    description: '失败原因',
    example: '数据格式错误：时间戳无效',
    type: String,
  })
  reason: string;

  /**
   * 失败的数据
   * 原始数据（可选，用于调试）
   */
  @ApiPropertyOptional({
    description: '失败的原始数据',
  })
  data?: any;
}

/**
 * 批量操作结果 DTO
 *
 * 用于返回批量操作（如批量导入、批量删除）的结果统计
 *
 * @example
 * {
 *   totalCount: 100,
 *   successCount: 98,
 *   failedCount: 2,
 *   errors: [
 *     { index: 5, reason: '数据格式错误' },
 *     { index: 23, reason: '设备ID不存在' }
 *   ]
 * }
 */
export class BatchOperationResultDto {
  /**
   * 总操作数
   * 批量操作涉及的总记录数
   */
  @ApiProperty({
    description: '总操作数',
    example: 100,
    type: Number,
  })
  totalCount: number;

  /**
   * 成功数量
   * 成功处理的记录数
   */
  @ApiProperty({
    description: '成功数量',
    example: 98,
    type: Number,
  })
  successCount: number;

  /**
   * 失败数量
   * 处理失败的记录数
   */
  @ApiProperty({
    description: '失败数量',
    example: 2,
    type: Number,
  })
  failedCount: number;

  /**
   * 错误详情列表
   * 所有失败项的详细信息
   */
  @ApiProperty({
    description: '错误详情列表',
    type: [ErrorDetailDto],
    isArray: true,
  })
  errors: ErrorDetailDto[];
}
