# 设备监控页组件复用指南

## 📖 概述

本指南说明如何复用电池监控页面的组件架构，快速创建其他设备的监控页面（如逆变器、推进系统、配电系统等）。

电池监控页面采用模块化设计，包含三个核心组件：
- **BatteryMonitoringPage**：页面容器，管理订阅生命周期
- **MonitoringWall**：监控墙，展示所有监测点
- **DedicatedAlarmZone**：专属告警区，展示设备相关告警

这些组件可以轻松复用到其他设备监控页面。

---

## 🚀 单设备监控页面复用

### 适用场景
- 逆变器监控页面
- 配电系统监控页面
- 辅助系统监控页面

### 复用步骤

#### 步骤 1：复制页面容器组件

复制 `BatteryMonitoringPage.tsx` 并重命名为新的设备监控页面：

```bash
# 示例：创建逆变器监控页面
cp src/components/BatteryMonitoringPage.tsx src/components/InverterMonitoringPage.tsx
```

#### 步骤 2：修改设备 ID 和页面信息

打开新文件，修改以下常量：

```typescript
// 原代码（电池系统）
const EQUIPMENT_ID = 'SYS-BAT-001';
const PAGE_TITLE = '电池监控';
const BREADCRUMBS = [
  { label: '首页', path: '/dashboard', icon: Home },
  { label: '实时监控', path: '/monitoring' },
  { label: PAGE_TITLE, path: '/monitoring/battery' },
];

// 修改为（逆变器系统）
const EQUIPMENT_ID = 'SYS-INV-1-001';  // 修改设备ID
const PAGE_TITLE = '逆变器监控';        // 修改页面标题
const BREADCRUMBS = [
  { label: '首页', path: '/dashboard', icon: Home },
  { label: '实时监控', path: '/monitoring' },
  { label: PAGE_TITLE, path: '/inverter' },  // 修改路径
];
```

#### 步骤 3：修改页面图标（可选）

```typescript
// 原代码（电池图标）
import { Battery, Home, ChevronRight, Wifi, WifiOff, Loader2 } from 'lucide-react';

// 修改为（逆变器图标）
import { Zap, Home, ChevronRight, Wifi, WifiOff, Loader2 } from 'lucide-react';

// 在渲染部分修改图标
<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
  <Zap className="w-7 h-7 text-white" />  {/* 使用逆变器图标 */}
</div>
```

#### 步骤 4：更新监测点列表

在 `MonitoringWall.tsx` 中添加新设备的监测点配置：

```typescript
// 在 MonitoringWall.tsx 中添加逆变器监测点列表
const INVERTER_MONITORING_POINTS: Array<{
  id: MonitoringPointId;
  label: string;
  unit: string;
  metricType: string;
}> = [
  {
    id: 'SYS-INV-1-001:input_dc_voltage',
    label: '输入直流电压',
    unit: 'V',
    metricType: 'voltage',
  },
  {
    id: 'SYS-INV-1-001:output_ac_voltage',
    label: '输出交流电压',
    unit: 'V',
    metricType: 'voltage',
  },
  // ... 添加其他监测点
];

// 在 monitoringPoints useMemo 中添加逻辑
const monitoringPoints = useMemo(() => {
  if (equipmentId === 'SYS-BAT-001') {
    return BATTERY_MONITORING_POINTS;
  }
  if (equipmentId === 'SYS-INV-1-001' || equipmentId === 'SYS-INV-2-001') {
    return INVERTER_MONITORING_POINTS;  // 新增逻辑
  }
  return [];
}, [equipmentId]);
```

#### 步骤 5：配置路由

在 `MainLayout.tsx` 中添加路由映射：

```typescript
const routeComponentMap: Record<string, React.ComponentType<any>> = {
  '/dashboard': DashboardPage,
  '/monitoring/battery': BatteryMonitoringPage,
  '/inverter': InverterMonitoringPage,  // 新增路由
  // ... 其他路由
};
```

在 `navigation.ts` 中确认导航配置已正确指向路由。

#### 步骤 6：测试订阅和数据流

1. 启动开发服务器：`npm run dev`
2. 导航到新页面（如 `/inverter`）
3. 检查浏览器控制台：
   - ✅ WebSocket 连接已建立
   - ✅ 订阅请求成功发送
   - ✅ 实时数据正常接收
   - ✅ 组件卸载时正确取消订阅

---

## 🔀 多设备监控页面实现

### 适用场景
- 推进系统监控页面（左推进 + 右推进）
- 双逆变器监控页面（1#日用 + 2#日用）

### 架构设计

多设备页面采用分栏布局，每个设备使用独立的 `MonitoringWall` 组件，共享一个 `DedicatedAlarmZone` 组件。

