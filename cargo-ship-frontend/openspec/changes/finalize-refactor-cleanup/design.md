# 技术设计文档

## Context

本次变更是货船智能机舱管理系统前端项目的重构收尾阶段。在完成了以下主要重构工作后：
- 自动生成 API 客户端（`generate-api-client`）
- 模块化状态管理（`modular-state-management`）
- 实时数据服务（`scaffold-realtime-service`、`activate-realtime-data-flow`）
- 监控墙模式应用（`apply-monitoring-wall-to-core-pages`）
- CRUD 页面标准化（`standardize-crud-pages`）

现在需要进行全面的代码库清理、优化和质量保证，以确保项目达到生产就绪状态。

**约束条件**：
- 必须保持向后兼容性，不能破坏现有功能
- 必须保持项目的设计风格（Dark mode, glassmorphism, animations）
- 必须遵循项目现有的架构模式（Monitoring Wall Pattern, 三阶段标准布局）

## Goals / Non-Goals

### Goals
1. 消除代码冗余，特别是类型定义的冗余
2. 清理所有废弃和未使用的代码文件
3. 优化应用性能（加载速度、运行时性能、内存使用）
4. 确保所有功能正常工作并通过验证测试
5. 为最终部署和交付做好准备

### Non-Goals
- 不引入新功能或新的业务逻辑
- 不改变现有的用户界面或用户体验
- 不进行大规模的架构重构
- 不添加新的外部依赖

## Decisions

### Decision 1: 类型定义清理策略

**决策**：完全删除 `src/types/` 下所有与后端 API 相关的类型文件，强制使用 `api-client` 生成的类型

**理由**：
- `api-client` 已通过 OpenAPI 规范自动生成了所有后端 API 类型，这是唯一的真实来源（Single Source of Truth）
- 手动维护的类型文件（`alarms.ts`、`auth.ts`、`equipment.ts`、`health.ts`、`import.ts`、`monitoring.ts`、`thresholds.ts`）会导致：
  - 类型定义冗余和不一致
  - 当后端 API 变更时需要手动同步两处
  - 增加维护成本和出错风险
- 完全删除这些文件可以彻底消除类型不一致问题

**实施方法**：
1. 使用 IDE 的"查找所有引用"功能，定位每个待删除类型文件的所有引用位置
2. 逐个文件更新导入路径：
   ```typescript
   // 旧的导入方式（需要删除）
   import { AlarmRecord } from '@/types/alarms'

   // 新的导入方式（使用 api-client）
   import { AlarmRecord } from '@/services/api'
   ```
3. 更新所有引用后，运行 TypeScript 编译验证
4. 确认编译通过后，删除旧的类型文件
5. 仅保留与领域逻辑相关的类型文件（如 `global.ts`、`new/crud.ts`、`new/websocket.ts`）
6. 删除未使用的 Store（`ui-store.ts`）和调试文件（`verify-selectors.ts`）

**哪些类型文件需要删除**：
- ❌ `src/types/alarms.ts` - 完全由 api-client 提供
- ❌ `src/types/auth.ts` - 完全由 api-client 提供
- ❌ `src/types/equipment.ts` - 完全由 api-client 提供
- ❌ `src/types/health.ts` - 完全由 api-client 提供
- ❌ `src/types/import.ts` - 完全由 api-client 提供
- ❌ `src/types/monitoring.ts` - 完全由 api-client 提供
- ❌ `src/types/thresholds.ts` - 完全由 api-client 提供
- ❌ `src/types/ui.ts` - 完全未被使用（大量 UI 组件类型定义从未被引用）

**哪些 Store 需要删除**：
- ❌ `src/stores/ui-store.ts` - 完全未被使用（全局 UI 状态管理，没有任何组件使用）

**哪些调试文件需要删除**：
- ❌ `src/utils/debug/verify-selectors.ts` - 验证内容已失效（只验证 ui-store 的 selectors，但该 store 已废弃）

**哪些类型文件需要保留**：
- ✅ `src/types/global.ts` - 全局通用类型
- ✅ `src/types/new/crud.ts` - CRUD 页面通用逻辑类型
- ✅ `src/types/new/websocket.ts` - WebSocket 连接相关类型

