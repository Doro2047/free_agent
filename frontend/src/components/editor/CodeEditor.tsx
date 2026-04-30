import { useFileStore } from '@/stores/fileStore'
import { Code2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export function CodeEditor() {
  const { activeFilePath, openFiles, updateFileContent } = useFileStore()
  const activeFile = openFiles.find((f) => f.path === activeFilePath)
  const content = activeFile?.content || ''

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeFilePath) {
      updateFileContent(activeFilePath, e.target.value)
    }
  }

  if (!activeFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground/40 animate-fade-in">
        <div className="rounded-lg bg-muted/15 p-4 mb-2.5">
          <Code2 className="h-6 w-6 opacity-30" strokeWidth={1.5} />
        </div>
        <span className="text-xs font-medium">选择文件以编辑</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <textarea
        value={content}
        onChange={handleChange}
        className={cn(
          'flex-1 resize-none bg-background p-3 font-mono text-[13px] leading-[1.6]',
          'text-foreground/80 placeholder:text-muted-foreground/30',
          'focus:outline-none border-none',
        )}
        spellCheck={false}
        placeholder="文件内容..."
      />
    </div>
  )
}
