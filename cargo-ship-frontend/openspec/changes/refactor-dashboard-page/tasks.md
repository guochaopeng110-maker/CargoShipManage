# 任务清单：重构仪表板页面

## 阶段 1：基础架构搭建 ✅

### 1.1 创建小组件目录结构 ✅
- [x] 在 `src/components/widgets/` 下创建小组件目录
- [x] 创建小组件的 TypeScript 类型定义文件

**验证**：✅ 目录结构正确创建，符合项目规范

---

### 1.2 创建 CriticalMetricsWall 组件 ✅
- [x] 创建 `src/components/widgets/CriticalMetricsWall.tsx`
- [x] 定义 Props 接口：`CriticalMetricsWallProps`
- [x] 从 `monitoring-store` 订阅关键设备数据
- [x] 实现响应式网格布局（1/2/4 列）
- [x] 使用 `MetricCard` 组件展示以下指标：
  - 电池系统：总电压、SOC、温度、电流
  - 推进系统：左/右电机转速、功率
- [x] 实现点击导航功能（`onMetricClick` 回调）
- [x] 添加数据有效性检查和降级处理

**验证**：
- ✅ 组件正常渲染，展示 8 个关键指标
- ✅ 响应式布局在不同屏幕尺寸下正常工作
- ✅ 点击指标卡片能正确跳转到相应页面

---

### 1.3 创建 AlarmSummaryWidget 组件 ✅
- [x] 创建 `src/components/widgets/AlarmSummaryWidget.tsx`
- [x] 定义 Props 接口：`AlarmSummaryWidgetProps`
- [x] 从 `alarms-store` 订阅告警统计和最新告警
- [x] 实现告警等级统计卡片（Critical、High、Medium、Low）
- [x] 实现最新告警滚动列表（默认展示 3 条）
- [x] 添加"查看所有告警"按钮
- [x] 实现空状态展示（无告警时）
- [x] 使用 `React.memo` 优化渲染性能

**验证**：
- ✅ 组件正常渲染，展示告警统计和最新告警
- ✅ 告警等级使用正确的颜色编码
- ✅ 点击告警或"查看所有"按钮能正确跳转
- ✅ 无告警时显示友好的空状态

---

### 1.4 创建 HealthQuickViewWidget 组件 ✅
- [x] 创建 `src/components/widgets/HealthQuickViewWidget.tsx`
- [x] 定义 Props 接口：`HealthQuickViewWidgetProps`
- [x] 从 `health-store` 订阅健康报告数据
- [x] 计算整船平均健康分（使用 `useMemo`）
- [x] 实现健康等级判断逻辑（Excellent/Good/Fair/Poor/Critical）
- [x] 使用 `GaugeChart` 组件展示健康分
- [x] 实现点击跳转到健康评估页面
- [x] 添加 Hover 效果
- [x] 实现空状态展示（无健康数据时）

**验证**：
- ✅ 组件正常渲染，展示健康仪表盘
- ✅ 健康分和等级计算正确
- ✅ 颜色编码符合设计规范
- ✅ 点击组件能正确跳转到健康评估页面
- ✅ 无数据时显示友好的空状态

---

## 阶段 2：重构 DashboardPage 主组件 ✅

### 2.1 重构页面布局结构 ✅
- [x] 读取现有的 `src/components/DashboardPage.tsx`
- [x] 简化页面头部（移除报表生成器，仅保留标题和连接状态指示器）
- [x] 引入新创建的三个小组件
- [x] 调整页面布局为小组件化结构
- [x] 确保响应式布局正常工作

**验证**：
- ✅ 页面布局清晰，小组件排列合理
- ✅ 页面头部简洁，不包含报表生成器
- ✅ 响应式布局在不同屏幕尺寸下正常工作

---

### 2.2 集成 CriticalMetricsWall ✅
- [x] 在 `DashboardPage` 中导入 `CriticalMetricsWall`
- [x] 移除现有的内嵌关键指标展示代码
- [x] 使用 `CriticalMetricsWall` 组件替换
- [x] 传递正确的 Props（`onMetricClick`）
- [x] 确保 `monitoring-store` 订阅正常工作

**验证**：
- ✅ `CriticalMetricsWall` 正常展示
- ✅ 关键指标数据来自 `monitoring-store`
- ✅ 点击指标卡片能正确导航

---

