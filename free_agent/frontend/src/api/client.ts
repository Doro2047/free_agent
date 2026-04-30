import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { retry, RateLimitError, NetworkError, AppError } from '../utils/errors';
import { debounce } from '../utils/performance';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  onRequest?: (config: InternalAxiosRequestConfig) => void;
  onResponse?: (response: AxiosResponse) => void;
  onError?: (error: AxiosError) => void;
}

export interface RequestCache {
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private cache: Map<string, RequestCache> = new Map();
  private pendingRequests: Map<string, AbortController> = new Map();
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      enableCache: config.enableCache ?? true,
      cacheSize: config.cacheSize || 100,
      cacheTTL: config.cacheTTL || 5 * 60 * 1000,
      onRequest: config.onRequest || (() => {}),
      onResponse: config.onResponse || (() => {}),
      onError: config.onError || (() => {}),
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.startCacheCleanup();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        this.config.onRequest(config);
        return config;
      },
      (error) => {
        return Promise.reject(this.transformError(error));
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        this.config.onResponse(response);
        return response;
      },
      (error) => {
        this.config.onError(error);
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private transformError(error: AxiosError): AppError {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return new AppError('未授权，请检查 API Key', 'UNAUTHORIZED', status);
        case 403:
          return new AppError('禁止访问', 'FORBIDDEN', status);
        case 404:
          return new AppError('资源不存在', 'NOT_FOUND', status);
        case 429:
          return new RateLimitError();
        case 500:
          return new AppError('服务器内部错误', 'SERVER_ERROR', status);
        default:
          return new AppError(
            (data as { message?: string })?.message || '请求失败',
            'REQUEST_FAILED',
            status
          );
      }
    } else if (error.request) {
      return new NetworkError('网络连接失败');
    } else {
      return new AppError(error.message || '请求配置错误', 'CONFIG_ERROR');
    }
  }

  private generateCacheKey(config: AxiosRequestConfig): string {
    return JSON.stringify({
      url: config.url,
      method: config.method,
      params: config.params,
      data: config.data,
    });
  }

  private getCachedResponse<T>(key: string): T | null {
    if (!this.config.enableCache) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCachedResponse(key: string, data: unknown): void {
    if (!this.config.enableCache) return;

    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
    });
  }

  private startCacheCleanup(): void {
    if (typeof window === 'undefined') return;

    const cleanup = debounce(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > value.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000);

    window.addEventListener('focus', cleanup);
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = this.config.retries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await requestFn();
        return response.data;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof RateLimitError && attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (attempt < retries && this.isRetryableError(error)) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new AppError('重试次数耗尽', 'RETRY_EXHAUSTED');
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      return !error.response || error.response.status >= 500;
    }
    return false;
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    options?: { useCache?: boolean; retries?: number }
  ): Promise<T> {
    const cacheKey = this.generateCacheKey({ url, method: 'get', ...config });
    
    if (options?.useCache !== false) {
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached) return cached;
    }

    const requestFn = () => this.client.get<T>(url, config);
    const data = await this.executeWithRetry(requestFn, options?.retries);

    if (options?.useCache !== false) {
      this.setCachedResponse(cacheKey, data);
    }

    return data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    options?: { retries?: number }
  ): Promise<T> {
    const requestFn = () => this.client.post<T>(url, data, config);
    return this.executeWithRetry(requestFn, options?.retries);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    options?: { retries?: number }
  ): Promise<T> {
    const requestFn = () => this.client.put<T>(url, data, config);
    return this.executeWithRetry(requestFn, options?.retries);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
    options?: { retries?: number }
  ): Promise<T> {
    const requestFn = () => this.client.patch<T>(url, data, config);
    return this.executeWithRetry(requestFn, options?.retries);
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
    options?: { retries?: number }
  ): Promise<T> {
    const requestFn = () => this.client.delete<T>(url, config);
    return this.executeWithRetry(requestFn, options?.retries);
  }

  createCancellableRequest<T>(
    requestKey: string,
    requestFn: () => Promise<AxiosResponse<T>>
  ): { promise: Promise<T>; cancel: () => void } {
    const controller = new AbortController();
    this.pendingRequests.set(requestKey, controller);

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    const cancel = () => {
      const existing = this.pendingRequests.get(requestKey);
      if (existing) {
        existing.abort();
        this.pendingRequests.delete(requestKey);
      }
    };

    return { promise, cancel };
  }

  cancelAllRequests(): void {
    for (const controller of this.pendingRequests.values()) {
      controller.abort();
    }
    this.pendingRequests.clear();
  }

  cancelRequest(requestKey: string): void {
    const controller = this.pendingRequests.get(requestKey);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestKey);
    }
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  setHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  removeHeader(key: string): void {
    delete this.client.defaults.headers.common[key];
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  getClient(): AxiosInstance {
    return this.client;
  }

  updateConfig(config: Partial<ApiClientConfig>): void {
    Object.assign(this.config, config);
    
    if (config.baseURL) {
      this.client.defaults.baseURL = config.baseURL;
    }
    if (config.timeout) {
      this.client.defaults.timeout = config.timeout;
    }
  }
}

export const createApiClient = (config: ApiClientConfig) => new ApiClient(config);
