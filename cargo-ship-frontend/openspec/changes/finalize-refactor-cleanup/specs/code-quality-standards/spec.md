## ADDED Requirements

### Requirement: 类型定义统一管理

The system MUST ensure all HTTP API-related TypeScript type definitions are sourced from the auto-generated `api-client`. The following manually maintained type files SHALL be completely removed: `src/types/alarms.ts`, `src/types/auth.ts`, `src/types/equipment.ts`, `src/types/health.ts`, `src/types/import.ts`, `src/types/monitoring.ts`, `src/types/thresholds.ts`, `src/types/ui.ts`. Additionally, unused stores (`src/stores/ui-store.ts`) and debug files (`src/utils/debug/verify-selectors.ts`) SHALL be removed.

#### Scenario: API 类型完全来自 api-client

- **GIVEN** 项目使用自动生成的 API 客户端（来自 `http-api.json`）
- **WHEN** 开发人员需要使用与后端 API 相关的类型定义
- **THEN** 必须从 `@/services/api` 导入类型
- **AND** 不得使用 `src/types/` 下的手动定义类型（alarms.ts, auth.ts, equipment.ts, health.ts, import.ts, monitoring.ts, thresholds.ts）
- **AND** 编译器不应报告任何类型冲突或缺失错误

#### Scenario: 删除冗余类型文件

- **GIVEN** `src/types/` 目录下存在与 API 相关的手动类型文件
- **WHEN** 所有引用这些类型的代码已更新为使用 `api-client` 类型
- **THEN** 以下文件必须被完全删除：
  - `src/types/alarms.ts`
  - `src/types/auth.ts`
  - `src/types/equipment.ts`
  - `src/types/health.ts`
  - `src/types/import.ts`
  - `src/types/monitoring.ts`
  - `src/types/thresholds.ts`
  - `src/types/ui.ts` (未被使用)
  - `src/stores/ui-store.ts` (未被使用)
  - `src/utils/debug/verify-selectors.ts` (调试文件，验证内容已失效)
- **AND** TypeScript 编译应通过，不报告任何模块缺失错误

### Requirement: 废弃代码清理

The project MUST NOT contain unused files, functions, variables, or import statements. Redundant Service layer files that duplicate auto-generated API functionality SHALL be removed.

#### Scenario: 删除废弃的页面组件

- **GIVEN** 某个页面组件已被新组件替代或已被 `UnderDevelopmentPage` 占位
- **WHEN** 该组件不再被任何路由或其他组件引用
- **THEN** 该组件文件应被完全删除
- **AND** TypeScript 编译应通过，不报告缺失模块错误

#### Scenario: 删除冗余的 Service 层文件

- **GIVEN** 项目存在冗余的 Service 层文件（alarms-service.ts, equipment-service.ts, threshold-service.ts, import-service.ts, api-client.ts, historical-data-service.ts）
- **WHEN** 这些 Service 的功能已由自动生成的 API 客户端（`@/services/api`）完全覆盖
- **THEN** 以下文件必须被删除：
  - `src/services/alarms-service.ts` (1,236 行)
  - `src/services/equipment-service.ts` (964 行)
  - `src/services/threshold-service.ts` (348 行)
  - `src/services/import-service.ts` (701 行)
  - `src/services/api-client.ts` (627 行)
  - `src/services/historical-data-service.ts` (505 行，如未使用)
- **AND** 所有 Zustand Stores 应直接使用 `Service.xxxControllerXxx()` 方法
- **AND** TypeScript 编译应通过

#### Scenario: Stores 直接使用自动生成的 API

- **GIVEN** Zustand Store 需要调用后端 API
- **WHEN** 开发人员编写 Store 的 actions
- **THEN** 必须直接使用 `Service` from `@/services/api` 的方法
- **AND** 不得通过中间的 Service 层包装器调用
- **AND** 所有类型定义应来自 `@/services/api`

**示例**：
```typescript
// ✅ 正确做法
import { Service, AlarmRecord } from '@/services/api';

const fetchAlarms = async () => {
  const response = await Service.alarmControllerFindAllAlarms(
    page, limit, severity, status
  );
  set({ items: response.items });
};

// ❌ 错误做法（不要这样做）
import { enhancedAlarmsService } from '../services/alarms-service';
import { Alarm } from '../types/alarms';

const fetchAlarms = async () => {
  const response = await enhancedAlarmsService.getAlarms(params);
  set({ items: response.data });
};
```

#### Scenario: 清理未使用的导入

- **GIVEN** 代码中存在导入但未使用的模块
- **THEN** 这些导入应被移除
- **AND** 代码应保持功能正常

#### Scenario: 移除调试代码

- **GIVEN** 代码中存在调试用的 `console.log` 或注释掉的代码块
- **WHEN** 代码准备提交到生产分支
- **THEN** 所有调试代码应被移除
- **AND** 仅保留有意义的日志（错误、警告等）

