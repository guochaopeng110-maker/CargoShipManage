# WebSocket API 规范文档

## 概述

本文档描述了货船智能机舱管理系统后端提供的所有 WebSocket API 接口。WebSocket 服务基于 Socket.io 实现，支持实时双向通信、房间机制、自动重连和消息缓冲。

**WebSocket 连接信息:**
- **命名空间**: `/ws`
- **传输方式**: `websocket`, `polling`
- **认证方式**: JWT Token (通过握手的 `auth.token` 或 `Authorization` header)

---

## 连接认证

### 客户端连接示例

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});

// 监听连接成功事件
socket.on('connected', (data) => {
  console.log('连接成功:', data);
});
```

---

## 服务端到客户端事件 (Server-to-Client Events)

### 1. 连接管理事件

#### 1.1 `connected` - 连接成功

**说明**: 客户端成功连接并通过认证后，服务器发送的欢迎消息。

**目标**: 单个客户端

**数据结构**:
```json
{
  "message": "连接成功",
  "userId": "user-123",
  "username": "admin",
  "timestamp": "2025-12-09T12:00:00.000Z"
}
```

---

### 2. 告警相关事件

#### 2.1 `alarm:push` - 告警推送（创建或更新）

**说明**: 统一的告警推送事件，用于新告警创建和状态更新。取代了原有的 `alarm:new` 和 `alarm:update` 事件。

**目标**: 
- 严重/高级告警: `role:administrator`, `role:operator`, `equipment:{equipmentId}`
- 中低级告警: `equipment:{equipmentId}`

**数据结构**:
```json
{
  "id": "alarm-uuid-123",
  "equipmentId": "SYS-BAT-001",
  "severity": "high",
  "severityText": "高",
  "metricType": "voltage",
  "abnormalValue": 680.5,
  "thresholdRange": "上限: 650V",
  "triggeredAt": "2025-12-09T10:30:00.000Z",
  "status": "pending",
  "statusText": "待处理",
  "timestamp": "2025-12-09T10:30:01.000Z",
  "monitoringPoint": "总电压",
  "faultName": "总压过压",
  "recommendedAction": "立即检查电池组，停止充电",
  "handler": null,
  "handledAt": null,
  "handleNote": null
}
```

**字段说明**:
- `severity`: 告警严重程度 (`low`, `medium`, `high`, `critical`)
- `status`: 告警状态 (`pending`, `processing`, `resolved`, `ignored`)
- `monitoringPoint`: 监测点名称（业务层面，如"总电压"）
- `faultName`: 故障名称（如"总压过压"）
- `recommendedAction`: 建议处理措施
- `handler`: 处理人 ID（仅已处理告警）
- `handledAt`: 处理时间（仅已处理告警）
- `handleNote`: 处理备注（仅已处理告警）

**使用场景**:
- **新告警**: 首次触发时推送，`status` 为 `pending`
- **状态更新**: 告警状态变化时推送，包含处理信息

#### 2.2 `alarm:batch` - 批量告警推送

**说明**: 批量推送多条告警（用于历史数据导入或批量操作）。取代了原有的 `alarm:historical-batch` 事件。

**目标**: 
- `role:administrator`
- `role:operator`

**数据结构**:
```json
{
  "alarms": [
    {
      "id": "alarm-uuid-123",
      "equipmentId": "SYS-BAT-001",
      "severity": "high",
      "severityText": "高",
      "metricType": "voltage",
      "abnormalValue": 680.5,
      "thresholdRange": "上限: 650V",
      "triggeredAt": "2025-12-09T10:30:00.000Z",
      "status": "pending",
      "monitoringPoint": "总电压",
      "faultName": "总压过压",
      "recommendedAction": "立即检查电池组"
    }
  ],
  "count": 15
}
```

#### 2.3 `alarm:trend` - 告警趋势数据

**说明**: 推送设备的告警趋势统计数据。

**目标**: `equipment:{equipmentId}`

**数据结构**:
```json
{
  "equipmentId": "SYS-BAT-001",
  "period": "7d",
  "totalAlarms": 15,
  "criticalCount": 2,
  "highCount": 5,
  "mediumCount": 6,
  "lowCount": 2,
  "trend": "increasing"
}
```

**已废弃的告警事件**:
- ~~`alarm:new`~~ - 已由 `alarm:push` 替代
- ~~`alarm:update`~~ - 已由 `alarm:push` 替代
- ~~`alarm:historical-batch`~~ - 已由 `alarm:batch` 替代
- ~~`alarm:count:update`~~ - 已移除，客户端应使用轮询或主动查询

---

### 3. 监测数据相关事件

#### 3.1 `monitoring:new-data` - 新监测数据推送

**说明**: 实时推送设备的最新监测数据。这是监测数据的统一推送事件，取代了 `equipment:data:realtime` 和 `import:latest-data`。

**目标**: `equipment:{equipmentId}`

**数据结构**:
```json
{
  "id": 12345,
  "equipmentId": "SYS-BAT-001",
  "timestamp": "2025-12-09T12:00:00.000Z",
  "metricType": "voltage",
  "monitoringPoint": "总电压",
  "value": 650.5,
  "unit": "V",
  "quality": "normal",
  "source": "sensor-upload"
}
```

**字段说明**:
- `metricType`: 物理指标类型 (`voltage`, `current`, `temperature`, `soc` 等)
- `monitoringPoint`: 业务监测点名称（如 "总电压"、"单体最高温度"）
- `quality`: 数据质量 (`normal`, `abnormal`, `suspicious`)
- `source`: 数据来源 (`sensor-upload`, `manual-entry`, `file-import` 等)

**使用场景**:
- 传感器实时上传数据
- 手动录入数据
- 批量导入后推送最新数据点

**已废弃的监测数据事件**:
- ~~`equipment:data:realtime`~~ - 已由 `monitoring:new-data` 替代
- ~~`import:latest-data`~~ - 已由 `monitoring:new-data` 替代

---

### 4. 设备相关事件

#### 4.1 `equipment:health:update` - 设备健康评分更新

**说明**: 设备健康评分计算完成后推送。

**目标**: `equipment:{equipmentId}`

**数据结构**:
```json
{
  "equipmentId": "SYS-BAT-001",
  "score": 85.5,
  "grade": "Good",
  "gradeText": "良好",
  "soh": 92.3,
  "trend": "stable",
  "calculatedAt": "2025-12-09T12:00:00.000Z",
  "timestamp": "2025-12-09T12:00:01.000Z"
}
```

**字段说明**:
- `score`: 健康评分 (0-100)
- `grade`: 健康等级 (`Excellent`, `Good`, `Fair`, `Poor`, `Critical`)
- `soh`: 健康状态 (State of Health)
- `trend`: 趋势 (`improving`, `stable`, `declining`)

#### 4.2 `equipment:health:warning` - 设备健康预警

**说明**: 设备健康评分低于 60 时，通知管理员。

**目标**: `role:administrator`

**数据结构**:
```json
{
  "equipmentId": "SYS-BAT-001",
  "score": 55.2,
  "grade": "Poor",
  "gradeText": "较差",
  "soh": 68.5,
  "trend": "declining",
  "calculatedAt": "2025-12-09T12:00:00.000Z",
  "timestamp": "2025-12-09T12:00:01.000Z"
}
```

**已废弃的设备事件**:
- ~~`equipment:status:change`~~ - 已废弃，设备状态变化不再通过 WebSocket 推送
- ~~`equipment:status:critical`~~ - 已废弃，设备异常状态不再通过 WebSocket 推送
- ~~`equipment:update`~~ - 已废弃，设备信息更新不再通过 WebSocket 推送
- ~~`equipment:created`~~ - 已废弃，设备创建不再通过 WebSocket 推送
- ~~`equipment:deleted`~~ - 已废弃，设备删除不再通过 WebSocket 推送
- ~~`equipment:overview:update`~~ - 已废弃，设备概览更新不再通过 WebSocket 推送

**迁移建议**: 对于设备状态和信息变更，客户端应使用轮询或在用户操作后主动刷新数据。

---

## 客户端到服务端事件 (Client-to-Server Events)

### 1. 房间订阅管理

#### 1.1 `subscribe:equipment` - 订阅设备房间

**说明**: 客户端订阅特定设备的实时更新。

**请求数据**:
```json
{
  "equipmentId": "SYS-BAT-001"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "成功订阅设备 SYS-BAT-001",
  "room": "equipment:SYS-BAT-001"
}
```

**使用示例**:
```javascript
socket.emit('subscribe:equipment', { equipmentId: 'SYS-BAT-001' }, (response) => {
  console.log(response.message);
});
```

#### 1.2 `unsubscribe:equipment` - 取消订阅设备房间

**说明**: 客户端取消订阅特定设备。

**请求数据**:
```json
{
  "equipmentId": "SYS-BAT-001"
}
```

**响应数据**:
```json
{
  "success": true,
  "message": "成功取消订阅设备 SYS-BAT-001"
}
```

**使用示例**:
```javascript
socket.emit('unsubscribe:equipment', { equipmentId: 'SYS-BAT-001' }, (response) => {
  console.log(response.message);
});
```

---

### 2. 心跳检测

#### 2.1 `ping` - 心跳请求

**说明**: 客户端发送心跳检测服务器连接状态。

**请求数据**: 无

**响应数据**:
```json
{
  "event": "pong",
  "data": {
    "timestamp": 1702123456789
  }
}
```

**使用示例**:
```javascript
socket.emit('ping', (response) => {
  console.log('延迟:', Date.now() - response.data.timestamp, 'ms');
});
```

---

## 房间机制说明

### 自动加入的房间

客户端连接成功后，会自动加入以下房间：

1. **用户房间**: `user:{userId}`
   - 用于向特定用户推送消息

2. **角色房间**: `role:{roleName}`
   - 根据用户角色自动加入
   - 可能的角色: `administrator`, `operator`, `viewer`

### 手动订阅的房间

1. **设备房间**: `equipment:{equipmentId}`
   - 通过 `subscribe:equipment` 事件订阅
   - 通过 `unsubscribe:equipment` 事件取消订阅
   - 接收特定设备的实时数据和状态更新

---

## 离线消息缓冲机制

### 缓冲策略

- **最大缓冲数量**: 100 条消息/用户
- **缓冲对象**: 离线用户的消息
- **发送时机**: 用户重新连接时自动发送
- **缓冲标识**: 缓冲消息会附加 `buffered: true` 字段

### 示例

```javascript
socket.on('alarm:new', (data) => {
  if (data.buffered) {
    console.log('这是一条离线期间产生的告警');
  }
});
```

---

## 错误处理

### 认证失败

**错误消息**: `认证失败：缺少token` 或 `认证失败：无效的token`

**处理建议**: 
- 检查 JWT token 是否有效
- 重新登录获取新 token
- 使用正确的认证方式连接

### 连接示例（带错误处理）

```javascript
const socket = io('http://localhost:3000/ws', {
  auth: {
    token: localStorage.getItem('accessToken')
  },
  transports: ['websocket', 'polling']
});

