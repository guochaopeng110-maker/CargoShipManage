# 设计文档: WebSocket 事件重构 - 第一阶段

## 架构概览

### 当前架构问题

```
┌─────────────────────────────────────────────────────────┐
│              当前推送架构 (问题重重)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MonitoringService ──► MonitoringPushService            │
│         │                  │                            │
│         │                  ├──► monitoring:new-data     │
│         │                                                │
│  EquipmentPushService                                   │
│         ├──► equipment:data:realtime  ◄── 功能重复!     │
│                                                         │
│  ImportService ──────┐                                  │
│         │            │                                  │
│         │            ├──► import:latest-data  ◄── 功能重复!
│         │            │                                  │
│         └──► alarm:historical-batch  ◄── 功能重复!      │
│                                                         │
│  AlarmService ──► AlarmPushService                      │
│                        ├──► alarm:new                   │
│                        ├──► alarm:update  ◄── 逻辑分散  │
│                        ├──► alarm:batch                 │
│                        └──► alarm:count:update ◄── 冗余 │
│                                                         │
│  WebsocketGateway                                       │
│         ├──► user:online/offline  ◄── 价值低            │
│                                                         │
│  EquipmentPushService                                   │
│         ├──► equipment:status:change  ◄── 价值低        │
│         ├──► equipment:update/created/deleted  ◄── 价值低
│         └──► equipment:overview:update  ◄── 冗余        │
└─────────────────────────────────────────────────────────┘
```

### 目标架构

```
┌─────────────────────────────────────────────────────────┐
│              重构后推送架构 (清晰简洁)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MonitoringService ──┐                                  │
│  ImportService ──────┼──► MonitoringPushService         │
│                      │         │                        │
│                      │         └──► monitoring:new-data │
│                      │              (唯一数据推送出口)   │
│                                                         │
│  AlarmService ───────┬──► AlarmPushService              │
│  ImportService ──────┘         │                        │
│                                ├──► alarm:push          │
│                                │    (合并 new+update)   │
│                                └──► alarm:batch         │
│                                     (合并 batch+historical)
│                                                         │
│  EquipmentPushService                                   │
│         └──► equipment:health:update/warning (保留)     │
│                                                         │
│  WebsocketGateway                                       │
│         └──► (仅提供基础推送能力,无业务事件)             │
└─────────────────────────────────────────────────────────┘
```

## 核心设计决策

### 决策 1: 统一监测数据推送事件

**问题**: `monitoring:new-data`, `equipment:data:realtime`, `import:latest-data` 三个事件功能完全相同

**方案**: 统一使用 `monitoring:new-data`

**理由**:
1. 事件语义最准确 - 代表"新的监测数据"
2. 已在 MonitoringPushService 中实现
3. 通过 `source` 字段区分数据来源 (`sensor`, `file-import`)

**实施**:
- MonitoringService: 继续使用 `MonitoringPushService.pushNewData()`
- ImportService: 改为调用 `MonitoringPushService.pushNewData()` 而非直接调用 WebsocketGateway
- EquipmentPushService: 删除 `pushRealtimeData()` 方法

### 决策 2: 合并告警创建和更新事件

**问题**: `alarm:new` 和 `alarm:update` 导致客户端需要维护两套 Upsert 逻辑

**方案**: 合并为 `alarm:push` 事件

**理由**:
1. 客户端视角: 两者都是"告警的最新状态"
2. 简化前端逻辑: 统一执行 Upsert 操作
3. 减少事件类型,降低系统复杂度

**实施**:
- 在 `AlarmPushService` 中创建 `pushUpsertAlarm(alarm)` 方法
- 该方法发出 `alarm:push` 事件,包含告警完整数据
- `AlarmService` 在创建和更新告警时都调用此方法
- 保留原有的推送范围逻辑(严重告警推送给管理员)

