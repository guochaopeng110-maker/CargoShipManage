# Change: 统一全模块列表请求返回体格式

## Why
目前项目中各模块（Auth, Alarm, Equipment, Import, Export, Monitoring）的列表查询接口返回格式不统一。存在裸数组、自定义分页对象以及标准分页对象混用的情况。这导致前端 Store 的数据处理逻辑碎片化，无法提取通用的数据处理逻辑，增加了维护成本和开发复杂度。

## What Changes
- **统一结构**: 所有列表请求的返回体将统一使用标准的分页包装器。
- **标准化字段**: 统一使用 `items` 作为数据载体字段，弃用 `data` 等非标准命名。
- **补全元数据**: 确保每个列表响应都包含 `total`, `page`, `pageSize`, `totalPages` 等必要的分页元数据。
- **修正类型**: 将 `PaginatedResponseDto.items` 的定义修正为一维数组。
- **BREAKING**: 修改 Auth 模块用户列表等接口，从返回裸数组改为返回标准分页对象。

## Impact
- Affected specs: `pagination` (新能力)
- Affected code: 
  - `src/services/api/models/PaginatedResponseDto.ts`
  - `src/stores/auth-store.ts`
  - `src/stores/import-store.ts`
  - `src/stores/monitoring-store.ts`
  - `src/stores/equipment-store.ts`
  - `src/stores/reports-store.ts`
