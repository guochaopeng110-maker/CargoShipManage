/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SystemMonitoringService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static systemMonitoringControllerGetMetrics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/systemmonitoring/metrics',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static systemMonitoringControllerGetPerformanceSummary(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/systemmonitoring/summary',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static systemMonitoringControllerGetWebSocketStatus(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/systemmonitoring/websocket',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static systemMonitoringControllerGetCacheStats(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/systemmonitoring/cache',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static systemMonitoringControllerClearCache(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/systemmonitoring/cache/clear',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static systemMonitoringControllerHealthCheck(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/systemmonitoring/health',
        });
    }
}