### Requirement: Mock 数据与 API 结构一致

Mock data MUST be consistent with the auto-generated API client types.

#### Scenario: Mock 数据使用 API 类型

- **GIVEN** `src/mocks/` 目录下的 Mock 数据文件
- **WHEN** 这些文件定义模拟数据
- **THEN** 数据结构必须符合 `@/services/api` 中的类型定义
- **AND** TypeScript 编译器应验证类型一致性

#### Scenario: 删除过时的 Mock 数据

- **GIVEN** Mock 数据文件不再被使用或已过时
- **WHEN** API 结构已发生重大变化
- **THEN** 不再需要的 Mock 文件应被删除
- **AND** 仍需要的 Mock 文件应更新以匹配新的 API 结构

### Requirement: 实时订阅生命周期管理

All components using `realtime-service` MUST properly manage subscription lifecycle to prevent memory leaks.

#### Scenario: 组件挂载时订阅，卸载时取消订阅

- **GIVEN** 一个使用实时数据的 React 组件
- **WHEN** 组件挂载（mounted）
- **THEN** 应通过 `realtime-service.subscribe()` 订阅相关数据流
- **AND** 在组件卸载（unmounted）时，必须在 `useEffect` 的清理函数中调用 `unsubscribe()`

#### Scenario: 避免重复订阅

- **GIVEN** 一个组件已订阅某个数据流
- **WHEN** 组件重新渲染但订阅参数未变化
- **THEN** 不应创建新的订阅
- **AND** 应通过正确的依赖数组（dependency array）控制订阅行为

#### Scenario: 内存泄漏检测

- **GIVEN** 应用运行在浏览器中
- **WHEN** 用户在不同页面间反复切换
- **THEN** 使用浏览器开发者工具的 Memory Profiler 检测时，内存使用应保持稳定
- **AND** WebSocket 连接数不应无限增长

### Requirement: Zustand Store 细粒度订阅优化

Components SHALL use fine-grained selectors to subscribe to Zustand stores, avoiding unnecessary re-renders.

#### Scenario: 使用 selector 订阅特定状态片段

- **GIVEN** 一个组件只需要 store 中的部分状态
- **WHEN** 组件使用 Zustand store
- **THEN** 应使用 selector 函数仅订阅所需的状态片段
- **AND** 而非订阅整个 store 对象

**示例**：
```typescript
// 好的做法
const batteryVoltage = useMonitoringStore(state => state.batteryData.voltage);

// 避免的做法
const { batteryData } = useMonitoringStore();
```

#### Scenario: 优化后渲染性能提升

- **GIVEN** 优化前后的组件渲染性能数据
- **WHEN** 使用 React DevTools Profiler 测量
- **THEN** 优化后组件的不必要重渲染应显著减少
- **AND** 应用整体性能应有可感知的提升

### Requirement: 路由级代码分割

Large page components SHALL implement route-level code splitting to optimize initial load performance.

#### Scenario: 大型页面使用懒加载

- **GIVEN** 页面组件体积较大（如 `DataImportPage`、`DataQueryPage`、`HealthAssessmentPage`）
- **WHEN** 定义应用路由
- **THEN** 这些页面应使用 `React.lazy` 进行懒加载
- **AND** 应配合 `Suspense` 提供加载状态

**示例**：
```typescript
const DataImportPage = lazy(() => import('./components/DataImportPage'));

<Route
  path="/data-import"
  element={
    <Suspense fallback={<PageSkeleton />}>
      <DataImportPage />
    </Suspense>
  }
/>
```

#### Scenario: 初始加载性能改善

- **GIVEN** 实施代码分割前后的应用
- **WHEN** 测量首次内容绘制（FCP）和最大内容绘制（LCP）
- **THEN** 代码分割后的初始加载时间应明显减少
- **AND** 主 bundle 体积应显著减小

### Requirement: 生产构建优化

Production build artifacts SHALL be fully optimized to ensure optimal performance.

#### Scenario: 启用代码压缩和 Tree Shaking

- **GIVEN** Vite 构建配置
- **WHEN** 运行生产构建（`npm run build`）
- **THEN** 应启用代码压缩（minify）
- **AND** 应启用 Tree Shaking 移除未使用的代码
- **AND** 生产环境应移除所有 `console.log`

#### Scenario: 合理的 Chunk 分割

- **GIVEN** 应用包含多个第三方库（React、UI 组件库、图表库等）
- **WHEN** 配置打包策略
- **THEN** 应将常用的第三方库分割为独立的 vendor chunks
- **AND** 应配置合理的 chunk 大小阈值
- **AND** 应最大化利用浏览器缓存

#### Scenario: Bundle 大小在合理范围内

