import { app, BrowserWindow, ipcMain, screen, dialog, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import http from 'http';
import { URL } from 'url';
import { startServer, stopServer, registerServerIPC } from './server-manager';
import { startLlamaServer, stopLlamaServer, registerLlamaIPC } from './llama-manager';
import { createMainWindow, setupAppLifecycle } from './window-manager';
import electronUpdater from 'electron-updater';
import electronLog from 'electron-log';
import { createSecureHandler } from './security-ipc';

const log: any = electronLog;
const { autoUpdater } = electronUpdater;
type UpdateInfo = electronUpdater.UpdateInfo;
type ProgressInfo = electronUpdater.ProgressInfo;

let proxyServer: http.Server | null = null;
const PROXY_PORT = 3001;

function setupApiProxy(): void {
  proxyServer = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PROXY_PORT}`);
    const targetUrl = `http://localhost:3000${url.pathname}${url.search}`;

    const options = {
      method: req.method,
      headers: { ...req.headers, host: 'localhost:3000' },
    };

    const proxyReq = http.request(targetUrl, options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      log.error(`API 代理错误: ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend server unavailable' }));
    });

    req.pipe(proxyReq);
  });

  proxyServer.listen(PROXY_PORT, '127.0.0.1', () => {
    log.info(`API 代理服务器已启动: http://127.0.0.1:${PROXY_PORT}`);
  });

  proxyServer.on('error', (err) => {
    log.error(`代理服务器错误: ${err.message}`);
  });
}

function stopApiProxy(): void {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
  }
}

autoUpdater.logger = log;
log.transports.file.level = 'info';

const updateOwner = process.env.ELECTRON_UPDATER_OWNER || 'your-username';
const updateRepo = process.env.ELECTRON_UPDATER_REPO || 'free-agent';

autoUpdater.setFeedURL({
  provider: 'github',
  owner: updateOwner,
  repo: updateRepo,
});

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('checking-for-update', () => {
  log.info('正在检查更新...');
  sendUpdateToRenderer('checking-for-update', { message: '正在检查更新...' });
});

autoUpdater.on('update-available', (info: UpdateInfo) => {
  log.info(`发现新版本: ${info.version}`);
  sendUpdateToRenderer('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes,
    releaseDate: info.releaseDate,
  });
});

autoUpdater.on('update-not-available', (info: UpdateInfo) => {
  log.info('当前已是最新版本');
  sendUpdateToRenderer('update-not-available', {
    version: info.version,
  });
});

autoUpdater.on('download-progress', (progress: ProgressInfo) => {
  const percent = Math.round(progress.percent);
  log.info(`下载进度: ${percent}% (${(progress.transferred / 1024 / 1024).toFixed(2)}MB / ${(progress.total / 1024 / 1024).toFixed(2)}MB)`);
  sendUpdateToRenderer('download-progress', {
    percent,
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond,
  });
});

autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
  log.info(`更新已下载: ${info.version}`);
  sendUpdateToRenderer('update-downloaded', {
    version: info.version,
    releaseNotes: info.releaseNotes,
  });

  const mainWindow = getMainWindow();
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '是否立即重启应用以安装更新？',
      buttons: ['立即安装', '稍后安装'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    });
  }
});

autoUpdater.on('error', (error: Error) => {
  log.error('更新检查失败:', error.message);
  sendUpdateToRenderer('update-error', {
    message: error.message,
  });
});

function sendUpdateToRenderer(type: string, data: Record<string, unknown>): void {
  const mainWindow = getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { type, ...data });
  }
}

function registerUpdateIPC(): void {
  createSecureHandler('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查更新失败';
      log.error('手动检查更新失败:', message);
      return { success: false, error: message };
    }
  });

  createSecureHandler('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '下载更新失败';
      return { success: false, error: message };
    }
  });

  createSecureHandler('update:install', () => {
    setImmediate(() => autoUpdater.quitAndInstall());
    return { success: true };
  });

  createSecureHandler('update:version', () => {
    return app.getVersion();
  });
}

const getConfigPath = (): string => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'config.json');
};

const loadWindowConfig = (): { x?: number; y?: number; width?: number; height?: number } => {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load window config:', error);
  }
  return {};
};

let lastWindowEventTime = 0;
const WINDOW_EVENT_THROTTLE_MS = 200;
let saveWindowConfigTimer: ReturnType<typeof setTimeout> | null = null;

