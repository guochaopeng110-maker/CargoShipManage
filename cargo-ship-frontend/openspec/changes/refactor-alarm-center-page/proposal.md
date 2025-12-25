# 重构告警中心页面：实时监控与历史追溯的统一管理

## 概述

将 AlarmCenterPage 按照新的分层架构和数据流模式彻底重构，使其成为一个功能完备、体验流畅的告警管理中枢。该页面需要同时处理实时推送的告警和可供查询的历史告警记录，实现"双模视图"设计，为用户提供完整的告警管理能力。

## 问题陈述

### 当前痛点

目前的告警管理系统存在以下问题：

1. **缺少专门的告警中心页面**
   - 虽然 `alarms-store.ts` 已经实现了完善的实时告警状态管理
   - 但缺少一个统一的告警中心页面来展示和管理告警
   - 用户无法集中查看和处理所有告警

2. **实时告警与历史告警割裂**
   - 实时告警通过 WebSocket 推送，由 `alarms-store` 管理
   - 历史告警查询功能尚未实现
   - 两种数据流没有统一的用户界面

3. **缺少历史告警查询能力**
   - `alarms-store.ts` 目前只管理实时推送的告警
   - 没有实现用户驱动的历史告警查询功能
   - 无法按条件筛选和分页浏览历史告警

4. **告警处理工作流不完整**
   - 虽然 store 提供了确认、解决等操作
   - 但缺少完整的闭环数据流验证
   - 用户操作后的实时反馈机制需要验证

### 用户需求

用户期望的告警中心页面应该：

1. **统一管理界面**：在一个页面中同时管理实时告警和历史告警
2. **实时响应**：实时告警能够自动推送并更新到页面
3. **灵活查询**：支持按设备、等级、日期等条件查询历史告警
4. **快速处理**：提供便捷的告警确认、处理功能
5. **清晰分类**：通过视图切换区分实时监控和历史追溯场景

## 目标

### 主要目标

1. **建立双模视图设计**
   - 使用 Tabs 组件实现"实时告警"和"历史告警"两个视图
   - 实时告警视图：展示 WebSocket 推送的活动告警
   - 历史告警视图：提供筛选条件和分页浏览功能

2. **扩展 alarms-store 状态管理**
   - 实时状态：继续管理 `activeAlarms`（由 WebSocket 推送驱动）
   - 历史状态：新增 `historicalAlarms` 状态管理
   - 完全复用 DataQueryPage 确立的"筛选-分页列表"模式

3. **增强 alarms-service 功能**
   - 实现 `fetchHistoricalAlarms(filters, page)` 方法
   - 实现 `acknowledgeAlarm(alarmId)` 方法（如果尚未实现）
   - 确保所有 API 调用通过 api-client 进行

4. **验证闭环数据流**
   - 用户确认告警 → API 请求 → 后端处理 → WebSocket 推送更新 → store 自动更新 → UI 响应
   - 确保实时数据流的完整性和一致性

5. **复用现有模式**
   - 历史告警查询完全遵循 DataQueryPage 确立的"筛选-分页列表"模板
   - 验证该模式的可复用性和通用性

### 非目标

以下内容不在本次重构范围内：

- 告警规则配置管理（应在专门的配置页面实现）
- 告警统计和趋势分析（应在专门的分析页面实现）
- 告警模板管理（后续功能）
- 告警智能处理和自动化（后续功能）

## 解决方案

### 核心设计原则

1. **双模视图分离** (Dual-Mode View Separation)
   - 实时告警视图：自动更新，无需用户操作
   - 历史告警视图：用户驱动，按需查询
   - 通过 Tabs 组件实现清晰的功能分离

2. **模式复用** (Pattern Reuse)
   - 历史告警查询完全复用 DataQueryPage 的实现模式
   - 筛选条件 + 执行查询按钮 + 分页列表
   - 统一的加载状态和错误处理

3. **闭环数据流** (Closed-Loop Data Flow)
   - 告警确认：用户操作 → API → WebSocket → store → UI
   - 确保状态变更的即时反馈和一致性
   - 验证实时数据流的完整性

