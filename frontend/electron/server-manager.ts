import { ChildProcess, spawn, exec } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { app, BrowserWindow, ipcMain } from 'electron'
import http from 'http'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export type ServerStatus = 'starting' | 'running' | 'stopped' | 'error'

const MAX_RETRIES = 3
const HEALTH_CHECK_INTERVAL = 10_000
const GRACEFUL_TIMEOUT = 5_000

interface ServerState {
  process: ChildProcess | null
  status: ServerStatus
  port: number
  retryCount: number
  healthCheckTimer: ReturnType<typeof setInterval> | null
  logPath: string
  logStream: fs.WriteStream | null
}

const state: ServerState = {
  process: null,
  status: 'stopped',
  port: 3000,
  retryCount: 0,
  healthCheckTimer: null,
  logPath: '',
  logStream: null,
}

function initLogStream(logPath: string): fs.WriteStream {
  const logDir = path.dirname(logPath)
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  const stream = fs.createWriteStream(logPath, { flags: 'a', encoding: 'utf-8', autoClose: true })
  stream.on('error', (error) => console.error('日志写入流错误:', error))
  return stream
}

function appendToLog(message: string): void {
  if (!state.logStream) return
  try {
    const timestamp = new Date().toISOString()
    state.logStream.write(`[${timestamp}] ${message}\n`)
  } catch (error) {
    console.error('写入日志失败:', error)
  }
}

function closeLogStream(): void {
  if (state.logStream) { state.logStream.end(); state.logStream = null }
}

function getServerExecutable(): { path: string; exists: boolean } {
  const platform = process.platform
  const exeName = platform === 'win32' ? 'server.exe' : 'server'
  const packedPath = path.join(process.resourcesPath, 'server', exeName)
  const appRoot = app.getAppPath()
  const devPaths = [
    path.join(appRoot, 'resources', 'server', exeName),
    path.join(appRoot, '..', 'resources', 'server', exeName),
  ]
  const searchPaths = [packedPath, ...devPaths]
  for (const p of searchPaths) {
    if (fs.existsSync(p)) return { path: p, exists: true }
  }
  return { path: searchPaths[0], exists: false }
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.listen(port, '127.0.0.1', () => { server.close(() => resolve(true)) })
    server.on('error', () => resolve(false))
  })
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port <= startPort + 10; port++) {
    if (await isPortAvailable(port)) return port
  }
  return startPort
}

function startHealthCheck(_window: BrowserWindow): void {
  stopHealthCheck()
  state.healthCheckTimer = setInterval(async () => {
    if (state.status !== 'running') return
    try { await checkHealth() } catch { appendToLog('健康检查失败，服务器可能已停止响应') }
  }, HEALTH_CHECK_INTERVAL)
}

function stopHealthCheck(): void {
  if (state.healthCheckTimer) { clearInterval(state.healthCheckTimer); state.healthCheckTimer = null }
}

