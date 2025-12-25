# 变更: 完善 OpenAPI 装饰器以支持高质量前端代码生成

## 为什么 (Why)

当前后端 API 的 OpenAPI 装饰器不完整，导致 `openapi-typescript-codegen` 生成的前端客户端代码缺少类型定义、参数验证不足，前端开发人员需要手动补充类型，降低了开发效率。通过系统性地完善 OpenAPI 装饰器，可以实现完整的 API 规范生成，让前端自动代码生成工具能够产出高质量、类型安全的客户端代码。

**核心问题:**
1. **响应装饰器不完整** → 前端无法获得准确的响应类型定义
2. **参数装饰器缺失** → API 调用参数验证不足，缺少智能提示
3. **响应模型未定义** → 前端需要手动定义响应接口，容易出错
4. **错误处理装饰器缺失** → 前端错误处理逻辑困难，缺乏标准化

## 变更内容 (What Changes)

本变更将分三个阶段系统性地完善 OpenAPI 装饰器：

### Phase 1: 核心控制器装饰器完善
- 优先修复 `AlarmController` 和 `MonitoringController`（已有部分装饰器）
- 为所有 API 端点添加完整的响应装饰器：
  - `@ApiOkResponse` - 200 成功响应
  - `@ApiCreatedResponse` - 201 创建成功响应
  - `@ApiNotFoundResponse` - 404 资源不存在
  - `@ApiBadRequestResponse` - 400 参数验证失败
  - `@ApiUnauthorizedResponse` - 401 未授权
  - `@ApiForbiddenResponse` - 403 权限不足
  - `@ApiInternalServerErrorResponse` - 500 服务器错误
- 完善参数装饰器：
  - `@ApiQuery` - 查询参数描述
  - `@ApiParam` - 路径参数描述
  - `@ApiBody` - 请求体描述

### Phase 2: 通用响应模型标准化
- 创建 `src/common/dto/api-response.dto.ts`，定义：
  - `ApiResponseDto<T>` - 通用 API 响应模型（code, message, data, timestamp）
  - `PaginatedResponseDto<T>` - 分页响应模型（items, total, page, pageSize, totalPages）
- 创建专门领域响应模型：
  - `LoginResponseDto` - 登录响应（accessToken, refreshToken, user）
  - `DataStatisticsResponseDto` - 数据统计响应（metricType, count, maxValue, minValue, avgValue）
  - `BatchOperationResultDto` - 批量操作结果（totalCount, successCount, failedCount, errors）
- 在所有控制器中使用这些标准响应模型

### Phase 3: 全局装饰器标准化
- 统一所有控制器的装饰器模式（参考 `AuthController` 的完善实现）
- 完善实体层 `@ApiProperty` 装饰器，为所有实体字段添加描述和示例
- 创建装饰器使用指南文档 `docs/openapi-decorator-guide.md`
- 验证 `swagger.json` 生成的完整性

## 影响范围 (Impact)

**受影响的模块:**
- `src/modules/alarm/alarm.controller.ts` - 告警管理控制器
- `src/modules/monitoring/monitoring.controller.ts` - 监测数据控制器
- `src/modules/equipment/equipment.controller.ts` - 设备管理控制器
- `src/modules/report/report.controller.ts` - 健康报告控制器
- `src/modules/import/import.controller.ts` - 数据导入控制器
- `src/modules/query/query.controller.ts` - 查询导出控制器
- 所有 DTO 文件 - 添加 `@ApiProperty` 装饰器
- 所有实体文件 - 完善 `@ApiProperty` 装饰器

**新增文件:**
- `src/common/dto/api-response.dto.ts` - 通用响应模型
- `src/common/dto/index.ts` - Barrel 导出
- `docs/openapi-decorator-guide.md` - 装饰器使用指南

**直接受益:**
- 前端开发人员：自动获得完整的 TypeScript 类型定义
- API 文档：Swagger UI 显示完整的请求/响应示例
- 代码质量：减少 `any` 类型使用，提高类型安全

**间接受益:**
- 开发效率：前端无需手动定义接口，减少重复劳动
- 维护性：API 契约清晰，前后端协作更顺畅
- 测试：类型安全的客户端代码减少运行时错误

**技术债务减少:**
- 消除前端代码中的 `any` 类型
- 统一错误响应格式
- 规范化 API 响应结构

## 成功标准 (Success Criteria)

1. ✅ `swagger.json` 包含所有 API 端点的完整响应类型定义
2. ✅ `openapi-typescript-codegen` 生成的前端客户端代码无 `any` 类型（除合理的泛型使用）
3. ✅ Swagger UI 显示所有端点的请求/响应示例
4. ✅ 所有错误响应都有明确的类型定义和 HTTP 状态码
5. ✅ 分页、批量操作等通用模式有标准化的响应模型
6. ✅ 所有 DTO 和实体字段都有 `@ApiProperty` 装饰器描述
7. ✅ 装饰器使用指南文档完整，可供团队参考

## 非目标 (Non-Goals)

- 不修改现有 API 的业务逻辑
- 不改变现有的响应数据结构（仅添加类型定义）
- 不引入新的 HTTP 状态码（使用现有的 NestJS 默认行为）
- 不修改前端代码生成工具的配置（仅改进输入质量）
