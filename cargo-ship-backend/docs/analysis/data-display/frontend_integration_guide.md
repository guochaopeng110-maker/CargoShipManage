# 前端团队对接指南 - 批量数据推送

## 📋 概述

后端已完成批量数据推送功能的实施，现需要前端团队配合实现相关的 WebSocket 事件监听和数据处理逻辑。本文档提供完整的接口定义、数据格式和实现建议。

---

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

---

## 🎯 前端实现建议

### 1. 监听事件

```typescript
// 在设备详情页或数据监控页面监听批量数据推送
socket.on('monitoring:batch-data', (message: MonitoringBatchDataMessage) => {
  handleBatchData(message);
});
```

### 2. 数据处理策略

#### 策略 A: 立即渲染（推荐用于实时上报）

适用场景：数据量较小（< 1000条），需要实时展示

```typescript
function handleBatchData(message: MonitoringBatchDataMessage) {
  // 1. 验证设备ID是否匹配当前页面
  if (message.equipmentId !== currentEquipmentId) {
    return;
  }

  // 2. 直接追加到图表数据
  const chartData = message.data.map(item => ({
    time: new Date(item.timestamp).getTime(),
    value: item.value,
    quality: item.quality,
  }));

  // 3. 更新图表
  chart.appendData(chartData);

  // 4. 显示进度（可选）
  if (message.chunkIndex < message.totalChunks) {
    showProgress(message.chunkIndex, message.totalChunks);
  } else {
    hideProgress();
  }
}
```

#### 策略 B: 缓冲后渲染（推荐用于历史导入）

适用场景：数据量大（> 1000条），避免频繁重绘

```typescript
// 全局缓冲区（按 batchId 分组）
const batchDataBuffer = new Map<string, {
  equipmentId: string;
  chunks: Map<number, MonitoringDataItem[]>;
  totalChunks: number;
  isHistory: boolean;
}>();

function handleBatchData(message: MonitoringBatchDataMessage) {
  const { batchId, equipmentId, data, chunkIndex, totalChunks, isHistory } = message;

  // 1. 初始化或更新缓冲区
  if (!batchDataBuffer.has(batchId)) {
    batchDataBuffer.set(batchId, {
      equipmentId,
      chunks: new Map(),
      totalChunks,
      isHistory,
    });
  }

  const buffer = batchDataBuffer.get(batchId)!;
  buffer.chunks.set(chunkIndex, data);

  // 2. 显示进度
  const receivedChunks = buffer.chunks.size;
  showProgress(receivedChunks, totalChunks);

  // 3. 检查是否接收完整
  if (receivedChunks === totalChunks) {
    // 3.1 合并所有分片（按 chunkIndex 排序）
    const allData: MonitoringDataItem[] = [];
    for (let i = 1; i <= totalChunks; i++) {
      const chunk = buffer.chunks.get(i);
      if (chunk) {
        allData.push(...chunk);
      }
    }

    // 3.2 按时间戳排序（确保数据顺序）
    allData.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // 3.3 批量更新图表
    renderBatchData(equipmentId, allData, isHistory);

    // 3.4 清理缓冲区
    batchDataBuffer.delete(batchId);
    hideProgress();
  }
}

function renderBatchData(
  equipmentId: string,
  data: MonitoringDataItem[],
  isHistory: boolean
) {
  if (equipmentId !== currentEquipmentId) {
    return;
  }

  // 根据 isHistory 决定渲染方式
  if (isHistory) {
    // 历史数据：替换全部数据（或合并到现有数据）
    chart.setOption({
      series: [{
        data: data.map(item => [
          new Date(item.timestamp).getTime(),
          item.value
        ])
      }]
    });
  } else {
    // 实时数据：追加到现有数据
    chart.appendData({
      series: [{
        data: data.map(item => [
          new Date(item.timestamp).getTime(),
          item.value
        ])
      }]
    });
  }
}
```

### 3. 进度显示

```typescript
function showProgress(current: number, total: number) {
  const percentage = Math.round((current / total) * 100);
  
  // 更新进度条
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `接收数据中... ${current}/${total} (${percentage}%)`;
  
  // 显示进度条容器
  progressContainer.style.display = 'block';
}

function hideProgress() {
  progressContainer.style.display = 'none';
}
```

### 4. 错误处理

```typescript
// 超时处理：如果30秒内未接收完整，清理缓冲区
const BATCH_TIMEOUT = 30000; // 30秒

const batchTimers = new Map<string, NodeJS.Timeout>();

function handleBatchData(message: MonitoringBatchDataMessage) {
  const { batchId } = message;

  // 清除旧的定时器
  if (batchTimers.has(batchId)) {
    clearTimeout(batchTimers.get(batchId)!);
  }

  // 设置新的定时器
  const timer = setTimeout(() => {
    console.warn(`批次 ${batchId} 接收超时，已清理缓冲区`);
    batchDataBuffer.delete(batchId);
    batchTimers.delete(batchId);
    
    // 显示错误提示
    showErrorMessage('数据接收超时，请刷新页面重试');
  }, BATCH_TIMEOUT);

  batchTimers.set(batchId, timer);

  // ... 其余处理逻辑 ...

  // 接收完成后清理定时器
  if (receivedChunks === totalChunks) {
    clearTimeout(timer);
    batchTimers.delete(batchId);
  }
}
```

