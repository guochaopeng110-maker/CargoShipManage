/**
 * 货船智能机舱管理系统 - API客户端包装器
 * 
 * 统一的HTTP客户端，提供请求拦截器、认证管理、错误处理和重试机制
 * 基于货船智能机舱管理系统API契约设计
 */

// 导入认证相关的类型定义
import { AuthError } from '../types/auth';

/**
 * API客户端配置接口
 * 
 * 定义了API客户端的基础配置参数
 */
export interface ApiClientConfig {
  baseURL: string; // API基础URL地址
  timeout: number; // 请求超时时间（毫秒）
  retryAttempts: number; // 失败重试次数
  retryDelay: number; // 重试延迟时间（毫秒）
}

/**
 * 请求配置接口
 * 
 * 定义了HTTP请求的可选配置参数
 */
export interface RequestConfig {
  headers?: Record<string, string>; // 自定义请求头
  params?: Record<string, any>; // URL查询参数
  timeout?: number; // 单次请求超时时间
  retryAttempts?: number; // 单次请求重试次数
  data?: any; // 请求体数据
  method?: string; // HTTP方法
  url?: string; // 完整的请求URL
}

/**
 * API响应标准格式
 * 
 * 统一所有API响应的数据结构
 */
export interface ApiResponse<T = any> {
  data: T; // 响应数据
  success: boolean; // 请求是否成功
  message?: string; // 响应消息
  timestamp: number; // 响应时间戳
  requestId?: string; // 请求唯一标识符
}

/**
 * API错误标准格式
 * 
 * 统一所有API错误的结构化表示
 */
export interface ApiError {
  code: string; // 错误代码
  message: string; // 错误消息
  details?: any; // 错误详细信息
  statusCode?: number; // HTTP状态码
  timestamp: number; // 错误发生时间戳
  requestId?: string; // 请求唯一标识符
}

/**
 * ApiError 类实现
 *
 * 提供一个可实例化的错误对象，用于API相关的错误处理
 */
export class ApiError extends Error implements ApiError {
  code: string;
  details?: any;
  statusCode?: number;
  timestamp: number;
  requestId?: string;

  constructor(message: string, statusCode?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || 'UNKNOWN_ERROR';
    this.details = details;
    this.timestamp = Date.now();
  }
}

/**
 * 分页响应格式
 * 
 * 用于列表数据的分页查询响应
 */
export interface PaginatedResponse<T> {
  items: T[]; // 当前页数据项
  total: number; // 总数据项数
  page: number; // 当前页码
  pageSize: number; // 每页大小
  totalPages: number; // 总页数
  hasNext: boolean; // 是否有下一页
  hasPrevious: boolean; // 是否有上一页
}

/**
 * 统一的API客户端类
 * 
 * 功能特性：
 * 1. 自动请求认证和令牌刷新
 * 2. 请求重试机制（网络错误、5xx错误等）
 * 3. 统一的错误处理和标准化
 * 4. 请求超时控制
 * 5. 文件上传支持（带进度）
 * 6. 请求/响应拦截器
 * 7. 详细的日志和调试信息
 */
export class ApiClient {
  // 私有属性
  private baseURL: string; // API基础URL
  private timeout: number; // 默认超时时间
  private retryAttempts: number; // 默认重试次数
  private retryDelay: number; // 默认重试延迟
  private authToken: string | null = null; // 访问令牌
  private refreshToken: string | null = null; // 刷新令牌
  private isRefreshing = false; // 是否正在刷新令牌
  private failedRequests: Array<(token?: string) => void> = []; // 等待令牌刷新的请求队列

  /**
   * 构造函数
   * 
   * @param config API客户端配置
   */
  constructor(config: ApiClientConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout;
    this.retryAttempts = config.retryAttempts;
    this.retryDelay = config.retryDelay;
  }

