# Implementation Tasks

## 1. 数据库层实施

- [ ] 1.1 创建 MonitoringPoint 实体 (`src/database/entities/monitoring-point.entity.ts`)
  - 定义字段: id, equipmentId, pointName, metricType, unit, description
  - 添加唯一约束: `@Unique(['equipmentId', 'pointName'])`
  - 配置级联删除: `@ManyToOne(() => Equipment, { onDelete: 'CASCADE' })`
  - **添加 Swagger 装饰器**: 使用 `@ApiProperty()` 为每个字段添加 Swagger 文档,包括描述、示例值、类型说明
  
- [ ] 1.2 修改 Equipment 实体,添加 monitoringPoints 关联
  - 在 `src/database/entities/equipment.entity.ts` 中添加 `@OneToMany(() => MonitoringPoint, mp => mp.equipment)` 关联
  
- [ ] 1.3 生成数据库迁移脚本
  - 运行 `npm run migration:generate -- -n CreateMonitoringPointTable`
  - 验证生成的迁移文件包含正确的表结构和约束
  
- [ ] 1.4 编写 Seed 脚本 (`scripts/seed-monitoring-points.ts`)
  - 解析 `docs/data/monitoring_point_definition.md` 或 JSON 配置
  - 根据 device_id 查询设备 UUID
  - 批量插入监测点定义 (幂等操作)
  - 添加详细的日志和错误处理
  
- [ ] 1.5 在 package.json 中添加 seed 命令
  - 添加 `"seed:monitoring-points": "ts-node scripts/seed-monitoring-points.ts"`

## 2. 设备模块实施

- [ ] 2.1 创建 MonitoringPoint 相关 DTOs
  - `src/modules/equipment/dto/monitoring-point.dto.ts`
  - CreateMonitoringPointDto, UpdateMonitoringPointDto, MonitoringPointResponseDto
  
- [ ] 2.2 在 EquipmentService 中添加监测点查询方法
  - `getMonitoringPoints(equipmentId: string)`: 查询设备的所有监测点
  - `getMonitoringPointByName(equipmentId: string, pointName: string)`: 查询单个监测点
  - `validateMonitoringPoint(equipmentId: string, pointName: string)`: 校验监测点是否有效
  
- [ ] 2.3 在 EquipmentController 中添加端点
  - `GET /api/equipment/:id/monitoring-points`: 获取设备的监测点列表
  - 添加适当的权限守卫和 Swagger 文档
  
- [ ] 2.4 添加 Swagger 装饰器
  - 定义 MonitoringPoint Schema
  - 使用 `@ApiOkResponse` 定义响应格式
  - 添加 `@ApiTags('equipment')` 标签

## 3. 监测模块实施

- [ ] 3.1 在 MonitoringService 中注入 EquipmentService
  - 添加构造函数依赖注入
  
- [ ] 3.2 实现监测点校验逻辑
  - 在 `create()` 和批量导入方法中添加校验
  - 如果 monitoringPoint 不为空,调用 `EquipmentService.validateMonitoringPoint()`
  - 校验失败时抛出 `BadRequestException`,提示具体错误
  
- [ ] 3.3 实现单位自动补全逻辑
  - 如果 unit 为空且 monitoringPoint 不为空
  - 查询监测点元数据获取 unit 字段
  - 自动填充到 TimeSeriesData 实体
  
- [ ] 3.4 实现指标类型一致性校验
  - 验证 monitoringPoint 的 metricType 与上报数据的 metricType 是否一致
  - 不一致时返回明确的错误消息
  
- [ ] 3.5 添加向后兼容处理
  - 如果 monitoringPoint 为 null,跳过校验
  - 记录警告日志,建议补充监测点信息

## 4. 告警模块实施

- [ ] 4.1 在 AlarmService 中注入 EquipmentService
  
- [ ] 4.2 在创建阈值配置时添加校验
  - `createThreshold()` 方法中调用 `EquipmentService.validateMonitoringPoint()`
  - 验证 monitoringPoint 的 metricType 与阈值配置的 metricType 一致
  
- [ ] 4.3 在修改阈值配置时添加校验
  - `updateThreshold()` 方法中同样执行监测点校验
  
