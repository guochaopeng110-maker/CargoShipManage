# dashboard-restyle Specification

## Purpose
重新定义驾控台首页的功能，从指标监控中心转变为系统状态监控中心，提升对全船健康状况的全局掌控力，展示核心系统的健康矩阵和实时告警摘要。
## Requirements
### Requirement: System Status Matrix
首页 MUST 以矩阵形式展示 8 个核心子系统的健康概览卡片，卡片包含系统名称、在线状态、最高告警状态及主要开关量指标。

#### Scenario: Visual Warning on Critical Failures
- **WHEN** 电池系统发生“三级过压”告警
- **THEN** 首页的电池系统状态卡片必须立即变红，并显示“严重告警”字样，覆盖之前的正常在线状态。

### Requirement: Real-time Alarm Promotion
首页 SHALL 整合实时告警摘要组件，且其视觉优先级应高于具体的历史数据表格，确保即时发生的故障能被第一时间看到。

#### Scenario: Real-time Notification Feed
- **WHEN** 发生新的 `alarm:push` 推送
- **THEN** 首页告警组件必须在 1 秒内滚动展示该新告警的详细描述。

