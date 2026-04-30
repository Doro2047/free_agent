export type ValidationType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function' | 'date' | 'email' | 'url' | 'uuid' | 'ip' | 'custom';

export interface ValidationRule<T = unknown> {
  type: ValidationType;
  required?: boolean;
  default?: T;
  validator?: (value: T) => boolean | Promise<boolean>;
  transform?: (value: unknown) => T;
  message?: string;
  params?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  type: string;
  value?: unknown;
  params?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  value?: unknown;
}

export interface SchemaDefinition {
  [key: string]: ValidationRule | Schema | SchemaDefinition;
}

export interface Schema {
  define(definition: SchemaDefinition): void;
  validate(data: unknown, options?: ValidateOptions): ValidationResult;
  validateField(data: unknown, field: string): ValidationError | null;
  isValid(data: unknown): Promise<boolean> | boolean;
  getDefinition(): SchemaDefinition;
}

export interface ValidateOptions {
  stripUnknown?: boolean;
  convertTypes?: boolean;
  abortEarly?: boolean;
  throwOnError?: boolean;
}

export class ValidationSchema implements Schema {
  private definition: SchemaDefinition;
  private messages: Record<string, string> = {
    required: 'This field is required',
    type: 'Invalid type',
    min: 'Value is too small',
    max: 'Value is too large',
    minLength: 'Value is too short',
    maxLength: 'Value is too long',
    pattern: 'Invalid format',
    email: 'Invalid email address',
    url: 'Invalid URL',
    uuid: 'Invalid UUID',
    ip: 'Invalid IP address',
    custom: 'Custom validation failed',
  };

  constructor(definition: SchemaDefinition = {}) {
    this.definition = definition;
  }

  define(definition: SchemaDefinition): void {
    this.definition = { ...this.definition, ...definition };
  }

  validate(data: unknown, options: ValidateOptions = {}): ValidationResult {
    const { stripUnknown = false, convertTypes = true, abortEarly = false, throwOnError = false } = options;
    const errors: ValidationError[] = [];
    
    let processedData = data;

    if (convertTypes) {
      processedData = this.convertTypes(data);
    }

    if (typeof processedData !== 'object' || processedData === null) {
      errors.push({
        field: '__root__',
        message: 'Data must be an object',
        type: 'type',
        value: processedData,
      });
      return this.createResult(errors, throwOnError);
    }

    const dataObj = processedData as Record<string, unknown>;

    for (const [field, rule] of Object.entries(this.definition)) {
      const value = dataObj[field];
      const fieldErrors = this.validateFieldWithRule(value, field, rule);

      if (fieldErrors) {
        if (Array.isArray(fieldErrors)) {
          errors.push(...fieldErrors);
        } else {
          errors.push(fieldErrors);
        }

        if (abortEarly) {
          break;
        }
      }
    }

    if (!stripUnknown) {
      for (const key of Object.keys(dataObj)) {
        if (!(key in this.definition)) {
          if (this.definition['*']) {
            const wildcardErrors = this.validateFieldWithRule(dataObj[key], key, this.definition['*']);
            if (wildcardErrors) {
              if (Array.isArray(wildcardErrors)) {
                errors.push(...wildcardErrors);
              } else {
                errors.push(wildcardErrors);
              }
            }
          }
        }
      }
    }

    return this.createResult(errors, throwOnError);
  }

  private convertTypes(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.convertTypes(item));
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const rule = this.definition[key];

