## 上下文 (Context)

本变更旨在系统性地完善后端 API 的 OpenAPI 装饰器，以支持前端自动代码生成工具 `openapi-typescript-codegen` 生成高质量的 TypeScript 客户端代码。

**当前状态分析:**
- `AuthController` 已有完善的装饰器实现（可作为参考模板）
- `MonitoringController` 有部分装饰器但使用内联 schema 定义
- `AlarmController` 缺少大部分响应装饰器
- 其他控制器（Equipment, Report, Import, Query）装饰器完整度不一
- 缺少统一的响应模型定义，导致响应格式不一致
- 实体和 DTO 的 `@ApiProperty` 装饰器不完整

**技术约束:**
- 必须保持现有 API 响应格式：`{ code, message, data, timestamp }`
- 必须遵循 NestJS 默认 HTTP 状态码行为（POST → 201, 其他 → 200）
- 不能修改现有的业务逻辑和 Service 层代码
- 必须支持泛型响应模型以提高复用性

## 目标 / 非目标 (Goals / Non-Goals)

### 目标
1. **完整的 OpenAPI 规范生成**：所有 API 端点都有完整的请求/响应类型定义
2. **类型安全的前端代码**：`openapi-typescript-codegen` 生成的代码无 `any` 类型
3. **标准化响应模型**：统一的响应格式和错误处理
4. **完善的 API 文档**：Swagger UI 显示完整的请求/响应示例
5. **可维护性**：清晰的装饰器使用指南，便于团队遵循

### 非目标
1. **不修改业务逻辑**：仅添加类型定义，不改变功能实现
2. **不改变响应格式**：保持现有的 `{ code, message, data, timestamp }` 结构
3. **不引入新的状态码**：使用 NestJS 默认行为
4. **不修改前端工具配置**：仅改进 OpenAPI 规范输入质量

## 决策 (Decisions)

### 决策 1: 使用泛型响应模型而非控制器级别的内联定义

**选择:** 创建 `ApiResponseDto<T>` 和 `PaginatedResponseDto<T>` 泛型类

**理由:**
- **可复用性**: 所有控制器都遵循相同的响应格式，泛型类避免重复定义
- **类型安全**: TypeScript 泛型确保 `data` 字段的类型正确
- **维护性**: 修改响应格式只需更新一处
- **Swagger 支持**: NestJS 的 `@nestjs/swagger` 完全支持泛型类的 schema 生成

**替代方案及理由:**
- ❌ **内联 schema 定义**: MonitoringController 当前的做法，难以维护，容易出错
- ❌ **为每个端点定义专用响应 DTO**: 代码重复，维护成本高
- ❌ **使用 swagger schema 对象**: 失去 TypeScript 类型检查优势

**示例实现:**
```typescript
export class ApiResponseDto<T> {
  @ApiProperty({ example: 200, description: '业务状态码' })
  code: number;

  @ApiProperty({ example: '操作成功', description: '响应消息' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiProperty({ example: 1700000000000, description: '时间戳' })
  timestamp: number;
}
```

### 决策 2: 实体使用 `@ApiProperty` 而非单独的响应 DTO

**选择:** 直接在实体类（ThresholdConfig, AlarmRecord 等）上添加 `@ApiProperty` 装饰器

**理由:**
- **单一数据源**: 实体既是数据库模型又是 API 响应模型，避免重复定义
- **自动同步**: 数据库字段变更自动反映到 API 文档
- **简化代码**: 无需为每个实体创建对应的响应 DTO
- **TypeORM 兼容**: `@ApiProperty` 与 TypeORM 装饰器可以共存

**替代方案及理由:**
- ❌ **创建专用响应 DTO**: 增加维护负担，容易导致实体和响应 DTO 不一致
- ⚠️ **使用类转换器隐藏敏感字段**: 对于 `User` 实体，已使用 `@Exclude()` 隐藏密码字段，此方案保持不变

**注意事项:**
- 对于包含敏感信息的实体（如 User），确保使用 `@Exclude()` 隐藏敏感字段
- 使用 `ClassSerializerInterceptor` 自动应用转换规则

### 决策 3: 错误响应使用统一的 `ErrorResponseDto`

**选择:** 创建 `ErrorResponseDto` 类定义标准错误响应格式

**理由:**
- **一致性**: 所有错误响应遵循相同的格式
- **可预测性**: 前端可以统一处理错误
- **NestJS 兼容**: 匹配 NestJS `HttpExceptionFilter` 的默认格式

**格式定义:**
```typescript
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Validation failed' })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request', required: false })
  error?: string;

  @ApiProperty({ example: 1700000000000 })
  timestamp: number;

  @ApiProperty({ example: '/api/thresholds', required: false })
  path?: string;
}
```

### 决策 4: 装饰器顺序标准化

**选择:** 统一装饰器顺序为：类级别 → 方法级别 → 参数级别

**标准顺序:**
```typescript
// 类级别
@ApiTags('模块名称')
@ApiBearerAuth()
@Controller('path')
@UseGuards(...)

// 方法级别
@Post()
@HttpCode(HttpStatus.OK)  // 可选
@Permissions('resource:action')
@Roles('role1', 'role2')
@ApiOperation({ summary: '...', description: '...' })
@ApiCreatedResponse({ type: ... })
@ApiBadRequestResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
async methodName(
  @Body() dto: CreateDto,
  @Param('id', ParseUUIDPipe) id: string,
  @Query() queryDto: QueryDto,
  @Req() req: Request,
) {}
```

**理由:**
- **可读性**: 从外到内的逻辑顺序（路由 → 权限 → 文档 → 实现）
- **一致性**: 所有控制器遵循相同的模式
- **参考标准**: 遵循 NestJS 官方文档的推荐顺序

