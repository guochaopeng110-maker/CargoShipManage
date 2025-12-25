# 实施任务清单

## 1. 准备工作
- [ ] 1.1 审阅并理解响应格式分析报告（`docs/analysis/lists-response/response-format-analysis.md`）
- [ ] 1.2 确认现有DTO定义（`src/common/dto/api-response.dto.ts`）符合标准
- [ ] 1.3 与前端团队沟通破坏性变更和迁移计划
- [ ] 1.4 确认前端使用的swagger.json生成工具配置

## 2. P0 - Auth模块：用户列表接口（高优先级）
- [ ] 2.1 创建 `src/modules/auth/dto/query-user.dto.ts` 查询DTO
  - [ ] 2.1.1 添加 `page` 字段（可选，默认1）
  - [ ] 2.1.2 添加 `pageSize` 字段（可选，默认20，最大100）
  - [ ] 2.1.3 添加验证装饰器（`@IsOptional`, `@IsInt`, `@Min`, `@Max`）
  - [ ] 2.1.4 添加Swagger装饰器（`@ApiPropertyOptional`）
- [ ] 2.2 修改 `src/modules/auth/auth.service.ts` 的 `findAllUsers()` 方法
  - [ ] 2.2.1 添加 `QueryUserDto` 参数
  - [ ] 2.2.2 使用 `findAndCount` 替代 `find`
  - [ ] 2.2.3 实现分页逻辑（skip/take）
  - [ ] 2.2.4 返回格式：`{items, total, page, pageSize, totalPages}`
  - [ ] 2.2.5 计算 `totalPages = Math.ceil(total / pageSize)`
- [ ] 2.3 修改 `src/modules/auth/auth.controller.ts` 的 `findAllUsers()` 方法
  - [ ] 2.3.1 添加 `@Query()` 装饰器接收分页参数
  - [ ] 2.3.2 包装Service返回结果为统一格式：`{code, message, data, timestamp}`
  - [ ] 2.3.3 **重要**: 更新 `@ApiOkResponse` 装饰器，明确指定返回结构
    ```typescript
    @ApiOkResponse({
      description: '成功获取用户列表',
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
                items: { $ref: '#/components/schemas/User' }
              },
              total: { type: 'number', example: 100 },
              page: { type: 'number', example: 1 },
              pageSize: { type: 'number', example: 20 },
              totalPages: { type: 'number', example: 5 }
            }
          },
          timestamp: { type: 'number', example: 1734567890123 }
        }
      }
    })
    ```
- [ ] 2.4 更新DTO导出：在 `src/modules/auth/dto/index.ts` 中导出 `QueryUserDto`
- [ ] 2.5 编写/更新单元测试 `auth.service.spec.ts`
  - [ ] 2.5.1 测试分页参数默认值
  - [ ] 2.5.2 测试分页逻辑正确性
  - [ ] 2.5.3 测试 `totalPages` 计算
  - [ ] 2.5.4 测试边界条件（空列表、单页、多页）
- [ ] 2.6 验证生成的swagger.json
  - [ ] 2.6.1 检查 `User` 实体的完整字段定义（使用 `@ApiProperty` 装饰所有字段）
  - [ ] 2.6.2 确认 `items` 数组的元素类型正确引用 `User` schema

## 3. P0 - Import模块：导入记录列表接口（高优先级）
- [ ] 3.1 修改 `src/modules/import/import.service.ts` 的 `findAll()` 方法
  - [ ] 3.1.1 从 `QueryImportDto` 中提取分页参数（page, pageSize）
  - [ ] 3.1.2 确保使用 `findAndCount` 进行分页查询
  - [ ] 3.1.3 计算 `totalPages = Math.ceil(total / pageSize)`
  - [ ] 3.1.4 返回格式改为：`{items, total, page, pageSize, totalPages}`（原来是 `{data, total}`）
  - [ ] 3.1.5 更新返回类型签名
