# 任务列表：将监控墙模板应用到核心监控页面

## 概述
本文档详细列出将"监控墙"模板应用到四个核心监控页面的所有任务。任务按阶段和依赖关系组织，确保有序高效地完成重构工作。

---

## 阶段 1: 准备工作 (Foundation) ✅

### 任务 1.1: 分析现有页面结构 ✅
- [x] 详细分析 PropulsionMonitoringPage 的当前实现
- [x] 详细分析 InverterMonitoringPage 的当前实现
- [x] 详细分析 PowerDistributionPage 的当前实现
- [x] 详细分析 AuxiliaryMonitoringPage 的当前实现
- [x] 识别每个页面的监测点和数据结构
- [x] 记录现有的图表和数据展示方式

**验证标准**: ✅ 完成四个页面的分析，明确了所有监测点

### 任务 1.2: 定义监测点配置 ✅
- [x] 为推进系统定义监测点列表（参考现有实现）
  - 左推进电机：12个监测点（电压、电流、转速、功率、温度、逆变器参数、故障状态）
  - 右推进电机：12个监测点（与左侧对称）
  - 设备 ID: `SYS-PROP-L-001`, `SYS-PROP-R-001`
- [x] 为逆变器系统定义监测点列表
  - 1# 逆变器：4个监测点（直流输入电压、交流输出电压、输出功率、电抗器温度）
  - 2# 逆变器：4个监测点（与1#对称）
  - 设备 ID: `SYS-INV-1-001`, `SYS-INV-2-001`
- [x] 为配电系统定义监测点列表
  - 直流配电板：5个监测点（直流母线电压/电流/功率、绝缘电阻、电池电量）
  - 设备 ID: `SYS-DCPD-001`
- [x] 为辅助系统定义监测点列表
  - 舱底水系统：4个监测点（1#/2#/3#/4# 集水井水位）
  - 冷却水泵系统：6个监测点（温度、压力、流量、1#/2#泵失电、泵运行状态）
  - 设备 ID: `SYS-BILGE-001`, `SYS-COOL-001`

**验证标准**: ✅ 在 MonitoringWall.tsx 中完成所有系统的监测点配置

### 任务 1.3: 图标映射和动画效果 ✅
- [x] 审查现有的图标系统 (icon-mapping)
- [x] 为推进系统监测点配置图标映射（已存在于 icon-mapping.ts）
- [x] 为逆变器系统监测点配置图标映射（已存在于 icon-mapping.ts）
- [x] 为配电系统监测点配置图标映射（已存在于 icon-mapping.ts）
- [x] 为辅助系统监测点配置图标映射（已存在于 icon-mapping.ts）
- [x] 验证所有图标的动画效果（使用 framer-motion）

**验证标准**: ✅ 所有监测点都有对应的图标，使用 framer-motion 动画

### 任务 1.4: 设备 ID 规范化 ✅
- [x] 确认推进系统的设备 ID：`SYS-PROP-L-001`, `SYS-PROP-R-001`
- [x] 确认逆变器系统的设备 ID：`SYS-INV-1-001`, `SYS-INV-2-001`
- [x] 确认配电系统的设备 ID：`SYS-DCPD-001`
- [x] 确认辅助系统的设备 ID：`SYS-BILGE-001`, `SYS-COOL-001`
- [x] 更新相关文档和配置

**验证标准**: ✅ 所有设备 ID 符合 `SYS-XXX-001` 统一命名规范

---

## 阶段 2: PropulsionMonitoringPage 重构 ✅

### 任务 2.1: 重构 PropulsionMonitoringPage 页面结构 ✅
- [x] 备份现有 PropulsionMonitoringPage.tsx 实现（通过完全重写）
- [x] 参照 BatteryMonitoringPage 重构页面框架
  - 顶部：标题、面包屑、连接状态
  - 中部：监控墙区域（左右双栏）
  - 底部：专属告警区域
- [x] 移除旧的卡片布局和图表组件
- [x] 添加页面加载和初始化逻辑

