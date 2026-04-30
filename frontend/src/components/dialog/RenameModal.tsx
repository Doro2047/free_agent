import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'
import { X, Pencil } from 'lucide-react'

interface RenameModalProps {
  isOpen: boolean
  oldName: string
  isDirectory: boolean
  onSubmit: (newName: string) => void
  onClose: () => void
}

export function RenameModal({ isOpen, oldName, isDirectory, onSubmit, onClose }: RenameModalProps) {
  const [newName, setNewName] = useState(oldName)
  const [error, setError] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNewName(oldName)
      setError('')
      // 触发动画
      requestAnimationFrame(() => setIsVisible(true))
      // 自动聚焦并选中文件名（不含扩展名）
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          // 选中不带扩展名的部分
          const dotIndex = oldName.lastIndexOf('.')
          const endPos = dotIndex > 0 ? dotIndex : oldName.length
          inputRef.current.setSelectionRange(0, endPos)
        }
      }, 100)
    } else {
      setIsVisible(false)
    }
  }, [isOpen, oldName])

  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc as unknown as EventListener)
    return () => document.removeEventListener('keydown', handleEsc as unknown as EventListener)
  }, [isOpen, onClose])

  const handleSubmit = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      setError('名称不能为空')
      return
    }
    if (trimmed === oldName) {
      onClose()
      return
    }
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      setError('名称不能包含路径分隔符')
      return
    }
    if (/^[<>:"|?*]/.test(trimmed)) {
      setError('名称不能包含特殊字符: < > : " | ? *')
      return
    }

    onSubmit(trimmed)
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      'fixed inset-0 z-[9998] flex items-center justify-center transition-all duration-200',
      isVisible ? 'opacity-100' : 'opacity-0',
    )}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* 对话框 */}
      <div className={cn(
        'relative w-full max-w-sm rounded-xl border border-border/50 bg-popover shadow-xl overflow-hidden',
        'transition-all duration-200',
        isVisible ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4',
      )}>
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 bg-gradient-surface">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/50">
              <Pencil className="h-4 w-4 text-muted-foreground/70" strokeWidth={2} />
            </div>
            重命名
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground/60 transition-all duration-150 hover:bg-accent hover:text-accent-foreground active:scale-95"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground/80">
              {isDirectory ? '文件夹名称' : '文件名称'}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value)
                setError('')
              }}
              onKeyDown={handleKeyDown}
              className={cn(
                'w-full h-10 px-3 text-sm border rounded-lg bg-background transition-all duration-200 outline-none',
                'focus:ring-2 focus:ring-offset-1 focus:ring-offset-background',
                error
                  ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
                  : 'border-border/60 focus:ring-primary/30 focus:border-primary/50',
              )}
              autoFocus
            />
            {error && (
              <p className="mt-1.5 text-xs text-destructive/90 flex items-center gap-1 animate-fade-in">
                <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="font-medium">当前:</span>
            <span className="truncate font-mono text-[11px] bg-muted/40 px-2 py-0.5 rounded">{oldName}</span>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 px-5 py-3.5 bg-gradient-surface">
          <button
            className="h-9 px-4 text-sm rounded-lg border border-border/60 bg-background transition-all duration-200 hover:bg-accent hover:scale-[1.02] active:scale-[0.98] font-medium"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className={cn(
              'h-9 px-4 text-sm rounded-lg text-primary-foreground transition-all duration-200 font-medium',
              newName.trim() && newName.trim() !== oldName
                ? 'bg-gradient-primary shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
            onClick={handleSubmit}
            disabled={!newName.trim() || newName.trim() === oldName}
          >
            重命名
          </button>
        </div>
      </div>
    </div>
  )
}
