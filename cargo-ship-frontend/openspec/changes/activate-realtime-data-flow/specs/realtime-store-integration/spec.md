# Realtime Store Integration（实时数据 Store 集成）

## ADDED Requirements

### Requirement: WebSocket 事件监听注册

所有需要实时数据的 Zustand stores MUST 在初始化时向 `realtimeService` 注册事件监听器，并在适当时机清理监听器。

#### Scenario: monitoring-store 注册监听器

**Given** `monitoring-store` 已初始化
**When** store 创建时
**Then**
- 应向 `realtimeService` 注册 `monitoring:new-data` 事件的监听器
- 应向 `realtimeService` 注册 `connection:status` 事件的监听器
- 监听器应能接收类型安全的事件负载

#### Scenario: alarms-store 注册监听器

**Given** `alarms-store` 已初始化
**When** store 创建时
**Then**
- 应向 `realtimeService` 注册 `alarm:push` 事件的监听器
- 应向 `realtimeService` 注册 `alarm:batch` 事件的监听器
- 应向 `realtimeService` 注册 `alarm:trend` 事件的监听器
- 应向 `realtimeService` 注册 `connection:status` 事件的监听器

#### Scenario: health-store 注册监听器

**Given** `health-store` 已初始化
**When** store 创建时
**Then**
- 应向 `realtimeService` 注册 `equipment:health:update` 事件的监听器
- 应向 `realtimeService` 注册 `equipment:health:warning` 事件的监听器
- 应向 `realtimeService` 注册 `connection:status` 事件的监听器

---

### Requirement: 实时数据状态更新

当 stores 接收到 WebSocket 推送的实时数据时，MUST 以类型安全、不可变的方式更新其内部状态。

#### Scenario: monitoring-store 处理新监测数据

**Given** `monitoring-store` 已注册 `monitoring:new-data` 监听器
**And** WebSocket 推送了一条新的监测数据
**When** `handleMonitoringNewData` 回调被触发
**Then**
- 应根据 `equipmentId` 和 `metricType` 计算数据索引键（格式：`${equipmentId}-${metricType}`）
- 应将 `MonitoringDataPayload` 转换为 `UnifiedMonitoringData` 类型
- 应将新数据点追加到对应索引键的数据数组中（不可变更新）
- 应更新设备的最后在线时间（`devices[equipmentId].lastSeen`）
- 不应修改现有数据点

#### Scenario: alarms-store 处理新告警推送

**Given** `alarms-store` 已注册 `alarm:push` 监听器
**And** WebSocket 推送了一条新告警（`status === 'pending'`）
**When** `handleAlarmPush` 回调被触发
**Then**
- 应将 `AlarmPushPayload` 转换为 `Alarm` 类型
- 应将新告警插入到 `items` 数组的开头（最新的在前）
- 应更新 `pendingAlarms` 列表（如果告警状态为 `pending`）
- 应根据严重程度更新 `criticalAlarms` 或 `emergencyAlarms` 列表
- 应更新告警统计数据（`statistics`）
- 应触发 UI 通知（对于 `critical` 和 `high` 级别告警）

#### Scenario: alarms-store 处理告警状态更新

**Given** `alarms-store` 已注册 `alarm:push` 监听器
**And** WebSocket 推送了一条告警更新（`status !== 'pending'`）
**When** `handleAlarmPush` 回调被触发
**Then**
- 应在 `items` 数组中查找对应的告警（按 `id` 匹配）
- 应更新该告警的状态、处理人、处理时间等字段
- 应从 `pendingAlarms` 列表中移除（如果状态不再是 `pending`）
- 应更新统计数据
- 不应创建新的告警记录

#### Scenario: health-store 处理健康评分更新

**Given** `health-store` 已注册 `equipment:health:update` 监听器
**And** WebSocket 推送了一条健康评分更新
**When** `handleHealthUpdate` 回调被触发
**Then**
- 应将 `EquipmentHealthUpdatePayload` 转换为 `HealthReport` 类型
- 应更新 `reports[equipmentId]` 的值
- 应更新 `lastUpdated` 时间戳
- 应替换旧的健康报告（而非追加）

---

### Requirement: 数据转换与类型安全

从 WebSocket Payload 到 Store 数据模型的转换 MUST 通过明确定义的转换函数完成，确保类型安全和数据一致性。

#### Scenario: 转换监测数据 Payload

**Given** 接收到一个 `MonitoringDataPayload` 对象
**When** 调用 `transformPayloadToMonitoringData(payload)` 函数
**Then**
- 应返回一个符合 `UnifiedMonitoringData` 类型的对象
- 应将 ISO 8601 格式的 `timestamp` 字符串转换为 Unix 时间戳（毫秒）
- 应保留所有原始字段（`id`、`equipmentId`、`value`、`unit` 等）
- 应处理缺失字段，提供合理的默认值
- 不应抛出异常（使用 try-catch 捕获错误）

#### Scenario: 转换告警 Payload

**Given** 接收到一个 `AlarmPushPayload` 对象
**When** 调用 `mapPayloadToAlarm(payload)` 函数
**Then**
- 应返回一个符合 `Alarm` 类型的对象
- 应将 `severity` 字符串转换为 `AlertSeverity` 枚举
- 应将 `status` 字符串转换为 `AlarmStatus` 枚举
- 应将时间戳字符串转换为 Unix 时间戳
- 应处理可选字段（如 `handler`、`handleNote`），使用 `undefined` 作为默认值

#### Scenario: 转换健康评分 Payload

