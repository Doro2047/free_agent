import { ChildProcess, spawn, exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app, BrowserWindow, ipcMain } from 'electron';
import http from 'http';

// CommonJS provides __dirname and __filename automatically
// No import.meta.url needed

export type LlamaStatus = 'starting' | 'running' | 'stopped' | 'error';
export type AgentMode = 'chat' | 'code';

interface LlamaServerModeConfig {
  temperature: number
  topK: number
  topP: number
  minP?: number
  repeatPenalty: number
  presencePenalty?: number
  frequencyPenalty?: number
  systemPrompt: string
}

const AGENT_MODE_CONFIGS: Record<AgentMode, LlamaServerModeConfig> = {
  chat: {
    temperature: 1,
    topK: 50,
    topP: 0.9,
    repeatPenalty: 1.1,
    systemPrompt: '你是一个有帮助的 AI 助手。你擅长文本生成、图像理解、小说创作和创意写作。你可以进行多轮对话，处理多样化的自然语言需求。',
  },
  code: {
    temperature: 0.1,
    topK: 10,
    topP: 0.85,
    minP: 0.05,
    repeatPenalty: 1.2,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    systemPrompt: '你是一个专业的 AI 编程助手。你可以理解需求、规划任务、生成代码、测试和部署。你擅长代码推理和逻辑分析。',
  },
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

interface LlamaState {
  process: ChildProcess | null;
  status: LlamaStatus;
  port: number;
  healthCheckTimer: ReturnType<typeof setInterval> | null;
  logPath: string;
  logStream: fs.WriteStream | null;
  agentMode: AgentMode;
  retryCount: number;
  autoRestart: boolean;
}

const state: LlamaState = {
  process: null,
  status: 'stopped',
  port: 8080,
  healthCheckTimer: null,
  logPath: '',
  logStream: null,
  agentMode: 'chat',
  retryCount: 0,
  autoRestart: true,
};

// ==================== 日志 ====================

function initLogStream(logPath: string): fs.WriteStream {
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const stream = fs.createWriteStream(logPath, {
    flags: 'a',
    encoding: 'utf-8',
    autoClose: true,
  });

  stream.on('error', (error) => {
    console.error('llama 日志写入流错误:', error);
  });

  return stream;
}

function appendToLog(message: string): void {
  if (!state.logStream) return;

  try {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [LLAMA] ${message}\n`;
    state.logStream.write(line);
  } catch (error) {
    console.error('写入 llama 日志失败:', error);
  }
}

function closeLogStream(): void {
  if (state.logStream) {
    state.logStream.end();
    state.logStream = null;
  }
}

// ==================== 可执行文件检测 ====================

function getLlamaServerExe(): { path: string; exists: boolean } {
  const platform = process.platform;
  const exeName = platform === 'win32' ? 'llama-server.exe' : 'llama-server';

  const searchPaths: string[] = [];
  searchPaths.push(path.join(process.resourcesPath, 'llama-b8352', exeName));

  const appRoot = app.getAppPath();
  searchPaths.push(
    path.join(appRoot, 'llama-b8352', exeName),
    path.join(appRoot, '..', 'llama-b8352', exeName),
  );

  const userDataPath = app.getPath('userData');
  searchPaths.push(path.join(userDataPath, 'llama-b8352', exeName));

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return { path: p, exists: true };
    }
  }

  return { path: searchPaths[0], exists: false };
}

function getDefaultModelPath(): { path: string; exists: boolean } {
  const modelFileName = 'Qwen3.5-9B-Unredacted-MAX.Q8_0.gguf';
  const searchPaths: string[] = [];

  searchPaths.push(
    path.join(
      process.resourcesPath,
      'Qwen3.5-Thinking-AIO-GGUF',
      'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF',
      modelFileName
    )
  );

  const appRoot = app.getAppPath();
  searchPaths.push(
    path.join(appRoot, 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', modelFileName),
    path.join(appRoot, '..', 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', modelFileName),
  );

  const userDataPath = app.getPath('userData');
  searchPaths.push(path.join(userDataPath, 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', modelFileName));

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return { path: p, exists: true };
    }
  }

  return { path: searchPaths[0], exists: false };
}

function getMmprojPath(): { path: string; exists: boolean } {
  const mmprojFileName = 'Qwen3.5-9B-Unredacted-MAX.mmproj-bf16.gguf';
  const searchPaths: string[] = [];

  const appRoot = app.getAppPath();
  searchPaths.push(
    path.join(appRoot, 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', mmprojFileName),
    path.join(appRoot, '..', 'Qwen3.5-Thinking-AIO-GGUF', 'Qwen3.5-9B-Unredacted-MAX-Thinking-GGUF', mmprojFileName),
  );

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      return { path: p, exists: true };
    }
  }

  return { path: searchPaths[0], exists: false };
}

// ==================== 自定义模型路径配置 ====================

function getModelPath(): { path: string; exists: boolean } {
  const envModelPath = process.env.LLAMA_MODEL_PATH;
  if (envModelPath && fs.existsSync(envModelPath)) {
    return { path: envModelPath, exists: true };
  }

  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);
      const customModelPath = config.llamaModelPath || config.modelPath;
      if (customModelPath && fs.existsSync(customModelPath)) {
        return { path: customModelPath, exists: true };
      }
    }
  } catch {
    // 配置文件读取失败，回退到默认路径
  }

  return getDefaultModelPath();
}

// ==================== GPU 检测 ====================

async function detectGpuLayers(): Promise<number> {
  const envGpuLayers = process.env.LLAMA_GPU_LAYERS;
  if (envGpuLayers) {
    const parsed = parseInt(envGpuLayers, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData);
      if (typeof config.gpuLayers === 'number' && config.gpuLayers >= 0) {
        return config.gpuLayers;
      }
    }
  } catch {
    // 忽略配置读取错误
  }

  if (process.platform === 'win32') {
    try {
      const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        exec(
          'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_VideoController | Select-Object Name, AdapterRAM | ConvertTo-Json"',
          { maxBuffer: 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          }
        );
      });

      const hasNvidia = /NVIDIA/i.test(stdout);
      const hasAmd = /AMD/i.test(stdout);

      if (hasNvidia) return 99;
      if (hasAmd) return 99;
      return 35;
    } catch {
      try {
        const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          exec('wmic path win32_VideoController get Name,AdapterRAM', (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
          });
        });

        const hasNvidia = /NVIDIA/i.test(stdout);
        const hasAmd = /AMD/i.test(stdout);

        if (hasNvidia) return 99;
        if (hasAmd) return 99;
        return 35;
      } catch {
        return 35;
      }
    }
  }

  if (process.platform === 'darwin') return 99;

  if (process.platform === 'linux') {
    try {
      const { stdout } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        exec('lspci | grep -i -E "vga|3d|display"', (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve({ stdout, stderr });
        });
      });

      if (/NVIDIA/i.test(stdout)) return 99;
      return 35;
    } catch {
      return 35;
    }
  }

  return 35;
}

// ==================== 端口检测 ====================

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) return port;
  }
  return startPort;
}

// ==================== 健康检查 ====================

function startHealthCheck(_window: BrowserWindow): void {
  stopHealthCheck();

  state.healthCheckTimer = setInterval(async () => {
    if (state.status !== 'running') return;
    try {
      await checkHealth();
    } catch {
      appendToLog('健康检查失败，llama-server 可能已停止响应');
    }
  }, 10_000);
}

function stopHealthCheck(): void {
  if (state.healthCheckTimer) {
    clearInterval(state.healthCheckTimer);
    state.healthCheckTimer = null;
  }
}

function checkHealth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${state.port}/health`;
    const req = http.get(url, { timeout: 5000 }, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Health check failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health check timeout'));
    });
  });
}