      if (rule && typeof rule === 'object' && 'type' in rule) {
        result[key] = this.convertFieldValue(value, rule);
      } else {
        result[key] = this.convertTypes(value);
      }
    }

    return result;
  }

  private convertFieldValue(value: unknown, rule: ValidationRule): unknown {
    if (value === undefined || value === null) {
      return value;
    }

    switch (rule.type) {
      case 'number':
        if (typeof value === 'string') {
          const num = Number(value);
          return isNaN(num) ? value : num;
        }
        return value;

      case 'boolean':
        if (value === 'true' || value === '1') return true;
        if (value === 'false' || value === '0') return false;
        return value;

      case 'string':
        return String(value);

      case 'date':
        if (value instanceof Date) return value;
        const date = new Date(value as string);
        return isNaN(date.getTime()) ? value : date;

      default:
        return value;
    }
  }

  validateField(data: unknown, field: string): ValidationError | null {
    const value = this.getNestedValue(data, field);
    const rule = this.getNestedRule(field);

    if (!rule) {
      return null;
    }

    const errors = this.validateFieldWithRule(value, field, rule);
    
    if (errors) {
      return Array.isArray(errors) ? errors[0] : errors;
    }

    return null;
  }

  private validateFieldWithRule(
    value: unknown,
    field: string,
    rule: ValidationRule | Schema | SchemaDefinition
  ): ValidationError | ValidationError[] | null {
    if (rule instanceof ValidationSchema) {
      return this.validateNestedSchema(value, field, rule);
    }

    if (typeof rule === 'object' && 'type' in rule) {
      return this.validateBasicRule(value, field, rule as ValidationRule);
    }

    return null;
  }

  private validateNestedSchema(
    value: unknown,
    field: string,
    schema: ValidationSchema
  ): ValidationError | ValidationError[] | null {
    const result = schema.validate(value);

    if (!result.valid) {
      return result.errors.map(error => ({
        ...error,
        field: `${field}.${error.field}`,
      }));
    }

    return null;
  }

  private validateBasicRule(
    value: unknown,
    field: string,
    rule: ValidationRule
  ): ValidationError | ValidationError[] | null {
    const errors: ValidationError[] = [];

    if (rule.required && (value === undefined || value === null)) {
      errors.push(this.createError(field, 'required', rule.message));
      return errors;
    }

    if (value === undefined || value === null) {
      if (rule.default !== undefined) {
        return null;
      }
      return null;
    }

    if (rule.type && !this.validateType(value, rule.type)) {
      errors.push(this.createError(field, 'type', rule.message, value));
    }

    if (rule.params) {
      if ('min' in rule.params && typeof value === 'number' && value < (rule.params.min as number)) {
        errors.push(this.createError(field, 'min', rule.message, value, rule.params));
      }

      if ('max' in rule.params && typeof value === 'number' && value > (rule.params.max as number)) {
        errors.push(this.createError(field, 'max', rule.message, value, rule.params));
      }

      if ('minLength' in rule.params && typeof value === 'string' && value.length < (rule.params.minLength as number)) {
        errors.push(this.createError(field, 'minLength', rule.message, value, rule.params));
      }

      if ('maxLength' in rule.params && typeof value === 'string' && value.length > (rule.params.maxLength as number)) {
        errors.push(this.createError(field, 'maxLength', rule.message, value, rule.params));
      }

      if ('pattern' in rule.params && typeof value === 'string') {
        const pattern = new RegExp(rule.params.pattern as string);
        if (!pattern.test(value)) {
          errors.push(this.createError(field, 'pattern', rule.message, value, rule.params));
        }
      }

      if ('enum' in rule.params) {
        const enumValues = rule.params.enum as unknown[];
        if (!enumValues.includes(value)) {
          errors.push(this.createError(field, 'enum', rule.message, value, rule.params));
        }
      }
    }

    if (rule.type === 'email' && typeof value === 'string' && !this.isValidEmail(value)) {
      errors.push(this.createError(field, 'email', rule.message, value));
    }

    if (rule.type === 'url' && typeof value === 'string' && !this.isValidUrl(value)) {
      errors.push(this.createError(field, 'url', rule.message, value));
    }

    if (rule.type === 'uuid' && typeof value === 'string' && !this.isValidUuid(value)) {
      errors.push(this.createError(field, 'uuid', rule.message, value));
    }

    if (rule.type === 'ip' && typeof value === 'string' && !this.isValidIp(value)) {
      errors.push(this.createError(field, 'ip', rule.message, value));
    }

    if (rule.validator) {
      try {
        const isValid = rule.validator(value);
        
        if (isValid instanceof Promise) {
          return errors.length > 0 ? errors : null;
        }

        if (!isValid) {
          errors.push(this.createError(field, 'custom', rule.message, value));
        }
      } catch {
        errors.push(this.createError(field, 'custom', rule.message, value));
      }
    }

    return errors.length > 0 ? errors : null;
  }

  private validateType(value: unknown, type: ValidationType): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'function':
        return typeof value === 'function';
      case 'date':
        return value instanceof Date && !isNaN((value as Date).getTime());
      default:
        return true;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidIp(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}$/i;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private createError(
    field: string,
    type: string,
    message?: string,
    value?: unknown,
    params?: Record<string, unknown>
  ): ValidationError {
    return {
      field,
      type,
      message: message || this.messages[type] || 'Validation failed',
      value,
      params,
    };
  }

  private createResult(errors: ValidationError[], throwOnError: boolean): ValidationResult {
    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    if (throwOnError && errors.length > 0) {
      const error = new Error(errors[0].message);
      (error as Error & { errors: ValidationError[] }).errors = errors;
      throw error;
    }

    return result;
  }

  private getNestedValue(data: unknown, path: string): unknown {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private getNestedRule(path: string): ValidationRule | Schema | SchemaDefinition | undefined {
    const parts = path.split('.');
    let current: ValidationRule | Schema | SchemaDefinition | undefined = this.definition;

    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      if (current instanceof ValidationSchema) {
        current = current.getDefinition()[part];
      } else {
        current = (current as SchemaDefinition)[part];
      }
    }

    return current;
  }

  isValid(data: unknown): boolean {
    return this.validate(data).valid;
  }

  getDefinition(): SchemaDefinition {
    return { ...this.definition };
  }
}

