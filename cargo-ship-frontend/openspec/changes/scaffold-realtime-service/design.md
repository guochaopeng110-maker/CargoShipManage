# 设计文档: 实时通信服务架构

## 1. 架构概览

本设计旨在引入一个单例的 `RealtimeService`，作为前端应用与后端 WebSocket 服务之间的唯一桥梁。它负责处理底层的 Socket.IO 连接、认证、重连以及原始消息的接收，并以业务友好的方式向应用层暴露接口。

### 核心组件

*   **`RealtimeService` (Singleton)**: 核心类，管理 `socket` 实例。
*   **`Socket.IO Client`**: 底层 WebSocket 客户端库。
*   **`Request/Response Interceptors` (Optional - Future)**: 未来可扩展拦截器。
*   **`Event Bus`**: 内部事件分发机制，将 Socket 事件转换为应用内部事件。

## 2. 模块设计

### 2.1 文件结构

```
src/
  services/
    realtime-service.ts    # 核心服务实现
  types/
    websocket.ts           # WebSocket 相关类型定义 (Payloads, Events)
```

### 2.2 类型定义 (`src/types/websocket.ts`)

基于 `docs/data/websocket-api.md`，定义以下主要类型：

*   **ServerToClientEvents**: 服务端推送的事件接口。
*   **ClientToServerEvents**: 客户端发送的事件接口。
*   **Payload Interfaces**:
    *   `AlarmPushPayload`
    *   `MonitoringDataPayload`
    *   `EquipmentHealthUpdatePayload`
    *   ...等

### 2.3 `RealtimeService` 类设计

```typescript
class RealtimeService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Function[]> = new Map(); // 简化的事件订阅

  // 初始化连接，传入 token
  public connect(token: string): void;

  // 断开连接
  public disconnect(): void;

  // 订阅设备数据
  public subscribeToEquipment(equipmentId: string): Promise<void>;

  // 取消订阅设备数据
  public unsubscribeFromEquipment(equipmentId: string): Promise<void>;

  // 通用事件监听 (供 Store 或组件使用)
  public on<K extends keyof ServerToClientEvents>(event: K, listener: (data: ServerToClientEvents[K]) => void): void;
  public off<K extends keyof ServerToClientEvents>(event: K, listener: (data: ServerToClientEvents[K]) => void): void;
}
```

## 3. 关键流程

### 3.1 连接与认证

1.  应用启动或用户登录成功后，调用 `authStore` 获取 Token。
2.  调用 `realtimeService.connect(token)`。
3.  `RealtimeService` 初始化 `io(...)`，将 Token 放入 `auth` 选项。
4.  监听 `connect` 事件，确认连接成功。
5.  监听 `connect_error`，处理认证失败（如 Token 过期）。

### 3.2 业务订阅 (以设备为例)

1.  UI 组件 mount，调用 `realtimeService.subscribeToEquipment(id)`。
2.  `RealtimeService` 检查 socket 状态。
3.  发送 `emit('subscribe:equipment', { equipmentId: id })`。
4.  接收回调确认订阅成功。

### 3.3 数据分发

1.  Socket 收到 `monitoring:new-data` 事件。
2.  `RealtimeService` 触发内部注册的监听器（通过 `on` 方法注册的）。
3.  订阅该事件的 UI 组件或 Store 更新状态。

## 4. 扩展性与解耦

*   **Store 无关性**: `RealtimeService` 不直接导入任何 Zustand store。相反，Store 应该导入 `realtimeService` 并注册监听器。这避免了循环依赖，保持了架构清晰。
*   **类型安全**: 所有输入输出均由 TypeScript 严格类型化，防止 Payload 结构变更导致的隐式 Bug。
