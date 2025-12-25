# 变更: 重构监控与告警数据模型

## 为什么要做这个变更

当前数据模型存在严重的设计缺陷,无法准确实现客户需求:

1. **监测点定义模糊**: 系统仅使用通用的 `metricType`(如 `voltage`)来标识时序数据,但业务需求需要区分物理类型相同但业务含义不同的监测点(如"总电压" vs "单体电压")。这种模糊性导致无法为特定业务监测点配置告警,也无法精确查询其数据。

2. **告警规则信息不完整**: `threshold_configs` 表只能存储数值阈值,缺少存储关键业务上下文的字段,如与规则关联的**"故障名称"**(如"总压过压")以及触发告警后应采取的**"处理措施"**。

3. **设备数据粒度错误**: `equipment` 表中现有的种子数据过于细化(如"1#电池组"),而业务需求是在更高的"设备系统"层面(如"电池装置系统")进行管理。

通过分析 `docs/data/` 中的客户需求文档,发现当前数据库模式与业务需求之间存在根本性的不匹配。本次重构对于准确映射客户业务逻辑、确保数据完整性、实现精确的监控、告警和报告功能至关重要。

## 变更内容

这是一次全面的"自底向上"重构,涵盖数据库结构、应用逻辑和现有数据:

### 数据库结构增强

**破坏性变更**: 修改 `threshold_configs` 表:
- 增加 `monitoring_point` (varchar) 列: 存储业务定义的唯一监测点名称(如"总电压")
- 增加 `fault_name` (varchar) 列: 存储与此规则关联的具体故障名称(如"总压过压")
- 增加 `recommended_action` (text) 列: 存储触发告警时应采取的纠正措施

**破坏性变更**: 修改 `time_series_data` 表:
- 增加 `monitoring_point` (varchar) 列: 将每条时序记录关联到特定的业务监测点,解决单独使用 `metricType` 的模糊性问题

### 应用层更新

**DTOs**: 更新 `monitoring` 和 `alarm` 模块的 DTO,在创建、更新和查询操作中包含新的 `monitoring_point`、`fault_name` 和 `recommended_action` 字段。

**Services**:
- **ThresholdService & MonitoringService**: 更新逻辑以正确处理、验证和查询使用新 `monitoring_point` 字段的数据
- **AlarmService**: 重构核心告警触发逻辑,基于 `equipment_id` 和 `monitoring_point` 的组合来匹配规则
- **QueryService & ExportService**: 增强统计和数据导出功能,支持按 `monitoring_point` 进行聚合和筛选

### 数据修正

**设备数据**: 创建数据库迁移文件,删除旧的细粒度设备记录并插入正确的"设备系统"级别记录。

**测试数据**: 完全重写 `1732400000000-SeedTestData.ts` 迁移文件,生成与新模式兼容的测试数据,包括为 `monitoring_point` 和其他新字段提供有效值。

**客户规则填充**: 创建独立脚本 `scripts/seed-customer-rules.ts`,解析 `docs/data/` 中的客户文档,自动将所有监控规则填充到 `threshold_configs` 表中。

## 影响范围

### 受影响的规范
- `specs/monitoring-data/spec.md` - 新增监测点跟踪
- `specs/alarm-threshold/spec.md` - 修改阈值规则,增加业务上下文
- `specs/equipment-management/spec.md` - 修改设备层级

### 受影响的代码
- **数据库实体**: `src/database/entities/threshold-config.entity.ts`、`src/database/entities/time-series-data.entity.ts`、`src/database/entities/equipment.entity.ts`
- **迁移文件**: 新增模式变更迁移、更新 `1732400000000-SeedTestData.ts`
- **告警模块**: `src/modules/alarm/*.ts` (服务、DTO、控制器)
- **监控模块**: `src/modules/monitoring/*.ts` (服务、DTO、控制器)
- **查询模块**: `src/modules/query/*.ts` (统计和导出服务)
- **WebSocket 模块**: `src/modules/websocket/*.ts` (告警推送通知)
- **测试文件**: 告警和监控模块的所有单元测试

### 迁移策略
1. 通过新迁移应用数据库模式变更(可回滚)
2. 通过专用迁移修正设备数据
3. 完全重写测试数据迁移
4. 自动化脚本填充客户规则
5. 现有 API 尽可能保持向后兼容
6. 记录并沟通破坏性变更

### 风险评估
- **中等风险**: 数据库模式变更影响核心监控和告警功能
- **缓解措施**: 全面的测试覆盖、可回滚的迁移、分阶段部署
- **数据丢失风险**: 低 - 迁移保留现有数据,仅添加新字段
- **停机时间**: 最小 - 通过适当的迁移策略可在线应用模式变更
