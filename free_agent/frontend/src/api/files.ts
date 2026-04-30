import { apiClient } from './client'
import type { FileNode } from '@/types'

export interface FileContent {
  path: string
  content: string
  encoding: string
  size: number
}

export interface FileSearchResult {
  path: string
  name: string
  isDirectory: boolean
  matches?: number
}

export interface ContentSearchResult {
  path: string
  line: number
  content: string
  match: string
}

export interface EditFileRequest {
  path: string
  oldString: string
  newString: string
}

export interface FileOperationResponse {
  success: boolean
  message: string
}

/**
 * 获取文件列表
 */
export async function listFiles(path?: string): Promise<FileNode[]> {
  return apiClient.get<FileNode[]>('/files', { params: path ? { path } : {} })
}

/**
 * 读取文件内容
 */
export async function readFile(path: string): Promise<FileContent> {
  return apiClient.get<FileContent>('/files/read', { params: { path } })
}

/**
 * 写入文件内容
 */
export async function writeFile(path: string, content: string): Promise<FileOperationResponse> {
  return apiClient.post<FileOperationResponse>('/files/write', { path, content })
}

/**
 * 创建空文件
 */
export async function createFile(path: string): Promise<FileOperationResponse> {
  return writeFile(path, '')
}

/**
 * 创建文件夹
 */
export async function createFolder(path: string): Promise<FileOperationResponse> {
  const placeholderPath = `${path}/.gitkeep`
  return apiClient.post<FileOperationResponse>('/files/write', {
    path: placeholderPath,
    content: '',
  })
}

/**
 * 编辑文件内容
 */
export async function editFile(
  path: string,
  oldString: string,
  newString: string,
): Promise<FileOperationResponse> {
  return apiClient.post<FileOperationResponse>('/files/edit', {
    path,
    oldString,
    newString,
  })
}

/**
 * 删除文件或文件夹
 */
export async function deleteFile(path: string): Promise<FileOperationResponse> {
  return apiClient.delete<FileOperationResponse>('/files', { data: { path } })
}

/**
 * 重命名文件或文件夹
 */
export async function renameFile(
  oldPath: string,
  newPath: string,
  isDirectory: boolean,
): Promise<FileOperationResponse> {
  if (isDirectory) {
    await createFolder(newPath)
    const children = await listFiles(oldPath)

    async function moveChildren(oldParent: string, newParent: string, items: FileNode[]) {
      for (const item of items) {
        const newRelativePath = item.path.replace(oldParent, newParent)
        if (item.isDirectory && item.children) {
          await createFolder(newRelativePath)
          await moveChildren(item.path, newRelativePath, item.children)
        } else {
          const content = await readFile(item.path)
          await writeFile(newRelativePath, content.content)
        }
      }
    }

    await moveChildren(oldPath, newPath, children)
    await deleteFile(oldPath)
    return { success: true, message: `已重命名文件夹: ${oldPath} -> ${newPath}` }
  } else {
    const content = await readFile(oldPath)
    await Promise.all([writeFile(newPath, content.content), deleteFile(oldPath)])
    return { success: true, message: `已重命名文件: ${oldPath} -> ${newPath}` }
  }
}

/**
 * 搜索文件
 */
export async function searchFiles(
  pattern: string,
  path?: string,
): Promise<FileSearchResult[]> {
  return apiClient.get<FileSearchResult[]>('/files/search', { params: { pattern, path } })
}

/**
 * 搜索文件内容
 */
export async function searchContent(
  pattern: string,
  path?: string,
): Promise<ContentSearchResult[]> {
  return apiClient.get<ContentSearchResult[]>('/files/search-content', { params: { pattern, path } })
}
