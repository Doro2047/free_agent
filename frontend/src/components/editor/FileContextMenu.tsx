import { useState, useEffect, useRef } from 'react'
import { cn } from '@/utils/cn'
import { FilePlus, FolderPlus, Pencil, Trash2 } from 'lucide-react'

interface FileContextMenuProps {
  x: number
  y: number
  fileName: string
  isDirectory: boolean
  onSelect: (action: 'new-file' | 'new-folder' | 'rename' | 'delete') => void
  onClose: () => void
}

export function FileContextMenu({ x, y, fileName, isDirectory, onSelect, onClose }: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 触发动画
    requestAnimationFrame(() => setIsVisible(true))

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // 计算位置
    const menuWidth = 200
    const menuHeight = isDirectory ? 180 : 120
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    if (x + menuWidth > windowWidth) {
      adjustedX = windowWidth - menuWidth - 8
    }
    if (y + menuHeight > windowHeight) {
      adjustedY = windowHeight - menuHeight - 8
    }

    setPosition({ x: adjustedX, y: adjustedY })

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [x, y, isDirectory, onClose])

  const handleSelect = (action: 'new-file' | 'new-folder' | 'rename' | 'delete') => {
    onSelect(action)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[9999] min-w-[200px] rounded-lg border border-border/50 bg-popover py-1.5 shadow-xl backdrop-blur-sm',
        'transition-all duration-150 ease-out',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
      )}
      style={{ left: position.x, top: position.y }}
    >
      {/* 文件/文件夹名称 */}
      <div className="px-3 py-1.5 text-xs text-muted-foreground/70 border-b border-border/50 mb-1 truncate font-medium">
        {fileName}
      </div>

      {/* 新建文件 */}
      {isDirectory && (
        <button
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors duration-100 hover:bg-accent/70 rounded-sm mx-1"
          onClick={() => handleSelect('new-file')}
        >
          <FilePlus className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-foreground/80">新建文件</span>
        </button>
      )}

      {/* 新建文件夹 */}
      {isDirectory && (
        <button
          className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors duration-100 hover:bg-accent/70 rounded-sm mx-1"
          onClick={() => handleSelect('new-folder')}
        >
          <FolderPlus className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-foreground/80">新建文件夹</span>
        </button>
      )}

      {/* 重命名 */}
      <button
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors duration-100 hover:bg-accent/70 rounded-sm mx-1"
        onClick={() => handleSelect('rename')}
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-foreground/80">重命名</span>
      </button>

      {/* 分隔线 */}
      <div className="my-1.5 border-t border-border/40" />

      {/* 删除 */}
      <button
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors duration-100 hover:bg-destructive/10 rounded-sm mx-1"
        onClick={() => handleSelect('delete')}
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
        <span className="text-destructive/90 font-medium">删除</span>
      </button>
    </div>
  )
}
