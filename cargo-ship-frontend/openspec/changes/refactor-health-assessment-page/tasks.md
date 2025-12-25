# 实施任务清单：重构健康评估页面

本文档列出了重构健康评估页面的详细实施任务。任务按照逻辑顺序组织，确保依赖关系正确。

---

## 阶段 1: 准备和调研（Pre-implementation）

### 1.1 环境准备和依赖检查

- [ ] 1.1.1 确认 GaugeChart 组件存在并可用（`src/components/visualization/GaugeChart.tsx`）
- [ ] 1.1.2 确认 Card、Badge、Button 等基础 UI 组件存在
- [ ] 1.1.3 确认 recharts 库已安装（用于 Sparkline 趋势图）
- [ ] 1.1.4 确认 Pagination 组件存在（`src/components/ui/pagination.tsx`）
- [ ] 1.1.5 确认 DataTable 组件存在或准备使用原生 table 元素

### 1.2 后端 API 确认

- [ ] 1.2.1 确认 `POST /api/reports/health` 接口可用（生成健康报告）
- [ ] 1.2.2 确认 `GET /api/reports/health` 接口可用（查询历史报告列表）
- [ ] 1.2.3 确认接口的分页参数格式（page/pageSize 或 offset/limit）
- [ ] 1.2.4 确认 `HealthReport` 类型的完整字段定义（目前为空类型）
- [ ] 1.2.5 确认 WebSocket 事件 `equipment:health:update` 的 payload 格式
- [ ] 1.2.6 测试 WebSocket 推送是否包含趋势数据或需要单独查询

### 1.3 现有代码分析

- [ ] 1.3.1 阅读并理解 `src/stores/health-store.ts` 的当前实现
- [ ] 1.3.2 阅读并理解 `src/stores/alarms-store.ts` 的当前实现
- [ ] 1.3.3 阅读并理解 `src/components/HealthAssessmentPage.tsx` 的当前实现
- [ ] 1.3.4 确认 `handleHealthUpdate` 方法的实现逻辑
- [ ] 1.3.5 确认现有的 health-service 方法（如 `getEquipmentHealth`）

### 1.4 核心系统配置确认

- [ ] 1.4.1 确认核心系统列表（电池、推进、逆变器、配电、辅助）
- [ ] 1.4.2 确认各系统的 deviceId 映射关系
- [ ] 1.4.3 确认各系统对应的详细监控页面路由
- [ ] 1.4.4 确认各系统的图标选择（从 lucide-react）

---

## 阶段 2: 数据层扩展（Data Layer）

### 2.1 扩展 health-store.ts

- [ ] 2.1.1 添加历史报告状态：
  ```typescript
  historicalReports: {
    items: HealthReport[];
    total: number;
    page: number;
    pageSize: number;
  }
  reportsQueryStatus: 'idle' | 'loading' | 'success' | 'error';
  ```
- [ ] 2.1.2 添加系统健康评分状态：
  ```typescript
  systemHealthScores: Record<string, SystemHealthScore>;
  ```
- [ ] 2.1.3 实现 `fetchHistoricalReports(page, pageSize)` 动作
- [ ] 2.1.4 实现 `generateHealthReport(params)` 动作
- [ ] 2.1.5 实现 `exportReport(reportId, format)` 动作
- [ ] 2.1.6 实现 `fetchSystemHealthScores()` 动作（获取所有核心系统的健康评分）
- [ ] 2.1.7 实现 `updateSystemHealthScore(deviceId, data)` 动作（用于 WebSocket 更新）
- [ ] 2.1.8 扩展 `handleHealthUpdate` 方法，同时更新 `systemHealthScores`
- [ ] 2.1.9 实现趋势数据管理逻辑（维护近期 N 个数据点）

### 2.2 扩展 health-service.ts（或创建新服务）

- [ ] 2.2.1 实现 `getReportsList(page, pageSize)` 方法
  - 调用 `Service.reportControllerFindAll({ page, pageSize })`
  - 处理响应数据格式
  - 实现错误处理
- [ ] 2.2.2 实现 `generateReport(params: GenerateHealthReportDto)` 方法
  - 调用 `Service.reportControllerGenerateReport(params)`
  - 处理同步/异步报告生成