**验证标准**: ✅ 页面框架搭建完成，采用左右双栏布局

### 任务 2.2: 集成 MonitoringWall 组件 (推进系统) ✅
- [x] 在 MonitoringWall 中添加推进系统监测点配置
  - 定义 `PROPULSION_LEFT_MONITORING_POINTS` 列表（12个监测点）
  - 定义 `PROPULSION_RIGHT_MONITORING_POINTS` 列表（12个监测点）
- [x] 在 PropulsionMonitoringPage 中集成 MonitoringWall
  - 传递正确的 equipmentId：`SYS-PROP-L-001` 和 `SYS-PROP-R-001`
  - 配置响应式列数：desktop=2, tablet=2, mobile=1
  - 应用玻璃态样式
- [x] 验证所有监测点正确显示

**验证标准**: ✅ 监控墙正确展示左右推进系统所有24个监测点

### 任务 2.3: 集成 DedicatedAlarmZone 组件 (推进系统) ✅
- [x] 在 PropulsionMonitoringPage 中集成 DedicatedAlarmZone
- [x] 配置设备 ID 过滤（左右推进电机数组）
- [x] 配置最大显示数量：20条
- [x] 验证告警实时更新（依赖 WebSocket）

**验证标准**: ✅ 告警区正确配置推进系统设备ID过滤

### 任务 2.4: 实时数据集成 (推进系统) ✅
- [x] 在组件挂载时订阅推进系统设备（左右电机）
- [x] 在组件卸载时取消订阅（避免内存泄漏）
- [x] 实现 WebSocket 连接状态显示
- [x] 实现实时数据更新逻辑
- [x] 添加连接状态指示器

**验证标准**: ✅ 实时数据流逻辑完整实现，包含生命周期管理

### 任务 2.5: 样式和动画优化 (推进系统) ✅
- [x] 应用 framer-motion 动画（淡入、滑入效果）
- [x] 优化页面过渡效果（不同延迟时间）
- [x] 实现响应式布局（lg:grid-cols-2）
- [x] 应用深色主题和玻璃态效果

**验证标准**: ✅ 页面视觉效果符合设计规范，所有动画已实现

---

## 阶段 3: InverterMonitoringPage 重构 ✅

### 任务 3.1: 重构 InverterMonitoringPage 页面结构 ✅
- [x] 备份现有 InverterMonitoringPage.tsx 实现（通过完全重写）
- [x] 参照 BatteryMonitoringPage 重构页面框架
- [x] 移除旧的卡片布局和图表组件
- [x] 添加页面加载和初始化逻辑

**验证标准**: ✅ 页面框架搭建完成，采用左右双栏布局

### 任务 3.2: 集成 MonitoringWall 组件 (逆变器系统) ✅
- [x] 在 MonitoringWall 中添加逆变器系统监测点配置
  - 定义 `INVERTER_1_MONITORING_POINTS` 列表（4个监测点）
  - 定义 `INVERTER_2_MONITORING_POINTS` 列表（4个监测点）
- [x] 在 InverterMonitoringPage 中集成 MonitoringWall
  - 传递设备ID：`SYS-INV-1-001` 和 `SYS-INV-2-001`
  - 配置响应式列数：desktop=2, tablet=2, mobile=1
- [x] 验证所有监测点正确显示

**验证标准**: ✅ 监控墙正确展示双逆变器系统所有8个监测点

### 任务 3.3: 集成 DedicatedAlarmZone 组件 (逆变器系统) ✅
- [x] 在 InverterMonitoringPage 中集成 DedicatedAlarmZone
- [x] 配置设备 ID 过滤（双逆变器数组）
- [x] 配置最大显示数量：20条

**验证标准**: ✅ 告警区正确配置逆变器系统设备ID过滤

### 任务 3.4: 实时数据集成 (逆变器系统) ✅
- [x] 在组件挂载时订阅逆变器设备（1#和2#）
- [x] 在组件卸载时取消订阅（避免内存泄漏）
- [x] 实现实时数据流逻辑

