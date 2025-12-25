# Spec Delta: CRUD表单模态框

## ADDED Requirements

### Requirement: 动态表单字段配置
组件SHALL支持通过FormFieldConfig接口动态配置表单字段。

#### Scenario: 配置设备表单
- **WHEN** 定义包含设备ID、名称、类型的字段配置
- **THEN** 模态框应该显示所有配置的字段
- **AND** 必填字段应该标记为required
- **AND** select类型字段应该显示为下拉选择器

### Requirement: 表单验证
组件SHALL提供完整的表单验证功能。

#### Scenario: 必填字段验证
- **WHEN** 用户未填写必填字段直接提交
- **THEN** 应该在字段下显示错误提示
- **AND** 表单不应该提交
- **AND** 保存按钮保持启用状态

#### Scenario: 自定义验证
- **WHEN** 字段有自定义验证函数
- **AND** 用户输入不符合验证规则的值
- **THEN** 应该显示自定义错误提示
- **AND** 表单不应该提交

### Requirement: 创建和编辑模式
组件SHALL支持创建和编辑两种模式。

#### Scenario: 创建模式
- **WHEN** mode="create"
- **THEN** 标题应该显示"添加XXX"
- **AND** 所有字段应该为空
- **AND** 所有字段应该可编辑

#### Scenario: 编辑模式
- **WHEN** mode="edit" 且传入defaultValues
- **THEN** 标题应该显示"编辑XXX"
- **AND** 表单字段应该预填充数据
- **AND** 某些字段可能被禁用（如ID字段）

### Requirement: 提交处理
组件SHALL正确处理表单提交。

#### Scenario: 成功提交
- **WHEN** 用户提交有效的表单数据
- **THEN** 应该显示加载状态
- **AND** 调用onSubmit回调
- **AND** 如果API调用成功，模态框应该关闭
- **AND** 表单应该重置

#### Scenario: 提交失败
- **WHEN** API调用失败并返回错误
- **THEN** 应该在模态框顶部显示错误提示
- **AND** 模态框保持打开状态
- **AND** 用户可以修改并重新提交

### Requirement: 键盘导航
组件SHALL支持键盘导航和可访问性。

#### Scenario: Tab键导航
- **WHEN** 用户按Tab键
- **THEN** 焦点应该在字段间依次移动
- **AND** 最后应该移动到保存按钮

#### Scenario: Enter键提交
- **WHEN** 用户在字段中按Enter键
- **THEN** 应该提交表单（如果验证通过）

#### Scenario: Esc键关闭
- **WHEN** 用户按Esc键
- **THEN** 模态框应该关闭
