# WebSocket API 文档

## 概述

本文档描述了货船智能机舱管理系统的 WebSocket API（v2.0.0）。WebSocket 服务基于 Socket.io 实现，支持实时双向通信、房间机制、自动重连和消息缓冲。

**连接信息:**
- **命名空间**: `/ws`
- **传输方式**: `websocket`, `polling`
- **认证方式**: JWT Token
- **服务地址**: `http://localhost:3000/ws` (开发环境)

---

## 快速开始

### 客户端连接

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  auth: {
    token: 'your-jwt-token-here'
  },
  transports: ['websocket', 'polling']
});

// 监听连接成功
socket.on('connected', (data) => {
  console.log('连接成功:', data.username);
});

// 订阅设备
socket.emit('subscribe:equipment', { equipmentId: 'SYS-BAT-001' });

// 监听实时数据
socket.on('monitoring:new-data', (data) => {
  console.log('新数据:', data);
});

// 监听告警
socket.on('alarm:push', (alarm) => {
  console.log('告警:', alarm.faultName);
});
```

---

## 服务端推送事件

### 1. 告警事件

#### `alarm:push` - 统一告警推送

**说明**: 新告警触发或状态更新时推送（替代原有的 `alarm:new` 和 `alarm:update`）

**目标房间**:
- 严重/高级告警 → `role:administrator`, `role:operator`, `equipment:{id}`
- 中低级告警 → `equipment:{id}`

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
- `severity`: 严重程度 - `low` | `medium` | `high` | `critical`
- `status`: 告警状态 - `pending` | `processing` | `resolved` | `ignored`
- `monitoringPoint`: 监测点名称（如"总电压"）
- `faultName`: 故障名称（如"总压过压"）
- `recommendedAction`: 建议处理措施
- `handler`: 处理人 ID（仅已处理告警有值）
- `handledAt`: 处理时间（仅已处理告警有值）
- `handleNote`: 处理备注（仅已处理告警有值）

**使用示例**:
```javascript
socket.on('alarm:push', (alarm) => {
  if (alarm.status === 'pending') {
    // 新告警
    showNotification(`新告警: ${alarm.faultName}`);
  } else {
    // 状态更新
    updateAlarmStatus(alarm);
  }
});
```

---

#### `alarm:batch` - 批量告警推送

**说明**: 批量推送多条告警（用于历史数据导入）

**目标房间**: `role:administrator`, `role:operator`

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

**使用示例**:
```javascript
socket.on('alarm:batch', (data) => {
  console.log(`收到 ${data.count} 条历史告警`);
  updateAlarmList(data.alarms);
});
```

---

#### `alarm:trend` - 告警趋势

**说明**: 推送设备告警趋势统计

**目标房间**: `equipment:{id}`

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

---

### 2. 监测数据事件

#### `monitoring:new-data` - 新监测数据

**说明**: 实时推送设备监测数据（替代 `equipment:data:realtime` 和 `import:latest-data`）

**目标房间**: `equipment:{id}`

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
- `metricType`: 物理指标类型 - `voltage` | `current` | `temperature` | `soc` 等
- `monitoringPoint`: 业务监测点名称（如"总电压"、"单体最高温度"）
- `quality`: 数据质量 - `normal` | `abnormal` | `suspicious`
- `source`: 数据来源 - `sensor-upload` | `manual-entry` | `file-import`

**使用示例**:
```javascript
socket.on('monitoring:new-data', (data) => {
  updateChart(data);
  
  if (data.source === 'file-import') {
    showImportCompleteNotification();
  }
});
```

---

### 3. 设备健康事件

#### `equipment:health:update` - 健康评分更新

**说明**: 设备健康评分计算完成后推送

**目标房间**: `equipment:{id}`

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
- `grade`: 健康等级 - `Excellent` | `Good` | `Fair` | `Poor` | `Critical`
- `soh`: 健康状态百分比
- `trend`: 趋势 - `improving` | `stable` | `declining`

---

#### `equipment:health:warning` - 健康预警

**说明**: 设备健康评分低于 60 时通知管理员

**目标房间**: `role:administrator`

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

---

### 4. 连接事件

#### `connected` - 连接成功

**说明**: 客户端认证成功后的欢迎消息

**目标**: 当前连接的客户端

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

## 客户端请求事件

### 1. 设备订阅

#### `subscribe:equipment` - 订阅设备

**说明**: 订阅特定设备的实时更新

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
socket.emit('subscribe:equipment', 
  { equipmentId: 'SYS-BAT-001' }, 
  (response) => {
    console.log(response.message);
  }
);
```

---

#### `unsubscribe:equipment` - 取消订阅

**说明**: 取消订阅特定设备

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

---

### 2. 心跳检测

#### `ping` - 心跳

