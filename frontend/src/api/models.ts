import { apiClient } from './client'
import type { ModelInfo, DownloadProgress } from '@/types'

export type { ModelInfo, DownloadProgress }

export async function getModels(): Promise<ModelInfo[]> {
  return apiClient.get<ModelInfo[]>('/models')
}

export async function getCurrentModel(): Promise<ModelInfo | null> {
  return apiClient.get<ModelInfo | null>('/models/current')
}

export async function switchModel(name: string): Promise<{ success: boolean; message: string }> {
  return apiClient.post<{ success: boolean; message: string }>('/models/switch', { name })
}

export function downloadModel(
  url: string,
  callbacks: {
    onProgress: (progress: DownloadProgress) => void
    onComplete: () => void
    onError: (error: Error) => void
  },
  targetName?: string,
): AbortController {
  const controller = new AbortController()
  const baseURL = apiClient.instance.defaults.baseURL || 'http://localhost:3000/api'

  ;(async () => {
    try {
      const response = await fetch(`${baseURL}/models/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: targetName }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`下载请求失败: ${response.status} ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('响应不可读')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith(':')) continue

          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              callbacks.onComplete()
              return
            }

            try {
              const parsed = JSON.parse(data) as DownloadProgress
              callbacks.onProgress(parsed)
              if (parsed.status === 'error') {
                callbacks.onError(new Error(parsed.error || '下载失败'))
                return
              }
              if (parsed.status === 'completed') {
                callbacks.onComplete()
                return
              }
            } catch (parseError) { console.warn('[models] Failed to parse SSE data:', parseError) }
          }
        }
      }

      callbacks.onComplete()
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      callbacks.onError(error instanceof Error ? error : new Error(String(error)))
    }
  })()

  return controller
}

export async function deleteModel(name: string): Promise<{ success: boolean; message: string }> {
  return apiClient.delete<{ success: boolean; message: string }>(`/models/${encodeURIComponent(name)}`)
}

export async function renameModel(
  oldName: string,
  newName: string,
): Promise<{ success: boolean; message: string }> {
  return apiClient.patch<{ success: boolean; message: string }>(`/models/${encodeURIComponent(oldName)}/rename`, { name: newName })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function extractQuantization(filename: string): string {
  const qPattern = /\.(Q[24568]_\d|Q\d+|F16|F32|GGUF)/i
  const match = filename.match(qPattern)
  return match ? match[1].toUpperCase() : 'GGUF'
}
