# 健康评估逻辑重构方案

## 1. 需求背景

根据最新需求，项目的健康评估功能需要进行调整。原有的基于多种内部数据源（如告警记录、时序数据）的复杂计分算法，将统一替换为调用由第三方提供的外部 API 接口。

新的评估逻辑完全依赖该 API 的返回结果。详细的 API 接口规范、请求参数及返回数据结构，请参考文档：`@docs/data/健康评估接口.md`。

## 2. 核心思路

本次重构的核心思路是 **“替换核心，保留外壳”**：

- **保留外壳**：保持现有的 `ReportController` (API 入口) 和 `ReportService` (流程协调) 大体不变，最大程度减少对外部接口和上层业务逻辑的影响。
- **替换核心**：将 `HealthAssessmentService` 中复杂的内部计算逻辑，整体替换为对第三方 API 的网络调用和数据适配。

此方案可以实现业务需求的平滑切换，同时保持代码结构的清晰和职责分离。

## 3. API 接口与交互流程设计

为了让前端能够按需、即时地获取指定设备在特定时间段的健康评分，我们设计了以下交互流程。

### 3.1. 接口定义

前端将通过调用一个 `POST` 接口来触发一次新的健康评估。

-   **Endpoint**: `POST /api/reports/health`
-   **职责**: 接收生成健康报告的请求，同步处理并返回新生成的报告数据。

### 3.2. 请求体 (Request Body)

前端调用此接口时，必须在请求体中提供符合以下格式的 JSON 数据：

```json
{
  "deviceId": "SYS-BILGE-001",
  "startTime": "2025-12-01 00:00:00",
  "endTime": "2025-12-12 00:00:00"
}
```

后端将创建一个 DTO 文件（`generate-health-report.dto.ts`）来定义此结构，并利用 `ValidationPipe` 对参数进行自动校验。

### 3.3. 响应体 (Response Body)

该接口为**同步**调用。后端在接收到请求后，会完成调用第三方 API、计算、存储的全过程，然后将**新生成的、完整的 `HealthReport` 实体**作为 JSON 对象返回给前端。

这样，前端在请求成功后能立即获得本次评估的最终分数和详细信息。

## 4. 后端实施步骤

我们将通过以下五个步骤完成本次重构：

### 步骤 4.1：控制器与 DTO 调整

1.  **创建 DTO 文件**：在 `src/modules/report/dto/` 目录下创建 `generate-health-report.dto.ts`，定义请求体结构。
2.  **调整控制器方法**：修改 `ReportController` 中的 `generateReport` 方法，使其通过 `@Body()` 装饰器接收 `GenerateHealthReportDto`，并从中获取评估所需的参数。

### 步骤 4.2：添加配置与 HTTP 模块

1.  **更新环境变量**：在 `.env.example` 和 `.env` 文件中添加 `THIRD_PARTY_HP_API_URL`。
2.  **注册配置**：在 `src/config/app.config.ts` 中读取并注册该环境变量。
3.  **引入 `HttpModule`**：在 `src/modules/report/report.module.ts` 中导入 `@nestjs/axios` 提供的 `HttpModule`。

### 步骤 4.3：创建第三方 API 服务

1.  **创建文件**：`src/modules/report/third-party-health.service.ts`。
2.  **实现功能**：创建 `ThirdPartyHealthService` 类，注入 `HttpService`，并提供 `fetchHealthData(deviceId, startTime, endTime)` 方法来封装对外的 GET 请求。

### 步骤 4.4：改造核心评估服务 (`HealthAssessmentService`)

1.  **移除旧逻辑**：删除服务中所有本地计算分数的代码及其对数据库的直接查询。
2.  **调用新服务**：注入并调用 `ThirdPartyHealthService`。
3.  **数据适配**：将第三方 API 返回的 JSON 数据转换为项目内部的 `HealthReport` 实体格式。

### 步骤 4.5：清理与更新模块

1.  **清理无效代码**：安全地移除 `ReportService` 中不再需要的 `generateAggregateReport` 方法。
2.  **更新模块依赖**：在 `src/modules/report/report.module.ts` 的 `providers` 数组中，注册 `ThirdPartyHealthService`。
