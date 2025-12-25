# 设计文档：重构仪表板页面

## 架构概览

### 系统定位
`DashboardPage` 是应用的"着陆页"和"指挥中心"，负责聚合来自多个子系统的关键实时信息，为用户提供全局态势的快速评估视图。

### 核心设计原则

1. **单一数据流向**（Unidirectional Data Flow）
   - 数据流向：`Services → Stores → Widgets → DashboardPage`
   - DashboardPage 作为"超级消费者"，仅订阅和展示数据，不发起数据请求

2. **关注点分离**（Separation of Concerns）
   - 每个 Widget 负责单一功能域（告警、健康、监控、导航）
   - Widget 可独立开发、测试和复用

3. **响应式优先**（Responsive First）
   - 采用 CSS Grid 和 Flexbox 实现自适应布局
   - 确保在桌面、平板、移动设备上的良好展示

4. **性能优化**（Performance Optimization）
   - 使用 React.memo 避免不必要的重渲染
   - 使用 useMemo 缓存计算结果
   - 避免在 Widget 中直接订阅 WebSocket（依赖 Stores 的订阅）

## 组件架构

### 整体层级结构

```
DashboardPage (容器组件)
├── PageHeader (页面头部)
│   ├── Title
│   └── ConnectionStatusIndicator
├── CriticalMetricsWall (关键指标墙)
│   └── MetricCard[] (指标卡片数组)
├── AlarmSummaryWidget (告警摘要小组件)
│   ├── AlarmStatistics (告警统计)
│   ├── RecentAlarmsList (最新告警列表)
│   └── ViewAllAlarmsButton (查看全部按钮)
└── HealthQuickViewWidget (健康速览小组件)
    ├── HealthGaugeChart (健康仪表盘)
    └── ClickableArea (可点击区域)
```

### 核心小组件设计

#### 1. CriticalMetricsWall（关键指标墙）

**职责**：
- 展示 8-12 个全船最核心的监测点指标
- 使用 `MetricCard` 组件矩阵布局
- 支持点击跳转到详细页面

**数据源**：
- `monitoring-store.devices` - 设备实时数据
- `monitoring-store.performanceMetrics` - 性能指标

**Props 接口**：
```typescript
interface CriticalMetricsWallProps {
  onMetricClick?: (monitoringPointId: string) => void;
}
```

**关键指标选择**：
1. 电池系统：总电压、SOC、温度、电流
2. 推进系统：左/右电机转速、功率
3. 变频器系统：直流母线电压
4. 配电系统：总负载

**布局**：
- 响应式网格：`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- 每个卡片展示：图标、数值、单位、状态、趋势

#### 2. AlarmSummaryWidget（告警摘要小组件）

**职责**：
- 按告警等级（critical、high、medium、low）分类统计
- 滚动展示最新 2-3 条紧急告警
- 提供跳转至告警中心的入口

**数据源**：
- `alarms-store.statistics` - 告警统计数据
- `alarms-store.criticalAlarms` - 严重告警列表
- `alarms-store.emergencyAlarms` - 紧急告警列表

**Props 接口**：
```typescript
interface AlarmSummaryWidgetProps {
  maxRecentAlarms?: number; // 默认 3
  onViewAllClick?: () => void;
  onAlarmClick?: (alarmId: string) => void;
}
```

**关键功能**：
1. **统计卡片**：
   - 严重（Critical）：红色
   - 高危（High）：橙色
   - 中等（Medium）：黄色
   - 低危（Low）：蓝色

2. **最新告警滚动列表**：
   - 展示最新 2-3 条紧急告警
   - 每条包括：图标、消息、时间
   - 支持点击查看详情

3. **快捷入口**：
   - "查看所有告警"按钮
   - 跳转到 `/alarms` 页面

#### 3. HealthQuickViewWidget（健康速览小组件）

**职责**：
- 显示总健康分和等级
- 提供迷你版的健康仪表盘
- 整个组件可点击跳转至健康评估页面

**数据源**：
- `health-store.reports` - 健康报告数据
- 计算整船平均健康分

**Props 接口**：
```typescript
interface HealthQuickViewWidgetProps {
  onClick?: () => void;
}
```

**关键功能**：
1. **健康仪表盘**：
   - 使用现有的 `GaugeChart` 组件
   - 尺寸：`size="medium"`
   - 显示总健康分（0-100）

2. **健康等级**：
   - Excellent (优秀)：90-100
   - Good (良好)：70-89
   - Fair (一般)：50-69
   - Poor (较差)：30-49
   - Critical (危急)：0-29

3. **交互**：
   - 整个卡片可点击
   - Hover 效果：`hover:bg-slate-800`

## 数据流设计

### 数据流向图

```
┌─────────────────┐
│  Backend API    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ WebSocket       │      │ REST API        │      │ Polling         │
│ (Real-time)     │      │ (On-demand)     │      │ (Fallback)      │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌────────────────────────────────────────────────────────────────┐
│                      Services Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ realtime-    │  │ alarms-      │  │ health-      │         │
│  │ service      │  │ service      │  │ service      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬───────────────────┬───────────────────┬───────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────────────────────────────────────────────────────┐
│                      Zustand Stores                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ monitoring-  │  │ alarms-      │  │ health-      │         │
│  │ store        │  │ store        │  │ store        │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬───────────────────┬───────────────────┬───────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────────────────────────────────────────────────────┐
│                      Widget Components                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ CriticalMetrics│ │ AlarmSummary │  │ HealthQuick  │         │
│  │ Wall         │  │ Widget       │  │ ViewWidget   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└────────┬───────────────────┬───────────────────┬───────────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ DashboardPage  │
                    └────────────────┘
