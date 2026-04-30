import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listFiles, readFile, writeFile, createFile, createFolder, editFile, deleteFile, searchFiles, searchContent } from '@/api/files'
import { apiClient } from '@/api/client'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    instance: { defaults: { baseURL: 'http://localhost:3000/api' } },
    clearCache: vi.fn(),
  },
}))

describe('files API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('listFiles', () => {
    it('应返回文件列表', async () => {
      const mockFiles = [{ name: 'test.ts', path: '/test.ts', type: 'file', isDirectory: false }]
      ;(apiClient.get as any).mockResolvedValue(mockFiles)
      const result = await listFiles()
      expect(apiClient.get).toHaveBeenCalledWith('/files', { params: {} })
      expect(result).toHaveLength(1)
    })

    it('应支持指定路径', async () => {
      ;(apiClient.get as any).mockResolvedValue([])
      await listFiles('/src')
      expect(apiClient.get).toHaveBeenCalledWith('/files', { params: { path: '/src' } })
    })
  })

  describe('readFile', () => {
    it('应返回文件内容', async () => {
      const mockContent = { path: '/test.ts', content: 'hello', encoding: 'utf-8', size: 5 }
      ;(apiClient.get as any).mockResolvedValue(mockContent)
      const result = await readFile('/test.ts')
      expect(apiClient.get).toHaveBeenCalledWith('/files/read', { params: { path: '/test.ts' } })
      expect(result.content).toBe('hello')
    })
  })

  describe('writeFile', () => {
    it('应写入文件内容', async () => {
      ;(apiClient.post as any).mockResolvedValue({ success: true, message: 'OK' })
      const result = await writeFile('/test.ts', 'content')
      expect(apiClient.post).toHaveBeenCalledWith('/files/write', { path: '/test.ts', content: 'content' })
      expect(result.success).toBe(true)
    })
  })

  describe('createFile', () => {
    it('应创建空文件', async () => {
      ;(apiClient.post as any).mockResolvedValue({ success: true, message: 'OK' })
      await createFile('/new.ts')
      expect(apiClient.post).toHaveBeenCalledWith('/files/write', { path: '/new.ts', content: '' })
    })
  })

  describe('createFolder', () => {
    it('应创建文件夹（通过写入 .gitkeep）', async () => {
      ;(apiClient.post as any).mockResolvedValue({ success: true, message: 'OK' })
      await createFolder('/new-dir')
      expect(apiClient.post).toHaveBeenCalledWith('/files/write', { path: '/new-dir/.gitkeep', content: '' })
    })
  })

  describe('editFile', () => {
    it('应编辑文件内容', async () => {
      ;(apiClient.post as any).mockResolvedValue({ success: true, message: 'OK' })
      await editFile('/test.ts', 'old', 'new')
      expect(apiClient.post).toHaveBeenCalledWith('/files/edit', { path: '/test.ts', oldString: 'old', newString: 'new' })
    })
  })

  describe('deleteFile', () => {
    it('应删除文件', async () => {
      ;(apiClient.delete as any).mockResolvedValue({ success: true, message: 'OK' })
      await deleteFile('/test.ts')
      expect(apiClient.delete).toHaveBeenCalledWith('/files', { data: { path: '/test.ts' } })
    })
  })

  describe('searchFiles', () => {
    it('应搜索文件', async () => {
      ;(apiClient.get as any).mockResolvedValue([{ path: '/a.ts', name: 'a.ts', isDirectory: false }])
      const result = await searchFiles('*.ts')
      expect(apiClient.get).toHaveBeenCalledWith('/files/search', { params: { pattern: '*.ts', path: undefined } })
      expect(result).toHaveLength(1)
    })
  })

  describe('searchContent', () => {
    it('应搜索文件内容', async () => {
      ;(apiClient.get as any).mockResolvedValue([{ path: '/a.ts', line: 1, content: 'hello', match: 'hello' }])
      await searchContent('hello')
      expect(apiClient.get).toHaveBeenCalledWith('/files/search-content', { params: { pattern: 'hello', path: undefined } })
    })
  })
})