**Given** 接收到一个 `EquipmentHealthUpdatePayload` 对象
**When** 调用 `transformPayloadToHealthReport(payload)` 函数
**Then**
- 应返回一个符合 `HealthReport` 类型的对象
- 应将 `grade` 字符串映射为对应的健康状态（`healthy` | `warning` | `critical`）
- 应将 `calculatedAt` 时间戳转换为 `lastUpdated` 字段
- 应保留 `score`、`soh`、`trend` 等字段

---

### Requirement: 性能优化与资源管理

实时数据流的集成 MUST 考虑性能优化，避免高频数据推送导致的性能问题和内存泄漏。

#### Scenario: 批量更新高频监测数据

**Given** `monitoring-store` 接收高频的 `monitoring:new-data` 事件（每秒 100+ 个数据点）
**When** 在 1 秒时间窗口内接收到多个数据点
**Then**
- 应将这些数据点收集到缓冲区（`pendingUpdates` 数组）
- 应在时间窗口结束时（1 秒后）批量更新 store 状态
- 应清空缓冲区和重置定时器
- 单次批量更新的处理时间应少于 50ms
- UI 重渲染频率应控制在每秒 1-2 次

#### Scenario: 限制数据存储上限

**Given** `monitoring-store` 持续接收某设备的实时数据
**And** 该设备-指标组合的数据点数量已达到上限（1000 个）
**When** 接收到新的数据点
**Then**
- 应删除该组合中最旧的数据点（FIFO 策略）
- 应插入新的数据点
- 数据点总数应保持不变（不超过 1000 个）
- 应避免内存无限增长

#### Scenario: 清理事件监听器

**Given** 应用即将卸载或用户退出登录
**When** 调用 store 的 `cleanup()` 方法（如果存在）
**Then**
- 应调用 `realtimeService.off()` 移除所有已注册的监听器
- 应清空内部缓冲区（`pendingUpdates`）
- 应取消所有定时器（`updateTimer`）
- 不应导致内存泄漏

---

### Requirement: 连接状态管理

Stores MUST 能够感知 WebSocket 连接状态的变化，并在 UI 中反映连接状态。

#### Scenario: 更新连接状态

**Given** `monitoring-store` 已注册 `connection:status` 监听器
**When** `realtimeService` 触发 `connection:status` 事件（`{ connected: true }`）
**Then**
- 应更新 `realtimeConnected` 状态为 `true`
- UI 应显示"已连接"指示器（如绿色圆点）

#### Scenario: 处理连接断开

**Given** `monitoring-store` 已注册 `connection:status` 监听器
**When** `realtimeService` 触发 `connection:status` 事件（`{ connected: false, error: 'Network error' }`）
**Then**
- 应更新 `realtimeConnected` 状态为 `false`
- UI 应显示"连接断开"指示器（如红色圆点或警告图标）
- 应显示用户提示："实时连接已断开，正在重连..."

#### Scenario: 连接恢复后刷新数据

**Given** WebSocket 连接断开后重新连接
**And** 连接断开期间可能有数据丢失
**When** `connection:status` 事件表明连接已恢复（`{ connected: true }`）
**Then**
- 可选：应主动查询最近 N 分钟的数据，填补断线期间的空白
- 应显示用户提示："连接已恢复"

---

### Requirement: 离线消息处理

当用户重新连接后接收到缓冲的离线消息时，应用 SHALL 能识别并适当处理这些消息。

#### Scenario: 识别离线告警

**Given** `alarms-store` 接收到 `alarm:batch` 事件
**And** Payload 中的告警包含 `buffered: true` 标记
**When** 批量插入告警到 `items` 列表
**Then**
- 应记录离线消息数量
- 应显示用户提示："您有 X 条离线期间产生的告警"
- 可选：提供"查看全部"按钮跳转到告警页面

#### Scenario: 识别离线监测数据

**Given** `monitoring-store` 接收到 `monitoring:new-data` 事件
**And** Payload 包含 `buffered: true` 标记（如果后端支持）
**When** 处理数据点时
**Then**
- 应正常插入数据点
- 可选：在数据点上添加"离线数据"标记
- 可选：在图表中用不同颜色或样式显示离线期间的数据

---

## 关联关系

- **依赖**：REQ-RTS-001（来自 `scaffold-realtime-service`，假设存在）- RealtimeService 基础实现
- **依赖**：REQ-MS-001（假设存在）- Monitoring Store 基础结构
- **依赖**：REQ-AS-001（假设存在）- Alarms Store 基础结构
- **依赖**：REQ-HS-001（假设存在）- Health Store 基础结构

---

## 实现指导

### 推荐的实现顺序

1. 实现数据转换函数（REQ-RSI-003）
2. 实现事件监听注册（REQ-RSI-001）
3. 实现状态更新逻辑（REQ-RSI-002）
4. 实现性能优化（REQ-RSI-004）
5. 实现连接状态管理（REQ-RSI-005）
6. 实现离线消息处理（REQ-RSI-006）

### 技术约束

- 所有转换函数必须使用 `try-catch` 捕获异常
- 不可变更新必须使用扩展运算符（`...`）或 `Zustand` 的内置机制
- 批量更新的时间窗口默认为 1 秒，可根据性能测试结果调整
- 数据存储上限默认为 1000 个数据点/设备-指标组合，可配置

### 测试覆盖要求

- 所有转换函数必须有单元测试，覆盖正常和异常情况
- 状态更新逻辑必须有集成测试，验证 store 状态变化
- 性能优化逻辑必须有性能测试，验证批量更新和内存管理
- 端到端测试必须覆盖完整的数据流路径（WebSocket → Store → UI）
