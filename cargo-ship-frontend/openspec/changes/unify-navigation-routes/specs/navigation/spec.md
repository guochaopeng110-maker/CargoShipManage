# 导航与路由配置规格 (Navigation and Routing Specification)

本规格定义了货船智能机舱管理系统的导航结构、路由配置和相关行为要求。

---

## ADDED Requirements

### Requirement: 统一导航配置模块 (Unified Navigation Configuration Module)

系统 SHALL 提供一个集中式的导航配置模块（`src/config/navigation.ts`），作为应用导航结构和路由配置的单一数据源。

该模块 MUST：
- 定义标准化的 `NavItem` 接口，包含导航项的所有元数据（ID、标签、图标、路径、子菜单、开发状态等）
- 导出完整的导航树结构配置 `navigationConfig`，包含所有一级菜单和菜单组
- 提供类型安全的辅助函数用于导航数据的查询和转换
- 包含清晰的注释，说明每个菜单项的用途和当前开发状态

#### Scenario: 导航配置模块存在性验证

- **WHEN** 检查 `src/config/navigation.ts` 文件
- **THEN** 该文件必须存在
- **AND** 文件必须导出 `NavItem` 类型接口
- **AND** 文件必须导出 `navigationConfig` 常量
- **AND** `navigationConfig` 必须包含至少一个导航项

#### Scenario: 导航配置数据结构验证

- **WHEN** 检查 `NavItem` 接口定义
- **THEN** 接口必须包含 `id: string` 字段
- **AND** 接口必须包含 `label: string` 字段
- **AND** 接口必须包含 `icon: React.ComponentType` 字段
- **AND** 接口必须包含可选的 `path?: string` 字段
- **AND** 接口必须包含可选的 `children?: NavItem[]` 字段
- **AND** 接口可以包含额外的元数据字段（如 `needsBackend: boolean`）

#### Scenario: 导航配置完整性验证

- **WHEN** 检查 `navigationConfig` 的内容
- **THEN** 配置必须包含"驾控台"（Dashboard）导航项
- **AND** 配置必须包含"监测与报警"（Live Monitoring And Alarm）菜单组
- **AND** 配置必须包含"告警中心"（Alarm Center）独立导航项
- **AND** 配置必须包含"数据中心"（Data Hub）菜单组
- **AND** 配置必须包含"健康评估"（Health Assessment）独立导航项
- **AND** 配置必须包含"视情维护"（Condition-Based Maintenance）菜单组
- **AND** 配置必须包含"辅助决策"（Decision Support）菜单组
- **AND** 配置必须包含"系统管理"（System Administration）菜单组
- **AND** 配置必须包含"个人账户"（My Account）菜单组

---

### Requirement: 导航结构与重构计划一致性 (Navigation Structure Alignment)

系统的导航结构 MUST 严格遵循 `docs/plan/frontend_refactoring_plan.md` 中定义的信息架构，确保导航层级、菜单标签、页面路由与重构计划完全一致。

#### Scenario: 监测与报警菜单组结构验证

- **WHEN** 查看"监测与报警"菜单组的子菜单
- **THEN** 子菜单必须包含"推进系统"（路径：`/propulsion`）
- **AND** 子菜单必须包含"电池储能"（路径：`/battery`）
- **AND** 子菜单必须包含"逆变器"（路径：`/inverter`）
- **AND** 子菜单必须包含"配电系统"（路径：`/power-distribution`）
- **AND** 子菜单必须包含"辅助系统"（路径：`/auxiliary`）
- **AND** 子菜单不得包含"告警中心"（告警中心应为独立的一级菜单项）

#### Scenario: 告警中心独立菜单项验证

- **WHEN** 查看一级导航菜单
- **THEN** 必须存在"告警中心"（Alarm Center）独立菜单项
- **AND** 该菜单项的路径必须为 `/alerts`
- **AND** 该菜单项不得作为任何菜单组的子菜单

#### Scenario: 健康评估独立菜单项验证

- **WHEN** 查看一级导航菜单
- **THEN** 必须存在"健康评估"（Health Assessment）独立菜单项
- **AND** 该菜单项的路径必须为 `/health`
- **AND** 该菜单项不得作为任何菜单组的子菜单
- **AND** 不得存在"评估与报表"菜单组