**消息格式**:
```typescript
{
  id: string;
  equipmentId: string;
  severity: AlarmSeverity;
  severityText: string;
  metricType: string;
  abnormalValue: number;
  thresholdRange: string;
  triggeredAt: Date;
  status: string;
  statusText: string;
  timestamp: string;
  monitoringPoint?: string;
  faultName?: string;
  recommendedAction?: string;
  
  // 仅在状态更新时存在
  handler?: string;
  handledAt?: Date;
  handleNote?: string;
}
```

### 决策 3: 合并批量告警推送事件

**问题**: `alarm:batch` 和 `alarm:historical-batch` 功能相似

**方案**: 统一使用 `alarm:batch`

**理由**:
1. 两者都是批量推送告警
2. 推送目标可通过房间机制控制
3. 历史告警和实时告警对前端来说处理逻辑相同

**实施**:
- ImportService 调用 `AlarmPushService.pushBatchAlarms()`
- 该方法统一发出 `alarm:batch` 事件
- 推送给管理员和运维人员

### 决策 4: 移除冗余通知事件

**事件列表**:
- `alarm:count:update` - 客户端可自行计算
- `user:online/offline` - REST API 可查询,实时性要求不高
- `equipment:status:change` - 通过监测数据和告警推断
- `equipment:update/created/deleted` - CRUD 操作,REST API 足够
- `equipment:overview:update` - 客户端可基于设备事件自行刷新

**理由**:
1. **减少噪音**: 这些事件对实时性要求不高
2. **客户端能力**: 现代前端完全有能力基于核心事件派生统计数据
3. **降低耦合**: 后端不需要为每个前端 UI 元素发送通知

**实施**:
- 删除 `AlarmPushService.broadcastAlarmCount()`
- 删除 `WebsocketGateway` 中的 `user:online/offline` 广播
- 删除 `EquipmentPushService` 中的所有方法(或标记为 `@deprecated`)

## 数据流

### 监测数据推送流程

```
┌──────────────┐
│ 数据来源      │
└──────┬───────┘
       │
       ├─► MonitoringService.receiveMonitoringData()
       │        │
       │        ├─► 保存到数据库
       │        ├─► AlarmService.evaluateThresholds() (告警评估)
       │        └─► MonitoringPushService.pushNewData()
       │                 │
       │                 └─► WebsocketGateway.sendToEquipment()
       │                          └─► emit('monitoring:new-data', {...})
       │
       └─► ImportService.executeImport()
                │
                ├─► 批量保存数据
                ├─► 告警回溯评估
                └─► 推送最新数据
                     └─► MonitoringPushService.pushNewData() (每个设备的最新数据)
                              └─► emit('monitoring:new-data', {...})
```

### 告警推送流程

```
┌──────────────┐
│ 告警触发源    │
└──────┬───────┘
       │
       ├─► AlarmService.evaluateThresholds() (创建告警)
       │        │
       │        ├─► 保存 AlarmRecord
       │        └─► AlarmPushService.pushUpsertAlarm()
       │                 │
       │                 └─► emit('alarm:push', {...})
       │                      - 推送范围: equipment room + roles (按严重程度)
       │
       ├─► AlarmService.updateAlarmStatus() (更新告警)
       │        │
       │        ├─► 更新 AlarmRecord
       │        └─► AlarmPushService.pushUpsertAlarm()
       │                 └─► emit('alarm:push', {...})
       │
       └─► ImportService.executeImport() (历史告警回溯)
                │
                ├─► 批量创建 AlarmRecord
                └─► AlarmPushService.pushBatchAlarms()
                         └─► emit('alarm:batch', { alarms: [...], count: N })
                              - 推送范围: administrator + operator
```

## 实现细节

### MonitoringPushService 调整

**无需修改** - 当前实现已符合要求:
- 推送事件名: `monitoring:new-data`
- 推送房间: `equipment:{equipmentId}`
- 消息包含 `source` 字段区分来源

### AlarmPushService 重构

