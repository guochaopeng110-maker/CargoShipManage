import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import {
  HealthReport,
  ReportType,
} from '../../database/entities/health-report.entity';

/**
 * 导出服务
 * 负责将健康报告导出为Excel格式
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  /**
   * 将健康报告导出为Excel文件
   * @param report 健康报告数据
   * @returns Excel文件的Buffer
   */
  async exportReportToExcel(report: HealthReport): Promise<Buffer> {
    this.logger.log(`开始导出报告 ${report.id} 为Excel格式`);

    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Cargo Ships Management System';
    workbook.created = new Date();
    workbook.modified = new Date();
    // 创建工作表
    const worksheet = workbook.addWorksheet('健康评估报告', {
      properties: { tabColor: { argb: 'FF00FF00' } },
    });

    // 设置列宽
    worksheet.columns = [
      { width: 20 },
      { width: 30 },
      { width: 20 },
      { width: 30 },
    ];

    // 添加标题行
    const titleRow = worksheet.addRow(['设备健康评估报告']);
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.height = 30;
    worksheet.mergeCells('A1:D1');

    // 添加空行
    worksheet.addRow([]);

    // 添加基本信息区域标题
    const basicInfoTitle = worksheet.addRow(['基本信息']);
    basicInfoTitle.font = { size: 14, bold: true, color: { argb: 'FF0000FF' } };
    basicInfoTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.mergeCells(`A${basicInfoTitle.number}:D${basicInfoTitle.number}`);

    // 添加基本信息
    this.addInfoRow(worksheet, '报告ID', report.id);
    this.addInfoRow(
      worksheet,
      '设备ID',
      report.equipmentId || '汇总报告（所有设备）',
    );
    this.addInfoRow(
      worksheet,
      '报告类型',
      report.reportType === ReportType.SINGLE ? '单设备报告' : '汇总报告',
    );
    this.addInfoRow(
      worksheet,
      '数据开始时间',
      this.formatTimestamp(report.dataStartTime),
    );
    this.addInfoRow(
      worksheet,
      '数据结束时间',
      this.formatTimestamp(report.dataEndTime),
    );
    this.addInfoRow(
      worksheet,
      '报告生成时间',
      new Date().toLocaleString('zh-CN'),
    );
    this.addInfoRow(worksheet, '生成人', report.generatedBy);

    // 添加空行
    worksheet.addRow([]);

    // 添加健康评估结果区域标题
    const assessmentTitle = worksheet.addRow(['健康评估结果']);
    assessmentTitle.font = {
      size: 14,
      bold: true,
      color: { argb: 'FF0000FF' },
    };
    assessmentTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.mergeCells(
      `A${assessmentTitle.number}:D${assessmentTitle.number}`,
    );

    // 添加健康评估数据
    this.addInfoRow(worksheet, '健康评分', `${report.healthScore}分`);

    // 根据健康等级设置颜色
    const healthLevel = this.getHealthLevelText(report.healthLevel);
    const healthLevelRow = this.addInfoRow(worksheet, '健康等级', healthLevel);

    // 设置健康等级单元格颜色
    const levelColor = this.getHealthLevelColor(report.healthLevel);
    healthLevelRow.getCell(2).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: levelColor },
    };
    healthLevelRow.getCell(2).font = { bold: true };

    this.addInfoRow(worksheet, '异常次数', `${report.abnormalCount}次`);

    // 添加空行
    worksheet.addRow([]);
    /*
    // 添加运行时间统计区域标题
    if (report.uptimeStats) {
      const uptimeTitle = worksheet.addRow(['运行时间统计']);
      uptimeTitle.font = { size: 14, bold: true, color: { argb: 'FF0000FF' } };
      uptimeTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      worksheet.mergeCells(`A${uptimeTitle.number}:D${uptimeTitle.number}`);

      // 添加运行时间数据
      this.addInfoRow(
        worksheet,
        '总时长',
        this.formatDuration(report.uptimeStats.totalDuration),
      );
      this.addInfoRow(
        worksheet,
        '运行时长',
        this.formatDuration(report.uptimeStats.runningDuration),
      );
      this.addInfoRow(
        worksheet,
        '维护时长',
        this.formatDuration(report.uptimeStats.maintenanceDuration),
      );
      this.addInfoRow(
        worksheet,
        '停机时长',
        this.formatDuration(report.uptimeStats.stoppedDuration),
      );
      this.addInfoRow(
        worksheet,
        '运行率',
        `${report.uptimeStats.uptimeRate?.toFixed(2)}%`,
      );

      // 添加空行
      worksheet.addRow([]);
    }

    // 添加趋势分析区域标题
    if (report.trendAnalysis) {
      const trendTitle = worksheet.addRow(['趋势分析']);
      trendTitle.font = { size: 14, bold: true, color: { argb: 'FF0000FF' } };
      trendTitle.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      worksheet.mergeCells(`A${trendTitle.number}:D${trendTitle.number}`);

      // 添加趋势分析数据
      this.addInfoRow(
        worksheet,
        '温度趋势',
        report.trendAnalysis.temperatureTrend,
      );
      this.addInfoRow(
        worksheet,
        '振动趋势',
        report.trendAnalysis.vibrationTrend,
      );
      this.addInfoRow(worksheet, '总体趋势', report.trendAnalysis.overallTrend);

      const riskLevel = this.getRiskLevelText(report.trendAnalysis.riskLevel);
      const riskLevelRow = this.addInfoRow(worksheet, '风险等级', riskLevel);

      // 设置风险等级单元格颜色
      const riskColor = this.getRiskLevelColor(report.trendAnalysis.riskLevel);
      riskLevelRow.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: riskColor },
      };
      riskLevelRow.getCell(2).font = { bold: true };

      // 添加建议事项
      if (
        report.trendAnalysis.suggestions &&
        report.trendAnalysis.suggestions.length > 0
      ) {
        worksheet.addRow([]);
        const suggestionsTitle = worksheet.addRow(['维护建议']);
        suggestionsTitle.font = {
          size: 14,
          bold: true,
          color: { argb: 'FF0000FF' },
        };
        suggestionsTitle.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        worksheet.mergeCells(
          `A${suggestionsTitle.number}:D${suggestionsTitle.number}`,
        );

        report.trendAnalysis.suggestions.forEach((suggestion, index) => {
          const row = worksheet.addRow([`${index + 1}.`, suggestion, '', '']);
          worksheet.mergeCells(`B${row.number}:D${row.number}`);
          row.getCell(2).alignment = { wrapText: true };
        });
      }
    }
*/
    // 添加页脚
    worksheet.addRow([]);
    const footerRow = worksheet.addRow([
      '生成时间：' + new Date().toLocaleString('zh-CN'),
    ]);
    footerRow.font = { size: 10, italic: true, color: { argb: 'FF888888' } };
    worksheet.mergeCells(`A${footerRow.number}:D${footerRow.number}`);

    // 生成Excel文件Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    this.logger.log(`报告 ${report.id} 导出完成`);

    return Buffer.from(buffer);
  }

  /**
   * 添加信息行（键值对）
   * @param worksheet 工作表
   * @param label 标签
   * @param value 值
   * @returns 添加的行
   */
  private addInfoRow(
    worksheet: ExcelJS.Worksheet,
    label: string,
    value: string,
  ): ExcelJS.Row {
    const row = worksheet.addRow([label, value, '', '']);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' },
    };
    worksheet.mergeCells(`B${row.number}:D${row.number}`);
    return row;
  }

  /**
   * 格式化时间戳
   * @param timestamp 时间戳（毫秒）
   * @returns 格式化后的时间字符串
   */
  // Updated to safely handle string timestamps
  private formatTimestamp(timestamp: number | string | undefined): string {
    const ts = Number(timestamp);
    if (isNaN(ts)) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * 格式化时长
   * @param milliseconds 毫秒数
   * @returns 格式化后的时长字符串
   */
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * 获取健康等级文本
   * @param level 健康等级
   * @returns 健康等级文本
   */
  private getHealthLevelText(level: string | undefined): string {
    if (!level) return '未知';
    const levelMap: Record<string, string> = {
      excellent: '优秀',
      good: '良好',
      fair: '一般',
      poor: '较差',
    };
    return levelMap[level] || level;
  }

  /**
   * 获取健康等级颜色
   * @param level 健康等级
   * @returns 颜色代码
   */
  private getHealthLevelColor(level: string | undefined): string {
    if (!level) return 'FFFFFFFF';
    const colorMap: Record<string, string> = {
      excellent: 'FF00FF00', // 绿色
      good: 'FF90EE90', // 浅绿色
      fair: 'FFFFA500', // 橙色
      poor: 'FFFF0000', // 红色
    };
    return colorMap[level] || 'FFFFFFFF';
  }

  /**
   * 获取风险等级文本
   * @param level 风险等级
   * @returns 风险等级文本
   */
  private getRiskLevelText(level: string): string {
    const levelMap: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
    };
    return levelMap[level] || level;
  }

  /**
   * 获取风险等级颜色
   * @param level 风险等级
   * @returns 颜色代码
   */
  private getRiskLevelColor(level: string): string {
    const colorMap: Record<string, string> = {
      low: 'FF00FF00', // 绿色
      medium: 'FFFFA500', // 橙色
      high: 'FFFF0000', // 红色
    };
    return colorMap[level] || 'FFFFFFFF';
  }
}
