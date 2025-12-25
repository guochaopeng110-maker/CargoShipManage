# 变更提案：统一导航结构与路由配置 (Unify Navigation and Routes)

## 为什么 (Why)

当前应用的导航结构（Sidebar）与前端重构计划（`docs/plan/frontend_refactoring_plan.md`）中定义的信息架构存在不一致，且导航配置散落在多个文件中，缺乏单一数据源。这导致：

1. **不一致性风险**：Sidebar组件、路由配置、重构计划文档三者之间可能出现不同步
2. **维护困难**：修改导航结构需要同时更新多个文件
3. **开发范围模糊**：当前阶段哪些页面需要实现后端功能、哪些仅保留UI骨架，在代码层面没有明确体现
4. **导航逻辑分散**：导航菜单的数据结构、路由路径、页面组件的映射关系分散在不同位置

本提案旨在通过创建统一的导航配置文件，将导航结构与路由表严格对齐到重构计划，并在代码层面明确标识当前开发范围。

## 变更内容 (What Changes)

### 1. 创建统一导航配置模块 (`src/config/navigation.ts`)
- 定义标准化的导航数据结构，作为导航菜单和路由配置的唯一数据源
- 包含菜单项的完整元数据：ID、标签、图标、路径、子菜单、开发状态等
- 支持通过配置标识页面的开发状态（如：`needsBackend: false` 表示仅UI骨架）

### 2. 调整导航结构以匹配重构计划
按照 `frontend_refactoring_plan.md` 的定义，调整导航层级结构：

**调整项：**
- 将"告警中心"从"监测与报警"子菜单提升为独立的一级菜单项
- 将"健康评估"从"评估与报表"菜单组中独立为一级菜单项，移除"评估与报表"菜单组
- 添加缺失的"配电系统"监测页面路由
- 统一"数据管理"菜单组为"数据中心"（Data Hub）
- 调整"系统设置"菜单组为"系统管理"（System Administration）
- 明确"个人账户"菜单组的结构（包含个人信息、修改密码等）
- 移除当前不在重构计划范围内的"告警阈值"和"设备健康状态"页面路由

**保留项：**
- "视情维护"菜单组下的所有页面（MaintenancePlanPage, MaintenanceHistoryPage）保持其现有UI实现，标记为"仅UI骨架，暂不实现后端功能"
- "辅助决策"菜单组下的所有页面（DecisionSuggestionsPage, EnergyOptimizationPage, ComplexOperationsPage）保持其现有UI实现，标记为"仅UI骨架，暂不实现后端功能"

### 3. 重构 Sidebar 组件
- 从统一的 `navigation.ts` 配置文件消费导航数据
- 移除组件内部硬编码的 `navigationItems` 数组
- 保持现有的交互逻辑和视觉样式不变

### 4. 重构 MainLayout 路由配置
- 使用 `navigation.ts` 配置动态生成路由表
- 确保每个导航项都有对应的路由配置
- 路由路径与导航配置保持严格一致
- 添加缺失的"配电系统"页面路由（可能需要创建占位页面组件）

### 5. 文档同步
- 在导航配置文件中添加清晰的注释，说明当前开发阶段各页面的实现范围
- 确保代码层面的导航结构与 `frontend_refactoring_plan.md` 保持完全一致

## 影响范围 (Impact)

### 影响的规格 (Affected Specs)
- 新增：`navigation`（导航与路由配置规格）

### 影响的代码 (Affected Code)
- **新增文件**：
  - `src/config/navigation.ts` - 统一导航配置模块
  - `src/components/PowerDistributionPage.tsx` - 配电系统监测页面（如不存在则创建占位）

- **修改文件**：
  - `src/components/Sidebar.tsx` - 从配置文件消费导航数据
  - `src/components/MainLayout.tsx` - 使用配置生成路由
  - `src/App.tsx` - 可能需要调整路由逻辑（如有必要）

- **可能移除的文件**：
  - `src/components/AlertThresholdPage.tsx` - 如果不在当前重构范围内
  - `src/components/EquipmentHealthPage.tsx` - 如果不在当前重构范围内
  - `src/components/ReportsPage.tsx` - "健康报表"页面，根据重构计划决定是否移除

### 破坏性变更
- **导航路径调整**：部分菜单项的层级和URL路径会发生变化，可能影响现有的浏览器书签或直接链接
- **页面移除**：不在重构计划范围内的页面将被移除，其路由将返回404或重定向

### 兼容性考虑
- 由于这是内部重构，主要影响开发团队，用户侧影响较小
- 需要更新开发文档和培训材料以反映新的导航结构

## 成功标准 (Success Criteria)

1. ✅ 导航配置文件 `src/config/navigation.ts` 成功创建，包含完整的导航元数据
2. ✅ Sidebar 导航菜单与 `frontend_refactoring_plan.md` 中定义的结构完全一致
3. ✅ 所有导航项都有对应的路由配置，路径匹配准确
4. ✅ "视情维护"和"辅助决策"菜单下的页面保持现有UI骨架，在配置中明确标识为"暂不实现后端功能"
5. ✅ 点击任意导航菜单项都能正确跳转到对应页面，无404错误
6. ✅ 运行 `npm run build` 成功，无TypeScript类型错误
7. ✅ 代码中不再存在硬编码的导航数据（除了配置文件本身）
8. ✅ 配置文件具有清晰的注释和类型定义，易于理解和维护
