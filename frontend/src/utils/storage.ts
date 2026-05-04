export interface StorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  onError?: (error: Error) => void;
}

const defaultSerializer = {
  serialize: <T>(value: T): string => JSON.stringify(value),
  deserialize: <T>(value: string): T => JSON.parse(value),
};

class SafeStorage {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  get<K = unknown>(key: string, defaultValue?: K): K | undefined {
    try {
      const item = localStorage.getItem(this.getKey(key));
      if (item === null) return defaultValue;
      return defaultSerializer.deserialize<K>(item);
    } catch (error) {
      console.error(`SafeStorage.get error for key ${key}:`, error);
      return defaultValue;
    }
  }

  set<K = unknown>(key: string, value: K, options?: StorageOptions<K>): void {
    try {
      const serialized = (options?.serialize ?? defaultSerializer.serialize)(value);
      localStorage.setItem(this.getKey(key), serialized);
    } catch (error) {
      console.error(`SafeStorage.set error for key ${key}:`, error);
      options?.onError?.(error as Error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error(`SafeStorage.remove error for key ${key}:`, error);
    }
  }

  clear(): void {
    try {
      if (this.prefix) {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.startsWith(`${this.prefix}:`)) {
            localStorage.removeItem(key);
          }
        });
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('SafeStorage.clear error:', error);
    }
  }

  has(key: string): boolean {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  keys(): string[] {
    if (!this.prefix) {
      return Object.keys(localStorage);
    }
    const prefix = `${this.prefix}:`;
    return Object.keys(localStorage).filter((key) => key.startsWith(prefix));
  }
}

export const safeStorage = new SafeStorage();

export const appStorage = new SafeStorage('codecraft');

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export class LocalCache<T> {
  private storage: SafeStorage;
  private key: string;

  constructor(storage: SafeStorage, key: string) {
    this.storage = storage;
    this.key = key;
  }

  get(): T | undefined {
    const entry = this.storage.get<CacheEntry<T>>(this.key);
    if (!entry) return undefined;

    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.storage.remove(this.key);
      return undefined;
    }

    return entry.value;
  }

  set(value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
    };
    this.storage.set(this.key, entry);
  }

  remove(): void {
    this.storage.remove(this.key);
  }

  has(): boolean {
    return this.get() !== undefined;
  }
}

export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean;
  message: string;
}

export class Validator<T = unknown> {
  private rules: ValidationRule<T>[] = [];

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  addRules(rules: ValidationRule<T>[]): this {
    this.rules.push(...rules);
    return this;
  }

  validate(value: T): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of this.rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  isValid(value: T): boolean {
    return this.validate(value).valid;
  }
}

export const validators = {
  required: (message: string = '此字段必填'): ValidationRule<unknown> => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message,
  }),

  email: (message: string = '请输入有效的邮箱地址'): ValidationRule<string> => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  url: (message: string = '请输入有效的 URL'): ValidationRule<string> => ({
    validate: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message ?? `长度至少为 ${min} 个字符`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message ?? `长度不能超过 ${max} 个字符`,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value >= min,
    message: message ?? `值不能小于 ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value <= max,
    message: message ?? `值不能大于 ${max}`,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message,
  }),

  oneOf: <T>(options: T[], message?: string): ValidationRule<T> => ({
    validate: (value) => options.includes(value),
    message: message ?? `值必须是 ${options.join(', ')} 之一`,
  }),
};

export function createValidator<T>(rules: ValidationRule<T>[]): Validator<T> {
  return new Validator<T>().addRules(rules);
}

export function validateField<T>(
  value: T,
  rules: ValidationRule<T>[]
): { valid: boolean; errors: string[] } {
  const validator = createValidator(rules);
  return validator.validate(value);
}
