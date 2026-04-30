export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
  sessionId?: string
  toolCalls?: ToolCall[]
}

// Alias for backward compatibility
export type Message = ChatMessage;

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface StreamCallbacks {
  onToken: (token: string) => void
  onComplete: (sessionId?: string) => void
  onError: (error: Error) => void
  onToolCallStart?: (toolCall: ToolCall) => void
  onToolCallEnd?: (toolCall: ToolCall) => void
}

export interface StreamConfig {
  provider?: 'deepseek' | 'qwen' | 'siliconflow'
  model?: string
  temperature?: number
  topP?: number
  maxTokens?: number
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  result?: string
  isExecuting?: boolean
}

export interface LlamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface ServerMessage {
  type: 'token' | 'done' | 'error' | 'tool_call_start' | 'tool_call_end'
  data: string | ToolCall
  sessionId?: string
}

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  isDirectory: boolean
  children?: FileNode[]
  size?: number
  modifiedAt?: string
}

export interface OpenFile {
  path: string
  name: string
  content: string
  originalContent: string
  language: string
  isModified: boolean
}

export type AgentMode = 'chat' | 'code'

export interface ModelConfig {
  provider: 'deepseek' | 'qwen' | 'siliconflow' | 'local'
  model: string
  temperature: number
  topP: number
  topK: number
  minP?: number
  repeatPenalty: number
  presencePenalty?: number
  frequencyPenalty?: number
  reasoning: 'on' | 'off'
  reasoningBudget: number
  reasoningFormat?: 'deepseek-legacy' | 'deepseek' | 'none'
  nPredict: number
  ctxSize: number
  batchSize: number
  ubatchSize: number
  threads: number
  cachePrompt: boolean
  cacheRam: number
  maxTokens: number
  systemPrompt: string
  stream: boolean
  retries: number
}

export interface ApiKeys {
  deepseek: string
  qwen: string
  siliconflow: string
}

export interface ModelInfo {
  name: string
  size?: number
  loaded?: boolean
  isLocal?: boolean
  quantization?: string
  downloadedAt?: string
}

export interface DownloadProgress {
  fileName: string
  downloadedBytes: number
  totalBytes: number
  speed: number
  percent: number
  status: 'downloading' | 'paused' | 'completed' | 'error'
  error?: string
}

export interface Config {
  theme: 'light' | 'dark' | 'system'
  model: ModelConfig
  apiKeys: ApiKeys
}

export interface Task {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  createdAt: number
  updatedAt: number
  result?: string
  error?: string
}

export interface CreateTaskData {
  name?: string
  description?: string
  files?: string[]
  context?: string
}

// Electron API types
export interface ElectronLlamaAPI {
  chat: (messages: LlamaMessage[], config?: Record<string, unknown>) => Promise<{ content: string }>
  stream: (messages: LlamaMessage[], config?: Record<string, unknown>) => Promise<ReadableStream>
  health: () => Promise<boolean>
  stop: () => Promise<boolean>
}

export interface ElectronServerAPI {
  start: (port?: number) => Promise<{ success: boolean; port: number }>
  stop: () => Promise<boolean>
  status: () => Promise<{ running: boolean; port: number }>
  checkHealth: () => Promise<boolean>
}

export interface ElectronWindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  saveConfig: (config: Record<string, unknown>) => Promise<boolean>
}

export interface ElectronDialogAPI {
  showSaveDialog: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePath?: string }>
  showOpenDialog: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePaths?: string[] }>
}

export interface ElectronFilesAPI {
  list: (dir?: string) => Promise<FileNode[]>
  read: (path: string) => Promise<{ content: string }>
  write: (path: string, content: string) => Promise<boolean>
  delete: (path: string) => Promise<boolean>
  rename: (oldPath: string, newName: string) => Promise<boolean>
  createFile: (name: string, parentPath?: string) => Promise<boolean>
  createDirectory: (name: string, parentPath?: string) => Promise<boolean>
}

export interface ElectronModelsAPI {
  list: () => Promise<ModelInfo[]>
  download: (url: string, targetName?: string) => Promise<{ success: boolean }>
  delete: (name: string) => Promise<boolean>
  rename: (oldName: string, newName: string) => Promise<boolean>
  switch: (name: string) => Promise<boolean>
  current: () => Promise<ModelInfo | null>
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void
  onModelLoaded: (callback: (name: string) => void) => void
  onModelError: (callback: (error: string) => void) => void
}

export interface ElectronLogsAPI {
  onLog: (callback: (msg: unknown) => void) => void
}

export interface ElectronAPI {
  llama?: ElectronLlamaAPI
  server?: ElectronServerAPI
  window?: ElectronWindowAPI
  dialog?: ElectronDialogAPI
  files?: ElectronFilesAPI
  models?: ElectronModelsAPI
  logs?: ElectronLogsAPI
  agentMode?: {
    get: () => Promise<AgentMode>
    set: (mode: AgentMode) => Promise<{ agentMode: AgentMode }>
  }
}