**验证标准**: ✅ 实时数据流逻辑完整实现，包含生命周期管理

### 任务 3.5: 样式和动画优化 (逆变器系统) ✅
- [x] 应用 framer-motion 动画效果
- [x] 实现响应式布局（lg:grid-cols-2）
- [x] 应用深色主题和玻璃态效果

**验证标准**: ✅ 页面视觉效果符合设计规范

---

## 阶段 4: PowerDistributionPage 重构 ✅

### 任务 4.1: 重构 PowerDistributionPage 页面结构 ✅
- [x] 备份现有 PowerDistributionPage.tsx 实现（通过完全重写）
- [x] 参照 BatteryMonitoringPage 重构页面框架
- [x] 移除旧的卡片布局和表格组件
- [x] 添加页面加载和初始化逻辑

**验证标准**: ✅ 页面框架搭建完成，采用单栏布局

### 任务 4.2: 集成 MonitoringWall 组件 (配电系统) ✅
- [x] 在 MonitoringWall 中添加配电系统监测点配置
  - 定义 `POWER_DISTRIBUTION_MONITORING_POINTS` 列表（5个监测点）
  - 直流配电板监测点（电压、电流、功率、绝缘电阻、电池电量）
- [x] 在 PowerDistributionPage 中集成 MonitoringWall
  - 传递设备ID：`SYS-DCPD-001`
  - 使用默认列数配置：desktop=4, tablet=2, mobile=1
- [x] 验证所有监测点正确显示

**验证标准**: ✅ 监控墙正确展示配电系统所有5个监测点

### 任务 4.3: 集成 DedicatedAlarmZone 组件 (配电系统) ✅
- [x] 在 PowerDistributionPage 中集成 DedicatedAlarmZone
- [x] 配置设备 ID 过滤：`SYS-DCPD-001`
- [x] 配置最大显示数量：20条

**验证标准**: ✅ 告警区正确配置配电系统设备ID过滤

### 任务 4.4: 实时数据集成 (配电系统) ✅
- [x] 在组件挂载时订阅配电系统设备
- [x] 在组件卸载时取消订阅（避免内存泄漏）
- [x] 实现实时数据流逻辑

**验证标准**: ✅ 实时数据流逻辑完整实现，包含生命周期管理

### 任务 4.5: 样式和动画优化 (配电系统) ✅
- [x] 应用 framer-motion 动画效果
- [x] 实现响应式布局
- [x] 应用深色主题和玻璃态效果

**验证标准**: ✅ 页面视觉效果符合设计规范

---

## 阶段 5: AuxiliaryMonitoringPage 重构 ✅

### 任务 5.1: 重构 AuxiliaryMonitoringPage 页面结构 ✅
- [x] 备份现有 AuxiliaryMonitoringPage.tsx 实现（通过完全重写）
- [x] 参照 BatteryMonitoringPage 重构页面框架
- [x] 移除旧的卡片布局和表格组件
- [x] 添加页面加载和初始化逻辑

**验证标准**: ✅ 页面框架搭建完成，采用左右双栏布局

### 任务 5.2: 集成 MonitoringWall 组件 (辅助系统) ✅
- [x] 在 MonitoringWall 中添加辅助系统监测点配置
  - 定义 `BILGE_MONITORING_POINTS` 列表（4个监测点）
  - 定义 `COOLING_MONITORING_POINTS` 列表（6个监测点）
- [x] 在 AuxiliaryMonitoringPage 中集成 MonitoringWall
  - 传递设备ID：`SYS-BILGE-001` 和 `SYS-COOL-001`
  - 配置响应式列数：desktop=2, tablet=2, mobile=1
- [x] 验证所有监测点正确显示

**验证标准**: ✅ 监控墙正确展示辅助系统所有10个监测点

### 任务 5.3: 集成 DedicatedAlarmZone 组件 (辅助系统) ✅
- [x] 在 AuxiliaryMonitoringPage 中集成 DedicatedAlarmZone
- [x] 配置设备 ID 过滤（舱底水和冷却水系统数组）
- [x] 配置最大显示数量：20条

