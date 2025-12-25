# 技术设计：健康评估页面重构

## 背景

健康评估页面是货船智能机舱管理系统的核心功能之一，需要为管理者提供清晰、高效的设备健康状态概览。本设计文档阐述重构过程中的关键技术决策、架构选择和实现细节。

## 设计目标

### 功能目标

1. 建立标准化的"总-分-细"三段式页面布局模板
2. 提供清晰的整船健康状态概览
3. 支持实时健康数据更新和历史报告查询
4. 实现跨 Store 数据聚合（健康状态 + 告警）
5. 提供从概览到详情的导航路径

### 非功能目标

1. **性能**：页面加载时间 < 2 秒，实时更新响应时间 < 500ms
2. **可维护性**：组件职责清晰，代码复用率高
3. **可扩展性**：支持新增系统健康卡片，支持扩展报告类型
4. **用户体验**：交互流畅，加载状态和错误提示友好

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│              HealthAssessmentPage (Container)            │
│  ┌───────────────────────────────────────────────────┐  │
│  │        OverallHealthScorecard (顶部)              │  │
│  │  - 整船综合健康评分                               │  │
│  │  - 动态颜色和等级标识                             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │      SystemHealthCard Grid (中部)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │ Battery  │ │Propulsion│ │ Inverter │  ...      │  │
│  │  │ Health   │ │ Health   │ │ Health   │           │  │
│  │  │ Card     │ │ Card     │ │ Card     │           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  │  (每个卡片包含：评分、趋势、告警数)                 │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │        HealthReportsList (底部)                    │  │
│  │  - 历史报告表格                                     │  │
│  │  - 分页控件                                         │  │
│  │  - 操作按钮（查看、导出）                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘

        ↓ 数据流                   ↓ 数据流
┌──────────────────┐      ┌──────────────────┐
│  health-store    │      │  alarms-store    │
│  - 健康评分       │      │  - 活跃告警       │
│  - 历史报告       │      │  - 告警统计       │
└──────────────────┘      └──────────────────┘
        ↑                         ↑
        │ API                     │ WebSocket
        ↓                         ↓
┌──────────────────────────────────────────┐
│              Backend Services             │
│  - /api/reports/health (报告管理)         │
│  - WebSocket: equipment:health:update     │
│  - WebSocket: alarm:push                  │
└──────────────────────────────────────────┘
```

### 组件层次结构

```
HealthAssessmentPage/
├── index.tsx                       # 页面容器组件
│   ├── useHealthStore()            # 健康状态管理
│   ├── useAlarmsStore()            # 告警状态管理（只读）
│   └── useNavigate()               # 路由导航
│
├── OverallHealthScorecard.tsx      # 整船健康仪表盘
│   ├── GaugeChart                  # 仪表盘图表（复用）
│   ├── Badge                       # 等级标识（复用）
│   └── Button (刷新)               # 刷新按钮（复用）
│
├── SystemHealthCard.tsx            # 系统健康卡片（可复用）
│   ├── props:
│   │   - systemId: string
│   │   - systemName: string
│   │   - icon: ReactNode
│   │   - healthScore: number
│   │   - grade: string
│   │   - trend: 'improving' | 'stable' | 'declining'
│   │   - trendData: Array<{timestamp, score}>
│   │   - activeAlarmsCount: number
│   │   - onNavigate: () => void
│   ├── Sparkline (Mini LineChart)  # 趋势图
│   ├── Badge (告警数徽章)          # 告警数量
│   └── Card (可点击容器)           # 卡片容器
│
└── HealthReportsList.tsx           # 历史报告列表
    ├── DataTable                   # 报告表格（复用）
    ├── Pagination                  # 分页控件（复用）
    └── Button (生成报告)           # 生成报告按钮
