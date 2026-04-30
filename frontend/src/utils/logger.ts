export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
  stack?: string;
  source?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableRemote?: boolean;
  enableBuffer?: boolean;
  bufferSize?: number;
  flushInterval?: number;
  maxFileSize?: number;
  maxFiles?: number;
  filePath?: string;
  remoteUrl?: string;
  format?: 'json' | 'text';
  includeTimestamp?: boolean;
  includeStack?: boolean;
  includeContext?: boolean;
  redactKeys?: string[];
  levels?: {
    debug?: boolean;
    info?: boolean;
    warn?: boolean;
    error?: boolean;
    fatal?: boolean;
  };
  filters?: Array<{
    pattern: RegExp;
    replacement: string;
  }>;
}

export interface LogTransport {
  log(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
  close?(): void | Promise<void>;
}

export class ConsoleTransport implements LogTransport {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  log(entry: LogEntry): void {
    const { level, message, context, error, timestamp } = entry;
    const time = new Date(timestamp).toISOString();

    const logMethods: Record<LogLevel, typeof console.log> = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.log,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
      [LogLevel.FATAL]: console.error,
    };

    const method = logMethods[level];
    const levelName = LogLevel[level];

    const prefix = this.config.includeTimestamp ? `[${time}] ` : '';
    const contextStr = this.config.includeContext && context ? ` ${JSON.stringify(context)}` : '';
    const errorStr = error ? `\n${error.message}\n${error.stack}` : '';

    method(`${prefix}[${levelName}] ${message}${contextStr}${errorStr}`);
  }
}

export class BufferTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private config: LoggerConfig;
  private flushInterval?: ReturnType<typeof setInterval>;
  private onFlush?: (entries: LogEntry[]) => void;

  constructor(config: LoggerConfig, onFlush?: (entries: LogEntry[]) => void) {
    this.config = config;
    this.onFlush = onFlush;

    if (config.flushInterval && config.flushInterval > 0) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, config.flushInterval);
    }
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= (this.config.bufferSize || 100)) {
      this.flush();
    }
  }

  flush(): void {
    if (this.buffer.length > 0) {
      if (this.onFlush) {
        this.onFlush([...this.buffer]);
      }
      this.buffer = [];
    }
  }

  close(): void {
    this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  clear(): void {
    this.buffer = [];
  }
}

export class RemoteTransport implements LogTransport {
  private config: LoggerConfig;
  private buffer: LogEntry[];
  private flushInterval?: ReturnType<typeof setInterval>;
  private isEnabled: boolean = true;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.buffer = [];

