import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Plus, Image, FileText, Paperclip, X, Mic, File, MessageSquare, Plug } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'

interface MessageInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
}

interface UploadedFile {
  name: string
  type: string
  size: number
  data: string
  category: 'image' | 'audio' | 'text' | 'pdf' | 'other'
}

export function MessageInput({
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = '输入消息...',
}: MessageInputProps) {
  const [input, setInput] = useState('')
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [showSystemMessage, setShowSystemMessage] = useState(false)
  const [systemMessage, setSystemMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevInputLength = useRef(0)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 36), 160)
    textarea.style.height = `${newHeight}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [input, adjustHeight])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if ((!trimmed && uploadedFiles.length === 0) || disabled) return
    onSend(trimmed)
    setInput('')
    setUploadedFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, disabled, onSend, uploadedFiles])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleCompositionStart = useCallback(() => {
    prevInputLength.current = input.length
  }, [input.length])

  const handleCompositionEnd = useCallback(() => {
    prevInputLength.current = 0
  }, [])

  useEffect(() => {
    if (!disabled && !isStreaming) {
      textareaRef.current?.focus()
    }
  }, [disabled, isStreaming])

  const handleFileSelect = useCallback((type: string) => {
    setShowUploadMenu(false)
    if (type === 'image') {
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'image/*'
        fileInputRef.current.click()
      }
    } else if (type === 'audio') {
      if (fileInputRef.current) {
        fileInputRef.current.accept = 'audio/*'
        fileInputRef.current.click()
      }
    } else if (type === 'text') {
      if (fileInputRef.current) {
        fileInputRef.current.accept = '.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.py'
        fileInputRef.current.click()
      }
    } else if (type === 'pdf') {
      if (fileInputRef.current) {
        fileInputRef.current.accept = '.pdf'
        fileInputRef.current.click()
      }
    } else if (type === 'system') {
      setShowSystemMessage(true)
    } else if (type === 'mcp') {
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const data = event.target?.result as string
        if (data) {
          const category = file.type.startsWith('image/') ? 'image'
            : file.type.startsWith('audio/') ? 'audio'
            : file.type === 'application/pdf' ? 'pdf'
            : file.type.startsWith('text/') || file.name.match(/\.(txt|md|csv|json|xml|html|css|js|ts|py)$/) ? 'text'
            : 'other'
          setUploadedFiles((prev) => [...prev, {
            name: file.name,
            type: file.type,
            size: file.size,
            data,
            category,
          }])
        }
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploadOptions = [
    { id: 'image', label: 'Images', icon: <Image className="h-4 w-4" />, description: 'PNG, JPG, WEBP' },
    { id: 'audio', label: 'Audio Files', icon: <Mic className="h-4 w-4" />, description: 'MP3, WAV, OGG' },
    { id: 'text', label: 'Text Files', icon: <FileText className="h-4 w-4" />, description: 'TXT, MD, CSV, JSON' },
    { id: 'pdf', label: 'PDF Files', icon: <File className="h-4 w-4" />, description: 'PDF documents' },
    { id: 'system', label: 'System Message', icon: <MessageSquare className="h-4 w-4" />, description: 'Set system prompt' },
  ]

  const handleSystemMessageSave = useCallback(() => {
    if (systemMessage.trim()) {
      onSend(`[SYSTEM] ${systemMessage.trim()}`)
    }
    setSystemMessage('')
    setShowSystemMessage(false)
    setShowUploadMenu(false)
  }, [systemMessage, onSend])

  return (
    <div className="border-t border-border/30 bg-card/50 p-2">
      <div className="mx-auto max-w-2xl">
        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="group flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5 text-xs animate-fade-in"
              >
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-muted-foreground/40">{formatFileSize(file.size)}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1 rounded p-0.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowUploadMenu(!showUploadMenu)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-muted hover:text-foreground transition-colors"
              type="button"
              title="上传文件"
            >
              <Plus className="h-4 w-4" />
            </button>

            {showUploadMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUploadMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 z-50 w-56 rounded-xl border border-border/40 bg-card/95 backdrop-blur-sm shadow-lg animate-fade-in-up overflow-hidden">
                  <div className="p-2">
                    {uploadOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleFileSelect(option.id)}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-accent/40 transition-all duration-150 text-left"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground/70">
                          {option.icon}
                        </div>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-[11px] text-muted-foreground/50">{option.description}</div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-border/30 my-1" />
                    <button
                      onClick={() => { setShowUploadMenu(false); }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-accent/40 transition-all duration-150 text-left"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground/70">
                        <Plug className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">MCP Servers</div>
                        <div className="text-[11px] text-muted-foreground/50">Manage server connections</div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'flex-1 resize-none bg-transparent py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[32px] max-h-[160px] leading-relaxed',
            )}
            rows={1}
          />

          <div className="flex shrink-0 items-center gap-1">
            {isStreaming && onStop && (
              <button
                onClick={onStop}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                type="button"
                title="停止生成"
              >
                <Square className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || disabled}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-lg transition-all',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'disabled:pointer-events-none disabled:opacity-30',
              )}
              type="button"
              title="发送消息"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          multiple
        />

        <div className="mt-1.5 flex items-center justify-center gap-3 text-[10px] text-muted-foreground/25">
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted/20 text-[10px] font-normal">Enter</kbd> 发送</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-muted/20 text-[10px] font-normal">Shift+Enter</kbd> 换行</span>
        </div>
      </div>

      {showSystemMessage && (
        <div className="fixed inset-0 z-modal flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowSystemMessage(false); setSystemMessage('') }} />
          <div className="relative w-96 bg-popover border border-border/40 rounded-lg shadow-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                System Message
              </h3>
              <button
                className="rounded p-1 text-muted-foreground/50 transition-all hover:bg-accent active:scale-95"
                onClick={() => { setShowSystemMessage(false); setSystemMessage('') }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              placeholder="Enter system prompt..."
              className="w-full h-32 px-3 py-2 text-sm border border-border/50 rounded-md bg-background focus:border-primary/40 focus:ring-2 focus:ring-primary/15 focus:ring-offset-1 focus:ring-offset-background transition-all duration-150 mb-3 outline-none resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowSystemMessage(false); setSystemMessage('') }}
                className="active:scale-95 transition-transform duration-150"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSystemMessageSave}
                disabled={!systemMessage.trim()}
                className="active:scale-95 transition-transform duration-150"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
