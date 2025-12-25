# 设计文档：数据导入增强 - 告警回溯与实时推送

## Context

当前 `ImportService` 负责批量导入历史时序数据，但仅执行数据存储操作。本次变更需要在导入流程中集成两个新能力：

1. **告警回溯评估**：对导入的每条历史数据执行阈值评估，生成历史告警记录
2. **最新数据推送**：导入完成后通过 WebSocket 推送数据集中的最新记录

### 约束条件
- 批量导入性能不能显著下降（大文件可能包含数万条数据）
- 告警评估失败不应导致整个导入失败
- WebSocket 推送失败不应影响导入成功状态
- 必须保持现有的事务边界和错误处理机制

### 利益相关方
- **用户**：获得完整的历史告警记录和准实时的数据更新体验
- **运维团队**：通过日志监控告警评估和推送的执行状态
- **开发团队**：需要维护清晰的模块依赖关系

## Goals / Non-Goals

### Goals
- 对所有导入的历史数据执行告警阈值评估
- 自动生成历史告警记录，时间戳使用数据的原始 `timestamp`
- 导入完成后推送时间戳最新的数据到 WebSocket 客户端
- 保持现有导入流程的性能和稳定性
- 提供详细的日志记录便于调试和监控

### Non-Goals
- 不在本次变更中实现批量告警推送（每条告警单独推送）
- 不优化 `AlarmService.evaluateThresholds` 的内部性能
- 不修改现有的 WebSocket 房间订阅机制
- 不处理数据导入的去重逻辑（已有功能）

## Decisions

### Decision 1: 告警评估的执行时机

**选择**: 在事务提交后、导入记录更新前执行告警评估

**替代方案**:
1. **在事务内执行**: 告警评估失败会导致整个导入回滚 ❌
2. **异步后台任务**: 增加复杂度，难以保证时序性 ❌
3. **在保存后同步执行**: ✅ 平衡性能和可靠性

**理由**:
- 告警评估失败不应影响数据导入成功（业务需求）
- 同步执行可保证告警记录的时序性
- 在事务外执行避免长时间锁定数据库

### Decision 2: 告警评估的粒度

**选择**: 遍历每条已保存的 `TimeSeriesData`，逐条调用 `AlarmService.evaluateThresholds`

**替代方案**:
1. **批量评估**: 修改 `AlarmService` 支持批量接口 ❌ 需要重构现有服务
2. **按设备分组批量评估**: 复杂度高，收益有限 ❌

**理由**:
- 复用现有的单条评估逻辑，无需修改 `AlarmService`
- 每条数据的评估逻辑独立，失败互不影响
- 便于记录详细的错误日志

### Decision 3: 错误处理策略

**选择**: 告警评估和推送采用"最大努力"模式（Best Effort）

**策略**:
- 告警评估失败：记录错误日志，继续处理下一条数据
- WebSocket 推送失败：记录错误日志，不影响导入状态
- 所有错误都不抛出异常，不中断导入流程

**理由**:
- 数据导入的核心价值是存储数据，告警和推送是增强功能
- 部分数据的告警评估失败不应影响其他数据
- 用户可通过日志定位问题，后续手动处理

### Decision 4: 最新数据的识别和推送策略

**选择**: 导入完成后，按设备分组识别每个设备的最新数据，并通过 `sendToEquipment` 推送到对应的设备房间

**替代方案**:
1. **推送全局最新的一条数据**: 多设备导入时，其他设备的更新被忽略 ❌
2. **广播所有最新数据**: 未订阅设备的客户端收到无关消息，浪费带宽 ❌
3. **在导入过程中实时推送每条数据**: 性能问题，大批量导入会产生数万条 WebSocket 消息 ❌

**理由**:
- **符合业务场景**: 一个导入文件可能包含多个设备的数据（根据 `FileParserService` 实现），用户关心的是"每个设备的最新状态"
- **与现有架构一致**: WebSocket 已有 `sendToEquipment(equipmentId, event, data)` 方法和设备房间机制（`equipment:{equipmentId}`）
- **精准推送**: 只有订阅了该设备的客户端才会收到更新，避免无关消息
- **性能可控**: 即使导入 100 个设备的数据，也只推送 100 条消息（而非广播给所有客户端）

**实现逻辑**:
```typescript
// 按设备分组，识别每个设备的最新数据
const latestDataByEquipment = new Map<string, TimeSeriesData>();
successfulDataList.forEach(data => {
  const current = latestDataByEquipment.get(data.equipmentId);
  if (!current || data.timestamp > current.timestamp) {
    latestDataByEquipment.set(data.equipmentId, data);
  }
});

// 为每个设备推送其最新数据到对应的房间
latestDataByEquipment.forEach((data, equipmentId) => {
  websocketGateway.sendToEquipment(equipmentId, 'import:latest-data', data);
});
```

### Decision 5: 文件格式扩展 - 支持监测点字段

**选择**: 在本次变更中扩展 `FileParserService`，支持解析导入文件中的"监测点"列

