# 提案: 激活实时数据流 (Activate Real-time Data Flow)

## Why（为什么）

在第一阶段（`scaffold-realtime-service`）中，我们成功搭建了 `realtime-service.ts` 框架，实现了 WebSocket 连接、认证、订阅管理和基础事件监听。但是，这个框架目前仍然处于"待激活"状态——它可以接收来自后端的实时数据，却无法将这些数据有效地注入到应用的状态管理层。

现有问题：
1. **数据孤岛**：`realtime-service` 接收到的实时数据只能通过 `console.log` 输出，无法被 UI 消费
2. **状态割裂**：各个 Zustand stores（`monitoring-store`、`alarms-store`、`health-store`）虽然引用了 `realtimeService`，但并未建立完整的事件监听和状态更新机制
3. **数据流不统一**：缺少明确的数据流路径，从 WebSocket 推送到 store 更新再到 UI 响应的链路不完整
4. **类型安全不足**：虽然定义了 WebSocket 事件类型，但在 store 层面的数据转换和映射还不够完善

本提案旨在打通这个"最后一公里"，将 `realtime-service` 与 Zustand stores 完全集成，建立端到端的实时数据流管道。

## What Changes（变更内容）

### 核心概念

#### 1. `realtime-service.ts` 全功能实现

基于 [websocket-api.md](../../../docs/data/websocket-api.md) 规范，完善 `realtime-service` 的实现：

**连接与认证强化**：
- 从 `auth-store` 或 `localStorage` 动态获取 JWT Token
- 增强连接生命周期处理（`connected`、`disconnect`、`connect_error`）
- 实现 Token 过期后的重新认证机制
- 添加连接状态回调，通知 stores 连接状态变化

**订阅管理完善**：
- 确保 `subscribeToEquipment(equipmentId)` 和 `unsubscribeFromEquipment(equipmentId)` 能正确发送 `subscribe:equipment` 和 `unsubscribe:equipment` 事件
- 添加订阅状态跟踪（已订阅的设备列表）
- 实现自动重订阅机制（重连后恢复之前的订阅）

**事件监听与分发增强**：
- 完整实现对所有服务端推送事件的监听：
  - `alarm:push` - 统一告警推送
  - `alarm:batch` - 批量告警推送
  - `alarm:trend` - 告警趋势
  - `monitoring:new-data` - 新监测数据
  - `equipment:health:update` - 健康评分更新
  - `equipment:health:warning` - 健康预警
  - `connected` - 连接成功
- 通过事件总线（Event Bus）机制，将接收到的数据分发给已注册的监听器（stores）
- 提供类型安全的事件注册接口

#### 2. Zustand Stores 实时数据集成

**事件监听注册机制**：
- 每个相关 store（`monitoring-store`、`alarms-store`、`health-store`）在初始化时，向 `realtimeService` 注册事件监听器
- 监听器以回调函数形式实现，接收类型安全的事件负载
- 在 store 卸载或清理时，移除已注册的监听器（避免内存泄漏）

**状态更新逻辑**：

**monitoring-store**：
- 监听 `monitoring:new-data` 事件
- 接收到新数据时，根据 `equipmentId` 和 `metricType` 更新对应的数据存储
- 维护实时数据缓存，避免重复数据
- 更新设备在线状态和连接质量指标
- 触发性能指标计算（数据点数量、更新频率等）

**alarms-store**：
- 监听 `alarm:push` 事件，处理单个告警的创建和更新
- 监听 `alarm:batch` 事件，处理批量告警推送
- 监听 `alarm:trend` 事件，更新告警趋势统计
- 根据告警 `status` 字段判断是新告警还是状态更新
- 自动分类告警（pending、critical、emergency）
- 更新统计数据（按严重程度、状态等维度）

**health-store**：
- 监听 `equipment:health:update` 事件，更新设备健康评分
- 监听 `equipment:health:warning` 事件，触发健康预警通知
- 缓存健康数据，避免频繁计算
- 维护健康趋势历史记录

**数据流原则落实**：
- 严格遵循"所有设备数据均被视为由后端通过 WebSocket 推送而来的统一数据流"原则
- Stores 成为 UI 消费数据的**唯一真理源（Single Source of Truth）**
- 无需区分数据来源（首次加载 vs 实时推送），统一通过 store 接口访问
- 实现不可变数据更新模式（Immutable Updates），确保状态变化可追踪

#### 3. 初始化与生命周期管理

**应用启动时**：
- 在用户认证成功后，自动调用 `realtimeService.connect(token)`
- Stores 自动注册事件监听器
- 根据当前路由/页面，订阅相关设备的实时数据

**页面切换时**：
- 取消订阅不再需要的设备
- 订阅新页面需要的设备
- 保持连接活跃，避免频繁断连

