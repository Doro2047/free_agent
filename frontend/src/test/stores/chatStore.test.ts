import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useChatStore } from '@/stores/chatStore'

vi.mock('@/api/chat', () => ({
  sendMessage: vi.fn(),
  streamMessage: vi.fn(),
  getSessionMessages: vi.fn(),
  listSessions: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      sessions: [],
      isStreaming: false,
      currentSessionId: null,
      currentStreamingMessageId: null,
      error: null,
      abortController: null,
    })
  })

  describe('初始状态', () => {
    it('应有正确的默认值', () => {
      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.sessions).toEqual([])
      expect(state.isStreaming).toBe(false)
      expect(state.currentSessionId).toBeNull()
      expect(state.error).toBeNull()
    })
  })

  describe('addMessage', () => {
    it('应添加消息到列表', () => {
      const msg = { id: '1', role: 'user' as const, content: 'Hello', timestamp: Date.now() }
      useChatStore.getState().addMessage(msg)
      expect(useChatStore.getState().messages).toHaveLength(1)
      expect(useChatStore.getState().messages[0].content).toBe('Hello')
    })
  })

  describe('appendToken', () => {
    it('应追加 token 到流式消息', () => {
      const msgId = 'stream-1'
      useChatStore.setState({
        messages: [{ id: msgId, role: 'assistant', content: 'Hello', timestamp: Date.now(), isStreaming: true }],
        currentStreamingMessageId: msgId,
      })
      useChatStore.getState().appendToken(' World')
      expect(useChatStore.getState().messages[0].content).toBe('Hello World')
    })

    it('应在无流式消息 ID 时不操作', () => {
      useChatStore.setState({ currentStreamingMessageId: null, messages: [] })
      useChatStore.getState().appendToken('test')
      expect(useChatStore.getState().messages).toEqual([])
    })
  })

  describe('clearMessages', () => {
    it('应清空所有消息和状态', () => {
      useChatStore.setState({
        messages: [{ id: '1', role: 'user', content: 'Hi', timestamp: Date.now() }],
        isStreaming: true,
        error: 'some error',
      })
      useChatStore.getState().clearMessages()
      const state = useChatStore.getState()
      expect(state.messages).toEqual([])
      expect(state.isStreaming).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('setMessages', () => {
    it('应设置消息列表', () => {
      const msgs = [
        { id: '1', role: 'user' as const, content: 'Hi', timestamp: Date.now() },
        { id: '2', role: 'assistant' as const, content: 'Hello', timestamp: Date.now() },
      ]
      useChatStore.getState().setMessages(msgs)
      expect(useChatStore.getState().messages).toHaveLength(2)
    })
  })

  describe('updateToolCalls', () => {
    it('应更新消息的工具调用', () => {
      useChatStore.setState({
        messages: [{ id: '1', role: 'assistant', content: 'test', timestamp: Date.now() }],
      })
      const toolCalls = [{ id: 'tc1', name: 'search', input: { q: 'test' } }]
      useChatStore.getState().updateToolCalls('1', toolCalls as any)
      expect(useChatStore.getState().messages[0].toolCalls).toEqual(toolCalls)
    })

    it('应在消息不存在时不操作', () => {
      useChatStore.setState({ messages: [] })
      useChatStore.getState().updateToolCalls('nonexistent', [])
      expect(useChatStore.getState().messages).toEqual([])
    })
  })

  describe('stopStreaming', () => {
    it('应中止流式请求', () => {
      const controller = new AbortController()
      useChatStore.setState({
        abortController: controller,
        isStreaming: true,
        currentStreamingMessageId: 'stream-1',
        messages: [{ id: 'stream-1', role: 'assistant', content: 'test', timestamp: Date.now(), isStreaming: true }],
      })
      useChatStore.getState().stopStreaming()
      const state = useChatStore.getState()
      expect(state.abortController).toBeNull()
      expect(state.isStreaming).toBe(false)
      expect(state.currentStreamingMessageId).toBeNull()
    })
  })

  describe('setError', () => {
    it('应设置错误信息', () => {
      useChatStore.getState().setError('Test error')
      expect(useChatStore.getState().error).toBe('Test error')
    })

    it('应支持清除错误', () => {
      useChatStore.getState().setError('Test error')
      useChatStore.getState().setError(null)
      expect(useChatStore.getState().error).toBeNull()
    })
  })

  describe('setIsStreaming', () => {
    it('应设置流式状态', () => {
      useChatStore.getState().setIsStreaming(true)
      expect(useChatStore.getState().isStreaming).toBe(true)
    })
  })

  describe('setCurrentSessionId', () => {
    it('应设置当前会话 ID', () => {
      useChatStore.getState().setCurrentSessionId('session-1')
      expect(useChatStore.getState().currentSessionId).toBe('session-1')
    })
  })
})
