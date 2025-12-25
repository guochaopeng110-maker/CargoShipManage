# API 标准规范

## 概述

本规范定义了船舶轮机设备监测管理系统中所有API接口的响应格式标准，确保前后端交互的一致性和可维护性。

## ADDED Requirements

### Requirement: 列表接口统一响应格式

所有返回列表数据的API接口MUST使用统一的响应格式，包含业务状态码、消息、数据和时间戳。

#### Scenario: 成功查询列表数据

- **WHEN** 客户端请求列表数据接口（如 `GET /api/auth/users`, `GET /api/equipment`, `GET /api/imports`）
- **AND** 请求参数有效
- **AND** 查询成功执行
- **THEN** 系统必须返回以下格式的响应：
  ```json
  {
    "code": 200,
    "message": "查询成功",
    "data": {
      "items": [...],
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    },
    "timestamp": 1734567890123
  }
  ```
- **AND** HTTP状态码为 200 OK
- **AND** `data.items` 必须是数组类型（可为空数组）
- **AND** `data.total` 必须是非负整数
- **AND** `data.page` 必须是正整数（从1开始）
- **AND** `data.pageSize` 必须是正整数（最小1，最大100）
- **AND** `data.totalPages` 必须是非负整数，计算公式为 `Math.ceil(total / pageSize)`
- **AND** `timestamp` 必须是Unix时间戳（毫秒）

#### Scenario: 查询空列表

- **WHEN** 客户端请求列表数据接口
- **AND** 查询条件匹配零条记录
- **THEN** 系统必须返回：
  ```json
  {
    "code": 200,
    "message": "查询成功",
    "data": {
      "items": [],
      "total": 0,
      "page": 1,
      "pageSize": 20,
      "totalPages": 0
    },
    "timestamp": 1734567890123
  }
  ```
- **AND** `data.items` 必须是空数组 `[]`
- **AND** `data.total` 必须为 0
- **AND** `data.totalPages` 必须为 0

#### Scenario: 使用默认分页参数

- **WHEN** 客户端请求列表数据接口
- **AND** 未提供 `page` 或 `pageSize` 参数
- **THEN** 系统必须使用默认值：
  - `page` = 1
  - `pageSize` = 20
- **AND** 返回第一页数据（最多20条记录）

#### Scenario: 请求超出范围的页码

- **WHEN** 客户端请求列表数据接口
- **AND** `page` 参数大于 `totalPages`（如 `page=10` 但 `totalPages=5`）
- **THEN** 系统必须返回：
  ```json
  {
    "code": 200,
    "message": "查询成功",
    "data": {
      "items": [],
      "total": 100,
      "page": 10,
      "pageSize": 20,
      "totalPages": 5
    },
    "timestamp": 1734567890123
  }
  ```
- **AND** `data.items` 必须是空数组
- **AND** `data.total` 和 `data.totalPages` 仍然反映实际数据量

### Requirement: 分页参数验证

列表接口MUST验证分页参数的有效性，拒绝无效的请求参数。

#### Scenario: 验证页码参数

- **WHEN** 客户端请求列表数据接口
- **AND** `page` 参数小于1（如 `page=0` 或 `page=-1`）
- **THEN** 系统必须返回 400 Bad Request
- **AND** 错误消息必须说明 "页码必须大于或等于1"

#### Scenario: 验证页大小参数

- **WHEN** 客户端请求列表数据接口
- **AND** `pageSize` 参数小于1或大于100（如 `pageSize=0` 或 `pageSize=200`）
- **THEN** 系统必须返回 400 Bad Request
- **AND** 错误消息必须说明 "每页大小必须在1到100之间"

#### Scenario: 验证参数类型

- **WHEN** 客户端请求列表数据接口
- **AND** `page` 或 `pageSize` 参数不是整数（如 `page=abc` 或 `pageSize=1.5`）
- **THEN** 系统必须返回 400 Bad Request
- **AND** 错误消息必须说明参数类型错误

### Requirement: 响应消息规范

所有API响应的消息字段MUST使用统一的语言和格式。

#### Scenario: 成功操作的消息

- **WHEN** API操作成功完成（查询、创建、更新、删除）
- **THEN** `message` 字段必须使用中文
- **AND** 查询操作的消息必须为 "查询成功"
- **AND** 创建操作的消息必须为 "创建成功" 或具体的操作描述
- **AND** 更新操作的消息必须为 "更新成功" 或具体的操作描述
- **AND** 删除操作的消息必须为 "删除成功" 或具体的操作描述

#### Scenario: 错误操作的消息

