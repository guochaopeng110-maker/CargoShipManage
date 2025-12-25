# 重构健康评估页面：确立"总-分-细"三段式布局模板

## 概述

将 HealthAssessmentPage 重构为标准化的、以"结论"为导向的页面模板。该页面的核心目的不是展示原始的实时数据，而是呈现基于数据分析得出的健康状态、诊断建议和趋势预测，为管理者提供一个高级、可执行的全局健康概览。

## 问题陈述

### 当前痛点

目前的健康评估页面（HealthAssessmentPage.tsx）存在以下问题：

1. **页面结构缺乏标准化**
   - 现有页面展示了大量原始监测数据（SOC、SOH、温度等）
   - 缺少清晰的"总览-分系统-详细报告"层次结构
   - 用户难以快速把握整体健康状况

2. **缺少系统级健康卡片抽象**
   - 没有统一的分系统健康状态展示组件
   - 无法快速了解各子系统（电池、推进、逆变器等）的健康状况
   - 缺少从概览到详情的导航路径

3. **历史报告管理功能缺失**
   - 虽然后端提供了 `/api/reports/health` 接口
   - 但前端缺少历史健康报告的列表和查询功能
   - 无法追溯和对比历史健康评估结果

4. **跨 Store 数据聚合不足**
   - 健康评估应该结合告警数据（来自 alarms-store）
   - 当前页面未展示各系统的活跃告警数量
   - 缺少健康状态与告警关联的全局视图

5. **后端 API 接口已更新**
   - 后端更改了 `/api/reports/health` 接口
   - `GenerateHealthReportDto.ts` 和 `HealthReport.ts` 已更新
   - 前端代码需要适配新的 API 结构

### 用户需求

用户期望的健康评估页面应该：

1. **一目了然的整船健康状态**：通过大型仪表盘快速了解整体健康评分和等级
2. **分系统健康概览**：清晰展示各核心系统（推进、电池、逆变器等）的健康状况
3. **趋势可视化**：展示各系统健康分数的近期变化趋势
4. **告警关联**：在健康卡片上显示该系统的活跃告警数量
5. **历史追溯**：查询和查看历史生成的健康评估报告
6. **快速导航**：从健康卡片直接跳转到对应系统的详细监控页面

## 目标

### 主要目标

1. **确立"总-分-细"三段式布局标准**
   - **顶部（总）**：全船健康仪表盘，展示综合健康评分和等级
   - **中部（分）**：系统健康卡片矩阵，展示各子系统的健康状况
   - **底部（细）**：历史报告列表，支持分页浏览和查询

2. **创建可复用的 SystemHealthCard 组件**
   - 展示分系统的独立健康评分
   - 内嵌迷你趋势图（Sparkline）展示近期健康分变化
   - 显示该系统的活跃告警数量（高危/紧急）
   - 整个卡片可点击，导航至对应的详细监控页面

3. **实现混合数据流模式**
   - **实时健康数据**：通过 health-store 订阅 WebSocket 推送的 `equipment:health:update` 事件
   - **历史报告数据**：通过 health-store 调用 `/api/reports/health` 接口按需获取
   - **跨 Store 聚合**：从 alarms-store 获取活跃告警数，展示在系统健康卡片上

4. **适配后端 API 变更**
   - 使用更新后的 `GenerateHealthReportDto` 和 `HealthReport` 类型
   - 确保与新的 `/api/reports/health` 接口正确交互
   - 实现报告生成、查询和列表展示功能

5. **建立页面模板范式**
   - 验证"总-分-细"布局在其他页面的可复用性
   - 为后续页面重构提供参考模板
   - 演示混合数据流（实时 + API）的标准实现

### 非目标

以下内容不在本次重构范围内：

- 健康评估算法和评分逻辑（由后端负责）
- 健康报告的编辑和删除功能（非核心需求）
- 健康预警的自动通知配置（后续功能）
- 健康趋势的深度分析和预测（专门的分析页面）

## 解决方案

### 核心设计原则

1. **结论导向** (Conclusion-Oriented)
   - 页面重点展示分析结论（健康评分、等级、趋势）而非原始数据
   - 原始监测数据由专门的监测页面（BatteryMonitoringPage 等）负责