---

## 📊 图表渲染优化建议

### 1. 使用 ECharts 的增量渲染

```typescript
// 对于大数据量，使用 ECharts 的 appendData 方法
chart.appendData({
  seriesIndex: 0,
  data: newDataPoints,
});

// 或使用 dataZoom 限制可见范围
option.dataZoom = [{
  type: 'inside',
  start: 90,  // 只显示最后10%的数据
  end: 100
}];
```

### 2. 虚拟滚动（数据表格场景）

```typescript
// 使用虚拟滚动库（如 react-window, vue-virtual-scroller）
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={batchData.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {formatDataRow(batchData[index])}
    </div>
  )}
</FixedSizeList>
```

### 3. 节流渲染

```typescript
import { throttle } from 'lodash';

// 批量数据积累后统一渲染，避免频繁更新
const pendingData: MonitoringDataItem[] = [];

const flushPendingData = throttle(() => {
  if (pendingData.length > 0) {
    chart.appendData(pendingData);
    pendingData.length = 0;
  }
}, 500); // 每500ms最多渲染一次

function handleBatchData(message: MonitoringBatchDataMessage) {
  pendingData.push(...message.data);
  flushPendingData();
}
```

---

## ⚠️ 注意事项

### 1. 消息顺序性

- ✅ 后端已确保同一批次的分片按序发送
- ✅ 前端应按 `chunkIndex` 排序合并数据
- ⚠️ 不同批次可能交叉到达，使用 `batchId` 区分

### 2. 内存管理

```typescript
// 定期清理过期的缓冲区（避免内存泄漏）
setInterval(() => {
  const now = Date.now();
  for (const [batchId, buffer] of batchDataBuffer.entries()) {
    // 如果缓冲区超过5分钟未更新，清理
    if (now - buffer.lastUpdateTime > 300000) {
      console.warn(`清理过期批次: ${batchId}`);
      batchDataBuffer.delete(batchId);
    }
  }
}, 60000); // 每分钟检查一次
```

### 3. 数据去重

```typescript
// 使用 batchId + chunkIndex 组合键避免重复处理
const processedChunks = new Set<string>();

function handleBatchData(message: MonitoringBatchDataMessage) {
  const key = `${message.batchId}-${message.chunkIndex}`;
  
  if (processedChunks.has(key)) {
    console.warn(`重复的分片，已忽略: ${key}`);
    return;
  }
  
  processedChunks.add(key);
  
  // ... 处理逻辑 ...
}
```

### 4. 跨页面状态同步

```typescript
// 如果用户在接收数据时切换页面，缓冲区应保留
// 使用 Vuex/Redux 等状态管理工具存储缓冲区

// Vuex 示例
const store = createStore({
  state: {
    batchDataBuffers: new Map(),
  },
  mutations: {
    ADD_BATCH_CHUNK(state, { batchId, chunkIndex, data }) {
      // ... 更新缓冲区 ...
    },
  },
});
```

---

## 🧪 测试建议

### 测试场景 1: 小批量实时数据

```
模拟：批量上报 100 条数据
预期：前端接收 1 个分片，立即渲染
验证：图表正常显示，无卡顿
```

### 测试场景 2: 大批量历史数据

```
模拟：文件导入 5000 条数据
预期：前端接收 50 个分片（每片100条）
验证：
  - 进度条正常显示（0% → 100%）
  - 数据按时间排序
  - 图表渲染完整
  - 无内存泄漏
```

### 测试场景 3: 网络中断恢复

```
模拟：接收到一半时断开网络，30秒后恢复
预期：
  - 缓冲区超时清理
  - 显示错误提示
  - 不影响后续数据接收
```

### 测试场景 4: 多设备并发

```
模拟：同时打开 3 个设备的监控页面，各自接收批量数据
预期：
  - 每个页面只处理自己的设备数据
  - 互不干扰
```

---

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

---

## �� 与现有事件的关系

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

---

## 📞 技术支持

### 后端接口文档

- Swagger 文档: `http://localhost:3000/api/docs`
- WebSocket 事件文档: `docs/websocket-events.md`

### 联系方式

如有疑问，请联系后端团队：
- 技术负责人: [姓名]
- 微信群: [群名称]
- 邮箱: [邮箱地址]

---

## ✅ 验收标准

前端完成以下功能即视为对接完成：

1. ✅ 监听 `monitoring:batch-data` 事件
2. ✅ 正确解析消息格式
3. ✅ 实现数据缓冲和排序逻辑
4. ✅ 显示接收进度（`chunkIndex / totalChunks`）
5. ✅ 批量渲染图表，无卡顿
6. ✅ 处理超时和错误场景
7. ✅ 通过上述 4 个测试场景

---

## 📝 更新日志

| 日期 | 版本 | 说明 |
| :--- | :--- | :--- |
| 2025-12-25 | v1.0 | 初始版本，定义批量数据推送接口 |
