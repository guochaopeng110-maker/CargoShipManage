# 历史告警 WebSocket 推送修复

## 问题描述

在数据导入功能中，虽然历史数据的告警评估已经实现（断点 C），但缺少关键的最后一步：**将生成的历史告警推送通知给前端客户端**。

用户无法实时感知到：
- 历史数据分析已完成
- 产生了多少条新告警
- 哪些设备触发了告警

## 修复方案

### 1. 修改 `evaluateAlarmsForImportedData` 方法

**位置**: `src/modules/import/import.service.ts:347`

**改动**:
- 返回类型从 `Promise<void>` 改为 `Promise<AlarmRecord[]>`
- 添加 `allTriggeredAlarms` 数组收集所有触发的告警
- 在方法末尾返回收集的告警列表

```typescript
private async evaluateAlarmsForImportedData(
  dataList: TimeSeriesData[],
): Promise<AlarmRecord[]> {
  // ...
  const allTriggeredAlarms: AlarmRecord[] = [];
  
  for (const data of dataList) {
    const triggeredAlarms = await this.alarmService.evaluateThresholds(data);
    if (triggeredAlarms.length > 0) {
      allTriggeredAlarms.push(...triggeredAlarms); // 收集告警
    }
  }
  
  return allTriggeredAlarms;
}
```

### 2. 更新导入流程以推送告警

**位置**: `src/modules/import/import.service.ts:320`

**改动**:
- 捕获 `evaluateAlarmsForImportedData` 返回的告警列表
- 调用新方法 `pushHistoricalAlarmsToWebSocket` 推送告警

```typescript
// 告警回溯评估
const triggeredAlarms = await this.evaluateAlarmsForImportedData(savedDataList);

// 推送历史告警到 WebSocket
if (triggeredAlarms.length > 0) {
  await this.pushHistoricalAlarmsToWebSocket(triggeredAlarms);
}
```

### 3. 实现 `pushHistoricalAlarmsToWebSocket` 方法

**位置**: `src/modules/import/import.service.ts:488`

**功能**:
1. **批量推送给管理员和运维人员**
   - 使用 `AlarmPushService.pushBatchAlarms()` 方法
   - 自动推送到 `role:administrator` 和 `role:operator` 房间
   - 触发告警计数徽章更新 (`alarm:count:update`)

2. **单独推送给订阅设备的用户**
   - 按设备分组告警
   - 推送到每个设备房间 (`equipment:${equipmentId}`)
   - 事件名称: `alarm:historical-batch`

3. **最大努力模式**
   - 推送失败不影响导入成功状态
   - 记录详细的错误日志

```typescript
private async pushHistoricalAlarmsToWebSocket(
  alarms: AlarmRecord[],
): Promise<void> {
  // 1. 批量推送给管理员和运维人员
  await this.alarmPushService.pushBatchAlarms(alarms);
  
  // 2. 按设备分组
  const alarmsByEquipment = new Map<string, AlarmRecord[]>();
  alarms.forEach((alarm) => {
    if (!alarmsByEquipment.has(alarm.equipmentId)) {
      alarmsByEquipment.set(alarm.equipmentId, []);
    }
    alarmsByEquipment.get(alarm.equipmentId)!.push(alarm);
  });
  
  // 3. 推送到设备房间
  for (const [equipmentId, deviceAlarms] of alarmsByEquipment) {
    this.websocketGateway.sendToEquipment(
      equipmentId,
      'alarm:historical-batch',
      {
        equipmentId,
        alarms: deviceAlarms.map((alarm) => ({...})),
        count: deviceAlarms.length,
        source: 'historical-import',
      }
    );
  }
}
```

### 4. 依赖注入

**位置**: `src/modules/import/import.service.ts:1,45`

**改动**:
- 导入 `AlarmRecord` 实体
- 导入 `AlarmPushService`
- 在构造函数中注入 `AlarmPushService`

```typescript
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { AlarmPushService } from '../alarm/alarm-push.service';

constructor(
  // ...
  private readonly alarmPushService: AlarmPushService,
  // ...
) {}
```

## WebSocket 事件说明

### 事件 1: `alarm:batch` (给管理员/运维)

**房间**: `role:administrator`, `role:operator`

**消息格式**:
```json
{
  "alarms": [
    {
      "id": "...",
      "equipmentId": "SYS-BAT-001",
      "severity": "high",
      "metricType": "voltage",
      "monitoringPoint": "总电压",
      "faultName": "总压过压",
      "recommendedAction": "立即检查电池组",
      "triggeredAt": "2025-01-01T10:00:00.000Z",
      "status": "pending"
    }
  ],
  "count": 15
}
```

### 事件 2: `alarm:historical-batch` (给设备订阅者)

**房间**: `equipment:${equipmentId}`

**消息格式**:
```json
{
  "equipmentId": "SYS-BAT-001",
  "alarms": [...],
  "count": 8,
  "source": "historical-import",
  "timestamp": "2025-12-09T12:00:00.000Z"
}
```

