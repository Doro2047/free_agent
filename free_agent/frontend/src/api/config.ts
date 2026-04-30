import { apiClient } from './client'
import type { Config } from '@/types'

export async function getConfig(): Promise<Config> {
  return apiClient.get<Config>('/config')
}

export async function updateConfig(config: Partial<Config>): Promise<Config> {
  return apiClient.patch<Config>('/config', config)
}

export async function resetConfig(): Promise<Config> {
  return apiClient.post<Config>('/config/reset')
}
