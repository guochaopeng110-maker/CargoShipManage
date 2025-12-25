# Error Logging Capability

## Overview
统一的错误日志记录能力，包括全局错误拦截和标准化日志记录，为开发调试提供详细的错误上下文信息。

## ADDED Requirements

### Requirement: Global API error interception for logging
**ID**: Req-ErrorInterceptor-001
**Priority**: High

The system SHALL provide a global API error interceptor that automatically logs all API call failures. The interceptor MUST capture detailed error context including request parameters, user information, and stack traces.

系统应提供全局API错误拦截器，统一记录所有API调用的错误，包含详细的上下文信息便于调试。

#### Scenario: Auto-log API errors with full context
**Given** 任意store调用后端API
**When** API调用失败（网络错误、500错误等）
**Then** 错误拦截器应自动捕获错误
**And** 记录错误日志到console（开发环境）或远程日志服务（生产环境）
**And** 日志应包含错误消息、请求端点、请求参数、时间戳、用户ID、堆栈跟踪等上下文信息

#### Scenario: Standardize different error types for logging
**Given** 不同类型的API错误（网络错误、401、403、404、500等）
**When** 错误拦截器捕获错误
**Then** 应将错误标准化为统一格式（StandardError对象）
**And** 根据错误类型生成对应的日志消息：网络错误记录"Network Error"，401记录"Unauthorized"，403记录"Forbidden"，404记录"Not Found"，500记录"Server Error"
**And** 所有错误类型都包含完整的上下文信息

---

### Requirement: Structured error logging with context
**ID**: Req-ErrorLogging-001
**Priority**: High

The system SHALL provide enhanced error logging with structured data and rich context. Logs MUST include different levels of detail based on environment (development vs production) and MUST sanitize sensitive information in production.

系统应提供增强的错误日志记录功能，支持结构化日志和丰富的上下文信息。

#### Scenario: Detailed logs in development environment
**Given** 应用运行在开发环境
**When** 发生API错误
**Then** console应输出详细的错误日志，包括错误消息、堆栈跟踪、请求端点和参数、用户ID、时间戳、错误分类
**And** 使用颜色和格式化输出，便于开发调试
**And** 不隐藏任何技术细节

#### Scenario: Simplified logs in production environment
**Given** 应用运行在生产环境
**When** 发生错误
**Then** console应输出精简的错误日志，仅包含错误消息（脱敏后）、错误分类、时间戳
**And** 敏感信息（如token、password）应被脱敏或移除
**And** 堆栈跟踪应被隐藏或简化
**And** 可选：发送错误日志到远程日志服务（预留hook）

---

### Requirement: Unified store error handling pattern for logging
**ID**: Req-ErrorHandling-Integration-001
**Priority**: Medium

All Zustand stores SHALL follow a unified error handling pattern using the apiCall wrapper. The pattern MUST ensure consistent error logging across all stores and reduce code duplication.

所有Zustand stores的API错误处理应保持一致，使用统一的拦截器记录错误日志。

#### Scenario: Stores use apiCall wrapper for automatic logging
**Given** 任意Zustand store（alarms-store, equipment-store等）
**When** store调用后端API
**Then** 应使用apiCall() wrapper包装API调用
**And** 错误自动通过拦截器记录到console
**And** catch块中应统一设置error状态
**And** API成功时应清除error状态

#### Scenario: Silent mode for specific API calls
**Given** 某些API调用不希望记录日志（如轮询、心跳检测等）
**When** store调用API时指定silent选项
**Then** apiCall wrapper应跳过日志记录
**And** 错误仍然设置到store的error状态
**And** 不输出任何console日志

---

## MODIFIED Requirements
_None (新增能力，无修改现有requirements)_

## REMOVED Requirements
_None (不删除现有能力)_

## RENAMED Requirements
_None (不重命名现有requirements)_

---

## Implementation Notes
- apiCall() wrapper在src/utils/api-error-interceptor.ts中实现
- logger.error()增强在src/utils/logger.ts中扩展
- 所有新增代码必须包含中文注释
- 生产环境日志必须脱敏敏感信息

## Dependencies
- logger.ts工具（已存在，需扩展）

## Related Capabilities
- User Authentication (错误拦截器需处理401认证错误)
- Real-time Monitoring (监控页面的API错误需记录日志)
- Data Import (导入页面的API错误需记录日志)
