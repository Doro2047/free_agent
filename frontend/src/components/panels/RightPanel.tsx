import { useState } from 'react'
import { FolderTree, Code2 } from 'lucide-react'
import { FileTree } from '@/components/editor/FileTree'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { EditorTabs } from '@/components/editor/EditorTabs'
import { cn } from '@/utils/cn'

type RightTab = 'files' | 'editor'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('files')

  const tabs: { id: RightTab; label: string; icon: React.ReactNode }[] = [
    { id: 'files', label: '文件', icon: <FolderTree className="h-3.5 w-3.5" /> },
    { id: 'editor', label: '编辑器', icon: <Code2 className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex h-full flex-col animate-slide-in-right">
      <div className="flex items-center border-b border-border/50 bg-gradient-surface shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-all duration-150 relative',
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground/60 hover:text-foreground/70',
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary transition-all duration-200" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div className={cn(
          'h-full transition-opacity duration-200',
          activeTab === 'files' ? 'opacity-100 relative' : 'opacity-0 pointer-events-none absolute inset-0',
        )}>
          <FileTree />
        </div>
        <div className={cn(
          'h-full flex flex-col transition-opacity duration-200',
          activeTab === 'editor' ? 'opacity-100 relative' : 'opacity-0 pointer-events-none absolute inset-0',
        )}>
          <EditorTabs />
          <div className="flex-1 min-h-0">
            <CodeEditor />
          </div>
        </div>
      </div>
    </div>
  )
}
