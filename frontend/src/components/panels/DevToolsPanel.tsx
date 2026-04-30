import { useState } from 'react'
import {
  Code2, FileText, Compass, GitBranch,
  Figma, Bot, Puzzle, Settings2,
  ChevronDown, ChevronRight, ExternalLink,
  Maximize2, Minimize2, X, Plus,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { EditorTabs } from '@/components/editor/EditorTabs'

export type DevToolId =
  | 'editor' | 'docs' | 'terminal' | 'browser'
  | 'changes' | 'figma' | 'agent' | 'mcp' | 'settings'

interface DevToolsPanelProps {
  onClose?: () => void
}

const toolConfig = [
  { id: 'editor' as DevToolId, icon: <Code2 className="h-4 w-4" />, label: '编辑器' },
  { id: 'docs' as DevToolId, icon: <FileText className="h-4 w-4" />, label: '文档' },
  { id: 'terminal' as DevToolId, icon: <Compass className="h-4 w-4" />, label: '终端' },
  { id: 'browser' as DevToolId, icon: <ExternalLink className="h-4 w-4" />, label: '浏览器' },
  { id: 'changes' as DevToolId, icon: <GitBranch className="h-4 w-4" />, label: '代码变更' },
  { id: 'figma' as DevToolId, icon: <Figma className="h-4 w-4" />, label: 'Figma' },
  { id: 'agent' as DevToolId, icon: <Bot className="h-4 w-4" />, label: '智能体' },
  { id: 'mcp' as DevToolId, icon: <Puzzle className="h-4 w-4" />, label: 'MCP' },
  { id: 'settings' as DevToolId, icon: <Settings2 className="h-4 w-4" />, label: '设置' },
]

export function DevToolsPanel({ onClose }: DevToolsPanelProps) {
  const [selectedTool, setSelectedTool] = useState<DevToolId>('terminal')
  const [isMaximized, setIsMaximized] = useState(false)

  return (
    <div className={cn(
      'flex flex-col h-full bg-card text-foreground overflow-hidden',
      isMaximized && 'fixed inset-0 z-50'
    )}>
      {/* 顶部水平图标工具栏 */}
      <div className="flex items-center bg-card border-b border-border/50 shrink-0">
        <div className="flex items-center flex-1 overflow-x-auto scrollbar-hide">
          {toolConfig.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 h-10 w-12 shrink-0 transition-colors relative',
                selectedTool === tool.id
                  ? 'text-foreground border-b-2 border-b-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={tool.label}
            >
              {tool.icon}
              <span className="truncate text-[9px]">{tool.label}</span>
            </button>
          ))}
          <button className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground min-w-0 shrink-0 transition-colors">
            <Plus className="h-4 w-4" />
            <span className="truncate text-[9px]">添加</span>
          </button>
        </div>
        {/* 右侧控制按钮 */}
        <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-border/50">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted hover:text-destructive transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      {selectedTool === 'editor' ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <EditorTabs />
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeEditor />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* 文件树区域 */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <FileTree />
          </div>
          {/* 底部输出面板 */}
          <OutputPanel />
        </div>
      )}
    </div>
  )
}

function FileTree() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components']))

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folder)) {
        next.delete(folder)
      } else {
        next.add(folder)
      }
      return next
    })
  }

  const fileTree = [
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'components', type: 'folder', children: [
          { name: 'App.tsx', type: 'file' },
          { name: 'Header.tsx', type: 'file' },
          { name: 'ChatPanel.tsx', type: 'file' },
        ]},
        { name: 'index.tsx', type: 'file' },
        { name: 'styles.css', type: 'file' },
      ]
    },
    { name: 'package.json', type: 'file' },
    { name: 'tsconfig.json', type: 'file' },
    { name: 'vite.config.ts', type: 'file' },
  ]

  const renderTree = (items: any[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.name)
      const paddingLeft = `${depth * 16 + 8}px`

      if (item.type === 'folder') {
        return (
          <div key={item.name}>
            <button
              onClick={() => toggleFolder(item.name)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-foreground hover:bg-muted text-left"
              style={{ paddingLeft }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </button>
            {isExpanded && item.children && (
              <div>{renderTree(item.children, depth + 1)}</div>
            )}
          </div>
        )
      }

      return (
        <button
          key={item.name}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-foreground hover:bg-muted text-left"
          style={{ paddingLeft }}
        >
          <span className="w-3.5 shrink-0" />
          <span className="truncate">{item.name}</span>
        </button>
      )
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border/50">
        <span className="text-[11px] font-medium text-foreground">资源管理器</span>
        <span className="text-[10px] text-muted-foreground">12 个文件</span>
      </div>
      {renderTree(fileTree)}
    </div>
  )
}

function OutputPanel() {
  const [activeTab, setActiveTab] = useState('terminal')

  return (
    <div className="border-t border-border/50 shrink-0">
      <div className="flex items-center bg-card">
        {['terminal', 'output', 'problems'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3 py-1.5 text-[11px] border-r border-border/50 transition-colors',
              activeTab === tab
                ? 'text-foreground border-t-2 border-t-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab === 'terminal' ? '终端' : tab === 'output' ? '输出' : '问题'}
          </button>
        ))}
      </div>
      <div className="bg-card p-3 font-mono text-[11px] text-muted-foreground h-24 overflow-y-auto">
        {activeTab === 'terminal' && (
          <div className="space-y-1">
            <div className="text-green-500">$</div>
            <div>npm run dev</div>
            <div className="text-teal-400">VITE v5.4.21 ready in 359 ms</div>
            <div>    Local:   <span className="text-blue-400">http://localhost:5173/</span></div>
            <div className="animate-pulse">█</div>
          </div>
        )}
        {activeTab === 'output' && (
          <div>No output messages</div>
        )}
        {activeTab === 'problems' && (
          <div>No problems detected</div>
        )}
      </div>
    </div>
  )
}
