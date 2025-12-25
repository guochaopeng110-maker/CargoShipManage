# Technical Design: 监测点元数据管理系统

## Context

当前系统在监测点管理方面存在以下架构问题:

1. **缺乏元数据层**: 监测点信息分散在业务数据中 (ThresholdConfig, TimeSeriesData),没有统一的"单一事实来源"
2. **前端硬编码**: 前端需要硬编码每个设备的监测点列表,难以维护且容易出错
3. **数据质量问题**: 无法在数据入口处校验监测点的有效性,导致脏数据进入系统
4. **业务不一致性**: 导入、告警、实时数据各模块对监测点的理解可能存在偏差

本设计引入独立的监测点元数据表,作为系统的"基础设施层",为所有业务模块提供统一的监测点定义和校验服务。

## Goals / Non-Goals

### Goals
- 建立监测点元数据的"单一事实来源" (Single Source of Truth)
- 提供统一的监测点校验服务,确保数据质量
- 支持前端动态渲染监测点列表,消除硬编码
- 增强数据完整性 (自动补全单位等字段)
- 保持向后兼容,不破坏现有功能

### Non-Goals
- 不涉及监测点的动态配置 UI (由管理员通过 Seed 脚本或未来的管理界面管理)
- 不改变现有的时序数据存储结构
- 不强制要求所有历史数据必须有监测点 (向后兼容)

## Decisions

### 1. 数据模型设计

**Decision**: 创建独立的 `MonitoringPoint` 实体表,而非在 ThresholdConfig 或 TimeSeriesData 中扩展。

**Rationale**:
- **关注点分离**: 监测点定义是元数据,与业务数据 (时序数据、阈值配置) 有本质区别
- **复用性**: 多个模块 (设备、监测、告警、导入) 都需要查询监测点定义
- **可维护性**: 独立表便于统一管理和更新监测点定义
- **扩展性**: 未来可以轻松添加监测点的更多属性 (如传感器类型、采样频率等)

**Alternatives Considered**:
- ❌ **在 ThresholdConfig 中维护监测点**: 但只覆盖有告警的点,不全面
- ❌ **在前端配置文件中硬编码**: 无法动态更新,无法进行后端校验
- ❌ **使用枚举类型**: 不够灵活,每次新增监测点需要修改代码和重新部署

### 2. 唯一性约束

**Decision**: 使用 `(equipmentId, pointName)` 组合唯一约束。

**Rationale**:
- 同一设备下不允许重复的监测点名称
- 不同设备可以有相同名称的监测点 (如多个电池系统都有"总电压")
- 使用中文 pointName 作为业务标识,符合用户习惯

**Implementation**:
```typescript
@Unique(['equipmentId', 'pointName'])
export class MonitoringPoint { ... }
```

### 3. 级联删除策略

**Decision**: 设备删除时,自动删除关联的监测点 (`ON DELETE CASCADE`)。

**Rationale**:
- 监测点的生命周期完全依赖于设备
- 设备删除后,其监测点定义失去意义
- 避免孤立数据,保持数据库清洁

**Risk**: 如果误删除设备,监测点定义也会丢失。
**Mitigation**: 
- 设备删除操作需要管理员权限
- 可以通过备份恢复
- 建议在删除前进行二次确认

### 4. 校验策略

**Decision**: 采用"软校验" + "向后兼容"策略,而非强制校验。

**Rationale**:
- **向后兼容**: 现有系统中的数据可能没有监测点字段,强制校验会导致现有功能失效
- **渐进式迁移**: 允许系统逐步过渡到使用监测点元数据
- **容错性**: 即使监测点元数据未完全配置,系统仍可正常运行

**Implementation**:
```typescript
// 仅当 monitoringPoint 不为空时才进行校验
if (data.monitoringPoint) {
  await this.equipmentService.validateMonitoringPoint(
    data.equipmentId, 
    data.monitoringPoint
  );
}
```

**Future Enhancement**: 可以通过配置开关控制是否强制要求监测点 (strictMode)。