- [ ] 3.2 修改 `src/modules/import/import.controller.ts` 的 `findAll()` 方法
  - [ ] 3.2.1 包装Service返回结果为统一格式：`{code: 200, message: '查询成功', data, timestamp: Date.now()}`
  - [ ] 3.2.2 **重要**: 更新 `@ApiOkResponse` 装饰器，明确指定返回结构
    ```typescript
    @ApiOkResponse({
      description: '成功获取导入记录列表',
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
                items: { $ref: '#/components/schemas/ImportRecord' }
              },
              total: { type: 'number', example: 50 },
              page: { type: 'number', example: 1 },
              pageSize: { type: 'number', example: 20 },
              totalPages: { type: 'number', example: 3 }
            }
          },
          timestamp: { type: 'number', example: 1734567890123 }
        }
      }
    })
    ```
  - [ ] 3.2.3 删除或更新方法返回类型签名（移除 `Promise<{data, total}>`）
- [ ] 3.3 编写/更新单元测试 `import.service.spec.ts`
  - [ ] 3.3.1 测试分页逻辑
  - [ ] 3.3.2 测试返回格式正确性
- [ ] 3.4 验证生成的swagger.json
  - [ ] 3.4.1 检查 `ImportRecord` 实体的完整字段定义
  - [ ] 3.4.2 确认所有枚举类型（如 `ImportStatus`）正确导出

## 4. P1 - Equipment模块：设备列表接口（中优先级）
- [x] 4.1 修改 `src/modules/equipment/equipment.service.ts` 的 `findAll()` 方法
  - [x] 4.1.1 将返回对象中的 `limit` 字段重命名为 `pageSize`
  - [x] 4.1.2 确认返回结构为：`{data, total, page, pageSize, totalPages}`
- [x] 4.2 修改 `src/modules/equipment/equipment.controller.ts` 的 `findAll()` 方法
  - [x] 4.2.1 重构响应格式：将 `pagination` 字段合并到 `data` 内
  - [x] 4.2.2 修改为：`{code, message, data: {items: result.data, total, page, pageSize, totalPages}, timestamp}`
  - [x] 4.2.3 添加 `timestamp: Date.now()`
  - [x] 4.2.4 **重要**: 更新 `@ApiOkResponse` 装饰器
    ```typescript
    @ApiOkResponse({
      description: '成功获取设备列表',
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
                items: { $ref: '#/components/schemas/Equipment' }
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
- [x] 4.3 更新单元测试 `equipment.service.spec.ts`
  - [x] 4.3.1 测试返回格式中 `pageSize` 字段存在
  - [x] 4.3.2 测试 `limit` 字段不再存在
- [x] 4.4 验证 `Equipment` 实体所有字段有 `@ApiProperty` 装饰器

## 5. P1 - Monitoring模块：监测数据列表接口（中优先级）
- [x] 5.1 修改 `src/modules/monitoring/monitoring.controller.ts` 的 `queryMonitoringData()` 方法
  - [x] 5.1.1 将 `message: 'success'` 改为 `message: '查询成功'`
  - [x] 5.1.2 **重要**: 更新 `@ApiOkResponse` 装饰器
    ```typescript
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
                items: { $ref: '#/components/schemas/TimeSeriesData' }
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
- [x] 5.2 验证 `TimeSeriesData` 实体所有字段有 `@ApiProperty` 装饰器

## 6. P2 - Report模块：健康报告列表接口（低优先级）
- [x] 6.1 修改 `src/modules/report/report.service.ts` 的 `findAll()` 方法
  - [x] 6.1.1 在返回对象中添加：`totalPages: Math.ceil(total / pageSize)`
- [x] 6.2 修改 `src/modules/report/report.controller.ts` 的 `findAll()` 方法
  - [x] 6.2.1 **重要**: 更新 `@ApiOkResponse` 装饰器，添加 `totalPages` 字段
    ```typescript
    @ApiOkResponse({
      description: '成功获取健康报告列表',
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
                items: { $ref: '#/components/schemas/HealthReport' }
              },
              total: { type: 'number' },
              page: { type: 'number' },
              pageSize: { type: 'number' },
              totalPages: { type: 'number' }  // 新增
            }
          },
          timestamp: { type: 'number' }
        }
      }
    })
    ```
- [x] 6.3 更新单元测试验证 `totalPages` 字段
- [x] 6.4 验证 `HealthReport` 实体所有字段有 `@ApiProperty` 装饰器

