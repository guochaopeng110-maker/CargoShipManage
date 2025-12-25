# Change: 重构项目的最终清理、优化与交付准备

## Why

在完成了前端项目的主要重构工作后（包括 API 客户端生成、模块化状态管理、实时数据流、监控墙模式应用等），现在需要进行一次全面的代码库清理和优化，确保项目代码库整洁、高效、稳定，并为最终交付做好准备。

当前代码库存在以下问题：
- 手动维护的 TypeScript 类型定义与自动生成的 `api-client` 类型存在冗余
- 遗留了许多已被废弃的旧文件（组件、服务、类型定义）
- Mock 数据文件未更新，不再反映新的 API 和数据结构
- 实时订阅管理可能存在内存泄漏风险
- 缺少代码分割和懒加载优化
- 需要全面的功能验证和测试

## What Changes

本次变更将进行以下工作：

### 1. 代码规范化与类型统一
- **删除冗余类型文件**：移除 `src/types/` 下与后端 API 相关的所有手动类型定义文件：
  - `alarms.ts` - 告警相关类型（已由 api-client 定义）
  - `auth.ts` - 认证相关类型（已由 api-client 定义）
  - `equipment.ts` - 设备相关类型（已由 api-client 定义）
  - `health.ts` - 健康评估相关类型（已由 api-client 定义）
  - `import.ts` - 数据导入相关类型（已由 api-client 定义）
  - `monitoring.ts` - 监控相关类型（已由 api-client 定义）
  - `thresholds.ts` - 阈值相关类型（已由 api-client 定义）
  - `ui.ts` - UI 组件类型（完全未被使用）
- **删除未使用的 Store**：
  - `src/stores/ui-store.ts` - 全局 UI 状态管理（完全未被使用）
- **删除调试文件**：
  - `src/utils/debug/verify-selectors.ts` - Selector 验证文件（验证的内容已失效）
- 更新所有引用这些类型的代码，改为从 `@/services/api` 导入
- 仅保留 `src/types/` 下与领域逻辑相关的类型（如 `global.ts`、`new/` 目录下的类型）
- 统一项目代码风格（格式化、命名约定）

### 2. 全面代码大扫除

#### 2.1 删除冗余的 Service 层和 Store（方案A：激进重构）
**目标**：删除约 5,965 行冗余 Service 代码和 378 行冗余 Store 代码，直接使用自动生成的 API 客户端

**需要删除的 Service 文件**（9个，纯 API 包装器）：
- `src/services/alarms-service.ts` (1,236 行) - 使用 `Service.alarmControllerXxx()` 替代
- `src/services/equipment-service.ts` (964 行) - 使用 `Service.equipmentControllerXxx()` 替代
- `src/services/threshold-service.ts` (348 行) - 使用 `Service.alarmControllerXxxThreshold()` 替代
- `src/services/import-service.ts` (701 行) - 使用 `Service.importControllerXxx()` 替代
- `src/services/api-client.ts` (627 行) - 不再需要包装器
- `src/services/historical-data-service.ts` (505 行) - 如确认未使用则删除
- `src/services/health-service.ts` (374 行) - 使用 `Service.reportControllerXxx()` 替代
- `src/services/reports-service.ts` (478 行) - 使用 `Service.reportControllerXxx()` 替代
- `src/services/auth-service.ts` (932 行) - 功能与 auth-store.ts 重复，Token 管理等逻辑直接在 store 中实现

**需要删除的 Store 文件**（合并到 auth-store）：
- `src/stores/user-store.ts` (378 行) - 用户管理功能合并到 auth-store.ts，直接使用 `AuthService` API

**需要保留并扩展的文件**：
- `src/services/realtime-service.ts` - WebSocket 实时服务（无 HTTP API 对应）
- `src/stores/auth-store.ts` - 扩展为完整的认证+用户管理 Store，内置 Token 管理、JWT 解析、权限检查等

**架构简化**：
```
之前: 组件 → Store → Service层 → api-client包装器 → 自动生成API → 后端
之后: 组件 → Store → 自动生成API → 后端
```

**代码变更示例**：
```typescript
// Store 中，从：
import { enhancedAlarmsService } from '../services/alarms-service';
const alarms = await enhancedAlarmsService.getAlarms();

// 改为：
import { Service } from '../services/api';
const response = await Service.alarmControllerFindAllAlarms(page, limit, ...);
```

#### 2.2 删除废弃文件
- 被 `UnderDevelopmentPage` 替换的旧页面组件
- 旧的类型定义文件（`src/types/` 下的冗余文件）

