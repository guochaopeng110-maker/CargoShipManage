# 系统告警触发机制分析

## 问题

`MonitoringService` 在接收到新的时间序列数据时，仅将其保存到数据库，但并未发现有逻辑去调用 `AlarmService` 来检查数据是否违反了阈值规则，从而自动生成告警。这中间的自动化处理环节似乎是缺失的。

## 分析

在典型的事件驱动或实时处理架构中，数据验证和告警生成通常是一个异步过程，以避免阻塞主要的数据接收流程。这个过程可以通过以下几种方式实现：

1.  **事件驱动模型 (Event-Driven)**：当新数据成功保存后，发出一个事件，由专门的监听者服务来处理后续的规则检查。
2.  **消息队列 (Message Queue)**：将新数据推送到消息队列（如 Kafka, RabbitMQ），由一个或多个消费者（Worker）服务来异步处理阈值检查。
3.  **定时任务 (Cron Job)**：设置一个定时任务，定期（如每秒或每分钟）从数据库中拉取新数据进行批量检查。

对于本项目 (基于 NestJS)，**事件驱动模型** 是最优雅、最符合其架构风格的实现方式。

## 推荐实现方案：事件驱动模型

下面描述如何通过 NestJS 的事件机制来补全这个自动化的告警触发逻辑。

### 1. 定义并发出事件

首先，修改 `MonitoringService`，使其在成功保存数据后，发出一个全局事件。

**文件**: `src/modules/monitoring/monitoring.service.ts`

**修改建议**:
注入 `EventEmitter2` 并在 `receiveMonitoringData` 方法的末尾发射一个事件。

```typescript
// 需先安装并配置好 @nestjs/event-emitter 模块
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TimeSeriesData } from '../../database/entities';
import { CreateTimeSeriesDataDto } from './dto';

@Injectable()
export class MonitoringService {
  constructor(
    // ... 其他依赖
    private readonly eventEmitter: EventEmitter2, // 注入事件发射器
  ) {}

  async receiveMonitoringData(
    createDto: CreateTimeSeriesDataDto,
  ): Promise<TimeSeriesData> {
    // ... (此处为原有的数据验证和保存逻辑)
    const savedData = await this.timeSeriesDataRepository.save(timeSeriesData);
    
    this.logger.log(
      `成功接收监测数据: 设备=${createDto.equipmentId}, 指标=${createDto.metricType}`,
    );

    // 关键步骤：发出一个名为 'timeseries.data.received' 的事件
    // 将新保存的数据作为载荷（payload）传递出去
    this.eventEmitter.emit(
      'timeseries.data.received',
      savedData
    );

    return savedData;
  }
}
```

### 2. 监听事件并处理告警逻辑

然后，在 `AlarmService` 中创建一个方法来监听并处理这个事件。

**文件**: `src/modules/alarm/alarm.service.ts`

**修改建议**:
使用 `@OnEvent()` 装饰器创建一个事件监听器，该监听器会在 `timeseries.data.received` 事件发生时自动执行。

```typescript
// 需从 @nestjs/event-emitter 导入 OnEvent
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { TimeSeriesData } from '../../database/entities';
import { ThresholdService } from './threshold.service';
import { AlarmPushService } from './alarm-push.service';

@Injectable()
export class AlarmService {
  constructor(
    // ... 其他依赖
    private readonly thresholdService: ThresholdService,
    private readonly alarmPushService: AlarmPushService,
  ) {}

  /**
   * 监听“新数据已接收”事件
   * @param payload - 从事件中传递过来的 TimeSeriesData 对象
   */
  @OnEvent('timeseries.data.received')
  async handleDataReceived(payload: TimeSeriesData) {
    this.logger.debug(`收到新数据事件，开始检查告警规则: 设备=${payload.equipmentId}, 指标=${payload.metricType}`);

    // 1. 获取该设备针对该指标的所有已启用的阈值规则
    // (假设 ThresholdService 中有此方法)
    const rules = await this.thresholdService.findEnabledByEquipmentAndMetric(
      payload.equipmentId,
      payload.metricType,
    );

    if (rules.length === 0) {
      return; // 没有匹配的规则，直接返回
    }

    // 2. 遍历所有适用规则，检查是否触发
    for (const rule of rules) {
      // 检查当前值是否超出阈值
      if (rule.isTriggered(Number(payload.value))) {
        
        // 注意：'duration'（持续时间）的判断逻辑需要更复杂的实现。
        // 一个简单实现可能需要查询该指标在过去 `duration` 毫秒内的数据，
        // 确认它们是否都超出了阈值。为简化说明，此处暂时省略。
        
        this.logger.warn(`告警规则触发: 设备=${payload.equipmentId}, 规则ID=${rule.id}, 数值=${payload.value}`);

        // 3. 如果触发，调用 create 方法创建告警记录
        const newAlarm = await this.create({
          equipmentId: payload.equipmentId,
          thresholdId: rule.id,
          abnormalMetricType: payload.metricType,
          abnormalValue: Number(payload.value),
          thresholdRange: rule.getThresholdDescription(), // 从规则中获取描述
          triggeredAt: payload.timestamp,
          severity: rule.severity, // 从规则中获取严重等级
        });

        // 4. (可选) 通过WebSocket实时推送新告警
        await this.alarmPushService.pushNewAlarm(newAlarm);
      }
    }
  }

  // ... AlarmService 的其他方法 ...
}
```

### 总结

通过引入事件驱动机制，我们可以在不修改 `MonitoringService` 核心职责的前提下，优雅地将“数据接收”和“告警检查”这两个业务逻辑解耦。这种方式使得系统具有更好的扩展性和可维护性，也厘清了服务之间的职责边界。当前项目中正是缺少了这一环，补充上即可实现完整的自动化告警流程。
