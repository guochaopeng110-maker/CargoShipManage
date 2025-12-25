/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlarmRecord } from '../models/AlarmRecord';
import type { AlarmStatsResponseDto } from '../models/AlarmStatsResponseDto';
import type { BatchOperationResultDto } from '../models/BatchOperationResultDto';
import type { CreateBatchTimeSeriesDataDto } from '../models/CreateBatchTimeSeriesDataDto';
import type { CreateEquipmentDto } from '../models/CreateEquipmentDto';
import type { CreateThresholdDto } from '../models/CreateThresholdDto';
import type { CreateTimeSeriesDataDto } from '../models/CreateTimeSeriesDataDto';
import type { DataStatisticsResponseDto } from '../models/DataStatisticsResponseDto';
import type { Equipment } from '../models/Equipment';
import type { EquipmentOverviewDto } from '../models/EquipmentOverviewDto';
import type { ExportAlarmsDto } from '../models/ExportAlarmsDto';
import type { ExportMonitoringDataDto } from '../models/ExportMonitoringDataDto';
import type { ExportReportsDto } from '../models/ExportReportsDto';
import type { ExportResponseDto } from '../models/ExportResponseDto';
import type { GenerateHealthReportDto } from '../models/GenerateHealthReportDto';
import type { HealthReport } from '../models/HealthReport';
import type { ImportDataDto } from '../models/ImportDataDto';
import type { ImportRecord } from '../models/ImportRecord';
import type { MonitoringPoint } from '../models/MonitoringPoint';
import type { MonitoringStatsResponseDto } from '../models/MonitoringStatsResponseDto';
import type { PaginatedResponseDto } from '../models/PaginatedResponseDto';
import type { ThresholdConfig } from '../models/ThresholdConfig';
import type { TimeSeriesData } from '../models/TimeSeriesData';
import type { UpdateAlarmStatusDto } from '../models/UpdateAlarmStatusDto';
import type { UpdateEquipmentDto } from '../models/UpdateEquipmentDto';
import type { UpdateHealthReportDto } from '../models/UpdateHealthReportDto';
import type { UpdateThresholdDto } from '../models/UpdateThresholdDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class Service {
    /**
     * 创建新设备
     * 提供设备的基本信息来创建一条新的设备记录
     * @param requestBody
     * @returns Equipment 设备创建成功
     * @throws ApiError
     */
    public static equipmentControllerCreate(
        requestBody: CreateEquipmentDto,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/equipment',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `请求参数验证失败`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:create 权限`,
                409: `设备编号已存在`,
            },
        });
    }
    /**
     * 查询设备列表
     * 分页查询设备列表，支持按类型、状态和关键词进行筛选
     * @param page 页码（从1开始）
     * @param limit 每页数量
     * @param deviceType 设备类型筛选
     * @param status 设备状态筛选
     * @param keyword 关键词搜索（设备编号或名称）
     * @returns any 成功获取设备列表
     * @throws ApiError
     */
    public static equipmentControllerFindAll(
        page: number = 1,
        limit: number = 10,
        deviceType?: string,
        status?: 'normal' | 'warning' | 'fault' | 'offline',
        keyword?: string,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        data?: {
            items?: Array<Equipment>;
            total?: number;
            page?: number;
            pageSize?: number;
            totalPages?: number;
        };
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/equipment',
            query: {
                'page': page,
                'limit': limit,
                'deviceType': deviceType,
                'status': status,
                'keyword': keyword,
            },
            errors: {
                400: `查询参数格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:read 权限`,
            },
        });
    }
    /**
     * 获取设备统计信息
     * 获取所有设备按状态（正常、告警、故障、离线）分类的数量统计。
     * @returns any 查询成功，返回设备状态统计数据
     * @throws ApiError
     */
    public static equipmentControllerGetStatistics(): CancelablePromise<{
        /**
         * 正常状态设备数量
         */
        normal?: number;
        /**
         * 告警状态设备数量
         */
        warning?: number;
        /**
         * 故障状态设备数量
         */
        fault?: number;
        /**
         * 离线状态设备数量
         */
        offline?: number;
        /**
         * 设备总数
         */
        total?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/equipment/statistics',
            errors: {
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:read 权限`,
            },
        });
    }
    /**
     * 查询设备详情
     * 根据设备的唯一ID查询其详细信息。
     * @param id 设备ID (UUID格式)
     * @returns Equipment 查询成功，返回设备详细信息
     * @throws ApiError
     */
    public static equipmentControllerFindOne(
        id: string,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/equipment/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `设备ID格式错误（非有效的UUID）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:read 权限`,
                404: `设备不存在或已被删除`,
            },
        });
    }
    /**
     * 更新设备信息
     * 更新指定设备的部分或全部信息。
     * @param id 设备ID (UUID格式)
     * @param requestBody
     * @returns Equipment 更新成功，返回更新后的设备信息
     * @throws ApiError
     */
    public static equipmentControllerUpdate(
        id: string,
        requestBody: UpdateEquipmentDto,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/equipment/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `请求参数验证失败或设备ID格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:update 权限`,
                404: `设备不存在或已被删除`,
                409: `设备编号与现有其他设备冲突`,
            },
        });
    }
    /**
     * 删除设备
     * 软删除指定设备，记录将保留在数据库中但无法通过常规查询获取。
     * @param id 设备ID (UUID格式)
     * @returns any 删除成功
     * @throws ApiError
     */
    public static equipmentControllerRemove(
        id: string,
    ): CancelablePromise<{
        code?: number;
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/equipment/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `设备ID格式错误（非有效的UUID）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:delete 权限`,
                404: `设备不存在或已被删除`,
            },
        });
    }
    /**
     * 单独更新设备状态
     * 快速更新指定设备的运行状态。
     * @param id 设备ID (UUID格式)
     * @param requestBody
     * @returns Equipment 状态更新成功，返回更新后的设备信息
     * @throws ApiError
     */
    public static equipmentControllerUpdateStatus(
        id: string,
        requestBody: {
            /**
             * 目标状态
             */
            status: 'normal' | 'warning' | 'fault' | 'offline';
        },
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/equipment/{id}/status',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `请求参数验证失败或设备ID格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:update 权限`,
                404: `设备不存在或已被删除`,
            },
        });
    }
    /**
     * 恢复已删除的设备
     * 将被软删除的设备恢复为可用状态。
     * @param id 设备ID (UUID格式)
     * @returns Equipment 恢复成功，返回恢复后的设备信息
     * @throws ApiError
     */
    public static equipmentControllerRestore(
        id: string,
    ): CancelablePromise<Equipment> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/equipment/{id}/restore',
            path: {
                'id': id,
            },
            errors: {
                400: `设备ID格式错误或设备未被删除，无需恢复`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:create 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 获取设备的监测点列表
     * 查询指定设备的所有监测点定义，支持分页和筛选。用于前端动态展示监测点，避免硬编码。
     * @param id 设备ID (UUID格式)
     * @param page 页码（从1开始）
     * @param pageSize 每页数量
     * @param metricType 按指标类型筛选
     * @param keyword 关键词搜索（监测点名称）
     * @returns any 成功获取监测点列表
     * @throws ApiError
     */
    public static equipmentControllerGetMonitoringPoints(
        id: string,
        page: number = 1,
        pageSize: number = 20,
        metricType?: 'temperature' | 'pressure' | 'humidity' | 'vibration' | 'speed' | 'current' | 'voltage' | 'power' | 'frequency' | 'level' | 'resistance' | 'switch',
        keyword?: string,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        data?: {
            items?: Array<MonitoringPoint>;
            total?: number;
            page?: number;
            pageSize?: number;
            totalPages?: number;
        };
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/equipment/{id}/monitoring-points',
            path: {
                'id': id,
            },
            query: {
                'page': page,
                'pageSize': pageSize,
                'metricType': metricType,
                'keyword': keyword,
            },
            errors: {
                401: `未授权，需要登录`,
                403: `权限不足，需要 device:read 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 接收单条监测数据
     * 接收并存储单条设备监测数据，成功后返回数据ID
     * @param requestBody
     * @returns any 接收成功
     * @throws ApiError
     */
    public static monitoringControllerReceiveMonitoringData(
        requestBody: CreateTimeSeriesDataDto,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        data?: {
            dataId?: number;
            received?: boolean;
        };
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/monitoring/data',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数验证失败`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 sensor_data:create 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 查询监测数据
     * 根据设备、指标类型、时间范围查询监测数据，支持分页
     * @param equipmentId 设备唯一标识（UUID格式）
     * @param startTime 开始时间戳（毫秒）
     * @param endTime 结束时间戳（毫秒）
     * @param metricType 指标类型（可选）
     * @param monitoringPoint 监测点名称（可选，用于筛选特定监测点）
     * @param page 页码（从1开始）
     * @param pageSize 每页条数
     * @returns any 成功获取监测数据列表
     * @throws ApiError
     */
    public static monitoringControllerQueryMonitoringData(
        equipmentId: string,
        startTime: number,
        endTime: number,
        metricType?: 'temperature' | 'pressure' | 'humidity' | 'vibration' | 'speed' | 'current' | 'voltage' | 'power' | 'frequency' | 'level' | 'resistance' | 'switch',
        monitoringPoint?: string,
        page: number = 1,
        pageSize: number = 100,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        data?: {
            items?: Array<TimeSeriesData>;
            total?: number;
            page?: number;
            pageSize?: number;
            totalPages?: number;
        };
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/monitoring/data',
            query: {
                'equipmentId': equipmentId,
                'metricType': metricType,
                'monitoringPoint': monitoringPoint,
                'startTime': startTime,
                'endTime': endTime,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                400: `查询参数格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 sensor_data:read 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 批量接收监测数据
     * 批量接收并存储设备监测数据，最多1000条/次
     * @param requestBody
     * @returns BatchOperationResultDto 接收成功，返回批量操作结果
     * @throws ApiError
     */
    public static monitoringControllerReceiveBatchMonitoringData(
        requestBody: CreateBatchTimeSeriesDataDto,
    ): CancelablePromise<BatchOperationResultDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/monitoring/data/batch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数验证失败或数据格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 sensor_data:create 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 获取数据统计信息
     * 获取指定设备、指标类型、时间范围的统计数据（最大值、最小值、平均值等）
     * @param equipmentId 设备ID（UUID格式）
     * @param metricType 指标类型
     * @param startTime 开始时间戳（毫秒）
     * @param endTime 结束时间戳（毫秒）
     * @returns DataStatisticsResponseDto 查询成功，返回统计数据
     * @throws ApiError
     */
    public static monitoringControllerGetDataStatistics(
        equipmentId: string,
        metricType: 'temperature' | 'pressure' | 'humidity' | 'vibration' | 'speed' | 'current' | 'voltage' | 'power' | 'frequency' | 'level' | 'resistance' | 'switch',
        startTime: number,
        endTime: number,
    ): CancelablePromise<DataStatisticsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/monitoring/data/statistics',
            query: {
                'equipmentId': equipmentId,
                'metricType': metricType,
                'startTime': startTime,
                'endTime': endTime,
            },
            errors: {
                400: `查询参数格式错误或参数验证失败`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 sensor_data:read 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 创建阈值配置
     * 创建新的告警阈值配置规则，用于监测设备指标异常
     * @param requestBody
     * @returns ThresholdConfig 阈值配置创建成功
     * @throws ApiError
     */
    public static alarmControllerCreateThreshold(
        requestBody: CreateThresholdDto,
    ): CancelablePromise<ThresholdConfig> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/thresholds',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `参数验证失败或设备ID格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:create 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 查询阈值列表
     * 分页查询阈值配置列表，支持按设备ID、指标类型、严重程度筛选
     * @param equipmentId 设备ID
     * @param metricType 监测指标类型
     * @param monitoringPoint 监测点名称（可选，用于筛选特定监测点）
     * @param ruleStatus 规则状态
     * @param page 页码（从1开始）
     * @param pageSize 每页条数
     * @returns PaginatedResponseDto 查询成功，返回分页数据
     * @throws ApiError
     */
    public static alarmControllerFindAllThresholds(
        equipmentId?: string,
        metricType?: 'temperature' | 'pressure' | 'humidity' | 'vibration' | 'speed' | 'current' | 'voltage' | 'power' | 'frequency' | 'level' | 'resistance' | 'switch',
        monitoringPoint?: string,
        ruleStatus?: 'enabled' | 'disabled',
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<PaginatedResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/thresholds',
            query: {
                'equipmentId': equipmentId,
                'metricType': metricType,
                'monitoringPoint': monitoringPoint,
                'ruleStatus': ruleStatus,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                400: `查询参数格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:read 权限`,
            },
        });
    }
    /**
     * 查询阈值详情
     * 根据ID获取单个阈值配置的详细信息
     * @param id 阈值配置ID（UUID格式）
     * @returns ThresholdConfig 查询成功
     * @throws ApiError
     */
    public static alarmControllerFindOneThreshold(
        id: string,
    ): CancelablePromise<ThresholdConfig> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/thresholds/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `ID格式错误（非UUID格式）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:read 权限`,
                404: `阈值配置不存在`,
            },
        });
    }
    /**
     * 更新阈值配置
     * 修改现有阈值配置的参数（上下限、持续时间、严重程度等）
     * @param id 阈值配置ID（UUID格式）
     * @param requestBody
     * @returns ThresholdConfig 更新成功
     * @throws ApiError
     */
    public static alarmControllerUpdateThreshold(
        id: string,
        requestBody: UpdateThresholdDto,
    ): CancelablePromise<ThresholdConfig> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/thresholds/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `ID格式错误或参数验证失败`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:update 权限`,
                404: `阈值配置不存在`,
            },
        });
    }
    /**
     * 删除阈值配置
     * 删除指定的阈值配置规则
     * @param id 阈值配置ID（UUID格式）
     * @returns any 删除成功
     * @throws ApiError
     */
    public static alarmControllerDeleteThreshold(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/thresholds/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `ID格式错误（非UUID格式）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:delete 权限`,
                404: `阈值配置不存在`,
            },
        });
    }
    /**
     * 查询告警列表
     * 分页查询告警记录列表，支持按设备ID、严重程度、处理状态筛选
     * @param equipmentId 设备ID
     * @param monitoringPoint 监测点名称（可选，用于筛选特定监测点的告警）
     * @param severity 严重程度
     * @param status 处理状态
     * @param startTime 开始时间（Unix时间戳毫秒）
     * @param endTime 结束时间（Unix时间戳毫秒）
     * @param page 页码（从1开始）
     * @param pageSize 每页条数
     * @returns PaginatedResponseDto 查询成功，返回分页数据
     * @throws ApiError
     */
    public static alarmControllerFindAllAlarms(
        equipmentId?: string,
        monitoringPoint?: string,
        severity?: 'low' | 'medium' | 'high' | 'critical',
        status?: 'pending' | 'processing' | 'resolved' | 'ignored',
        startTime?: number,
        endTime?: number,
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<PaginatedResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alarms',
            query: {
                'equipmentId': equipmentId,
                'monitoringPoint': monitoringPoint,
                'severity': severity,
                'status': status,
                'startTime': startTime,
                'endTime': endTime,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                400: `查询参数格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:read 权限`,
            },
        });
    }
    /**
     * 查询告警详情
     * 根据ID获取单个告警记录的详细信息
     * @param id 告警记录ID（UUID格式）
     * @returns AlarmRecord 查询成功
     * @throws ApiError
     */
    public static alarmControllerFindOneAlarm(
        id: string,
    ): CancelablePromise<AlarmRecord> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/alarms/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `ID格式错误（非UUID格式）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:read 权限`,
                404: `告警记录不存在`,
            },
        });
    }
    /**
     * 更新告警状态
     * 修改告警记录的处理状态（待处理、处理中、已解决、已忽略）
     * @param id 告警记录ID（UUID格式）
     * @param requestBody
     * @returns AlarmRecord 更新成功
     * @throws ApiError
     */
    public static alarmControllerUpdateAlarmStatus(
        id: string,
        requestBody: UpdateAlarmStatusDto,
    ): CancelablePromise<AlarmRecord> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/alarms/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `ID格式错误或参数验证失败`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 alert:update 权限`,
                404: `告警记录不存在`,
            },
        });
    }
    /**
     * 按需生成新的健康评估报告 (同步)
     * 根据指定的设备ID和时间范围，立即触发一次新的健康评估，并同步返回生成的报告。
     * @param requestBody
     * @returns HealthReport 生成成功，返回新的报告实体
     * @throws ApiError
     */
    public static reportControllerGenerateReport(
        requestBody: GenerateHealthReportDto,
    ): CancelablePromise<HealthReport> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/reports/health',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `请求参数验证失败或设备ID格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 report:create 权限`,
                404: `设备不存在`,
            },
        });
    }
    /**
     * 查询报告列表
     * 分页查询健康评估报告列表，支持按设备ID、报告类型筛选
     * @param equipmentId 设备ID（仅查询单设备报告）
     * @param reportType 报告类型
     * @param startTime 生成时间-开始（时间戳，毫秒）
     * @param endTime 生成时间-结束（时间戳，毫秒）
     * @param page 页码（从1开始）
     * @param pageSize 每页数量
     * @returns any 成功获取健康报告列表
     * @throws ApiError
     */
    public static reportControllerFindAll(
        equipmentId?: string,
        reportType?: 'single' | 'aggregate',
        startTime?: number,
        endTime?: number,
        page: number = 1,
        pageSize: number = 20,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        data?: {
            items?: Array<HealthReport>;
            total?: number;
            page?: number;
            pageSize?: number;
            totalPages?: number;
        };
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/reports/health',
            query: {
                'equipmentId': equipmentId,
                'reportType': reportType,
                'startTime': startTime,
                'endTime': endTime,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                400: `查询参数格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 report:read 权限`,
            },
        });
    }
    /**
     * 查询报告详情
     * 根据ID查询单个健康评估报告的详细信息
     * @param id 报告ID (UUID格式)
     * @returns HealthReport 查询成功，返回报告详细信息
     * @throws ApiError
     */
    public static reportControllerFindOne(
        id: string,
    ): CancelablePromise<HealthReport> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/reports/health/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `报告ID格式错误（非有效的UUID）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 report:read 权限`,
                404: `报告不存在`,
            },
        });
    }
    /**
     * 更新报告
     * 更新报告的备注和附加说明（不允许修改核心数据）
     * @param id 报告ID (UUID格式)
     * @param requestBody
     * @returns HealthReport 报告更新成功，返回更新后的报告信息
     * @throws ApiError
     */
    public static reportControllerUpdate(
        id: string,
        requestBody: UpdateHealthReportDto,
    ): CancelablePromise<HealthReport> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/reports/health/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `请求参数验证失败或报告ID格式错误`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 report:update 权限`,
                404: `报告不存在`,
            },
        });
    }
    /**
     * 删除报告
     * 删除指定的健康评估报告（物理删除）
     * @param id 报告ID (UUID格式)
     * @returns any 删除成功
     * @throws ApiError
     */
    public static reportControllerRemove(
        id: string,
    ): CancelablePromise<{
        code?: number;
        message?: string;
        timestamp?: number;
    }> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/reports/health/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `报告ID格式错误（非有效的UUID）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 report:delete 权限`,
                404: `报告不存在`,
            },
        });
    }
    /**
     * 导出报告为Excel
     * 将指定的健康评估报告导出为Excel文件
     * @param id 报告ID (UUID格式)
     * @returns binary 导出成功，返回Excel文件流
     * @throws ApiError
     */
    public static reportControllerExportReport(
        id: string,
    ): CancelablePromise<Blob> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/reports/health/{id}/export',
            path: {
                'id': id,
            },
            errors: {
                400: `报告ID格式错误（非有效的UUID）`,
                401: `未授权，需要登录`,
                403: `权限不足，需要 report:export 权限`,
                404: `报告不存在`,
            },
        });
    }
    /**
     * 下载数据导入模板
     *
     * 下载标准的时序数据导入模板文件。
     *
     * 支持格式:
     * - excel: 下载 .xlsx 格式模板（适合批量导入）
     * - csv: 下载 .csv 格式模板（适合批量导入）
     * - json: 下载 .json 格式模板（适合API集成）
     *
     * **设备ID清单（严格区分大小写）：**
     * - SYS-BAT-001 - 电池系统
     * - SYS-PROP-L-001 - 左推进系统
     * - SYS-PROP-R-001 - 右推进系统
     * - SYS-INV-1-001 - 1#日用逆变器系统
     * - SYS-INV-2-001 - 2#日用逆变器系统
     * - SYS-DCPD-001 - 直流配电板系统
     * - SYS-BILGE-001 - 舱底水系统
     * - SYS-COOL-001 - 冷却水泵系统
     *
     * **Excel/CSV 模板字段:**
     * - 设备ID (必填): 设备的唯一标识符，如 SYS-BAT-001
     * - 时间戳 (必填): YYYY-MM-DD HH:mm:ss 格式
     * - 监测点 (必填): 业务监测点名称（中文），如"总电压"、"电机转速"
     * - 指标类型 (必填): voltage, current, temperature, speed, power 等
     * - 数值 (必填): 监测数值
     * - 单位 (可选): 如 V、A、°C、rpm 等
     * - 数据质量 (可选): 正常、异常、疑似
     *
     * **JSON 模板结构:**
     * [{
         * "equipmentId": "SYS-BAT-001",
         * "equipmentName": "电池系统",
         * "timestamp": "2025-01-01T10:00:00Z",
         * "metrics": [
             * {
                 * "monitoringPoint": "总电压",
                 * "metricType": "voltage",
                 * "value": 650.5,
                 * "unit": "V"
                 * }
                 * ]
                 * }]
                 *
                 * **注意事项:**
                 * - 设备ID必须使用系统级格式（SYS-XXX-001），不支持旧格式
                 * - 监测点名称必须使用中文，且与系统定义严格匹配
                 * - 完整监测点列表请参考系统文档
                 *
                 * @param format 模板格式
                 * @returns binary 模板文件下载成功
                 * @throws ApiError
                 */
                public static importControllerDownloadTemplate(
                    format: 'excel' | 'csv' | 'json',
                ): CancelablePromise<Blob> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/imports/template/{format}',
                        path: {
                            'format': format,
                        },
                        errors: {
                            404: `模板文件不存在或格式不支持`,
                        },
                    });
                }
                /**
                 * 上传文件并解析预览
                 *
                 * 上传 Excel 或 CSV 格式的时序数据文件，系统将解析文件并返回预览数据（前100行）。
                 *
                 * **重要字段说明：**
                 *
                 * 必填字段：
                 * - 设备ID: 设备的唯一标识符
                 * - 时间戳: YYYY-MM-DD HH:mm:ss 格式
                 * - 指标类型: 电压、温度、转速等
                 * - 数值: 监测数值
                 *
                 * 可选但强烈推荐的字段：
                 * - **监测点**: 业务监测点名称（如"总电压"、"单体最高温度"）
                 * * 用于精确匹配告警规则
                 * * 不填写可能导致部分告警无法触发
                 * * 最大长度: 100字符
                 * * 示例: "总电压"、"单体最高温度"、"左主机转速"
                 *
                 * 其他可选字段：
                 * - 单位: 如 V、℃、rpm 等
                 * - 数据质量: 正常、异常、疑似
                 *
                 * **下载标准模板：** GET /api/imports/template/excel 或 GET /api/imports/template/csv
                 *
                 * @param formData
                 * @returns any 文件上传成功，返回导入记录和预览数据
                 * @throws ApiError
                 */
                public static importControllerUploadFile(
                    formData: {
                        /**
                         * 要上传的文件（Excel或CSV）
                         */
                        file: Blob;
                        /**
                         * 文件格式
                         */
                        fileFormat: 'excel' | 'csv';
                        /**
                         * 重复数据处理策略
                         */
                        duplicateStrategy?: 'skip' | 'overwrite';
                        /**
                         * 备注信息
                         */
                        remarks?: string;
                    },
                ): CancelablePromise<{
                    /**
                     * 导入记录
                     */
                    importRecord?: Record<string, any>;
                    /**
                     * 预览数据（前100行）
                     */
                    previewData?: any[];
                }> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/api/imports/upload',
                        formData: formData,
                        mediaType: 'multipart/form-data',
                        errors: {
                            400: `文件格式错误或解析失败`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 sensor_data:import 权限`,
                        },
                    });
                }
                /**
                 * 执行数据导入
                 * @param requestBody
                 * @returns ImportRecord 导入执行完成，返回更新后的导入记录
                 * @throws ApiError
                 */
                public static importControllerExecuteImport(
                    requestBody: ImportDataDto,
                ): CancelablePromise<ImportRecord> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/api/imports/execute',
                        body: requestBody,
                        mediaType: 'application/json',
                        errors: {
                            400: `导入任务状态不允许执行`,
                            401: `未授权，请先登录`,
                            403: `权限不足`,
                            404: `导入记录不存在`,
                        },
                    });
                }
                /**
                 * 上传文件并立即执行导入
                 *
                 * 上传文件并立即执行导入，返回完整的导入记录（包括成功/失败统计）。
                 *
                 * **导入后自动执行的增强功能：**
                 * 1. **历史告警回溯**: 对导入的每条数据评估告警阈值，自动生成历史告警记录
                 * 2. **实时数据推送**: 通过 WebSocket 推送每个设备的最新数据（事件名: import:latest-data）
                 *
                 * **重要提示：**
                 * - 强烈建议在文件中包含"监测点"列，以确保告警规则能够精确匹配
                 * - 不填写监测点可能导致部分告警无法触发
                 * - 下载标准模板: GET /api/imports/template/excel 或 GET /api/imports/template/csv
                 *
                 * **字段说明：**
                 * - 设备ID (必填): 设备唯一标识符
                 * - 时间戳 (必填): YYYY-MM-DD HH:mm:ss 格式
                 * - 监测点 (可选但推荐): 业务监测点名称，如"总电压"、"单体最高温度"
                 * - 指标类型 (必填): 电压、温度、转速等
                 * - 数值 (必填): 监测数值
                 * - 单位 (可选): V、℃、rpm 等
                 * - 数据质量 (可选): 正常、异常、疑似
                 *
                 * @param formData
                 * @returns ImportRecord 导入完成，返回导入记录
                 * @throws ApiError
                 */
                public static importControllerUploadAndImport(
                    formData: {
                        /**
                         * 要上传的文件
                         */
                        file: Blob;
                        fileFormat: 'excel' | 'csv';
                        duplicateStrategy: 'skip' | 'overwrite';
                        /**
                         * 是否跳过无效行
                         */
                        skipInvalidRows?: boolean;
                        remarks?: string;
                    },
                ): CancelablePromise<ImportRecord> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/api/imports/upload-and-import',
                        formData: formData,
                        mediaType: 'multipart/form-data',
                        errors: {
                            400: `文件格式错误或解析失败`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 sensor_data:import 权限`,
                        },
                    });
                }
                /**
                 * 查询导入记录列表
                 * 分页查询导入记录列表，支持按状态、文件格式等条件筛选
                 * @param page 页码
                 * @param pageSize 每页数量
                 * @param status 导入状态
                 * @param fileFormat 文件格式
                 * @param startDate 开始日期
                 * @param endDate 结束日期
                 * @returns any 成功获取导入记录列表
                 * @throws ApiError
                 */
                public static importControllerFindAll(
                    page: number = 1,
                    pageSize: number = 10,
                    status?: 'pending' | 'processing' | 'completed' | 'partial' | 'failed',
                    fileFormat?: 'excel' | 'csv' | 'json',
                    startDate?: string,
                    endDate?: string,
                ): CancelablePromise<{
                    code?: number;
                    message?: string;
                    data?: {
                        items?: Array<ImportRecord>;
                        total?: number;
                        page?: number;
                        pageSize?: number;
                        totalPages?: number;
                    };
                    timestamp?: number;
                }> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/imports',
                        query: {
                            'page': page,
                            'pageSize': pageSize,
                            'status': status,
                            'fileFormat': fileFormat,
                            'startDate': startDate,
                            'endDate': endDate,
                        },
                        errors: {
                            400: `查询参数格式错误`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 sensor_data:read 权限`,
                        },
                    });
                }
                /**
                 * 查询导入记录详情
                 * 根据ID查询单个导入记录的详细信息，包含完整的错误信息和统计数据
                 * @param id 导入记录ID (UUID格式)
                 * @returns ImportRecord 返回导入记录详情
                 * @throws ApiError
                 */
                public static importControllerFindOne(
                    id: string,
                ): CancelablePromise<ImportRecord> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/imports/{id}',
                        path: {
                            'id': id,
                        },
                        errors: {
                            400: `导入记录ID格式错误（非有效的UUID）`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 sensor_data:read 权限`,
                            404: `导入记录不存在`,
                        },
                    });
                }
                /**
                 * 删除导入记录
                 * 删除指定的导入记录（物理删除）
                 * @param id 导入记录ID (UUID格式)
                 * @returns any 删除成功
                 * @throws ApiError
                 */
                public static importControllerRemove(
                    id: string,
                ): CancelablePromise<any> {
                    return __request(OpenAPI, {
                        method: 'DELETE',
                        url: '/api/imports/{id}',
                        path: {
                            'id': id,
                        },
                        errors: {
                            400: `导入记录ID格式错误（非有效的UUID）`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 sensor_data:delete 权限`,
                            404: `导入记录不存在`,
                        },
                    });
                }
                /**
                 * 监测数据统计
                 * 对指定设备的监测指标进行统计分析，计算最大值、最小值、平均值和标准差
                 * @param equipmentId 设备ID（UUID格式）
                 * @param metricType 监测指标类型
                 * @param startTime 开始时间（Unix时间戳，毫秒）
                 * @param endTime 结束时间（Unix时间戳，毫秒）
                 * @returns MonitoringStatsResponseDto 统计成功，返回监测数据统计信息
                 * @throws ApiError
                 */
                public static queryControllerGetMonitoringStatistics(
                    equipmentId: string,
                    metricType: 'temperature' | 'pressure' | 'humidity' | 'vibration' | 'speed' | 'current' | 'voltage' | 'power' | 'frequency' | 'level' | 'resistance' | 'switch',
                    startTime: number,
                    endTime: number,
                ): CancelablePromise<MonitoringStatsResponseDto> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/statistics/monitoring',
                        query: {
                            'equipmentId': equipmentId,
                            'metricType': metricType,
                            'startTime': startTime,
                            'endTime': endTime,
                        },
                        errors: {
                            400: `参数错误或时间范围无效`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 device:read 和 sensor_data:read 权限`,
                            404: `设备不存在`,
                        },
                    });
                }
                /**
                 * 告警统计
                 * 统计指定时间范围内的告警数据，按严重程度和处理状态分组
                 * @param startTime 开始时间（Unix时间戳，毫秒）
                 * @param endTime 结束时间（Unix时间戳，毫秒）
                 * @param equipmentId 设备ID（可选，不填则统计所有设备）
                 * @param severity 严重程度筛选（可选）
                 * @returns AlarmStatsResponseDto 统计成功，返回告警统计信息
                 * @throws ApiError
                 */
                public static queryControllerGetAlarmStatistics(
                    startTime: number,
                    endTime: number,
                    equipmentId?: string,
                    severity?: 'low' | 'medium' | 'high' | 'critical',
                ): CancelablePromise<AlarmStatsResponseDto> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/statistics/alarms',
                        query: {
                            'equipmentId': equipmentId,
                            'startTime': startTime,
                            'endTime': endTime,
                            'severity': severity,
                        },
                        errors: {
                            400: `参数错误或时间范围无效`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 alert:read 权限`,
                        },
                    });
                }
                /**
                 * 设备状态概览
                 * 获取所有设备的状态统计概览，包括在线、离线和异常设备数量
                 * @returns EquipmentOverviewDto 查询成功，返回设备状态概览
                 * @throws ApiError
                 */
                public static queryControllerGetEquipmentOverview(): CancelablePromise<EquipmentOverviewDto> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/statistics/equipment',
                        errors: {
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 device:read 权限`,
                        },
                    });
                }
                /**
                 * 获取设备完整档案
                 * 获取设备的完整档案信息，包括基本信息、监测数据统计、告警统计等
                 * @param id 设备ID（UUID格式）
                 * @returns any 查询成功，返回设备完整档案
                 * @throws ApiError
                 */
                public static queryControllerGetEquipmentCompleteProfile(
                    id: string,
                ): CancelablePromise<{
                    /**
                     * 设备基本信息
                     */
                    equipment?: Record<string, any>;
                    /**
                     * 监测数据统计
                     */
                    monitoringStats?: Record<string, any>;
                    /**
                     * 告警统计
                     */
                    alarmStats?: Record<string, any>;
                    /**
                     * 健康评分
                     */
                    healthScore?: number;
                }> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/equipment/{id}/profile',
                        path: {
                            'id': id,
                        },
                        errors: {
                            400: `设备ID格式错误（非有效的UUID）`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 device:read 权限`,
                            404: `设备不存在`,
                        },
                    });
                }
                /**
                 * 导出监测数据
                 * 根据查询条件导出监测数据为Excel或CSV文件
                 * @param requestBody
                 * @returns ExportResponseDto 导出成功，返回导出文件信息
                 * @throws ApiError
                 */
                public static queryControllerExportMonitoringData(
                    requestBody: ExportMonitoringDataDto,
                ): CancelablePromise<ExportResponseDto> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/api/export/monitoring',
                        body: requestBody,
                        mediaType: 'application/json',
                        errors: {
                            400: `参数错误或导出条件无效`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 sensor_data:read 权限`,
                        },
                    });
                }
                /**
                 * 导出告警记录
                 * 根据查询条件导出告警记录为Excel或CSV文件
                 * @param requestBody
                 * @returns ExportResponseDto 导出成功，返回导出文件信息
                 * @throws ApiError
                 */
                public static queryControllerExportAlarms(
                    requestBody: ExportAlarmsDto,
                ): CancelablePromise<ExportResponseDto> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/api/export/alarms',
                        body: requestBody,
                        mediaType: 'application/json',
                        errors: {
                            400: `参数错误或导出条件无效`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 alert:read 权限`,
                        },
                    });
                }
                /**
                 * 导出健康报告
                 * 根据查询条件导出健康评估报告为PDF文件
                 * @param requestBody
                 * @returns ExportResponseDto 导出成功，返回导出文件信息
                 * @throws ApiError
                 */
                public static queryControllerExportReports(
                    requestBody: ExportReportsDto,
                ): CancelablePromise<ExportResponseDto> {
                    return __request(OpenAPI, {
                        method: 'POST',
                        url: '/api/export/reports',
                        body: requestBody,
                        mediaType: 'application/json',
                        errors: {
                            400: `参数错误或导出条件无效`,
                            401: `未授权，需要登录`,
                            403: `权限不足，需要 report:read 权限`,
                            404: `未找到符合条件的报告`,
                        },
                    });
                }
                /**
                 * 下载导出文件
                 * 下载已导出的文件
                 * @param filename 文件名
                 * @returns binary 下载成功，返回文件流
                 * @throws ApiError
                 */
                public static queryControllerDownloadFile(
                    filename: string,
                ): CancelablePromise<Blob> {
                    return __request(OpenAPI, {
                        method: 'GET',
                        url: '/api/export/download/{filename}',
                        path: {
                            'filename': filename,
                        },
                        errors: {
                            404: `文件不存在或已过期`,
                        },
                    });
                }
            }