## 7. Swagger文档完整性检查（新增关键步骤）
- [x] 7.1 检查所有实体类的Swagger装饰器
  - [x] 7.1.1 检查 `User` 实体（`src/database/entities/user.entity.ts`）
    - 确保所有公开字段有 `@ApiProperty()` 或 `@ApiPropertyOptional()`
    - 敏感字段（如 `password`）应使用 `@Exclude()` 并且不添加 `@ApiProperty`
  - [x] 7.1.2 检查 `Equipment` 实体（`src/database/entities/equipment.entity.ts`）
    - 确保所有枚举字段正确标注 `enum` 选项
    - 示例：`@ApiProperty({ enum: EquipmentStatus, enumName: 'EquipmentStatus' })`
  - [x] 7.1.3 检查 `ImportRecord` 实体（`src/database/entities/import-record.entity.ts`）
    - 确保所有字段有完整的描述、示例、类型定义
  - [x] 7.1.4 检查 `TimeSeriesData` 实体（`src/database/entities/time-series-data.entity.ts`）
    - 确保 `MetricType` 枚举正确导出
  - [x] 7.1.5 检查 `HealthReport` 实体（`src/database/entities/health-report.entity.ts`）
    - 确保关联字段正确标注（如 `@ApiProperty({ type: () => Equipment })`）
  - [x] 7.1.6 检查 `AlarmRecord` 和 `ThresholdConfig` 实体（已符合标准，仅验证）
- [ ] 7.2 生成并验证swagger.json
  - [ ] 7.2.1 启动开发服务器：`npm run start:dev`
  - [ ] 7.2.2 访问 `http://localhost:3000/api-docs-json` 下载swagger.json
  - [ ] 7.2.3 检查每个列表接口的响应schema是否完整：
    - `code`, `message`, `data`, `timestamp` 字段存在
    - `data.items` 正确引用实体schema（如 `$ref: '#/components/schemas/User'`）
    - `data.total`, `data.page`, `data.pageSize`, `data.totalPages` 字段存在
  - [ ] 7.2.4 检查所有实体schema定义完整：
    - 所有公开字段都有定义
    - 类型、格式、示例值正确
    - 枚举类型完整列出所有选项
- [ ] 7.3 使用openapi-typescript-codegen验证（与前端协同）
  - [ ] 7.3.1 使用前端的代码生成命令测试swagger.json
  - [ ] 7.3.2 确认生成的TypeScript类型定义正确
  - [ ] 7.3.3 验证 `items` 数组的元素类型不是 `any` 或 `unknown`

## 8. 单元测试（仅单元测试，无E2E测试）
- [x] 8.1 运行所有单元测试：`npm run test`
  - [x] 8.1.1 确保所有Service层测试通过
  - [x] 8.1.2 修复任何失败的测试用例
- [ ] 8.2 生成测试覆盖率报告：`npm run test:cov`
  - [ ] 8.2.1 确保修改的代码覆盖率 > 80%
- [ ] 8.3 手动测试每个列表接口（通过Swagger UI或Postman）
  - [ ] 8.3.1 测试空列表场景
  - [ ] 8.3.2 测试单页数据场景
  - [ ] 8.3.3 测试多页数据场景
  - [ ] 8.3.4 测试边界值（page=0, pageSize=0, pageSize>100）
  - [ ] 8.3.5 验证响应体完全符合swagger.json定义

## 9. 文档更新
- [x] 9.1 更新 `CLAUDE.md`
  - [x] 9.1.1 在"API Response Structure"章节中明确列表响应格式标准
  - [x] 9.1.2 添加列表响应格式示例
  - [x] 9.1.3 强调Swagger装饰器的重要性和规范
- [x] 9.2 创建Swagger最佳实践文档
  - [x] 9.2.1 说明所有实体必须添加 `@ApiProperty` 装饰器
  - [x] 9.2.2 说明枚举类型的正确标注方法
  - [x] 9.2.3 说明关联字段的正确标注方法
  - [x] 9.2.4 提供完整的示例代码