- **WHEN** API操作失败
- **THEN** 系统必须返回标准错误响应格式：
  ```json
  {
    "statusCode": 400,
    "message": "错误描述",
    "error": "Bad Request",
    "timestamp": 1734567890123,
    "path": "/api/endpoint"
  }
  ```
- **AND** `message` 字段必须使用中文
- **AND** 错误描述必须清晰说明失败原因

### Requirement: 字段命名一致性

所有列表接口MUST使用一致的字段命名，避免语义相同但名称不同的字段。

#### Scenario: 分页字段命名

- **WHEN** API返回分页数据
- **THEN** 每页大小字段必须命名为 `pageSize`（而非 `limit`, `perPage`, `size` 等）
- **AND** 当前页码字段必须命名为 `page`（而非 `pageNumber`, `currentPage` 等）
- **AND** 总页数字段必须命名为 `totalPages`（而非 `pageCount`, `pages` 等）
- **AND** 总记录数字段必须命名为 `total`（而非 `totalCount`, `count` 等）
- **AND** 数据数组字段必须命名为 `items`（而非 `data`, `list`, `records` 等）

#### Scenario: 响应包装字段命名

- **WHEN** API返回任何响应
- **THEN** 业务状态码字段必须命名为 `code`（而非 `status`, `statusCode` 等）
- **AND** 消息字段必须命名为 `message`（而非 `msg`, `text`, `description` 等）
- **AND** 业务数据字段必须命名为 `data`（而非 `result`, `body`, `payload` 等）
- **AND** 时间戳字段必须命名为 `timestamp`（而非 `time`, `ts`, `createdAt` 等）

### Requirement: TypeScript类型安全

后端MUST使用明确的TypeScript类型定义来确保响应格式的类型安全。

#### Scenario: 使用PaginatedResponseDto

- **WHEN** Service层方法返回分页数据
- **THEN** 返回类型必须符合以下接口：
  ```typescript
  interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }
  ```
- **AND** Controller层必须包装为：
  ```typescript
  {
    code: number;
    message: string;
    data: PaginatedResult<T>;
    timestamp: number;
  }
  ```

#### Scenario: Swagger文档注解

- **WHEN** Controller方法返回列表数据
- **THEN** 必须使用 `@ApiOkResponse` 装饰器
- **AND** 装饰器必须使用显式schema定义（而非泛型引用）
- **AND** schema中的 `items` 数组必须明确指定元素类型，使用 `$ref` 引用实体schema
- **AND** 示例格式：
  ```typescript
  @ApiOkResponse({
    description: '成功获取列表',
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
              items: { $ref: '#/components/schemas/EntityName' }
            },
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' }
          }
        },
        timestamp: { type: 'number' }
      }
    }
  })
  ```
- **AND** 生成的OpenAPI文档必须准确反映响应格式

### Requirement: 实体类Swagger装饰器完整性

所有在列表接口中返回的实体类MUST使用完整的Swagger装饰器，确保生成的swagger.json包含完整的类型定义，以便前端代码生成工具（如openapi-typescript-codegen）能够正确生成TypeScript类型。

#### Scenario: 实体类字段装饰器

- **WHEN** 实体类的字段在API响应中公开返回
- **THEN** 该字段必须使用 `@ApiProperty()` 或 `@ApiPropertyOptional()` 装饰器
- **AND** 装饰器必须包含以下信息：
  - `description`: 字段的中文描述
  - `example`: 示例值
  - `type`: 字段类型（对于复杂类型）
- **AND** 对于敏感字段（如 `password`, `refreshToken`），必须使用 `@Exclude()` 装饰器且不添加 `@ApiProperty`

#### Scenario: 枚举类型字段

- **WHEN** 实体类的字段是枚举类型
- **THEN** `@ApiProperty` 装饰器必须包含 `enum` 和 `enumName` 选项
- **AND** 示例格式：
  ```typescript
  @ApiProperty({
    description: '设备状态',
    enum: EquipmentStatus,
    enumName: 'EquipmentStatus',
    example: EquipmentStatus.NORMAL
  })
  status: EquipmentStatus;
  ```
- **AND** 生成的swagger.json必须包含完整的枚举定义和所有可选值

#### Scenario: 关联字段

- **WHEN** 实体类包含关联字段（如 `@ManyToOne`, `@OneToMany`）
- **AND** 该关联字段在API响应中返回
- **THEN** 必须使用函数形式的 `type` 选项避免循环依赖
- **AND** 示例格式：
  ```typescript
  @ApiProperty({
    description: '关联的设备',
    type: () => Equipment
  })
  @ManyToOne(() => Equipment)
  equipment: Equipment;
  ```

#### Scenario: 数组字段