- **GIVEN** 完成生产构建
- **WHEN** 使用 bundle analyzer 分析构建产物
- **THEN** 主 bundle 大小应在合理范围内（建议 < 500KB gzipped）
- **AND** 各个 vendor chunk 应大小适中，便于缓存

### Requirement: 代码风格一致性

The entire project's code style SHALL remain consistent, following unified formatting and naming conventions.

#### Scenario: 使用统一的代码格式化

- **GIVEN** 项目配置了代码格式化工具（如 Prettier）
- **WHEN** 提交代码前
- **THEN** 所有代码文件应经过格式化工具处理
- **AND** 格式应符合项目的 `.prettierrc` 配置

#### Scenario: 遵循命名约定

- **GIVEN** 项目代码库
- **WHEN** 审查组件、函数和变量命名
- **THEN** 组件名应使用 PascalCase（如 `BatteryMonitoringPage`）
- **AND** 函数和变量应使用 camelCase（如 `fetchAlarmData`）
- **AND** 常量应使用 UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）

#### Scenario: 导入语句组织一致

- **GIVEN** 任何源代码文件
- **WHEN** 文件包含多个导入语句
- **THEN** 导入应按以下顺序组织：
  1. 第三方库导入（如 `react`, `zustand`）
  2. 内部模块导入（如 `@/services`, `@/stores`）
  3. 相对路径导入（如 `./components`）
- **AND** 各组之间应有空行分隔

### Requirement: 全面功能验证

All features after refactoring MUST undergo comprehensive validation to ensure expected behavior.

#### Scenario: 监控页面实时数据验证

- **GIVEN** 各个监控页面（电池、推进、逆变器、配电、辅助系统）
- **WHEN** 页面加载并连接到实时数据服务
- **THEN** 应正确显示实时数据更新
- **AND** 数据应与后端一致
- **AND** 监控墙（Monitoring Wall）应正确渲染所有监控点

#### Scenario: 告警功能验证

- **GIVEN** 告警中心页面
- **WHEN** 存在实时告警或历史告警
- **THEN** 告警应正确显示在相应的视图中
- **AND** 告警过滤和搜索功能应正常工作
- **AND** 告警确认和处理流程应完整可用

#### Scenario: CRUD 功能验证

- **GIVEN** CRUD 页面（设备管理、阈值管理、维护计划等）
- **WHEN** 执行创建、读取、更新、删除操作
- **THEN** 所有 CRUD 操作应正常工作
- **AND** 数据应正确持久化到后端
- **AND** UI 应正确反映操作结果

#### Scenario: 响应式布局验证

- **GIVEN** 任何页面
- **WHEN** 在不同屏幕尺寸下查看（桌面、平板、移动）
- **THEN** 页面布局应正确适配
- **AND** 监控墙的列布局应根据屏幕宽度调整（桌面 2-4 列，平板 2 列，移动 1 列）
- **AND** 所有交互元素应在触摸设备上可用

### Requirement: 性能基准达标

The application's performance metrics SHALL meet predetermined benchmark standards.

#### Scenario: 页面加载性能

- **GIVEN** 生产构建的应用
- **WHEN** 测量首次内容绘制（FCP）和最大内容绘制（LCP）
- **THEN** FCP 应 < 1.5 秒
- **AND** LCP 应 < 2.5 秒
- **AND** 首次输入延迟（FID）应 < 100ms

#### Scenario: Lighthouse 性能评分

- **GIVEN** 部署的应用
- **WHEN** 使用 Chrome Lighthouse 进行性能审计
- **THEN** Performance 评分应 ≥ 80
- **AND** Accessibility 评分应 ≥ 90
- **AND** Best Practices 评分应 ≥ 90

#### Scenario: 运行时性能

- **GIVEN** 应用在浏览器中运行
- **WHEN** 用户在不同页面间导航和交互
- **THEN** 路由切换应流畅无卡顿（< 200ms）
- **AND** 实时数据更新应平滑（无明显延迟或跳跃）
- **AND** 长时间运行后内存使用应保持稳定

### Requirement: 浏览器兼容性

The application SHALL run properly in mainstream modern browsers.

#### Scenario: 主流浏览器支持

- **GIVEN** 应用部署后
- **WHEN** 在以下浏览器中访问：
  - Chrome（最新版本）
  - Firefox（最新版本）
  - Edge（最新版本）
  - Safari（最新版本，如果可能）
- **THEN** 所有功能应正常工作
- **AND** UI 渲染应一致（允许轻微的浏览器差异）
- **AND** 性能应符合标准

#### Scenario: 浏览器特性检测

- **GIVEN** 应用使用的现代 Web API（如 WebSocket、ES6+ 特性）
- **WHEN** 在不支持这些特性的旧浏览器中访问
- **THEN** 应提供友好的错误提示或降级方案（如果适用）
- **AND** 不应出现静默失败或白屏错误
