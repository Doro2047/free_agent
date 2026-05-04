import { ipcRenderer } from 'electron';
import { isElectron } from '@/utils/electron';

export interface SecureStorageResult {
  success: boolean;
  data?: string;
  error?: string;
}

class SecureStorageService {
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = isElectron();
  }

  async isEncryptionAvailable(): Promise<boolean> {
    if (!this.isAvailable) return false;
    try {
      return await ipcRenderer.invoke('secure-storage:is-available');
    } catch {
      return false;
    }
  }

  async encrypt(data: string): Promise<SecureStorageResult> {
    if (!this.isAvailable) {
      return { success: false, error: 'Electron API not available' };
    }
    try {
      const encrypted = await ipcRenderer.invoke('secure-storage:encrypt', data);
      return { success: true, data: encrypted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Encryption failed',
      };
    }
  }

  async decrypt(encryptedData: string): Promise<SecureStorageResult> {
    if (!this.isAvailable) {
      return { success: false, error: 'Electron API not available' };
    }
    try {
      const decrypted = await ipcRenderer.invoke('secure-storage:decrypt', encryptedData);
      return { success: true, data: decrypted };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed',
      };
    }
  }

  async saveSecure(key: string, value: string): Promise<boolean> {
    const encrypted = await this.encrypt(value);
    if (!encrypted.success || !encrypted.data) {
      console.error('Failed to encrypt data for secure storage:', encrypted.error);
      return false;
    }
    localStorage.setItem(`secure:${key}`, encrypted.data);
    return true;
  }

  async loadSecure(key: string): Promise<string | null> {
    const encryptedData = localStorage.getItem(`secure:${key}`);
    if (!encryptedData) return null;

    const decrypted = await this.decrypt(encryptedData);
    if (!decrypted.success || !decrypted.data) {
      console.error('Failed to decrypt data from secure storage:', decrypted.error);
      return null;
    }
    return decrypted.data;
  }

  removeSecure(key: string): void {
    localStorage.removeItem(`secure:${key}`);
  }
}

export const secureStorage = new SecureStorageService();

export class SensitiveDataManager {
  private static readonly SENSITIVE_KEYS = ['apiKey', 'token', 'secret', 'password'];

  static isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return this.SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));
  }

  static async saveWithProtection(key: string, value: string): Promise<boolean> {
    if (this.isSensitiveKey(key)) {
      return secureStorage.saveSecure(key, value);
    }
    localStorage.setItem(key, value);
    return true;
  }

  static async loadWithProtection(key: string): Promise<string | null> {
    if (this.isSensitiveKey(key)) {
      return secureStorage.loadSecure(key);
    }
    return localStorage.getItem(key);
  }

  static removeWithProtection(key: string): void {
    if (this.isSensitiveKey(key)) {
      secureStorage.removeSecure(key);
    } else {
      localStorage.removeItem(key);
    }
  }
}