socket.on('connect_error', (error) => {
  console.error('连接失败:', error.message);
  if (error.message.includes('认证失败')) {
    // 重新登录
    window.location.href = '/login';
  }
});

socket.on('disconnect', (reason) => {
  console.log('连接断开:', reason);
  if (reason === 'io server disconnect') {
    // 服务器主动断开，可能是认证失效
    socket.connect();
  }
});
```

---

## 完整客户端示例

```javascript
import io from 'socket.io-client';

// 1. 建立连接
const socket = io('http://localhost:3000/ws', {
  auth: {
    token: localStorage.getItem('accessToken')
  },
  transports: ['websocket', 'polling']
});

// 2. 监听连接成功
socket.on('connected', (data) => {
  console.log('连接成功:', data.username);
});

// 3. 订阅设备
socket.emit('subscribe:equipment', { equipmentId: 'SYS-BAT-001' });

// 4. 监听实时数据
socket.on('monitoring:new-data', (data) => {
  console.log('新监测数据:', data);
  updateChart(data);
});

// 5. 监听告警（统一事件）
socket.on('alarm:push', (alarm) => {
  console.log('告警推送:', alarm.faultName, '状态:', alarm.status);
  showNotification(alarm);
  
  // 区分新告警和状态更新
  if (alarm.status === 'pending') {
    handleNewAlarm(alarm);
  } else {
    handleAlarmStatusUpdate(alarm);
  }
});