function checkHealth(): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:${state.port}/health`
    const req = http.get(url, { timeout: 3000 }, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve()
      else reject(new Error(`Health check failed: ${res.statusCode}`))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Health check timeout')) })
  })
}

function sendStatus(window: BrowserWindow | null, status: ServerStatus, extra?: Record<string, unknown>): void {
  state.status = status
  const message = { type: 'server-status', status, port: state.port, ...extra }
  window?.webContents.send('server-message', message)
  appendToLog(`状态变更: ${status}`)
}

function sendLog(window: BrowserWindow | null, level: 'info' | 'error' | 'warn', message: string): void {
  window?.webContents.send('server-message', { type: 'server-log', level, message, timestamp: new Date().toISOString() })
}

export async function startServer(window: BrowserWindow | null): Promise<void> {
  if (state.process && state.status !== 'stopped') await stopServer()
  state.retryCount = 0
  await attemptStart(window)
}

async function attemptStart(window: BrowserWindow | null): Promise<void> {
  sendStatus(window, 'starting')
  const exe = getServerExecutable()
  if (!exe.exists) {
    sendStatus(window, 'error', { message: `找不到服务器可执行文件。期望路径: ${exe.path}`, code: 'FILE_NOT_FOUND' })
    sendLog(window, 'error', `服务器可执行文件不存在: ${exe.path}`)
    return
  }

  state.port = await findAvailablePort(3000)
  const configPath = path.join(app.getPath('userData'), 'config.json')
  const configDir = path.dirname(configPath)
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })

  state.logPath = path.join(app.getPath('userData'), 'server.log')
  closeLogStream()
  state.logStream = initLogStream(state.logPath)

  const args = ['--port', String(state.port), '--config', configPath]
  const llamaPort = process.env.LLAMA_CPP_PORT || '8080'
  const llamaBaseUrl = `http://localhost:${llamaPort}/v1`

  appendToLog(`启动服务器: ${exe.path} ${args.join(' ')}`)
  appendToLog(`LLAMA_CPP_BASE_URL: ${llamaBaseUrl}`)
  sendLog(window, 'info', `正在启动服务器 (端口 ${state.port})...`)
  sendLog(window, 'info', `连接本地模型: ${llamaBaseUrl}`)

  try {
    const child = spawn(exe.path, args, {
      cwd: path.dirname(exe.path),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, LLAMA_CPP_BASE_URL: llamaBaseUrl },
      ...(process.platform === 'win32' ? { windowsHide: true } : {}),
    })

    state.process = child

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8').trim()
      if (text) { appendToLog(text); sendLog(window, 'info', text) }
    })

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8').trim()
      if (text) { appendToLog(`[STDERR] ${text}`); sendLog(window, 'warn', text) }
    })

    child.on('exit', (code, signal) => {
      appendToLog(`服务器进程退出: code=${code}, signal=${signal}`)
      sendLog(window, 'error', `服务器进程退出 (code=${code}, signal=${signal})`)

      if (code !== 0 && state.retryCount < MAX_RETRIES) {
        state.retryCount++
        sendLog(window, 'warn', `服务器异常退出，${3 - state.retryCount + 1} 秒后重试 (${state.retryCount}/${MAX_RETRIES})...`)
        setTimeout(() => attemptStart(window), 3000)
      } else if (state.retryCount >= MAX_RETRIES) {
        sendStatus(window, 'error', { message: `服务器启动失败，已重试 ${MAX_RETRIES} 次`, code: 'MAX_RETRIES_EXCEEDED' })
      } else {
        sendStatus(window, 'stopped')
      }
    })

    child.on('error', (error) => {
      appendToLog(`服务器进程错误: ${error.message}`)
      sendStatus(window, 'error', { message: `服务器进程错误: ${error.message}`, code: 'PROCESS_ERROR' })
      sendLog(window, 'error', error.message)
    })

    setTimeout(() => {
      if (state.process && !state.process.killed) {
        checkHealth()
          .then(() => {
            sendStatus(window, 'running')
            sendLog(window, 'info', `服务器运行正常 (端口 ${state.port})`)
            startHealthCheck(window!)
          })
          .catch((err) => {
            sendLog(window, 'warn', `健康检查未通过: ${err.message}`)
            sendStatus(window, 'running', { healthCheckFailed: true })
            startHealthCheck(window!)
          })
      }
    }, 2000)
  } catch (error) {
    const message = error instanceof Error ? error.message : '启动服务器失败'
    sendStatus(window, 'error', { message, code: 'START_FAILED' })
    sendLog(window, 'error', message)
  }
}

export async function stopServer(): Promise<void> {
  stopHealthCheck()
  closeLogStream()

  if (!state.process) { state.status = 'stopped'; return }

  const child = state.process

  if (process.platform === 'win32') {
    try {
      await new Promise<void>((resolve, reject) => {
        exec(`taskkill /PID ${child.pid} /T`, (error) => {
          if (error) reject(error)
          else resolve()
        })
      })
    } catch {
      try { child.kill('SIGKILL') } catch (e) { console.error('强制终止服务器进程失败:', e) }
    }
  } else {
    child.kill('SIGTERM')
  }

  const forceKillTimer = setTimeout(() => {
    if (!child.killed) {
      try { child.kill('SIGKILL') } catch (e) { console.error('强制终止服务器进程失败:', e) }
    }
  }, GRACEFUL_TIMEOUT);

  await new Promise<void>((resolve) => {
    if (child.killed) { resolve(); return }
    child.on('exit', () => { clearTimeout(forceKillTimer); resolve() })
    setTimeout(() => { clearTimeout(forceKillTimer); resolve() }, GRACEFUL_TIMEOUT + 1000)
  })

  state.process = null
  state.status = 'stopped'
  appendToLog('服务器已停止')
}

export function getServerStatus(): { status: ServerStatus; port: number; retryCount: number } {
  return { status: state.status, port: state.port, retryCount: state.retryCount }
}

export function registerServerIPC(): void {
  ipcMain.handle('server:start', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    await startServer(win)
    return getServerStatus()
  })

  ipcMain.handle('server:stop', async () => {
    await stopServer()
    return getServerStatus()
  })

  ipcMain.handle('server:restart', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    await stopServer()
    await startServer(win)
    return getServerStatus()
  })

  ipcMain.handle('server:status', () => getServerStatus())

  ipcMain.handle('server:logs', async () => {
    if (!state.logPath || !fs.existsSync(state.logPath)) return ''
    try { return fs.readFileSync(state.logPath, 'utf-8') } catch (e) { console.error('读取服务器日志失败:', e); return '' }
  })

  ipcMain.handle('server:check-port', async (_event, port: number) => await isPortAvailable(port))
}