```

## 核心技术决策

### 决策 1：采用"总-分-细"三段式布局

**背景**：需要在一个页面中同时展示整体健康状况、各系统健康状况和历史报告，确保用户能够快速定位关注层级。

**方案选择**：
- **方案 A（选定）**：三段式垂直布局
  - 优点：层次清晰，符合用户从总体到细节的认知流程
  - 优点：每个层级独立渲染，性能较好
  - 缺点：需要滚动查看底部内容
- **方案 B**：Tab 切换视图
  - 优点：节省屏幕空间
  - 缺点：无法同时查看不同层级的信息
  - 缺点：增加交互步骤
- **方案 C**：左右分栏布局
  - 优点：可以同时查看多个层级
  - 缺点：水平空间不足，卡片矩阵难以展开
  - 缺点：在小屏幕上体验较差

**决策理由**：方案 A 的垂直三段式布局最符合"总-分-细"的设计理念，用户可以自然地从上到下浏览，层次清晰且易于实现。

### 决策 2：创建独立的 SystemHealthCard 组件

**背景**：需要为多个系统（电池、推进、逆变器等）展示统一格式的健康卡片。

**方案选择**：
- **方案 A（选定）**：创建可复用的 SystemHealthCard 组件
  - 优点：高度可复用，新增系统只需传入不同 props
  - 优点：组件逻辑集中，易于维护和测试
  - 优点：可以在其他页面复用
  - 缺点：需要设计灵活的 props 接口
- **方案 B**：在父组件中直接渲染卡片
  - 优点：实现简单
  - 缺点：代码重复，难以维护
  - 缺点：无法复用到其他页面
- **方案 C**：为每个系统创建专门的卡片组件
  - 优点：每个系统可以高度定制
  - 缺点：组件数量多，维护成本高
  - 缺点：代码重复严重

**决策理由**：方案 A 的可复用组件设计符合 DRY 原则，能够显著降低代码重复和维护成本，同时保持足够的灵活性。

### 决策 3：混合数据流模式（实时 + API）

**背景**：页面需要同时处理实时健康数据推送和历史报告查询两种数据流。

**方案选择**：
- **方案 A（选定）**：混合模式，分别处理实时和历史数据
  - 实时数据：WebSocket → health-store → UI 自动更新
  - 历史数据：用户操作 → API 请求 → health-store → UI 更新
  - 优点：数据流清晰，职责分离
  - 优点：实时数据不依赖 API 轮询，性能好
  - 缺点：需要管理两种数据流
- **方案 B**：仅使用 API 轮询
  - 优点：数据流统一
  - 缺点：实时性差，服务器压力大
  - 缺点：用户体验不佳（延迟高）
- **方案 C**：仅使用 WebSocket
  - 优点：完全实时
  - 缺点：历史报告查询不适合 WebSocket
  - 缺点：需要复杂的 WebSocket 协议设计

**决策理由**：方案 A 的混合模式充分利用了 WebSocket 的实时性和 HTTP API 的灵活性，能够为不同场景选择最合适的数据传输方式。

### 决策 4：跨 Store 数据聚合在页面层级

**背景**：系统健康卡片需要同时展示来自 health-store 的健康评分和来自 alarms-store 的告警数量。

**方案选择**：
- **方案 A（选定）**：在页面组件中聚合数据，传递给子组件
  - 优点：Store 职责单一，不相互依赖
  - 优点：数据流清晰，易于调试
  - 缺点：页面组件需要订阅多个 Store
- **方案 B**：在 health-store 中直接读取 alarms-store
  - 优点：页面组件简单
  - 缺点：Store 之间产生耦合，难以维护
  - 缺点：违反单一职责原则
- **方案 C**：创建新的聚合 Store
  - 优点：数据聚合逻辑集中
  - 缺点：增加复杂度，Store 数量增加
  - 缺点：可能导致数据冗余

**决策理由**：方案 A 保持了 Store 的独立性和单一职责，虽然页面组件需要订阅多个 Store，但数据流清晰且易于测试。

### 决策 5：Sparkline 趋势图实现

**背景**：系统健康卡片需要展示近期健康分的变化趋势，要求简洁、直观。

**方案选择**：
- **方案 A（选定）**：使用 recharts LineChart 的 mini 模式
  - 优点：与项目现有图表库一致
  - 优点：功能完善，支持交互（tooltip）
  - 缺点：库体积较大
- **方案 B**：使用 Canvas 手动绘制
  - 优点：体积小，性能好
  - 缺点：需要自己实现所有逻辑
  - 缺点：可维护性差
- **方案 C**：使用 SVG 手动绘制
  - 优点：声明式，易于理解
  - 缺点：交互功能需要自己实现
  - 缺点：开发成本高

**决策理由**：方案 A 复用了项目现有的 recharts 库，能够快速实现功能且保持一致的用户体验。虽然库体积较大,但项目中已经使用,不会增加额外成本。

### 决策 6：历史报告分页策略

**背景**：历史报告可能有大量记录，需要分页展示。

**方案选择**：
- **方案 A（选定）**：服务端分页
  - 优点：减少网络传输和内存占用
  - 优点：适合大数据量场景
  - 缺点：需要后端支持分页接口
- **方案 B**：客户端分页
  - 优点：实现简单，无需后端配合
  - 缺点：首次加载慢，内存占用大
  - 缺点：不适合大数据量场景
- **方案 C**：虚拟滚动（无限加载）
  - 优点：用户体验流畅
  - 缺点：实现复杂度高
  - 缺点：用户难以跳转到指定页

**决策理由**：方案 A 的服务端分页是标准做法，性能和可扩展性最好，符合项目中其他列表页面（如 DataQueryPage）的实现模式。

## 数据模型设计

### 系统健康评分数据结构

```typescript
interface SystemHealthScore {
  deviceId: string;                // 设备/系统 ID
  systemName: string;              // 系统名称（如"电池系统"）
  score: number;                   // 健康评分（0-100）
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'; // 健康等级
  trend: 'improving' | 'stable' | 'declining';  // 趋势
  trendData: Array<{               // 近期趋势数据（用于 Sparkline）
    timestamp: number;             // 时间戳
    score: number;                 // 评分
  }>;
  lastUpdated: number;             // 最后更新时间
}
```

### 历史报告数据结构（基于后端 API）

```typescript
interface HealthReport {
  // 根据后端 API 定义，目前 HealthReport.ts 为空类型
  // 待后端完善后更新
}