**新增方法**:
```typescript
/**
 * 推送告警 (创建或更新)
 * 取代原有的 pushNewAlarm() 和 pushAlarmStatusUpdate()
 */
async pushUpsertAlarm(alarm: AlarmRecord): Promise<void> {
  const alarmMessage = {
    id: alarm.id,
    equipmentId: alarm.equipmentId,
    severity: alarm.severity,
    severityText: this.getSeverityText(alarm.severity),
    metricType: alarm.abnormalMetricType,
    abnormalValue: alarm.abnormalValue,
    thresholdRange: alarm.thresholdRange,
    triggeredAt: alarm.triggeredAt,
    status: alarm.status,
    statusText: this.getStatusText(alarm.status),
    timestamp: new Date().toISOString(),
    
    // 业务上下文
    monitoringPoint: alarm.monitoringPoint,
    faultName: alarm.faultName,
    recommendedAction: alarm.recommendedAction,
    
    // 仅在已处理时存在
    handler: alarm.handler,
    handledAt: alarm.handledAt,
    handleNote: alarm.handleNote,
  };

  // 推送给设备订阅者
  this.websocketGateway.sendToEquipment(
    alarm.equipmentId,
    'alarm:push',
    alarmMessage,
  );

  // 严重告警推送给管理角色
  if (
    alarm.severity === AlarmSeverity.CRITICAL ||
    alarm.severity === AlarmSeverity.HIGH
  ) {
    this.websocketGateway.sendToRole('administrator', 'alarm:push', alarmMessage);
    this.websocketGateway.sendToRole('operator', 'alarm:push', alarmMessage);
  }
}
```

**修改方法**:
```typescript
/**
 * 批量推送告警
 * 用于历史导入和批量创建场景
 */
async pushBatchAlarms(alarms: AlarmRecord[]): Promise<void> {
  // 统一使用 alarm:batch 事件
  const alarmMessages = alarms.map(alarm => ({
    id: alarm.id,
    equipmentId: alarm.equipmentId,
    // ... 完整字段
  }));

  this.websocketGateway.sendToRole('administrator', 'alarm:batch', {
    alarms: alarmMessages,
    count: alarms.length,
  });
  this.websocketGateway.sendToRole('operator', 'alarm:batch', {
    alarms: alarmMessages,
    count: alarms.length,
  });
  
  // 不再调用 broadcastAlarmCount()
}
```

**删除方法**:
- `pushNewAlarm()` - 由 `pushUpsertAlarm()` 取代
- `pushAlarmStatusUpdate()` - 由 `pushUpsertAlarm()` 取代
- `broadcastAlarmCount()` - 完全移除

### ImportService 调整

**数据推送**:
```typescript
// 当前 (需要移除):
this.websocketGateway.sendToEquipment(
  equipmentId,
  'import:latest-data',  // ❌ 移除
  data,
);

// 修改为:
await this.monitoringPushService.pushNewData(latestData); // ✅
```

**告警推送**:
```typescript
// 当前 (需要移除):
this.websocketGateway.sendToRole(
  'administrator',
  'alarm:historical-batch',  // ❌ 移除
  { alarms: [...] },
);

// 修改为:
await this.alarmPushService.pushBatchAlarms(triggeredAlarms); // ✅
```

### WebsocketGateway 清理

**移除代码**:
```typescript
// ❌ 删除 user:online 广播
this.server.to('role:Administrator').emit('user:online', {
  userId: auth.userId,
  username: auth.username,
  timestamp: new Date().toISOString(),
});

// ❌ 删除 user:offline 广播
this.server.to('role:Administrator').emit('user:offline', {
  userId: auth.userId,
  username: auth.username,
  timestamp: new Date().toISOString(),
});
```

### EquipmentPushService 处理

**选项 A** (推荐): 保留文件但标记方法为废弃
```typescript
/**
 * @deprecated 已废弃 - 设备数据推送请使用 MonitoringPushService
 */
async pushRealtimeData(...) {
  this.logger.warn('pushRealtimeData is deprecated');
}

/**
 * @deprecated 已废弃 - 设备状态变更不再通过 WebSocket 推送
 */
async pushStatusChange(...) {
  this.logger.warn('pushStatusChange is deprecated');
}

// ... 其他方法同样标记
```

