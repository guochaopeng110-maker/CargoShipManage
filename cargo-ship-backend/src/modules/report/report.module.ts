import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; // 导入HttpModule
import { HealthReport } from '../../database/entities/health-report.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { ReportService } from './report.service';
import { HealthAssessmentService } from './health-assessment.service';
import { ExportService } from './export.service';
import { ReportController } from './report.controller';
import { ThirdPartyHealthService } from './third-party-health.service'; // 导入第三方服务

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
    // 注册HttpModule，用于请求第三方健康评估API
    HttpModule,
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    HealthAssessmentService,
    ExportService,
    ThirdPartyHealthService, // 注册第三方服务
  ],
  exports: [ReportService, HealthAssessmentService, ExportService],
})
export class ReportModule {}
