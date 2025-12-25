# 设计文档: 监控与告警数据模型重构

## 背景

当前监控告警系统使用简化的数据模型:
- 时序数据仅通过 `(equipmentId, metricType, timestamp)` 标识
- 阈值配置按 `(equipmentId, metricType)` 匹配
- 设备记录代表单个组件(如"1#电池组")

`docs/data/` 中的客户需求文档显示该模型不足以应对实际运营需求:
- 多个监测点共享相同的 `metricType` 但有不同的业务含义(如"总电压" vs "单体电压")
- 操作员需要故障名称(如"总压过压")和处理措施,而不仅仅是数值阈值
- 设备管理需要在系统级别(如"电池装置系统")运作,而非组件级别

本设计通过数据库模式增强、应用逻辑更新和数据迁移来解决这些差距。

## 目标与非目标

### 目标
- 实现超越物理指标类型的监测点精确标识
- 存储完整的业务上下文(故障名称、处理措施)与阈值规则
- 重构设备层级以匹配运营需求(系统级)
- 在可行的情况下保持与现有 API 的向后兼容性
- 提供自动化工具填充客户特定的监控规则
- 确保数据迁移保留历史信息

### 非目标
- 实时监测点发现或自动配置(监测点按设备类型预定义)
- 多级设备层级(仅需要系统级)
- 基于机器学习的动态阈值规则生成
- 跨不同船舶类型的监测点标准化(每次部署配置自己的监测点)

## 决策

### 决策 1: 添加 `monitoring_point` 字符串字段

**内容**: 向 `time_series_data` 和 `threshold_configs` 表都添加 `varchar` 列 `monitoring_point`。

**原因**: 
- 简单灵活的方法,不需要单独的监测点定义表
- 与客户文档格式对齐(监测点是命名字符串)
- 无需复杂的规范化即可立即实现
- 支持设备特定的监测点名称

**考虑的替代方案**:
1. **带外键的独立 MonitoringPoint 实体**: 拒绝,因为增加了复杂性而没有明确的好处。监测点是设备特定的,不需要跨设备规范化。
2. **监测点的枚举**: 拒绝,因为监测点因设备类型和部署而异,使全局枚举不切实际。
3. **带监测点元数据的 JSON 列**: 拒绝,因为查询性能问题和缺乏类型安全。

**权衡**:
- ✅ 部署特定监测点的灵活性
- ✅ 简单的数据模型和迁移路径
- ⚠️ 需要应用层验证监测点名称
- ⚠️ 可能出现拼写错误或命名不一致(通过验证服务缓解)

### 决策 2: 在告警记录中反规范化故障名称和处理措施

**内容**: 在告警创建时将 `fault_name` 和 `recommended_action` 从阈值配置复制到告警记录。

**原因**:
- 历史准确性: 即使阈值规则后来被修改,告警记录也必须保留原始上下文
- 运营需求: 操作员查看历史告警时需要看到告警发生时的确切故障名称和指导
- 查询性能: 避免告警历史查询的复杂连接

**考虑的替代方案**:
1. **仅引用阈值配置(规范化)**: 拒绝,因为阈值修改或删除会丢失历史上下文。
2. **单独的告警上下文表**: 拒绝,对此用例过度工程化。

**权衡**:
- ✅ 保证历史数据完整性
- ✅ 快速告警记录查询
- ⚠️ 存储开销(中等,告警记录不如时序数据量大)
- ⚠️ 数据同步: 阈值规则的更改不会追溯更新旧告警(这是期望的行为)

### 决策 3: 系统级设备层级

**内容**: 从组件级设备(如"1#电池组"、"2#电池组")迁移到系统级设备(如"电池装置系统")。

**原因**:
- 匹配客户文档的运营监控需求
- 简化监控配置(每个系统一套阈值,而非每个组件)
- 与操作员对船舶系统的思考方式对齐
- 降低配置复杂性

**考虑的替代方案**:
1. **多级层级(系统→子系统→组件)**: 拒绝,因为客户需求不要求这种复杂性。
2. **保留组件级,添加系统分组**: 拒绝,因为维护了不必要的粒度。

**权衡**:
- ✅ 简化配置和监控
- ✅ 匹配运营工作流
- ⚠️ 粒度较低(无法区分单个电池组)
- ⚠️ 现有部署需要数据迁移