2. **层次清晰** (Clear Hierarchy)
   - 顶部：整体健康状况（总）
   - 中部：各系统健康状况（分）
   - 底部：历史报告记录（细）
   - 用户可以快速定位关注层级

3. **数据聚合** (Data Aggregation)
   - 聚合来自多个 store 的数据（health-store + alarms-store）
   - 展示健康状态与告警的关联关系
   - 提供全局健康视图

4. **交互友好** (Interactive)
   - 系统健康卡片可点击，跳转至详情页
   - 历史报告支持分页浏览
   - 提供报告生成和导出功能

### 关键变更

#### 1. UI/UX 重构

**顶部 - 全船健康仪表盘**
- 使用大尺寸 GaugeChart 组件展示整船综合健康评分
- 根据健康等级（良好/一般/较差）动态改变背景色或主题色
- 清晰标示健康等级文字
- 添加刷新按钮，支持手动更新数据

**中部 - 系统健康卡片矩阵**
- 创建新的 `SystemHealthCard.tsx` 组件
- 采用响应式网格布局（Grid），适配不同屏幕尺寸
- 为核心设备系统（推进、电池、逆变器、配电、辅助等）各创建一个健康卡片
- 每个卡片包含：
  - 系统名称和图标
  - 独立健康评分（数值 + 进度条）
  - 迷你趋势图（Sparkline）展示近期健康分变化
  - 活跃告警数量徽章（来自 alarms-store）
  - 悬停效果和点击交互
- 卡片点击跳转至对应的详细监控页面（如 `/monitoring/battery`）

**底部 - 历史报告列表**
- 使用 DataTable 组件展示历史健康评估报告
- 表格列包含：
  - 报告 ID
  - 生成日期
  - 涉及设备/系统
  - 健康评分
  - 健康等级
  - 操作按钮（查看详情、导出）
- 支持分页功能（Pagination 组件）
- 添加"生成新报告"按钮

#### 2. 组件架构

**新增组件**
```
src/components/
├── HealthAssessmentPage/
│   ├── index.tsx                      # 主页面组件（重构）
│   ├── SystemHealthCard.tsx           # 系统健康卡片组件（新建）
│   ├── OverallHealthScorecard.tsx     # 整船健康仪表盘组件（新建）
│   └── HealthReportsList.tsx          # 历史报告列表组件（新建）
```

**组件职责划分**
- `HealthAssessmentPage/index.tsx`：页面容器，协调各子组件，管理数据流
- `OverallHealthScorecard.tsx`：顶部整船健康仪表盘
- `SystemHealthCard.tsx`：可复用的系统健康卡片组件
- `HealthReportsList.tsx`：底部历史报告列表

#### 3. 状态管理扩展

**扩展 health-store.ts**

添加历史报告管理相关状态和动作：

```typescript
interface HealthState {
  // ... 现有状态 ...

  // 新增：历史报告状态
  historicalReports: {
    items: HealthReport[];    // 报告列表
    total: number;            // 总数
    page: number;             // 当前页
    pageSize: number;         // 每页大小
  };
  reportsQueryStatus: 'idle' | 'loading' | 'success' | 'error';

  // 新增：系统健康状态（用于系统健康卡片）
  systemHealthScores: Record<string, {
    deviceId: string;
    systemName: string;
    score: number;
    grade: string;
    trend: 'improving' | 'stable' | 'declining';
    trendData: Array<{ timestamp: number; score: number }>;
    lastUpdated: number;
  }>;
}

interface HealthActions {
  // ... 现有动作 ...

  // 新增：历史报告管理
  fetchHistoricalReports: (page?: number, pageSize?: number) => Promise<void>;
  generateHealthReport: (params: GenerateHealthReportDto) => Promise<void>;
  exportReport: (reportId: string, format: 'PDF' | 'EXCEL') => Promise<string>;

  // 新增：系统健康状态管理
  fetchSystemHealthScores: () => Promise<void>;
  updateSystemHealthScore: (deviceId: string, data: HealthReport) => void;
}
```

**跨 Store 数据访问**

在 HealthAssessmentPage 中同时使用：
- `useHealthStore()`：获取健康评分和报告数据
- `useAlarmsStore()`：获取各系统的活跃告警数量

