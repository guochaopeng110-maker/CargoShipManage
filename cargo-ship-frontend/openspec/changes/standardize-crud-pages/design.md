# 设计文档: 标准化CRUD页面模板

## 变更ID
`standardize-crud-pages`

## 架构概览

本设计文档描述了如何通过创建可复用的CRUD页面模板组件，统一三个管理页面（设备管理、用户管理、阈值管理）的实现，从而提升代码复用率和开发效率。

**注**：角色管理（RoleManagementPage）也在重构范围内，但由于系统只有3个固定角色（管理员、操作者、观察者），角色页面仅用于展示角色权限信息，不涉及CRUD操作，因此不适合使用CRUD模板，需要单独重构为轻量级的只读展示页面。

### 设计目标

1. **最大化代码复用**：将重复代码抽象为可复用组件
2. **保持灵活性**：支持各页面的个性化需求
3. **类型安全**：充分利用TypeScript进行类型检查
4. **性能优化**：避免不必要的重渲染
5. **易于扩展**：新增管理页面时能快速集成

## 组件架构

### 1. CRUDPageTemplate - 顶层模板组件

**职责**：提供统一的页面布局和数据流管理

**接口设计**：
```typescript
interface CRUDPageTemplateProps<T> {
  // 页面配置
  title: string
  description?: string

  // 数据源（来自Store）
  items: T[]
  total: number
  loading: boolean
  error: string | null

  // 分页配置
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void

  // 表格配置
  columns: ColumnDef<T>[]
  rowKey: keyof T

  // 搜索和筛选
  searchable?: boolean
  searchPlaceholder?: string
  filters?: FilterConfig[]

  // CRUD操作
  onCreateClick?: () => void
  onEditClick?: (item: T) => void
  onDeleteClick?: (item: T) => void
  onViewClick?: (item: T) => void

  // 权限控制
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canView?: boolean

  // 自定义渲染
  renderActionButtons?: (item: T) => React.ReactNode
  renderTopActions?: () => React.ReactNode
  renderEmptyState?: () => React.ReactNode
}
```

**组件结构**：
```tsx
export function CRUDPageTemplate<T>({ ... }: CRUDPageTemplateProps<T>) {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题和操作栏 */}
        <CRUDActionBar
          title={title}
          description={description}
          onCreateClick={canCreate ? onCreateClick : undefined}
          renderTopActions={renderTopActions}
        />

        {/* 搜索和筛选 */}
        {searchable && (
          <CRUDSearchBar
            placeholder={searchPlaceholder}
            filters={filters}
            onSearchChange={handleSearch}
            onFilterChange={handleFilter}
          />
        )}

        {/* 数据表格 */}
        <CRUDDataTable
          data={items}
          columns={columns}
          rowKey={rowKey}
          loading={loading}
          error={error}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          renderActionButtons={renderActionButtons}
          renderEmptyState={renderEmptyState}
        />
      </div>
    </div>
  )
}
```

### 2. CRUDDataTable - 数据表格组件

**职责**：展示列表数据，支持分页、排序和操作按钮

**特性**：
- 自适应列宽
- 支持自定义列渲染
- 内置加载状态和空状态
- 固定操作列在右侧
- 响应式设计

**接口设计**：
```typescript
interface CRUDDataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  rowKey: keyof T
  loading?: boolean
  error?: string | null

  // 分页
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void

  // 排序
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void

  // 自定义渲染
  renderActionButtons?: (item: T) => React.ReactNode
  renderEmptyState?: () => React.ReactNode
}

interface ColumnDef<T> {
  key: keyof T | string
  title: string
  width?: string | number
  sortable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
}
```

### 3. CRUDActionBar - 操作栏组件

**职责**：显示页面标题和顶部操作按钮

**接口设计**：
```typescript
interface CRUDActionBarProps {
  title: string
  description?: string
  onCreateClick?: () => void
  createButtonText?: string
  renderTopActions?: () => React.ReactNode
}
```

### 4. CRUDFormModal - 表单模态框组件

**职责**：提供统一的表单弹窗交互

**接口设计**：
```typescript
interface CRUDFormModalProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  mode: 'create' | 'edit'
  loading?: boolean

  // 表单配置
  fields: FormFieldConfig[]
  defaultValues?: Partial<T>

  // 提交处理
  onSubmit: (data: T) => Promise<void>
  onCancel?: () => void
}

interface FormFieldConfig {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'number'
  placeholder?: string
  required?: boolean
  options?: { label: string; value: string }[] // for select
  validation?: (value: any) => string | undefined
  disabled?: boolean
}
```

## Store模式标准化

### 标准Store接口

为了统一各个管理模块的Store结构，定义以下标准接口：