### 关键变更

#### 1. UI/UX 重构

**页面结构**
```
AlarmCenterPage
├── Tabs 组件
│   ├── 实时告警标签页
│   │   ├── 告警统计卡片（待处理、严重、紧急）
│   │   ├── 实时告警表格
│   │   └── 确认按钮（每行）
│   └── 历史告警标签页
│       ├── 筛选条件区
│       │   ├── 设备选择
│       │   ├── 告警等级选择
│       │   ├── 日期范围选择器
│       │   └── 执行查询按钮
│       ├── 历史告警表格
│       └── 分页组件
```

**实时告警视图**
- 顶部展示统计卡片（待处理告警数、严重告警数、紧急告警数）
- 数据表格展示 `alarms-store.activeAlarms`
- 自动响应 WebSocket 推送，无需刷新
- 每行提供"确认"按钮

**历史告警视图**
- 筛选条件区：
  - 设备选择（下拉框）
  - 告警等级（多选）
  - 告警状态（多选）
  - 日期范围选择器
  - 执行查询按钮
- 结果展示区：
  - 数据表格（展示查询结果）
  - 分页组件

#### 2. 数据流重构

**alarms-store.ts 扩展**

新增状态：
```typescript
historicalAlarms: {
  items: Alarm[]
  total: number
  page: number
  pageSize: number
}
queryStatus: 'idle' | 'loading' | 'success' | 'error'
queryFilters: AlarmFilters
```

新增动作：
```typescript
fetchHistoricalAlarms(filters: AlarmFilters, page: number): Promise<void>
setQueryFilters(filters: AlarmFilters): void
setQueryPage(page: number): void
```

**alarms-service.ts 扩展**

新增方法（如果尚未实现）：
```typescript
async fetchHistoricalAlarms(params: {
  page: number
  pageSize: number
  filters: AlarmFilters
}): Promise<AlarmPaginatedResponse>
```

确认方法已实现：
```typescript
async acknowledgeAlarm(alarmId: string, note?: string): Promise<void>
```

#### 3. 闭环数据流验证

**告警确认流程**
```
用户点击"确认"按钮
  ↓
调用 alarms-store.acknowledgeAlarm(alarmId)
  ↓
alarms-service.acknowledgeAlarm(alarmId) 发送 POST /api/alarms/{id}/ack
  ↓
后端处理后，通过 WebSocket 推送 alarm:update 事件
  ↓
realtime-service 接收事件并分发给 alarms-store
  ↓
alarms-store.handleRealtimeAlarm 处理更新（从 activeAlarms 移除已确认告警）
  ↓
UI 自动响应状态变化，告警从实时列表中消失
```

**历史查询流程**
```
用户配置筛选条件 → 点击"执行查询"
  ↓
调用 alarms-store.fetchHistoricalAlarms(filters, page)
  ↓
alarms-service.fetchHistoricalAlarms() 发送 GET /api/alarms/history
  ↓
接收分页数据，更新 historicalAlarms 状态
  ↓
UI 展示查询结果
```

## 影响范围

### 受影响的文件

#### 需要新建
- `src/components/AlarmCenterPage.tsx` - 告警中心页面主组件
- `src/components/AlarmCenterPage/RealTimeAlarmsView.tsx` - 实时告警视图
- `src/components/AlarmCenterPage/HistoricalAlarmsView.tsx` - 历史告警视图
- `src/components/AlarmCenterPage/AlarmFilters.tsx` - 告警筛选组件
- `src/components/AlarmCenterPage/AlarmTable.tsx` - 告警表格组件

#### 需要修改
- `src/stores/alarms-store.ts` - 扩展历史告警查询状态和动作
- `src/services/alarms-service.ts` - 确保历史查询接口已实现
- `src/App.tsx` 或路由配置文件 - 添加告警中心页面路由

#### 可能需要创建
- `src/components/ui/tabs.tsx` - Tabs 组件（如果不存在）
- `src/components/ui/date-range-picker.tsx` - 日期范围选择器（如果不存在）

### 受影响的功能