// 6. 监听批量告警（历史数据导入）
socket.on('alarm:batch', (data) => {
  console.log('批量告警:', data.count, '条');
  updateAlarmList(data.alarms);
});

// 7. 心跳检测
setInterval(() => {
  socket.emit('ping', (response) => {
    console.log('延迟:', Date.now() - response.data.timestamp, 'ms');
  });
}, 30000);

// 8. 错误处理
socket.on('connect_error', (error) => {
  console.error('连接错误:', error.message);
});

socket.on('disconnect', (reason) => {
  console.log('连接断开:', reason);
});
```

---

## 性能优化建议

### 1. 选择性订阅
- 只订阅当前页面需要的设备
- 离开页面时取消订阅

### 2. 事件节流
- 对高频事件（如实时数据）进行节流处理
- 使用 `lodash.throttle` 或 `debounce`

### 3. 批量处理
- 合并多次状态更新
- 使用 `requestAnimationFrame` 更新 UI

### 4. 内存管理
- 及时移除不需要的事件监听器
- 组件卸载时断开不需要的连接

---

## 版本历史

| 版本 | 日期 | 说明 |
| :--- | :--- | :--- |
| v1.0.0 | 2025-12-09 | 初始版本，包含所有基础 WebSocket API |
| v2.0.0 | 2025-12-09 | **重大更新**: 事件重构，简化 API 设计<br/>- 统一告警推送事件 (`alarm:push`)<br/>- 统一监测数据推送 (`monitoring:new-data`)<br/>- 移除冗余事件（用户上下线、设备状态变更等） |

---

## 附录：事件汇总表

### 服务端到客户端事件汇总（当前版本）

| 事件名称 | 说明 | 目标房间 | 状态 |
| :--- | :--- | :--- | :--- |
| `connected` | 连接成功通知 | 单个客户端 | ✅ 活跃 |
| `alarm:push` | 告警推送（创建或更新） | `equipment:{id}`, `role:administrator`, `role:operator` | ✅ 活跃 |
| `alarm:batch` | 批量告警推送 | `role:administrator`, `role:operator` | ✅ 活跃 |
| `alarm:trend` | 告警趋势数据 | `equipment:{id}` | ✅ 活跃 |
| `monitoring:new-data` | 新监测数据推送 | `equipment:{id}` | ✅ 活跃 |
| `equipment:health:update` | 设备健康评分更新 | `equipment:{id}` | ✅ 活跃 |
| `equipment:health:warning` | 设备健康预警 | `role:administrator` | ✅ 活跃 |

### 已废弃的服务端事件

| 事件名称 | 原说明 | 替代方案 | 废弃版本 |
| :--- | :--- | :--- | :--- |
| ~~`user:online`~~ | 用户上线通知 | 已移除，不再推送 | v2.0.0 |
| ~~`user:offline`~~ | 用户离线通知 | 已移除，不再推送 | v2.0.0 |
| ~~`alarm:new`~~ | 新告警推送 | 使用 `alarm:push` | v2.0.0 |
| ~~`alarm:update`~~ | 告警状态更新 | 使用 `alarm:push` | v2.0.0 |
| ~~`alarm:historical-batch`~~ | 历史告警批量推送 | 使用 `alarm:batch` | v2.0.0 |
| ~~`alarm:count:update`~~ | 告警计数更新 | 使用轮询或主动查询 | v2.0.0 |
| ~~`equipment:status:change`~~ | 设备状态变化 | 使用轮询或主动刷新 | v2.0.0 |
| ~~`equipment:status:critical`~~ | 设备异常状态通知 | 使用轮询或主动刷新 | v2.0.0 |
| ~~`equipment:update`~~ | 设备信息更新 | 使用轮询或主动刷新 | v2.0.0 |
| ~~`equipment:created`~~ | 设备创建通知 | 使用轮询或主动刷新 | v2.0.0 |
| ~~`equipment:deleted`~~ | 设备删除通知 | 使用轮询或主动刷新 | v2.0.0 |
| ~~`equipment:data:realtime`~~ | 设备实时数据推送 | 使用 `monitoring:new-data` | v2.0.0 |
| ~~`equipment:overview:update`~~ | 设备概览更新通知 | 使用轮询或主动刷新 | v2.0.0 |
| ~~`import:latest-data`~~ | 导入数据最新值推送 | 使用 `monitoring:new-data` | v2.0.0 |

### 客户端到服务端事件汇总

| 事件名称 | 说明 | 响应 | 状态 |
| :--- | :--- | :--- | :--- |
| `subscribe:equipment` | 订阅设备房间 | 订阅结果 | ✅ 活跃 |
| `unsubscribe:equipment` | 取消订阅设备房间 | 取消订阅结果 | ✅ 活跃 |
| `ping` | 心跳检测 | `pong` 响应 | ✅ 活跃 |

---

## 迁移指南（v1.0.0 → v2.0.0）

### 告警事件迁移

**旧代码**:
```javascript
// 监听新告警
socket.on('alarm:new', (alarm) => {
  showNewAlarmNotification(alarm);
});