```typescript
/**
 * 通用CRUD Store状态接口
 */
interface CRUDStoreState<T> {
  // 数据列表
  items: T[]

  // 分页信息
  total: number
  page: number
  pageSize: number
  totalPages: number

  // 状态标识
  loading: boolean
  error: string | null

  // 筛选和排序
  filters: Record<string, any>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'

  // 当前选中项
  selectedItem: T | null
}

/**
 * 通用CRUD Store操作接口
 */
interface CRUDStoreActions<T, CreateDTO, UpdateDTO> {
  // 查询操作
  fetchItems: (params?: {
    page?: number
    pageSize?: number
    filters?: Record<string, any>
  }) => Promise<void>

  fetchItemById: (id: string) => Promise<T>

  // CRUD操作
  createItem: (data: CreateDTO) => Promise<T>
  updateItem: (id: string, data: UpdateDTO) => Promise<T>
  deleteItem: (id: string) => Promise<void>

  // 状态管理
  setSelectedItem: (item: T | null) => void
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  setFilters: (filters: Record<string, any>) => void
  clearError: () => void
  reset: () => void
}
```

### Store实现示例

```typescript
// equipment-store.ts (符合标准)
export const useEquipmentStore = create<
  CRUDStoreState<Equipment> &
  CRUDStoreActions<Equipment, CreateEquipmentRequest, UpdateEquipmentRequest>
>((set, get) => ({
  // State
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  loading: false,
  error: null,
  filters: {},
  selectedItem: null,

  // Actions
  fetchItems: async (params) => {
    set({ loading: true, error: null })
    try {
      const response = await equipmentService.getEquipmentList({
        page: params?.page ?? get().page,
        pageSize: params?.pageSize ?? get().pageSize,
        ...get().filters,
        ...params?.filters
      })
      set({
        items: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
        loading: false
      })
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : '获取数据失败'
      })
    }
  },

  // ... 其他Actions实现
}))
```

## 数据流设计

### 标准数据流

```
用户操作 → 页面组件 → Store Action → Service API → 后端
                ↓           ↓           ↓
              渲染 ← Store State ← 响应处理 ←
```

### 乐观更新（删除操作）

```typescript
deleteItem: async (id: string) => {
  const state = get()
  const originalItems = [...state.items]

  // 1. 乐观更新UI
  set({
    items: state.items.filter(item => item.id !== id),
    total: state.total - 1
  })

  try {
    // 2. 调用API
    await equipmentService.deleteEquipment(id)
  } catch (error) {
    // 3. 失败时回滚
    set({
      items: originalItems,
      total: state.total,
      error: '删除失败'
    })
    throw error
  }
}
```

### 悲观更新（新增/编辑操作）

```typescript
createItem: async (data: CreateDTO) => {
  set({ loading: true, error: null })

  try {
    // 1. 调用API
    const newItem = await equipmentService.createEquipment(data)

    // 2. 成功后更新UI
    set(state => ({
      items: [newItem, ...state.items],
      total: state.total + 1,
      loading: false
    }))

    return newItem
  } catch (error) {
    set({
      loading: false,
      error: error instanceof Error ? error.message : '创建失败'
    })
    throw error
  }
}
```

## 页面实现示例

### 使用模板重构后的页面

```typescript
// DeviceManagementPage.tsx
export function DeviceManagementPage() {
  // 1. 使用Store
  const {
    items,
    total,
    page,
    pageSize,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    setPage,
    setPageSize
  } = useEquipmentStore()

  // 2. 本地UI状态
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)

  // 3. 初始化数据
  useEffect(() => {
    fetchItems()
  }, [])

  // 4. 定义表格列
  const columns: ColumnDef<Equipment>[] = [
    {
      key: 'deviceId',
      title: '设备ID',
      sortable: true,
      render: (value) => <code className="font-mono">{value}</code>
    },
    {
      key: 'deviceName',
      title: '设备名称',
      sortable: true
    },
    {
      key: 'deviceType',
      title: '设备类型',
      render: (value) => <Badge>{value}</Badge>
    },
    {
      key: 'status',
      title: '状态',
      render: (value) => getStatusBadge(value)
    }
  ]

  // 5. 表单字段定义
  const formFields: FormFieldConfig[] = [
    {
      name: 'deviceId',
      label: '设备ID',
      type: 'text',
      required: true,
      disabled: !!editingItem
    },
    {
      name: 'deviceName',
      label: '设备名称',
      type: 'text',
      required: true
    },
    {
      name: 'deviceType',
      label: '设备类型',
      type: 'select',
      required: true,
      options: [
        { label: '电池系统', value: '电池' },
        { label: '推进电机', value: '推进电机' },
        // ...
      ]
    },
    {
      name: 'location',
      label: '安装位置',
      type: 'text'
    }
  ]

  // 6. 事件处理
  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const handleEdit = (item: Equipment) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleDelete = async (item: Equipment) => {
    if (confirm(`确定删除设备 ${item.deviceName}?`)) {
      await deleteItem(item.id)
    }
  }

  const handleSubmit = async (data: Equipment) => {
    if (editingItem) {
      await updateItem(editingItem.id, data)
    } else {
      await createItem(data)
    }
    setDialogOpen(false)
    await fetchItems()
  }

  // 7. 渲染模板
  return (
    <>
      <CRUDPageTemplate
        title="设备管理"
        description="货船智能机舱设备统一管理平台"
        items={items}
        total={total}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        columns={columns}
        rowKey="id"
        searchable
        searchPlaceholder="搜索设备ID或设备名称..."
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onCreateClick={handleCreate}
        onEditClick={handleEdit}
        onDeleteClick={handleDelete}
        canCreate={true}
        canEdit={true}
        canDelete={true}
      />

      <CRUDFormModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑设备' : '添加设备'}
        mode={editingItem ? 'edit' : 'create'}
        fields={formFields}
        defaultValues={editingItem || undefined}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </>
  )
}
```