#### 4. 服务层扩展

**扩展 health-service.ts**（或创建新的服务文件）

```typescript
// 新增服务方法
export const healthReportsService = {
  // 获取历史报告列表
  async getReportsList(page: number, pageSize: number) {
    // 调用 Service.reportControllerFindAll()
  },

  // 生成新报告
  async generateReport(params: GenerateHealthReportDto) {
    // 调用 Service.reportControllerGenerateReport()
  },

  // 导出报告
  async exportReport(reportId: string, format: 'PDF' | 'EXCEL') {
    // 实现报告导出逻辑
  },

  // 获取系统健康评分（用于系统健康卡片）
  async getSystemHealthScores() {
    // 获取所有核心系统的健康评分
  }
};
```

#### 5. 数据流设计

**实时健康数据流**
```
WebSocket (equipment:health:update)
  → realtime-service
  → health-store.handleHealthUpdate()
  → health-store.systemHealthScores 更新
  → OverallHealthScorecard & SystemHealthCard 自动响应
```

**历史报告数据流**
```
用户点击"查询"或"下一页"
  → health-store.fetchHistoricalReports()
  → healthReportsService.getReportsList()
  → Service.reportControllerFindAll()
  → 更新 health-store.historicalReports
  → HealthReportsList 组件重新渲染
```

**跨 Store 数据聚合**
```
SystemHealthCard 渲染时：
  - 从 health-store.systemHealthScores 获取健康评分和趋势
  - 从 alarms-store.criticalAlarms 过滤该系统的告警数量
  - 聚合展示在卡片上
```

#### 6. 路由和导航

**健康卡片导航映射**
```typescript
const systemRouteMap = {
  'battery': '/monitoring/battery',
  'propulsion': '/propulsion',
  'inverter': '/inverter',
  'power-distribution': '/power-distribution',
  'auxiliary': '/auxiliary'
};
```

SystemHealthCard 组件点击时，根据 `systemId` 导航到对应页面。

### 技术实现细节

**Sparkline 趋势图实现**
- 使用 recharts 的 LineChart 组件
- 配置 mini 模式（无坐标轴、无图例、最小高度）
- 数据来源：health-store.systemHealthScores[deviceId].trendData

**健康等级颜色映射**
```typescript
const gradeColorMap = {
  'Excellent': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500' },
  'Good': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  'Fair': { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500' },
  'Poor': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  'Critical': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' }
};
```

**分页参数管理**
- 默认每页显示 10 条报告
- 页码从 1 开始
- 使用 Pagination 组件处理页码切换

## 预期成果

### 交付物

1. **重构后的 HealthAssessmentPage**
   - 采用"总-分-细"三段式布局
   - 展示整船健康仪表盘、系统健康卡片矩阵和历史报告列表

2. **新建的 SystemHealthCard 组件**
   - 可复用的系统健康卡片组件
   - 集成健康评分、趋势图、告警数量展示
   - 支持点击导航

3. **扩展后的 health-store**
   - 新增历史报告状态管理
   - 新增系统健康评分状态管理
   - 实现报告查询、生成、导出动作

4. **完善的健康报告服务**
   - 实现历史报告列表查询
   - 实现报告生成和导出功能

### 验收标准

1. **功能完整性**
   - 顶部整船健康仪表盘正确展示综合评分和等级
   - 中部系统健康卡片矩阵展示所有核心系统的健康状况
   - 各系统健康卡片正确显示评分、趋势和告警数量
   - 点击健康卡片能正确跳转至对应的详细监控页面
   - 底部历史报告列表能正确分页显示历史报告
   - "生成新报告"功能正常工作
   - 报告导出功能正常工作

2. **数据流正确性**
   - 实时健康数据通过 WebSocket 正确推送并更新 UI
   - 历史报告数据通过 API 正确获取并展示
   - 跨 Store 数据（健康状态 + 告警）正确聚合显示

3. **用户体验**
   - 页面布局清晰，层次分明
   - 健康等级通过颜色清晰区分
   - 交互流畅，无明显卡顿
   - 加载状态和错误提示友好

4. **代码质量**
   - 组件职责清晰，可复用性强
   - 类型定义完整，无 TypeScript 错误
   - 代码风格符合项目规范
   - 关键逻辑有注释说明

