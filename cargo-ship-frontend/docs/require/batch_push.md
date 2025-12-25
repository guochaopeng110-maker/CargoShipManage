后端已完成批量数据推送功能的实施，现需要前端团队配合实现相关的 WebSocket 事件监听和数据处理逻辑。
## 🔌 新增 WebSocket 事件

### 1. `monitoring:batch-data` - 批量监测数据推送

**用途**: 用于批量上报和文件导入场景的数据推送，替代原有的单条推送方式。

**触发场景**:
- 用户通过 API 批量上报监测数据
- 用户通过文件导入历史数据

**事件名称**: `monitoring:batch-data`

**推送频率**: 
- 数据按设备分组
- 每个设备的数据分片推送（100条/片）
- 分片间隔 10ms

---

## 📦 消息数据格式

### 完整消息结构

```typescript
interface MonitoringBatchDataMessage {
  batchId: string;           // 批次唯一标识 (UUID)
  equipmentId: string;       // 设备业务编号 (如 "SYS-BAT-001")
  data: MonitoringDataItem[]; // 监测数据数组 (最多100条)
  chunkIndex: number;        // 当前分片序号 (从1开始)
  totalChunks: number;       // 总分片数
  isHistory: boolean;        // 是否为历史数据 (true=文件导入, false=实时上报)
}

interface MonitoringDataItem {
  id: number;                // 数据库记录ID
  timestamp: string;         // 时间戳 (ISO 8601格式)
  metricType: string;        // 指标类型 (voltage, temperature, pressure等)
  monitoringPoint: string | null; // 监测点名称 (如"总电压", "单体最高温度")
  value: number;             // 指标数值
  unit: string;              // 单位 (V, ℃, MPa等)
  quality: number;           // 数据质量 (192=正常, 其他值表示异常)
  source: string;            // 数据来源 (sensor-upload, file-import, manual-entry)
}
```

### 示例消息

```json
{
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "equipmentId": "SYS-BAT-001",
  "data": [
    {
      "id": 12345,
      "timestamp": "2025-12-25T10:00:00.000Z",
      "metricType": "voltage",
      "monitoringPoint": "总电压",
      "value": 650.5,
      "unit": "V",
      "quality": 192,
      "source": "file-import"
    },
    {
      "id": 12346,
      "timestamp": "2025-12-25T10:00:01.000Z",
      "metricType": "temperature",
      "monitoringPoint": "单体最高温度",
      "value": 45.2,
      "unit": "℃",
      "quality": 192,
      "source": "file-import"
    }
    // ... 最多100条数据
  ],
  "chunkIndex": 1,
  "totalChunks": 5,
  "isHistory": true
}
```


## 📋 数据量建议

后端已设置以下限制，前端应配合校验：

| 场景 | 单次最大数据量 | 分片数 | 预计耗时 |
| :--- | :--- | :--- | :--- |
| 批量上报 | 10,000 条 | ~100 片 | ~10 秒 |
| 文件导入 | 50,000 条 | ~500 片 | ~50 秒 |

**前端文件上传校验**：

```typescript
function validateFileBeforeUpload(file: File, parsedData: any[]) {
  const MAX_RECORDS = 50000;
  
  if (parsedData.length > MAX_RECORDS) {
    showError(
      `文件数据量过大：当前 ${parsedData.length.toLocaleString()} 条，最多支持 ${MAX_RECORDS.toLocaleString()} 条。\n\n` +
      `建议：\n` +
      `1. 将数据拆分为多个文件\n` +
      `2. 按时间段（如每月）拆分\n` +
      `3. 按设备拆分`
    );
    return false;
  }
  
  return true;
}
```


### 现有事件（保持不变）

- `monitoring:new-data` - 单条监测数据推送
  - **用途**: 单条上报的实时推送
  - **何时触发**: 单条数据保存成功后
  - **前端处理**: 保持现有逻辑不变

### 新增事件

- `monitoring:batch-data` - 批量监测数据推送
  - **用途**: 批量上报和文件导入
  - **何时触发**: 批量数据保存成功后
  - **前端处理**: 需要新增监听和处理逻辑

**两者共存，互不影响**。前端应同时监听两个事件。