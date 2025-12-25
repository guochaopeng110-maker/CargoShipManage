# Tasks: WebSocket 事件重构 - 第一阶段

**Change ID**: `refactor-websocket-events-phase1`

本文档按照实施顺序列出所有任务。每个任务都是小型、可验证的工作项,提供用户可见的进度。

---

## 阶段 1: 准备工作

### Task 1.1: 创建迁移文档分支

**描述**: 创建功能分支用于此次重构

**验证**:
```bash
git checkout -b refactor/websocket-events-phase1
```

**预计影响**: 1 个文件(分支创建)

---

## 阶段 2: 统一监测数据推送

### Task 2.1: 修改 ImportService 数据推送逻辑

**描述**: 将 ImportService 中的直接 WebSocket 推送改为调用 MonitoringPushService

**文件**:
- `src/modules/import/import.service.ts`

**变更**:
1. 找到推送最新数据的代码块(搜索 `import:latest-data`)
2. 将以下代码:
   ```typescript
   this.websocketGateway.sendToEquipment(
     equipmentId,
     'import:latest-data',
     data,
   );
   ```
   替换为:
   ```typescript
   await this.monitoringPushService.pushNewData(latestData);
   ```
3. 确保 `monitoringPushService` 已注入到构造函数

**验证**:
- 代码编译通过
- ImportService 单元测试通过
- 运行 `npm run lint` 无错误

**预计影响**: 1 个文件, ~10 行代码

---

### Task 2.2: 废弃 EquipmentPushService.pushRealtimeData()

**描述**: 标记 `pushRealtimeData()` 方法为废弃,并记录警告日志

**文件**:
- `src/modules/equipment/equipment-push.service.ts`

**变更**:
1. 在 `pushRealtimeData()` 方法上添加 JSDoc 注释:
   ```typescript
   /**
    * @deprecated 已废弃 - 请使用 MonitoringPushService.pushNewData()
    * 此方法将在下一个主版本中移除
    */
   async pushRealtimeData(
     equipmentId: string,
     dataPoint: {...},
   ): Promise<void> {
     this.logger.warn(
       '警告: pushRealtimeData() 已废弃,请使用 MonitoringPushService',
     );
     // 原有逻辑保持不变 (兼容性)
   }
   ```

**验证**:
- TypeScript 编译通过
- 调用此方法时 IDE 显示废弃警告
- 运行时日志输出警告信息

**预计影响**: 1 个文件, ~5 行代码

---

### Task 2.3: 移除对 pushRealtimeData() 的所有调用

**描述**: 搜索并移除项目中所有对 `pushRealtimeData()` 的调用

**验证**:
```bash
rg "pushRealtimeData" --type ts
```

**预期结果**: 仅在 `equipment-push.service.ts` 中找到方法定义,无其他调用

**预计影响**: 可能涉及 0-3 个文件

---

## 阶段 3: 统一告警推送

### Task 3.1: 创建 AlarmPushService.pushUpsertAlarm() 方法

**描述**: 在 AlarmPushService 中添加新的 `pushUpsertAlarm()` 方法

**文件**:
- `src/modules/alarm/alarm-push.service.ts`

