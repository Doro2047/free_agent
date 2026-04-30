import { describe, it, expect } from 'vitest'
import type { ChatMessage, Message, ToolCall, ModelConfig, Task, FileNode, DownloadProgress } from '@/types'

describe('类型定义完整性', () => {
  describe('ChatMessage / Message', () => {
    it('Message 应是 ChatMessage 的别名', () => {
      const msg: Message = { id: '1', role: 'user', content: 'hi', timestamp: Date.now() }
      const chatMsg: ChatMessage = msg
      expect(chatMsg.id).toBe('1')
    })

    it('应支持所有 role 类型', () => {
      const userMsg: Message = { id: '1', role: 'user', content: 'hi', timestamp: Date.now() }
      const assistantMsg: Message = { id: '2', role: 'assistant', content: 'hello', timestamp: Date.now() }
      const systemMsg: Message = { id: '3', role: 'system', content: 'system prompt', timestamp: Date.now() }
      expect(userMsg.role).toBe('user')
      expect(assistantMsg.role).toBe('assistant')
      expect(systemMsg.role).toBe('system')
    })

    it('应支持可选字段', () => {
      const msg: Message = {
        id: '1',
        role: 'assistant',
        content: 'test',
        timestamp: Date.now(),
        isStreaming: true,
        toolCalls: [{ id: 'tc1', name: 'search', input: { q: 'test' } }],
      }
      expect(msg.isStreaming).toBe(true)
      expect(msg.toolCalls).toHaveLength(1)
    })
  })

  describe('ToolCall', () => {
    it('应支持完整字段', () => {
      const tc: ToolCall = {
        id: 'tc1',
        name: 'search',
        input: { query: 'test' },
        result: 'found',
        isExecuting: true,
      }
      expect(tc.id).toBe('tc1')
      expect(tc.isExecuting).toBe(true)
    })

    it('应支持仅必填字段', () => {
      const tc: ToolCall = { id: 'tc1', name: 'search', input: {} }
      expect(tc.result).toBeUndefined()
      expect(tc.isExecuting).toBeUndefined()
    })
  })

  describe('ModelConfig', () => {
    it('应支持所有 provider', () => {
      const providers: ModelConfig['provider'][] = ['deepseek', 'qwen', 'siliconflow', 'local']
      expect(providers).toHaveLength(4)
    })
  })

  describe('Task', () => {
    it('应支持所有 status', () => {
      const statuses: Task['status'][] = ['pending', 'running', 'completed', 'failed', 'cancelled']
      expect(statuses).toHaveLength(5)
    })
  })

  describe('FileNode', () => {
    it('应支持完整字段', () => {
      const node: FileNode = {
        name: 'test.ts',
        path: '/test.ts',
        type: 'file',
        isDirectory: false,
        size: 100,
        modifiedAt: '2024-01-01',
      }
      expect(node.isDirectory).toBe(false)
    })
  })

  describe('DownloadProgress', () => {
    it('应支持所有 status', () => {
      const statuses: DownloadProgress['status'][] = ['downloading', 'paused', 'completed', 'error']
      expect(statuses).toHaveLength(4)
    })
  })
})