// ==================== 发送状态到渲染进程 ====================

function sendStatus(window: BrowserWindow | null, status: LlamaStatus, extra?: Record<string, unknown>): void {
  state.status = status;
  const message = {
    type: 'llama-status',
    status,
    port: state.port,
    ...extra,
  };
  window?.webContents.send('llama-message', message);
  appendToLog(`状态变更: ${status}`);
}

function sendLog(window: BrowserWindow | null, level: 'info' | 'error' | 'warn', message: string): void {
  window?.webContents.send('llama-message', {
    type: 'llama-log',
    level,
    message,
    timestamp: new Date().toISOString(),
  });
}

// ==================== 启动 llama-server ====================

export async function startLlamaServer(window: BrowserWindow | null): Promise<void> {
  if (state.process && state.status !== 'stopped') {
    await stopLlamaServer();
  }

  state.retryCount = 0;
  state.autoRestart = true;
  await attemptStart(window);
}

async function attemptStart(window: BrowserWindow | null): Promise<void> {
  sendStatus(window, 'starting');

  const exe = getLlamaServerExe();
  if (!exe.exists) {
    sendStatus(window, 'error', { message: `找不到 llama-server 可执行文件。期望路径: ${exe.path}`, code: 'FILE_NOT_FOUND' });
    sendLog(window, 'error', `llama-server 可执行文件不存在: ${exe.path}`);
    return;
  }

  const model = getModelPath();
  if (!model.exists) {
    sendStatus(window, 'error', { message: `找不到模型文件。期望路径: ${model.path}`, code: 'MODEL_NOT_FOUND' });
    sendLog(window, 'error', `模型文件不存在: ${model.path}`);
    return;
  }

  state.port = await findAvailablePort(8080);

  state.logPath = path.join(app.getPath('userData'), 'llama-server.log');
  closeLogStream();
  state.logStream = initLogStream(state.logPath);

  const gpuLayers = await detectGpuLayers();
  const modeConfig = AGENT_MODE_CONFIGS[state.agentMode];

  const args = [
    '--model', model.path,
    '--host', '127.0.0.1',
    '--port', String(state.port),
    '--ctx-size', '16384',
    '--n-gpu-layers', String(gpuLayers),
    '--reasoning-format', 'deepseek-legacy',
    '--reasoning',
    '--jinja',
    '--log-disable',
    '--nobatch',
    '--temperature', String(modeConfig.temperature),
    '--top-k', String(modeConfig.topK),
    '--top-p', String(modeConfig.topP),
    '--repeat-penalty', String(modeConfig.repeatPenalty),
  ];

  if (state.agentMode === 'code') {
    args.push(
      '--min-p', String(modeConfig.minP!),
      '--presence-penalty', String(modeConfig.presencePenalty!),
      '--frequency-penalty', String(modeConfig.frequencyPenalty!),
    );
  }

  const mmproj = getMmprojPath();
  if (mmproj.exists) args.push('--mmproj', mmproj.path);

  appendToLog(`启动 llama-server: ${exe.path} ${args.join(' ')}`);
  appendToLog(`GPU 图层卸载数: ${gpuLayers}`);
  sendLog(window, 'info', `正在启动 llama-server (端口 ${state.port})...`);
  sendLog(window, 'info', `模型: ${path.basename(model.path)}`);
  sendLog(window, 'info', `GPU 卸载层数: ${gpuLayers}`);

  try {
    const child = spawn(exe.path, args, {
      cwd: path.dirname(exe.path),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GGML_CUDA_ENABLE_UNIFIED_MEMORY: '1' },
      ...(process.platform === 'win32' ? { windowsHide: true } : {}),
    });

    state.process = child;

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8').trim();
      if (text) {
        appendToLog(text);
        sendLog(window, 'info', text);
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8').trim();
      if (text) {
        appendToLog(`[STDERR] ${text}`);
        sendLog(window, 'warn', text);
      }
    });

    child.on('exit', (code, signal) => {
      appendToLog(`llama-server 进程退出: code=${code}, signal=${signal}`);
      sendLog(window, 'error', `llama-server 进程退出 (code=${code}, signal=${signal})`);

      if (code !== 0 && state.autoRestart && state.retryCount < MAX_RETRIES) {
        state.retryCount++;
        sendLog(window, 'warn', `llama-server 异常退出，${RETRY_DELAY_MS / 1000} 秒后自动重启 (${state.retryCount}/${MAX_RETRIES})...`);
        sendStatus(window, 'starting', { retryCount: state.retryCount });
        setTimeout(() => attemptStart(window), RETRY_DELAY_MS);
      } else if (code !== 0) {
        if (state.retryCount >= MAX_RETRIES) {
          sendStatus(window, 'error', { message: `llama-server 启动失败，已重试 ${MAX_RETRIES} 次`, code: 'MAX_RETRIES_EXCEEDED' });
        } else {
          sendStatus(window, 'error', { message: `llama-server 启动失败 (code=${code})`, code: 'PROCESS_EXITED' });
        }
      } else {
        state.retryCount = 0;
        sendStatus(window, 'stopped');
      }
    });

    child.on('error', (error) => {
      appendToLog(`llama-server 进程错误: ${error.message}`);
      sendStatus(window, 'error', { message: `llama-server 进程错误: ${error.message}`, code: 'PROCESS_ERROR' });
      sendLog(window, 'error', error.message);
    });

    setTimeout(() => {
      if (state.process && !state.process.killed) {
        checkHealth()
          .then(() => {
            state.retryCount = 0;
            sendStatus(window, 'running');
            sendLog(window, 'info', `llama-server 运行正常 (端口 ${state.port})`);
            startHealthCheck(window!);
          })
          .catch((err) => {
            sendLog(window, 'warn', `健康检查未通过: ${err.message}`);
            sendStatus(window, 'running', { healthCheckFailed: true });
            startHealthCheck(window!);
          });
      }
    }, 3000);
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动 llama-server 失败';
    sendStatus(window, 'error', { message, code: 'START_FAILED' });
    sendLog(window, 'error', message);
  }
}