**变更**:
```typescript
/**
 * 推送告警 (创建或更新)
 * 
 * 统一处理告警的创建和更新推送,使用 alarm:push 事件
 * 
 * @param alarm 告警记录
 */
async pushUpsertAlarm(alarm: AlarmRecord): Promise<void> {
  const logMsg = alarm.monitoringPoint
    ? `推送告警: 设备=${alarm.equipmentId}, 监测点=${alarm.monitoringPoint}, 故障=${alarm.faultName || '未指定'}`
    : `推送告警: 设备=${alarm.equipmentId}`;

  this.logger.log(logMsg);

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

    // 处理信息(仅在已处理时存在)
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

**验证**:
- TypeScript 编译通过
- 方法签名正确

**预计影响**: 1 个文件, ~50 行代码

---

### Task 3.2: 修改 AlarmService 调用新方法

**描述**: 将 AlarmService 中的告警推送调用改为使用 `pushUpsertAlarm()`

**文件**:
- `src/modules/alarm/alarm.service.ts`

**变更**:
1. 找到创建告警的代码,将 `pushNewAlarm()` 改为 `pushUpsertAlarm()`
2. 找到更新告警状态的代码,将 `pushAlarmStatusUpdate()` 改为 `pushUpsertAlarm()`

**验证**:
- AlarmService 单元测试通过
- 编译无错误

**预计影响**: 1 个文件, ~5 行代码

---

### Task 3.3: 修改 pushBatchAlarms() 使用 alarm:batch 事件

**描述**: 更新批量告警推送方法,统一使用 `alarm:batch` 事件名

**文件**:
- `src/modules/alarm/alarm-push.service.ts`

**变更**:
1. 在 `pushBatchAlarms()` 方法中,确保事件名为 `alarm:batch`
2. 移除对 `broadcastAlarmCount()` 的调用

**验证**:
- 编译通过
- 方法推送正确事件

**预计影响**: 1 个文件, ~3 行代码

---

### Task 3.4: 修改 ImportService 告警推送

**描述**: 将 ImportService 中的历史告警推送改为使用 `pushBatchAlarms()`

**文件**:
- `src/modules/import/import.service.ts`

**变更**:
1. 找到推送历史告警的代码块(搜索 `alarm:historical-batch`)
2. 将直接调用 WebsocketGateway 的代码改为:
   ```typescript
   await this.alarmPushService.pushBatchAlarms(triggeredAlarms);
   ```

**验证**:
- ImportService 编译通过
- 不再直接推送 `alarm:historical-batch` 事件

**预计影响**: 1 个文件, ~5 行代码

---

### Task 3.5: 删除废弃的告警推送方法

**描述**: 删除 AlarmPushService 中已被取代的方法

**文件**:
- `src/modules/alarm/alarm-push.service.ts`

**变更**:
删除以下方法:
- `pushNewAlarm()`
- `pushAlarmStatusUpdate()`
- `broadcastAlarmCount()`

**验证**:
```bash
# 确认这些方法不再被调用
rg "pushNewAlarm|pushAlarmStatusUpdate|broadcastAlarmCount" --type ts
```

**预期结果**: 无调用点

**预计影响**: 1 个文件, ~60 行代码删除

---

## 阶段 4: 移除冗余事件

### Task 4.1: 删除 WebsocketGateway 中的 user:online/offline 广播

**描述**: 移除用户连接/断开时的事件广播

**文件**:
- `src/modules/websocket/websocket.gateway.ts`

**变更**:
1. 在 `handleConnection()` 方法中,删除以下代码:
   ```typescript
   this.server.to('role:Administrator').emit('user:online', {
     userId: auth.userId,
     username: auth.username,
     timestamp: new Date().toISOString(),
   });
   ```

2. 在 `handleDisconnect()` 方法中,删除以下代码:
   ```typescript
   this.server.to('role:Administrator').emit('user:offline', {
     userId: auth.userId,
     username: auth.username,
     timestamp: new Date().toISOString(),
   });
   ```

**验证**:
- WebsocketGateway 编译通过
- 日志中仍记录连接/断开信息

**预计影响**: 1 个文件, ~12 行代码删除

---

### Task 4.2: 废弃 EquipmentPushService 的设备状态变更方法

**描述**: 标记设备相关推送方法为废弃

**文件**:
- `src/modules/equipment/equipment-push.service.ts`

**变更**:
为以下方法添加 `@deprecated` 注释并记录警告:
- `pushStatusChange()`
- `pushEquipmentUpdate()`
- `pushEquipmentCreated()`
- `pushEquipmentDeleted()`
- `broadcastEquipmentOverview()`

每个方法添加:
```typescript
/**
 * @deprecated 已废弃 - 设备状态变更不再通过 WebSocket 推送
 * 请使用 REST API 获取最新设备信息
 */
