import { contextBridge, ipcRenderer } from 'electron';

// 类型声明
interface ElectronAPI {
  platform: {
    get: () => Promise<{
      platform: string;
      arch: string;
      nodeVersion: string;
      electronVersion: string;
    }>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  dialog: {
    openDirectory: () => Promise<string | null>;
    openFile: (options?: Record<string, unknown>) => Promise<string[]>;
  };
  server: {
    start: () => Promise<{ status: string; port: number; retryCount: number }>;
    stop: () => Promise<{ status: string; port: number; retryCount: number }>;
    restart: () => Promise<{ status: string; port: number; retryCount: number }>;
    status: () => Promise<{ status: string; port: number; retryCount: number }>;
    logs: () => Promise<string>;
    checkPort: (port: number) => Promise<boolean>;
    onMessage: (callback: (message: unknown) => void) => () => void;
  };
  update: {
    check: () => Promise<{ success: boolean; error?: string }>;
    download: () => Promise<{ success: boolean; error?: string }>;
    install: () => Promise<{ success: boolean }>;
    getVersion: () => Promise<string>;
    onStatus: (callback: (data: unknown) => void) => () => void;
  };
  llama: {
    start: () => Promise<unknown>;
    stop: () => Promise<unknown>;
    restart: () => Promise<unknown>;
    status: () => Promise<unknown>;
    logs: () => Promise<string>;
    onMessage: (callback: (message: unknown) => void) => () => void;
  };
  agentMode: {
    get: () => Promise<string>;
    set: (mode: 'chat' | 'code') => Promise<unknown>;
  };
  isElectron: boolean;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: {
    get: () => ipcRenderer.invoke('get-platform'),
  },

  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },

  // 文件对话框
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    openFile: (options?: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog:openFile', options),
  },

  // 服务器管理
  server: {
    start: () => ipcRenderer.invoke('server:start'),
    stop: () => ipcRenderer.invoke('server:stop'),
    restart: () => ipcRenderer.invoke('server:restart'),
    status: () => ipcRenderer.invoke('server:status'),
    logs: () => ipcRenderer.invoke('server:logs'),
    checkPort: (port: number) => ipcRenderer.invoke('server:check-port', port),
    onMessage: (callback: (message: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, message: unknown) => callback(message);
      ipcRenderer.on('server-message', handler);
      return () => ipcRenderer.removeListener('server-message', handler);
    },
  },

  llama: {
    start: () => ipcRenderer.invoke('llama:start'),
    stop: () => ipcRenderer.invoke('llama:stop'),
    restart: () => ipcRenderer.invoke('llama:restart'),
    status: () => ipcRenderer.invoke('llama:status'),
    logs: () => ipcRenderer.invoke('llama:logs'),
    onMessage: (callback: (message: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, message: unknown) => callback(message);
      ipcRenderer.on('llama-message', handler);
      return () => ipcRenderer.removeListener('llama-message', handler);
    },
  },

  agentMode: {
    get: () => ipcRenderer.invoke('agent-mode:get'),
    set: (mode: 'chat' | 'code') => ipcRenderer.invoke('agent-mode:set', mode),
  },

  // 自动更新
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    getVersion: () => ipcRenderer.invoke('update:version'),
    onStatus: (callback: (data: unknown) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
      ipcRenderer.on('update-status', handler);
      return () => ipcRenderer.removeListener('update-status', handler);
    },
  },

  // 判断是否在 Electron 环境中
  isElectron: true,
});

