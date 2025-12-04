import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthReport } from '../../database/entities/health-report.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { ReportService } from './report.service';
import { HealthAssessmentService } from './health-assessment.service';
import { ExportService } from './export.service';
import { ReportController } from './report.controller';

/**
 * 健康报告模块
 * 提供设备健康评估报告的生成和查询功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      HealthReport,
      TimeSeriesData,
      AlarmRecord,
      Equipment,
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService, HealthAssessmentService, ExportService],
  exports: [ReportService, HealthAssessmentService, ExportService],
})
export class ReportModule {}