#### Scenario: 数据中心菜单组结构验证

- **WHEN** 查看"数据中心"（Data Hub）菜单组的子菜单
- **THEN** 子菜单必须包含"数据查询"（路径：`/data-query`）
- **AND** 子菜单必须包含"历史数据导入"（路径：`/data-import`）

#### Scenario: 视情维护菜单组结构验证

- **WHEN** 查看"视情维护"（Condition-Based Maintenance）菜单组的子菜单
- **THEN** 子菜单必须包含"维护计划"（路径：`/maintenance-plan`）
- **AND** 子菜单必须包含"维护历史"（路径：`/maintenance-history`）
- **AND** 子菜单不得包含"设备健康状态"（该页面不在当前重构范围内）

#### Scenario: 辅助决策菜单组结构验证

- **WHEN** 查看"辅助决策"（Decision Support）菜单组的子菜单
- **THEN** 子菜单必须包含"决策建议"（路径：`/decision-suggestions`）
- **AND** 子菜单必须包含"能效优化"（路径：`/energy-optimization`）
- **AND** 子菜单必须包含"复杂工况操作"（路径：`/complex-operations`）

#### Scenario: 系统管理菜单组结构验证

- **WHEN** 查看"系统管理"（System Administration）菜单组的子菜单
- **THEN** 子菜单必须包含"设备管理"（路径：`/device-management`）
- **AND** 子菜单必须包含"用户管理"（路径：`/user-management`）
- **AND** 子菜单必须包含"角色与权限"（路径：`/role-management`）
- **AND** 子菜单不得包含"告警阈值"（该页面不在当前重构范围内）

---

### Requirement: Sidebar 组件集成导航配置 (Sidebar Component Integration)

Sidebar 导航组件 MUST 从统一的导航配置模块（`src/config/navigation.ts`）消费导航数据，不得在组件内部硬编码导航结构。

#### Scenario: Sidebar 导入导航配置

- **WHEN** 检查 `src/components/Sidebar.tsx` 文件
- **THEN** 文件必须从 `../config/navigation` 导入导航配置
- **AND** 文件不得包含硬编码的 `navigationItems` 数组定义
- **AND** 所有导航数据必须来自导入的配置

#### Scenario: Sidebar 渲染导航菜单

- **WHEN** Sidebar 组件渲染时
- **THEN** 必须使用配置中的数据渲染所有导航菜单项
- **AND** 必须正确渲染嵌套的菜单组和子菜单
- **AND** 必须为每个菜单项应用正确的图标、标签和路径
- **AND** 必须保持现有的交互功能（展开/收起、悬停、高亮）不变

#### Scenario: Sidebar 导航交互功能

- **WHEN** 用户点击导航菜单项
- **THEN** 如果菜单项有子菜单，必须切换展开/收起状态
- **AND** 如果菜单项是叶子节点且有路径，必须导航到对应的路由
- **AND** 当前激活的菜单项必须高亮显示
- **AND** 菜单组展开时，其子菜单必须可见

---

### Requirement: MainLayout 路由配置集成 (MainLayout Routing Integration)

MainLayout 组件的路由配置 MUST 基于统一的导航配置模块，确保每个导航项都有对应的路由，路径映射准确无误。

#### Scenario: MainLayout 路由生成

- **WHEN** 检查 `src/components/MainLayout.tsx` 文件
- **THEN** 文件必须从 `../config/navigation` 导入导航配置
- **AND** 必须使用配置数据生成或验证所有路由配置
- **AND** 每个有路径的导航项都必须有对应的 `<Route>` 定义

#### Scenario: 路由路径一致性验证

- **WHEN** 比对导航配置中的路径和 MainLayout 中的路由路径
- **THEN** 所有导航配置中的路径必须在 MainLayout 中有对应的路由
- **AND** 路由路径必须与导航配置中的路径完全一致
- **AND** 不得存在未在导航配置中定义的路由（除了特殊路由如默认路由、404等）

#### Scenario: 路由组件映射验证

- **WHEN** 访问任意导航菜单项对应的路由路径
- **THEN** 必须加载正确的页面组件
- **AND** 页面组件必须成功渲染，无运行时错误
- **AND** 对于"视情维护"和"辅助决策"菜单下的页面，必须加载其现有UI骨架组件（如 MaintenancePlanPage, DecisionSuggestionsPage 等）
- **AND** 对于配电系统页面，如果组件不存在，必须加载占位页面

