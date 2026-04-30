import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { AppError } from './errors';

export type IpcChannel = string;

export interface IpcRequest<T = unknown> {
  channel: IpcChannel;
  data?: T;
  timeout?: number;
}

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
}

export interface IpcHandler<TRequest = unknown, TResponse = unknown> {
  handle(request: TRequest): Promise<TResponse>;
  validate?: (request: TRequest) => boolean;
  transform?: (response: TResponse) => TResponse;
}

export class IpcError extends AppError {
  constructor(
    message: string,
    public channel: string,
    public originalError?: Error
  ) {
    super(message, 'IPC_ERROR');
  }
}

export class IpcTimeoutError extends IpcError {
  constructor(channel: string, timeout: number) {
    super(`IPC request to ${channel} timed out after ${timeout}ms`, channel);
    this.name = 'IpcTimeoutError';
  }
}

export class IpcChannelError extends IpcError {
  constructor(channel: string, message: string) {
    super(message, channel);
    this.name = 'IpcChannelError';
  }
}

export interface IpcOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  validateResponse?: boolean;
  logRequests?: boolean;
}

const defaultOptions: Required<IpcOptions> = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  validateResponse: true,
  logRequests: false,
};

export class IpcClient {
  private options: Required<IpcOptions>;
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timeoutId?: ReturnType<typeof setTimeout> }> = new Map();
  private handlers: Map<string, IpcHandler> = new Map();
  private channelListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private requestIdCounter: number = 0;

  constructor(options: IpcOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.setupRendererListeners();
  }

  private getRequestId(): string {
    return `${Date.now()}-${++this.requestIdCounter}`;
  }

  private setupRendererListeners(): void {
    ipcRenderer.on('ipc-response', (event: IpcRendererEvent, response: IpcResponse & { requestId: string }) => {
      const pending = this.pendingRequests.get(response.requestId);
      
      if (pending) {
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
        this.pendingRequests.delete(response.requestId);

        if (response.success && response.data !== undefined) {
          pending.resolve(response.data);
        } else if (response.error) {
          pending.reject(new IpcError(
            response.error.message,
            response.requestId,
            response.error.stack ? new Error(response.error.stack) : undefined
          ));
        }
      }
    });

    ipcRenderer.on('ipc-event', (event: IpcRendererEvent, data: { channel: string; payload: unknown }) => {
      const listeners = this.channelListeners.get(data.channel);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(data.payload);
          } catch (error) {
            console.error(`Error in IPC event listener for ${data.channel}:`, error);
          }
        });
      }
    });
  }

  private async sendRequest<TResponse>(channel: string, data?: unknown, requestId?: string): Promise<TResponse> {
    const id = requestId || this.getRequestId();

    if (this.options.logRequests) {
      console.log(`[IPC] Sending request to ${channel}:`, { requestId: id, data });
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new IpcTimeoutError(channel, this.options.timeout));
      }, this.options.timeout);

      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject, timeoutId });

      ipcRenderer.send('ipc-request', { channel, data, requestId: id });
    });
  }

  async invoke<TResponse = unknown>(channel: string, data?: unknown, options?: Partial<IpcOptions>): Promise<TResponse> {
    const mergedOptions = { ...this.options, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= mergedOptions.retries; attempt++) {
      try {
        const response = await this.sendRequest<TResponse>(channel, data);

        if (mergedOptions.validateResponse && response === undefined) {
          throw new IpcChannelError(channel, 'Invalid response from main process');
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof IpcTimeoutError && attempt < mergedOptions.retries) {
          await new Promise(resolve => setTimeout(resolve, mergedOptions.retryDelay * Math.pow(2, attempt)));
          continue;
        }

        if (attempt < mergedOptions.retries && this.isRetryableError(error)) {
          await new Promise(resolve => setTimeout(resolve, mergedOptions.retryDelay * Math.pow(2, attempt)));
          continue;
        }

        throw error;
      }
    }

    throw lastError || new IpcError('Max retries exceeded', channel);
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof IpcError) {
      return !(error instanceof IpcTimeoutError);
    }
    return true;
  }

  on(channel: string, listener: (data: unknown) => void): () => void {
    if (!this.channelListeners.has(channel)) {
      this.channelListeners.set(channel, new Set());
    }
    
    this.channelListeners.get(channel)!.add(listener);

    return () => {
      const listeners = this.channelListeners.get(channel);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.channelListeners.delete(channel);
        }
      }
    };
  }

  once(channel: string, listener: (data: unknown) => void): void {
    const wrappedListener = (data: unknown) => {
      listener(data);
      const listeners = this.channelListeners.get(channel);
      if (listeners) {
        listeners.delete(wrappedListener);
      }
    };

    if (!this.channelListeners.has(channel)) {
      this.channelListeners.set(channel, new Set());
    }
    
    this.channelListeners.get(channel)!.add(wrappedListener);
  }

  off(channel: string, listener?: (data: unknown) => void): void {
    if (listener) {
      const listeners = this.channelListeners.get(channel);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.channelListeners.delete(channel);
        }
      }
    } else {
      this.channelListeners.delete(channel);
    }
  }

  send(channel: string, data?: unknown): void {
    ipcRenderer.send('ipc-event', { channel, payload: data });
  }

  registerHandler<TRequest = unknown, TResponse = unknown>(
    channel: string,
    handler: IpcHandler<TRequest, TResponse>
  ): () => void {
    this.handlers.set(channel, handler as IpcHandler);

    return () => {
      this.handlers.delete(channel);
    };
  }

  unregisterHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  hasHandler(channel: string): boolean {
    return this.handlers.has(channel);
  }

  getHandler(channel: string): IpcHandler | undefined {
    return this.handlers.get(channel);
  }

  cancelRequest(requestId: string): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.reject(new IpcError('Request cancelled', requestId));
      this.pendingRequests.delete(requestId);
    }
  }

  cancelAllRequests(): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.reject(new IpcError('All requests cancelled', id));
    }
    this.pendingRequests.clear();
  }

  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  destroy(): void {
    this.cancelAllRequests();
    this.handlers.clear();
    this.channelListeners.clear();
  }
}