#### 2.3 删除未使用的 Utils 工具文件（约 4,638 行）
**目标**：删除完全未被使用的工具文件，减少代码库体积

**需要删除的 Utils 文件**：
- `src/utils/cache-manager.ts` (298 行) - 内存缓存管理器（完全未被使用）
- `src/utils/config-manager.ts` (801 行) - 配置管理系统（完全未被使用）
- `src/utils/data-transformers.ts` (681 行) - 数据转换器（完全未被使用，且依赖即将删除的类型文件）
- `src/utils/data-validation.ts` (616 行) - 数据验证工具（完全未被使用）
- `src/utils/notifications.ts` (640 行) - 通知系统管理（完全未被使用）
- `src/utils/helpers.ts` (802 行) - 通用工具函数库（完全未被使用）

**需要重构的 Utils 文件**：
- `src/utils/permissions.ts` - 更新类型导入，从 `@/types/auth` 改为 `@/services/api`

**需要保留的 Utils 文件**：
- `src/utils/error-handler.ts` - 被 reports-store 和 reports-service 使用
- `src/utils/logger.ts` - 被多处使用（App.tsx, main.tsx, auth-service.ts 等）
- `src/utils/crud-helpers.ts` - 被 CRUDDataTable 组件使用

#### 2.4 Hooks 目录清理与重构（约 417 行）
**目标**：删除未使用的 hooks 文件，简化权限检查抽象层级

**需要删除的 Hooks 文件**：
- `src/hooks/use-toast.ts` (100 行) - Toast 提示系统 Hook（完全未使用）
- `src/hooks/useResourcePermissions.ts` (317 行) - 资源权限封装 Hook（89%代码未使用，仅1个方法被使用）

**重构策略**：
- 移除中间抽象层，在组件中直接使用 `usePermissions` 基础权限 Hook
- 从 `useDevicePermissions()` 改为 `hasPermission('device', 'create')`
- 代码更简洁，维护成本更低，灵活性更高

**需要更新的组件**：
- `src/components/DeviceManagementPage.tsx` - 直接使用 usePermissions 替代 useDevicePermissions

**需要保留的 Hooks 文件**：
- `src/hooks/usePermissions.ts` (282 行) - 基础权限验证 Hook（被 6 个组件使用）

#### 2.5 清理冗余代码
- 清理组件、stores 中不再使用的函数、变量、导入和注释
- **更新或移除旧 Mock 数据**：`src/mocks/` 下的文件应反映新的 API 和数据结构

### 3. 性能优化与资源管理
- **订阅管理审查**：检查所有页面组件，确保 `realtime-service` 的 subscribe/unsubscribe 机制正确管理
- **Zustand Selector 优化**：优化状态订阅，避免不必要的重渲染
- **路由级代码分割**：为大型页面实施懒加载（Lazy Loading）
- **打包配置优化**：优化 Vite 配置，确保代码和静态资源有效压缩

### 4. 最终集成测试与验证
- 全面验证所有重构后的页面功能
- 验证实时数据流、API 交互、权限管理、告警处理
- 验证数据导入导出和响应式布局
- 准备用户验收演示

## Impact

**受影响的代码区域**：
- `src/types/` - 移除冗余的手动类型定义（8个文件）
- `src/utils/` - 删除未使用的工具文件（6个文件，约4,638行），重构permissions.ts
- `src/hooks/` - 删除未使用的 hooks 文件（2个文件，417行），简化权限检查抽象
- `src/mocks/` - 更新或移除旧 Mock 数据
- `src/services/` - 清理未使用的服务代码（9个文件，约5,965行）
- `src/stores/` - 优化状态订阅，删除 ui-store.ts 和 user-store.ts（合并到 auth-store）
- `src/components/` - 清理废弃组件，优化订阅管理，DeviceManagementPage 改用 usePermissions
- `vite.config.ts` - 优化打包配置
- 路由配置 - 实施代码分割

**预期成果**：
- 精简、高效、无冗余的现代化前端代码库
- **删除约 ~17,000+ 行冗余代码**（类型文件 + Service层 + Store层 + Utils工具 + Hooks文件）
- 消除功能重复，简化架构（Token 管理、权限检查等直接在 Store 中实现）
- 良好的性能和用户体验
- 清晰的项目结构，易于维护和未来迭代
- 准备好进行最终部署和交付

**风险**：
- 删除文件时可能误删仍在使用的代码（需仔细审查）
- 代码分割可能影响路由加载体验（需测试）
- 重构可能引入新的 bug（需充分测试）
