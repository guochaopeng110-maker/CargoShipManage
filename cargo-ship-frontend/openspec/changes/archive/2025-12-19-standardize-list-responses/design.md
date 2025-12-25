## Context
系统中已经存在 `PaginatedResponseDto.ts` 模型，旨在提供标准的分页结构。然而，目前各模块的实施程度参差不齐，前端 Store 被迫编写了大量的兼容性代码（如 `response.data || response.items`）来应对不同接口的差异。

## Goals / Non-Goals
- **Goals**:
  - 强制全模块接口实现标准分页返回。
  - 简化前端 Store 数据提取逻辑。
  - 修复前端 API Client 中的类型误定义。
- **Non-Goals**:
  - 修改具体业务数据的字段定义。
  - 改变 UI 层的展示逻辑。

## Decisions
- **Decision: 类型定义一致性**: 
  修正 `PaginatedResponseDto.items` 的类型。目前的 `Array<any[]>` 是错误的，应修正为 `Array<any>` 或具体的泛型数组。
- **Decision: 移除前端兼容层**: 
  在后端接口统一后，前端 Store 应移除所有的 `any` 转型和字段兼容判断逻辑，实现强类型的直接消费。
- **Decision: 分页元数据必填化**: 
  列表请求必须返回完整的五项元数据：`items`, `total`, `page`, `pageSize`, `totalPages`。

## Risks / Trade-offs
- **Risk: 后端配合进度**: 如果后端未能同时更新接口，前端的单一消费模式将导致现有功能崩溃。
  - **Mitigation**: 建议分模块逐步推进，或者在前端保留两周的过渡期存根。

## Open Questions
- 导出模块的“监测历史”是否也需要补全对应的历史列表记录？（当前报告列表已完成）。
