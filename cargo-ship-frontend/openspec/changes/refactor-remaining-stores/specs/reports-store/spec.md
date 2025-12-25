# Spec Delta: Reports Store 规范化

## MODIFIED Requirements

### Requirement: Reports Store SHALL 分离 State 和 Actions 接口定义
Reports Store SHALL 将所有状态和方法定义拆分为独立的 `ReportsState` 和 `ReportsActions` 接口。

#### Scenario: 拆分 Reports State 接口
- **WHEN** 重构 Reports Store
- **THEN** 必须创建 `ReportsState` 接口，仅包含数据状态字段
- **AND** 字段包括：`reports`, `statistics`, `loading`, `generating`, `error`, `pagination`, `queryParams`, `selectedReports`, `generationProgress`
- **AND** 不得包含方法定义

#### Scenario: 拆分 Reports Actions 接口
- **WHEN** 重构 Reports Store
- **THEN** 必须创建 `ReportsActions` 接口，仅包含方法签名
- **AND** 方法包括：`fetchReports`, `generateReport`, `downloadReport`, `deleteReport`, `deleteSelectedReports`, `refreshStatistics`, `setQueryParams`, `toggleReportSelection`, `clearSelection`, `resetStore`
- **AND** 不得包含数据状态字段

#### Scenario: 更新 Zustand Store 类型定义
- **WHEN** 拆分接口后
- **THEN** Zustand Store 必须使用 `create<ReportsState & ReportsActions>()`
- **AND** 实现部分保持不变（向后兼容）

```typescript
// 旧代码（需修改）
interface ReportsState {
  // 状态字段
  reports: Report[];
  loading: boolean;

  // 方法字段（需移除）
  fetchReports: (params?: ReportsQueryParams) => Promise<void>;
  generateReport: (config: ReportConfig) => Promise<Report | null>;
}

// 新代码（推荐）
interface ReportsState {
  // 仅数据状态
  reports: Report[];
  statistics: ReportStatistics | null;
  loading: boolean;
  generating: boolean;
  error: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
  queryParams: ReportsQueryParams;
  selectedReports: string[];
  generationProgress: Record<string, number>;
}

interface ReportsActions {
  // 仅方法签名
  fetchReports: (params?: ReportsQueryParams) => Promise<void>;
  generateReport: (config: ReportConfig) => Promise<Report | null>;
  downloadReport: (reportId: string) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  deleteSelectedReports: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  setQueryParams: (params: Partial<ReportsQueryParams>) => void;
  toggleReportSelection: (reportId: string) => void;
  selectAllReports: () => void;
  clearSelection: () => void;
  clearError: () => void;
  resetStore: () => void;
  trackGenerationProgress: (reportId: string) => void;
}

export const useReportsStore = create<ReportsState & ReportsActions>((set, get) => ({
  // 实现保持不变
  // ...
}));
```

## ADDED Requirements

### Requirement: Reports Store SHALL 提供 Selector 导出
Reports Store SHALL 导出命名的 Selector 对象，支持组件精确订阅状态片段。

#### Scenario: 导出 Selector 对象
- **WHEN** 规范化 Reports Store
- **THEN** 必须导出 `useReportsSelector` 对象
- **AND** 对象必须包含常用状态的 Selector 函数：`reports`, `loading`, `statistics`, `pagination`

```typescript
export const useReportsSelector = {
  reports: (state: ReportsState & ReportsActions) => state.reports,
  loading: (state: ReportsState & ReportsActions) => state.loading,
  generating: (state: ReportsState & ReportsActions) => state.generating,
  statistics: (state: ReportsState & ReportsActions) => state.statistics,
  pagination: (state: ReportsState & ReportsActions) => state.pagination,
  selectedReports: (state: ReportsState & ReportsActions) => state.selectedReports,
};
```

#### Scenario: 组件使用 Selector
- **GIVEN** 组件仅需要显示报表列表
- **WHEN** 使用 `useReportsStore(useReportsSelector.reports)`
- **THEN** 当 `statistics` 变化时，该组件不应重渲染
- **AND** 当 `reports` 变化时，该组件应重渲染

### Requirement: Reports Store SHALL 添加 JSDoc 注释
Reports Store SHALL 为接口和关键方法添加 JSDoc 注释，提升代码可读性。

#### Scenario: 为接口添加注释
- **WHEN** 定义 `ReportsState` 接口
- **THEN** 必须添加接口级别的 JSDoc 注释，说明该接口的职责
- **AND** 关键字段必须添加行内注释

```typescript
/**
 * 报表状态接口
 *
 * 定义报表管理的所有数据状态
 */
interface ReportsState {
  /** 报表列表 */
  reports: Report[];

  /** 报表统计信息 */
  statistics: ReportStatistics | null;

  /** 是否正在加载数据 */
  loading: boolean;

  /** 是否正在生成报表 */
  generating: boolean;

  /** 错误信息 */
  error: string | null;

  // ... 其他字段
}
```

#### Scenario: 为关键方法添加注释
- **WHEN** 定义 `ReportsActions` 接口
- **THEN** 复杂方法必须添加 JSDoc 注释，说明参数、返回值和副作用

```typescript
/**
 * 报表操作接口
 *
 * 定义报表管理的所有业务操作
 */
interface ReportsActions {
  /**
   * 获取报表列表
   *
   * @param params - 可选的查询参数（分页、筛选、排序）
   * @returns Promise<void>
   *
   * @example
   * ```typescript
   * await fetchReports({ page: 1, limit: 20, sortBy: 'createdAt' });
   * ```
   */
  fetchReports: (params?: ReportsQueryParams) => Promise<void>;

  /**
   * 生成新报表
   *
   * @param config - 报表配置（类型、参数、时间范围等）
   * @returns Promise<Report | null> - 生成的报表对象或 null（失败时）
   *
   * @example
   * ```typescript
   * const report = await generateReport({
   *   type: 'health',
   *   deviceId: 'device-001',
   *   startTime: Date.now() - 86400000,
   *   endTime: Date.now()
   * });
   * ```
   */
  generateReport: (config: ReportConfig) => Promise<Report | null>;

  // ... 其他方法
}
```

## REMOVED Requirements

无（Reports Store 功能保持不变，仅调整架构规范）

## 向后兼容性

### 兼容性声明
- ✅ Zustand Store 的实现部分**完全保持不变**
- ✅ 所有现有方法的签名和行为**完全保持不变**
- ✅ 组件使用方式**无需调整**
- ✅ 仅调整类型定义，不影响运行时行为

### 迁移影响
- **影响的文件**：`src/stores/reports-store.ts`
- **不影响的文件**：`src/components/ReportsPage.tsx`, `src/components/ui/report-generator.tsx`（组件代码无需改动）
- **变更类型**：仅接口定义调整，无行为变更

### 测试策略
- 无需功能测试（功能未变更）
- 需要类型检查测试（运行 `npm run type-check`）
- 建议手动验证页面正常加载（回归测试）
