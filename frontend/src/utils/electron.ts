import type { ElectronAPI } from '@/types';

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export async function minimizeWindow(): Promise<void> {
  window.electronAPI?.window?.minimize();
}

export async function maximizeWindow(): Promise<void> {
  window.electronAPI?.window?.maximize();
}

export async function closeWindow(): Promise<void> {
  window.electronAPI?.window?.close();
}

export async function saveConfig(config: Record<string, unknown>): Promise<boolean> {
  return window.electronAPI?.window?.saveConfig(config) ?? Promise.resolve(false);
}

export async function getAgentMode(): Promise<'chat' | 'code'> {
  return window.electronAPI?.agentMode?.get() ?? Promise.resolve('chat');
}

export async function setAgentMode(mode: 'chat' | 'code'): Promise<void> {
  await window.electronAPI?.agentMode?.set(mode);
}

export async function showOpenDialog(options: {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
  properties?: ('openFile' | 'openDirectory' | 'multiSelections')[];
}): Promise<string[]> {
  const result = await window.electronAPI?.dialog?.showOpenDialog(options);
  return result?.filePaths ?? [];
}

export async function showSaveDialog(options: {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<string | null> {
  const result = await window.electronAPI?.dialog?.showSaveDialog(options);
  return result?.filePath ?? null;
}

export async function readFile(path: string): Promise<string | null> {
  const result = await window.electronAPI?.files?.read(path);
  return result?.content ?? null;
}

export async function writeFile(path: string, content: string): Promise<boolean> {
  return window.electronAPI?.files?.write(path, content) ?? Promise.resolve(false);
}

export async function deleteFile(path: string): Promise<boolean> {
  return window.electronAPI?.files?.delete(path) ?? Promise.resolve(false);
}

export async function listDirectory(dir?: string): Promise<{ name: string; path: string; type: string }[]> {
  return window.electronAPI?.files?.list(dir) ?? Promise.resolve([]);
}

export async function startServer(port?: number): Promise<boolean> {
  const result = await window.electronAPI?.server?.start(port);
  return result?.success ?? false;
}

export async function stopServer(): Promise<boolean> {
  return window.electronAPI?.server?.stop() ?? Promise.resolve(false);
}

export async function checkServerHealth(): Promise<boolean> {
  return window.electronAPI?.server?.checkHealth() ?? Promise.resolve(false);
}

export async function getServerStatus(): Promise<{ running: boolean; port: number }> {
  const result = await window.electronAPI?.server?.status();
  return result ?? { running: false, port: 3000 };
}

export async function startLlamaChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  config?: Record<string, unknown>
): Promise<string | null> {
  const result = await window.electronAPI?.llama?.chat(messages, config);
  return result?.content ?? null;
}

export async function startLlamaStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  config?: Record<string, unknown>
): Promise<ReadableStream | null> {
  return window.electronAPI?.llama?.stream(messages, config) ?? null;
}

export async function checkLlamaHealth(): Promise<boolean> {
  return window.electronAPI?.llama?.health() ?? Promise.resolve(false);
}

export async function stopLlama(): Promise<boolean> {
  return window.electronAPI?.llama?.stop() ?? Promise.resolve(false);
}

export async function listModels(): Promise<{
  name: string;
  size?: number;
  loaded?: boolean;
}[]> {
  return window.electronAPI?.models?.list() ?? Promise.resolve([]);
}

export async function downloadModel(url: string, targetName?: string): Promise<boolean> {
  const result = await window.electronAPI?.models?.download(url, targetName);
  return result?.success ?? false;
}

export async function deleteModel(name: string): Promise<boolean> {
  return window.electronAPI?.models?.delete(name) ?? Promise.resolve(false);
}

export async function switchModel(name: string): Promise<boolean> {
  return window.electronAPI?.models?.switch(name) ?? Promise.resolve(false);
}

export function onServerMessage(callback: (message: unknown) => void): () => void {
  window.electronAPI?.logs?.onLog(callback);
  return () => {};
}

export function onModelDownloadProgress(
  callback: (progress: {
    fileName: string;
    downloadedBytes: number;
    totalBytes: number;
    percent: number;
  }) => void
): () => void {
  window.electronAPI?.models?.onDownloadProgress?.(callback);
  return () => {};
}

export function onModelLoaded(callback: (name: string) => void): () => void {
  window.electronAPI?.models?.onModelLoaded?.(callback);
  return () => {};
}

export function onModelError(callback: (error: string) => void): () => void {
  window.electronAPI?.models?.onModelError?.(callback);
  return () => {};
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function isDev(): boolean {
  return import.meta.env?.DEV ?? false;
}

export function isProd(): boolean {
  return import.meta.env?.PROD ?? false;
}

export function getPlatform(): string {
  return window.electronAPI ? 'electron' : 'browser';
}