#### Scenario: 默认路由和404处理

- **WHEN** 用户访问根路径 `/`
- **THEN** 必须重定向到 `/dashboard`

- **WHEN** 用户访问未定义的路由路径
- **THEN** 必须显示"开发中"页面（UnderDevelopmentPage）或 404 页面
- **AND** 不得导致应用崩溃或白屏

---

### Requirement: 页面开发状态标识 (Page Development Status Indication)

导航配置 MUST 能够明确标识每个页面的开发状态，区分哪些页面需要完整的后端功能实现，哪些页面仅保留UI骨架作为占位符。

#### Scenario: 开发状态元数据定义

- **WHEN** 检查导航配置中的导航项
- **THEN** "视情维护"菜单组下的所有页面必须标记为"仅UI骨架，暂不实现后端功能"
- **AND** "辅助决策"菜单组下的所有页面必须标记为"仅UI骨架，暂不实现后端功能"
- **AND** 其他菜单项应根据重构计划标记其开发状态

#### Scenario: 开发状态注释清晰性

- **WHEN** 阅读导航配置文件
- **THEN** 必须能够清晰地识别哪些页面在当前阶段需要后端功能
- **AND** 必须能够清晰地识别哪些页面仅保留UI骨架
- **AND** 配置文件必须包含注释说明开发状态的含义和当前重构阶段的范围

---

### Requirement: 类型安全和代码质量 (Type Safety and Code Quality)

导航配置模块和集成代码 MUST 符合 TypeScript 类型安全要求，确保编译时和运行时的稳定性。

#### Scenario: TypeScript 类型检查通过

- **WHEN** 运行 `npm run type-check` 或 `tsc --noEmit`
- **THEN** 不得有任何类型错误
- **AND** 导航配置的所有字段必须有明确的类型定义
- **AND** Sidebar 和 MainLayout 中使用导航配置的代码必须类型安全

#### Scenario: 构建成功验证

- **WHEN** 运行 `npm run build`
- **THEN** 构建过程必须成功完成
- **AND** 不得有任何编译错误或警告
- **AND** 生成的构建产物大小应在合理范围内

#### Scenario: 代码规范检查通过

- **WHEN** 运行 `npm run lint`
- **THEN** 不得有任何 linting 错误
- **AND** 所有新增代码必须符合项目的代码规范
- **AND** 导航配置文件必须有清晰的注释和文档

---

### Requirement: 导航功能完整性 (Navigation Functionality Completeness)

所有导航功能 MUST 正常工作，包括菜单点击、路由跳转、页面加载、浏览器导航等。

#### Scenario: 导航菜单点击测试

- **WHEN** 用户点击任意导航菜单项
- **THEN** 如果是叶子菜单项，必须成功跳转到对应页面
- **AND** 如果是菜单组，必须切换展开/收起状态
- **AND** 当前页面在导航菜单中必须高亮显示
- **AND** 浏览器地址栏的 URL 必须更新为对应的路径

#### Scenario: 直接URL访问测试

- **WHEN** 用户在浏览器地址栏输入任意有效的路由路径
- **THEN** 必须加载对应的页面组件
- **AND** 对应的导航菜单项必须高亮显示
- **AND** 页面必须正确渲染，无运行时错误

#### Scenario: 浏览器导航功能测试

- **WHEN** 用户点击浏览器的"后退"按钮
- **THEN** 必须返回到上一个访问的页面
- **AND** 对应的导航菜单项必须高亮显示

- **WHEN** 用户点击浏览器的"前进"按钮
- **THEN** 必须前进到下一个页面
- **AND** 对应的导航菜单项必须高亮显示

#### Scenario: 页面刷新测试

- **WHEN** 用户在任意页面刷新浏览器
- **THEN** 必须重新加载当前页面
- **AND** 导航菜单状态必须正确恢复
- **AND** 当前页面在导航菜单中必须高亮显示
- **AND** 如果当前页面属于某个菜单组，该菜单组应自动展开

---

## REMOVED Requirements

无移除的需求（这是新增的导航规格）

---

## MODIFIED Requirements

无修改的需求（这是新增的导航规格）