```

### Store 订阅策略

#### monitoring-store
- **订阅时机**：DashboardPage `useEffect` 初始化时
- **订阅内容**：
  - `devices` - 设备实时数据
  - `performanceMetrics` - 性能指标
  - `connectionStatus` - 连接状态
- **选择器优化**：
  ```typescript
  const criticalDevices = useMonitoringStore(
    state => Object.values(state.devices).filter(d =>
      ['SYS-BAT-001', 'SYS-PROP-L-001', 'SYS-PROP-R-001'].includes(d.deviceId)
    )
  );
  ```

#### alarms-store
- **订阅时机**：AlarmSummaryWidget `useEffect` 初始化时
- **订阅内容**：
  - `statistics` - 告警统计
  - `criticalAlarms` - 严重告警
  - `emergencyAlarms` - 紧急告警
- **选择器优化**：
  ```typescript
  const alarmStats = useAlarmsStore(state => state.statistics);
  const recentCritical = useAlarmsStore(
    state => state.criticalAlarms.slice(0, 3)
  );
  ```

#### health-store
- **订阅时机**：HealthQuickViewWidget `useEffect` 初始化时
- **订阅内容**：
  - `reports` - 健康报告
- **派生数据**：
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

## 性能优化

### 渲染优化

1. **组件 Memo 化**
   ```typescript
   export const AlarmSummaryWidget = React.memo(({ ... }) => {
     // ...
   });
   ```

2. **选择器细粒度控制**
   - 仅订阅需要的 store 片段
   - 使用 shallow equality 检查

3. **虚拟化长列表**
   - 告警列表超过 10 条时使用虚拟滚动
   - 使用 `react-window` 或 `react-virtual`

### 数据缓存

1. **Store 级别缓存**
   - `monitoring-store`：缓存最近 5 分钟的数据
   - `alarms-store`：缓存最近 100 条告警
   - `health-store`：缓存最近的健康报告

2. **组件级别缓存**
   ```typescript
   const memoizedMetrics = useMemo(() => {
     return calculateCriticalMetrics(devices);
   }, [devices]);
   ```

## 状态管理

### 本地状态（useState）
- UI 交互状态（hover、展开/收起）
- 临时输入状态

### 全局状态（Zustand Stores）
- 监控数据（`monitoring-store`）
- 告警数据（`alarms-store`）
- 健康数据（`health-store`）

### 派生状态（useMemo）
- 统计计算（平均值、总和、百分比）
- 数据转换（格式化、过滤、排序）

## 错误处理

### 数据缺失处理

1. **Store 数据为空**
   - 显示占位符："暂无数据"
   - 提供刷新按钮

2. **Store 错误状态**
   - 显示错误提示
   - 提供重试机制

### 降级策略

1. **实时连接失败**
   - 显示离线状态
   - 使用缓存数据
   - 提供手动刷新

2. **部分数据缺失**
   - 隐藏缺失的小组件
   - 显示警告提示

## 测试策略

### 单元测试
- Widget 组件渲染测试
- 数据转换逻辑测试
- 选择器函数测试

### 集成测试
- DashboardPage 整体渲染测试
- Store 订阅和数据流测试
- 导航交互测试

### 视觉回归测试
- 不同屏幕尺寸的快照测试
- 不同数据状态的快照测试

## 可访问性（A11y）

1. **语义化 HTML**
   - 使用正确的标题层级（h1、h2、h3）
   - 使用 `<button>` 而非 `<div>` 作为可点击元素

2. **键盘导航**
   - 确保所有交互元素可通过 Tab 键访问
   - 提供快捷键支持（可选）

3. **屏幕阅读器支持**
   - 添加 `aria-label` 描述
   - 使用 `role` 属性标识组件角色

## 未来扩展

### 短期扩展
1. **小组件配置**
   - 用户可选择显示/隐藏小组件
   - 保存配置到 `localStorage`

2. **数据刷新控制**
   - 手动刷新按钮
   - 自动刷新间隔设置

### 中期扩展
1. **布局自定义**
   - 支持拖拽调整小组件位置
   - 支持调整小组件尺寸

2. **数据导出**
   - 导出仪表板数据为 PDF
   - 导出为 Excel

### 长期扩展
1. **多仪表板支持**
   - 用户可创建多个仪表板
   - 支持仪表板模板

2. **高级分析**
   - 集成数据分析工具
   - 提供趋势预测功能

## 技术债务

### 当前已知问题
1. **模拟数据残留**
   - 当前 DashboardPage 中仍有模拟的活动日志数据
   - 需要迁移到真实的日志 store

2. **硬编码监测点 ID**
   - 关键指标的监测点 ID 目前硬编码
   - 应该从配置文件或 API 获取

### 重构优先级
1. **高优先级**：迁移数据源到真实 stores
2. **中优先级**：提取小组件，提高复用性
3. **低优先级**：添加单元测试覆盖

## 相关决策记录

### 为什么选择小组件化架构？
- **复用性**：小组件可在其他页面复用
- **可测试性**：独立的小组件更易于测试
- **可维护性**：关注点分离，降低维护成本

### 为什么采用"超级消费者"模式？
- **一致性**：数据源统一，避免重复请求
- **性能**：复用 Store 的订阅，减少 WebSocket 连接
- **简化逻辑**：页面组件不需要处理数据获取

### 为什么不在 Widget 中直接订阅 WebSocket？
- **职责单一**：Widget 仅负责展示，Store 负责数据管理
- **避免重复**：多个 Widget 订阅同一数据源会造成浪费
- **易于调试**：集中的订阅管理更易于追踪问题
