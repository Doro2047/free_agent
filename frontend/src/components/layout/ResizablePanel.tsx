import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

interface ResizablePanelProps {
  children: React.ReactNode
  defaultSize?: number
  minSize?: number
  maxSize?: number
  collapsible?: boolean
  collapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
  side?: 'left' | 'right'
  direction?: 'vertical' | 'horizontal'
  className?: string
  contentClassName?: string
}

export function ResizablePanel({
  children,
  defaultSize = 256,
  minSize = 200,
  maxSize = 600,
  collapsible = false,
  collapsed = false,
  onCollapseChange,
  side = 'left',
  direction = 'vertical',
  className,
  contentClassName,
}: ResizablePanelProps) {
  const [size, setSize] = useState(defaultSize)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

  const isVertical = direction === 'vertical'

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return
      e.preventDefault()
      setIsResizing(true)
      if (isVertical) {
        startPosRef.current = e.clientX
        startSizeRef.current = panelRef.current?.offsetWidth || defaultSize
      } else {
        startPosRef.current = e.clientY
        startSizeRef.current = panelRef.current?.offsetHeight || defaultSize
      }
    },
    [collapsed, defaultSize, isVertical]
  )

  const handleDoubleClick = useCallback(() => {
    if (collapsible && onCollapseChange) {
      onCollapseChange(!collapsed)
    }
  }, [collapsible, collapsed, onCollapseChange])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const delta = isVertical
        ? (side === 'left' ? e.clientX - startPosRef.current : startPosRef.current - e.clientX)
        : (e.clientY - startPosRef.current)
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta))
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      if (isVertical) {
        document.body.style.cursor = 'col-resize'
      } else {
        document.body.style.cursor = 'row-resize'
      }
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, minSize, maxSize, side, isVertical])

  const displaySize = collapsed ? 0 : size

  return (
    <div
      ref={panelRef}
      className={cn('relative flex', isVertical ? 'flex-col' : 'flex-row', className)}
      style={{
        ...(isVertical
          ? {
              width: displaySize,
              minWidth: displaySize,
              maxWidth: displaySize,
            }
          : {
              height: displaySize,
              minHeight: displaySize,
              maxHeight: displaySize,
            }),
        transition: isResizing ? 'none' : (isVertical ? 'width 200ms ease-out' : 'height 200ms ease-out'),
      }}
    >
      <div
        className={cn('w-full h-full', contentClassName)}
        style={{ overflow: collapsed ? 'hidden' : undefined }}
      >
        {children}
      </div>

      {/* 拖拽手柄 */}
      {isVertical ? (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className={cn(
            'absolute top-0 bottom-0 w-1 group',
            side === 'left' ? '-right-0.5' : '-left-0.5',
            'cursor-col-resize'
          )}
        >
          <div
            className={cn(
              'absolute top-0 bottom-0 w-[2px] transition-all duration-150',
              side === 'left' ? 'right-0' : 'left-0',
              isResizing
                ? 'bg-primary/60'
                : 'bg-transparent group-hover:bg-primary/30'
            )}
          />
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-1 h-8 rounded-full transition-all duration-150',
              side === 'left' ? '-right-1' : '-left-1',
              isResizing
                ? 'bg-primary opacity-100 scale-y-100'
                : 'bg-primary/40 opacity-0 group-hover:opacity-100 scale-y-0 group-hover:scale-y-100'
            )}
          />
        </div>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className={cn(
            'absolute left-0 right-0 h-1 group',
            '-top-0.5',
            'cursor-row-resize'
          )}
        >
          <div
            className={cn(
              'absolute left-0 right-0 h-[2px] transition-all duration-150',
              'top-0',
              isResizing
                ? 'bg-primary/60'
                : 'bg-transparent group-hover:bg-primary/30'
            )}
          />
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 h-1 w-8 rounded-full transition-all duration-150',
              'top-0',
              isResizing
                ? 'bg-primary opacity-100 scale-x-100'
                : 'bg-primary/40 opacity-0 group-hover:opacity-100 scale-x-0 group-hover:scale-x-100'
            )}
          />
        </div>
      )}
    </div>
  )
}
