# 类型安全响应模型规范增量

本规范定义类型安全的 API 响应模型，确保前后端类型一致性，支持自动代码生成。

## ADDED Requirements

### Requirement: 泛型响应包装器

系统 SHALL 提供泛型响应包装器类，用于统一封装所有 API 响应。

#### Scenario: ApiResponseDto 泛型类定义

- **WHEN** 创建 `ApiResponseDto<T>` 泛型类
- **THEN** 类 SHALL 包含字段：`code: number`, `message: string`, `data: T`, `timestamp: number`
- **AND** 所有字段 SHALL 使用 `@ApiProperty` 装饰器
- **AND** `@ApiProperty` SHALL 包含示例值：`code: 200`, `message: '操作成功'`, `timestamp: 1700000000000`
- **AND** `data` 字段的类型 SHALL 为泛型参数 T

#### Scenario: PaginatedResponseDto 泛型类定义

- **WHEN** 创建 `PaginatedResponseDto<T>` 泛型类
- **THEN** 类 SHALL 包含字段：`items: T[]`, `total: number`, `page: number`, `pageSize: number`, `totalPages: number`
- **AND** 所有字段 SHALL 使用 `@ApiProperty` 装饰器
- **AND** `items` 字段 SHALL 定义为数组类型，元素类型为泛型参数 T
- **AND** `page` 和 `pageSize` SHALL 有最小值约束（minimum: 1）
- **AND** `totalPages` SHALL 定义为计算字段：`Math.ceil(total / pageSize)`

#### Scenario: 泛型类型在 Swagger 中正确展开

- **WHEN** 控制器使用 `@ApiOkResponse({ type: ApiResponseDto })` 并指定泛型参数
- **THEN** swagger.json SHALL 生成展开后的 schema，包含具体的 `data` 类型
- **AND** 不同端点使用相同泛型类但不同类型参数时，SHALL 生成不同的 schema 定义
- **AND** Swagger UI SHALL 显示完整的响应结构，包括嵌套的 `data` 字段类型

### Requirement: 标准错误响应模型

系统 SHALL 提供标准错误响应模型，统一所有错误响应格式。

#### Scenario: ErrorResponseDto 定义

- **WHEN** 创建 `ErrorResponseDto` 类
- **THEN** 类 SHALL 包含字段：`statusCode: number`, `message: string | string[]`, `error?: string`, `timestamp: number`, `path?: string`
- **AND** `message` 字段 SHALL 支持单个错误消息或错误消息数组（用于验证错误）
- **AND** `error` 字段 SHALL 为可选，提供错误类型描述（如 "Bad Request", "Not Found"）
- **AND** `path` 字段 SHALL 为可选，提供触发错误的请求路径

#### Scenario: 错误响应装饰器使用

- **WHEN** API 端点可能返回错误
- **THEN** 端点 SHALL 使用 `@ApiBadRequestResponse({ type: ErrorResponseDto })` 装饰器
- **AND** 常见错误状态码 SHALL 包含装饰器：400, 401, 403, 404, 500
- **AND** 每个错误响应装饰器 SHALL 引用 `ErrorResponseDto` 类
- **AND** swagger.json SHALL 为每个错误状态码生成标准的错误响应 schema

#### Scenario: 错误响应与 HttpExceptionFilter 一致

- **WHEN** NestJS `HttpExceptionFilter` 捕获异常
- **THEN** 过滤器返回的错误格式 SHALL 与 `ErrorResponseDto` 定义一致
- **AND** 验证错误（400）SHALL 将错误消息数组放入 `message` 字段
- **AND** 所有错误响应 SHALL 包含 `timestamp` 字段

### Requirement: 专门领域响应模型

系统 SHALL 为特定业务场景提供专门的响应模型。

#### Scenario: LoginResponseDto 定义

- **WHEN** 创建 `LoginResponseDto` 类用于登录响应
- **THEN** 类 SHALL 包含字段：`accessToken: string`, `refreshToken: string`, `expiresIn?: number`, `tokenType?: string`
- **AND** 所有字段 SHALL 使用 `@ApiProperty` 装饰器
- **AND** `accessToken` 示例 SHALL 为真实的 JWT 格式字符串
- **AND** `expiresIn` SHALL 表示访问令牌的过期时间（秒）
- **AND** `tokenType` 默认值 SHALL 为 "Bearer"

#### Scenario: DataStatisticsResponseDto 定义

- **WHEN** 创建 `DataStatisticsResponseDto` 类用于数据统计响应
- **THEN** 类 SHALL 包含字段：`metricType: string`, `count: number`, `maxValue: number`, `minValue: number`, `avgValue: number`, `unit?: string`
- **AND** 所有字段 SHALL 使用 `@ApiProperty` 装饰器
- **AND** `metricType` SHALL 使用枚举类型或字符串联合类型
- **AND** 数值字段（maxValue, minValue, avgValue）SHALL 保留两位小数
- **AND** `unit` 字段 SHALL 为可选，表示测量单位

#### Scenario: BatchOperationResultDto 定义

- **WHEN** 创建 `BatchOperationResultDto` 类用于批量操作响应
- **THEN** 类 SHALL 包含字段：`totalCount: number`, `successCount: number`, `failedCount: number`, `errors: ErrorDetail[]`
- **AND** `ErrorDetail` SHALL 为嵌套类，包含字段：`index: number`, `reason: string`, `data?: any`
- **AND** `errors` 数组 SHALL 仅包含失败的记录详情
- **AND** `successCount + failedCount` SHALL 等于 `totalCount`

