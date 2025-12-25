## ADDED Requirements

### Requirement: 统一列表分页包装格式
系统 SHALL 确保所有业务模块（包括认证、设备、告警、监控、导入、报告）的列表查询接口均采用统一的分页包装结构。该结构必须包含数据项列表以及完整的分页元数据。

#### Scenario: 成功获取标准分页响应
- **WHEN** 前端调用任何模块的列表查询 API
- **THEN** 后端 SHALL 返回如下格式的对象：
  - `items`: 业务数据数组
  - `total`: 符合条件的记录总数
  - `page`: 当前页码
  - `pageSize`: 每页记录数
  - `totalPages`: 总页数

### Requirement: 强制使用标准列表字段名
系统 SHALL 在所有分页响应中统一使用 `items` 作为数据数组的字段键名。严禁使用 `data`, `list` 等非标准名称。

#### Scenario: 导入模块字段标准化
- **WHEN** 客户端请求导入记录历史列表
- **THEN** 响应体中的数据载体 SHALL 位于 `items` 字段下

### Requirement: 分页响应类型纠正
系统 SHALL 确保生成的 API 类型定义中 `PaginatedResponseDto.items` 被定义为一维数组。

#### Scenario: 类型检查通过
- **WHEN** 在 TypeScript 代码中访问 `response.items[0]`
- **THEN** 类型检查 SHALL 能够正确识别该元素为单一业务对象而非数组