- [x] 9.3 创建前端迁移指南文档
  - [x] 9.3.1 列出所有破坏性变更的接口
  - [x] 9.3.2 提供迁移前后的代码对比示例
  - [x] 9.3.3 说明数据提取路径的变化
  - [x] 9.3.4 附上最新的swagger.json文件说明
- [x] 9.4 更新 `docs/analysis/lists-response/response-format-analysis.md`
  - [x] 9.4.1 添加"修复完成"标记
  - [x] 9.4.2 记录实际修复的内容和偏差

## 10. 代码审查和部署准备
- [ ] 10.1 执行代码自检
  - [ ] 10.1.1 运行 `npm run lint` 并修复所有问题
  - [ ] 10.1.2 运行 `npm run format` 格式化代码
- [ ] 10.2 创建Git提交
  - [ ] 10.2.1 按模块分别提交（Auth, Import, Equipment, Monitoring, Report, Swagger）
  - [ ] 10.2.2 使用清晰的提交消息（如："refactor(auth): 统一用户列表响应格式并完善Swagger文档"）
- [ ] 10.3 准备部署清单
  - [ ] 10.3.1 确认数据库迁移不需要（纯代码变更）
  - [ ] 10.3.2 列出需要重启的服务
  - [ ] 10.3.3 准备回滚方案
- [ ] 10.4 与前端团队同步
  - [ ] 10.4.1 提供最新的swagger.json文件
  - [ ] 10.4.2 确认前端代码生成工具配置正确
  - [ ] 10.4.3 协调统一发布时间
  - [ ] 10.4.4 准备灰度发布方案（如适用）

## 11. 后续监控
- [ ] 11.1 部署到测试环境
  - [ ] 11.1.1 验证所有接口响应格式正确
  - [ ] 11.1.2 验证swagger.json可访问且完整
  - [ ] 11.1.3 前端重新生成类型定义并集成测试
- [ ] 11.2 部署到生产环境
  - [ ] 11.2.1 监控API错误率
  - [ ] 11.2.2 监控响应时间
  - [ ] 11.2.3 收集用户反馈
- [ ] 11.3 一周后复盘
  - [ ] 11.3.1 评估变更效果
  - [ ] 11.3.2 记录经验教训
  - [ ] 11.3.3 更新最佳实践文档

---

## 依赖关系

- 任务2-6可以并行执行（不同模块独立）
- 任务7必须在任务2-6全部完成后执行（Swagger文档依赖所有模块完成）
- 任务8必须在任务7完成后执行（测试依赖Swagger文档正确）
- 任务9可以在任务2-7期间并行进行
- 任务10-11必须按顺序执行

## 预估时间分配

| 阶段 | 任务 | 预估时间 |
|------|------|---------|
| P0 | 任务2-3 | 3-4小时（含Swagger装饰器） |
| P1 | 任务4-5 | 1.5小时（含Swagger装饰器） |
| P2 | 任务6 | 30分钟（含Swagger装饰器） |
| Swagger检查 | 任务7 | 1.5小时 |
| 测试 | 任务8 | 1小时（仅单元测试） |
| 文档 | 任务9 | 1.5小时 |
| 部署 | 任务10-11 | 30分钟 |
| **总计** | | **约9-10小时** |

## 关键注意事项

### Swagger文档严格要求

1. **所有实体类必须完整标注**：
   - 每个公开字段都需要 `@ApiProperty()` 或 `@ApiPropertyOptional()`
   - 枚举字段必须指定 `enum` 和 `enumName`
   - 关联字段必须使用 `type: () => EntityClass` 避免循环依赖

2. **列表接口响应schema必须明确**：
   - 不能使用泛型 `PaginatedResponseDto<T>`，必须展开具体schema
   - `items` 数组必须正确引用实体schema（`$ref: '#/components/schemas/EntityName'`）
   - 所有分页字段都必须显式定义

3. **验证流程**：
   - 每次修改后必须重新生成swagger.json
   - 必须与前端协同验证代码生成结果
   - 确保生成的TypeScript类型定义准确无误

### 测试策略调整

- **移除所有E2E测试任务**：仅关注单元测试
- **增加手动测试**：通过Swagger UI或Postman验证实际响应
- **重点验证**：响应格式与swagger.json定义的一致性