### Requirement: 响应模型可复用性

系统 SHALL 确保响应模型在多个控制器中可复用。

#### Scenario: 响应模型导出为公共模块

- **WHEN** 创建响应模型类
- **THEN** 所有响应模型 SHALL 定义在 `src/common/dto/` 目录
- **AND** SHALL 通过 `src/common/dto/index.ts` 进行 barrel 导出
- **AND** 控制器 SHALL 通过 `import { ApiResponseDto } from '../../common/dto'` 导入

#### Scenario: 泛型响应模型支持多种数据类型

- **WHEN** 不同端点返回不同类型的数据
- **THEN** 端点 SHALL 使用 `ApiResponseDto<SpecificType>` 指定具体类型
- **AND** TypeScript 编译器 SHALL 正确推断 `data` 字段类型
- **AND** swagger.json SHALL 为每种具体类型生成独立的 schema

#### Scenario: 分页响应模型支持多种实体

- **WHEN** 不同端点返回不同实体的分页数据
- **THEN** 端点 SHALL 使用 `PaginatedResponseDto<EntityType>` 指定实体类型
- **AND** `items` 数组的元素类型 SHALL 与实体类型一致
- **AND** swagger.json SHALL 为每种实体生成独立的分页响应 schema

### Requirement: 响应模型验证

系统 SHALL 提供机制验证响应模型的正确性。

#### Scenario: 运行时响应格式验证

- **WHEN** API 端点返回响应
- **THEN** 响应格式 SHALL 与声明的响应模型一致
- **AND** 如果启用了响应序列化拦截器，SHALL 自动验证响应结构
- **AND** 类型不匹配时 SHALL 记录警告日志（开发模式）

#### Scenario: 编译时类型检查

- **WHEN** 控制器方法返回数据
- **THEN** TypeScript 编译器 SHALL 验证返回值类型与声明的响应类型一致
- **AND** 类型不匹配时 SHALL 产生编译错误
- **AND** IDE SHALL 提供智能提示，显示正确的返回类型

#### Scenario: swagger.json 生成验证

- **WHEN** 运行应用并生成 swagger.json
- **THEN** SHALL 验证所有端点都有响应定义
- **AND** SHALL 验证所有响应模型都在 `components.schemas` 中定义
- **AND** SHALL 验证没有孤立的内联 schema（所有复杂类型都应引用命名 schema）
- **AND** 验证失败时 SHALL 在启动时输出警告日志

## MODIFIED Requirements

### Requirement: API 响应格式标准化

所有 API 响应 SHALL 遵循统一的格式，使用类型安全的响应模型封装。所有成功响应 SHALL 使用 `{ code, message, data, timestamp }` 格式，并通过 `ApiResponseDto<T>` 泛型类实现类型安全。

#### Scenario: 成功响应使用 ApiResponseDto

- **WHEN** API 端点返回成功数据
- **THEN** 响应 SHALL 使用 `ApiResponseDto<T>` 泛型类封装
- **AND** `code` 字段 SHALL 为 200（业务成功状态码）
- **AND** `message` 字段 SHALL 为人类可读的成功消息（中文）
- **AND** `data` 字段 SHALL 包含实际的业务数据，类型为 T
- **AND** `timestamp` 字段 SHALL 为响应生成的 Unix 时间戳（毫秒）

#### Scenario: 分页响应使用嵌套模型

- **WHEN** API 端点返回分页数据
- **THEN** 外层响应 SHALL 使用 `ApiResponseDto<PaginatedResponseDto<T>>`
- **AND** `data` 字段 SHALL 为 `PaginatedResponseDto<T>` 类型
- **AND** `data.items` SHALL 为实体数组
- **AND** `data.total`, `data.page`, `data.pageSize`, `data.totalPages` SHALL 提供分页元数据

#### Scenario: 错误响应不使用 ApiResponseDto

- **WHEN** API 端点返回错误
- **THEN** 响应 SHALL 直接使用 `ErrorResponseDto` 格式
- **AND** SHALL NOT 使用 `{ code, message, data }` 封装错误
- **AND** 错误响应 SHALL 与 NestJS 默认异常过滤器格式一致

## ADDED Requirements (Testing)

### Requirement: 响应模型单元测试

系统 SHALL 为响应模型提供单元测试，验证模型定义的正确性。

#### Scenario: 泛型类型正确推断

- **WHEN** 编写测试用例验证泛型响应模型
- **THEN** 测试 SHALL 验证 `ApiResponseDto<SomeEntity>` 的 `data` 字段类型为 `SomeEntity`
- **AND** 测试 SHALL 验证 `PaginatedResponseDto<SomeEntity>` 的 `items` 字段类型为 `SomeEntity[]`
- **AND** TypeScript 编译器 SHALL 能够正确推断类型，无需显式类型断言

#### Scenario: 响应模型序列化

- **WHEN** 使用 `class-transformer` 序列化响应对象
- **THEN** 序列化后的 JSON SHALL 包含所有定义的字段
- **AND** 序列化 SHALL 正确处理嵌套对象
- **AND** 序列化 SHALL 排除标记为 `@Exclude()` 的字段

#### Scenario: Swagger schema 生成

- **WHEN** 使用 `@nestjs/swagger` 生成响应 schema
- **THEN** 生成的 schema SHALL 包含所有 `@ApiProperty` 定义的字段
- **AND** 泛型类型参数 SHALL 正确展开为具体类型
- **AND** 必填字段 SHALL 在 schema 的 `required` 数组中
- **AND** 可选字段 SHALL NOT 在 `required` 数组中
