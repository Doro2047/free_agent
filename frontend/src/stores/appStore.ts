import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface AppState {
  theme: Theme
  sidebarCollapsed: boolean
  rightPanelVisible: boolean
  activeTaskId: string | null
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setActiveTask: (taskId: string | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      rightPanelVisible: false,
      activeTaskId: null,

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleRightPanel: () => set((state) => ({ rightPanelVisible: !state.rightPanelVisible })),
      setActiveTask: (taskId) => set({ activeTaskId: taskId }),
    }),
    {
      name: 'codecraft-app',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelVisible: state.rightPanelVisible,
      }),
    },
  ),
)
