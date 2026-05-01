import { create } from 'zustand'
import type { Message, ToolCall } from '@/types'
import { streamMessage as apiStreamMessage, sendMessage, getSessionMessages, listSessions, type SessionInfo } from '@/api/chat'
import { toast } from 'sonner'

interface ChatState {
  // 状态数据
  messages: Message[]
  sessions: SessionInfo[]
  isStreaming: boolean
  currentSessionId: string | null
  currentStreamingMessageId: string | null
  error: string | null
  abortController: AbortController | null

  // 消息操作
  addMessage: (message: Message) => void
  appendToken: (token: string) => void
  clearMessages: () => void
  loadHistory: (sessionId: string) => Promise<void>
  setMessages: (messages: Message[]) => void
  loadSessions: () => Promise<void>

  // 流式控制
  setIsStreaming: (isStreaming: boolean) => void
  setCurrentSessionId: (sessionId: string | null) => void

  // 发送消息
  sendUserMessage: (content: string) => Promise<void>
  sendStreamMessage: (content: string) => Promise<void>
  stopStreaming: () => void

  // 错误处理
  setError: (error: string | null) => void

  // 工具调用更新
  updateToolCalls: (messageId: string, toolCalls: ToolCall[]) => void

  // 消息管理
  deleteMessage: (messageId: string) => void
  resendMessage: (content: string) => void
}

// 生成唯一 ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// 获取当前时间戳
const getTimestamp = (): number => {
  return Date.now()
}

