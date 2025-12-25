# 实时监测数据发送前端展示机制分析

您提出了一个非常好的问题，这同样触及了系统实时性的关键环节。您的观察非常敏锐，`WebSocket` 模块确实存在，但它与 `MonitoringService` (数据接收服务) 的直接关联在当前代码中是缺失的。

和告警触发机制类似，这同样是一个需要“桥梁”来连接的逻辑。我将为您分步解析这个实时展示功能应该如何实现，并指出当前代码中对应的部分和缺失的部分。

### **实时数据推送的完整流程 (理论与实践)**

这个流程的核心思想是：当后端收到新数据时，它需要知道应该把这条数据推送给哪些正打开前端页面的用户。这通过 **“订阅/发布”** 模式来实现，而 WebSocket 的 **“房间 (Room)”** 机制是实现这种模式的绝佳工具。

---

#### **第一步：前端的“订阅”行为**

当用户在前端打开某个特定设备的实时监控页面时，前端的 WebSocket 客户端会向后端发送一个“订阅”消息。

1.  **动作**: 用户访问设备 "MOTOR-L-001" 的监控页。
2.  **前端代码 (示意)**:
    ```javascript
    // 连接到WebSocket服务器
    const socket = io("http://localhost:3001/ws", { auth: { token: "用户的JWT令牌" } });

    // 一旦连接成功，就发送订阅消息
    socket.on('connected', () => {
      console.log('WebSocket已连接，订阅设备数据...');
      socket.emit('subscribe:equipment', { equipmentId: 'MOTOR-L-001' });
    });
    ```
3.  **后端处理**:
    *   后端的 `WebsocketGateway` 会接收这个 `subscribe:equipment` 消息。
    *   它会找到发送此消息的客户端 (Socket)，并将其加入一个以设备ID命名的“房间”，例如 `equipment:MOTOR-L-001`。

    我们可以在 `src/modules/websocket/websocket.gateway.ts` 文件中找到处理这个逻辑的方法：
    ```typescript
    @SubscribeMessage('subscribe:equipment')
    handleSubscribeEquipment(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { equipmentId: string },
    ) {
      // ... 认证逻辑 ...
      const roomName = `equipment:${data.equipmentId}`;
      void client.join(roomName); // 将客户端加入房间
      this.logger.log(`用户 ${auth.username} 订阅设备房间: ${roomName}`);
      // ...
    }
    ```
    现在，所有正在查看 "MOTOR-L-001" 页面的用户客户端，都在 `equipment:MOTOR-L-001` 这个房间里了。

---

#### **第二步：后端的“发布”行为 (当前缺失的环节)**

这是连接数据接收和数据推送的关键一步，也是当前项目中未实现的一环。当 `MonitoringService` 接收并保存新数据后，它需要通知 `WebsocketGateway` 将这条数据发送给已经订阅了该设备的客户端。

**如何实现这个连接？**

为了连接 `MonitoringService` 和 `WebsocketGateway`，我们需要在 `MonitoringService` 中注入 `WebsocketGateway` 实例，并调用其方法推送数据。

1.  **修改 `MonitoringModule`**:
    首先，需要让 `MonitoringModule` 能够访问到 `WebsocketModule` 提供的服务。

    **文件**: `src/modules/monitoring/monitoring.module.ts`
    ```typescript
    import { Module } from '@nestjs/common';
    import { WebsocketModule } from '../websocket/websocket.module'; // <--- 导入Websocket模块
    // ... 其他导入

    @Module({
      imports: [
        TypeOrmModule.forFeature([TimeSeriesData, Equipment]),
        WebsocketModule, // <--- 在imports数组中加入
      ],
      controllers: [MonitoringController],
      providers: [MonitoringService, DataQualityService],
      exports: [MonitoringService, DataQualityService],
    })
    export class MonitoringModule {}
    ```

