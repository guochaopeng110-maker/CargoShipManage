import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { ExportService } from './export.service';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { HealthReport } from '../../database/entities/health-report.entity';

/**
 * 查询与统计模块
 *
 * 提供数据查询、统计分析、数据导出等功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      TimeSeriesData,
      AlarmRecord,
      HealthReport,
    ]),
  ],
  controllers: [QueryController],
  providers: [QueryService, ExportService],
  exports: [QueryService, ExportService],
})
export class QueryModule {}
