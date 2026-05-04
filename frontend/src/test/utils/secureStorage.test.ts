import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockIpcRenderer = {
  invoke: vi.fn(),
};

vi.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
}));

vi.mock('@/utils/electron', () => ({
  isElectron: () => true,
}));

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

describe('SecureStorage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isEncryptionAvailable', () => {
    it('应返回 true 当加密可用时', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(true);

      const { secureStorage } = await import('@/utils/secureStorage');
      const result = await secureStorage.isEncryptionAvailable();

      expect(result).toBe(true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('secure-storage:is-available');
    });

    it('应返回 false 当加密不可用时', async () => {
      mockIpcRenderer.invoke.mockResolvedValue(false);

      const { secureStorage } = await import('@/utils/secureStorage');
      const result = await secureStorage.isEncryptionAvailable();

      expect(result).toBe(false);
    });
  });

  describe('encrypt and decrypt', () => {
    it('应成功加密数据', async () => {
      const encryptedData = 'encrypted_base64_string';
      mockIpcRenderer.invoke.mockResolvedValue(encryptedData);

      const { secureStorage } = await import('@/utils/secureStorage');
      const result = await secureStorage.encrypt('sensitive_data');

      expect(result.success).toBe(true);
      expect(result.data).toBe(encryptedData);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('secure-storage:encrypt', 'sensitive_data');
    });

    it('应成功解密数据', async () => {
      const decryptedData = 'decrypted_sensitive_data';
      mockIpcRenderer.invoke.mockResolvedValue(decryptedData);

      const { secureStorage } = await import('@/utils/secureStorage');
      const result = await secureStorage.decrypt('encrypted_base64_string');

      expect(result.success).toBe(true);
      expect(result.data).toBe(decryptedData);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('secure-storage:decrypt', 'encrypted_base64_string');
    });

    it('应在加密失败时返回错误', async () => {
      mockIpcRenderer.invoke.mockRejectedValue(new Error('Encryption failed'));

      const { secureStorage } = await import('@/utils/secureStorage');
      const result = await secureStorage.encrypt('sensitive_data');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Encryption failed');
    });
  });

  describe('SensitiveDataManager', () => {
    it('应正确识别敏感键名', async () => {
      const { SensitiveDataManager } = await import('@/utils/secureStorage');

      expect(SensitiveDataManager.isSensitiveKey('apiKey')).toBe(true);
      expect(SensitiveDataManager.isSensitiveKey('token')).toBe(true);
      expect(SensitiveDataManager.isSensitiveKey('secret')).toBe(true);
      expect(SensitiveDataManager.isSensitiveKey('password')).toBe(true);
      expect(SensitiveDataManager.isSensitiveKey('username')).toBe(false);
    });

    it('应使用安全存储保存敏感数据', async () => {
      const encryptedData = 'encrypted_api_key';
      mockIpcRenderer.invoke.mockResolvedValue(encryptedData);

      const { SensitiveDataManager } = await import('@/utils/secureStorage');
      const result = await SensitiveDataManager.saveWithProtection('apiKey', 'my_secret_key');

      expect(result).toBe(true);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('secure-storage:encrypt', 'my_secret_key');
    });

    it('应使用普通存储保存非敏感数据', async () => {
      const { SensitiveDataManager } = await import('@/utils/secureStorage');
      const result = await SensitiveDataManager.saveWithProtection('username', 'john');

      expect(result).toBe(true);
      expect(mockIpcRenderer.invoke).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('username', 'john');
    });
  });
});
