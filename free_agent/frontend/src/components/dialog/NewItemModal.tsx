import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { X, FolderPlus, FilePlus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface NewItemModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, type: 'file' | 'directory') => void
  parentPath?: string
  defaultType?: 'file' | 'directory'
}

export function NewItemModal({
  isOpen,
  onClose,
  onConfirm,
  parentPath: _parentPath = '/',
  defaultType = 'file',
}: NewItemModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'file' | 'directory'>(defaultType)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName('')
      setType(defaultType)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, defaultType])

  if (!isOpen) return null

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed, type)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center modal-overlay">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-80 bg-popover border border-border/40 rounded-lg shadow-xl p-5 modal-content">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
              {type === 'directory' ? (
                <FolderPlus className="h-3 w-3 text-primary" />
              ) : (
                <FilePlus className="h-3 w-3 text-primary" />
              )}
            </div>
            新建{type === 'directory' ? '文件夹' : '文件'}
          </h3>
          <button
            className="rounded p-1 text-muted-foreground/50 transition-all hover:bg-accent active:scale-95"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex gap-1.5 mb-3">
          {(['file', 'directory'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                type === t
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border/30 text-muted-foreground/60 hover:border-border/50 hover:bg-accent/20',
              )}
            >
              {t === 'file' ? <FilePlus className="h-3 w-3" /> : <FolderPlus className="h-3 w-3" />}
              {t === 'file' ? '文件' : '文件夹'}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm()
            if (e.key === 'Escape') onClose()
          }}
          placeholder={type === 'file' ? '输入文件名...' : '输入文件夹名...'}
          className="w-full h-9 px-3 text-sm border border-border/50 rounded-md bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:ring-offset-1 focus:ring-offset-background transition-all duration-150 mb-4 outline-none"
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="active:scale-95 transition-transform duration-150"
          >
            取消
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="active:scale-95 transition-transform duration-150"
          >
            创建
          </Button>
        </div>
      </div>
    </div>
  )
}
