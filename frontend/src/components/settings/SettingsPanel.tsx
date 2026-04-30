import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import { useConfigStore } from '@/stores/configStore'
import { Button } from '@/components/ui/Button'
import { SettingSection } from './SettingSection'
import { SettingRow } from './SettingRow'
import { ModelManager } from './ModelManager'
import {
  X,
  Settings,
  Sun,
  Moon,
  Monitor,
  Cpu,
  Globe,
  Bell,
  Palette,
  Sliders,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { ModelParamsPanel } from './ModelParamsPanel'

interface SettingsPanelProps {
  onClose: () => void
}

type SettingsTab = 'general' | 'model' | 'params' | 'appearance' | 'advanced'

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: '通用', icon: <Sliders className="h-3.5 w-3.5" /> },
  { id: 'model', label: '模型', icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: 'params', label: '参数', icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
  { id: 'appearance', label: '外观', icon: <Palette className="h-3.5 w-3.5" /> },
  { id: 'advanced', label: '高级', icon: <Settings className="h-3.5 w-3.5" /> },
]

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useAppStore()
  const config = useConfigStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(onClose, 200)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-overlay flex justify-end">
      <div className="absolute inset-0 drawer-overlay" onClick={handleClose} />
      <div
        className={cn(
          'relative flex w-full max-w-md flex-col bg-card border-l border-border/40 shadow-xl',
          isClosing ? 'drawer-panel-exit' : 'drawer-panel',
        )}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5 shrink-0 bg-gradient-surface">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              <Settings className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            </div>
            <h2 className="text-sm font-semibold tracking-tight">设置</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-7 w-7 rounded-md active:scale-95 transition-all duration-150"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex border-b border-border/30 px-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all duration-150 relative',
                activeTab === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground/60 hover:text-foreground/70',
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-1.5 right-1.5 h-[2px] rounded-full bg-primary transition-all duration-200" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-5 animate-fade-in">
              <SettingSection title="基本设置" icon={<Globe className="h-3.5 w-3.5" />}>
                <SettingRow label="语言" description="界面显示语言">
                  <select
                    value={config.language || 'zh-CN'}
                    onChange={(e) => config.setLanguage?.(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-sm w-full max-w-[180px] focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </SettingRow>
                <SettingRow label="通知" description="启用桌面通知">
                  <button
                    onClick={() => config.setNotifications?.(!config.notifications)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-all duration-200',
                      config.notifications ? 'bg-primary' : 'bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-200',
                        config.notifications ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </SettingRow>
              </SettingSection>

              <SettingSection title="对话设置" icon={<Sparkles className="h-3.5 w-3.5" />}>
                <SettingRow label="流式输出" description="逐字显示 AI 回复">
                  <button
                    onClick={() => config.setStreaming?.(!config.streaming)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-all duration-200',
                      config.streaming !== false ? 'bg-primary' : 'bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-200',
                        config.streaming !== false ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </SettingRow>
                <SettingRow label="最大上下文长度" description="对话历史保留条数">
                  <input
                    type="number"
                    value={config.maxContextLength || 50}
                    onChange={(e) => config.setMaxContextLength?.(Number(e.target.value))}
                    min={10}
                    max={200}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2.5 text-sm text-center focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
                  />
                </SettingRow>
              </SettingSection>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="animate-fade-in">
              <ModelManager />
            </div>
          )}

          {activeTab === 'params' && <ModelParamsPanel />}

          {activeTab === 'appearance' && (
            <div className="space-y-5 animate-fade-in">
              <SettingSection title="主题" icon={<Palette className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'light' as const, label: '浅色', icon: <Sun className="h-4 w-4" /> },
                    { value: 'dark' as const, label: '深色', icon: <Moon className="h-4 w-4" /> },
                    { value: 'system' as const, label: '跟随系统', icon: <Monitor className="h-4 w-4" /> },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-150',
                        theme === option.value
                          ? 'border-primary/40 bg-primary/5 shadow-glow-sm'
                          : 'border-border/30 hover:border-border/50 hover:bg-accent/20',
                      )}
                    >
                      <span className={cn(
                        'transition-colors duration-150',
                        theme === option.value ? 'text-primary' : 'text-muted-foreground/50',
                      )}>
                        {option.icon}
                      </span>
                      <span className="text-[11px] font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </SettingSection>

              <SettingSection title="界面缩放" icon={<Monitor className="h-3.5 w-3.5" />}>
                <SettingRow label="缩放比例" description="调整界面元素大小">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={80}
                      max={200}
                      step={10}
                      value={config.zoomLevel || 100}
                      onChange={(e) => config.setZoomLevel?.(Number(e.target.value))}
                      className="w-24 accent-primary"
                    />
                    <span className="text-xs text-muted-foreground/60 w-8 text-right font-mono">{config.zoomLevel || 100}%</span>
                  </div>
                </SettingRow>
              </SettingSection>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-5 animate-fade-in">
              <SettingSection title="服务器" icon={<Cpu className="h-3.5 w-3.5" />}>
                <SettingRow label="API 地址" description="后端服务地址">
                  <input
                    type="url"
                    value={config.apiUrl || 'http://localhost:8000'}
                    onChange={(e) => config.setApiUrl?.(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2.5 text-sm w-full max-w-[220px] focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
                  />
                </SettingRow>
                <SettingRow label="请求超时" description="API 请求超时时间(秒)">
                  <input
                    type="number"
                    value={config.timeout || 30}
                    onChange={(e) => config.setTimeout?.(Number(e.target.value))}
                    min={5}
                    max={300}
                    className="h-8 w-20 rounded-md border border-input bg-background px-2.5 text-sm text-center focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
                  />
                </SettingRow>
              </SettingSection>

              <SettingSection title="数据" icon={<Bell className="h-3.5 w-3.5" />}>
                <SettingRow label="自动保存" description="自动保存对话记录">
                  <button
                    onClick={() => config.setAutoSave?.(!config.autoSave)}
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-all duration-200',
                      config.autoSave !== false ? 'bg-primary' : 'bg-muted/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-200',
                        config.autoSave !== false ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </SettingRow>
              </SettingSection>
            </div>
          )}
        </div>

        <div className="border-t border-border/30 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
            <span>Free Agent v1.0</span>
            <span className="flex items-center gap-1">
              <kbd>Esc</kbd>
              <span>关闭</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