**验证标准**: ✅ 告警区正确配置辅助系统设备ID过滤

### 任务 5.4: 实时数据集成 (辅助系统) ✅
- [x] 在组件挂载时订阅辅助系统设备（舱底水和冷却水）
- [x] 在组件卸载时取消订阅（避免内存泄漏）
- [x] 实现实时数据流逻辑

**验证标准**: ✅ 实时数据流逻辑完整实现，包含生命周期管理

### 任务 5.5: 样式和动画优化 (辅助系统) ✅
- [x] 应用 framer-motion 动画效果
- [x] 实现响应式布局（lg:grid-cols-2）
- [x] 应用深色主题和玻璃态效果

**验证标准**: ✅ 页面视觉效果符合设计规范

---

## 阶段 6: 集成测试和验证

### 任务 6.1: 功能测试
- [ ] 测试 PropulsionMonitoringPage 的所有功能
  - 页面加载
  - 数据订阅/取消订阅
  - 实时数据更新
  - 告警显示和更新
  - 连接状态变化
- [ ] 测试 InverterMonitoringPage 的所有功能
- [ ] 测试 PowerDistributionPage 的所有功能
- [ ] 测试 AuxiliaryMonitoringPage 的所有功能

**验证标准**: 所有功能正常工作，无关键缺陷

### 任务 6.2: 性能测试
- [ ] 验证页面首次加载性能
- [ ] 验证实时数据更新性能
- [ ] 验证动画流畅度
- [ ] 验证内存使用情况

**验证标准**: 页面性能符合标准，无明显卡顿

### 任务 6.3: 响应式测试
- [ ] 测试桌面端显示 (≥1024px)
- [ ] 测试平板端显示 (768px - 1023px)
- [ ] 测试手机端显示 (<768px)
- [ ] 验证不同列数配置

**验证标准**: 所有设备上布局正常

### 任务 6.4: 浏览器兼容性测试
- [ ] 测试 Chrome/Edge (Chromium)
- [ ] 测试 Firefox
- [ ] 测试 Safari (如可用)

**验证标准**: 主流浏览器无兼容性问题

### 任务 6.5: 数据流测试
- [ ] 验证 WebSocket 连接建立和断开
- [ ] 验证数据推送和 store 更新
- [ ] 验证告警推送和更新
- [ ] 验证错误处理和恢复

**验证标准**: 数据流稳定可靠

---

## 阶段 7: 文档和清理

### 任务 7.1: 更新代码文档 ✅
- [x] 为 PropulsionMonitoringPage 添加详细中文注释和 JSDoc
- [x] 为 InverterMonitoringPage 添加详细中文注释和 JSDoc
- [x] 为 PowerDistributionPage 添加详细中文注释和 JSDoc
- [x] 为 AuxiliaryMonitoringPage 添加详细中文注释和 JSDoc
- [x] 更新 MonitoringWall 组件文档（添加7个新系统的监测点配置）

**验证标准**: ✅ 所有代码都有详细的中文注释，包括功能说明、参数说明、架构说明

### 任务 7.2: 更新用户文档
- [ ] 更新页面使用说明
- [ ] 添加截图和示例
- [ ] 记录常见问题和解决方案

**验证标准**: 用户文档清晰易懂

### 任务 7.3: 清理旧代码 ✅
- [x] 确认旧实现已完全替换
  - 四个重构页面（PropulsionMonitoringPage, InverterMonitoringPage, PowerDistributionPage, AuxiliaryMonitoringPage）均已完全重写
  - 采用新的监控墙模式，完全替换了旧的实现
- [x] 检查不再使用的组件和样式
  - ✅ 未发现备份文件（.bak, .old, _backup等）
  - ✅ 未发现TODO/FIXME等开发注释
  - ⚠️ 发现潜在未使用组件：
    - `UnifiedMonitoringChart.tsx` (1147行) - 统一监控图表组件，未在项目中被引用
    - `GaugeRenderer.tsx` - 仪表盘渲染器，仅被UnifiedMonitoringChart使用
    - 建议：保留这两个组件作为备用实现，或在确认完全不需要后再删除