// ==================== 停止 llama-server ====================

export async function stopLlamaServer(): Promise<void> {
  stopHealthCheck();
  closeLogStream();
  state.autoRestart = false;

  if (!state.process) {
    state.status = 'stopped';
    return;
  }

  const child = state.process;

  if (process.platform === 'win32') {
    try {
      await new Promise<void>((resolve, reject) => {
        exec(`taskkill /PID ${child.pid} /T`, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    } catch {
      try { child.kill('SIGKILL'); } catch (e) { console.error('强制终止 llama-server 进程失败:', e); }
    }
  } else {
    child.kill('SIGTERM');
  }

  const forceKillTimer = setTimeout(() => {
    if (!child.killed) {
      try { child.kill('SIGKILL'); } catch (e) { console.error('强制终止 llama-server 进程失败:', e); }
    }
  }, 5000);

  await new Promise<void>((resolve) => {
    if (child.killed) { resolve(); return }
    child.on('exit', () => { clearTimeout(forceKillTimer); resolve() });
    setTimeout(() => { clearTimeout(forceKillTimer); resolve() }, 6000);
  });

  state.process = null;
  state.status = 'stopped';
  appendToLog('llama-server 已停止');
}

// ==================== 获取状态 ====================

export function getLlamaStatus(): { status: LlamaStatus; port: number; model?: string } {
  const model = getModelPath();
  return {
    status: state.status,
    port: state.port,
    model: model.exists ? model.path : undefined,
  };
}

// ==================== 模式切换 ====================

export function getAgentMode(): AgentMode {
  return state.agentMode;
}

export async function switchAgentMode(newMode: AgentMode, window: BrowserWindow | null): Promise<void> {
  if (state.agentMode === newMode) return;

  state.agentMode = newMode;
  appendToLog(`切换 Agent 模式: ${newMode}`);
  sendLog(window, 'info', `正在切换到 ${newMode === 'chat' ? 'Chat' : 'Code'} 模式...`);

  if (state.status === 'running') {
    await stopLlamaServer();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await startLlamaServer(window);
  }

  sendStatus(window, 'running', { agentMode: newMode });
}

// ==================== 注册 IPC 处理器 ====================

export function registerLlamaIPC(): void {
  ipcMain.handle('llama:start', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await startLlamaServer(win);
    return getLlamaStatus();
  });

  ipcMain.handle('llama:stop', async () => {
    await stopLlamaServer();
    return getLlamaStatus();
  });

  ipcMain.handle('llama:restart', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await stopLlamaServer();
    await startLlamaServer(win);
    return getLlamaStatus();
  });

  ipcMain.handle('llama:status', () => getLlamaStatus());

  ipcMain.handle('llama:logs', async () => {
    if (!state.logPath || !fs.existsSync(state.logPath)) return '';
    try { return fs.readFileSync(state.logPath, 'utf-8'); } catch (e) { console.error('读取 llama 日志失败:', e); return ''; }
  });

  ipcMain.handle('agent-mode:get', () => state.agentMode);

  ipcMain.handle('agent-mode:set', async (event, newMode: AgentMode) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    await switchAgentMode(newMode, win);
    return { agentMode: state.agentMode };
  });
}
