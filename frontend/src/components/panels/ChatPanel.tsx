import { useRef, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { StreamingIndicator } from '@/components/chat/StreamingIndicator'
import { cn } from '@/utils/cn'

const SUGGESTIONS = ['解释代码', '生成函数', '优化算法']

export function ChatPanel() {
  const {
    messages,
    isStreaming,
    sendStreamMessage,
    stopStreaming,
  } = useChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [messages.length])

  const handleSend = (content: string) => {
    sendStreamMessage(content)
  }

  const handleStop = () => {
    stopStreaming()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 聊天内容区域 */}
      <div
        className={cn(
          'flex-1 overflow-y-auto min-h-0',
          messages.length === 0 && 'flex items-center justify-center',
        )}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4">
            {/* 欢迎区域 */}
            <div className="flex flex-col items-center gap-2 text-center">
              {/* 图标 */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                <Sparkles className="h-7 w-7 text-primary/60" />
              </div>
              {/* 标题和描述 */}
              <div>
                <h3 className="text-lg font-semibold text-foreground/90">开始对话</h3>
                <p className="text-sm text-muted-foreground/60 mt-1.5">
                  发送一条消息开始与 AI 助手对话
                </p>
              </div>
            </div>
            {/* 快捷提示 */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((tip) => (
                <button
                  key={tip}
                  onClick={() => handleSend(tip)}
                  className="inline-flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground/70 border border-border/40 hover:border-primary/40 hover:text-foreground/80 hover:bg-muted/70 transition-all"
                >
                  <Sparkles className="h-4 w-4 text-primary/50" />
                  {tip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-3 space-y-3">
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} />
            ))}

            {isStreaming && (
              <StreamingIndicator
                className="justify-start"
                text="正在思考..."
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 消息输入框 */}
      <MessageInput
        onSend={handleSend}
        onStop={handleStop}
        disabled={false}
        isStreaming={isStreaming}
        placeholder={
          isStreaming
            ? 'AI 正在回复中...'
            : '输入消息...'
        }
      />
    </div>
  )
}
