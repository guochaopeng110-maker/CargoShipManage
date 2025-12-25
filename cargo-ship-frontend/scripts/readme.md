# 实时数据测试指南

为了确保全链路数据流（模拟器 → WebSocket → Store → UI）工作正常，请按照以下步骤进行测试。

## 第一步：启动数据源（模拟器）

模拟器现在支持参数化启动，方便您进行针对性调试。

### 1. 基础启动
```bash
node scripts/realtime-simulator.js
```
默认每秒发送全船 8 个系统的实时数据。

### 2. 调试模式（推荐）
如果您觉得数据量太大，可以使用以下参数：

- `--focus <EquipmentID>`: 只发送指定设备的数据。
- `--interval <ms>`: 调整发送间隔（毫秒）。
- `--static`: 开启静态模式，数值不再随机波动。
- `--batch`: **[新]** 开启批量数据模拟。

### 3. 批量数据模拟测试
为了验证高性能数据同步和文件导入进度：
```bash
node scripts/realtime-simulator.js --batch
```
开启后，模拟器将自动执行以下逻辑：
- **实时批量推送 (isHistory: false)**：每 15 秒触发一次，模拟多点同时瞬间更新，验证卡片响应。
- **历史导入模拟 (isHistory: true)**：每 30 秒触发一次（约 8-10 个分片），用于测试 `DataImportPage` 的进度条和 WebSocket 接收逻辑。

**示例：全量批量测试**
```bash
node scripts/realtime-simulator.js --batch --interval 1000
```

**焦点 ID 参考：**
- `SYS-BAT-001`: 电池系统
- `SYS-PROP-L-001`: 左推进系统
- `SYS-PROP-R-001`: 右推进系统
- `SYS-INV-1-001`: 1#日用逆变器
- `SYS-INV-2-001`: 2#日用逆变器
- `SYS-DCPD-001`: 直流配电板
- `SYS-BILGE-001`: 舱底水系统
- `SYS-COOL-001`: 冷却水系统

---

## 第二步：进入前端页面
1. 确保您的前端开发服务器已启动（`npm run dev`）。
2. 在浏览器中打开：`http://localhost:3000`。
3. 登录系统。

---

## 第三步：验证监测点对齐
1. 进入对应系统的监控页面（如：**实时监控** -> **电池监控**）。
2. **数量验证**：确认卡片数量与文档 `docs/data/monitoring_point_definition.md` 一致（电池应为 18 个）。
3. **状态验证**：观察模拟器控制台。当出现 `[告警触发]` 日志时，检查 UI 对应的卡片是否同步变红并显示告警状态。

---

## 第四步：开发者工具观察
1. 按 `F12` 打开开发者工具 -> **Network** -> **WS**。
2. 选中 WebSocket 连接，在 **Messages** 标签页观察进入的 JSON 数据。
3. 确认 `monitoringPoint` 为中文名称，数值符合预期。
