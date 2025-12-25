/**
 * @file third-party-health.service.ts
 * @description 封装对第三方健康评估API的调用
 */

import { Injectable, BadGatewayException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { GenerateHealthReportDto } from './dto';

/**
 * @class ThirdPartyHealthService
 * @description
 * 专用于与外部健康评估API进行通信的服务。
 * 它负责构建请求、发送HTTP调用、并处理响应和错误。
 */
@Injectable()
export class ThirdPartyHealthService {
  /**
   * 日志记录器实例
   */
  private readonly logger = new Logger(ThirdPartyHealthService.name);

  /**
   * 第三方API的基础URL
   */
  private readonly apiUrl: string = '';

  /**
   * 构造函数，注入依赖项
   * @param httpService 用于发起HTTP请求
   * @param configService 用于读取应用配置
   */
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // 从配置中获取第三方API的URL，如果未配置则抛出错误
    this.apiUrl =
      this.configService.get<string>('app.thirdPartyHpApiUrl') || '';
    if (!this.apiUrl) {
      throw new Error('第三方健康评估API的URL (THIRD_PARTY_HP_API_URL) 未配置');
    }
  }

  /**
   * 从第三方API获取健康数据
   * @param dto 包含设备ID和时间范围的数据传输对象
   * @returns 返回从API获取的原始数据
   * @throws {BadGatewayException} 当API调用失败或返回非2xx状态码时抛出
   */
  async fetchHealthData(dto: GenerateHealthReportDto): Promise<any> {
    // 构建请求参数
    const params = {
      device_id: dto.deviceId,
      start_time: dto.startTime,
      end_time: dto.endTime,
    };

    this.logger.log(
      `准备向第三方API发送请求, URL: ${this.apiUrl}, 参数: ${JSON.stringify(params)}`,
    );

    try {
      // 发起GET请求，并等待响应
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, { params }),
      );

      // 记录成功响应
      this.logger.log(`成功从第三方API获取数据, deviceId: ${dto.deviceId}`);

      // 返回响应体中的数据
      return response.data;
    } catch (error) {
      // 记录详细的错误信息
      this.logger.error(
        `调用第三方API失败, deviceId: ${dto.deviceId}. 错误: ${error.message}`,
        error.stack,
      );

      // 抛出 BadGatewayException，向上层服务传递错误
      throw new BadGatewayException(
        `调用外部健康评估服务失败: ${error.message}`,
      );
    }
  }
}
