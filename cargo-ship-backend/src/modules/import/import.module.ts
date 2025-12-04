import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { FileParserService } from './file-parser.service';
import { ImportRecord } from '../../database/entities/import-record.entity';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';

/**
 * 数据导入模块
 * 提供历史时间序列数据文件导入功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ImportRecord, Equipment, TimeSeriesData]),
  ],
  controllers: [ImportController],
  providers: [ImportService, FileParserService],
  exports: [ImportService, FileParserService],
})
export class ImportModule {}