export const useChatStore = create<ChatState>()((set, get) => ({
  // 初始状态
  messages: [],
  sessions: [],
  isStreaming: false,
  currentSessionId: null,
  currentStreamingMessageId: null,
  error: null,
  abortController: null,

  // 添加消息
  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }))
  },

  // 追加 token 到当前流式消息
  appendToken: (token: string) => {
    const { currentStreamingMessageId, messages } = get()
    if (!currentStreamingMessageId) return

    const index = messages.findIndex((msg) => msg.id === currentStreamingMessageId)
    if (index === -1) return

    const updated = [...messages]
    updated[index] = { ...updated[index], content: updated[index].content + token, isStreaming: true }
    set({ messages: updated })
  },

  // 清空消息
  clearMessages: () => {
    set({
      messages: [],
      isStreaming: false,
      currentStreamingMessageId: null,
      error: null,
    })
  },

  // 设置消息列表
  setMessages: (messages: Message[]) => {
    set({ messages })
  },

  // 加载历史记录
  loadHistory: async (sessionId: string) => {
    try {
      set({ isStreaming: false, error: null })
      const history = await getSessionMessages(sessionId)
      set({
        messages: history,
        currentSessionId: sessionId,
        currentStreamingMessageId: null,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载历史记录失败'
      set({ error: errorMessage })
      toast.error('加载历史记录失败')
    }
  },

  // 加载会话列表
  loadSessions: async () => {
    try {
      const sessions = await listSessions()
      set({ sessions })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载会话列表失败'
      toast.error(errorMessage)
    }
  },

  // 设置流式状态
  setIsStreaming: (isStreaming: boolean) => {
    set({ isStreaming })
  },

  // 设置当前会话 ID
  setCurrentSessionId: (sessionId: string | null) => {
    set({ currentSessionId: sessionId })
  },

  // 设置错误
  setError: (error: string | null) => {
    set({ error })
  },

  // 更新工具调用
  updateToolCalls: (messageId: string, toolCalls: ToolCall[]) => {
    const { messages } = get()
    const idx = messages.findIndex((m) => m.id === messageId)
    if (idx === -1) return
    const updated = [...messages]
    updated[idx] = { ...updated[idx], toolCalls }
    set({ messages: updated })
  },

  // 删除消息
  deleteMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }))
  },

  // 重新发送消息（用于撤回功能）
  resendMessage: async (content: string) => {
    if (!content.trim()) return
    const { sendStreamMessage } = get()
    await sendStreamMessage(content)
  },

  // 停止流式生成
  stopStreaming: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      const { messages, currentStreamingMessageId } = get()
      const idx = currentStreamingMessageId ? messages.findIndex((m) => m.id === currentStreamingMessageId) : -1
      const updated = idx !== -1 ? [...messages] : messages
      if (idx !== -1) updated[idx] = { ...updated[idx], isStreaming: false }
      set({
        abortController: null,
        isStreaming: false,
        currentStreamingMessageId: null,
        messages: updated,
      })
      toast.info('已停止生成')
    }
  },

  // 发送用户消息（非流式）
  sendUserMessage: async (content: string) => {
    if (!content.trim()) return

    const { currentSessionId } = get()

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: getTimestamp(),
    }

    set((state) => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      error: null,
    }))

    try {
      const response = await sendMessage(content, currentSessionId || undefined)

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: getTimestamp(),
        toolCalls: response.toolCalls,
      }

      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isStreaming: false,
        currentSessionId: response.sessionId || state.currentSessionId,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送消息失败'
      set({
        isStreaming: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
    }
  },

  // 发送流式消息
  sendStreamMessage: async (content: string) => {
    if (!content.trim()) return

    // 如果正在流式生成，先停止
    const existingController = get().abortController
    if (existingController) {
      existingController.abort()
    }

    const { currentSessionId } = get()

    // 添加用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: getTimestamp(),
    }

    // 创建 AI 消息占位符
    const assistantMessageId = generateId()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: getTimestamp(),
      isStreaming: true,
    }

    // 创建新的 AbortController
    const controller = new AbortController()

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      isStreaming: true,
      currentStreamingMessageId: assistantMessageId,
      error: null,
      abortController: controller,
    }))

    try {
      const abortController = apiStreamMessage(content, currentSessionId || undefined, {
        onToken: (token) => {
          get().appendToken(token)
        },
        onToolCall: (toolCall) => {
          // 更新工具调用信息
          const currentMessages = get().messages
          const streamingMsg = currentMessages.find(m => m.id === assistantMessageId)
          if (streamingMsg) {
            const existingToolCalls = streamingMsg.toolCalls || []
            get().updateToolCalls(assistantMessageId, [...existingToolCalls, toolCall])
          }
        },
        onComplete: (sessionId) => {
          const { messages, currentSessionId } = get()
          const idx = messages.findIndex((m) => m.id === assistantMessageId)
          const updated = idx !== -1 ? [...messages] : messages
          if (idx !== -1) updated[idx] = { ...updated[idx], isStreaming: false }
          set({
            isStreaming: false,
            currentStreamingMessageId: null,
            currentSessionId: sessionId || currentSessionId,
            abortController: null,
            messages: updated,
          })
        },
        onError: (error) => {
          const { messages } = get()
          const idx = messages.findIndex((m) => m.id === assistantMessageId)
          const updated = idx !== -1 ? [...messages] : messages
          if (idx !== -1) updated[idx] = { ...updated[idx], isStreaming: false }
          set({
            isStreaming: false,
            currentStreamingMessageId: null,
            error: error.message,
            abortController: null,
            messages: updated,
          })
          toast.error(`流式请求失败: ${error.message}`)
        },
      })

      // 如果 controller 已经被 abort，也需要清理
      abortController.signal.addEventListener('abort', () => {
        const { messages } = get()
        const idx = messages.findIndex((m) => m.id === assistantMessageId)
        const updated = idx !== -1 ? [...messages] : messages
        if (idx !== -1) updated[idx] = { ...updated[idx], isStreaming: false }
        set({
          isStreaming: false,
          currentStreamingMessageId: null,
          abortController: null,
          messages: updated,
        })
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送消息失败'
      const { messages } = get()
      const idx = messages.findIndex((m) => m.id === assistantMessageId)
      const updated = idx !== -1 ? [...messages] : messages
      if (idx !== -1) updated[idx] = { ...updated[idx], isStreaming: false }
      set({
        isStreaming: false,
        currentStreamingMessageId: null,
        error: errorMessage,
        abortController: null,
        messages: updated,
      })
      toast.error(errorMessage)
    }
  },
}))
