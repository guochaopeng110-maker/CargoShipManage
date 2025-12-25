# 规格：仪表板小组件

## 能力ID
`dashboard-widgets`

## 概述
定义仪表板页面的模块化小组件系统，包括关键指标墙、告警摘要、健康速览和快捷操作面板等核心小组件。

## ADDED Requirements

### Requirement: 关键指标墙展示
**描述**：仪表板 MUST 提供关键指标墙（Critical Metrics Wall），展示全船 8-12 个最核心的监测点指标。

#### Scenario: 展示电池系统关键指标
**Given** 用户打开仪表板页面
**When** 系统从 `monitoring-store` 获取到电池系统的实时数据
**Then** 应在关键指标墙中显示以下电池指标：
- 总电压（单位：V）
- SOC 荷电状态（单位：%）
- 电池温度（单位：°C）
- 电池电流（单位：A）

**And** 每个指标卡片应包含：
- 指标专属动画图标
- 实时数值
- 运行状态（normal/warning/critical）
- 趋势指示（up/down/stable）

#### Scenario: 展示推进系统关键指标
**Given** 用户打开仪表板页面
**When** 系统从 `monitoring-store` 获取到推进系统的实时数据
**Then** 应在关键指标墙中显示以下推进指标：
- 左电机转速（单位：rpm）
- 右电机转速（单位：rpm）
- 左电机功率（单位：kW）
- 右电机功率（单位：kW）

**And** 每个指标卡片应包含：
- 指标专属动画图标
- 实时数值
- 运行状态（normal/warning/critical）
- 趋势指示（up/down/stable）

#### Scenario: 指标卡片点击导航
**Given** 用户在仪表板页面查看关键指标墙
**When** 用户点击任意一个指标卡片
**Then** 应导航到该指标所属系统的详细监控页面
**And** 导航目标应基于指标类型自动确定（电池系统 → `/battery`，推进系统 → `/propulsion`）

#### Scenario: 指标状态颜色编码
**Given** 用户在仪表板页面查看关键指标
**When** 指标数值触发不同的状态阈值
**Then** 应使用以下颜色编码：
- Normal（正常）：绿色或青色
- Warning（警告）：黄色或橙色
- Critical（严重）：红色

**And** 颜色应应用于：
- 指标数值文本
- 状态图标
- 卡片边框（可选）

### Requirement: 告警摘要小组件
**描述**：仪表板 MUST 提供告警摘要小组件（Alarm Summary Widget），快速展示当前告警态势。

#### Scenario: 展示告警等级统计
**Given** 用户打开仪表板页面
**When** 系统从 `alarms-store.statistics` 获取到告警统计数据
**Then** 应展示按告警等级分类的实时统计数量：
- Critical（严重）告警数量
- High（高危）告警数量
- Medium（中等）告警数量
- Low（低危）告警数量

**And** 每个等级应使用对应的颜色标识：
- Critical：红色
- High：橙色
- Medium：黄色
- Low：蓝色

#### Scenario: 展示最新紧急告警
**Given** 用户打开仪表板页面
**When** 系统从 `alarms-store.criticalAlarms` 和 `alarms-store.emergencyAlarms` 获取数据
**Then** 应在滚动列表中展示最新 2-3 条紧急告警
**And** 每条告警应显示：
- 告警等级图标
- 告警消息摘要
- 触发时间（格式：YYYY-MM-DD HH:mm:ss）

#### Scenario: 点击告警跳转详情
**Given** 用户在告警摘要中查看最新告警列表
**When** 用户点击任意一条告警
**Then** 应导航到告警中心页面（`/alarms`）
**And** 应定位到该告警的详细信息

#### Scenario: 点击查看所有告警按钮
**Given** 用户在告警摘要小组件中
**When** 用户点击"查看所有告警"按钮
**Then** 应导航到告警中心页面（`/alarms`）

#### Scenario: 无告警时的展示
**Given** 用户打开仪表板页面
**When** 系统从 `alarms-store` 获取数据，发现当前无任何告警
**Then** 应显示友好的空状态提示："暂无实时告警"
**And** 应显示一个信息图标

