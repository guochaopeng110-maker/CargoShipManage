# Change: 添加实时监测数据 WebSocket 推送

## Why

前端需要实时展示所有进入系统的监测数据流，而不仅仅是触发告警的数据。这将为用户提供：

1. **实时设备运行状态可视化** - 用户可以看到设备的实时指标变化，无需刷新页面
2. **更全面的数据监控视图** - 不局限于告警数据，所有正常数据也能实时呈现
3. **更好的用户体验** - 动态数据流展示增强了系统的专业性和实时性
4. **与告警推送功能一致** - 系统已有告警推送机制（`AlarmPushService`），监测数据推送遵循相同的架构模式

当前系统仅在触发告警时推送消息（`alarm:new` 事件），正常监测数据保存后不进行任何推送，前端只能通过轮询 API 获取最新数据，这不符合实时监控系统的用户期望。

## What Changes

### 核心变更

1. **新增 `MonitoringPushService`** （src/modules/monitoring/monitoring-push.service.ts）
   - 负责监测数据的 WebSocket 推送逻辑
   - 遵循现有的推送服务架构模式（参考 `AlarmPushService` 和 `EquipmentPushService`）
   - 定义新的 WebSocket 事件：`monitoring:new-data`

2. **修改 `MonitoringService.receiveMonitoringData`**
   - 在成功保存 `TimeSeriesData` 后，调用 `MonitoringPushService.pushNewData()`
   - 保持异步推送模式，不影响数据接收性能

3. **修改 `MonitoringModule`**
   - 注册 `MonitoringPushService` 为提供者
   - 导入 `WebsocketModule` 以获得 WebSocket 网关访问权限

4. **新增单元测试**
   - `monitoring-push.service.spec.ts` - 测试推送服务的各种场景

### WebSocket 事件规范

**事件名称**: `monitoring:new-data`

**推送范围**: 订阅了对应设备房间的用户（`equipment:{equipmentId}`）

**消息格式**:
```json
{
  "id": 123456,
  "equipmentId": "uuid-string",
  "timestamp": "2025-12-08T10:30:00.000Z",
  "metricType": "voltage",
  "monitoringPoint": "总电压",
  "value": 24.5,
  "unit": "V",
  "quality": "normal",
  "source": "sensor-upload"
}
```

### 推送策略

- **房间隔离**: 仅推送给订阅了特定设备房间（`equipment:{equipmentId}`）的用户
- **权限控制**: 依赖现有的 WebSocket 认证和房间订阅机制，用户只能订阅其有权限访问的设备
- **不推送低质量数据**: 仅推送 `quality === 'normal'` 的数据，避免无效数据干扰前端展示（可选策略）

## Impact

### 受影响的规范（Specs）
- **新增 Spec**: `realtime-monitoring` - 实时监测数据推送能力

### 受影响的代码

**新增文件**:
- `src/modules/monitoring/monitoring-push.service.ts`
- `src/modules/monitoring/monitoring-push.service.spec.ts`

**修改文件**:
- `src/modules/monitoring/monitoring.service.ts` - 在 `receiveMonitoringData` 中添加推送调用
- `src/modules/monitoring/monitoring.module.ts` - 注册新服务，导入 WebsocketModule

### 性能影响

- **最小开销**: 推送操作是异步执行，不阻塞数据保存流程
- **网络流量**: 每条监测数据约 200-300 字节，高频设备（如每秒1条）每分钟约 12-18 KB
- **扩展性**: 使用房间机制隔离推送范围，仅订阅用户接收数据，避免广播风暴

### 向后兼容性

- ✅ **完全向后兼容** - 仅新增功能，不修改现有 API 或数据结构
- ✅ **前端可选** - 前端可选择订阅或忽略 `monitoring:new-data` 事件
- ✅ **无破坏性变更** - 现有的告警推送、数据查询等功能不受影响

### 测试影响

- 需新增推送服务单元测试
- 现有 MonitoringService 测试需确认不受影响（推送是异步的，不影响返回值）
