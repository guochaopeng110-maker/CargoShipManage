/**
 * @file third-party-health.service.spec.ts
 * @description ThirdPartyHealthService的单元测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ThirdPartyHealthService } from './third-party-health.service';
import { GenerateHealthReportDto } from './dto';
import { BadGatewayException, Logger } from '@nestjs/common';
import { AxiosResponse, AxiosError } from 'axios';

describe('ThirdPartyHealthService', () => {
  let service: ThirdPartyHealthService;
  let configService: ConfigService;
  let httpService: jest.Mocked<HttpService>;

  const mockApiUrl = 'https://test.api/health';

  // This function sets up the testing module
  const setupModule = async (apiUrl: string | undefined) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThirdPartyHealthService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            // Mock the get method directly here
            get: jest.fn().mockReturnValue(apiUrl),
          },
        },
      ],
    }).compile();

    service = module.get<ThirdPartyHealthService>(ThirdPartyHealthService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
    console.log(configService);
  };

  beforeEach(async () => {
    // 禁用日志以保持测试输出干净
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const dto: GenerateHealthReportDto = {
    deviceId: 'device-1',
    startTime: '2025-01-01T00:00:00Z',
    endTime: '2025-01-02T00:00:00Z',
  };

  it('构造函数应该在未配置API URL时抛出错误', () => {
    // Act & Assert
    // We expect the module compilation itself to fail, but Jest runs this in a way that catches the constructor error.
    // A more direct test is to just new() it up.
    expect(
      () =>
        new ThirdPartyHealthService(httpService, {
          get: jest.fn().mockReturnValue(undefined),
        } as any),
    ).toThrow('第三方健康评估API的URL (THIRD_PARTY_HP_API_URL) 未配置');
  });

  // --- Tests for when the service is successfully constructed ---
  describe('when API URL is configured', () => {
    beforeEach(async () => {
      await setupModule(mockApiUrl);
    });

    it('服务应该被成功定义', () => {
      expect(service).toBeDefined();
    });

    describe('fetchHealthData', () => {
      it('应该成功调用API并返回数据', async () => {
        // Arrange
        const responseData = { score: 99 };
        const axiosResponse: AxiosResponse = {
          data: responseData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as any },
        };
        httpService.get.mockReturnValue(of(axiosResponse));

        // Act
        const result = await service.fetchHealthData(dto);

        // Assert
        expect(result).toEqual(responseData);
        expect(httpService.get).toHaveBeenCalledTimes(1);
        expect(httpService.get).toHaveBeenCalledWith(mockApiUrl, {
          params: {
            deviceId: dto.deviceId,
            startTime: dto.startTime,
            endTime: dto.endTime,
          },
        });
      });

      it('当API调用失败时，应该抛出 BadGatewayException', async () => {
        // Arrange
        const error = new AxiosError('Network Error');
        httpService.get.mockReturnValue(throwError(() => error));

        // Act & Assert
        await expect(service.fetchHealthData(dto)).rejects.toThrow(
          BadGatewayException,
        );
        await expect(service.fetchHealthData(dto)).rejects.toThrow(
          '调用外部健康评估服务失败: Network Error',
        );
      });
    });
  });
});