## 影响范围

### 涉及的能力（Capabilities）

- **health-assessment**：健康评估页面的核心能力
- **ui-components**：新建的可复用 UI 组件（SystemHealthCard）

### 涉及的文件

**新建文件**
- `src/components/HealthAssessmentPage/OverallHealthScorecard.tsx`
- `src/components/HealthAssessmentPage/SystemHealthCard.tsx`
- `src/components/HealthAssessmentPage/HealthReportsList.tsx`

**修改文件**
- `src/components/HealthAssessmentPage/index.tsx`（重构）
- `src/stores/health-store.ts`（扩展状态和动作）
- `src/services/health-service.ts`（新增报告管理方法）

**依赖的现有文件**
- `src/stores/alarms-store.ts`（读取活跃告警数据）
- `src/services/api/models/GenerateHealthReportDto.ts`（已更新）
- `src/services/api/models/HealthReport.ts`（已更新）
- `src/services/api/services/Service.ts`（调用后端 API）
- `src/components/visualization/GaugeChart.tsx`（复用）
- `src/components/ui/card.tsx`（复用）
- `src/components/ui/badge.tsx`（复用）

### 后端依赖

- `POST /api/reports/health`：生成健康报告
- `GET /api/reports/health`：查询历史报告列表（需确认接口存在）
- WebSocket 事件 `equipment:health:update`：实时健康评分推送

### 迁移和兼容性

- 无数据迁移需求
- 无破坏性变更
- 向后兼容现有的 health-store API

## 风险和缓解措施

### 潜在风险

1. **后端 API 接口不完整**
   - 风险：历史报告列表查询接口可能尚未实现
   - 缓解：先使用 Mock 数据完成前端开发，后续对接真实 API

2. **实时数据推送频率过高**
   - 风险：WebSocket 推送频率过高可能导致页面频繁重渲染
   - 缓解：在 health-store 中实现防抖（debounce）或节流（throttle）逻辑

3. **跨 Store 数据同步问题**
   - 风险：health-store 和 alarms-store 的数据可能不同步
   - 缓解：确保两个 store 都订阅相同的 WebSocket 事件，或在页面级别统一协调

4. **组件复杂度增加**
   - 风险：SystemHealthCard 组件集成多个功能，可能变得过于复杂
   - 缓解：遵循单一职责原则，必要时拆分为更小的子组件

### 回退方案

如果重构出现严重问题，可以回退到当前版本的 HealthAssessmentPage：
1. 保留旧版文件备份
2. 使用 Git 回滚到重构前的提交
3. 新建的 SystemHealthCard 组件可以独立删除，不影响其他页面

## 时间线和里程碑

**第一阶段：准备和设计**（已完成）
- 调研现有代码和后端 API
- 设计"总-分-细"布局和组件架构
- 编写 OpenSpec 提案

**第二阶段：核心组件开发**
- 创建 SystemHealthCard 组件
- 创建 OverallHealthScorecard 组件
- 创建 HealthReportsList 组件

**第三阶段：状态管理和服务扩展**
- 扩展 health-store 状态和动作
- 实现 healthReportsService 服务方法
- 对接后端 API（或使用 Mock）

**第四阶段：页面集成**
- 重构 HealthAssessmentPage/index.tsx
- 集成所有子组件
- 实现数据流和交互逻辑

**第五阶段：测试和优化**
- 功能测试和边界情况验证
- 性能优化（防抖、节流、懒加载）
- UI/UX 细节调整

**第六阶段：文档和验收**
- 更新组件文档和使用说明
- 代码审查和验收测试
- 合并到主分支

## 参考资料

- **项目文档**：`docs/plan/proposal/第三阶段/3.2-确立HealthAssessmentPage页面模板.md`
- **前端重构计划**：`docs/plan/frontend_refactoring_plan.md`
- **导航配置**：`src/config/navigation.ts`
- **告警中心重构示例**：`openspec/changes/refactor-alarm-center-page/`
- **后端 API 文档**：`docs/data/http-api.json`

---

**提案状态**：待审批
**提案作者**：AI Assistant (Claude Sonnet 4.5)
**创建日期**：2025-12-14
**最后更新**：2025-12-14
