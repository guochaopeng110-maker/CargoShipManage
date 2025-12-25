# 第三方监测数据模拟器方案 (独立运行版)

## 1. 目标
创建一个独立的 Node.js 脚本，用于模拟第三方系统向后端推送实时的船舶设备监测数据。

## 2. 约束条件
*   **禁止连接数据库**：脚本不得直接连接 MySQL 数据库。
*   **禁止查询设备列表**：直接硬编码提供的 8 个设备信息（包含 UUID 和 deviceId）。
*   **数据源**：使用 `src/database/migrations/1766543954237-SeedMonitoringPoints.ts` 中定义的监测点结构。
*   **覆盖率要求**：**必须**为每个设备下的**每一个**监测点生成并发送数据，确保前端测试无盲区。
*   **通信方式**：通过 HTTP REST API (`POST /api/monitoring/data/batch`) 推送数据。

## 3. 技术栈
*   **语言**: TypeScript (运行于 `ts-node`)
*   **HTTP 客户端**: `axios`
*   **参数解析**: 原生 `process.argv` 或 `minimist` (如果项目已有)
*   **依赖**: 复用项目根目录的 `node_modules`

## 4. 脚本位置
`scripts/thirdmonitor/simulate-data.ts`

## 5. 实现逻辑

### 5.0 参数配置 (CLI Arguments)
脚本应支持以下命令行参数，以便灵活控制：

*   `--interval <ms>`: 数据推送频率，单位毫秒。默认 `2000` (2秒)。
*   `--device <deviceId>`: 指定只发送某个设备的数据 (如 `SYS-BAT-001`)。如果不传，默认发送**所有**设备。

**示例用法**:
```bash
# 默认：所有设备，2秒一次
npx ts-node scripts/thirdmonitor/simulate-data.ts

# 指定：只发送电池系统，5秒一次
npx ts-node scripts/thirdmonitor/simulate-data.ts --device=SYS-BAT-001 --interval=5000
```

### 5.1 静态配置 (Hardcoded Configuration)

#### A. 设备列表 (Equipment List)
直接在脚本中定义常量 `EQUIPMENT_LIST`，包含以下 8 个设备的核心信息（从提供的 JSON 中提取）：

| Device Name | Device ID | UUID |
| :--- | :--- | :--- |
| 1#日用逆变器系统 | `SYS-INV-1-001` | `02bf7d95-f490-4a4d-a77a-7c8fb0151cbd` |
| 冷却水泵系统 | `SYS-COOL-001` | `10bf2d36-3148-4496-977b-c1a4a3a97eed` |
| 舱底水系统 | `SYS-BILGE-001` | `2a3aa4be-b43c-4518-ab77-c21fc2861c19` |
| 2#日用逆变器系统 | `SYS-INV-2-001` | `a6713a6d-eb68-469c-9370-bd2b67295472` |
| 直流配电板系统 | `SYS-DCPD-001` | `d48b576c-8a90-4492-b9a0-f1479ec8f41c` |
| 电池系统 | `SYS-BAT-001` | `7d6849fb-5704-4ca0-8237-b974b27cbf49` |
| 左推进系统 | `SYS-PROP-L-001` | `bb905811-1a70-417a-8602-8e10959f7c22` |
| 右推进系统 | `SYS-PROP-R-001` | `f8526635-1610-42e5-88ff-5f79620821ad` |

#### B. 监测点定义 (Monitoring Points)
将 `SeedMonitoringPoints` 中的 `monitoringPointsData` 结构完整复制到脚本中。
*   **关键点**：该数组中包含了每个设备对应的**全量**监测点定义。
*   脚本将严格按照此数组进行迭代，确保不遗漏任何一个点。

### 5.2 运行流程

1.  **初始化 (Setup)**:
    *   读取环境变量配置 (API URL, Admin Credentials)。
    *   **解析命令行参数**：获取 `interval` 和 `targetDevice`。
    *   建立映射: `Map<DeviceId, UUID>`。
    *   **过滤目标设备**：如果指定了 `targetDevice`，则仅保留该设备的配置；否则保留全部 8 个设备。
    
2.  **认证 (Login)**:
    *   调用 `POST /api/auth/login`。
    *   获取 JWT Token，用于后续请求。

3.  **数据生成 (Data Generation)**:
    *   **算法**: 随机游走 (Random Walk) + 范围限制。
    *   维护一个 `DeviceState` 对象，记录每个监测点上一次的值。
    *   **数值规则** (针对所有点生成值):
        *   `voltage`: 根据设备不同，在 220V/380V/648V/750V 附近波动。
        *   `current`: 在额定电流范围内波动。
        *   `temperature`: 40℃ - 80℃ 之间缓慢变化。
        *   `speed`: 推进电机转速 0 - 1500 rpm。
        *   `level`: 0 - 100%。
        *   `switch`: 0 (正常) 或 1 (故障)，低概率发生故障。

4.  **数据推送 (Push Loop)**:
    *   **频率**: 使用参数配置的 `interval` (默认 2000ms)。
    *   **批处理**: 
        *   对每个目标设备，收集其**所有**监测点生成的数据。
        *   构造 `CreateBatchTimeSeriesDataDto` 请求体。
        *   发送 `POST /api/monitoring/data/batch`。
    *   **日志**: 打印每个设备的推送状态 (包含数据条数，例如 "Success: 18 points pushed to SYS-BAT-001")。

## 6. 预期输入与输出
*   **输入**: 命令行参数（可选）。
*   **输出**: 控制台日志显示推送结果，后端数据库新增 TimeSeriesData 记录。

## 7. 注意事项
*   确保后端服务运行在默认端口 3000 (或根据 .env 配置)。
*   如果指定的设备 ID 不存在，脚本应报错并退出。