  /**
   * 设置认证令牌
   * 
   * @param token 访问令牌（设为null清除令牌）
   * @param refreshToken 刷新令牌（可选）
   */
  setAuthToken(token: string | null, refreshToken?: string | null): void {
    this.authToken = token;
    this.refreshToken = refreshToken || null;
    
    // 如果token为null或undefined，清除令牌
    if (!token) {
      this.authToken = null;
    }
  }

  /**
   * GET请求
   * 
   * @param endpoint API端点
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, config);
  }

  /**
   * POST请求
   * 
   * @param endpoint API端点
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, { ...config, data });
  }

  /**
   * PUT请求
   * 
   * @param endpoint API端点
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, { ...config, data });
  }

  /**
   * DELETE请求
   * 
   * @param endpoint API端点
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, config);
  }

  /**
   * PATCH请求
   * 
   * @param endpoint API端点
   * @param data 请求数据
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, { ...config, data });
  }

  /**
   * 通用请求方法
   * 
   * 包含重试逻辑、认证处理和错误处理
   * 
   * @param method HTTP方法
   * @param endpoint API端点
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  private async request<T = any>(
    method: string,
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const requestConfig = this.buildRequestConfig(method, url, config);

    let lastError: ApiError | null = null;
    const maxAttempts = config.retryAttempts || this.retryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.executeRequest<T>(requestConfig);
        return response;
      } catch (error) {
        lastError = this.normalizeError(error, attempt);
        
        // 如果是401错误，尝试刷新令牌
        if (lastError.statusCode === 401 && this.refreshToken && attempt === 1) {
          await this.handleTokenRefresh();
          continue; // 重新尝试请求
        }
        
        // 对于可重试的错误，在最后一次尝试前等待
        if (attempt < maxAttempts && this.isRetryableError(lastError)) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        throw lastError;
      }
    }

    throw lastError;
  }

  /**
   * 构建请求配置
   * 
   * @param method HTTP方法
   * @param url 请求URL
   * @param config 原始请求配置
   * @returns RequestConfig
   */
  private buildRequestConfig(method: string, url: string, config: RequestConfig): RequestConfig {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };

    // 添加认证头
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // 添加请求ID
    headers['X-Request-ID'] = this.generateRequestId();