```
┌─────────────────────────────────────────────────────────────┐
│                    页面标题 + 连接状态                         │
├─────────────────────────────┬───────────────────────────────┤
│   左推进系统（MonitoringWall）│   右推进系统（MonitoringWall）  │
│                             │                               │
│   监测点网格（2列）            │   监测点网格（2列）             │
│                             │                               │
├─────────────────────────────┴───────────────────────────────┤
│              专属告警区（DedicatedAlarmZone）                  │
│          显示两个设备的告警（支持分组）                          │
└─────────────────────────────────────────────────────────────┘
```

### 推进系统监控页面示例代码

#### 完整实现（PropulsionMonitoringPage.tsx）

```typescript
/**
 * PropulsionMonitoringPage 组件 - 推进系统监控页面
 *
 * 展示左推进系统和右推进系统的实时监测数据（双设备场景）
 */

import React, { useEffect, useState } from 'react';
import { useMonitoringStore } from '../stores/monitoring-store';
import { useAlarmsStore } from '../stores/alarms-store';
import { realtimeService } from '../services/realtime-service';
import MonitoringWall from './monitoring/MonitoringWall';
import DedicatedAlarmZone from './monitoring/DedicatedAlarmZone';
import { Fan, Home, ChevronRight, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// ============================================================================
// 常量定义
// ============================================================================

/** 左推进系统设备ID */
const LEFT_PROPULSION_ID = 'SYS-PROP-L-001';

/** 右推进系统设备ID */
const RIGHT_PROPULSION_ID = 'SYS-PROP-R-001';

/** 页面标题 */
const PAGE_TITLE = '推进系统监控';

/** 面包屑导航配置 */
const BREADCRUMBS = [
  { label: '首页', path: '/dashboard', icon: Home },
  { label: '实时监控', path: '/monitoring' },
  { label: PAGE_TITLE, path: '/propulsion' },
];

// ============================================================================
// 连接状态指示器组件
// ============================================================================

const ConnectionStatusIndicator: React.FC = () => {
  const { realtimeConnected } = useMonitoringStore((state) => ({
    realtimeConnected: state.realtimeConnected,
  }));

  if (realtimeConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Wifi className="w-4 h-4" />
        <span>实时连接</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-400">
      <WifiOff className="w-4 h-4" />
      <span>连接中断</span>
    </div>
  );
};

// ============================================================================
// 面包屑导航组件
// ============================================================================

const Breadcrumbs: React.FC = () => {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
      {BREADCRUMBS.map((crumb, index) => {
        const isLast = index === BREADCRUMBS.length - 1;
        const Icon = crumb.icon;

        return (
          <React.Fragment key={crumb.path}>
            {index > 0 && <ChevronRight className="w-4 h-4" />}
            {isLast ? (
              <span className="text-gray-200 font-medium flex items-center gap-1">
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="hover:text-gray-200 transition-colors flex items-center gap-1"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// ============================================================================
// PropulsionMonitoringPage 组件
// ============================================================================

export const PropulsionMonitoringPage: React.FC = () => {
  // --------------------------------------------------------------------------
  // 状态管理
  // --------------------------------------------------------------------------

  const [isInitializing, setIsInitializing] = useState(true);

  // --------------------------------------------------------------------------
  // 生命周期管理：订阅和取消订阅
  // --------------------------------------------------------------------------

  useEffect(() => {
    console.log('[PropulsionMonitoringPage] 组件挂载，开始初始化');

    const initializeMonitoring = async () => {
      try {
        setIsInitializing(true);

        // 1. 确保 WebSocket 连接已建立
        const token = localStorage.getItem('accessToken') || '';
        if (token) {
          realtimeService.connect(token);
          console.log('[PropulsionMonitoringPage] WebSocket 连接已请求');
        }

        // 2. 初始化 stores
        useMonitoringStore.getState().init(token);
        useAlarmsStore.getState().initSubscription();
        console.log('[PropulsionMonitoringPage] Stores 已初始化');

        // 3. 订阅左推进系统和右推进系统的实时数据
        const leftSubscribed = await useMonitoringStore.getState().subscribeToDevice(LEFT_PROPULSION_ID);
        const rightSubscribed = await useMonitoringStore.getState().subscribeToDevice(RIGHT_PROPULSION_ID);

        if (leftSubscribed && rightSubscribed) {
          console.log(`[PropulsionMonitoringPage] 成功订阅设备: ${LEFT_PROPULSION_ID}, ${RIGHT_PROPULSION_ID}`);
        } else {
          console.warn('[PropulsionMonitoringPage] 订阅部分设备失败');
        }

        setIsInitializing(false);
      } catch (error) {
        console.error('[PropulsionMonitoringPage] 初始化失败:', error);
        setIsInitializing(false);
      }
    };

    initializeMonitoring();

    // 清理流程：取消订阅
    return () => {
      console.log('[PropulsionMonitoringPage] 组件卸载，开始清理');

      useMonitoringStore.getState().unsubscribeFromDevice(LEFT_PROPULSION_ID);
      useMonitoringStore.getState().unsubscribeFromDevice(RIGHT_PROPULSION_ID);

      useMonitoringStore.getState().cleanup();
      useAlarmsStore.getState().cleanup();
      console.log('[PropulsionMonitoringPage] 清理完成');
    };
  }, []);

  // --------------------------------------------------------------------------
  // 渲染逻辑
  // --------------------------------------------------------------------------

  // 初始化加载状态
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4" />
            <p className="text-gray-400 text-lg">正在初始化监控系统...</p>
          </div>
        </div>
      </div>
    );
  }

  // 正常页面渲染
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ====================================================================== */}
        {/* 顶部区域：面包屑导航 + 页面标题 + 连接状态 */}
        {/* ====================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Breadcrumbs />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Fan className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-100">{PAGE_TITLE}</h1>
                <p className="text-sm text-gray-400 mt-1">
                  左推进: {LEFT_PROPULSION_ID} · 右推进: {RIGHT_PROPULSION_ID}
                </p>
              </div>
            </div>

            <ConnectionStatusIndicator />
          </div>
        </motion.div>

        {/* ====================================================================== */}
        {/* 中部区域：左右推进系统分栏布局 */}
        {/* ====================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 左推进系统 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <MonitoringWall
              equipmentId={LEFT_PROPULSION_ID}
              title="左推进系统"
              columnCount={{
                desktop: 2,  // 桌面端 2 列（因为左右分栏）
                tablet: 2,   // 平板端 2 列
                mobile: 1,   // 手机端 1 列
              }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            />
          </motion.div>

          {/* 右推进系统 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <MonitoringWall
              equipmentId={RIGHT_PROPULSION_ID}
              title="右推进系统"
              columnCount={{
                desktop: 2,  // 桌面端 2 列（因为左右分栏）
                tablet: 2,   // 平板端 2 列
                mobile: 1,   // 手机端 1 列
              }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            />
          </motion.div>
        </div>

        {/* ====================================================================== */}
        {/* 底部区域：专属告警区（显示两个设备的告警）*/}
        {/* ====================================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <DedicatedAlarmZone
            equipmentIds={[LEFT_PROPULSION_ID, RIGHT_PROPULSION_ID]}  // 传入数组
            groupByEquipment={true}  // 启用按设备分组
            maxItems={20}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          />
        </motion.div>

        {/* ====================================================================== */}
        {/* 页脚提示 */}
        {/* ====================================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          <p>数据每秒自动更新 · 无需手动刷新</p>
        </motion.div>
      </div>
    </div>
  );
};

export default PropulsionMonitoringPage;
```

