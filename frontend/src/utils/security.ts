export interface SecurityConfig {
  enableCSP: boolean;
  enableXSSProtection: boolean;
  enableFrameGuard: boolean;
  allowedDomains: string[];
}

const defaultConfig: SecurityConfig = {
  enableCSP: true,
  enableXSSProtection: true,
  enableFrameGuard: true,
  allowedDomains: [],
};

let config = { ...defaultConfig };

export function configureSecurity(newConfig: Partial<SecurityConfig>): void {
  config = { ...config, ...newConfig };
}

export function getSecurityConfig(): SecurityConfig {
  return { ...config };
}

export function sanitizeHTML(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeShell(str: string): string {
  return str.replace(/[`$(){}[\]\\;]/g, '\\$&');
}

export function validatePath(path: string, allowedPaths?: string[]): boolean {
  const normalized = path.replace(/\\/g, '/');

  if (allowedPaths && allowedPaths.length > 0) {
    return allowedPaths.some((allowed) => {
      const normalizedAllowed = allowed.replace(/\\/g, '/');
      return normalized.startsWith(normalizedAllowed);
    });
  }

  if (normalized.includes('..')) return false;
  if (/^[a-zA-Z]:/.test(normalized)) return true;
  if (normalized.startsWith('/')) return true;

  return false;
}

export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskSensitiveData(data: string, type: 'apiKey' | 'password' | 'token' = 'apiKey'): string {
  if (data.length <= 8) return '***';

  switch (type) {
    case 'apiKey':
      return data.slice(0, 4) + '***' + data.slice(-4);
    case 'password':
      return '*'.repeat(data.length);
    case 'token':
      const parts = data.split('.');
      if (parts.length === 3) {
        return `${parts[0].slice(0, 8)}...${parts[2].slice(-4)}`;
      }
      return data.slice(0, 8) + '***';
    default:
      return '***';
  }
}

export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

export function hashString(str: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  return crypto.subtle.digest(algorithm, data).then((buffer) => {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function encodeBase64(str: string): string {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ));
}

export function decodeBase64(str: string): string {
  return decodeURIComponent(
    atob(str)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

export function encodeBase64URL(str: string): string {
  return encodeBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeBase64URL(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeBase64(base64);
}

export function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  return crypto.subtle
    .encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data))
    .then((buffer) => {
      const combined = new Uint8Array(iv.length + buffer.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(buffer), iv.length);
      return encodeBase64URL(String.fromCharCode(...combined));
    });
}

export function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(decodeBase64URL(encryptedData)), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  return crypto.subtle
    .decrypt({ name: 'AES-GCM', iv }, key, data)
    .then((buffer) => new TextDecoder().decode(buffer));
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function generateSalt(length: number = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);

    if (validTimestamps.length >= this.maxRequests) {
      this.requests.set(key, validTimestamps);
      return false;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((ts) => now - ts < this.windowMs);
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  getRetryAfter(key: string): number {
    const timestamps = this.requests.get(key) || [];
    if (timestamps.length === 0) return 0;

    const oldest = Math.min(...timestamps);
    const elapsed = Date.now() - oldest;
    return Math.max(0, this.windowMs - elapsed);
  }
}

export const rateLimiter = new RateLimiter();

export interface ContentSecurityPolicy {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  connectSrc: string[];
  fontSrc: string[];
  objectSrc: string[];
  frameSrc: string[];
  reportUri?: string;
}

export function buildCSP(policy: ContentSecurityPolicy): string {
  const directives: string[] = [];

  const addDirective = (name: string, values: string[]) => {
    if (values.length > 0) {
      directives.push(`${name} ${values.join(' ')}`);
    }
  };

  addDirective("default-src 'self'", policy.defaultSrc);
  addDirective("script-src 'self' 'unsafe-inline'", policy.scriptSrc);
  addDirective("style-src 'self' 'unsafe-inline'", policy.styleSrc);
  addDirective("img-src 'self' data: https:", policy.imgSrc);
  addDirective("connect-src 'self' http://localhost:* https:", policy.connectSrc);
  addDirective("font-src 'self' data:", policy.fontSrc);
  addDirective("object-src 'none'", policy.objectSrc);
  addDirective("frame-src 'none'", policy.frameSrc);

  if (policy.reportUri) {
    directives.push(`report-uri ${policy.reportUri}`);
  }

  return directives.join('; ');
}

export function applySecurityHeaders(headers: Headers): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
}
