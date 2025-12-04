import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { DataQualityService } from './data-quality.service';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { Equipment } from '../../database/entities/equipment.entity';

/**
 * 监测数据模块
 *
 * 提供设备监测数据的采集、存储、查询、统计等功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([TimeSeriesData, Equipment])],
  controllers: [MonitoringController],
  providers: [MonitoringService, DataQualityService],
  exports: [MonitoringService, DataQualityService],
})
export class MonitoringModule {}