    if (config.flushInterval && config.flushInterval > 0) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, config.flushInterval);
    }
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.isEnabled) return;

    this.buffer.push(entry);

    if (this.buffer.length >= (this.config.bufferSize || 10)) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.isEnabled) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.config.remoteUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: entries }),
      });
    } catch (error) {
      console.error('Failed to send logs to remote:', error);
      this.buffer.unshift(...entries);
    }
  }

  async close(): Promise<void> {
    this.isEnabled = false;
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

export class FileTransport implements LogTransport {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushInterval?: ReturnType<typeof setInterval>;
  private fileHandle?: { write: (data: string) => void; close: () => void };

  constructor(config: LoggerConfig) {
    this.config = config;

    if (config.flushInterval && config.flushInterval > 0) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, config.flushInterval);
    }

    this.initFile();
  }

  private async initFile(): Promise<void> {
    if (typeof window !== 'undefined') {
      console.warn('FileTransport requires Node.js environment');
      return;
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.dirname(this.config.filePath!);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to initialize file transport:', error);
    }
  }

  async log(entry: LogEntry): Promise<void> {
    const formatted = this.formatEntry(entry);
    this.buffer.push(entry);

    if (this.config.enableBuffer === false) {
      await this.write(formatted);
    } else if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  private formatEntry(entry: LogEntry): string {
    const { level, message, context, error, timestamp } = entry;
    const time = new Date(timestamp).toISOString();
    const levelName = LogLevel[level];

    let logLine = `[${time}] [${levelName}] ${message}`;

    if (context) {
      logLine += ` ${JSON.stringify(context)}`;
    }

    if (error) {
      logLine += `\n${error.message}\n${error.stack}`;
    }

    return logLine + '\n';
  }

  private async write(content: string): Promise<void> {
    if (typeof window !== 'undefined') return;

    try {
      const fs = require('fs');
      fs.appendFileSync(this.config.filePath!, content, 'utf-8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const content = this.buffer.map(entry => this.formatEntry(entry)).join('');

    try {
      await this.write(content);
      this.buffer = [];
    } catch (error) {
      console.error('Failed to flush log buffer:', error);
    }
  }

  async close(): Promise<void> {
    await this.flush();
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

export class Logger {
  private config: LoggerConfig;
  private transports: LogTransport[];
  private context: Record<string, unknown> = {};
  private userId?: string;
  private sessionId?: string;
  private static instance?: Logger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableBuffer: true,
      bufferSize: 100,
      flushInterval: 5000,
      includeTimestamp: true,
      includeStack: true,
      includeContext: true,
      redactKeys: ['password', 'token', 'secret', 'apiKey', 'authorization'],
      ...config,
    };

    this.transports = [];

    if (this.config.enableConsole) {
      this.transports.push(new ConsoleTransport(this.config));
    }

    if (this.config.enableFile && this.config.filePath) {
      this.transports.push(new FileTransport(this.config));
    }

    if (this.config.enableRemote && this.config.remoteUrl) {
      this.transports.push(new RemoteTransport(this.config));
    }

    Logger.instance = this;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  static resetInstance(): void {
    if (Logger.instance) {
      for (const transport of Logger.instance.transports) {
        if (transport.close) {
          transport.close();
        }
      }
      Logger.instance = undefined;
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...this.context, ...context };
  }

  setUser(userId: string): void {
    this.userId = userId;
  }

  setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  addContext(key: string, value: unknown): void {
    this.context[key] = value;
  }

  removeContext(key: string): void {
    delete this.context[key];
  }

  clearContext(): void {
    this.context = {};
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const fullContext = { ...this.context, ...context };
    const redactedContext = this.redact(fullContext);

    return {
      timestamp: Date.now(),
      level,
      message,
      context: redactedContext,
      error,
      stack: error?.stack,
      source: this.getSource(),
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  private redact(context: Record<string, unknown>): Record<string, unknown> {
    const redacted = { ...context };

    for (const key of this.config.redactKeys!) {
      if (key in redacted) {
        redacted[key] = '[REDACTED]';
      }
    }

    return redacted;
  }

  private getSource(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    const relevantLine = lines.find(
      line => !line.includes('Logger') && line.includes('.ts')
    );

    if (relevantLine) {
      const match = relevantLine.match(/\((.*):(\d+):(\d+)\)/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
    }

    return 'unknown';
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (level < this.config.level) return;

    const entry = this.createEntry(level, message, context, error);

    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (error) {
        console.error('Transport log error:', error);
      }
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.log(LogLevel.ERROR, message, context, err);
  }

  fatal(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    this.log(LogLevel.FATAL, message, context, err);
  }

  group(label: string, fn: () => void): void {
    console.group(label);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  }

  time(label: string): void {
    console.time(label);
  }

  timeEnd(label: string): void {
    console.timeEnd(label);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry(LogLevel.DEBUG, message, context);
    console.trace(entry);
  }

  async flush(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }

  async close(): Promise<void> {
    await this.flush();
    for (const transport of this.transports) {
      if (transport.close) {
        await transport.close();
      }
    }
  }

  getTransports(): LogTransport[] {
    return this.transports;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }

  getHistory(level?: LogLevel): LogEntry[] {
    const entries: LogEntry[] = [];

    for (const transport of this.transports) {
      if (transport instanceof BufferTransport) {
        entries.push(...transport.getBuffer());
      }
    }

    if (level !== undefined) {
      return entries.filter(entry => entry.level === level);
    }

    return entries;
  }
}

export const logger = Logger.getInstance();

export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}

export function withLogger<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T,
  logLevel: LogLevel = LogLevel.DEBUG
): T {
  return ((...args: unknown[]) => {
    const startTime = Date.now();
    logger.log(logLevel, `${name} started`);

    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = Date.now() - startTime;
            logger.log(logLevel, `${name} completed`, { duration });
            return value;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            logger.error(`${name} failed`, error, { duration });
            throw error;
          });
      }

      const duration = Date.now() - startTime;
      logger.log(logLevel, `${name} completed`, { duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${name} failed`, error as Error, { duration });
      throw error;
    }
  }) as T;
}

export function logAsync<T>(
  name: string,
  promise: Promise<T>,
  logLevel: LogLevel = LogLevel.DEBUG
): Promise<T> {
  const startTime = Date.now();
  logger.log(logLevel, `${name} started`);

  return promise
    .then((value) => {
      const duration = Date.now() - startTime;
      logger.log(logLevel, `${name} completed`, { duration });
      return value;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      logger.error(`${name} failed`, error as Error, { duration });
      throw error;
    });
}
