# 重构数据导入页面：三步走的直观导入工具

## 概述

将 DataImportPage 重构为一个功能明确、状态可视、反馈及时的文件上传工具。该页面采用"三步走"布局设计，遵循新的服务分层架构，为用户提供清晰、可靠的数据导入体验，并复用 DataQueryPage 确立的"筛选-分页列表"模板。

## 问题陈述

### 当前痛点

目前的 DataImportPage 虽然功能相对完整（1300+ 行代码），但存在以下问题：

1. **UI/UX 体验不够直观**
   - 文件上传与历史记录混杂在一起，视觉层次不够清晰
   - 缺少明确的"三步走"流程引导（文件选择 → 上传处理 → 历史查看）
   - 上传进度和处理状态的反馈不够直观
   - 缺少专门的状态指示器（ImportStatusIndicator）来展示当前任务状态

2. **状态管理需要增强**
   - import-store.ts 已有基本的状态管理，但缺少对后端异步处理状态的轮询机制
   - 文件上传后，无法实时追踪后端的数据校验和入库进度
   - 用户不清楚"上传完成"和"处理完成"的区别

3. **服务层功能不完整**
   - import-service.ts 已实现基本的文件上传功能
   - 但缺少 `pollImportStatus(taskId)` 方法来轮询后端处理状态
   - 无法提供从上传到处理完成的全流程状态追踪

4. **历史记录展示可以优化**
   - 虽然已有历史导入记录列表和分页
   - 但未完全遵循 DataQueryPage 确立的"筛选-分页列表"模板
   - 筛选和排序功能可以进一步标准化

### 用户需求

用户期望的数据导入页面应该：

1. **清晰的操作流程**：明确的"选择文件 → 上传 → 处理 → 完成"步骤指引
2. **实时状态反馈**：能够看到文件上传进度和后端处理状态
3. **可靠的结果追溯**：能够方便地查看每次导入的结果和错误信息
4. **简洁的交互界面**：不需要复杂的配置，快速完成导入任务

## 目标

### 主要目标

1. **实现"三步走"布局设计**
   - **第一步：文件选择与上传**
     - 醒目的文件拖放区域
     - 显示文件基本信息（文件名、大小、类型）
     - 明确的"开始上传"按钮

   - **第二步：上传与处理状态**
     - 可视化的上传进度条
     - ImportStatusIndicator 组件展示任务状态
     - 状态包括：等待上传 → 上传中 → 处理中 → 成功/失败
     - 处理中时显示动画（Spinner）

   - **第三步：导入历史与结果**
     - 带分页的历史导入任务列表
     - 完全复用 DataQueryPage 的"筛选-分页列表"模板
     - 显示任务 ID、文件名、上传时间、状态、成功/失败行数
     - 提供"查看详情/错误报告"功能

2. **增强 import-store.ts 状态管理**
   - 管理当前上传任务的完整状态（uploadProgress, importStatus）
   - 管理历史导入任务列表的分页数据（importHistory, paginationInfo）
   - 提供清晰的加载状态管理

3. **扩展 import-service.ts 功能**
   - 优化 `uploadFileWithProgress(file, onProgress)` 方法
   - **新增** `pollImportStatus(taskId)` 方法
     - 定期调用 `GET /api/import/status/{taskId}` 接口
     - 轮询直到返回"成功"或"失败"状态
     - 自动更新 store 中的 importStatus
   - 确保所有 API 调用通过 api-client 进行

4. **建立清晰的数据流**
   - **文件上传流程**：
     用户选择文件 → uploadFile action → api-client 发送文件 → 持续更新进度 → UI 响应

   - **状态轮询流程**：
     上传完成 → pollImportStatus action → 定期请求状态 → 更新 store → UI 响应（处理中 → 成功/失败）

   - **历史查询流程**：
     页面加载/翻页 → fetchImportHistory action → api-client 获取列表 → store 更新 → UI 表格渲染

5. **复用 DataQueryPage 模式**
   - 历史导入记录列表完全遵循"筛选-分页列表"模板
   - 验证该模式在不同场景下的通用性
   - 为其他类似功能提供标准参考

### 非目标

以下内容不在本次重构范围内：

- 复杂的数据映射配置界面（当前已有的功能可以保留，但不做扩展）
- 导入模板管理功能（后续功能）
- 导入任务调度和批量导入（后续功能）
- 数据校验规则配置（应在专门的配置页面实现）

## 解决方案

### 核心设计原则

1. **流程化引导** (Process-Guided Design)
   - 清晰的"三步走"视觉布局
   - 每一步都有明确的状态和操作提示
   - 用户始终知道当前处于哪个阶段

2. **实时反馈** (Real-Time Feedback)
   - 上传进度的实时展示
   - 后端处理状态的轮询更新
   - 所有状态变化都有视觉反馈