**替代方案**:
1. **维持现状，仅支持 metricType**: 导致告警评估不完整，历史告警缺失 ❌
2. **后续单独变更**: 延迟问题解决，用户需等待下一版本 ❌
3. **本次一并实现**: ✅ 一次性解决数据完整性问题

**理由**:
- **根本解决问题**: 告警评估依赖 `(equipmentId, metricType, monitoringPoint)` 三元组匹配，缺少监测点会导致告警缺失
- **提升数据质量**: 用户可导入更精确的历史数据，支持"总电压"、"单体最高温度"等业务监测点
- **向后兼容**: 监测点为可选字段，旧文件格式仍可正常导入（monitoringPoint 为 null）
- **实施成本可控**: 仅需修改 `FileParserService`，不影响其他模块

**关于字段可选性的说明**:
- **技术实现**: `monitoringPoint?: string`（TypeScript 可选字段）
- **设计原则**: 
  - 向后兼容：不强制要求用户重新整理所有历史数据文件
  - 渐进式采用：允许用户先导入基础数据，后续补充精细数据
  - 降低使用门槛：不因新增字段阻止现有流程
- **业务引导**:
  - 在文档中明确标注"可选，但强烈建议填写"
  - 说明不填写可能导致部分告警缺失
  - 提供标准模板引导用户正确填写
  - 在用户指南中对比有/无监测点的告警触发差异
- **告警匹配逻辑**:
  - 数据包含 `monitoringPoint`: 精确匹配 `(equipmentId, metricType, monitoringPoint)` 的阈值规则
  - 数据 `monitoringPoint` 为 null: 仅匹配 `monitoringPoint IS NULL` 的通用阈值规则
  - 用户可根据实际需求配置两种类型的阈值规则

**实现要点**:
- 更新 `ParsedTimeSeriesData` 接口，添加 `monitoringPoint?: string`
- 扩展 `COLUMN_MAPPING`，支持"监测点"、"监控点"、"Monitoring Point"等多种表头
- 提供基本验证：长度限制（≤100字符）、自动 trim 空白
- 提供标准导入模板（Excel/CSV），包含示例数据
- **重点强化文档**：在 API 文档和用户指南中详细说明监测点字段的重要性和影响

### Decision 6: 模块依赖注入

**选择**: `ImportService` 注入 `AlarmService` 和 `WebsocketGateway`

**模块依赖关系**:
```
ImportModule
├─ imports: [AlarmModule, WebsocketModule]
└─ providers: [ImportService]
    ├─ 注入 AlarmService
    └─ 注入 WebsocketGateway
```

**理由**:
- 遵循 NestJS 的依赖注入模式
- `AlarmService` 和 `WebsocketGateway` 已是可注入的服务
- 避免循环依赖（ImportModule → AlarmModule，无反向依赖）

## Implementation Plan

### Phase 1: 告警回溯集成

1. **修改 `ImportModule`**
   - 在 `imports` 中添加 `AlarmModule`
   - 确保 `AlarmService` 可被注入

2. **修改 `ImportService.batchImportTimeSeriesData`**
   - 在事务提交后，遍历成功保存的 `TimeSeriesData` 记录
   - 为每条记录调用 `AlarmService.evaluateThresholds(data)`
   - 使用 `try-catch` 捕获评估错误，记录日志但不抛出
   - 统计成功/失败的告警数量

3. **日志记录**
   - `Logger.log`: 告警评估开始和完成（记录总数、触发数）
   - `Logger.debug`: 单条告警触发详情
   - `Logger.error`: 评估失败的详细错误信息

### Phase 2: 最新数据推送集成

1. **修改 `ImportModule`**
   - 在 `imports` 中添加 `WebsocketModule`（如果尚未添加）
   - 确保 `WebsocketGateway` 可被注入

2. **修改 `ImportService.executeImport`**
   - 在导入成功后（状态更新前），按设备分组识别最新数据：
     ```typescript
     const latestDataByEquipment = new Map<string, TimeSeriesData>();
     savedDataList.forEach(data => {
       const current = latestDataByEquipment.get(data.equipmentId);
       if (!current || data.timestamp > current.timestamp) {
         latestDataByEquipment.set(data.equipmentId, data);
       }
     });
     ```
   - 遍历 Map，为每个设备调用 `websocketGateway.sendToEquipment(equipmentId, 'import:latest-data', latestData)`
   - 每次调用使用 `try-catch` 捕获推送错误，记录日志但不抛出

3. **推送消息格式**
   ```typescript
   {
     event: 'import:latest-data',
     data: {
       id: number,
       equipmentId: string,
       timestamp: string, // ISO 8601
       metricType: MetricType,
       monitoringPoint: string | null,
       value: number,
       unit: string,
       quality: DataQuality,
       source: DataSource,
       importRecordId: string, // 导入记录ID（可选）
     }
   }
   ```

### Phase 3: 文件解析扩展 - 监测点支持

1. **修改 `ParsedTimeSeriesData` 接口**
   - 在 `file-parser.service.ts` 中添加 `monitoringPoint?: string` 字段

