# Proposal: Implement Unified Error Logging System

## Change ID
`implement-unified-error-handling`

## Summary
实现统一的错误日志记录系统，包括全局API错误拦截器和标准化的错误日志记录，提升开发调试效率。

## Background

### Current State
在完成Mock数据删除（finalize-refactor-cleanup任务2.8）后，系统采用了"激进删除"策略：
- API失败时返回空数据（空数组/空对象）
- 将错误信息设置到store的`error`状态中
- 使用`console.error`和`console.warn`记录错误日志
- 错误日志记录方式不统一，缺乏标准化

### Problems
1. **错误日志分散**：使用`console.error`、`console.warn`和`logger.ts`混杂，缺乏统一标准
2. **无全局错误拦截**：API错误需要在每个store的catch块中单独处理
3. **调试困难**：缺少结构化的错误信息和上下文，难以追踪问题根源
4. **日志信息不足**：缺少请求参数、用户信息、堆栈跟踪等关键调试信息

### Motivation
根据finalize-refactor-cleanup任务2.8的建议：
> 下一步建议：
> - 考虑添加全局错误拦截器统一处理API错误
> - 增强错误日志记录，便于开发调试

## Proposal

### Goals
1. **全局错误拦截器**：在API client层统一拦截和处理错误
2. **标准化错误日志**：扩展logger.ts，支持结构化错误记录和上下文信息
3. **简化开发**：减少重复的错误处理代码，提供统一的错误处理API
4. **增强调试能力**：提供详细的错误上下文（请求参数、用户信息、堆栈跟踪）

### Scope

#### In Scope
1. **Error Interceptor**:
   - API client全局错误拦截器
   - 错误分类和标准化（网络错误、业务错误、认证错误等）
   - 自动日志记录（可配置详细程度）
   - 错误上下文收集（请求参数、用户信息、堆栈跟踪）

2. **Logging System**:
   - 扩展`logger.ts`支持错误日志记录
   - 添加错误上下文（用户信息、请求参数、堆栈跟踪）
   - 开发/生产环境区分（dev:详细日志，prod:精简日志）
   - 可选的远程日志上报（预留接口）

3. **Integration**:
   - 更新store错误处理，使用统一的错误拦截器
   - 提供Helper函数简化错误处理代码

#### Out of Scope
- 错误提示UI组件（ErrorAlert, EmptyState等）
- React错误边界（ErrorBoundary）
- 页面级错误UI展示
- 远程日志上报服务的实现（仅预留接口）
- 复杂的错误恢复策略（如自动重试、降级）
- 错误监控平台集成（Sentry等，后续可扩展）

### Technical Approach

#### 1. Global Error Interceptor
- 在Service API client创建fetch wrapper
- 拦截所有API错误响应
- 统一错误格式化和分类
- 自动调用logger记录错误
- 可配置日志详细程度

#### 2. Enhanced Logging
- 扩展logger.ts的`error()`方法
- 支持Error对象、字符串、结构化数据
- 添加错误堆栈跟踪、时间戳、用户上下文
- Console美化输出（使用颜色、表格展示）

#### 3. Store Integration
- 保持现有error状态字段不变
- 添加可选的`errorContext`字段（存储详细错误信息）
- 统一错误设置helper函数

### Dependencies
- Existing: logger.ts（需扩展）
- New: 无新增外部依赖

### Risks & Mitigations
1. **风险**：全局拦截器可能影响特定API的错误处理逻辑
   - **缓解**：提供配置选项（如silent模式）跳过全局处理

2. **风险**：详细错误日志可能泄露敏感信息
   - **缓解**：生产环境精简日志，敏感字段脱敏

3. **风险**：日志输出过多可能影响性能
   - **缓解**：提供日志级别控制，生产环境可禁用详细日志

## Success Criteria
1. ✅ API错误自动通过拦截器记录到console（dev环境）
2. ✅ 错误日志包含详细上下文（请求参数、用户信息、堆栈跟踪）
3. ✅ 生产环境日志精简且敏感信息脱敏
4. ✅ Store中API错误处理代码减少50%+（使用统一拦截器）
5. ✅ 构建和类型检查通过（`npm run build`）

## Implementation Plan
详见[tasks.md](./tasks.md)和[design.md](./design.md)。

## Alternatives Considered
1. **使用第三方错误监控服务（Sentry）**
   - 优点：功能强大、开箱即用、自动错误聚合
   - 缺点：增加外部依赖、需要额外配置、可能有隐私问题、增加成本
   - 决定：暂不引入，预留接口以便未来集成

2. **保持现状（不统一错误日志）**
   - 优点：不需要改动代码
   - 缺点：调试困难、日志不标准、缺少上下文信息
   - 决定：采用统一方案提升开发效率

## Open Questions
1. ❓ 生产环境是否需要远程日志上报？
   - 建议：预留接口，后续根据需求决定

2. ❓ 是否需要错误分级（info/warning/error）？
   - 建议：支持分级，但初版主要使用error级别

3. ❓ 日志保留策略（是否需要本地存储）？
   - 建议：第一版仅console输出，不本地存储

## Related Changes
- 依赖：`finalize-refactor-cleanup`（任务2.8已完成Mock数据删除）
- 受益：所有使用store的页面组件

## References
- [Web API Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful)
- [JavaScript Error Handling Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
