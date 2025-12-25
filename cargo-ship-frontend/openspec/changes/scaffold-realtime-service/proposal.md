# 提案: 实时通信服务框架 (Real-time Communication Service Framework)

## Why
建立一个统一、健壮且可扩展的实时通信服务，用于处理所有来自后端的WebSocket推送事件。该服务将是前端实时数据的唯一入口，为整个应用的实时特性（如实时监控、告警推送、健康状态更新）提供动力。

## What Changes
### 核心概念 (Core Concept)
1.  **中央服务模块**: 在 `src/services/realtime-service.ts` 创建一个全局可访问的服务模块（单例 class）。此服务将封装所有 `socket.io-client` 的复杂性。
2.  **生命周期管理**: 服务需全权负责管理 WebSocket 的连接生命周期，包括：
    *   连接/断开: 提供 `connect()` 和 `disconnect()` 方法。
    *   自动认证: 连接成功后，能自动从 `auth-store` 获取 token 并发送认证信息（或在连接握手时携带）。
    *   自动重连: 实现健壮的断线自动重连逻辑。
3.  **订阅/发布模式**: 服务需提供清晰的、面向业务的接口来管理数据订阅，隐藏底层的房间/事件名。
    *   例如，提供 `subscribeToEquipment(equipmentId: string)` 和 `unsubscribeFromEquipment(equipmentId: string)` 方法。
4.  **数据分发机制**:
    *   `RealtimeService` 自身保持中立，不直接与任何 UI 组件或特定的 Store 耦合。
    *   它将作为事件总线，监听所有服务端推送事件（如 `alarm:push`, `monitoring:new-data`），然后将原始数据分发出去。初期采用简单的发布/订阅模式（Event Emitter）。
5.  **类型安全**: 基于 `docs/data/websocket-api.md`，在 `src/types` 目录中为所有 WebSocket 事件的负载（payload）和客户端发出的事件参数创建明确的 TypeScript 类型。

### 预期成果 (Expected Outcome)
*   一个 `realtime-service.ts` 模块，包含完整的连接、认证和重连逻辑框架。
*   明确的 TypeScript 类型定义文件，覆盖所有 WebSocket 事件与负载。
*   上层代码可以方便地调用 `realtimeService.connect()` 和 `realtimeService.subscribeToEquipment(...)`。
*   当接收到后端事件时，服务能（在初期）通过 `console.log` 打印出类型安全的负载数据，验证链路通畅。
*   为后续 `Zustand stores` 与实时数据集成铺平道路。