async pushStatusChange(...): Promise<void> {
  this.logger.warn('警告: pushStatusChange() 已废弃');
  // 原有逻辑保持不变 (兼容性)
}
```

**验证**:
- 编译通过
- IDE 显示废弃警告

**预计影响**: 1 个文件, ~25 行代码

---

### Task 4.3: 移除对废弃方法的调用

**描述**: 搜索并移除项目中对这些废弃方法的所有调用

**文件**:
- 可能在 EquipmentService 或其他服务中

**验证**:
```bash
rg "pushStatusChange|pushEquipmentUpdate|pushEquipmentCreated|pushEquipmentDeleted|broadcastEquipmentOverview" --type ts
```

**预期结果**: 仅在 `equipment-push.service.ts` 中找到方法定义

**预计影响**: 可能涉及 1-3 个文件

---

## 阶段 5: 测试更新

### Task 5.1: 更新 MonitoringPushService 单元测试

**描述**: 确保单元测试覆盖新的推送逻辑

**文件**:
- `src/modules/monitoring/monitoring-push.service.spec.ts`

**变更**:
- 验证 `pushNewData()` 推送 `monitoring:new-data` 事件
- 验证消息包含正确的 `source` 字段

**验证**:
```bash
npm run test -- monitoring-push.service.spec.ts
```

**预计影响**: 1 个文件, ~10 行代码

---

### Task 5.2: 更新 AlarmPushService 单元测试

**描述**: 为新方法添加测试,删除旧方法的测试

**文件**:
- `src/modules/alarm/alarm-push.service.spec.ts`

**变更**:
1. 添加 `pushUpsertAlarm()` 测试用例:
   - 验证推送 `alarm:push` 事件
   - 验证消息格式
   - 验证推送范围(设备房间 + 角色房间)
2. 更新 `pushBatchAlarms()` 测试:
   - 验证事件名为 `alarm:batch`
3. 删除以下测试:
   - `pushNewAlarm()` 测试
   - `pushAlarmStatusUpdate()` 测试
   - `broadcastAlarmCount()` 测试

**验证**:
```bash
npm run test -- alarm-push.service.spec.ts
```

**预计影响**: 1 个文件, ~50 行代码

---

### Task 5.3: 更新 ImportService 单元测试

**描述**: 更新导入服务测试以验证新的推送逻辑

**文件**:
- `src/modules/import/import.service.spec.ts`

**变更**:
- 验证调用 `MonitoringPushService.pushNewData()`
- 验证调用 `AlarmPushService.pushBatchAlarms()`
- 移除对直接 WebSocket 推送的断言

**验证**:
```bash
npm run test -- import.service.spec.ts
```

**预计影响**: 1 个文件, ~20 行代码

---

### Task 5.4: 创建 E2E 测试 - WebSocket 事件重构验证

**描述**: 创建综合 E2E 测试验证新的事件体系

**文件**:
- `test/websocket/websocket-events-refactor.e2e-spec.ts` (新建)

**测试场景**:
1. **监测数据推送统一性**
   - 接收监测数据 → 验证推送 `monitoring:new-data`
   - 导入数据 → 验证推送 `monitoring:new-data`
   - 验证 `source` 字段正确
   
2. **告警推送统一性**
   - 创建告警 → 验证推送 `alarm:push`
   - 更新告警 → 验证推送 `alarm:push`
   - 批量导入告警 → 验证推送 `alarm:batch`
   
3. **废弃事件验证**
   - 监听所有废弃事件,验证不再发出:
     - `import:latest-data`
     - `equipment:data:realtime`
     - `alarm:new`, `alarm:update`, `alarm:historical-batch`
     - `alarm:count:update`
     - `user:online`, `user:offline`
     - `equipment:*` 系列事件

**验证**:
```bash
npm run test:e2e -- websocket-events-refactor.e2e-spec.ts
```

**预计影响**: 1 个新文件, ~300 行代码

---

## 阶段 6: 文档更新

### Task 6.1: 更新 WebSocket API 文档

**描述**: 更新 WebSocket 事件规范文档

**文件**:
- `docs/data/websocket_api_spec.md`

**变更**:
1. 移除已废弃事件的章节:
   - `import:latest-data`
   - `equipment:data:realtime`
   - `alarm:new`, `alarm:update`, `alarm:historical-batch`
   - `alarm:count:update`
   - `user:online`, `user:offline`
   - `equipment:*` 系列事件

2. 更新事件列表表格

3. 添加"已废弃事件"章节,列出迁移路径

**验证**:
- 文档格式正确
- 所有链接有效

**预计影响**: 1 个文件, ~200 行变更

---

### Task 6.2: 创建前端迁移指南

**描述**: 编写详细的前端迁移文档

**文件**:
- `docs/migrate/websocket-events-phase1-migration.md` (新建)

**内容**:
1. 变更概述
2. 事件映射表 (旧事件 → 新事件/替代方案)
3. 代码迁移示例 (重构前 vs 重构后)
4. 推荐迁移步骤
5. 常见问题 FAQ

**验证**:
- 文档清晰易懂
- 代码示例可运行

**预计影响**: 1 个新文件, ~150 行文档

---

### Task 6.3: 更新 CLAUDE.md

**描述**: 更新项目指导文档中的 WebSocket 架构说明

**文件**:
- `CLAUDE.md`

**变更**:
1. 更新"WebSocket Architecture"章节
2. 移除已废弃事件的说明
3. 添加事件统一性说明

**验证**:
- 文档准确反映新架构

**预计影响**: 1 个文件, ~30 行变更

---

## 阶段 7: 验证与发布

### Task 7.1: 运行完整测试套件

**描述**: 确保所有测试通过

**命令**:
```bash
npm run test              # 单元测试
npm run test:e2e          # E2E 测试
npm run lint              # 代码检查
npm run build             # 构建验证
```

**验证**: 所有测试通过,无编译错误

---

### Task 7.2: 代码审查检查清单

**描述**: 在合并前进行自我审查

**检查项**:
- [ ] 所有 `import:latest-data` 调用已移除
- [ ] 所有 `equipment:data:realtime` 调用已移除
- [ ] 所有 `alarm:new/update/historical-batch` 调用已移除
- [ ] 所有 `alarm:count:update` 调用已移除
- [ ] 所有 `user:online/offline` 调用已移除
- [ ] 所有 `equipment:*` 事件调用已移除或标记废弃
- [ ] MonitoringPushService 是数据推送唯一出口
- [ ] AlarmPushService 使用 `pushUpsertAlarm()` 和 `pushBatchAlarms()`
- [ ] 单元测试覆盖率未下降
- [ ] E2E 测试验证新事件体系
- [ ] 文档已更新

---

### Task 7.3: 创建 PR 并合并

**描述**: 提交 Pull Request

**PR 描述模板**:
```markdown
## WebSocket 事件重构 - 第一阶段

