import { useConfigStore } from '@/stores/configStore'
import { SettingSection } from './SettingSection'
import { SettingRow } from './SettingRow'
import { cn } from '@/utils/cn'
import { Zap, Brain, FileText, Keyboard } from 'lucide-react'
import { useState } from 'react'

const CONTEXT_SIZE_OPTIONS = [
  { label: '32K', value: 32768, speed: '最快' },
  { label: '40K', value: 40960, speed: '快' },
  { label: '48K', value: 49152, speed: '快' },
  { label: '56K', value: 57344, speed: '中' },
  { label: '64K', value: 65536, speed: '中' },
  { label: '72K', value: 73728, speed: '中' },
  { label: '80K', value: 81920, speed: '慢' },
  { label: '88K', value: 90112, speed: '慢' },
  { label: '96K', value: 98304, speed: '慢' },
  { label: '256K', value: 262144, speed: '最慢' },
]

const REASONING_FORMATS = [
  { label: 'deepseek-legacy', desc: '显示完整思考过程' },
  { label: 'deepseek', desc: '隐藏思考过程' },
  { label: 'none', desc: '保持原始格式' },
]

export function ModelParamsPanel() {
  const { model, agentMode, setModelConfig } = useConfigStore()
  const [needReload, setNeedReload] = useState(false)

  const handleCtxSizeChange = (value: number) => {
    setModelConfig({ ctxSize: value })
    setNeedReload(true)
  }

  const handleReasoningToggle = () => {
    const newVal = model.reasoning === 'on' ? 'off' : 'on'
    setModelConfig({ reasoning: newVal as 'on' | 'off' })
    setNeedReload(true)
  }

  const handleReasoningFormatCycle = () => {
    const formats: ('deepseek-legacy' | 'deepseek' | 'none')[] = ['deepseek-legacy', 'deepseek', 'none']
    const current = model.reasoningFormat ?? 'deepseek-legacy'
    const idx = formats.indexOf(current)
    const next = formats[(idx + 1) % formats.length]
    setModelConfig({ reasoningFormat: next })
    setNeedReload(true)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 快捷控制面板 */}
      <SettingSection title="快捷控制" icon={<Zap className="h-3.5 w-3.5 text-yellow-500" />}>
        {needReload && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
            <Zap className="h-3.5 w-3.5" />
            <span>参数已更改，重新加载模型后生效</span>
          </div>
        )}

        <SettingRow label="上下文大小" description="快速切换上下文窗口（快捷键 0-9）">
          <div className="flex flex-wrap gap-1.5">
            {CONTEXT_SIZE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleCtxSizeChange(opt.value)}
                className={cn(
                  'flex flex-col items-center rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150 min-w-[48px]',
                  model.ctxSize === opt.value
                    ? 'border-primary/50 bg-primary/15 text-primary shadow-glow-sm'
                    : 'border-border/30 text-muted-foreground/60 hover:border-border/50 hover:text-foreground/70 hover:bg-accent/20',
                )}
                title={`${opt.label} - ${opt.speed}`}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="text-[10px] opacity-60">{opt.speed}</span>
              </button>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="思维模式" description="开启/关闭思考推理（快捷键 M）">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReasoningToggle}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                model.reasoning === 'on'
                  ? 'border-purple-500/40 bg-purple-500/15 text-purple-400'
                  : 'border-border/30 text-muted-foreground/50 hover:border-border/50',
              )}
            >
              <Brain className="h-3.5 w-3.5" />
              {model.reasoning === 'on' ? '开启' : '关闭'}
            </button>
            <span className="text-[11px] text-muted-foreground/40">
              {model.reasoning === 'on' ? '所有问题将显示完整推理过程' : '直接回答，无推理过程'}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="推理格式" description="切换推理输出格式（快捷键 T）">
          <div className="flex flex-wrap gap-1.5">
            {REASONING_FORMATS.map((fmt) => (
              <button
                key={fmt.label}
                onClick={handleReasoningFormatCycle}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150',
                  (model.reasoningFormat ?? 'deepseek-legacy') === fmt.label
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-400'
                    : 'border-border/30 text-muted-foreground/50 hover:border-border/50 hover:bg-accent/20',
                )}
              >
                <FileText className="h-3 w-3" />
                <div className="text-left">
                  <div className="font-medium">{fmt.label}</div>
                  <div className="text-[10px] opacity-60">{fmt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingSection>

      {/* 键盘快捷键 */}
      <SettingSection title="键盘快捷键" icon={<Keyboard className="h-3.5 w-3.5 text-muted-foreground/50" />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
            <div className="flex gap-1">
              <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">1</kbd>
              <span className="text-muted-foreground/50">~</span>
              <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">9</kbd>
            </div>
            <span className="text-muted-foreground/70">切换上下文大小</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">0</kbd>
            <span className="text-muted-foreground/70">切换至 256K</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">M</kbd>
            <span className="text-muted-foreground/70">切换思维模式</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">T</kbd>
            <span className="text-muted-foreground/70">切换推理格式</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">R</kbd>
            <span className="text-muted-foreground/70">重新加载模型</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/20 px-3 py-2">
            <kbd className="rounded border border-border/40 bg-background px-1.5 py-0.5 font-mono text-[10px]">U</kbd>
            <span className="text-muted-foreground/70">卸载模型</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/40">
          提示：调整参数后需重新加载模型才能生效。建议定期开启新对话以提升响应速度。
        </p>
      </SettingSection>
      {/* 采样参数 */}
      <SettingSection title="采样参数" icon={<span className="text-xs">&#x1F3B2;</span>}>
        <SettingRow label="Temperature" description="控制输出的随机性，值越高越具创造性">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={model.temperature ?? 1}
              onChange={(e) => setModelConfig({ temperature: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-10 text-right font-mono">
              {(model.temperature ?? 1).toFixed(2)}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Top P" description="核采样，累积概率阈值">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={model.topP ?? 0.9}
              onChange={(e) => setModelConfig({ topP: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-10 text-right font-mono">
              {(model.topP ?? 0.9).toFixed(2)}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Top K" description="限制候选词数量">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={model.topK ?? 50}
              onChange={(e) => setModelConfig({ topK: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-10 text-right font-mono">
              {model.topK ?? 50}
            </span>
          </div>
        </SettingRow>

        {agentMode === 'code' && (
          <SettingRow label="Min P" description="最低概率阈值，过滤低概率候选词">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={model.minP ?? 0}
                onChange={(e) => setModelConfig({ minP: Number(e.target.value) })}
                className="w-24 accent-primary"
              />
              <span className="text-xs text-muted-foreground/60 w-10 text-right font-mono">
                {(model.minP ?? 0).toFixed(2)}
              </span>
            </div>
          </SettingRow>
        )}

        <SettingRow label="Repeat Penalty" description="重复惩罚，防止重复生成">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={model.repeatPenalty ?? 1.1}
              onChange={(e) => setModelConfig({ repeatPenalty: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-10 text-right font-mono">
              {(model.repeatPenalty ?? 1.1).toFixed(2)}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Presence Penalty" description="存在惩罚，鼓励讨论新话题">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-2}
              max={2}
              step={0.01}
              value={model.presencePenalty ?? 0}
              onChange={(e) => setModelConfig({ presencePenalty: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-12 text-right font-mono">
              {(model.presencePenalty ?? 0).toFixed(2)}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="Frequency Penalty" description="频率惩罚，降低高频词权重">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-2}
              max={2}
              step={0.01}
              value={model.frequencyPenalty ?? 0}
              onChange={(e) => setModelConfig({ frequencyPenalty: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-12 text-right font-mono">
              {(model.frequencyPenalty ?? 0).toFixed(2)}
            </span>
          </div>
        </SettingRow>
      </SettingSection>

      {/* 推理参数 */}
      <SettingSection title="推理参数" icon={<span className="text-xs">&#x1F9E0;</span>}>
        <SettingRow label="思维链推理" description="启用深度推理能力">
          <button
            onClick={() => setModelConfig({ reasoning: model.reasoning === 'on' ? 'off' : 'on' })}
            className={cn(
              'relative h-5 w-9 rounded-full transition-all duration-200',
              model.reasoning === 'on' ? 'bg-primary' : 'bg-muted/60',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-200',
                model.reasoning === 'on' ? 'left-[18px]' : 'left-0.5',
              )}
            />
          </button>
        </SettingRow>

        <SettingRow label="推理预算" description="限制推理步骤数量">
          <select
            value={model.reasoningBudget ?? -1}
            onChange={(e) => setModelConfig({ reasoningBudget: Number(e.target.value) })}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm w-full max-w-[180px] focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
          >
            <option value={-1}>无限制</option>
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
          </select>
        </SettingRow>
      </SettingSection>

      {/* 性能参数 */}
      <SettingSection title="性能参数" icon={<span className="text-xs">&#x26A1;</span>}>
        <SettingRow label="上下文大小" description="模型上下文窗口大小">
          <select
            value={model.ctxSize ?? 32768}
            onChange={(e) => setModelConfig({ ctxSize: Number(e.target.value) })}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-sm w-full max-w-[180px] focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none"
          >
            <option value={4096}>4,096</option>
            <option value={8192}>8,192</option>
            <option value={16384}>16,384</option>
            <option value={32768}>32,768</option>
            <option value={65536}>65,536</option>
            <option value={131072}>131,072</option>
            <option value={262144}>262,144</option>
          </select>
        </SettingRow>

        <SettingRow label="Batch Size" description="批处理大小">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={8192}
              step={1}
              value={model.batchSize ?? 1024}
              onChange={(e) => setModelConfig({ batchSize: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-12 text-right font-mono">
              {model.batchSize ?? 1024}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="U-Batch Size" description="微批处理大小">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={2048}
              step={1}
              value={model.ubatchSize ?? 256}
              onChange={(e) => setModelConfig({ ubatchSize: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-12 text-right font-mono">
              {model.ubatchSize ?? 256}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="线程数" description="并行处理的线程数量">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={64}
              step={1}
              value={model.threads ?? 24}
              onChange={(e) => setModelConfig({ threads: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-8 text-right font-mono">
              {model.threads ?? 24}
            </span>
          </div>
        </SettingRow>

        <SettingRow label="缓存提示" description="缓存提示词以加速重复对话">
          <button
            onClick={() => setModelConfig({ cachePrompt: !model.cachePrompt })}
            className={cn(
              'relative h-5 w-9 rounded-full transition-all duration-200',
              model.cachePrompt !== false ? 'bg-primary' : 'bg-muted/60',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-all duration-200',
                model.cachePrompt !== false ? 'left-[18px]' : 'left-0.5',
              )}
            />
          </button>
        </SettingRow>

        <SettingRow label="缓存内存" description="分配给缓存的内存大小 (MB)">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={65536}
              step={1024}
              value={model.cacheRam ?? 16384}
              onChange={(e) => setModelConfig({ cacheRam: Number(e.target.value) })}
              className="w-24 accent-primary"
            />
            <span className="text-xs text-muted-foreground/60 w-16 text-right font-mono">
              {((model.cacheRam ?? 16384) / 1024).toFixed(0)} MB
            </span>
          </div>
        </SettingRow>
      </SettingSection>

      {/* 系统提示词 */}
      <SettingSection title="系统提示词" icon={<span className="text-xs">&#x1F4AC;</span>}>
        <textarea
          value={model.systemPrompt ?? ''}
          onChange={(e) => setModelConfig({ systemPrompt: e.target.value })}
          placeholder="输入系统提示词，定义 AI 助手的角色和行为..."
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus:border-primary/40 focus:ring-2 focus:ring-primary/15 transition-all duration-150 outline-none placeholder:text-muted-foreground/40"
        />
      </SettingSection>
    </div>
  )
}