**选项 B**: 完全删除文件并移除依赖注入

推荐选项 A,提供过渡期,避免立即破坏现有代码。

## 测试策略

### 单元测试

1. **MonitoringPushService.spec.ts**
   - ✅ 无需修改 (现有测试已覆盖)

2. **AlarmPushService.spec.ts**
   - 新增: `pushUpsertAlarm()` 测试用例
   - 修改: `pushBatchAlarms()` 测试用例 (验证事件名)
   - 删除: `pushNewAlarm()`, `pushAlarmStatusUpdate()`, `broadcastAlarmCount()` 测试

3. **EquipmentPushService.spec.ts**
   - 标记所有测试为废弃或删除

### E2E 测试

创建新的 E2E 测试文件: `test/websocket/websocket-events-refactor.e2e-spec.ts`

测试场景:
1. **监测数据推送**
   - MonitoringService 接收数据后推送 `monitoring:new-data`
   - ImportService 导入数据后推送 `monitoring:new-data`
   - 验证消息格式和 `source` 字段

2. **告警推送**
   - 创建告警时推送 `alarm:push`
   - 更新告警时推送 `alarm:push`
   - 批量导入告警时推送 `alarm:batch`
   - 验证推送范围 (设备房间 + 角色房间)

3. **废弃事件验证**
   - 确认不再发出 `import:latest-data`, `equipment:data:realtime`
   - 确认不再发出 `alarm:new`, `alarm:update`, `alarm:historical-batch`, `alarm:count:update`
   - 确认不再发出 `user:online/offline`
   - 确认不再发出 `equipment:*` 事件

## 迁移指南 (前端)

### 监测数据事件迁移

**之前**:
```typescript
// 监听多个事件
socket.on('monitoring:new-data', handleMonitoringData);
socket.on('equipment:data:realtime', handleMonitoringData);
socket.on('import:latest-data', handleMonitoringData);
```

**之后**:
```typescript
// 只监听一个事件
socket.on('monitoring:new-data', (data) => {
  console.log('数据来源:', data.source); // 'sensor' | 'file-import'
  handleMonitoringData(data);
});
```

### 告警事件迁移

**之前**:
```typescript
socket.on('alarm:new', (alarm) => {
  alarmStore.add(alarm);
});

socket.on('alarm:update', (alarm) => {
  alarmStore.update(alarm.id, alarm);
});

socket.on('alarm:batch', (data) => {
  alarmStore.addBatch(data.alarms);
});

socket.on('alarm:historical-batch', (data) => {
  alarmStore.addBatch(data.alarms);
});

socket.on('alarm:count:update', () => {
  // 重新获取告警计数
  fetchAlarmCount();
});
```

**之后**:
```typescript
socket.on('alarm:push', (alarm) => {
  // Upsert 逻辑 - 统一处理创建和更新
  alarmStore.upsert(alarm.id, alarm);
  
  // 自行更新计数
  alarmStore.updateCount();
});

socket.on('alarm:batch', (data) => {
  alarmStore.upsertBatch(data.alarms);
  alarmStore.updateCount();
});
```

### 移除的事件

以下事件已移除,请改用 REST API:
- `user:online`, `user:offline` → `GET /api/users/online`
- `equipment:status:change` → 从 `monitoring:new-data` 和 `alarm:push` 推断
- `equipment:update/created/deleted` → 刷新设备列表 `GET /api/equipment`
- `equipment:overview:update` → 定期轮询 `GET /api/equipment/overview`
- `alarm:count:update` → 客户端本地计算

## 回滚计划

如果重构后发现问题,可按以下步骤回滚:

1. **代码回滚**: 恢复到重构前的 commit
2. **数据库**: 无数据库变更,无需回滚
3. **前端通知**: 告知前端团队暂缓迁移

建议在正式发布前在测试环境充分验证至少 1 周。
