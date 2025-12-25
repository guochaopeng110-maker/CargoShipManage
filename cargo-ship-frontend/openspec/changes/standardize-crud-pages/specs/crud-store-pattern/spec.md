# Spec Delta: CRUD Store模式

## ADDED Requirements

### Requirement: 标准State接口
所有CRUD Store SHALL实现标准的State接口，包含列表数据、分页信息、加载状态和错误信息。

#### Scenario: 设备Store状态
- **WHEN** 创建设备管理Store
- **THEN** Store State应该包含items, total, page, pageSize, loading, error等字段
- **AND** 所有字段应该有正确的类型定义

### Requirement: 标准Actions接口
所有CRUD Store SHALL实现标准的Actions接口，包含查询、创建、更新、删除等操作。

#### Scenario: 设备CRUD操作
- **WHEN** Store提供fetchItems, createItem, updateItem, deleteItem方法
- **THEN** 每个方法都应该设置loading状态
- **AND** 调用对应的API Client方法
- **AND** 更新Store状态
- **AND** 处理错误并设置error状态

### Requirement: API Client集成
Store Actions SHALL通过Service层调用API Client。

#### Scenario: 获取设备列表
- **WHEN** 调用fetchItems({ page: 1, pageSize: 20 })
- **THEN** 应该设置loading=true, error=null
- **AND** 调用equipmentService.getEquipmentList()
- **AND** 如果成功，更新items, total, page, pageSize
- **AND** 设置loading=false

### Requirement: 乐观更新（删除操作）
删除操作SHALL使用乐观更新策略。

#### Scenario: 删除成功
- **WHEN** 用户删除一个项目
- **THEN** 应该立即从items中移除该项目
- **AND** UI立即更新
- **AND** 调用删除API
- **AND** 如果成功，保持UI状态

#### Scenario: 删除失败
- **WHEN** 用户删除一个项目且API调用失败
- **THEN** 应该立即从items中移除该项目
- **AND** 调用删除API
- **AND** API返回错误后恢复该项目到items
- **AND** 设置error信息
- **AND** UI显示错误提示

### Requirement: 悲观更新（新增/编辑操作）
新增和编辑操作SHALL使用悲观更新策略。

#### Scenario: 创建成功
- **WHEN** 调用createItem(data)
- **THEN** 应该设置loading=true
- **AND** 调用API创建
- **AND** 如果成功，将新项目添加到items
- **AND** 设置loading=false

#### Scenario: 更新失败
- **WHEN** 调用updateItem(id, data) 且API失败
- **THEN** 应该设置loading=true
- **AND** 调用API更新
- **AND** API返回错误
- **AND** 设置loading=false 和 error信息
- **AND** 抛出错误让组件处理

### Requirement: 分页和筛选
Store SHALL支持分页和筛选功能。

#### Scenario: 切换页码
- **WHEN** 调用setPage(2)
- **THEN** 应该设置page=2
- **AND** 自动调用fetchItems()获取新数据

#### Scenario: 应用筛选
- **WHEN** 调用setFilters({ type: '电池' })
- **THEN** 应该设置filters
- **AND** 重置page=1
- **AND** 自动调用fetchItems()获取筛选后的数据

## MODIFIED Requirements

### Requirement: 用户管理Store分离
auth-store中的用户管理逻辑SHALL分离到独立的user-store。

#### Scenario: 用户管理独立
- **WHEN** 创建独立的user-store
- **THEN** user-store应该包含用户列表管理、用户CRUD操作
- **AND** auth-store应该保留登录/登出、当前用户信息、权限检查
- **AND** 现有代码应该继续工作（向后兼容）
