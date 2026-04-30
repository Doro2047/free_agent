export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} 不存在`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = '网络连接失败') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends AppError {
  constructor(timeout: number) {
    super(`请求超时 (${timeout}ms)`, 'TIMEOUT_ERROR', 408);
    this.name = 'TimeoutError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = '服务器内部错误') {
    super(message, 'SERVER_ERROR', 500);
    this.name = 'ServerError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('请求过于频繁，请稍后重试', 'RATE_LIMIT_ERROR', 429);
    this.details = retryAfter ? { retryAfter } : undefined;
    this.name = 'RateLimitError';
  }
}

export class StreamError extends AppError {
  constructor(message: string = '流式传输失败') {
    super(message, 'STREAM_ERROR');
    this.name = 'StreamError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorCode(error: unknown): string | undefined {
  if (isAppError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return (error as any).code;
  }
  return undefined;
}

export function formatErrorForUser(error: unknown): string {
  if (isAppError(error)) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return `输入验证失败: ${error.message}`;
      case 'AUTH_ERROR':
        return '认证失败，请检查 API Key 配置';
      case 'AUTHORIZATION_ERROR':
        return '权限不足，无法执行此操作';
      case 'NOT_FOUND':
        return `未找到相关资源: ${error.message}`;
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络设置';
      case 'TIMEOUT_ERROR':
        return '请求超时，请稍后重试';
      case 'RATE_LIMIT_ERROR':
        return '请求过于频繁，请稍后重试';
      case 'SERVER_ERROR':
        return '服务器错误，请稍后重试';
      case 'STREAM_ERROR':
        return '流式传输中断，请重试';
      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return '请求已取消';
    }
    if (error.message.includes('fetch')) {
      return '网络请求失败';
    }
    return error.message;
  }

  return '发生未知错误';
}

export interface ErrorLog {
  timestamp: number;
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, unknown>;
}

class ErrorTracker {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  log(error: unknown, context?: Record<string, unknown>): void {
    const log: ErrorLog = {
      timestamp: Date.now(),
      message: getErrorMessage(error),
      code: getErrorCode(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
    };

    this.logs.push(log);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    console.error('[ErrorTracker]', log);
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }

  getRecentErrors(count: number = 10): ErrorLog[] {
    return this.logs.slice(-count);
  }
}

export const errorTracker = new ErrorTracker();

export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    onError?: (error: unknown) => void;
    fallback?: (...args: Parameters<T>) => ReturnType<T>;
    errorTracker?: boolean;
  } = {}
): T {
  return function (this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    try {
      const result = fn.apply(this, args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          if (options.errorTracker !== false) {
            errorTracker.log(error);
          }
          options.onError?.(error);
          return undefined;
        }) as ReturnType<T>;
      }
      return result;
    } catch (error) {
      if (options.errorTracker !== false) {
        errorTracker.log(error);
      }
      options.onError?.(error);
      return options.fallback?.apply(this, args);
    }
  } as T;
}

export async function asyncWithErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    onError?: (error: unknown) => void;
    fallback?: T;
    errorTracker?: boolean;
  } = {}
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (options.errorTracker !== false) {
      errorTracker.log(error);
    }
    options.onError?.(error);
    return options.fallback;
  }
}