- [ ] 2.2.3 实现 `exportReport(reportId, format)` 方法
  - 调用导出 API 或直接下载
  - 返回下载链接
- [ ] 2.2.4 实现 `getSystemHealthScores()` 方法
  - 批量获取所有核心系统的健康评分
  - 可以调用现有的 `getEquipmentHealth` 方法
- [ ] 2.2.5 实现 `getHealthTrendData(deviceId, timeRange)` 方法（如果后端支持）

### 2.3 类型定义扩展

- [ ] 2.3.1 创建 `SystemHealthScore` 接口（在 `src/types/health.ts`）
- [ ] 2.3.2 扩展 `HealthReport` 接口（根据后端 API 确认后）
- [ ] 2.3.3 创建 `SystemConfig` 接口（核心系统配置）
- [ ] 2.3.4 创建 `HealthTrendDataPoint` 接口（趋势数据点）

---

## 阶段 3: 组件开发（Component Development）

### 3.1 创建核心系统配置

- [ ] 3.1.1 创建 `src/config/core-systems.ts` 文件
- [ ] 3.1.2 定义 `coreSystemsConfig` 数组，包含所有核心系统的配置：
  - systemId, systemName, icon, deviceId, route
- [ ] 3.1.3 导出配置供其他组件使用

### 3.2 创建 SystemHealthCard 组件

- [ ] 3.2.1 创建 `src/components/HealthAssessmentPage/SystemHealthCard.tsx` 文件
- [ ] 3.2.2 定义组件 Props 接口：
  ```typescript
  interface SystemHealthCardProps {
    systemId: string;
    systemName: string;
    icon: React.ComponentType<{ className?: string }>;
    healthScore: number;
    grade: string;
    trend: 'improving' | 'stable' | 'declining';
    trendData: Array<{ timestamp: number; score: number }>;
    activeAlarmsCount: number;
    onNavigate: () => void;
  }
  ```
- [ ] 3.2.3 实现卡片基本布局（Card 容器、标题、图标）
- [ ] 3.2.4 实现健康评分展示（数值 + 进度条）
- [ ] 3.2.5 实现健康等级 Badge（根据 grade 动态颜色）
- [ ] 3.2.6 实现 Sparkline 趋势图（使用 recharts LineChart mini 模式）
- [ ] 3.2.7 实现活跃告警数量徽章（右上角显示，大于 0 时高亮）
- [ ] 3.2.8 实现趋势箭头图标（根据 trend 显示上升/平稳/下降箭头）
- [ ] 3.2.9 实现点击交互（整个卡片可点击，调用 onNavigate）
- [ ] 3.2.10 实现悬停效果（鼠标悬停时卡片高亮）
- [ ] 3.2.11 添加加载状态和空数据状态处理
- [ ] 3.2.12 使用 React.memo 优化性能

### 3.3 创建 OverallHealthScorecard 组件

- [ ] 3.3.1 创建 `src/components/HealthAssessmentPage/OverallHealthScorecard.tsx` 文件
- [ ] 3.3.2 定义组件 Props 接口：
  ```typescript
  interface OverallHealthScorecardProps {
    score: number;
    grade: string;
    onRefresh: () => void;
    loading?: boolean;
  }
  ```
- [ ] 3.3.3 实现卡片容器和标题
- [ ] 3.3.4 集成 GaugeChart 组件展示健康评分
- [ ] 3.3.5 根据健康等级动态改变卡片背景色或边框色
- [ ] 3.3.6 显示健康等级文字（居中、醒目）
- [ ] 3.3.7 添加刷新按钮（右上角，带旋转动画）
- [ ] 3.3.8 实现加载状态（刷新时显示 loading spinner）

### 3.4 创建 HealthReportsList 组件

- [ ] 3.4.1 创建 `src/components/HealthAssessmentPage/HealthReportsList.tsx` 文件
- [ ] 3.4.2 定义组件 Props 接口：
  ```typescript
  interface HealthReportsListProps {
    reports: HealthReport[];
    total: number;
    currentPage: number;
    pageSize: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onGenerateReport: () => void;
    onViewReport: (reportId: string) => void;
    onExportReport: (reportId: string) => void;
  }
  ```
