# 导入模板说明

本目录包含时序数据导入模板，支持 Excel 和 JSON 两种格式。

## 文件列表

- `import-template.xlsx` - Excel格式模板
- `import-template.json` - JSON格式模板
- `README.md` - 本说明文档

## Excel 模板说明

### 列定义

| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| 设备ID | 是 | 设备唯一标识，必须是系统中已存在的设备 | SYS-BAT-001 |
| 时间戳 | 是 | 数据采集时间，格式: YYYY-MM-DD HH:mm:ss | 2025-01-01 10:00:00 |
| 监测点 | 是 | 监测点名称（中文），必须与系统定义一致 | 总电压 |
| 指标类型 | 是 | 数据类型 | voltage, current, temperature 等 |
| 数值 | 是 | 监测数值 | 650.5 |
| 单位 | 否 | 数据单位 | V, A, °C 等 |
| 数据质量 | 否 | 数据质量标识 | 正常, 异常 |

### 设备ID清单

系统支持以下设备ID（严格区分大小写）：

- **SYS-BAT-001** - 电池系统
- **SYS-PROP-L-001** - 左推进系统
- **SYS-PROP-R-001** - 右推进系统
- **SYS-INV-1-001** - 1#日用逆变器系统
- **SYS-INV-2-001** - 2#日用逆变器系统
- **SYS-DCPD-001** - 直流配电板系统
- **SYS-BILGE-001** - 舱底水系统
- **SYS-COOL-001** - 冷却水泵系统

### 监测点清单（部分）

#### 电池系统 (SYS-BAT-001)
- 总电压、SOC荷电状态、充电电流、放电电流
- 最高充电温度、最低充电温度、温差
- 绝缘电阻、保护功能故障、BMS通信故障 等

#### 推进系统 (SYS-PROP-L-001 / SYS-PROP-R-001)
- 电机转速、电机电压、电机功率
- 逆变器电压、逆变器电流
- 前轴承温度、后轴承温度、定子绕组温度 等

#### 逆变器系统 (SYS-INV-1-001 / SYS-INV-2-001)
- 输入直流电压、输出交流电流
- 过载电流、电抗器温度 等

完整监测点列表请参考: `docs/data/frontrequiredinfo/monitoring_and_alarm_definitions.md`

### 指标类型清单

- `voltage` - 电压
- `current` - 电流
- `temperature` - 温度
- `speed` - 转速
- `power` - 功率/电量
- `pressure` - 压力
- `level` - 液位
- `frequency` - 频率
- `resistance` - 电阻
- `switch` - 开关量

## JSON 模板说明

### 数据结构

```json
[
  {
    "equipmentId": "SYS-BAT-001",
    "equipmentName": "电池系统",
    "timestamp": "2025-01-01T10:00:00Z",
    "metrics": [
      {
        "monitoringPoint": "总电压",
        "metricType": "voltage",
        "value": 650.5,
        "unit": "V"
      }
    ]
  }
]
```

### 字段说明

- `equipmentId` (必填): 设备ID，必须是系统中已存在的设备
- `equipmentName` (可选): 设备名称，用于可读性
- `timestamp` (必填): 时间戳，ISO 8601格式
- `metrics` (必填): 监测指标数组
  - `monitoringPoint` (必填): 监测点名称（中文）
  - `metricType` (必填): 指标类型
  - `value` (必填): 数值
  - `unit` (可选): 单位

## 注意事项

1. **设备ID必须严格匹配**：使用 `SYS-BAT-001` 格式，不能使用旧格式（如 `battery-001`）
2. **监测点名称必须使用中文**：如 "总电压"、"电机转速" 等
3. **时间戳格式**：Excel使用 `YYYY-MM-DD HH:mm:ss`，JSON使用ISO 8601格式
4. **数值类型**：数值列必须是数字，不能包含文本
5. **批量导入建议**：单次导入不超过10000条记录

## 数据来源

模板中的设备ID和监测点命名严格遵循以下文档：
- `docs/data/frontrequiredinfo/monitoring_and_alarm_definitions.md`

## 更新日志

- 2024-12-08: 初始版本，支持Excel和JSON格式
- 2024-12-08: 更新设备ID为系统级设备格式（SYS-XXX-001）