**迁移计划**: 创建从旧组件 ID 到新系统 ID 的映射,更新 time_series_data 和 threshold_configs 中的外键,保留历史数据。

### 决策 4: 应用层的监测点验证

**内容**: 在服务层(MonitoringService、ThresholdService)而非数据库约束中实现监测点验证。

**原因**:
- 灵活性: 监测点是设备特定的,可以按部署配置
- 提供更好的错误消息和验证逻辑
- 允许未来扩展监测点发现/注册功能
- 数据库约束需要复杂的触发器或单独的表

**考虑的替代方案**:
1. **数据库外键到 MonitoringPoint 表**: 拒绝,因为监测点不是全局定义的实体。
2. **带设备类型特定列表的 CHECK 约束**: 拒绝,过于僵化且依赖数据库。

**权衡**:
- ✅ 灵活的验证规则
- ✅ 更好的错误报告
- ⚠️ 需要全面的单元测试验证逻辑
- ⚠️ 无数据库级强制执行(通过严格的应用验证缓解)

### 决策 5: 通过脚本而非迁移填充客户规则

**内容**: 创建独立脚本 `scripts/seed-customer-rules.ts` 来解析客户文档并填充阈值规则,而不是将其嵌入迁移中。

**原因**:
- 将客户特定数据与模式结构分离
- 如果客户文档更新,可以重新运行脚本
- 保持迁移仅关注模式更改
- 不同部署可能有不同的客户需求

**考虑的替代方案**:
1. **在迁移中嵌入客户规则**: 拒绝,因为将客户数据与模式版本紧密耦合。
2. **通过管理 UI 手动配置**: 拒绝,对于大型规则集容易出错且缺乏自动化。

**权衡**:
- ✅ 可重用且可维护
- ✅ 分离关注点(模式 vs 数据)
- ⚠️ 部署中需要单独的脚本执行步骤
- ⚠️ 脚本必须是幂等的以允许重新运行

## 数据库模式变更

### `time_series_data` 表

```sql
ALTER TABLE time_series_data 
  ADD COLUMN monitoring_point VARCHAR(100) NULL COMMENT '监测点名称';

CREATE INDEX idx_equipment_monitoring_time 
  ON time_series_data(equipment_id, monitoring_point, timestamp);
```

**注意**:
- 列初始为可空以实现向后兼容
- 未来的插入将通过 DTO 验证要求 monitoring_point
- 索引优化按设备和监测点筛选的查询

### `threshold_configs` 表

```sql
ALTER TABLE threshold_configs
  ADD COLUMN monitoring_point VARCHAR(100) NULL COMMENT '监测点名称',
  ADD COLUMN fault_name VARCHAR(200) NULL COMMENT '故障名称',
  ADD COLUMN recommended_action TEXT NULL COMMENT '处理措施';

CREATE INDEX idx_equipment_monitoring 
  ON threshold_configs(equipment_id, monitoring_point);
```

**注意**:
- 所有新列为可空以实现向后兼容
- 未来的插入通过验证要求 monitoring_point 和 fault_name
- recommended_action 是可选的(某些规则可能没有特定措施)

### `alarm_records` 表(未来增强)

如果 `alarm_records` 还没有这些字段:

```sql
ALTER TABLE alarm_records
  ADD COLUMN monitoring_point VARCHAR(100) NULL COMMENT '监测点名称',
  ADD COLUMN fault_name VARCHAR(200) NULL COMMENT '故障名称',
  ADD COLUMN recommended_action TEXT NULL COMMENT '处理措施';
```

## 告警匹配逻辑重构

### 当前逻辑
```typescript
// 伪代码 - 当前实现
const thresholds = await findThresholds({
  equipmentId: data.equipmentId,
  metricType: data.metricType
});
```

**问题**: 如果设备有多个使用相同 metricType 的监测点,可能会匹配多个阈值。

### 新逻辑
```typescript
// 伪代码 - 提议的实现
const thresholds = await findThresholds({
  equipmentId: data.equipmentId,
  metricType: data.metricType,
  monitoringPoint: data.monitoringPoint  // 现在是必需的
});
```

**好处**: 精确的阈值匹配,监测点与阈值规则之间一对一对应。

## 数据迁移策略

### 阶段 1: 模式迁移(增量)
1. 向 `time_series_data` 和 `threshold_configs` 添加新列(可空)
2. 创建索引以优化查询
3. 部署支持新旧字段的应用代码