### 5. 性能优化 - 批量校验缓存

**Decision**: 在批量导入场景中,使用内存缓存避免重复查询数据库。

**Rationale**:
- 批量导入可能涉及数千条数据,逐条查询监测点会导致严重的 N+1 问题
- 同一批次数据通常涉及少量设备 (如 5-10 个),可以一次性加载到内存

**Implementation**:
```typescript
// 1. 收集所有唯一的 equipmentId
const uniqueEquipmentIds = [...new Set(dataRows.map(row => row.equipmentId))];

// 2. 批量加载监测点到缓存
const monitoringPointsCache = new Map<string, MonitoringPoint[]>();
for (const equipmentId of uniqueEquipmentIds) {
  const points = await this.equipmentService.getMonitoringPoints(equipmentId);
  monitoringPointsCache.set(equipmentId, points);
}

// 3. 使用缓存进行校验
for (const row of dataRows) {
  const validPoints = monitoringPointsCache.get(row.equipmentId);
  const isValid = validPoints.some(p => p.pointName === row.monitoringPoint);
  // ...
}
```

**Trade-off**: 增加内存占用,但通常监测点数量较少 (每个设备 5-20 个),影响可忽略。

### 6. 单位自动补全

**Decision**: 如果上报数据缺失 `unit`,自动从监测点元数据中补全。

**Rationale**:
- **数据完整性**: 确保入库数据包含完整的业务上下文
- **用户友好**: 减轻数据上报方的负担
- **一致性**: 避免因手动填写导致的单位不一致 (如 "V" vs "伏特")

**Implementation**:
```typescript
if (!data.unit && data.monitoringPoint) {
  const point = await this.equipmentService.getMonitoringPointByName(
    data.equipmentId, 
    data.monitoringPoint
  );
  if (point?.unit) {
    data.unit = point.unit;
    this.logger.debug(`自动补全监测点 '${data.monitoringPoint}' 的单位: ${point.unit}`);
  }
}
```

**Trade-off**: 增加一次数据库查询,但可以通过缓存优化。

### 7. 数据初始化 - Seed 脚本

**Decision**: 使用 Seed 脚本从文档或 JSON 配置初始化监测点数据,而非手动 SQL。

**Rationale**:
- **可追溯**: 监测点定义以代码形式存在,便于版本管理
- **可重复**: 开发、测试、生产环境可以使用相同的脚本
- **幂等性**: 脚本可以重复运行,自动处理已存在的记录

**Implementation**:
```typescript
// scripts/seed-monitoring-points.ts
const definitions = parseDefinitionFile('docs/data/monitoring_point_definition.md');
for (const def of definitions) {
  const equipment = await equipmentRepo.findOne({ where: { deviceId: def.deviceId } });
  if (!equipment) {
    logger.warn(`设备 ${def.deviceId} 不存在,跳过监测点: ${def.pointName}`);
    continue;
  }
  
  await monitoringPointRepo.upsert({
    equipmentId: equipment.id,
    pointName: def.pointName,
    metricType: def.metricType,
    unit: def.unit,
    description: def.description,
  }, ['equipmentId', 'pointName']); // 基于唯一约束进行 upsert
}
```

### 8. 前端集成 - 动态模板生成

**Decision**: 导入模板根据设备 ID 动态生成,包含该设备的监测点下拉列表。

**Rationale**:
- **实时同步**: 模板始终反映当前系统的最新定义
- **减少错误**: 下拉列表限制用户输入,避免拼写错误
- **用户体验**: 用户无需手动查询监测点名称

**Implementation**:
```typescript
// ImportService.generateTemplate(format, equipmentId?)
if (equipmentId) {
  const monitoringPoints = await this.equipmentService.getMonitoringPoints(equipmentId);
  const pointNames = monitoringPoints.map(p => p.pointName);
  
  // 为 Excel 的"监测点"列添加数据验证
  worksheet.getColumn('monitoringPoint').eachCell({ includeEmpty: true }, (cell) => {
    cell.dataValidation = {
      type: 'list',
      formulae: [`"${pointNames.join(',')}"`],
      showErrorMessage: true,
      errorTitle: '无效的监测点',
      error: '请从下拉列表中选择有效的监测点'
    };
  });
}
```

