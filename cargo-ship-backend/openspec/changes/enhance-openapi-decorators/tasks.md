## 1. Phase 1: 核心控制器装饰器完善

### 1.1 完善 AlarmController 装饰器 ✅
- [x] 1.1.1 为阈值配置 CRUD 端点添加响应装饰器
  - [x] POST /api/thresholds - 添加 @ApiCreatedResponse, @ApiBadRequestResponse, @ApiNotFoundResponse
  - [x] GET /api/thresholds - 添加 @ApiOkResponse (分页响应), @ApiBadRequestResponse
  - [x] GET /api/thresholds/:id - 添加 @ApiOkResponse, @ApiNotFoundResponse
  - [x] PUT /api/thresholds/:id - 添加 @ApiOkResponse, @ApiNotFoundResponse, @ApiBadRequestResponse
  - [x] DELETE /api/thresholds/:id - 添加 @ApiOkResponse, @ApiNotFoundResponse
- [x] 1.1.2 为告警记录端点添加响应装饰器
  - [x] GET /api/alarms - 添加 @ApiOkResponse (分页响应), @ApiBadRequestResponse
  - [x] GET /api/alarms/:id - 添加 @ApiOkResponse, @ApiNotFoundResponse
  - [x] PUT /api/alarms/:id - 添加 @ApiOkResponse, @ApiNotFoundResponse, @ApiBadRequestResponse
- [x] 1.1.3 为所有端点添加 @ApiParam 装饰器（路径参数 :id）
- [x] 1.1.4 为所有端点添加 @ApiUnauthorizedResponse, @ApiForbiddenResponse
- [x] 1.1.5 验证 AlarmController 的 TypeScript 编译通过

### 1.2 完善 MonitoringController 装饰器 ✅
- [x] 1.2.1 完善现有响应装饰器的 schema 定义（移除内联 schema）
- [x] 1.2.2 为 POST /api/monitoring/data 添加 @ApiNotFoundResponse（设备不存在）
- [x] 1.2.3 为 POST /api/monitoring/data/batch 添加详细的错误响应装饰器
- [x] 1.2.4 为 GET /api/monitoring/data 完善分页响应模型
- [x] 1.2.5 为 GET /api/monitoring/data/statistics 添加统计响应模型
- [x] 1.2.6 验证 MonitoringController 的 TypeScript 编译通过

### 1.3 完善其他控制器装饰器 ✅
- [x] 1.3.1 完善 EquipmentController 装饰器（已完成：全部8个端点已添加完整的错误响应装饰器）
  - [x] POST /api/equipment - 添加完整错误响应装饰器
  - [x] GET /api/equipment - 添加完整错误响应装饰器
  - [x] GET /api/equipment/statistics - 添加完整响应schema和错误装饰器
  - [x] GET /api/equipment/:id - 添加完整错误响应装饰器
  - [x] PATCH /api/equipment/:id - 添加完整错误响应装饰器
  - [x] PATCH /api/equipment/:id/status - 添加完整错误响应装饰器
  - [x] DELETE /api/equipment/:id - 添加完整错误响应装饰器
  - [x] POST /api/equipment/:id/restore - 添加完整错误响应装饰器
- [x] 1.3.2 完善 ReportController 装饰器（已完成：全部6个端点已添加完整装饰器）
  - [x] POST /api/reports/health - 添加完整错误响应装饰器
  - [x] GET /api/reports/health - 添加完整错误响应装饰器
  - [x] GET /api/reports/health/:id - 添加完整错误响应装饰器和 @ApiParam
  - [x] PUT /api/reports/health/:id - 添加完整错误响应装饰器和 @ApiParam
  - [x] DELETE /api/reports/health/:id - 添加完整错误响应装饰器和 @ApiParam
  - [x] GET /api/reports/health/:id/export - 添加完整错误响应装饰器和 @ApiParam