export const ipcClient = new IpcClient();

export function createIpcClient(options?: IpcOptions): IpcClient {
  return new IpcClient(options);
}

export interface IpcMainHandler<TRequest = unknown, TResponse = unknown> {
  channel: string;
  handler: (request: TRequest) => Promise<TResponse> | TResponse;
  validate?: (request: TRequest) => boolean | Promise<boolean>;
  transformRequest?: (request: TRequest) => TRequest;
  transformResponse?: (response: TResponse) => TResponse;
  errorHandler?: (error: Error) => { code: string; message: string };
}

export class IpcMain {
  private handlers: Map<string, IpcMainHandler> = new Map();
  private middleware: Array<(handler: IpcMainHandler, request: unknown) => unknown | Promise<unknown>> = [];

  use(middleware: (handler: IpcMainHandler, request: unknown) => unknown | Promise<unknown>): void {
    this.middleware.push(middleware);
  }

  handle<TRequest = unknown, TResponse = unknown>(
    handler: IpcMainHandler<TRequest, TResponse>
  ): () => void {
    this.handlers.set(handler.channel, handler as IpcMainHandler);

    const ipcHandler = async (event: Electron.IpcMainInvokeEvent, request: { channel: string; data?: TRequest; requestId: string }) => {
      const handlerConfig = this.handlers.get(request.channel);

      if (!handlerConfig) {
        return {
          success: false,
          error: { code: 'HANDLER_NOT_FOUND', message: `No handler registered for channel: ${request.channel}` },
          requestId: request.requestId,
        };
      }

      try {
        let data = request.data;

        if (handlerConfig.validate) {
          const isValid = await handlerConfig.validate(data as TRequest);
          if (!isValid) {
            throw new IpcChannelError(request.channel, 'Request validation failed');
          }
        }

        if (handlerConfig.transformRequest) {
          data = handlerConfig.transformRequest(data as TRequest);
        }

        let result = await handlerConfig.handler(data as TRequest);

        if (handlerConfig.transformResponse) {
          result = handlerConfig.transformResponse(result as TResponse);
        }

        return {
          success: true,
          data: result,
          requestId: request.requestId,
        };
      } catch (error) {
        const err = error as Error;
        let code = 'UNKNOWN_ERROR';
        let message = err.message;

        if (handlerConfig.errorHandler) {
          const handled = handlerConfig.errorHandler(err);
          code = handled.code;
          message = handled.message;
        } else if (err instanceof AppError) {
          code = err.code || 'APP_ERROR';
        } else if (err instanceof IpcError) {
          code = err.name;
        }

        return {
          success: false,
          error: { code, message, stack: err.stack },
          requestId: request.requestId,
        };
      }
    };

    if (typeof window !== 'undefined') {
      const { ipcMain } = require('@electron/ipc');
      ipcMain.handle('ipc-request', ipcHandler);
    }

    return () => {
      this.handlers.delete(handler.channel);
      if (typeof window !== 'undefined') {
        const { ipcMain } = require('@electron/ipc');
        ipcMain.removeHandler('ipc-request');
      }
    };
  }

