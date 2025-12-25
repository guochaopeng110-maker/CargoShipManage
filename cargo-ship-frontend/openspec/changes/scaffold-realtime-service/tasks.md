## 1. Implementation

- [x] 1.1 **类型定义**: 创建 `src/types/websocket.ts`，定义所有 `ServerToClientEvents` 和 `ClientToServerEvents` 及其 Payload 类型。
- [x] 1.2 **服务框架**: 创建 `src/services/realtime-service.ts`，实现单例类结构。
- [x] 1.3 **连接管理**: 实现 `connect(token)` 和 `disconnect()` 方法，配置 `socket.io-client` 实例及 `auth` 参数。
- [x] 1.4 **业务接口**: 实现 `subscribeToEquipment` 和 `unsubscribeFromEquipment` 方法。
- [x] 1.5 **事件分发**: 实现基本的 `on/off` 事件订阅机制，并在 socket 事件触发时调用。
- [x] 1.6 **验证脚本**: 创建一个演示组件或测试脚本，模拟连接并打印接收到的 WebSocket 事件，验证链路通畅。