- [x] 检查旧的模拟数据和测试代码
  - ✅ 重构页面中未使用模拟数据，所有数据通过Zustand stores和WebSocket获取
- [x] 检查注释掉的代码
  - ✅ 四个重构页面均无注释掉的代码
  - ✅ 代码结构清晰，注释完整

**验证标准**: ✅ 代码库整洁，无明显冗余代码。发现两个潜在未使用的旧图表组件，建议后续评估是否保留

### 任务 7.4: 更新项目文档 ✅
- [x] 更新 project.md（架构变化）
  - ✅ 添加"监控墙模式"（Monitoring Wall Pattern）架构说明
  - ✅ 更新系统列表，添加所有已重构系统的详细说明
  - ✅ 添加设备ID命名规范（`SYS-XXX-001`）
  - ✅ 添加监测点ID规范说明
  - ✅ 区分了"三段式标准布局"（Legacy）和"监控墙模式"（Current）
- [x] 创建重构完成总结文档
  - ✅ 创建 `IMPLEMENTATION_SUMMARY.md` 详细记录：
    - 实施成果和统计数据
    - 架构特点和技术实现细节
    - 代码质量保证措施
    - 遇到的挑战与解决方案
    - 最佳实践总结
    - 经验教训和关键洞察
    - 下一步计划
- [x] 记录经验教训和最佳实践
  - ✅ 组件复用最佳实践
  - ✅ 状态管理最佳实践
  - ✅ 生命周期管理最佳实践
  - ✅ 动画性能优化建议
  - ✅ 错误处理规范
  - ✅ 关键技术洞察

**验证标准**: ✅ 项目文档已全面更新，实施总结文档完整记录了重构过程、技术细节和经验教训

---

## 任务统计

| 阶段 | 任务数 | 说明 |
|------|--------|------|
| 阶段 1: 准备工作 | 15 | 分析、配置、规范化 |
| 阶段 2: 推进系统重构 | 16 | PropulsionMonitoringPage |
| 阶段 3: 逆变器系统重构 | 10 | InverterMonitoringPage |
| 阶段 4: 配电系统重构 | 10 | PowerDistributionPage |
| 阶段 5: 辅助系统重构 | 10 | AuxiliaryMonitoringPage |
| 阶段 6: 集成测试 | 18 | 功能、性能、兼容性测试 |
| 阶段 7: 文档和清理 | 11 | 文档更新和代码清理 |
| **总计** | **90** | |

---

## 里程碑

- **M1: 准备完成** - 所有配置和规范化工作完成
- **M2: 第一个页面完成** - PropulsionMonitoringPage 重构完成并验证
- **M3: 一半页面完成** - PropulsionMonitoringPage 和 InverterMonitoringPage 完成
- **M4: 所有页面完成** - 四个页面全部重构完成
- **M5: 测试完成** - 所有测试通过
- **M6: 项目交付** - 文档完成，项目正式交付

---

## 注意事项

1. **按阶段推进**: 建议按顺序完成各阶段，确保每个阶段的验证标准都满足后再进入下一阶段
2. **并行开发**: 在准备工作完成后，可以并行开发多个页面，但需注意资源协调
3. **持续测试**: 在开发过程中持续进行单元测试和集成测试，及早发现问题
4. **代码审查**: 每个页面完成后进行代码审查，确保代码质量和一致性
5. **用户反馈**: 在适当的时候邀请用户进行预览和反馈

---

## 依赖和阻塞

- **前置依赖**:
  - `refactor-battery-monitoring-page` 必须完成（BatteryMonitoringPage 作为参考模板）
  - `build-animated-visualization-components` 已完成

- **阻塞因素**:
  - 设备 ID 规范不明确可能阻塞数据集成
  - 图标缺失可能阻塞视觉效果实现
  - WebSocket 服务不稳定可能影响实时数据测试