- [ ] 4.4 优化错误提示信息
  - 提供清晰的错误消息,包含设备 ID 和无效的监测点名称
  - 建议用户调用 `GET /api/equipment/:id/monitoring-points` 获取有效监测点列表

## 5. 导入模块实施

- [ ] 5.1 在 ImportService 中注入 EquipmentService
  
- [ ] 5.2 实现批量监测点校验
  - 在 `executeImport()` 中,先收集所有涉及的 equipmentId
  - 一次性加载所有设备的监测点到内存缓存 (Map 结构)
  - 遍历数据时使用缓存进行校验,避免逐行查询数据库
  
- [ ] 5.3 实现容错处理
  - 校验失败的数据记录到错误列表
  - 有效数据继续导入
  - 最终根据错误数量设置导入状态 (COMPLETED/PARTIAL/FAILED)
  
- [ ] 5.4 实现动态模板生成
  - 修改 `generateTemplate()` 方法
  - 如果提供 equipmentId 参数,查询该设备的监测点列表
  - 为 Excel 的 "监测点" 列添加数据验证下拉列表
  - 添加示例数据行
  
- [ ] 5.5 更新 Swagger 文档
  - 在导入接口文档中详细说明监测点字段
  - 添加监测点校验失败的错误响应示例
  - 引用 `GET /api/equipment/:id/monitoring-points` 接口

## 6. 测试实施

- [ ] 6.1 编写 EquipmentService 监测点方法的单元测试
  - `test/unit/equipment/equipment.service.spec.ts`
  - 测试 `getMonitoringPoints()` 方法
  - 测试 `getMonitoringPointByName()` 方法
  - 测试 `validateMonitoringPoint()` 方法
  - 使用 Mock Repository 模拟数据库操作
  
- [ ] 6.2 编写 MonitoringService 校验逻辑的单元测试
  - `test/unit/monitoring/monitoring.service.spec.ts`
  - 测试监测点校验逻辑
  - 测试单位自动补全逻辑
  - 测试指标类型一致性校验
  - 测试向后兼容处理 (monitoringPoint=null)
  
- [ ] 6.3 编写 AlarmService 校验逻辑的单元测试
  - `test/unit/alarm/alarm.service.spec.ts`
  - 测试创建阈值时的监测点校验
  - 测试修改阈值时的监测点校验
  - 测试校验失败时的错误处理
  
- [ ] 6.4 编写 ImportService 校验逻辑的单元测试
  - `test/unit/import/import.service.spec.ts`
  - 测试批量监测点校验逻辑
  - 测试缓存优化机制
  - 测试容错处理 (部分数据失败)
  
- [ ] 6.5 更新现有测试
  - 在测试 fixtures 中添加监测点数据
  - 确保现有测试不因新增校验而失败
  - Mock EquipmentService 在其他模块的单元测试中

## 7. 文档更新

- [ ] 7.1 创建监测点定义文档
  - `docs/data/monitoring_point_definition.md`
  - 列出所有设备类型及其标准监测点定义
  
- [ ] 7.2 更新 CLAUDE.md
  - 添加监测点元数据管理系统的说明
  - 更新数据库实体关系图
  - 添加最佳实践和常见问题
  
- [ ] 7.3 更新 API 文档
  - 确保所有新增接口有完整的 Swagger 注解
  - 添加请求/响应示例
  
- [ ] 7.4 编写用户指南
  - 说明如何获取设备的监测点列表
  - 说明导入数据时如何正确填写监测点字段
  - 说明监测点校验的重要性

## 8. 部署准备

- [ ] 8.1 运行所有单元测试确保通过
  - `npm run test`
  - 确保所有新增和修改的单元测试通过
  
- [ ] 8.2 运行数据库迁移
  - 开发环境: `npm run migration:run`
  - 测试环境: `npm run test:migration:run`
  
- [ ] 8.3 运行 Seed 脚本初始化监测点数据
  - `npm run seed:monitoring-points`
  
- [ ] 8.4 验证 Swagger 文档生成
  - 启动应用,访问 `/api/docs`
  - 确认新增接口和 Schema 正确显示
  
- [ ] 8.5 通知前端团队
  - 提供更新后的 Swagger JSON
  - 说明新增的接口和数据模型
  - 协调前端重新生成 API 客户端代码