3. **模式复用** (Pattern Reuse)
   - 历史记录列表完全复用 DataQueryPage 模式
   - 统一的筛选、分页、排序交互
   - 保持系统整体一致性

4. **架构规范** (Architectural Compliance)
   - 严格遵循新的服务分层架构
   - Store 管理状态，Service 处理 API
   - UI 组件只负责展示和用户交互

### 关键变更

#### 1. UI/UX 重构

**页面布局**
```
DataImportPage
├── 第一步：文件选择区
│   ├── 文件拖放区（DragDropZone）
│   ├── 文件选择按钮
│   └── 文件信息展示（文件名、大小、类型）
│
├── 第二步：上传与处理状态区
│   ├── 上传进度条（UploadProgressBar）
│   ├── 状态指示器（ImportStatusIndicator）
│   │   ├── 等待上传（idle icon + text）
│   │   ├── 上传中（upload icon + progress）
│   │   ├── 处理中（spinner + text）
│   │   ├── 成功（check icon + text）
│   │   └── 失败（error icon + text）
│   └── 处理中动画（Spinner）
│
└── 第三步：导入历史区
    ├── 筛选条件（可选）
    │   ├── 文件名搜索
    │   ├── 状态筛选
    │   └── 日期范围（可选）
    ├── 导入历史表格
    │   ├── 任务 ID
    │   ├── 文件名
    │   ├── 上传时间
    │   ├── 处理状态
    │   ├── 成功行数 / 失败行数
    │   └── 操作（查看详情、错误报告）
    └── 分页组件（Pagination）
```

**ImportStatusIndicator 组件**
- 新增专门的状态指示器组件
- 通过图标和文字清晰展示：
  - **等待上传**: Clock icon + "等待上传"
  - **上传中**: Upload icon + "上传中 (XX%)"
  - **处理中**: Spinner + "处理中"
  - **成功**: CheckCircle icon + "导入成功"
  - **失败**: AlertCircle icon + "导入失败"

#### 2. import-store.ts 状态扩展

**新增/优化状态**
```typescript
interface ImportState {
  // 当前任务状态
  currentTask: {
    uploadProgress: number;        // 上传进度 0-100
    importStatus: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
    taskId: string | null;         // 当前任务 ID
    fileName: string | null;       // 当前文件名
    errorMessage: string | null;   // 错误信息
  };

  // 历史记录状态（遵循 DataQueryPage 模式）
  historicalImports: {
    items: ImportRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };

  // 查询状态
  queryStatus: 'idle' | 'loading' | 'success' | 'error';
  queryFilters: ImportRecordFilters;

  // 加载状态
  loading: boolean;
  error: string | null;
}
```

**新增/优化 Actions**
```typescript
interface ImportActions {
  // 文件上传
  uploadFileWithProgress(
    request: DataImportRequest,
    onProgress?: (progress: number) => void
  ): Promise<ImportRecord>;

  // 状态轮询（新增）
  pollImportStatus(taskId: string): Promise<void>;

  // 停止轮询（新增）
  stopPolling(): void;

  // 历史记录查询（遵循 DataQueryPage 模式）
  fetchImportHistory(
    page: number,
    filters?: ImportRecordFilters
  ): Promise<void>;

  // 重置当前任务状态
  resetCurrentTask(): void;
}
```

#### 3. import-service.ts 功能扩展

**新增方法**
```typescript
class ImportService {
  /**
   * 轮询导入任务状态
   *
   * 定期调用 GET /api/import/status/{taskId} 接口
   * 直到任务完成（success 或 error）
   *
   * @param taskId - 导入任务 ID
   * @param onUpdate - 状态更新回调
   * @param interval - 轮询间隔（默认 2000ms）
   * @returns Promise<ImportRecord> - 最终的任务状态
   */
  async pollImportStatus(
    taskId: string,
    onUpdate?: (status: ImportStatus) => void,
    interval: number = 2000
  ): Promise<ImportRecord>;
}
```

**优化现有方法**
```typescript
// 确保 uploadFileWithProgress 正确处理进度回调
async uploadFileWithProgress(
  request: DataImportRequest,
  onProgress?: (progress: number) => void
): Promise<ImportRecord>;
```

#### 4. 数据流设计

**完整的导入流程**
```
1. 用户选择文件
   ↓
2. 点击"开始上传"
   ↓
3. uploadFileWithProgress(file, onProgress)
   ├→ 更新 uploadProgress (0% → 100%)
   ├→ 更新 importStatus = 'uploading'
   └→ 返回 taskId
   ↓
4. 上传完成，调用 pollImportStatus(taskId)
   ├→ 更新 importStatus = 'processing'
   ├→ 定期请求 GET /api/import/status/{taskId}
   ├→ 后端返回处理进度
   └→ 直到状态变为 'success' 或 'error'
   ↓
5. 处理完成
   ├→ 更新 importStatus = 'success' / 'error'
   ├→ 刷新历史记录列表
   └→ 显示成功/失败提示
```

