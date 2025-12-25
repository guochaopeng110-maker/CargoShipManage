# 任务列表：重构健康评估功能

---

## 阶段 1: 环境设置与配置

-   [ ] **任务 1.1**: 在 `.env.example` 和 `.env` 文件中添加 `THIRD_PARTY_HP_API_URL` 环境变量。
-   [ ] **任务 1.2**: 修改 `src/config/app.config.ts`，添加对 `THIRD_PARTY_HP_API_URL` 的读取和注册。
-   [ ] **任务 1.3**: 在 `src/modules/report/report.module.ts` 的 `imports` 数组中添加 `HttpModule`。

## 阶段 2: DTO 定义与控制器更新

-   [ ] **任务 2.1**: 创建 DTO 文件 `src/modules/report/dto/generate-health-report.dto.ts`。
-   [ ] **任务 2.2**: 在 DTO 中定义 `deviceId`, `startTime`, `endTime` 属性，并添加 `class-validator` 装饰器。
-   [ ] **任务 2.3**: 更新 `src/modules/report/report.controller.ts` 中的 `generateReport` 方法：
    -   将其 HTTP 方法改为 `POST`。
    -   路径更新为 `/health`。
    -   使用 `@Body()` 装饰器接收 `GenerateHealthReportDto`。
    -   移除旧的 `@Query()` 参数。

## 阶段 3: 创建第三方服务

-   [ ] **任务 3.1**: 创建服务文件 `src/modules/report/third-party-health.service.ts`。
-   [ ] **任务 3.2**: 在 `ThirdPartyHealthService` 中：
    -   注入 `HttpService` 和 `ConfigService`。
    -   实现 `fetchHealthData(dto)` 方法，该方法负责调用第三方 API。
    -   使用 `try...catch` 块处理潜在的 HTTP 请求错误，并抛出 `HttpException`。
-   [ ] **任务 3.3**: 在 `src/modules/report/report.module.ts` 的 `providers` 数组中注册 `ThirdPartyHealthService`。

## 阶段 4: 核心服务重构

-   [ ] **任务 4.1**: 重构 `src/modules/report/health-assessment.service.ts`：
    -   移除所有旧的、基于内部数据的分数计算逻辑和数据库查询。
    -   注入 `ThirdPartyHealthService`。
    -   更新 `assess` (或同等功能) 方法，使其调用 `ThirdPartyHealthService` 来获取数据。
    -   实现数据转换逻辑，将第三方 API 的响应映射到 `HealthReport` 实体。

## 阶段 5: 整合与清理

-   [ ] **任务 5.1**: 更新 `src/modules/report/report.service.ts` 的 `generateReport` 方法，确保它正确调用重构后的 `HealthAssessmentService`。
-   [ ] **任务 5.2**: 审查并安全地移除项目中所有不再被引用的旧评估逻辑相关代码（例如 `ReportService` 中的 `generateAggregateReport` 方法）。
-   [ ] **任务 5.3**: 编写或更新单元测试，覆盖 `ThirdPartyHealthService` 的 API 调用模拟和 `HealthAssessmentService` 的数据转换逻辑。
-   [ ] **任务 5.4**: 进行端到端测试，验证从 `POST /api/reports/health` 请求到获得正确响应的完整流程。
