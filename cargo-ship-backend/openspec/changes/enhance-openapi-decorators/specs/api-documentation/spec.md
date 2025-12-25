# API 文档规范增量

本规范定义 API 文档生成的要求，确保通过 OpenAPI 装饰器生成完整、准确的 API 文档，支持前端自动代码生成。

## ADDED Requirements

### Requirement: 完整的 API 响应类型定义

系统 SHALL 为所有 API 端点提供完整的响应类型定义，包括成功响应和错误响应。

#### Scenario: 成功响应包含完整的类型信息

- **WHEN** API 端点返回成功响应
- **THEN** swagger.json SHALL 包含该端点的完整响应 schema
- **AND** 响应 schema SHALL 包含所有字段的类型、描述和示例值
- **AND** 嵌套对象 SHALL 递归定义所有字段的类型

#### Scenario: 错误响应包含标准格式

- **WHEN** API 端点返回错误响应（4xx, 5xx）
- **THEN** swagger.json SHALL 包含该 HTTP 状态码的错误响应定义
- **AND** 错误响应 SHALL 遵循标准格式：`{ statusCode, message, error, timestamp, path }`
- **AND** 常见错误状态码 SHALL 包含：400, 401, 403, 404, 500

#### Scenario: 分页响应包含元数据

- **WHEN** API 端点返回分页数据
- **THEN** 响应 SHALL 包含 `items` 数组和分页元数据
- **AND** 分页元数据 SHALL 包含：`total`, `page`, `pageSize`, `totalPages`
- **AND** `items` 数组的元素类型 SHALL 完整定义

### Requirement: 统一的响应模型

系统 SHALL 使用统一的响应模型封装所有 API 响应数据。

#### Scenario: 标准响应格式

- **WHEN** API 端点返回数据
- **THEN** 响应 SHALL 遵循格式：`{ code: number, message: string, data: T, timestamp: number }`
- **AND** `code` 字段 SHALL 表示业务状态码（200 表示成功）
- **AND** `message` 字段 SHALL 提供人类可读的响应消息
- **AND** `data` 字段 SHALL 包含实际的响应数据，类型为泛型 T
- **AND** `timestamp` 字段 SHALL 表示响应生成的 Unix 时间戳（毫秒）

#### Scenario: 泛型响应模型支持类型参数

- **WHEN** 使用 `ApiResponseDto<T>` 泛型类
- **THEN** TypeScript 编译器 SHALL 正确推断 `data` 字段的类型
- **AND** swagger.json SHALL 展开泛型类型参数，显示具体的 schema
- **AND** 不同端点使用相同泛型类但不同类型参数时，SHALL 生成不同的 schema

#### Scenario: 分页响应使用标准模型

- **WHEN** API 端点返回分页数据
- **THEN** 响应 SHALL 使用 `PaginatedResponseDto<T>` 模型
- **AND** 模型 SHALL 包含字段：`items: T[]`, `total: number`, `page: number`, `pageSize: number`, `totalPages: number`
- **AND** `items` 的元素类型 T SHALL 完整定义

### Requirement: 请求参数完整文档化

系统 SHALL 为所有 API 请求参数提供完整的文档，包括查询参数、路径参数和请求体。

#### Scenario: 查询参数包含描述和类型

- **WHEN** API 端点接受查询参数
- **THEN** 每个查询参数 SHALL 使用 `@ApiQuery` 装饰器定义
- **AND** `@ApiQuery` SHALL 包含：`name`, `description`, `required`, `type`
- **AND** 枚举类型的查询参数 SHALL 包含 `enum` 定义
- **AND** 数值类型的查询参数 SHALL 包含范围限制（`minimum`, `maximum`）

#### Scenario: 路径参数包含描述

- **WHEN** API 端点包含路径参数（如 `:id`）
- **THEN** 每个路径参数 SHALL 使用 `@ApiParam` 装饰器定义
- **AND** `@ApiParam` SHALL 包含：`name`, `description`, `type`
- **AND** UUID 类型的路径参数 SHALL 声明 `type: 'string'` 和 `format: 'uuid'`

#### Scenario: 请求体包含完整的 DTO 定义

- **WHEN** API 端点接受请求体
- **THEN** 请求体 SHALL 使用 DTO 类定义，而非内联对象
- **AND** DTO 类的所有字段 SHALL 使用 `@ApiProperty` 或 `@ApiPropertyOptional` 装饰器
- **AND** 每个字段 SHALL 包含：`description`, `example`, `type`
- **AND** 必填字段 SHALL 使用 `@ApiProperty`，可选字段 SHALL 使用 `@ApiPropertyOptional`

### Requirement: 实体和 DTO 的属性文档化

系统 SHALL 为所有实体和 DTO 的属性提供完整的 OpenAPI 文档。

#### Scenario: 实体字段包含描述和示例

- **WHEN** 实体类作为 API 响应的一部分
- **THEN** 实体的所有暴露字段 SHALL 使用 `@ApiProperty` 装饰器
- **AND** `@ApiProperty` SHALL 包含：`description`, `example`, `type`
- **AND** 枚举字段 SHALL 包含 `enum` 定义
- **AND** 敏感字段（如 password）SHALL 使用 `@Exclude()` 排除，不出现在 API 文档中

#### Scenario: DTO 字段包含验证规则

