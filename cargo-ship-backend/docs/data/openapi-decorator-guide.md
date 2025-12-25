# OpenAPI 装饰器使用指南

本指南提供 OpenAPI/Swagger 装饰器的最佳实践，确保生成完整、准确的 API 文档，支持前端自动代码生成。

## 目录

- [快速开始](#快速开始)
- [装饰器概览](#装饰器概览)
- [控制器装饰器](#控制器装饰器)
- [响应装饰器](#响应装饰器)
- [参数装饰器](#参数装饰器)
- [DTO 装饰器](#dto-装饰器)
- [实体装饰器](#实体装饰器)
- [通用响应模型](#通用响应模型)
- [常见错误和解决方案](#常见错误和解决方案)
- [最佳实践](#最佳实践)

---

## 快速开始

### 基本控制器模板

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from '../../common/guards';
import { Permissions, Roles } from '../../common/decorators';
import { ErrorResponseDto } from '../../common/dto';
import { MyEntity } from '../../database/entities/my-entity.entity';
import { CreateDto, UpdateDto, QueryDto } from './dto';

@ApiTags('模块名称')
@ApiBearerAuth()
@Controller('api/resource')
@UseGuards(JwtAuthGuard, PermissionsGuard, RolesGuard)
export class MyController {
  constructor(private readonly myService: MyService) {}

  @Post()
  @Permissions('resource:create')
  @Roles('administrator', 'operator')
  @ApiOperation({
    summary: '创建资源',
    description: '创建新的资源记录',
  })
  @ApiCreatedResponse({
    description: '创建成功',
    type: MyEntity,
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
    description: '权限不足',
    type: ErrorResponseDto,
  })
  async create(@Body() createDto: CreateDto) {
    const entity = await this.myService.create(createDto);
    return {
      code: 200,
      message: '创建成功',
      data: entity,
      timestamp: Date.now(),
    };
  }
}
```

---

## 装饰器概览

### 类级别装饰器

| 装饰器 | 用途 | 必需 |
|--------|------|------|
| `@ApiTags('标签名')` | 分组 API 端点 | ✅ |
| `@ApiBearerAuth()` | 标识需要 JWT 认证 | ✅ (需认证的控制器) |
| `@Controller('path')` | 定义路由前缀 | ✅ |

### 方法级别装饰器

| 装饰器 | 用途 | 必需 |
|--------|------|------|
| `@ApiOperation()` | 描述端点功能 | ✅ |
| `@ApiOkResponse()` | 200 成功响应 | ✅ (GET/PUT/DELETE) |
| `@ApiCreatedResponse()` | 201 创建成功 | ✅ (POST) |
| `@ApiBadRequestResponse()` | 400 参数错误 | ✅ |
| `@ApiNotFoundResponse()` | 404 资源不存在 | ✅ (详情/更新/删除) |
| `@ApiUnauthorizedResponse()` | 401 未授权 | ✅ |
| `@ApiForbiddenResponse()` | 403 权限不足 | ✅ |
| `@ApiParam()` | 路径参数描述 | ✅ (有路径参数时) |

---

## 控制器装饰器

### @ApiTags - API 分组

```typescript
@ApiTags('告警管理')
@Controller('api/alarms')
export class AlarmController {}
```

**作用**: 在 Swagger UI 中将相关端点分组显示

**最佳实践**:
- 使用清晰的中文名称
- 每个控制器只使用一个标签
- 标签名应与业务模块对应

---

### @ApiBearerAuth - JWT 认证

```typescript
@ApiBearerAuth()
@Controller('api/alarms')
export class AlarmController {}
```

**作用**: 标识控制器需要 JWT 令牌认证

**最佳实践**:
- 所有需要认证的控制器都应添加此装饰器
- 公开端点（如登录）的控制器不需要此装饰器

---

## 响应装饰器

### @ApiOkResponse - 成功响应 (200)

```typescript
@Get(':id')
@ApiOkResponse({
  description: '查询成功',
  type: ThresholdConfig,
})
async findOne(@Param('id') id: string) {
  const entity = await this.service.findOne(id);
  return {
    code: 200,
    message: '查询成功',
    data: entity,
    timestamp: Date.now(),
  };
}
```

**使用场景**: GET、PUT、DELETE 操作

**参数说明**:
- `description`: 响应描述（中文）
- `type`: 响应数据的类型（实体类或 DTO 类）

---

### @ApiCreatedResponse - 创建成功 (201)

```typescript
@Post()
@ApiCreatedResponse({
  description: '创建成功',
  type: ThresholdConfig,
})
async create(@Body() createDto: CreateDto) {
  // ...
}
```

**使用场景**: POST 操作

**注意**: NestJS 默认 POST 返回 201，无需额外 `@HttpCode` 装饰器

---

### @ApiBadRequestResponse - 参数错误 (400)

```typescript
@Post()
@ApiBadRequestResponse({
  description: '参数验证失败或设备ID格式错误',
  type: ErrorResponseDto,
})
async create(@Body() createDto: CreateDto) {
  // ...
}
```

**使用场景**: 所有端点（可能有参数验证）

**固定类型**: 始终使用 `ErrorResponseDto`

---

### @ApiNotFoundResponse - 资源不存在 (404)

```typescript
@Get(':id')
@ApiNotFoundResponse({
  description: '阈值配置不存在',
  type: ErrorResponseDto,
})
async findOne(@Param('id') id: string) {
  // ...
}
```

**使用场景**: 详情查询、更新、删除操作

**固定类型**: 始终使用 `ErrorResponseDto`

---

### @ApiUnauthorizedResponse - 未授权 (401)

```typescript
@Get()
@ApiUnauthorizedResponse({
  description: '未授权，需要登录',
  type: ErrorResponseDto,
})
async findAll() {
  // ...
}
```

**使用场景**: 所有需要认证的端点

**固定类型**: 始终使用 `ErrorResponseDto`

---

### @ApiForbiddenResponse - 权限不足 (403)

```typescript
@Post()
@Permissions('alert:create')
@ApiForbiddenResponse({
  description: '权限不足，需要 alert:create 权限',
  type: ErrorResponseDto,
})
async create(@Body() createDto: CreateDto) {
  // ...
}
```

**使用场景**: 所有有权限控制的端点

**固定类型**: 始终使用 `ErrorResponseDto`

---

## 参数装饰器

### @ApiParam - 路径参数

```typescript
@Get(':id')
@ApiParam({
  name: 'id',
  description: '阈值配置ID（UUID格式）',
  type: String,
  format: 'uuid',
  example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
})
async findOne(@Param('id', ParseUUIDPipe) id: string) {
  // ...
}
```

**必需参数**:
- `name`: 参数名称（与路由参数一致）
- `description`: 参数描述（中文）
- `type`: 参数类型

**可选参数**:
- `format`: 格式约束（如 'uuid'）
- `example`: 示例值

---

### @ApiQuery - 查询参数

```typescript
@Get('statistics')
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
async getStatistics(
  @Query('equipmentId') equipmentId: string,
  @Query('metricType') metricType: MetricType,
) {
  // ...
}
```

**使用场景**: 
- 单个查询参数较少（1-3个）时使用
- 参数较多时建议使用 QueryDto 类

**枚举参数**: 使用 `enum` 属性定义枚举类型

---

### @ApiBody - 请求体

```typescript
@Post()
@ApiBody({
  description: '创建阈值配置的请求体',
  type: CreateThresholdDto,
})
async create(@Body() createDto: CreateThresholdDto) {
  // ...
}
```

**注意**: 通常不需要显式添加，`@Body()` 装饰器会自动识别 DTO 类

---

## DTO 装饰器

### @ApiProperty - 必填字段

```typescript
export class CreateDto {
  @ApiProperty({
    description: '设备ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @IsNotEmpty()
  @IsUUID('4')
  equipmentId: string;

  @ApiProperty({
    description: '指标类型',
    enum: MetricType,
    example: MetricType.TEMPERATURE,
  })
  @IsNotEmpty()
  @IsEnum(MetricType)
  metricType: MetricType;

  @ApiProperty({
    description: '上限值',
    example: 85.5,
    type: Number,
  })
  @IsNotEmpty()
  @IsNumber()
  upperLimit: number;
}
```

**必需参数**:
- `description`: 字段描述（中文）
- `example`: 示例值
- `type`: 字段类型（String, Number, Boolean 等）

**枚举字段**: 使用 `enum` 参数

---

### @ApiPropertyOptional - 可选字段

```typescript
export class CreateDto {
  @ApiPropertyOptional({
    description: '监测点名称',
    example: '总电压',
    maxLength: 100,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  monitoringPoint?: string;

  @ApiPropertyOptional({
    description: '下限值',
    example: 10.0,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  lowerLimit?: number;
}
```

**使用场景**: 可选字段（TypeScript 中标记为 `?`）

---

### 字段验证一致性

**重要**: `@ApiProperty` 的约束应与 `class-validator` 装饰器一致

```typescript
// ✅ 正确：约束一致
@ApiProperty({
  description: '故障名称',
  maxLength: 200,
  type: String,
})
@IsString()
@MaxLength(200)
faultName: string;

// ❌ 错误：约束不一致
@ApiProperty({
  description: '故障名称',
  maxLength: 100,  // ← 与 @MaxLength 不一致
  type: String,
})
@IsString()
@MaxLength(200)
faultName: string;
```

---

## 实体装饰器

### 实体字段装饰器

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('threshold_configs')
export class ThresholdConfig {
  @ApiProperty({
    description: '阈值配置ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: '设备ID',
    example: 'SYS-BAT-001',
  })
  @Column({ name: 'equipment_id' })
  equipmentId: string;

  @ApiProperty({
    description: '上限值',
    example: 85.5,
    required: false,
  })
  @Column({ name: 'upper_limit', nullable: true })
  upperLimit: number;

  @ApiProperty({
    description: '严重程度',
    enum: AlarmSeverity,
    example: AlarmSeverity.HIGH,
  })
  @Column({ type: 'enum', enum: AlarmSeverity })
  severity: AlarmSeverity;
}
```

**最佳实践**:
- 所有暴露给 API 的字段都应添加 `@ApiProperty`
- 可选字段使用 `required: false`
- 枚举字段使用 `enum` 参数
- 提供真实的示例值

---

### 排除敏感字段

```typescript
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  @Column()
  username: string;

  @Exclude()  // ← 密码字段不会出现在 API 响应中
  @Column()
  password: string;

  @ApiProperty({
    description: '邮箱',
    example: 'admin@example.com',
  })
  @Column()
  email: string;
}
```

**注意**: 控制器需要使用 `ClassSerializerInterceptor` 才能生效

---

## 通用响应模型

### ApiResponseDto<T> - 标准响应

```typescript
import { ApiResponseDto } from '../../common/dto';

@Get(':id')
@ApiOkResponse({
  description: '查询成功',
  type: ThresholdConfig,
})
async findOne(@Param('id') id: string) {
  const entity = await this.service.findOne(id);
  return {
    code: 200,
    message: '查询成功',
    data: entity,  // ← 类型为 ThresholdConfig
    timestamp: Date.now(),
  };
}
```

**响应格式**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": { /* ThresholdConfig 对象 */ },
  "timestamp": 1700000000000
}
```

---

### PaginatedResponseDto<T> - 分页响应

```typescript
import { PaginatedResponseDto } from '../../common/dto';

@Get()
@ApiOkResponse({
  description: '查询成功，返回分页数据',
  type: PaginatedResponseDto,
})
async findAll(@Query() queryDto: QueryDto) {
  const result = await this.service.findAll(queryDto);
  return {
    code: 200,
    message: '查询成功',
    data: result,  // ← 类型为 PaginatedResponseDto<ThresholdConfig>
    timestamp: Date.now(),
  };
}
```

**响应格式**:
```json
{
  "code": 200,
  "message": "查询成功",
  "data": {
    "items": [ /* ThresholdConfig 数组 */ ],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "timestamp": 1700000000000
}
```

---

### ErrorResponseDto - 错误响应

```typescript
import { ErrorResponseDto } from '../../common/dto';

@Get(':id')
@ApiNotFoundResponse({
  description: '阈值配置不存在',
  type: ErrorResponseDto,
})
async findOne(@Param('id') id: string) {
  // ...
}
```

**错误响应格式**:
```json
{
  "statusCode": 404,
  "message": "阈值配置不存在",
  "error": "Not Found",
  "timestamp": 1700000000000,
  "path": "/api/thresholds/xxx"
}
```

---

## 常见错误和解决方案

### 错误 1: 响应类型为 `any`

**问题**: Swagger UI 显示响应类型为 `object`，前端生成的代码包含 `any` 类型

**原因**: 未指定响应类型

```typescript
// ❌ 错误
@Get()
@ApiOkResponse({
  description: '查询成功',
})
async findAll() {
  // ...
}
```

**解决方案**: 明确指定 `type`

```typescript
// ✅ 正确
@Get()
@ApiOkResponse({
  description: '查询成功',
  type: [ThresholdConfig],  // 数组类型
})
async findAll() {
  // ...
}
```

---

### 错误 2: 内联 schema 定义

**问题**: 使用内联对象定义响应，难以维护

```typescript
// ❌ 错误
@ApiResponse({
  status: 200,
  schema: {
    type: 'object',
    properties: {
      code: { type: 'number' },
      message: { type: 'string' },
      data: { type: 'object' },  // ← 类型不明确
    },
  },
})
```

**解决方案**: 使用 DTO 类或实体类

```typescript
// ✅ 正确
@ApiOkResponse({
  description: '查询成功',
  type: ThresholdConfig,
})
```

---

### 错误 3: 缺少错误响应装饰器

**问题**: 前端无法知道可能的错误类型

```typescript
// ❌ 错误
@Get(':id')
@ApiOkResponse({
  description: '查询成功',
  type: ThresholdConfig,
})
async findOne(@Param('id') id: string) {
  // ...
}
```

**解决方案**: 添加所有可能的错误响应

```typescript
// ✅ 正确
@Get(':id')
@ApiOkResponse({
  description: '查询成功',
  type: ThresholdConfig,
})
@ApiBadRequestResponse({
  description: 'ID格式错误',
  type: ErrorResponseDto,
})
@ApiNotFoundResponse({
  description: '阈值配置不存在',
  type: ErrorResponseDto,
})
@ApiUnauthorizedResponse({
  description: '未授权',
  type: ErrorResponseDto,
})
async findOne(@Param('id') id: string) {
  // ...
}
```

---

### 错误 4: DTO 字段缺少装饰器

**问题**: Swagger UI 不显示请求体字段描述

```typescript
// ❌ 错误
export class CreateDto {
  @IsNotEmpty()
  @IsUUID('4')
  equipmentId: string;
}
```

**解决方案**: 添加 `@ApiProperty` 装饰器

```typescript
// ✅ 正确
export class CreateDto {
  @ApiProperty({
    description: '设备ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID('4')
  equipmentId: string;
}
```

---

### 错误 5: 装饰器顺序错误

**问题**: 装饰器顺序混乱，可读性差

```typescript
// ❌ 错误
@Get(':id')
@Permissions('alert:read')
@ApiOkResponse({ type: ThresholdConfig })
@ApiOperation({ summary: '查询详情' })
@Roles('administrator', 'operator', 'viewer')
async findOne(@Param('id') id: string) {
  // ...
}
```

**解决方案**: 遵循标准顺序

```typescript
// ✅ 正确
@Get(':id')
@Permissions('alert:read')
@Roles('administrator', 'operator', 'viewer')
@ApiOperation({ summary: '查询详情' })
@ApiParam({ name: 'id', description: '阈值配置ID', type: String })
@ApiOkResponse({ description: '查询成功', type: ThresholdConfig })
@ApiBadRequestResponse({ description: 'ID格式错误', type: ErrorResponseDto })
@ApiNotFoundResponse({ description: '不存在', type: ErrorResponseDto })
async findOne(@Param('id', ParseUUIDPipe) id: string) {
  // ...
}
```

**标准顺序**:
1. HTTP 方法装饰器（@Get, @Post, 等）
2. 权限装饰器（@Permissions, @Roles）
3. @ApiOperation
4. @ApiParam（如有）
5. 成功响应装饰器（@ApiOkResponse, @ApiCreatedResponse）
6. 错误响应装饰器（@ApiBadRequest..., @ApiNotFound..., 等）

---

## 最佳实践

### 1. 使用标准响应模型

**推荐**: 使用项目中定义的通用响应模型

```typescript
import {
  ApiResponseDto,
  PaginatedResponseDto,
  ErrorResponseDto,
  DataStatisticsResponseDto,
  BatchOperationResultDto,
} from '../../common/dto';
```

**优势**:
- 响应格式统一
- 减少重复代码
- 类型安全

---

### 2. 一致的错误响应

**所有错误响应都应使用 `ErrorResponseDto`**

```typescript
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
```

---

### 3. 完整的参数描述

**为所有参数提供清晰的描述和示例**

```typescript
@ApiParam({
  name: 'id',
  description: '阈值配置ID（UUID格式）',
  type: String,
  format: 'uuid',
  example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
})
```

---

### 4. 枚举类型明确定义

**使用 `enum` 参数而非 `type: String`**

```typescript
@ApiProperty({
  description: '严重程度',
  enum: AlarmSeverity,  // ✅ 正确
  example: AlarmSeverity.HIGH,
})
severity: AlarmSeverity;

// ❌ 错误
@ApiProperty({
  description: '严重程度',
  type: String,  // 丢失枚举信息
})
severity: AlarmSeverity;
```

---

### 5. 描述使用中文

**所有面向用户的描述都应使用中文**

```typescript
@ApiOperation({
  summary: '创建阈值配置',  // ✅ 中文
  description: '创建新的告警阈值配置规则',
})
```

---

### 6. 验证 swagger.json 输出

**定期检查生成的 swagger.json**

```bash
# 启动应用
npm run start:dev

# 访问 Swagger UI
http://localhost:3000/api-docs

# 下载 swagger.json
http://localhost:3000/api-docs-json
```

**检查清单**:
- [ ] 所有端点都有响应定义
- [ ] 所有模型都有完整的字段定义
- [ ] 没有 `type: 'object'` 而缺少 schema 的情况
- [ ] 枚举类型正确显示
- [ ] 错误响应有明确的类型定义

---

### 7. 前端代码生成验证

**使用 openapi-typescript-codegen 验证**

```bash
# 安装工具
npm install -g @openapitools/openapi-generator-cli

# 生成前端代码
openapi-generator-cli generate \
  -i http://localhost:3000/api-docs-json \
  -g typescript-axios \
  -o ./generated-client

# 检查生成的代码
- 是否有 any 类型（除合理泛型）
- API 方法参数类型是否正确
- API 方法返回类型是否正确
```

---

## 总结

### 快速检查清单

**控制器级别**:
- [ ] 使用 `@ApiTags` 分组
- [ ] 需要认证的添加 `@ApiBearerAuth`

**方法级别**:
- [ ] 所有端点都有 `@ApiOperation`
- [ ] 所有端点都有成功响应装饰器（@ApiOkResponse 或 @ApiCreatedResponse）
- [ ] 所有端点都有常见错误响应装饰器（400, 401, 403）
- [ ] 详情/更新/删除端点有 `@ApiNotFoundResponse`
- [ ] 路径参数使用 `@ApiParam` 描述

**DTO/实体级别**:
- [ ] 所有字段都有 `@ApiProperty` 或 `@ApiPropertyOptional`
- [ ] 所有字段都有 `description` 和 `example`
- [ ] 枚举字段使用 `enum` 参数
- [ ] 验证装饰器与 API 装饰器一致

**响应模型**:
- [ ] 使用通用响应模型（ApiResponseDto, PaginatedResponseDto）
- [ ] 错误响应统一使用 ErrorResponseDto
- [ ] 避免内联 schema 定义

---

## 参考资源

- [NestJS OpenAPI 官方文档](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI 3.0 规范](https://swagger.io/specification/)
- [通用响应模型源码](../src/common/dto/api-response.dto.ts)
- [AlarmController 完整示例](../src/modules/alarm/alarm.controller.ts)
- [MonitoringController 完整示例](../src/modules/monitoring/monitoring.controller.ts)
