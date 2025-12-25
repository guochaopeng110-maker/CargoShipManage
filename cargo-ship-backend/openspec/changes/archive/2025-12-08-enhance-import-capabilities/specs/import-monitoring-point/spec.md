# import-monitoring-point Specification

## Purpose

扩展文件导入功能以支持监测点（Monitoring Point）字段的解析和验证。监测点字段用于精确标识业务监测点（如"总电压"、"单体最高温度"），使导入的历史数据能够精确匹配基于监测点的阈值规则，从而生成完整准确的历史告警记录。

**设计原则**：
- **可选字段**：`monitoringPoint` 为可选字段，向后兼容不包含监测点列的旧文件格式
- **强烈建议填写**：为确保告警评估的准确性，强烈建议用户在导入文件中填写监测点字段
- **业务价值**：填写监测点可使系统精确匹配阈值规则 `(equipmentId, metricType, monitoringPoint)`，避免告警缺失

**影响说明**：
- **填写监测点**：可触发所有精确匹配的阈值规则，告警记录完整
- **不填写监测点**：仅能触发 `monitoringPoint IS NULL` 的通用阈值规则，可能导致部分告警缺失

## ADDED Requirements

### Requirement: 文件解析支持监测点字段

系统 MUST 扩展 `FileParserService` 以解析导入文件中的监测点列，并将其映射到 `TimeSeriesData` 实体的 `monitoringPoint` 字段。

#### Scenario: 解析包含监测点的 Excel 文件

- **GIVEN** 用户上传包含监测点列的 Excel 文件
- **AND** 表头包含"监测点"或"Monitoring Point"列
- **AND** 数据行为：设备ID=battery-001, 时间戳=2025-01-01 10:00:00, 监测点="总电压", 指标类型="电压", 数值=650.5
- **WHEN** `FileParserService.parseExcel` 解析文件时
- **THEN** 系统 MUST 识别监测点列并映射到 `monitoringPoint` 字段
- **AND** 解析结果 MUST 包含 `monitoringPoint: "总电压"`
- **AND** 数据 MUST 通过验证并加入有效数据列表

#### Scenario: 解析包含监测点的 CSV 文件

- **GIVEN** 用户上传包含监测点列的 CSV 文件
- **AND** CSV 表头为：设备ID,时间戳,监测点,指标类型,数值,单位
- **WHEN** `FileParserService.parseCSV` 解析文件时
- **THEN** 系统 MUST 正确解析监测点列
- **AND** 每条数据的 `monitoringPoint` 字段 MUST 包含对应的值

#### Scenario: 监测点列映射多种表头名称

- **GIVEN** Excel/CSV 文件的表头可能使用不同名称
- **WHEN** 表头为以下任一形式时：
  - "监测点"
  - "Monitoring Point"
  - "监控点"
  - "测点"
- **THEN** 系统 MUST 正确映射到 `monitoringPoint` 字段
- **AND** 字段名不区分大小写

#### Scenario: 监测点为可选字段（向后兼容）

- **GIVEN** 用户上传的文件不包含监测点列
- **WHEN** `FileParserService` 解析文件时
- **THEN** 系统 MUST 将 `monitoringPoint` 设置为 null
- **AND** 数据 MUST 仍然通过验证（向后兼容旧格式）
- **AND** 解析流程 MUST 成功完成

#### Scenario: 监测点值为空或空白

- **GIVEN** 文件包含监测点列
- **AND** 某些行的监测点单元格为空或仅包含空白字符
- **WHEN** 解析该行数据时
- **THEN** 系统 MUST 将 `monitoringPoint` 设置为 null
- **AND** 数据 MUST 仍然通过必填字段验证
- **AND** 不应记录为解析错误

### Requirement: 监测点数据验证

系统 MUST 提供监测点值的基本验证，确保数据质量和一致性。

#### Scenario: 验证监测点名称长度

- **GIVEN** 数据包含监测点字段
- **WHEN** 监测点名称长度超过 100 个字符时
- **THEN** 系统 MUST 记录验证错误
- **AND** 错误信息 MUST 包含：行号、监测点值、错误原因"监测点名称过长"
- **AND** 该行数据 MUST 加入错误列表

#### Scenario: 监测点名称去除首尾空白

- **GIVEN** 数据行的监测点值为 "  总电压  "（包含前后空格）
- **WHEN** 解析和转换数据类型时
- **THEN** 系统 MUST 自动 trim 去除首尾空白
- **AND** 存储的 `monitoringPoint` MUST 为 "总电压"

#### Scenario: 记录包含监测点的数据统计

- **GIVEN** 导入文件包含 100 条数据
- **AND** 其中 80 条包含监测点值，20 条监测点为空
- **WHEN** 文件解析完成时
- **THEN** 系统 MUST 记录统计日志：
  - 总数据条数：100
  - 包含监测点的数据条数：80
  - 监测点为空的数据条数：20
- **AND** 日志级别 MUST 为 `Logger.debug`

### Requirement: 更新数据模型接口

系统 MUST 更新 `ParsedTimeSeriesData` 接口以包含 `monitoringPoint` 字段。

