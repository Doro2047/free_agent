import { apiClient } from './client'
import type { Task } from '@/types'

/**
 * 获取任务列表
 */
export async function getTasks(): Promise<Task[]> {
  return apiClient.get<Task[]>('/tasks')
}

/**
 * 创建新任务
 */
export async function createTask(title: string): Promise<Task> {
  return apiClient.post<Task>('/tasks', { title })
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
  return apiClient.delete<void>(`/tasks/${id}`)
}