## Risks / Trade-offs

### Risk 1: 监测点元数据不完整

**Risk**: 如果 Seed 脚本未涵盖所有设备,校验会阻止合法数据。

**Mitigation**:
- 向后兼容模式: monitoringPoint=null 时跳过校验
- 详细的错误提示,引导用户联系管理员补充监测点定义
- 提供管理接口 (未来) 允许运维人员动态添加监测点

### Risk 2: 性能影响

**Risk**: 增加监测点校验可能影响数据写入性能。

**Mitigation**:
- 批量导入时使用缓存,避免重复查询
- 监测点数量通常较少 (每设备 5-20 个),查询开销可控
- 可以添加 Redis 缓存进一步优化 (未来)

### Risk 3: 数据迁移复杂度

**Risk**: 现有系统已有时序数据和阈值配置,如何关联到监测点元数据?

**Mitigation**:
- 新系统不强制要求历史数据关联监测点
- 管理员可以逐步为现有设备添加监测点定义
- Seed 脚本可以根据 ThresholdConfig 中的 monitoring_point 字段自动生成元数据

### Trade-off: 复杂度 vs 数据质量

**Trade-off**: 引入元数据表增加了系统复杂度 (新表、新校验逻辑、跨模块依赖)。

**Justification**: 
- 数据质量是系统的核心价值,值得投入复杂度
- 长远来看,统一的元数据管理降低了维护成本
- 前端消除硬编码,整体系统反而更简洁

## Migration Plan

### Phase 1: 数据库准备 (Week 1)
1. 创建 MonitoringPoint 实体和迁移脚本
2. 编写 Seed 脚本,从客户需求文档提取监测点定义
3. 在开发环境运行迁移和 Seed

### Phase 2: 后端实施 (Week 2-3)
1. 实现设备模块的监测点查询接口
2. 实现监测数据、告警、导入模块的校验逻辑
3. 编写单元测试和 E2E 测试

### Phase 3: 前端集成 (Week 4)
1. 重新生成前端 API 客户端代码
2. 设备详情页调用监测点列表接口
3. 数据导入页使用动态模板
4. 阈值配置页使用监测点下拉选择

### Phase 4: 部署与监控 (Week 5)
1. 在测试环境部署并验证
2. 运行回归测试
3. 生产环境部署 (先运行迁移和 Seed,后部署代码)
4. 监控日志,确认校验逻辑正常工作

### Rollback Plan
如果生产环境出现问题:
1. 回滚应用代码到上一版本
2. MonitoringPoint 表可以保留 (不影响旧代码)
3. 如需删除表,运行回滚迁移 `npm run migration:revert`

## Open Questions

1. **Q**: 是否需要为监测点添加"启用/禁用"状态?
   **A**: 暂不需要。如果设备下线,直接删除设备即可。

2. **Q**: 是否需要监测点的多语言支持 (中英文)?
   **A**: 暂不需要。系统当前仅面向中文用户,使用中文名称即可。如未来需要,可添加 `pointNameEn` 字段。

3. **Q**: 是否需要监测点的版本管理 (历史记录)?
   **A**: 暂不需要。监测点定义变更不频繁,当前设计已通过告警记录的反规范化保证历史准确性。

4. **Q**: 是否需要为监测点添加"关键指标"标记,用于前端优先展示?
   **A**: 可以在未来版本中添加 `isPrimary` 布尔字段,但不在本次变更范围内。

## Success Metrics

1. **数据质量**: 导入数据的监测点校验通过率 > 95%
2. **性能**: 批量导入 1000 条数据的监测点校验耗时 < 500ms
3. **用户体验**: 前端无需硬编码监测点,动态加载成功率 100%
4. **兼容性**: 现有 E2E 测试全部通过,无回归问题
