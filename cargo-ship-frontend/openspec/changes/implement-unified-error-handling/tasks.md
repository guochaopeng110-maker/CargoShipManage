# Implementation Tasks: Unified Error Logging System

## Overview
本任务清单实现统一的错误日志记录系统，包括全局错误拦截器和标准化日志记录。

**总任务数**: 28项
**预计工作量**: 小型（约1个工作日）
**优先级**: 高（改善开发调试效率的关键任务）
**依赖**: `finalize-refactor-cleanup`任务2.8已完成

---

## Phase 1: Foundation & Infrastructure (基础设施) - 18 tasks

### 1.1 Error Type Definitions (错误类型定义)
- [ ] 1.1.1 创建 `src/types/error.ts` 文件
- [ ] 1.1.2 定义 `StandardError` 接口（包含code, message, context等）
- [ ] 1.1.3 定义 `ErrorContext` 接口（用户ID、端点、参数等）
- [ ] 1.1.4 验证类型定义编译通过（`npx tsc --noEmit`）

### 1.2 Enhanced Logger (增强日志系统)
- [ ] 1.2.1 扩展 `src/utils/logger.ts`，添加 `error()` 方法支持Error对象
- [ ] 1.2.2 添加错误上下文记录（堆栈跟踪、时间戳、用户信息）
- [ ] 1.2.3 实现环境区分逻辑（dev详细日志 vs prod精简日志）
- [ ] 1.2.4 添加敏感信息脱敏函数（token、password等）
- [ ] 1.2.5 验证logger增强功能正常工作

### 1.3 Error Standardization (错误标准化)
- [ ] 1.3.1 创建 `src/utils/error-standardizer.ts` 文件
- [ ] 1.3.2 实现 `standardizeError()` 函数（统一错误格式）
- [ ] 1.3.3 实现错误分类逻辑（网络错误、业务错误、认证错误等）
- [ ] 1.3.4 实现错误消息生成函数（根据错误类型生成提示）

### 1.4 API Error Interceptor (API错误拦截器)
- [ ] 1.4.1 创建 `src/utils/api-error-interceptor.ts` 文件
- [ ] 1.4.2 实现 `apiCall()` wrapper函数（包装Service API调用）
- [ ] 1.4.3 添加自动日志记录逻辑（调用logger.error）
- [ ] 1.4.4 添加配置选项（silent模式、日志级别）
- [ ] 1.4.5 验证拦截器功能正常工作

---

## Phase 2: Integration (系统集成) - 7 tasks

### 2.1 Store Integration (Store集成)
- [ ] 2.1.1 更新 `alarms-store.ts`：在API调用处使用apiCall wrapper
- [ ] 2.1.2 更新 `equipment-store.ts`：在API调用处使用apiCall wrapper
- [ ] 2.1.3 更新 `monitoring-store.ts`：在API调用处使用apiCall wrapper
- [ ] 2.1.4 更新 `import-store.ts`：在API调用处使用apiCall wrapper
- [ ] 2.1.5 更新 `threshold-store.ts`：在API调用处使用apiCall wrapper
- [ ] 2.1.6 更新 `reports-store.ts`：在API调用处使用apiCall wrapper
- [ ] 2.1.7 验证所有store的API错误自动记录到console

---

## Phase 3: Testing & Validation (测试与验证) - 3 tasks

### 3.1 Manual Tests (手动测试)
- [ ] 3.1.1 模拟网络故障（Chrome DevTools offline模式）
  - 验证网络错误自动记录到console
  - 验证错误日志包含完整的上下文信息
- [ ] 3.1.2 模拟API 500错误（后端Mock或手动修改响应）
  - 验证服务器错误自动记录到console
  - 验证错误日志记录完整（堆栈跟踪、请求参数、用户信息）
- [ ] 3.1.3 验证生产构建（`npm run build`）
  - 确认无TypeScript编译错误
  - 确认错误日志在生产模式下精简且敏感信息脱敏

---

## Validation Checklist (验收清单)

在标记所有任务为完成前，确保以下条件满足：

### Functional Requirements
- [ ] ✅ API错误自动记录到console（dev环境详细日志）
- [ ] ✅ 错误日志包含完整上下文（堆栈跟踪、请求参数、用户ID、时间戳）
- [ ] ✅ 生产环境日志精简且敏感信息脱敏
- [ ] ✅ 所有store使用统一的apiCall wrapper

### Code Quality
- [ ] ✅ 所有新增代码包含中文注释
- [ ] ✅ 组件接口定义清晰（使用TypeScript interface）
- [ ] ✅ 无重复代码（复用apiCall wrapper）
- [ ] ✅ 遵循项目命名约定（PascalCase for types, camelCase for functions）

### Build & Tests
- [ ] ✅ TypeScript编译通过（`npx tsc --noEmit`）
- [ ] ✅ 生产构建成功（`npm run build`）
- [ ] ✅ 手动测试通过（网络错误、API错误、日志验证）

---

## Dependencies & Sequencing

### Sequential Tasks (必须按顺序执行)
1. Phase 1 → Phase 2 → Phase 3
2. 在Phase 1完成前，不能开始Phase 2
3. 在所有工具函数创建完成前（Phase 1），不能集成到store（Phase 2）

### Parallel Tasks (可并行执行)
- Phase 1.1, 1.2, 1.3, 1.4可并行开发
- Phase 2.1各store更新可并行进行

### Critical Path (关键路径)
```
1.1.1 → 1.3.1 → 1.4.1 → 2.1.1 → 3.1.1 → 3.1.3
(类型定义 → 错误标准化 → 拦截器 → store集成 → 手动测试 → 构建验证)
```

---

## Progress Tracking

**Phase 1**: 0/18 tasks completed (0%)
**Phase 2**: 0/7 tasks completed (0%)
**Phase 3**: 0/3 tasks completed (0%)

**Total**: 0/28 tasks completed (0%)

---

## Notes & Reminders

1. **代码注释**: 所有新增代码必须包含中文注释，解释功能和用法
2. **向后兼容**: 保持现有store的error字段不变，errorContext为可选字段
3. **性能考虑**: 日志输出不应影响应用性能，生产环境可配置采样率
4. **安全考虑**: 生产环境脱敏敏感信息，避免泄露
5. **测试重要性**: 错误日志是关键的调试工具，必须充分测试各种边缘情况

---

## Related Changes
- 依赖：`finalize-refactor-cleanup` 任务2.8（Mock数据删除已完成）
- 受益：所有使用store的开发人员和维护人员
- 后续：可扩展集成Sentry或自建监控服务
