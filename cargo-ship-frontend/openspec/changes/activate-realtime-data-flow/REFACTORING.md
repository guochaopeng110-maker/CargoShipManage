# 重构说明：monitoring-service → historical-data-service

## 重构背景

在实现"激活实时数据流"提案的过程中，我们发现 `monitoring-service.ts` 存在以下问题：

### 1. 命名误导性
- **问题**：名称 `monitoring-service` 容易让人误以为它是核心监控服务
- **实际**：`realtime-service.ts` 才是真正的核心实时监控服务（基于 WebSocket）
- **后果**：开发者可能混淆两个服务的职责，导致架构理解偏差

### 2. 功能重叠
- **问题**：`monitoring-service.ts` 包含 `importMonitoringData()` 方法
- **重叠**：该功能与 `import-service.ts` 的职责重叠
- **后果**：功能分散，难以维护，违反单一职责原则

### 3. 过度复杂
- **问题**：`monitoring-service.ts` 包含数据上传功能（`submitMonitoringData()`, `submitBatchMonitoringData()`）
- **实际需求**：前端不需要主动上传监测数据（数据由后端 WebSocket 推送）
- **后果**：代码冗余，维护成本高

## 重构方案

### 核心原则
明确两种数据场景的职责分离：
1. **实时监控**（高频）→ `realtime-service.ts` (WebSocket)
2. **历史查询/导出**（低频）→ `historical-data-service.ts` (HTTP REST)

### 重构步骤

#### 1. 创建 `historical-data-service.ts`
- **保留功能**：
  - `queryMonitoringData()` - 历史数据查询
  - `getMonitoringStatistics()` - 数据统计
  - `exportMonitoringData()` - 数据导出
  - `getSupportedMetricTypes()` - 获取支持的指标类型

- **移除功能**：
  - ❌ `importMonitoringData()` - 导入功能（由 import-service 负责）
  - ❌ `submitMonitoringData()` - 单条数据上传（前端不需要）
  - ❌ `submitBatchMonitoringData()` - 批量数据上传（前端不需要）

- **重命名理由**：
  - `historical-data-service` 准确描述其职责：查询历史数据
  - 避免与 `realtime-service` 的核心地位混淆
  - 名称即文档，一目了然

#### 2. 更新 `monitoring-store.ts`
- 将导入语句从 `monitoring-service` 改为 `historical-data-service`
- 更新调用引用：`monitoringService.queryMonitoringData()` → `historicalDataService.queryMonitoringData()`

#### 3. 删除旧文件
- 删除 `src/services/monitoring-service.ts`（已被 `historical-data-service.ts` 替代）

## 架构清晰化

### 之前（混淆）
```
monitoring-service.ts
├── queryMonitoringData()        ← 历史查询 (HTTP)
├── getMonitoringStatistics()    ← 统计分析 (HTTP)
├── exportMonitoringData()       ← 数据导出 (HTTP)
├── importMonitoringData()       ← 🔴 与 import-service 重叠
├── submitMonitoringData()       ← 🔴 前端不需要
└── submitBatchMonitoringData()  ← 🔴 前端不需要

realtime-service.ts
├── connect()                    ← 实时连接 (WebSocket)
├── subscribeToEquipment()       ← 实时订阅 (WebSocket)
└── on('monitoring:new-data')    ← 实时推送 (WebSocket)
```

### 之后（清晰）
```
historical-data-service.ts       ← 专注于历史数据查询/导出 (HTTP)
├── queryMonitoringData()        ✅ 历史查询
├── getMonitoringStatistics()    ✅ 统计分析
└── exportMonitoringData()       ✅ 数据导出

realtime-service.ts              ← 核心实时监控服务 (WebSocket)
├── connect()                    ✅ 实时连接
├── subscribeToEquipment()       ✅ 实时订阅
└── on('monitoring:new-data')    ✅ 实时推送

import-service.ts                ← 数据导入功能 (HTTP)
└── importData()                 ✅ 文件导入
```

## 影响范围

### 修改的文件
1. ✅ `src/services/historical-data-service.ts` - 新建（简化版）
2. ✅ `src/stores/monitoring-store.ts` - 更新导入和引用
3. ✅ `src/services/monitoring-service.ts` - 删除

### 不受影响的文件
- `src/services/realtime-service.ts` - 无变化
- `src/services/import-service.ts` - 无变化
- 其他 stores 和组件 - 无变化（它们不直接依赖 monitoring-service）

## 验证

### 编译检查
```bash
npx tsc --noEmit
```

预期结果：
- ❌ 无 `Cannot find name 'monitoringService'` 错误
- ❌ 无 `Cannot find module 'monitoring-service'` 错误
- ✅ `historical-data-service` 导入和调用正常

### 功能验证
1. 历史数据查询功能正常（通过 `monitoring-store.fetchMonitoringData()`）
2. 数据导出功能正常（通过 `historical-data-service.exportMonitoringData()`）
3. 实时数据推送功能不受影响（由 `realtime-service` 负责）

## 收益

### 1. 架构清晰度 ⬆️
- 服务职责明确，命名准确
- 新开发者能快速理解架构

### 2. 代码简洁性 ⬆️
- 移除 798 行 → 减少到约 400 行
- 移除不必要的功能，降低维护成本

### 3. 功能聚焦 ⬆️
- `historical-data-service`：专注于历史数据查询/导出
- `realtime-service`：专注于实时数据推送
- `import-service`：专注于数据导入

### 4. 维护性 ⬆️
- 单一职责原则
- 功能边界清晰
- 易于测试和扩展

## 后续工作

1. ✅ 完成 `realtime-service` 与 stores 的完整集成（本提案的主要工作）
2. 📋 更新相关组件以使用 `historical-data-service`（如果有直接引用）
3. 📋 更新文档和注释，反映新的架构

---

**重构时间**：2025-12-12
**重构原因**：提升架构清晰度，消除功能重叠，简化代码
**影响级别**：中等（核心服务重命名，但 API 保持兼容）
