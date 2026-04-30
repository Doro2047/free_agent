import { apiClient } from './client'
import type { Message, ToolCall } from '@/types'

export interface SendMessageRequest {
  message: string
  sessionId?: string
}

export interface StreamMessageRequest {
  message: string
  sessionId?: string
}

export interface SessionInfo {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface ChatResponse {
  message: string
  sessionId: string
  toolCalls?: ToolCall[]
}

/**
 * 发送非流式消息
 */
export async function sendMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  return apiClient.post<ChatResponse>('/chat', { message, sessionId })
}

/**
 * SSE 流式消息
 * 使用 Fetch API 处理 Server-Sent Events
 * 返回 AbortController 用于中止请求
 */
export function streamMessage(
  message: string,
  sessionId: string | undefined,
  callbacks: {
    onToken: (token: string) => void
    onToolCall?: (toolCall: ToolCall) => void
    onComplete: (sessionId: string) => void
    onError?: (error: Error) => void
  },
): AbortController {
  const controller = new AbortController()
  const baseURL = apiClient.instance.defaults.baseURL || 'http://localhost:3000/api'

  ;(async () => {
    try {
      const response = await fetch(`${baseURL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Stream request failed: ${response.status} ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Response body is not readable')

      const decoder = new TextDecoder()
      let buffer = ''
      let currentSessionId = sessionId || ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine || trimmedLine.startsWith(':')) continue

          if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.slice(5).trim()
            if (data === '[DONE]') {
              callbacks.onComplete(currentSessionId)
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.token !== undefined) callbacks.onToken(parsed.token)
              if (parsed.toolCall) callbacks.onToolCall?.(parsed.toolCall)
              if (parsed.sessionId) currentSessionId = parsed.sessionId
              if (parsed.done) {
                callbacks.onComplete(currentSessionId)
                return
              }
            } catch {
              if (data) callbacks.onToken(data)
            }
          }
        }
      }

      // 处理缓冲区剩余数据
      if (buffer.trim()) {
        const trimmedLine = buffer.trim()
        if (trimmedLine.startsWith('data:')) {
          const data = trimmedLine.slice(5).trim()
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              if (parsed.token !== undefined) callbacks.onToken(parsed.token)
            } catch {
              callbacks.onToken(data)
            }
          }
        }
      }

      callbacks.onComplete(currentSessionId)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  })()

  return controller
}

/**
 * 获取会话列表
 */
export async function listSessions(): Promise<SessionInfo[]> {
  return apiClient.get<SessionInfo[]>('/sessions')
}

/**
 * 获取会话历史消息
 */
const pendingRequests = new Map<string, Promise<any>>()

function deduplicatedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key)
  if (existing) return existing as Promise<T>
  const promise = fetcher().finally(() => pendingRequests.delete(key))
  pendingRequests.set(key, promise)
  return promise
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  return deduplicatedFetch(`session-messages-${sessionId}`, () =>
    apiClient.get<Message[]>(`/sessions/${sessionId}/messages`)
  )
}

/**
 * 创建新会话
 */
export async function createSession(title?: string): Promise<SessionInfo> {
  return apiClient.post<SessionInfo>('/sessions', { title })
}

/**
 * 删除会话
 */
export async function deleteSession(sessionId: string): Promise<void> {
  return apiClient.delete<void>(`/sessions/${sessionId}`)
}
