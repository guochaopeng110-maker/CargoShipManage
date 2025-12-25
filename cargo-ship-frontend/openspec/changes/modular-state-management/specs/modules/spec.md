# Spec: Domain Stores Requirements

## Rationale
明确每个 Store 的职责范围，避免功能重叠和逻辑混乱。

## ADDED Requirements

#### 1. Auth Store (认证)
> 负责用户认证状态、Token、个人资料和权限。

- **Scenario: 存储用户信息**
  - GIVEN 用户登录成功
  - THEN Store 应当保存 `token` 和 `user` 对象
  - AND Store 应当提供 `isAuthenticated` 状态
  - AND Store 应当提供 `login`, `logout` 动作

#### 2. Equipment Store (设备)
> 负责管理设备列表及其元数据。

- **Scenario: 加载设备列表**
  - GIVEN 进入设备管理页面
  - WHEN 调用 `fetchEquipments()`
  - THEN Store 应当调用 API 获取列表并更新 state
  - AND Store 应当维护 `loading` 和 `error` 状态

#### 3. Monitoring Store (监控)
> 负责管理所有设备的实时监控数据流。

- **Scenario: 实时数据更新**
  - GIVEN 订阅了实时监控
  - WHEN 收到 `monitoring:new-data` 事件
  - THEN Store 应当将新数据追加到 state 中
  - AND Store 应当提供 `initSubscription` 动作来启动订阅

#### 4. Alarms Store (告警)
> 负责管理实时告警推送和历史告警数据。

- **Scenario: 告警推送**
  - GIVEN 发生新告警
  - WHEN 收到 `alarms:new` 事件
  - THEN Store 应当将告警添加到 `activeAlarms` 列表
  - AND Store 应当触发通知（可选）

#### 5. Health Store (健康)
> 负责健康评估报告的生成与查询。

- **Scenario: 获取健康报告**
  - GIVEN 需要查看设备健康状况
  - WHEN 调用 `fetchHealthReport(deviceId)`
  - THEN Store 应当加载并缓存该报告

#### 6. UI Store (全局交互)
> 负责管理全局 UI 状态。

- **Scenario: 全局加载条**
  - GIVEN 开始一个跨页面的长任务
  - WHEN 调用 `setGlobalLoading(true)`
  - THEN 界面顶层应当显示加载指示器
