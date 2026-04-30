import type { AgentMode } from '@/types'

interface LlamaServerModeConfig {
  temperature: number
  topK: number
  topP: number
  minP?: number
  repeatPenalty: number
  presencePenalty?: number
  frequencyPenalty?: number
  reasoning: 'on' | 'off'
  reasoningBudget: number
  reasoningFormat: 'deepseek-legacy' | 'deepseek' | 'none'
  nPredict: number
  ctxSize: number
  nGpuLayers: number
  batchSize: number
  uBatchSize: number
  threads: number
  cachePrompt: boolean
  cacheRam: number
  systemPrompt: string
}

export const AGENT_MODE_CONFIGS: Record<AgentMode, LlamaServerModeConfig> = {
  chat: {
    temperature: 1,
    topK: 50,
    topP: 0.9,
    repeatPenalty: 1.1,
    reasoning: 'on',
    reasoningBudget: -1,
    reasoningFormat: 'deepseek-legacy',
    nPredict: -1,
    ctxSize: 32768,
    nGpuLayers: 999,
    batchSize: 1024,
    uBatchSize: 256,
    threads: 24,
    cachePrompt: true,
    cacheRam: 16384,
    systemPrompt:
      '你是一个有帮助的 AI 助手。你擅长文本生成、图像理解、小说创作和创意写作。你可以进行多轮对话，处理多样化的自然语言需求。',
  },
  code: {
    temperature: 0.1,
    topK: 10,
    topP: 0.85,
    minP: 0.05,
    repeatPenalty: 1.2,
    presencePenalty: 0.0,
    frequencyPenalty: 0.0,
    reasoning: 'on',
    reasoningBudget: -1,
    reasoningFormat: 'none',
    nPredict: -1,
    ctxSize: 32768,
    nGpuLayers: 999,
    batchSize: 1024,
    uBatchSize: 256,
    threads: 24,
    cachePrompt: true,
    cacheRam: 16384,
    systemPrompt:
      '你是一个专业的 AI 编程助手。你可以理解需求、规划任务、生成代码、测试和部署。你擅长代码推理和逻辑分析。',
  },
}
