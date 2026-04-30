import { useState, useEffect } from 'react'
import { useTaskStore } from '@/stores/taskStore'
import { useAppStore } from '@/stores/appStore'
import { Button } from '@/components/ui/Button'
import {
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  CheckCircle2,
  CircleDashed,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'

export function TaskPanel() {
  const { tasks, activeTaskId, loading, loadTasks, createTask, deleteTask, setActiveTask } = useTaskStore()
  const { setActiveTask: setAppActiveTask } = useAppStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    loadTasks()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectTask = (id: string) => {
    setActiveTask(id)
    setAppActiveTask(id)
  }

  const handleCreate = async () => {
    const title = newTitle.trim()
    if (!title) {
      toast.error('请输入任务名称')
      return
    }
    await createTask(title)
    setNewTitle('')
    setShowCreateDialog(false)
    toast.success('任务已创建')
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除任务 "${title}" 吗？`)) return
    await deleteTask(id)
    toast.info(`任务 "${title}" 已删除`)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/50 p-2.5 shrink-0 bg-gradient-surface">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
            <Sparkles className="h-3 w-3 text-primary/70" strokeWidth={2.5} />
          </div>
          <h2 className="text-xs font-semibold tracking-tight">任务</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          disabled={loading}
          className="h-6 w-6 rounded active:scale-95 transition-transform duration-150"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mb-2 text-primary/40" />
            <span className="text-xs font-medium">加载中...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground animate-fade-in">
            <div className="rounded-lg bg-muted/25 p-3 mb-2.5">
              <MessageSquare className="h-5 w-5 opacity-30" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-medium mb-0.5 text-foreground/60">暂无任务</span>
            <span className="text-[11px] text-muted-foreground/50 mb-2.5 text-center px-3">创建第一个任务开始对话</span>
            <Button
              variant="outline"
              size="xs"
              className="active:scale-95 transition-transform duration-150"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="h-3 w-3" />
              新建
            </Button>
          </div>
        ) : (
          tasks.map((task, index) => (
            <div
              key={task.id}
              className={`group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all duration-150 cursor-pointer hover:bg-accent/40 animate-fade-in-up ${
                task.id === activeTaskId
                  ? 'bg-primary/8 border border-primary/15'
                  : ''
              }`}
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
              onClick={() => handleSelectTask(task.id)}
            >
              <div className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                task.status === 'running' ? 'bg-green-500/10' :
                task.status === 'completed' ? 'bg-blue-500/10' : 'bg-muted/25',
              )}>
                {task.status === 'running' ? (
                  <CircleDashed className="h-2.5 w-2.5 text-green-500 animate-pulse-soft" />
                ) : task.status === 'completed' ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-blue-500" />
                ) : (
                  <CircleDashed className="h-2.5 w-2.5 text-muted-foreground/40" />
                )}
              </div>

              <span className="flex-1 truncate font-medium text-[13px]">{task.name}</span>

              {task.progress > 0 && (
                <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded-full font-medium">
                  {task.progress}
                </span>
              )}

              <Button
                variant="ghost"
                size="xs"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all duration-150 shrink-0 hover:bg-destructive/10 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(task.id, task.name)
                }}
              >
                <Trash2 className="h-2.5 w-2.5 text-destructive/50" />
              </Button>
            </div>
          ))
        )}
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-modal flex items-center justify-center modal-overlay">
          <div className="absolute inset-0" onClick={() => { setShowCreateDialog(false); setNewTitle('') }} />
          <div className="relative w-72 bg-popover border border-border/40 rounded-lg shadow-xl p-4 modal-content">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
                  <Plus className="h-3 w-3 text-primary" strokeWidth={2.5} />
                </div>
                新建任务
              </h3>
              <button
                className="rounded p-1 text-muted-foreground/50 transition-all hover:bg-accent active:scale-95"
                onClick={() => { setShowCreateDialog(false); setNewTitle('') }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setShowCreateDialog(false); setNewTitle('') }
              }}
              placeholder="输入任务名称..."
              className="w-full h-9 px-3 text-sm border border-border/50 rounded-md bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:ring-offset-1 focus:ring-offset-background transition-all duration-150 mb-3 outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowCreateDialog(false); setNewTitle('') }}
                className="active:scale-95 transition-transform duration-150"
              >
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreate}
                disabled={loading || !newTitle.trim()}
                className="active:scale-95 transition-transform duration-150"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '创建'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