- [ ] 3.4.3 实现报告列表表格：
  - 列：报告 ID、生成日期、涉及设备、健康评分、健康等级、操作
  - 使用原生 table 或 DataTable 组件
- [ ] 3.4.4 实现表格行的格式化（日期格式化、评分颜色标识等）
- [ ] 3.4.5 实现操作按钮列（查看详情、导出）
- [ ] 3.4.6 集成 Pagination 组件（底部分页）
- [ ] 3.4.7 添加"生成新报告"按钮（右上角或表格上方）
- [ ] 3.4.8 实现空数据状态（无历史报告时显示提示）
- [ ] 3.4.9 实现加载状态（查询时显示 loading skeleton）
- [ ] 3.4.10 实现错误状态（查询失败时显示错误提示）

---

## 阶段 4: 页面集成（Page Integration）

### 4.1 重构 HealthAssessmentPage/index.tsx

- [ ] 4.1.1 清理现有代码，保留必要的导入和类型定义
- [ ] 4.1.2 订阅 health-store 和 alarms-store：
  ```typescript
  const {
    systemHealthScores,
    historicalReports,
    reportsQueryStatus,
    fetchSystemHealthScores,
    fetchHistoricalReports,
    generateHealthReport,
    exportReport,
  } = useHealthStore();

  const { criticalAlarms } = useAlarmsStore();
  ```
- [ ] 4.1.3 实现 `useEffect` 钩子，页面加载时：
  - 调用 `fetchSystemHealthScores()` 获取系统健康评分
  - 调用 `health-store.init()` 订阅实时健康更新
  - 返回清理函数，调用 `health-store.dispose()`
- [ ] 4.1.4 实现整船综合健康评分计算逻辑：
  - 从 `systemHealthScores` 中提取所有系统的评分
  - 计算加权平均值作为整船评分
  - 根据评分确定健康等级
- [ ] 4.1.5 实现活跃告警数量计算函数：
  ```typescript
  const getActiveAlarmsCount = (deviceId: string) => {
    return criticalAlarms.filter(
      alarm => alarm.equipmentId === deviceId && alarm.status === 'PENDING'
    ).length;
  };
  ```
- [ ] 4.1.6 实现刷新处理函数：
  ```typescript
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSystemHealthScores();
    setRefreshing(false);
  };
  ```
- [ ] 4.1.7 实现系统健康卡片导航函数：
  ```typescript
  const handleSystemNavigation = (route: string) => {
    navigate(route);
  };
  ```
- [ ] 4.1.8 实现历史报告查询函数：
  ```typescript
  const handlePageChange = (page: number) => {
    fetchHistoricalReports(page, historicalReports.pageSize);
  };
  ```
- [ ] 4.1.9 实现生成报告处理函数：
  ```typescript
  const handleGenerateReport = async () => {
    await generateHealthReport({
      deviceId: 'all', // 或指定设备
      startTime: ...,
      endTime: ...
    });
    // 刷新列表
    await fetchHistoricalReports();
  };
  ```
- [ ] 4.1.10 实现报告导出处理函数：
  ```typescript
  const handleExportReport = async (reportId: string) => {
    const downloadUrl = await exportReport(reportId, 'PDF');
    window.open(downloadUrl);
  };
  ```

### 4.2 实现页面布局

- [ ] 4.2.1 实现顶部 - 整船健康仪表盘区域：
  ```tsx
  <OverallHealthScorecard
    score={overallHealthScore}
    grade={overallHealthGrade}
    onRefresh={handleRefresh}
    loading={refreshing}
  />
  ```