## 风险与权衡 (Risks / Trade-offs)

### 风险 1: 泛型类型在 Swagger UI 中的显示

**风险:** Swagger UI 可能无法正确显示泛型类型 `ApiResponseDto<ThresholdConfig>` 的实际类型

**缓解措施:**
1. 使用 `@nestjs/swagger` 的 `ApiOkResponse({ type: ThresholdConfig })` 配合泛型包装
2. 验证 swagger.json 输出确保 schema 正确生成
3. 如果 Swagger UI 显示有问题，考虑使用 `getSchemaPath()` 辅助函数

**验证方法:**
- 运行项目并访问 `/api-docs`
- 检查响应示例是否包含完整的 `data` 字段类型
- 导出 swagger.json 并检查 `components.schemas` 部分

### 风险 2: 实体字段变更导致 API 文档不一致

**风险:** 实体添加了数据库字段但未添加 `@ApiProperty`，导致 API 文档缺失字段

**缓解措施:**
1. 在 PR Review 中检查实体变更是否包含 `@ApiProperty`
2. 考虑使用 `@nestjs/swagger` 的 CLI 插件自动生成装饰器（未来优化）
3. 编写文档说明实体字段必须包含 `@ApiProperty`

### 权衡 1: 装饰器代码量 vs 类型安全

**权衡:** 添加完整的装饰器会显著增加控制器代码量

**决策:** 接受代码量增加，优先保证类型安全和文档完整性

**理由:**
- 代码量增加是一次性成本
- 类型安全和文档完整性是长期收益
- 可读性和可维护性的提升超过代码量增加的负面影响

### 权衡 2: 响应模型的灵活性 vs 标准化

**权衡:** 统一的响应模型可能无法满足所有场景的特殊需求

**决策:** 提供标准响应模型，同时允许特殊场景定义专用模型

**方案:**
- 默认使用 `ApiResponseDto<T>` 和 `PaginatedResponseDto<T>`
- 特殊场景（如登录、统计）定义专用模型（`LoginResponseDto`, `DataStatisticsResponseDto`）
- 专用模型仍遵循命名和结构约定

## 迁移计划 (Migration Plan)

### 阶段 1: 创建基础设施（Phase 2）
1. 创建通用响应模型（`ApiResponseDto`, `PaginatedResponseDto`, `ErrorResponseDto`）
2. 创建专门领域响应模型（`LoginResponseDto`, `DataStatisticsResponseDto`, `BatchOperationResultDto`）
3. 验证模型的 swagger.json 输出

**验证标准:**
- 所有响应模型在 swagger.json 的 `components.schemas` 中正确定义
- 泛型类型参数正确展开

### 阶段 2: 逐步应用到控制器（Phase 1）
1. 优先完善 `AlarmController`（缺失最多）
2. 完善 `MonitoringController`（替换内联 schema）
3. 完善其他控制器（Equipment, Report, Import, Query）

**回滚策略:**
- 每个控制器作为独立的 commit，可单独回滚
- 保留原有代码注释，便于对比

### 阶段 3: 完善实体和 DTO（Phase 3）
1. 批量添加实体的 `@ApiProperty` 装饰器
2. 批量完善 DTO 的 `@ApiProperty` 装饰器
3. 验证所有字段都有描述和示例

**验证标准:**
- 运行 `npm run start:dev` 无 TypeScript 编译错误
- swagger.json 包含所有实体和 DTO 的完整定义

### 阶段 4: 验证和文档
1. 导出 swagger.json 并验证完整性
2. 使用 openapi-typescript-codegen 生成前端代码
3. 编写装饰器使用指南文档

**成功标准:**
- openapi-typescript-codegen 运行无错误
- 生成的 TypeScript 代码无 `any` 类型（除合理泛型）
- Swagger UI 可以成功测试所有 API

## 开放问题 (Open Questions)

### Q1: 是否需要为所有枚举创建单独的文档说明？

**问题:** 枚举类型（如 `MetricType`, `AlarmSeverity`）是否需要在 Swagger UI 中显示中文说明？

**选项:**
- A: 在 `@ApiProperty` 的 `description` 中添加枚举值说明（如 "low=低, medium=中"）
- B: 保持现有的英文枚举值，依赖前端做国际化
- C: 创建枚举说明文档，在 API 文档首页引用

**建议:** 选项 A，在装饰器中添加枚举值说明，提高 API 文档的可读性

### Q2: 是否需要为分页查询创建统一的 QueryDto 基类？

**问题:** 所有分页查询都有 `page`, `pageSize` 参数，是否应创建 `PaginationQueryDto` 基类？

**当前状态:** 每个 QueryDto 都重复定义分页参数

**建议:** 创建 `PaginationQueryDto` 基类，所有分页查询 DTO 继承此类，减少重复代码

**示例:**
```typescript
export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
```

### Q3: 是否需要为 WebSocket 事件生成 OpenAPI 文档？

**问题:** 当前 WebSocket 事件（`alarm:push`, `monitoring:new-data`）没有 OpenAPI 文档

**影响:** 前端无法通过 openapi-typescript-codegen 生成 WebSocket 事件类型

**选项:**
- A: 使用 AsyncAPI 规范单独生成 WebSocket 文档
- B: 在 OpenAPI 文档中添加自定义扩展描述 WebSocket 事件
- C: 手动维护 WebSocket 事件的 TypeScript 类型定义

**建议:** 选项 C，本次变更不涉及 WebSocket 文档化，保持现有的手动维护方式。未来可考虑引入 AsyncAPI。
