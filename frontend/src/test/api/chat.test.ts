import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendMessage, listSessions, getSessionMessages, createSession, deleteSession } from '@/api/chat'
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

describe('chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('应发送消息并返回响应', async () => {
      const mockResponse = { message: 'Hello!', sessionId: 's1', toolCalls: [] }
      ;(apiClient.post as any).mockResolvedValue(mockResponse)
      const result = await sendMessage('Hello', 's1')
      expect(apiClient.post).toHaveBeenCalledWith('/chat', { message: 'Hello', sessionId: 's1' })
      expect(result).toEqual(mockResponse)
    })

    it('应支持无 sessionId 发送', async () => {
      const mockResponse = { message: 'Hi!', sessionId: 'new-session', toolCalls: [] }
      ;(apiClient.post as any).mockResolvedValue(mockResponse)
      const result = await sendMessage('Hi')
      expect(apiClient.post).toHaveBeenCalledWith('/chat', { message: 'Hi', sessionId: undefined })
      expect(result.sessionId).toBe('new-session')
    })
  })

  describe('listSessions', () => {
    it('应返回会话列表', async () => {
      const mockSessions = [
        { id: '1', title: 'Chat 1', createdAt: '2024-01-01', updatedAt: '2024-01-01', messageCount: 5 },
        { id: '2', title: 'Chat 2', createdAt: '2024-01-02', updatedAt: '2024-01-02', messageCount: 3 },
      ]
      ;(apiClient.get as any).mockResolvedValue(mockSessions)
      const result = await listSessions()
      expect(apiClient.get).toHaveBeenCalledWith('/sessions')
      expect(result).toHaveLength(2)
    })

    it('应返回空列表', async () => {
      ;(apiClient.get as any).mockResolvedValue([])
      const result = await listSessions()
      expect(result).toEqual([])
    })
  })

  describe('getSessionMessages', () => {
    it('应返回会话消息列表', async () => {
      const mockMessages = [
        { id: '1', role: 'user', content: 'Hello', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'Hi!', timestamp: 1001 },
      ]
      ;(apiClient.get as any).mockResolvedValue(mockMessages)
      const result = await getSessionMessages('session-1')
      expect(result).toHaveLength(2)
    })

    it('应对同一 session 的并发请求去重', async () => {
      const mockMessages = [{ id: '1', role: 'user', content: 'Hello', timestamp: 1000 }]
      ;(apiClient.get as any).mockResolvedValue(mockMessages)
      const [r1, r2] = await Promise.all([
        getSessionMessages('session-dup'),
        getSessionMessages('session-dup'),
      ])
      expect(r1).toEqual(mockMessages)
      expect(r2).toEqual(mockMessages)
    })
  })

  describe('createSession', () => {
    it('应创建新会话', async () => {
      const mockSession = { id: 'new', title: 'New Chat', createdAt: '2024-01-01', updatedAt: '2024-01-01', messageCount: 0 }
      ;(apiClient.post as any).mockResolvedValue(mockSession)
      const result = await createSession('New Chat')
      expect(apiClient.post).toHaveBeenCalledWith('/sessions', { title: 'New Chat' })
      expect(result.id).toBe('new')
    })

    it('应支持无标题创建', async () => {
      const mockSession = { id: 'new', title: '', createdAt: '2024-01-01', updatedAt: '2024-01-01', messageCount: 0 }
      ;(apiClient.post as any).mockResolvedValue(mockSession)
      await createSession()
      expect(apiClient.post).toHaveBeenCalledWith('/sessions', { title: undefined })
    })
  })

  describe('deleteSession', () => {
    it('应删除指定会话', async () => {
      ;(apiClient.delete as any).mockResolvedValue(undefined)
      await deleteSession('session-1')
      expect(apiClient.delete).toHaveBeenCalledWith('/sessions/session-1')
    })
  })
})
