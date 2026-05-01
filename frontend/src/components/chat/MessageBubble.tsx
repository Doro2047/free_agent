import { memo, useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, User, Clock, Loader2, Wrench, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Message, ToolCall } from '@/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface MessageBubbleProps {
  message: Message
  index?: number
}

// 代码块组件 - 增强版
const CodeBlock = memo(function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案：使用传统的复制方法
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div className="group/code relative my-3 rounded-lg overflow-hidden border border-border/40 shadow-md">
      {/* 代码块头部 */}
      <div className="flex items-center justify-between bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground/80 border-b border-border/30">
        <div className="flex items-center gap-2">
          {/* macOS 窗口点 */}
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
          </div>
          <span className="font-mono text-[11px] tracking-wide">{language || 'text'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-all duration-200 hover:bg-muted hover:scale-105 active:scale-95 opacity-60 group-hover/code:opacity-100"
          type="button"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      {/* 代码内容 */}
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'hsl(var(--card))',
          fontSize: '0.8125rem',
          lineHeight: '1.5',
        }}
        codeTagProps={{
          style: { fontFamily: 'var(--font-mono)' },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
})

// 工具调用展示组件
const ToolCallDisplay = memo(function ToolCallDisplay({ toolCalls }: { toolCalls?: ToolCall[] }) {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <div className="my-2 space-y-1.5">
      {toolCalls.map((tc) => (
        <div
          key={tc.id}
          className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs animate-fade-in"
        >
          <div className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            tc.isExecuting ? 'bg-primary/10' : 'bg-muted/40',
          )}>
            <Wrench
              className={cn(
                'h-3 w-3',
                tc.isExecuting ? 'animate-spin text-primary' : 'text-muted-foreground/70',
              )}
            />
          </div>
          <span className="font-mono font-medium text-foreground/80">{tc.name}</span>
          {tc.isExecuting ? (
            <span className="text-muted-foreground animate-pulse-soft ml-auto">执行中...</span>
          ) : tc.result ? (
            <span className="text-green-500/80 ml-auto text-[11px] font-medium">已完成</span>
          ) : null}
        </div>
      ))}
    </div>
  )
})

// Markdown 渲染器配置
const markdownComponents = {
  // 代码块渲染
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
    const match = /language-(\w+)/.exec(className || '')
    const isInline = !match && !String(children).includes('\n')

    if (isInline) {
      return (
        <code className={cn('bg-muted/70 px-1.5 py-0.5 rounded-md text-[13px] font-mono font-medium tracking-tight')} {...props}>
          {children}
        </code>
      )
    }

    const language = match ? match[1] : ''
    const code = String(children).replace(/\n$/, '')

    return <CodeBlock language={language} code={code} />
  },
  // 链接渲染
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline decoration-primary/30 hover:decoration-primary underline-offset-2 transition-colors duration-200"
      {...props}
    >
      {children}
    </a>
  ),
  // 表格渲染
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/40 shadow-sm">
      <table className="w-full border-collapse text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border-b border-border/50 bg-muted/40 px-3 py-2.5 text-left font-semibold text-foreground/90" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-b border-border/30 px-3 py-2 text-foreground/80" {...props}>
      {children}
    </td>
  ),
  // 列表渲染
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="ml-6 list-disc space-y-1 marker:text-muted-foreground/50" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="ml-6 list-decimal space-y-1 marker:text-muted-foreground/50" {...props}>
      {children}
    </ol>
  ),
  // 块引用渲染
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-[3px] border-primary/30 pl-4 py-2.5 text-muted-foreground my-3 bg-muted/15 rounded-r-lg"
      {...props}
    >
      {children}
    </blockquote>
  ),
  // 标题渲染
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-xl font-bold mt-5 mb-2.5 tracking-tight text-foreground/95" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-lg font-semibold mt-4 mb-2 tracking-tight text-foreground/90" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-base font-semibold mt-3 mb-1.5 tracking-tight text-foreground/85" {...props}>
      {children}
    </h3>
  ),
}

export const MessageBubble = memo(function MessageBubble({ message, index = 0 }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  // 格式化时间戳
  const formattedTime = useMemo(() => {
    try {
      return format(new Date(message.timestamp), 'HH:mm', { locale: zhCN })
    } catch {
      return ''
    }
  }, [message.timestamp])

  // 复制消息内容
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = message.content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [message.content])

  // 计算动画延迟
  const animationDelay = Math.min(index * 50, 300)

  // 工具消息 - 检查是否包含工具调用结果
  const isToolMessage = message.toolCalls && message.toolCalls.length > 0 && !isUser && !isAssistant
  
  if (isToolMessage) {
    return (
      <div className="flex justify-start pl-11 pr-4" style={{ animationDelay: `${animationDelay}ms` }}>
        <div className="max-w-[85%] rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5 text-sm text-muted-foreground animate-fade-in shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/40">
              <Wrench className="h-3 w-3" />
            </div>
            <span className="font-mono text-[11px] font-medium text-muted-foreground/80">工具结果</span>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {message.content}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 message-bubble px-4',
        isUser ? 'justify-end' : 'justify-start',
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* AI 头像 - 增强版 */}
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-sm mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      )}

      {/* 消息气泡 */}
      <div className={cn('group relative max-w-[calc(100%-44px)]', isUser ? 'order-1' : '')}>
        <div
          className={cn(
            'rounded-xl px-4 py-2.5 text-[13px] leading-[1.6] shadow-sm transition-shadow duration-200',
            isUser
              ? 'bg-gradient-primary text-primary-foreground'
              : 'bg-card/80 backdrop-blur-sm text-foreground/90 border border-border/40',
          )}
        >
          {/* 工具调用 */}
          {isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
            <ToolCallDisplay toolCalls={message.toolCalls} />
          )}

          {/* 消息内容 */}
          {isUser ? (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-content prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* 流式光标 */}
          {message.isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary rounded-sm" />
          )}
        </div>

        {/* 消息底部信息 */}
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1.5 px-1 text-[11px] text-muted-foreground/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
            isUser ? 'justify-end' : 'justify-start',
          )}
        >
          <Clock className="h-3 w-3" />
          <span>{formattedTime}</span>
          {isAssistant && message.content && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-200 hover:bg-muted/60 hover:scale-105 active:scale-95"
              type="button"
              title="复制消息"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>复制</span>
                </>
              )}
            </button>
          )}
          {message.isStreaming && (
            <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
          )}
        </div>
      </div>

      {/* 用户头像 - 增强版 */}
      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 mt-0.5">
          <User className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
        </div>
      )}
    </div>
  )
})
