export type {
  LlamaMessage,
  ServerMessage,
  ElectronAPI,
  ElectronLlamaAPI,
  ElectronServerAPI,
  ElectronWindowAPI,
  ElectronDialogAPI,
  ElectronFilesAPI,
  ElectronModelsAPI,
} from '@/types'

declare global {
  interface Window {
    electronAPI?: import('@/types').ElectronAPI
  }
}
