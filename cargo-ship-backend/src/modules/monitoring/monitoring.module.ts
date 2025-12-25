import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringPushService } from './monitoring-push.service';
import { DataQualityService } from './data-quality.service';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { EquipmentModule } from '../equipment/equipment.module';
import { AlarmModule } from '../alarm/alarm.module';
import { WebsocketModule } from '../websocket/websocket.module';

/**
 * 监测数据模块
 *
 * 提供设备监测数据的采集、存储、查询、统计等功能
 * 集成告警模块,实现数据到达时自动评估告警
 * 集成设备模块,实现监测点校验和单位自动补全
 * 集成 WebSocket 模块,实现监测数据实时推送
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TimeSeriesData, Equipment]),
    EquipmentModule, // 导入设备模块以使用监测点校验服务
    AlarmModule, // 导入告警模块以使用告警评估和推送服务
    WebsocketModule, // 导入 WebSocket 模块以使用实时推送功能
  ],
  controllers: [MonitoringController],
  providers: [MonitoringService, DataQualityService, MonitoringPushService],
  exports: [MonitoringService, DataQualityService, MonitoringPushService],
})
export class MonitoringModule {}