- **WHEN** DTO 类用于请求验证
- **THEN** DTO 字段 SHALL 同时包含 `@ApiProperty` 和 `class-validator` 装饰器
- **AND** `@ApiProperty` 的 `required`, `minimum`, `maximum` SHALL 与 `class-validator` 的验证规则一致
- **AND** 字符串字段的 `maxLength` SHALL 在 `@ApiProperty` 和 `@MaxLength()` 中一致
- **AND** 枚举字段的 `enum` SHALL 在 `@ApiProperty` 和 `@IsEnum()` 中一致

#### Scenario: 嵌套对象完整定义

- **WHEN** DTO 或实体包含嵌套对象
- **THEN** 嵌套对象 SHALL 使用独立的类定义，而非匿名对象
- **AND** 嵌套对象类的所有字段 SHALL 使用 `@ApiProperty` 装饰器
- **AND** swagger.json SHALL 包含嵌套对象的完整 schema 定义

### Requirement: 装饰器使用一致性

系统 SHALL 在所有控制器中遵循一致的装饰器使用模式。

#### Scenario: 控制器级别装饰器标准化

- **WHEN** 定义控制器类
- **THEN** 控制器类 SHALL 包含 `@ApiTags` 装饰器，定义模块名称
- **AND** 需要认证的控制器 SHALL 包含 `@ApiBearerAuth` 装饰器
- **AND** 控制器 SHALL 包含 `@Controller(path)` 装饰器
- **AND** 装饰器顺序 SHALL 为：`@ApiTags` → `@ApiBearerAuth` → `@Controller` → `@UseGuards`

#### Scenario: 方法级别装饰器标准化

- **WHEN** 定义 API 端点方法
- **THEN** 方法 SHALL 包含 `@ApiOperation` 装饰器，提供 `summary` 和可选的 `description`
- **AND** 方法 SHALL 包含至少一个响应装饰器（`@ApiOkResponse` 或 `@ApiCreatedResponse`）
- **AND** 方法 SHALL 包含常见错误响应装饰器（`@ApiBadRequestResponse`, `@ApiUnauthorizedResponse` 等）
- **AND** 装饰器顺序 SHALL 为：HTTP 方法 → `@HttpCode` → 权限 → `@ApiOperation` → 响应装饰器

#### Scenario: 参数装饰器完整性

- **WHEN** API 端点接受参数
- **THEN** 路径参数 SHALL 使用 `@Param()` 和 `@ApiParam()` 装饰器
- **AND** 查询参数 SHALL 使用 `@Query()` 和相应的 DTO 类（DTO 类字段包含 `@ApiProperty`）
- **AND** 请求体 SHALL 使用 `@Body()` 和 `@ApiBody()` 装饰器
- **AND** UUID 参数 SHALL 使用 `ParseUUIDPipe` 进行验证

## ADDED Requirements (Tooling)

### Requirement: OpenAPI 规范生成

系统 SHALL 生成符合 OpenAPI 3.0 规范的 API 文档。

#### Scenario: swagger.json 完整性验证

- **WHEN** 运行应用并访问 `/api-docs-json` 端点
- **THEN** 返回的 swagger.json SHALL 符合 OpenAPI 3.0 规范
- **AND** swagger.json SHALL 包含所有 API 端点的定义
- **AND** swagger.json SHALL 包含所有模型的 schema 定义在 `components.schemas`
- **AND** 所有端点的响应 SHALL 引用 `components.schemas` 中的模型，而非内联定义

#### Scenario: 前端代码生成支持

- **WHEN** 使用 openapi-typescript-codegen 生成前端客户端代码
- **THEN** 代码生成 SHALL 成功完成，无错误或警告
- **AND** 生成的 TypeScript 接口 SHALL 无 `any` 类型（除合理的泛型使用）
- **AND** 生成的 API 客户端方法参数类型 SHALL 与后端 DTO 一致
- **AND** 生成的 API 客户端方法返回类型 SHALL 正确反映响应模型

#### Scenario: Swagger UI 可用性

- **WHEN** 访问 `/api-docs` Swagger UI 界面
- **THEN** 所有 API 端点 SHALL 可见并可交互测试
- **AND** 每个端点 SHALL 显示完整的请求示例
- **AND** 每个端点 SHALL 显示所有可能的响应示例（成功和错误）
- **AND** 枚举字段 SHALL 在 UI 中显示为下拉列表
- **AND** 必填字段和可选字段 SHALL 明确标识

## ADDED Requirements (Documentation)

### Requirement: 装饰器使用指南

系统 SHALL 提供装饰器使用指南文档，帮助团队成员正确使用 OpenAPI 装饰器。

#### Scenario: 指南包含最佳实践

- **WHEN** 开发人员需要为新 API 添加装饰器
- **THEN** 指南文档 SHALL 包含装饰器使用模板
- **AND** 指南 SHALL 包含常见场景示例（CRUD, 分页, 批量操作）
- **AND** 指南 SHALL 包含装饰器顺序标准
- **AND** 指南 SHALL 包含常见错误和解决方案

#### Scenario: 指南包含验证步骤

- **WHEN** 开发人员完成装饰器添加
- **THEN** 指南 SHALL 提供验证清单
- **AND** 验证清单 SHALL 包含 swagger.json 检查步骤
- **AND** 验证清单 SHALL 包含 Swagger UI 测试步骤
- **AND** 验证清单 SHALL 包含前端代码生成测试步骤
