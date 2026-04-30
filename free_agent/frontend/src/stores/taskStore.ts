import { create } from 'zustand'
import { getTasks, createTask as apiCreateTask, deleteTask as apiDeleteTask } from '@/api/tasks'
import type { Task } from '@/types'

interface TaskState {
  tasks: Task[]
  activeTaskId: string | null
  loading: boolean
  error: string | null
  loadTasks: () => Promise<void>
  createTask: (title: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  setActiveTask: (id: string | null) => void
}

export const useTaskStore = create<TaskState>()((set) => ({
  tasks: [],
  activeTaskId: null,
  loading: false,
  error: null,

  loadTasks: async () => {
    set({ loading: true, error: null })
    try {
      const tasks = await getTasks()
      set({ tasks, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '加载任务失败',
        loading: false,
      })
    }
  },

  createTask: async (title: string) => {
    set({ loading: true, error: null })
    try {
      const newTask = await apiCreateTask(title)
      set((state) => ({
        tasks: [...state.tasks, newTask],
        activeTaskId: newTask.id,
        loading: false,
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '创建任务失败',
        loading: false,
      })
    }
  },

  deleteTask: async (id: string) => {
    set({ loading: true, error: null })
    try {
      await apiDeleteTask(id)
      set((state) => {
        const newTasks = state.tasks.filter((t) => t.id !== id)
        return {
          tasks: newTasks,
          activeTaskId:
            state.activeTaskId === id
              ? (newTasks[0]?.id ?? null)
              : state.activeTaskId,
          loading: false,
        }
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '删除任务失败',
        loading: false,
      })
    }
  },

  setActiveTask: (id: string | null) => {
    set({ activeTaskId: id })
  },
}))
