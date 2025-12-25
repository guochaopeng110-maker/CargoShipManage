# Spec: Business Subscriptions

## ADDED Requirements

### Requirement: Equipment Subscription
The service MUST allow components to subscribe to real-time updates for specific equipment.

#### Scenario: 订阅设备数据
*   GIVEN WebSocket 连接已建立
*   WHEN 调用 `realtimeService.subscribeToEquipment('SYS-BAT-001')`
*   THEN 服务应向后端发送 `subscribe:equipment` 事件
*   AND 携带参数 `{ equipmentId: 'SYS-BAT-001' }`

#### Scenario: 取消订阅设备数据
*   GIVEN 已订阅设备 'SYS-BAT-001'
*   WHEN 调用 `realtimeService.unsubscribeFromEquipment('SYS-BAT-001')`
*   THEN 服务应向后端发送 `unsubscribe:equipment` 事件
*   AND 携带参数 `{ equipmentId: 'SYS-BAT-001' }`