通过以上模板，原本900+行的代码减少到约200行，代码复用率提升75%。

## 性能优化策略

### 1. 组件Memo化

```typescript
export const CRUDDataTable = React.memo(<T,>({ ... }: CRUDDataTableProps<T>) => {
  // 实现
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.data === nextProps.data &&
         prevProps.loading === nextProps.loading
})
```

### 2. 虚拟滚动

对于大数据量表格，使用虚拟滚动：
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function CRUDDataTable({ data, ... }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5
  })

  // 渲染虚拟行
}
```

### 3. 防抖搜索

```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    setFilters({ search: value })
  }, 300),
  []
)
```

## 类型安全

### 泛型支持

所有CRUD组件支持完整的TypeScript泛型：

```typescript
// 设备管理
<CRUDPageTemplate<Equipment>
  items={equipmentItems}
  columns={equipmentColumns}
  // TypeScript会自动推断类型
/>

// 用户管理
<CRUDPageTemplate<User>
  items={userItems}
  columns={userColumns}
  // TypeScript会自动推断类型
/>
```

## 扩展点设计

### 自定义渲染

```typescript
<CRUDPageTemplate
  // 自定义操作按钮
  renderActionButtons={(item) => (
    <>
      <Button onClick={() => handleCustomAction(item)}>
        自定义操作
      </Button>
      {/* 保留默认按钮 */}
      <DefaultActionButtons item={item} />
    </>
  )}

  // 自定义顶部操作
  renderTopActions={() => (
    <Button onClick={handleExport}>导出数据</Button>
  )}

  // 自定义空状态
  renderEmptyState={() => (
    <CustomEmptyState message="暂无设备数据" />
  )}
/>
```

## 测试策略

### 单元测试

```typescript
describe('CRUDPageTemplate', () => {
  it('应该正确渲染标题和描述', () => {
    render(<CRUDPageTemplate title="测试" description="描述" ... />)
    expect(screen.getByText('测试')).toBeInTheDocument()
  })

  it('应该在点击添加按钮时调用onCreateClick', () => {
    const onCreateClick = vi.fn()
    render(<CRUDPageTemplate onCreateClick={onCreateClick} ... />)
    fireEvent.click(screen.getByText('添加'))
    expect(onCreateClick).toHaveBeenCalled()
  })
})
```

### E2E测试

```typescript
test('设备管理完整流程', async ({ page }) => {
  // 访问页面
  await page.goto('/devices')

  // 创建设备
  await page.click('button:has-text("添加设备")')
  await page.fill('input[name="deviceId"]', 'TEST-001')
  await page.fill('input[name="deviceName"]', '测试设备')
  await page.click('button:has-text("保存")')

  // 验证创建成功
  await expect(page.locator('text=TEST-001')).toBeVisible()

  // 编辑设备
  await page.click('button[title="编辑设备"]')
  await page.fill('input[name="deviceName"]', '更新后的设备')
  await page.click('button:has-text("保存")')

  // 删除设备
  await page.click('button[title="删除设备"]')
  await page.click('button:has-text("确认删除")')

  // 验证删除成功
  await expect(page.locator('text=TEST-001')).not.toBeVisible()
})
```

## 迁移策略

### 渐进式迁移

1. **第1周**：创建通用组件并完成单元测试
2. **第2周**：迁移DeviceManagementPage（作为试点）
3. **第3周**：迁移UserManagementPage
4. **第4周**：创建/迁移ThresholdManagementPage，重构RoleManagementPage（展示页面），完成E2E测试

### 向后兼容

- 保留原有页面文件作为备份（添加`.legacy.tsx`后缀）
- 使用Feature Flag控制新旧版本切换
- 充分测试后再删除旧代码

## 文档和培训

### 开发文档

创建以下文档：
1. `docs/guides/crud-page-template.md` - 使用指南
2. `docs/api/crud-components.md` - 组件API文档
3. `docs/examples/crud-page-examples.md` - 示例代码

### 团队培训

- 组织1小时的技术分享会
- 演示如何使用模板创建新的管理页面
- 收集反馈并持续改进

## 未来优化方向

1. **批量操作支持**：表格支持多选和批量操作
2. **高级筛选**：支持复杂的筛选条件组合
3. **导入导出**：统一的Excel导入导出功能
4. **审计日志**：记录所有CRUD操作
5. **离线支持**：PWA + IndexedDB缓存

---

**文档版本**: 1.0
**最后更新**: 2025-12-15
