import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlarmController } from './alarm.controller';
import { ThresholdService } from './threshold.service';
import { AlarmService } from './alarm.service';
import { AlarmPushService } from './alarm-push.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { EquipmentModule } from '../equipment/equipment.module';
import {
  ThresholdConfig,
  AlarmRecord,
  Equipment,
} from '../../database/entities';

/**
 * 告警管理模块
 *
 * 提供阈值配置和告警记录管理功能
 * 集成监测点校验:在创建/更新阈值配置时校验监测点有效性
 * 集成WebSocket实时推送
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ThresholdConfig, AlarmRecord, Equipment]),
    WebsocketModule, // 导入WebSocket模块用于实时推送
    EquipmentModule, // 导入设备模块用于监测点校验
  ],
  controllers: [AlarmController],
  providers: [ThresholdService, AlarmService, AlarmPushService],
  exports: [ThresholdService, AlarmService, AlarmPushService],
})
export class AlarmModule {}