### 事件 3: `alarm:count:update` (全局广播)

**房间**: 全局

**消息格式**:
```json
{
  "timestamp": "2025-12-09T12:00:00.000Z",
  "message": "告警数据已更新，请刷新"
}
```

## 日志输出

```
开始对 1000 条导入数据进行告警回溯评估...
数据 [设备=SYS-BAT-001, 监测点=总电压, 时间=2025-01-01T10:00:00.000Z] 触发 1 条告警
告警回溯评估完成: 总数据=1000, 成功评估=998, 触发告警=15, 评估失败=2

开始推送 15 条历史告警到 WebSocket (来自数据导入)...
设备 SYS-BAT-001 的 8 条历史告警已推送到设备房间
设备 SYS-MOT-L-001 的 7 条历史告警已推送到设备房间
历史告警推送完成: 总告警=15, 涉及设备=2, 设备推送成功=2
```

## 前端集成建议

### 1. 监听历史告警批量事件

```typescript
socket.on('alarm:historical-batch', (data) => {
  console.log(`设备 ${data.equipmentId} 产生 ${data.count} 条历史告警`);
  
  // 显示通知
  showNotification({
    title: '历史数据分析完成',
    message: `发现 ${data.count} 条告警，请及时处理`,
    type: 'warning',
  });
  
  // 刷新告警列表
  refreshAlarmList();
});
```

### 2. 监听告警计数更新

```typescript
socket.on('alarm:count:update', () => {
  // 刷新告警徽章
  fetchAlarmCount();
});
```

### 3. 订阅特定设备

```typescript
// 订阅设备告警
socket.emit('subscribe:equipment', { equipmentId: 'SYS-BAT-001' });

// 取消订阅
socket.emit('unsubscribe:equipment', { equipmentId: 'SYS-BAT-001' });
```

## 测试验证

### 1. 单元测试（建议添加）

```typescript
describe('ImportService - Historical Alarm Push', () => {
  it('should push historical alarms after import', async () => {
    const alarmPushService = moduleRef.get(AlarmPushService);
    const spy = jest.spyOn(alarmPushService, 'pushBatchAlarms');
    
    await importService.executeImport(importRecordId, data, true);
    
    expect(spy).toHaveBeenCalled();
  });
});
```

### 2. E2E 测试（建议添加）

```typescript
it('should receive historical alarms via WebSocket', (done) => {
  const client = io('http://localhost:3000/ws', {
    auth: { token: adminToken }
  });
  
  client.on('alarm:batch', (data) => {
    expect(data.alarms).toBeDefined();
    expect(data.count).toBeGreaterThan(0);
    done();
  });
  
  // 上传并导入带有异常数据的文件
  request(app)
    .post('/api/imports/upload-and-import')
    .attach('file', 'test-data-with-alarms.xlsx')
    .expect(201);
});
```

### 3. 手动测试步骤

1. 启动服务器: `npm run start:dev`
2. 使用 WebSocket 客户端连接到 `/ws` 命名空间
3. 使用管理员 token 进行认证
4. 订阅 `alarm:batch` 和 `alarm:historical-batch` 事件
5. 通过 API 上传包含异常数据的文件
6. 验证是否收到历史告警推送

## 影响范围

### 修改的文件
- `src/modules/import/import.service.ts`

### 依赖的模块
- `AlarmService` (已存在)
- `AlarmPushService` (已存在)
- `WebsocketGateway` (已存在)

### 向后兼容性
- ✅ 完全向后兼容
- ✅ 不影响现有 API
- ✅ 不影响数据库结构
- ✅ 前端可选择性监听新事件

## 性能考虑

### 1. 批量推送优化
- 使用 `pushBatchAlarms` 方法一次性推送多条告警
- 避免循环调用 `pushNewAlarm` 造成网络拥堵

### 2. 内存管理
- 告警数组在推送后立即释放
- 使用 Map 进行设备分组，避免多次遍历

### 3. 错误隔离
- 单个设备推送失败不影响其他设备
- 整体推送失败不影响导入成功状态

## 后续优化建议

### 1. 智能去重
如果同一设备在短时间内产生大量相同类型的告警，可以考虑：
- 合并相似告警
- 只推送告警摘要

### 2. 优先级推送
根据告警严重程度调整推送策略：
- 严重告警：立即推送
- 一般告警：批量推送

### 3. 离线消息缓冲
如果用户离线，WebSocket Gateway 已有消息缓冲机制，但可以考虑：
- 将历史告警持久化到用户消息队列
- 用户上线时批量推送

## 相关文档

- [Import Module 文档](../CLAUDE.md#data-import-module)
- [WebSocket Architecture](../CLAUDE.md#websocket-architecture)
- [Alarm Push Service](../../src/modules/alarm/alarm-push.service.ts)
