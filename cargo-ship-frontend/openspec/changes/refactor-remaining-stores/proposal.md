# 变更提案: 重构剩余 Store 模块以统一架构

## 为什么 (Why)

当前前端项目在第一阶段已成功将核心业务模块（auth, monitoring, alarms, equipment）重构为统一的 Zustand 架构，但仍有三个辅助模块未完成重构：

1. **import-store.ts (1393行)** - 使用 Class-based 单例模式，**不是** Zustand
2. **threshold-store.ts (425行)** - 使用 Class-based 模式，需要手动绑定20个方法
3. **reports-store.ts (428行)** - 已使用 Zustand，但 **未分离** State/Actions 接口定义

### 存在的问题

**架构不一致性**：
- `import-store` 和 `threshold-store` 不使用 Zustand `create()` API
- 状态变更可能不触发 React 组件重渲染（class-based 响应式缺失）
- `threshold-store` 需要在 constructor 中手动绑定20个方法的 `this` 上下文（代码冗余）
- `reports-store` 虽使用 Zustand 但未遵循 State/Actions 分离规范

**维护困难**：
- 新开发者需要理解三种不同的状态管理模式
- 缺少统一的代码组织规范
- 难以复用架构模式和最佳实践

**性能隐患**：
- Class-based store 缺少 Selector 优化机制
- 可能导致不必要的组件重渲染

## 变更内容 (What Changes)

将三个剩余模块重构为与核心模块一致的 Zustand 架构：

### 1. **import-store.ts 重构** (优先级: P1)
- ✅ 从 Class-based 单例迁移到 Zustand `create()` API
- ✅ 定义独立的 `ImportState` 和 `ImportActions` 接口
- ✅ 简化过度设计的功能（保留核心导入流程）
- ✅ 集成 `import-service` API 调用
- ✅ 实现 WebSocket 实时更新（通过 `realtime-service`）
- ✅ 提供 Selector 导出以支持性能优化

### 2. **threshold-store.ts 重构** (优先级: P2)
- ✅ 从 Class-based 迁移到 Zustand `create()` API
- ✅ 移除冗余的 constructor `bind()` 代码
- ✅ 定义独立的 `ThresholdState` 和 `ThresholdActions` 接口
- ✅ 集成 `threshold-service` API 调用
- ✅ 提供 Selector 导出

### 3. **reports-store.ts 规范化** (优先级: P3)
- ✅ 拆分单一接口为 `ReportsState` 和 `ReportsActions`
- ✅ 添加接口注释和文档
- ✅ 提供 `useReportsSelector` 便捷 Hook
- ⚠️ 保持现有功能不变（已运行良好）

### 架构统一标准

所有 Store 必须遵循以下规范：

```typescript
// 1. 定义 State 接口（纯数据）
interface XxxState {
  // 数据状态
  items: Xxx[];
  loading: boolean;
  error: string | null;
  // ... 其他状态
}

// 2. 定义 Actions 接口（业务逻辑）
interface XxxActions {
  // CRUD 操作
  fetchItems: () => Promise<void>;
  createItem: (data: CreateXxx) => Promise<void>;
  // ... 其他操作
}

// 3. Zustand Store 实现
export const useXxxStore = create<XxxState & XxxActions>((set, get) => ({
  // State 初始值
  items: [],
  loading: false,
  error: null,

  // Actions 实现
  fetchItems: async () => {
    set({ loading: true });
    try {
      const data = await xxxService.getItems();
      set({ items: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));

// 4. 导出 Selector（可选但推荐）
export const useXxxSelector = {
  items: (state: XxxState & XxxActions) => state.items,
  loading: (state: XxxState & XxxActions) => state.loading,
};
```

## 影响范围 (Impact)

### 受影响的 Spec 文件
- `specs/import-store/spec.md` - 新增
- `specs/threshold-store/spec.md` - 新增
- `specs/reports-store/spec.md` - 新增（规范化现有功能）

### 受影响的代码文件
- `src/stores/import-store.ts` - **完全重写**（从1393行简化到约500-600行）
- `src/stores/threshold-store.ts` - **完全重写**（从425行优化到约300行）
- `src/stores/reports-store.ts` - **局部调整**（接口拆分，约450行）

### 受影响的组件
- `src/components/DataImportPage.tsx` - 可能需要调整 Hook 调用方式
- `src/components/ImportStatusIndicator.tsx` - 同上
- `src/components/AlertThresholdPage.tsx` - 可能需要调整
- `src/components/ReportsPage.tsx` - 轻微调整
- `src/components/ui/report-generator.tsx` - 轻微调整

### 风险评估
- **低风险**：`reports-store` 仅接口调整，功能不变
- **中风险**：`threshold-store` 重构，功能相对简单，测试覆盖容易
- **高风险**：`import-store` 重构幅度大，功能复杂，需要充分测试

### 迁移策略
1. **渐进式重构**：每次重构一个 Store，完成测试后再进行下一个
2. **向后兼容**：保留旧的导出签名（如 `useImportStore`），确保现有组件不受影响
3. **充分测试**：每个重构完成后，手动测试所有相关功能页面

## 技术决策

### 为什么选择完全重构而非渐进式改造？

**理由**：
1. **架构债务累积**：Class-based 模式与 Zustand 核心差异大，无法渐进式迁移
2. **长期维护成本**：保留两套架构会增加认知负荷
3. **性能优化需求**：Zustand 的 Selector 机制需要从设计层面支持
4. **团队一致性**：统一架构降低新成员学习成本

### 为什么 import-store 需要简化？

**现状**：1393行代码包含：
- 文件上传（进度跟踪、取消、重试）
- 数据预览与验证
- 批量导入作业管理
- 模板管理（CRUD）
- WebSocket 实时更新
- 性能监控与缓存
- 统计报表
- 124个属性和方法

**问题**：
- 过度设计，很多功能未在 UI 中使用
- 单一文件责任过重
- 维护成本高

**简化原则**：
1. **保留核心流程**：上传 → 预览 → 导入 → 状态跟踪
2. **移除过度抽象**：批量作业、模板系统（如未使用）
3. **简化缓存逻辑**：依赖 API 层面的缓存策略
4. **目标行数**：500-600行（减少60%代码）

## 验收标准

### 功能验收
- [ ] `DataImportPage` 文件上传功能正常
- [ ] 导入记录列表展示正常
- [ ] `AlertThresholdPage` 阈值配置 CRUD 正常
- [ ] `ReportsPage` 报表生成和下载正常

### 代码质量验收
- [ ] 所有 Store 使用 Zustand `create()` API
- [ ] 所有 Store 定义了独立的 State/Actions 接口
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告
- [ ] 代码符合项目风格指南

### 性能验收
- [ ] 组件仅在相关状态变化时重渲染
- [ ] 提供 Selector 导出以支持精确订阅

### 文档验收
- [ ] 每个 Store 文件包含功能说明注释
- [ ] 接口定义包含 JSDoc 注释
- [ ] `ARCHITECTURE.md` 更新架构说明（如存在）