**替代方案及拒绝理由**：
- **渐进式迁移，保留部分手动类型**：虽然风险较低，但无法彻底解决冗余问题，且会导致混合使用两种类型来源，增加混乱
- **保留所有手动类型**：违背重构目标，无法解决类型冗余和不一致问题

### Decision 2: 废弃文件识别方法

**决策**：结合静态分析工具和手动审查来识别废弃文件

**实施方法**：
1. 使用 IDE 的"查找引用"功能（Find References）检查文件是否被引用
2. 使用 `ts-prune` 或类似工具识别未使用的导出
3. 手动审查每个候选文件，确认其确实已废弃
4. 对于疑似废弃但不确定的文件，先注释导出，观察是否有编译错误

**安全措施**：
- 删除前先提交到 Git，确保可以恢复
- 删除后立即运行完整的 TypeScript 编译（`npx tsc --noEmit`）
- 删除后手动测试相关功能

### Decision 3: 代码分割策略

**决策**：仅对大型页面组件实施路由级代码分割

**理由**：
- 项目使用 React Router v7，支持 `React.lazy` 和 `Suspense`
- 路由级分割是最简单、最有效的代码分割方式
- 避免过度工程化（不需要组件级细粒度分割）

**实施目标**：
- 大型页面（如 `DataImportPage`、`DataQueryPage`、`HealthAssessmentPage`）使用懒加载
- 中小型页面保持当前的静态导入方式
- 为懒加载组件提供合适的 loading 状态（可使用 Skeleton 或 Spinner）

**示例代码**：
```typescript
// 在路由配置中
const DataImportPage = lazy(() => import('./components/DataImportPage'));

// 在路由使用时
<Route
  path="/data-import"
  element={
    <Suspense fallback={<PageSkeleton />}>
      <DataImportPage />
    </Suspense>
  }
/>
```

### Decision 4: 实时订阅管理模式

**决策**：强制执行"订阅-清理"模式，确保没有内存泄漏

**标准模式**：
```typescript
useEffect(() => {
  // 订阅
  const unsubscribe = realtimeService.subscribe('monitoring', systemId, (data) => {
    // 处理数据
  });

  // 清理函数
  return () => {
    unsubscribe();
  };
}, [systemId]); // 依赖项正确声明
```

**验证方法**：
1. 使用浏览器开发者工具的 Memory Profiler 检测内存泄漏
2. 测试页面反复切换，观察内存使用是否持续增长
3. 检查 WebSocket 连接数量，确保不会无限增长

### Decision 5: Vite 打包优化配置

**决策**：优化 Vite 配置以实现最佳打包性能

