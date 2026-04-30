import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StreamingIndicatorProps {
  className?: string
  text?: string
}

// 跳动圆点动画组件
function BouncingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary/60"
          style={{
            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
          }}
        />
      ))}
    </span>
  )
}

// 打字光标动画
function TypingCursor() {
  return (
    <span
      className="inline-block h-4 w-0.5 bg-primary/70"
      style={{
        animation: 'blink 1s step-end infinite',
        marginLeft: '2px',
      }}
    />
  )
}

export function StreamingIndicator({
  className,
  text = '正在思考...',
}: StreamingIndicatorProps) {
  return (
    <div
      className={cn(
        'flex gap-2.5 px-4',
        className,
      )}
    >
      {/* AI 头像 - 增强版 */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" strokeWidth={2.5} />
      </div>

      {/* 思考指示器 - 增强版 */}
      <div className="flex items-center gap-2 rounded-xl bg-muted/30 border border-border/30 px-4 py-2.5 text-sm text-muted-foreground/80 shadow-sm animate-fade-in">
        <BouncingDots />
        <span className="font-medium">{text}</span>
        <TypingCursor />
      </div>
    </div>
  )
}

// 导出空状态指示器 - 紧凑版
export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-4">
      <div className="flex flex-col items-center gap-2 animate-fade-in">
        {/* 图标 */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
          <Sparkles className="h-5 w-5 text-primary/60" strokeWidth={1.8} />
        </div>

        {/* 文字 */}
        <div className="animate-fade-in-up animation-delay-100">
          <h3 className="text-sm font-semibold text-foreground/90 mb-0.5">开始对话</h3>
          <p className="text-xs text-muted-foreground/60 max-w-[240px] leading-relaxed">
            发送一条消息开始与 AI 助手对话
          </p>
        </div>

        {/* 快捷提示 */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-1 animate-fade-in-up animation-delay-200">
          {['解释代码', '生成函数', '优化算法'].map((tip) => (
            <span
              key={tip}
              className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground/60 border border-border/30"
            >
              <Sparkles className="h-2.5 w-2.5 text-primary/40" />
              {tip}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// 添加必要的 CSS 动画
const style = document.createElement('style')
style.textContent = `
  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.4;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes blink {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
`

if (!document.head.querySelector('#chat-animations')) {
  style.id = 'chat-animations'
  document.head.appendChild(style)
}