// 监听告警更新
socket.on('alarm:update', (alarm) => {
  updateAlarmStatus(alarm);
});

// 监听告警计数
socket.on('alarm:count:update', () => {
  refreshAlarmBadge();
});
```

**新代码**:
```javascript
// 统一监听告警推送
socket.on('alarm:push', (alarm) => {
  if (alarm.status === 'pending') {
    // 新告警
    showNewAlarmNotification(alarm);
  } else {
    // 状态更新
    updateAlarmStatus(alarm);
  }
});

// 告警计数改为主动查询
async function refreshAlarmBadge() {
  const response = await fetch('/api/alarms/count');
  const count = await response.json();
  updateBadge(count);
}
```

### 监测数据迁移

**旧代码**:
```javascript
socket.on('equipment:data:realtime', (data) => {
  updateChart(data);
});

socket.on('import:latest-data', (data) => {
  updateChart(data);
});
```

**新代码**:
```javascript
// 统一监听监测数据
socket.on('monitoring:new-data', (data) => {
  updateChart(data);
  
  // 根据 source 字段区分来源
  if (data.source === 'file-import') {
    showImportCompleteNotification();
  }
});
```

### 设备事件迁移

**旧代码**:
```javascript
socket.on('equipment:status:change', (data) => {
  updateDeviceStatus(data);
});

socket.on('equipment:update', (data) => {
  refreshDeviceInfo(data);
});
```

**新代码**:
```javascript
// 改为用户操作后主动刷新
async function handleDeviceUpdate() {
  await saveDeviceChanges();
  await refreshDeviceList(); // 主动刷新
}

// 或使用轮询（适用于设备列表页面）
setInterval(async () => {
  await refreshDeviceList();
}, 30000); // 每30秒刷新一次
```

### 用户在线状态迁移

**旧代码**:
```javascript
socket.on('user:online', (data) => {
  updateUserOnlineStatus(data.userId, true);
});

socket.on('user:offline', (data) => {
  updateUserOnlineStatus(data.userId, false);
});
```

**新代码**:
```javascript
// 改为主动查询在线用户
async function refreshOnlineUsers() {
  const response = await fetch('/api/users/online');
  const users = await response.json();
  updateUserList(users);
}

// 定期刷新（如果需要）
setInterval(refreshOnlineUsers, 60000); // 每分钟刷新
```
