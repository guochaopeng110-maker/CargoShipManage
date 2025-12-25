# Proposal: 重构 WebSocket 事件体系 - 第一阶段

**Change ID**: `refactor-websocket-events-phase1`  
**Status**: 提案中 (Proposed)  
**Author**: Claude  
**Created**: 2025-12-09

## 背景

当前 WebSocket 实现存在以下问题:

1. **事件功能重叠**: 多个事件实现相同功能,造成维护成本高和客户端集成复杂
   - `monitoring:new-data`, `equipment:data:realtime`, `import:latest-data` 三个事件都推送设备监测数据
   - `alarm:new` 和 `alarm:update` 分别处理告警创建和更新,导致客户端需要维护两套逻辑
   - `alarm:batch` 和 `alarm:historical-batch` 功能高度相似

2. **冗余的通知事件**: 部分事件价值低,增加系统复杂度
   - `alarm:count:update` 仅通知刷新,客户端完全可以基于 `alarm:push` 事件自行更新计数
   - `user:online/offline` 对实时性要求不高,可通过 REST API 查询
   - `equipment:status:change/update/created/deleted/overview:update` 等设备元信息变更事件实时性需求较低

3. **推送逻辑分散**: MonitoringPushService, AlarmPushService, EquipmentPushService 中存在重复的推送逻辑

## 目标

第一阶段重构目标:

1. **统一数据推送事件**: 将所有设备监测数据推送统一到 `monitoring:new-data` 事件
2. **合并告警推送事件**: 将 `alarm:new` 和 `alarm:update` 合并为 `alarm:push`,将 `alarm:historical-batch` 合并到 `alarm:batch`
3. **移除冗余事件**: 移除 `alarm:count:update`, `user:online/offline`, `equipment:*` 相关的所有推送逻辑
4. **简化推送服务**: 确保每类数据只有一个推送出口,减少代码重复

## 影响范围

### 后端模块
- `src/modules/websocket/websocket.gateway.ts` - 移除 `user:online/offline` 广播
- `src/modules/monitoring/monitoring-push.service.ts` - 成为监测数据推送的唯一出口
- `src/modules/monitoring/monitoring.service.ts` - 确保调用 MonitoringPushService
- `src/modules/alarm/alarm-push.service.ts` - 合并事件,移除 `alarm:count:update`
- `src/modules/import/import.service.ts` - 使用统一的推送服务
- `src/modules/equipment/equipment-push.service.ts` - 移除所有推送方法(或标记为废弃)

### 前端影响
需要协调前端团队更新事件监听逻辑:
- 统一监听 `monitoring:new-data` 而非多个事件
- 将 `alarm:new` 和 `alarm:update` 的监听逻辑合并为 `alarm:push`
- 移除对已废弃事件的监听

### API 兼容性
**破坏性变更**: 是

此重构涉及移除和重命名事件,是破坏性变更。建议:
1. 在发布说明中明确列出所有变更
2. 提供前端迁移指南
3. 考虑在测试环境先行验证

## 非目标

以下内容不在第一阶段范围内:
- 健康评分推送事件 (`equipment:health:update/warning`) 保持不变
- WebSocket 房间机制和权限控制保持不变
- 不涉及前端代码修改(仅提供迁移指南)

## 成功标准

1. **代码简化**: Push Service 中的事件类型减少至少 50%
2. **测试通过**: 所有 E2E 测试更新后通过
3. **文档更新**: WebSocket API 文档反映新的事件体系
4. **向后兼容**: 提供清晰的迁移路径和文档

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|-----|------|---------|
| 前端团队未及时适配 | 实时功能失效 | 提前沟通,提供详细迁移文档 |
| 遗漏某些事件触发点 | 数据推送不完整 | 全面代码审查,补充集成测试 |
| 现有监听逻辑未清理 | 客户端报错 | 提供事件映射表,建议渐进式迁移 |

## 后续阶段

第二阶段可考虑:
- 优化 WebSocket 消息格式
- 实现事件批量推送以减少网络开销
- 增加消息确认和重试机制
