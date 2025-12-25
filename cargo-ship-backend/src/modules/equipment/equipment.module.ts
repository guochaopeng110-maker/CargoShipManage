import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { EquipmentPushService } from './equipment-push.service';
import { Equipment } from '../../database/entities/equipment.entity';
import { MonitoringPoint } from '../../database/entities/monitoring-point.entity';
import { AuthModule } from '../auth/auth.module';
import { WebsocketModule } from '../websocket/websocket.module';

/**
 * 设备管理模块
 * 提供设备台账管理和监测点元数据管理的完整功能
 * 集成WebSocket实时推送
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Equipment, MonitoringPoint]),
    AuthModule, // 导入 AuthModule 以使用 AuditService
    WebsocketModule, // 导入WebSocket模块用于实时推送
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentPushService],
  exports: [EquipmentService, EquipmentPushService], // 导出服务供其他模块使用
})
export class EquipmentModule {}
