import { app, BrowserWindow, screen, Tray, Menu, nativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ==================== 窗口状态持久化 ====================

interface WindowStateConfig {
  x: number
  y: number
  width: number
  height: number
  isMaximized: boolean
}

const WINDOW_STATE_PATH = path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState(): Partial<WindowStateConfig> {
  try {
    if (fs.existsSync(WINDOW_STATE_PATH)) {
      const raw = fs.readFileSync(WINDOW_STATE_PATH, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (error) {
    console.error('加载窗口状态失败:', error)
  }
  return {}
}

let saveWindowConfigTimer: ReturnType<typeof setTimeout> | null = null

function saveWindowState(state: WindowStateConfig): void {
  if (saveWindowConfigTimer) clearTimeout(saveWindowConfigTimer)
  saveWindowConfigTimer = setTimeout(async () => {
    try {
      const dir = path.dirname(WINDOW_STATE_PATH)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      await fs.promises.writeFile(WINDOW_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8')
    } catch (error) {
      console.error('保存窗口状态失败:', error)
    }
  }, 300)
}

// ==================== 托盘管理 ====================

let tray: Tray | null = null
let mainWindowRef: BrowserWindow | null = null
let isAppQuitting = false

function createTray(window: BrowserWindow): void {
  mainWindowRef = window

  let iconPath: string | null = null
  const iconNames = [
    process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png',
    'icon.png',
  ]

  const searchDirs = [
    path.join(app.getAppPath(), 'build', 'icons'),
    path.join(app.getAppPath(), 'build'),
  ]

  for (const dir of searchDirs) {
    for (const name of iconNames) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate)) {
        iconPath = candidate
        break
      }
    }
    if (iconPath) break
  }

  if (!iconPath) {
    try { tray = new Tray(nativeImage.createEmpty()) } catch (e) { console.error('创建空图标托盘失败:', e); return }
  } else {
    try { tray = new Tray(iconPath) } catch (e) { console.error('创建图标托盘失败:', e); return }
  }

  tray.setToolTip('FREE Agent')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindowRef) {
          if (mainWindowRef.isMinimized()) mainWindowRef.restore()
          mainWindowRef.show()
          mainWindowRef.focus()
        }
      },
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isVisible()) mainWindowRef.hide()
      else { mainWindowRef.show(); mainWindowRef.focus() }
    }
  })
}

// ==================== 应用菜单 ====================

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin'

  const template = [
    ...(isMac
      ? [{
          label: app.getName(),
          submenu: [
            { role: 'about' },
            { type: 'separator' as const },
            { role: 'services' },
            { type: 'separator' as const },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' as const },
            { role: 'quit' },
          ],
        }]
      : [{
          label: '文件',
          submenu: [
            { label: '关于', click: () => {} },
            { type: 'separator' as const },
            { label: '退出', accelerator: 'Alt+F4', click: () => app.quit() },
          ],
        }]),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' as const },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }, { type: 'separator' as const }, { label: '语音', submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }] }]
          : [{ role: 'delete' }, { type: 'separator' as const }, { role: 'selectAll' }]),
      ],
    },
    {
      label: '查看',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' as const },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' as const },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' as const }, { role: 'front' }, { type: 'separator' as const }, { role: 'window' }] : [{ role: 'close' }]),
      ],
    },
  ] as Electron.MenuItemConstructorOptions[]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ==================== 窗口创建 ====================

interface WindowCreationOptions {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  developmentUrl?: string
  productionPath?: string
}

export function createMainWindow(options: WindowCreationOptions = {}): BrowserWindow {
  const {
    width: optWidth,
    height: optHeight,
    minWidth: _minWidth = 1024,
    minHeight: _minHeight = 600,
    developmentUrl = 'http://localhost:5173',
    productionPath,
  } = options

  const defaultWidth = optWidth ?? 1440
  const defaultHeight = optHeight ?? 900
  const savedState = loadWindowState()

  const width = savedState.width ?? defaultWidth
  const height = savedState.height ?? defaultHeight

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize

  let x = savedState.x
  let y = savedState.y

  if (x === undefined || y === undefined || x < 0 || y < 0 || x + width > screenW || y + height > screenH) {
    x = Math.floor((screenW - width) / 2)
    y = Math.floor((screenH - height) / 2)
  }

  const mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    x: x as number,
    y: y as number,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#1c1c2e', symbolColor: '#a0a0b8', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
    backgroundColor: '#0f0f1a',
  })

  mainWindow.webContents.setZoomLevel(0)

  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    mainWindow.loadURL(developmentUrl)
    mainWindow.webContents.openDevTools()
  } else {
    const prodPath = productionPath || path.join(__dirname, '../dist/index.html')
    mainWindow.loadFile(prodPath)
  }

  mainWindow.once('ready-to-show', () => {
    if (savedState.isMaximized) mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      const [w, h] = mainWindow.getSize()
      const [px, py] = mainWindow.getPosition()
      saveWindowState({ x: px, y: py, width: w, height: h, isMaximized: false })
    }
  })

  mainWindow.on('move', () => {
    if (!mainWindow.isMaximized()) {
      const [w, h] = mainWindow.getSize()
      const [px, py] = mainWindow.getPosition()
      saveWindowState({ x: px, y: py, width: w, height: h, isMaximized: false })
    }
  })

  mainWindow.on('maximize', () => {
    const [w, h] = mainWindow.getSize()
    const [px, py] = mainWindow.getPosition()
    saveWindowState({ x: px, y: py, width: w, height: h, isMaximized: true })
  })

  mainWindow.on('unmaximize', () => {
    const [w, h] = mainWindow.getSize()
    const [px, py] = mainWindow.getPosition()
    saveWindowState({ x: px, y: py, width: w, height: h, isMaximized: false })
  })

  mainWindow.on('closed', () => {})

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  return mainWindow
}

// ==================== 初始化 ====================

export function setupAppLifecycle(window: BrowserWindow, beforeQuitCallback?: () => Promise<void>): void {
  createApplicationMenu()
  createTray(window)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // 注意：这里不创建新窗口，因为创建逻辑在外部
    } else {
      window.show()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', async () => {
    isAppQuitting = true
    if (beforeQuitCallback) await beforeQuitCallback()
  })

  window.on('close', (event) => {
    if (!isAppQuitting) {
      event.preventDefault()
      window.hide()
    }
  })
}

export { createApplicationMenu as createMenu, createTray }