- [x] 1.3.3 完善 ImportController 装饰器（已完成：全部7个端点已添加完整装饰器）
  - [x] GET /api/imports/template/:format - 添加 @ApiParam 和错误响应装饰器
  - [x] POST /api/imports/upload - 添加完整错误响应装饰器
  - [x] POST /api/imports/upload-and-import - 添加完整错误响应装饰器
  - [x] GET /api/imports - 添加完整错误响应装饰器
  - [x] GET /api/imports/:id - 添加 @ApiParam 和完整错误响应装饰器
  - [x] DELETE /api/imports/:id - 添加 @ApiParam 和完整错误响应装饰器
- [x] 1.3.4 完善 QueryController 装饰器（已完成：全部8个端点已添加完整装饰器）
  - [x] GET /api/statistics/monitoring - 添加完整错误响应装饰器
  - [x] GET /api/statistics/alarms - 添加完整错误响应装饰器
  - [x] GET /api/statistics/equipment - 添加完整错误响应装饰器
  - [x] GET /api/equipment/:id/profile - 添加 @ApiParam 和完整错误响应装饰器
  - [x] POST /api/export/monitoring - 添加完整错误响应装饰器
  - [x] POST /api/export/alarms - 添加完整错误响应装饰器
  - [x] POST /api/export/reports - 添加完整错误响应装饰器
  - [x] GET /api/export/download/:filename - 添加 @ApiParam 和错误响应装饰器

## 2. Phase 2: 通用响应模型标准化 ✅

### 2.1 创建通用响应 DTO ✅
- [x] 2.1.1 创建 `src/common/dto/api-response.dto.ts`
  - [x] 定义 `ApiResponseDto<T>` 泛型类（code, message, data, timestamp）
  - [x] 添加完整的 @ApiProperty 装饰器和示例
- [x] 2.1.2 创建 `PaginatedResponseDto<T>` 泛型类
  - [x] 定义字段：items, total, page, pageSize, totalPages
  - [x] 添加完整的 @ApiProperty 装饰器和示例
- [x] 2.1.3 创建 `src/common/dto/index.ts` 用于 barrel 导出

### 2.2 创建专门领域响应模型 ✅
- [x] 2.2.1 创建 `LoginResponseDto`
  - [x] 字段：accessToken, refreshToken, expiresIn, tokenType
  - [x] 添加完整的 @ApiProperty 装饰器
- [x] 2.2.2 创建 `DataStatisticsResponseDto`
  - [x] 字段：metricType, count, maxValue, minValue, avgValue, unit
  - [x] 添加完整的 @ApiProperty 装饰器
- [x] 2.2.3 创建 `BatchOperationResultDto`
  - [x] 字段：totalCount, successCount, failedCount, errors[]
  - [x] 添加嵌套的 ErrorDetailDto
- [x] 2.2.4 创建 `ErrorResponseDto`
  - [x] 字段：statusCode, message, error, timestamp, path
  - [x] 用于标准化错误响应

### 2.3 在控制器中应用响应模型 ✅
- [x] 2.3.1 更新 AlarmController 使用 `ErrorResponseDto`
- [x] 2.3.2 更新 AlarmController 使用 `PaginatedResponseDto`
- [x] 2.3.3 更新 MonitoringController 使用 `DataStatisticsResponseDto`
- [x] 2.3.4 更新 MonitoringController 使用 `BatchOperationResultDto`
- [x] 2.3.5 更新 EquipmentController 使用 `ErrorResponseDto` 和 `PaginatedResponseDto`
- [x] 2.3.6 所有控制器的错误响应统一使用 `ErrorResponseDto`

## 3. Phase 3: 全局装饰器标准化

### 3.1 统一控制器装饰器模式 ✅
- [x] 3.1.1 创建装饰器模板（参考 AuthController）
- [x] 3.1.2 确保所有控制器都有 @ApiTags
- [x] 3.1.3 确保所有需要认证的端点都有 @ApiBearerAuth
- [x] 3.1.4 确保所有端点都有 @ApiOperation（summary + description）
- [x] 3.1.5 审查并统一装饰器顺序（@ApiTags → @ApiBearerAuth → @Controller → @UseGuards）

