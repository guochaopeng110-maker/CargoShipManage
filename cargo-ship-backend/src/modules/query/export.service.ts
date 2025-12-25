import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { Equipment } from '../../database/entities/equipment.entity';
import { TimeSeriesData } from '../../database/entities/time-series-data.entity';
import { AlarmRecord } from '../../database/entities/alarm-record.entity';
import { HealthReport } from '../../database/entities/health-report.entity';
import {
  ExportMonitoringDataDto,
  ExportAlarmsDto,
  ExportReportsDto,
  ExportResponseDto,
  ExportFormat,
} from './dto';

/**
 * 数据导出服务
 *
 * 提供监测数据、告警记录、健康报告的导出功能
 * 支持Excel、CSV、PDF格式
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly exportDir: string;
  private readonly baseUrl: string;
  private readonly expirationMinutes = 30; // 下载链接有效期（分钟）

  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(TimeSeriesData)
    private readonly timeSeriesRepository: Repository<TimeSeriesData>,
    @InjectRepository(AlarmRecord)
    private readonly alarmRepository: Repository<AlarmRecord>,
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
  ) {
    // 导出文件存储目录（生产环境应使用对象存储服务）
    this.exportDir = path.join(process.cwd(), 'exports');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    // 确保导出目录存在
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
      this.logger.log(`创建导出目录: ${this.exportDir}`);
    }
  }

  /**
   * 导出监测数据
   *
   * @param dto 导出请求DTO
   * @returns 下载链接和过期时间
   */
  async exportMonitoringData(
    dto: ExportMonitoringDataDto,
  ): Promise<ExportResponseDto> {
    this.logger.log(
      `导出监测数据: 格式=${dto.exportFormat}, 查询条件=${JSON.stringify(dto.queryConditions)}`,
    );

    // 构建查询条件
    const queryBuilder = this.timeSeriesRepository.createQueryBuilder('data');

    // 添加设备筛选
    if (dto.queryConditions.equipmentId) {
      queryBuilder.andWhere('data.equipmentId = :equipmentId', {
        equipmentId: dto.queryConditions.equipmentId,
      });
    }

    // 添加指标类型筛选
    if (dto.queryConditions.metricType) {
      queryBuilder.andWhere('data.metricType = :metricType', {
        metricType: dto.queryConditions.metricType,
      });
    }

    // 添加时间范围筛选
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    if (dto.queryConditions.startTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(data.timestamp) >= :startTime', {
        startTime: Math.floor(dto.queryConditions.startTime / 1000),
      });
    }

    if (dto.queryConditions.endTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(data.timestamp) <= :endTime', {
        endTime: Math.floor(dto.queryConditions.endTime / 1000),
      });
    }

    // 按时间降序排序
    queryBuilder.orderBy('data.timestamp', 'DESC');

    // 限制导出数量（防止数据量过大）
    queryBuilder.limit(50000);

    // 执行查询
    const data = await queryBuilder.getMany();

    if (data.length === 0) {
      this.logger.warn('未找到符合条件的监测数据');
    }

    // 格式化导出数据 - 包含监测点字段并使用中文列名
    const formattedData = data.map((item) => ({
      设备ID: item.equipmentId,
      监测点: item.monitoringPoint || '(未设置)', // 新增:监测点名称
      指标类型: item.metricType,
      数值: item.value,
      单位: item.unit,
      数据质量: item.quality,
      数据来源: item.source,
      时间戳: item.timestamp,
      创建时间: item.createdAt,
    }));

    // 生成文件
    const fileName = `monitoring_data_${Date.now()}.${dto.exportFormat === ExportFormat.EXCEL ? 'xlsx' : 'csv'}`;
    const filePath = path.join(this.exportDir, fileName);

    if (dto.exportFormat === ExportFormat.EXCEL) {
      await this.exportToExcel(formattedData, filePath, '监测数据');
    } else if (dto.exportFormat === ExportFormat.CSV) {
      await this.exportToCSV(formattedData, filePath);
    }

    // 生成下载链接和过期时间
    const downloadUrl = `${this.baseUrl}/api/export/download/${fileName}`;
    const expiresAt = Date.now() + this.expirationMinutes * 60 * 1000;

    this.logger.log(`监测数据导出成功: ${fileName}, 数据量=${data.length}`);

    return {
      downloadUrl,
      expiresAt,
    };
  }

  /**
   * 导出告警记录
   *
   * @param dto 导出请求DTO
   * @returns 下载链接和过期时间
   */
  async exportAlarms(dto: ExportAlarmsDto): Promise<ExportResponseDto> {
    this.logger.log(
      `导出告警记录: 格式=${dto.exportFormat}, 查询条件=${JSON.stringify(dto.queryConditions)}`,
    );

    // 构建查询条件
    const queryBuilder = this.alarmRepository.createQueryBuilder('alarm');

    // 添加设备筛选
    if (dto.queryConditions.equipmentId) {
      queryBuilder.andWhere('alarm.equipmentId = :equipmentId', {
        equipmentId: dto.queryConditions.equipmentId,
      });
    }

    // 添加严重程度筛选
    if (dto.queryConditions.severity) {
      queryBuilder.andWhere('alarm.severity = :severity', {
        severity: dto.queryConditions.severity,
      });
    }

    // 添加处理状态筛选
    if (dto.queryConditions.status) {
      queryBuilder.andWhere('alarm.status = :status', {
        status: dto.queryConditions.status,
      });
    }

    // 添加时间范围筛选
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    if (dto.queryConditions.startTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(alarm.triggeredAt) >= :startTime', {
        startTime: Math.floor(dto.queryConditions.startTime / 1000),
      });
    }

    if (dto.queryConditions.endTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(alarm.triggeredAt) <= :endTime', {
        endTime: Math.floor(dto.queryConditions.endTime / 1000),
      });
    }

    // 按触发时间降序排序
    queryBuilder.orderBy('alarm.triggeredAt', 'DESC');

    // 限制导出数量
    queryBuilder.limit(10000);

    // 执行查询
    const data = await queryBuilder.getMany();

    if (data.length === 0) {
      this.logger.warn('未找到符合条件的告警记录');
    }

    // 格式化导出数据 - 包含监测点、故障名称和处理措施字段
    const formattedData = data.map((item) => ({
      告警ID: item.id,
      设备ID: item.equipmentId,
      监测点: item.monitoringPoint || '(未设置)', // 新增:监测点名称
      故障名称: item.faultName || '(未设置)', // 新增:故障名称
      异常指标类型: item.abnormalMetricType,
      异常值: item.abnormalValue,
      阈值范围: item.thresholdRange,
      严重程度: item.getSeverityText(),
      处理状态: item.getStatusText(),
      触发时间: item.triggeredAt,
      处理人ID: item.handler,
      处理时间: item.handledAt,
      处理说明: item.handleNote,
      处理措施建议: item.recommendedAction || '(无)', // 新增:处理措施
      创建时间: item.createdAt,
    }));

    // 生成文件
    const fileName = `alarm_records_${Date.now()}.${dto.exportFormat === ExportFormat.EXCEL ? 'xlsx' : 'csv'}`;
    const filePath = path.join(this.exportDir, fileName);

    if (dto.exportFormat === ExportFormat.EXCEL) {
      await this.exportToExcel(formattedData, filePath, '告警记录');
    } else if (dto.exportFormat === ExportFormat.CSV) {
      await this.exportToCSV(formattedData, filePath);
    }

    // 生成下载链接和过期时间
    const downloadUrl = `${this.baseUrl}/api/export/download/${fileName}`;
    const expiresAt = Date.now() + this.expirationMinutes * 60 * 1000;

    this.logger.log(`告警记录导出成功: ${fileName}, 数据量=${data.length}`);

    return {
      downloadUrl,
      expiresAt,
    };
  }

  /**
   * 导出健康报告（PDF格式）
   *
   * @param dto 导出请求DTO
   * @returns 下载链接和过期时间
   */
  async exportReports(dto: ExportReportsDto): Promise<ExportResponseDto> {
    this.logger.log(
      `导出健康报告: 格式=${dto.exportFormat}, 查询条件=${JSON.stringify(dto.queryConditions)}`,
    );

    // 构建查询条件
    const queryBuilder =
      this.healthReportRepository.createQueryBuilder('report');

    // 添加报告ID筛选
    if (dto.queryConditions.reportId) {
      queryBuilder.andWhere('report.id = :reportId', {
        reportId: dto.queryConditions.reportId,
      });
    }

    // 添加设备筛选
    if (dto.queryConditions.equipmentId) {
      queryBuilder.andWhere('report.equipmentId = :equipmentId', {
        equipmentId: dto.queryConditions.equipmentId,
      });
    }

    // 添加时间范围筛选
    // 使用UNIX_TIMESTAMP进行比较以避免时区问题
    if (dto.queryConditions.startTime) {
      queryBuilder.andWhere(
        'UNIX_TIMESTAMP(report.generatedAt) >= :startTime',
        {
          startTime: Math.floor(dto.queryConditions.startTime / 1000),
        },
      );
    }

    if (dto.queryConditions.endTime) {
      queryBuilder.andWhere('UNIX_TIMESTAMP(report.generatedAt) <= :endTime', {
        endTime: Math.floor(dto.queryConditions.endTime / 1000),
      });
    }

    // 按生成时间降序排序
    queryBuilder.orderBy('report.generatedAt', 'DESC');

    // 限制导出数量
    queryBuilder.limit(100);

    // 执行查询
    const reports = await queryBuilder.getMany();

    if (reports.length === 0) {
      throw new NotFoundException('未找到符合条件的健康报告');
    }

    // 生成PDF文件
    // 注意: 这里简化实现，实际应使用PDF生成库（如puppeteer、pdfkit等）
    const fileName = `health_reports_${Date.now()}.pdf`;
    const filePath = path.join(this.exportDir, fileName);

    // TODO: 实现PDF生成逻辑
    // 当前仅创建占位文件
    fs.writeFileSync(
      filePath,
      '健康报告PDF生成功能待实现（需要集成PDF生成库）',
    );

    // 生成下载链接和过期时间
    const downloadUrl = `${this.baseUrl}/api/export/download/${fileName}`;
    const expiresAt = Date.now() + this.expirationMinutes * 60 * 1000;

    this.logger.log(
      `健康报告导出成功: ${fileName}, 报告数量=${reports.length}`,
    );

    return {
      downloadUrl,
      expiresAt,
    };
  }

  /**
   * 导出数据到Excel文件
   *
   * @param data 数据数组
   * @param filePath 文件路径
   * @param sheetName 工作表名称
   */
  private async exportToExcel(
    data: any[],
    filePath: string,
    sheetName: string,
  ): Promise<void> {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 将数据转换为工作表
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // 写入文件
    XLSX.writeFile(workbook, filePath);

    this.logger.debug(`Excel文件已生成: ${filePath}`);
  }

  /**
   * 导出数据到CSV文件
   *
   * @param data 数据数组
   * @param filePath 文件路径
   */
  private async exportToCSV(data: any[], filePath: string): Promise<void> {
    // 创建工作簿
    const workbook = XLSX.utils.book_new();

    // 将数据转换为工作表
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 写入CSV文件
    XLSX.writeFile(workbook, filePath, { bookType: 'csv' });

    this.logger.debug(`CSV文件已生成: ${filePath}`);
  }

  /**
   * 清理过期的导出文件
   *
   * 定期清理超过有效期的文件，释放存储空间
   */
  async cleanupExpiredFiles(): Promise<void> {
    this.logger.log('开始清理过期的导出文件');

    const files = fs.readdirSync(this.exportDir);
    const now = Date.now();
    let cleanedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.exportDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;

      // 如果文件超过有效期，删除文件
      if (fileAge > this.expirationMinutes * 60 * 1000) {
        fs.unlinkSync(filePath);
        cleanedCount++;
        this.logger.debug(`已删除过期文件: ${file}`);
      }
    }

    this.logger.log(`过期文件清理完成: 删除${cleanedCount}个文件`);
  }
}