export function createSchema(definition: SchemaDefinition): ValidationSchema {
  return new ValidationSchema(definition);
}

export function string(): ValidationRule<string> {
  return { type: 'string' };
}

export function number(): ValidationRule<number> {
  return { type: 'number' };
}

export function boolean(): ValidationRule<boolean> {
  return { type: 'boolean' };
}

export function array<T = unknown>(itemSchema?: ValidationSchema): ValidationRule<T[]> {
  return {
    type: 'array',
    validator: (value) => {
      if (!Array.isArray(value)) return false;
      if (itemSchema) {
        return value.every(item => itemSchema.isValid(item));
      }
      return true;
    },
  };
}

export function object<T extends Record<string, unknown>>(definition: SchemaDefinition): ValidationSchema {
  const schema = new ValidationSchema();
  schema.define(definition as SchemaDefinition);
  return schema;
}

export function required<T>(rule: ValidationRule<T>): ValidationRule<T> {
  return { ...rule, required: true };
}

export function optional<T>(rule: ValidationRule<T>): ValidationRule<T> {
  return { ...rule, required: false };
}

export function min(value: number): Partial<ValidationRule<number>> {
  return { params: { min: value } };
}

export function max(value: number): Partial<ValidationRule<number>> {
  return { params: { max: value } };
}

export function minLength(value: number): Partial<ValidationRule<string>> {
  return { params: { minLength: value } };
}

export function maxLength(value: number): Partial<ValidationRule<string>> {
  return { params: { maxLength: value } };
}

export function pattern(regex: string | RegExp): Partial<ValidationRule<string>> {
  return { params: { pattern: typeof regex === 'string' ? regex : regex.source } };
}

export function enumType<T extends string | number>(...values: T[]): Partial<ValidationRule<T>> {
  return { params: { enum: values } };
}

export function custom<T>(validator: (value: T) => boolean, message?: string): ValidationRule<T> {
  return { type: 'custom', validator, message };
}

export function defaultValue<T>(defaultVal: T): Partial<ValidationRule<T>> {
  return { default: defaultVal };
}

export function email(): ValidationRule<string> {
  return { type: 'email' };
}

export function url(): ValidationRule<string> {
  return { type: 'url' };
}

export function uuid(): ValidationRule<string> {
  return { type: 'uuid' };
}

export function ip(): ValidationRule<string> {
  return { type: 'ip' };
}

export const appConfigSchema = createSchema({
  server: createSchema({
    port: { type: 'number', required: true, params: { min: 1, max: 65535 } },
    host: { type: 'string', default: 'localhost' },
    timeout: { type: 'number', default: 30000 },
  }),
  
  api: createSchema({
    baseUrl: { type: 'string', type: 'url' },
    apiKey: { type: 'string' },
    timeout: { type: 'number', default: 30000 },
    retries: { type: 'number', default: 3 },
  }),
  
  model: createSchema({
    provider: { type: 'string', required: true },
    name: { type: 'string', required: true },
    temperature: { type: 'number', params: { min: 0, max: 2 } },
    maxTokens: { type: 'number', params: { min: 1 } },
    topP: { type: 'number', params: { min: 0, max: 1 } },
  }),
  
  ui: createSchema({
    theme: { type: 'string', default: 'dark' },
    language: { type: 'string', default: 'zh-CN' },
    fontSize: { type: 'number', default: 14, params: { min: 10, max: 24 } },
    fontFamily: { type: 'string' },
    codeTheme: { type: 'string', default: 'vs-dark' },
  }),
  
  security: createSchema({
    allowedOrigins: { type: 'array' },
    enableCSP: { type: 'boolean', default: true },
    maxRequestSize: { type: 'number', default: 10485760 },
    rateLimitWindow: { type: 'number', default: 60000 },
    rateLimitMax: { type: 'number', default: 100 },
  }),
  
  llama: createSchema({
    enabled: { type: 'boolean', default: false },
    path: { type: 'string' },
    port: { type: 'number', default: 8080 },
    contextSize: { type: 'number', default: 2048 },
    gpuLayers: { type: 'number', default: 0 },
  }),
});
