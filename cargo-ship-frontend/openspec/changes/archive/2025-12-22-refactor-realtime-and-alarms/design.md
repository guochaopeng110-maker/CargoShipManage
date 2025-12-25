# Design: 实时数据总线与告警查询架构设计

## 1. 实时数据总线架构

### 1.1 生命周期管理重构
- **App 级别控制**：将 `realtimeService.connect()` 和 8 个核心设备的订阅操作移至 `App.tsx` 的全局挂载点。
- **取消页面级清理**：监测专页（如推进、电池等）通过 `useEffect` 挂载时，不再执行 `subscribeToDevice`；卸载时，不再执行 `unsubscribe` 或 `store.cleanup()`。
- **状态持久化**：`realtimeConnected` 状态仅由 `App.tsx` 的登录/退出逻辑以及底层的 `socket.io` 连接事件驱动。

### 1.2 核心设备动态加载
- 应用启动后，首先调用 `EquipmentStore.fetchEquipmentList()`。
- 根据设备 ID 规则（`SYS-*`）筛选出 8 个关键系统。
- 将这些 ID 传递给 `RealtimeService` 建立持久订阅。

## 2. 告警中心历史查询重构

### 2.1 交互与 UI 模型
- **数据源迁移**：筛选器中的设备下拉框由 API 动态充填，监听 `useEquipmentStore`。
- **精简化筛选**：移除所有的“告警状态”和“告警等级”筛选 Checkbox。
- **分页逻辑**：采用标准 HTTP GET 请求，携带 `page`、`pageSize`、`deviceId`、`startTime`、`endTime` 参数。

### 2.2 数据格式与存储
- **历史记录**：存储在 `alarms-store` 的 `historicalAlarms` 对象中，包含 `items`、`total`、`page` 等分页信息。
- **实时隔离**：确保历史查询结果不会被 WebSocket 推送的实时告警包干扰。

## 3. 实时模拟验证工具设计

### 3.1 核心逻辑
- **Socket.IO 服务端**：创建一个独立的 Node.js 脚本，模拟后端 WebSocket 服务器。
- **动态设备推送**：只有当前端发送 `subscribe:equipment` 成功后，模拟器才开始针对对应 ID 发送数据。
- **数据生成器**：
    - `monitoring:new-data`：生成符合 8 个核心系统属性的随机数值（如 SOC 20%-100% 循环）。
    - `alarm:push`：通过随机概率或预设脚本发送高、中、低严重程度的告警包。
- **协议一致性**：使用与 `types/websocket.ts` 完全一致的数据结构，测试前端解析器的鲁棒性。