### 变更摘要
- ✅ 统一监测数据推送到 `monitoring:new-data`
- ✅ 合并告警事件为 `alarm:push` 和 `alarm:batch`
- ✅ 移除冗余事件 (user:online/offline, equipment:*, alarm:count:update)

### 破坏性变更
详见 `docs/migrate/websocket-events-phase1-migration.md`

### 测试
- [x] 单元测试通过
- [x] E2E 测试通过
- [x] 手动测试验证

### 前端团队行动
请前端团队参考迁移指南更新事件监听逻辑
```

**验证**:
- PR 描述完整
- CI/CD 管道通过
- 代码审查通过

---

## 依赖关系图

```
阶段 1 (准备)
    ↓
阶段 2 (统一监测数据推送)
    ↓
阶段 3 (统一告警推送)
    ↓
阶段 4 (移除冗余事件)
    ↓
阶段 5 (测试更新) ← 可并行执行各子任务
    ↓
阶段 6 (文档更新) ← 可并行执行各子任务
    ↓
阶段 7 (验证与发布)
```

**可并行执行的任务**:
- Task 5.1, 5.2, 5.3 可并行
- Task 6.1, 6.2, 6.3 可并行

**关键路径**: 阶段 1 → 2 → 3 → 4 → 5.4 (E2E 测试) → 7

**预计总工作量**: 约 2-3 个开发日