### Requirement: 健康速览小组件
**描述**：仪表板 MUST 提供健康速览小组件（Health Quick-View Widget），紧凑展示整船健康状况。

#### Scenario: 展示整船平均健康分
**Given** 用户打开仪表板页面
**When** 系统从 `health-store.reports` 获取所有设备的健康报告
**Then** 应计算整船平均健康分（所有设备健康分的平均值）
**And** 应在迷你仪表盘（GaugeChart）中显示该健康分（0-100）

#### Scenario: 展示健康等级
**Given** 用户在健康速览小组件中查看健康分
**When** 健康分落在不同的分数区间
**Then** 应显示对应的健康等级：
- 90-100 分：Excellent（优秀）
- 70-89 分：Good（良好）
- 50-69 分：Fair（一般）
- 30-49 分：Poor（较差）
- 0-29 分：Critical（危急）

**And** 应使用对应的颜色标识：
- Excellent：绿色
- Good：青色
- Fair：黄色
- Poor：橙色
- Critical：红色

#### Scenario: 点击健康速览跳转健康评估页面
**Given** 用户在仪表板页面查看健康速览小组件
**When** 用户点击该小组件的任意区域
**Then** 应导航到健康评估页面（`/health`）

#### Scenario: 无健康数据时的展示
**Given** 用户打开仪表板页面
**When** 系统从 `health-store.reports` 获取数据，发现无任何健康报告
**Then** 应显示健康分为 0
**And** 应显示等级为 "Unknown"（未知）
**And** 应显示友好的提示："暂无健康数据"

### Requirement: 超级消费者数据流
**描述**：仪表板页面 MUST 作为"超级消费者"，从多个 Zustand stores 同时获取数据，但不直接发起数据请求。

#### Scenario: 从 monitoring-store 消费数据
**Given** 仪表板页面已挂载
**When** `monitoring-store` 中有实时监测数据更新
**Then** 关键指标墙应自动更新展示的数值
**And** 页面本身不应调用任何数据获取 API
**And** 应完全依赖 `monitoring-store` 已订阅的实时数据流

#### Scenario: 从 alarms-store 消费数据
**Given** 仪表板页面已挂载
**When** `alarms-store` 中有新的告警数据推送
**Then** 告警摘要小组件应自动更新展示的统计和列表
**And** 页面本身不应调用任何告警 API
**And** 应完全依赖 `alarms-store` 已订阅的实时告警流

#### Scenario: 从 health-store 消费数据
**Given** 仪表板页面已挂载
**When** `health-store` 中有健康评分更新
**Then** 健康速览小组件应自动更新展示的健康分和等级
**And** 页面本身不应调用任何健康评估 API
**And** 应完全依赖 `health-store` 已缓存的健康报告数据

#### Scenario: 离线状态下的展示
**Given** 仪表板页面已挂载
**When** `monitoring-store.realtimeConnected` 为 `false`（实时连接断开）
**Then** 应在页面顶部显示离线状态指示器
**And** 应继续展示缓存的最后数据
**And** 应在数据卡片上显示数据更新时间，提示数据可能不是最新

### Requirement: 响应式布局
**描述**：仪表板页面 MUST 支持响应式布局，在不同屏幕尺寸下提供良好的展示效果。

#### Scenario: 小屏幕设备布局
**Given** 用户在小屏幕设备（<640px）上打开仪表板
**Then** 页面应采用单列布局
**And** 关键指标墙应使用 1 列网格
**And** 小组件应垂直堆叠排列

#### Scenario: 中等屏幕设备布局
**Given** 用户在中等屏幕设备（640px-1024px）上打开仪表板
**Then** 关键指标墙应使用 2 列网格
**And** 告警摘要和健康速览可以并排显示（2 列）

#### Scenario: 大屏幕设备布局
**Given** 用户在大屏幕设备（>1024px）上打开仪表板
**Then** 关键指标墙应使用 4 列网格
**And** 所有小组件应使用优化的网格布局，最大化信息密度