#### Scenario: ParsedTimeSeriesData 接口包含 monitoringPoint

- **GIVEN** `FileParserService` 需要返回解析后的数据
- **WHEN** 定义 `ParsedTimeSeriesData` 接口时
- **THEN** 接口 MUST 包含以下字段：
  ```typescript
  export interface ParsedTimeSeriesData {
    equipmentId: string;
    timestamp: Date;
    metricType: MetricType;
    value: number;
    unit?: string;
    quality?: DataQuality;
    source?: DataSource;
    monitoringPoint?: string;  // 新增：监测点字段（可选）
  }
  ```

#### Scenario: 导入服务正确传递 monitoringPoint

- **GIVEN** `ImportService.batchImportTimeSeriesData` 接收解析后的数据
- **WHEN** 创建 `TimeSeriesData` 实体时
- **THEN** 系统 MUST 将 `ParsedTimeSeriesData.monitoringPoint` 赋值给实体的 `monitoringPoint` 字段
- **AND** 如果值为 null，实体字段 MUST 保持为 null

### Requirement: 列映射配置更新

系统 MUST 更新 `FileParserService` 的列映射配置以支持监测点列的中英文表头。

#### Scenario: COLUMN_MAPPING 包含监测点映射

- **GIVEN** `FileParserService.COLUMN_MAPPING` 定义了表头到字段的映射
- **WHEN** 初始化映射配置时
- **THEN** 配置 MUST 包含以下映射：
  ```typescript
  监测点: 'monitoringPoint',
  监控点: 'monitoringPoint',
  测点: 'monitoringPoint',
  'Monitoring Point': 'monitoringPoint',
  'MonitoringPoint': 'monitoringPoint',
  ```

#### Scenario: 列映射不区分大小写

- **GIVEN** Excel 文件表头为 "MONITORING POINT"（全大写）
- **WHEN** 系统进行列映射时
- **THEN** 系统 MUST 将其映射到 `monitoringPoint` 字段
- **AND** 映射逻辑 MUST 忽略大小写差异

### Requirement: 标准导入文件模板

系统 MUST 提供包含监测点列的标准 Excel/CSV 导入模板，便于用户正确填写数据。

#### Scenario: Excel 模板包含监测点列

- **GIVEN** 系统提供标准的 Excel 导入模板
- **WHEN** 用户下载模板时
- **THEN** 模板 MUST 包含以下列（按顺序）：
  - 设备ID（必填）
  - 时间戳（必填）
  - 监测点（可选）
  - 指标类型（必填）
  - 数值（必填）
  - 单位（可选）
  - 数据质量（可选）

#### Scenario: 模板包含示例数据

- **GIVEN** Excel 模板的第二行为示例数据
- **WHEN** 用户打开模板时
- **THEN** 示例数据 MUST 展示正确的填写格式：
  ```
  | 设备ID | 时间戳 | 监测点 | 指标类型 | 数值 | 单位 |
  | battery-001 | 2025-01-01 10:00:00 | 总电压 | 电压 | 650.5 | V |
  ```
- **AND** 示例行 MUST 使用浅色背景或注释标注"示例数据，导入前请删除"

#### Scenario: CSV 模板包含表头行

- **GIVEN** 系统提供标准的 CSV 导入模板
- **WHEN** 用户下载 CSV 模板时
- **THEN** 第一行 MUST 为表头：
  ```
  设备ID,时间戳,监测点,指标类型,数值,单位,数据质量
  ```
- **AND** 第二行 MUST 包含示例数据

### Requirement: 文档更新

系统 MUST 更新相关文档以说明监测点字段的用途、重要性和填写规范。

#### Scenario: API 文档说明监测点字段

- **GIVEN** 导入接口的 Swagger 文档
- **WHEN** 用户查看文件上传接口的说明时
- **THEN** 文档 MUST 包含监测点字段的说明：
  - 字段名称：监测点
  - 是否必填：**否（可选，但强烈建议填写）**
  - 数据类型：字符串
  - 最大长度：100 字符
  - 用途：用于精确匹配阈值规则，确保告警评估的准确性
  - 重要性说明：**不填写可能导致部分告警规则无法触发，历史告警记录不完整**
  - 示例值："总电压"、"单体最高温度"、"主机转速"

#### Scenario: 用户指南说明文件格式

- **GIVEN** 系统提供用户使用指南或 README
- **WHEN** 用户阅读数据导入相关章节时
- **THEN** 文档 MUST 包含：
  - 支持的文件格式（Excel、CSV）
  - 必填字段和可选字段列表
  - **监测点字段的重要性专题说明**：
    - 什么是监测点（业务定义的精确监测位置）
    - 为什么强烈建议填写（影响告警准确性）
    - 如何获取正确的监测点名称（参考阈值配置或设备文档）
    - 不填写的后果（可能导致告警缺失）
  - 标准模板下载链接
  - 常见错误和解决方法
  - **监测点填写示例和对比**：
    - ✅ 正确示例：带监测点的数据能触发所有匹配规则
    - ❌ 错误示例：不带监测点的数据仅触发通用规则