### 3.2 完善实体层 @ApiProperty 装饰器 ✅
- [x] 3.2.1 完善 ThresholdConfig 实体的 @ApiProperty 装饰器（已完成：14个字段已添加完整装饰器）
- [x] 3.2.2 完善 AlarmRecord 实体的 @ApiProperty 装饰器（已完成：14个字段已添加完整装饰器）
- [x] 3.2.3 完善 TimeSeriesData 实体的 @ApiProperty 装饰器（已完成：9个字段已添加完整装饰器）
- [x] 3.2.4 完善 Equipment 实体的 @ApiProperty 装饰器（已完成：13个字段已添加完整装饰器）
- [x] 3.2.5 完善 HealthReport 实体的 @ApiProperty 装饰器（已完成：14个字段已添加完整装饰器，包括嵌套类UptimeStats和TrendAnalysis）
- [x] 3.2.6 完善 User, Role, Permission 实体的 @ApiProperty 装饰器（已完成：
  - User: 13个字段
  - Role: 7个字段
  - Permission: 7个字段）
- [x] 3.2.7 完善 ImportRecord 实体的 @ApiProperty 装饰器（已完成：15个字段，包括嵌套类ImportError）
- [x] 3.2.8 完善 AuditLog 实体的 @ApiProperty 装饰器（已完成：14个字段）

### 3.3 完善 DTO 层 @ApiProperty 装饰器 ✅
- [x] 3.3.1 审查所有 CreateDto 的 @ApiProperty 装饰器
  - [x] CreateThresholdDto: 已完善（11个字段，包含完整的装饰器、示例值和验证消息）
  - [x] CreateEquipmentDto: 已完善（9个字段，包含模式验证和详细示例）
  - [x] CreateTimeSeriesDataDto: 已完善（8个字段，包含监测点字段说明）
  - [x] CreateBatchTimeSeriesDataDto: 已完善（嵌套 DTO 结构完整）
  - [x] CreateUserDto: 已完善（7个字段，包含密码强度验证）
  - [x] GenerateHealthReportDto: 已完善（3个字段，包含 ISO 8601 日期说明）
- [x] 3.3.2 审查所有 UpdateDto 的 @ApiProperty 装饰器
  - [x] UpdateThresholdDto: 使用 PartialType，继承完整装饰器
  - [x] UpdateEquipmentDto: 已完善，包含状态枚举说明
  - [x] UpdateUserDto: 已完善（6个可选字段，包含完整验证规则）
  - [x] UpdateAlarmStatusDto: 已完善（2个字段，包含枚举和长度限制）
  - [x] UpdateHealthReportDto: 已完善（2个可选字段，包含详细说明）
- [x] 3.3.3 审查所有 QueryDto 的 @ApiProperty 装饰器
  - [x] QueryThresholdDto: 已完善（6个字段，包含分页参数）
  - [x] QueryAlarmDto: 已完善（8个字段，包含时间范围和监测点筛选）
  - [x] QueryTimeSeriesDataDto: 已完善（6个字段，包含监测点查询）
  - [x] QueryEquipmentDto: 已完善（5个字段，包含关键词搜索）
  - [x] QueryHealthReportDto: 已完善（6个字段，改用 @ApiPropertyOptional）
  - [x] QueryImportDto: 已完善（6个字段，改用 @ApiPropertyOptional）
  - [x] MonitoringStatisticsDto: 已完善（4个必填字段）
  - [x] AlarmStatisticsDto: 已完善（3个必填字段 + 1个可选字段）
- [x] 3.3.4 确保所有必填字段使用 @ApiProperty
  - [x] 已验证所有必填字段正确使用 @ApiProperty
  - [x] 所有必填字段包含 @IsNotEmpty 验证
- [x] 3.3.5 确保所有可选字段使用 @ApiPropertyOptional
  - [x] 已验证所有可选字段正确使用 @ApiPropertyOptional
  - [x] 所有可选字段包含 @IsOptional 验证
  - [x] 修正了 QueryHealthReportDto 和 QueryImportDto 的装饰器
- [x] 3.3.6 为所有字段添加示例值（example）
  - [x] 所有 DTO 字段均已添加真实、有意义的示例值
  - [x] 完善了 auth 模块 DTO 的示例值和验证消息（login, change-password, refresh-token）