interface HistoricalReportsState {
  items: HealthReport[];           // 报告列表
  total: number;                   // 总数
  page: number;                    // 当前页（从 1 开始）
  pageSize: number;                // 每页大小
}
```

### 系统配置数据

```typescript
// 核心系统配置（用于生成系统健康卡片）
const coreSystemsConfig = [
  {
    systemId: 'battery',
    systemName: '电池系统',
    icon: Battery,
    deviceId: 'SYS-BAT-001',
    route: '/monitoring/battery'
  },
  {
    systemId: 'propulsion',
    systemName: '推进系统',
    icon: Fan,
    deviceId: 'SYS-PROP-001',
    route: '/propulsion'
  },
  {
    systemId: 'inverter',
    systemName: '逆变器系统',
    icon: Zap,
    deviceId: 'SYS-INV-001',
    route: '/inverter'
  },
  {
    systemId: 'power-distribution',
    systemName: '配电系统',
    icon: Power,
    deviceId: 'SYS-DCPD-001',
    route: '/power-distribution'
  },
  {
    systemId: 'auxiliary',
    systemName: '辅助系统',
    icon: Settings2,
    deviceId: 'SYS-AUX-001',
    route: '/auxiliary'
  }
];
```

## 数据流设计

### 实时健康数据流

```
1. WebSocket 推送
   Event: equipment:health:update
   Payload: {
     equipmentId: 'SYS-BAT-001',
     score: 92,
     grade: 'Good',
     soh: 90,
     trend: 'stable',
     timestamp: '2025-12-14T10:30:00Z'
   }

2. realtime-service 接收并分发
   → health-store.handleHealthUpdate(payload)

3. health-store 更新状态
   - 更新 reports[equipmentId]
   - 更新 systemHealthScores[equipmentId]

4. React 组件自动响应
   - OverallHealthScorecard 重新计算综合评分
   - SystemHealthCard 更新对应卡片的评分和趋势
```

### 历史报告数据流

```
1. 用户操作
   - 用户点击"查询"按钮或翻页

2. 触发 health-store 动作
   health-store.fetchHistoricalReports(page, pageSize)

3. 调用服务层
   healthReportsService.getReportsList(page, pageSize)

4. 发送 API 请求
   Service.reportControllerFindAll({ page, pageSize })

5. 接收响应并更新状态
   health-store.historicalReports = {
     items: response.data,
     total: response.total,
     page: response.page,
     pageSize: response.pageSize
   }

6. HealthReportsList 组件重新渲染
```

### 跨 Store 数据聚合流程

```
1. 页面组件订阅多个 Store
   const { systemHealthScores } = useHealthStore();
   const { criticalAlarms } = useAlarmsStore();

2. 计算每个系统的活跃告警数
   const getActiveAlarmsCount = (deviceId: string) => {
     return criticalAlarms.filter(
       alarm => alarm.equipmentId === deviceId && alarm.status === 'PENDING'
     ).length;
   };

3. 传递聚合数据给 SystemHealthCard
   <SystemHealthCard
     systemId="battery"
     healthScore={systemHealthScores['SYS-BAT-001']?.score}
     activeAlarmsCount={getActiveAlarmsCount('SYS-BAT-001')}
     ...
   />
