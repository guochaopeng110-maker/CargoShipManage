# Spec Delta: Import Store 重构

## ADDED Requirements

### Requirement: Import Store 必须使用 Zustand 架构
Import Store SHALL 从 Class-based 单例模式迁移到 Zustand 架构，确保与其他核心模块的架构一致性。

#### Scenario: 创建 Import Store
- **WHEN** 开发者实现 Import Store
- **THEN** 必须使用 `create<ImportState & ImportActions>()` API
- **AND** 必须定义独立的 `ImportState` 和 `ImportActions` 接口
- **AND** 不得使用 class-based 单例模式

#### Scenario: 组件订阅 Import 状态
- **GIVEN** 组件需要显示导入记录列表
- **WHEN** 调用 `useImportStore(state => state.records)`
- **THEN** Store 必须支持 Selector 模式
- **AND** 当无关状态变化时不应触发组件重渲染

### Requirement: Import Store 必须分离数据状态和业务逻辑
Import Store SHALL 清晰地区分数据状态（State）和业务操作（Actions），确保代码可维护性。

#### Scenario: 定义 Import State 接口
- **WHEN** 定义 `ImportState` 接口
- **THEN** 接口必须仅包含数据状态字段
- **AND** 字段包括：`records`, `loading`, `error`, `uploadProgress`, `page`, `pageSize`, `total`
- **AND** 不得包含方法定义

#### Scenario: 定义 Import Actions 接口
- **WHEN** 定义 `ImportActions` 接口
- **THEN** 接口必须仅包含方法签名
- **AND** 方法包括：`uploadFile`, `executeImport`, `fetchRecords`, `setLoading`, `reset`
- **AND** 不得包含数据状态字段

### Requirement: Import Store 必须简化过度设计的功能
Import Store SHALL 移除未在 UI 中使用的功能，将代码量从1393行减少到500-600行。

#### Scenario: 保留核心导入流程
- **GIVEN** 用户使用数据导入功能
- **WHEN** 执行导入操作
- **THEN** Store 必须支持：文件上传、导入执行、记录查询、状态管理
- **AND** Store 不得包含批量作业管理、模板管理、性能监控等复杂功能（除非 UI 实际使用）

#### Scenario: 移除未使用的功能
- **GIVEN** 审查 `DataImportPage.tsx` 后确认功能未使用
- **WHEN** 重构 Import Store
- **THEN** 必须移除该功能的状态和方法
- **AND** 在代码注释中记录移除原因

### Requirement: Import Store 必须集成 API 服务层
Import Store SHALL 通过 `import-service` 调用后端 API，而不是直接使用 fetch 或 axios。

#### Scenario: 上传文件
- **GIVEN** 用户选择文件并点击上传
- **WHEN** 组件调用 `uploadFile(request)`
- **THEN** Store 必须调用 `importService.uploadFile(request)`
- **AND** 必须更新 `uploadProgress` 状态
- **AND** 成功后必须更新 `records` 列表

#### Scenario: 查询导入记录
- **GIVEN** 用户打开数据导入页面
- **WHEN** 组件调用 `fetchRecords({ page: 1, pageSize: 10 })`
- **THEN** Store 必须调用 `importService.getImportRecords(params)`
- **AND** 必须更新 `records`, `total`, `page` 状态
- **AND** 必须设置 `loading` 状态指示加载过程

### Requirement: Import Store 必须提供 Selector 导出
Import Store SHALL 导出命名的 Selector 对象，支持组件精确订阅状态片段。

#### Scenario: 导出 Selector 对象
- **WHEN** 定义 Import Store
- **THEN** 必须导出 `useImportSelector` 对象
- **AND** 对象必须包含常用状态的 Selector 函数：`records`, `loading`, `uploadProgress`, `currentRecord`

#### Scenario: 组件使用 Selector
- **GIVEN** 组件仅需要显示导入记录列表
- **WHEN** 使用 `useImportStore(useImportSelector.records)`
- **THEN** 当 `uploadProgress` 变化时，该组件不应重渲染
- **AND** 当 `records` 变化时，该组件应重渲染

## MODIFIED Requirements

无（这是新增的架构规范）

## REMOVED Requirements

### Requirement: Import Store 使用 Class-based 单例模式
**原因**：Class-based 模式与 Zustand 架构不一致，缺少响应式更新机制

**迁移指南**：
- 将所有 class 属性迁移为 Zustand State 字段
- 将所有 class 方法迁移为 Zustand Actions
- 移除 constructor 和 `this` 绑定代码

### Requirement: Import Store 包含批量导入作业管理功能
**原因**：经审查确认该功能未在 UI 中使用，属于过度设计

**迁移指南**：
- 移除 `batchJobs`, `activeBatchJob`, `batchProgress` 状态
- 移除 `executeBatchImport`, `pauseJob`, `resumeJob` 方法
- 如未来需要恢复，可从 git 历史查看原实现

### Requirement: Import Store 包含模板管理功能
**原因**：经审查确认该功能未在 UI 中使用

**迁移指南**：
- 移除 `templates`, `currentTemplate`, `templateValidation` 状态
- 移除 `getTemplates`, `createTemplate`, `updateTemplate`, `deleteTemplate` 方法

### Requirement: Import Store 包含性能监控功能
**原因**：性能监控应由全局监控系统（如 Sentry）负责，不应在单个 Store 中实现

**迁移指南**：
- 移除 `performanceMetrics` 状态
- 移除 `recordPerformanceMetric`, `getPerformanceReport` 方法
- 在 Actions 中保留基础错误日志（console.error）

### Requirement: Import Store 内置缓存管理功能
**原因**：缓存应由 API 层面的 HTTP 缓存或 React Query 管理

**迁移指南**：
- 移除 `cache` 状态
- 移除 `getCachedData`, `setCachedData`, `clearCache` 方法
- 依赖浏览器缓存或 API 层面的缓存策略
