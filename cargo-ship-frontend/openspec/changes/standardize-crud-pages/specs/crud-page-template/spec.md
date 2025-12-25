# Spec Delta: CRUD页面模板

## ADDED Requirements

### Requirement: 统一页面布局
系统SHALL提供统一的CRUD页面布局结构，包含操作栏、搜索栏和数据表格三个主要区域。

#### Scenario: 设备管理页面使用模板
- **WHEN** 开发人员使用 CRUDPageTemplate 组件创建设备管理页面
- **THEN** 页面应该自动具有标准的三段式布局
- **AND** 操作栏显示标题和添加按钮
- **AND** 搜索栏提供搜索功能
- **AND** 数据表格显示设备列表

### Requirement: TypeScript泛型支持
组件SHALL支持TypeScript泛型，确保类型安全。

#### Scenario: 使用设备类型
- **WHEN** 开发人员声明 CRUDPageTemplate<Equipment>
- **THEN** TypeScript应该自动推断items的类型为 Equipment[]
- **AND** 所有回调函数接收正确的类型参数
- **AND** 编译时检测类型不匹配错误

### Requirement: 权限控制
组件SHALL支持基于权限的功能控制。

#### Scenario: 无创建权限
- **WHEN** 用户没有创建权限且 canCreate=false
- **THEN** 添加按钮应该被隐藏或禁用
- **AND** 其他操作按正常权限显示

### Requirement: 自定义渲染扩展点
组件SHALL提供扩展点支持自定义渲染。

#### Scenario: 添加导出按钮
- **WHEN** 使用 renderTopActions 渲染导出按钮
- **THEN** 导出按钮应该显示在操作栏
- **AND** 默认的添加按钮仍然存在

### Requirement: 响应式设计
组件SHALL支持响应式布局，适配不同屏幕尺寸。

#### Scenario: 桌面端显示
- **WHEN** 用户在桌面浏览器（宽度 > 1024px）访问
- **THEN** 应该显示完整的表格布局
- **AND** 所有列都可见

#### Scenario: 移动端显示
- **WHEN** 用户在移动设备（宽度 < 768px）访问
- **THEN** 应该显示卡片列表布局
- **AND** 每个项目显示为一个卡片

### Requirement: 加载和错误状态
组件SHALL正确处理和显示加载及错误状态。

#### Scenario: 数据加载中
- **WHEN** loading=true
- **THEN** 应该显示骨架屏加载动画
- **AND** 操作按钮应该被禁用

#### Scenario: 加载失败
- **WHEN** 设置error属性
- **THEN** 应该在页面顶部显示错误提示
- **AND** 应该提供重试按钮

#### Scenario: 空数据状态
- **WHEN** items=[]
- **THEN** 应该显示空状态插图和提示文字
- **AND** 如果有权限，显示添加第一项按钮

### Requirement: 搜索和筛选
组件SHALL支持实时搜索和多维度筛选。

#### Scenario: 实时搜索
- **WHEN** 用户在搜索框输入文本
- **THEN** 应该等待300ms防抖延迟
- **AND** 然后触发搜索回调
- **AND** 表格只显示匹配的项目

#### Scenario: 组合筛选
- **WHEN** 用户选择筛选器并输入搜索关键词
- **THEN** 表格应该显示同时满足两个条件的项目
- **AND** 筛选条件摘要显示当前筛选状态