**用户退出时**：
- 清理所有监听器
- 取消所有订阅
- 断开 WebSocket 连接
- 清空敏感数据

### 预期成果

1. **功能完备的 realtime-service**：
   - 能够全生命周期管理 WebSocket 连接（认证、重连、心跳）
   - 准确高效地分发所有实时事件到相应的 stores
   - 提供清晰的 API 供上层调用（connect、disconnect、subscribe、unsubscribe）

2. **完全集成的 Stores**：
   - `monitoring-store`、`alarms-store`、`health-store` 能够无缝接收实时数据
   - 自动更新应用状态，触发 UI 响应式更新
   - 数据结构保持类型安全，符合既有接口定义

3. **端到端的实时数据流**：
   - 建立清晰的数据流路径：后端 WebSocket → `realtime-service` → Zustand stores → React 组件
   - 数据流向单向且可追溯
   - 性能优化：避免不必要的重渲染和数据冗余

4. **可验证的集成效果**：
   - 通过简单的测试页面或现有监控页面，验证实时数据推送能够正确更新 UI
   - 实时告警能够及时显示并触发通知
   - 设备健康评分能够动态更新

## Impact & Risks（影响与风险）

### 影响范围
- **高影响**：`monitoring-store`、`alarms-store`、`health-store`（核心修改）
- **中影响**：`realtime-service`（功能增强）、相关监控页面组件（验证集成）
- **低影响**：`auth-store`（可能需要提供 Token 访问接口）

### 潜在风险
1. **性能风险**：高频实时数据可能导致 store 频繁更新，需要实现节流/防抖机制
2. **内存泄漏**：事件监听器未正确清理可能导致内存泄漏，需严格管理生命周期
3. **状态一致性**：并发更新可能导致状态不一致，需确保更新逻辑的原子性
4. **向后兼容性**：现有基于 API 轮询的逻辑可能需要逐步迁移到实时数据流

### 缓解措施
- 实现数据更新节流（throttle/debounce）
- 使用 React hooks 的清理函数（cleanup）管理监听器
- 采用 Zustand 的不可变更新模式
- 保持 API 接口不变，逐步切换数据源

## Dependencies（依赖关系）

### 前置依赖
- ✅ `scaffold-realtime-service`（已完成）：提供了基础的 `realtime-service` 框架和类型定义

### 后续依赖
- 本变更完成后，监控页面、告警页面、健康评估页面可以完全基于实时数据流工作
- 可以进一步实现离线消息缓冲处理、智能告警聚合等高级功能

## Alternatives Considered（备选方案）

### 方案 1：直接在组件中监听 WebSocket（❌ 不推荐）
- 每个组件独立管理 WebSocket 监听
- 缺点：代码重复、难以维护、状态管理混乱

### 方案 2：使用 React Context 管理实时数据（⚠️ 可考虑但不优先）
- 通过 Context Provider 提供实时数据
- 缺点：性能不如 Zustand、嵌套复杂、不易与现有 stores 集成

### 方案 3：采用本提案的 realtime-service + Zustand stores（✅ 推荐）
- 集中管理、类型安全、性能优化、易于测试
- 与现有架构完美契合

## Open Questions（待解决问题）

1. **数据更新频率控制**：高频监测数据（如每秒数百个数据点）应该如何节流？
   - 建议：在 store 层面实现基于 `requestAnimationFrame` 或时间窗口的批量更新

2. **离线消息处理**：用户重连后接收到的缓冲消息（`buffered: true`）应该如何处理？
   - 建议：显示"您有 X 条离线消息"的提示，允许用户查看或忽略

3. **历史数据与实时数据的融合**：首次加载时，如何将 API 查询的历史数据与 WebSocket 推送的实时数据无缝衔接？
   - 建议：使用统一的数据结构和索引键（`equipmentId-metricType`），实时数据自动追加到历史数据后

4. **错误恢复策略**：如果 WebSocket 连接长时间断开，应该如何恢复数据一致性？
   - 建议：重连后，主动查询最近 N 分钟的数据，填补空白期

## Validation Criteria（验证标准）

✅ 本提案完成的标志：

1. `realtime-service` 能够成功连接、认证、订阅设备，并分发所有类型的实时事件
2. `monitoring-store` 能够接收 `monitoring:new-data` 事件并正确更新状态
3. `alarms-store` 能够接收 `alarm:push`、`alarm:batch`、`alarm:trend` 事件并更新告警列表和统计数据
4. `health-store` 能够接收 `equipment:health:update` 和 `equipment:health:warning` 事件并更新健康数据
5. 通过测试页面或现有监控页面，能够观察到 UI 随实时数据推送而动态更新
6. 无内存泄漏、无明显性能问题
7. 代码通过 TypeScript 类型检查，无类型错误
8. 所有事件监听器在组件/store 卸载时正确清理
