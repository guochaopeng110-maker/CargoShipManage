# 前端重构所需资料清单与格式说明

## 引言

为确保前端重构工作能够精准、高效地进行，我们需要您提供一系列关于后端服务和核心业务的详细资料。本文档旨在说明所需资料的内容以及建议的提供格式。

清晰、结构化的数据是连接前端展示与后端逻辑的桥梁，也是我们利用 `openspec` 生成精确规格说明的基础。

---

## 1. 后端API文档

这是所有前端开发工作的基石。

### 1.1. 最佳格式

强烈推荐提供 **OpenAPI (Swagger) 规范文件** (通常是 `swagger.json` 或 `openapi.yaml`)。这是行业标准，可以被工具直接解析，效率最高。

### 1.2. 备选格式：Markdown表格

如果您暂时无法提供OpenAPI规范，请按照以下Markdown表格的格式，提供核心API的说明。

#### RESTful API

| 功能描述 | 请求方法 | URL路径 | 请求体 (Request Body) | 响应示例 (Response Example) |
| :--- | :--- | :--- | :--- | :--- |
| 获取指定时间范围的历史数据 | `GET` | `/api/v1/monitoring/history` | (GET请求无Body) | ```json [ { "timestamp": "2023-10-01T10:00:00Z", "BMS_TotalVoltage": 550.5, "BMS_TotalCurrent": 120.1 }, ... ] ``` |
| 获取所有设备列表 | `GET` | `/api/v1/equipment` | (GET请求无Body) | ```json [ { "id": "dev-001", "name": "1#电池簇", "system": "电池储能", "status": "online" }, ... ] ``` |
| 生成新的健康报告 | `POST` | `/api/v1/reports/health` | ```json { "startTime": "2023-10-01", "endTime": "2023-10-31" } ``` | ```json { "reportId": "report-xyz", "status": "generating" } ``` |

#### WebSocket API

| 事件名称 (Event Name) | 数据结构 (Data Structure) | 说明 |
| :--- | :--- | :--- |
| `monitoring-update` | ```json { "timestamp": "2023-10-01T10:01:00Z", "BMS_TotalVoltage": 551.2 } ``` | 用于实时推送最新的监测点数据。 |
| `new-alarm` | ```json { "alarmId": "alarm-123", "level": "P1", "message": "总电压过高", "timestamp": "..." } ``` | 用于实时推送新产生的告警。 |

---

## 2. 设备与监测点主数据表

这是构建所有“监控页面”的UI和逻辑的核心依据。

### 格式说明：Markdown表格

请提供一份完整的清单，列出所有需要被监控的设备及其监测点。

| 系统名称 | 设备名称 | 监测点ID (API标识) | 监测点名称 (UI显示) | 单位 | 数据类型 | **是否关键指标** |
| :--- | :--- | :--- | :--- | :--- | :--- |:--- |
| `电池储能` | `1#电池簇` | `BMS_TotalVoltage` | `总电压` | `V` | `number` | `是` |
| `电池储能` | `1#电池簇` | `BMS_TotalCurrent` | `总电流` | `A` | `number` | `是` |
| `电池储能` | `1#电池簇` | `BMS_SOC` | `荷电状态` | `%` | `number` | `是` |
| `电池储能` | `1#电池簇` | `BMS_CellTemp_Max` | `最高单体温度` | `°C` | `number` | `否` |
| `推进系统` | `左推进器` | `Prop_Speed` | `推进器转速` | `rpm` | `number` | `是` |
| `推进系统` | `左推进器` | `Prop_Power` | `推进器功率` | `kW` | `number` | `否` |

**列说明:**
*   **系统名称**: 用于侧边栏导航分组，如“推进系统”、“电池储能”。
*   **设备名称**: 具体的物理设备名。
*   **监测点ID**: 后端API和WebSocket消息中用来唯一标识一个参数的`key`。
*   **监测点名称**: 在前端UI图表和表格中展示给用户看的友好名称。
*   **单位**: 数据的物理单位。
*   **数据类型**: `number`, `boolean`, `string`等。
*   **是否关键指标**: **非常重要**。请将值为“是”的指标标记出来，这些指标将在对应监控页面的顶部，使用`GaugeChart`或`DonutChart`进行特殊可视化。

---

## 3. 告警信息定义

用于“告警中心”页面的显示和筛选逻辑。

### 格式说明：列表或表格

#### 告警等级

*   **P0 (紧急)**: 需要立即处理的严重告警。
*   **P1 (重要)**: 需要关注和处理的重要告警。
*   **P2 (次要)**: 一般性提示或信息。

#### 告警状态

*   **Active (活动)**: 新产生或尚未确认的告警。
*   **Acknowledged (已确认)**: 用户已经知晓并确认的告警。

#### 告警代码清单 (可选，但推荐)

| 告警ID (Alarm ID) | 告警内容 (Message) | 默认等级 (Default Level) |
| :--- | :--- | :--- |
| `VOLTAGE_HIGH` | `总电压过高` | `P1` |
| `TEMP_HIGH` | `单体温度超过阈值` | `P0` |
| `...` | `...` | `...` |

---

## 4. 健康报告业务逻辑

用于“健康评估”页面的功能实现。

### 格式说明：描述性列表

请用简单的文字描述：
1.  **报告包含哪些内容？** (例如：设备的平均/最大/最小负载率、指定时间段内的告警次数统计、与上个周期的能效对比等)。
2.  **健康评分的计算逻辑是怎样的？** (例如：如果没有P0级告警，积90分；每发生一次P1告警，扣5分...)
3.  **报告的输出形式是怎样的？** (例如：一个0-100的健康分，加上几条“优化建议”的文本)。


## 文件命名与内容分配

  请按照以下结构创建和命名您的Markdown文件：

   1. 后端API文档
       * 文件名: backend_api_spec.md
       * 内容: 包含 data_requirements_template.md 中 “1. 后端API文档” 的所有内容。
           * 特别说明: 如果您有OpenAPI/Swagger的JSON或YAML文件，请将其直接放在
             cargo-ship-frontend/docs/data/api_swagger/ 目录下（您可能需要创建这个子目录），并在      
             backend_api_spec.md 文件中提及该文件的路径。

   2. 监测点与告警定义
       * 文件名: monitoring_and_alarm_definitions.md
       * 内容: 包含 data_requirements_template.md 中 “2. 设备与监测点主数据表” 和 “3. 告警信息定义”
         的所有内容。

   3. 健康报告业务逻辑
       * 文件名: health_report_logic.md
       * 内容: 包含 data_requirements_template.md 中 “4. 健康报告业务逻辑” 的所有内容。