2.  **修改 `MonitoringService`**:
    现在可以在 `MonitoringService` 中注入 `WebsocketGateway` 并调用它的推送方法。

    **文件**: `src/modules/monitoring/monitoring.service.ts`
    ```typescript
    import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository, DataSource } from 'typeorm';
    import { TimeSeriesData, MetricType, DataSource as DataSourceEnum } from '../../database/entities/time-series-data.entity';
    import { Equipment } from '../../database/entities/equipment.entity';
    import { CreateTimeSeriesDataDto, CreateBatchTimeSeriesDataDto, QueryTimeSeriesDataDto } from './dto';
    import { DataQualityService } from './data-quality.service';
    import { WebsocketGateway } from '../websocket/websocket.gateway'; // <--- 导入WebsocketGateway

    @Injectable()
    export class MonitoringService {
      private readonly logger = new Logger(MonitoringService.name);

      constructor(
        @InjectRepository(TimeSeriesData)
        private readonly timeSeriesDataRepository: Repository<TimeSeriesData>,
        @InjectRepository(Equipment)
        private readonly equipmentRepository: Repository<Equipment>,
        private readonly dataSource: DataSource,
        private readonly dataQualityService: DataQualityService,
        private readonly websocketGateway: WebsocketGateway, // <--- 注入WebsocketGateway
      ) {}

      async receiveMonitoringData(
        createDto: CreateTimeSeriesDataDto,
      ): Promise<TimeSeriesData> {
        // ... (原有的数据验证和保存逻辑，此处省略，详见原文件)
        const equipment = await this.equipmentRepository.findOne({ /* ... */ });
        if (!equipment) throw new NotFoundException(`设备不存在: ${createDto.equipmentId}`);
        const unit = createDto.unit || TimeSeriesData.getStandardUnit(createDto.metricType);
        const qualityCheck = this.dataQualityService.checkDataQuality(createDto.metricType, createDto.value, createDto.timestamp, unit);
        const quality = createDto.quality || qualityCheck.quality;
        const source = createDto.source || DataSourceEnum.SENSOR_UPLOAD;

        const timeSeriesData = this.timeSeriesDataRepository.create({
          equipmentId: createDto.equipmentId,
          timestamp: createDto.timestamp,
          metricType: createDto.metricType,
          value: createDto.value,
          unit,
          quality,
          source,
        });

        try {
          const savedData = await this.timeSeriesDataRepository.save(timeSeriesData);
          this.logger.log(`成功接收监测数据: 设备=${createDto.equipmentId}, 指标=${createDto.metricType}, 值=${createDto.value}`);

          // --- 关键的推送步骤：调用WebsocketGateway的方法 ---
          this.websocketGateway.sendToEquipment(
            savedData.equipmentId,        // 目标房间 (例如 'equipment:MOTOR-L-001')
            'equipment:data:realtime',    // 事件名称 (前端根据此名称接收)
            {                             // 推送的数据载荷
              metricType: savedData.metricType,
              value: savedData.value,
              unit: savedData.unit,
              timestamp: savedData.timestamp.toISOString(),
              quality: savedData.quality, // 可以包含数据质量等更多信息
            }
          );
          // --------------------------------------------------

          return savedData;
        } catch (error) {
          this.logger.error(`保存监测数据失败: ${error.message}`, error.stack);
          throw new BadRequestException('保存监测数据失败');
        }
      }

      // ... MonitoringService 的其他方法 ...
    }
    ```

---

#### **第三步：前端的“接收”行为**

前端订阅了房间后，就可以监听 `equipment:data:realtime` 事件来接收并展示新数据。

**前端代码 (示意)**:
```javascript
// 监听来自后端的实时数据事件
socket.on('equipment:data:realtime', (data) => {
  console.log('收到新的实时数据:', data);
  // 在图表上添加一个新的数据点
  // 更新仪表盘上的数值
  // ...
});
```

### **总结**

您的观察非常准确。项目中虽然已经构建了 `WebsocketGateway` 这样一个强大的实时通信工具，并设计了按设备、按角色划分的房间机制，但在最关键的数据源头——`MonitoringService`——并没有调用它来推送实时数据。

通过上面描述的修改（即在 `MonitoringModule` 中导入 `WebsocketModule`，并在 `MonitoringService` 中注入 `WebsocketGateway` 实例，然后在数据保存后调用 `sendToEquipment` 方法），就可以将数据接收与实时推送这两个环节无缝地连接起来，从而实现您所期望的实时展示功能。
