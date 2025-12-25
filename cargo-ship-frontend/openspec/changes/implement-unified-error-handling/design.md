# Design: Unified Error Logging System

## Architecture Overview

### System Layers
```
┌─────────────────────────────────────────────────────────────────┐
│                      Store Layer (Zustand)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Error State Management                                   │   │
│  │  - error: string | null                                  │   │
│  │  - errorContext?: ErrorContext (optional)                │   │
│  │  - setError(), clearError()                              │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                      API Client Layer                            │
│  ┌──────────────────────────┴─────────────────────────────┐    │
│  │ Global Error Interceptor                                │    │
│  │  - Wraps Service API calls                              │    │
│  │  - Catches and standardizes errors                      │    │
│  │  - Auto-logs to console/remote                          │    │
│  │  - Enriches error context                               │    │
│  └──────────────────────────┬─────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                       Logging Layer                              │
│  ┌──────────────────────────┴─────────────────────────────┐    │
│  │ Enhanced Logger (logger.ts)                             │    │
│  │  - error(error, context?)                               │    │
│  │  - Structured logging with stack traces                 │    │
│  │  - Environment-aware (dev vs prod)                      │    │
│  │  - Remote logging hook (optional)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Error Flow Design

### Error Handling Flow
```
API Call (Store Action)
        │
        ├─→ Success ──→ Update store state
        │
        └─→ Error
               │
               ├─→ [1] Global Interceptor catches error
               │      ├─→ Log to console (logger.error) with full context
               │      ├─→ Standardize error format
               │      └─→ Enrich with metadata (timestamp, user, endpoint)
               │
               ├─→ [2] Store catches error
               │      ├─→ Set error state: set({ error: errorMessage })
               │      └─→ Return empty data ([], null, {})
               │
               └─→ [3] Component handles error state
                      └─→ Component decides how to display (optional)
```

### Error Types & Handling Strategy

| Error Type | Detection | Store Error Message | Developer Log |
|-----------|----------|---------------------|--------------|
| **Network Error** | `fetch` throws, no response | "网络连接失败，请检查网络" | Full error + stack + context |
| **401 Unauthorized** | HTTP 401 | "登录已过期，请重新登录" | User ID + endpoint + token info |
| **403 Forbidden** | HTTP 403 | "无权限执行此操作" | User ID + resource + permissions |
| **404 Not Found** | HTTP 404 | "请求的资源不存在" | Endpoint + params + query |
| **500 Server Error** | HTTP 5xx | "服务器错误，请稍后重试" | Full response + headers |
| **Business Error** | HTTP 200 + error field | Backend error message | Business error code + context |
| **Render Error** | Component throws | "组件加载失败" | Stack trace + component tree |

---

## Technical Decisions

### 1. Error Interceptor Architecture

**Options Considered**:

#### Option A: Axios Interceptors
- ✅ Mature, widely used
- ❌ Adds dependency (currently using fetch)
- ❌ Requires refactoring all Service calls

#### Option B: Fetch Wrapper (Selected)
- ✅ No new dependencies
- ✅ Works with existing Service API
- ✅ Simple to implement
- ⚠️ Need to wrap all Service methods

**Decision**: Use fetch wrapper in`src/utils/api-error-interceptor.ts`

**Implementation**:
```typescript
// src/utils/api-error-interceptor.ts
export async function apiCall<T>(
  request: Promise<T>,
  options?: {
    silent?: boolean;  // Skip auto-logging
    logLevel?: 'error' | 'warn' | 'info';  // Log level
  }
): Promise<T> {
  try {
    return await request;
  } catch (error) {
    const standardError = standardizeError(error);

    if (!options?.silent) {
      logger.error(standardError.message, standardError.context);
    }

    throw standardError;
  }
}
```

---

### 2. Logging Strategy

**Dev Environment**:
- 详细console输出（包含堆栈、请求参数、用户信息）
- 使用颜色区分错误级别
- 显示时间戳和请求ID（如果有）

**Production Environment**:
- 精简console输出（避免泄露敏感信息）
- 可选：发送到远程日志服务（预留hook）
- 敏感字段脱敏（如token、password）

**Enhanced Logger Interface**:
```typescript
// Extend src/utils/logger.ts
interface ErrorContext {
  userId?: string;
  endpoint?: string;
  params?: Record<string, any>;
  userAgent?: string;
  timestamp?: number;
}

class Logger {
  error(error: Error | string, context?: ErrorContext): void;
  // ... other methods
}
```

---

### 3. Store Integration Strategy

**Backward Compatible**: 保持现有error状态字段不变

**Optional Enhancement**: 添加errorContext字段存储详细错误信息

```typescript
// Example: alarms-store.ts
interface AlarmsState {
  // 现有字段不变
  error: string | null;

  // 新增可选字段（不破坏现有代码）
  errorContext?: {
    code?: string;
    statusCode?: number;
    details?: any;
  };
}
```

---

## Integration Points

### 1. Store Actions
- 在所有API调用处使用`apiCall` wrapper
- 保持现有`try/catch`结构
- 使用统一的错误消息生成函数
- 错误自动记录到logger

### 2. Logger Enhancement
- 扩展logger.ts支持错误对象
- 添加上下文信息（用户ID、端点、参数）
- 区分开发/生产环境输出

---

## Performance Considerations

### 1. Error Logging
- 开发环境：全量日志，详细堆栈跟踪
- 生产环境：精简日志，可配置采样率（默认100%）

### 2. Error Context Size
- 限制errorContext大小（避免存储过大对象）
- 敏感信息脱敏（如token截取前8位）

### 3. Console Output
- 避免循环引用导致的序列化问题
- 限制单条日志的最大长度

---

## Security Considerations

1. **信息泄露防护**:
   - 生产环境隐藏详细错误堆栈
   - 脱敏敏感字段（password, token, email）
   - 不在console输出完整的用户敏感数据

2. **日志安全**:
   - 限制日志输出频率（防止日志淹没攻击）
   - 不记录完整的认证token和密码

---

## Testing Strategy

### Unit Tests
- apiCall wrapper错误处理测试
- logger.error()格式化测试
- standardizeError()错误分类测试

### Integration Tests
- Store API错误处理流程测试
- 错误日志记录完整性测试
- 错误上下文信息准确性测试

### Manual Tests
- 模拟网络故障（Chrome DevTools offline）
- 模拟API 500错误（Mock server）
- 验证开发/生产环境日志输出差异
- 验证敏感信息脱敏效果

---

## Future Enhancements

1. **错误分析**:
   - 统计错误频率和类型
   - 生成错误报告仪表板

2. **智能重试**:
   - 网络错误自动重试（指数退避）
   - 认证错误自动刷新token

3. **远程监控**:
   - 集成Sentry或自建监控服务
   - 实时错误告警和通知

4. **日志聚合**:
   - 错误日志批量上报
   - 错误指纹识别和去重

---

## Open Questions & Decisions Needed

1. ❓ **错误重试次数**：默认不自动重试，还是重试1次？
   - **建议**：默认不自动重试，避免增加系统负载

2. ❓ **生产环境是否需要远程日志**？
   - **建议**：第一版不实现，预留接口，后续根据需求决定

3. ❓ **是否需要错误分级**（如info/warning/error）？
   - **建议**：支持分级，但初版主要使用error级别

4. ❓ **日志采样策略**：是否需要实现采样以减少日志量？
   - **建议**：开发环境100%，生产环境可配置（默认100%）

---

## References
- [Web API Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful)
- [JavaScript Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [Console API](https://developer.mozilla.org/en-US/docs/Web/API/Console)
