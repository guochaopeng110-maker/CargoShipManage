# 第三方数据模拟器 (Third-party Data Simulator)

这是一个用于模拟船舶设备实时监测数据推送的脚本。它通过 HTTP REST API 向后端系统发送批量监测数据，用于测试前端实时展示、报警逻辑和数据存储功能。

## 前置条件

1.  后端服务已启动并运行在 `http://localhost:3000` (或 `.env` 中配置的地址)。
2.  后端数据库已完成初始化（Seed），必须包含脚本中预定义的 8 个设备。
3.  确保 `.env` 文件中配置了正确的管理员账号 (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)，或者脚本将使用默认值 `admin` / `admin123`。

## 功能特性

*   **全量覆盖**：自动为 8 个核心设备的所有监测点（共 82 个）生成数据。
*   **真实模拟**：使用随机游走算法 (Random Walk)，使电压、温度等模拟量呈现平滑且真实的波动曲线，而不是杂乱的随机数。
*   **灵活控制**：支持通过命令行参数调整推送频率和指定目标设备。

## 使用方法

请在项目根目录下运行以下命令：

### 1. 默认运行
向所有 8 个设备推送数据，默认间隔为 2000ms (2秒)。

```bash
npx ts-node scripts/thirdmonitor/simulate-data.ts
```

### 2. 调整推送频率
例如，每 5 秒 (5000ms) 推送一次。

```bash
npx ts-node scripts/thirdmonitor/simulate-data.ts --interval=5000
```

### 3. 指定单一设备
仅向“电池系统”推送数据，用于专注测试某个设备的详情页。

```bash
npx ts-node scripts/thirdmonitor/simulate-data.ts --device=SYS-BAT-001
```

支持的设备 ID 列表：
*   `SYS-BAT-001` (电池系统)
*   `SYS-PROP-L-001` (左推进系统)
*   `SYS-PROP-R-001` (右推进系统)
*   `SYS-INV-1-001` (1#日用逆变器)
*   `SYS-INV-2-001` (2#日用逆变器)
*   `SYS-DCPD-001` (直流配电板)
*   `SYS-BILGE-001` (舱底水系统)
*   `SYS-COOL-001` (冷却水泵系统)

### 4. 组合使用
每 1 秒向左推进系统推送一次数据。

```bash
npx ts-node scripts/thirdmonitor/simulate-data.ts --device=SYS-PROP-L-001 --interval=1000
```

## 注意事项

*   如果遇到登录失败，请检查 `.env` 中的管理员账号密码。
*   如果遇到连接拒绝，请确认后端服务是否已启动。
*   按 `Ctrl + C` 停止脚本运行。