- [ ] 4.2.2 实现中部 - 系统健康卡片矩阵区域：
  - 使用响应式 Grid 布局（grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4）
  - 遍历 `coreSystemsConfig`，为每个系统渲染 SystemHealthCard
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {coreSystemsConfig.map(system => (
      <SystemHealthCard
        key={system.systemId}
        systemId={system.systemId}
        systemName={system.systemName}
        icon={system.icon}
        healthScore={systemHealthScores[system.deviceId]?.score}
        grade={systemHealthScores[system.deviceId]?.grade}
        trend={systemHealthScores[system.deviceId]?.trend}
        trendData={systemHealthScores[system.deviceId]?.trendData || []}
        activeAlarmsCount={getActiveAlarmsCount(system.deviceId)}
        onNavigate={() => handleSystemNavigation(system.route)}
      />
    ))}
  </div>
  ```
- [ ] 4.2.3 实现底部 - 历史报告列表区域：
  ```tsx
  <HealthReportsList
    reports={historicalReports.items}
    total={historicalReports.total}
    currentPage={historicalReports.page}
    pageSize={historicalReports.pageSize}
    loading={reportsQueryStatus === 'loading'}
    onPageChange={handlePageChange}
    onGenerateReport={handleGenerateReport}
    onViewReport={handleViewReport}
    onExportReport={handleExportReport}
  />
  ```
- [ ] 4.2.4 添加页面容器样式（与项目整体风格一致）
- [ ] 4.2.5 添加错误边界处理（ErrorBoundary）

---

## 阶段 5: 实时数据流验证（Real-Time Data Flow）

### 5.1 WebSocket 集成验证

- [ ] 5.1.1 验证 `equipment:health:update` 事件正确触发 `handleHealthUpdate`
- [ ] 5.1.2 验证 `handleHealthUpdate` 正确更新 `systemHealthScores`
- [ ] 5.1.3 验证 SystemHealthCard 自动响应数据更新
- [ ] 5.1.4 验证 OverallHealthScorecard 自动响应数据更新
- [ ] 5.1.5 测试 WebSocket 断开和重连场景

### 5.2 趋势数据更新逻辑

- [ ] 5.2.1 实现趋势数据累积逻辑（维护近期 10-20 个数据点）
- [ ] 5.2.2 实现趋势数据存储（可以使用 localStorage 持久化）
- [ ] 5.2.3 验证 Sparkline 图表正确展示趋势数据
- [ ] 5.2.4 测试数据点不足时的降级显示

### 5.3 性能优化

- [ ] 5.3.1 实现 WebSocket 更新防抖（500ms）
- [ ] 5.3.2 验证组件渲染优化（React.memo 生效）
- [ ] 5.3.3 使用 React DevTools Profiler 检查不必要的重渲染
- [ ] 5.3.4 优化 Sparkline 图表的渲染性能

---

## 阶段 6: 历史报告功能验证（Historical Reports）

### 6.1 报告列表查询

- [ ] 6.1.1 测试初次加载时自动查询第一页报告
- [ ] 6.1.2 测试分页切换功能
- [ ] 6.1.3 测试空数据状态显示
- [ ] 6.1.4 测试加载状态显示
- [ ] 6.1.5 测试错误状态显示和重试功能

### 6.2 报告生成功能

- [ ] 6.2.1 测试"生成新报告"按钮点击
- [ ] 6.2.2 测试报告生成参数（deviceId、时间范围）
- [ ] 6.2.3 测试同步报告生成（如果后端支持）
- [ ] 6.2.4 测试异步报告生成（如果需要轮询状态）
- [ ] 6.2.5 测试生成成功后列表自动刷新

### 6.3 报告导出功能

- [ ] 6.3.1 测试"导出"按钮点击
- [ ] 6.3.2 测试 PDF 格式导出
- [ ] 6.3.3 测试下载链接正确打开
- [ ] 6.3.4 测试导出失败的错误提示

---

## 阶段 7: 跨 Store 数据聚合验证（Cross-Store Integration）

### 7.1 告警数据聚合

- [ ] 7.1.1 验证 `getActiveAlarmsCount` 函数正确计算告警数量
- [ ] 7.1.2 验证告警数量徽章在 SystemHealthCard 上正确显示
- [ ] 7.1.3 测试告警数量为 0 时的显示（不显示或显示为灰色）
- [ ] 7.1.4 测试告警数量 > 0 时的高亮显示
- [ ] 7.1.5 验证告警状态变化时徽章自动更新

### 7.2 数据一致性验证

- [ ] 7.2.1 测试 health-store 和 alarms-store 同时更新的场景
- [ ] 7.2.2 验证两个 store 的数据时间戳一致性
- [ ] 7.2.3 测试一个 store 更新而另一个未更新的场景
- [ ] 7.2.4 验证数据不同步时的降级显示

---

## 阶段 8: 导航和路由验证（Navigation）

### 8.1 系统健康卡片导航

- [ ] 8.1.1 测试点击电池系统卡片，跳转至 `/monitoring/battery`
- [ ] 8.1.2 测试点击推进系统卡片，跳转至 `/propulsion`
- [ ] 8.1.3 测试点击逆变器系统卡片，跳转至 `/inverter`
- [ ] 8.1.4 测试点击配电系统卡片，跳转至 `/power-distribution`
- [ ] 8.1.5 测试点击辅助系统卡片，跳转至 `/auxiliary`
- [ ] 8.1.6 验证导航后目标页面正确加载

### 8.2 历史报告详情导航

- [ ] 8.2.1 实现报告详情页面路由（如 `/health/reports/:reportId`）（可选）
- [ ] 8.2.2 测试"查看详情"按钮点击跳转
- [ ] 8.2.3 验证报告详情页面正确显示报告内容（可选功能）

---

## 阶段 9: UI/UX 细节优化（UI/UX Polish）

### 9.1 视觉效果优化

- [ ] 9.1.1 调整健康等级颜色映射，确保视觉效果清晰
- [ ] 9.1.2 优化 Sparkline 图表的配色和样式
- [ ] 9.1.3 调整卡片悬停效果（阴影、边框、背景色）
- [ ] 9.1.4 优化加载状态的动画效果（spinner、skeleton）
- [ ] 9.1.5 确保页面整体风格与项目其他页面一致

### 9.2 交互体验优化

- [ ] 9.2.1 添加系统健康卡片点击的反馈动画
- [ ] 9.2.2 优化分页控件的交互体验
- [ ] 9.2.3 添加报告生成的 Toast 通知
- [ ] 9.2.4 添加报告导出的进度提示
- [ ] 9.2.5 优化移动端的响应式布局

### 9.3 无障碍支持

- [ ] 9.3.1 添加合适的 ARIA 标签
- [ ] 9.3.2 确保键盘导航可用
- [ ] 9.3.3 确保颜色对比度符合 WCAG 标准
- [ ] 9.3.4 添加屏幕阅读器支持

---

## 阶段 10: 测试和文档（Testing & Documentation）

### 10.1 单元测试

- [ ] 10.1.1 为 SystemHealthCard 组件编写单元测试
- [ ] 10.1.2 为 OverallHealthScorecard 组件编写单元测试
- [ ] 10.1.3 为 HealthReportsList 组件编写单元测试
- [ ] 10.1.4 为 health-store 的新增动作编写单元测试
- [ ] 10.1.5 为数据聚合函数编写单元测试

### 10.2 集成测试

- [ ] 10.2.1 编写实时数据流的集成测试（模拟 WebSocket 推送）
- [ ] 10.2.2 编写历史报告查询的集成测试（模拟 API 响应）
- [ ] 10.2.3 编写跨 Store 数据聚合的集成测试
- [ ] 10.2.4 编写导航功能的集成测试

### 10.3 E2E 测试

- [ ] 10.3.1 编写用户场景 1 的 E2E 测试：查看整船健康状况
- [ ] 10.3.2 编写用户场景 2 的 E2E 测试：点击系统卡片导航
- [ ] 10.3.3 编写用户场景 3 的 E2E 测试：查询历史报告
- [ ] 10.3.4 编写用户场景 4 的 E2E 测试：生成新报告

### 10.4 文档编写

- [ ] 10.4.1 更新 SystemHealthCard 组件的 JSDoc 注释
- [ ] 10.4.2 更新 health-store 的 JSDoc 注释
- [ ] 10.4.3 编写页面使用说明文档（可选）
- [ ] 10.4.4 更新项目 README（如有必要）

---

## 阶段 11: 代码审查和优化（Code Review & Optimization）

### 11.1 代码审查

- [ ] 11.1.1 自我审查代码，确保符合项目编码规范
- [ ] 11.1.2 运行 ESLint 和 Prettier，修复所有警告
- [ ] 11.1.3 运行 TypeScript 编译，确保无类型错误
- [ ] 11.1.4 提交 Pull Request，等待团队代码审查
- [ ] 11.1.5 根据审查意见修改代码

### 11.2 性能测试

- [ ] 11.2.1 使用 Chrome DevTools 测量页面加载时间
- [ ] 11.2.2 使用 React DevTools Profiler 测量渲染性能
- [ ] 11.2.3 测试 WebSocket 高频推送下的性能表现
- [ ] 11.2.4 测试大量历史报告时的列表渲染性能
- [ ] 11.2.5 优化发现的性能瓶颈

### 11.3 浏览器兼容性测试

- [ ] 11.3.1 测试 Chrome 最新版本
- [ ] 11.3.2 测试 Firefox 最新版本
- [ ] 11.3.3 测试 Edge 最新版本
- [ ] 11.3.4 测试 Safari 最新版本（如有 Mac）
- [ ] 11.3.5 测试移动端浏览器（Chrome Mobile、Safari Mobile）

---

## 阶段 12: 部署和验收（Deployment & Acceptance）

### 12.1 测试环境部署

- [ ] 12.1.1 将代码合并到测试分支
- [ ] 12.1.2 部署到测试环境
- [ ] 12.1.3 在测试环境进行完整的功能验证
- [ ] 12.1.4 邀请团队成员进行测试和反馈
- [ ] 12.1.5 修复测试环境发现的问题

### 12.2 生产环境部署

- [ ] 12.2.1 将代码合并到主分支
- [ ] 12.2.2 创建生产环境发布标签（Git tag）
- [ ] 12.2.3 部署到生产环境
- [ ] 12.2.4 验证生产环境功能正常
- [ ] 12.2.5 监控错误日志和性能指标

### 12.3 验收测试

- [ ] 12.3.1 验证所有需求已实现
- [ ] 12.3.2 验证无严重 bug 或性能问题
- [ ] 12.3.3 验证用户体验符合设计要求
- [ ] 12.3.4 获得项目负责人的验收确认
- [ ] 12.3.5 关闭相关的任务和 issue

---

## 阶段 13: 后续优化和维护（Post-Launch）

### 13.1 用户反馈收集

- [ ] 13.1.1 收集用户对新页面的反馈
- [ ] 13.1.2 记录用户提出的改进建议
- [ ] 13.1.3 分析用户使用数据（如页面访问量、功能使用率）

### 13.2 功能增强（可选）

- [ ] 13.2.1 支持自定义系统列表（如果后端提供配置接口）
- [ ] 13.2.2 支持历史报告筛选功能（按设备、时间范围等）
- [ ] 13.2.3 支持批量导出历史报告
- [ ] 13.2.4 支持健康趋势的深度分析图表

### 13.3 文档和培训（可选）

- [ ] 13.3.1 编写用户操作手册
- [ ] 13.3.2 录制功能演示视频
- [ ] 13.3.3 为用户提供培训（如有需要）

---

## 总结

**预计总任务数**：约 180 项任务
**预计完成时间**：根据团队规模和资源，预计 2-4 周

**关键里程碑**：
1. 阶段 2 完成：数据层扩展完成，可以开始组件开发
2. 阶段 3 完成：核心组件开发完成，可以进行页面集成
3. 阶段 4 完成：页面集成完成，可以进行功能验证
4. 阶段 10 完成：测试和文档完成，可以进行代码审查
5. 阶段 12 完成：部署和验收完成，功能正式发布

**注意事项**：
- 每个阶段的任务完成后，应进行代码提交和团队同步
- 如果后端 API 尚未完善，可以先使用 Mock 数据进行开发
- 遇到阻塞问题时，及时与团队沟通并调整计划
- 保持代码质量和测试覆盖率，确保功能稳定可靠

---

**任务清单状态**：待审批
**创建日期**：2025-12-14
**最后更新**：2025-12-14