### Requirement: 性能优化
**描述**：仪表板页面 MUST 进行性能优化，确保快速渲染和流畅的用户体验。

#### Scenario: 小组件 Memo 化
**Given** 开发者实现仪表板小组件
**Then** 每个小组件应使用 `React.memo` 包裹
**And** 应仅在相关数据变化时重新渲染

#### Scenario: 选择器细粒度控制
**Given** 小组件从 Zustand store 获取数据
**Then** 应使用细粒度选择器，仅订阅需要的 store 片段
**And** 应避免订阅整个 store 对象

**Example**:
```typescript
// Good: 细粒度选择器
const alarmStats = useAlarmsStore(state => state.statistics);

// Bad: 订阅整个 store
const alarmsStore = useAlarmsStore();
```

#### Scenario: 派生数据缓存
**Given** 小组件需要计算派生数据（如平均值、总和）
**Then** 应使用 `useMemo` 缓存计算结果
**And** 应仅在依赖项变化时重新计算

**Example**:
```typescript
const overallHealth = useMemo(() => {
  const reports = Object.values(healthStore.reports);
  if (reports.length === 0) return { score: 0, grade: 'Unknown' };
  const avgScore = reports.reduce((sum, r) => sum + r.score, 0) / reports.length;
  return {
    score: Math.round(avgScore),
    grade: getGradeFromScore(avgScore)
  };
}, [healthStore.reports]);
```

## MODIFIED Requirements

### Requirement: 仪表板页面主组件重构
**描述**：现有的 `DashboardPage` 组件 MUST 重构为基于小组件的模块化布局。

#### Scenario: 使用小组件替换内嵌代码
**Given** 现有 `DashboardPage` 包含内嵌的告警、健康展示代码
**When** 执行重构
**Then** 应将这些功能提取为独立的小组件：
- `AlarmSummaryWidget`
- `HealthQuickViewWidget`
- `CriticalMetricsWall`

**And** `DashboardPage` 应仅负责布局和小组件组合

#### Scenario: 移除模拟数据
**Given** 现有 `DashboardPage` 包含模拟的告警和活动日志数据
**When** 执行重构
**Then** 应移除所有模拟数据初始化代码
**And** 应完全依赖 Zustand stores 的真实数据

#### Scenario: 保持现有导航功能
**Given** 现有 `DashboardPage` 提供导航功能
**When** 执行重构
**Then** 应保持所有导航链接和跳转功能
**And** 应确保 `onNavigate` 回调在所有小组件中正确传递

#### Scenario: 简化页面头部
**Given** 现有 `DashboardPage` 的页面头部包含报表生成器组件
**When** 执行重构
**Then** 应从页面头部移除报表生成器组件
**And** 页面头部应仅包含标题和连接状态指示器

#### Scenario: 移除现有系统卡片
**Given** 现有 `DashboardPage` 包含电池系统概览卡片、推进系统状态卡片、活动日志卡片等
**When** 执行重构
**Then** 应移除所有这些现有的系统卡片
**And** 页面应仅包含三个核心小组件：`CriticalMetricsWall`、`AlarmSummaryWidget`、`HealthQuickViewWidget`
**And** 页面布局应更加简洁，聚焦于关键信息展示

## 验收标准

### 功能验收
- 所有核心小组件（关键指标墙、告警摘要、健康速览）正常显示
- 数据完全来自 `monitoring-store`、`alarms-store`、`health-store`
- 所有导航链接正常工作
- 响应式布局在不同屏幕尺寸下正常显示
- 页面头部简洁，不包含报表生成器
- 页面布局简洁，仅包含三个核心小组件，不包含旧的系统卡片

### 技术验收
- 代码符合项目规范（React 函数组件、TypeScript 类型定义）
- 小组件可复用，已导出供其他页面使用
- 无 TypeScript 编译错误
- 无明显性能问题（渲染时间、内存占用）

### 视觉验收
- 符合项目设计风格（暗色主题、玻璃态效果、动画）
- 信息层级清晰，视觉引导明确
- 关键信息突出显示，易于识别