- **WHEN** 实体类包含数组字段
- **THEN** `@ApiProperty` 装饰器必须指定 `type` 和 `isArray: true`
- **AND** 示例格式：
  ```typescript
  @ApiProperty({
    description: '用户角色列表',
    type: () => Role,
    isArray: true
  })
  @ManyToMany(() => Role)
  roles: Role[];
  ```

#### Scenario: swagger.json验证

- **WHEN** 修改实体类的Swagger装饰器后
- **THEN** 必须重新生成swagger.json文件
- **AND** 必须验证生成的schema包含所有公开字段
- **AND** 必须验证枚举类型完整导出
- **AND** 必须与前端协同验证openapi-typescript-codegen生成的类型定义正确
- **AND** 确保生成的 `items` 数组元素类型不是 `any` 或 `unknown`

### Requirement: 受影响接口清单

以下列表接口MUST符合统一响应格式标准。

#### Scenario: Auth模块用户列表

- **WHEN** 客户端请求 `GET /api/auth/users`
- **THEN** 响应必须符合统一格式
- **AND** 必须支持分页参数 `page` 和 `pageSize`
- **AND** 必须返回完整的分页信息（page, pageSize, total, totalPages）

#### Scenario: Equipment模块设备列表

- **WHEN** 客户端请求 `GET /api/equipment`
- **THEN** 响应必须符合统一格式
- **AND** 分页信息必须在 `data` 字段内（而非单独的 `pagination` 字段）
- **AND** 每页大小字段必须命名为 `pageSize`（而非 `limit`）

#### Scenario: Import模块导入记录列表

- **WHEN** 客户端请求 `GET /api/imports`
- **THEN** 响应必须符合统一格式
- **AND** 必须包含完整的分页信息（page, pageSize, total, totalPages）
- **AND** 必须使用统一响应包装（code, message, data, timestamp）

#### Scenario: Monitoring模块监测数据列表

- **WHEN** 客户端请求 `GET /api/monitoring/data`
- **THEN** 响应必须符合统一格式
- **AND** `message` 字段必须使用中文 "查询成功"（而非英文 "success"）

#### Scenario: Report模块健康报告列表

- **WHEN** 客户端请求 `GET /api/reports/health`
- **THEN** 响应必须符合统一格式
- **AND** 必须包含 `totalPages` 字段

#### Scenario: Alarm模块阈值列表和告警列表

- **WHEN** 客户端请求 `GET /api/thresholds` 或 `GET /api/alarms`
- **THEN** 响应必须符合统一格式（已符合，无需修改）
- **AND** 作为标准参考示例

## 实施说明

### 优先级划分

1. **P0（高优先级）**: Auth模块、Import模块 - 缺少统一包装和分页支持
2. **P1（中优先级）**: Equipment模块、Monitoring模块 - 格式不一致
3. **P2（低优先级）**: Report模块 - 缺少个别字段

### 破坏性变更说明

以下接口的响应格式变更为破坏性变更，前端必须同步更新：

1. `GET /api/auth/users` - 从 `User[]` 改为完整分页格式
2. `GET /api/imports` - 从 `{data, total}` 改为完整分页格式
3. `GET /api/equipment` - 从分离的 `pagination` 改为嵌套的 `data`

### 向后兼容的变更

以下接口的变更为向后兼容或影响较小：

1. `GET /api/monitoring/data` - 仅修改 `message` 字段内容
2. `GET /api/reports/health` - 仅添加 `totalPages` 字段

### 测试要求

每个修改的接口必须通过以下测试：

1. **单元测试**: Service层分页逻辑正确性（必须通过）
2. **手动测试**: 通过Swagger UI或Postman验证实际响应格式
3. **边界测试**: 空列表、单页、多页、超出范围的页码
4. **Swagger验证**: 生成的swagger.json与实际响应一致，前端代码生成工具能正确生成类型定义

**注意**: 本次变更不要求E2E测试，仅需确保单元测试通过。

### 文档更新要求

1. 更新 `CLAUDE.md` 中的"API Response Structure"章节
2. 确保Swagger文档反映新的响应格式，所有实体类使用完整的 `@ApiProperty` 装饰器
3. 提供前端迁移指南，包含代码示例和最新的swagger.json文件
4. 更新分析报告，记录修复完成状态
5. 创建Swagger最佳实践文档，说明实体装饰器、枚举类型、关联字段的正确标注方法

## 参考资料

- 详细分析报告: `docs/analysis/lists-response/response-format-analysis.md`
- 现有DTO定义: `src/common/dto/api-response.dto.ts`
- 项目规范: `CLAUDE.md`
