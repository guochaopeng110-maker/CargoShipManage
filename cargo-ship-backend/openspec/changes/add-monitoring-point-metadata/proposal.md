# Change: 添加监测点元数据管理系统

## Why

当前系统缺乏"设备监测点"的元数据定义表,导致以下问题:

1. **前端展示受限**: 前端无法动态获取某设备应有哪些监测点,需要硬编码监测点列表
2. **数据校验缺失**: 无法校验上报数据或导入数据的监测点名称是否合法
3. **一致性风险**: 各模块(导入、告警、实时数据)对监测点的定义可能产生偏差,缺乏"单一事实来源"
4. **业务完整性不足**: ThresholdConfig 表虽有 `monitoring_point` 字段,但仅覆盖有告警阈值的点,不能代表设备的完整监测点集合

通过引入独立的监测点元数据管理系统,可以实现:
- 前端动态渲染设备监测点列表,消除硬编码
- 全系统统一的监测点定义和校验
- 提升数据质量和业务一致性

## What Changes

### 1. 数据库层 (Database)
- **新增** `MonitoringPoint` 实体和 `monitoring_points` 表
  - 字段: `id` (UUID), `equipmentId` (外键), `pointName` (中文名称), `metricType` (枚举), `unit`, `description`
  - 唯一约束: `(equipmentId, pointName)` 组合唯一
  - 级联删除: 设备删除时自动删除关联的监测点
- **新增** 数据库迁移脚本
- **新增** Seed 脚本,从 `docs/data/monitoring_point_definition.md` 初始化监测点定义

### 2. 设备模块 (Equipment Module)
- **新增** `EquipmentService.getMonitoringPoints(equipmentId)` 方法
- **新增** `GET /api/equipment/:id/monitoring-points` 接口
- **修改** `Equipment` 实体,添加 `@OneToMany` 关联到 `MonitoringPoint`
- **新增** Swagger 文档定义

### 3. 监测模块 (Monitoring Module)
- **修改** `MonitoringService`,在保存 `TimeSeriesData` 时校验 `monitoringPoint` 是否在元数据表中存在
- **增强** 自动补全逻辑: 如果上报数据缺失 `unit`,从元数据表中自动补全

### 4. 告警模块 (Alarm Module)
- **修改** `AlarmService`,在创建/修改 `ThresholdConfig` 时校验 `monitoringPoint` 是否为该设备的有效监测点

### 5. 导入模块 (Import Module)
- **修改** `ImportService`,导入历史数据时校验监测点名称是否与元数据表匹配
- **增强** 动态生成导入模板,确保模板与当前系统定义实时一致

### 6. 前端影响 (Frontend Impact)
- **增量更新**: 新增 API 不破坏现有接口契约
- **Swagger 变更**: 新增 `/api/equipment/{id}/monitoring-points` 路径和 `MonitoringPoint` Schema
- **代码生成**: 前端需重新运行 `openapi-typescript-codegen` 生成新的 Service 方法和 Model

## Impact

### 受影响的规格 (Affected Specs)
- `equipment-management`: 新增监测点查询能力
- `monitoring-data`: 增强数据校验和单位自动补全
- `alarm-threshold`: 增强阈值配置校验
- `import-monitoring-point`: 增强导入数据校验和模板生成

### 受影响的代码 (Affected Code)
- `src/database/entities/monitoring-point.entity.ts` (新增)
- `src/database/entities/equipment.entity.ts` (修改关联)
- `src/modules/equipment/equipment.service.ts` (新增方法)
- `src/modules/equipment/equipment.controller.ts` (新增端点)
- `src/modules/monitoring/monitoring.service.ts` (增强校验)
- `src/modules/alarm/alarm.service.ts` (增强校验)
- `src/modules/import/import.service.ts` (增强校验和模板生成)
- `scripts/seed-monitoring-points.ts` (新增)
- `test/equipment/*.e2e-spec.ts` (新增测试)

### 兼容性
- **向后兼容**: 现有 API 不变,仅新增端点
- **数据迁移**: 不影响现有数据,仅新增元数据表
- **可选校验**: 初期可配置为警告模式,避免影响现有业务流程

### 非破坏性变更 (Non-Breaking)
所有变更均为增量式,不会导致现有功能失效或前端编译错误。
