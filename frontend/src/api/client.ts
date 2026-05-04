import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { apiCache } from '@/utils/apiCache';

class ApiClient {
  private _instance: AxiosInstance;
  public defaultRetries = 0;

  constructor(config: AxiosRequestConfig = {}) {
    this._instance = axios.create({
      baseURL: (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
      ...config,
    });

    this.setupInterceptors();
  }

  get instance(): AxiosInstance {
    return this._instance;
  }

  private setupInterceptors() {
    this._instance.interceptors.request.use(
      (config) => {
        config.headers['X-Request-ID'] = crypto.randomUUID();
        return config;
      },
      (error) => Promise.reject(error)
    );

    this._instance.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      async (error: AxiosError<ApiErrorData>) => {
        const status = error.response?.status;
        const data = error.response?.data;
        const message = data?.error || error.message || '请求失败';

        if (status === 401) {
          toast.error('认证失效，请检查 API Key 配置');
        } else if (status === 403) {
          toast.error('权限不足');
        } else if (status === 404) {
          toast.error('请求的资源不存在');
        } else if (status === 429) {
          toast.warning('请求过于频繁，请稍后重试');
        } else if (status === 500) {
          toast.error('服务器内部错误');
        } else if (status === 502 || status === 503) {
          toast.error('服务暂时不可用，请检查后端是否运行');
        } else if (status === undefined) {
          toast.error('无法连接到服务器，请检查网络或后端服务');
        } else {
          toast.error(message);
        }

        return Promise.reject(new ApiClientError(message, status, data));
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const cacheKey = config?.params ? `${url}` : url
    const cached = apiCache.get<T>(cacheKey, config?.params as Record<string, unknown>)
    if (cached !== null) return cached

    const result = await this._instance.get<T, T>(url, config)
    apiCache.set(cacheKey, result, config?.params as Record<string, unknown>)
    return result
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    apiCache.invalidatePattern(url)
    return this._instance.post<T, T>(url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    apiCache.invalidatePattern(url)
    return this._instance.put<T, T>(url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    apiCache.invalidatePattern(url)
    return this._instance.delete<T, T>(url, config);
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    apiCache.invalidatePattern(url)
    return this._instance.patch<T, T>(url, data, config);
  }

  async stream(url: string, data?: unknown): Promise<ReadableStream<Uint8Array>> {
    const response = await fetch(`${this._instance.defaults.baseURL}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiClientError(
        errorData?.error || `流式请求失败: ${response.status}`,
        response.status
      );
    }

    if (!response.body) {
      throw new ApiClientError('流式响应不可用');
    }

    return response.body;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number,
    delayMs: number = 1000,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      const status = (error as any)?.status;
      // 仅对 5xx 服务器错误和网络错误重试，4xx 错误不重试
      if (status && status >= 400 && status < 500) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.retryWithBackoff(fn, retries - 1, delayMs * 2);
    }
  }

  async getWithRetry<T>(url: string, config?: AxiosRequestConfig, retries?: number): Promise<T> {
    const maxRetries = retries ?? this.defaultRetries;
    return this.retryWithBackoff(() => this.get<T>(url, config), maxRetries);
  }

  setRetries(retries: number) {
    this.defaultRetries = retries;
  }

  clearCache() {
    apiCache.clear()
  }
}

class ApiClientError extends Error {
  status?: number;
  data?: ApiErrorData;

  constructor(message: string, status?: number, data?: ApiErrorData) {
    super(message);
    this.name = 'ApiClientError';
    if (status !== undefined) {
      this.status = status;
    }
    if (data !== undefined) {
      this.data = data;
    }
  }
}

interface ApiErrorData {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export const apiClient = new ApiClient();
export { ApiClientError };
export type { ApiErrorData };
