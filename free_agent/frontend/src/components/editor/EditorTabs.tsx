import { useFileStore } from '@/stores/fileStore'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface EditorTabsProps {
  className?: string
}

// 获取文件名
const fileNameCache = new Map<string, string>()

function getFileName(path: string): string {
  const cached = fileNameCache.get(path)
  if (cached !== undefined) return cached
  const parts = path.split(/[/\\]/)
  const result = parts[parts.length - 1] || path
  fileNameCache.set(path, result)
  return result
}

export function EditorTabs({ className }: EditorTabsProps) {
  const { openFiles, activeFilePath, setActiveFile, closeFile, isModified, closeAllFiles, closeOtherFiles } = useFileStore()

  if (openFiles.length === 0) {
    return null
  }

  return (
    <div className={cn('flex items-center border-b border-border/50 bg-muted/20', className)}>
      {/* 标签页列表 */}
      <div className="flex flex-1 overflow-x-auto scrollbar-thin" role="tablist">
        {openFiles.map((file) => {
          const isActive = file.path === activeFilePath
          const modified = isModified(file.path)
          const fileName = getFileName(file.path)

          return (
            <div
              key={file.path}
              role="tab"
              aria-selected={isActive}
              className={cn(
                'group flex cursor-pointer items-center gap-2 border-r border-border/40 px-3 py-[7px] text-[12px] transition-all duration-150 min-w-0 max-w-[200px]',
                'relative select-none',
                isActive
                  ? 'bg-background/80 text-foreground/90 font-medium border-b-2 border-b-primary'
                  : 'text-muted-foreground/70 hover:bg-accent/40 hover:text-foreground/80 hover:border-b hover:border-b-border/50',
              )}
              onClick={() => setActiveFile(file.path)}
            >
              {/* 文件图标 */}
              <FileIcon path={file.path} />

              {/* 文件名 */}
              <span className="truncate" title={file.path}>
                {fileName}
              </span>

              {/* 修改状态指示器 */}
              {modified ? (
                <span
                  className="flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse-soft"
                  title="已修改"
                />
              ) : (
                /* 关闭按钮 */
                <button
                  className="ml-0.5 shrink-0 rounded-sm p-0.5 opacity-0 transition-all duration-150 hover:bg-accent/80 group-hover:opacity-100 active:scale-90"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeFile(file.path)
                  }}
                  title="关闭"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 全部关闭按钮 */}
      {openFiles.length > 1 && (
        <div className="flex items-center px-1">
          <button
            className="rounded-md p-1.5 text-muted-foreground/60 transition-all duration-200 hover:bg-accent/60 hover:text-accent-foreground hover:scale-105 active:scale-95"
            onClick={() => {
              if (activeFilePath) {
                closeOtherFiles(activeFilePath)
              } else {
                closeAllFiles()
              }
            }}
            title="关闭其他标签"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// 根据文件扩展名显示不同图标
function FileIcon({ path }: { path: string }) {
  const ext = path.split('.').pop()?.toLowerCase() || ''

  const iconColors: Record<string, string> = {
    ts: 'text-blue-400/80',
    tsx: 'text-blue-400/80',
    js: 'text-yellow-400/70',
    jsx: 'text-yellow-400/70',
    py: 'text-emerald-400/70',
    html: 'text-orange-400/70',
    css: 'text-violet-400/70',
    json: 'text-yellow-300/70',
    md: 'text-slate-400/70',
    yaml: 'text-red-400/70',
    yml: 'text-red-400/70',
  }

  const color = iconColors[ext] || 'text-muted-foreground/60'

  return (
    <svg
      className={cn('h-3.5 w-3.5 shrink-0', color)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
