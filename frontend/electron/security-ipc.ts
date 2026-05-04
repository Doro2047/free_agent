import { ipcMain, IpcMainInvokeEvent, safeStorage } from 'electron';
import electronLog from 'electron-log';

const log = electronLog;

export interface IPCValidationRule {
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  required?: boolean;
  enum?: string[] | number[];
}

export interface IPCConfig {
  channel: string;
  validate?: Record<string, IPCValidationRule>;
  requireValidation?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

const IPC_WHITELIST: IPCConfig[] = [
  { channel: 'get-platform' },
  { channel: 'window-minimize' },
  { channel: 'window-maximize' },
  { channel: 'window-close' },
  { channel: 'window-is-maximized' },
  {
    channel: 'dialog:openDirectory',
  },
  {
    channel: 'dialog:openFile',
    validate: {
      options: { type: 'object', required: false },
    },
  },
  { channel: 'server:start' },
  { channel: 'server:stop' },
  { channel: 'server:restart' },
  { channel: 'server:status' },
  { channel: 'server:logs' },
  {
    channel: 'server:check-port',
    validate: {
      port: { type: 'number', min: 1, max: 65535, required: true },
    },
  },
  { channel: 'llama:start' },
  { channel: 'llama:stop' },
  { channel: 'llama:restart' },
  { channel: 'llama:status' },
  { channel: 'llama:logs' },
  { channel: 'update:check' },
  { channel: 'update:download' },
  { channel: 'update:install' },
  { channel: 'update:version' },
  {
    channel: 'agent-mode:get',
  },
  {
    channel: 'agent-mode:set',
    validate: {
      mode: { type: 'string', enum: ['chat', 'code'], required: true },
    },
  },
  {
    channel: 'secure-storage:is-available',
  },
  {
    channel: 'secure-storage:encrypt',
    validate: {
      data: { type: 'string', required: true, min: 1 },
    },
  },
  {
    channel: 'secure-storage:decrypt',
    validate: {
      encryptedData: { type: 'string', required: true, min: 1 },
    },
  },
];

const requestTimestamps = new Map<string, number[]>();

function validateArguments(
  channel: string,
  args: unknown[],
  validate?: Record<string, IPCValidationRule>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!validate) {
    return { valid: true, errors: [] };
  }

  const rules = Object.entries(validate);
  
  for (const [paramName, rule] of rules) {
    const index = rules.findIndex(([name]) => name === paramName);
    const value = args[index];

    if (rule.required && value === undefined) {
      errors.push(`参数 '${paramName}' 是必需的`);
      continue;
    }

    if (value === undefined) continue;

    switch (rule.type) {
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`参数 '${paramName}' 必须是数字类型`);
        } else if (rule.min !== undefined && value < rule.min) {
          errors.push(`参数 '${paramName}' 必须大于等于 ${rule.min}`);
        } else if (rule.max !== undefined && value > rule.max) {
          errors.push(`参数 '${paramName}' 必须小于等于 ${rule.max}`);
        }
        break;

      case 'string':
        if (typeof value !== 'string') {
          errors.push(`参数 '${paramName}' 必须是字符串类型`);
        } else if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`参数 '${paramName}' 长度必须大于等于 ${rule.min}`);
        } else if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`参数 '${paramName}' 长度必须小于等于 ${rule.max}`);
        } else if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`参数 '${paramName}' 格式不正确`);
        } else if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`参数 '${paramName}' 必须是以下值之一: ${rule.enum.join(', ')}`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`参数 '${paramName}' 必须是布尔类型`);
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null) {
          errors.push(`参数 '${paramName}' 必须是对象类型`);
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`参数 '${paramName}' 必须是数组类型`);
        } else if (rule.min !== undefined && value.length < rule.min) {
          errors.push(`参数 '${paramName}' 长度必须大于等于 ${rule.min}`);
        } else if (rule.max !== undefined && value.length > rule.max) {
          errors.push(`参数 '${paramName}' 长度必须小于等于 ${rule.max}`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkRateLimit(channel: string, senderId: string): { allowed: boolean; retryAfter?: number } {
  const config = IPC_WHITELIST.find((c) => c.channel === channel);
  if (!config?.rateLimit) {
    return { allowed: true };
  }

  const key = `${channel}:${senderId}`;
  const now = Date.now();
  const timestamps = requestTimestamps.get(key) || [];

  const windowStart = now - config.rateLimit.windowMs;
  const recentTimestamps = timestamps.filter((t) => t >= windowStart);

  if (recentTimestamps.length >= config.rateLimit.maxRequests) {
    const oldest = recentTimestamps[0];
    const retryAfter = Math.ceil((config.rateLimit.windowMs - (now - oldest)) / 1000);
    return { allowed: false, retryAfter };
  }

  recentTimestamps.push(now);
  requestTimestamps.set(key, recentTimestamps.slice(-config.rateLimit.maxRequests));
  return { allowed: true };
}

export function createSecureHandler(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
) {
  ipcMain.handle(channel, async (event, ...args) => {
    const senderId = event.sender.id.toString();
    
    const config = IPC_WHITELIST.find((c) => c.channel === channel);
    
    if (!config) {
      log.warn(`[IPC Security] 未授权的通道访问: ${channel} from renderer ${senderId}`);
      throw new Error('未授权的操作');
    }

    const rateLimitResult = checkRateLimit(channel, senderId);
    if (!rateLimitResult.allowed) {
      log.warn(`[IPC Security] 速率限制触发: ${channel} from renderer ${senderId}`);
      throw new Error(`请求过于频繁，请稍后重试 (${rateLimitResult.retryAfter}秒)`);
    }

    const validation = validateArguments(channel, args, config.validate);
    if (!validation.valid) {
      log.warn(`[IPC Security] 参数验证失败: ${channel} from renderer ${senderId}, 错误: ${validation.errors.join(', ')}`);
      throw new Error(`参数验证失败: ${validation.errors.join('; ')}`);
    }

    try {
      log.debug(`[IPC Security] 允许请求: ${channel} from renderer ${senderId}`);
      const result = await handler(event, ...args);
      return result;
    } catch (error) {
      log.error(`[IPC Security] 处理请求失败: ${channel} from renderer ${senderId}, 错误: ${error}`);
      throw error;
    }
  });
}

export function validateChannel(channel: string): boolean {
  return IPC_WHITELIST.some((c) => c.channel === channel);
}

export function getIPCConfig(channel: string): IPCConfig | undefined {
  return IPC_WHITELIST.find((c) => c.channel === channel);
}

export function registerSecureStorageIPC(): void {
  createSecureHandler('secure-storage:is-available', () => {
    return safeStorage.isEncryptionAvailable();
  });

  createSecureHandler('secure-storage:encrypt', (_event, data: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('加密功能不可用');
      }
      const encrypted = safeStorage.encryptString(data);
      return encrypted.toString('base64');
    } catch (error) {
      log.error('[SecureStorage] 加密失败:', error);
      throw new Error('加密失败');
    }
  });

  createSecureHandler('secure-storage:decrypt', (_event, encryptedData: string) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('加密功能不可用');
      }
      const buffer = Buffer.from(encryptedData, 'base64');
      return safeStorage.decryptString(buffer);
    } catch (error) {
      log.error('[SecureStorage] 解密失败:', error);
      throw new Error('解密失败');
    }
  });

  log.info('[SecureStorage] 安全存储 IPC 注册完成');
}