**历史记录查询流程**（遵循 DataQueryPage 模式）
```
1. 页面加载 / 用户点击翻页
   ↓
2. fetchImportHistory(page, filters)
   ↓
3. api-client.get('/api/import/history', { params })
   ↓
4. 更新 historicalImports 状态
   ↓
5. UI 表格重新渲染
```

## 影响范围

### 受影响的文件

#### 需要修改
- `src/components/DataImportPage.tsx` - 重构 UI 布局，实现"三步走"设计
- `src/stores/import-store.ts` - 扩展状态和 actions
- `src/services/import-service.ts` - 新增 pollImportStatus 方法

#### 需要创建
- `src/components/DataImportPage/ImportStatusIndicator.tsx` - 状态指示器组件
- `src/components/DataImportPage/FileUploadZone.tsx` - 文件上传区组件
- `src/components/DataImportPage/ImportHistoryTable.tsx` - 历史记录表格组件

#### 可能需要复用
- `src/components/ui/progress.tsx` - 进度条组件（应该已存在）
- `src/components/ui/pagination.tsx` - 分页组件（从 DataQueryPage 复用）
- `src/components/ui/spinner.tsx` - 加载动画组件

### 受影响的用户工作流

1. **数据导入工作流**
   - 用户将获得更清晰的导入流程引导
   - 能够实时看到上传和处理进度
   - 更容易理解当前任务所处的阶段

2. **历史记录查看工作流**
   - 更标准化的筛选和分页体验
   - 与其他页面（如 DataQueryPage）保持一致的交互模式

## 预期成果

### 用户体验提升

1. **更清晰的流程**
   - "三步走"布局提供明确的操作引导
   - 用户始终知道当前处于哪个阶段
   - 减少操作困惑和错误

2. **更及时的反馈**
   - 实时的上传进度展示
   - 后端处理状态的轮询更新
   - 明确的成功/失败提示

3. **更可靠的追溯**
   - 完整的历史导入记录
   - 详细的成功/失败统计
   - 方便的错误报告查看

### 技术架构提升

1. **验证模式复用**
   - 历史记录列表复用 DataQueryPage 的"筛选-分页列表"模板
   - 证明该模式的通用性和可维护性
   - 为其他功能模块提供参考

2. **完善服务分层**
   - Store 清晰管理状态
   - Service 封装 API 调用和业务逻辑
   - UI 组件专注于展示和交互

3. **增强状态追踪**
   - 从文件上传到处理完成的全流程状态管理
   - 轮询机制确保状态实时同步
   - 为后续扩展（如批量导入）奠定基础

## 成功指标

1. **用户体验指标**
   - 用户能够清晰理解导入流程的每个步骤
   - 导入操作的成功率提升
   - 用户支持请求减少

2. **功能完整性指标**
   - 上传进度实时展示正常
   - 后端处理状态轮询正常
   - 历史记录查询和分页正常

3. **代码质量指标**
   - 代码结构清晰，职责分离明确
   - 复用现有组件和模式
   - 无 TypeScript 类型错误

## 风险与缓解

### 风险

1. **后端 API 支持不足**
   - 后端可能尚未实现 `GET /api/import/status/{taskId}` 接口
   - **缓解**：在实施前与后端团队确认 API 能力，必要时使用 mock 数据先行开发

2. **轮询机制的性能影响**
   - 频繁的状态轮询可能增加服务器负担
   - **缓解**：
     - 使用合理的轮询间隔（如 2-3 秒）
     - 任务完成后立即停止轮询
     - 考虑后续优化为 WebSocket 推送

3. **UI 组件缺失**
   - 可能缺少某些所需的 UI 组件
   - **缓解**：优先检查现有组件库，必要时创建简化版本

4. **状态管理复杂度**
   - 同时管理上传状态、处理状态、历史记录可能增加复杂度
   - **缓解**：清晰划分状态，使用明确的命名和文档注释

## 依赖关系

### 前置依赖

- ✅ import-store.ts 基础实现已存在
- ✅ import-service.ts 基础实现已存在
- ✅ DataImportPage.tsx 基础页面已存在
- ⚠️ refactor-data-query-page（进行中）：提供可复用的"筛选-分页列表"模式

### 后续依赖

- 本变更完成后，数据导入功能将更加完善
- 可以进一步实现批量导入、导入模板管理等高级功能

## 替代方案

### 方案 A：保持现状，仅优化 UI
- 只改进 UI 展示，不增加轮询功能
- **缺点**：无法解决状态追踪不完整的核心问题

### 方案 B：使用 WebSocket 代替轮询
- 后端通过 WebSocket 推送处理状态
- **缺点**：需要后端大量改造，实施周期长

### 推荐方案：三步走 + 轮询（本提案）
- 短期使用轮询实现状态追踪
- 长期可优化为 WebSocket
- **优点**：平衡了实施成本和用户体验

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