2. **更新 `COLUMN_MAPPING` 配置**
   - 添加监测点列映射：
     ```typescript
     监测点: 'monitoringPoint',
     监控点: 'monitoringPoint',
     测点: 'monitoringPoint',
     'Monitoring Point': 'monitoringPoint',
     'MonitoringPoint': 'monitoringPoint',
     ```

3. **更新 `convertDataTypes` 方法**
   - 添加监测点字段的处理逻辑：
     ```typescript
     if (row.monitoringPoint) {
       const trimmed = String(row.monitoringPoint).trim();
       if (trimmed.length > 100) {
         throw new Error('监测点名称过长（最大100字符）');
       }
       result.monitoringPoint = trimmed;
     }
     ```

4. **修改 `ImportService.batchImportTimeSeriesData`**
   - 在创建 `TimeSeriesData` 实体时，添加 `monitoringPoint` 字段赋值

5. **创建标准导入模板**
   - 创建 `templates/import-template.xlsx`，包含监测点列
   - 创建 `templates/import-template.csv`，包含监测点列
   - 在模板中添加示例数据行

6. **更新 API 文档**
   - 在 Swagger 文档中说明监测点字段
   - 提供模板下载接口（可选）

### Phase 4: 测试和验证

1. **单元测试**
   - 测试告警评估逻辑是否正确调用
   - 测试告警评估失败不影响导入成功
   - 测试最新数据的识别逻辑

2. **集成测试**
   - 导入包含触发告警的历史数据，验证 `AlarmRecord` 正确创建
   - 验证 WebSocket 推送消息格式正确
   - 验证推送失败不影响导入状态

3. **性能测试**
   - 导入 10,000 条数据，测量告警评估的耗时
   - 确保总耗时增加在可接受范围内（< 20%）

## Risks / Trade-offs

### Risk 1: 大批量导入性能下降

**风险**: 对每条数据执行告警评估可能导致导入时间显著增加

**缓解措施**:
- 告警评估逻辑在事务外执行，不阻塞数据库写入
- `AlarmService.evaluateThresholds` 已优化（使用索引查询阈值配置）
- 如果性能仍不满足，后续可改为异步队列处理

**监控指标**: 导入总耗时、告警评估耗时占比

### Risk 2: 告警评估失败导致告警缺失

**风险**: 部分数据的告警评估失败，导致历史告警不完整

**缓解措施**:
- 详细的错误日志记录（包括失败的数据ID和原因）
- 运维团队可通过日志定位问题
- 后续可提供"重新评估"工具，对指定导入记录重新执行告警评估

**监控指标**: 告警评估失败率

### Risk 3: WebSocket 推送失败

**风险**: 推送失败导致前端无法收到最新数据通知

**缓解措施**:
- 推送失败不影响导入成功状态
- 用户可手动刷新获取最新数据
- 错误日志记录推送失败原因

**监控指标**: WebSocket 推送失败率

### Trade-off: 同步评估 vs 异步评估

**当前选择**: 同步评估（在导入流程中直接执行）

**优点**:
- 实现简单，无需引入消息队列
- 告警记录与数据导入时序一致
- 用户导入完成后立即看到告警

**缺点**:
- 大批量导入时可能阻塞用户操作
- 评估失败无法重试（除非重新导入）

**未来优化方向**: 如果性能成为瓶颈，可引入异步队列（如 Bull）处理告警评估

## Migration Plan

### 升级步骤

1. **部署前**
   - 无需数据库迁移（使用现有表结构）
   - 确认 `AlarmService` 和 `WebsocketGateway` 正常运行

2. **部署阶段**
   - 部署新版本代码
   - 重启应用服务

3. **部署后验证**
   - 导入测试数据文件，验证告警记录生成
   - 使用 WebSocket 客户端验证推送消息接收
   - 检查日志确认无异常错误

### 回滚策略

**如果需要回滚**:
- 回滚到上一版本代码
- 已生成的历史告警记录保留（不影响数据一致性）
- 新导入的数据仍然有效（告警功能为增强功能）

**无数据损坏风险**: 本次变更仅新增功能，不修改现有数据结构

## Open Questions

### Q1: 是否需要对告警评估提供"重新评估"功能？

**背景**: 如果告警评估失败或阈值配置更新，用户可能需要对历史数据重新评估

**待讨论**:
- 是否在本次变更中实现？
- 如果后续实现，提供 API 接口还是后台任务？

**临时方案**: 先通过日志监控，如有需求再补充

### Q2: 是否需要限制告警评估的数据范围？

**背景**: 极端情况下，用户可能导入数年的历史数据（数十万条），全量评估可能耗时过长

**待讨论**:
- 是否需要设置"仅评估最近 N 天的数据"？
- 是否需要提供用户配置选项？

**临时方案**: 先全量评估，根据实际使用情况再优化

### Q3: WebSocket 推送是否需要支持按设备分组？

**背景**: 当前推送所有设备的最新数据（广播），未来可能需要按设备房间推送

**待讨论**:
- 是否需要识别多个设备的最新数据？
- 推送到设备专属房间还是广播？

**临时方案**: 先实现广播，后续根据需求优化为按设备推送