```

## 性能优化策略

### 1. 实时数据防抖

**问题**：WebSocket 推送频率过高可能导致页面频繁重渲染。

**方案**：在 health-store 的 `handleHealthUpdate` 中实现防抖逻辑：

```typescript
// 使用 lodash.debounce 或自定义防抖
const debouncedUpdate = debounce((payload) => {
  // 更新状态逻辑
  set(state => ({
    systemHealthScores: {
      ...state.systemHealthScores,
      [payload.equipmentId]: {
        // ... 更新数据
      }
    }
  }));
}, 500); // 500ms 防抖
```

### 2. 组件渲染优化

**问题**：父组件状态更新可能导致所有子组件重新渲染。

**方案**：
- 使用 `React.memo` 包裹 SystemHealthCard 组件
- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 包裹事件处理函数

```typescript
export const SystemHealthCard = React.memo(({
  systemId,
  healthScore,
  ...otherProps
}) => {
  // 组件逻辑
});
```

### 3. 数据缓存策略

**问题**：频繁的 API 请求影响性能和用户体验。

**方案**：
- 实时健康数据：缓存 1 分钟（health-store 已实现）
- 历史报告列表：缓存当前页数据，切换页面时才重新请求
- 系统健康评分：缓存 30 秒

### 4. 懒加载和代码分割

**问题**：页面初始加载包含大量组件和数据。

**方案**：
- 历史报告列表使用懒加载（初始不请求，用户滚动到底部时再加载）
- 使用 React.lazy 和 Suspense 分割大型组件

```typescript
const HealthReportsList = React.lazy(() =>
  import('./HealthReportsList')
);
```

## 错误处理和边界情况

### 1. WebSocket 连接断开

**处理方案**：
- 显示"实时连接已断开"提示
- 自动尝试重连（realtime-service 已实现）
- 重连成功后自动恢复数据订阅

### 2. API 请求失败

**处理方案**：
- 显示友好的错误提示
- 提供"重试"按钮
- 记录错误日志

```typescript
try {
  await health-store.fetchHistoricalReports();
} catch (error) {
  // 显示错误提示
  set({
    reportsQueryStatus: 'error',
    error: '获取历史报告失败，请稍后重试'
  });
}
```

### 3. 数据为空或缺失

**处理方案**：
- 整船健康评分为空：显示"暂无数据"
- 系统健康评分缺失：卡片显示"未评估"状态
- 历史报告列表为空：显示"暂无历史报告"提示

### 4. 趋势数据不足

**处理方案**：
- 趋势数据点 < 2：不显示 Sparkline，显示"数据不足"
- 趋势数据点 >= 2 且 < 5：显示简化的趋势线
- 趋势数据点 >= 5：显示完整的趋势图

## 测试策略

### 单元测试

- **SystemHealthCard 组件**：测试不同 props 下的渲染结果
- **health-store 动作**：测试 `fetchHistoricalReports`、`updateSystemHealthScore` 等方法
- **数据聚合函数**：测试告警数量计算逻辑

### 集成测试

- **实时数据流**：模拟 WebSocket 推送，验证 UI 更新
- **历史报告查询**：模拟 API 响应，验证列表渲染和分页
- **跨 Store 数据**：验证健康卡片正确显示告警数量

### E2E 测试

- **用户场景 1**：用户进入页面，查看整船健康状况和各系统健康卡片
- **用户场景 2**：用户点击系统健康卡片，跳转至详细监控页面
- **用户场景 3**：用户查询历史报告，翻页浏览
- **用户场景 4**：用户生成新的健康报告

## 迁移和部署

### 向后兼容性

- 不破坏现有的 health-store API
- 不影响其他页面对 health-store 的使用
- 新增的状态和动作都是可选的

### 部署步骤

1. **开发环境验证**：在本地开发环境完整测试所有功能
2. **代码审查**：提交 Pull Request，进行代码审查
3. **测试环境部署**：部署到测试环境，进行集成测试
4. **生产环境灰度发布**：使用功能开关（Feature Flag）逐步开放
5. **监控和反馈**：监控页面性能和错误率，收集用户反馈
6. **全量发布**：确认无问题后全量发布

### 回滚方案

如果发现严重问题，可以：
1. 通过功能开关关闭新页面，回退到旧版本
2. 使用 Git 回滚到重构前的提交
3. 新建的组件和 Store 扩展不会影响其他模块，可以安全删除

## 待解决的问题（Open Questions）

1. **后端 API 确认**
   - 历史报告列表接口 `GET /api/reports/health` 是否已实现？
   - 接口的分页参数格式是什么（page/pageSize 还是 offset/limit）？
   - `HealthReport` 类型的完整结构是什么？

2. **WebSocket 事件格式**
   - `equipment:health:update` 事件是否包含趋势数据（trendData）？
   - 如果不包含，前端如何获取近期趋势数据？

3. **系统配置**
   - 核心系统列表（电池、推进、逆变器等）是否应该从后端获取？
   - 还是在前端硬编码配置？

4. **报告生成逻辑**
   - 生成报告是同步还是异步操作？
   - 如果是异步，是否需要轮询查询报告状态？

5. **权限控制**
   - 是否所有用户都能查看健康评估页面？
   - 是否需要权限控制某些操作（如生成报告）？

## 参考资料

- **React 性能优化**：https://react.dev/reference/react/memo
- **Zustand 最佳实践**：https://github.com/pmndrs/zustand
- **Recharts 文档**：https://recharts.org/
- **项目告警中心重构**：`openspec/changes/refactor-alarm-center-page/`（参考数据流设计）

---

**设计文档状态**：待审批
**设计作者**：AI Assistant (Claude Sonnet 4.5)
**创建日期**：2025-12-14
**最后更新**：2025-12-14