    return {
      method,
      headers,
      ...config,
      timeout: config.timeout || this.timeout,
      url, // 完整的请求URL
    };
  }

  /**
   * 执行请求
   * 
   * @param config 请求配置
   * @returns Promise<ApiResponse<T>>
   */
  private async executeRequest<T = any>(config: RequestConfig): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url!, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        throw {
          statusCode: response.status,
          ...errorData,
        };
      }

      const data = await response.json();
      return {
        data: data.data || data,
        success: true,
        message: data.message,
        timestamp: Date.now(),
        requestId: response.headers.get('X-Request-ID') || undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 处理令牌刷新
   * 
   * 自动刷新过期的访问令牌，支持请求排队等待
   */
  private async handleTokenRefresh(): Promise<void> {
    if (this.isRefreshing) {
      // 如果正在刷新，等待完成
      return new Promise((resolve) => {
        this.failedRequests.push(() => resolve());
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.authToken = data.data.accessToken;
      this.refreshToken = data.data.refreshToken;

      // 重试所有失败的请求
      this.failedRequests.forEach(resolve => resolve());
      this.failedRequests = [];
    } catch (error) {
      // 刷新失败，清除令牌
      this.authToken = null;
      this.refreshToken = null;
      this.failedRequests.forEach(resolve => resolve());
      this.failedRequests = [];
      
      // 跳转到登录页
      window.location.href = '/login';
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 解析错误响应
   * 
   * @param response fetch响应对象
   * @returns Promise<Partial<ApiError>>
   */
  private async parseErrorResponse(response: Response): Promise<Partial<ApiError>> {
    try {
      const errorData = await response.json();
      return {
        code: errorData.code || 'API_ERROR',
        message: errorData.message || 'An error occurred',
        details: errorData.details,
        timestamp: Date.now(),
      };
    } catch {
      return {
        code: 'PARSE_ERROR',
        message: 'Failed to parse error response',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 标准化错误格式
   * 
   * @param error 原始错误对象
   * @param attempt 当前重试次数
   * @returns ApiError
   */
  private normalizeError(error: any, attempt: number): ApiError {
    if (error.name === 'AbortError') {
      return new ApiError(
        `Request timeout after ${attempt} attempt(s)`,
        undefined,
        'TIMEOUT'
      );
    }

    if (error.statusCode) {
      return new ApiError(
        error.message || 'API request failed',
        error.statusCode,
        error.code || 'API_ERROR',
        error.details
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ApiError(
        'Network error - please check your connection',
        undefined,
        'NETWORK_ERROR'
      );
    }

    return new ApiError(
      error.message || 'An unexpected error occurred',
      undefined,
      'UNKNOWN_ERROR'
    );
  }

  /**
   * 检查是否可重试
   * 
   * @param error API错误
   * @returns boolean
   */
  private isRetryableError(error: ApiError): boolean {
    // 网络错误、5xx错误、429（速率限制）可重试
    return (
      error.code === 'NETWORK_ERROR' ||
      (error.statusCode && error.statusCode >= 500) ||
      error.statusCode === 429
    );
  }

  /**
   * 延迟函数
   * 
   * @param ms 延迟毫秒数
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 生成请求唯一标识符
   * 
   * @returns string
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 文件上传
   * 
   * @param endpoint API端点
   * @param file 要上传的文件
   * @param config 请求配置（可选进度回调）
   * @returns Promise<ApiResponse<T>>
   */
  async upload<T = any>(
    endpoint: string,
    file: File,
    config?: RequestConfig & {
      onProgress?: (progress: number) => void;
    }
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {
      ...config?.headers,
    };

    // 不设置Content-Type，让浏览器自动设置multipart/form-data
    delete headers['Content-Type'];

    const requestConfig: RequestConfig = {
      ...config,
      headers,
    };

    if (config?.onProgress) {
      return this.requestWithProgress<T>('POST', endpoint, formData, requestConfig, config.onProgress);
    }

    return this.request<T>('POST', endpoint, { ...requestConfig, data: formData });
  }

  /**
   * 带进度的文件上传
   * 
   * 使用XMLHttpRequest实现进度跟踪
   * 
   * @param method HTTP方法
   * @param endpoint API端点
   * @param data FormData对象
   * @param config 请求配置
   * @param onProgress 进度回调函数
   * @returns Promise<ApiResponse<T>>
   */
  private async requestWithProgress<T = any>(
    method: string,
    endpoint: string,
    data: FormData,
    config: RequestConfig,
    onProgress: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${this.baseURL}${endpoint}`;

      xhr.open(method, url);

      // 添加认证头
      if (this.authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      }

      // 添加其他头
      Object.entries(config.headers || {}).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              data: response.data || response,
              success: true,
              message: response.message,
              timestamp: Date.now(),
            });
          } catch (error) {
            reject({
              code: 'PARSE_ERROR',
              message: 'Failed to parse upload response',
              timestamp: Date.now(),
            });
          }
        } else {
          reject({
            code: 'UPLOAD_ERROR',
            message: `Upload failed with status ${xhr.status}`,
            statusCode: xhr.status,
            timestamp: Date.now(),
          });
        }
      };

      xhr.onerror = () => {
        reject({
          code: 'NETWORK_ERROR',
          message: 'Upload failed - network error',
          timestamp: Date.now(),
        });
      };

      xhr.send(data);
    });
  }
}

/**
 * 创建API客户端实例
 * 
 * @param baseURL API基础URL
 * @returns ApiClient实例
 */
export const createApiClient = (baseURL: string): ApiClient => {
  return new ApiClient({
    baseURL,
    timeout: 30000, // 30秒
    retryAttempts: 3,
    retryDelay: 1000, // 1秒
  });
};

/**
 * 默认API客户端实例
 *
 * 使用环境变量中的API URL或localhost默认地址
 */
export const apiClient = createApiClient(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
);