### 关键配置说明

#### 1. 多设备订阅

```typescript
// 订阅多个设备
const leftSubscribed = await useMonitoringStore.getState().subscribeToDevice(LEFT_PROPULSION_ID);
const rightSubscribed = await useMonitoringStore.getState().subscribeToDevice(RIGHT_PROPULSION_ID);

// 卸载时取消订阅
useMonitoringStore.getState().unsubscribeFromDevice(LEFT_PROPULSION_ID);
useMonitoringStore.getState().unsubscribeFromDevice(RIGHT_PROPULSION_ID);
```

#### 2. 分栏布局

```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  {/* 左推进系统 */}
  <MonitoringWall
    equipmentId={LEFT_PROPULSION_ID}
    title="左推进系统"
    columnCount={{ desktop: 2, tablet: 2, mobile: 1 }}  // 桌面端 2 列
  />

  {/* 右推进系统 */}
  <MonitoringWall
    equipmentId={RIGHT_PROPULSION_ID}
    title="右推进系统"
    columnCount={{ desktop: 2, tablet: 2, mobile: 1 }}  // 桌面端 2 列
  />
</div>
```

**注意**：因为是左右分栏，每个 MonitoringWall 在桌面端使用 2 列网格（而不是默认的 4 列），这样每个设备在半个屏幕内显示 2 列，整体是 4 列布局。

#### 3. 告警区配置

```typescript
<DedicatedAlarmZone
  equipmentIds={[LEFT_PROPULSION_ID, RIGHT_PROPULSION_ID]}  // 传入设备ID数组
  groupByEquipment={true}  // 启用按设备分组，告警列表会按设备分组显示
  maxItems={20}
/>
```

---

## 📋 复用清单

### 单设备页面（5 分钟快速复用）

