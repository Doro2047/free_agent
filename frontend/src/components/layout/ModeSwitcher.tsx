import { useState } from 'react'
import { useConfigStore } from '@/stores/configStore'
import { MessageCircle, Code } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { AgentMode } from '@/types'

export function ModeSwitcher() {
  const agentMode = useConfigStore((s) => s.agentMode)
  const setAgentMode = useConfigStore((s) => s.setAgentMode)
  const [isSwitching, setIsSwitching] = useState(false)

  const handleToggle = async () => {
    if (isSwitching) return
    setIsSwitching(true)
    const nextMode: AgentMode = agentMode === 'chat' ? 'code' : 'chat'
    await setAgentMode(nextMode)
    setTimeout(() => setIsSwitching(false), 1500)
  }

  const isChat = agentMode === 'chat'

  return (
    <button
      onClick={handleToggle}
      disabled={isSwitching}
      className={cn(
        'group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200',
        'hover:bg-accent/50 active:scale-[0.97]',
        isChat
          ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
        isSwitching && 'opacity-60 cursor-wait',
      )}
      title={isChat ? '切换到 Code 模式' : '切换到 Chat 模式'}
    >
      {isChat ? (
        <MessageCircle className="h-4 w-4" />
      ) : (
        <Code className="h-4 w-4" />
      )}
      <span className="select-none">{isChat ? 'Chat' : 'Code'}</span>
      {isSwitching && (
        <span className="ml-1 animate-pulse text-[10px] opacity-60">
          切换中...
        </span>
      )}
    </button>
  )
}