1. **告警管理工作流**
   - 用户将获得统一的告警管理入口
   - 实时告警和历史告警在一个页面中管理

2. **数据流验证**
   - 验证实时数据流的完整性（WebSocket → store → UI）
   - 验证用户操作的闭环反馈机制

3. **模式复用**
   - 验证 DataQueryPage 模式在其他场景的可复用性

## 预期成果

### 用户体验提升

1. **统一的告警管理中心**
   - 一个页面管理所有告警
   - 清晰的视图切换（实时 vs 历史）
   - 流畅的交互体验

2. **实时响应能力**
   - 实时告警自动推送到页面
   - 告警确认后立即更新
   - 无需手动刷新

3. **强大的查询能力**
   - 灵活的筛选条件
   - 分页浏览历史告警
   - 快速定位问题

### 技术架构验证

1. **闭环数据流验证**
   - 验证 WebSocket 实时推送 → store 更新 → UI 响应
   - 验证用户操作 → API → WebSocket → store → UI 的完整闭环

2. **模式复用验证**
   - 验证 DataQueryPage 的"筛选-分页列表"模式可复用性
   - 为后续页面开发提供标准模板

3. **架构最佳实践**
   - 展示新架构下实时数据流与用户驱动请求的协同工作
   - 为其他功能模块提供参考实现

## 成功指标

1. **功能完整性**
   - 实时告警自动推送并展示
   - 历史告警查询功能正常
   - 告警确认操作的闭环反馈正常

2. **用户体验**
   - 页面响应流畅，无明显卡顿
   - 实时更新无延迟
   - 交互逻辑清晰直观

3. **代码质量**
   - 代码结构清晰，职责明确
   - 复用现有组件和模式
   - 无类型错误，通过 TypeScript 检查

## 风险与缓解

### 风险

1. **后端 API 支持不足**
   - 后端可能尚未实现历史告警查询接口
   - **缓解**：在实施前与后端团队确认 API 能力，必要时先完成后端开发

2. **WebSocket 闭环未验证**
   - 告警确认后的 WebSocket 推送可能存在问题
   - **缓解**：先在开发环境进行完整的端到端测试

3. **状态管理复杂度**
   - store 同时管理实时数据和历史数据可能增加复杂度
   - **缓解**：清晰划分状态，使用明确的命名和注释

4. **UI 组件缺失**
   - 可能缺少 Tabs、DateRangePicker 等组件
   - **缓解**：优先检查现有组件库，必要时创建简化版本

## 依赖关系

### 前置依赖

- ✅ `activate-realtime-data-flow`（假设已完成）：实时告警推送机制已激活
- ✅ `alarms-store.ts`：基础的实时告警状态管理已实现
- ✅ `alarms-service.ts`：基础的告警服务方法已实现
- ⚠️ `refactor-data-query-page`（进行中）：提供可复用的"筛选-分页列表"模式

### 后续依赖

- 本变更完成后，告警管理功能基本完备
- 可以进一步实现告警统计分析、智能处理等高级功能

## 替代方案

### 方案 A：分离的实时告警和历史告警页面
- 创建两个独立的页面
- **缺点**：用户需要在多个页面间切换，体验割裂

### 方案 B：只实现实时告警视图
- 暂不实现历史查询功能
- **缺点**：无法满足用户查询历史告警的需求

### 推荐方案：双模视图设计（本提案）
- 在一个页面中通过 Tabs 实现双模视图
- **优点**：统一入口，体验流畅，功能完整

## 相关文档

- [设计文档](./design.md) - 详细的技术设计和架构说明
- [任务列表](./tasks.md) - 详细的实施任务分解
- [DataQueryPage 提案](../refactor-data-query-page/proposal.md) - 参考的筛选-分页列表模式

## 审批和反馈

请审阅本提案并提供反馈：

- [ ] 是否同意整体方向？
- [ ] 是否有遗漏的关键需求？
- [ ] 是否有更好的替代方案？
- [ ] 实施计划是否合理？

---

**提案作者**: AI Assistant
**创建日期**: 2025-12-14
**最后更新**: 2025-12-14
**状态**: 待审批
