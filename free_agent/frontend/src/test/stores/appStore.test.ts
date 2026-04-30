import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/appStore'

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      theme: 'dark',
      sidebarCollapsed: false,
      rightPanelVisible: true,
      activeTaskId: null,
    })
  })

  describe('初始状态', () => {
    it('应有正确的默认值', () => {
      const state = useAppStore.getState()
      expect(state.theme).toBe('dark')
      expect(state.sidebarCollapsed).toBe(false)
      expect(state.rightPanelVisible).toBe(true)
      expect(state.activeTaskId).toBeNull()
    })
  })

  describe('setTheme', () => {
    it('应设置主题', () => {
      useAppStore.getState().setTheme('light')
      expect(useAppStore.getState().theme).toBe('light')
    })

    it('应支持 system 主题', () => {
      useAppStore.getState().setTheme('system')
      expect(useAppStore.getState().theme).toBe('system')
    })
  })

  describe('toggleSidebar', () => {
    it('应切换侧边栏状态', () => {
      expect(useAppStore.getState().sidebarCollapsed).toBe(false)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarCollapsed).toBe(true)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarCollapsed).toBe(false)
    })
  })

  describe('toggleRightPanel', () => {
    it('应切换右侧面板状态', () => {
      expect(useAppStore.getState().rightPanelVisible).toBe(true)
      useAppStore.getState().toggleRightPanel()
      expect(useAppStore.getState().rightPanelVisible).toBe(false)
    })
  })

  describe('setActiveTask', () => {
    it('应设置活动任务 ID', () => {
      useAppStore.getState().setActiveTask('task-1')
      expect(useAppStore.getState().activeTaskId).toBe('task-1')
    })

    it('应支持设置为 null', () => {
      useAppStore.getState().setActiveTask('task-1')
      useAppStore.getState().setActiveTask(null)
      expect(useAppStore.getState().activeTaskId).toBeNull()
    })
  })
})
