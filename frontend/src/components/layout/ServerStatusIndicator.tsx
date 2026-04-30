import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Play,
  Square,
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'

export function ServerStatusIndicator() {
  const [status, setStatus] = useState<'starting' | 'running' | 'stopped' | 'error'>('starting')
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) {
      setStatus('stopped')
      return
    }

    const serverApi = window.electronAPI?.server;
    if (!serverApi) {
      setStatus('stopped')
      return
    }

    serverApi.status().then((s) => {
      setStatus(s.running ? 'running' : 'stopped')
    })
  }, [])

  useEffect(() => {
    if (showLogs) {
      // TODO: 日志滚动功能
    }
  }, [showLogs])

  const handleRestart = async () => {
    const serverApi = window.electronAPI?.server;
    if (!serverApi) return
    setStatus('starting')
    try {
      // 先停止，再启动
      await serverApi.stop();
      await serverApi.start();
    } catch {
      setStatus('error')
    }
  }

  const handleStart = async () => {
    if (!window.electronAPI?.server?.start) return
    setStatus('starting')
    try {
      await window.electronAPI.server.start()
    } catch {
      setStatus('error')
    }
  }

  const handleStop = async () => {
    if (!window.electronAPI?.server?.stop) return
    try {
      await window.electronAPI.server.stop()
      setStatus('stopped')
    } catch {
      setStatus('error')
    }
  }

  const statusConfig = {
    starting: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Loader2, label: '启动中', spin: true },
    running: { color: 'text-green-500', bg: 'bg-green-500/10', icon: Wifi, label: '运行中', spin: false },
    stopped: { color: 'text-muted-foreground/50', bg: 'bg-muted/20', icon: WifiOff, label: '已停止', spin: false },
    error: { color: 'text-red-500', bg: 'bg-red-500/10', icon: WifiOff, label: '错误', spin: false },
  }

  const config = statusConfig[status]

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowLogs(!showLogs)}
        className={cn(
          'h-7 gap-1.5 rounded-md text-xs transition-all duration-150 active:scale-95',
          status === 'running' ? 'text-green-600/80 hover:text-green-600' :
          status === 'error' ? 'text-red-500/80 hover:text-red-500' :
          'text-muted-foreground/60 hover:text-foreground/70',
        )}
      >
        <span className="relative flex h-2 w-2">
          {status === 'running' && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.bg, status === 'starting' && 'animate-pulse-soft')} />
        </span>
        <span className="font-medium">{config.label}</span>
        {showLogs ? (
          <ChevronUp className="h-3 w-3 opacity-50" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-50" />
        )}
      </Button>

      {showLogs && (
        <div className="absolute right-0 top-full mt-1.5 w-80 rounded-lg border border-border/40 bg-popover shadow-xl z-popover animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/30 px-3 py-2 bg-gradient-surface">
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-xs font-semibold">服务器日志</span>
            </div>
            <div className="flex items-center gap-1">
              {status === 'running' ? (
                <button
                  onClick={handleStop}
                  className="rounded p-1 text-muted-foreground/40 hover:text-destructive/60 hover:bg-destructive/10 transition-all duration-150 active:scale-90"
                  title="停止服务器"
                >
                  <Square className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={status === 'stopped' ? handleStart : handleRestart}
                  className="rounded p-1 text-muted-foreground/40 hover:text-green-500/60 hover:bg-green-500/10 transition-all duration-150 active:scale-90"
                  title={status === 'stopped' ? '启动服务器' : '重启服务器'}
                >
                  <Play className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => setShowLogs(false)}
                className="rounded p-1 text-muted-foreground/40 hover:text-foreground/60 hover:bg-accent/30 transition-all duration-150 active:scale-90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed bg-background/50">
            <div className="py-4 text-center text-muted-foreground/40">日志功能暂不可用</div>
          </div>
        </div>
      )}
    </div>
  )
}
