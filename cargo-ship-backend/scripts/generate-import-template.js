#!/usr/bin/env node
/**
 * 生成 Excel 和 JSON 导入模板脚本
 * 运行方式: node scripts/generate-import-template.js
 *
 * 数据来源: docs/data/frontrequiredinfo/monitoring_and_alarm_definitions.md
 * 设备ID和监测点命名严格遵循系统定义
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 模板数据 - 使用真实的设备ID和监测点名称
const templateData = [
  // 电池系统 (SYS-BAT-001) 示例数据
  {
    设备ID: 'SYS-BAT-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '总电压',
    指标类型: 'voltage',
    数值: 650.5,
    单位: 'V',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-BAT-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: 'SOC荷电状态',
    指标类型: 'power',
    数值: 85.5,
    单位: '%',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-BAT-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '充电电流',
    指标类型: 'current',
    数值: 120.3,
    单位: 'A',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-BAT-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '最高充电温度',
    指标类型: 'temperature',
    数值: 35.2,
    单位: '°C',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-BAT-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '绝缘电阻',
    指标类型: 'resistance',
    数值: 1800,
    单位: 'kΩ',
    数据质量: '正常',
  },

  // 左推进系统 (SYS-PROP-L-001) 示例数据
  {
    设备ID: 'SYS-PROP-L-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '电机转速',
    指标类型: 'speed',
    数值: 1500,
    单位: 'rpm',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-PROP-L-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '电机功率',
    指标类型: 'power',
    数值: 1200,
    单位: 'kW',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-PROP-L-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '前轴承温度',
    指标类型: 'temperature',
    数值: 65.3,
    单位: '°C',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-PROP-L-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '逆变器电压',
    指标类型: 'voltage',
    数值: 600,
    单位: 'V',
    数据质量: '正常',
  },

  // 右推进系统 (SYS-PROP-R-001) 示例数据
  {
    设备ID: 'SYS-PROP-R-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '电机转速',
    指标类型: 'speed',
    数值: 1498,
    单位: 'rpm',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-PROP-R-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '后轴承温度',
    指标类型: 'temperature',
    数值: 64.8,
    单位: '°C',
    数据质量: '正常',
  },

  // 1#日用逆变器系统 (SYS-INV-1-001) 示例数据
  {
    设备ID: 'SYS-INV-1-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '输入直流电压',
    指标类型: 'voltage',
    数值: 650,
    单位: 'V',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-INV-1-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '输出交流电流',
    指标类型: 'current',
    数值: 150,
    单位: 'A',
    数据质量: '正常',
  },

  // 直流配电板系统 (SYS-DCPD-001) 示例数据
  {
    设备ID: 'SYS-DCPD-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '直流母排电压',
    指标类型: 'voltage',
    数值: 648,
    单位: 'V',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-DCPD-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '绝缘电阻',
    指标类型: 'resistance',
    数值: 2000,
    单位: 'kΩ',
    数据质量: '正常',
  },

  // 舱底水系统 (SYS-BILGE-001) 示例数据
  {
    设备ID: 'SYS-BILGE-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '1#集水井水位',
    指标类型: 'level',
    数值: 50,
    单位: 'mm',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-BILGE-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '2#集水井水位',
    指标类型: 'level',
    数值: 45,
    单位: 'mm',
    数据质量: '正常',
  },

  // 冷却水泵系统 (SYS-COOL-001) 示例数据
  {
    设备ID: 'SYS-COOL-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '1#冷却水温',
    指标类型: 'temperature',
    数值: 28.5,
    单位: '°C',
    数据质量: '正常',
  },
  {
    设备ID: 'SYS-COOL-001',
    时间戳: '2025-01-01 10:00:00',
    监测点: '冷却水压力',
    指标类型: 'pressure',
    数值: 0.15,
    单位: 'MPa',
    数据质量: '正常',
  },
];

// JSON模板数据（更结构化的格式）
const jsonTemplateData = [
  {
    equipmentId: 'SYS-BAT-001',
    equipmentName: '电池系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '总电压',
        metricType: 'voltage',
        value: 650.5,
        unit: 'V',
      },
      {
        monitoringPoint: 'SOC荷电状态',
        metricType: 'power',
        value: 85.5,
        unit: '%',
      },
      {
        monitoringPoint: '充电电流',
        metricType: 'current',
        value: 120.3,
        unit: 'A',
      },
      {
        monitoringPoint: '最高充电温度',
        metricType: 'temperature',
        value: 35.2,
        unit: '°C',
      },
      {
        monitoringPoint: '绝缘电阻',
        metricType: 'resistance',
        value: 1800,
        unit: 'kΩ',
      },
    ],
  },
  {
    equipmentId: 'SYS-PROP-L-001',
    equipmentName: '左推进系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '电机转速',
        metricType: 'speed',
        value: 1500,
        unit: 'rpm',
      },
      {
        monitoringPoint: '电机功率',
        metricType: 'power',
        value: 1200,
        unit: 'kW',
      },
      {
        monitoringPoint: '前轴承温度',
        metricType: 'temperature',
        value: 65.3,
        unit: '°C',
      },
      {
        monitoringPoint: '逆变器电压',
        metricType: 'voltage',
        value: 600,
        unit: 'V',
      },
    ],
  },
  {
    equipmentId: 'SYS-PROP-R-001',
    equipmentName: '右推进系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '电机转速',
        metricType: 'speed',
        value: 1498,
        unit: 'rpm',
      },
      {
        monitoringPoint: '后轴承温度',
        metricType: 'temperature',
        value: 64.8,
        unit: '°C',
      },
    ],
  },
  {
    equipmentId: 'SYS-INV-1-001',
    equipmentName: '1#日用逆变器系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '输入直流电压',
        metricType: 'voltage',
        value: 650,
        unit: 'V',
      },
      {
        monitoringPoint: '输出交流电流',
        metricType: 'current',
        value: 150,
        unit: 'A',
      },
    ],
  },
  {
    equipmentId: 'SYS-DCPD-001',
    equipmentName: '直流配电板系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '直流母排电压',
        metricType: 'voltage',
        value: 648,
        unit: 'V',
      },
      {
        monitoringPoint: '绝缘电阻',
        metricType: 'resistance',
        value: 2000,
        unit: 'kΩ',
      },
    ],
  },
  {
    equipmentId: 'SYS-BILGE-001',
    equipmentName: '舱底水系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '1#集水井水位',
        metricType: 'level',
        value: 50,
        unit: 'mm',
      },
      {
        monitoringPoint: '2#集水井水位',
        metricType: 'level',
        value: 45,
        unit: 'mm',
      },
    ],
  },
  {
    equipmentId: 'SYS-COOL-001',
    equipmentName: '冷却水泵系统',
    timestamp: '2025-01-01T10:00:00Z',
    metrics: [
      {
        monitoringPoint: '1#冷却水温',
        metricType: 'temperature',
        value: 28.5,
        unit: '°C',
      },
      {
        monitoringPoint: '冷却水压力',
        metricType: 'pressure',
        value: 0.15,
        unit: 'MPa',
      },
    ],
  },
];

// 确保 templates 目录存在
const templatesDir = path.join(__dirname, '../templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

// ========================================
// 1. 生成 Excel 模板
// ========================================
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(templateData);

// 设置列宽
worksheet['!cols'] = [
  { wch: 18 }, // 设备ID
  { wch: 20 }, // 时间戳
  { wch: 18 }, // 监测点
  { wch: 15 }, // 指标类型
  { wch: 12 }, // 数值
  { wch: 10 }, // 单位
  { wch: 12 }, // 数据质量
];

// 添加工作表到工作簿
XLSX.utils.book_append_sheet(workbook, worksheet, '时序数据');

// 写入 Excel 文件
const excelOutputPath = path.join(templatesDir, 'import-template.xlsx');
XLSX.writeFile(workbook, excelOutputPath);
console.log(`✅ Excel 导入模板已生成: ${excelOutputPath}`);

// ========================================
// 1.5 生成 CSV 模板
// ========================================
const csvOutputPath = path.join(templatesDir, 'import-template.csv');
XLSX.writeFile(workbook, csvOutputPath, { bookType: 'csv' });
console.log(`✅ CSV 导入模板已生成: ${csvOutputPath}`);

// ========================================
// 2. 生成 JSON 模板
// ========================================
const jsonOutputPath = path.join(templatesDir, 'import-template.json');
fs.writeFileSync(
  jsonOutputPath,
  JSON.stringify(jsonTemplateData, null, 2),
  'utf-8',
);
console.log(`✅ JSON 导入模板已生成: ${jsonOutputPath}`);

// ========================================
// 3. 生成模板说明文档
// ========================================
const readmePath = path.join(templatesDir, 'README.md');
const readmeContent = `# 导入模板说明

本目录包含时序数据导入模板，支持 Excel 和 JSON 两种格式。

## 文件列表

- \`import-template.xlsx\` - Excel格式模板
- \`import-template.json\` - JSON格式模板
- \`README.md\` - 本说明文档

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

完整监测点列表请参考: \`docs/data/frontrequiredinfo/monitoring_and_alarm_definitions.md\`

### 指标类型清单

- \`voltage\` - 电压
- \`current\` - 电流
- \`temperature\` - 温度
- \`speed\` - 转速
- \`power\` - 功率/电量
- \`pressure\` - 压力
- \`level\` - 液位
- \`frequency\` - 频率
- \`resistance\` - 电阻
- \`switch\` - 开关量

## JSON 模板说明

### 数据结构

\`\`\`json
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
\`\`\`

### 字段说明

- \`equipmentId\` (必填): 设备ID，必须是系统中已存在的设备
- \`equipmentName\` (可选): 设备名称，用于可读性
- \`timestamp\` (必填): 时间戳，ISO 8601格式
- \`metrics\` (必填): 监测指标数组
  - \`monitoringPoint\` (必填): 监测点名称（中文）
  - \`metricType\` (必填): 指标类型
  - \`value\` (必填): 数值
  - \`unit\` (可选): 单位

## 注意事项

1. **设备ID必须严格匹配**：使用 \`SYS-BAT-001\` 格式，不能使用旧格式（如 \`battery-001\`）
2. **监测点名称必须使用中文**：如 "总电压"、"电机转速" 等
3. **时间戳格式**：Excel使用 \`YYYY-MM-DD HH:mm:ss\`，JSON使用ISO 8601格式
4. **数值类型**：数值列必须是数字，不能包含文本
5. **批量导入建议**：单次导入不超过10000条记录

## 数据来源

模板中的设备ID和监测点命名严格遵循以下文档：
- \`docs/data/frontrequiredinfo/monitoring_and_alarm_definitions.md\`

## 更新日志

- 2024-12-08: 初始版本，支持Excel和JSON格式
- 2024-12-08: 更新设备ID为系统级设备格式（SYS-XXX-001）
`;

fs.writeFileSync(readmePath, readmeContent, 'utf-8');
console.log(`✅ 模板说明文档已生成: ${readmePath}`);

console.log('\n========================================');
console.log('🎉 所有模板文件生成完成！');
console.log('========================================');
console.log('📁 输出目录:', templatesDir);
console.log('📄 文件清单:');
console.log('   - import-template.xlsx (Excel模板)');
console.log('   - import-template.csv (CSV模板)');
console.log('   - import-template.json (JSON模板)');
console.log('   - README.md (使用说明)');
console.log('========================================\n');
