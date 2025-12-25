import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FileParserService } from './file-parser.service';
import { ImportRecord } from '../../database/entities/import-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmModule } from '../alarm/alarm.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { EquipmentModule } from '../equipment/equipment.module';

/**
 * 数据导入模块
 * 提供历史时间序列数据文件导入功能
 *
 * 增强功能:
 * - 导入历史数据后自动评估告警阈值
 * - 导入完成后通过 WebSocket 推送最新数据
 * - 集成监测点校验:导入时校验监测点有效性(软校验模式)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ImportRecord, Equipment, TimeSeriesData]),
    AlarmModule,
    WebsocketModule,
    MonitoringModule,
    EquipmentModule, // 导入设备模块用于监测点校验
  ],
  controllers: [ImportController],
  providers: [ImportService, FileParserService],
  exports: [ImportService, FileParserService],
})
export class ImportModule {}
