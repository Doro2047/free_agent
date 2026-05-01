import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Config, ModelConfig, ApiKeys, AgentMode } from '@/types'
import { AGENT_MODE_CONFIGS } from '@/config/agentModes'

export interface ConfigState {
  agentMode: AgentMode
  setAgentMode: (mode: AgentMode) => Promise<void>
  model: ModelConfig
  apiKeys: ApiKeys
  isLoading: boolean
  error: string | null
  
  // 通用设置
  language: string
  setLanguage: (language: string) => void
  notifications: boolean
  setNotifications: (notifications: boolean) => void
  
  // 对话设置
  streaming: boolean
  setStreaming: (streaming: boolean) => void
  maxContextLength: number
  setMaxContextLength: (length: number) => void
  
  // 界面设置
  zoomLevel: number
  setZoomLevel: (level: number) => void
  
  // 高级设置
  apiUrl: string
  setApiUrl: (url: string) => void
  timeout: number
  setTimeout: (timeout: number) => void
  autoSave: boolean
  setAutoSave: (autoSave: boolean) => void
  
  setModelConfig: (config: Partial<ModelConfig>) => void
  setApiKey: (provider: 'deepseek' | 'qwen' | 'siliconflow', key: string) => void
  loadConfig: () => Promise<void>
  updateConfig: (config: Partial<Config>) => Promise<void>
  resetConfig: () => Promise<void>
  resetApiKeys: () => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      agentMode: 'chat',
      setAgentMode: async (mode) => {
        const modeConfig = AGENT_MODE_CONFIGS[mode]
        set((state) => ({
          agentMode: mode,
          model: {
            ...state.model,
            systemPrompt: modeConfig.systemPrompt,
            reasoningFormat: modeConfig.reasoningFormat,
          },
        }))
        // 通知 Electron 主进程切换模式
        if (window.electronAPI?.agentMode) {
          await window.electronAPI.agentMode.set(mode)
        }
      },
      model: {
        provider: 'local',
        model: 'your-model-name',
        temperature: 1,
        topP: 0.9,
        topK: 50,
        repeatPenalty: 1.1,
        reasoning: 'on',
        reasoningBudget: -1,
        reasoningFormat: 'deepseek-legacy',
        nPredict: -1,
        ctxSize: 32768,
        batchSize: 1024,
        ubatchSize: 256,
        threads: 24,
        cachePrompt: true,
        cacheRam: 16384,
        maxTokens: 4096,
        systemPrompt:
          '你是一个有帮助的 AI 助手。你擅长文本生成、图像理解、小说创作和创意写作。你可以进行多轮对话，处理多样化的自然语言需求。',
        stream: true,
        retries: 0,
      },
      apiKeys: {
        deepseek: '',
        qwen: '',
        siliconflow: '',
      },
      isLoading: false,
      error: null,

      // 通用设置
      language: 'zh-CN',
      setLanguage: (language) => set({ language }),
      notifications: true,
      setNotifications: (notifications) => set({ notifications }),

      // 对话设置
      streaming: true,
      setStreaming: (streaming) => set({ streaming }),
      maxContextLength: 50,
      setMaxContextLength: (maxContextLength) => set({ maxContextLength }),

      // 界面设置
      zoomLevel: 100,
      setZoomLevel: (zoomLevel) => set({ zoomLevel }),

      // 高级设置
      apiUrl: 'http://localhost:8000',
      setApiUrl: (apiUrl) => set({ apiUrl }),
      timeout: 30,
      setTimeout: (timeout) => set({ timeout }),
      autoSave: true,
      setAutoSave: (autoSave) => set({ autoSave }),

      setModelConfig: (config) => {
        set((state) => ({
          model: {
            ...state.model,
            ...config,
            temperature: config.temperature ?? state.model.temperature,
            topP: config.topP ?? state.model.topP,
            topK: config.topK ?? state.model.topK,
            minP: config.minP ?? state.model.minP,
            repeatPenalty: config.repeatPenalty ?? state.model.repeatPenalty,
            presencePenalty: config.presencePenalty ?? state.model.presencePenalty,
            frequencyPenalty: config.frequencyPenalty ?? state.model.frequencyPenalty,
            reasoning: config.reasoning ?? state.model.reasoning,
            reasoningBudget: config.reasoningBudget ?? state.model.reasoningBudget,
            reasoningFormat: config.reasoningFormat ?? state.model.reasoningFormat,
            nPredict: config.nPredict ?? state.model.nPredict,
            ctxSize: config.ctxSize ?? state.model.ctxSize,
            batchSize: config.batchSize ?? state.model.batchSize,
            ubatchSize: config.ubatchSize ?? state.model.ubatchSize,
            threads: config.threads ?? state.model.threads,
            cachePrompt: config.cachePrompt ?? state.model.cachePrompt,
            cacheRam: config.cacheRam ?? state.model.cacheRam,
            maxTokens: config.maxTokens ?? state.model.maxTokens,
            systemPrompt: config.systemPrompt ?? state.model.systemPrompt,
          },
        }))
      },

      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        }))
      },

      loadConfig: async () => {
        set({ isLoading: true, error: null })
        try {
          const { getConfig } = await import('@/api/config')
          const config = await getConfig()
          set({ model: config.model, apiKeys: config.apiKeys })
        } catch {
          set({ error: '加载配置失败' })
        } finally {
          set({ isLoading: false })
        }
      },

      updateConfig: async (config) => {
        try {
          const { updateConfig } = await import('@/api/config')
          await updateConfig(config)
        } catch {
          set({ error: '保存配置失败' })
        }
      },

      resetConfig: async () => {
        try {
          const { resetConfig } = await import('@/api/config')
          const config = await resetConfig()
          set({ model: config.model, apiKeys: config.apiKeys })
        } catch {
          set({ error: '重置配置失败' })
        }
      },

      resetApiKeys: () => {
        set({
          apiKeys: { deepseek: '', qwen: '', siliconflow: '' },
        })
      },
    }),
    {
      name: 'free-agent-config',
      partialize: (state) => ({
        agentMode: state.agentMode,
        model: {
          provider: state.model.provider,
          model: state.model.model,
          temperature: state.model.temperature,
          topP: state.model.topP,
          topK: state.model.topK,
          minP: state.model.minP,
          repeatPenalty: state.model.repeatPenalty,
          presencePenalty: state.model.presencePenalty,
          frequencyPenalty: state.model.frequencyPenalty,
          reasoning: state.model.reasoning,
          reasoningBudget: state.model.reasoningBudget,
          reasoningFormat: state.model.reasoningFormat,
          nPredict: state.model.nPredict,
          ctxSize: state.model.ctxSize,
          batchSize: state.model.batchSize,
          ubatchSize: state.model.ubatchSize,
          threads: state.model.threads,
          cachePrompt: state.model.cachePrompt,
          cacheRam: state.model.cacheRam,
          maxTokens: state.model.maxTokens,
          systemPrompt: state.model.systemPrompt,
          stream: state.model.stream,
          retries: state.model.retries,
        },
        apiKeys: {
          deepseek: state.apiKeys.deepseek,
          qwen: state.apiKeys.qwen,
          siliconflow: state.apiKeys.siliconflow,
        },
        language: state.language,
        notifications: state.notifications,
        streaming: state.streaming,
        maxContextLength: state.maxContextLength,
        zoomLevel: state.zoomLevel,
        apiUrl: state.apiUrl,
        timeout: state.timeout,
        autoSave: state.autoSave,
      }),
    },
  ),
)