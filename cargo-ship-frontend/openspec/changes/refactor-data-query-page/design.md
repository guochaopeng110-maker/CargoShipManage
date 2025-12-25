# 数据查询页面重构 - 技术设计文档

## 架构概览

本次重构将 DataQueryPage 从一个多功能的复杂页面简化为一个专注于数据查询和导出的简洁工具。核心架构基于以下原则：

1. **分离关注点**：UI 层仅负责展示和交互，业务逻辑在 Store 中处理
2. **单一职责**：页面专注于查询功能，数据可视化交给专门的分析页面
3. **清晰的数据流**：用户触发 → Store Action → API 请求 → 状态更新 → UI 响应

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      DataQueryPage                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              查询条件区 (Filters Section)              │  │
│  │  • 设备选择 (Device Selector)                         │  │
│  │  • 监控参数选择 (Metric Type Selector)                │  │
│  │  • 日期范围选择器 (Date Range Picker)                 │  │
│  │  • 执行查询按钮 (Execute Query Button)                │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             结果展示区 (Results Section)               │  │
│  │  • 数据表格 (Data Table)                              │  │
│  │  • 分页组件 (Pagination)                              │  │
│  │  • 导出按钮 (Export Buttons)                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring Store                          │
│  • historicalData: { items, total, page, pageSize }        │
│  • queryStatus: 'idle' | 'loading' | 'success' | 'error'   │
│  • fetchHistoricalData(filters, page)                      │
│  • exportHistoricalData(format)                            │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                       API Client                            │
│  • GET /api/monitoring/data                                 │
│  • POST /api/monitoring/export                              │
└─────────────────────────────────────────────────────────────┘
```

## 组件设计

### 1. DataQueryPage 组件

#### 组件结构

```typescript
export function DataQueryPage() {
  // ===== State Management =====
  const {
    historicalData,
    queryStatus,
    fetchHistoricalData,
    exportHistoricalData,
  } = useMonitoringStore();

  // ===== Local UI State =====
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // ===== Event Handlers =====
  const handleExecuteQuery = async () => {
    if (!selectedDevice || selectedMetrics.length === 0 || !dateRange) {
      return; // 验证失败
    }

    await fetchHistoricalData({
      deviceId: selectedDevice,
      metricTypes: selectedMetrics,
      startTime: dateRange.start.getTime(),
      endTime: dateRange.end.getTime(),
      page: currentPage,
      pageSize,
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    // 自动触发新页面的查询
    handleExecuteQuery();
  };

  const handleExport = async (format: 'excel' | 'csv' | 'json') => {
    await exportHistoricalData(format);
  };

  // ===== Render =====
  return (
    <div className="data-query-page">
      {/* 查询条件区 */}
      <QueryFilters
        selectedDevice={selectedDevice}
        selectedMetrics={selectedMetrics}
        dateRange={dateRange}
        onDeviceChange={setSelectedDevice}
        onMetricsChange={setSelectedMetrics}
        onDateRangeChange={setDateRange}
        onExecuteQuery={handleExecuteQuery}
        loading={queryStatus === 'loading'}
      />

      {/* 结果展示区 */}
      <QueryResults
        data={historicalData.items}
        total={historicalData.total}
        page={currentPage}
        pageSize={pageSize}
        loading={queryStatus === 'loading'}
        onPageChange={handlePageChange}
        onExport={handleExport}
      />
    </div>
  );
}
```

#### Props 接口

```typescript
// QueryFilters 组件
interface QueryFiltersProps {
  selectedDevice: string;
  selectedMetrics: string[];
  dateRange: DateRange | null;
  onDeviceChange: (deviceId: string) => void;
  onMetricsChange: (metrics: string[]) => void;
  onDateRangeChange: (range: DateRange | null) => void;
  onExecuteQuery: () => void;
  loading: boolean;
}

// QueryResults 组件
interface QueryResultsProps {
  data: UnifiedMonitoringData[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onExport: (format: 'excel' | 'csv' | 'json') => void;
}
```

### 2. DateRangePicker 组件

#### 组件功能

- 提供日历式日期选择器
- 支持快捷时间范围选项
- 自动校验日期范围合法性

#### 接口设计

```typescript
export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  presets?: DateRangePreset[];
  maxRange?: number; // 最大时间跨度（天）
  minDate?: Date;
  maxDate?: Date;
}

export interface DateRangePreset {
  label: string;
  getValue: () => DateRange;
}

// 预设时间范围
export const DEFAULT_PRESETS: DateRangePreset[] = [
  {
    label: '最近7天',
    getValue: () => ({
      start: subDays(new Date(), 7),
      end: new Date(),
    }),
  },
  {
    label: '最近30天',
    getValue: () => ({
      start: subDays(new Date(), 30),
      end: new Date(),
    }),
  },
  {
    label: '本月',
    getValue: () => ({
      start: startOfMonth(new Date()),
      end: new Date(),
    }),
  },
  {
    label: '上月',
    getValue: () => ({
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
];
```

### 3. Pagination 组件

#### 组件功能

- 显示当前页码和总页数
- 支持页码跳转
- 支持上一页/下一页导航
- 可配置每页显示数量

#### 接口设计

```typescript
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showPageSizeSelector?: boolean;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showPageSizeSelector = false,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  // 实现分页逻辑
}
```

## Store 设计

### Monitoring Store 扩展

#### 新增状态

```typescript
interface MonitoringState {
  // ... 现有状态 ...

  // ===== 历史查询相关状态 =====
  /** 历史数据查询结果 */
  historicalData: {
    items: UnifiedMonitoringData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };

  /** 查询状态 */
  queryStatus: 'idle' | 'loading' | 'success' | 'error';

  /** 查询错误信息 */
  queryError: string | null;

  /** 当前查询参数（用于分页等场景） */
  currentQueryParams: HistoricalQueryParams | null;
}

interface HistoricalQueryParams {
  deviceId: string;
  metricTypes: string[];
  startTime: number;
  endTime: number;
  page: number;
  pageSize: number;
}
```

#### 新增 Actions

```typescript
interface MonitoringActions {
  // ... 现有 actions ...

  /**
   * 获取历史数据
   * @param params 查询参数
   */
  fetchHistoricalData: (params: HistoricalQueryParams) => Promise<void>;

  /**
   * 导出历史数据
   * @param format 导出格式
   */
  exportHistoricalData: (format: 'excel' | 'csv' | 'json') => Promise<void>;

  /**
   * 清除查询结果
   */
  clearHistoricalData: () => void;

  /**
   * 重置查询状态
   */
  resetQueryStatus: () => void;
}
```

#### 实现示例

```typescript
export const useMonitoringStore = create<MonitoringState & MonitoringActions>(
  (set, get) => ({
    // ... 现有状态 ...

    // 历史查询状态初始化
    historicalData: {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    },
    queryStatus: 'idle',
    queryError: null,
    currentQueryParams: null,

    // 获取历史数据
    fetchHistoricalData: async (params: HistoricalQueryParams) => {
      set({ queryStatus: 'loading', queryError: null });

      try {
        // 保存查询参数（用于后续分页）
        set({ currentQueryParams: params });

        // 调用 API
        const response = await historicalDataService.queryData({
          equipmentId: params.deviceId,
          metricTypes: params.metricTypes,
          startTime: params.startTime,
          endTime: params.endTime,
          page: params.page,
          pageSize: params.pageSize,
        });

        // 更新状态
        set({
          historicalData: {
            items: response.data,
            total: response.total,
            page: response.page,
            pageSize: response.pageSize,
            totalPages: Math.ceil(response.total / response.pageSize),
          },
          queryStatus: 'success',
        });
      } catch (error) {
        set({
          queryStatus: 'error',
          queryError: error instanceof Error ? error.message : '查询失败',
        });
      }
    },

    // 导出历史数据
    exportHistoricalData: async (format: 'excel' | 'csv' | 'json') => {
      const { currentQueryParams } = get();
      if (!currentQueryParams) {
        throw new Error('没有可导出的查询结果');
      }

      try {
        await historicalDataService.exportData({
          ...currentQueryParams,
          format,
        });
      } catch (error) {
        console.error('数据导出失败:', error);
        throw error;
      }
    },

    // 清除查询结果
    clearHistoricalData: () => {
      set({
        historicalData: {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
        },
        queryStatus: 'idle',
        queryError: null,
        currentQueryParams: null,
      });
    },

    // 重置查询状态
    resetQueryStatus: () => {
      set({ queryStatus: 'idle', queryError: null });
    },
  })
);
```

## 数据流设计

### 查询流程

```
1. 用户选择设备和参数
   ↓
2. 用户选择日期范围
   ↓
3. 用户点击"执行查询"按钮
   ↓
4. DataQueryPage 调用 fetchHistoricalData()
   ↓
5. Store 设置 queryStatus = 'loading'
   ↓
6. Store 调用 API Client
   ↓
7. API Client 发送 GET /api/monitoring/data
   ↓
8. 后端处理请求并返回数据
   ↓
9. Store 更新 historicalData 和 queryStatus
   ↓
10. DataQueryPage 响应状态变化，渲染结果
```

### 分页流程

```
1. 用户点击页码或"下一页"
   ↓
2. DataQueryPage 调用 handlePageChange(newPage)
   ↓
3. 更新 currentPage 状态
   ↓
4. 重新调用 fetchHistoricalData() with new page
   ↓
5. 重复查询流程
```

### 导出流程

```
1. 用户点击"Excel导出"按钮
   ↓
2. DataQueryPage 调用 exportHistoricalData('excel')
   ↓
3. Store 使用 currentQueryParams 调用导出 API
   ↓
4. API 返回下载链接或文件流
   ↓
5. 浏览器触发文件下载
```

## API 设计

### 查询历史数据

```
GET /api/monitoring/data

Query Parameters:
- equipmentId: string (必填)
- metricTypes: string[] (必填，逗号分隔)
- startTime: number (必填，Unix 时间戳毫秒)
- endTime: number (必填，Unix 时间戳毫秒)
- page: number (默认 1)
- pageSize: number (默认 20)
- sortBy: string (默认 'timestamp')
- sortOrder: 'asc' | 'desc' (默认 'asc')

Response:
{
  "success": true,
  "data": [
    {
      "id": "123",
      "equipmentId": "battery-001",
      "timestamp": 1702828800000,
      "metricType": "voltage",
      "value": 720.5,
      "unit": "V",
      "quality": "normal",
      "source": "sensor-upload"
    },
    // ...
  ],
  "total": 1500,
  "page": 1,
  "pageSize": 20,
  "totalPages": 75
}
```

### 导出数据

```
POST /api/monitoring/export

Request Body:
{
  "equipmentId": "battery-001",
  "metricTypes": ["voltage", "current"],
  "startTime": 1702742400000,
  "endTime": 1702828800000,
  "format": "excel" | "csv" | "json"
}

Response:
{
  "success": true,
  "downloadUrl": "https://api.example.com/downloads/export-123.xlsx",
  "expiresAt": 1702832400000
}
```

## UI/UX 设计

### 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] 设备数据查询                            [User] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  查询条件                                         │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │  设备:  [下拉选择器 ▼]                           │ │
│  │                                                   │ │
│  │  参数:  [电压] [电流] [温度] [SOC] ...          │ │
│  │                                                   │ │
│  │  时间:  [日期范围选择器]                         │ │
│  │         快捷选项: [最近7天] [最近30天] [本月]   │ │
│  │                                                   │ │
│  │  [执行查询]                                       │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  查询结果                [Excel] [CSV] [JSON]    │ │
│  ├───────────────────────────────────────────────────┤ │
│  │                                                   │ │
│  │  时间           设备    参数   数值    状态      │ │
│  │  ───────────────────────────────────────────────  │ │
│  │  2024-12-14... 电池系统 电压   720.5V  正常      │ │
│  │  2024-12-14... 电池系统 电流   85.2A   正常      │ │
│  │  ...                                              │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  [<上一页]  1 2 3 ... 75  [下一页>]  共1500条   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 交互状态

#### 1. 初始状态
- 显示空的查询条件
- 结果区显示"请执行查询获取数据"的提示

#### 2. 加载状态
- 查询按钮显示加载动画
- 结果区显示骨架屏或加载指示器
- 禁用所有交互控件

#### 3. 成功状态
- 显示查询结果表格
- 显示分页控件
- 启用导出按钮

#### 4. 错误状态
- 显示错误提示
- 提供"重试"按钮
- 保留查询条件供用户调整

#### 5. 空结果状态
- 显示"未找到符合条件的数据"提示
- 建议用户调整查询条件

## 性能考虑

### 1. 数据加载优化

- **分页加载**：每次只加载当前页的数据，避免一次性加载大量数据
- **请求防抖**：防止用户快速点击导致的重复请求
- **缓存策略**：相同查询参数的结果可以缓存一段时间

### 2. 渲染优化

- **虚拟滚动**：如果单页数据量较大，考虑使用虚拟滚动
- **懒加载**：表格行按需渲染
- **React.memo**：对稳定的子组件使用 memo 优化

### 3. 网络优化

- **请求合并**：避免并发的重复请求
- **取消机制**：页面切换时取消未完成的请求
- **压缩传输**：启用 gzip 压缩

## 错误处理

### 错误类型

1. **验证错误**
   - 未选择设备
   - 未选择参数
   - 日期范围无效
   - **处理**：前端验证，显示表单错误提示

2. **网络错误**
   - 请求超时
   - 网络断开
   - **处理**：显示错误提示，提供重试按钮

3. **业务错误**
   - 无权限访问设备
   - 查询时间范围超出限制
   - **处理**：显示具体错误信息，引导用户调整

4. **服务器错误**
   - 500 错误
   - 服务不可用
   - **处理**：显示通用错误提示，建议稍后重试

### 错误展示

```typescript
interface ErrorDisplay {
  type: 'validation' | 'network' | 'business' | 'server';
  message: string;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}
```

## 测试策略

### 单元测试

1. **Store Actions 测试**
   - 测试 fetchHistoricalData 的各种场景
   - 测试状态更新逻辑
   - 测试错误处理

2. **组件测试**
   - DateRangePicker 的日期选择和验证
   - Pagination 的页码计算和跳转
   - QueryFilters 的表单验证

### 集成测试

1. **数据流测试**
   - 完整的查询流程
   - 分页切换
   - 数据导出

2. **错误场景测试**
   - API 失败处理
   - 网络超时处理
   - 无效输入处理

### E2E 测试

1. **用户工作流测试**
   - 选择设备 → 选择参数 → 选择日期 → 执行查询 → 查看结果
   - 分页浏览
   - 数据导出

## 迁移计划

### 兼容性处理

1. **保留现有 API**
   - 暂时保留现有的 createQuery 和 executeQuery
   - 新页面使用新的 fetchHistoricalData
   - 逐步废弃旧 API

2. **数据结构兼容**
   - 确保 UnifiedMonitoringData 类型兼容
   - 提供数据转换工具函数

### 回滚策略

1. **特性开关**
   - 使用特性开关控制新旧页面切换
   - 出现问题可快速回滚到旧版本

2. **数据备份**
   - 保留旧版本代码分支
   - 确保可以快速恢复

## 未来扩展

### 可能的增强功能

1. **高级筛选**
   - 支持数据质量筛选
   - 支持值范围筛选
   - 支持多设备对比

2. **查询保存**
   - 保存常用查询条件
   - 查询模板管理

3. **实时预览**
   - 在条件变化时自动更新结果数量预估
   - 提供数据分布预览

4. **智能建议**
   - 根据历史查询推荐条件
   - 智能时间范围建议

---

**文档版本**: 1.0
**最后更新**: 2025-12-14
**作者**: AI Assistant
