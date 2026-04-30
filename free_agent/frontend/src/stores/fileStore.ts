import { create } from 'zustand'
import { listFiles, readFile, writeFile, deleteFile, createFile, createFolder, renameFile } from '@/api/files'
import type { FileNode } from '@/types'
import { toast } from 'sonner'

export interface OpenFile {
  path: string
  name: string
  content: string
  originalContent: string
  language: string
}

interface FileStoreState {
  // 已打开的文件列表
  openFiles: OpenFile[]
  // 当前活动文件路径
  activeFilePath: string | null
  // 文件树数据
  fileTree: FileNode[] | null
  // 文件树加载状态
  isLoadingTree: boolean
  // 是否正在加载文件
  isLoadingFile: boolean
  // 操作加载状态
  isMutating: boolean

  // 打开文件
  openFile: (path: string) => Promise<void>
  // 关闭文件
  closeFile: (path: string) => void
  // 设置活动文件
  setActiveFile: (path: string | null) => void
  // 保存文件
  saveFile: (path: string) => Promise<boolean>
  // 检查文件是否已修改
  isModified: (path: string) => boolean
  // 更新文件内容（编辑器调用）
  updateFileContent: (path: string, content: string) => void
  // 更新文件树
  updateFileTree: () => Promise<void>
  // 关闭所有文件
  closeAllFiles: () => void
  // 关闭其他文件
  closeOtherFiles: (keepPath: string) => void

  // 文件操作
  createNewFile: (name: string, parentPath: string) => Promise<void>
  createNewFolder: (name: string, parentPath: string) => Promise<void>
  renameItem: (oldPath: string, newName: string, isDirectory: boolean) => Promise<void>
  deleteItem: (path: string, isDirectory: boolean) => Promise<void>
}

// 根据文件扩展名获取语言
const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    md: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bat: 'bat',
    ps1: 'powershell',
    sql: 'sql',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    vue: 'vue',
    svelte: 'svelte',
    txt: 'plaintext',
    log: 'plaintext',
    ini: 'ini',
    conf: 'ini',
    toml: 'toml',
    dockerfile: 'dockerfile',
    gitignore: 'ignore',
  }
const languageCache = new Map<string, string>()

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const cached = languageCache.get(ext)
  if (cached !== undefined) return cached
  const result = languageMap[ext] || 'plaintext'
  languageCache.set(ext, result)
  return result
}