**关键配置**：
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    // 启用代码压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
      },
    },
    // Chunk 分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* ... */],
          'vendor-state': ['zustand'],
          'vendor-charts': ['recharts'],
        },
      },
    },
    // 设置合理的 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000,
  },
});
```

### Decision 6: Mock 数据处理策略

**决策**：保留 Mock 数据文件，但更新其结构以匹配新的 API

**理由**：
- Mock 数据对开发和演示仍然有价值
- 完全删除可能影响开发体验
- 更新成本较低

**实施方法**：
1. 审查每个 Mock 数据文件
2. 对比 `api-client` 生成的类型，更新 Mock 数据结构
3. 确保 Mock 数据使用 `api-client` 的类型定义
4. 删除不再使用的 Mock 文件（如果确认不再需要）

### Decision 7: Service 层和 Store 层清理策略（方案A：激进重构）

**决策**：删除所有冗余的 Service 层文件和冗余的 Store 文件，直接使用自动生成的 API 客户端

**理由**：
- 当前架构存在三层冗余：Store → Service层 → api-client包装器 → 自动生成API
- Service 层（alarms-service.ts、equipment-service.ts、auth-service.ts 等）大量重复了自动生成 API 的功能
- api-client.ts 包装器也是冗余的，自动生成的 API 已包含所有必要功能
- user-store.ts 完全是 API 包装器，所有方法都直接委托给 authService
- auth-service.ts 的功能与 auth-store.ts 大量重复（权限检查完全重复）
- 删除这些冗余层可以减少约 5,965 行 Service 代码 + 378 行 Store 代码
- 简化架构为：Store → 自动生成API，更直接、更清晰

**详细分析**：

经过仔细分析，发现以下 Service 文件几乎全是简单的 API 包装，不包含实质业务逻辑：

1. **health-service.ts (374行)**：
   - 每个方法都是简单的 `apiClient.get/post()` 调用
   - 唯一的"业务逻辑" `normalizeHealthError` 只是简单的错误消息包装
   - 可以直接使用 `Service.reportControllerGetEquipmentHealth()` 等方法替代

2. **reports-service.ts (478行)**：
   - 大部分是 API 包装
   - 包含一些工具方法（`validateReportConfig`、`getReportTypeDisplayName`、`getReportStatusInfo`）
   - 这些工具方法可以移到 `src/utils/report-helpers.ts` 或直接在组件中使用
   - API 调用部分全部可以用 `Service.reportControllerXxx()` 替代

3. **auth-service.ts (932行)**：
   - 最初认为包含"重要的前端业务逻辑"，但深入分析后发现：
   - **权限检查功能完全重复**：`hasPermission`、`hasRole` 方法（lines 470-498）与 auth-store.ts 中的实现（lines 225-241）完全重复
   - **Token 管理非常简单**：只是 localStorage 存取操作（lines 733-762），可以直接在 auth-store.ts 中实现
   - **JWT 解析**：简单的 `atob` + `JSON.parse`，可以直接在 store 中实现
   - **会话管理和自动刷新**：可以直接在 auth-store.ts 中实现
   - 实际上没有复杂的业务逻辑，都可以合并到 auth-store.ts

4. **user-store.ts (378行)**：
   - 完全是纯 API 包装器
   - 所有 CRUD 方法（fetchItems, createItem, updateItem, deleteItem）都只是简单地调用 `authService.getUsers()`、`authService.createUser()` 等
   - 没有任何额外的业务逻辑
   - 用户管理功能可以直接合并到 auth-store.ts 中

**需要删除的 Service 文件及行数**（9个纯 API 包装器）：
- `alarms-service.ts` (1,236 行) - 告警管理服务
- `equipment-service.ts` (964 行) - 设备管理服务
- `threshold-service.ts` (348 行) - 阈值配置服务
- `import-service.ts` (701 行) - 数据导入服务
- `api-client.ts` (627 行) - API 包装器
- `historical-data-service.ts` (505 行) - 历史数据服务（需确认是否使用）
- `health-service.ts` (374 行) - 健康评估服务（纯 API 包装）
- `reports-service.ts` (478 行) - 报告生成服务（纯 API 包装 + 简单工具函数）
- `auth-service.ts` (932 行) - 认证服务（权限检查与 auth-store 重复，Token 管理可直接在 store 实现）
- **总计：约 5,965 行**

**需要删除的 Store 文件**（合并到 auth-store）：
- `user-store.ts` (378 行) - 用户管理 Store（纯 API 包装，功能合并到 auth-store.ts）

**需要保留并扩展的文件**：
- `auth-store.ts` - 扩展为完整的认证+用户管理 Store，包含：
  - Token 管理方法（setTokens, getAccessToken, getRefreshToken, clearTokens）
  - JWT 解析方法（parseJWT, isTokenExpiring）
  - Token 自动刷新机制（setupTokenRefresh）
  - 权限检查方法（hasPermission, hasRole, canUserManage）
  - 用户列表管理（fetchUsers, createUser, updateUser, deleteUser）
  - 直接调用 `AuthService` from `@/services/api`
- `realtime-service.ts` - WebSocket 实时服务（无 HTTP API 对应）

**实施方法**：

1. **扩展 auth-store.ts**，添加以下功能：
   ```typescript
   // Token 管理（从 auth-service.ts 迁移）
   setTokens: (accessToken: string, refreshToken: string) => {
     localStorage.setItem('access_token', accessToken);
     localStorage.setItem('refresh_token', refreshToken);
     set({ accessToken });
   },

   getAccessToken: () => localStorage.getItem('access_token'),
   getRefreshToken: () => localStorage.getItem('refresh_token'),

   // JWT 解析（从 auth-service.ts 迁移）
   parseJWT: (token: string) => {
     try {
       return JSON.parse(atob(token.split('.')[1]));
     } catch {
       return null;
     }
   },

   // 用户列表管理（从 user-store.ts 迁移）
   users: [],
   selectedUser: null,
   fetchUsers: async () => {
     const users = await AuthService.getUsers();
     set({ users });
   },
   ```

2. **更新 Stores**，将 Service 层调用改为直接调用自动生成的 API：
   ```typescript
   // 之前：
   import { enhancedAlarmsService } from '../services/alarms-service';
   const result = await enhancedAlarmsService.getAlarms(params);

   // 之后：
   import { Service } from '../services/api';
   const result = await Service.alarmControllerFindAllAlarms(
     page, limit, severity, status, equipmentId, startDate, endDate
   );
   ```

3. **更新类型导入**：
   ```typescript
   // 之前：
   import { User } from '../types/auth';

   // 之后：
   import { User } from '../services/api';
   ```

4. **更新所有使用 useUserStore 的组件**，改为使用 useAuthStore

5. 逐个删除 Service 和 Store 文件，每删除一个立即验证编译和功能

**收益**：
- 删除 ~5,965 行 Service 冗余代码
- 删除 ~378 行 Store 冗余代码
- **总计删除约 6,343 行代码**
- 简化架构，从三层减少到两层
- 消除功能重复（权限检查、Token 管理等不再在多处维护）
- 消除类型不一致风险
- API 变更时只需重新生成，无需手动同步
- 减少约 70% 的维护成本

**风险与缓解**：
- **风险**：大量文件需要修改，可能引入错误
- **缓解**：
  - 逐个 Store 修改，每次修改后立即测试
  - 使用 TypeScript 编译器捕获类型错误
  - 保持 Git 提交粒度小，便于回滚
  - 充分的功能测试覆盖
  - 特别测试认证流程和用户管理功能

**替代方案及拒绝理由**：
- **保守方案：保留 auth-service.ts 和 user-store.ts**：
  - 优点：风险较低，改动较小
  - 缺点：无法彻底解决架构冗余问题，权限检查等功能仍在多处重复维护
  - 拒绝理由：无法达到"精简高效、消除功能重复"的重构目标

### Decision 8: Utils 工具文件清理策略

**决策**：删除所有未被使用的 utils 工具文件，保留核心工具，重构依赖关系

**理由**：
- 项目中存在大量未被使用的工具文件（约 4,638 行代码）
- 这些工具文件虽然功能完善，但从未被实际使用
- 部分工具文件（如 data-transformers.ts）依赖即将删除的类型文件，存在潜在编译问题
- 删除这些文件可以显著减少代码库体积和维护负担
- 保留的工具文件（error-handler、logger、crud-helpers）都有明确的使用场景

**需要删除的文件及行数**：
- `cache-manager.ts` (298 行) - 内存缓存管理器，完全未被使用
- `config-manager.ts` (801 行) - 配置管理系统，完全未被使用
- `data-transformers.ts` (681 行) - 数据转换器，完全未被使用，且依赖即将删除的类型文件
- `data-validation.ts` (616 行) - 数据验证工具，完全未被使用
- `notifications.ts` (640 行) - 通知系统管理，完全未被使用
- `helpers.ts` (802 行) - 通用工具函数库，完全未被使用
- **总计：约 4,638 行**

**需要重构的文件**：
- `permissions.ts` (1,111 行) - 更新类型导入，从 `../types/auth` 改为 `@/services/api`
  - 被 AuthGuard.tsx 和 historical-data-service.ts 使用
  - 第 26 行导入了即将删除的 auth.ts 类型文件

**需要保留的文件**：
- `error-handler.ts` (417 行) - 统一错误处理，被 reports-store 和 reports-service 使用
- `logger.ts` (106 行) - 日志记录器，被多处使用（App.tsx, main.tsx, auth-service.ts）
- `crud-helpers.ts` (473 行) - CRUD 通用工具函数，被 CRUDDataTable 组件使用

**实施方法**：
1. 逐个删除未使用的 utils 文件
2. 每次删除后立即运行 `npm run build` 验证编译通过
3. 重构 permissions.ts 的类型导入：
   ```typescript
   // 之前：
   import { User, Role, Permission } from '../types/auth';

   // 之后：
   import { User, Role, Permission } from '@/services/api';
   ```
4. 运行 `npx tsc --noEmit` 验证类型检查通过
5. 测试 AuthGuard 组件功能正常

**收益**：
- 删除 ~4,638 行未使用代码
- 减少代码库体积约 4.5%
- 降低维护成本和认知负担
- 消除潜在的编译错误（data-transformers.ts 依赖问题）
- 使代码库更加精简和专注

**风险与缓解**：
- **风险**：可能误删将来会使用的工具函数
- **缓解**：
  - 所有删除通过 Git 版本控制，可随时恢复
  - 如将来需要这些功能，可以从历史提交中恢复
  - 保留的三个核心工具文件覆盖了主要使用场景

**替代方案及拒绝理由**：
- **保守方案：保留所有工具文件以备将来使用**：
  - 优点：无风险，功能齐全
  - 缺点：增加维护负担，代码库臃肿，部分文件存在编译隐患
  - 拒绝理由：YAGNI 原则（You Aren't Gonna Need It），未被使用的代码应当删除

### Decision 9: Hooks 目录清理与权限抽象简化

**决策**：删除未使用的 hooks 文件，移除过度抽象的权限封装层，直接使用基础权限 Hook

**理由**：
- 项目中存在 417 行未使用或过度抽象的 hooks 代码
- `use-toast.ts` (100 行) 完全未被使用
- `useResourcePermissions.ts` (317 行) 存在严重的过度抽象问题：
  - 定义了 9 个资源权限 Hook（useSensorDataPermissions, useRolePermissions, usePermissionPermissions, useAlertPermissions, useReportPermissions, useAllResourcePermissions, useImportPermissions, useImportOperationPermissions, useDevicePermissions）
  - **仅 1 个 Hook 被使用**（useDevicePermissions），使用率仅 11%
  - 89% 的代码（282行）完全未被使用
  - 增加了不必要的抽象层级，降低了代码的灵活性
- 中间抽象层实际价值有限：
  - `canCreateDevice()` 仅仅是 `hasPermission('device', 'create')` 的包装
  - 增加了一个间接层，但未提供实质性的便利
  - 需要为每个资源预定义方法，缺乏灵活性
  - 维护成本高，每增加一个资源都需要新增对应的 Hook

**需要删除的文件及行数**：
- `use-toast.ts` (100 行) - Toast 提示系统 Hook，完全未被使用
- `useResourcePermissions.ts` (317 行) - 资源权限封装 Hook，89% 代码未使用
- **总计：417 行**

**重构策略**：
- 在组件中直接使用 `usePermissions` 基础 Hook
- 从语义化封装（`canCreateDevice()`）改为直接调用（`hasPermission('device', 'create')`）
- 优势：
  - 代码更简洁直接
  - 无需预定义资源方法，支持任意资源/操作组合
  - 减少抽象层级，降低维护成本
  - 提高代码灵活性

**需要更新的组件**：
- `DeviceManagementPage.tsx` - 直接使用 usePermissions 替代 useDevicePermissions

**代码变更示例**：
```typescript
// 之前（使用 useDevicePermissions）：
import { useDevicePermissions } from '../hooks/useResourcePermissions';
const { canCreateDevice, canUpdateDevice, canDeleteDevice, canViewDevices } = useDevicePermissions();

