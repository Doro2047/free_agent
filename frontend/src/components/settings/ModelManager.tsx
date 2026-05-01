import { useState, useEffect } from 'react'
import { useConfigStore } from '@/stores/configStore'
import { Button } from '@/components/ui/Button'
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Cpu,
  Loader2,
  Star,
  StarOff,
  Zap,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { toast } from 'sonner'



export function ModelManager() {
  useConfigStore()
  interface Model {
  id: string
  name: string
  provider: string
  loaded?: boolean
  size?: number
  isDefault?: boolean
  isActive?: boolean
}

const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newModel, setNewModel] = useState({ name: '', provider: 'openai' })

  useEffect(() => {
    loadModels()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadModels = async () => {
    setLoading(true)
    try {
      if (window.electronAPI?.models?.list) {
        const result = await window.electronAPI.models.list()
        // 将 ModelInfo[] 转换为 Model[]
        const modelsArray: Model[] = (result || []).map((item, index) => ({
          id: `${index}-${item.name}`,
          name: item.name,
          provider: item.isLocal ? 'local' : 'remote',
          loaded: item.loaded,
          size: item.size,
        }))
        setModels(modelsArray)
      } else {
        setModels([
          { id: '1', name: 'qwen-plus', provider: 'dashscope', isDefault: true, isActive: true },
          { id: '2', name: 'qwen-turbo', provider: 'dashscope' },
          { id: '3', name: 'gpt-4', provider: 'openai' },
        ])
      }
    } catch {
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = (id: string) => {
    setModels((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
        isActive: m.id === id ? true : m.isActive,
      })),
    )
    toast.success('默认模型已更新')
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`确定要删除模型 "${name}" 吗？`)) return
    setModels((prev) => prev.filter((m) => m.id !== id))
    toast.info(`模型 "${name}" 已删除`)
  }

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: editName.trim() } : m)),
    )
    setEditingId(null)
    setEditName('')
    toast.success('模型名称已更新')
  }

  const handleAdd = () => {
    if (!newModel.name.trim()) {
      toast.error('请输入模型名称')
      return
    }
    const model: Model = {
      id: Date.now().toString(),
      name: newModel.name.trim(),
      provider: newModel.provider,
    }
    setModels((prev) => [...prev, model])
    setNewModel({ name: '', provider: 'openai' })
    setShowAdd(false)
    toast.success('模型已添加')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary/60" />
          模型列表
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(true)}
          className="active:scale-95 transition-transform duration-150"
        >
          <Plus className="h-3 w-3" />
          添加
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/50 animate-fade-in">
          <Cpu className="h-5 w-5 mb-1.5 opacity-30" />
          <span className="text-[11px]">暂无模型</span>
        </div>
      ) : (
        <div className="space-y-1">
          {models.map((model, index) => (
            <div
              key={model.id}
              className="group flex items-center gap-2 rounded-md border border-border/20 px-2.5 py-2 transition-all duration-150 hover:border-border/40 hover:bg-accent/15 animate-fade-in-up"
              style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'both' }}
            >
              <div className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded',
                model.isDefault ? 'bg-primary/10' : 'bg-muted/20',
              )}>
                <Zap className={cn(
                  'h-2.5 w-2.5',
                  model.isDefault ? 'text-primary' : 'text-muted-foreground/30',
                )} />
              </div>

              {editingId === model.id ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(model.id)
                      if (e.key === 'Escape') { setEditingId(null); setEditName('') }
                    }}
                    className="h-6 flex-1 rounded border border-primary/30 bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary/20 transition-all duration-150"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(model.id)}
                    className="rounded p-0.5 text-green-500/70 hover:bg-green-500/10 transition-all duration-150 active:scale-90"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditName('') }}
                    className="rounded p-0.5 text-muted-foreground/50 hover:bg-muted/30 transition-all duration-150 active:scale-90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium truncate">{model.name}</span>
                      {model.isDefault && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          <Star className="h-2 w-2" />
                          默认
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground/50">{model.provider}</span>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
                    {!model.isDefault && (
                      <button
                        onClick={() => handleSetDefault(model.id)}
                        className="rounded p-1 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all duration-150 active:scale-90"
                        title="设为默认"
                      >
                        <StarOff className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => { setEditingId(model.id); setEditName(model.name) }}
                      className="rounded p-1 text-muted-foreground/40 hover:text-foreground/60 hover:bg-accent/30 transition-all duration-150 active:scale-90"
                      title="重命名"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(model.id, model.name)}
                      className="rounded p-1 text-muted-foreground/40 hover:text-destructive/60 hover:bg-destructive/10 transition-all duration-150 active:scale-90"
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 animate-fade-in-up">
          <h4 className="text-xs font-semibold mb-2.5 flex items-center gap-1.5">
            <Plus className="h-3 w-3 text-primary" />
            添加模型
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              value={newModel.name}
              onChange={(e) => setNewModel((p) => ({ ...p, name: e.target.value }))}
              placeholder="模型名称 (如: gpt-4)"
              className="h-8 w-full rounded-md border border-border/50 bg-background px-2.5 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              autoFocus
            />
            <select
              value={newModel.provider}
              onChange={(e) => setNewModel((p) => ({ ...p, provider: e.target.value }))}
              className="h-8 w-full rounded-md border border-border/50 bg-background px-2.5 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
            >
              <option value="openai">OpenAI</option>
              <option value="dashscope">DashScope</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">自定义</option>
            </select>
            <div className="flex justify-end gap-1.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => { setShowAdd(false); setNewModel({ name: '', provider: 'openai' }) }}
                className="active:scale-95 transition-transform duration-150"
              >
                取消
              </Button>
              <Button
                variant="default"
                size="xs"
                onClick={handleAdd}
                className="active:scale-95 transition-transform duration-150"
              >
                添加
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
