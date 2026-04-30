﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿import { useState, useEffect, useCallback } from 'react'
import { useFileStore } from '@/stores/fileStore'
import { Button } from '@/components/ui/Button'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
  Loader2,
  FileCode,
  FileText,
  Image,
  Settings,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { FileContextMenu } from './FileContextMenu'

import type { FileNode } from '@/types'

const FILE_ICON_MAP: Record<string, { type: 'code' | 'text' | 'image' | 'settings'; color: string }> = {
  ts: { type: 'code', color: 'text-blue-400/70' },
  tsx: { type: 'code', color: 'text-blue-400/70' },
  js: { type: 'code', color: 'text-blue-400/70' },
  jsx: { type: 'code', color: 'text-blue-400/70' },
  py: { type: 'code', color: 'text-blue-400/70' },
  json: { type: 'code', color: 'text-blue-400/70' },
  md: { type: 'text', color: 'text-muted-foreground/50' },
  txt: { type: 'text', color: 'text-muted-foreground/50' },
  log: { type: 'text', color: 'text-muted-foreground/50' },
  png: { type: 'image', color: 'text-purple-400/70' },
  jpg: { type: 'image', color: 'text-purple-400/70' },
  svg: { type: 'image', color: 'text-purple-400/70' },
  gif: { type: 'image', color: 'text-purple-400/70' },
  yaml: { type: 'settings', color: 'text-green-400/70' },
  yml: { type: 'settings', color: 'text-green-400/70' },
  toml: { type: 'settings', color: 'text-green-400/70' },
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  const config = ext ? FILE_ICON_MAP[ext] : undefined
  if (!config) return <File className="h-3.5 w-3.5 text-muted-foreground/40" />
  const IconComponent = config.type === 'code' ? FileCode : config.type === 'text' ? FileText : config.type === 'image' ? Image : Settings
  return <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
}

function FileTreeItem({
  node,
  depth = 0,
  onFileSelect,
  selectedPath,
}: {
  node: FileNode
  depth?: number
  onFileSelect: (path: string) => void
  selectedPath?: string
}) {
  const [expanded, setExpanded] = useState(depth < 1)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const isDir = node.type === 'directory'
  const isSelected = node.path === selectedPath

  const handleClick = useCallback(() => {
    if (isDir) {
      setExpanded((prev) => !prev)
    } else {
      onFileSelect(node.path)
    }
  }, [isDir, node.path, onFileSelect])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  return (
    <div className="animate-fade-in" style={{ animationDuration: '100ms' }}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-1.5 py-[3px] text-[13px] transition-all duration-150 cursor-pointer select-none',
          isSelected
            ? 'bg-primary/8 text-primary'
            : 'text-foreground/75 hover:bg-accent/40',
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isDir ? (
          <span className="shrink-0 transition-transform duration-150">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <span className="shrink-0">
          {isDir ? (
            expanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-400/60" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-400/50" />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>

        <span className="truncate font-medium">{node.name}</span>
      </div>

      {isDir && expanded && node.children && (
        <div className="tree-children tree-expand">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          fileName={node.name}
          onSelect={(_action) => setContextMenu(null)}
          isDirectory={isDir}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export function FileTree() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPath, setSelectedPath] = useState<string>()
  const { openFile } = useFileStore()

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      if (window.electronAPI?.files?.list) {
        const result = await window.electronAPI.files.list()
        setFiles(result || [])
      } else {
        setFiles([
          {
            name: 'workspace',
            path: '/workspace',
            type: 'directory',
            isDirectory: true,
            children: [
              { name: 'main.py', path: '/workspace/main.py', type: 'file', isDirectory: false },
              { name: 'config.yaml', path: '/workspace/config.yaml', type: 'file', isDirectory: false },
              {
                name: 'utils',
                path: '/workspace/utils',
                type: 'directory',
                isDirectory: true,
                children: [
                  { name: 'helpers.py', path: '/workspace/utils/helpers.py', type: 'file', isDirectory: false },
                  { name: 'types.py', path: '/workspace/utils/types.py', type: 'file', isDirectory: false },
                ],
              },
            ],
          },
        ])
      }
    } catch {
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleFileSelect = useCallback(
    (path: string) => {
      setSelectedPath(path)
      openFile(path)
    },
    [openFile],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/30 px-2.5 py-1.5 shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">资源管理器</span>
        <Button
          variant="ghost"
          size="xs"
          onClick={loadFiles}
          disabled={loading}
          className="h-5 w-5 rounded active:scale-95 transition-transform duration-150"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 animate-fade-in">
            <Folder className="h-5 w-5 mb-1.5 opacity-30" />
            <span className="text-[11px]">暂无文件</span>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              onFileSelect={handleFileSelect}
              selectedPath={selectedPath}
            />
          ))
        )}
      </div>
    </div>
  )
}