const saveWindowConfig = (config: { x: number; y: number; width: number; height: number }): void => {
  if (saveWindowConfigTimer) {
    clearTimeout(saveWindowConfigTimer);
  }
  saveWindowConfigTimer = setTimeout(async () => {
    try {
      const configPath = getConfigPath();
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save window config:', error);
    }
  }, 300);
};

let mainWindow: BrowserWindow | null = null;

function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function checkLlamaHealth(port: number = 8080): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); resolve(false); }, 2000);
    const url = `http://localhost:${port}/health`;
    const req = http.get(url, { signal: controller.signal }, (res) => {
      clearTimeout(timer);
      resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on('error', () => { clearTimeout(timer); resolve(false); });
  });
}

async function waitForLlamaServer(maxWaitMs: number = 15000, pollIntervalMs: number = 500): Promise<boolean> {
  const llamaPort = parseInt(process.env.LLAMA_CPP_PORT || '8080', 10);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const isHealthy = await checkLlamaHealth(llamaPort);
    if (isHealthy) {
      log.info(`llama-server 已就绪 (端口 ${llamaPort})，耗时 ${Date.now() - startTime}ms`);
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  log.warn(`等待 llama-server 超时 (${maxWaitMs}ms)，将继续启动 Rust Server`);
  return false;
}

app.whenReady().then(async () => {
  setupApiProxy();

  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['file://*/api/*'] },
    (details, callback) => {
      const newUrl = details.url.replace('file:///', `http://127.0.0.1:${PROXY_PORT}/`);
      callback({ redirectURL: newUrl });
    }
  );

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    if (details.url.includes(`127.0.0.1:${PROXY_PORT}`)) {
      headers['Access-Control-Allow-Origin'] = ['*'];
      headers['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, PATCH, OPTIONS'];
      headers['Access-Control-Allow-Headers'] = ['Content-Type, Authorization'];
    }
    callback({ responseHeaders: headers });
  });

  const savedConfig = loadWindowConfig();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const defaultWidth = 1440;
  const defaultHeight = 900;
  const width = savedConfig.width ?? defaultWidth;
  const height = savedConfig.height ?? defaultHeight;
  let x = savedConfig.x;
  let y = savedConfig.y;

  if (x === undefined || y === undefined || x < 0 || y < 0 || x + width > screenWidth || y + height > screenHeight) {
    x = Math.floor((screenWidth - width) / 2);
    y = Math.floor((screenHeight - height) / 2);
  }

  mainWindow = createMainWindow({
    width: width as number,
    height: height as number,
    minWidth: 800,
    minHeight: 600,
  });

  mainWindow.on('resize', () => {
    const now = Date.now();
    if (now - lastWindowEventTime < WINDOW_EVENT_THROTTLE_MS) return;
    lastWindowEventTime = now;
    if (mainWindow && !mainWindow.isMaximized()) {
      const [w, h] = mainWindow.getSize();
      const [px, py] = mainWindow.getPosition();
      saveWindowConfig({ x: px, y: py, width: w, height: h });
    }
  });

  mainWindow.on('moved', () => {
    const now = Date.now();
    if (now - lastWindowEventTime < WINDOW_EVENT_THROTTLE_MS) return;
    lastWindowEventTime = now;
    if (mainWindow && !mainWindow.isMaximized()) {
      const [w, h] = mainWindow.getSize();
      const [px, py] = mainWindow.getPosition();
      saveWindowConfig({ x: px, y: py, width: w, height: h });
    }
  });

  setupAppLifecycle(mainWindow, async () => {
    await stopServer();
    await stopLlamaServer();
    stopApiProxy();
  });

  registerServerIPC();
  registerLlamaIPC();
  registerWindowIPC();
  registerUpdateIPC();

  setTimeout(() => {
    startLlamaServer(mainWindow);
  }, 500);

  setTimeout(async () => {
    await waitForLlamaServer(15000, 500);
    startServer(mainWindow);
  }, 500);
});

function registerWindowIPC(): void {
  createSecureHandler('get-platform', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
    };
  });

  createSecureHandler('window-minimize', () => {
    mainWindow?.minimize();
  });

  createSecureHandler('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  createSecureHandler('window-close', () => {
    app.quit();
  });

  createSecureHandler('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  createSecureHandler('dialog:openDirectory', async () => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    });
    return result.filePaths[0] || null;
  });

  createSecureHandler('dialog:openFile', async (_event, options?: Electron.OpenDialogOptions) => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog(mainWindow!, options || {
      properties: ['openFile'],
    });
    return result.filePaths;
  });
}
