# 后端设备ID迁移适配方案

## 1. 背景 (Background)
后端设备订阅及相关数据接口的鉴权识别方式发生变更。原有的以 "SYS-" 开头的业务编号 (Device Code) 仅作为展示或逻辑标识，后端 API 和 WebSocket 订阅现在明确要求使用 **设备 UUID** (32位字符串)。

前端工程目前在多个核心配置和页面中硬编码了 "SYS-" 格式的 ID 并直接用于数据请求，这将导致：
1.  **实时连接失败**: WebSocket 订阅请求将被后端拒绝或忽略，无法接收实时数据。
2.  **API 请求错误**: 历史数据查询等 REST 接口如果也强制要求 UUID，将返回 404 或 400 错误。

## 2. 影响范围分析 (Impact Analysis)

### 2.1 核心配置与常量
以下文件存在硬编码的 `SYS-` ID，需进行逻辑替换：
*   `src/config/core-systems.ts`: 定义了全局核心系统的配置，其中的 `deviceId` 字段目前为 "SYS-" 格式。
    *   影响：`CoreSystemConfig` 被用于生成导航和系统概览，如果直接取其 `deviceId` 进行订阅将会失败。

### 2.2 业务页面组件
以下页面直接定义了常量 ID 并用于传递给子组件或发起订阅：
*   `src/components/BatteryMonitoringPage.tsx` (`SYS-BAT-001`)
*   `src/components/PropulsionMonitoringPage.tsx` (`SYS-PROP-L-001`, `SYS-PROP-R-001`)
*   `src/components/InverterMonitoringPage.tsx` (`SYS-INV-1-001`, `SYS-INV-2-001`)
*   `src/components/PowerDistributionPage.tsx` (`SYS-DCPD-001`)
*   `src/components/AuxiliaryMonitoringPage.tsx` (`SYS-BILGE-001`, `SYS-COOL-001`)

### 2.3 核心组件
*   `MonitoringWall`: 接收 `equipmentId` prop。如果父组件传错误 ID，它发起的数据请求也会错误。
*   `DedicatedAlarmZone`: 同上，告警订阅会失效。

### 2.4 数据服务
*   `MonitoringStore`: 其 action (`fetchMonitoringData`, `subscribeToDevice`) 依赖调用者传入正确的 ID。

## 3. 整改方案 (Remediation Plan)

为了适应后端变更并保持代码的可维护性（适应不同环境 UUID 可能不同的情况），建议采用 **"动态映射 (Dynamic Mapping)"** 策略，而不是简单地替换硬编码字符串。

### 3.1 核心策略
1.  **保留业务标识**: 前端代码中继续使用语义化的 Code (如 `SYS-BAT-001`) 作为逻辑引用的 Key，因为这与 UI 设计和路由强相关。
2.  **建立全局映射**: 在应用启动时，从后端获取所有设备的清单 (包含 UUID 和 DeviceId/Code)。
3.  **运行时转换**: 在组件层，根据业务标识 (Code) 查找对应的真实 UUID，再传递给底层数据组件 (Store/Service)。

### 3.2 详细实施步骤

#### 步骤 1: 增强 Equipment Store
修改 `src/stores/equipment-store.ts`，增加设备字典管理能力。

```typescript
// State 增加
interface EquipmentState {
  // ... existing state
  equipmentMap: Record<string, Equipment>; // Key: deviceId (SYS-...), Value: Equipment Object
  isInitialized: boolean;
}

// Actions 增加
initEquipmentMapping: async () => {
  const response = await Service.equipmentControllerFindAll(1, 1000); // 获取所有设备
  const map = {};
  response.items.forEach(eq => {
    map[eq.deviceId] = eq; // 建立 Code -> Entity 的索引
  });
  set({ equipmentMap: map, isInitialized: true });
},

getUUIDByCode: (code: string) => {
  return get().equipmentMap[code]?.id;
}
```

#### 步骤 2: 全局初始化
在 `src/App.tsx` 中，确保应用启动时加载设备字典。

```typescript
useEffect(() => {
  // 初始化设备隐射
  useEquipmentStore.getState().initEquipmentMapping();
}, []);
```

#### 步骤 3: 重构监控页面
以 `BatteryMonitoringPage.tsx` 为例，修改逻辑：

```typescript
// 1. 保留常量作为 Code
const TARGET_DEVICE_CODE = 'SYS-BAT-001';

export const BatteryMonitoringPage = () => {
  // 2. 获取映射状态
  const { equipmentMap, isInitialized } = useEquipmentStore();
  
  // 3. 计算真实 UUID
  const equipmentUUID = equipmentMap[TARGET_DEVICE_CODE]?.id;

  // 4. 等待初始化完成或 UUID 获取成功
  if (!isInitialized || !equipmentUUID) {
     return <Loader text="获取设备信息..." />;
  }

  // 5. 使用 UUID 传递给子组件
  return (
    <>
       <MonitoringWall equipmentId={equipmentUUID} />
       <DedicatedAlarmZone equipmentIds={equipmentUUID} />
    </>
  );
};
```

#### 步骤 4: 更新核心系统配置
修改 `src/config/core-systems.ts`，使其能够支持或容忍这种映射机制。
虽然 `coreSystemsConfig` 是静态配置，但我们可以增加一个 helper 函数 `getCoreSystemUUID(systemId)` 来结合 Store 使用。

### 3.3 备选方案 (Quick Fix)
**适用场景**: 如果无法获取设备列表接口，或者开发时间极短。
**操作**:
1.  联系后端获取生产环境/测试环境所有核心设备的 UUID 列表。
2.  直接查找替换项目中的 `SYS-xxx` 字符串为对应的 UUID 字符串。
3.  **风险**: 代码将无法在不同数据库环境间复用（UUID 通常是随机生成的）。

## 4. 实施路线图
1.  [ ] **基础设施**: 完善 `EquipmentStore`，实现 `initEquipmentMapping`。
2.  [ ] **应用入口**: `App.tsx` 挂载初始化调用。
3.  [ ] **页面改造**: 逐一修改 5 个核心监控页面 (Battery, Propulsion, Inverter, Power, Auxiliary)。
4.  [ ] **验证**:
    *   启动应用，检查 Network 请求，确认获取了设备列表。
    *   进入监控页，确认 WebSocket 订阅消息 (payload中应包含 UUID)。
    *   确认图表和告警数据正常刷新。

## 5. 风险与注意事项
*   **启动延迟**: 应用启动时增加了一个同步/异步的 API 请求，可能会轻微增加首屏时间（可接受）。
*   **异常处理**: 如果后端返回的列表中找不到对应的 `SYS-` Code，页面应有明确的 "设备未配置" 提示，而不是白屏或报错。
