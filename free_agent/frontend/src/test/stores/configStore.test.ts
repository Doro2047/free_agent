import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from '@/stores/configStore'

describe('configStore', () => {
  beforeEach(() => {
    useConfigStore.setState({
      model: {
        provider: 'local',
        model: 'Qwen3.5-9B-Unredacted-MAX',
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
        systemPrompt: 'You are a helpful AI assistant.',
        stream: true,
        retries: 0,
      },
      apiKeys: { deepseek: '', qwen: '', siliconflow: '' },
      isLoading: false,
      error: null,
      language: 'zh-CN',
      notifications: true,
      streaming: true,
      maxContextLength: 50,
      zoomLevel: 100,
      apiUrl: 'http://localhost:8000',
      timeout: 30,
      autoSave: true,
    })
  })

  describe('初始状态', () => {
    it('应有正确的默认值', () => {
      const state = useConfigStore.getState()
      expect(state.model.provider).toBe('local')
      expect(state.model.temperature).toBe(1)
      expect(state.model.topP).toBe(0.9)
      expect(state.language).toBe('zh-CN')
      expect(state.notifications).toBe(true)
      expect(state.streaming).toBe(true)
      expect(state.maxContextLength).toBe(50)
      expect(state.zoomLevel).toBe(100)
      expect(state.apiUrl).toBe('http://localhost:8000')
      expect(state.timeout).toBe(30)
      expect(state.autoSave).toBe(true)
    })
  })

  describe('setModelConfig', () => {
    it('应更新模型配置的部分字段', () => {
      useConfigStore.getState().setModelConfig({ temperature: 0.9 })
      expect(useConfigStore.getState().model.temperature).toBe(0.9)
      expect(useConfigStore.getState().model.provider).toBe('local')
    })

    it('应更新多个模型配置字段', () => {
      useConfigStore.getState().setModelConfig({ provider: 'deepseek', model: 'deepseek-chat' })
      const state = useConfigStore.getState()
      expect(state.model.provider).toBe('deepseek')
      expect(state.model.model).toBe('deepseek-chat')
    })
  })

  describe('setApiKey', () => {
    it('应设置指定提供商的 API Key', () => {
      useConfigStore.getState().setApiKey('deepseek', 'sk-test-key')
      expect(useConfigStore.getState().apiKeys.deepseek).toBe('sk-test-key')
    })

    it('不应影响其他提供商的 API Key', () => {
      useConfigStore.getState().setApiKey('qwen', 'qwen-key')
      const state = useConfigStore.getState()
      expect(state.apiKeys.qwen).toBe('qwen-key')
      expect(state.apiKeys.deepseek).toBe('')
    })
  })

  describe('通用设置', () => {
    it('setLanguage 应更新语言', () => {
      useConfigStore.getState().setLanguage('en-US')
      expect(useConfigStore.getState().language).toBe('en-US')
    })

    it('setNotifications 应更新通知状态', () => {
      useConfigStore.getState().setNotifications(false)
      expect(useConfigStore.getState().notifications).toBe(false)
    })
  })

  describe('对话设置', () => {
    it('setStreaming 应更新流式输出', () => {
      useConfigStore.getState().setStreaming(false)
      expect(useConfigStore.getState().streaming).toBe(false)
    })

    it('setMaxContextLength 应更新最大上下文长度', () => {
      useConfigStore.getState().setMaxContextLength(100)
      expect(useConfigStore.getState().maxContextLength).toBe(100)
    })
  })

  describe('界面设置', () => {
    it('setZoomLevel 应更新缩放比例', () => {
      useConfigStore.getState().setZoomLevel(150)
      expect(useConfigStore.getState().zoomLevel).toBe(150)
    })
  })

  describe('高级设置', () => {
    it('setApiUrl 应更新 API 地址', () => {
      useConfigStore.getState().setApiUrl('http://192.168.1.1:8080')
      expect(useConfigStore.getState().apiUrl).toBe('http://192.168.1.1:8080')
    })

    it('setTimeout 应更新超时时间', () => {
      useConfigStore.getState().setTimeout(60)
      expect(useConfigStore.getState().timeout).toBe(60)
    })

    it('setAutoSave 应更新自动保存', () => {
      useConfigStore.getState().setAutoSave(false)
      expect(useConfigStore.getState().autoSave).toBe(false)
    })
  })

  describe('resetApiKeys', () => {
    it('应重置所有 API Key', () => {
      useConfigStore.getState().setApiKey('deepseek', 'sk-test')
      useConfigStore.getState().setApiKey('qwen', 'qwen-test')
      useConfigStore.getState().resetApiKeys()
      const state = useConfigStore.getState()
      expect(state.apiKeys.deepseek).toBe('')
      expect(state.apiKeys.qwen).toBe('')
      expect(state.apiKeys.siliconflow).toBe('')
    })
  })
})
