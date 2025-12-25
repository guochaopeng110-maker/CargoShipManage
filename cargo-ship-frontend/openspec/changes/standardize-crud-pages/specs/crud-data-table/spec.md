# Spec Delta: CRUD数据表格

## ADDED Requirements

### Requirement: 表格列配置
组件SHALL支持灵活的列配置，通过ColumnDef接口定义列属性。

#### Scenario: 配置设备表格列
- **WHEN** 定义包含设备ID、名称、类型、状态的列配置
- **THEN** 表格应该显示所有配置的列
- **AND** 可排序的列应该显示排序图标
- **AND** 自定义render函数应该正确渲染列内容

### Requirement: 分页控制
组件SHALL提供完整的分页功能。

#### Scenario: 分页导航
- **WHEN** 设备列表有100条记录，每页显示20条
- **THEN** 应该显示"显示 1-20 条，共 100 条记录"
- **AND** 上一页按钮应该被禁用（在第1页时）
- **AND** 下一页按钮应该可用
- **AND** 当前页码显示为 "1 / 5"

#### Scenario: 切换页面大小
- **WHEN** 用户将每页大小从20改为50
- **THEN** 应该自动跳转到第1页
- **AND** 触发onPageSizeChange回调

### Requirement: 列排序
组件SHALL支持列排序功能。

#### Scenario: 按名称排序
- **WHEN** 用户点击可排序列的标题
- **THEN** 应该按该列升序排序
- **AND** 列标题显示向上箭头图标
- **AND** 触发onSortChange回调

#### Scenario: 切换排序方向
- **WHEN** 用户再次点击已排序的列标题
- **THEN** 应该切换为降序排序
- **AND** 列标题显示向下箭头图标

### Requirement: 操作列
组件SHALL提供固定的操作列，包含查看、编辑、删除等按钮。

#### Scenario: 默认操作按钮
- **WHEN** 渲染表格
- **THEN** 每行应该显示操作按钮
- **AND** 操作列固定在右侧

#### Scenario: 自定义操作按钮
- **WHEN** 使用renderActionButtons自定义操作
- **THEN** 应该渲染自定义按钮
- **AND** 可选择保留或替换默认按钮

### Requirement: 加载和空状态
组件SHALL正确显示加载和空状态。

#### Scenario: 加载中显示骨架屏
- **WHEN** loading=true
- **THEN** 应该显示5-10行骨架屏占位符
- **AND** 显示加载动画效果

#### Scenario: 空数据状态
- **WHEN** data=[] 且 loading=false
- **THEN** 应该显示空状态图标
- **AND** 显示提示文字
- **AND** 如果有权限，显示添加按钮

### Requirement: 响应式表格
组件SHALL在移动端切换为卡片视图。

#### Scenario: 移动端卡片视图
- **WHEN** 用户在移动设备（宽度 < 768px）访问
- **THEN** 应该显示卡片列表而非表格
- **AND** 每个项目显示为独立卡片
- **AND** 卡片包含关键信息和操作按钮