- [ ] 复制 `BatteryMonitoringPage.tsx` 并重命名
- [ ] 修改 `EQUIPMENT_ID` 常量
- [ ] 修改 `PAGE_TITLE` 常量
- [ ] 修改 `BREADCRUMBS` 路径
- [ ] 修改页面图标（可选）
- [ ] 在 `MonitoringWall.tsx` 中添加新设备的监测点列表
- [ ] 在 `MainLayout.tsx` 中添加路由映射
- [ ] 测试订阅和数据流

### 多设备页面（10 分钟实现）

- [ ] 创建新页面组件（参考推进系统示例）
- [ ] 定义多个设备 ID 常量
- [ ] 在 `useEffect` 中订阅所有设备
- [ ] 使用分栏布局（`grid grid-cols-1 lg:grid-cols-2`）
- [ ] 每个设备使用独立的 `MonitoringWall` 组件
- [ ] 配置 `DedicatedAlarmZone` 接收设备ID数组
- [ ] 启用 `groupByEquipment` 参数
- [ ] 测试订阅和数据流

---

## 🎯 最佳实践

### 1. 订阅管理

✅ **推荐**：在页面组件的 `useEffect` 中管理订阅生命周期

```typescript
useEffect(() => {
  // 挂载时订阅
  useMonitoringStore.getState().subscribeToDevice(EQUIPMENT_ID);

  // 卸载时取消订阅
  return () => {
    useMonitoringStore.getState().unsubscribeFromDevice(EQUIPMENT_ID);
  };
}, []);
```

❌ **避免**：在组件渲染时直接订阅（会导致重复订阅）

### 2. 性能优化

- ✅ 使用 `React.memo` 包裹组件
- ✅ 使用 Zustand selectors 精确选择需要的 store 状态
- ✅ 使用 `useMemo` 缓存计算结果（如过滤的告警列表）
- ✅ 限制告警显示数量（使用 `maxItems` 参数）

### 3. 响应式布局

- 单设备页面：使用默认配置（桌面 4 列，平板 2 列，手机 1 列）
- 多设备页面（左右分栏）：每个设备使用 2 列（桌面端）
- 多设备页面（上下分栏）：每个设备使用 4 列（桌面端）

### 4. 错误处理

- ✅ 检查订阅是否成功（`subscribeToDevice` 返回 `boolean`）
- ✅ 在控制台输出清晰的日志（便于调试）
- ✅ 处理 WebSocket 连接失败的情况（显示连接状态）

---

## 📚 相关文档

- **组件接口文档**：查看 `MonitoringWall.tsx` 和 `DedicatedAlarmZone.tsx` 的 JSDoc 注释
- **数据流架构**：参考 `docs/data_flow.md`（如果有）
- **状态管理**：参考 `src/stores/monitoring-store.ts` 和 `src/stores/alarms-store.ts`
- **实时服务**：参考 `src/services/realtime-service.ts`

---

## ❓ 常见问题

### Q1：如何知道设备的监测点有哪些？

**A**：查看 `docs/data/monitoring_and_alarm_definitions.md` 文档，其中定义了所有设备的监测点列表。

### Q2：如何自定义监控墙的列数？

**A**：使用 `MonitoringWall` 组件的 `columnCount` 参数：

```typescript
<MonitoringWall
  equipmentId="SYS-BAT-001"
  columnCount={{
    desktop: 3,  // 桌面端 3 列
    tablet: 2,   // 平板端 2 列
    mobile: 1,   // 手机端 1 列
  }}
/>
```

### Q3：如何实现三个设备的监控页面？

**A**：参考推进系统示例，使用 3 列布局：

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <MonitoringWall equipmentId="DEVICE-1" />
  <MonitoringWall equipmentId="DEVICE-2" />
  <MonitoringWall equipmentId="DEVICE-3" />
</div>
```

### Q4：告警区如何按设备分组显示？

**A**：在 `DedicatedAlarmZone` 组件中启用 `groupByEquipment` 参数：

```typescript
<DedicatedAlarmZone
  equipmentIds={['DEVICE-1', 'DEVICE-2']}
  groupByEquipment={true}  // 启用分组
/>
```

### Q5：如何添加新设备的图标映射？

**A**：在 `src/components/visualization/icons/icon-mapping.ts` 中添加新设备的监测点图标映射：

```typescript
export const iconMap: IconMap = {
  // 现有映射
  'SYS-BAT-001:total_voltage': BatTotalVoltageIcon,

  // 添加新设备的映射
  'SYS-NEW-001:monitoring_point': NewDeviceIcon,
};
```

---

## 🎉 总结

通过复用电池监控页面的组件架构，你可以在 **5-10 分钟内**快速创建新的设备监控页面，确保：

- ✅ 架构一致性
- ✅ 代码可维护性
- ✅ 开发效率提升
- ✅ 用户体验统一

如果你遇到任何问题，请参考电池监控页面的实现作为参考，或联系开发团队获取支持。