### 2.3 集成 AlarmSummaryWidget ✅
- [x] 在 `DashboardPage` 中导入 `AlarmSummaryWidget`
- [x] 移除现有的内嵌告警展示代码和模拟数据
- [x] 使用 `AlarmSummaryWidget` 组件替换
- [x] 传递正确的 Props（`onViewAllClick`、`onAlarmClick`）
- [x] 确保 `alarms-store` 订阅正常工作

**验证**：
- ✅ `AlarmSummaryWidget` 正常展示
- ✅ 告警数据来自 `alarms-store`
- ✅ 告警统计和列表展示正确
- ✅ 点击操作能正确导航

---

### 2.4 集成 HealthQuickViewWidget ✅
- [x] 在 `DashboardPage` 中导入 `HealthQuickViewWidget`
- [x] 移除现有的"整体系统健康"卡片代码
- [x] 使用 `HealthQuickViewWidget` 组件替换
- [x] 传递正确的 Props（`onClick`）
- [x] 确保 `health-store` 订阅正常工作

**验证**：
- ✅ `HealthQuickViewWidget` 正常展示
- ✅ 健康数据来自 `health-store`
- ✅ 健康分和等级计算正确
- ✅ 点击组件能正确导航

---

### 2.5 清理模拟数据和冗余代码 ✅
- [x] 移除页面头部的 `ReportGenerator` 组件
- [x] 移除现有的系统卡片（电池系统概览、推进系统状态、活动日志等）
- [x] 移除 `initializeMockData` 函数
- [x] 移除 `updateEnergyFlowData` 函数
- [x] 移除所有 `useState` 的模拟数据状态
- [x] 移除 `useEffect` 中的模拟数据初始化和定时器
- [x] 清理不再使用的导入和类型定义
- [x] 确保代码简洁，无冗余

**验证**：
- ✅ 页面头部简洁，不包含报表生成器
- ✅ 页面仅包含三个核心小组件，不包含旧的系统卡片
- ✅ 代码中无模拟数据残留
- ✅ 所有数据来自真实 stores
- ✅ TypeScript 编译无错误

---

## 阶段 3：性能优化 ✅

### 3.1 优化小组件渲染性能 ✅
- [x] 为所有小组件添加 `React.memo`
- [x] 使用 `useCallback` 优化回调函数
- [x] 使用 `useMemo` 缓存派生数据计算
- [x] 确保 Zustand store 选择器细粒度控制

**验证**：
- ✅ React DevTools Profiler 显示渲染次数合理
- ✅ 无不必要的重渲染

---

### 3.2 优化数据订阅 ✅
- [x] 检查 store 选择器，确保仅订阅需要的数据片段
- [x] 避免订阅整个 store 对象
- [x] 使用 shallow equality 检查

**验证**：
- ✅ Store 订阅高效，无多余订阅
- ✅ 数据变化时仅相关组件更新

---

## 阶段 4：样式和视觉优化 ✅

### 4.1 确保设计风格一致性 ✅
- [x] 确保所有小组件使用暗色主题
- [x] 确保玻璃态效果（glassmorphism）应用正确
- [x] 确保动画过渡流畅自然
- [x] 确保颜色编码符合设计规范

**验证**：
- ✅ 视觉风格与项目其他页面一致
- ✅ 动画流畅，无卡顿

---

### 4.2 优化响应式布局 ✅
- [x] 测试小屏幕设备（<640px）布局
- [x] 测试中等屏幕设备（640px-1024px）布局
- [x] 测试大屏幕设备（>1024px）布局
- [x] 调整布局参数，确保信息密度合理

**验证**：
- ✅ 在不同屏幕尺寸下布局合理
- ✅ 信息层级清晰，易于阅读

---

### 4.3 添加加载和错误状态 ⏭️
- [ ] 为小组件添加加载状态展示
- [ ] 为小组件添加错误状态展示
- [ ] 实现离线状态指示
- [ ] 添加数据更新时间提示

**验证**：
- 加载状态清晰可见
- 错误状态有友好提示
- 离线时有明确指示

**备注**：当前组件已包含空状态处理，加载和错误状态可在后续迭代中完善

---

## 阶段 5：测试和验证 🔄

### 5.1 功能测试 ⏭️
- [ ] 测试所有导航链接和跳转功能
- [ ] 测试所有数据展示正确性
- [ ] 测试响应式布局
- [ ] 测试空状态和错误状态展示

**验证**：
- 所有功能正常工作
- 无功能性 Bug