if (!canViewDevices()) { ... }
canCreate={canCreateDevice()}

// 之后（直接使用 usePermissions）：
import { usePermissions } from '../hooks/usePermissions';
const { hasPermission } = usePermissions();

if (!hasPermission('device', 'read')) { ... }
canCreate={hasPermission('device', 'create')}
```

**需要保留的文件**：
- `usePermissions.ts` (282 行) - 基础权限验证 Hook
  - 被 6 个组件使用（AuthGuard, UserManagementPage, AlertCenterPage, UnauthorizedPage, historical-data-service, DeviceManagementPage）
  - 提供核心权限检查能力：`hasPermission(resource, action)`、`hasRole(roleName)`
  - 需要后续重构类型导入（从 `@/types/auth` 改为 `@/services/api`）

**实施方法**：
1. 删除 `src/hooks/use-toast.ts`
2. 删除 `src/hooks/useResourcePermissions.ts`
3. 更新 DeviceManagementPage.tsx：
   - 导入改为 `import { usePermissions } from '../hooks/usePermissions'`
   - 解构改为 `const { hasPermission } = usePermissions()`
   - 所有权限检查调用改为 `hasPermission('device', action)` 格式
4. 运行 `npx tsc --noEmit` 验证编译通过
5. 测试 DeviceManagementPage 的权限检查功能

**收益**：
- 删除 417 行冗余代码（60% 的 hooks 目录代码）
- 消除过度抽象，简化架构（2层 → 1层）
- 提高代码灵活性（支持任意资源/操作组合）
- 降低维护成本（无需为每个资源预定义方法）
- 减少文件数量（3个 → 1个）

**风险与缓解**：
- **风险**：直接调用可读性略低于语义化方法
- **缓解**：
  - `hasPermission('device', 'create')` 语义已足够清晰
  - 可通过代码注释补充说明
  - 减少的抽象层级带来的收益大于可读性的微小损失

**替代方案及拒绝理由**：
- **方案1：仅删除 use-toast.ts，保留 useResourcePermissions.ts**：
  - 优点：保持语义化的权限检查方法
  - 缺点：仍有 89% 的代码未使用，过度抽象问题未解决
  - 拒绝理由：无法达到"消除冗余、简化架构"的重构目标

- **方案2：删除 useResourcePermissions.ts，创建独立的 useDevicePermissions.ts**：
  - 优点：保持语义化方法，删除未使用代码
  - 缺点：仍保留中间抽象层（额外27行代码），维护成本仍存在
  - 拒绝理由：在只有1个使用场景时，中间抽象层价值有限

## Risks / Trade-offs

### Risk 1: 误删仍在使用的代码

**风险等级**：高

**缓解措施**：
- 使用静态分析工具辅助识别
- 每次删除后立即编译和测试
- 使用 Git 版本控制，确保可恢复
- 进行充分的手动功能测试

### Risk 2: 代码分割影响用户体验

**风险等级**：中

**缓解措施**：
- 仅对大型页面实施懒加载
- 提供优质的 loading 状态
- 预加载关键路由
- 测试实际的加载体验

### Risk 3: 类型迁移引入类型错误

**风险等级**：中

**缓解措施**：
- 渐进式迁移，逐个文件处理
- 每次修改后运行 TypeScript 编译
- 充分的测试覆盖

### Risk 4: 性能优化可能引入新 Bug

**风险等级**：中

**缓解措施**：
- 每次优化后进行功能测试
- 使用浏览器开发者工具验证性能改进
- 保持优化范围可控，避免过度优化

## Migration Plan

由于这是清理和优化工作，不是功能性变更，因此没有传统意义上的"迁移计划"。但有一些关键步骤需要按顺序执行：

**第 1 阶段：类型统一与代码清理**（预计 2-3 天）
1. 完成类型定义审查和迁移
2. 删除废弃文件
3. 清理冗余代码
4. 验证编译通过

**第 2 阶段：性能优化**（预计 1-2 天）
1. 优化订阅管理
2. 实施代码分割
3. 优化 Vite 配置
4. 验证性能改进

**第 3 阶段：全面测试与验证**（预计 2-3 天）
1. 功能验证测试
2. 响应式布局测试
3. 性能测试
4. 浏览器兼容性测试

**第 4 阶段：用户验收与部署准备**（预计 1 天）
1. 用户验收测试
2. 文档更新
3. 部署准备

**回滚计划**：
- 所有更改均通过 Git 版本控制
- 如发现严重问题，可以回滚到任何之前的提交
- 建议在独立分支进行此工作，完成后合并到主分支

## Open Questions

1. **是否需要保留某些特定的手动类型定义？**
   - 需要与团队确认是否有领域特定的类型扩展需求

2. **代码分割的 loading 状态应该使用什么样式？**
   - 是否需要设计统一的 PageSkeleton 组件？

3. **性能优化的目标指标是什么？**
   - 初始加载时间目标？
   - Lighthouse 评分目标？

4. **是否需要添加自动化测试？**
   - 当前主要是手动测试，是否需要添加 E2E 测试？

5. **用户验收的标准是什么？**
   - 需要明确哪些功能必须通过验收
   - 性能标准是什么

---

**文档版本**: 1.0
**最后更新**: 2025-12-15
**作者**: Claude (AI Assistant)
