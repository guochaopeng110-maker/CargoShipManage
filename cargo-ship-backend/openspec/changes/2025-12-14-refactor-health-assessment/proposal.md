# 提案：重构健康评估逻辑以集成第三方 API

-   **变更类型**: 重构
-   **主要影响模块**: `report`, `health-assessment`
-   **关联需求文档**: `@docs/require/refactor-health-assessment-proposal.md`
-   **关联接口定义**: `@docs/data/健康评估接口.md`

---

## 1. 目标

重构现有的健康评估功能，将其核心计算逻辑从内部算法切换为调用一个由第三方提供的外部 API。此举旨在统一评估标准，并简化系统内部的业务复杂性。

## 2. 问题背景

当前的健康评估服务（`HealthAssessmentService`）采用了一套复杂的计分算法，该算法依赖于项目内部的多种数据源，如告警记录和时序数据。根据新的业务需求，这套内部实现需要被废弃，转而完全依赖外部权威 API 的评估结果。

本次重构需要在不中断现有服务流程（如 API 入口和报告生成）的前提下，平滑地替换掉底层的核心评估逻辑。

## 3. 提案

我们提议采用 **“替换核心，保留外壳”** 的策略进行重构。

1.  **保留外壳**:
    -   保持 `ReportController` 作为 API 网关，其职责和大部分接口签名不变。
    -   `ReportService` 继续作为业务流程的协调者。

2.  **替换核心**:
    -   废弃 `HealthAssessmentService` 中所有基于内部数据的计算方法。
    -   创建一个新的服务 `ThirdPartyHealthService`，专门负责与第三方健康评估 API 进行通信。
    -   `HealthAssessmentService` 将调用 `ThirdPartyHealthService` 来获取评估数据，并将其适配为系统内部的 `HealthReport` 实体格式。

3.  **API 变更**:
    -   调整 `POST /api/reports/health` 接口，使其成为一个同步端点。
    -   该接口将接收包含 `deviceId`、`startTime` 和 `endTime` 的请求体，并立即触发一次完整的评估流程（请求第三方 API -> 处理数据 -> 存储 -> 返回新报告）。
    -   为请求体验证创建一个 DTO：`generate-health-report.dto.ts`。

## 4. 高阶计划

为实现此提案，计划按以下步骤执行：

1.  **环境与配置**:
    -   在 `.env` 文件中添加第三方 API 的 URL (`THIRD_PARTY_HP_API_URL`)。
    -   更新 `app.config.ts` 以加载此配置。
    -   在 `ReportModule` 中导入 NestJS 的 `HttpModule`。

2.  **DTO 与控制器调整**:
    -   创建 `src/modules/report/dto/generate-health-report.dto.ts` 文件。
    -   修改 `ReportController` 的 `generateReport` 方法，使其接受新的 DTO 作为 `@Body`。

3.  **创建新服务**:
    -   创建 `src/modules/report/third-party-health.service.ts` 文件，实现 `ThirdPartyHealthService` 类，封装对外部 API 的 `GET` 请求。

4.  **重构核心服务**:
    -   重构 `HealthAssessmentService`，移除旧的计算逻辑，转而注入并调用 `ThirdPartyHealthService`。
    -   实现从第三方 API 响应到 `HealthReport` 实体的数据映射。

5.  **模块整合与清理**:
    -   在 `ReportModule` 的 `providers` 中注册 `ThirdPartyHealthService`。
    -   移除 `ReportService` 和其他模块中不再被使用的旧方法和依赖。