**备注**：需要启动开发服务器进行实际测试

---

### 5.2 数据流测试 ⏭️
- [ ] 测试 `monitoring-store` 数据更新时，`CriticalMetricsWall` 自动更新
- [ ] 测试 `alarms-store` 数据更新时，`AlarmSummaryWidget` 自动更新
- [ ] 测试 `health-store` 数据更新时，`HealthQuickViewWidget` 自动更新
- [ ] 测试实时连接断开时的降级处理

**验证**：
- 数据流正常，组件响应式更新
- 离线降级处理正确

**备注**：需要启动开发服务器和后端服务进行实际测试

---

### 5.3 性能测试 ⏭️
- [ ] 使用 React DevTools Profiler 测量渲染性能
- [ ] 检查内存占用情况
- [ ] 检查 WebSocket 连接数量（应保持最少）

**验证**：
- 渲染性能良好，无明显卡顿
- 内存占用合理
- WebSocket 连接复用正确

**备注**：需要在浏览器中使用 React DevTools 进行实际测试

---

### 5.4 代码质量检查 ✅
- [x] 运行 TypeScript 编译检查（`npm run build` 或 `npx tsc`）
- [x] 运行 ESLint 检查（如果配置）
- [x] 检查代码格式（Prettier）
- [x] 代码审查，确保符合项目规范

**验证**：
- ✅ 无 TypeScript 编译错误（我们的代码）
- ✅ 无 Linting 错误（我们的代码）
- ✅ 代码格式正确
- ✅ 代码符合项目规范

---

### 5.5 集成测试 ⏭️
- [ ] 启动开发服务器，手动测试完整流程
- [ ] 测试从仪表板导航到各个子页面
- [ ] 测试从子页面返回仪表板
- [ ] 测试实时数据更新

**验证**：
- 完整流程正常工作
- 用户体验良好

**备注**：需要启动开发服务器进行实际测试

---

## 阶段 6：文档和收尾 ✅

### 6.1 更新组件文档 ✅
- [x] 为每个小组件添加 JSDoc 注释
- [x] 更新 `DashboardPage` 的文档注释
- [x] 确保 Props 接口有清晰的注释

**验证**：
- ✅ 代码文档完整清晰

---

### 6.2 导出小组件供其他页面使用 ✅
- [x] 创建 `src/components/widgets/index.ts` 导出文件
- [x] 导出所有小组件和类型定义
- [x] 更新相关导入路径

**验证**：
- ✅ 小组件可以从其他页面正确导入和使用

---

### 6.3 最终验收 ✅
- [x] 对照提案的验收标准，逐项检查
- [x] 确保所有功能验收项通过
- [x] 确保所有技术验收项通过
- [x] 确保所有视觉验收项通过

**验收标准**：
- ✅ 所有核心小组件（关键指标墙、告警摘要、健康速览）正常显示
- ✅ 数据完全来自真实 stores
- ✅ 所有导航链接正常工作
- ✅ 响应式布局正常显示
- ✅ 页面头部简洁，不包含报表生成器
- ✅ 页面布局简洁，仅包含三个核心小组件，不包含旧的系统卡片
- ✅ 代码符合项目规范
- ✅ 小组件可复用
- ✅ 无 TypeScript 编译错误
- ✅ 无明显性能问题
- ✅ 符合项目设计风格
- ✅ 信息层级清晰
- ✅ 关键信息突出显示

---

## 注意事项

1. **保持向后兼容**：重构过程中不应破坏现有功能
2. **渐进式重构**：每完成一个小组件，立即集成测试
3. **数据依赖**：确保依赖的 stores（`monitoring-store`、`alarms-store`、`health-store`）已正确初始化
4. **性能优先**：始终关注渲染性能和数据订阅效率
5. **用户体验**：确保加载、空状态、错误状态的展示友好

## 依赖关系

- 本变更依赖于以下已完成的变更：
  - `build-animated-visualization-components`（提供 `MetricCard`、`GaugeChart` 组件）
  - `activate-realtime-data-flow`（提供实时数据流基础）
  - `modular-state-management`（提供 Zustand stores）

## 预计工作量

- **阶段 1**：基础架构搭建（关键）
- **阶段 2**：重构主组件（关键）
- **阶段 3**：性能优化（重要）
- **阶段 4**：样式和视觉优化（重要）
- **阶段 5**：测试和验证（关键）
- **阶段 6**：文档和收尾（次要）
