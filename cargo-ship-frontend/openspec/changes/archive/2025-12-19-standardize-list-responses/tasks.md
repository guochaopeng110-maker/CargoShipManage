## 1. 基础模型与后端同步
- [x] 1.1 修改 `src/services/api/models/PaginatedResponseDto.ts`，将 `items: Array<any[]>` 修正为 `items: Array<any>`。
- [x] 1.2 确认后端已将 `/api/auth/users` 接口改为分页返回结构。
- [x] 1.3 确认后端已将 `/api/imports` 接口的 `data` 字段更名为 `items` 并补全 `page`, `pageSize`, `totalPages`。

## 2. 前端 Store 重构
- [x] 2.1 **Auth Store**: 更新 `fetchUsers` 方法，解析 `PaginatedResponseDto`。
- [x] 2.2 **Import Store**: 更新 `fetchImportHistory` 方法，移除对 `data` 字段的依赖，统一使用 `items`。
- [x] 2.3 **Monitoring Store**: 清理 `fetchMonitoringData` 中的兼容性字段提取代码。
- [x] 2.4 **Equipment Store**: 清理 `fetchEquipmentList` 中的兼容性判断逻辑。
- [x] 2.5 **Reports Store**: 验证并确保 `fetchReports` 严格遵循标准分页模型。

## 3. 分页逻辑验证
- [x] 3.1 验证“用户管理”页面的分页器工作正常。
- [x] 3.2 验证“数据查询”页面的结果列表分页（尤其是跨页跳转）。
- [x] 3.3 验证“数据导入”页面的历史记录分页。
- [x] 3.4 验证“健康评估”页面的报告列表分页。