- [x] 3.3.7 为枚举字段添加 enum 定义
  - [x] 所有枚举字段均已正确配置 enum 属性
  - [x] 包括：MetricType, AlarmSeverity, AlarmStatus, RuleStatus, EquipmentStatus, DataQuality, DataSource, ImportStatus, FileFormat, DuplicateStrategy, ReportType, ExportFormat

**完善总结**：
- 审查了 28 个 DTO 文件，涵盖所有模块（alarm, equipment, monitoring, auth, import, report, query）
- 修正了 3 个文件的装饰器使用（query-health-report.dto.ts, query-import.dto.ts）
- 完善了 4 个文件的验证消息（login.dto.ts, change-password.dto.ts, refresh-token.dto.ts）
- 所有 DTO 现已符合最佳实践：
  - 必填字段使用 @ApiProperty
  - 可选字段使用 @ApiPropertyOptional
  - 所有字段包含示例值、描述和类型定义
  - 枚举字段正确配置 enum 属性
  - 验证装饰器包含中文错误消息

### 3.4 文档和验证 ✅
- [x] 3.4.1 创建 `docs/openapi-decorator-guide.md`
  - [x] 装饰器使用指南
  - [x] 最佳实践和示例
  - [x] 常见错误和解决方案
- [x] 3.4.2 验证 TypeScript 编译通过
  - [x] 运行 `npm run build` 成功，无编译错误
  - [x] 所有 DTO 装饰器语法正确
  - [x] 所有导入语句正确（@ApiProperty vs @ApiPropertyOptional）
- [ ] 3.4.3 导出 swagger.json 并验证完整性（建议手动验证）
  - [ ] 检查所有端点是否有响应定义
  - [ ] 检查所有模型是否有完整的字段定义
  - [ ] 检查是否还有 `type: 'object'` 而没有 schema 的情况
- [ ] 3.4.4 使用 openapi-typescript-codegen 生成前端客户端代码（后续任务）
- [ ] 3.4.5 验证生成的代码是否类型安全（无 any 类型）（后续任务）
- [ ] 3.4.6 编写测试用例验证响应格式一致性（后续任务）

## 验证检查清单

### swagger.json 验证
- [ ] 所有 API 端点都有 `responses` 定义
- [ ] 所有成功响应都有 `schema` 定义
- [ ] 所有错误响应都有对应的 HTTP 状态码
- [ ] 所有参数都有 `description` 和 `type`
- [ ] 所有模型都有完整的 `properties` 定义

### 代码生成验证
- [ ] openapi-typescript-codegen 运行无错误
- [ ] 生成的 TypeScript 接口无 any 类型（除合理泛型）
- [ ] 生成的 API 客户端方法有正确的参数类型
- [ ] 生成的 API 客户端方法有正确的返回类型

### Swagger UI 验证
- [ ] 所有端点在 Swagger UI 中可见
- [ ] 所有端点有完整的请求示例
- [ ] 所有端点有完整的响应示例
- [ ] 可以在 Swagger UI 中成功测试 API 调用

## 依赖关系

- 任务 2.3（应用响应模型）依赖于任务 2.1 和 2.2（创建响应模型）
- 任务 3.4.4（生成前端代码）依赖于所有前置任务完成
- 各控制器的装饰器完善可以并行进行

## 注意事项

1. **不修改业务逻辑**：仅添加装饰器，不改变现有的 Service 层逻辑
2. **保持响应格式一致**：所有成功响应遵循 `{ code, message, data, timestamp }` 格式
3. **HTTP 状态码遵循 NestJS 默认**：POST 返回 201，其他返回 200（除非明确使用 @HttpCode）
4. **泛型响应模型**：使用 TypeScript 泛型定义可复用的响应模型
5. **枚举定义**：确保所有枚举在 @ApiProperty 中正确声明
6. **示例值**：为所有字段提供真实、有意义的示例值
7. **描述清晰**：所有 description 使用中文，简洁明了
8. **避免内联 schema**：优先使用 DTO 类而非内联对象定义