  handleAll<TRequest = unknown, TResponse = unknown>(
    handlers: IpcMainHandler<TRequest, TResponse>[]
  ): () => void {
    const cleanups = handlers.map(handler => this.handle(handler));
    return () => cleanups.forEach(cleanup => cleanup());
  }

  getHandler(channel: string): IpcMainHandler | undefined {
    return this.handlers.get(channel);
  }

  hasHandler(channel: string): boolean {
    return this.handlers.has(channel);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }

  removeAllHandlers(): void {
    this.handlers.clear();
  }

  getChannels(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const ipcMain = new IpcMain();

export function createIpcMain(): IpcMain {
  return new IpcMain();
}

export function exposeApi<T extends Record<string, unknown>>(api: T): void {
  if (typeof window !== 'undefined' && typeof window !== 'undefined') {
    contextBridge.exposeInMainWorld('electronAPI', api);
  }
}

export function getExposedApi<T = Record<string, unknown>>(): T {
  if (typeof window !== 'undefined') {
    return (window as Window & { electronAPI?: T }).electronAPI as T;
  }
  return {} as T;
}

export function createApiProxy<T extends Record<string, unknown>>(client: IpcClient): T {
  const handler = {
    get: (_target: unknown, channel: string) => {
      return async (data?: unknown, options?: Partial<IpcOptions>) => {
        return client.invoke(channel, data, options);
      };
    },
  };

  return new Proxy({}, handler) as T;
}

export const IpcChannels = {
  APP_INFO: 'app:info',
  APP_VERSION: 'app:version',
  APP_QUIT: 'app:quit',
  APP_MINIMIZE: 'app:minimize',
  APP_MAXIMIZE: 'app:maximize',
  APP_CLOSE: 'app:close',
  APP_IS_MAXIMIZED: 'app:is-maximized',
  
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_STATUS: 'server:status',
  SERVER_RESTART: 'server:restart',
  SERVER_HEALTH: 'server:health',
  
  LLAMA_START: 'llama:start',
  LLAMA_STOP: 'llama:stop',
  LLAMA_STATUS: 'llama:status',
  
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  WINDOW_TOGGLE_FULLSCREEN: 'window:toggle-fullscreen',
  
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_RESET: 'settings:reset',
  
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_DELETE: 'file:delete',
  FILE_LIST: 'file:list',
  FILE_EXISTS: 'file:exists',
  FILE_INFO: 'file:info',
  
  COMMAND_EXECUTE: 'command:execute',
  COMMAND_CANCEL: 'command:cancel',
  
  CLIPBOARD_READ: 'clipboard:read',
  CLIPBOARD_WRITE: 'clipboard:write',
  
  DIALOG_OPEN: 'dialog:open',
  DIALOG_SAVE: 'dialog:save',
  DIALOG_MESSAGE: 'dialog:message',
  
  NOTIFICATION_SHOW: 'notification:show',
  
  THEME_GET: 'theme:get',
  THEME_SET: 'theme:set',
  
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  
  LOG_MESSAGE: 'log:message',
} as const;

export type IpcChannelName = typeof IpcChannels[keyof typeof IpcChannels];
