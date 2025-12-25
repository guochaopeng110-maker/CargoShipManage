# Proposal: Modular State Management Architecture

## Why
目前前端项目的状态管理存在不一致性（部分使用Zustand，部分使用React `useState` Hooks模拟Store），导致维护困难、逻辑分散以及性能优化受限。 Specifically:
1.  **架构不统一**: `auth-store` 使用 Zustand，而 `monitoring-store` 使用 `useState`，导致开发模式分裂。
2.  **业务逻辑耦合**: 数据获取、状态更新和UI逻辑通常混合在组件或Hooks中，难以测试和复用。
3.  **性能隐患**: 缺乏精细的状态选择（Selectors），可能导致不必要的组件重渲染。
4.  **服务连接分散**: API调用和WebSocket订阅散落在各个组件或Hooks中，难以统一管理和追踪。

## What Changes
建立一套清晰、可预测且易于维护的前端状态管理架构。此架构将充当连接数据服务层（API客户端、WebSocket服务）与UI组件层的核心桥梁。

### 核心概念
1.  **按业务领域划分 (Domain-Driven Structure)**
    在 `src/stores` 目录下，严格按照业务领域创建独立 Store。
2.  **State 与 Actions 分离**
    每个 Store 明确分离 `state` (数据) 和 `actions` (逻辑)。Actions 是唯一可以调用 API 和订阅 WebSocket 的地方。
3.  **连接数据服务**
    Store 负责调用自动化 API 客户端和订阅 `realtime-service`。
4.  **Selectors 优化性能**
    使用 Selector 函数精确订阅状态片段。

## Impact
- **统一开发范式**: 所有 Store 遵循相同结构，降低认知负荷。
- **提高代码质量**: 业务逻辑集中管理，易于测试和维护。
- **提升性能**: 减少不必要的渲染。
- **增强可观测性**: 状态流向清晰，便于调试。