**说明**: 检测连接状态和延迟

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
  const latency = Date.now() - response.data.timestamp;
  console.log('延迟:', latency, 'ms');
});
```

---

## 房间机制

### 自动加入的房间

连接成功后自动加入：

1. **用户房间**: `user:{userId}`
   - 用于向特定用户推送消息

2. **角色房间**: `role:{roleName}`
   - 根据用户角色自动加入
   - 角色：`administrator` | `operator` | `viewer`

### 手动订阅的房间

1. **设备房间**: `equipment:{equipmentId}`
   - 通过 `subscribe:equipment` 订阅
   - 接收设备的实时数据和告警

---

## 离线消息缓冲

**缓冲策略**:
- 最大缓冲：100 条消息/用户
- 发送时机：用户重新连接时自动发送
- 缓冲标识：消息附加 `buffered: true` 字段

**示例**:
```javascript
socket.on('alarm:push', (alarm) => {
  if (alarm.buffered) {
    console.log('这是离线期间产生的告警');
  }
});
```

---

## 错误处理

### 认证失败

**错误消息**: 
- `认证失败：缺少token`
- `认证失败：无效的token`

**处理示例**:
```javascript
socket.on('connect_error', (error) => {
  console.error('连接失败:', error.message);
  
  if (error.message.includes('认证失败')) {
    // 重新登录
    redirectToLogin();
  }
});

socket.on('disconnect', (reason) => {
  console.log('连接断开:', reason);
  
  if (reason === 'io server disconnect') {
    // 服务器主动断开（可能认证失效）
    socket.connect();
  }
});
```

---

## 完整示例

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
  console.log('新监测数据:', data.value, data.unit);
  updateChart(data);
});

// 5. 监听告警
socket.on('alarm:push', (alarm) => {
  console.log('告警:', alarm.faultName, '状态:', alarm.status);
  
  if (alarm.status === 'pending') {
    // 新告警
    showNotification(alarm);
  } else {
    // 状态更新
    updateAlarmStatus(alarm);
  }
});

// 6. 监听批量告警
socket.on('alarm:batch', (data) => {
  console.log('批量告警:', data.count, '条');
  updateAlarmList(data.alarms);
});

// 7. 监听设备健康
socket.on('equipment:health:update', (data) => {
  console.log('健康评分:', data.score);
  updateHealthScore(data);
});

// 8. 心跳检测
setInterval(() => {
  socket.emit('ping', (response) => {
    const latency = Date.now() - response.data.timestamp;
    console.log('延迟:', latency, 'ms');
  });
}, 30000);

// 9. 错误处理
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

```javascript
// 页面加载时
socket.emit('subscribe:equipment', { equipmentId: currentDeviceId });

// 页面卸载时
socket.emit('unsubscribe:equipment', { equipmentId: currentDeviceId });
```

### 2. 事件节流
对高频事件进行节流处理：

```javascript
import { throttle } from 'lodash';

const updateChart = throttle((data) => {
  // 更新图表
}, 1000); // 每秒最多更新一次

socket.on('monitoring:new-data', updateChart);
```

### 3. 批量处理
合并多次状态更新：

```javascript
let updates = [];

socket.on('monitoring:new-data', (data) => {
  updates.push(data);
});

// 使用 requestAnimationFrame 批量更新 UI
requestAnimationFrame(() => {
  if (updates.length > 0) {
    batchUpdateChart(updates);
    updates = [];
  }
});
```

### 4. 内存管理
组件卸载时清理监听器：

```javascript
// React 示例
useEffect(() => {
  socket.on('alarm:push', handleAlarm);
  
  return () => {
    socket.off('alarm:push', handleAlarm);
  };
}, []);
```

---

## 事件汇总表

### 服务端推送事件

| 事件名称 | 说明 | 目标房间 |
|---------|------|---------|
| `connected` | 连接成功通知 | 单个客户端 |
| `alarm:push` | 告警推送（创建或更新） | `equipment:{id}`, `role:*` |
| `alarm:batch` | 批量告警推送 | `role:administrator`, `role:operator` |
| `alarm:trend` | 告警趋势数据 | `equipment:{id}` |
| `monitoring:new-data` | 新监测数据 | `equipment:{id}` |
| `equipment:health:update` | 健康评分更新 | `equipment:{id}` |
| `equipment:health:warning` | 健康预警 | `role:administrator` |

### 客户端请求事件

| 事件名称 | 说明 | 响应 |
|---------|------|------|
| `subscribe:equipment` | 订阅设备房间 | 订阅结果 |
| `unsubscribe:equipment` | 取消订阅设备房间 | 取消订阅结果 |
| `ping` | 心跳检测 | `pong` 响应 |

---

## 常见问题

### Q: 如何知道告警是新的还是更新？
A: 通过 `status` 字段判断。`pending` 表示新告警，其他状态表示更新。

### Q: 如何区分实时数据和导入数据？
A: 通过 `source` 字段判断。`sensor-upload` 是实时数据，`file-import` 是导入数据。

### Q: 为什么不推送设备状态变化？
A: 为简化架构和减少服务器负载，建议使用 API 轮询或用户操作后主动刷新。

### Q: 离线消息会保留多久？
A: 离线消息最多保留 100 条，重新连接时自动发送，之后清空缓冲区。

### Q: 如何处理连接断开？
A: Socket.io 会自动重连。客户端应监听 `disconnect` 和 `connect` 事件，必要时刷新数据。

---