### 阶段 2: 设备数据迁移
1. 创建新的系统级设备记录
2. 构建映射表: 旧组件 ID → 新系统 ID
3. 更新 `time_series_data` 中的外键(保留所有历史数据)
4. 更新 `threshold_configs` 中的外键
5. 软删除旧的组件级设备记录

### 阶段 3: 数据回填(可选)
1. 对于关键历史数据,基于启发式回填 `monitoring_point`
2. 如果确定性较低,用质量标志标记回填记录

### 阶段 4: 强制验证
1. 更新 DTO 验证以要求新记录的 monitoring_point
2. 监测点验证服务针对设备特定允许列表检查

### 阶段 5: 客户规则填充
1. 运行 `scripts/seed-customer-rules.ts` 从文档填充阈值配置
2. 验证所有预期的监测点和阈值已创建
3. 为生产启用告警监控

## 监测点验证服务

### 设计

```typescript
interface MonitoringPointDefinition {
  equipmentType: string;
  monitoringPoint: string;
  metricType: MetricType;
  unit: string;
  description: string;
}

class MonitoringPointValidationService {
  // 每个设备类型的有效监测点的内存缓存
  private definitions: Map<string, MonitoringPointDefinition[]>;
  
  async validateMonitoringPoint(
    equipmentId: string, 
    monitoringPoint: string, 
    metricType: MetricType
  ): Promise<boolean> {
    // 1. 获取设备类型
    // 2. 查找该类型的有效监测点
    // 3. 验证监测点存在且匹配指标类型
    // 4. 返回验证结果
  }
  
  async getValidMonitoringPoints(equipmentId: string): Promise<string[]> {
    // 返回设备的有效监测点列表
  }
}
```

**未来增强**: 如果监测点定义变得复杂,考虑添加 `monitoring_point_definitions` 表。对于初始实现,验证规则可以硬编码或从配置文件加载。

## 风险与权衡

### 风险: 监测点名称不一致
- **影响**: 拼写错误或命名不一致可能创建孤立数据
- **缓解**: 
  - 带预定义列表的严格验证服务
  - 客户规则脚本从文档强制一致命名
  - 考虑未来增强: 监测点注册 UI

### 风险: 数据迁移复杂性
- **影响**: 设备 ID 重映射可能引入 bug 或数据丢失
- **缓解**:
  - 全面的迁移前验证
  - 在预发环境中进行干运行测试
  - 带数据库备份的回滚计划
  - 验证查询检查迁移后的数据完整性

### 风险: 向后兼容性破坏
- **影响**: 现有 API 客户端可能不提供 monitoring_point 字段
- **缓解**:
  - 逐步强制验证(错误前先警告)
  - 如果破坏性变更不可避免,使用 API 版本控制
  - 清晰的迁移文档和客户端更新指导

### 风险: 客户规则脚本解析错误
- **影响**: 脚本可能误解客户文档,创建不正确的阈值
- **缓解**:
  - 使用实际客户文档进行广泛测试
  - 生产运行前手动审查脚本输出
  - 仅验证的干运行模式(无数据库写入)
  - 详细的日志记录和错误报告

## 待解决问题

1. **监测点标准化**: 监测点名称应遵循特定的命名约定(如 PascalCase、kebab-case)吗?
   - **建议**: 使用适当大写的自然语言(如"总电压"、"最高单体温度")以匹配客户文档。

2. **多语言支持**: 故障名称和处理措施应支持多种语言吗?
   - **建议**: 推迟到未来增强。初始实现仅中文,如需要可稍后添加 i18n。

3. **监测点发现**: 系统应提供从传入传感器数据自动发现监测点的方式吗?
   - **建议**: 初始实现不需要。监测点必须预定义以确保数据到达前配置告警规则。

4. **历史告警上下文**: 如果操作员更正故障名称或处理措施,应提供更新历史告警记录的方式吗?
   - **建议**: 不需要。历史准确性比追溯更新更重要。如果对阈值配置进行更改,添加审计日志。

5. **监测点元数据**: 监测点应存储额外的元数据(描述、单位、正常范围)吗?
   - **建议**: 未来增强。对于初始实现,保持监测点作为简单字符串标识符。如果稍后需要,可以通过单独的表添加元数据。