// 从路径获取文件名
function getFileName(path: string): string {
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

// 拼接路径
function joinPath(parent: string, name: string): string {
  if (!parent) return name
  const separator = parent.includes('\\') ? '\\' : '/'
  return `${parent}${separator}${name}`
}

export const useFileStore = create<FileStoreState>()((set, get) => ({
  openFiles: [],
  activeFilePath: null,
  fileTree: null,
  isLoadingTree: false,
  isLoadingFile: false,
  isMutating: false,

  openFile: async (path: string) => {
    const { openFiles, isLoadingFile } = get()

    // 如果文件已经打开，直接设置为活动文件
    if (openFiles.some((f) => f.path === path)) {
      set({ activeFilePath: path })
      return
    }

    if (openFiles.length >= 20) {
      toast.warning('已达到最大打开文件数限制')
      return
    }

    if (isLoadingFile) return

    set({ isLoadingFile: true })

    try {
      const fileData = await readFile(path)
      const newFile: OpenFile = {
        path,
        name: getFileName(path),
        content: fileData.content,
        originalContent: fileData.content,
        language: getLanguageFromPath(path),
      }

      set((state) => ({
        openFiles: [...state.openFiles, newFile],
        activeFilePath: path,
        isLoadingFile: false,
      }))
    } catch (error) {
      set({ isLoadingFile: false })
      const errorMessage = error instanceof Error ? error.message : '读取文件失败'
      toast.error(errorMessage)
    }
  },

  closeFile: (path: string) => {
    const { openFiles, activeFilePath } = get()
    const newFiles = openFiles.filter((f) => f.path !== path)

    // 如果关闭的是当前活动文件，需要设置新的活动文件
    let newActivePath = activeFilePath
    if (activeFilePath === path) {
      const closedIndex = openFiles.findIndex((f) => f.path === path)
      if (newFiles.length > 0) {
        newActivePath = newFiles[Math.min(closedIndex, newFiles.length - 1)]?.path || null
      } else {
        newActivePath = null
      }
    }

    set({ openFiles: newFiles, activeFilePath: newActivePath })
  },

  setActiveFile: (path: string | null) => {
    set({ activeFilePath: path })
  },

  saveFile: async (path: string): Promise<boolean> => {
    const { openFiles } = get()
    const file = openFiles.find((f) => f.path === path)
    if (!file) return false

    try {
      await writeFile(path, file.content)
      const currentFiles = get().openFiles
      const idx = currentFiles.findIndex((f) => f.path === path)
      if (idx !== -1) {
        const updated = [...currentFiles]
        updated[idx] = { ...updated[idx], originalContent: updated[idx].content }
        set({ openFiles: updated })
      }
      toast.success('文件已保存')
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '保存文件失败'
      toast.error(errorMessage)
      return false
    }
  },

  isModified: (path: string): boolean => {
    const { openFiles } = get()
    const file = openFiles.find((f) => f.path === path)
    return file ? file.content !== file.originalContent : false
  },

  updateFileContent: (path: string, content: string) => {
    const { openFiles } = get()
    const idx = openFiles.findIndex((f) => f.path === path)
    if (idx === -1) return
    const updated = [...openFiles]
    updated[idx] = { ...updated[idx], content }
    set({ openFiles: updated })
  },

  updateFileTree: async () => {
    set({ isLoadingTree: true })
    try {
      const tree = await listFiles()
      set({ fileTree: tree, isLoadingTree: false })
    } catch (error) {
      set({ isLoadingTree: false })
      const errorMessage = error instanceof Error ? error.message : '获取文件列表失败'
      toast.error(errorMessage)
    }
  },

  closeAllFiles: () => {
    set({ openFiles: [], activeFilePath: null })
  },

  closeOtherFiles: (keepPath: string) => {
    set((state) => ({
      openFiles: state.openFiles.filter((f) => f.path === keepPath),
      activeFilePath: keepPath,
    }))
  },

  // 新建文件
  createNewFile: async (name: string, parentPath: string) => {
    set({ isMutating: true })
    try {
      const fullPath = joinPath(parentPath, name)
      await createFile(fullPath)
      toast.success(`已创建文件: ${name}`)
      // 刷新文件树
      await get().updateFileTree()
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建文件失败'
      toast.error(message)
    } finally {
      set({ isMutating: false })
    }
  },

  // 新建文件夹
  createNewFolder: async (name: string, parentPath: string) => {
    set({ isMutating: true })
    try {
      const fullPath = joinPath(parentPath, name)
      await createFolder(fullPath)
      toast.success(`已创建文件夹: ${name}`)
      await get().updateFileTree()
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建文件夹失败'
      toast.error(message)
    } finally {
      set({ isMutating: false })
    }
  },

  // 重命名
  renameItem: async (oldPath: string, newName: string, isDirectory: boolean) => {
    set({ isMutating: true })
    try {
      // 获取父路径
      const parts = oldPath.split(/[/\\]/)
      parts[parts.length - 1] = newName
      const newPath = parts.join(parts[0]?.includes(':') ? '\\' : '/')

      await renameFile(oldPath, newPath, isDirectory)
      toast.success(`已重命名: ${newName}`)

      // 如果打开的文件被重命名，更新路径
      const { openFiles, activeFilePath } = get()
      const idx = openFiles.findIndex((f) => f.path === oldPath)
      if (idx !== -1) {
        const updated = [...openFiles]
        updated[idx] = { ...updated[idx], path: newPath, name: newName }
        set({
          openFiles: updated,
          activeFilePath: activeFilePath === oldPath ? newPath : activeFilePath,
        })
      }

      await get().updateFileTree()
    } catch (error) {
      const message = error instanceof Error ? error.message : '重命名失败'
      toast.error(message)
    } finally {
      set({ isMutating: false })
    }
  },

  // 删除
  deleteItem: async (path: string, _isDirectory: boolean) => {
    set({ isMutating: true })
    try {
      await deleteFile(path)
      toast.success(`已删除: ${path}`)

      // 如果删除的是打开的文件，关闭它
      const { openFiles } = get()
      if (openFiles.some((f) => f.path === path)) {
        get().closeFile(path)
      }

      await get().updateFileTree()
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败'
      toast.error(message)
    } finally {
      set({ isMutating: false })
    }
  },
}))
